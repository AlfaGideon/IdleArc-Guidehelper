/**
 * Картинки предметов: настоящие игровые иконки, если они доступны, иначе — нарисованные.
 *
 * Порядок поиска:
 *  1. `assets/items/index.json` — иконки уже скачаны в проект (кнопка «Скачать игровые
 *     картинки» на локальном сервере или scripts/fetch-art.mjs). Работает офлайн.
 *  2. Item Codex в интернете — тогда картинки берутся прямо с CDN игры по браузеру
 *     (в превью внешние адреса могут быть запрещены — тогда сработает пункт 3).
 *  3. Нарисованная иконка (SVG): предмет всегда узнаваем, даже без интернета.
 *
 * Найденная карта иконок кэшируется в localStorage, чтобы не запрашивать её каждый раз.
 */
import { el } from './dom.js';
import { itemArt, shapeArt } from './itemArt.js';

const CACHE_KEY = 'iac:helper:art:v1';
const LOCAL_INDEX = 'assets/items/index.json';
const CODEX_URLS = [
  'https://idlearc-companion-web-production.up.railway.app/data/item_codex_data.json',
  'https://idlearc.com/data/item_codex_data.json',
];
const CDN_BASE = 'https://idlearc.com/static/images/items/';
const LOCAL_BASE = 'assets/items/';

const basename = (p) => String(p).split('/').pop();

function readCache() {
  try {
    const raw = globalThis.localStorage && globalThis.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.index ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(mode, index, files) {
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(CACHE_KEY, JSON.stringify({ mode, index, files, savedAt: new Date().toISOString() }));
    }
  } catch { /* приватный режим — просто работаем без кэша */ }
}

