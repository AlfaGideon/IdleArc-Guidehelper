/**
 * Биомы и гейт Кузницы (Season 2).
 *
 * Главное правило, которое здесь зафиксировано: **Кузница качает СЛОТ, а не предмет.**
 * Тир слота не зависит от того, какой предмет вам выпал: чтобы поднять слот на следующий
 * тир, нужны материалы монстров конкретного биома (и эссенции). Значит, потолок прокачки
 * слота определяется вашим прогрессом по биомам (Monster Level), а не дропом.
 *
 * Данные — с официальной вики (страница «Biomes», страницы биомов со списками монстров
 * и материалов, «Item Codex Upgrade Costs» с таблицами затрат и промоушенов):
 *   Verdant Woods  ML 1   — Grub's Eye, Spider Fang, Boar Tusk, Heartwood Core, Ogre Bone      → T1 (Iron)
 *   Scorched Sands ML 10  — Scarab Carapace, Scorpion Stinger, Djinn Essence, Sunite Crystal,
 *                           Windswept Shard                                                    → T2 (Steel)
 *   Murky Depths   ML 30  — Leech Gland, Toad Venom Sac, Wraith Wisp, Giant's Tooth,
 *                           Hydra Scale                                                        → T3 (Mithril)
 *   Frozen Peaks   ML 45  — Sprite Dust, Frozen Soul, Yeti Fur, Glacial Heart, Dragon Frost    → T4 (Adamantine)
 *   Shadow Realm   ML 65  — Wisp Fragment, Assassin's Mark, Stalker Claw, Void Core,
 *                           Horror Tentacle                                                    → T5 (Celestial)
 *   Infernal Pits  ML 90  — Imp Horn, Mage's Ember, Demon Plate, Molten Core, Lord's Sigil     → T6 (Infernal)
 *
 * Проверка на живых данных: материалы T5 (Celestial Fragment) совпадают с дропом Shadow Realm
 * (ML 65) — то есть «слот можно качать до T5 после ML 65»; T6 открывается с Infernal Pits (ML 90).
 */

/** Официальный список биомов: Monster Level открытия и «биомный тир». */
export const BIOMES = [
  { id: 'verdant_woods', name: 'Verdant Woods', ru: 'Зелёные леса', ml: 1, tier: 1 },
  { id: 'scorched_sands', name: 'Scorched Sands', ru: 'Выжженные пески', ml: 10, tier: 1 },
  { id: 'murky_depths', name: 'Murky Depths', ru: 'Мутные глубины', ml: 30, tier: 2 },
  { id: 'frozen_peaks', name: 'Frozen Peaks', ru: 'Мёрзлые вершины', ml: 45, tier: 3 },
  { id: 'shadow_realm', name: 'Shadow Realm', ru: 'Царство теней', ml: 65, tier: 4 },
  { id: 'infernal_pits', name: 'Infernal Pits', ru: 'Инфернальные ямы', ml: 90, tier: 5 },
  { id: 'elderwood', name: 'Elderwood', ru: 'Древний лес', ml: 115, tier: 6 },
  { id: 'glasslands', name: 'Glasslands', ru: 'Стеклянные земли', ml: 150, tier: 7 },
  { id: 'drowned_abyss', name: 'Drowned Abyss', ru: 'Затонувшая бездна', ml: 185, tier: 8 },
  { id: 'shattered_summit', name: 'Shattered Summit', ru: 'Расколотая вершина', ml: 220, tier: 9 },
  { id: 'umbral_rift', name: 'Umbral Rift', ru: 'Сумрачный разлом', ml: 260, tier: 10 },
  { id: 'oblivions_crown', name: "Oblivion's Crown", ru: 'Корона забвения', ml: 300, tier: 11 },
  { id: 'convergence', name: 'The Convergence', ru: 'Схождение', ml: 350, tier: 12 },
];

/** Материалы монстров первых биомов (официальные страницы биомов). */
export const BIOME_MATERIALS = {
  verdant_woods: [
    ['Forest Grub', "Grub's Eye"], ['Venomous Spider', 'Spider Fang'], ['Wild Boar', 'Boar Tusk'],
    ['Ancient Treant', 'Heartwood Core'], ['Forest Ogre', 'Ogre Bone'],
  ],
  scorched_sands: [
    ['Scarab', 'Scarab Carapace'], ['Scorpion', 'Scorpion Stinger'], ['Djinn', 'Djinn Essence'],
    ['Sunite', 'Sunite Crystal'], ['Wind Elemental', 'Windswept Shard'],
  ],
  murky_depths: [
    ['Swamp Leech', 'Leech Gland'], ['Poison Toad', 'Toad Venom Sac'], ['Bog Wraith', 'Wraith Wisp'],
    ['Marsh Giant', "Giant's Tooth"], ['Hydra Spawn', 'Hydra Scale'],
  ],
  frozen_peaks: [
    ['Ice Sprite', 'Sprite Dust'], ['Frost Wraith', 'Frozen Soul'], ['Yeti', 'Yeti Fur'],
    ['Frost Giant', 'Glacial Heart'], ['Ice Dragon', 'Dragon Frost'],
  ],
  shadow_realm: [
    ['Shadow Wisp', 'Wisp Fragment'], ['Void Assassin', "Assassin's Mark"], ['Shadow Stalker', 'Stalker Claw'],
    ['Void Sentinel', 'Void Core'], ['Abyssal Horror', 'Horror Tentacle'],
  ],
  infernal_pits: [
    ['Imp', 'Imp Horn'], ['Hellfire Mage', "Mage's Ember"], ['Demon Knight', 'Demon Plate'],
    ['Infernal Golem', 'Molten Core'], ['Pit Lord', "Lord's Sigil"],
  ],
};

