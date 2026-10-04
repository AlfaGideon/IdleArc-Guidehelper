#!/usr/bin/env node
/**
 * Локальный запуск IdleArc Guide Helper — этим файлом пользуется start.bat на Windows
 * (на Linux/macOS тоже работает: node scripts/serve.mjs).
 *
 * Что делает по шагам:
 *  1) проверяет версию Node.js (нужна 18+);
 *  2) выбирает порт: 5173, а если он занят — следующий свободный;
 *  3) если на порту уже работает это приложение — второй сервер не поднимается,
 *     просто открывается браузер (двойной клик по start.bat больше не создаёт копию);
 *  4) поднимает server.js и дожидается реальной готовности (опрос /api/build),
 *     поэтому браузер открывается на уже работающее приложение, а не на «не удаётся
 *     подключиться»;
 *  5) печатает адрес и открывает приложение в браузере по умолчанию;
 *  6) остановка — Ctrl+C в этом же окне (или просто закрыть окно).
 *
 * Запуск:  node scripts/serve.mjs [порт] [--port N] [--no-open] [--lan]
 *   [порт], --port N — порт (по умолчанию 5173; не занят — берётся он)
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
const DEFAULT_PORT = 5173;
const PORT_TRIES = 25; // сколько портов подряд проверять, если порт занят
const READY_TIMEOUT_MS = 20000; // сколько ждать, пока сервер начнёт отвечать
const MIN_NODE_MAJOR = 18;

const say = (line = '') => console.log(line);
const warn = (line) => console.error(line);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Разбор аргументов командной строки. */
function readArgs(list) {
  const out = { port: 0, open: true, lan: false, help: false };
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (a === '--no-open') out.open = false;
    else if (a === '--open') out.open = true;
    else if (a === '--lan') out.lan = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--port' || a === '-p') { out.port = Number(list[i + 1]) || 0; i += 1; }
    else if (a.startsWith('--port=')) out.port = Number(a.slice('--port='.length)) || 0;
    else if (/^\d+$/.test(a)) out.port = Number(a);
  }
  return out;
}

/**
 * Спрашивает у порта /api/build. Возвращает { build } только если на порту
 * действительно это приложение (у любого чужого сервера ответа не будет).
 */
function probe(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/build', timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data && data.build ? { build: String(data.build) } : null);
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

/** Ищет порт для запуска: чужой сервер пропускаем, свой — используем как есть. */
async function choosePort(startPort, host) {
  for (let i = 0; i < PORT_TRIES; i += 1) {
    const port = startPort + i;
    if (port > 65535) break;
    const existing = await probe(port);
    if (existing) return { port, existing };
    if (await isPortFree(port, host)) return { port, existing: null };
  }
  return null;
}

/** Ждёт, пока сервер начнёт отвечать на /api/build. */
async function waitForReady(port) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const info = await probe(port);
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
  say('Локальный запуск IdleArc Guide Helper.');
  say('');
  say('  node scripts/serve.mjs [порт] [--port N] [--no-open] [--lan]');
  say('');
  say('  порт      порт для сервера (по умолчанию 5173, занят — берётся следующий свободный)');
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

  const host = args.lan ? '0.0.0.0' : '127.0.0.1';
  const startPort = args.port || Number(process.env.PORT) || DEFAULT_PORT;

  const choice = await choosePort(startPort, host);
  if (!choice) {
    warn(`  [!] Не нашлось свободного порта в диапазоне ${startPort}–${startPort + PORT_TRIES - 1}.`);
    warn('      Закройте программы, занявшие эти порты, или укажите другой: start.bat 8080');
    return 3;
  }

  const url = `http://127.0.0.1:${choice.port}/`;

  // На порту уже работает это приложение — второй сервер не нужен.
  if (choice.existing) {
    say(`  Приложение уже запущено: ${url}  (сборка ${choice.existing.build})`);
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

  say(`  Запускаю сервер на ${url} …`);
  try {
    await import(pathToFileURL(path.join(ROOT, 'server.js')).href);
  } catch (e) {
    warn(`  [!] Не удалось запустить сервер: ${e.message}`);
    return 4;
  }

  const info = await waitForReady(choice.port);
  if (!info) {
    warn(`  [!] Сервер не ответил за ${Math.round(READY_TIMEOUT_MS / 1000)} с.`);
    warn('      Запустите ещё раз; если повторяется — напишите, что видно в этом окне.');
    return 4;
  }

  say('');
  say(`  Готово. Приложение открыто по адресу: ${url}`);
  say(`  Сборка: ${info.build}${args.lan ? ' · доступ по локальной сети включён' : ''}`);
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
