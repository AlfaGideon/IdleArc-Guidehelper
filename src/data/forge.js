/**
 * Кузница (Forge) — Season 2: прогресс экипировки по СЛОТАМ, а не по отдельным предметам.
 *
 * Три дорожки (как в игре):
 *   1) Tier (тир)  — Кузница качает слот до тира T1…T6; каждый тир открывает ещё одну
 *      позицию под аффикс (Free Pick), камень и следующую ступень роста имплисита.
 *   2) Enhance (+N) — «+N» в карточке слота: шаги внутри тира. Лимит шагов = размер тира
 *      (T1 4, T2 9, T3 14, T4 19, T5 24, T6 30). Именно поэтому в игре видно «T4 +19»:
 *      тир и число шагов кузницы, а НЕ тир и уровень самого выпавшего предмета.
 *   3) Awaken — просыпание предмета (до 5 рангов): меняет имя/иконку на «эволюцию» семейства.
 *
 * Точные формулы стоимости (проверены по data/item_codex_data.json, formula_notes):
 *   gold      = round(tier_base_gold × (1 + 0.45 × target_level))
 *   fragments = ceil(target_level × tier_fragment_multiplier)
 *   шанс провала = базовый для тира + 2.5 п.п. за уровень выше порога
 *                  + 1.5 п.п. за уровень выше +19, кап 85 %
 * (К каждому шагу также нужны материалы монстров — они меняются каждый уровень; в игре
 *  список виден в Кузнице, здесь показаны только золото/фрагменты/шанс.)
 *
 * Источники: idlearc.com/patch-notes/1-3-1 (Season 2: The Forge), idlearc.fandom.com/wiki/Forge,
 * data/item_codex_data.json (Item Codex → Forge: точные шаги T1–T6, фрагменты, проценты).
 */

/** Таблица тиров Кузницы: лимит шагов, аффикс-слоты, база золота, множитель фрагментов, порог провала. */
export const FORGE_TIERS = [
  { tier: 1, name: 'Normal', ru: 'Обычный', maxLevel: 4, affixSlots: 0, baseGold: 200, fragMult: 1, failBase: 0, failFrom: 999, fragment: 'Iron Fragment', fragmentRu: 'Железный фрагмент', fragmentSlug: 'iron-fragment' },
  { tier: 2, name: 'Uncommon', ru: 'Необычный', maxLevel: 9, affixSlots: 1, baseGold: 1200, fragMult: 1, failBase: 0, failFrom: 6, fragment: 'Steel Fragment', fragmentRu: 'Стальной фрагмент', fragmentSlug: 'steel-fragment' },
  { tier: 3, name: 'Rare', ru: 'Редкий', maxLevel: 14, affixSlots: 2, baseGold: 7000, fragMult: 0.75, failBase: 0.05, failFrom: 5, fragment: 'Mithril Fragment', fragmentRu: 'Мифриловый фрагмент', fragmentSlug: 'mithril-fragment' },
  { tier: 4, name: 'Epic', ru: 'Эпический', maxLevel: 19, affixSlots: 3, baseGold: 40000, fragMult: 1, failBase: 0.1, failFrom: 8, fragment: 'Adamantine Fragment', fragmentRu: 'Адамантиновый фрагмент', fragmentSlug: 'adamantine-fragment' },
  { tier: 5, name: 'Legendary', ru: 'Легендарный', maxLevel: 24, affixSlots: 4, baseGold: 200000, fragMult: 1.5, failBase: 0.15, failFrom: 10, fragment: 'Celestial Fragment', fragmentRu: 'Небесный фрагмент', fragmentSlug: 'celestial-fragment' },
  { tier: 6, name: 'Infernal', ru: 'Инфернальный', maxLevel: 30, affixSlots: 5, baseGold: 1200000, fragMult: 2.5, failBase: 0.25, failFrom: 12, fragment: 'Infernal Fragment', fragmentRu: 'Инфернальный фрагмент', fragmentSlug: 'infernal-fragment' },
];

/** Информация о тире кузницы (T1…T6). */
export function forgeTierInfo(tier) {
  const t = Math.min(FORGE_TIERS.length, Math.max(1, Math.round(Number(tier) || 1)));
  return FORGE_TIERS[t - 1];
}

/** Сколько шагов «+N» вмещает тир (совпадает с RARITY[].maxPlus). */
export const forgeMaxLevel = (tier) => forgeTierInfo(tier).maxLevel;

/**
 * Стоимость одного шага: level → level+1.
 * Возвращает золото, фрагменты, шанс провала и название фрагмента тира.
 */
