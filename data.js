// === SpaPayroll Data Layer v3 ===
const DB_PREFIX = 'spa2_';

const DB = {
  nhanvien: [],
  chamcong: [],
  tours: [],
  kpis: [],
  phucap: [],
  khautru: [],
  calamviec: [],
  monthConfig: [],
  salaries: [],
  lichoff: [],
  settings: {},

  load(key) {
    try {
      const raw = localStorage.getItem(DB_PREFIX + key);
      if (raw) this[key] = JSON.parse(raw);
    } catch (e) { console.error('DB load error:', key, e); }
  },
  save(key) {
    try {
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(this[key]));
    } catch (e) { console.error('DB save error:', key, e); }
  },
  loadAll() {
    ['nhanvien','chamcong','tours','kpis','phucap','khautru','calamviec','monthConfig','lichoff','settings'].forEach(k => this.load(k));
    this._migrate();
  },
  saveAll() {
    ['nhanvien','chamcong','tours','kpis','phucap','khautru','calamviec','monthConfig','lichoff','settings'].forEach(k => this.save(k));
  },
  _migrate() {
    if (!this.lichoff || !Array.isArray(this.lichoff)) {
      this.lichoff = [];
    }
    // Migrate from old spa_ prefix
    if (this.nhanvien.length === 0) {
      try {
        const old = localStorage.getItem('spa_nhanvien');
        if (old) {
          const oldData = JSON.parse(old);
          if (oldData.length > 0) {
            this.nhanvien = oldData;
            ['chamcong','tours','kpis','calamviec','phucap','khautru'].forEach(k => {
              const o = localStorage.getItem('spa_' + k) || localStorage.getItem(DB_PREFIX + k);
              if (o) this[k] = JSON.parse(o);
            });
            this.saveAll();
          }
        }
      } catch(e) {}
    }
    // Ensure NV defaults
    this.nhanvien.forEach(nv => {
      if (!nv.phongban) nv.phongban = 'Khác';
      if (nv.ngaycongchuan === undefined) nv.ngaycongchuan = 26;
      if (nv.pcantrua === undefined) nv.pcantrua = 25000;
      if (nv.kyquy === undefined) nv.kyquy = 0;
    });
    if (!this.settings.antrua_per_day) this.settings.antrua_per_day = 25000;
    if (!this.settings.users) {
      this.settings.users = [
        { id: 'usr_admin', username: 'admin', password: '791522Mm', name: 'Quản trị viên', role: 'admin' }
      ];
    }
    if (this.calamviec.length === 0) {
      this.calamviec = [
        {name:'Ca Ngày', giovao:'09:00', giora:'19:00', nghitrua_bat:'12:00', nghitrua_ket:'13:30', tolerance:5, phatPerMin:0},
      ];
      this.save('calamviec');
    }
    this.save('settings');

    // Merge duplicates if any
    const cleanN = (s) => {
      if(!s) return '';
      return s.toString().trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/đ/g,'d').replace(/Đ/g,'D')
        .replace(/y/g,'i').replace(/Y/g,'I')
        .replace(/\s+/g,' ');
    };

    const mergeNV = (oldName, newName) => {
      const oldNV = this.nhanvien.find(n => cleanN(n.name) === cleanN(oldName));
      const newNV = this.nhanvien.find(n => cleanN(n.name) === cleanN(newName));
      if (oldNV && newNV) {
        const oldId = oldNV.id;
        const newId = newNV.id;
        
        // Transfer all references
        ['chamcong', 'tours', 'kpis', 'phucap', 'khautru'].forEach(key => {
          if (this[key]) {
            this[key].forEach(item => {
              if (item.nvId === oldId) item.nvId = newId;
              if (item.pic === oldId) item.pic = newId;
              if (item.ktv === oldId) item.ktv = newId;
              if (item.bs === oldId) item.bs = newId;
            });
          }
        });

        // Deduplicate chamcong
        if (this.chamcong) {
          const ccMap = {};
          this.chamcong = this.chamcong.filter(item => {
            const key = item.nvId + '_' + item.monthKey;
            if (ccMap[key]) return false;
            ccMap[key] = true;
            return true;
          });
        }

        // Deduplicate phucap
        if (this.phucap) {
          const pcMap = {};
          this.phucap = this.phucap.filter(item => {
            const key = item.nvId + '_' + item.monthKey;
            if (pcMap[key]) return false;
            pcMap[key] = true;
            return true;
          });
        }

        // Deduplicate kpis
        if (this.kpis) {
          const kpiMap = {};
          this.kpis = this.kpis.filter(item => {
            const key = item.nvId + '_' + item.monthKey + '_' + item.vaitro;
            if (kpiMap[key]) return false;
            kpiMap[key] = true;
            return true;
          });
        }

        // Deduplicate khautru
        if (this.khautru) {
          const ktMap = {};
          this.khautru = this.khautru.filter(item => {
            const key = item.nvId + '_' + item.monthKey + '_' + item.loai + '_' + item.sotien + '_' + item.ghichu;
            if (ktMap[key]) return false;
            ktMap[key] = true;
            return true;
          });
        }

        // Remove old employee
        this.nhanvien = this.nhanvien.filter(n => n.id !== oldId);
        
        // Ensure new employee has manv
        if (!newNV.manv && oldNV.manv) newNV.manv = oldNV.manv;
      }
    };

    mergeNV("Cô Thảo", "PHAN THỊ THU THẢO");
    mergeNV("Chú Tình", "VĂN TĨNH");

    // Migrate tours: move KTV from pic to ktv
    if (this.tours && Array.isArray(this.tours)) {
      let migrated = false;
      this.tours.forEach(t => {
        if (t.pic && !t.ktv) {
          const nv = this.nhanvien.find(n => n.id === t.pic);
          if (nv) {
            const chucvu = (nv.chucvu || '').toLowerCase();
            const pb = (nv.phongban || '').toLowerCase();
            if (chucvu.includes('ktv') || chucvu.includes('dịch vụ') || pb.includes('pdv') || pb.includes('dịch vụ')) {
              t.ktv = t.pic;
              t.tienKTV = t.tienPIC || 0;
              t.pic = '';
              t.tienPIC = 0;
              migrated = true;
            }
          } else {
            t.ktv = t.pic;
            t.tienKTV = t.tienPIC || 0;
            t.pic = '';
            t.tienPIC = 0;
            migrated = true;
          }
        }
      });
      if (migrated) {
        this.save('tours');
      }
    }

    this.saveAll();
  }
};

