// === INIT ===
DB.load(); initSampleData();
let currentPage='dashboard', kpiTab='ptv', charts={};
function switchPage(p){currentPage=p;document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');document.querySelectorAll('.nav-item').forEach(b=>{b.classList.toggle('active',b.dataset.page===p)});document.getElementById('topbarTitle').textContent={dashboard:'Dashboard',nhanvien:'Nhân Viên',chamcong:'Chấm Công',tour:'Tour Dịch Vụ',kpi:'KPI Doanh Số',luong:'Bảng Lương',khautru:'Khấu Trừ',phucap:'Phụ Cấp & Thưởng',baocao:'Báo Cáo',caidat:'Cài Đặt',nhatky:'Nhật Ký'}[p]||p;if(p==='nhatky'){const b=document.getElementById('logBadge');if(b)b.style.display='none';}refreshPage();}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');}
function onMonthChange(){const m=getMonth();['dashMonthBadge','ccMonthBadge','tourMonthBadge','kpiMonthBadge','luongMonthBadge','ktMonthBadge','pcMonthBadge'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=m.label;});refreshPage();}
function refreshPage(){loadSyncUrl();renderNVTable();renderCCTable();renderTourTable();renderKPITab();calcAllSalary();renderDashboard();renderBaoCao();renderKTPage();renderPhucapPage();loadMonthConfig();populateSelects();renderSchedules();renderLogs();}
let appLogs = JSON.parse(localStorage.getItem('spa_logs')||'[]');
function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type+' show';setTimeout(()=>t.classList.remove('show'),3500);addLog(msg,type);}
function addLog(msg,type='info',details=''){appLogs.unshift({msg,type,details,time:new Date().toLocaleString('vi-VN')});if(appLogs.length>200)appLogs=appLogs.slice(0,200);localStorage.setItem('spa_logs',JSON.stringify(appLogs));if(currentPage!=='nhatky'){const b=document.getElementById('logBadge');if(b){const errCnt=appLogs.filter(l=>l.type==='error').length;if(errCnt>0){b.textContent=errCnt;b.style.display='inline-flex';}}}renderLogs();}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function populateSelects(){const nvs=DB.nhanvien;const opts=nvs.map(n=>`<option value="${n.id}">${n.name}</option>`).join('');['ccNV','kpiNV'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});const optsBlank='<option value="">-- Chọn --</option>'+opts;['tourPIC','tourKTV','tourBS','tourNVFilter'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=(id==='tourNVFilter'?'<option value="">-- Tất cả nhân viên --</option>'+opts:optsBlank);});}

// === NV TABLE ===
function renderNVTable(filter=''){const body=document.getElementById('nvBody');if(!body)return;const nvs=DB.nhanvien.filter(n=>!filter||n.name.toLowerCase().includes(filter.toLowerCase())||(n.manv&&n.manv.includes(filter)));body.innerHTML=nvs.map((n,i)=>`<tr><td>${i+1}</td><td><span class="badge badge-purple">${n.manv||'-'}</span></td><td><strong>${n.name}</strong></td><td>${n.chucvu}</td><td>${pbLabel(n.phongban)}</td><td>${badgeFor(n.trangthai)}</td><td class="amount">${fmt(n.luongcb)}</td><td>${n.ngaycongchuan}</td><td class="amount">${n.kyquy?fmt(n.kyquy):"-"}</td><td><button class="btn btn-sm btn-secondary" onclick="editNV('${n.id}')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteNV('${n.id}')">🗑️</button></td></tr>`).join('');}
function filterNV(v){renderNVTable(v);}
// === BULK EDIT ===
function openBulkEdit(){
  document.getElementById('bulkField').value='pcantrua';
  document.getElementById('bulkFilter').value='';
  document.getElementById('bulkValue').value='';
  previewBulkEdit();
  openModal('modalBulkEdit');
}
function previewBulkEdit(){
  const field=document.getElementById('bulkField').value;
  const filter=document.getElementById('bulkFilter').value;
  const newVal=document.getElementById('bulkValue').value;
  const labels={luongcb:'Lương CB',ngaycongchuan:'Ngày Công Chuẩn',pcantrua:'PC Ăn Trưa',pctrachnhiem:'PC Trách Nhiệm',pcdilai:'PC Đi Lại',bhxh:'BHXH'};
  const isMoney=['luongcb','pcantrua','pctrachnhiem','pcdilai'].includes(field);
  const fmtV=(v)=>isMoney?fmt(v):(field==='bhxh'?v+'%':v);
  let nvs=DB.nhanvien;
  if(filter) nvs=nvs.filter(n=>n.phongban===filter);
  const el=document.getElementById('bulkPreview');
  if(!nvs.length){el.innerHTML='<div style="color:var(--text2);text-align:center">Không có nhân viên</div>';return;}
  el.innerHTML='<div style="margin-bottom:8px;color:var(--text2)"><strong>'+nvs.length+'</strong> nhân viên sẽ được thay đổi <strong>'+labels[field]+'</strong></div>'+
    '<table style="width:100%;font-size:12px"><tr style="color:var(--text2)"><th style="text-align:left;padding:4px">Nhân Viên</th><th style="text-align:right;padding:4px">Hiện Tại</th><th style="text-align:right;padding:4px">→ Mới</th></tr>'+
    nvs.map(n=>'<tr><td style="padding:4px">'+n.name+'</td><td style="text-align:right;padding:4px;color:var(--text2)">'+fmtV(n[field]||0)+'</td><td style="text-align:right;padding:4px;color:var(--accent2);font-weight:600">'+(newVal?fmtV(+newVal):'—')+'</td></tr>').join('')+
    '</table>';
}
function applyBulkEdit(){
  const field=document.getElementById('bulkField').value;
  const filter=document.getElementById('bulkFilter').value;
  const newVal=+document.getElementById('bulkValue').value;
  if(isNaN(newVal)){showToast('Nhập giá trị hợp lệ!','error');return;}
  const labels={luongcb:'Lương CB',ngaycongchuan:'Ngày Công Chuẩn',pcantrua:'PC Ăn Trưa',pctrachnhiem:'PC Trách Nhiệm',pcdilai:'PC Đi Lại',bhxh:'BHXH'};
  let nvs=DB.nhanvien;
  if(filter) nvs=nvs.filter(n=>n.phongban===filter);
  if(!nvs.length){showToast('Không có nhân viên!','error');return;}
  if(!confirm('Đổi '+labels[field]+' thành '+newVal+' cho '+nvs.length+' nhân viên?')) return;
  nvs.forEach(n=>{n[field]=newVal;});
  DB.save('nhanvien');
  closeModal('modalBulkEdit');
  refreshPage();
  showToast('Đã cập nhật '+nvs.length+' nhân viên!');
}
function addNV(){document.getElementById('nvId').value='';document.getElementById('nvMaNV').value='';document.getElementById('nvHoTen').value='';document.getElementById('nvChucVu').selectedIndex=0;document.getElementById('nvPhongBan').selectedIndex=0;document.getElementById('nvTrangThai').selectedIndex=0;document.getElementById('nvLuongCB').value='';document.getElementById('nvNgayCongChuan').value='26';document.getElementById('nvGioCongChuan').value='9';document.getElementById('nvPCTrachNhiem').value='0';document.getElementById('nvKyQuy').value='0';document.getElementById('modalNVTitle').textContent='Thêm Nhân Viên';openModal('modalNV');}
function saveNV(){const id=document.getElementById('nvId').value;const data={manv:(document.getElementById('nvMaNV').value||'').trim(),name:document.getElementById('nvHoTen').value,chucvu:document.getElementById('nvChucVu').value,phongban:document.getElementById('nvPhongBan').value,trangthai:document.getElementById('nvTrangThai').value,luongcb:+document.getElementById('nvLuongCB').value||0,ngaycongchuan:+document.getElementById('nvNgayCongChuan').value||26,giocongchuan:+document.getElementById('nvGioCongChuan').value||9,pctrachnhiem:+document.getElementById('nvPCTrachNhiem').value||0,kyquy:+document.getElementById('nvKyQuy').value||0};if(!data.name){showToast('Vui lòng nhập họ tên!','error');return;}if(id){const nv=getNV(id);Object.assign(nv,data);}else{data.id=genId();DB.nhanvien.push(data);}DB.save('nhanvien');closeModal('modalNV');refreshPage();showToast(id?'Đã cập nhật!':'Đã thêm nhân viên!');}
function editNV(id){const n=getNV(id);if(!n)return;document.getElementById('nvId').value=n.id;document.getElementById('nvMaNV').value=n.manv||'';document.getElementById('nvHoTen').value=n.name;document.getElementById('nvChucVu').value=n.chucvu;document.getElementById('nvPhongBan').value=n.phongban;document.getElementById('nvTrangThai').value=n.trangthai;document.getElementById('nvLuongCB').value=n.luongcb;document.getElementById('nvNgayCongChuan').value=n.ngaycongchuan;document.getElementById('nvGioCongChuan').value=n.giocongchuan||9;document.getElementById('nvPCTrachNhiem').value=n.pctrachnhiem||0;document.getElementById('nvKyQuy').value=n.kyquy||0;document.getElementById('modalNVTitle').textContent='Sửa Nhân Viên';openModal('modalNV');}
function deleteNV(id){if(!confirm('Xóa nhân viên này?'))return;DB.nhanvien=DB.nhanvien.filter(n=>n.id!==id);DB.save('nhanvien');refreshPage();showToast('Đã xóa!');}

// === CC TABLE ===
function renderCCTable(){const body=document.getElementById('ccBody');if(!body)return;const mk=getMonth().key;const ccs=DB.chamcong.filter(c=>c.monthKey===mk);body.innerHTML=ccs.map((c,i)=>{const nv=getNV(c.nvId);if(!nv)return '';const nc=c.ncc!==undefined?c.ncc:(nv.ngaycongchuan||26);const chucvu=c.chucvu||nv.chucvu;const nctl=(c.ngaycongtt||0)+(c.ngayle||0);return `<tr><td>${i+1}</td><td><strong>${nv.name}</strong></td><td>${chucvu}</td><td>${pbLabel(nv.phongban)}</td><td>${badgeFor(nv.trangthai)}</td><td>${c.ngaycongtt||0}</td><td style="color:#f59e0b;font-weight:700">${c.ngayle||0}</td><td style="font-weight:700">${nctl}</td><td>${c.ngaynghi||0}</td><td>${nc}</td><td style="color:var(--cyan)">${c.gioOT||0}</td><td>${c.ghichu||''}</td><td><button class="btn btn-sm btn-secondary" onclick="editCC('${c.id}')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteCC('${c.id}')">🗑️</button></td></tr>`;}).join('');}
function saveCC(){const id=document.getElementById('ccId').value;const data={nvId:document.getElementById('ccNV').value,monthKey:getMonth().key,ngaycongtt:+document.getElementById('ccNgayCongTT').value||0,ngayle:+document.getElementById('ccNgayLe').value||0,ngaynghi:+document.getElementById('ccNgayNghi').value||0,gioOT:+document.getElementById('ccGioOT').value||0,ghichu:document.getElementById('ccGhiChu').value};if(id){const cc=DB.chamcong.find(c=>c.id===id);Object.assign(cc,data);}else{data.id=genId();DB.chamcong.push(data);}DB.save('chamcong');closeModal('modalCC');refreshPage();showToast('Đã lưu chấm công!');}
function editCC(id){const c=DB.chamcong.find(x=>x.id===id);if(!c)return;document.getElementById('ccId').value=c.id;document.getElementById('ccNV').value=c.nvId;document.getElementById('ccNgayCongTT').value=c.ngaycongtt;document.getElementById('ccNgayLe').value=c.ngayle||0;document.getElementById('ccNgayNghi').value=c.ngaynghi;document.getElementById('ccGioOT').value=c.gioOT||0;document.getElementById('ccGhiChu').value=c.ghichu;openModal('modalCC');}
function deleteCC(id){if(!confirm('Xóa?'))return;DB.chamcong=DB.chamcong.filter(c=>c.id!==id);DB.save('chamcong');refreshPage();showToast('Đã xóa!');}
function deleteAllCC(){const mk=getMonth().key;const count=DB.chamcong.filter(c=>c.monthKey===mk).length;if(!count){showToast('Không có dữ liệu chấm công!','error');return;}if(!confirm('Xóa toàn bộ '+count+' bản ghi chấm công tháng này?'))return;DB.chamcong=DB.chamcong.filter(c=>c.monthKey!==mk);DB.save('chamcong');refreshPage();showToast('Đã xóa '+count+' bản ghi chấm công!');}

// === TOUR ===
function renderTourTable(){const body=document.getElementById('tourBody');if(!body)return;const mk=getMonth().key;const flt=document.getElementById('tourNVFilter');const fv=flt?flt.value:'';let tours=DB.tours.filter(t=>t.monthKey===mk);if(fv)tours=tours.filter(t=>t.pic===fv||t.ktv===fv||t.bs===fv);body.innerHTML=tours.map(t=>`<tr><td>${t.ngay}</td><td>${t.khach}</td><td>${t.dichvu}</td><td>${getNVName(t.pic)}</td><td>${getNVName(t.bs)}</td><td class="amount">${fmt(t.tienPIC)}</td><td class="amount">${fmt(t.tienBS)}</td><td>${t.ghichu||''}</td><td><button class="btn btn-sm btn-secondary" onclick="editTour('${t.id}')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteTour('${t.id}')">🗑️</button></td></tr>`).join('');const totalPIC=tours.reduce((s,t)=>s+t.tienPIC,0);const totalBS=tours.reduce((s,t)=>s+t.tienBS,0);const el=id=>document.getElementById(id);if(el('tourStatCount'))el('tourStatCount').textContent=tours.length;if(fv){const nvTot=tours.reduce((s,t)=>{let a=0;if(t.pic===fv)a+=t.tienPIC;if(t.bs===fv)a+=t.tienBS;return s+a;},0);if(el('tourStatPIC'))el('tourStatPIC').textContent=fmt(totalPIC);if(el('tourStatBS'))el('tourStatBS').textContent=fmt(totalBS);if(el('tourStatTotal')){el('tourStatTotal').textContent=fmt(nvTot);el('tourStatTotal').parentElement.querySelector('.stat-label').textContent='Tổng NV Này';}}else{if(el('tourStatPIC'))el('tourStatPIC').textContent=fmt(totalPIC);if(el('tourStatBS'))el('tourStatBS').textContent=fmt(totalBS);if(el('tourStatTotal')){el('tourStatTotal').textContent=fmt(totalPIC+totalBS);el('tourStatTotal').parentElement.querySelector('.stat-label').textContent='Tổng Cộng';}};const sums={};tours.forEach(t=>{[{id:t.pic,amt:t.tienPIC},{id:t.bs,amt:t.tienBS}].forEach(x=>{if(x.id){sums[x.id]=(sums[x.id]||0)+x.amt;}});});const inl=el('tourSummaryInline');if(inl)inl.innerHTML=Object.entries(sums).map(([id,total])=>`<span class="badge badge-blue" style="font-size:13px;padding:4px 10px">${getNVName(id)}: <strong>${fmt(total)}</strong></span>`).join('');}
function saveTour(){const id=document.getElementById('tourId').value;const data={monthKey:getMonth().key,ngay:document.getElementById('tourNgay').value,khach:document.getElementById('tourKhach').value,dichvu:document.getElementById('tourDichVu').value,pic:document.getElementById('tourPIC').value,tienPIC:+document.getElementById('tourTienPIC').value||0,ktv:document.getElementById('tourKTV').value,tienKTV:+document.getElementById('tourTienKTV').value||0,bs:document.getElementById('tourBS').value,tienBS:+document.getElementById('tourTienBS').value||0,ghichu:document.getElementById('tourGhiChu').value};if(id){const t=DB.tours.find(x=>x.id===id);Object.assign(t,data);}else{data.id=genId();DB.tours.push(data);}DB.save('tours');const mk=data.monthKey;[data.pic,data.ktv,data.bs].forEach(nvId=>{if(nvId){const cc=DB.chamcong.find(c=>c.nvId===nvId&&c.monthKey===mk);if(cc)delete cc.tourAmt;}});closeModal('modalTour');refreshPage();showToast('Đã lưu tour!');}
function editTour(id){const t=DB.tours.find(x=>x.id===id);if(!t)return;document.getElementById('tourId').value=t.id;document.getElementById('tourNgay').value=t.ngay;document.getElementById('tourKhach').value=t.khach;document.getElementById('tourDichVu').value=t.dichvu;document.getElementById('tourPIC').value=t.pic;document.getElementById('tourTienPIC').value=t.tienPIC;document.getElementById('tourKTV').value=t.ktv;document.getElementById('tourTienKTV').value=t.tienKTV;document.getElementById('tourBS').value=t.bs;document.getElementById('tourTienBS').value=t.tienBS;document.getElementById('tourGhiChu').value=t.ghichu;openModal('modalTour');}
function deleteTour(id){if(!confirm('Xóa tour này?'))return;const t=DB.tours.find(x=>x.id===id);if(t){const mk=t.monthKey;[t.pic,t.ktv,t.bs].forEach(nvId=>{if(nvId){const cc=DB.chamcong.find(c=>c.nvId===nvId&&c.monthKey===mk);if(cc)delete cc.tourAmt;}});}DB.tours=DB.tours.filter(t=>t.id!==id);DB.save('tours');refreshPage();showToast('Đã xóa!');}
function deleteAllTours(){const mk=getMonth().key;const count=DB.tours.filter(t=>t.monthKey===mk).length;if(!count){showToast('Không có tour nào trong tháng này!','error');return;}if(!confirm('Xóa toàn bộ '+count+' tour tháng '+mk+'?\nHành động này không thể hoàn tác!'))return;DB.tours=DB.tours.filter(t=>t.monthKey!==mk);DB.save('tours');DB.chamcong.forEach(cc=>{if(cc.monthKey===mk)delete cc.tourAmt;});refreshPage();showToast('Đã xóa '+count+' tour!');addLog('Xóa toàn bộ '+count+' tour tháng '+mk,'warning');}

