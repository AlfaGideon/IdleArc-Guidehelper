/**
 * Рекомендации сборки: система САМА выбирает предмет в каждый слот, камень, талисманы
 * и цель по Кузнице под выбранную цель (goal) — и объясняет, почему именно так.
 *
 * Логика:
 *   1) у каждой цели есть приоритет статов (statPriorityFor) — «что важнее всего»;
 *   2) у каждого семейства предметов есть имплисит (гарантированный стат) и список
 *      аффиксов, которые на нём могут выпасть;
 *   3) семейство оценивается по цели: имплисит весит больше (это гарантия), потенциальный
 *      аффикс — меньше. Побеждает семейство с наибольшим вкладом в приоритетные статы;
 *   4) по такому же весу строится порядок прокачки Кузницы: сначала слоты, которые дают
 *      самые важные для цели статы (факел с +All Class Skills — всегда первый в уроне).
 *
 * Всё считается из данных Item Codex (src/data/items.js) и правил целей (src/data/builds.js),
 * поэтому рекомендация меняется вместе с классом, целью и Monster Level.
 */
import {
  GEAR_CELLS, CLASS_GEAR_RULES, SLOT_GEM_REGION, SLOT_RU, SLOT_EN,
  GEAR_FAMILIES, AFFIXES, DROP_BONUSES, DROP_BONUS_SLOT_CATEGORIES,
  GEM_FAMILIES, GEM_SECONDARY, familyById, familyUnlockMl,
} from '../data/items.js';
import { profileFor, statPriorityFor, goalGearRules, STAT_TO_AFFIX, GOALS } from '../data/builds.js';
import { TALISMANS } from '../data/systems.js';
import { forgeTierInfo, forgeCumulative, forgeStep } from '../data/forge.js';
import { dropTierAtMl, gemRarityAtMl, socketsAtMl } from './planner.js';

/* ------------------------- словарь статов: что это и зачем ------------------------- */

export const STAT_TEXT = {
  ad: ['урон атаки (Attack Damage)', 'база любого урона — умножается критами и доп. ударами'],
  crit: ['шанс крита (Crit Chance)', 'чем чаще криты, тем сильнее работают Crit Damage и DD'],
  critDmg: ['урон крита (Crit Damage)', 'множитель крита; всё, что выше 100% крита, уходит сюда 1:1'],
  dd: ['Double Damage (шанс двойного урона)', 'целые сотни дают гарантированные ×N удары'],
  dh: ['Double Hit (доп. удары)', 'целые сотни = гарантированные дополнительные удары'],
  maxHp: ['максимум здоровья (Max Health)', 'выживаемость и урон Retaliation'],
  defense: ['защита (Defense)', 'снижает входящий урон и напрямую усиливает Retaliation'],
  dr: ['плоское снижение урона (DR)', 'режет каждый входящий удар'],
  dodge: ['уклонение (Dodge)', 'полностью избегает удара (в стойке Bulwark — 0)'],
  block: ['блок (Block)', 'щит: шанс блокировать удар и усилить Retaliation'],
  retal: ['возмездие (Retaliation)', 'урон, который считается от вашей защиты'],
  petDamage: ['урон пета (Pet Damage)', 'основной урон пет-билда'],
  loh: ['лечение за удар (Life on Hit)', 'выживаемость в затяжном бою'],
  lok: ['лечение за убийство (Life on Kill)', 'восстановление между монстрами'],
  gold: ['золото (Gold Gain)', 'фарм золота'],
  exp: ['опыт (EXP Gain)', 'скорость прокачки персонажа'],
  itemDrop: ['шанс дропа предметов (Item Drop)', 'фарм предметов'],
  mat: ['материалы (Material Drop)', 'фарм материалов для Кузницы'],
  eggDrop: ['шанс яиц (Egg Drop)', 'фарм петов'],
  lucky: ['удача (Lucky)', 'редкие находки'],
  boss: ['урон по боссам (Boss Damage)', 'работает в босс-контенте: Daily/Guild Boss, Tower, Rifts'],
  allSkills: ['+All Class Skills', 'поднимает ВСЕ классовые навыки — самый универсальный бонус в игре'],
  mainstat: ['основной атрибут (Strength / Dexterity / Intelligence)', 'даёт и урон, и защиту по формуле класса'],
};

