/**
 * Сохранение состояния в браузере (localStorage), чтобы данные не терялись при перезагрузке.
 *
 * Ключи:
 *   iac:helper:state:v1     — текущее состояние планировщика (класс, цель, уровни, очки, кузница);
 *   iac:helper:loadouts:v1  — именованные наборы («Набор 1», «Набор 2», …), как в игре.
 *
 * Если localStorage недоступен (приватный режим, запрет хранилища, тесты в Node) —
 * используется память процесса: приложение продолжает работать, просто не переживает перезагрузку.
 */

export const STATE_KEY = 'iac:helper:state:v1';
export const LOADOUTS_KEY = 'iac:helper:loadouts:v1';

const memory = new Map();

function storage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    // Проверяем, что запись реально работает (в Safari приватный режим бросает QuotaExceeded).
    const probe = '__iac_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

function readRaw(key) {
  const ls = storage();
  try {
    return ls ? ls.getItem(key) : (memory.has(key) ? memory.get(key) : null);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  const ls = storage();
  try {
    if (ls) ls.setItem(key, value);
    else memory.set(key, value);
    return true;
  } catch {
    memory.set(key, value);
    return false;
  }
}

function removeRaw(key) {
  const ls = storage();
  try {
    if (ls) ls.removeItem(key);
    memory.delete(key);
  } catch {
    memory.delete(key);
  }
}

function parse(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/* --------------------------------- состояние --------------------------------- */

let lastSaved = null;

/** Сохранить текущее состояние планировщика. */
export function saveState(snapshot) {
  const payload = { v: 1, savedAt: new Date().toISOString(), state: snapshot };
  writeRaw(STATE_KEY, JSON.stringify(payload));
  lastSaved = payload.savedAt;
  return payload.savedAt;
}

/** Загрузить сохранённое состояние (или null). */
export function loadState() {
  const data = parse(readRaw(STATE_KEY));
  return data && data.state ? data.state : null;
}

export function savedAt() {
  if (lastSaved) return lastSaved;
  const data = parse(readRaw(STATE_KEY));
  return data && data.savedAt ? data.savedAt : null;
}

/** Стереть текущее состояние (кнопка «Сбросить»). */
export function clearState() {
  removeRaw(STATE_KEY);
  lastSaved = null;
}

/* ---------------------------------- наборы ----------------------------------- */

/** Список сохранённых наборов: { 'Набор 1': { savedAt, state }, … }. */
export function listLoadouts() {
  return parse(readRaw(LOADOUTS_KEY)) || {};
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
export const hasPersistentStorage = () => Boolean(storage());
