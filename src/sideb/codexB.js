/**
 * Codex стороны B — справочник «Browse reference data»: левое меню категорий,
 * поиск по категории, таблицы в стиле компаньона. Данные — снапшот Guide Helper.
 */
import { el } from '../ui/dom.js';
import { bi, chip, panel, bTable, rarityChip } from './ui.js';
import {
  AFFIXES, DROP_BONUSES, DROP_BONUS_TIER_LABELS, DROP_BONUS_CATEGORIES,
  GEM_FAMILIES, GEM_SECONDARY, GEM_SOCKET_UNLOCKS, GEM_SOCKET_LEVELS, GEM_DROP_TABLE,
  GEAR_FAMILIES, SLOT_ORDER, SLOT_RU, SLOT_EN, DROP_TIER_TABLE, ITEM_TIERS, RARITY,
} from '../data/items.js';
import {
  STATS, PRIMARY_ATTRS, STANCES, MASTERY, PETS, TALISMANS, RUNES, GUILD_TREE,
  PROGRESSION, CLASS_CHANGE, SEASON2_SYSTEMS,
} from '../data/systems.js';
import { BIOMES } from '../data/biomes.js';
import { artNode, loadArt } from '../ui/art.js';
import { sidebState } from './sideb.js';

const CATS = [
  { id: 'items', icon: '🗡', title: 'Items', ru: 'Предметы' },
  { id: 'affixes', icon: '◐', title: 'Affixes', ru: 'Аффиксы' },
  { id: 'drops', icon: '✚', title: 'Drop Bonuses', ru: 'Дроп-бонусы' },
  { id: 'gems', icon: '◆', title: 'Gems', ru: 'Гемы' },
  { id: 'pets', icon: '🐾', title: 'Pets & Talismans', ru: 'Петы и талисманы' },
  { id: 'stats', icon: 'Σ', title: 'Stats & Formulas', ru: 'Статы и формулы' },
  { id: 'progress', icon: '⇧', title: 'Progression', ru: 'Прогрессия и биомы' },
  { id: 'guild', icon: '⚜', title: 'Guild & Season 2', ru: 'Гильдия и сезон' },
];

const ST = () => sidebState.codex;
const match = (q, ...fields) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => String(f || '').toLowerCase().includes(needle));
};

/* --------------------------------- Items --------------------------------- */

function familyRow(f, q) {
  const cls = el('span', { class: 'b-note', text: f.cls === 'all' ? 'все классы' : f.cls });
  void q;
  return el('details', { class: 'b-item' }, [
    el('summary', {}, [
      el('span', { class: 'b-item-ic' }, [artNode(f, 3, 0, { size: 44 })]),
      el('span', { class: 'b-item-main' }, [
        el('b', { text: bi(f.ru, f.name) }),
        el('span', { class: 'b-note', text: `имплисит: ${f.implicit} · ${f.unlock}` }),
      ]),
      cls,
      el('span', { class: 'b-caret', text: '›' }),
    ]),
    el('div', { class: 'b-item-body' }, [
      el('div', { class: 'b-two' }, [
        el('div', {}, [
          el('h3', { class: 'b-h3', text: 'Имена по тирам' }),
          bTable(['Тир', 'Название'], (f.tierNames || []).map((n, i) => [i < 6 ? RARITY[i].tier : 'A1', n])),
        ]),
        el('div', {}, [
          el('h3', { class: 'b-h3', text: `Имплисит: ${f.implicit}` }),
          bTable(['Тир', 'Значение'], RARITY.map((r, i) => [`${r.tier} ${bi(r.ru, r.name)}`, f.implicitTiers[i] || '—'])),
          el('h3', { class: 'b-h3', text: 'Аффиксы' }),
          el('div', { class: 'b-chip-row' }, [
            ...(f.prefixes || []).map((p) => chip(p, 'gold')),
            ...(f.suffixes || []).map((s) => chip(s)),
          ]),
        ]),
      ]),
      f.note ? el('p', { class: 'b-note', text: f.note }) : null,
    ]),
  ]);
}