function indexFromCodex(codex) {
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

/** Состояние картинок для интерфейса. */
export const artState = {
  mode: 'none',      // 'none' | 'local' | 'cdn'
  files: 0,
  total: 0,
  loading: false,
  error: null,
  index: null,
};

let ready = null;

async function tryJson(url, timeoutMs = 12000) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Загрузить карту иконок (один раз за сессию). Возвращает состояние.
 * Никогда не бросает исключение: без интернета просто остаётся режим «нарисованные».
 */
export function loadArt(force = false) {
  if (ready && !force) return ready;
  artState.loading = true;

  ready = (async () => {
    // 1. Локальные иконки, скачанные в проект.
    const local = await tryJson(LOCAL_INDEX, 6000);
    if (local && local.index) {
      artState.mode = 'local';
      artState.index = local.index;
      artState.files = local.meta ? local.meta.files : Object.keys(local.index).length;
      artState.total = local.meta ? local.meta.total : artState.files;
      writeCache('local', local.index, artState.files);
      artState.loading = false;
      return artState;
    }

    // 2. Кэш из localStorage (например, карта была получена из интернета раньше).
    const cached = readCache();
    if (cached) {
      artState.mode = cached.mode === 'cdn' ? 'cdn' : 'cdn';
      artState.index = cached.index;
      artState.files = cached.files || Object.keys(cached.index).length;
      artState.total = Object.keys(cached.index).length;
    }

    // 3. Карта из Item Codex (браузер пользователя; в превью внешние адреса могут быть закрыты).
    for (const url of CODEX_URLS) {
      const codex = await tryJson(url);
      if (codex && codex.item_variants) {
        artState.mode = 'cdn';
        artState.index = indexFromCodex(codex);
        artState.files = Object.keys(artState.index).length;
        artState.total = artState.files;
        writeCache('cdn', artState.index, artState.files);
        artState.loading = false;
        return artState;
      }
    }

    artState.loading = false;
    if (!artState.index) artState.mode = 'none';
    return artState;
  })();

  return ready;
}

/** Адрес иконки предмета для текущего режима (null — если картинки нет). */
export function artSrc(familyName, tier = 1, awaken = 0) {
  const entry = artState.index && artState.index[familyName];
  if (!entry) return null;
  const t = Math.min(6, Math.max(1, Math.round(Number(tier) || 1)));
  const name = (awaken > 0 && entry.awakens && entry.awakens[awaken])
    || (entry.tiers && entry.tiers[t])
    || null;
  if (!name) return null;
  return (artState.mode === 'local' ? LOCAL_BASE : CDN_BASE) + name;
}

/**
 * Узел с картинкой предмета: игровая иконка или нарисованная (SVG), если иконки нет
 * или браузер не смог её загрузить.
 */
export function artNode(family, tier = 1, awaken = 0, opts = {}) {
  const size = opts.size || 64;
  const fallback = () => el('span', { class: 'art-svg', html: family ? itemArt(family, tier) : itemArt(null, tier) });
  const src = opts.forceSvg ? null : artSrc(family && family.name, tier, awaken);
  if (!src) return fallback();
  const img = el('img', {
    class: 'art-img',
    src,
    alt: family ? family.name : 'предмет',
    width: String(size),
    height: String(size),
    loading: 'lazy',
    onerror: () => {
      if (img.parentNode) img.parentNode.replaceChild(fallback(), img);
    },
  });
  return img;
}

/** Иконка закрытой ячейки (слот недоступен классу). */
export const lockedArtNode = (tier = 1) => el('span', { class: 'art-svg', html: shapeArt('lock', tier) });

/* ------------------- загрузка иконок через браузер пользователя ------------------- */
/*
 * У машины пользователя интернет обычно есть, а у сервера приложения — нет. Поэтому
 * браузер сам скачивает картинки предметов с CDN игры и отправляет их на сервер
 * (POST /api/art/upload), а сервер кладёт их в assets/items. После этого иконки
 * раздаются локально и работают офлайн.
 *
 * Обращения к CDN идут напрямую, а если браузер блокирует чтение (CORS) — через
 * открытые CORS-прокси. Прогресс показывается в интерфейсе.
 */

/** Прокси, отдающие содержимое с заголовком CORS (используются только как запасной путь). */
const READ_PROXIES = [
  (url) => url,
  (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

export const artDownload = { active: false, done: 0, total: 0, saved: 0, note: '', error: null };

async function readAsBase64(url, timeoutMs = 20000) {
  for (const wrap of READ_PROXIES) {
    const target = wrap(url);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetch(target, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length < 200 || buf.length > 400 * 1024) continue;
      let bin = '';
      for (let i = 0; i < buf.length; i += 1) bin += String.fromCharCode(buf[i]);
      return globalThis.btoa(bin);
    } catch { /* пробуем следующий способ */ } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return null;
}

async function postFiles(files, meta, dryRun) {
  const res = await fetch(`api/art/upload${dryRun ? '?dry=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, meta }),
  });
  return res.json();
}

/**
 * Скачать игровые иконки через браузер и сохранить их на сервере.
 * onProgress(done, total) вызывается по ходу; возвращает итог.
 */
export async function downloadArtViaBrowser(onProgress = () => {}) {
  artDownload.active = true; artDownload.done = 0; artDownload.saved = 0; artDownload.error = null;
  artDownload.note = 'Ищу Item Codex…';
  try {
    // 1. Item Codex: список имён картинок (напрямую или через прокси).
    let codex = null;
    for (const url of CODEX_URLS) {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 20000) : null;
      try {
        const res = await fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
        if (res.ok) { codex = await res.json(); break; }
      } catch { /* пробуем прокси */ } finally {
        if (timer) clearTimeout(timer);
      }
      for (const wrap of READ_PROXIES.slice(1)) {
        try {
          const res = await fetch(wrap(url), { cache: 'no-store' });
          if (res.ok) { codex = await res.json(); break; }
        } catch { /* следующий */ }
      }
      if (codex) break;
    }
    if (!codex || !codex.item_variants) throw new Error('не удалось открыть Item Codex');
    const index = indexFromCodex(codex);

    // 2. Имена файлов — уникальные, по тирам и просыпаниям.
    const names = [...new Set(Object.values(index).flatMap((e) => [...Object.values(e.tiers || {}), ...Object.values(e.awakens || {})]))];
    artDownload.total = names.length;
    artDownload.note = `Скачиваю ${names.length} иконок…`;

    // 3. Скачиваем пачками и отправляем на сервер.
    const batch = {};
    let batchCount = 0;
    let saved = 0;
    const failed = [];
    for (const name of names) {
      artDownload.done += 1;
      onProgress(artDownload.done, names.length);
      const b64 = await readAsBase64(`${CDN_BASE}${name}`);
      if (b64) { batch[name] = b64; batchCount += 1; } else { failed.push(name); }
      if (batchCount >= 12 || artDownload.done === names.length) {
        if (batchCount) {
          const out = await postFiles(batch, { index, total: names.length }, false);
          saved += (out.saved || []).length;
          for (const k of Object.keys(batch)) delete batch[k];
          batchCount = 0;
        }
      }
    }
    artDownload.saved = saved;
    artDownload.note = failed.length
      ? `Сохранено ${saved} иконок, не удалось ${failed.length}`
      : `Сохранено ${saved} иконок`;
    artDownload.active = false;
    return { ok: saved > 0, saved, failed: failed.length, total: names.length };
  } catch (e) {
    artDownload.active = false;
    artDownload.error = e.message;
    artDownload.note = 'Не получилось: ' + e.message;
    return { ok: false, error: e.message };
  }
}
