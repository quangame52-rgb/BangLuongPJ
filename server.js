const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel'
};

const server = http.createServer((req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Health Check
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', message: 'Local server is running!' }));
    return;
  }

  // API Git Push
  if (req.method === 'POST' && req.url === '/api/git-push') {
    const timestamp = new Date().toLocaleString('vi-VN');
    // Normalize to standard ASCII characters for git commit message on Windows to avoid encoding issues
    const commitMessage = `Cap nhat tu giao dien local (${timestamp.replace(/[:/]/g, '-')})`;
    
    // Command sequence to stage, commit and push to main branch
    const cmd = `git add . && git commit -m "${commitMessage}" && git push origin main`;
    
    exec(cmd, (error, stdout, stderr) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      if (error) {
        res.end(JSON.stringify({
          success: false,
          message: error.message,
          stdout: stdout,
          stderr: stderr
        }));
      } else {
        res.end(JSON.stringify({
          success: true,
          message: 'Đẩy lên GitHub thành công!',
          stdout: stdout,
          stderr: stderr
        }));
      }
    });
    return;
  }

  // Serve static files
  let urlPath = req.url.split('?')[0]; // Remove query strings
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  // Safe path check to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Local Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📂 Thư mục: ${PUBLIC_DIR}`);
  console.log(`💻 Nhấp vào link trên để mở giao diện quản lý lương.`);
  console.log(`==================================================\n`);
});