export const statText = (key) => (STAT_TEXT[key] ? STAT_TEXT[key][0] : key);

/* --------------------- что даёт имплисит предмета: разбор строк --------------------- */

/** Правила разбора имплисита. Порядок важен: «damage reduction» раньше «damage». */
const IMPLICIT_RULES = [
  [/damage reduction|flat damage/i, 'dr'],
  [/pet mastery/i, 'petDamage'],
  [/pet damage/i, 'petDamage'],
  [/retaliation/i, 'retal'],
  [/all class skills/i, 'allSkills'],
  [/critical strike chance/i, 'crit'],
  [/critical damage/i, 'critDmg'],
  [/double hit/i, 'dh'],
  [/life on hit/i, 'loh'],
  [/life on kill/i, 'lok'],
  [/block/i, 'block'],
  [/dodge/i, 'dodge'],
  [/gold/i, 'gold'],
  [/exp\b/i, 'exp'],
  [/defense/i, 'defense'],
  [/physical damage|magic damage|attack damage|damage$/i, 'ad'],
  [/strength|dexterity|intelligence|all attributes/i, 'mainstat'],
];

/**
 * «Вес» слота: оружие даёт большой урон, украшения — небольшой атрибут.
 * Без этого коэффициента кольцо «All Attributes» выглядело бы важнее меча.
 */
const SLOT_IMPLICIT_MULT = {
  mainhand: 2.2, hand2: 2.0, torch: 1.6,
  chest: 1.8, head: 1.6, hands: 1.5, feet: 1.4,
  amulet: 0.9, ring: 0.9, belt: 0.9,
};

/** Статы, которые предмет даёт ГАРАНТИРОВАННО (имплисит), — по строке из Item Codex. */
export function implicitStats(implicit) {
  const out = new Set();
  for (const part of String(implicit || '').split('+')) {
    const text = part.trim();
    if (!text) continue;
    for (const [re, key] of IMPLICIT_RULES) {
      if (re.test(text)) { out.add(key); break; }
    }
  }
  return [...out];
}

/** Обратная карта: id аффикса → ключ стата из приоритета цели. */
const AFFIX_STAT = (() => {
  const map = {};
  for (const [stat, ids] of Object.entries(STAT_TO_AFFIX)) for (const id of ids) map[id] = stat;
  return map;
})();

/** Статы, которые на этом семействе МОГУТ выпасть аффиксами (не гарантия, но шанс). */
export function affixStats(family) {
  const out = new Set();
  for (const name of [...(family.prefixes || []), ...(family.suffixes || [])]) {
    const affix = AFFIXES.find((a) => a.name === name);
    const key = affix && AFFIX_STAT[affix.id];
    if (key) out.add(key);
  }
  return [...out];
}

/* --------------------------------- вспомогательное --------------------------------- */

/** Семейства, доступные в ячейке (та же логика, что в экране снаряжения). */
function familiesForCell(classId, cell) {
  if (cell.slot === 'talisman') return [];
  const kind = (CLASS_GEAR_RULES[classId] || {}).hand2 || 'offhand';
  if (cell.id === 'hand2' && kind === 'weapon2') {
    return GEAR_FAMILIES.filter((f) => f.slot === 'mainhand' && f.hand !== '2H' && (f.cls === 'all' || f.cls === classId));
  }
  return GEAR_FAMILIES.filter((f) => f.slot === cell.slot && (f.cls === 'all' || f.cls === classId));
}

/** Талисман по названию из профиля цели («Fury», «Iron», «Ярость»…). */
function talismanByName(name) {
  const needle = String(name).toLowerCase();
  return TALISMANS.types.find((t) => t.name.toLowerCase() === needle || t.ru.toLowerCase() === needle) || null;
}

/** Талисманы цели: «Fury + Iron» → [fury, iron]. */
function goalTalismans(profile) {
  const list = (profile.talismans && profile.talismans[0]) || 'Fury + Iron';
  const names = String(list).replace(/\(.*?\)/g, '').split('+').map((s) => s.trim()).filter(Boolean);
  const out = names.map(talismanByName).filter(Boolean);
  return out.length ? out : [TALISMANS.types[0]];
}