export function forgeStep(tier, level) {
  const info = forgeTierInfo(tier);
  const target = Math.min(info.maxLevel, Math.max(1, Math.round(Number(level) || 0) + 1));
  const gold = Math.round(info.baseGold * (1 + 0.45 * target));
  const fragments = Math.ceil(target * info.fragMult);
  let fail = info.failBase
    + 0.025 * Math.max(0, target - info.failFrom)
    + 0.015 * Math.max(0, target - 19);
  fail = Math.min(0.85, Math.max(0, Math.round(fail * 1000) / 1000));
  return { tier: info.tier, level: level, target, gold, fragments, fail, success: Math.round((1 - fail) * 1000) / 1000, fragment: info.fragment };
}

/** Суммарная стоимость прокачки тира до level (0…maxLevel). */
export function forgeCumulative(tier, level) {
  const info = forgeTierInfo(tier);
  const lv = Math.min(info.maxLevel, Math.max(0, Math.round(Number(level) || 0)));
  let gold = 0;
  let fragments = 0;
  for (let i = 0; i < lv; i += 1) {
    const s = forgeStep(info.tier, i);
    gold += s.gold;
    fragments += s.fragments;
  }
  return { tier: info.tier, level: lv, gold, fragments, max: info.maxLevel };
}

/** Суммарные шаги предыдущих тиров: с какого номера начинается ранг слота каждого тира. */
const RANK_BASE = [0, 4, 13, 27, 46, 70];

/** Максимальный ранг слота: T1+4 → … → T6+30 = 100 шагов Кузницы. */
export const FORGE_MAX_RANK = 100;

/**
 * Ранг слота: единая шкала 0…100 — все шаги Кузницы по всем тирам.
 * Кузница качает СЛОТ, поэтому ранг слота может быть выше тира выпавшего предмета:
 * например, слот «T4 +19» — это ранг 46, даже если сам предмет выпал T2.
 */
export function forgeRank(tier, level) {
  const info = forgeTierInfo(tier);
  const lv = Math.min(info.maxLevel, Math.max(0, Math.round(Number(level) || 0)));
  return { rank: RANK_BASE[info.tier - 1] + lv, tier: info.tier, level: lv, max: FORGE_MAX_RANK };
}

/**
 * Обратный переход: ранг слота → тир и уровень.
 * На границе (например, ранг 46 = «T4 +19») возвращаем ТЕКУЩИЙ тир на максимуме —
 * так же показывает игра: слот остаётся «T4 +19», пока Кузница не поднимет тир.
 */
export function rankToForge(rank) {
  const r = Math.min(FORGE_MAX_RANK, Math.max(0, Math.round(Number(rank) || 0)));
  for (let i = FORGE_TIERS.length - 1; i >= 0; i -= 1) {
    const base = RANK_BASE[i];
    const max = FORGE_TIERS[i].maxLevel;
    if (r >= base + 1 && r <= base + max) return { tier: FORGE_TIERS[i].tier, level: r - base };
    if (r === base && i > 0) return { tier: FORGE_TIERS[i - 1].tier, level: FORGE_TIERS[i - 1].maxLevel };
  }
  return { tier: 1, level: 0 };
}

/** Дорожки Кузницы по классам — ровно те слоты, которые класс реально носит. */
export const FORGE_TRACKS_BY_CLASS = {
  warrior: ['mainhand', 'offhand', 'torch', 'chest', 'head', 'hands', 'feet', 'belt', 'amulet', 'ring1', 'ring2'],
  archer: ['mainhand', 'offhand', 'torch', 'chest', 'head', 'hands', 'feet', 'belt', 'amulet', 'ring1', 'ring2'],
  mage: ['mainhand', 'offhand', 'torch', 'chest', 'head', 'hands', 'feet', 'belt', 'amulet', 'ring1', 'ring2'],
  rogue: ['mainhand', 'weapon2', 'torch', 'chest', 'head', 'hands', 'feet', 'belt', 'amulet', 'ring1', 'ring2'],
  druid: ['mainhand', 'torch', 'chest', 'head', 'hands', 'feet', 'belt', 'amulet', 'ring1', 'ring2'],
};

/** Максимум рангов просыпания (Awaken). */
export const AWAKEN_MAX = 5;

/**
 * Ориентировочная цена просыпания (Awaken) — растёт ×2.5 за ранг.
 * В игре формула: awaken_gold = round(infernal_base_level_gold × 10 × 2.5^rank);
 * для остальных тиров точная база не опубликована — берём золото первого шага тира (оценка).
 */
export function awakenGold(tier, rank) {
  const base = forgeStep(tier, 0).gold;
  return Math.round(base * 10 * Math.pow(2.5, Math.max(0, Math.round(Number(rank) || 0))));
}

/** Пояснение к Awaken (показывается в интерфейсе). */
export const AWAKEN_NOTE = 'Awaken (просыпание, до 5 рангов) меняет имя и иконку предмета на «эволюцию» семейства '
  + '(например, Broken Sword → Royal Dragonblade). Цена растёт ×2.5 за ранг — число оценочное, точное видно в Кузнице.';
