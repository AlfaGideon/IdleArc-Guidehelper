/**
 * Поисковый индекс стороны B: единая точка «Search the Companion».
 * Собирается один раз из данных Guide Helper: предметы, аффиксы, Drop Bonuses,
 * гемы, петы, талисманы, классовые навыки, пассивные статы, игровые статы/стойки.
 * Результат ведёт на страницу стороны B (codex / trees / upgrade) с нужным фильтром.
 */
import { GEAR_FAMILIES, AFFIXES, DROP_BONUSES, GEM_FAMILIES, SLOT_RU, FAMILY_AWAKEN } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { PASSIVE_STATS } from '../data/passives.js';
import { TALISMANS, STATS, STANCES, MASTERY, RUNES } from '../data/systems.js';

const bi = (ru, en) => (ru && en && ru !== en ? `${ru} (${en})` : (ru || en || ''));

export function buildSearchIndex() {
  const out = [];
  const push = (icon, tag, title, sub, jump, extra = '') => {
    out.push({
      icon, tag, title, sub, jump,
      hay: { title: title.toLowerCase(), all: `${title} ${sub} ${extra}`.toLowerCase() },
    });
  };

  for (const f of GEAR_FAMILIES) {
    push('🗡', 'Предмет', bi(f.ru, f.name),
      `${SLOT_RU[f.slot] || f.slot} · имплисит: ${f.implicit} · ${f.unlock}`,
      { page: 'codex', cat: 'items', query: f.name },
      `${(f.tierNames || []).join(' ')} ${(f.prefixes || []).join(' ')} ${(f.suffixes || []).join(' ')} ${FAMILY_AWAKEN[f.id] || ''}`);
  }
  for (const a of AFFIXES) {
    push(a.type === 'prefix' ? '◐' : '◑', a.type === 'prefix' ? 'Префикс' : 'Суффикс', bi(a.ru, a.name),
      `${a.stat} · базовый ролл ${a.base} · слоты: ${a.slots.join(', ')}`,
      { page: 'codex', cat: 'affixes', query: a.name });
  }
  for (const d of DROP_BONUSES) {
    push('✚', 'Drop Bonus', bi(d.ru, d.name),
      `${d.stat} · с тира ${d.min} · ${d.cat}`,
      { page: 'codex', cat: 'drops', query: d.name }, d.note || '');
  }
  for (const g of GEM_FAMILIES) {
    push('◆', 'Гем', bi(g.ru, g.name),
      `Оружие: ${g.slots.weapon} · Броня: ${g.slots.armor}`,
      { page: 'codex', cat: 'gems', query: g.name });
  }
  for (const t of TALISMANS.types) {
    push('☗', 'Талисман', bi(t.ru, t.name),
      t.stats,
      { page: 'codex', cat: 'pets', query: t.name });
  }
  for (const c of CLASSES) {
    push('✦', 'Класс', bi(c.ru, c.name),
      `${c.role} · ветки: ${c.branches.join(' / ')}`,
      { page: 'trees', mode: 'class', classId: c.id, query: c.name });
    for (const s of c.skills) {
      push('✧', `Навык · ${c.name}`, bi(s.ru, s.name),
        `${s.branch} · тир ${s.tier} · макс. ${s.max} — ${s.text}`,
        { page: 'trees', mode: 'class', classId: c.id, query: s.name });
    }
  }
  for (const [code, m] of Object.entries(PASSIVE_STATS)) {
    push('✶', 'Пассивка · Passive', bi(m.ru, m.en),
      'узел пассивного дерева',
      { page: 'trees', mode: 'passive', query: m.en });
  }
  for (const s of STATS) {
    push('Σ', 'Стат', bi(s.ru, s.name),
      s.desc || s.group,
      { page: 'codex', cat: 'stats', query: s.name });
  }
  for (const s of STANCES) {
    push('⚔', 'Стойка', bi(s.ru, s.name),
      `${s.focus} · ${s.best}`,
      { page: 'codex', cat: 'stats', query: s.name });
  }
  push('✪', 'Mastery', 'Mastery (Мастерство врага)', MASTERY.bossRule, { page: 'codex', cat: 'stats', query: 'Mastery' });
  push('❖', 'Руны', 'Runes (руны и рунические слова)', `${RUNES.grid}`, { page: 'codex', cat: 'guild', query: 'Rune' });
  return out;
}
