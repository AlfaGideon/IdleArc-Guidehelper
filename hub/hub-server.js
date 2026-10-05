/**
 * Сервер-хаб IdleArc.
 *
 *  /            → оболочка с флип-логотипом (две стороны «монеты»)
 *  /companion/* → полная копия idlearc-companion-web (статика, офлайн)
 *  /arc/*       → сам Guide Helper (корень репозитория): проксируется на его
 *                 server.js, поэтому живут /api/build и /api/art/*
 *
 * Запуск: node hub/hub-server.js   (порт из PORT, по умолчанию 8080)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = __dirname;              // папка hub/
const ARC_ROOT = path.join(ROOT, '..'); // корень репозитория = сторона A
const PORT = Number(process.env.PORT || 8080);
const ARC_PORT = Number(process.env.ARC_PORT || 5173);

/* ---- поднимаем арк-сервер как дочерний процесс ---- */
const arc = spawn(process.execPath, ['server.js'], {
  cwd: ARC_ROOT,
  env: { ...process.env, PORT: String(ARC_PORT), HOST: '127.0.0.1' },
  stdio: ['ignore', 'inherit', 'inherit'],
});
process.on('exit', () => { try { arc.kill(); } catch {} });
process.on('SIGTERM', () => { try { arc.kill(); } catch {} process.exit(0); });
process.on('SIGINT', () => { try { arc.kill(); } catch {} process.exit(0); });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
}

function proxyToArc(req, res) {
  const target = req.url.replace(/^\/arc/, '') || '/';
  const upstream = http.request(
    { host: '127.0.0.1', port: ARC_PORT, path: target, method: req.method, headers: req.headers },
    (up) => {
      const headers = { ...up.headers };
      delete headers['content-security-policy'];
      delete headers['x-frame-options'];
      res.writeHead(up.statusCode || 502, headers);
      up.pipe(res);
    }
  );
  upstream.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сторона A ещё поднимается… обнови страницу. ' + e.message);
  });
  req.pipe(upstream);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/arc' ) { res.writeHead(302, { Location: '/arc/' }); return res.end(); }
  if (urlPath.startsWith('/arc/')) return proxyToArc(req, res);

  let rel = urlPath === '/' ? '/index.html' : urlPath;
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }
  sendFile(res, file);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`IdleArc Hub: http://0.0.0.0:${PORT}  (сторона A проксируется с :${ARC_PORT})`);
});
