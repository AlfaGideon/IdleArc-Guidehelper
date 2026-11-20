import { t as tr, isEnglish, bi } from '../i18n.js';
import { el, card, table, chips } from './dom.js';
import {
  AFFIXES, DROP_BONUSES, DROP_BONUS_TIER_LABELS, DROP_BONUS_CATEGORIES, RARITY,
  GEM_FAMILIES, GEM_RARITY, GEM_SECONDARY, GEM_SOCKET_UNLOCKS, GEM_SOCKET_LEVELS, GEM_DROP_TABLE,
  GEAR_FAMILIES, SLOT_ORDER, SLOT_RU, SLOT_EN, SLOT_GEM_REGION, DROP_TIER_TABLE, ITEM_TIERS, familiesForSlot,
} from '../data/items.js';
import { STATS, PRIMARY_ATTRS, STANCES, MASTERY, PETS, TALISMANS, RUNES, GUILD_TREE, PROGRESSION, CLASS_CHANGE, SEASON2_SYSTEMS } from '../data/systems.js';
import { CLASSES, CLASS_SKILL_RULES, classPointsForLevel } from '../data/classes.js';

const filter = { query: '', cls: 'all', slot: 'all' };

export const getViewState = () => ({ ...filter });

export function restoreViewState(snapshot) {
  if (!snapshot) return;
  if (typeof snapshot.query === 'string') filter.query = snapshot.query;
  if (snapshot.cls === 'all' || CLASSES.some((c) => c.id === snapshot.cls)) filter.cls = snapshot.cls;
  if (snapshot.slot === 'all' || SLOT_ORDER.includes(snapshot.slot)) filter.slot = snapshot.slot;
}

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
  return card(tr('Поиск по предметам и системам', 'Search items and systems'), [
    el('div', { class: 'controls' }, [
      el('div', {}, [el('label', { text: tr('Поиск', 'Search') }),
        el('input', { type: 'text', placeholder: tr('Например: великий меч, Dagger, Quiver, Wardplate, Fierce…', 'Try Greatsword, Dagger, Quiver, Wardplate, Fierce…'), value: filter.query,
          oninput: (e) => { filter.query = e.target.value; render(root); } })]),
      el('div', {}, [el('label', { text: tr('Класс', 'Class') }),
        el('select', { onchange: (e) => { filter.cls = e.target.value; render(root); } },
          [{ v: 'all', t: tr('Все классы', 'All classes') }, ...CLASSES.map((c) => ({ v: c.id, t: bi(c.ru, c.name) }))]
            .map((o) => el('option', { value: o.v, selected: filter.cls === o.v ? 'selected' : null }, [o.t])))]),
      el('div', {}, [el('label', { text: tr('Слот', 'Slot') }),
        el('select', { onchange: (e) => { filter.slot = e.target.value; render(root); } },
          [{ v: 'all', t: tr('Все слоты', 'All slots') }, ...SLOT_ORDER.map((s) => ({ v: s, t: bi(SLOT_RU[s], SLOT_EN[s] || s) }))]
            .map((o) => el('option', { value: o.v, selected: filter.slot === o.v ? 'selected' : null }, [o.t])))]),
    ]),
    el('p', { class: 'muted', text: tr('Данные — снапшот Item Codex и wiki на 04.10.2026 (патч 1.3.1).', 'Item Codex and wiki snapshot from October 4, 2026 (patch 1.3.1).') }),
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
        el('strong', { text: tr(`${SLOT_RU[slot]} · ${bySlot[slot].length} семейств`, `${SLOT_RU[slot]} · Families: ${bySlot[slot].length}`) }),
        el('div', { class: 'chips' }, [el('span', { class: 'chip', text: tr(`гем: ${SLOT_GEM_REGION[slot]}`, `Gem: ${SLOT_GEM_REGION[slot]}`) })]),
      ]),
      families,
    ]);
  });

  return card(tr('Каталог экипировки (40 семейств из Item Codex)', 'Equipment catalog (40 Item Codex families)'), [
    el('p', { class: 'muted', text: tr(
      `Показано семейств: ${fams.length}. Для каждого — имена по тирам T1→T6 (и A1 после пробуждения), имплисит по тирам, совместимые аффиксы и условия выпадения.`,
      `Families shown: ${fams.length}. Each lists item names from T1 to T6 and A1 after awakening, implicit values by tier, compatible affixes, and drop requirements.`,
    ) }),
    el('div', { class: 'scroll' }, blocks.length ? blocks : [el('p', { text: tr('Ничего не найдено — измените фильтры.', 'No matches. Try changing your filters.') })]),
  ]);
}

