#!/usr/bin/env node
/**
 * HTTP-тест (интеграционный): обходит граф модулей так, как это делает браузер,
 * и проверяет, что сервер отдаёт их с версионированных путей и правильным MIME.
 *
 * Запуск: node server.js &  затем  node tests/http.mjs
 * Порт берётся из PORT (по умолчанию 5173). Без сети и зависимостей.
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 5173);
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (name) => console.log(`  ok  ${name}`);
const fail = (name, msg) => { failures++; console.error(` FAIL ${name}: ${msg}`); };

function get(path, { redirect = true } = {}) {
  const target = BASE + (path.startsWith('/') ? path : '/' + path);
  return new Promise((resolve, reject) => {
    const req = http.get(target, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    void redirect;
  });
}

const SPECIFIER = /(?:^|\n)\s*(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const resolveUrl = (from, spec) => new URL(spec, new URL(from, BASE)).pathname;

/* 1. HTML: точка входа должна быть версионированной */
let entry = null;
try {
  const page = await get('/');
  if (page.status !== 200) throw new Error(`статус ${page.status}`);
  const m = page.body.match(/<script type="module" src="([^"]+)"><\/script>/);
  if (!m) throw new Error('не найден module-скрипт точки входа');
  entry = m[1];
  if (!/^v\/[^/]+\/src\/app\.js$/.test(entry)) throw new Error(`точка входа не версионирована: ${entry}`);
  if (!page.headers['cache-control']?.includes('no-store')) throw new Error('нет Cache-Control: no-store');
  if (!page.body.includes('boot-error')) throw new Error('нет страховочного блока boot-error');
  ok(`HTML отдаётся, точка входа версионирована: ${entry}`);
} catch (e) { fail('HTML', e.message); }

/* 2. Обход графа модулей от точки входа */
if (entry) {
  const seen = new Set();
  const queue = [entry];
  const bad = [];
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    let res;
    try { res = await get(url); } catch (e) { bad.push(`${url}: ${e.message}`); continue; }
    if (res.status !== 200) { bad.push(`${url}: статус ${res.status}`); continue; }
    if (!/javascript/.test(res.type)) { bad.push(`${url}: MIME ${res.type}`); continue; }
    if (res.body.trimStart().startsWith('<')) { bad.push(`${url}: отдаётся HTML вместо JS`); continue; }
    for (const m of res.body.matchAll(SPECIFIER)) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith('.')) continue; // внешних зависимостей нет по определению
      queue.push(resolveUrl(url, spec));
    }
  }
  if (bad.length) fail('граф модулей', bad.slice(0, 5).join(' | '));
  else ok(`граф модулей: ${seen.size} файлов отдаются как JS (200, application/javascript)`);
}

/* 3. Метка сборки и статические ресурсы */
try {
  const api = await get('/api/build');
  const info = JSON.parse(api.body);
  const page = await get('/');
  const meta = page.body.match(/<meta name="build" content="([^"]+)"/)?.[1];
  if (!info.build) throw new Error('нет метки сборки в /api/build');
  if (meta !== info.build) throw new Error(`meta ${meta} != api ${info.build}`);
  const css = await get(`/v/${info.build}/styles/app.css`);
  if (css.status !== 200 || !/css/.test(css.type)) throw new Error(`CSS не отдался: ${css.status} ${css.type}`);
  ok(`/api/build = ${info.build}, CSS версионируется, meta совпадает`);
} catch (e) { fail('метка сборки / CSS', e.message); }

/* 4. Старые пути всё ещё должны работать (для статического хостинга и прямых ссылок) */
try {
  const app = await get('/src/app.js');
  if (app.status !== 200 || !/javascript/.test(app.type)) throw new Error(`/src/app.js → ${app.status} ${app.type}`);
  ok('прямой путь /src/app.js тоже работает');
} catch (e) { fail('прямой путь', e.message); }

console.log(failures ? `\n${failures} проверок провалено` : '\nHTTP-проверки пройдены ✓');
process.exit(failures ? 1 : 0);
