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
// Источники картинок: Item Codex указывает пути static/images/items/<имя>.webp на хосте
// компаньона — он первый; idlearc.com — запасной (на нём бывает 403/404).
const CDN_BASES = [
  'https://idlearc-companion-web-production.up.railway.app/static/images/items/',
  'https://idlearc.com/static/images/items/',
];
const CDN_BASE = CDN_BASES[0];
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
      artState.mode = 'cdn';
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

/**
 * Открытые CORS-прокси (запасной путь, если браузер блокирует прямое чтение с CDN).
 * Порядок важен: самые стабильные впереди. Для картинок и JSON набор разный —
 * images.weserv.nl умеет только картинки.
 */
const DIRECT = (url) => url;
const WESERV = (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`;
const CORSPROXY = (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
const CODETABS = (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
const ALLORIGINS = (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

const JSON_FETCHERS = [DIRECT, CORSPROXY, CODETABS, ALLORIGINS];
const IMAGE_FETCHERS = [DIRECT, WESERV, CORSPROXY, CODETABS, ALLORIGINS];

export const artDownload = {
  active: false, done: 0, total: 0, saved: 0, note: '', error: null,
  detail: '',           // пояснения: через какой канал достали кодекс, сколько ретраев
  failedNames: [],
};

async function fetchJsonAnywhere(urls, timeoutMs = 18000) {
  let lastErr = 'нет ответа';
  for (const url of urls) {
    for (const wrap of JSON_FETCHERS) {
      const target = wrap(url);
      const via = target === url ? 'напрямую' : `через ${new URL(target).host}`;
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      try {
        const res = await fetch(target, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
        if (!res.ok) { lastErr = `${new URL(url).host}: HTTP ${res.status}`; continue; }
        const data = await res.json();
        return { data, via: `${new URL(url).host} ${via}` };
      } catch (e) {
        lastErr = `${new URL(url).host}: ${e && e.name === 'AbortError' ? 'таймаут' : 'недоступен'}`;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }
  throw new Error(`Item Codex недоступен из браузера (${lastErr})`);
}

/** Скачать один файл картинки; возвращает { b64, via } или null. */
async function readAsBase64(name, timeoutMs = 15000) {
  for (const base of CDN_BASES) {
    for (const wrap of IMAGE_FETCHERS) {
      const target = wrap(base + name);
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      try {
        const res = await fetch(target, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
        if (!res.ok) continue;
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.length < 200 || buf.length > 400 * 1024) continue;
        let bin = '';
        for (let i = 0; i < buf.length; i += 1) bin += String.fromCharCode(buf[i]);
        return { b64: globalThis.btoa(bin), via: target === base + name ? 'cdn' : new URL(target).host };
      } catch { /* пробуем следующий способ */ } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }
  return null;
}

/**
 * Параллельное скачивание списка картинок пулом воркеров: 250 файлов по одному —
 * это минуты; пачкой по CONCURRENCY — в разы быстрее, а CDN такая нагрузка безразлична.
 * Возвращает { files: {name: b64}, failed: [name] }.
 */
async function fetchAllImages(names, onProgress) {
  const CONCURRENCY = 4;
  const files = {};
  let done = 0;
  const queue = [...names];
  const worker = async () => {
    for (;;) {
      const raw = queue.shift();
      if (!raw) return;
      const retried = raw.charCodeAt(0) === 0; // служебный префикс повторной попытки
      const name = retried ? raw.slice(1) : raw;
      const got = await readAsBase64(name);
      if (got) files[name] = got.b64;
      if (!retried) {
        // Прогресс считаем по первым попыткам; фейл уходит в конец очереди на один ретрай
        // (флаки-прокси обычно переживаются одним повтором).
        done += 1;
        artDownload.done = done;
        onProgress(done, names.length, name);
        if (!got) queue.push('\u0000' + name);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // Имена с префиксом '\u0000' — это повторные попытки; те, что дошли до конца очереди, — честные фейлы.
  const failed = names.filter((n) => !files[n]);
  return { files, failed };
}

async function postFiles(files, meta, dryRun) {
  const res = await fetch(`api/art/upload${dryRun ? '?dry=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, meta }),
  });
  return res.json();
}

/** Получить Item Codex + построить карту имён иконок (общий первый шаг обоих сценариев). */
async function loadCodexAndNames() {
  artDownload.note = 'Ищу Item Codex (список картинок)…';
  const { data: codex, via } = await fetchJsonAnywhere(CODEX_URLS);
  if (!codex || !codex.item_variants) throw new Error('Item Codex ответил, но без item_variants');
  const index = indexFromCodex(codex);
  const names = [...new Set(Object.values(index).flatMap((e) => [...Object.values(e.tiers || {}), ...Object.values(e.awakens || {})]))].sort();
  artDownload.total = names.length;
  artDownload.detail = `Item Codex получен: ${via}. Файлов: ${names.length}.`;
  return { index, names };
}

