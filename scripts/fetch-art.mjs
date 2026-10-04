#!/usr/bin/env node
/**
 * Загрузчик игровых иконок предметов.
 *
 * Зачем: приложение работает офлайн и не тянет картинки из интернета, а в песочнице
 * разработки нет доступа к CDN игры. Поэтому иконки один раз скачиваются в репозиторий
 * (assets/items/*.webp) и раздаются локально вместе с приложением.
 *
 * Источник — официальный Item Codex: `data/item_codex_data.json` (в нём перечислены все
 * имена картинок по тирам и рангам просыпания) и CDN игры `https://idlearc.com/static/images/items/`.
 *
 * Запуск: node scripts/fetch-art.mjs      (нужен доступ в интернет)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'items');
const MAP_FILE = path.join(ROOT, 'src', 'data', 'itemImages.js');

const CODEX_URLS = [
  'https://idlearc-companion-web-production.up.railway.app/data/item_codex_data.json',
  'https://idlearc-companion-web-production.up.railway.app/assets/data/item_codex_data.json',
];

const IMAGE_BASES = [
  'https://idlearc.com/static/images/items/',
  'https://idlearc-companion-web-production.up.railway.app/assets/items/',
  'https://idlearc-companion-web-production.up.railway.app/static/images/items/',
];

async function fetchJson() {
  for (const url of CODEX_URLS) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) { console.log(`— ${url}: HTTP ${res.status}`); continue; }
      console.log(`— данные взяты из ${url}`);
      return await res.json();
    } catch (e) {
      console.log(`— ${url}: ${e.message}`);
    }
  }
  throw new Error('не удалось получить item_codex_data.json');
}

/** Все имена картинок из item_variants (тиры + просыпания). */
function collectImages(codex) {
  const out = new Map(); // basename → true
  const variants = codex.item_variants || {};
  for (const [name, v] of Object.entries(variants)) {
    for (const t of Object.values(v.tiers || {})) if (t && t.image) out.set(path.basename(t.image), true);
    for (const a of Object.values(v.awakens || {})) if (a && a.image) out.set(path.basename(a.image), true);
  }
  return [...out.keys()].sort();
}

async function download(name) {
  for (const base of IMAGE_BASES) {
    try {
      const res = await fetch(base + name, { redirect: 'follow' });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) continue;
      return buf;
    } catch { /* пробуем следующий источник */ }
  }
  return null;
}

/** Разбить запросы на пачки, чтобы не заваливать CDN. */
async function pool(items, size, worker) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    results.push(...(await Promise.all(chunk.map((x) => worker(x)))));
  }
  return results;
}

function quote(s) { return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`; }

/** Файл-карта: семейство → иконки по тирам и просыпаниям (basename без каталога). */
function buildMapFile(codex, saved) {
  const lines = [];
  lines.push('/**');
  lines.push(' * Иконки предметов из игры (Item Codex → Appearance).');
  lines.push(' *');
  lines.push(' * Файл создан автоматически скриптом scripts/fetch-art.mjs — не редактируйте вручную.');
  lines.push(` * Источник: idlearc.com (static/images/items), снапшот ${new Date().toISOString().slice(0, 10)}.`);
  lines.push(` * Скачано файлов: ${saved}. Каталог: assets/items/.`);
  lines.push(' */');
  lines.push('export const ITEM_IMAGE_DIR = \'assets/items/\';');
  lines.push('');
  lines.push('export const ITEM_IMAGES = {');
  const variants = codex.item_variants || {};
  for (const [name, v] of Object.entries(variants)) {
    const tiers = [];
    for (const [t, meta] of Object.entries(v.tiers || {})) {
      if (meta && meta.image) tiers.push(`    ${t}: ${quote(path.basename(meta.image))},`);
    }
    const awakens = [];
    for (const [r, meta] of Object.entries(v.awakens || {})) {
      if (meta && meta.image) awakens.push(`    ${r}: ${quote(path.basename(meta.image))},`);
    }
    lines.push(`  ${quote(name)}: {`);
    if (tiers.length) lines.push('    tiers: {', ...tiers, '    },');
    if (awakens.length) lines.push('    awakens: {', ...awakens, '    },');
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Иконка семейства для тира (1…6) или просыпания; null, если картинки нет. */');
  lines.push('export function itemImageName(familyName, tier = 1, awaken = 0) {');
  lines.push('  const entry = ITEM_IMAGES[familyName];');
  lines.push('  if (!entry) return null;');
  lines.push('  if (awaken > 0 && entry.awakens && entry.awakens[awaken]) return entry.awakens[awaken];');
  lines.push('  const t = Math.min(6, Math.max(1, Math.round(Number(tier) || 1)));');
  lines.push('  return (entry.tiers && entry.tiers[t]) || null;');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const codex = await fetchJson();
  const names = collectImages(codex);
  console.log(`Найдено картинок в Item Codex: ${names.length}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  const failed = [];
  await pool(names, 8, async (name) => {
    const dest = path.join(OUT_DIR, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 200) { ok += 1; return; }
    const buf = await download(name);
    if (buf) { fs.writeFileSync(dest, buf); ok += 1; } else failed.push(name);
  });

  console.log(`Скачано иконок: ${ok} из ${names.length}`);
  if (failed.length) console.log(`Не найдено (${failed.length}): ${failed.slice(0, 20).join(', ')}${failed.length > 20 ? ' …' : ''}`);

  fs.writeFileSync(MAP_FILE, buildMapFile(codex, ok), 'utf8');
  console.log(`Карта иконок записана: ${path.relative(ROOT, MAP_FILE)}`);

  const source = [
    '# Иконки предметов IdleArc',
    '',
    'Файлы в этом каталоге — изображения предметов из игры IdleArc (Item Codex → Appearance),',
    'полученные с официального CDN (idlearc.com/static/images/items/) скриптом `scripts/fetch-art.mjs`.',
    `Снапшот: ${new Date().toISOString().slice(0, 10)}. Скачано файлов: ${ok}.`,
    '',
    'Используются неофициальным фан-инструментом IdleArc Guide Helper. Права на изображения принадлежат',
    'IdleArc / Mikhael Studio.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'SOURCE.md'), source, 'utf8');
  if (failed.length > 40) process.exitCode = 0;
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exit(1); });