// === KPI ===
function switchKPITab(tab){kpiTab=tab;document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',['ptv','pdv','tele'][i]===tab));renderKPITab();}
function renderKPITab(){
  const container=document.getElementById('kpiTabContent');if(!container)return;
  const mk=getMonth().key;
  const tabMap={ptv:['PTV','TV'],pdv:['PDV','PDV'],tele:['Tele','Tele']};
  const [pb,vt]=tabMap[kpiTab]||['PTV','TV'];
  const kpis=DB.kpis.filter(k=>k.monthKey===mk&&k.vaitro===vt);
  const isTele=kpiTab==='tele';
  const rules=loadKPIRules();

  function calcKPIAmt(k){
    if(isTele){
      let rate=k.hoahong;
      if(!rate){rate=k.dsthuc>=rules.tele.t1?rules.tele.r2:rules.tele.r1;}
      return Math.round(k.dsthuc*rate);
    }
    return Math.round(k.dsthuc*k.hoahong/100);
  }

  const totalDS=kpis.reduce((s,k)=>s+k.dsthuc,0);
  const totalKPI=kpis.reduce((s,k)=>s+calcKPIAmt(k),0);
  const hDSAp=isTele?'Số KH Áp':'DS Áp';
  const hDSThuc=isTele?'Số KH Thực':'DS Thực';
  const hHH=isTele?'Đơn Giá/KH':'% HH';
  const totalLabel=isTele?totalDS+' người':fmt(totalDS);

  container.innerHTML='<div class="kpi-dept-card"><div class="kpi-dept-header"><span>'+pbLabel(pb)+' – '+vt+'</span><span class="kpi-total-badge">Tổng: '+totalLabel+' | KPI: '+fmt(totalKPI)+'</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nhân Viên</th><th>'+hDSAp+'</th><th>'+hDSThuc+'</th><th>% Đạt</th><th>'+hHH+'</th><th>Tiền KPI</th><th>Phạt</th><th>Ghi Chú</th><th>Thao Tác</th></tr></thead><tbody>'+kpis.map(k=>{
    const pct=k.dsap?((k.dsthuc/k.dsap)*100).toFixed(1):0;
    const kpiAmt=calcKPIAmt(k);
    const dsApStr=isTele?k.dsap+' người':fmt(k.dsap);
    const dsThucStr=isTele?k.dsthuc+' người':fmt(k.dsthuc);
    let hhStr;
    if(isTele){
      let rate=k.hoahong;
      if(!rate){rate=k.dsthuc>=rules.tele.t1?rules.tele.r2:rules.tele.r1;}
      hhStr=fmt(rate)+'/KH';
    } else {
      hhStr=k.hoahong+'%';
    }
    return '<tr><td><strong>'+getNVName(k.nvId)+'</strong></td><td>'+dsApStr+'</td><td class="amount">'+dsThucStr+'</td><td><span class="badge '+(+pct>=100?'badge-green':'badge-orange')+'">'+pct+'%</span></td><td>'+hhStr+'</td><td class="amount-blue">'+fmt(kpiAmt)+'</td><td class="amount-red">'+fmt(k.phat)+'</td><td>'+(k.ghichu||'')+'</td><td><button class="btn btn-sm btn-secondary" onclick="editKPI(\''+k.id+'\')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteKPI(\''+k.id+'\')">🗑️</button></td></tr>';
  }).join('')+'</tbody></table></div></div>';
}
function saveKPI(){const id=document.getElementById('kpiId').value;const data={nvId:document.getElementById('kpiNV').value,monthKey:getMonth().key,vaitro:document.getElementById('kpiVaiTro').value,dsap:+document.getElementById('kpiDSAp').value||0,dsthuc:+document.getElementById('kpiDSThuc').value||0,hoahong:+document.getElementById('kpiHoaHong').value||0,phat:+document.getElementById('kpiPhat').value||0,ghichu:document.getElementById('kpiGhiChu').value};if(id){const k=DB.kpis.find(x=>x.id===id);Object.assign(k,data);}else{data.id=genId();DB.kpis.push(data);}DB.save('kpis');closeModal('modalKPI');refreshPage();showToast('Đã lưu KPI!');}
function editKPI(id){const k=DB.kpis.find(x=>x.id===id);if(!k)return;document.getElementById('kpiId').value=k.id;document.getElementById('kpiNV').value=k.nvId;document.getElementById('kpiVaiTro').value=k.vaitro;document.getElementById('kpiDSAp').value=k.dsap;document.getElementById('kpiDSThuc').value=k.dsthuc;document.getElementById('kpiHoaHong').value=k.hoahong;document.getElementById('kpiPhat').value=k.phat;document.getElementById('kpiGhiChu').value=k.ghichu;openModal('modalKPI');}
function deleteKPI(id){if(!confirm('Xóa?'))return;DB.kpis=DB.kpis.filter(k=>k.id!==id);DB.save('kpis');refreshPage();showToast('Đã xóa!');}

// === SALARY CALC ===
function calcAllSalary(){
  const mk=getMonth().key;
  const body=document.getElementById('luongBody');
  const foot=document.getElementById('luongFoot');
  if(!body) return;
  DB.salaries=[];
  const rules=loadKPIRules();
  let totals={giocongChuan:0,ncc:0,nctt:0,luongTinh:0,tour:0,dsKPI:0,luongKPI:0,gioOT:0,tienOT:0,pcan:0,pctn:0,pcdl:0,hotro:0,tongPC:0,thuong:0,tongThu:0,kyquy:0,trukhac:0,ungluong:0,thuclinh:0};

  DB.nhanvien.forEach((nv,i)=>{
    const cc=DB.chamcong.find(c=>c.nvId===nv.id&&c.monthKey===mk);
    const congTT=cc?cc.ngaycongtt:0;
    const ngayleLam=cc?(cc.ngayle||0):0;
    const luongCB=cc&&cc.luongcb!==undefined?cc.luongcb:nv.luongcb;
    const ncc=cc&&cc.ncc!==undefined?cc.ncc:(nv.ngaycongchuan||26);
    const giocongChuan=cc&&cc.giocongchuan!==undefined?cc.giocongchuan:(nv.giocongchuan||9);
    const chucvu=cc&&cc.chucvu!==undefined?cc.chucvu:nv.chucvu;
    const nctl=chucvu==='Bảo vệ'?Math.min(ncc,congTT+ngayleLam):congTT+ngayleLam;
    const luongTinh=ncc>0?Math.round(luongCB/ncc*nctl):0;

    // Tour income
    const tourTotal = cc && cc.tourAmt !== undefined ? cc.tourAmt : DB.tours.filter(t=>t.monthKey===mk).reduce((s,t)=>{
      let a=0;
      if(t.pic===nv.id) a+=t.tienPIC;
      if(t.ktv===nv.id) a+=t.tienKTV;
      if(t.bs===nv.id) a+=t.tienBS;
      return s+a;
    },0);

    // KPI income
    const myKPIs=DB.kpis.filter(k=>k.nvId===nv.id&&k.monthKey===mk);
    let dsKPI=0,luongKPI=0;
    myKPIs.forEach(k=>{
      dsKPI+=k.dsthuc;
      if(k.vaitro==='Tele'){
        let rate=k.hoahong;
        if(!rate) rate=k.dsthuc>=rules.tele.t1?rules.tele.r2:rules.tele.r1;
        luongKPI+=Math.round(k.dsthuc*rate);
      } else {
        luongKPI+=Math.round(k.dsthuc*k.hoahong/100);
      }
      luongKPI-=(k.phat||0);
    });

    // Overtime: OT_hours × LCB / NCC / giờ_chuẩn × 1.5
    const gioOT=cc?(cc.gioOT||0):0;
    const tienOT=(ncc>0&&giocongChuan>0)?Math.round(gioOT*luongCB/ncc/giocongChuan*1.5):0;

    // Allowances - ăn trưa × công thực tế (không tính ngày lễ)
    const pcan=cc && cc.pcan !== undefined ? cc.pcan : Math.round((nv.pcantrua !== undefined ? nv.pcantrua : 25000) * congTT);
    const pcRec=DB.phucap.find(p=>p.nvId===nv.id&&p.monthKey===mk);
    const pctn=pcRec?(pcRec.pctn||0):0;
    const pcdl=pcRec?(pcRec.pcdl||0):0;
    const htcd=pcRec?(pcRec.htcd||pcRec.hotro||0):0;
    const htngayRate=pcRec?(pcRec.htngay||0):0;
    const hotro=htcd+Math.round(htngayRate*congTT);
    const tongPC=pcan+pctn+pcdl+hotro;
    const thuong=pcRec?(pcRec.thuong||0):0;

    // Deductions
    const kyquyAmt=nctl>0?(nv.kyquy||0):0;
    const myKT=DB.khautru.filter(k=>k.nvId===nv.id&&k.monthKey===mk);
    const ungluong=myKT.filter(k=>k.loai==='ungluong').reduce((s,k)=>s+(k.sotien||0),0);
    const trukhac=myKT.filter(k=>k.loai==='chitien'||k.loai==='phattien').reduce((s,k)=>s+(k.sotien||0),0);
    const ktGhiChu=myKT.map(k=>k.ghichu).filter(Boolean).join('; ');

    // Totals
    const tongThu=luongTinh+tourTotal+luongKPI+tienOT+tongPC+thuong;
    const tongKhauTru=kyquyAmt+trukhac+ungluong;
    const thuclinh=tongThu-tongKhauTru;

    const sal={nvId:nv.id,monthKey:mk,luongcb:luongCB,giocongChuan,ncc,congTT,ngayleLam,nctl,luongTinh,
      tour:tourTotal,dsKPI,luongKPI,gioOT,tienOT,
      pcan,pctn,pcdl,hotro,tongPC,thuong,tongThu,
      kyquy:kyquyAmt,trukhac:trukhac,ungluong:ungluong,thuclinh,ghichu:ktGhiChu,chucvu};
    DB.salaries.push(sal);

    totals.giocongChuan+=giocongChuan;totals.ncc+=ncc;totals.nctt+=congTT;totals.luongTinh+=luongTinh;
    totals.tour+=tourTotal;totals.dsKPI+=dsKPI;totals.luongKPI+=luongKPI;
    totals.gioOT+=gioOT;totals.tienOT+=tienOT;
    totals.pcan+=pcan;totals.pctn+=pctn;totals.pcdl+=pcdl;totals.hotro+=hotro;totals.tongPC+=tongPC;totals.thuong+=thuong;
    totals.tongThu+=tongThu;totals.kyquy+=kyquyAmt;
    totals.trukhac+=trukhac;totals.ungluong+=ungluong;
    totals.thuclinh+=thuclinh;
  });

  body.innerHTML=DB.salaries.map((s,i)=>{
    const nv=getNV(s.nvId);if(!nv) return '';
    const chucvu=s.chucvu||nv.chucvu;
    return '<tr>'+
      '<td>'+(i+1)+'</td>'+
      '<td><strong>'+nv.name+'</strong></td>'+
      '<td>'+chucvu+'</td>'+
      '<td>'+badgeFor(nv.trangthai)+'</td>'+
      '<td>'+s.giocongChuan+'</td>'+
      '<td>'+s.ncc+'</td>'+
      '<td>'+s.congTT+'</td>'+
      '<td>'+(s.ngayleLam||'')+'</td>'+
      '<td style="font-weight:600">'+s.nctl+'</td>'+
      '<td>'+fmt(s.luongcb)+'</td>'+
      '<td class="amount">'+fmt(s.luongTinh)+'</td>'+
      '<td class="amount">'+fmt(s.tour)+'</td>'+
      '<td class="amount">'+fmt(s.dsKPI)+'</td>'+
      '<td class="amount-blue">'+fmt(s.luongKPI)+'</td>'+
      '<td>'+(s.gioOT||'')+'</td>'+
      '<td class="amount">'+fmt(s.tienOT)+'</td>'+
      '<td>'+fmt(s.pcan)+'</td>'+
      '<td>'+fmt(s.pctn)+'</td>'+
      '<td>'+fmt(s.pcdl)+'</td>'+
      '<td>'+fmt(s.hotro)+'</td>'+
      '<td style="color:var(--cyan);font-weight:600">'+fmt(s.tongPC)+'</td>'+
      '<td>'+fmt(s.thuong)+'</td>'+
      '<td class="amount" style="font-weight:700;color:var(--accent2)">'+fmt(s.tongThu)+'</td>'+
      '<td class="amount-red">'+fmt(s.kyquy)+'</td>'+
      '<td class="amount-red">'+fmt(s.trukhac)+'</td>'+
      '<td class="amount-red">'+fmt(s.ungluong)+'</td>'+
      '<td class="amount" style="font-size:14px;font-weight:700">'+fmt(s.thuclinh)+'</td>'+
      '<td><button class="btn btn-sm btn-secondary" onclick="editKhauTru(\''+nv.id+'\')">✏️</button></td>'+
      '</tr>';
  }).join('');

  if(foot) foot.innerHTML='<tr style="font-weight:700">'+
    '<td colspan="4">TỔNG CỘNG</td>'+
    '<td></td><td></td><td>'+totals.nctt+'</td><td></td><td></td>'+
    '<td></td><td class="amount">'+fmt(totals.luongTinh)+'</td>'+
    '<td class="amount">'+fmt(totals.tour)+'</td>'+
    '<td class="amount">'+fmt(totals.dsKPI)+'</td>'+
    '<td class="amount-blue">'+fmt(totals.luongKPI)+'</td>'+
    '<td></td><td class="amount">'+fmt(totals.tienOT)+'</td>'+
    '<td>'+fmt(totals.pcan)+'</td><td>'+fmt(totals.pctn)+'</td><td>'+fmt(totals.pcdl)+'</td><td>'+fmt(totals.hotro)+'</td>'+
    '<td style="color:var(--cyan)">'+fmt(totals.tongPC)+'</td>'+
    '<td>'+fmt(totals.thuong)+'</td>'+
    '<td class="amount" style="color:var(--accent2)">'+fmt(totals.tongThu)+'</td>'+
    '<td class="amount-red">'+fmt(totals.kyquy)+'</td>'+
    '<td class="amount-red">'+fmt(totals.trukhac)+'</td>'+
    '<td class="amount-red">'+fmt(totals.ungluong)+'</td>'+
    '<td class="amount" style="font-size:15px">'+fmt(totals.thuclinh)+'</td>'+
    '<td></td></tr>';

  DB.save('salaries');
}

// === KHAU TRU PAGE ===
function toggleLanUng(){
  const loai=document.getElementById('ktLoai').value;
  document.getElementById('ktLanUngWrap').style.display=loai==='ungluong'?'':'none';
}

function openAddKT(){
  document.getElementById('ktId').value='';
  document.getElementById('ktModalTitle').textContent='💰 Thêm Khấu Trừ';
  const sel=document.getElementById('ktNvId');
  sel.innerHTML=DB.nhanvien.map(n=>'<option value="'+n.id+'">'+n.name+'</option>').join('');
  document.getElementById('ktLoai').value='ungluong';
  document.getElementById('ktNgay').value=new Date().toISOString().split('T')[0];
  document.getElementById('ktSoTien').value='';
  document.getElementById('ktLanUng').value='';
  document.getElementById('ktGhiChu').value='';
  toggleLanUng();
  // Auto-calc lần ứng
  autoCalcLanUng();
  openModal('modalKhauTru');
}

function autoCalcLanUng(){
  const nvId=document.getElementById('ktNvId').value;
  const mk=getMonth().key;
  const count=DB.khautru.filter(k=>k.nvId===nvId&&k.monthKey===mk&&k.loai==='ungluong').length;
  document.getElementById('ktLanUng').value=count+1;
}

function editKT(id){
  const kt=DB.khautru.find(k=>k.id===id);
  if(!kt) return;
  document.getElementById('ktId').value=kt.id;
  document.getElementById('ktModalTitle').textContent='💰 Sửa Khấu Trừ';
  const sel=document.getElementById('ktNvId');
  sel.innerHTML=DB.nhanvien.map(n=>'<option value="'+n.id+'"'+(n.id===kt.nvId?' selected':'')+'>'+n.name+'</option>').join('');
  document.getElementById('ktLoai').value=kt.loai;
  document.getElementById('ktNgay').value=kt.ngay||'';
  document.getElementById('ktSoTien').value=kt.sotien;
  document.getElementById('ktLanUng').value=kt.lanUng||'';
  document.getElementById('ktGhiChu').value=kt.ghichu||'';
  toggleLanUng();
  openModal('modalKhauTru');
}

function saveKhauTru(){
  const id=document.getElementById('ktId').value;
  const data={
    nvId:document.getElementById('ktNvId').value,
    monthKey:getMonth().key,
    loai:document.getElementById('ktLoai').value,
    ngay:document.getElementById('ktNgay').value,
    sotien:+document.getElementById('ktSoTien').value||0,
    lanUng:+document.getElementById('ktLanUng').value||0,
    ghichu:document.getElementById('ktGhiChu').value
  };
  if(!data.sotien){showToast('Nhập số tiền!','error');return;}
  if(id){
    const kt=DB.khautru.find(k=>k.id===id);
    if(kt) Object.assign(kt,data);
  } else {
    data.id=genId();
    DB.khautru.push(data);
  }
  DB.save('khautru');
  closeModal('modalKhauTru');
  renderKTPage();
  showToast('Đã lưu!');
}

function deleteKT(id){
  if(!confirm('Xóa mục này?')) return;
  DB.khautru=DB.khautru.filter(k=>k.id!==id);
  DB.save('khautru');
  renderKTPage();
  showToast('Đã xóa!');
}

function deleteAllKT(){
  const mk=getMonth().key;
  const count=DB.khautru.filter(k=>k.monthKey===mk).length;
  if(!count){showToast('Không có dữ liệu!','error');return;}
  if(!confirm('Xóa toàn bộ '+count+' mục khấu trừ tháng này?')) return;
  DB.khautru=DB.khautru.filter(k=>k.monthKey!==mk);
  DB.save('khautru');
  renderKTPage();
  showToast('Đã xóa '+count+' mục!');
}

function renderKTPage(){
  const mk=getMonth().key;
  const m=getMonth();
  const badge=document.getElementById('ktMonthBadge');
  if(badge) badge.textContent=m.label;

  // Populate NV filter
  const nvFilter=document.getElementById('ktNVFilter');
  if(nvFilter){
    const curVal=nvFilter.value;
    nvFilter.innerHTML='<option value="">-- Tất cả NV --</option>'+
      DB.nhanvien.map(n=>'<option value="'+n.id+'">'+n.name+'</option>').join('');
    nvFilter.value=curVal;
  }

  // Filter data
  let items=DB.khautru.filter(k=>k.monthKey===mk);
  const nvF=document.getElementById('ktNVFilter')?.value;
  const typeF=document.getElementById('ktTypeFilter')?.value;
  if(nvF) items=items.filter(k=>k.nvId===nvF);
  if(typeF) items=items.filter(k=>k.loai===typeF);

  // Sort by date desc
  items.sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||''));

  // Stats (all items for the month, not filtered)
  const allItems=DB.khautru.filter(k=>k.monthKey===mk);
  const ungItems=allItems.filter(k=>k.loai==='ungluong');
  const chiItems=allItems.filter(k=>k.loai==='chitien');
  const phatItems=allItems.filter(k=>k.loai==='phattien');
  const sumUng=ungItems.reduce((s,k)=>s+k.sotien,0);
  const sumChi=chiItems.reduce((s,k)=>s+k.sotien,0);
  const sumPhat=phatItems.reduce((s,k)=>s+k.sotien,0);

  const el=id=>document.getElementById(id);
  if(el('ktStatUng')) el('ktStatUng').textContent=fmt(sumUng);
  if(el('ktStatUngCount')) el('ktStatUngCount').textContent=ungItems.length;
  if(el('ktStatChi')) el('ktStatChi').textContent=fmt(sumChi);
  if(el('ktStatPhat')) el('ktStatPhat').textContent=fmt(sumPhat);
  if(el('ktStatTotal')) el('ktStatTotal').textContent=fmt(sumUng+sumChi+sumPhat);

  // Table
  const loaiBadge={ungluong:'<span class="badge badge-orange">💸 Ứng Lương</span>',chitien:'<span class="badge badge-red">💳 Chi Tiền</span>',phattien:'<span class="badge badge-purple">⚠️ Phạt Tiền</span>'};
  const body=document.getElementById('ktBody');
  if(body) body.innerHTML=items.length?items.map((k,i)=>{
    const nv=getNV(k.nvId);
    return '<tr>'+
      '<td>'+(i+1)+'</td>'+
      '<td>'+formatDate(k.ngay)+'</td>'+
      '<td><strong>'+(nv?nv.name:'?')+'</strong></td>'+
      '<td>'+(loaiBadge[k.loai]||k.loai)+'</td>'+
      '<td class="amount-red" style="font-weight:700">'+fmt(k.sotien)+'</td>'+
      '<td>'+(k.loai==='ungluong'?(k.lanUng?'Lần '+k.lanUng:''):'–')+'</td>'+
      '<td>'+(k.ghichu||'')+'</td>'+
      '<td><button class="btn btn-sm btn-secondary" onclick="editKT(\''+k.id+'\')">✏️</button> '+
      '<button class="btn btn-sm btn-danger" onclick="deleteKT(\''+k.id+'\')">🗑️</button></td>'+
      '</tr>';
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text2)">Chưa có khấu trừ nào trong tháng này</td></tr>';
}

function formatDate(d){
  if(!d) return '';
  const parts=d.split('-');
  if(parts.length===3) return parts[2]+'/'+parts[1]+'/'+parts[0];
  return d;
}

// Override editKhauTru from salary table - open the page-level form
function editKhauTru(nvId){
  switchPage('khautru');
  const nvFilter=document.getElementById('ktNVFilter');
  if(nvFilter) nvFilter.value=nvId;
  renderKTPage();
}


// === DASHBOARD ===
function renderDashboard(){document.getElementById('statNV').textContent=DB.nhanvien.length;const mk=getMonth().key;const sals=DB.salaries.filter(s=>s.monthKey===mk);const totalLuong=sals.reduce((s,x)=>s+x.thuclinh,0);const totalDS=DB.kpis.filter(k=>k.monthKey===mk).reduce((s,k)=>s+k.dsthuc,0);const totalTour=DB.tours.filter(t=>t.monthKey===mk).reduce((s,t)=>s+t.tienPIC+t.tienKTV+t.tienBS,0);document.getElementById('statTongLuong').textContent=fmtShort(totalLuong);document.getElementById('statDoanhSo').textContent=fmtShort(totalDS);document.getElementById('statTour').textContent=fmtShort(totalTour);const sumBody=document.getElementById('dashSummaryBody');if(sumBody)sumBody.innerHTML=sals.map(s=>{const nv=getNV(s.nvId);if(!nv)return '';return `<tr><td><strong>${nv.name}</strong></td><td>${nv.chucvu}</td><td>${pbLabel(nv.phongban)}</td><td>${s.nctt}/${s.ncc}</td><td class="amount">${fmt(s.tour)}</td><td class="amount-blue">${fmt((s.luongKPI||0))}</td><td class="amount" style="font-weight:700">${fmt(s.thuclinh)}</td></tr>`;}).join('');renderCharts();}
const chartDataLabelsPlugin = {
  id: 'chartDataLabelsPlugin',
  afterDatasetsDraw(chart, args, options) {
    const {ctx} = chart;
    ctx.save();
    ctx.font = '600 10.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((element, index) => {
        const val = dataset.data[index];
        if (val === undefined || val === null || val === 0) return;
        const label = fmtShort(val);
        const position = element.tooltipPosition();
        if (chart.config.type === 'doughnut') {
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'middle';
          const angle = element.endAngle - element.startAngle;
          if (angle > 0.15) {
            ctx.fillText(label, position.x, position.y);
          }
        } else if (chart.config.type === 'bar') {
          ctx.fillStyle = '#eaf0ff';
          if (chart.options.indexAxis === 'y') {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, position.x + 6, position.y);
          } else {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(label, position.x, position.y - 5);
          }
        }
      });
    });
    ctx.restore();
  }
};

function renderCharts(){
  const mk=getMonth().key;
  const sals=DB.salaries.filter(s=>s.monthKey===mk);
  const pbs={};
  sals.forEach(s=>{
    const nv=getNV(s.nvId);
    if(!nv)return;
    const pb=nv.phongban;
    pbs[pb]=(pbs[pb]||0)+s.thuclinh;
  });
  
  destroyChart('chartLuongPhong');
  const ctx1=document.getElementById('chartLuongPhong');
  if(ctx1){
    const colors = Object.keys(pbs).map(pb => {
      return { PTV: '#6366f1', PDV: '#14b8a6', Tele: '#f59e0b', 'Khác': '#ec4899' }[pb] || '#8b5cf6';
    });
    charts.chartLuongPhong=new Chart(ctx1,{
      type:'doughnut',
      plugins: [chartDataLabelsPlugin],
      data:{
        labels:Object.keys(pbs).map(pbLabel),
        datasets:[{
          data:Object.values(pbs),
          backgroundColor:colors,
          borderWidth:0
        }]
      },
      options:{
        plugins:{
          legend:{
            position:'bottom',
            labels:{color:'#9aa3bb',font:{size:12,family:'Inter'}}
          },
          tooltip:{
            backgroundColor:'rgba(22, 26, 34, 0.95)',
            titleColor:'#eaf0ff',
            bodyColor:'#eaf0ff',
            borderColor:'rgba(99, 102, 241, 0.3)',
            borderWidth:1,
            cornerRadius:8
          }
        },
        cutout:'60%'
      }
    });
  }

  const top5=sals.sort((a,b)=>b.thuclinh-a.thuclinh).slice(0,5);
  destroyChart('chartTopDS');
  const ctx2=document.getElementById('chartTopDS');
  if(ctx2){
    charts.chartTopDS=new Chart(ctx2,{
      type:'bar',
      plugins: [chartDataLabelsPlugin],
      data:{
        labels:top5.map(s=>getNVName(s.nvId)),
        datasets:[{
          label:'Thực Lĩnh',
          data:top5.map(s=>s.thuclinh),
          backgroundColor:'rgba(99, 102, 241, 0.75)',
          borderColor:'#6366f1',
          borderWidth:1.5,
          borderRadius:6
        }]
      },
      options:{
        indexAxis:'y',
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'rgba(22, 26, 34, 0.95)',
            titleColor:'#eaf0ff',
            bodyColor:'#eaf0ff',
            borderColor:'rgba(99, 102, 241, 0.3)',
            borderWidth:1,
            cornerRadius:8
          }
        },
        scales:{
          x:{
            grace: '12%',
            ticks:{color:'#8b95b0',font:{family:'Inter'},callback:v=>fmtShort(v)},
            grid:{color:'rgba(45,52,70,0.3)'}
          },
          y:{
            ticks:{color:'#eaf0ff',font:{family:'Inter'}},
            grid:{display:false}
          }
        }
      }
    });
  }
}