function itemsCat(container, q) {
  const fams = GEAR_FAMILIES.filter((f) => match(q, f.name, f.ru, f.implicit, (f.tierNames || []).join(' '), (f.prefixes || []).join(' '), (f.suffixes || []).join(' ')));
  for (const slot of SLOT_ORDER) {
    const inSlot = fams.filter((f) => f.slot === slot);
    if (!inSlot.length) continue;
    container.appendChild(el('div', { class: 'b-cat-block' }, [
      el('h3', { class: 'b-cat-title', text: `${SLOT_RU[slot]} (${SLOT_EN[slot] || slot}) · ${inSlot.length}` }),
      ...inSlot.map((f) => familyRow(f, q)),
    ]));
  }
  if (!fams.length) container.appendChild(el('p', { class: 'b-note', text: 'Ничего не найдено — измените запрос.' }));
}

/* ------------------------------ остальные каты ------------------------------ */

function affixesCat(container, q) {
  const rows = AFFIXES.filter((a) => match(q, a.name, a.ru, a.stat, a.slots.join(' ')))
    .map((a) => [
      chip(a.type === 'prefix' ? 'Префикс' : 'Суффикс', a.type === 'prefix' ? 'gold' : ''),
      bi(a.ru, a.name), a.stat, a.base, a.slots.join(', '),
    ]);
  container.appendChild(panel(null, [
    el('p', { class: 'b-note', text: `Базовый ролл × множитель редкости (T6 ×2.5) · +3% за каждый +уровень предмета.` }),
    bTable(['Тип', 'Аффикс', 'Стат', 'Базовый ролл', 'Слоты'], rows.length ? rows : [['—', '—', '—', '—', '—']]),
  ]));
}

function dropsCat(container, q) {
  const rows = DROP_BONUSES.filter((d) => match(q, d.name, d.ru, d.stat, d.note, d.cat))
    .map((d) => [el('div', {}, [el('b', { text: bi(d.ru, d.name) }), el('div', { class: 'b-note', text: d.note || '' })]), d.stat, chip(d.cat), d.min, ...d.values]);
  container.appendChild(panel(null, [
    el('div', { class: 'b-chip-row' }, DROP_BONUS_CATEGORIES.map((c) => chip(c))),
    el('p', { class: 'b-note', text: 'T7–T9 появляются только на Gilded / Radiant / Mythic дропе (с ML 260).' }),
    bTable(['Бонус', 'Стат', 'Категория', 'Мин. тир', ...DROP_BONUS_TIER_LABELS], rows.length ? rows : [['—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—']]),
  ]));
}

function gemsCat(container, q) {
  void q;
  container.appendChild(panel('Семейства гемов (эффект зависит от слота)', [
    bTable(['Семья', 'Оружие', 'Torch', 'Броня', 'Украшения'],
      GEM_FAMILIES.map((f) => [bi(f.ru, f.name), f.slots.weapon, f.slots.torch, f.slots.armor, f.slots.jewelry])),
  ]));
  container.appendChild(panel('Вторичные статы по редкости', [
    bTable(['Стат', 'Cut', 'Polished', 'Brilliant', 'Flawless'],
      GEM_SECONDARY.map((s) => [bi(s.ru, s.stat), `+${s.cut}`, `+${s.polished}`, `+${s.brilliant}`, `+${s.flawless}`])),
    el('p', { class: 'b-note', text: 'Flawless — только дроп с ML 160. Формула ценности: base × rarity × (quality/100) × (1 + 0.04 × socket level).' }),
  ]));
  container.appendChild(panel('Сокеты', [
    bTable(['Сокет', 'ML открытия', 'Золото'], GEM_SOCKET_UNLOCKS.map((s) => [s.socket, s.ml, s.gold])),
    bTable(['Уровень сокета', 'Множитель', 'Золото'], GEM_SOCKET_LEVELS.map((s) => [s.level, `×${s.mult.toFixed(2)}`, s.gold])),
  ]));
  container.appendChild(panel('Дроп гемов по ML', [
    bTable(['ML', 'Rough', 'Cut', 'Polished', 'Brilliant'],
      GEM_DROP_TABLE.map((t) => [t.ml, `${t.rough}%`, `${t.cut}%`, `${t.polished}%`, `${t.brilliant}%`])),
  ]));
}

