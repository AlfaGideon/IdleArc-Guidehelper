import { el, card, table, chips } from './dom.js';
import {
  AFFIXES, DROP_BONUSES, DROP_BONUS_TIER_LABELS, DROP_BONUS_CATEGORIES, RARITY,
  GEM_FAMILIES, GEM_RARITY, GEM_SECONDARY, GEM_SOCKET_UNLOCKS, GEM_SOCKET_LEVELS, GEM_DROP_TABLE,
  GEAR_FAMILIES, SLOT_ORDER, SLOT_RU, SLOT_GEM_REGION, DROP_TIER_TABLE, ITEM_TIERS, familiesForSlot,
} from '../data/items.js';
import { STATS, PRIMARY_ATTRS, STANCES, MASTERY, PETS, TALISMANS, RUNES, GUILD_TREE, PROGRESSION, CLASS_CHANGE, SEASON2_SYSTEMS } from '../data/systems.js';
import { CLASSES, CLASS_SKILL_RULES, classPointsForLevel } from '../data/classes.js';

const filter = { query: '', cls: 'all', slot: 'all' };

const match = (...fields) => {
  if (!filter.query) return true;
  const q = filter.query.toLowerCase();
  return fields.some((f) => String(f || '').toLowerCase().includes(q));
};

export function render(root) {
  root.innerHTML = '';
  root.appendChild(searchCard(root));
  root.appendChild(itemCatalogCard());
  root.appendChild(el('div', { class: 'grid cols-2' }, [affixCard(), dropBonusCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [gemCard(), classSkillsCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [talismanCard(), petCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [statsCard(), progressionCard()]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [guildCard(), seasonCard()]));
}

function searchCard(root) {
  return card('Поиск по предметам и системам', [
    el('div', { class: 'controls' }, [
      el('div', {}, [el('label', { text: 'Поиск' }),
        el('input', { type: 'text', placeholder: 'Например: великий меч, Dagger, Quiver, Wardplate, Fierce…', value: filter.query,
          oninput: (e) => { filter.query = e.target.value; render(root); } })]),
      el('div', {}, [el('label', { text: 'Класс' }),
        el('select', { onchange: (e) => { filter.cls = e.target.value; render(root); } },
          [{ v: 'all', t: 'Все классы' }, ...CLASSES.map((c) => ({ v: c.id, t: `${c.ru} (${c.name})` }))]
            .map((o) => el('option', { value: o.v, selected: filter.cls === o.v ? 'selected' : null }, [o.t])))]),
      el('div', {}, [el('label', { text: 'Слот' }),
        el('select', { onchange: (e) => { filter.slot = e.target.value; render(root); } },
          [{ v: 'all', t: 'Все слоты' }, ...SLOT_ORDER.map((s) => ({ v: s, t: SLOT_RU[s] }))]
            .map((o) => el('option', { value: o.v, selected: filter.slot === o.v ? 'selected' : null }, [o.t])))]),
    ]),
    el('p', { class: 'muted', text: 'Данные — снапшот Item Codex и wiki на 04.10.2026 (патч 1.3.1).' }),
  ]);
}

/* ------------------------------- Каталог предметов ------------------------------- */

function visibleFamilies() {
  return GEAR_FAMILIES.filter((f) => {
    if (filter.cls !== 'all' && !(f.cls === 'all' || f.cls === filter.cls)) return false;
    if (filter.slot !== 'all' && f.slot !== filter.slot) return false;
    return match(f.name, f.ru, f.implicit, f.unlock, (f.tierNames || []).join(' '), (f.prefixes || []).join(' '), (f.suffixes || []).join(' '));
  });
}

function itemCatalogCard() {
  const fams = visibleFamilies();
  const bySlot = {};
  for (const f of fams) (bySlot[f.slot] = bySlot[f.slot] || []).push(f);

  const blocks = SLOT_ORDER.filter((s) => bySlot[s]).map((slot) => {
    const families = el('div', {}, bySlot[slot].map(familyBlock));
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: `${SLOT_RU[slot]} · ${bySlot[slot].length} семейств` }),
        el('div', { class: 'chips' }, [el('span', { class: 'chip', text: `гем: ${SLOT_GEM_REGION[slot]}` })]),
      ]),
      families,
    ]);
  });

  return card('Каталог экипировки (40 семейств из Item Codex)', [
    el('p', { class: 'muted', text: `Показано семейств: ${fams.length}. Для каждого — имена по тирам T1→T6 (и A1 после пробуждения), имплисит по тирам, совместимые аффиксы и условия выпадения.` }),
    el('div', { class: 'scroll' }, blocks.length ? blocks : [el('p', { text: 'Ничего не найдено — измените фильтры.' })]),
  ]);
}

