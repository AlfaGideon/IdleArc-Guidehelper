#!/usr/bin/env node
/**
 * Простой статический сервер без зависимостей.
 * Запуск: node server.js   (порт из PORT, по умолчанию 5173)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** Метка сборки: берётся из src/data/systems.js, чтобы сервер и клиент сверяли одно и то же. */
function buildId() {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'systems.js'), 'utf8');
    const m = src.match(/build:\s*'([^']+)'/);
    return m ? m[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const target = path.normalize(path.join(ROOT, decoded));
  if (!target.startsWith(ROOT)) return null;
  return target;
}

const server = http.createServer((req, res) => {
  // Метка сборки для клиента: если она не совпадает с DATA_META.build, интерфейс покажет кнопку обновления.
  if (req.url.split('?')[0] === '/api/build') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE });
    return res.end(JSON.stringify({ build: buildId() }));
  }

  let filePath = safePath(req.url === '/' ? '/index.html' : req.url);
  if (!filePath) {
    res.writeHead(403, NO_STORE);
    return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        // SPA-фолбэк
        fs.readFile(path.join(ROOT, 'index.html'), (e2, html) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE });
            return res.end('404 Not Found');
          }
          res.writeHead(200, { 'Content-Type': MIME['.html'], ...NO_STORE });
          res.end(html);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'X-Build': buildId(),
        ...NO_STORE,
      });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`IdleArc Guide Helper запущен: http://${HOST}:${PORT} · сборка ${buildId()}`);
});
