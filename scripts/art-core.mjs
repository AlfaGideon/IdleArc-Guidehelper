/**
 * Общая логика загрузки игровых иконок предметов.
 *
 * Используется двумя сторонами:
 *  • scripts/fetch-art.mjs — разовая загрузка в репозиторий (там, где есть интернет);
 *  • server.js (маршрут POST /api/art/fetch) — кнопка «Скачать игровые картинки» в интерфейсе:
 *    сервер сам скачивает иконки в папку assets/items и приложение начинает показывать
 *    настоящие игровые картинки вместо нарисованных.
 *
 * Источник данных — официальный Item Codex (data/item_codex_data.json): в нём перечислены
 * имена иконок по тирам и рангам просыпания. Сами картинки — с CDN игры.
 */
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';

// На Windows с Node 18+ fetch часто падает с «fetch failed», когда DNS отдаёт IPv6-адрес,
// а IPv6-маршрута у машины нет. Просим Node сначала пробовать IPv4.
try { dns.setDefaultResultOrder('ipv4first'); } catch { /* старый Node — не критично */ }

// Некоторые CDN (Cloudflare) отвечают 403 на запросы без браузерных заголовков.
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Accept: 'application/json,image/webp,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Понятный текст ошибки fetch: сам fetch пишет только «fetch failed», причина — внутри cause. */
const fetchErrorText = (e) => {
  const cause = e && e.cause ? ` (${e.cause.code || e.cause.message || e.cause})` : '';
  return `${e.message}${cause}`;
};

export const CODEX_URLS = [
  'https://idlearc-companion-web-production.up.railway.app/data/item_codex_data.json',
  'https://idlearc.com/data/item_codex_data.json',
];

export const IMAGE_BASES = [
  // Item Codex указывает пути вида static/images/items/<имя>.webp на хосте компаньона —
  // этот источник первый. idlearc.com оставлен как запасной (на нём бывает 403/404).
  'https://idlearc-companion-web-production.up.railway.app/static/images/items/',
  'https://idlearc-companion-web-production.up.railway.app/assets/items/',
  'https://idlearc.com/static/images/items/',
];

const basename = (p) => String(p).split('/').pop();

export async function fetchCodex(timeoutMs = 20000) {
  const errors = [];
  for (const url of CODEX_URLS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: BROWSER_HEADERS });
        clearTimeout(timer);
        if (!res.ok) { errors.push(`${url}: HTTP ${res.status}`); break; } // не сетевая ошибка — повтор не поможет
        return { url, data: await res.json() };
      } catch (e) {
        if (attempt === 2) errors.push(`${url}: ${fetchErrorText(e)}`);
      }
    }
  }
  throw new Error(`не удалось получить Item Codex (${errors.join('; ')})`);
}

/** Все имена иконок из item_variants (тиры + просыпания). */
export function collectImages(codex) {
  const out = new Set();
  for (const v of Object.values(codex.item_variants || {})) {
    for (const t of Object.values(v.tiers || {})) if (t && t.image) out.add(basename(t.image));
    for (const a of Object.values(v.awakens || {})) if (a && a.image) out.add(basename(a.image));
  }
  return [...out].sort();
}

/** Карта «семейство → иконки по тирам и просыпаниям» (для index.json и интерфейса). */
export function buildIndex(codex) {
  const index = {};
  for (const [name, v] of Object.entries(codex.item_variants || {})) {
    const tiers = {};
    for (const [t, meta] of Object.entries(v.tiers || {})) if (meta && meta.image) tiers[t] = basename(meta.image);
    const awakens = {};
    for (const [r, meta] of Object.entries(v.awakens || {})) if (meta && meta.image) awakens[r] = basename(meta.image);
    index[name] = { tiers, awakens };
  }
  return index;
}

async function downloadOne(name, timeoutMs) {
  for (const base of IMAGE_BASES) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(base + name, { redirect: 'follow', signal: ctrl.signal, headers: BROWSER_HEADERS });
        clearTimeout(timer);
        if (!res.ok) break; // 403/404 — пробуем следующий источник, повторять смысла нет
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 200) break;
        return buf;
      } catch { /* сетевая ошибка — вторая попытка, потом следующий источник */ }
    }
  }
  return null;
}

/**
 * Скачать все иконки в каталог dir и записать туда index.json.
 * Уже скачанные файлы не перекачиваются.
 */
export async function downloadArt(codex, dir, { concurrency = 8, timeoutMs = 15000, log = () => {} } = {}) {
  const names = collectImages(codex);
  fs.mkdirSync(dir, { recursive: true });
  let ok = 0;
  const failed = [];
  const queue = [...names];
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
    for (;;) {
      const name = queue.shift();
      if (!name) return;
      const dest = path.join(dir, name);
      try {
        if (fs.existsSync(dest) && fs.statSync(dest).size > 200) { ok += 1; continue; }
      } catch { /* перекачаем */ }
      const buf = await downloadOne(name, timeoutMs);
      if (buf) { fs.writeFileSync(dest, buf); ok += 1; log(name); } else failed.push(name);
    }
  });
  await Promise.all(workers);

  const index = buildIndex(codex);
  const meta = {
    source: 'idlearc.com (Item Codex → Appearance)',
    fetchedAt: new Date().toISOString(),
    files: ok,
    total: names.length,
    failed: failed.length,
  };
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ meta, index }, null, 1), 'utf8');
  return { ...meta, failedNames: failed };
}

/** Что уже лежит в каталоге (для /api/art/status). */
export function artStatus(dir) {
  const indexFile = path.join(dir, 'index.json');
  if (!fs.existsSync(indexFile)) return { available: false, files: 0, total: 0 };
  try {
    const parsed = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).length;
    return {
      available: files > 0,
      files,
      total: parsed.meta ? parsed.meta.total : files,
      fetchedAt: parsed.meta ? parsed.meta.fetchedAt : null,
      source: parsed.meta ? parsed.meta.source : null,
      index: parsed.index || {},
    };
  } catch (e) {
    return { available: false, files: 0, total: 0, error: e.message };
  }
}