function familyBlock(f) {
  const cls = CLASSES.find((c) => c.id === f.cls);
  const classLabel = cls ? `${cls.ru} (${cls.name})` : 'Все классы';
  const names = (f.tierNames || []).map((n, i) => [(i < 6 ? RARITY[i]?.tier : 'A1'), n]);
  return el('details', {}, [
    el('summary', {}, [
      el('b', { text: `${f.name} — ${f.ru}` }),
      el('span', { class: 'muted', text: `  · ${classLabel} · ${SLOT_RU[f.slot]} · ${f.hand === '2H' ? 'двуручное' : f.hand === '1H' ? 'одноручное' : f.hand === 'Off' ? 'оффхенд' : '—'} · открытие: ${f.unlock}` }),
    ]),
    el('p', { class: 'muted', text: f.note || '' }),
    el('div', { class: 'grid cols-2' }, [
      el('div', {}, [
        el('h3', { text: 'Имена по тирам' }),
        table(['Тир', 'Название'], names),
      ]),
      el('div', {}, [
        el('h3', { text: `Имплисит: ${f.implicit}` }),
        table(['Тир', 'Значение'], RARITY.map((r, i) => [r.tier, f.implicitTiers[i]]).concat([['A1', 'после пробуждения — следующий диапазон']])),
        el('h3', { text: 'Совместимые аффиксы' }),
        chips([
          ...(f.prefixes || []).map((p) => ({ text: p, kind: 'gold' })),
          ...(f.suffixes || []).map((s) => ({ text: s, kind: '' })),
        ]),
      ]),
    ]),
  ]);
}

/* ---------------------------------- Аффиксы ---------------------------------- */

function affixCard() {
  const rows = AFFIXES.filter((a) => match(a.name, a.stat, a.ru, a.slots.join(' ')))
    .map((a) => [a.type === 'prefix' ? 'Префикс' : 'Суффикс', a.name, a.ru, a.base, a.slots.join(', ')]);
  return card('Аффиксы предметов', [
    el('p', { class: 'muted', text: `Базовый ролл × множитель редкости: ${RARITY.map((r) => `${r.tier} ${r.ru} ×${r.mult}`).join(', ')}. Плюс +3% за каждый +уровень предмета.` }),
    el('div', { class: 'scroll' }, [table(['Тип', 'Аффикс', 'Стат', 'Базовый ролл', 'Слоты'], rows.length ? rows : [['—', '—', '—', '—', 'Ничего не найдено']])]),
  ]);
}

function dropBonusCard() {
  const head = ['Бонус', 'Стат', 'Мин. тир', ...DROP_BONUS_TIER_LABELS];
  const rows = DROP_BONUSES.filter((d) => match(d.name, d.stat, d.ru, d.note, d.cat))
    .map((d) => [[d.name, el('span', { class: 'tag', text: d.cat })], d.ru, d.min, ...d.values]);
  const notes = DROP_BONUSES.filter((d) => d.note).filter((d) => match(d.name, d.note));
  return card('Drop Bonuses (T2 → T9)', [
    el('p', { class: 'muted', text: `Категории: ${DROP_BONUS_CATEGORIES.join(', ')}. T7–T9 появляются только на Gilded / Radiant / Mythic дропе (с ML 260).` }),
    el('div', { class: 'scroll' }, [table(head, rows.length ? rows : [['—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—']])]),
    el('h3', { text: 'Важные нюансы' }),
    el('ul', { class: 'tight' }, notes.map((d) => el('li', { text: `${d.name}: ${d.note}` }))),
  ]);
}

/* ----------------------------------- Гемы ----------------------------------- */

function gemCard() {
  const famRows = GEM_FAMILIES.filter((f) => match(f.name, f.ru, JSON.stringify(f.slots)))
    .map((f) => [f.ru, f.slots.weapon, f.slots.torch, f.slots.armor, f.slots.jewelry]);
  return card('Гемы и сокеты', [
    table(['Семья', 'Оружие', 'Torch', 'Броня', 'Украшения'], famRows.length ? famRows : [['—', '—', '—', '—', '—']]),
    el('h3', { text: 'Вторичные статы по редкости' }),
    el('div', { class: 'scroll' }, [table(['Стат', 'Cut', 'Polished', 'Brilliant', 'Flawless'], GEM_SECONDARY.map((s) => [s.ru, `+${s.cut}`, `+${s.polished}`, `+${s.brilliant}`, `+${s.flawless}`]))]),
    el('h3', { text: 'Открытие и уровни сокетов' }),
    (() => {
      const rows = GEM_SOCKET_UNLOCKS.map((s) => [s.socket, s.ml, s.gold]);
      return table(['Сокет', 'ML', 'Золото'], rows);
    })(),
    el('div', { class: 'scroll' }, [table(['Ур. сокета', 'Множитель', 'Золото'], GEM_SOCKET_LEVELS.map((s) => [s.level, `×${s.mult.toFixed(2)}`, s.gold]))]),
    el('h3', { text: 'Дроп гемов по ML' }),
    el('div', { class: 'scroll' }, [table(['ML', 'Rough', 'Cut', 'Polished', 'Brilliant'], GEM_DROP_TABLE.map((t) => [t.ml, `${t.rough}%`, `${t.cut}%`, `${t.polished}%`, `${t.brilliant}%`]))]),
  ]);
}

