/** Общие мелкие хелперы разметки стороны B (стиль IdleArc Companion). */
import { el } from '../ui/dom.js';
import { RARITY } from '../data/items.js';

/** «Русское (English)». */
export const bi = (ru, en) => (ru && en && ru !== en ? `${ru} (${en})` : (ru || en || ''));

/** Числа с суффиксами как в игре: 1 250 → 1.25K, 3 400 000 → 3.4M. */
export function fmt(n) {
  const v = Math.round(Number(n) || 0);
  const abs = Math.abs(v);
  if (abs >= 1e12) return trim(v / 1e12) + 'T';
  if (abs >= 1e9) return trim(v / 1e9) + 'B';
  if (abs >= 1e6) return trim(v / 1e6) + 'M';
  if (abs >= 1e3) return trim(v / 1e3) + 'K';
  return String(v);
}
const trim = (v) => (Math.round(v * 100) / 100).toString();

/** Карточка-секция стороны B. */
export function panel(title, children, cls = '') {
  return el('section', { class: `b-panel ${cls}`.trim() }, [
    title ? el('h2', { class: 'b-panel-title', text: title }) : null,
    ...[].concat(children),
  ]);
}

/** Таблица стороны B. */
export function bTable(headers, rows, cls = '') {
  return el('div', { class: 'b-table-wrap' }, [
    el('table', { class: `b-table ${cls}`.trim() }, [
      el('thead', {}, [el('tr', {}, headers.map((h) => el('th', { text: h })))]),
      el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, [c == null || c === '' ? '—' : c]))))),
    ]),
  ]);
}

/** Жетон/чип стороны B. */
export const chip = (text, kind = '') => el('span', { class: `b-chip ${kind}`.trim(), text });

/** Жетон тира предмета с цветом редкости игры (T1 Normal … T6 Infernal + A1). */
export function rarityChip(tier) {
  const r = RARITY[Math.min(6, Math.max(1, tier)) - 1];
  return chip(`${r.tier} ${bi(r.ru, r.name)}`, `rar-${r.tier.toLowerCase()}`);
}

/** Строка-подпись «лейбл: значение». */
export const kv = (k, v) => el('div', { class: 'b-kv' }, [el('span', { class: 'b-k', text: k }), el('span', { class: 'b-v' }, [v])]);