function genId() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5); }

// === HELPERS ===
function getMonth() {
  const sel = document.getElementById('globalMonth');
  if (!sel) return { key: '5-2026', month: 5, year: 2026, label: 'T5/2026' };
  const v = sel.value;
  const [m, y] = v.split('-').map(Number);
  return { key: v, month: m, year: y, label: 'T' + m + '/' + y };
}

function getNV(id) { return DB.nhanvien.find(n => n.id === id); }
function getNVName(id) { const n = getNV(id); return n ? n.name : '—'; }

function fmt(n) {
  if (!n && n !== 0) return '0';
  return Math.round(n).toLocaleString('vi-VN');
}

function fmtShort(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'tỷ';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'tr';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return fmt(n);
}

function pbLabel(pb) {
  const map = { PTV: 'Phòng Tư Vấn', PDV: 'Phòng Dịch Vụ', Tele: 'Phòng Tele', 'Khác': 'Khác' };
  return map[pb] || pb;
}

function badgeFor(status) {
  const map = {
    'Chính thức': '<span class="badge badge-green">Chính thức</span>',
    'Thử việc': '<span class="badge badge-orange">Thử việc</span>',
    'Parttime': '<span class="badge badge-blue">Parttime</span>',
    'Đã nghỉ việc': '<span class="badge badge-red">Đã nghỉ việc</span>',
  };
  return map[status] || '<span class="badge badge-gray">' + status + '</span>';
}

function initSampleData() {
  if (DB.nhanvien.length > 0) return;
  // No sample data - start fresh
}

// Boot
DB.loadAll();
