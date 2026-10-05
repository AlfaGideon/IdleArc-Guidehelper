#!/usr/bin/env node
/**
 * Локальный запуск IdleArc — этим файлом пользуется start.bat на Windows
 * (на Linux/macOS тоже работает: node scripts/serve.mjs).
 *
 * По умолчанию запускается ХАБ (hub/hub-server.js, порт 8080) — «двухсторонняя»
 * оболочка: сторона A — Guide Helper (/arc/), сторона B — Companion (/companion/).
 * Режим --arc запускает только классический Guide Helper (server.js, порт 5173).
 *
 * Что делает по шагам:
 *  1) проверяет версию Node.js (нужна 18+);
 *  2) выбирает порт (8080 для хаба / 5173 для --arc), занят — следующий свободный;
 *  3) если на порту уже работает этот же режим — второй сервер не поднимается,
 *     просто открывается браузер (двойной клик по start.bat не создаёт копию);
 *  4) поднимает сервер и дожидается реальной готовности (опрос /api/build),
 *     поэтому браузер открывается на уже работающее приложение;
 *  5) печатает адрес и открывает приложение в браузере по умолчанию;
 *  6) остановка — Ctrl+C в этом же окне (или просто закрыть окно).
 *
 * Запуск:  node scripts/serve.mjs [--arc] [порт] [--port N] [--no-open] [--lan]
 *   --arc           только Guide Helper без хаба (server.js, по умолчанию 5173)
 *   [порт], --port N — порт (по умолчанию 8080, в режиме --arc — 5173;
 *                      не занят — берётся он)
 *   --no-open        — не открывать браузер
 *   --lan            — разрешить доступ по локальной сети (0.0.0.0);
 *                      по умолчанию сервер слушает только 127.0.0.1 (без запроса файрвола)
 *
 * Коды выхода: 0 — сервер работает или уже работал; 2 — старый Node.js;
 *              3 — не нашлось свободного порта; 4 — сервер не поднялся.
 */
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PORT = 5173;      // режим --arc (классический server.js)
const DEFAULT_HUB_PORT = 8080;  // режим по умолчанию (хаб «две стороны»)
const PORT_TRIES = 25; // сколько портов подряд проверять, если порт занят
const READY_TIMEOUT_MS = 20000; // сколько ждать, пока сервер начнёт отвечать
const MIN_NODE_MAJOR = 18;

const say = (line = '') => console.log(line);
const warn = (line) => console.error(line);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Разбор аргументов командной строки. */
function readArgs(list) {
  const out = { port: 0, open: true, lan: false, help: false, hub: true };
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (a === '--no-open') out.open = false;
    else if (a === '--open') out.open = true;
    else if (a === '--lan') out.lan = true;
    else if (a === '--arc') out.hub = false;
    else if (a === '--hub') out.hub = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--port' || a === '-p') { out.port = Number(list[i + 1]) || 0; i += 1; }
    else if (a.startsWith('--port=')) out.port = Number(a.slice('--port='.length)) || 0;
    else if (/^\d+$/.test(a)) out.port = Number(a);
  }
  return out;
}

/**
 * Спрашивает у порта /api/build. Возвращает { build }, только если на порту работает
 * именно нужный режим: хаб помечает ответ флагом hub:true, классический server.js — нет.
 * Так лаунчер не спутает хаб со старым окном start.bat на соседнем порту.
 */
function probe(port, wantHub, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/build', timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data || !data.build) return resolve(null);
          if ((data.hub === true) !== wantHub) return resolve(null);
          resolve({ build: String(data.build) });
        } catch { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

/** Свободен ли порт для привязки на нужном адресе. */
function isPortFree(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen({ port, host, exclusive: true });
  });
}

/** Ищет порт для запуска: чужой сервер пропускаем, свой (в этом же режиме) — используем как есть. */
async function choosePort(startPort, host, wantHub) {
  for (let i = 0; i < PORT_TRIES; i += 1) {
    const port = startPort + i;
    if (port > 65535) break;
    const existing = await probe(port, wantHub);
    if (existing) return { port, existing };
    if (await isPortFree(port, host)) return { port, existing: null };
  }
  return null;
}