function petsCat(container, q) {
  const tRows = TALISMANS.types.filter((t) => match(q, t.name, t.ru, t.stats))
    .map((t) => [bi(t.ru, t.name), t.stats, `${t.levels[0][1]} → ${t.levels[9][1]}`, `${t.levels[0][2]} → ${t.levels[9][2]}`]);
  container.appendChild(panel('Петы', [
    bTable(['Редкость', 'Шанс хэтча', 'Открытие', 'Пул бонусов', 'За бонус'],
      PETS.hatch.map((h) => [h.rarity, `${h.chance}%`, h.unlock, h.bonusPool || '—', h.perBonus ? `${h.perBonus}%` : '—'])),
    el('p', { class: 'b-note', text: `Pity: Epic в ${PETS.pity.epic} хэтчах, Legendary в ${PETS.pity.legendary}. Слотов: ${PETS.slots}. ${PETS.compoundBalance}` }),
    bTable(['Редкость', 'Кап компоунда'], PETS.compoundCaps.map((c) => [c.rarity, c.cap])),
  ]));
  container.appendChild(panel('Талисманы (2 слота)', [
    bTable(['Тип', 'Статы', 'Ур.0 → Ур.9 (1)', 'Ур.0 → Ур.9 (2)'], tRows.length ? tRows : [['—', '—', '—', '—']]),
    el('p', { class: 'b-note', text: `Sacrifice после +9 (8 шт.): ${TALISMANS.sacrificeBonuses.map((s) => `${s.stat} ${s.value}`).join(', ')}. ${TALISMANS.infusion}` }),
  ]));
}

function statsCat(container) {
  container.appendChild(panel('Статы', [
    bTable(['Стат', 'Группа', 'Что делает'], STATS.map((s) => [bi(s.ru, s.name), s.group, s.desc || '—'])),
  ]));
  container.appendChild(panel('Атрибуты и стойки', [
    bTable(['Атрибут', 'Эффекты за пункт'], PRIMARY_ATTRS.map((a) => [bi(a.ru, a.name), a.perPoint.join(' · ')])),
    bTable(['Стойка', 'Фокус', 'Когда брать', 'Нюанс'], STANCES.map((s) => [bi(s.ru, s.name), s.focus, s.best, s.note])),
  ]));
  container.appendChild(panel('Mastery', [
    el('p', { class: 'b-note', text: MASTERY.bossRule + ' ' + MASTERY.elementNote }),
    bTable(['Уровень', 'Бонус', 'Всего шардов'], MASTERY.table.map((m) => [m.level, `${m.bonus}%`, m.total])),
  ]));
}

