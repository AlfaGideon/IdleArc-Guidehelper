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

/**
 * Версионированный путь: /v/<сборка>/src/... отдаётся как /src/...
 * Благодаря этому каждый релиз получает НОВЫЕ адреса модулей: браузер и любые прокси
 * не могут отдать смесь старых и новых файлов (это ломало запуск приложения).
 * Query-строки (?v=) намеренно не используем — они ненадёжны за прокси.
 */
const VERSIONED = /^\/v\/[^/]+(\/.*)?$/;

function stripVersion(urlPath) {
  const m = urlPath.match(VERSIONED);
  if (!m) return urlPath;
  return m[1] || '/';
}

/** index.html отдаётся с подстановкой версионированного пути к точке входа. */
function htmlWithVersionedEntry(html) {
  const b = buildId();
  return html
    .replace('src="src/app.js"', `src="v/${b}/src/app.js"`)
    .replace('href="styles/app.css"', `href="v/${b}/styles/app.css"`)
    .replace('href="styles/sideb.css"', `href="v/${b}/styles/sideb.css"`);
}

const ART_DIR = path.join(ROOT, 'assets', 'items');
const json = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE });
  res.end(JSON.stringify(data));
};

/** Сколько игровых иконок уже скачано (0 — приложение рисует предметы само). */
async function artStatus() {
  try {
    const core = await import('./scripts/art-core.mjs');
    return core.artStatus(ART_DIR);
  } catch (e) {
    return { available: false, files: 0, total: 0, error: e.message };
  }
}

/** Скачивание игровых иконок по кнопке в интерфейсе (нужен интернет у этой машины). */
async function artFetch(res) {
  try {
    const core = await import('./scripts/art-core.mjs');
    const { url, data } = await core.fetchCodex();
    console.log(`[art] данные Item Codex: ${url}`);
    const result = await core.downloadArt(data, ART_DIR, { concurrency: 8 });
    console.log(`[art] скачано иконок: ${result.files} из ${result.total}, ошибок: ${result.failed}`);
    json(res, 200, { ok: result.files > 0, ...result, failedNames: result.failedNames.slice(0, 20) });
  } catch (e) {
    console.log(`[art] ошибка загрузки: ${e.message}`);
    json(res, 502, { ok: false, error: e.message, hint: 'Сервер не смог выйти в интернет (например, в превью внешние адреса закрыты или провайдер блокирует источник). Сейчас картинки попробует скачать ваш браузер — у него доступ обычно есть.' });
  }
}

/**
 * Приём игровых иконок из браузера пользователя: у его машины интернет есть, у сервера может
 * не быть. Браузер скачивает картинки с CDN игры и отправляет их сюда, а сервер кладёт их
 * в assets/items — после этого приложение показывает настоящие игровые иконки офлайн.
 * Тело: { files: { 'torch.webp': '<base64>', … }, meta?: {...} }
 */
function readBody(req, limitBytes = 24 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) { reject(new Error('слишком большой запрос')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function artUpload(req, res, urlPath) {
  const dryRun = urlPath.includes('dry=1');
  try {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    const files = body.files || {};
    const names = Object.keys(files);
    if (!names.length) return json(res, 400, { ok: false, error: 'в запросе нет файлов' });

    const saved = [];
    const skipped = [];
    for (const name of names) {
      // Защита от подмены пути: принимаем только простые имена .webp из Item Codex.
      if (!/^[a-z0-9][a-z0-9._-]*\.webp$/i.test(name)) { skipped.push(name); continue; }
      const buf = Buffer.from(String(files[name]), 'base64');
      if (buf.length < 200 || buf.length > 400 * 1024) { skipped.push(name); continue; }
      saved.push({ name, bytes: buf.length, buf });
    }
    if (!dryRun) {
      fs.mkdirSync(ART_DIR, { recursive: true });
      for (const f of saved) fs.writeFileSync(path.join(ART_DIR, f.name), f.buf);
      if (body.meta && body.meta.index) {
        const indexFile = path.join(ART_DIR, 'index.json');
        let prev = { meta: {}, index: {} };
        try { prev = JSON.parse(fs.readFileSync(indexFile, 'utf8')); } catch { /* первый раз */ }
        const meta = {
          source: 'idlearc.com (Item Codex → Appearance)',
          fetchedAt: new Date().toISOString(),
          files: Object.keys({ ...prev.index, ...body.meta.index }).length,
          total: body.meta.total || Object.keys(body.meta.index).length,
          via: 'браузер пользователя',
        };
        fs.writeFileSync(indexFile, JSON.stringify({ meta, index: body.meta.index }, null, 1), 'utf8');
      }
    }
    console.log(`[art] принято из браузера: ${saved.length}${dryRun ? ' (проверка)' : ''}, пропущено: ${skipped.length}`);
    json(res, 200, { ok: saved.length > 0, saved: saved.map((f) => f.name), skipped, dryRun });
  } catch (e) {
    json(res, 400, { ok: false, error: e.message });
  }
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].split('#')[0];

  // Метка сборки для клиента: если она не совпадает с DATA_META.build, интерфейс покажет кнопку обновления.
  if (urlPath === '/api/build') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE });
    return res.end(JSON.stringify({ build: buildId() }));
  }

  // Игровые иконки предметов: статус и загрузка в проект (assets/items).
  if (urlPath === '/api/art/status' && req.method === 'GET') {
    artStatus().then((st) => json(res, 200, st)).catch((e) => json(res, 500, { error: e.message }));
    return;
  }
  if (urlPath === '/api/art/fetch' && req.method === 'POST') {
    artFetch(res);
    return;
  }
  // Иконки, скачанные браузером пользователя (когда у сервера нет интернета).
  if (urlPath === '/api/art/upload' && req.method === 'POST') {
    artUpload(req, res, req.url);
    return;
  }

  let filePath = safePath(stripVersion(urlPath === '/' ? '/index.html' : urlPath));
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
          res.end(htmlWithVersionedEntry(html.toString('utf8')));
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const isHtml = ext === '.html';
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'X-Build': buildId(),
        ...NO_STORE,
      });
      res.end(isHtml ? htmlWithVersionedEntry(data.toString('utf8')) : data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`IdleArc Guide Helper запущен: http://${HOST}:${PORT} · сборка ${buildId()}`);
});