/** Камень для региона: та же логика, что в ядре (mainStat → камень основного атрибута класса). */
function gemFamilyForRegion(region, classId, gemsCfg, mainStat) {
  let id = gemsCfg[region] || 'garnet';
  if (id === 'mainStat') {
    id = mainStat === 'strength' ? 'garnet' : mainStat === 'dexterity' ? 'jade' : 'lapis';
  }
  return GEM_FAMILIES.find((f) => f.id === id) || GEM_FAMILIES[0];
}

/** Статы, которые камень даёт именно в этом регионе (по строке эффекта). */
function gemValueStats(value) {
  const out = new Set();
  for (const part of String(value || '').split('+')) {
    const text = part.trim();
    if (!text) continue;
    if (/pet damage/i.test(text)) out.add('petDamage');
    else if (/attack damage/i.test(text)) out.add('ad');
    else if (/retaliation/i.test(text)) out.add('retal');
    else if (/max health/i.test(text)) out.add('maxHp');
    else if (/defense/i.test(text)) out.add('defense');
    else if (/gold/i.test(text)) out.add('gold');
    else if (/item drop/i.test(text)) out.add('itemDrop');
    else if (/material/i.test(text)) out.add('mat');
    else if (/exp/i.test(text)) out.add('exp');
    else if (/strength|dexterity|intelligence/i.test(text)) out.add('ad');
  }
  return [...out];
}

/**
 * Что даёт каждый атрибут за пункт (официальные данные игры, см. docs/RESEARCH.md).
 * Украшения дают именно атрибуты, поэтому их надо сравнивать по эффекту, а не по названию линии.
 */
export const ATTRIBUTE_EFFECTS = {
  strength: [['ad', 0.75], ['maxHp', 0.5], ['retal', 0.5]],
  dexterity: [['dodge', 0.05], ['petDamage', 0.1]],
  intelligence: [['ad', 0.38], ['petDamage', 0.05], ['dd', 0.2]],
};

export const ATTRIBUTE_LABELS = {
  strength: ['Сила', 'Strength'],
  dexterity: ['Ловкость', 'Dexterity'],
  intelligence: ['Интеллект', 'Intelligence'],
};

/** Линии украшений: какое семейство какую линию атрибутов даёт. */
export const JEWELRY_LINES = {
  warriors: ['strength'],
  rangers: ['dexterity'],
  scholars: ['intelligence'],
  adventurers: ['strength', 'dexterity'],
};

/**
 * Семейство выбранной линии для слота. У «авантюриста» нет пояса —
 * в поясе его роль играет Пояс учёного (все атрибуты).
 */
export function lineFamilyId(line, slot) {
  if (slot === 'belt') return line === 'warriors' ? 'warriors_belt' : (line === 'rangers' ? 'rangers_belt' : 'scholars_belt');
  if (slot === 'amulet' || slot === 'ring') return `${line}_${slot}`;
  return null;
}

/** Прочитать список атрибутов из имплисита украшения. */
function jewelryAttributes(family) {
  const implicit = String(family.implicit || '');
  if (/all attributes/i.test(implicit)) return ['strength', 'dexterity', 'intelligence'];
  const out = [];
  if (/strength/i.test(implicit)) out.push('strength');
  if (/dexterity/i.test(implicit)) out.push('dexterity');
  if (/intelligence/i.test(implicit)) out.push('intelligence');
  return out;
}

/** Середина диапазона тира — грубая оценка ролла (диапазоны официальные, ролл — средний). */
function tierRoll(family, tierIdx) {
  const range = (family.implicitTiers || [])[tierIdx] || '';
  const nums = String(range).replace(/[^0-9\-–]/g, '').split(/[\-–]/).map((n) => Number(n)).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
}

const CLASS_MAIN_STAT = { warrior: 'strength', archer: 'dexterity', mage: 'intelligence', rogue: 'dexterity', druid: 'strength' };