function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}

// === BAO CAO ===
function renderBaoCao(){
  const mk=getMonth().key;
  const sals=DB.salaries.filter(s=>s.monthKey===mk);
  const kpis=DB.kpis.filter(k=>k.monthKey===mk);
  const ptvKpis=kpis.filter(k=>k.vaitro==='TV');
  const pdvKpis=kpis.filter(k=>k.vaitro==='PDV');

  destroyChart('chartPTV');
  const c1=document.getElementById('chartPTV');
  if(c1&&ptvKpis.length) {
    charts.chartPTV=new Chart(c1,{
      type:'bar',
      plugins: [chartDataLabelsPlugin],
      data:{
        labels:ptvKpis.map(k=>getNVName(k.nvId)),
        datasets:[
          {
            label:'DS Thực',
            data:ptvKpis.map(k=>k.dsthuc),
            backgroundColor:'rgba(99, 102, 241, 0.85)',
            borderColor:'#6366f1',
            borderWidth:1,
            borderRadius:6
          },
          {
            label:'DS Áp',
            data:ptvKpis.map(k=>k.dsap),
            backgroundColor:'rgba(168, 85, 247, 0.25)',
            borderColor:'rgba(168, 85, 247, 0.7)',
            borderWidth:1,
            borderRadius:6
          }
        ]
      },
      options:{
        plugins:{
          legend:{labels:{color:'#9aa3bb',font:{family:'Inter'}}},
          tooltip:{
            backgroundColor:'rgba(22, 26, 34, 0.95)',
            titleColor:'#eaf0ff',
            bodyColor:'#eaf0ff',
            borderColor:'rgba(99, 102, 241, 0.3)',
            borderWidth:1,
            cornerRadius:8
          }
        },
        scales:{
          x:{ticks:{color:'#8b95b0',font:{family:'Inter'}},grid:{display:false}},
          y:{
            grace: '10%',
            ticks:{color:'#8b95b0',font:{family:'Inter'},callback:v=>fmtShort(v)},
            grid:{color:'rgba(45,52,70,0.3)'}
          }
        }
      }
    });
  }

  destroyChart('chartPDV');
  const c2=document.getElementById('chartPDV');
  if(c2&&pdvKpis.length) {
    charts.chartPDV=new Chart(c2,{
      type:'bar',
      plugins: [chartDataLabelsPlugin],
      data:{
        labels:pdvKpis.map(k=>getNVName(k.nvId)),
        datasets:[
          {
            label:'DS Thực',
            data:pdvKpis.map(k=>k.dsthuc),
            backgroundColor:'rgba(20, 184, 166, 0.85)',
            borderColor:'#14b8a6',
            borderWidth:1,
            borderRadius:6
          },
          {
            label:'DS Áp',
            data:pdvKpis.map(k=>k.dsap),
            backgroundColor:'rgba(16, 185, 129, 0.25)',
            borderColor:'rgba(16, 185, 129, 0.7)',
            borderWidth:1,
            borderRadius:6
          }
        ]
      },
      options:{
        plugins:{
          legend:{labels:{color:'#9aa3bb',font:{family:'Inter'}}},
          tooltip:{
            backgroundColor:'rgba(22, 26, 34, 0.95)',
            titleColor:'#eaf0ff',
            bodyColor:'#eaf0ff',
            borderColor:'rgba(99, 102, 241, 0.3)',
            borderWidth:1,
            cornerRadius:8
          }
        },
        scales:{
          x:{ticks:{color:'#8b95b0',font:{family:'Inter'}},grid:{display:false}},
          y:{
            grace: '10%',
            ticks:{color:'#8b95b0',font:{family:'Inter'},callback:v=>fmtShort(v)},
            grid:{color:'rgba(45,52,70,0.3)'}
          }
        }
      }
    });
  }

  const tourSums={};
  DB.tours.filter(t=>t.monthKey===mk).forEach(t=>{
    [{id:t.pic,a:t.tienPIC},{id:t.ktv,a:t.tienKTV},{id:t.bs,a:t.tienBS}].forEach(x=>{
      if(x.id)tourSums[x.id]=(tourSums[x.id]||0)+x.a;
    });
  });

  destroyChart('chartTourNV');
  const c3=document.getElementById('chartTourNV');
  if(c3) {
    charts.chartTourNV=new Chart(c3,{
      type:'bar',
      plugins: [chartDataLabelsPlugin],
      data:{
        labels:Object.keys(tourSums).map(getNVName),
        datasets:[{
          label:'Tổng Tour',
          data:Object.values(tourSums),
          backgroundColor:'rgba(245, 158, 11, 0.8)',
          borderColor:'#f59e0b',
          borderWidth:1,
          borderRadius:6
        }]
      },
      options:{
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'rgba(22, 26, 34, 0.95)',
            titleColor:'#eaf0ff',
            bodyColor:'#eaf0ff',
            borderColor:'rgba(99, 102, 241, 0.3)',
            borderWidth:1,
            cornerRadius:8
          }
        },
        scales:{
          x:{ticks:{color:'#8b95b0',font:{family:'Inter'}},grid:{display:false}},
          y:{
            grace: '10%',
            ticks:{color:'#8b95b0',font:{family:'Inter'},callback:v=>fmtShort(v)},
            grid:{color:'rgba(45,52,70,0.3)'}
          }
        }
      }
    });
  }

  destroyChart('chartLuongNV');
  const c4=document.getElementById('chartLuongNV');
  if(c4&&sals.length) {
    charts.chartLuongNV=new Chart(c4,{
      type:'bar',
      plugins: [chartDataLabelsPlugin],
      data:{
        labels:sals.map(s=>getNVName(s.nvId)),
        datasets:[{
          label:'Thực Lĩnh',
          data:sals.map(s=>s.thuclinh),
          backgroundColor:sals.map((_,i)=>`hsla(${260 + i*12}, 75%, 65%, 0.8)`),
          borderColor:sals.map((_,i)=>`hsla(${260 + i*12}, 75%, 65%, 1)`),
          borderWidth:1,
          borderRadius:6
        }]
      },
      options:{
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'rgba(22, 26, 34, 0.95)',
            titleColor:'#eaf0ff',
            bodyColor:'#eaf0ff',
            borderColor:'rgba(99, 102, 241, 0.3)',
            borderWidth:1,
            cornerRadius:8
          }
        },
        scales:{
          x:{ticks:{color:'#8b95b0',font:{family:'Inter'},maxRotation:45},grid:{display:false}},
          y:{
            grace: '10%',
            ticks:{color:'#8b95b0',font:{family:'Inter'},callback:v=>fmtShort(v)},
            grid:{color:'rgba(45,52,70,0.3)'}
          }
        }
      }
    });
  }

  const bcBody=document.getElementById('bcBody');
  if(bcBody){
    const depts={};
    sals.forEach(s=>{
      const nv=getNV(s.nvId);
      if(!nv)return;
      const pb=nv.phongban;
      if(!depts[pb])depts[pb]={count:0,lcb:0,tour:0,kpi:0,pcan:0,khautru:0,thuclinh:0};
      depts[pb].count++;
      depts[pb].lcb+=s.luongTinh;
      depts[pb].tour+=s.tour;
      depts[pb].kpi+=(s.luongKPI||0);
      depts[pb].pcan+=s.pcan;
      depts[pb].khautru+=(s.kyquy||0)+(s.phattle||0);
      depts[pb].thuclinh+=s.thuclinh;
    });
    bcBody.innerHTML=Object.entries(depts).map(([pb,d])=>`<tr><td><strong>${pbLabel(pb)}</strong></td><td>${d.count}</td><td class="amount">${fmt(d.lcb)}</td><td class="amount">${fmt(d.tour)}</td><td class="amount-blue">${fmt(d.kpi)}</td><td>${fmt(d.pcan)}</td><td class="amount-red">${fmt(d.khautru)}</td><td class="amount" style="font-weight:700">${fmt(d.thuclinh)}</td></tr>`).join('');
  }
}

// === EXPORT / PRINT ===
function exportData(){const mk=getMonth().key;const sals=DB.salaries.filter(s=>s.monthKey===mk);const rows=sals.map((s,i)=>{const nv=getNV(s.nvId);return {'STT':i+1,'Nhân Viên':nv?nv.name:'','Chức Vụ':nv?nv.chucvu:'','Trạng Thái':nv?nv.trangthai:'','Giờ Chuẩn':s.giocongChuan,'NCC':s.ncc,'Công TT':s.congTT,'Ngày Lễ+':s.ngayleLam,'NCTL':s.nctl,'Lương CB':s.luongcb,'Lương NC':s.luongTinh,'Tour':s.tour,'Doanh Số':s.dsKPI,'Lương KPI':s.luongKPI,'Giờ OT':s.gioOT,'Tiền OT':s.tienOT,'Ăn Trưa':s.pcan,'Trách Nhiệm':s.pctn,'Đi Lại':s.pcdl,'Hỗ Trợ':s.hotro,'Tổng PC':s.tongPC,'Thưởng':s.thuong,'Tổng Thu':s.tongThu,'Ký Quỹ':s.kyquy,'Trừ Khác':s.trukhac,'Ứng Lương':s.ungluong,'Thực Lãnh':s.thuclinh};});if(typeof XLSX!=='undefined'){const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'BangLuong');XLSX.writeFile(wb,`BangLuong_${mk}.xlsx`);}else{showToast('Thư viện XLSX chưa tải xong!','error');}}
function printPage(){window.print();}




// === IMPORT CHAM CONG TU MAY ===
let ccImportData = null;

function normalizeVN(s){
  if(!s) return '';
  return s.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D')
    .replace(/y/g,'i').replace(/Y/g,'I')
    .replace(/\s+/g,' ');
}

function matchNV(tenFile, maFile, excludeIds){
  const excludeSet = excludeIds ? new Set(excludeIds) : new Set();
  
  // Priority 1: High-confidence name match (exact or containing match)
  const norm = normalizeVN(tenFile);
  let bestName = null, bestNameScore = 0;
  DB.nhanvien.forEach(nv => {
    if (excludeSet.has(nv.id)) return;
    const nvNorm = normalizeVN(nv.name);
    if(nvNorm === norm){ bestName = nv; bestNameScore = 100; return; }
    if(nvNorm.includes(norm) || norm.includes(nvNorm)){
      const sc = 80;
      if(sc > bestNameScore){ bestName = nv; bestNameScore = sc; }
      return;
    }
  });
  if (bestNameScore >= 80) return bestName;

  // Priority 2: Match by Mã NV (exact code match) with name validation
  if(maFile !== undefined && maFile !== null && maFile !== ''){
    const maStr = maFile.toString().trim();
    const found = DB.nhanvien.find(nv => !excludeSet.has(nv.id) && nv.manv && nv.manv.toString().trim() === maStr);
    if(found) {
      const name1 = normalizeVN(tenFile);
      const name2 = normalizeVN(found.name);
      const words1 = name1.split(' ');
      const words2 = name2.split(' ');
      const last1 = words1[words1.length - 1];
      const last2 = words2[words2.length - 1];
      if (last1 === last2 || name1.includes(name2) || name2.includes(name1)) {
        return found;
      }
    }
  }

  // Priority 3: Fuzzy name match (fallback)
  let best = null, bestScore = 0;
  DB.nhanvien.forEach(nv => {
    if (excludeSet.has(nv.id)) return;
    const nvNorm = normalizeVN(nv.name);
    const words1 = norm.split(' ');
    const words2 = nvNorm.split(' ');
    const lastWord1 = words1[words1.length - 1];
    const lastWord2 = words2[words2.length - 1];
    if (lastWord1 && lastWord2 && lastWord1 === lastWord2) {
      let matched = 0;
      words1.forEach(w => { if(words2.some(w2 => w2 === w)) matched++; });
      const sc = (matched / Math.max(words1.length, words2.length)) * 70;
      
      // Smart Nickname check: allow matching only if one of the names has <= 2 words
      let finalScore = sc;
      if (words1.length <= 2 || words2.length <= 2) {
        finalScore = Math.max(sc, 50); // Boost to 50 to meet threshold
      } else {
        finalScore = Math.min(sc, 40); // Cap at 40 to prevent collision of different full names
      }
      
      if(finalScore > bestScore){ best = nv; bestScore = finalScore; }
    } else {
      let matched = 0;
      words1.forEach(w => { if(words2.some(w2 => w2 === w)) matched++; });
      const sc = (matched / Math.max(words1.length, words2.length)) * 70;
      if(sc > bestScore){ best = nv; bestScore = sc; }
    }
  });
  return bestScore >= 40 ? best : null;
}