function finishDownload(saved, failed, total, where) {
  artDownload.saved = saved;
  artDownload.failedNames = failed.slice(0, 30);
  artDownload.active = false;
  if (failed.length) {
    artDownload.note = `${where}: сохранено ${saved} из ${total}, не удалось ${failed.length}. Нажмите кнопку ещё раз — повтор докачивает только недостающие.`;
    artDownload.detail = 'Не скачались: ' + failed.slice(0, 10).join(', ') + (failed.length > 10 ? '…' : '')
      + '. Если ошибок много — вероятно, CDN игры временно блокирует запросы: попробуйте через 5–10 минут или запустите приложение локально (start.bat) и нажмите «Скачать игровые картинки».';
  } else {
    artDownload.note = `${where}: все ${saved} иконок на месте. Работает офлайн.`;
  }
  return { ok: saved > 0, saved, failed: failed.length, total };
}

function failDownload(e) {
  artDownload.active = false;
  artDownload.error = e && e.message ? e.message : String(e);
  artDownload.note = 'Не получилось: ' + artDownload.error;
  return { ok: false, error: artDownload.error };
}

/**
 * Сценарий 1: браузер скачивает иконки и отправляет их на сервер приложения
 * (POST /api/art/upload → сервер кладёт файлы в assets/items). Работает в превью
 * (где у сервера нет интернета) и локально.
 */
export async function downloadArtViaBrowser(onProgress = () => {}) {
  if (artDownload.active) return { ok: false, error: 'загрузка уже идёт' };
  artDownload.active = true; artDownload.done = 0; artDownload.saved = 0; artDownload.error = null;
  artDownload.detail = ''; artDownload.failedNames = [];
  try {
    const { index, names } = await loadCodexAndNames();
    const { files, failed } = await fetchAllImages(names, onProgress);

    // Заливаем на сервер пачками по 12 (≈300 КБ), прогресс виден сразу.
    artDownload.note = 'Передаю файлы на сервер приложения…';
    const keys = Object.keys(files);
    let saved = 0;
    for (let i = 0; i < keys.length; i += 12) {
      const batch = {};
      for (const k of keys.slice(i, i + 12)) batch[k] = files[k];
      try {
        const out = await postFiles(batch, { index, total: names.length }, false);
        saved += (out.saved || []).length;
      } catch (e) {
        return failDownload(new Error(`сервер не принял файлы (${e && e.message ? e.message : e}) — попробуйте вариант «в папку проекта»`));
      }
    }
    return finishDownload(saved, failed, names.length, 'Сервер');
  } catch (e) {
    return failDownload(e);
  }
}

/**
 * Сценарий 2: браузер пишет иконки НАПРЯМУЮ в папку проекта (File System Access API,
 * Chrome/Edge). Самый надёжный вариант: сервер вообще не участвует, работает даже на
 * статическом хостинге. Пользователь один раз выбирает папку assets/items.
 */
export async function downloadArtToFolder(onProgress = () => {}) {
  if (artDownload.active) return { ok: false, error: 'загрузка уже идёт' };
  const picker = globalThis.showDirectoryPicker;
  if (typeof picker !== 'function') {
    return { ok: false, error: 'этот браузер не умеет запись в папку (нужен Chrome/Edge) — используйте «Скачать через браузер на сервер»' };
  }
  artDownload.active = true; artDownload.done = 0; artDownload.saved = 0; artDownload.error = null;
  artDownload.detail = ''; artDownload.failedNames = [];
  try {
    artDownload.note = 'Выберите папку assets/items проекта…';
    onProgress(0, 1);
    const dir = await picker.call(globalThis, { mode: 'readwrite', startIn: 'documents' });
    const { index, names } = await loadCodexAndNames();
    const { files, failed } = await fetchAllImages(names, onProgress);

    artDownload.note = 'Записываю файлы в папку…';
    let saved = 0;
    for (const [name, b64] of Object.entries(files)) {
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      const bin = globalThis.atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i);
      await w.write(buf);
      await w.close();
      saved += 1;
    }
    const ih = await dir.getFileHandle('index.json', { create: true });
    const iw = await ih.createWritable();
    await iw.write(JSON.stringify({
      meta: {
        source: 'idlearc.com (Item Codex → Appearance)',
        fetchedAt: new Date().toISOString(),
        files: saved, total: names.length,
        via: 'запись из браузера напрямую в папку (File System Access API)',
      },
      index,
    }, null, 1));
    await iw.close();
    return finishDownload(saved, failed, names.length, 'Папка проекта');
  } catch (e) {
    if (e && e.name === 'AbortError') { artDownload.active = false; artDownload.note = 'Выбор папки отменён — файлы не записывались.'; return { ok: false, error: artDownload.note }; }
    return failDownload(e);
  }
}