/**
 * Гейт Кузницы: до какого тира можно поднять СЛОТ и в каком биоме берутся материалы.
 * Порядок тиров совпадает с фрагментами: Iron → Steel → Mithril → Adamantine → Celestial → Infernal.
 */
export const FORGE_GATE = [
  { tier: 1, biomeId: 'verdant_woods', ml: 1, fragment: 'Iron Fragment', fragmentRu: 'Железный фрагмент' },
  { tier: 2, biomeId: 'scorched_sands', ml: 10, fragment: 'Steel Fragment', fragmentRu: 'Стальной фрагмент' },
  { tier: 3, biomeId: 'murky_depths', ml: 30, fragment: 'Mithril Fragment', fragmentRu: 'Мифриловый фрагмент' },
  { tier: 4, biomeId: 'frozen_peaks', ml: 45, fragment: 'Adamantine Fragment', fragmentRu: 'Адамантиновый фрагмент' },
  { tier: 5, biomeId: 'shadow_realm', ml: 65, fragment: 'Celestial Fragment', fragmentRu: 'Небесный фрагмент' },
  { tier: 6, biomeId: 'infernal_pits', ml: 90, fragment: 'Infernal Fragment', fragmentRu: 'Инфернальный фрагмент' },
];

const biomeById = (id) => BIOMES.find((b) => b.id === id);

/** Гейт тира: { tier, ml, biome, materials, fragment } или null. */
export function forgeGateForTier(tier) {
  const gate = FORGE_GATE.find((g) => g.tier === Math.max(1, Math.min(6, Math.round(tier))));
  if (!gate) return null;
  const biome = biomeById(gate.biomeId);
  return {
    ...gate,
    biome,
    biomeRu: biome ? biome.ru : '',
    materials: (BIOME_MATERIALS[gate.biomeId] || []).map(([monster, material]) => ({ monster, material })),
  };
}

/**
 * Что доступно на вашем Monster Level: до какого тира качается слот, что откроется дальше.
 * Именно это, а не выпавший предмет, определяет прогресс слота в Кузнице.
 */
export function forgeGateAtMl(ml) {
  const level = Math.max(1, Math.floor(ml || 1));
  const unlocked = FORGE_GATE.filter((g) => g.ml <= level);
  const next = FORGE_GATE.find((g) => g.ml > level) || null;
  const current = unlocked[unlocked.length - 1] || FORGE_GATE[0];
  const biome = biomeById(current.biomeId);
  const nextBiome = next ? biomeById(next.biomeId) : null;
  return {
    tier: current.tier,                                    // потолок прокачки слота сейчас
    ml: level,
    biome,
    biomeRu: biome ? biome.ru : '',
    materials: (BIOME_MATERIALS[current.biomeId] || []).map(([monster, material]) => ({ monster, material })),
    unlockedTiers: unlocked.map((g) => g.tier),
    next: next ? {
      tier: next.tier, ml: next.ml, biome: nextBiome, biomeRu: nextBiome ? nextBiome.ru : '',
      materials: (BIOME_MATERIALS[next.biomeId] || []).map(([monster, material]) => ({ monster, material })),
      mlLeft: next.ml - level,
    } : null,
  };
}

/** Биом, который открыт на этом ML (последний по списку). */
export function biomeAtMl(ml) {
  const level = Math.max(1, Math.floor(ml || 1));
  return BIOMES.filter((b) => b.ml <= level).pop() || BIOMES[0];
}

/**
 * Промоушен тира — отдельный шаг со своей ценой (официально из Item Codex → Tier promotions).
 * Промоушен переводит СЛОТ из тира в тир: нужен предмет на максимуме тира + эссенция + материалы.
 */
export const TIER_PROMOTION = [
  { from: 1, to: 2, gold: 7500, essence: 'Uncommon Essence', essenceRu: 'Необычная эссенция', materials: [['Ogre Bone', 5], ['Heartwood Core', 3]], fail: 0 },
  { from: 2, to: 3, gold: 45000, essence: 'Rare Essence', essenceRu: 'Редкая эссенция', materials: [['Windswept Shard', 8], ['Djinn Essence', 5], ['Ogre Bone', 3]], fail: 10 },
  { from: 3, to: 4, gold: 225000, essence: 'Epic Essence', essenceRu: 'Эпическая эссенция', materials: [['Hydra Scale', 12], ['Sprite Dust', 8], ['Windswept Shard', 5]], fail: 20 },
  { from: 4, to: 5, gold: 1125000, essence: 'Legendary Essence', essenceRu: 'Легендарная эссенция', materials: [['Dragon Frost', 18], ['Glacial Heart', 12], ['Hydra Scale', 8]], fail: 35 },
  { from: 5, to: 6, gold: 5250000, essence: 'Infernal Essence', essenceRu: 'Инфернальная эссенция', materials: [['Horror Tentacle', 30], ['Void Core', 20], ['Stalker Claw', 15], ['Dragon Frost', 10]], fail: 50 },
];

/** Промоушен из тира N в N+1. */
export const promotionFromTier = (tier) => TIER_PROMOTION.find((p) => p.from === tier) || null;