function familyBlock(f) {
  const cls = CLASSES.find((c) => c.id === f.cls);
  const classLabel = cls ? bi(cls.ru, cls.name) : tr('Все классы', 'All classes');
  const names = (f.tierNames || []).map((n, i) => [(i < 6 ? RARITY[i]?.tier : 'A1'), n]);
  return el('details', {}, [
    el('summary', {}, [
      el('b', { text: bi(f.ru, f.name) }),
      el('span', { class: 'muted', text: tr(
        `  · ${classLabel} · ${bi(SLOT_RU[f.slot], (SLOT_EN[f.slot] || f.slot))} · ${f.hand === '2H' ? 'двуручное' : f.hand === '1H' ? 'одноручное' : f.hand === 'Off' ? 'оффхенд' : '—'} · открытие: ${f.unlock}`,
        `  · ${classLabel} · ${bi(SLOT_RU[f.slot], (SLOT_EN[f.slot] || f.slot))} · ${f.hand === '2H' ? 'two-handed' : f.hand === '1H' ? 'one-handed' : f.hand === 'Off' ? 'off-hand' : '—'} · Unlock: ${f.unlock}`,
      ) }),
    ]),
    el('p', { class: 'muted', text: f.note || '' }),
    el('div', { class: 'grid cols-2' }, [
      el('div', {}, [
        el('h3', { text: tr('Имена по тирам', 'Names by tier') }),
        table([tr('Тир', 'Tier'), tr('Название', 'Name')], names),
      ]),
      el('div', {}, [
        el('h3', { text: tr(`Имплисит: ${f.implicit}`, `Implicit: ${f.implicit}`) }),
        table([tr('Тир', 'Tier'), tr('Значение', 'Value')], RARITY.map((r, i) => [`${r.tier} ${bi(r.ru, r.name)}`, f.implicitTiers[i]]).concat([['A1', tr('после пробуждения — следующий диапазон', 'Next range after awakening')]])),
        el('h3', { text: tr('Совместимые аффиксы', 'Compatible affixes') }),
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
    .map((a) => [a.type === 'prefix' ? tr('Префикс (Prefix)', 'Prefix') : tr('Суффикс (Suffix)', 'Suffix'), a.name, a.ru, a.base, a.slots.join(', ')]);
  return card(tr('Аффиксы предметов', 'Item affixes'), [
    el('p', { class: 'muted', text: (isEnglish ? `Base roll × rarity multiplier: ${RARITY.map((r) => `${r.tier} ${r.ru} ×${r.mult}`).join(', ')}. Each item upgrade level adds 3%.` : `Базовый ролл × множитель редкости: ${RARITY.map((r) => `${r.tier} ${r.ru} ×${r.mult}`).join(', ')}. Плюс +3% за каждый +уровень предмета.`) }),
    el('div', { class: 'scroll' }, [table([tr('Тип', 'Type'), tr('Аффикс', 'Affix'), tr('Стат', 'Stat'), tr('Базовый ролл', 'Base roll'), tr('Слоты', 'Slots')], rows.length ? rows : [['—', '—', '—', '—', tr('Ничего не найдено', 'No matches')]])]),
  ]);
}

function dropBonusCard() {
  const head = [tr('Бонус (RU (EN))', 'Bonus'), tr('Стат в игре', 'In-game stat'), tr('Мин. тир', 'Min. tier'), ...DROP_BONUS_TIER_LABELS];
  const rows = DROP_BONUSES.filter((d) => match(d.name, d.stat, d.ru, d.note, d.cat))
    .map((d) => [el('div', {}, [el('b', { text: bi(d.ru, d.name) }), el('span', { class: 'tag', text: d.cat })]), d.stat, d.min, ...d.values]);
  const notes = DROP_BONUSES.filter((d) => d.note).filter((d) => match(d.name, d.note));
  return card('Drop Bonuses (T2 → T9)', [
    el('p', { class: 'muted', text: tr(
      `Категории: ${DROP_BONUS_CATEGORIES.join(', ')}. T7–T9 появляются только на Gilded / Radiant / Mythic дропе (с ML 260).`,
      `Categories: ${DROP_BONUS_CATEGORIES.join(', ')}. T7–T9 bonuses appear only on Gilded, Radiant, or Mythic drops, starting at ML 260.`,
    ) }),
    el('div', { class: 'scroll' }, [table(head, rows.length ? rows : [['—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—']])]),
    el('h3', { text: tr('Важные нюансы', 'Bonus details') }),
    el('ul', { class: 'tight' }, notes.map((d) => el('li', { text: `${bi(d.ru, d.name)}: ${d.note}` }))),
  ]);
}

/* ----------------------------------- Гемы ----------------------------------- */

function gemCard() {
  const famRows = GEM_FAMILIES.filter((f) => match(f.name, f.ru, JSON.stringify(f.slots)))
    .map((f) => [bi(f.ru, f.name), f.slots.weapon, f.slots.torch, f.slots.armor, f.slots.jewelry]);
  return card(tr('Гемы и сокеты', 'Gems and sockets'), [
    table([tr('Семья', 'Family'), tr('Оружие', 'Weapon'), 'Torch', tr('Броня', 'Armor'), tr('Украшения', 'Jewelry')], famRows.length ? famRows : [['—', '—', '—', '—', '—']]),
    el('h3', { text: tr('Вторичные статы по редкости', 'Secondary stats by rarity') }),
    el('div', { class: 'scroll' }, [table([tr('Стат', 'Stat'), 'Cut', 'Polished', 'Brilliant', 'Flawless'], GEM_SECONDARY.map((s) => [bi(s.ru, s.stat), `+${s.cut}`, `+${s.polished}`, `+${s.brilliant}`, `+${s.flawless}`]))]),
    el('h3', { text: tr('Открытие и уровни сокетов', 'Socket unlocks and levels') }),
    (() => {
      const rows = GEM_SOCKET_UNLOCKS.map((s) => [s.socket, s.ml, s.gold]);
      return table([tr('Сокет', 'Socket'), 'Monster Level', tr('Золото', 'Gold')], rows);
    })(),
    el('div', { class: 'scroll' }, [table([tr('Ур. сокета', 'Socket level'), tr('Множитель', 'Multiplier'), tr('Золото', 'Gold')], GEM_SOCKET_LEVELS.map((s) => [s.level, `×${s.mult.toFixed(2)}`, s.gold]))]),
    el('h3', { text: tr('Дроп гемов по ML', 'Gem drops by Monster Level') }),
    el('div', { class: 'scroll' }, [table(['ML', 'Rough', 'Cut', 'Polished', 'Brilliant'], GEM_DROP_TABLE.map((t) => [t.ml, `${t.rough}%`, `${t.cut}%`, `${t.polished}%`, `${t.brilliant}%`]))]),
  ]);
}

/* ------------------------------ Классовые навыки ------------------------------ */

function classSkillsCard() {
  const blocks = CLASSES.map((c) => {
    const rows = c.skills.filter((s) => match(s.name, s.ru, s.text, c.name))
      .map((s) => [
        `${s.branch || '—'} · T${s.tier ?? '?'}`,
        el('div', {}, [
          el('b', { text: bi(s.ru, s.name) }),
          s.requires ? el('span', { class: 'muted small', text: tr(' (нужно вложить очко в навык-предусловие)', ' (requires a point in the prerequisite skill)') }) : null,
        ]),
        tr(`макс. ${s.max}`, `Max. ${s.max}`),
        el('div', {}, [
          el('div', { text: s.text }),
          s.s2 ? el('div', { class: 'muted small', text: 'Season 2: ' + s.s2 }) : null,
        ]),
      ]);
    if (!rows.length) return null;
    return el('details', {}, [
      el('summary', { text: `${bi(c.ru, c.name)} — ${c.role}` }),
      table([tr('Ветка/тир', 'Branch / tier'), tr('Навык', 'Skill'), tr('Макс. ранг', 'Max. rank'), tr('Эффект (за очко)', 'Effect per point')], rows),
    ]);
  }).filter(Boolean);
  return card(tr('Классовые навыки (5 классов)', 'Class skills (5 classes)'), [
    el('p', { class: 'muted', text: tr(
      `${CLASS_SKILL_RULES.note} Tier 2 — после 5 очков в этой же ветке, Tier 3 — после 10; у Druid это ветки Lodge / Tunnels / Symbiosis. Ветки, тиры и максимальные ранги всех 90 навыков сверены с данными текущего билда игры.`,
      `${CLASS_SKILL_RULES.note} Tier 2 requires 5 points in the same branch, and Tier 3 requires 10. The Druid branches are Lodge, Tunnels, and Symbiosis. Branches, tiers, and maximum ranks for all 90 skills were checked against the game build used for this guide.`,
    ) }),
    el('div', { class: 'scroll' }, blocks.length ? blocks : [el('p', { text: tr('Ничего не найдено.', 'No matches.') })]),
  ]);
}

/* ------------------------------- Прочие системы ------------------------------- */

function talismanCard() {
  return card(tr('Талисманы', 'Talismans'), [
    table([...(isEnglish ? ['Name'] : ['Тип (RU (EN))', 'Name']), tr('Статы', 'Stats'), tr('Ур.0 → Ур.9 (стат 1)', 'Level 0 → 9 (stat 1)'), tr('Ур.0 → Ур.9 (стат 2)', 'Level 0 → 9 (stat 2)')],
      TALISMANS.types.map((t) => [...(isEnglish ? [t.name] : [bi(t.ru, t.name), t.name]), t.stats, t.levels[0][1] + ' → ' + t.levels[9][1], t.levels[0][2] + ' → ' + t.levels[9][2]])),
    el('h3', { text: tr('Sacrifice Bonuses (после +9, 8 шт.)', 'Sacrifice bonuses (8 available after +9)') }),
    table([tr('Стат', 'Stat'), tr('Значение', 'Value')], TALISMANS.sacrificeBonuses.map((s) => [s.stat, s.value])),
    el('h3', { text: 'Inscriptions' }),
    el('p', { class: 'muted', text: (isEnglish ? `Odds: ${TALISMANS.inscription.odds.map(([q, p]) => `${q} ${p}%`).join(', ')}. ${TALISMANS.inscription.guarantees} ${TALISMANS.inscription.stacking}` : `Шансы: ${TALISMANS.inscription.odds.map(([q, p]) => `${q} ${p}%`).join(', ')}. ${TALISMANS.inscription.guarantees} ${TALISMANS.inscription.stacking}`) }),
    el('div', { class: 'scroll' }, [table([tr('Аффикс', 'Affix'), 'Common', 'Greater', 'Perfect', tr('Шанс', 'Chance')], TALISMANS.inscription.affixes.map((a) => [a.affix, a.values[0], a.values[1], a.values[2], a.chance]))]),
    el('p', { class: 'muted', text: TALISMANS.infusion }),
  ]);
}

function petCard() {
  return card(tr('Петы', 'Pets'), [
    table([tr('Редкость', 'Rarity'), tr('Шанс хэтча', 'Hatch chance'), tr('Открытие', 'Unlock'), tr('Пул бонусов', 'Possible bonuses'), tr('Шанс бонуса', 'Chance per bonus')], PETS.hatch.map((h) => [h.rarity, `${h.chance}%`, h.unlock, h.bonusPool || '—', h.perBonus ? `${h.perBonus}%` : '—'])),
    el('p', { class: 'muted', text: tr(
      `Pity: Epic — в ${PETS.pity.epic} хэтчах, Legendary — в ${PETS.pity.legendary}. Слотов: ${PETS.slots}.`,
      `Pity guarantees an Epic within ${PETS.pity.epic} hatches and a Legendary within ${PETS.pity.legendary}. Pet slots: ${PETS.slots}.`,
    ) }),
    el('h3', { text: tr('Капы компоунда', 'Compound caps') }),
    table([tr('Редкость', 'Rarity'), tr('Кап', 'Cap')], PETS.compoundCaps.map((c) => [c.rarity, c.cap])),
    el('p', { class: 'muted', text: PETS.compoundBalance }),
    el('h3', { text: tr('Скейл шардовых аффиксов', 'Shard affix scaling') }),
    el('div', { class: 'scroll' }, [table([tr('Аффикс', 'Affix'), tr('База', 'Base'), tr('За уровень', 'Per level'), tr('Кап', 'Cap')], PETS.shardAffixes.map((a) => [a.affix, a.base, a.perLevel, a.cap]))]),
  ]);
}

function statsCard() {
  return card(tr('Статы, атрибуты, стойки', 'Stats, attributes, and stances'), [
    table([...(isEnglish ? ['Stat'] : ['Стат (RU)', 'Stat (EN)']), tr('Что делает', 'Effect')], STATS.filter((s) => match(s.name, s.ru, s.desc)).map((s) => [...(isEnglish ? [s.name] : [s.ru, s.name]), s.desc || '—'])),
    el('h3', { text: tr('Первичные атрибуты (за 1 пункт)', 'Primary attributes (per point)') }),
    table([tr('Атрибут', 'Attribute'), tr('Эффекты', 'Effects')], PRIMARY_ATTRS.map((a) => [bi(a.ru, a.name), a.perPoint.join(' · ')])),
    el('h3', { text: tr('Стойки', 'Stances') }),
    table([tr('Стойка', 'Stance'), tr('Фокус', 'Focus'), tr('Когда брать', 'When to use'), tr('Нюанс', 'Notes')], STANCES.map((s) => [bi(s.ru, s.name), s.focus, s.best, s.note])),
    el('h3', { text: 'Mastery' }),
    el('p', { class: 'muted', text: MASTERY.bossRule + ' ' + MASTERY.elementNote }),
    table([tr('Ур.', 'Level'), tr('Бонус', 'Bonus'), tr('Всего шардов', 'Total shards')], MASTERY.table.map((m) => [m.level, `${m.bonus}%`, m.total])),
  ]);
}

function progressionCard() {
  return card(tr('Прогрессия, дроп, биомы, активности', 'Progression, drops, biomes, and activities'), [
    el('h3', { text: tr('Дроп редкостей по Monster Level', 'Drop rarity by Monster Level') }),
    el('div', { class: 'scroll' }, [table([tr('До ML', 'Up to ML'), 'Normal', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Infernal'],
      DROP_TIER_TABLE.map((t) => [t.upTo >= 9999 ? '999+' : t.upTo, `${t.normal}%`, `${t.uncommon}%`, `${t.rare}%`, `${t.epic}%`, `${t.legendary}%`, `${t.infernal}%`]))]),
    el('h3', { text: tr('Тиры предметов и апгрейды', 'Item tiers and upgrades') }),
    table([tr('Тир', 'Tier'), tr('Макс. +ур.', 'Max. upgrade'), tr('Аффиксов', 'Affixes'), tr('Фрагмент', 'Fragment'), tr('Полный тир: золото', 'Gold for full tier'), tr('Фрагменты', 'Fragments')], ITEM_TIERS.map((t) => [`${t.tier} ${bi(t.ru, t.name)}`, t.maxPlus, t.affixes, t.fragment, t.fullGold, t.fullFragments])),
    el('h3', { text: tr('Открытия по ML', 'Monster Level unlocks') }),
    table(['ML', tr('Что открывается', 'Unlocks')], PROGRESSION.mlUnlocks.filter((m) => match(m.what, m.ml)).map((m) => [m.ml, m.what])),
    el('p', { class: 'muted', text: PROGRESSION.fightingLevel + ' ' + PROGRESSION.mlProgress }),
    el('h3', { text: tr('Биомы', 'Biomes') }),
    table([tr('Биом', 'Biome'), 'ML', tr('Тир', 'Tier')], PROGRESSION.biomes.filter((b) => match(b.name, b.tier)).map((b) => [b.name, b.ml, b.tier])),
    el('h3', { text: 'The Convergence (ML 350)' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: PROGRESSION.convergence.seats }),
      el('li', { text: PROGRESSION.convergence.wild }),
      el('li', { text: PROGRESSION.convergence.tier }),
      el('li', { text: tr('Формулы тира: ', 'Tier formulas: ') + PROGRESSION.convergence.formulas.join('; ') }),
      el('li', { text: PROGRESSION.convergence.elites }),
      el('li', { text: PROGRESSION.convergence.lattice }),
    ]),
    el('h3', { text: tr('Активности', 'Activities') }),
    table([tr('Активность', 'Activity'), tr('Открытие', 'Unlock'), tr('Детали', 'Details')], PROGRESSION.activities.filter((a) => match(a.name, a.details)).map((a) => [a.name, a.unlock, a.details])),
  ]);
}

function guildCard() {
  return card(tr('Гильдия, руны, смена класса', 'Guild, runes, and class changes'), [
    el('h3', { text: 'Guild Skill Tree' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: GUILD_TREE.pointsRule }),
      el('li', { text: GUILD_TREE.rankGates }),
      el('li', { text: tr(`Ascension открывается после ${GUILD_TREE.ascension.at} очков. ${GUILD_TREE.ascension.note}`, `Ascension unlocks after ${GUILD_TREE.ascension.at} points. ${GUILD_TREE.ascension.note}`) }),
      el('li', { text: GUILD_TREE.staircase }),
      el('li', { text: GUILD_TREE.boost }),
      el('li', { text: GUILD_TREE.reset }),
    ]),
    table([tr('Семейство', 'Family'), tr('Бонус', 'Bonus'), tr('Ранг 1', 'Rank 1')], GUILD_TREE.nodes.map((n) => [n.family, n.bonus, n.rank1])),
    el('h3', { text: tr('Руны', 'Runes') }),
    el('ul', { class: 'tight' }, [el('li', { text: RUNES.grid }), el('li', { text: RUNES.reroll }), el('li', { text: RUNES.note })]),
    el('h3', { text: tr('Смена класса', 'Class changes') }),
    el('ul', { class: 'tight' }, [
      el('li', { text: CLASS_CHANGE.cost }), el('li', { text: CLASS_CHANGE.cooldown }),
      el('li', { text: CLASS_CHANGE.restriction }), el('li', { text: CLASS_CHANGE.gear }),
    ]),
  ]);
}

function seasonCard() {
  return card(tr('Season 2 и её системы', 'Season 2 systems'), [
    table([tr('Система', 'System'), tr('Как работает', 'How it works')], SEASON2_SYSTEMS.map((s) => [s.name, s.details])),
    el('h3', { text: tr('Классовые очки по уровням', 'Class skill points by level') }),
    el('div', { class: 'scroll' }, [table([tr('Уровень персонажа', 'Character level'), tr('Классовых очков', 'Class skill points')], [1, 4, 7, 10, 13, 16, 19, 22, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((l) => [l, classPointsForLevel(l)]))]),
  ]);
}