/**
 * Классовый скейл. Точная формула конверсии чужих атрибутов в урон в игре не раскрыта,
 * поэтому здесь оценка: атрибут своего класса считается полнее (×1.25), а чужой урон
 * от атрибута — слабее (×0.4). Урон пета, двойной урон и Max Health считаются одинаково
 * для всех, потому что это самостоятельные статы, а не «свой/чужой» скейл.
 */
const OWN_ATTR_BONUS = 1.25;
const FOREIGN_DAMAGE_PENALTY = 0.4;

/* --------------------------------- основная функция --------------------------------- */

/**
 * Готовая сборка под класс и цель.
 * @param {string} classId warrior | archer | mage | rogue | druid
 * @param {string} goal progress | farm | boss | pets | retaliation
 * @param {{level?: number, ml?: number}} [opts] уровень персонажа и Monster Level
 */
export function recommendBuild(classId, goal, opts = {}) {
  const ml = Math.max(1, Math.floor(opts.ml ?? opts.level ?? 1));
  const level = Math.max(1, Math.floor(opts.level ?? ml));
  const profile = profileFor(classId, goal);
  const priority = statPriorityFor(classId, goal);
  const rules = goalGearRules(classId, goal);
  const dropTier = dropTierAtMl(ml);
  const gemRarity = gemRarityAtMl(ml);
  const sockets = socketsAtMl(ml);
  const mainStat = CLASS_MAIN_STAT[classId] || 'strength';
  const goalRu = (GOALS.find((g) => g.id === goal) || {}).ru || goal;
  const jewelryLine = opts.jewelryLine && JEWELRY_LINES[opts.jewelryLine] ? opts.jewelryLine : 'auto';

  /** Вес стата: чем выше в приоритете цели, тем больше. */
  const weightOf = (stat) => {
    // +All Class Skills усиливает все ветки сразу — считаем его «выше первого приоритета».
    if (stat === 'allSkills') return priority.length * 1.4;
    // Основной атрибут полезен любой цели, но слабее чистого урона.
    if (stat === 'mainstat') return priority.includes('ad') ? priority.length * 0.5 : priority.length * 0.3;
    const i = priority.indexOf(stat);
    return i === -1 ? 0 : priority.length - i;
  };

  const slots = {};
  const cells = {};

  for (const cell of GEAR_CELLS) {
    // --- талисманы: у них нет «предмета», только тип и уровень инфьюза ---
    if (cell.slot === 'talisman') {
      const types = goalTalismans(profile);
      const talisman = cell.id === 'talisman2' ? (types[1] || types[0]) : types[0];
      const stats = implicitStats(talisman.stats);
      cells[cell.id] = {
        cellId: cell.id, slot: cell.slot, slotRu: cell.ru, slotEn: cell.en,
        family: null, familyId: null, talismanId: talisman.id,
        why: [
          `Талисман ${talisman.ru} (${talisman.name}): ${talisman.stats}.`,
          ...stats.filter((s) => weightOf(s) > 0).slice(0, 2).map((s) => `${statText(s)} — ${STAT_TEXT[s][1]}`),
        ],
        forge: null,
      };
      continue;
    }

    // --- украшения: у них нет «класса», только линия атрибутов, поэтому считаем эффект ---
    const isJewelry = ['amulet', 'ring', 'belt'].includes(cell.slot);
    const slotMultPre = SLOT_IMPLICIT_MULT[cell.slot] || 1;

    /** Оценка украшения: суммарный вклад его атрибутов в приоритеты цели. */
    const jewelryScore = (family) => {
      const attrs = jewelryAttributes(family);
      const roll = tierRoll(family, Math.min(5, Math.max(0, dropTier.tier - 1)));
      let score = 0;
      const parts = [];
      for (const attr of attrs) {
        for (const [stat, per] of ATTRIBUTE_EFFECTS[attr]) {
          // классовое: свой атрибут полнее, чужой урон от атрибута слабее
          const own = attr === mainStat;
          const mult = stat === 'ad'
            ? (own ? OWN_ATTR_BONUS : FOREIGN_DAMAGE_PENALTY)
            : (own ? OWN_ATTR_BONUS : 1);
          const gain = (per * mult * roll);
          const w = weightOf(stat);
          if (w > 0) score += gain * w;
          if (w > 0) {
            const note = own ? ' — это атрибут вашего класса' : (stat === 'ad' ? ' — чужой атрибут, для вашего класса слабее (оценка)' : '');
            parts.push(`${ATTRIBUTE_LABELS[attr][0]} (${ATTRIBUTE_LABELS[attr][1]}): +${per}% ${statText(stat)} за пункт → при прокруте ~${Math.round(roll)} это ≈ +${gain.toFixed(1)}%${note}`);
          }
        }
      }
      // Плоские эффекты (Life on Hit / Life on Kill у поясов) — в том же весе, но без процентов.
      const flat = /life on hit/i.test(family.implicit) ? 'loh' : (/life on kill/i.test(family.implicit) ? 'lok' : null);
      if (flat && weightOf(flat) > 0) {
        score += roll * weightOf(flat);
        parts.push(`${statText(flat)} → +${roll} за удар/убийство`);
      }
      return { score: score * slotMultPre, parts, attrs, roll };
    };

    // --- предметные ячейки ---
    const allowed = (isJewelry ? [] : (rules[cell.slot] || [])).filter((id) => familyById(id));
    const candidates = familiesForCell(classId, cell)
      .filter((f) => f.slot === cell.slot || (cell.id === 'hand2' && f.slot === 'mainhand'))
      .filter((f) => familyUnlockMl(f) <= ml || allowed.includes(f.id));
    // Порядок: сначала кураторский список цели, затем остальные, доступные по ML.
    const ordered = [
      ...allowed.map((id) => familyById(id)).filter((f) => f && candidates.includes(f)),
      ...candidates.filter((f) => !allowed.includes(f.id) && familyUnlockMl(f) <= ml),
    ];
    const lockedNotes = candidates.filter((f) => familyUnlockMl(f) > ml && !allowed.includes(f.id));

    const slotMult = SLOT_IMPLICIT_MULT[cell.slot] || 1;
    let best = null;
    ordered.forEach((family, index) => {
      const imp = implicitStats(family.implicit);
      const aff = affixStats(family);
      let score = 0;
      let info = null;
      if (isJewelry) {
        info = jewelryScore(family);
        score = info.score;
        // принудительно выбранная линия всегда впереди (точное совпадение семейства)
        if (jewelryLine !== 'auto' && family.id === lineFamilyId(jewelryLine, cell.slot)) score += 1e6;
        // иначе при равенстве выигрывает линия основного атрибута класса
        else if (jewelryLine === 'auto' && info.attrs.includes(mainStat)) score += 1;
      } else {
        for (const s of imp) score += 2 * weightOf(s) * slotMult;
        for (const s of aff) score += 1 * weightOf(s);
        if (index === 0) score += 0.5; // при равенстве выигрывает кураторский выбор цели
      }
      if (!best || score > best.score) best = { family, score, imp, aff, index, info };
    });

    // Кураторский список приоритетнее: если он даёт хоть какой-то вклад, берём его,
    // иначе — семейство с максимальным вкладом (например, «нет подходящего» — берём первое доступное).
    const curated = ordered[0] || null;
    const curatedScore = curated ? (implicitStats(curated.implicit).reduce((a, s) => a + 2 * weightOf(s) * slotMult, 0)
      + affixStats(curated).reduce((a, s) => a + weightOf(s), 0)) : 0;
    const chosenRecord = !isJewelry && curated && curatedScore > 0
      ? { family: curated, imp: implicitStats(curated.implicit), aff: affixStats(curated) }
      : best;
    const chosen = chosenRecord ? chosenRecord.family : null;

    const alternatives = ordered
      .filter((f) => f !== chosen)
      .slice(0, isJewelry ? 3 : 2)
      .map((f) => ({
        family: f,
        why: isJewelry
          ? jewelryScore(f).parts.slice(0, 3).join(', ') || f.implicit
          : (implicitStats(f.implicit).filter((s) => weightOf(s) > 0).map((s) => statText(s)).join(', ') || f.implicit),
      }));

    const why = [];
    if (chosen && isJewelry) {
      const info = (chosenRecord && chosenRecord.info) || jewelryScore(chosen);
      const attrsText = info.attrs.length === 3
        ? 'все атрибуты сразу: Сила (Strength) + Ловкость (Dexterity) + Интеллект (Intelligence)'
        : info.attrs.map((a) => `${ATTRIBUTE_LABELS[a][0]} (${ATTRIBUTE_LABELS[a][1]})`).join(' + ');
      why.push(jewelryLine !== 'auto'
        ? `Линия украшений выбрана вами вручную: ${chosen.ru} (${chosen.name}) — ${attrsText}.`
        : `Линия подобрана расчётом под цель «${goalRu}»: ${chosen.ru} (${chosen.name}) — ${attrsText}. На T${dropTier.tier} это прокрут ${Math.round(info.roll)} пунктов на атрибут.`);
      for (const p2 of info.parts.slice(0, 4)) why.push(`${p2} (официальные значения за пункт атрибута).`);
      why.push(`Для сравнения: ${alternatives.slice(0, 2).map((a) => `${a.family.ru} — ${a.why}`).join('; ') || 'ближайших вариантов нет'}.`);
    }
    if (chosen && !isJewelry) {
      why.push(`Имплисит: ${chosen.implicit} — это гарантированный стат, он не зависит от ролла аффиксов.`);
      const matched = implicitStats(chosen.implicit).filter((s) => weightOf(s) > 0).sort((a, b) => weightOf(b) - weightOf(a));
      for (const s of matched.slice(0, 2)) {
        const place = priority.indexOf(s);
        why.push(place === -1
          ? `${statText(s)} — особый бонус цели «${goalRu}»: ${STAT_TEXT[s][1]}.`
          : `${statText(s)} — приоритет №${place + 1} цели «${goalRu}»: ${STAT_TEXT[s][1]}.`);
      }
      const affMatched = affixStats(chosen).filter((s) => weightOf(s) > 0).sort((a, b) => weightOf(b) - weightOf(a));
      if (affMatched.length) {
        why.push(`Аффиксами здесь можно добрать: ${affMatched.slice(0, 3).map(statText).join(', ')} — ищите именно их.`);
      }
      if (chosen.note) why.push(chosen.note);
      if (alternatives.length) why.push(`Альтернатива: ${alternatives.map((a) => `${a.family.ru} (${a.family.name}) — ${a.why}`).join('; ')}.`);
      if (lockedNotes.length) {
        why.push(`Пока не выпадает на ML ${ml}: ${lockedNotes.map((f) => `${f.ru} (${f.name}) — с ML ${familyUnlockMl(f)}`).join(', ')}.`);
      }
    }

    const tierIdx = Math.min(5, Math.max(0, dropTier.tier - 1));
    const targetLevel = forgeTierInfo(dropTier.tier).maxLevel;

    // Аффиксы «искать» — по приоритету цели (то же правило, что в ядре, но с объяснением).
    const wantIds = new Set();
    for (const stat of priority) for (const id of (STAT_TO_AFFIX[stat] || [])) wantIds.add(id);
    const pickAffix = (names, type) => names
      .map((name) => AFFIXES.find((a) => a.name === name && a.type === type))
      .filter(Boolean)
      .sort((a, b) => (wantIds.has(a.id) ? 0 : 1) - (wantIds.has(b.id) ? 0 : 1))
      .slice(0, 4);
    const affixes = chosen
      ? { prefixes: pickAffix(chosen.prefixes || [], 'prefix'), suffixes: pickAffix(chosen.suffixes || [], 'suffix') }
      : { prefixes: [], suffixes: [] };

    const cats = DROP_BONUS_SLOT_CATEGORIES[cell.slot] || ['Offensive'];
    const dropBonuses = DROP_BONUSES
      .filter((d) => (profile.dropBonuses || []).includes(d.name))
      .sort((a, b) => {
        const ai = cats.indexOf(a.cat); const bi = cats.indexOf(b.cat);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .slice(0, 3);

    const region = SLOT_GEM_REGION[cell.slot];
    const gemFamily = gemFamilyForRegion(region, classId, profile.gems, mainStat);
    const gemValue = gemFamily.slots[region];
    const gemWhy = [
      `${gemFamily.ru} (${gemFamily.name}) в этом слоте: ${gemValue}.`,
      ...gemValueStats(gemValue).filter((s) => weightOf(s) > 0).slice(0, 2).map((s) => `${statText(s)} — приоритет №${priority.indexOf(s) + 1} цели «${goalRu}».`),
    ];

    const entry = {
      cellId: cell.id,
      slot: cell.slot,
      slotRu: cell.ru,
      slotEn: cell.en,
      family: chosen,
      familyId: chosen ? chosen.id : null,
      tier: dropTier.tier,
      tierName: chosen ? (chosen.tierNames[tierIdx] || chosen.name) : null,
      implicitNow: chosen ? chosen.implicitTiers[tierIdx] : null,
      locked: Boolean(chosen && familyUnlockMl(chosen) > ml),
      why,
      affixes,
      dropBonuses,
      gem: { family: gemFamily, region, value: gemValue, why: gemWhy },
      alternatives,
      jewelry: isJewelry && best ? {
        attrs: (best.info && best.info.attrs) || [],
        parts: (best.info && best.info.parts) || [],
        roll: best.info ? Math.round(best.info.roll) : 0,
      } : null,
      forge: {
        tier: dropTier.tier,
        level: targetLevel,
        text: `T${dropTier.tier} +${targetLevel}`,
        cost: forgeCumulative(dropTier.tier, targetLevel),
        firstStep: forgeStep(dropTier.tier, 0),
      },
      tierInfo: dropTier,
    };
    cells[cell.id] = entry;
    slots[cell.slot] = slots[cell.slot] || entry;
  }

  /* ---------------- порядок прокачки Кузницы: что даёт больше всего цели ---------------- */

  const forgeOrder = GEAR_CELLS
    .filter((c) => c.slot !== 'talisman' && cells[c.id] && cells[c.id].family)
    .map((c) => {
      const e = cells[c.id];
      const imp = implicitStats(e.family.implicit);
      const mult = SLOT_IMPLICIT_MULT[e.slot] || 1;
      let score = imp.reduce((a, s) => a + 2 * weightOf(s) * mult, 0);
      score += affixStats(e.family).reduce((a, s) => a + weightOf(s), 0);
      if (e.slot === 'mainhand' || e.slot === 'hand2') score += 4; // урон оружия множится критами и DD
      if (e.slot === 'torch' && ml < 50) score = -1; // факела ещё нет в дропе
      const reasons = [];
      if (imp.includes('allSkills')) reasons.push('+All Class Skills поднимает все ваши навыки сразу — самый выгодный слот для вложений.');
      if (e.slot === 'mainhand' || e.slot === 'hand2') reasons.push('урон оружия — база, которую множат криты, DD и DH.');
      for (const s of imp.filter((x) => weightOf(x) > 0).sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 2)) {
        const place = priority.indexOf(s);
        reasons.push(`${statText(s)} — ${place === -1 ? 'нужный цели стат' : `приоритет №${place + 1} цели «${goalRu}»`}.`);
      }
      if (!reasons.length) reasons.push('слот под цель: предмет и аффиксы подобраны по приоритету статов.');
      return { cellId: c.id, slotRu: c.ru, slotEn: c.en, family: e.family, score, reasons, forge: e.forge };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({ ...x, place: i + 1 }));

  const gemPlan = {};
  for (const region of ['weapon', 'torch', 'armor', 'jewelry']) {
    const entries = Object.values(cells).filter((e) => e.gem && e.gem.region === region);
    if (!entries.length) continue;
    gemPlan[region] = {
      family: entries[0].gem.family,
      value: entries[0].gem.value,
      why: entries[0].gem.why,
      secondary: (profile.gems.secondary || []).map((stat) => GEM_SECONDARY.find((s) => s.stat === stat)).filter(Boolean),
      cells: entries.map((e) => e.cellId),
    };
  }

  return {
    classId, goal, goalRu, ml, level,
    stance: profile.stance,
    priority,
    tierInfo: dropTier,
    gemRarity,
    sockets,
    cells,
    slots,
    forgeOrder,
    gemPlan,
    talismans: goalTalismans(profile),
    pets: profile.pets,
    notes: profile.notes || [],
  };
}
