/**
 * Сохранение состояния в браузере так, чтобы данные НИКОГДА не терялись.
 *
 * Пишем сразу в несколько мест (каналов), а читаем самый свежий снимок из всех:
 *   1) localStorage    — основной канал, переживает перезагрузку и закрытие браузера;
 *   2) sessionStorage  — переживает перезагрузку страницы;
 *   3) window.name     — работает даже там, где хранилище запрещено (приватный режим,
 *                        страница внутри iframe без доступа к storage): значение окна
 *                        переживает перезагрузку той же вкладки;
 *   4) память процесса — последний рубеж, чтобы приложение не падало.
 *
 * Плюс автосохранение: любое действие (клик, ввод, переключение страницы) пишет снимок
 * немедленно, а ещё — при уходе со страницы, сворачивании и раз в несколько секунд.
 * Перед каждой перезаписью предыдущая версия снимка уезжает в резервную копию.
 *
 * Ключи:
 *   iac:helper:state:v1      — текущее состояние планировщика (класс, цель, уровни, очки, экипировка, Кузница);
 *   iac:helper:state:v1:prev — предыдущая версия снимка (резерв, если что-то пошло не так);
 *   iac:helper:loadouts:v1   — именованные наборы («Набор 1», «Набор 2», …), как в игре.
 */

export const STATE_KEY = 'iac:helper:state:v1';
export const BACKUP_KEY = 'iac:helper:state:v1:prev';
export const LOADOUTS_KEY = 'iac:helper:loadouts:v1';

const NAME_PREFIX = 'iac-helper:'; // метка нашего значения в window.name, чужое не трогаем

const memory = new Map();

/* ------------------------------- каналы записи ------------------------------- */

function probe(store) {
  try {
    if (!store) return null;
    const key = '__iac_probe__';
    store.setItem(key, '1');
    store.removeItem(key);
    return store;
  } catch {
    return null;
  }
}

const lsStore = () => probe(globalThis.localStorage);
const ssStore = () => probe(globalThis.sessionStorage);