/** Ждёт, пока сервер начнёт отвечать на /api/build. */
async function waitForReady(port, wantHub) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const info = await probe(port, wantHub);
    if (info) return info;
    await delay(250);
  }
  return null;
}

/** Открывает адрес в браузере по умолчанию. Ошибку не считаем фатальной. */
function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => warn(`  Браузер открыть не удалось — откройте адрес вручную: ${url}`));
    child.unref();
    return true;
  } catch {
    warn(`  Браузер открыть не удалось — откройте адрес вручную: ${url}`);
    return false;
  }
}

function printHelp() {
  say('Локальный запуск IdleArc.');
  say('');
  say('  node scripts/serve.mjs [--arc] [порт] [--port N] [--no-open] [--lan]');
  say('');
  say('  (по умолчанию запускается ХАБ: Guide Helper + Companion в одной оболочке)');
  say('');
  say('  --arc     запустить только Guide Helper без хаба (server.js, порт по умолчанию 5173)');
  say('  порт      порт для сервера (по умолчанию 8080; занят — берётся следующий свободный)');
  say('  --no-open не открывать браузер');
  say('  --lan     разрешить доступ по локальной сети, по умолчанию только этот компьютер');
  say('');
  say('Остановить сервер: Ctrl+C в этом окне или просто закрыть окно.');
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return 0; }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < MIN_NODE_MAJOR) {
    warn('');
    warn(`  [!] Нужен Node.js ${MIN_NODE_MAJOR} или новее, а сейчас запущен Node ${process.version}.`);
    warn('      Скачайте свежую LTS-версию: https://nodejs.org/');
    return 2;
  }

  const wantHub = args.hub;
  const target = wantHub ? path.join(ROOT, 'hub', 'hub-server.js') : path.join(ROOT, 'server.js');
  const modeName = wantHub ? 'хаб' : 'приложение';

  const host = args.lan ? '0.0.0.0' : '127.0.0.1';
  const startPort = args.port || Number(process.env.PORT) || (wantHub ? DEFAULT_HUB_PORT : DEFAULT_PORT);

  const choice = await choosePort(startPort, host, wantHub);
  if (!choice) {
    warn(`  [!] Не нашлось свободного порта в диапазоне ${startPort}–${startPort + PORT_TRIES - 1}.`);
    warn('      Закройте программы, занявшие эти порты, или укажите другой: start.bat 8090');
    return 3;
  }

  const url = `http://127.0.0.1:${choice.port}/`;

  // На порту уже работает этот же режим — второй сервер не нужен.
  if (choice.existing) {
    say(`  Уже запущено: ${url}  (сборка ${choice.existing.build}, ${modeName})`);
    say('  Второй сервер не нужен — просто открываю браузер.');
    if (args.open) openBrowser(url);
    return 0;
  }

  if (choice.port !== startPort) {
    say(`  Порт ${startPort} занят — запускаю на порту ${choice.port}.`);
    say('');
  }

  process.env.PORT = String(choice.port);
  process.env.HOST = host;

  say(`  Запускаю ${modeName} на ${url} …`);
  try {
    await import(pathToFileURL(target).href);
  } catch (e) {
    warn(`  [!] Не удалось запустить сервер: ${e.message}`);
    return 4;
  }

  const info = await waitForReady(choice.port, wantHub);
  if (!info) {
    warn(`  [!] Сервер не ответил за ${Math.round(READY_TIMEOUT_MS / 1000)} с.`);
    warn('      Запустите ещё раз; если повторяется — напишите, что видно в этом окне.');
    return 4;
  }

  say('');
  say(`  Готово. Открыто по адресу: ${url}`);
  say(`  Сборка: ${info.build}${args.lan ? ' · доступ по локальной сети включён' : ''}`);
  if (wantHub) {
    say('  Стороны хаба: Guide Helper — /arc/, Companion — /companion/ (клик по логотипу их переворачивает).');
    say('  Нужен только классический Guide Helper — запустите: start.bat arc');
  }
  say('  Остановить сервер: Ctrl+C в этом окне (или просто закройте окно).');
  say('');

  if (args.open) openBrowser(url);
  return 0;
}

process.on('SIGINT', () => {
  say('');
  say('  Сервер остановлен.');
  process.exit(0);
});

process.exitCode = await main();