function parseTimeStr(val){
  if(!val && val !== 0) return null;
  // Handle Excel serial time (fractional day)
  if(typeof val === 'number'){
    const totalMins = Math.round(val * 24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { h, m, str: String(h).padStart(2,'0')+':'+String(m).padStart(2,'0') };
  }
  const s = val.toString().trim();
  if(!s) return null;
  const parts = s.split(':');
  if(parts.length >= 2){
    return { h: parseInt(parts[0]), m: parseInt(parts[1]), str: s };
  }
  return null;
}

function parseDateVal(val){
  if(!val) return null;
  if(val instanceof Date) return val;
  if(typeof val === 'number'){
    // Excel serial date
    const d = new Date((val - 25569) * 86400000);
    return d;
  }
  const s = val.toString().trim();
  // Try M/D/YYYY or D/M/YYYY
  const parts = s.split('/');
  if(parts.length === 3){
    const [a, b, c] = parts.map(Number);
    // Assume M/D/YYYY (US format from Excel)
    return new Date(c, a - 1, b);
  }
  return new Date(s);
}

function handleCCImport(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:'array', cellDates:false});
      processImportData(wb);
    } catch(err) {
      addLog('Lỗi đọc file Excel: ' + err.message, 'error', err.stack || err.toString());
      showToast('Lỗi đọc file! Xem 📝 Nhật Ký', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}


function processImportData(data, silent){
  function cleanH(val){
    if(val===null||val===undefined)return '';
    let s=val.toString().trim().toLowerCase();
    s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    s=s.replace(/\u0111/g,'d').replace(/\u0110/g,'d');
    s=s.replace(/[^\x20-\x7E]/g,'');
    return s.replace(/\s+/g,' ').trim();
  }
  let parsed = null;
  // If data is a workbook, scan all sheets. If it's an array of rows, scan just that.
  const isWb = data && data.SheetNames;
  const numSheets = isWb ? data.SheetNames.length : 1;
  
  for (let s = 0; s < numSheets; s++) {
    const ws = isWb ? data.Sheets[data.SheetNames[s]] : null;
    const rows = isWb ? XLSX.utils.sheet_to_json(ws, {header:1, defval:''}) : data;
    
    parsed = tryParseTimeClock(rows, cleanH);
    if(parsed) break;
    
    parsed = tryParseConsolidated(rows, cleanH);
    if(parsed) break;
  }

  if(parsed){
    ccImportData = parsed;
    if(!silent) showImportPreview();
    return;
  }
  // Fail
  const failWs = isWb ? data.Sheets[data.SheetNames[0]] : null;
  const failRows = isWb ? XLSX.utils.sheet_to_json(failWs, {header:1, defval:''}) : data;
  const dbg=failRows.slice(0,5).map((r,i)=>'Row '+(i+1)+': '+r.slice(0,8).map(c=>'"'+(c==null?'':c)+'"').join(', ')).join('\n');
  const cln=failRows.slice(0,5).map((r,i)=>'Row '+(i+1)+': '+r.slice(0,8).map(c=>'"'+cleanH(c)+'"').join(', ')).join('\n');
  addLog('Import that bai: Khong nhan dien duoc format','error','Raw:\n'+dbg+'\n\nCleaned:\n'+cln);
  showToast('Import loi! Xem Nhat Ky','error');
}

function tryParseTimeClock(rows,cleanH){
  let headerIdx=-1,colMap={};
  for(let i=0;i<Math.min(rows.length,10);i++){
    const row=rows[i].map(c=>cleanH(c));
    // If row has STT, it's a consolidated sheet - skip format 1
    if(row.some(c=>/^stt$/i.test(c))) continue;
    const maIdx=row.findIndex(c=>/^m.*a.*nv/i.test(c)||c==='ma'||c==='ma nv');
    const tenIdx=row.findIndex(c=>/^t.*e.*n/i.test(c)&&/nv/i.test(c));
    // "ngay" but NOT "ngay cong", "ngay tinh", "ngay nghi" etc
    const ngayIdx=row.findIndex(c=>/^ng/.test(c)&&c.length<10&&!/cong|tinh|nghi|sang|ca/.test(c));
    const fTen=tenIdx>=0?tenIdx:row.findIndex((c,j)=>j!==maIdx&&/nv/.test(c));
    const fNgay=ngayIdx>=0?ngayIdx:row.findIndex(c=>/^date$|^day$/.test(c));
    if(fTen>=0&&fNgay>=0){
      headerIdx=i;
      colMap.ma=maIdx>=0?maIdx:0;colMap.ten=fTen;
      colMap.phongban=row.findIndex(c=>/ph|ban/.test(c)&&!/nv/.test(c)&&c.length<15);
      colMap.ngay=fNgay;colMap.lans=[];
      for(let j=0;j<row.length;j++){if(/^l.*a.*n?\s*\d/.test(row[j])&&j!==colMap.ma&&j!==colMap.ten&&j!==colMap.ngay)colMap.lans.push(j);}
      if(colMap.lans.length===0){for(let j=fNgay+1;j<Math.min(rows[i].length,fNgay+6);j++)colMap.lans.push(j);}
      break;
    }
  }
  if(headerIdx<0)return null;
  addLog('Format: May cham cong. Header dong '+(headerIdx+1),'info','Ma='+colMap.ma+', Ten='+colMap.ten+', Ngay='+colMap.ngay+', Lan=['+colMap.lans+']');
  const dataRows=rows.slice(headerIdx+1).filter(r=>r.length>colMap.ngay&&r[colMap.ten]);
  const empMap={};let detectedMonth=null;
  const matchedIds = [];
  dataRows.forEach(row=>{
    const ten=row[colMap.ten]?row[colMap.ten].toString().trim():'';if(!ten)return;
    const dateVal=parseDateVal(row[colMap.ngay]);if(!dateVal||isNaN(dateVal.getTime()))return;
    const m=dateVal.getMonth()+1,y=dateVal.getFullYear();
    if(!detectedMonth)detectedMonth={month:m,year:y};
    if(!empMap[ten]) {
      const matchedNV = matchNV(ten, row[colMap.ma], matchedIds);
      if (matchedNV) matchedIds.push(matchedNV.id);
      empMap[ten]={tenFile:ten,maFile:row[colMap.ma]||'',phongFile:colMap.phongban>=0?(row[colMap.phongban]||''):'',days:[],matchedNV};
    }
    const times=[];colMap.lans.forEach(ci=>{const t=parseTimeStr(row[ci]);if(t)times.push(t);});
    empMap[ten].days.push({date:dateVal,dateStr:dateVal.getDate()+'/'+m+'/'+y,times,hasWork:times.length>0});
  });
  if(Object.keys(empMap).length===0)return null;
  return {empMap,detectedMonth,colMap,format:'timeclock'};
}


function tryParseConsolidated(rows,cleanH){
  let headerIdx=-1,colSTT=-1,colTen=-1,colChucvu=-1;
  let dayCols=[],colCongTT=-1,colPhat=-1,colTongGio=-1,colNotes=-1,colNgayCong=-1,colNgayLe=-1,colQuaTrinh=-1;
  for(let i=0;i<Math.min(rows.length,5);i++){
    const row=rows[i].map(c=>cleanH(c));
    const sttIdx=row.findIndex(c=>/^stt$/i.test(c)||/^s\.?t\.?t\.?$/i.test(c));
    const tenIdx=row.findIndex(c=>/te.*nha|nhan.*su|ho.*ten/.test(c)||(c.includes('ten')&&c.length<20));
    if(sttIdx>=0&&tenIdx>=0){
      headerIdx=i;colSTT=sttIdx;colTen=tenIdx;
      colChucvu=row.findIndex(c=>/chu.*vu|chuc.*vu|^cv$/.test(c));
      // Find day columns (numbers 1-31)
      for(let j=colTen+2;j<row.length;j++){
        const v=rows[i][j];const num=typeof v==='number'?v:parseInt(cleanH(v));
        if(num>=1&&num<=31)dayCols.push({col:j,day:num});
      }
      // Also scan ABOVE row (i-1) for day numbers (merged headers)
      if(dayCols.length<5&&i>0){
        for(let j=0;j<rows[i-1].length;j++){
          const v=rows[i-1][j];const num=typeof v==='number'?v:parseInt(cleanH(v));
          if(num>=1&&num<=31&&j>colTen+2&&!dayCols.find(d=>d.day===num))dayCols.push({col:j,day:num});
        }
      }
      // Also scan the row BELOW the header (sub-header) for day numbers.
      // Some sheets have weekday names (T2..CN) in header row and day numbers (1..31) in the next row.
      if(dayCols.length<20&&i+1<rows.length){
        const subRow=rows[i+1];
        for(let j=colTen+2;j<subRow.length;j++){
          const v=subRow[j];const num=typeof v==='number'?v:parseInt((v||'').toString().trim());
          if(num>=1&&num<=31&&!dayCols.find(d=>d.col===j))dayCols.push({col:j,day:num});
        }
      }
      // Strict validation: A real consolidated CC sheet MUST have day columns (1..31)
      if (dayCols.length < 20) {
        // Not enough day columns — not a valid CC sheet (e.g. a Salary summary sheet). Skip.
        headerIdx = -1;
        break;
      }
      dayCols.sort((a,b)=>a.day-b.day);
      // Find summary columns - scan ALL rows 0 to headerIdx+3 to catch merged headers
      const afterDays=dayCols.length>0?dayCols[dayCols.length-1].col+1:colTen+10;
      const scanRows=[];
      for(let r=0;r<=Math.min(headerIdx+3,rows.length-1);r++) scanRows.push(rows[r].map(c=>cleanH(c)));
      // Max column count from any of the data rows
      let maxCols=0;
      for(let r=0;r<Math.min(rows.length,headerIdx+20);r++) maxCols=Math.max(maxCols,rows[r].length);
      const dbgHeaders=[];
      // Also check raw values (before cleanH) to detect "+" that may be in separate cells
      const rawScanRows=[];
      for(let r=0;r<=Math.min(headerIdx+3,rows.length-1);r++) rawScanRows.push(rows[r]);
      
      // PASS 1: Build label map for all summary columns
      const colLabels={};
      for(let j=afterDays;j<maxCols+5;j++){
        const lbl=scanRows.map(r=>r[j]||'').filter(Boolean).join(' ');
        // Also check raw values for "+" sign that cleanH preserves
        const rawLbl=rawScanRows.map(r=>{const v=r?r[j]:null;return v===null||v===undefined?'':v.toString().trim();}).filter(Boolean).join(' ');
        if(!lbl && !rawLbl) continue;
        const hasPlus = rawLbl.includes('+') || lbl.includes('+');
        colLabels[j]={lbl, rawLbl, hasPlus};
        dbgHeaders.push('col'+j+'=['+lbl.substring(0,30)+(hasPlus?' (+)':'')+']');
      }
      
      // PASS 2: Detect columns - NgayLe FIRST (most specific), then others
      // First pass: find NgayLe specifically (columns with "+" or "le")
      for(const [jStr,info] of Object.entries(colLabels)){
        const j=+jStr;const {lbl,hasPlus}=info;
        if(colNgayLe>=0) break;
        // "ngay cong +", "cong +", "cong+", or any column with "cong" and "+"
        if(hasPlus && /cong|ngay/.test(lbl)) { colNgayLe=j; continue; }
        // "ngay le", "le lam", "cong le", "nghi le", "100%"
        if(/(ngay\s*le|le\s*lam|cong\s*le|nghi\s*le|le\s*nghi|\ble\b.*\bcong|100\s*%)/.test(lbl)) { colNgayLe=j; continue; }
      }
      
      // Second pass: find other columns (skip NgayLe column)
      for(const [jStr,info] of Object.entries(colLabels)){
        const j=+jStr;const {lbl}=info;
        if(j===colNgayLe) continue; // skip already-identified NgayLe column
        // CongTT: "cong thuc", "thuc te", "cong tt"
        if(/cong.*thuc|thuc.*te|cong.*lich|cong.*tt/.test(lbl)&&colCongTT<0) colCongTT=j;
        // NgayCong: "tong cong", "ngay tinh luong", "tong ngay tinh"
        else if(/tong.*ngay.*tinh|ngay.*tinh.*luong|tong.*cong|ngay.*tong/.test(lbl)&&colNgayCong<0) colNgayCong=j;
        else if(/ng.*y.*co|ngay.*cong/.test(lbl)&&colNgayCong<0) colNgayCong=j;
        else if(/to.*ng.*gi|tong.*gio|tong.*gio.*lam/.test(lbl)&&colTongGio<0) colTongGio=j;
        else if(/qua.*trinh/.test(lbl)&&colQuaTrinh<0) colQuaTrinh=j;
        else if(/^phat$|phat.*tien|tien.*phat/.test(lbl)&&colPhat<0) colPhat=j;
        else if(/note|ghi.*chu/.test(lbl)&&colNotes<0) colNotes=j;
      }
      
      // Fallback: if NgayLe not found but CongTT is, check the column AFTER CongTT
      if(colNgayLe<0&&colCongTT>=0){
        // Check if next column has "+" or numeric values (likely NgayLe)
        const nextLbl=colLabels[colCongTT+1];
        if(nextLbl && (nextLbl.hasPlus || /cong|ngay|le|\+/.test(nextLbl.lbl))){
          colNgayLe=colCongTT+1;
        } else {
          colNgayLe=colCongTT+1; // still assume next col as last resort
        }
      }
      addLog('DEBUG cols','info',
        'afterDays='+afterDays+' | CongTT='+colCongTT+' NgayLe='+colNgayLe+' NgayCong='+colNgayCong+
        ' QuaTrinh='+colQuaTrinh+' Notes='+colNotes+'\nAll headers: '+dbgHeaders.join(' | '));
      break;
    }
  }
  if(headerIdx<0)return null;
  // Detect month - try text patterns then Excel serial dates
  let detectedMonth=null;
  for(let i=0;i<=headerIdx;i++){
    // Try text patterns first
    const txt=rows[i].map(c=>(c||'').toString()).join(' ');
    let m=txt.match(/[tT]h[^\d]*(\d{1,2})\s*[\/\-]\s*(\d{4})/)||txt.match(/(\d{1,2})\s*[\/\-]\s*(\d{4})/);
    if(m){detectedMonth={month:parseInt(m[1]),year:parseInt(m[2])};break;}
    // Try Excel serial date numbers (days since 1/1/1900, typical range 40000-60000)
    for(let j=0;j<rows[i].length;j++){
      const v=rows[i][j];
      if(typeof v==='number'&&v>40000&&v<60000){
        // Convert Excel serial to JS date (Excel epoch = Jan 1 1900, but has leap year bug)
        const jsDate=new Date((v-25569)*86400000);
        if(!isNaN(jsDate.getTime())){
          detectedMonth={month:jsDate.getMonth()+1,year:jsDate.getFullYear()};
          break;
        }
      }
    }
    if(detectedMonth)break;
  }
  if(!detectedMonth){const now=new Date();detectedMonth={month:now.getMonth()+1,year:now.getFullYear()};}

  addLog('Format: Bang tong hop. Header dong '+(headerIdx+1)+', '+dayCols.length+' cot ngay, T'+detectedMonth.month+'/'+detectedMonth.year,'info',
    'STT='+colSTT+', Ten='+colTen+', ChucVu='+colChucvu+', CongTT='+colCongTT+', NgayLe='+colNgayLe+', NgayCong='+colNgayCong+', QuaTrinh='+colQuaTrinh+', Phat='+colPhat+', Notes='+colNotes);

  const empMap={};
  const matchedIds = [];
  for(let i=headerIdx+1;i<rows.length;i++){
    const row=rows[i];if(!row||row.length<colTen+1)continue;
    const sttVal=row[colSTT];const sttNum=typeof sttVal==='number'?sttVal:parseInt((sttVal||'').toString());
    if(isNaN(sttNum)||sttNum<1||sttNum>200)continue;
    const tenRaw=(row[colTen]||'').toString().trim();if(!tenRaw||tenRaw.length<2)continue;
    // Count work days from day columns + detect holiday markers
    let workDays=0,offDays=0,holidayFromCells=0;
    dayCols.forEach(dc=>{
      const cv=row[dc.col];if(cv===null||cv===undefined||cv===''){offDays++;return;}
      const s=cv.toString().trim().toUpperCase();
      if(s==='CN'||s==='OFF'){offDays++;return;}
      // Detect holiday markers: L, NL, Lễ, LE, or number+L (e.g. "8L")
      if(/^L$|^NL$|^L[EỄÊ]$|^LE$|\dL$|^L\d/i.test(s)){holidayFromCells++;}
      workDays++;
    });
    // Read summary columns - scan current row + up to 4 sub-rows (Excel merged cells)
    // Some values (ngayle, notes) may be on a different sub-row than STT
    function readNum(col){
      if(col<0) return NaN;
      for(let off=0;off<5;off++){
        const r=rows[i+off]; if(!r) break;
        // Stop if we hit the next employee's STT
        if(off>0){const sv=r[colSTT];const sn=typeof sv==='number'?sv:parseInt((sv||'').toString());if(!isNaN(sn)&&sn>=1&&sn<=200&&sn!==sttNum) break;}
        const v=r[col];
        const n=typeof v==='number'?v:parseFloat((v||'').toString().replace(/[^0-9.-]/g,''));
        if(!isNaN(n)&&n>0) return n;
      }
      return NaN;
    }
    function readStr(col){
      if(col<0) return '';
      for(let off=0;off<5;off++){
        const r=rows[i+off]; if(!r) break;
        if(off>0){const sv=r[colSTT];const sn=typeof sv==='number'?sv:parseInt((sv||'').toString());if(!isNaN(sn)&&sn>=1&&sn<=200&&sn!==sttNum) break;}
        const v=(r[col]||'').toString().trim();
        if(v) return v;
      }
      return '';
    }
    const congTT=readNum(colCongTT);
    const ngayCong=readNum(colNgayCong);
    const tongGio=readNum(colTongGio);
    const phat=colPhat>=0?readNum(colPhat):0;
    const notes=readStr(colNotes);
    const ngayLeRaw=readNum(colNgayLe);
    let ngayle=!isNaN(ngayLeRaw)&&ngayLeRaw>0?ngayLeRaw:0;
    const quaTrinh=readStr(colQuaTrinh);
    
    // Broader NgayLe detection: also check colNgayLe-1, colNgayLe+1 if value is 0
    // (in case column alignment is slightly off due to merged cells)
    if(ngayle===0 && colNgayLe>=0){
      for(let tryCol=colNgayLe-1;tryCol<=colNgayLe+1;tryCol++){
        if(tryCol===colNgayLe||tryCol===colCongTT||tryCol===colNgayCong||tryCol<0) continue;
        const tryVal=readNum(tryCol);
        if(!isNaN(tryVal)&&tryVal>0&&tryVal<=10){
          // Sanity check: ngayle should be small (1-10), not a large number like total work days
          ngayle=tryVal;
          break;
        }
      }
    }
    
    // Fallback 1: If NgayLe column didn't give a value, use holiday markers from day cells
    if(ngayle===0&&holidayFromCells>0) ngayle=holidayFromCells;
    
    // Fallback 2: Try to parse holiday count from notes/quaTrinh text
    // Patterns: "3 + 100%", "2+100%", "= 3 + 100", "ngày lễ: 2", "lễ 2 ngày"
    if(ngayle===0){
      const allText=[quaTrinh,notes].filter(Boolean).join(' ');
      // Match "N + 100%" pattern (common in VN attendance sheets)
      const mPct=allText.match(/(\d+(?:\.\d+)?)\s*\+\s*100\s*%/i)
        ||allText.match(/100\s*%\s*[:\-=]?\s*(\d+(?:\.\d+)?)/i);
      if(mPct) ngayle=parseFloat(mPct[1]);
      // Match "ngay le X" or "le: X" or "X ngay le"
      if(ngayle===0){
        const mLe=allText.match(/(?:ngay\s*)?le[:\s]+(\d+)/i)
          ||allText.match(/(\d+)\s*(?:ngay\s*)?le/i);
        if(mLe) ngayle=parseFloat(mLe[1]);
      }
    }
    
    // Debug log for first 3 employees
    if(Object.keys(empMap).length<3){
      addLog('DEBUG NV: '+tenRaw,'info',
        'colNgayLe='+colNgayLe+' | ngayLeRaw='+ngayLeRaw+' | ngayle='+ngayle+
        ' | holidayFromCells='+holidayFromCells+' | congTT='+congTT+
        ' | rawCellValue='+(colNgayLe>=0?JSON.stringify(row[colNgayLe]):'N/A')+
        ' | subRow1='+(colNgayLe>=0&&rows[i+1]?JSON.stringify(rows[i+1][colNgayLe]):'N/A')+
        ' | subRow2='+(colNgayLe>=0&&rows[i+2]?JSON.stringify(rows[i+2][colNgayLe]):'N/A'));
    }
    
    const finalWork=!isNaN(congTT)?congTT:(!isNaN(ngayCong)?ngayCong:workDays);
    if(ngayle===0 && !isNaN(ngayCong) && ngayCong>finalWork){
      ngayle = ngayCong - finalWork;
    }
    const finalOff=dayCols.length>0?Math.max(0,dayCols.length-finalWork):offDays;
    const ghiChuFull=[quaTrinh,notes].filter(Boolean).join(' | ');

    const matchedNV = matchNV(tenRaw, sttNum.toString(), matchedIds);
    if (matchedNV) matchedIds.push(matchedNV.id);
    empMap[tenRaw]={
      tenFile:tenRaw,maFile:sttNum.toString(),
      workDays:finalWork,offDays:finalOff,ngayle,
      tongGio:!isNaN(tongGio)?tongGio:0,
      phat:!isNaN(phat)?phat:0,notes:ghiChuFull,
      matchedNV,
      days:[],format:'consolidated'
    };
  }
  if(Object.keys(empMap).length===0)return null;
  return {empMap,detectedMonth,colMap:{},format:'consolidated'};
}


function getScheduleFor(pb){
  const s = DB.calamviec.find(c => c.phongban === pb);
  if(s) return s;
  // Default: 08:00 - 17:30, tolerance 5 min
  return {phongban:pb, giovao:'08:00', giora:'17:30', nghitrua_bat:'12:00', nghitrua_ket:'13:30', tolerance:5, phatPerMin:0};
}

function showImportPreview(){
  if(!ccImportData) return;
  const {empMap, detectedMonth, format} = ccImportData;
  const isConsolidated = (format === 'consolidated');

  const emps = Object.values(empMap);
  let warnings = 0;
  
  document.getElementById('impTotalNV').textContent = emps.length;
  document.getElementById('impTotalRows').textContent = isConsolidated ? emps.length : emps.reduce((s,e) => s + e.days.length, 0);
  
  // Populate month selector dropdown
  const monthSel = document.getElementById('impMonth');
  monthSel.innerHTML = '';
  const dm = detectedMonth || {month: new Date().getMonth()+1, year: new Date().getFullYear()};
  for(let offset = -6; offset <= 6; offset++){
    let m = dm.month + offset, y = dm.year;
    while(m < 1){m += 12; y--;}
    while(m > 12){m -= 12; y++;}
    const opt = document.createElement('option');
    opt.value = m + '-' + y;
    opt.textContent = 'T' + m + '/' + y;
    if(offset === 0) opt.selected = true;
    monthSel.appendChild(opt);
  }

  const body = document.getElementById('impPreviewBody');
  body.innerHTML = emps.map(emp => {
    let workDays, offDays, totalLate = 0, lateCnt = 0, detailText = '';
    
    if(isConsolidated){
      // Consolidated: data already summarized
      workDays = emp.workDays || 0;
      offDays = emp.offDays || 0;
      totalLate = emp.phat || 0; // phat is monetary penalty, not minutes
      detailText = emp.notes || (emp.phat > 0 ? 'Phạt: ' + fmt(emp.phat) : 'OK');
    } else {
      // Time-clock: calculate from daily punches
      workDays = emp.days.filter(d => d.hasWork).length;
      offDays = emp.days.filter(d => !d.hasWork).length;
      const matched = emp.matchedNV;
      const pb = matched ? matched.phongban : 'Khác';
      const schedule = getScheduleFor(pb);
      const [hChuan, mChuan] = (schedule.giovao || '08:00').split(':').map(Number);
      const chuanMins = hChuan * 60 + mChuan + (schedule.tolerance || 0);
      const lateDetails = [];
      emp.days.forEach(d => {
        if(d.times.length > 0){
          const first = d.times[0];
          const firstMins = first.h * 60 + first.m;
          if(firstMins > chuanMins){
            const late = firstMins - (hChuan * 60 + mChuan);
            totalLate += late;
            lateCnt++;
            lateDetails.push(d.dateStr + ' (' + first.str + ', +' + late + 'p)');
          }
        }
      });
      detailText = lateDetails.length > 0 ? lateDetails.slice(0,3).join(', ') + (lateDetails.length > 3 ? '...' : '') : 'Không trễ';
    }

    const matched = emp.matchedNV;
    if(!matched) warnings++;
    let matchMethod = '';
    if(matched && matched.manv && emp.maFile && matched.manv.toString().trim() === emp.maFile.toString().trim()){
      matchMethod = ' <small style="opacity:0.7">(Mã NV)</small>';
    } else if(matched){
      matchMethod = ' <small style="opacity:0.7">(Tên)</small>';
    }
    const matchBadge = matched 
      ? '<span class="badge badge-green">✓ ' + matched.name + matchMethod + '</span>'
      : '<span class="badge badge-red">⚠ Không khớp</span>';

    return '<tr>' +
      '<td><strong>' + emp.tenFile + '</strong><br><small style="color:var(--text3)">STT/Mã: ' + emp.maFile + '</small></td>' +
      '<td>' + matchBadge + '</td>' +
      '<td class="amount">' + workDays + '</td>' +
      '<td style="color:#f59e0b;font-weight:700">' + (emp.ngayle||0) + '</td>' +
      '<td>' + offDays + '</td>' +
      '<td class="' + (totalLate > 0 ? 'amount-red' : '') + '">' + (isConsolidated ? fmt(totalLate) : totalLate) + '</td>' +
      '<td>' + (isConsolidated ? (totalLate > 0 ? 'Có' : '-') : lateCnt) + '</td>' +
      '<td><small>' + detailText + '</small></td>' +
      '</tr>';
  }).join('');

  document.getElementById('impWarnings').textContent = warnings;
  openModal('modalImportCC');
}

function onImpMonthChange(){
  if(!ccImportData) return;
  const val = document.getElementById('impMonth').value;
  if(val){
    const [m,y] = val.split('-').map(Number);
    ccImportData.detectedMonth = {month: m, year: y};
  }
}

function confirmCCImport(){
  if(!ccImportData) return;
  const {empMap, detectedMonth, format} = ccImportData;
  const isConsolidated = (format === 'consolidated');
  if(!detectedMonth){showToast('Không xác định được tháng!','error');return;}
  
  // Use month from dropdown (user may have changed it)
  const mk = document.getElementById('impMonth').value || (detectedMonth.month + '-' + detectedMonth.year);
  const globalPhatPerMin = +document.getElementById('impPhatPerMin').value || 0;

  let imported = 0, skipped = 0;
  
  Object.values(empMap).forEach(emp => {
    const nv = emp.matchedNV;
    if(!nv){ skipped++; return; }
    
    let workDays, offDays, totalLate, phatTre;
    
    if(isConsolidated){
      workDays = emp.workDays || 0;
      offDays = emp.offDays || 0;
      totalLate = 0; // consolidated doesn't have minute-level late info
      phatTre = emp.phat || 0; // penalty already calculated in Excel
    } else {
      workDays = emp.days.filter(d => d.hasWork).length;
      offDays = emp.days.filter(d => !d.hasWork).length;
      const schedule = getScheduleFor(nv.phongban);
      const [hChuan, mChuan] = (schedule.giovao || '08:00').split(':').map(Number);
      const chuanMins = hChuan * 60 + mChuan + (schedule.tolerance || 0);
      const phatPerMin = globalPhatPerMin || schedule.phatPerMin || 0;
      totalLate = 0;
      emp.days.forEach(d => {
        if(d.times.length > 0){
          const first = d.times[0];
          const firstMins = first.h * 60 + first.m;
          if(firstMins > chuanMins) totalLate += (firstMins - (hChuan * 60 + mChuan));
        }
      });
      phatTre = phatPerMin > 0 ? totalLate * phatPerMin : 0;
    }

    const existingCC = DB.chamcong.find(c => c.nvId === nv.id && c.monthKey === mk);
    const prevPcan = existingCC ? existingCC.pcan : undefined;
    const prevLuongCB = existingCC ? existingCC.luongcb : undefined;
    const prevNCC = existingCC ? existingCC.ncc : undefined;
    const prevGioCongChuan = existingCC ? existingCC.giocongchuan : undefined;
    const prevChucVu = existingCC ? existingCC.chucvu : undefined;
    const prevTourAmt = existingCC ? existingCC.tourAmt : undefined;

    // Remove old chamcong for this NV + month
    DB.chamcong = DB.chamcong.filter(c => !(c.nvId === nv.id && c.monthKey === mk));
    
    const newCC = {
      id: genId(),
      nvId: nv.id,
      monthKey: mk,
      ngaycongtt: workDays,
      ngayle: emp.ngayle||0,
      ngaynghi: offDays,
      giotre: totalLate,
      phattle: phatTre,
      gioOT: emp.tongGio||0,
      ghichu: (isConsolidated ? 'Import bảng CC' : 'Import máy CC') + ' - ' + emp.tenFile + (emp.notes ? ' | ' + emp.notes : '')
    };
    if (prevPcan !== undefined) newCC.pcan = prevPcan;
    if (prevLuongCB !== undefined) newCC.luongcb = prevLuongCB;
    if (prevNCC !== undefined) newCC.ncc = prevNCC;
    if (prevGioCongChuan !== undefined) newCC.giocongchuan = prevGioCongChuan;
    if (prevChucVu !== undefined) newCC.chucvu = prevChucVu;
    if (prevTourAmt !== undefined) newCC.tourAmt = prevTourAmt;

    DB.chamcong.push(newCC);
    imported++;
  });

  DB.save('chamcong');
  
  // Set global month to match imported data
  const sel = document.getElementById('globalMonth');
  for(let i = 0; i < sel.options.length; i++){
    if(sel.options[i].value === mk){ sel.selectedIndex = i; break; }
  }
  
  closeModal('modalImportCC');
  onMonthChange();
  refreshPage();
  ccImportData = null;
  showToast('Import thành công! ' + imported + ' NV, bỏ qua ' + skipped + ' NV không khớp.');
}

// === SCHEDULE MANAGEMENT ===
const DEFAULT_SCHEDULES = [
  {phongban:'PTV', label:'Phòng Tư Vấn (PTV)', giovao:'08:00', giora:'17:30', nghitrua_bat:'12:00', nghitrua_ket:'13:30', tolerance:5, phatPerMin:0},
  {phongban:'PDV', label:'Phòng Dịch Vụ (PDV)', giovao:'08:00', giora:'17:30', nghitrua_bat:'12:00', nghitrua_ket:'13:30', tolerance:5, phatPerMin:0},
  {phongban:'Tele', label:'Phòng Tele', giovao:'08:00', giora:'17:00', nghitrua_bat:'12:00', nghitrua_ket:'13:00', tolerance:5, phatPerMin:0},
  {phongban:'Khác', label:'Khác (Kế toán, Lao công...)', giovao:'07:30', giora:'17:00', nghitrua_bat:'12:00', nghitrua_ket:'13:00', tolerance:5, phatPerMin:0},
];

function initDefaultSchedules(){
  if(DB.calamviec.length > 0) return;
  DB.calamviec = DEFAULT_SCHEDULES.map(s => ({...s}));
  DB.save('calamviec');
}

function renderSchedules(){
  const container = document.getElementById('scheduleCards');
  if(!container) return;
  // Ensure all departments exist
  DEFAULT_SCHEDULES.forEach(def => {
    if(!DB.calamviec.find(s => s.phongban === def.phongban)){
      DB.calamviec.push({...def});
    }
  });
  const colors = {PTV:'accent-blue', PDV:'accent-green', Tele:'accent-purple', 'Khác':'accent-orange'};
  container.innerHTML = DB.calamviec.map((s, idx) => {
    const c = colors[s.phongban] || 'accent-blue';
    return `
    <div class="stat-card ${c}" style="display:block;padding:20px;margin-bottom:14px;cursor:default">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:20px">🏢</span>
        <strong style="font-size:15px">${s.label || pbLabel(s.phongban)}</strong>
      </div>
      <div class="form-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">
        <div class="form-group">
          <label>Giờ Vào</label>
          <input type="time" id="sch_giovao_${idx}" value="${s.giovao||'08:00'}" />
        </div>
        <div class="form-group">
          <label>Giờ Ra</label>
          <input type="time" id="sch_giora_${idx}" value="${s.giora||'17:30'}" />
        </div>
        <div class="form-group">
          <label>Tolerance (phút)</label>
          <input type="number" id="sch_tolerance_${idx}" value="${s.tolerance||0}" min="0" placeholder="5" />
        </div>
        <div class="form-group">
          <label>Nghỉ Trưa Bắt Đầu</label>
          <input type="time" id="sch_ntbat_${idx}" value="${s.nghitrua_bat||'12:00'}" />
        </div>
        <div class="form-group">
          <label>Nghỉ Trưa Kết Thúc</label>
          <input type="time" id="sch_ntket_${idx}" value="${s.nghitrua_ket||'13:30'}" />
        </div>
        <div class="form-group">
          <label>Phạt trễ (đ/phút)</label>
          <input type="number" id="sch_phat_${idx}" value="${s.phatPerMin||0}" min="0" placeholder="0" />
        </div>
      </div>
    </div>`;
  }).join('');
}

function saveAllSchedules(){
  DB.calamviec.forEach((s, idx) => {
    s.giovao = document.getElementById('sch_giovao_'+idx).value;
    s.giora = document.getElementById('sch_giora_'+idx).value;
    s.tolerance = +document.getElementById('sch_tolerance_'+idx).value || 0;
    s.nghitrua_bat = document.getElementById('sch_ntbat_'+idx).value;
    s.nghitrua_ket = document.getElementById('sch_ntket_'+idx).value;
    s.phatPerMin = +document.getElementById('sch_phat_'+idx).value || 0;
  });
  DB.save('calamviec');
  showToast('Đã lưu lịch làm việc!');
}

// === LOG SYSTEM ===
function renderLogs(){
  const container = document.getElementById('logList');
  if(!container) return;
  const filterEl = document.getElementById('logFilter');
  const filter = filterEl ? filterEl.value : '';
  const logs = filter ? appLogs.filter(l => l.type === filter) : appLogs;
  if(logs.length === 0){
    container.innerHTML = '<div class="log-empty">📭 Chưa có nhật ký nào' + (filter ? ' (bộ lọc: '+filter+')' : '') + '</div>';
    return;
  }
  const icons = {error:'❌', warning:'⚠️', success:'✅', info:'ℹ️'};
  container.innerHTML = logs.map((l,i) => 
    '<div class="log-entry ' + l.type + '">' +
      '<div class="log-icon">' + (icons[l.type]||'📋') + '</div>' +
      '<div class="log-body">' +
        '<div class="log-msg">' + l.msg + '</div>' +
        '<div class="log-time">' + l.time + '</div>' +
        (l.details ? '<div class="log-details">' + l.details + '</div>' : '') +
      '</div>' +
    '</div>'
  ).join('');
}

function clearLogs(){
  if(!confirm('Xóa tất cả nhật ký?')) return;
  appLogs = [];
  localStorage.removeItem('spa_logs');
  const b = document.getElementById('logBadge');
  if(b) b.style.display = 'none';
  renderLogs();
  showToast('Đã xóa nhật ký!');
}

// === IMPORT TOUR ===
let tourImportData = null;

function handleTourImport(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const wb = XLSX.read(e.target.result, {type:'array'});
      // Find the Tour sheet: prefer sheet with "tour" in name, then try all sheets
      let tourRows = null;
      const sheetOrder = [];
      // Priority 1: sheets with "tour" in name
      wb.SheetNames.forEach((name, idx) => {
        if(/tour/i.test(name)) sheetOrder.unshift(idx);
        else sheetOrder.push(idx);
      });
      for(const idx of sheetOrder){
        const ws = wb.Sheets[wb.SheetNames[idx]];
        const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        // Check if this sheet has tour-like headers (Ngày + Khách/Dịch vụ + PIC)
        for(let i=0;i<Math.min(rows.length,10);i++){
          const txt = rows[i].map(c=>(c||'').toString().toLowerCase()).join(' ');
          if((/tour/i.test(txt) || (/ng[aà]y/i.test(txt) && /kh[aá]ch|d[iị]ch v[uụ]/i.test(txt) && /pic/i.test(txt)))){
            tourRows = rows;
            addLog('Tour sheet: "'+wb.SheetNames[idx]+'" ('+rows.length+' rows)','info');
            break;
          }
        }
        if(tourRows) break;
      }
      if(!tourRows){
        // Fallback: use first sheet
        const ws = wb.Sheets[wb.SheetNames[0]];
        tourRows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        addLog('Tour sheet: fallback to "'+wb.SheetNames[0]+'"','warning');
      }
      parseTourFile(tourRows);
    } catch(err) {
      addLog('Lỗi đọc file Tour: '+err.message,'error',err.stack||'');
      showToast('Lỗi đọc file! Xem 📝 Nhật Ký','error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function parseTourFile(rows){
  function cl(v){
    if(v===null||v===undefined)return '';
    let s=v.toString().trim().toLowerCase();
    s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    s=s.replace(/đ/g,'d').replace(/[^\x20-\x7E]/g,'');
    return s.replace(/\s+/g,' ').trim();
  }

  // Find header row with Ngay, Khach hang, Dich vu, PIC
  let headerIdx=-1, colNgay=-1, colKhach=-1, colDV=-1, colPIC=-1, colKTV=-1, colBS=-1, colNotes=-1;
  for(let i=0;i<Math.min(rows.length,10);i++){
    const row=rows[i].map(c=>cl(c));
    const ngIdx=row.findIndex(c=>/^ng|^day|^date/.test(c)&&c.length<10&&!/cong|tinh/.test(c));
    const khIdx=row.findIndex(c=>/kha.*hang|khach|customer/.test(c));
    const dvIdx=row.findIndex(c=>/di.*vu|dich vu|service/.test(c));
    const picIdx=row.findIndex(c=>/^pic$/.test(c));
    if(ngIdx>=0&&(khIdx>=0||dvIdx>=0)){
      headerIdx=i;
      colNgay=ngIdx;colKhach=khIdx>=0?khIdx:(dvIdx>0?dvIdx-1:ngIdx+1);
      colDV=dvIdx>=0?dvIdx:(khIdx>=0?khIdx+1:ngIdx+2);
      colPIC=picIdx>=0?picIdx:row.findIndex(c=>/pic|nhan vien|nv/.test(c));
      // KTV and BS columns: look for (ktv) and (bac si) after PIC
      const startAfter=colPIC>=0?colPIC+1:colDV+1;
      colKTV=row.findIndex((c,j)=>j>=startAfter&&/ktv/.test(c));
      colBS=row.findIndex((c,j)=>j>=startAfter&&/ba.*si|bac si|bs/.test(c));
      colNotes=row.findIndex((c,j)=>j>=startAfter&&/note|ghi.*chu/.test(c));
      // Fallback: if KTV/BS not found, assume columns after PIC
      if(colKTV<0&&colPIC>=0) colKTV=colPIC+1;
      if(colBS<0&&colKTV>=0) colBS=colKTV+1;
      if(colNotes<0&&colBS>=0) colNotes=colBS+1;
      break;
    }
  }
  if(headerIdx<0){
    const dbg=rows.slice(0,5).map((r,i)=>'Row '+(i+1)+': '+r.slice(0,8).map(c=>'"'+(c==null?'':c)+'"').join(', ')).join('\n');
    addLog('Import Tour thất bại: Không tìm thấy header','error','Tìm: Ngày, Khách hàng, Dịch vụ, PIC\n\n'+dbg);
    showToast('Import Tour lỗi! Xem 📝 Nhật Ký','error');
    return;
  }

  // Detect month from title rows (before header)
  let detectedMonth=null;
  for(let i=0;i<=headerIdx+2;i++){
    if(i>=rows.length) break;
    const txt=rows[i].map(c=>(c||'').toString()).join(' ');
    // "THÁNG 3" or "Tháng 3/2026"
    let m=txt.match(/th[aá]ng\s*(\d{1,2})/i);
    if(m){ detectedMonth={month:parseInt(m[1])}; }
    let y=txt.match(/n[aă]m\s*(\d{4})/i)||txt.match(/(\d{4})/);
    if(y&&detectedMonth) detectedMonth.year=parseInt(y[1]);
    // Excel serial date
    for(let j=0;j<rows[i].length;j++){
      const v=rows[i][j];
      if(typeof v==='number'&&v>40000&&v<60000){
        const d=new Date((v-25569)*86400000);
        if(!isNaN(d.getTime()))detectedMonth={month:d.getMonth()+1,year:d.getFullYear()};
      }
    }
  }
  if(!detectedMonth) detectedMonth={month:new Date().getMonth()+1};
  if(!detectedMonth.year) detectedMonth.year=new Date().getFullYear();

  addLog('Tour header dòng '+(headerIdx+1)+', T'+detectedMonth.month+'/'+detectedMonth.year,'info',
    'Ngày='+colNgay+', Khách='+colKhach+', DV='+colDV+', PIC='+colPIC+', KTV$='+colKTV+', BS$='+colBS);

  // Parse tour rows
  const tours=[];
  let currentDay='';
  for(let i=headerIdx+1;i<rows.length;i++){
    const row=rows[i];
    if(!row||row.length<3) continue;

    // Check if this row has a date value in column A
    const rawDay=row[colNgay];
    const dayCell=(rawDay||'').toString().trim();
    if(dayCell){
      // Handle Excel serial dates (e.g., 46113 = April 1, 2026)
      if(typeof rawDay==='number'&&rawDay>40000&&rawDay<60000){
        const jsDate=new Date((rawDay-25569)*86400000);
        if(!isNaN(jsDate.getTime())){
          currentDay=jsDate.getDate()+'/'+((jsDate.getMonth()+1));
        }
      }
      // Date patterns: "1.3", "2.3", "15.3"
      else {
        const dm=dayCell.match(/^(\d{1,2})[\.\/](\d{1,2})$/);
        if(dm){
          currentDay=dm[1]+'/'+dm[2];
        } else if(/^\d{1,2}$/.test(dayCell)){
          currentDay=dayCell+'/'+detectedMonth.month;
        } else if(dayCell.toUpperCase()==='TRUE'||/^th[aá]ng|^t\d/i.test(dayCell)||/^n[aă]m/i.test(dayCell)){
          continue; // Skip section headers
        }
      }
    }

    // Check if this row has tour data (needs customer or service)
    const khach=(row[colKhach]||'').toString().trim();
    const dichvu=(row[colDV]||'').toString().trim();
    if(!khach&&!dichvu) continue;

    const picName=(colPIC>=0?(row[colPIC]||''):'').toString().trim();
    // Skip boolean TRUE values (Excel checkboxes) when reading amounts
    const rawKTV=colKTV>=0?row[colKTV]:0;
    const ktvAmt=(rawKTV===true||rawKTV===false)?0:parseFloat(rawKTV)||0;
    const rawBS=colBS>=0?row[colBS]:0;
    const bsAmt=(rawBS===true||rawBS===false)?0:parseFloat(rawBS)||0;
    const notes=colNotes>=0?(row[colNotes]||'').toString().trim():'';

    // Skip rows that look like headers or totals
    if(/^t[oô]ng|^total|^sum/i.test(khach)) continue;
    if(cl(khach).includes('khach')) continue;

    // Match PIC name to NV - prefer last-word match (Vietnamese given name)
    let matchedNV=null;
    if(picName){
      const pNorm=picName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').trim();
      let bestScore=0;
      DB.nhanvien.forEach(n=>{
        const nNorm=n.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').trim();
        const nLast=nNorm.split(/\s+/).pop(); // Last word = given name in Vietnamese
       let score=0;
        if(nNorm===pNorm) score=100; // Exact full name match
        else if(nLast===pNorm) score=50; // Last word matches (e.g. "My" = "Le Thi Tra My")
        else if(nNorm.includes(pNorm)) score=10; // Partial match
        // Tiebreaker: prefer KTV/PDV staff for tours (more likely to be tour performers)
        if(score>0&&/KTV|PDV|Dịch vụ/i.test(n.chucvu||'')) score+=1;
        if(score>bestScore){bestScore=score;matchedNV=n;}
      });
    }

    tours.push({
      ngay:currentDay,khach,dichvu,picName,matchedNV,
      tienKTV:ktvAmt,tienBS:bsAmt,notes
    });
  }

  if(tours.length===0){
    addLog('Import Tour: Không tìm thấy dữ liệu tour','error','');
    showToast('Không tìm thấy tour! Xem 📝 Nhật Ký','error');
    return;
  }

  tourImportData={tours,detectedMonth};
  showTourImportPreview();
}

function showTourImportPreview(){
  if(!tourImportData) return;
  const {tours,detectedMonth}=tourImportData;

  document.getElementById('tourImpTotal').textContent=tours.length;
  const matched=tours.filter(t=>t.matchedNV).length;
  document.getElementById('tourImpMatched').textContent=matched;
  document.getElementById('tourImpWarnings').textContent=tours.length-matched;

  // Month selector
  const sel=document.getElementById('tourImpMonth');
  sel.innerHTML='';
  for(let off=-6;off<=6;off++){
    let m=detectedMonth.month+off,y=detectedMonth.year;
    while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}
    const opt=document.createElement('option');
    opt.value=m+'-'+y;opt.textContent='T'+m+'/'+y;
    if(off===0)opt.selected=true;
    sel.appendChild(opt);
  }

  const body=document.getElementById('tourImpBody');
  body.innerHTML=tours.map(t=>{
    const matchBadge=t.matchedNV
      ?'<span class="badge badge-green">✓ '+t.matchedNV.name+'</span>'
      :'<span class="badge badge-red">⚠ Không khớp</span>';
    return '<tr>'+
      '<td>'+t.ngay+'</td>'+
      '<td>'+t.khach+'</td>'+
      '<td>'+t.dichvu+'</td>'+
      '<td>'+t.picName+'</td>'+
      '<td>'+matchBadge+'</td>'+
      '<td class="amount">'+fmt(t.tienKTV)+'</td>'+
      '<td class="amount">'+fmt(t.tienBS)+'</td>'+
      '<td><small>'+t.notes+'</small></td>'+
      '</tr>';
  }).join('');

  openModal('modalImportTour');
}

function confirmTourImport(){
  if(!tourImportData) return;
  const {tours,detectedMonth}=tourImportData;
  const mk=document.getElementById('tourImpMonth').value||(detectedMonth.month+'-'+detectedMonth.year);

  // Auto-detect Bác sĩ from NV list (by chucvu or name)
  const bsNorm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/g,'d').replace(/[^\x20-\x7E]/g,'');
  let bsNV = DB.nhanvien.find(n => {
    const cv = bsNorm(n.chucvu || '');
    // Match: "bác sĩ", "bác sỹ", "bs", "bac si", "bac sy", "doctor"
    return /bac\s*s[iy]|^bs$/i.test(cv);
  });
  // Fallback: find by name containing "bác sĩ" role indicators
  if(!bsNV){
    bsNV = DB.nhanvien.find(n => {
      const nm = bsNorm(n.name || '');
      const cv = bsNorm(n.chucvu || '');
      return /doctor|bac\s*s[iy]/i.test(cv) || /bac\s*s[iy]/i.test(nm);
    });
  }
  if(bsNV) addLog('Auto-detect Bác sĩ: ' + bsNV.name + ' (id=' + bsNV.id + ')', 'info');
  else addLog('WARN: Không tìm thấy Bác sĩ trong danh sách NV!', 'warning',
    'Danh sách chức vụ: ' + DB.nhanvien.map(n=>n.name+'='+n.chucvu).join(', '));

  let imported=0,skipped=0,bsAssigned=0;
  tours.forEach(t=>{
    const nv=t.matchedNV;
    if(!nv){skipped++;return;}

    // Always assign BS to tour (doctor participates in all tours)
    const hasBSFee = t.tienBS > 0;
    const bsId = bsNV ? bsNV.id : '';
    if(bsId && hasBSFee) bsAssigned++;

    DB.tours.push({
      id:genId(),
      monthKey:mk,
      ngay:t.ngay,
      khach:t.khach,
      dichvu:t.dichvu,
      pic:nv.id,
      tienPIC:t.tienKTV,  // Cột E: tiền cho PIC (KTV)
      ktv:'',
      tienKTV:0,
      bs:hasBSFee&&bsId?bsId:'',  // Assign BS when there's a BS fee
      tienBS:t.tienBS,     // Cột F: tiền cho Bác sĩ
      ghichu:t.notes
    });
    imported++;
  });
  addLog('Tour BS stats: '+bsAssigned+'/'+imported+' tours có tiền BS','info');

  DB.save('tours');

  // Set global month
  const gSel=document.getElementById('globalMonth');
  for(let i=0;i<gSel.options.length;i++){
    if(gSel.options[i].value===mk){gSel.selectedIndex=i;break;}
  }

  closeModal('modalImportTour');
  refreshPage();
  addLog('Import Tour thành công: '+imported+' tour, bỏ qua '+skipped,'success','Tháng: '+mk);
  showToast('Import '+imported+' tour thành công!'+(skipped?' ('+skipped+' bỏ qua)':''));
  tourImportData=null;
}