/* ------------------------------ Классовые навыки ------------------------------ */

function classSkillsCard() {
  const blocks = CLASSES.map((c) => {
    const rows = c.skills.filter((s) => match(s.name, s.ru, s.text, c.name))
      .map((s) => [
        `${s.branch || '—'} · T${s.tier ?? '?'}`,
        el('div', {}, [el('b', { text: s.name }), s.unverified ? el('span', { class: 'tag', text: 'не подтверждено' }) : null]),
        `до ${s.max}`,
        s.text,
      ]);
    if (!rows.length) return null;
    return el('details', {}, [
      el('summary', { text: `${c.ru} (${c.name}) — ${c.role}` }),
      table(['Ветка/тир', 'Навык', 'Макс', 'Эффект (за очко)'], rows),
    ]);
  }).filter(Boolean);
  return card('Классовые навыки (5 классов)', [
    el('p', { class: 'muted', text: `${CLASS_SKILL_RULES.note} Tier 2 — после 5 очков в ветке, Tier 3 — после 10.` }),
    el('div', { class: 'scroll' }, blocks.length ? blocks : [el('p', { text: 'Ничего не найдено.' })]),
  ]);
}

/* ------------------------------- Прочие системы ------------------------------- */

function talismanCard() {
  return card('Талисманы', [
    table(['Тип', 'Name', 'Статы', 'Ур.0 → Ур.9 (стат 1)', 'Ур.0 → Ур.9 (стат 2)'],
      TALISMANS.types.map((t) => [t.ru, t.name, t.stats, t.levels[0][1] + ' → ' + t.levels[9][1], t.levels[0][2] + ' → ' + t.levels[9][2]])),
    el('h3', { text: 'Sacrifice Bonuses (после +9, 8 шт.)' }),
    table(['Стат', 'Значение'], TALISMANS.sacrificeBonuses.map((s) => [s.stat, s.value])),
    el('h3', { text: 'Inscriptions' }),
    el('p', { class: 'muted', text: `Шансы: ${TALISMANS.inscription.odds.map(([q, p]) => `${q} ${p}%`).join(', ')}. ${TALISMANS.inscription.guarantees} ${TALISMANS.inscription.stacking}` }),
    el('div', { class: 'scroll' }, [table(['Аффикс', 'Common', 'Greater', 'Perfect', 'Шанс'], TALISMANS.inscription.affixes.map((a) => [a.affix, a.values[0], a.values[1], a.values[2], a.chance]))]),
    el('p', { class: 'muted', text: TALISMANS.infusion }),
  ]);
}

function petCard() {
  return card('Петы', [
    table(['Редкость', 'Шанс хэтча', 'Открытие', 'Пул бонусов', 'Шанс бонуса'], PETS.hatch.map((h) => [h.rarity, `${h.chance}%`, h.unlock, h.bonusPool || '—', h.perBonus ? `${h.perBonus}%` : '—'])),
    el('p', { class: 'muted', text: `Pity: Epic — в ${PETS.pity.epic} хэтчах, Legendary — в ${PETS.pity.legendary}. Слотов: ${PETS.slots}.` }),
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
  return card('Прогрессия, дроп, биомы, активности', [
    el('h3', { text: 'Дроп редкостей по Monster Level' }),
    el('div', { class: 'scroll' }, [table(['До ML', 'Normal', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Infernal'],
      DROP_TIER_TABLE.map((t) => [t.upTo >= 9999 ? '999+' : t.upTo, `${t.normal}%`, `${t.uncommon}%`, `${t.rare}%`, `${t.epic}%`, `${t.legendary}%`, `${t.infernal}%`]))]),
    el('h3', { text: 'Тиры предметов и апгрейды' }),
    table(['Тир', 'Макс. +ур.', 'Аффиксов', 'Фрагмент', 'Полный тир: золото', 'Фрагменты'], ITEM_TIERS.map((t) => [t.tier + ' ' + t.ru, t.maxPlus, t.affixes, t.fragment, t.fullGold, t.fullFragments])),
    el('h3', { text: 'Открытия по ML' }),
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
    el('ul', { class: 'tight' }, [el('li', { text: RUNES.grid }), el('li', { text: RUNES.reroll }), el('li', { text: RUNES.note })]),
    el('h3', { text: 'Смена класса' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: CLASS_CHANGE.cost }), el('li', { text: CLASS_CHANGE.cooldown }),
      el('li', { text: CLASS_CHANGE.restriction }), el('li', { text: CLASS_CHANGE.gear }),
    ]),
  ]);
}

function seasonCard() {
  return card('Season 2 и её системы', [
    table(['Система', 'Как работает'], SEASON2_SYSTEMS.map((s) => [s.name, s.details])),
    el('h3', { text: 'Классовые очки по уровням' }),
    el('div', { class: 'scroll' }, [table(['Уровень персонажа', 'Классовых очков'], [1, 4, 7, 10, 13, 16, 19, 22, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((l) => [l, classPointsForLevel(l)]))]),
  ]);
}