function progressCat(container) {
  container.appendChild(panel('Дроп редкостей по Monster Level', [
    bTable(['До ML', 'Normal', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Infernal'],
      DROP_TIER_TABLE.map((t) => [t.upTo >= 9999 ? '999+' : t.upTo, `${t.normal}%`, `${t.uncommon}%`, `${t.rare}%`, `${t.epic}%`, `${t.legendary}%`, `${t.infernal}%`])),
  ]));
  container.appendChild(panel('Тиры предметов', [
    el('div', { class: 'b-chip-row' }, ITEM_TIERS.map((t) => rarityChip(t.tier))),
    bTable(['Тир', 'Макс. +ур.', 'Аффиксов', 'Фрагмент', 'Полный тир: золото', 'Фрагменты'],
      ITEM_TIERS.map((t) => [`${t.tier} ${bi(t.ru, t.name)}`, t.maxPlus, t.affixes, t.fragment, t.fullGold, t.fullFragments])),
  ]));
  container.appendChild(panel('Открытия по ML и биомы', [
    bTable(['ML', 'Что открывается'], PROGRESSION.mlUnlocks.map((m) => [m.ml, m.what])),
    bTable(['Биом', 'ML', 'Тир слота'], BIOMES.map((b) => [bi(b.ru, b.name), b.ml, b.tier])),
  ]));
  container.appendChild(panel('Активности', [
    bTable(['Активность', 'Открытие', 'Детали'], PROGRESSION.activities.map((a) => [a.name, a.unlock, a.details])),
  ]));
}

function guildCat(container) {
  container.appendChild(panel('Guild Skill Tree', [
    el('div', { class: 'b-chip-row' }, [
      chip(GUILD_TREE.pointsRule), chip(GUILD_TREE.rankGates),
      chip(`Ascension после ${GUILD_TREE.ascension.at} очков`, 'gold'), chip(GUILD_TREE.boost),
    ]),
    bTable(['Семейство', 'Бонус', 'Ранг 1'], GUILD_TREE.nodes.map((n) => [n.family, n.bonus, n.rank1])),
  ]));
  container.appendChild(panel('Руны и смена класса', [
    el('p', { class: 'b-note', text: RUNES.grid + ' ' + RUNES.reroll + ' ' + RUNES.note }),
    bTable(['Смена класса', 'Правило'], [
      ['Цена', CLASS_CHANGE.cost], ['Кулдаун', CLASS_CHANGE.cooldown],
      ['Ограничение', CLASS_CHANGE.restriction], ['Снаряжение', CLASS_CHANGE.gear],
    ]),
  ]));
  container.appendChild(panel('Season 2: системы', [
    bTable(['Система', 'Как работает'], SEASON2_SYSTEMS.map((s) => [s.name, s.details])),
  ]));
}

/* --------------------------------- render --------------------------------- */

const CAT_RENDER = {
  items: itemsCat, affixes: affixesCat, drops: dropsCat, gems: gemsCat,
  pets: petsCat, stats: statsCat, progress: progressCat, guild: guildCat,
};

export function render(view) {
  const st = ST();
  loadArt();

  // Прыжок из поиска шапки: категория + запрос.
  if (sidebState.pendingJump && sidebState.pendingJump.page === 'codex') {
    if (sidebState.pendingJump.cat) st.cat = sidebState.pendingJump.cat;
    if (sidebState.pendingJump.query != null) st.query = sidebState.pendingJump.query;
    sidebState.pendingJump = null;
  }

  view.appendChild(el('div', { class: 'b-page-head' }, [
    el('h1', { text: 'Codex' }),
    el('p', { class: 'b-page-sub', text: 'Browse reference data — весь справочник снапшота патча 1.3.1 (Season 2).' }),
  ]));

  const menu = el('div', { class: 'b-codex-menu' }, CATS.map((c) => el('button', {
    class: `b-codex-cat ${st.cat === c.id ? 'active' : ''}`,
    onclick: () => { st.cat = c.id; render(view); },
  }, [
    el('span', { class: 'b-codex-ic', text: c.icon }),
    el('span', { class: 'b-codex-label' }, [el('b', { text: c.title }), el('span', { class: 'b-note', text: c.ru })]),
  ])));

  const content = el('div', { class: 'b-codex-content' });
  const search = el('input', {
    class: 'b-input b-codex-search', type: 'search',
    placeholder: 'Фильтр по категории…',
    value: st.query || '',
    oninput: (e) => { st.query = e.target.value; renderContent(content); },
  });
  CAT_RENDER[st.cat](content, (st.query || '').trim());
  content.insertBefore(search, content.firstChild);

  view.appendChild(el('div', { class: 'b-codex' }, [menu, content]));

  function renderContent(cnt) {
    const q = st.query || '';
    [...cnt.children].forEach((c) => { if (c !== search) c.remove(); });
    CAT_RENDER[st.cat](cnt, q.trim());
  }

  // Подсветка найденного из шапки.
  if (st.query) {
    setTimeout(() => {
      const q = st.query.toLowerCase();
      const nodes = view.querySelectorAll('.b-item summary b, .b-table td b');
      for (const n of nodes) {
        if ((n.textContent || '').toLowerCase().includes(q)) {
          const d = n.closest('details');
          if (d) d.open = true;
          const hop = n.closest('.b-item') || n.closest('tr') || n;
          hop.scrollIntoView({ block: 'center' });
          hop.classList.add('b-flash');
          setTimeout(() => hop.classList.remove('b-flash'), 1800);
          break;
        }
      }
    }, 0);
  }
}
