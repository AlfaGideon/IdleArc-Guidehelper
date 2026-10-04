#!/usr/bin/env node
/**
 * Разовая загрузка игровых иконок предметов в репозиторий.
 *
 * Зачем: приложение не тянет картинки из интернета — иконки лежат локально
 * (assets/items/*.webp) и раздаются вместе с приложением. Так ассеты видны
 * и в офлайне, и в превью, где внешние запросы запрещены.
 *
 * Запуск: node scripts/fetch-art.mjs        (нужен доступ в интернет)
 * Если интернета нет — то же самое можно сделать кнопкой в интерфейсе
 * (маршрут POST /api/art/fetch на локальном сервере).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCodex, downloadArt } from './art-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'items');

async function main() {
  const { url, data } = await fetchCodex();
  console.log(`Данные Item Codex: ${url}`);
  const res = await downloadArt(data, OUT_DIR, { concurrency: 8, log: () => {} });
  console.log(`Скачано иконок: ${res.files} из ${res.total}`);
  if (res.failedNames.length) {
    console.log(`Не найдено (${res.failedNames.length}): ${res.failedNames.slice(0, 15).join(', ')}${res.failedNames.length > 15 ? ' …' : ''}`);
  }
  console.log(`Каталог: ${path.relative(ROOT, OUT_DIR)} (карта — index.json)`);
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exit(1); });