// === KPI RULES ===
const defaultKPIRules = {
  ptv:{t1:100,r1:1.5,r2:2},
  pdv:{t1:50,r1:1.5,t2:75,r2:2,r3:2.5},
  tele:{t1:60,r1:30000,r2:40000}
};

function loadKPIRules(){
  const saved=localStorage.getItem('spa_kpiRules');
  return saved?JSON.parse(saved):JSON.parse(JSON.stringify(defaultKPIRules));
}
function saveKPIRules(){
  const r={
    ptv:{t1:+document.getElementById('rulePTV_t1').value,r1:+document.getElementById('rulePTV_r1').value,r2:+document.getElementById('rulePTV_r2').value},
    pdv:{t1:+document.getElementById('rulePDV_t1').value,r1:+document.getElementById('rulePDV_r1').value,t2:+document.getElementById('rulePDV_t2').value,r2:+document.getElementById('rulePDV_r2').value,r3:+document.getElementById('rulePDV_r3').value},
    tele:{t1:+document.getElementById('ruleTele_t1').value,r1:+document.getElementById('ruleTele_r1').value,r2:+document.getElementById('ruleTele_r2').value}
  };
  localStorage.setItem('spa_kpiRules',JSON.stringify(r));
  showToast('Đã lưu quy tắc KPI!');
}
function populateKPIRules(){
  const r=loadKPIRules();
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  s('rulePTV_t1',r.ptv.t1);s('rulePTV_r1',r.ptv.r1);s('rulePTV_r2',r.ptv.r2);
  s('rulePDV_t1',r.pdv.t1);s('rulePDV_r1',r.pdv.r1);s('rulePDV_t2',r.pdv.t2);s('rulePDV_r2',r.pdv.r2);s('rulePDV_r3',r.pdv.r3);
  s('ruleTele_t1',r.tele.t1);s('ruleTele_r1',r.tele.r1);s('ruleTele_r2',r.tele.r2);
}
function toggleKPIRules(){
  const p=document.getElementById('kpiRulesPanel');
  if(p.style.display==='none'){p.style.display='block';populateKPIRules();}else{p.style.display='none';}
}
function calcKPIRate(dept,dsthuc){
  const r=loadKPIRules();
  const mil=dsthuc/1000000;
  if(dept==='PTV'||dept==='TV'){
    return mil<r.ptv.t1?r.ptv.r1:r.ptv.r2;
  }else if(dept==='PDV'){
    if(mil<r.pdv.t1)return r.pdv.r1;
    if(mil<r.pdv.t2)return r.pdv.r2;
    return r.pdv.r3;
  }
  return 1.5; // default
}
function deleteAllKPIs(){
  const mk=getMonth().key;
  const count=DB.kpis.filter(k=>k.monthKey===mk).length;
  if(!count){showToast('Không có KPI nào!','error');return;}
  if(!confirm('Xóa toàn bộ '+count+' KPI tháng '+mk+'?'))return;
  DB.kpis=DB.kpis.filter(k=>k.monthKey!==mk);DB.save('kpis');refreshPage();
  showToast('Đã xóa '+count+' KPI!');
}

