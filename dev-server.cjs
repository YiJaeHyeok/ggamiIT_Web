// 로컬 검증용. 배포 파일에는 포함하지 않습니다.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('./api/inquiries');
const root = __dirname;
const port = Number(process.env.PORT || 4178);
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/inquiries') return handler(req, res);
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end(); }
    const types={'.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
    res.setHeader('Content-Type', types[path.extname(file)] || 'text/html; charset=utf-8');
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('까미 preview: http://localhost:' + port));
