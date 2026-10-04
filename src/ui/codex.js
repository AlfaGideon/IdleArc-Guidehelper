import { el, card, table } from './dom.js';
import { AFFIXES, DROP_BONUSES, DROP_BONUS_TIER_LABELS, RARITY, GEM_FAMILIES, GEM_RARITY, GEM_SECONDARY, GEM_SOCKET_UNLOCKS, GEAR_SLOTS, WEAPON_IMPLICITS, ITEM_TIERS } from '../data/items.js';
import { STATS, PRIMARY_ATTRS, STANCES, MASTERY, PETS, TALISMANS, RUNES, GUILD_TREE, PROGRESSION, CLASS_CHANGE, SEASON2_SYSTEMS } from '../data/systems.js';
import { CLASSES, CLASS_SKILL_RULES, classPointsForLevel } from '../data/classes.js';

let query = '';

const match = (...fields) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => String(f || '').toLowerCase().includes(q));
};

export function render(root) {
  root.innerHTML = '';
  root.appendChild(card('Поиск по кодексу', [
    el('input', {
      type: 'text', placeholder: 'Например: crit, пет, Fierce, гем, Dual, ML 260…', value: query,
      oninput: (e) => { query = e.target.value; render(root); },
    }),
    el('p', { class: 'muted', text: 'Кодекс — это снапшот официальных источников на 04.10.2026 (патч 1.3.1). Значения сезонно меняются.' }),
  ]));

  root.appendChild(classSkillsCard());
  root.appendChild(el('div', { class: 'grid cols-2' }, [affixCard(), dropBonusCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [gemCard(), gearCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [talismanCard(), petCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [statsCard(), progressionCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [guildCard(), seasonCard()]));
}

function classSkillsCard() {
  const blocks = CLASSES.map((c) => {
    const rows = c.skills
      .filter((s) => match(s.name, s.ru, s.text, c.name))
      .map((s) => [
        `${s.branch || '—'} · T${s.tier ?? '?'}`,
        el('div', {}, [el('b', { text: s.name }), s.unverified ? el('span', { class: 'tag', text: 'не подтверждено' }) : null]),
        `до ${s.max}`,
        s.text,
      ]);
    if (!rows.length) return null;
    return el('details', { open: query ? 'open' : null }, [
      el('summary', { text: `${c.ru} (${c.name}) — ${c.role}` }),
      table(['Ветка/тир', 'Навык', 'Макс', 'Эффект (за очко, если не указано иное)'], rows),
    ]);
  }).filter(Boolean);
  return card('Классовые навыки (5 классов)', [
    el('p', { class: 'muted', text: `${CLASS_SKILL_RULES.note} Tier 2 — после ${CLASS_SKILL_RULES.tierUnlock[2]} очков в ветке, Tier 3 — после ${CLASS_SKILL_RULES.tierUnlock[3]}.` }),
    el('div', { class: 'scroll' }, blocks.length ? blocks : [el('p', { text: 'Ничего не найдено.' })]),
  ]);
}

function affixCard() {
  const rows = AFFIXES.filter((a) => match(a.name, a.stat, a.ru, a.slots.join(' ')))
    .map((a) => [a.type === 'prefix' ? 'Префикс' : 'Суффикс', a.name, `${a.ru}`, a.base, a.slots.join(', ')]);
  return card('Аффиксы предметов', [
    el('p', { class: 'muted', text: `Базовый ролл × множитель редкости: ${RARITY.map((r) => `${r.tier} ${r.ru} ×${r.mult}`).join(', ')}. Плюс +3% к значению за каждый +уровень предмета.`}),
    el('div', { class: 'scroll' }, [table(['Тип', 'Аффикс', 'Стат', 'Базовый ролл', 'Слоты'], rows.length ? rows : [['—', '—', '—', '—', 'Ничего не найдено']])]),
  ]);
}

function dropBonusCard() {
  const head = ['Бонус', 'Стат', 'Мин. тир', ...DROP_BONUS_TIER_LABELS];
  const rows = DROP_BONUSES.filter((d) => match(d.name, d.stat, d.ru, d.note, d.cat))
    .map((d) => [d.name, d.ru, d.min, ...d.values]);
  return card('Drop Bonuses (T2 → T9)', [
    el('div', { class: 'scroll' }, [table(head, rows.length ? rows : [['—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—']])]),
    el('p', { class: 'muted', text: 'Заметки: ' + DROP_BONUSES.filter((d) => d.note).slice(0, 6).map((d) => `${d.name}: ${d.note}`).join(' ')}),
  ]);
}

function gemCard() {
  const famRows = GEM_FAMILIES.filter((f) => match(f.name, f.ru, JSON.stringify(f.slots)))
    .map((f) => [f.ru, f.slots.weapon, f.slots.torch, f.slots.armor, f.slots.jewelry]);
  const secRows = GEM_SECONDARY.map((s) => [s.stat, s.cut, s.polished, s.brilliant, s.flawless]);
  return card('Гемы и сокеты', [
    table(['Семья', 'Оружие', 'Torch', 'Броня', 'Украшения'], famRows.length ? famRows : [['—', '—', '—', '—', '—']]),
    el('h3', { text: 'Вторичные статы по редкости' }),
    el('div', { class: 'scroll' }, [table(['Стат', 'Cut', 'Polished', 'Brilliant', 'Flawless'], secRows)]),
    el('h3', { text: 'Открытие сокетов' }),
    table(['Сокет', 'ML', 'Золото'], GEM_SOCKET_UNLOCKS.map((s) => [s.socket, s.ml, s.gold])),
    el('p', { class: 'muted', text: 'Фьюз: 3 гема одной редкости → 1 следующей (кроме Flawless). Flawless — только дроп с ML 160.' }),
  ]);
}

function gearCard() {
  return card('Снаряжение: слоты, тиры, имплиситы', [
    el('h3', { text: 'Тиры предметов' }),
    table(['Тир', 'Редкость', 'Макс. +ур.', 'Аффиксов', 'Дроп', 'Фрагменты'], ITEM_TIERS.map((t) => [t.tier, t.ru, t.maxPlus ?? '—', t.affixes, t.drop, t.fragment])),
    el('h3', { text: 'Слоты' }),
    table(['Слот', 'Имплисит/особенность'], GEAR_SLOTS.filter((s) => match(s.ru, s.implicitFamily)).map((s) => [s.ru, s.implicitFamily])),
    el('h3', { text: 'Имплиситы оружия и брони (T1 → T6)' }),
    el('div', { class: 'scroll' }, [
      table(['Семейство', 'Класс', 'Рука', 'ML', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
        WEAPON_IMPLICITS.filter((w) => match(w.family, w.cls, w.note)).map((w) => [w.family, w.cls, w.hand, w.ml || '—', ...w.tiers])),
    ]),
  ]);
}

function talismanCard() {
  const rows = TALISMANS.types.map((t) => [t.ru, t.name, t.stats, t.levels[0][1] + ' → ' + t.levels[9][1], t.levels[0][2] + ' → ' + t.levels[9][2]]);
  return card('Талисманы', [
    table(['Тип', 'Name', 'Статы', 'Ур.0 → Ур.9 (стат 1)', 'Ур.0 → Ур.9 (стат 2)'], rows),
    el('h3', { text: 'Sacrifice Bonuses (после +9, 8 шт.)' }),
    table(['Стат', 'Значение'], TALISMANS.sacrificeBonuses.map((s) => [s.stat, s.value])),
    el('h3', { text: 'Inscriptions' }),
    el('p', { class: 'muted', text: `Шансы: ${TALISMANS.inscription.odds.map(([q, p]) => `${q} ${p}%`).join(', ')}. ${TALISMANS.inscription.guarantees} ${TALISMANS.inscription.stacking}` }),
    el('div', { class: 'scroll' }, [
      table(['Аффикс', 'Common', 'Greater', 'Perfect', 'Шанс'], TALISMANS.inscription.affixes.map((a) => [a.affix, a.values[0], a.values[1], a.values[2], a.chance])),
    ]),
    el('p', { class: 'muted', text: TALISMANS.infusion }),
  ]);
}

function petCard() {
  return card('Петы', [
    table(['Редкость', 'Шанс хэтча', 'Открытие', 'Пул бонусов', 'Шанс бонуса'], PETS.hatch.map((h) => [h.rarity, `${h.chance}%`, h.unlock, h.bonusPool || '—', h.perBonus ? `${h.perBonus}%` : '—'])),
    el('p', { class: 'muted', text: `Pity: Epic — гарантирован в ${PETS.pity.epic} хэтчах, Legendary — в ${PETS.pity.legendary}. Слотов: ${PETS.slots}.` }),
    el('h3', { text: 'Капы компоунда' }),
    table(['Редкость', 'Кап'], PETS.compoundCaps.map((c) => [c.rarity, c.cap])),
    el('p', { class: 'muted', text: PETS.compoundBalance }),
    el('h3', { text: 'Скейл шардовых аффиксов' }),
    el('div', { class: 'scroll' }, [table(['Аффикс', 'База', 'За уровень', 'Кап'], PETS.shardAffixes.map((a) => [a.affix, a.base, a.perLevel, a.cap]))]),
  ]);
}

function statsCard() {
  return card('Статы, атрибуты, стойки', [
    table(['Стат', 'Название', 'Что делает'], STATS.filter((s) => match(s.name, s.ru, s.desc)).map((s) => [s.ru, s.name, s.desc || '—'])),
    el('h3', { text: 'Первичные атрибуты (за 1 пункт)' }),
    table(['Атрибут', 'Эффекты'], PRIMARY_ATTRS.map((a) => [a.ru, a.perPoint.join(' · ')])),
    el('h3', { text: 'Стойки' }),
    table(['Стойка', 'Фокус', 'Когда брать', 'Нюанс'], STANCES.map((s) => [s.ru, s.focus, s.best, s.note])),
    el('h3', { text: 'Mastery' }),
    el('p', { class: 'muted', text: MASTERY.bossRule + ' ' + MASTERY.elementNote }),
    table(['Ур.', 'Бонус', 'Всего шардов'], MASTERY.table.map((m) => [m.level, `${m.bonus}%`, m.total])),
  ]);
}

function progressionCard() {
  return card('Прогрессия, биомы, активности', [
    el('h3', { text: 'Открытия по Monster Level' }),
    table(['ML', 'Что открывается'], PROGRESSION.mlUnlocks.filter((m) => match(m.what, m.ml)).map((m) => [m.ml, m.what])),
    el('p', { class: 'muted', text: PROGRESSION.fightingLevel + ' ' + PROGRESSION.mlProgress }),
    el('h3', { text: 'Биомы' }),
    table(['Биом', 'ML', 'Тир'], PROGRESSION.biomes.filter((b) => match(b.name, b.tier)).map((b) => [b.name, b.ml, b.tier])),
    el('h3', { text: 'The Convergence (ML 350)' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: PROGRESSION.convergence.seats }),
      el('li', { text: PROGRESSION.convergence.wild }),
      el('li', { text: PROGRESSION.convergence.tier }),
      el('li', { text: 'Формулы тира: ' + PROGRESSION.convergence.formulas.join('; ') }),
      el('li', { text: PROGRESSION.convergence.elites }),
      el('li', { text: PROGRESSION.convergence.lattice }),
    ]),
    el('h3', { text: 'Активности' }),
    table(['Активность', 'Открытие', 'Детали'], PROGRESSION.activities.filter((a) => match(a.name, a.details)).map((a) => [a.name, a.unlock, a.details])),
  ]);
}

function guildCard() {
  return card('Гильдия, руны, смена класса', [
    el('h3', { text: 'Guild Skill Tree' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: GUILD_TREE.pointsRule }),
      el('li', { text: GUILD_TREE.rankGates }),
      el('li', { text: `Ascension открывается после ${GUILD_TREE.ascension.at} очков. ${GUILD_TREE.ascension.note}` }),
      el('li', { text: GUILD_TREE.staircase }),
      el('li', { text: GUILD_TREE.boost }),
      el('li', { text: GUILD_TREE.reset }),
    ]),
    table(['Семейство', 'Бонус', 'Ранг 1'], GUILD_TREE.nodes.map((n) => [n.family, n.bonus, n.rank1])),
    el('h3', { text: 'Руны' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: RUNES.grid }),
      el('li', { text: RUNES.reroll }),
      el('li', { text: RUNES.note }),
    ]),
    el('h3', { text: 'Смена класса' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: CLASS_CHANGE.cost }),
      el('li', { text: CLASS_CHANGE.cooldown }),
      el('li', { text: CLASS_CHANGE.restriction }),
      el('li', { text: CLASS_CHANGE.gear }),
    ]),
  ]);
}

function seasonCard() {
  return card('Season 2 и её системы', [
    table(['Система', 'Как работает'], SEASON2_SYSTEMS.map((s) => [s.name, s.details])),
    el('h3', { text: 'Классовые очки по уровням' }),
    el('div', { class: 'scroll' }, [
      table(['Уровень персонажа', 'Классовых очков'], [1, 4, 7, 10, 13, 16, 19, 22, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((l) => [l, classPointsForLevel(l)])),
    ]),
  ]);
}
