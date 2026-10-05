/**
 * Сервер-хаб IdleArc.
 *
 *  /            → оболочка с флип-логотипом (две стороны «монеты»)
 *  /companion/* → полная копия idlearc-companion-web (статика, офлайн)
 *  /arc/*       → сам Guide Helper (корень репозитория): проксируется на его
 *                 server.js, поэтому живут /api/build и /api/art/*
 *  /api/*       → тоже проксируется на сторону A (старое приложение дёргает
 *                 относительные адреса вида «api/...», и за счёт этого они
 *                 продолжают работать и из-под хаба, и напрямую);
 *                 исключение — /api/build: его хаб отдаёт сам, чтобы лаунчер
 *                 (scripts/serve.mjs) видел готовность именно хаба.
 *
 * Запуск:  node hub/hub-server.js                  (порт из PORT, по умолчанию 8080)
 *          HOST=0.0.0.0 node hub/hub-server.js     (доступ по локальной сети)
 *
 * Устойчивость:
 *  - порт хаба занят — берётся следующий свободный (до PORT_TRIES попыток);
 *  - порт 5173 уже занят НАШИМ server.js (например, открыто старое окно
 *    start.bat) — хаб не плодит копию, а проксирует на уже работающий сервер;
 *  - порт 5173 занят ЧУЖОЙ программой — сторона A поднимается на следующем
 *    свободном порту, хаб продолжает работать;
 *  - сторона A упала (закрыли то самое старое окно) — хаб сам перезапускает
 *    её при следующем обращении к /arc/* или /api/*.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const ROOT = __dirname;                 // папка hub/
const ARC_ROOT = path.join(ROOT, '..'); // корень репозитория = сторона A
const PORT_START = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1'; // локально — без запроса файрвола
const ARC_PORT_START = Number(process.env.ARC_PORT || 5173);
const PORT_TRIES = 25; // сколько портов подряд проверять, если порт занят

let shuttingDown = false;
process.on('exit', () => { shuttingDown = true; killArc(); });
process.on('SIGTERM', () => { shuttingDown = true; killArc(); process.exit(0); });
process.on('SIGINT', () => { shuttingDown = true; killArc(); process.exit(0); });

/** Метка сборки стороны A: тот же источник, что и у server.js. */
function buildId() {
  try {
    const src = fs.readFileSync(path.join(ARC_ROOT, 'src', 'data', 'systems.js'), 'utf8');
    const m = src.match(/build:\s*'([^']+)'/);
    return m ? m[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Спрашивает у порта /api/build: есть ответ с build — значит, это наш сервер. */
function probeArc(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/build', timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data && data.build ? data : null);
        } catch { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

/** Свободен ли порт для привязки на loopback. */
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen({ port, host: '127.0.0.1', exclusive: true });
  });
}

/* ---- сторона A: выбор порта и управление дочерним процессом ---- */

const arc = { port: 0, external: false, child: null };

/**
 * Выбирает порт для стороны A:
 *  - на порту уже отвечает наш server.js → переиспользуем его (external);
 *  - порт свободен → поднимем туда свой дочерний процесс;
 *  - порт занят чужой программой → пробуем следующий.
 */
async function pickArcPort(startPort) {
  for (let i = 0; i < PORT_TRIES; i += 1) {
    const port = startPort + i;
    if (port > 65535) break;
    const existing = await probeArc(port);
    if (existing) return { port, external: true };
    if (await isPortFree(port)) return { port, external: false };
  }
  return null;
}

/** Поднимает server.js стороны A как дочерний процесс (на arc.port). */
function startArcChild() {
  if (arc.child || arc.external || !arc.port || shuttingDown) return;
  const child = spawn(process.execPath, [path.join(ARC_ROOT, 'server.js')], {
    cwd: ARC_ROOT,
    env: { ...process.env, PORT: String(arc.port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  arc.child = child;
  child.on('exit', (code) => {
    if (arc.child === child) arc.child = null;
    if (!shuttingDown) {
      console.log(`[hub] сторона A остановилась (код ${code}) — перезапущу её при обращении`);
    }
  });
  child.on('error', (e) => {
    if (arc.child === child) arc.child = null;
    console.log(`[hub] не удалось запустить сторону A: ${e.message}`);
  });
}

function killArc() {
  if (arc.child) { try { arc.child.kill(); } catch { /* уже завершился */ } }
}

/* ---- статика и прокси ---- */

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
  if (!arc.port) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Сторона A не настроена: не нашлось свободного порта для server.js.');
  }
  const target = req.url.replace(/^\/arc/, '') || '/';
  const upstream = http.request(
    { host: '127.0.0.1', port: arc.port, path: target, method: req.method, headers: req.headers },
    (up) => {
      const headers = { ...up.headers };
      delete headers['content-security-policy'];
      delete headers['x-frame-options'];
      res.writeHead(up.statusCode || 502, headers);
      up.pipe(res);
    }
  );
  upstream.on('error', () => {
    // Сторона A не отвечает: если она была внешней (старое окно start.bat) и умерла —
    // переходим на собственный дочерний процесс; если свой процесс упал — перезапускаем.
    if (arc.external) {
      console.log(`[hub] внешняя сторона A на :${arc.port} перестала отвечать — поднимаю свою`);
      arc.external = false;
    }
    startArcChild();
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сторона A перезапускается… обнови страницу через пару секунд.');
  });
  req.pipe(upstream);
}

/* ---- сервер хаба с подбором свободного порта ---- */

function createHubServer() {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

    // Метка сборки самого хаба: по ней scripts/serve.mjs ждёт готовности и
    // понимает, что на порту уже работает именно хаб (второй не нужен).
    if (urlPath === '/api/build') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ build: buildId(), hub: true }));
    }

    if (urlPath === '/arc') { res.writeHead(302, { Location: '/arc/' }); return res.end(); }
    if (urlPath.startsWith('/arc/') || urlPath.startsWith('/api/')) return proxyToArc(req, res);

    let rel = urlPath === '/' ? '/index.html' : urlPath;
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }
    sendFile(res, file);
  });
}

function listenWithFallback(server, startPort, host) {
  let port = startPort;
  const tryListen = () => {
    server.once('error', (e) => {
      if (e.code === 'EADDRINUSE' && port < startPort + PORT_TRIES - 1) {
        port += 1;
        tryListen();
      } else {
        console.error(`[hub] не удалось занять порт: ${e.message}`);
        process.exitCode = 4;
      }
    });
    server.listen(port, host, () => {
      const arcNote = arc.external
        ? `сторона A — уже работающий сервер на 127.0.0.1:${arc.port} (переиспользую)`
        : `сторона A — дочерний процесс на 127.0.0.1:${arc.port}`;
      console.log(`IdleArc Hub: http://${host}:${port}  (${arcNote})`);
    });
  };
  tryListen();
}

(async () => {
  const picked = await pickArcPort(ARC_PORT_START);
  if (picked) {
    arc.port = picked.port;
    arc.external = picked.external;
    if (arc.external) {
      console.log(`[hub] порт ${arc.port}: уже работает наш Guide Helper — второй не нужен, проксирую на него`);
    } else {
      if (arc.port !== ARC_PORT_START) {
        console.log(`[hub] порт ${ARC_PORT_START} занят чужой программой — сторона A поднимется на :${arc.port}`);
      }
      startArcChild();
    }
  } else {
    console.error(`[hub] не нашлось порта для стороны A в диапазоне ${ARC_PORT_START}–${ARC_PORT_START + PORT_TRIES - 1}`);
  }

  listenWithFallback(createHubServer(), PORT_START, HOST);
})();