/** Наше значение в window.name (или пустой объект, если там что-то чужое). */
function nameBag() {
  try {
    const raw = globalThis.window && typeof globalThis.window.name === 'string' ? globalThis.window.name : '';
    if (!raw.startsWith(NAME_PREFIX)) return {};
    const data = JSON.parse(raw.slice(NAME_PREFIX.length));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function nameWrite(key, raw) {
  try {
    if (!globalThis.window) return false;
    const current = globalThis.window.name || '';
    // Если в window.name лежит чужая строка — не затираем её, этот канал просто пропускаем.
    if (current && !current.startsWith(NAME_PREFIX)) return false;
    const bag = nameBag();
    bag[key] = raw;
    globalThis.window.name = NAME_PREFIX + JSON.stringify(bag);
    return true;
  } catch {
    return false;
  }
}

function nameRead(key) {
  const bag = nameBag();
  return typeof bag[key] === 'string' ? bag[key] : null;
}

/* ------------------------------- запись/чтение ------------------------------- */

/** Куда реально удалось записать последний снимок. */
export const saveInfo = { at: null, where: [], durable: false, note: '' };

function noteFor(where) {
  if (where.includes('local')) return 'хранится в браузере (localStorage)';
  if (where.includes('session')) return 'хранится в сессии браузера (sessionStorage)';
  if (where.includes('window')) return 'хранится в окне браузера (резервный канал)';
  return 'хранится только до перезагрузки страницы';
}

const isDurable = (where) => where.includes('local') || where.includes('session') || where.includes('window');

/** Записать значение во все доступные каналы. */
function writeRaw(key, value) {
  const where = [];
  const ls = lsStore();
  if (ls) { try { ls.setItem(key, value); where.push('local'); } catch { /* переполнение — идём дальше */ } }
  const ss = ssStore();
  if (ss) { try { ss.setItem(key, value); where.push('session'); } catch { /* ignore */ } }
  if (nameWrite(key, value)) where.push('window');
  memory.set(key, value);
  where.push('memory');
  return where;
}

/** Все снимки ключа из всех каналов (для выбора самого свежего). */
function readAll(key) {
  const out = [];
  const push = (raw, channel) => {
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') out.push({ data, channel, raw, savedAt: Date.parse(data.savedAt || 0) || 0 });
    } catch { /* битая запись — пропускаем */ }
  };
  const ls = lsStore();
  if (ls) { try { push(ls.getItem(key), 'local'); } catch { /* ignore */ } }
  const ss = ssStore();
  if (ss) { try { push(ss.getItem(key), 'session'); } catch { /* ignore */ } }
  push(nameRead(key), 'window');
  push(memory.has(key) ? memory.get(key) : null, 'memory');
  return out;
}

const newest = (key) => readAll(key).sort((a, b) => b.savedAt - a.savedAt)[0] || null;

function removeRaw(key) {
  const ls = lsStore();
  if (ls) { try { ls.removeItem(key); } catch { /* ignore */ } }
  const ss = ssStore();
  if (ss) { try { ss.removeItem(key); } catch { /* ignore */ } }
  try {
    if (globalThis.window && String(globalThis.window.name || '').startsWith(NAME_PREFIX)) {
      const bag = nameBag();
      delete bag[key];
      globalThis.window.name = NAME_PREFIX + JSON.stringify(bag);
    }
  } catch { /* ignore */ }
  memory.delete(key);
}

/* --------------------------------- состояние --------------------------------- */

let lastSaved = null;
let touched = false; // пользователь уже что-то делал: до первого действия чужой снимок не перезаписываем

/** Отметить, что пользователь начал работать (любое действие). */
export function markTouched() { touched = true; }

export function isTouched() { return touched; }

/** Одинаковый ли снимок (без учёта времени сохранения). */
const sameState = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

/**
 * Сохранить состояние планировщика.
 * @param {object} snapshot данные приложения
 * @param {{allowOverwrite?: boolean}} [opts] allowOverwrite: false — не затирать уже
 *        лежащий в браузере снимок (защита от потери данных, если чтение не удалось).
 */
export function saveState(snapshot, opts = {}) {
  const existing = newest(STATE_KEY);

  // Такой же снимок уже лежит — писать не нужно, ничего не менялось.
  if (existing && sameState(existing.data.state, snapshot)) {
    lastSaved = new Date(existing.savedAt).toISOString();
    saveInfo.at = lastSaved;
    saveInfo.where = [existing.channel];
    saveInfo.durable = isDurable([existing.channel]);
    saveInfo.note = noteFor([existing.channel]);
    touched = touched || Boolean(opts.touch);
    return lastSaved;
  }

  const allowOverwrite = opts.allowOverwrite === undefined ? touched : Boolean(opts.allowOverwrite);
  if (!allowOverwrite && existing) {
    // Данные в браузере есть, а мы ещё ничего не меняли — не трогаем их.
    lastSaved = new Date(existing.savedAt).toISOString();
    saveInfo.at = lastSaved;
    saveInfo.where = [existing.channel];
    saveInfo.durable = isDurable([existing.channel]);
    saveInfo.note = 'в браузере уже есть снимок — не перезаписываем до первого действия';
    return lastSaved;
  }

  // Перед перезаписью сохраняем предыдущую версию: её можно вернуть кнопкой.
  if (existing && !sameState(existing.data.state, snapshot)) writeRaw(BACKUP_KEY, existing.raw);

  const payload = { v: 1, savedAt: new Date().toISOString(), state: snapshot };
  const where = writeRaw(STATE_KEY, JSON.stringify(payload));
  lastSaved = payload.savedAt;
  saveInfo.at = lastSaved;
  saveInfo.where = where;
  saveInfo.durable = isDurable(where);
  saveInfo.note = noteFor(where);
  return payload.savedAt;
}

/**
 * Загрузить сохранённое состояние — самый свежий снимок из всех каналов.
 * Если localStorage почистили, а в sessionStorage или window.name снимок остался, данные вернутся.
 */
export function loadState() {
  const rec = loadStateRecord();
  return rec && rec.state ? rec.state : null;
}

function describe(rec) {
  lastSaved = new Date(rec.savedAt).toISOString();
  saveInfo.at = lastSaved;
  saveInfo.where = [rec.channel];
  saveInfo.durable = isDurable([rec.channel]);
  saveInfo.note = noteFor([rec.channel]);
  return { state: rec.data.state, savedAt: lastSaved, channel: rec.channel };
}

/** То же, но с деталями: { state, savedAt, channel }. */
export function loadStateRecord() {
  const best = readAll(STATE_KEY).filter((r) => r.data && r.data.state).sort((a, b) => b.savedAt - a.savedAt)[0];
  return best ? describe(best) : null;
}

/** Есть ли в браузере хоть какой-то снимок (даже если прочитать его не удалось). */
export function hasStoredState() {
  return readAll(STATE_KEY).length > 0;
}

/** Предыдущая версия снимка (для кнопки «вернуть как было»): { state, savedAt } или null. */
export function loadBackupRecord() {
  const best = readAll(BACKUP_KEY).filter((r) => r.data && r.data.state).sort((a, b) => b.savedAt - a.savedAt)[0];
  return best ? { state: best.data.state, savedAt: new Date(best.savedAt).toISOString() } : null;
}

export function savedAt() {
  if (lastSaved) return lastSaved;
  const best = newest(STATE_KEY);
  return best ? new Date(best.savedAt).toISOString() : null;
}

/** Стереть текущее состояние (кнопка «Сбросить»). */
export function clearState() {
  removeRaw(STATE_KEY);
  removeRaw(BACKUP_KEY);
  lastSaved = null;
  saveInfo.at = null;
  saveInfo.where = [];
  saveInfo.durable = false;
  saveInfo.note = '';
}

/* ------------------------------- автосохранение ------------------------------- */

/**
 * Сохранение на каждое действие: клик, ввод, смена страницы, уход со страницы.
 * Это страховка к явным вызовам saveState в интерфейсе — данные не теряются,
 * даже если что-то пойдёт не так посреди отрисовки.
 *
 * @param {() => object} getSnapshot функция, возвращающая текущий снимок
 * @param {{everyMs?: number, onSave?: (at: string, why: string) => void}} [opts]
 * @returns {() => void} функция остановки (для тестов)
 */
export function bindAutosave(getSnapshot, opts = {}) {
  const everyMs = opts.everyMs || 4000;
  const flush = (why) => {
    markTouched();
    try {
      const at = saveState(getSnapshot(), { allowOverwrite: true });
      if (opts.onSave) opts.onSave(at, why);
    } catch { /* сохранение не должно ломать интерфейс */ }
  };

  const doc = globalThis.document;
  const win = globalThis.window;
  const cleanups = [];
  const EVENTS = ['click', 'change', 'input', 'keyup', 'submit', 'touchend', 'pointerup'];

  if (doc && doc.addEventListener) {
    for (const ev of EVENTS) {
      // Первая фаза (перехват): отмечаем действие ДО обработчика элемента — тогда
      // его сохранение уже имеет право перезаписать снимок.
      const mark = () => markTouched();
      doc.addEventListener(ev, mark, true);
      cleanups.push(() => doc.removeEventListener(ev, mark, true));
      // Вторая фаза (всплытие) + отложенный вызов: сохраняем уже изменённое состояние.
      const save = () => { if (globalThis.setTimeout) globalThis.setTimeout(() => flush(ev), 0); else flush(ev); };
      doc.addEventListener(ev, save, false);
      cleanups.push(() => doc.removeEventListener(ev, save, false));
    }
    const onHide = () => { if (!doc.visibilityState || doc.visibilityState === 'hidden') flush('скрытие страницы'); };
    doc.addEventListener('visibilitychange', onHide);
    cleanups.push(() => doc.removeEventListener('visibilitychange', onHide));
  }

  if (win && win.addEventListener) {
    for (const ev of ['pagehide', 'beforeunload', 'freeze', 'blur', 'pageshow']) {
      const handler = () => flush(ev);
      win.addEventListener(ev, handler);
      cleanups.push(() => win.removeEventListener(ev, handler));
    }
    if (globalThis.setInterval) {
      const timer = globalThis.setInterval(() => flush('периодически'), everyMs);
      cleanups.push(() => globalThis.clearInterval(timer));
    }
  }

  return () => { for (const fn of cleanups) { try { fn(); } catch { /* ignore */ } } };
}

/* ---------------------------------- наборы ----------------------------------- */

/** Список сохранённых наборов: { 'Набор 1': { savedAt, state }, … }. */
export function listLoadouts() {
  const best = newest(LOADOUTS_KEY);
  return best ? best.data : {};
}

/** Сохранить набор под именем (например, «Набор 1»). */
export function saveLoadout(name, snapshot) {
  const all = listLoadouts();
  all[name] = { savedAt: new Date().toISOString(), state: snapshot };
  writeRaw(LOADOUTS_KEY, JSON.stringify(all));
  return all[name].savedAt;
}

export function getLoadout(name) {
  const all = listLoadouts();
  return all[name] && all[name].state ? all[name].state : null;
}

export function deleteLoadout(name) {
  const all = listLoadouts();
  if (!(name in all)) return false;
  delete all[name];
  writeRaw(LOADOUTS_KEY, JSON.stringify(all));
  return true;
}

/** Только для тестов: узнать, работает ли реальное хранилище браузера. */
export const hasPersistentStorage = () => Boolean(lsStore() || ssStore());