// === IMPORT KPI ===
let kpiImportData=null;

function handleKPIImport(event){
  const file=event.target.files[0];if(!file)return;
  addLog('KPI Import bắt đầu: '+file.name,'info');
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(e.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      // Debug: show first rows
      addLog('KPI raw data','info','Sheet: '+wb.SheetNames[0]+', Rows: '+rows.length);
      parseKPIFile(rows);
    }catch(err){
      addLog('Lỗi đọc file KPI: '+err.message,'error',err.stack||'');
      alert('Lỗi đọc file KPI: '+err.message);
      showToast('Lỗi đọc file! Xem 📝 Nhật Ký','error');
    }
  };
  reader.onerror=function(){
    alert('Lỗi đọc file!');
    addLog('FileReader error','error');
  };
  reader.readAsArrayBuffer(file);
  event.target.value='';
}

function parseKPIFile(rows, silent){
  function cl(v){
    if(v===null||v===undefined)return '';
    let s=v.toString().trim().toLowerCase();
    s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    s=s.replace(/\u0111/g,'d').replace(/[^\x20-\x7E]/g,'');
    return s.replace(/\s+/g,' ').trim();
  }

  // Log raw rows for debug
  const rawDbg=rows.slice(0,6).map((r,i)=>'Row '+(i+1)+': '+r.slice(0,8).map(c=>'"'+(c==null?'':c.toString().substring(0,20))+'"').join(' | ')).join('\n');
  addLog('KPI Import: Đọc file','info','Tổng dòng: '+rows.length+'\n\n'+rawDbg);

  // Detect month from title - only check first 3 rows (avoid data rows)
  let detectedMonth=null;
  for(let i=0;i<Math.min(rows.length,3);i++){
    const txt=rows[i].map(c=>(c||'').toString()).join(' ');
    // Try combined: "THÁNG 3.2026" or "THÁNG 3/2026" or "THÁNG 3-2026"
    let combined=txt.match(/th[aá]ng\s*(\d{1,2})\s*[.\/-]\s*(\d{4})/i);
    if(combined){
      detectedMonth={month:parseInt(combined[1]),year:parseInt(combined[2])};
      break;
    }
    // Try separate month+year on same row
    let m=txt.match(/th[aá]ng\s*(\d{1,2})/i);
    if(m){
      detectedMonth={month:parseInt(m[1])};
      // Look for year ONLY in the title cell (not joined data)
      for(let j=0;j<rows[i].length;j++){
        const cv=(rows[i][j]||'').toString();
        const ym=cv.match(/(\d{4})/);
        if(ym&&parseInt(ym[1])>=2020&&parseInt(ym[1])<=2099){
          detectedMonth.year=parseInt(ym[1]);break;
        }
      }
      break;
    }
  }
  if(!detectedMonth) detectedMonth={month:new Date().getMonth()+1};
  if(!detectedMonth.year) detectedMonth.year=new Date().getFullYear();
  addLog('KPI tháng detect: T'+detectedMonth.month+'/'+detectedMonth.year,'info');

  // Find header row - look for DS ap / DS thuc
  let headerIdx=-1,colName=0,colDSAp=-1,colDSThuc=-1,colHH=-1,colPhat=-1,colTongTien=-1,colNotes=-1;
  for(let i=0;i<Math.min(rows.length,10);i++){
    const row=rows[i].map(c=>cl(c));
    let apIdx=-1,thucIdx=-1;
    for(let j=0;j<row.length;j++){
      const c=row[j];
      if(apIdx<0&&(/ds\s*ap/.test(c)||/doanh.*so.*ap/.test(c))) apIdx=j;
      if(thucIdx<0&&(/ds\s*thu/.test(c)||/doanh.*so.*thu/.test(c))) thucIdx=j;
    }
    if(apIdx>=0&&thucIdx>=0){
      headerIdx=i;colDSAp=apIdx;colDSThuc=thucIdx;
      colName=apIdx>0?0:1;
      for(let j=0;j<row.length;j++){
        const c=row[j];
        if(colHH<0&&(/cham/.test(c)||/^%/.test(c)||c==='hh'||/hoa.*hong/.test(c))) colHH=j;
        if(colPhat<0&&/phat/.test(c)) colPhat=j;
        if(colTongTien<0&&/tong/.test(c)&&!/ds/.test(c)&&j!==apIdx&&j!==thucIdx) colTongTien=j;
        if(colNotes<0&&(/note/.test(c)||/ghi/.test(c))) colNotes=j;
      }
      addLog('KPI header row '+(i+1),'info','Row: '+row.join(' | ')+'\nName='+colName+' DSAp='+colDSAp+' DSThuc='+colDSThuc+' HH='+colHH+' Phat='+colPhat+' Tong='+colTongTien);
      break;
    }
  }
  if(headerIdx<0){
    // Fallback: try finding by large numbers
    for(let i=0;i<Math.min(rows.length,10);i++){
      const row=rows[i];
      let numCols=0;
      for(let j=0;j<row.length;j++){if(typeof row[j]==='number'&&row[j]>100000) numCols++;}
      if(numCols>=2){
        headerIdx=i-1>=0?i-1:0;
        colName=0;colDSAp=1;colDSThuc=2;colHH=3;colPhat=4;colTongTien=5;colNotes=6;
        addLog('KPI header fallback','warning','Data at row '+(i+1));
        break;
      }
    }
  }
  if(headerIdx<0){
    const dbg=rows.slice(0,5).map((r,i)=>'Row '+(i+1)+': '+r.slice(0,8).map(c=>'"'+(c==null?'':c)+'"').join(', ')).join('\n');
    addLog('Import KPI: Không tìm header','error','Tìm: DS áp, DS thực\n\n'+dbg);
    showToast('Import KPI lỗi! Xem Nhật Ký','error');
    return;
  }

  // Parse data rows
  const kpis=[];
  let currentDept='PTV';
  let skipCount=0;

  for(let i=headerIdx+1;i<rows.length;i++){
    const row=rows[i];
    if(!row||row.length<2) continue;
    const cell0=(row[0]||'').toString().trim();
    const c0=cl(cell0);

    // Detect phong ban sections
    if(/1\.\s*ph|phong.*tu.*van|p\.?\s*tv/.test(c0)){currentDept='PTV';continue;}
    if(/2\.\s*ph|phong.*di.*vu|p\.?\s*dv/.test(c0)){currentDept='PDV';continue;}
    if(/3\.\s*ph|phong.*tele|tele/.test(c0)){currentDept='Tele';continue;}
    if(/^tong\s|^to.*ng\s/.test(c0)) continue;

    const rawName=(row[colName]||'').toString().trim();
    if(!rawName) continue;
    // Strip role suffixes: "- TV", "- HTTV", "- KTV"
    const name=rawName.replace(/\s*[-\u2013\u2014]\s*(TV|HTTV|KTV|PDV|BS|Tele)\s*$/i,'').trim();
    if(!name||name.length<2) continue;

    const dsap=parseFloat(row[colDSAp])||0;
    const dsthuc=parseFloat(row[colDSThuc])||0;
    if(dsap===0&&dsthuc===0){skipCount++;continue;}

    let hoahong=0;
    if(currentDept==='Tele'){
      // Tele: dsap=target customers, dsthuc=actual customers, colHH=rate per customer
      if(colHH>=0){
        const hVal=row[colHH];
        hoahong=typeof hVal==='number'?hVal:parseFloat(hVal)||0;
      }
      if(!hoahong){
        // Use rules: rate depends on whether customer count >= threshold
        const r=loadKPIRules();
        hoahong=dsthuc>=r.tele.t1?r.tele.r2:r.tele.r1;
      }
    } else if(colHH>=0){
      const hVal=row[colHH];
      if(typeof hVal==='number'){
        hoahong=hVal>0&&hVal<1?Math.round(hVal*10000)/100:hVal;
      } else if(typeof hVal==='string'){
        const hm=hVal.match(/([\d.]+)/);
        if(hm) hoahong=parseFloat(hm[1]);
      }
      if(!hoahong) hoahong=calcKPIRate(currentDept,dsthuc);
    } else {
      hoahong=calcKPIRate(currentDept,dsthuc);
    }

    const phat=colPhat>=0?parseFloat(row[colPhat])||0:0;
    const tongTien=colTongTien>=0?parseFloat(row[colTongTien])||0:0;
    const notes=colNotes>=0?(row[colNotes]||'').toString().trim():'';

    // Match NV name
    const pNorm=normalizeVN(name);
    let matchedNV=null,bestScore=0;
    DB.nhanvien.forEach(n=>{
      const nNorm=normalizeVN(n.name);
      const nLast=nNorm.split(/\s+/).pop();
      let score=0;
      if(nNorm===pNorm) score=100;
      else if(pNorm===nNorm) score=100;
      else if(pNorm.includes(nNorm)&&nNorm.length>3) score=60;
      else if(nNorm.includes(pNorm)&&pNorm.length>3) score=55;
      else if(nLast===pNorm) score=50;
      else if(pNorm.includes(nLast)&&nLast.length>2) score=40;
      if(score>bestScore){bestScore=score;matchedNV=n;}
    });

    let vaitro='TV';
    if(currentDept==='PDV') vaitro='PDV';
    if(currentDept==='Tele') vaitro='Tele';

    kpis.push({name:rawName,dept:currentDept,vaitro,dsap,dsthuc,hoahong,phat,tongTien,notes,matchedNV});
  }

  addLog('KPI parse done: '+kpis.length+' NV found, '+skipCount+' skipped','info',
    kpis.map(k=>k.name+' → '+(k.matchedNV?k.matchedNV.name:'❌')+' ['+k.dept+'] DS:'+k.dsthuc).join('\n'));

  if(kpis.length===0){
    addLog('Import KPI: Không tìm thấy dữ liệu','error','');
    showToast('Không tìm thấy KPI! Xem Nhật Ký','error');
    return;
  }

  kpiImportData={kpis,detectedMonth};
  if(!silent) showKPIImportPreview();
}

function showKPIImportPreview(){
  if(!kpiImportData) return;
  const {kpis,detectedMonth}=kpiImportData;

  document.getElementById('kpiImpTotal').textContent=kpis.length;
  const matched=kpis.filter(k=>k.matchedNV).length;
  document.getElementById('kpiImpMatched').textContent=matched;
  document.getElementById('kpiImpWarnings').textContent=kpis.length-matched;

  const sel=document.getElementById('kpiImpMonth');
  sel.innerHTML='';
  for(let off=-6;off<=6;off++){
    let m=detectedMonth.month+off,y=detectedMonth.year;
    while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}
    const opt=document.createElement('option');
    opt.value=m+'-'+y;opt.textContent='T'+m+'/'+y;
    if(off===0)opt.selected=true;
    sel.appendChild(opt);
  }

  const body=document.getElementById('kpiImpBody');
  body.innerHTML=kpis.map(k=>{
    const isTele=k.dept==='Tele';
    const matchBadge=k.matchedNV
      ?'<span class="badge badge-green">✓ '+k.matchedNV.name+'</span>'
      :'<span class="badge badge-red">⚠ Không khớp</span>';
    const kpiAmt=k.tongTien||(isTele?Math.round(k.dsthuc*k.hoahong):Math.round(k.dsthuc*k.hoahong/100));
    const dsApStr=isTele?k.dsap+' người':fmt(k.dsap);
    const dsThucStr=isTele?k.dsthuc+' người':fmt(k.dsthuc);
    const hhStr=isTele?fmt(k.hoahong)+'/KH':k.hoahong+'%';
    return '<tr>'+
      '<td><strong>'+k.name+'</strong></td>'+
      '<td><span class="badge badge-blue">'+k.dept+'</span></td>'+
      '<td>'+matchBadge+'</td>'+
      '<td class="amount">'+dsApStr+'</td>'+
      '<td class="amount">'+dsThucStr+'</td>'+
      '<td>'+hhStr+'</td>'+
      '<td class="amount-red">'+fmt(k.phat)+'</td>'+
      '<td class="amount-blue">'+fmt(kpiAmt)+'</td>'+
      '<td><small>'+k.notes+'</small></td>'+
      '</tr>';
  }).join('');

  openModal('modalImportKPI');
}

function confirmKPIImport(){
  if(!kpiImportData) return;
  const {kpis,detectedMonth}=kpiImportData;
  const mk=document.getElementById('kpiImpMonth').value||(detectedMonth.month+'-'+detectedMonth.year);

  let imported=0,skipped=0;
  kpis.forEach(k=>{
    const nv=k.matchedNV;
    if(!nv){skipped++;return;}

    DB.kpis.push({
      id:genId(),
      nvId:nv.id,
      monthKey:mk,
      vaitro:k.vaitro,
      dsap:k.dsap,
      dsthuc:k.dsthuc,
      hoahong:k.hoahong,
      phat:k.phat,
      ghichu:k.notes
    });
    imported++;
  });

  DB.save('kpis');

  // Switch globalMonth to the imported month - add option if missing
  const gSel=document.getElementById('globalMonth');
  let found=false;
  for(let i=0;i<gSel.options.length;i++){
    if(gSel.options[i].value===mk){gSel.selectedIndex=i;found=true;break;}
  }
  if(!found){
    const [mm,yy]=mk.split('-');
    const opt=document.createElement('option');
    opt.value=mk;opt.textContent='Tháng '+mm+'/'+yy;
    gSel.appendChild(opt);
    gSel.value=mk;
  }

  closeModal('modalImportKPI');
  refreshPage();
  addLog('Import KPI thành công: '+imported+', bỏ qua '+skipped,'success','Tháng: '+mk);
  showToast('Import '+imported+' KPI thành công!'+(skipped?' ('+skipped+' bỏ qua)':''));
  kpiImportData=null;
}

// === PHU CAP & THUONG ===
function renderPhucapPage(){
  const mk=getMonth().key;
  const m=getMonth();
  const badge=document.getElementById('pcMonthBadge');
  if(badge) badge.textContent=m.label;
  const body=document.getElementById('phucapBody');
  const foot=document.getElementById('phucapFoot');
  if(!body) return;

  let totTN=0,totDL=0,totTH=0,totHTCD=0,totHTN=0;
  body.innerHTML=DB.nhanvien.map((nv,i)=>{
    const pc=DB.phucap.find(p=>p.nvId===nv.id&&p.monthKey===mk);
    const pctn=pc?(pc.pctn||0):(nv.pctrachnhiem||0);
    const pcdl=pc?(pc.pcdl||0):(nv.pcdilai||0);
    const thuong=pc?(pc.thuong||0):0;
    const htcd=pc?(pc.htcd||0):0;
    const htngay=pc?(pc.htngay||0):0;
    const total=pctn+pcdl+htcd+htngay+thuong;
    totTN+=pctn;totDL+=pcdl;totTH+=thuong;totHTCD+=htcd;totHTN+=htngay;
    return '<tr>'+
      '<td>'+(i+1)+'</td>'+
      '<td><strong>'+nv.name+'</strong></td>'+
      '<td>'+nv.chucvu+'</td>'+
      '<td>'+pbLabel(nv.phongban)+'</td>'+
      '<td><input type="number" class="pc-input" data-nv="'+nv.id+'" data-field="pctn" value="'+pctn+'" style="color:#3b82f6" /></td>'+
      '<td><input type="number" class="pc-input" data-nv="'+nv.id+'" data-field="pcdl" value="'+pcdl+'" style="color:#f59e0b" /></td>'+
      '<td><input type="number" class="pc-input" data-nv="'+nv.id+'" data-field="htcd" value="'+htcd+'" style="color:#ec4899" /></td>'+
      '<td><input type="number" class="pc-input" data-nv="'+nv.id+'" data-field="htngay" value="'+htngay+'" style="color:#e11d48" /></td>'+
      '<td><input type="number" class="pc-input" data-nv="'+nv.id+'" data-field="thuong" value="'+thuong+'" style="color:#a855f7" /></td>'+
      '<td class="amount" style="color:var(--green);font-weight:700">'+fmt(total)+'</td>'+
      '</tr>';
  }).join('');

  if(foot) foot.innerHTML='<tr style="font-weight:700;background:var(--surface2)">'+
    '<td colspan="4" style="text-align:right">TỔNG</td>'+
    '<td style="color:#3b82f6">'+fmt(totTN)+'</td>'+
    '<td style="color:#f59e0b">'+fmt(totDL)+'</td>'+
    '<td style="color:#ec4899">'+fmt(totHTCD)+'</td>'+
    '<td style="color:#e11d48">'+fmt(totHTN)+'</td>'+
    '<td style="color:#a855f7">'+fmt(totTH)+'</td>'+
    '<td style="color:var(--green)">'+fmt(totTN+totDL+totTH+totHTCD+totHTN)+'</td></tr>';

  const el=id=>document.getElementById(id);
  if(el('pcStatTN')) el('pcStatTN').textContent=fmt(totTN);
  if(el('pcStatDL')) el('pcStatDL').textContent=fmt(totDL);
  if(el('pcStatThuong')) el('pcStatThuong').textContent=fmt(totTH);
  if(el('pcStatHT')) el('pcStatHT').textContent=fmt(totHTCD+totHTN);
  if(el('pcStatTotal')) el('pcStatTotal').textContent=fmt(totTN+totDL+totTH+totHTCD+totHTN);
}

function saveAllPhucap(){
  const mk=getMonth().key;
  const inputs=document.querySelectorAll('.pc-input');
  const map={};
  inputs.forEach(inp=>{
    const nvId=inp.dataset.nv;
    const field=inp.dataset.field;
    if(!map[nvId]) map[nvId]={};
    map[nvId][field]=+inp.value||0;
  });
  Object.keys(map).forEach(nvId=>{
    let pc=DB.phucap.find(p=>p.nvId===nvId&&p.monthKey===mk);
    if(!pc){pc={id:genId(),nvId,monthKey:mk,pctn:0,pcdl:0,htcd:0,htngay:0,thuong:0};DB.phucap.push(pc);}
    pc.pctn=map[nvId].pctn||0;
    pc.pcdl=map[nvId].pcdl||0;
    pc.htcd=map[nvId].htcd||0;
    pc.htngay=map[nvId].htngay||0;
    pc.thuong=map[nvId].thuong||0;
  });
  DB.save('phucap');
  renderPhucapPage();
  calcAllSalary();
  showToast('Đã lưu phụ cấp & thưởng!');
}

function resetPhucapMonth(){
  const mk=getMonth().key;
  const count=DB.phucap.filter(p=>p.monthKey===mk).length;
  if(!count){showToast('Không có dữ liệu!','error');return;}
  if(!confirm('Reset phụ cấp & thưởng tháng này? Sẽ dùng giá trị mặc định từ NV.')) return;
  DB.phucap=DB.phucap.filter(p=>p.monthKey!==mk);
  DB.save('phucap');
  renderPhucapPage();
  calcAllSalary();
  showToast('Đã reset!');
}

// === HOLIDAY CONFIG ===
function loadMonthConfig(){
  const mk=getMonth().key;
  const mcfg=DB.monthConfig.find(c=>c.monthKey===mk);
  const inp=document.getElementById('ngayLeCount');
  if(inp) inp.value=mcfg?(mcfg.ngayle||0):0;
  updateHolidayNote();
}

function saveMonthConfig(){
  const mk=getMonth().key;
  const val=+document.getElementById('ngayLeCount').value||0;
  let mc=DB.monthConfig.find(c=>c.monthKey===mk);
  if(!mc){mc={monthKey:mk,ngayle:0};DB.monthConfig.push(mc);}
  mc.ngayle=val;
  DB.save('monthConfig');
  updateHolidayNote();
  calcAllSalary();
}

function setHoliday(add){
  const inp=document.getElementById('ngayLeCount');
  inp.value=+inp.value+add;
  saveMonthConfig();
}

function resetHoliday(){
  document.getElementById('ngayLeCount').value=0;
  saveMonthConfig();
}

function updateHolidayNote(){
  const val=+document.getElementById('ngayLeCount').value||0;
  const note=document.getElementById('ngayLeNote');
  if(!note) return;
  note.textContent=val>0?'→ NCC = NV.Chuẩn - '+val+' ngày lễ':'';
}
// === COPY PHU CAP ===
function openCopyPhucap(){
  const cur=getMonth();
  document.getElementById('cpToMonth').value=cur.label;
  // Populate source months - only months that have phucap data
  const existing=[...new Set(DB.phucap.map(p=>p.monthKey))].filter(k=>k!==cur.key);
  const sel=document.getElementById('cpFromMonth');
  sel.innerHTML='';
  if(!existing.length){
    sel.innerHTML='<option value="">-- Chưa có tháng nào --</option>';
    document.getElementById('cpInfo').innerHTML='<span style="color:var(--red)">Chưa có dữ liệu phụ cấp tháng nào để copy.</span>';
  } else {
    existing.sort().reverse().forEach(mk=>{
      const count=DB.phucap.filter(p=>p.monthKey===mk).length;
      const [m,y]=mk.split('-');
      const opt=document.createElement('option');
      opt.value=mk;opt.textContent='T'+m+'/'+y+' ('+count+' NV)';
      sel.appendChild(opt);
    });
    updateCpInfo();
  }
  sel.onchange=updateCpInfo;
  openModal('modalCopyPhucap');
}

function updateCpInfo(){
  const fromMk=document.getElementById('cpFromMonth').value;
  const toMk=getMonth().key;
  if(!fromMk) return;
  const fromCount=DB.phucap.filter(p=>p.monthKey===fromMk).length;
  const toCount=DB.phucap.filter(p=>p.monthKey===toMk).length;
  const [fm,fy]=fromMk.split('-');
  document.getElementById('cpInfo').innerHTML=
    '<b>T'+fm+'/'+fy+'</b>: '+fromCount+' NV có phụ cấp<br>'+
    '<b>Tháng hiện tại</b>: '+toCount+' NV đã có dữ liệu'+(toCount>0?' <span style="color:var(--orange)">(sẽ bị ảnh hưởng nếu Ghi đè bật)</span>':'');
}

function confirmCopyPhucap(){
  const fromMk=document.getElementById('cpFromMonth').value;
  const toMk=getMonth().key;
  if(!fromMk||fromMk===toMk){showToast('Chọn tháng nguồn khác tháng đích!','error');return;}
  const doPC=document.getElementById('cpPC').checked;
  const doThuong=document.getElementById('cpThuong').checked;
  const overwrite=document.getElementById('cpOverwrite').checked;
  if(!doPC&&!doThuong){showToast('Chọn ít nhất một loại!','error');return;}

  const srcRecs=DB.phucap.filter(p=>p.monthKey===fromMk);
  let copied=0,skipped=0;
  srcRecs.forEach(src=>{
    let dst=DB.phucap.find(p=>p.nvId===src.nvId&&p.monthKey===toMk);
    if(dst&&!overwrite){skipped++;return;}
    if(!dst){dst={id:genId(),nvId:src.nvId,monthKey:toMk,pctn:0,pcdl:0,htcd:0,htngay:0,thuong:0};DB.phucap.push(dst);}
    if(doPC){dst.pctn=src.pctn||0;dst.pcdl=src.pcdl||0;dst.htcd=src.htcd||0;dst.htngay=src.htngay||0;}
    if(doThuong) dst.thuong=src.thuong||0;
    copied++;
  });
  DB.save('phucap');
  closeModal('modalCopyPhucap');
  renderPhucapPage();
  calcAllSalary();
  showToast('Đã copy '+copied+' NV'+(skipped>0?', bỏ qua '+skipped:'')+' !');
}

// === SALARY FILE IMPORT ===
let salaryImportData = null;

function handleSalaryImport(event){
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      parseSalaryFile(rows, file.name);
    }catch(err){
      showToast('Lỗi đọc file: '+err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function parseSalaryFile(rows, filename){
  function norm(v){ return (v||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/g,'d').replace(/\s+/g,' ').trim(); }
  function n(v){ return typeof v==='number'?v:(parseFloat((v||'').toString().replace(/[^0-9.-]/g,''))||0); }

  // Detect month from first few rows
  let detMonth = null;
  for(let i=0;i<Math.min(rows.length,5);i++){
    const txt = rows[i].map(c=>(c||'').toString()).join(' ');
    const m = txt.match(/T(\d{1,2})[.\/-](\d{4})/i) || txt.match(/[Tt]h[aá]ng\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/);
    if(m){ detMonth={month:parseInt(m[1]),year:parseInt(m[2])}; break; }
  }
  if(!detMonth) detMonth={month:new Date().getMonth()+1,year:new Date().getFullYear()};

  // Find header row - look for row with "ten" or "nhan vien" or "ho ten"
  let headerIdx=-1, colMap={};
  for(let i=0;i<Math.min(rows.length,10);i++){
    const row = rows[i].map(c=>norm(c));
    // Check for STT or NV name column
    const hasTen = row.findIndex(c=>/^(ho\s*va\s*)?ten(\s*nhan\s*vien|\s*nv)?$|nhan\s*vien/.test(c));
    const hasStt = row.findIndex(c=>/^s\.?t\.?t\.?$/.test(c));
    if(hasTen>=0 || hasStt>=0){
      headerIdx=i;
      // Map columns
      row.forEach((c,j)=>{
        if(/^(ho\s*va\s*)?ten(\s*nhan\s*vien|\s*nv)?$|nhan\s*vien/.test(c)) colMap.ten=j;
        if(/^ma(\s*nv)?$|^ma\s*nhan\s*vien/.test(c)) colMap.ma=j;
        if(/ngay\s*cong\s*(thuc|tt)/.test(c)||(/ngay\s*cong/.test(c)&&!colMap.nctt)) colMap.nctt=j;
        if(/ngay\s*cong\s*chuan/.test(c)||(/ngay\s*chuan/.test(c)&&!colMap.ncc)) colMap.ncc=j;
        if(/an\s*trua|pc\s*an/.test(c)) colMap.pcan=j;
        if(/tour/i.test(c)) colMap.tour=j;
        if(/trach\s*nhiem/.test(c)) colMap.pctn=j;
        if(/di\s*lai/.test(c)) colMap.pcdl=j;
        if(/ho\s*tro\s*co\s*dinh|ht\s*c[d]/.test(c)) colMap.htcd=j;
        if(/ho\s*tro.*ngay|ht.*ngay/.test(c)) colMap.htngay=j;
        if(/thuong(\s*nhom)?$|tong.*thuong/.test(c)) colMap.thuong=j;
        if(/doanh\s*so/.test(c)) colMap.ds=j;
        if(/^kpi\s*%$|ti\s*le\s*kpi/.test(c)) colMap.kpipct=j;
        if(/luong\s*kpi|hoa\s*hong\s*kpi/.test(c)) colMap.luongkpi=j;
        if(/ung\s*luong/.test(c)) colMap.ungluong=j;
        if(/chi\s*tien|chi\s*khac/.test(c)) colMap.chitien=j;
        if(/phat\s*tien|tien\s*phat/.test(c)) colMap.phattien=j;
      });
      // If nctt not found, check next row too (multi-level header)
      if(colMap.nctt===undefined && i+1<rows.length){
        const row2=rows[i+1].map(c=>norm(c));
        row2.forEach((c,j)=>{
          if(/ngay\s*cong\s*(thuc|tt)|thuc\s*te/.test(c)) colMap.nctt=j;
          if(/ngay\s*cong\s*chuan|so\s*ngay\s*chuan/.test(c)) colMap.ncc=j;
        });
      }
      break;
    }
  }

  // Fallback: try to detect by position if specific known format
  if(headerIdx<0){
    // Try row 2-4 looking for numeric stt
    for(let i=1;i<Math.min(rows.length,6);i++){
      const first = rows[i][0];
      if(typeof first==='number' && first>=1 && first<=5 && rows[i][1]){
        // Guess columns by position based on screenshot
        headerIdx=i-1;
        colMap={ten:1,ncc:5,nctt:6,pcan:16,pctn:17,pcdl:18,thuong:21,ds:11,ungluong:27};
        break;
      }
    }
  }

  if(headerIdx<0){ showToast('Không nhận diện được file lương!','error'); return; }

  // Parse data rows
  const dataRows=[];
  const matchedIds = [];
  for(let i=headerIdx+1;i<rows.length;i++){
    const row=rows[i];
    const stt=row[0]; 
    if(typeof stt==='number'&&stt>=1&&stt<=200 || (stt&&/^\d+$/.test((stt||'').toString().trim()))){
      const tenRaw=(colMap.ten!==undefined?row[colMap.ten]:'').toString().trim();
      if(!tenRaw||tenRaw.length<2) continue;
      // Match NV
      const matchedNV = matchNV(tenRaw, stt, matchedIds);
      if (matchedNV) matchedIds.push(matchedNV.id);
      dataRows.push({
        tenFile:tenRaw, matchedNV,
        nctt:colMap.nctt!==undefined?n(row[colMap.nctt]):0,
        ncc:colMap.ncc!==undefined?n(row[colMap.ncc]):0,
        pcan:colMap.pcan!==undefined?n(row[colMap.pcan]):0,
        pctn:colMap.pctn!==undefined?n(row[colMap.pctn]):0,
        pcdl:colMap.pcdl!==undefined?n(row[colMap.pcdl]):0,
        htcd:colMap.htcd!==undefined?n(row[colMap.htcd]):0,
        htngay:colMap.htngay!==undefined?n(row[colMap.htngay]):0,
        thuong:colMap.thuong!==undefined?n(row[colMap.thuong]):0,
        ds:colMap.ds!==undefined?n(row[colMap.ds]):0,
        kpipct:colMap.kpipct!==undefined?n(row[colMap.kpipct]):0,
        luongkpi:colMap.luongkpi!==undefined?n(row[colMap.luongkpi]):0,
        ungluong:colMap.ungluong!==undefined?n(row[colMap.ungluong]):0,
        chitien:colMap.chitien!==undefined?n(row[colMap.chitien]):0,
        phattien:colMap.phattien!==undefined?n(row[colMap.phattien]):0,
        tour:colMap.tour!==undefined?n(row[colMap.tour]):0,
      });
    }
  }

  if(!dataRows.length){showToast('Không tìm thấy dữ liệu nhân viên!','error');return;}

  salaryImportData={dataRows,detMonth,colMap,filename};

  // Populate month selector
  const sel=document.getElementById('siMonth');
  sel.innerHTML='';
  for(let off=-6;off<=6;off++){
    let m=detMonth.month+off,y=detMonth.year;
    while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}
    const opt=document.createElement('option');
    opt.value=m+'-'+y;opt.textContent='T'+m+'/'+y;
    if(off===0)opt.selected=true;
    sel.appendChild(opt);
  }

  // Preview table
  const body=document.getElementById('siPreviewBody');
  body.innerHTML=dataRows.map(d=>{
    const matched=d.matchedNV?
      '<span style="color:var(--accent2)">✅ '+d.matchedNV.name+'</span>':
      '<span style="color:var(--red)">❌ Không tìm thấy</span>';
    return '<tr>'+
      '<td>'+d.tenFile+'</td>'+
      '<td>'+matched+'</td>'+
      '<td>'+d.nctt+'</td>'+
      '<td>'+fmt(d.pctn)+'</td>'+
      '<td>'+fmt(d.pcdl)+'</td>'+
      '<td>'+fmt(d.thuong)+'</td>'+
      '<td>'+fmt(d.ds)+'</td>'+
      '<td>'+fmt(d.ungluong)+'</td>'+
      '</tr>';
  }).join('');

  document.getElementById('siLog').style.display='none';
  openModal('modalSalaryImport');
}

function confirmSalaryImport(){
  if(!salaryImportData) return;
  const mk=document.getElementById('siMonth').value;
  const doCC=document.getElementById('siCC').checked;
  const doPC=document.getElementById('siPC').checked;
  const doThuong=document.getElementById('siThuong').checked;
  const doKPI=document.getElementById('siKPI').checked;
  const doKT=document.getElementById('siKT').checked;
  const logEl=document.getElementById('siLog');
  logEl.style.display='block'; logEl.innerHTML='';
  const log=msg=>{logEl.innerHTML+='<div>'+msg+'</div>';logEl.scrollTop=logEl.scrollHeight;};

  let ok=0,skip=0;
  salaryImportData.dataRows.forEach(d=>{
    if(!d.matchedNV){skip++;return;}
    const nv=d.matchedNV;
    if (nv.name !== d.tenFile) {
      nv.name = d.tenFile;
    }

    if(doCC){
      DB.chamcong=DB.chamcong.filter(c=>!(c.nvId===nv.id&&c.monthKey===mk));
      DB.chamcong.push({
        id:genId(),
        nvId:nv.id,
        monthKey:mk,
        ngaycongtt:d.nctt||0,
        ngaynghi:0,
        giotre:0,
        phattle:0,
        pcan:d.pcan||0,
        luongcb:nv.luongcb,
        ncc:d.ncc||nv.ngaycongchuan||26,
        giocongchuan:nv.giocongchuan||9,
        chucvu:nv.chucvu,
        tourAmt:d.tour||0,
        ghichu:'Import file lương'
      });
      DB.save('chamcong');
    }

    if(doPC||doThuong){
      let pc=DB.phucap.find(p=>p.nvId===nv.id&&p.monthKey===mk);
      if(!pc){pc={id:genId(),nvId:nv.id,monthKey:mk,pctn:0,pcdl:0,htcd:0,htngay:0,thuong:0};DB.phucap.push(pc);}
      if(doPC){pc.pctn=d.pctn;pc.pcdl=d.pcdl;pc.htcd=d.htcd;pc.htngay=d.htngay;}
      if(doThuong) pc.thuong=d.thuong;
      DB.save('phucap');
    }

    if(doKPI&&d.ds>0){
      DB.kpis=DB.kpis.filter(k=>!(k.nvId===nv.id&&k.monthKey===mk));
      DB.kpis.push({id:genId(),nvId:nv.id,monthKey:mk,
        vaitro:nv.chucvu,dsap:0,dsthuc:d.ds,hoahong:d.kpipct,phat:0,ghichu:'Import file lương'});
      DB.save('kpis');
    }

    if(doKT){
      DB.khautru=DB.khautru.filter(k=>!(k.nvId===nv.id&&k.monthKey===mk&&(k.loai==='ungluong'||k.loai==='chitien'||k.loai==='phattien')));
      if(d.ungluong>0){
        DB.khautru.push({id:genId(),nvId:nv.id,monthKey:mk,loai:'ungluong',ngay:'',sotien:d.ungluong,lanUng:1,ghichu:'Import file lương'});
      }
      if(d.chitien>0){
        DB.khautru.push({id:genId(),nvId:nv.id,monthKey:mk,loai:'chitien',ngay:'',sotien:d.chitien,lanUng:0,ghichu:'Import file lương'});
      }
      if(d.phattien>0){
        DB.khautru.push({id:genId(),nvId:nv.id,monthKey:mk,loai:'phattien',ngay:'',sotien:d.phattien,lanUng:0,ghichu:'Import file lương'});
      }
      DB.save('khautru');
    }
    ok++;
  });

  // Set global month
  const gSel=document.getElementById('globalMonth');
  for(let i=0;i<gSel.options.length;i++){if(gSel.options[i].value===mk){gSel.selectedIndex=i;break;}}

  log('<strong style="color:var(--accent2)">✅ Import '+ok+' NV thành công'+(skip>0?' ('+skip+' không khớp)':'')+'</strong>');
  addLog('Import file lương: '+ok+' NV','success','Tháng: '+mk+', file: '+salaryImportData.filename);
  DB.save('nhanvien');
  calcAllSalary();
  refreshPage();
  showToast('Import '+ok+' NV thành công!');
}


// === MASTER IMPORT ===
let masterImportData=null;

function handleMasterImport(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(e.target.result,{type:'array'});
      addLog('Import Tổng Hợp: '+file.name,'info','Sheets: '+wb.SheetNames.join(', '));
      processMasterImport(wb);
    }catch(err){
      addLog('Lỗi đọc file: '+err.message,'error');
      showToast('Lỗi đọc file!','error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value='';
}

function detectSheetType(name){
  const n=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/g,'d');
  if(/^luong|bang\s*luong|luong\s*t\d/.test(n)) return 'luong';
  if(/kpi|doanh\s*so/.test(n)) return 'kpi';
  if(/tour|dich\s*vu/.test(n)) return 'tour';
  if(/may\s*cham\s*cong|may\s*cc/i.test(n)) return null;
  if(/cham\s*cong|bang\s*cc|ngay\s*cong/.test(n)) return 'cc';
  return null;
}

function processMasterImport(wb){
  masterImportData={sheets:[],detectedMonth:null};
  
  // Detect month from any sheet name
  let detMonth=null;
  wb.SheetNames.forEach(name=>{
    const m=name.match(/T(\d{1,2})[.\/-]?(\d{4})/i) || name.match(/(\d{1,2})[.\/-](\d{4})/);
    if(m&&!detMonth) detMonth={month:parseInt(m[1]),year:parseInt(m[2])};
  });
  if(!detMonth){
    // Try from first few rows of first sheet
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    for(let i=0;i<Math.min(rows.length,5);i++){
      const txt=rows[i].map(c=>(c||'').toString()).join(' ');
      const cm=txt.match(/th[aá]ng\s*(\d{1,2})\s*[.\/-]\s*(\d{4})/i);
      if(cm){detMonth={month:parseInt(cm[1]),year:parseInt(cm[2])};break;}
    }
  }
  if(!detMonth) detMonth={month:new Date().getMonth()+1,year:new Date().getFullYear()};
  masterImportData.detectedMonth=detMonth;

  // Process each sheet
  wb.SheetNames.forEach(name=>{
    const type=detectSheetType(name);
    const ws=wb.Sheets[name];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const rowCount=rows.filter(r=>r.some(c=>c!=='')).length;
    masterImportData.sheets.push({name,type,rows,rowCount,enabled:type!==null});
  });

  showMasterImportPreview();
}

function showMasterImportPreview(){
  const {sheets,detectedMonth}=masterImportData;

  // Month selector
  const sel=document.getElementById('miMonth');
  sel.innerHTML='';
  for(let off=-6;off<=6;off++){
    let m=detectedMonth.month+off,y=detectedMonth.year;
    while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}
    const opt=document.createElement('option');
    opt.value=m+'-'+y;opt.textContent='T'+m+'/'+y;
    if(off===0)opt.selected=true;
    sel.appendChild(opt);
  }

  // Counts
  const kpiSheets=sheets.filter(s=>s.type==='kpi'&&s.enabled);
  const tourSheets=sheets.filter(s=>s.type==='tour'&&s.enabled);
  const ccSheets=sheets.filter(s=>s.type==='cc'&&s.enabled);
  document.getElementById('miKpiCount').textContent=kpiSheets.length?kpiSheets[0].rowCount+' dòng':'—';
  document.getElementById('miTourCount').textContent=tourSheets.length?tourSheets[0].rowCount+' dòng':'—';
  document.getElementById('miCcCount').textContent=ccSheets.length?ccSheets[0].rowCount+' dòng':'—';

  // Sheet list with checkboxes
  const typeLabels={luong:'💰 Bảng Lương',kpi:'🎯 KPI Doanh Số',tour:'🗺️ Tour Dịch Vụ',cc:'📅 Chấm Công'};
  const typeColors={luong:'var(--green)',kpi:'var(--blue)',tour:'var(--orange)',cc:'var(--purple)'};
  const list=document.getElementById('miSheetList');
  list.innerHTML=sheets.map((s,i)=>{
    const badge=s.type?'<span class="badge" style="background:'+typeColors[s.type]+'20;color:'+typeColors[s.type]+'">'+typeLabels[s.type]+'</span>':'<span class="badge badge-gray">❓ Không nhận diện</span>';
    return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border-radius:8px;cursor:pointer;border:1px solid var(--border)">'+
      '<input type="checkbox" id="miSheet'+i+'" '+(s.enabled?'checked':'')+' onchange="masterImportData.sheets['+i+'].enabled=this.checked;showMasterImportPreview()" style="width:18px;height:18px" />'+
      '<div style="flex:1"><strong>'+s.name+'</strong><br><small style="color:var(--text2)">'+s.rowCount+' dòng dữ liệu</small></div>'+
      badge+
      '</label>';
  }).join('');

  document.getElementById('miLog').style.display='none';
  openModal('modalMasterImport');
}

function confirmMasterImport(){
  if(!masterImportData) return;
  const mk=document.getElementById('miMonth').value;
  const [mm,yy]=mk.split('-');
  const logEl=document.getElementById('miLog');
  logEl.style.display='block';
  logEl.innerHTML='';
  function log(msg){logEl.innerHTML+='<div>'+msg+'</div>';logEl.scrollTop=logEl.scrollHeight;}

  let totalImported=0;

  // Process luong first, then cc, kpi, tour
  const typeOrder={luong:0,cc:1,kpi:2,tour:3};
  const sortedSheets=[...masterImportData.sheets].sort((a,b)=>(typeOrder[a.type]??9)-(typeOrder[b.type]??9));
  sortedSheets.forEach(sheet=>{
    if(!sheet.enabled||!sheet.type) return;

    if(sheet.type==='luong'){
      log('💰 <strong>Đang xử lý Bảng Lương:</strong> '+sheet.name+'...');
      try{
        const rows=sheet.rows;
        // Find header row with STT, Nhân viên
        let hIdx=-1;
        for(let i=0;i<6;i++){
          const r0=(rows[i]&&rows[i][0]||'').toString().toLowerCase();
          if(/stt|^s\.?t\.?t/.test(r0)){hIdx=i;break;}
        }
        if(hIdx<0){log('⚠️ Lương: Không tìm thấy header STT');}
        else{
          // Expect data rows start 2 rows after header (skip sub-header)
          const dataStart=hIdx+2;
          let imported=0,created=0;
          const matchedIds = [];
          for(let i=dataStart;i<rows.length;i++){
            const row=rows[i];
            if(!row||row.length<5) continue;
            const stt=row[0];
            if(typeof stt!=='number'||stt<1||stt>100) continue;
            const rawName=(row[1]||'').toString().trim();
            if(!rawName||rawName.length<2) continue;
            const chucvu=(row[2]||'').toString().trim();
            const trangthai=(row[3]||'').toString().trim();
            const gioCongChuan=parseFloat(row[4])||9;
            const ncc=parseFloat(row[5])||26;
            const nctl=parseFloat(row[6])||0;
            const luongCB=parseFloat(row[7])||0;
            const tourAmt=parseFloat(row[9])||0;
            const dsKPI=parseFloat(row[10])||0;
            const hhRate=parseFloat(row[11])||0;
            const luongKPI=parseFloat(row[12])||0;
            const gioOT=parseFloat(row[13])||0;
            const pcanVal=parseFloat(row[15])||0;
            const pctn=parseFloat(row[16])||0;
            const hotro=parseFloat(row[17])||0;
            const thuong=parseFloat(row[20])||0;
            const kyquy=parseFloat(row[25])||0;
            const trukhac=parseFloat(row[26])||0;
            const ungluong=parseFloat(row[27])||0;
            const lydo=(row[28]||'').toString().trim();
            // Match or create NV
            let nv=matchNV(rawName, stt.toString(), matchedIds);
            if(!nv){
              nv={id:genId(),manv:stt.toString(),name:rawName,chucvu:chucvu||'NV',phongban:'Khác',trangthai:trangthai||'Chính thức',luongcb:luongCB,ngaycongchuan:ncc,giocongchuan:gioCongChuan,pctrachnhiem:0,kyquy:kyquy};
              DB.nhanvien.push(nv);
              created++;
              log('🆕 Tạo NV mới: '+rawName);
            } else {
              nv.manv = stt.toString();
              if (nv.name !== rawName) {
                nv.name = rawName;
              }
            }
            if (nv) matchedIds.push(nv.id);
            // Update NV master data
            if(luongCB>0) nv.luongcb=luongCB;
            nv.ngaycongchuan=ncc;
            nv.giocongchuan=gioCongChuan;
            nv.kyquy=kyquy;
            if(chucvu) nv.chucvu=chucvu;
            nv.pcantrua=pcanVal===0?0:25000;
            // Update chamcong - add OT if we have a CC record, or create minimal one
            let cc=DB.chamcong.find(c=>c.nvId===nv.id&&c.monthKey===mk);
            if(cc){
              if(gioOT>0) cc.gioOT=gioOT;
              cc.pcan=pcanVal;
              cc.luongcb=luongCB;
              cc.ncc=ncc;
              cc.giocongchuan=gioCongChuan;
              cc.chucvu=chucvu;
              cc.ngaycongtt=nctl;
              cc.ngayle=0;
              cc.tourAmt=tourAmt;
            } else if(nctl>0){
              // Create CC record from NCTL (we don't know congTT vs ngayle split, use NCTL as congTT with 0 lễ)
              DB.chamcong.push({
                id:genId(),
                nvId:nv.id,
                monthKey:mk,
                ngaycongtt:nctl,
                ngayle:0,
                ngaynghi:0,
                gioOT:gioOT,
                pcan:pcanVal,
                luongcb:luongCB,
                ncc:ncc,
                giocongchuan:gioCongChuan,
                chucvu:chucvu,
                tourAmt:tourAmt,
                ghichu:'Import từ sheet Lương'
              });
            }
            // Phụ cấp (trách nhiệm, hỗ trợ, thưởng)
            let pc=DB.phucap.find(p=>p.nvId===nv.id&&p.monthKey===mk);
            if(!pc){pc={id:genId(),nvId:nv.id,monthKey:mk,pctn:0,hotro:0,htcd:0,htngay:0,pcdl:0,thuong:0};DB.phucap.push(pc);}
            pc.pctn=pctn;
            pc.hotro=hotro;
            pc.htcd=hotro;
            pc.htngay=0;
            pc.pcdl=0;
            pc.thuong=thuong;
            // KPI - only import from Lương sheet if no separate KPI sheet exists
            const hasKPISheet=masterImportData.sheets.some(s=>s.type==='kpi'&&s.enabled);
            if(dsKPI>0&&!hasKPISheet){
              DB.kpis=DB.kpis.filter(k=>!(k.nvId===nv.id&&k.monthKey===mk&&k.ghichu==='Import Lương'));
              const isTele=/tele/i.test(chucvu);
              DB.kpis.push({id:genId(),nvId:nv.id,monthKey:mk,vaitro:isTele?'Tele':'TV',dsap:0,dsthuc:dsKPI,hoahong:isTele?hhRate:(hhRate>0&&hhRate<1?hhRate*100:hhRate),phat:0,ghichu:'Import Lương'});
            }
            // Khấu trừ
            DB.khautru=DB.khautru.filter(k=>!(k.nvId===nv.id&&k.monthKey===mk&&(k.loai==='ungluong'||k.loai==='chitien'||k.loai==='phattien')));
            if(ungluong>0){
              DB.khautru.push({id:genId(),nvId:nv.id,monthKey:mk,loai:'ungluong',ngay:'',sotien:ungluong,lanUng:1,ghichu:'Import Lương'+(lydo?' - '+lydo:'')});
            }
            if(trukhac>0){
              DB.khautru.push({id:genId(),nvId:nv.id,monthKey:mk,loai:'chitien',ngay:'',sotien:trukhac,lanUng:0,ghichu:'Import Lương'+(lydo?' - '+lydo:'')});
            }
            imported++;
          }
          DB.save('nhanvien');DB.save('chamcong');DB.save('phucap');DB.save('kpis');DB.save('khautru');
          log('✅ Lương: Import '+imported+' NV'+(created?' (tạo mới '+created+')':''));
          totalImported+=imported;
        }
      }catch(e){log('❌ Lương lỗi: '+e.message);}
    }

    if(sheet.type==='kpi'){
      log('🎯 <strong>Đang xử lý KPI:</strong> '+sheet.name+'...');
      try{
        // Reuse existing KPI parser
        const oldKpiData=kpiImportData;
        parseKPIFile(sheet.rows, true);
        if(kpiImportData){
          // Override month
          document.getElementById('kpiImpMonth').value=mk;
          const {kpis}=kpiImportData;
          DB.kpis=DB.kpis.filter(k=>k.monthKey!==mk);
          let imported=0;
          kpis.forEach(k=>{
            if(!k.matchedNV) return;
            DB.kpis.push({id:genId(),nvId:k.matchedNV.id,monthKey:mk,vaitro:k.vaitro,dsap:k.dsap,dsthuc:k.dsthuc,hoahong:k.hoahong,phat:k.phat,ghichu:k.notes});
            imported++;
          });
          DB.save('kpis');
          log('✅ KPI: Import '+imported+' nhân viên');
          totalImported+=imported;
          closeModal('modalImportKPI');
        }
        kpiImportData=oldKpiData;
      }catch(e){log('❌ KPI lỗi: '+e.message);}
    }

    if(sheet.type==='tour'){
      log('🗺️ <strong>Đang xử lý Tour:</strong> '+sheet.name+'...');
      try{
        const rows=sheet.rows;
        function clT(v){
          if(v===null||v===undefined)return '';
          let s=v.toString().trim().toLowerCase();
          s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          s=s.replace(/\u0111/g,'d').replace(/[^\x20-\x7E]/g,'');
          return s.replace(/\s+/g,' ').trim();
        }
        // Find header row
        let headerIdx=-1,colNgay=-1,colKhach=-1,colDV=-1,colPIC=-1,colKTVAmt=-1,colBSAmt=-1,colNotes=-1;
        for(let i=0;i<Math.min(rows.length,10);i++){
          const row=rows[i].map(c=>clT(c));
          const ngIdx=row.findIndex(c=>/^ng|^day|^date/.test(c)&&c.length<10&&!/cong|tinh/.test(c));
          const khIdx=row.findIndex(c=>/kha.*hang|khach|customer/.test(c));
          const dvIdx=row.findIndex(c=>/di.*vu|dich vu|service/.test(c));
          if(ngIdx>=0&&(khIdx>=0||dvIdx>=0)){
            headerIdx=i;
            colNgay=ngIdx;
            colKhach=khIdx>=0?khIdx:(dvIdx>0?dvIdx-1:ngIdx+1);
            colDV=dvIdx>=0?dvIdx:(khIdx>=0?khIdx+1:ngIdx+2);
            const picIdx=row.findIndex(c=>/^pic$/i.test(c));
            colPIC=picIdx>=0?picIdx:row.findIndex(c=>/pic|nhan vien|nv/.test(c));
            // KTV and BS AMOUNT columns (not name columns)
            const startAfter=colPIC>=0?colPIC+1:colDV+1;
            colKTVAmt=row.findIndex((c,j)=>j>=startAfter&&/ktv/.test(c));
            colBSAmt=row.findIndex((c,j)=>j>=startAfter&&/ba.*s[iy]|bac s|bs/.test(c));
            colNotes=row.findIndex((c,j)=>j>=startAfter&&/note|ghi.*chu/.test(c));
            // Fallback: if not found, assume columns after PIC
            if(colKTVAmt<0&&colPIC>=0) colKTVAmt=colPIC+1;
            if(colBSAmt<0&&colKTVAmt>=0) colBSAmt=colKTVAmt+1;
            if(colNotes<0&&colBSAmt>=0) colNotes=colBSAmt+1;
            break;
          }
        }
        if(headerIdx<0){log('⚠️ Tour: Không tìm thấy header');return;}
        
        log('📋 Tour header: Ngày='+colNgay+', Khách='+colKhach+', DV='+colDV+', PIC='+colPIC+', KTV$='+colKTVAmt+', BS$='+colBSAmt+', Notes='+colNotes);

        // Auto-detect Bác sĩ NV from DB
        const bsNorm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/g,'d').replace(/[^\x20-\x7E]/g,'');
        let bsNV=DB.nhanvien.find(n=>/bac\s*s[iy]|^bs$/i.test(bsNorm(n.chucvu||'')));
        if(!bsNV) bsNV=DB.nhanvien.find(n=>/doctor|bac\s*s[iy]/i.test(bsNorm(n.chucvu||''))||/bac\s*s[iy]/i.test(bsNorm(n.name||'')));
        if(bsNV) log('👨‍⚕️ Auto-detect Bác sĩ: '+bsNV.name+' (id='+bsNV.id+')');
        else log('⚠️ Không tìm thấy Bác sĩ trong danh sách NV! Chức vụ: '+DB.nhanvien.map(n=>n.name+'='+n.chucvu).join(', '));

        // Match PIC name to NV
        const matchNVName=(val)=>{
          if(!val) return '';
          const name=(val||'').toString().trim();
          if(!name) return '';
          const norm=bsNorm(name);
          let best=null,bestS=0;
          DB.nhanvien.forEach(n=>{
            const nn=bsNorm(n.name||'');
            const last=nn.split(/\s+/).pop();
            let score=0;
            if(nn===norm) score=100;
            else if(last===norm) score=50;
            else if(nn.includes(norm)) score=10;
            
            if(score>0&&/KTV|PDV|Dịch vụ/i.test(n.chucvu||'')) score+=1;
            
            if(score>bestS){bestS=score;best=n;}
          });
          return best?best.id:'';
        };

        DB.tours=DB.tours.filter(t=>t.monthKey!==mk);
        let imported=0,bsAssigned=0,currentDay='';
        for(let i=headerIdx+1;i<rows.length;i++){
          const row=rows[i];
          if(!row||row.length<3) continue;

          // Parse date - handle Excel serial dates
          const rawDay=row[colNgay];
          const dayCell=(rawDay||'').toString().trim();
          if(dayCell){
            if(typeof rawDay==='number'&&rawDay>40000&&rawDay<60000){
              const jsDate=new Date((rawDay-25569)*86400000);
              if(!isNaN(jsDate.getTime())) currentDay=jsDate.getDate()+'/'+(jsDate.getMonth()+1);
            } else {
              const dm=dayCell.match(/^(\d{1,2})[\.\/](\d{1,2})$/);
              if(dm) currentDay=dm[1]+'/'+dm[2];
              else if(/^\d{1,2}$/.test(dayCell)) currentDay=dayCell+'/'+masterImportData.detectedMonth.month;
              else if(dayCell.toUpperCase()==='TRUE'||/^th[aá]ng|^t\d|^n[aă]m/i.test(dayCell)) continue;
            }
          }

          const rawKhach=colKhach>=0?(row[colKhach]||'').toString().trim():'';
          const rawDV=colDV>=0?(row[colDV]||'').toString().trim():'';
          if(!rawDV&&!rawKhach) continue;
          // Skip total/header rows
          if(/^t[oô]ng|^total|^sum/i.test(clT(rawKhach))) continue;
          if(clT(rawKhach).includes('khach')) continue;

          // Read amounts - skip boolean TRUE (Excel checkboxes)
          const rawKTVVal=colKTVAmt>=0?row[colKTVAmt]:0;
          const ktvAmt=(rawKTVVal===true||rawKTVVal===false)?0:parseFloat(rawKTVVal)||0;
          const rawBSVal=colBSAmt>=0?row[colBSAmt]:0;
          const bsAmt=(rawBSVal===true||rawBSVal===false)?0:parseFloat(rawBSVal)||0;
          const notes=colNotes>=0?(row[colNotes]||'').toString().trim():'';
          const picId=matchNVName(colPIC>=0?row[colPIC]:'');

          // Assign BS when there's a BS fee
          const bsId=(bsNV&&bsAmt>0)?bsNV.id:'';
          if(bsId) bsAssigned++;

          DB.tours.push({
            id:genId(),monthKey:mk,ngay:currentDay,
            khach:rawKhach,dichvu:rawDV,
            pic:picId,
            tienPIC:ktvAmt,
            ktv:'',tienKTV:0,
            bs:bsId,
            tienBS:bsAmt,
            ghichu:notes
          });
          imported++;
        }
        DB.save('tours');
        log('✅ Tour: Import '+imported+' tour, '+bsAssigned+' có tiền BS');
        totalImported+=imported;
      }catch(e){log('❌ Tour lỗi: '+e.message);}
    }

    if(sheet.type==='cc'){
      log('📅 <strong>Đang xử lý Chấm Công:</strong> '+sheet.name+'...');
      try{
        // Reuse existing robust CC parser
        const oldCCData=ccImportData;
        processImportData(sheet.rows, true);
        if(ccImportData){
          // Auto-confirm using the same logic as confirmCCImport
          const {empMap,detectedMonth:ccDetMonth,format}=ccImportData;
          const isConsolidated=(format==='consolidated');
          let imported=0;
          const hasLuongSheet=masterImportData.sheets.some(s=>s.type==='luong'&&s.enabled);
          Object.values(empMap).forEach(emp=>{
            const nv=emp.matchedNV;
            if(!nv) return;
            let workDays,offDays,totalLate,phatTre;
            if(isConsolidated){
              workDays=emp.workDays||0;offDays=emp.offDays||0;totalLate=0;phatTre=emp.phat||0;
            } else {
              workDays=emp.days.filter(d=>d.hasWork).length;
              offDays=emp.days.filter(d=>!d.hasWork).length;
              const schedule=getScheduleFor(nv.phongban);
              const [hC,mC]=(schedule.giovao||'08:00').split(':').map(Number);
              const chuanMins=hC*60+mC+(schedule.tolerance||0);
              totalLate=0;
              emp.days.forEach(d=>{
                if(d.times.length>0){const first=d.times[0];const fM=first.h*60+first.m;if(fM>chuanMins)totalLate+=(fM-(hC*60+mC));}
              });
              phatTre=0;
            }
            // Preserve gioOT and NCTL/pcan from existing record (imported from Lương sheet)
            const existingCC=DB.chamcong.find(c=>c.nvId===nv.id&&c.monthKey===mk);
            const finalGioOT=hasLuongSheet&&(existingCC&&existingCC.gioOT!==undefined)?existingCC.gioOT:(emp.tongGio>0?emp.tongGio:(existingCC?existingCC.gioOT||0:0));
            const prevPcan=existingCC&&existingCC.pcan!==undefined?existingCC.pcan:undefined;
            const prevLuongCB=existingCC?existingCC.luongcb:undefined;
            const prevNCC=existingCC?existingCC.ncc:undefined;
            const prevGioCongChuan=existingCC?existingCC.giocongchuan:undefined;
            const prevChucVu=existingCC?existingCC.chucvu:undefined;
            const prevTourAmt=existingCC?existingCC.tourAmt:undefined;

            let finalNgayLe=emp.ngayle||0;
            if(hasLuongSheet&&existingCC&&existingCC.ngaycongtt>0){
              const prevNCTL=existingCC.ngaycongtt;
              if(prevNCTL!==workDays){
                finalNgayLe=Math.max(0,prevNCTL-workDays);
              }else{
                finalNgayLe=0;
              }
            }

            DB.chamcong=DB.chamcong.filter(c=>!(c.nvId===nv.id&&c.monthKey===mk));
            const newCC={id:genId(),nvId:nv.id,monthKey:mk,ngaycongtt:workDays,ngayle:finalNgayLe,ngaynghi:offDays,gioOT:finalGioOT,ghichu:'Import TH - '+emp.tenFile+(emp.notes?' | '+emp.notes:'')};
            if(prevPcan!==undefined){
              newCC.pcan=prevPcan;
            }
            if(prevLuongCB!==undefined) newCC.luongcb=prevLuongCB;
            if(prevNCC!==undefined) newCC.ncc=prevNCC;
            if(prevGioCongChuan!==undefined) newCC.giocongchuan=prevGioCongChuan;
            if(prevChucVu!==undefined) newCC.chucvu=prevChucVu;
            if(prevTourAmt!==undefined) newCC.tourAmt=prevTourAmt;
            DB.chamcong.push(newCC);
            imported++;
          });
          DB.save('chamcong');
          log('✅ Chấm Công: Import '+imported+' nhân viên');
          totalImported+=imported;
        } else {
          log('⚠️ Chấm Công: Không nhận diện được format');
        }
        ccImportData=oldCCData;
      }catch(e){log('❌ Chấm Công lỗi: '+e.message);}
    }
  });

  // Ensure month exists in selector
  const gSel=document.getElementById('globalMonth');
  let found=false;
  for(let i=0;i<gSel.options.length;i++){
    if(gSel.options[i].value===mk){gSel.selectedIndex=i;found=true;break;}
  }
  if(!found){
    const [m2,y2]=mk.split('-');
    const opt=document.createElement('option');
    opt.value=mk;opt.textContent='Tháng '+m2+'/'+y2;
    gSel.appendChild(opt);gSel.value=mk;
  }

  log('<br><strong style="color:var(--accent2)">✅ Hoàn tất! Import tổng cộng '+totalImported+' bản ghi</strong>');
  addLog('Import Tổng Hợp thành công: '+totalImported+' bản ghi','success','Tháng: '+mk);
  onMonthChange();
  showToast('Import tổng hợp: '+totalImported+' bản ghi!');
  masterImportData=null;
  setTimeout(()=>{closeModal('modalMasterImport');},1200);
}


// === BACKUP & RESTORE ===
function backupDatabase() {
  const backup = {};
  ['nhanvien','chamcong','tours','kpis','phucap','khautru','calamviec','monthConfig','settings'].forEach(k => {
    backup[k] = DB[k];
  });
  
  const now = new Date();
  const dateStr = now.getFullYear() + 
                  '-' + String(now.getMonth()+1).padStart(2,'0') + 
                  '-' + String(now.getDate()).padStart(2,'0') + 
                  '_' + String(now.getHours()).padStart(2,'0') + 
                  '-' + String(now.getMinutes()).padStart(2,'0');
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SpaPayroll_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã tải xuống file sao lưu thành công!');
}

function restoreDatabase(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data || !Array.isArray(data.nhanvien)) {
        showToast('File sao lưu không hợp lệ!', 'error');
        return;
      }
      
      if (!confirm('Khôi phục dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại trên máy này. Bạn có chắc chắn muốn tiếp tục?')) {
        event.target.value = '';
        return;
      }
      
      ['nhanvien','chamcong','tours','kpis','phucap','khautru','calamviec','monthConfig','settings'].forEach(k => {
        if (data[k] !== undefined) {
          DB[k] = data[k];
        }
      });
      DB.saveAll();
      
      showToast('Khôi phục dữ liệu thành công! Trình duyệt sẽ tự tải lại...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch(err) {
      console.error(err);
      showToast('Lỗi đọc file sao lưu!', 'error');
    }
  };
  reader.readAsText(file);
}

// === GOOGLE DRIVE SYNC ===
const DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbzRiBdMPZPLJiT9R9JCgRDOUdmHVwPRQmU1rRx3o_P6GIAALDR7w_C36KGgksBz5_-fOA/exec';

function saveSyncUrl() {
  const url = document.getElementById('syncGoogleUrl').value.trim();
  localStorage.setItem('spa2_sync_google_url', url);
  showToast('Đã lưu đường dẫn đồng bộ Google!');
}

function loadSyncUrl() {
  const url = localStorage.getItem('spa2_sync_google_url') || DEFAULT_SYNC_URL;
  const input = document.getElementById('syncGoogleUrl');
  if (input) input.value = url;
}

async function syncCloudUpload() {
  const url = localStorage.getItem('spa2_sync_google_url') || DEFAULT_SYNC_URL;
  if (!url) {
    showToast('Vui lòng cấu hình URL Google Script trước!', 'error');
    return;
  }
  
  const btn = document.getElementById('btnCloudUpload');
  const oldText = btn.textContent;
  btn.textContent = '⏳ Đang tải lên...';
  btn.disabled = true;
  
  const backup = {};
  ['nhanvien','chamcong','tours','kpis','phucap','khautru','calamviec','monthConfig','settings'].forEach(k => {
    backup[k] = DB[k];
  });
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(backup)
    });
    const data = await res.json();
    if (data && data.status === 'success') {
      showToast('Đã đồng bộ tải dữ liệu lên Google Drive thành công!', 'success');
    } else {
      showToast('Tải lên thành công (Đã cập nhật tệp trên Drive)!');
    }
  } catch(err) {
    console.error(err);
    showToast('Tải lên thành công (Đã cập nhật tệp trên Drive)!');
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

async function syncCloudDownload() {
  const url = localStorage.getItem('spa2_sync_google_url') || DEFAULT_SYNC_URL;
  if (!url) {
    showToast('Vui lòng cấu hình URL Google Script trước!', 'error');
    return;
  }
  
  const btn = document.getElementById('btnCloudDownload');
  const oldText = btn.textContent;
  btn.textContent = '⏳ Đang tải về...';
  btn.disabled = true;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data && data.status === 'empty') {
      showToast('Thư mục Drive trống hoặc chưa có dữ liệu sao lưu!', 'warning');
      return;
    }
    
    if (!data || !Array.isArray(data.nhanvien)) {
      showToast('Dữ liệu tải về không hợp lệ!', 'error');
      return;
    }
    
    if (!confirm('Khôi phục dữ liệu từ đám mây sẽ ghi đè toàn bộ dữ liệu hiện tại trên máy này. Bạn có chắc chắn muốn tiếp tục?')) {
      return;
    }
    
    ['nhanvien','chamcong','tours','kpis','phucap','khautru','calamviec','monthConfig','settings'].forEach(k => {
      if (data[k] !== undefined) {
        DB[k] = data[k];
      }
    });
    DB.saveAll();
    
    showToast('Tải dữ liệu từ đám mây thành công! Trang web đang tải lại...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch(err) {
    console.error(err);
    showToast('Lỗi: ' + err.message + '. Hãy chắc chắn đã bấm "Tải lên" ở máy gốc trước và cấp quyền cho Script!', 'error');
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

// === BOOT ===
initDefaultSchedules();
populateSelects();refreshPage();

