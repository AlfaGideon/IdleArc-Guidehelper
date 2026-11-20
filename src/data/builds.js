import { t } from '../i18n.js';

/**
 * Рекомендации по сборкам. Это НЕ официальные данные игры, а выведенные правила
 * из механик (см. systems.js/items.js) и официального гайда Season 2.
 * Каждый профиль показывает: стойку, приоритет статов, веса навыков, гемы, Drop Bonuses.
 */

export const GOALS = [
  { id: 'progress', ru: t('Прогресс / основная игра', 'Progression / main game'), desc: t('Уверенное движение по Monster Level: урон + выживаемость.', 'Advance through Monster Levels with a mix of damage and survivability.') },
  { id: 'farm', ru: t('Фарм ресурсов', 'Resource farming'), desc: t('Золото, материалы, шанс дропа, руны и ускорение прокачки.', 'Farm gold, materials and runes, increase drop rates and level faster.') },
  { id: 'boss', ru: t('Боссы / Tower / Rifts', 'Bosses / Tower / Rifts'), desc: t('Максимум урона по одной цели: криты, DD, Boss Damage.', 'Maximize single-target damage with critical hits, Double Damage and Boss Damage.') },
  { id: 'pets', ru: t('Пет-билд', 'Pet build'), desc: t('Урон пета, Pet Mastery и фарм яиц.', 'Build Pet Damage and Pet Mastery, and farm Pet Eggs.') },
  { id: 'retaliation', ru: t('Retaliation (возмездие)', 'Retaliation'), desc: t('Строим Defense и Reflecting — броня убивает сама.', 'Stack Defense and Reflecting so your armor kills enemies as they attack.') },
];

/** Веса навыков: чем выше, тем раньше/больше качаем. */
const W = {
  warrior: {
    progress: { w_relentless: 5, w_mighty: 5, w_titans: 4, w_crushing: 4, w_focus: 4, w_iron: 3, w_berserk: 3, w_deflection: 3, w_overwhelm: 3, w_keen: 3, w_titanic: 3, w_spoils: 2, w_recovery: 2, w_bloodthirst: 2, w_culling: 2, w_lethal: 2, w_counterstrike: 1, w_executioner: 2 },
    farm: { w_spoils: 5, w_mighty: 4, w_berserk: 4, w_iron: 3, w_relentless: 3, w_titans: 3, w_focus: 3, w_crushing: 3, w_deflection: 2, w_recovery: 2, w_bloodthirst: 3, w_culling: 2, w_titanic: 2, w_overwhelm: 2, w_keen: 2, w_lethal: 2, w_executioner: 1, w_counterstrike: 1 },
    boss: { w_mighty: 5, w_focus: 5, w_crushing: 5, w_keen: 5, w_overwhelm: 5, w_titanic: 4, w_titans: 4, w_relentless: 3, w_lethal: 3, w_berserk: 3, w_iron: 2, w_culling: 2, w_deflection: 2, w_recovery: 1, w_bloodthirst: 1, w_spoils: 1, w_executioner: 1, w_counterstrike: 1 },
    pets: { w_mighty: 4, w_titans: 3, w_relentless: 3, w_berserk: 4, w_spoils: 3, w_iron: 4, w_deflection: 3, w_crushing: 3, w_focus: 3, w_keen: 2, w_overwhelm: 2, w_lethal: 2, w_titanic: 2, w_recovery: 2, w_bloodthirst: 2, w_culling: 2, w_executioner: 1, w_counterstrike: 1 },
    retaliation: { w_deflection: 5, w_iron: 5, w_counterstrike: 4, w_recovery: 4, w_crushing: 4, w_mighty: 3, w_titans: 2, w_focus: 2, w_spoils: 3, w_berserk: 2, w_relentless: 2, w_overwhelm: 2, w_bloodthirst: 2, w_keen: 2, w_titanic: 1, w_lethal: 1, w_culling: 1, w_executioner: 1 },
  },
  archer: {
    progress: { a_archery: 5, a_steady: 4, a_precision: 4, a_doublenock: 4, a_headshot: 4, a_perfect: 3, a_venomtrap: 3, a_huntersmark: 3, a_beastbond: 3, a_packleader: 3, a_spiketrap: 3, a_barbed: 2, a_foraging: 2, a_egghunter: 2, a_strongpet: 2, a_alpha: 2, a_trapmastery: 2, a_instinct: 1 },
    farm: { a_egghunter: 5, a_foraging: 5, a_archery: 4, a_steady: 3, a_venomtrap: 3, a_packleader: 3, a_beastbond: 3, a_precision: 3, a_doublenock: 3, a_strongpet: 3, a_alpha: 3, a_spiketrap: 3, a_headshot: 2, a_perfect: 2, a_huntersmark: 2, a_barbed: 2, a_trapmastery: 2, a_instinct: 1 },
    boss: { a_archery: 5, a_precision: 5, a_headshot: 5, a_perfect: 5, a_steady: 4, a_doublenock: 4, a_venomtrap: 3, a_huntersmark: 5, a_spiketrap: 3, a_trapmastery: 2, a_barbed: 2, a_beastbond: 2, a_packleader: 2, a_alpha: 2, a_strongpet: 1, a_instinct: 1, a_egghunter: 1, a_foraging: 1 },
    pets: { a_beastbond: 5, a_packleader: 5, a_strongpet: 5, a_alpha: 5, a_egghunter: 4, a_foraging: 4, a_archery: 4, a_steady: 3, a_precision: 3, a_doublenock: 3, a_headshot: 3, a_perfect: 2, a_venomtrap: 2, a_huntersmark: 2, a_spiketrap: 2, a_barbed: 2, a_trapmastery: 1, a_instinct: 1 },
    retaliation: { a_archery: 4, a_steady: 3, a_precision: 3, a_doublenock: 3, a_headshot: 3, a_perfect: 2, a_beastbond: 2, a_packleader: 2, a_foraging: 3, a_egghunter: 2, a_spiketrap: 2, a_barbed: 3, a_venomtrap: 2, a_huntersmark: 2, a_trapmastery: 1, a_instinct: 1, a_strongpet: 1, a_alpha: 1 },
  },
  mage: {
    progress: { m_fire: 5, m_surge: 4, m_combustion: 4, m_melting: 4, m_burningsoul: 4, m_wild: 4, m_spellmastery: 3, m_inferno: 3, m_blast: 3, m_unstable: 3, m_cascade: 3, m_pyroclasm: 3, m_siphon: 3, m_chaosbolt: 3, m_soulharvest: 2, m_reality: 2, m_incarnate: 2, m_fortune: 2 },
    farm: { m_fortune: 5, m_soulharvest: 4, m_fire: 4, m_surge: 3, m_spellmastery: 3, m_melting: 3, m_burningsoul: 3, m_wild: 3, m_combustion: 3, m_inferno: 3, m_blast: 3, m_unstable: 3, m_cascade: 2, m_pyroclasm: 2, m_siphon: 2, m_chaosbolt: 2, m_reality: 2, m_incarnate: 2 },
    boss: { m_fire: 5, m_melting: 5, m_burningsoul: 5, m_chaosbolt: 5, m_wild: 5, m_cascade: 4, m_pyroclasm: 4, m_surge: 4, m_combustion: 4, m_spellmastery: 3, m_inferno: 3, m_reality: 3, m_incarnate: 3, m_blast: 3, m_unstable: 2, m_siphon: 2, m_soulharvest: 1, m_fortune: 1 },
    pets: { m_wild: 4, m_fire: 4, m_surge: 3, m_blast: 3, m_unstable: 3, m_spellmastery: 3, m_soulharvest: 3, m_fortune: 2, m_melting: 2, m_burningsoul: 2, m_chaosbolt: 2, m_cascade: 2, m_inferno: 2, m_pyroclasm: 2, m_combustion: 2, m_reality: 2, m_incarnate: 2, m_siphon: 2 },
    retaliation: { m_fire: 4, m_spellmastery: 3, m_inferno: 3, m_melting: 3, m_surge: 3, m_burningsoul: 3, m_wild: 3, m_siphon: 3, m_combustion: 2, m_chaosbolt: 2, m_cascade: 2, m_pyroclasm: 2, m_blast: 2, m_unstable: 2, m_soulharvest: 2, m_reality: 1, m_incarnate: 1, m_fortune: 2 },
  },
  rogue: {
    progress: { r_umbral: 5, r_swift: 5, r_ambush: 4, r_precision: 4, r_echo: 4, r_echomastery: 4, r_cascade: 3, r_contract: 3, r_scavenger: 3, r_treasure: 3, r_luckyhands: 3, r_sharpened: 3, r_firststrike: 3, r_phantom: 3, r_coup: 3, r_blackmarket: 2, r_masterthief: 2, r_pickpocket: 2 },
    farm: { r_scavenger: 5, r_pickpocket: 5, r_masterthief: 5, r_treasure: 5, r_luckyhands: 4, r_blackmarket: 4, r_swift: 4, r_umbral: 4, r_ambush: 3, r_echo: 3, r_precision: 3, r_echomastery: 3, r_coup: 2, r_cascade: 2, r_sharpened: 2, r_phantom: 2, r_firststrike: 2, r_contract: 2 },
    boss: { r_precision: 5, r_sharpened: 5, r_ambush: 5, r_contract: 5, r_firststrike: 5, r_swift: 4, r_umbral: 4, r_echo: 4, r_echomastery: 4, r_phantom: 3, r_cascade: 3, r_coup: 2, r_scavenger: 1, r_treasure: 1, r_luckyhands: 1, r_blackmarket: 1, r_masterthief: 1, r_pickpocket: 1 },
    pets: { r_swift: 4, r_umbral: 4, r_ambush: 3, r_precision: 3, r_echo: 3, r_scavenger: 3, r_treasure: 3, r_luckyhands: 3, r_echomastery: 3, r_sharpened: 3, r_cascade: 2, r_phantom: 2, r_firststrike: 2, r_contract: 2, r_coup: 2, r_masterthief: 2, r_blackmarket: 2, r_pickpocket: 2 },
    retaliation: { r_swift: 4, r_umbral: 4, r_echo: 3, r_ambush: 3, r_precision: 3, r_scavenger: 3, r_luckyhands: 3, r_echomastery: 3, r_sharpened: 3, r_blackmarket: 2, r_cascade: 2, r_phantom: 2, r_firststrike: 2, r_contract: 2, r_coup: 2, r_treasure: 2, r_masterthief: 2, r_pickpocket: 2 },
  },
  druid: {
    progress: { d_feralbond: 5, d_onesoul: 5, d_kinship: 4, d_twinheart: 4, d_sharedinstinct: 4, d_wildattunement: 4, d_deeproots: 3, d_gnaw: 3, d_tailslap: 3, d_lodgekeeper: 3, d_hoard: 2, d_keensnout: 2, d_timberfall: 2, d_undermine: 2, d_digger: 2, d_earthbind: 2, d_thickpelt: 2, d_dambuilder: 2 },
    farm: { d_hoard: 5, d_keensnout: 5, d_gnaw: 4, d_digger: 4, d_undermine: 4, d_feralbond: 4, d_onesoul: 4, d_kinship: 3, d_twinheart: 3, d_sharedinstinct: 3, d_deeproots: 2, d_tailslap: 2, d_lodgekeeper: 2, d_wildattunement: 2, d_timberfall: 2, d_earthbind: 2, d_thickpelt: 2, d_dambuilder: 2 },
    boss: { d_feralbond: 5, d_onesoul: 5, d_sharedinstinct: 5, d_wildattunement: 5, d_kinship: 4, d_twinheart: 4, d_thickpelt: 3, d_deeproots: 3, d_tailslap: 3, d_gnaw: 3, d_lodgekeeper: 3, d_timberfall: 2, d_undermine: 2, d_hoard: 1, d_keensnout: 1, d_digger: 1, d_earthbind: 1, d_dambuilder: 1 },
    pets: { d_feralbond: 5, d_onesoul: 5, d_kinship: 5, d_twinheart: 5, d_sharedinstinct: 4, d_keensnout: 4, d_wildattunement: 4, d_deeproots: 3, d_gnaw: 3, d_tailslap: 3, d_lodgekeeper: 3, d_hoard: 3, d_thickpelt: 3, d_timberfall: 2, d_undermine: 2, d_digger: 2, d_earthbind: 2, d_dambuilder: 2 },
    retaliation: { d_thickpelt: 5, d_deeproots: 5, d_lodgekeeper: 4, d_dambuilder: 4, d_earthbind: 4, d_feralbond: 3, d_onesoul: 3, d_kinship: 3, d_twinheart: 3, d_sharedinstinct: 3, d_wildattunement: 3, d_gnaw: 2, d_tailslap: 2, d_hoard: 2, d_keensnout: 2, d_timberfall: 2, d_undermine: 2, d_digger: 2 },
  },
};

/** Приоритеты статов (порядок = что искать в первую очередь). */
const P = {
  warrior: {
    progress: ['ad', 'crit', 'critDmg', 'dd', 'dh', 'maxHp', 'defense', 'dr', 'loh', 'lok', 'block'],
    farm: ['gold', 'mat', 'ad', 'crit', 'dd', 'dh', 'maxHp', 'loh', 'itemDrop'],
    boss: ['ad', 'crit', 'critDmg', 'dd', 'boss', 'dh', 'maxHp', 'defense'],
    pets: ['petDamage', 'ad', 'crit', 'maxHp', 'defense', 'loh'],
    retaliation: ['defense', 'retal', 'maxHp', 'dr', 'block', 'crit', 'dd', 'dh'],
  },
  archer: {
    progress: ['ad', 'crit', 'critDmg', 'dd', 'dh', 'petDamage', 'maxHp', 'defense', 'loh'],
    farm: ['eggDrop', 'gold', 'mat', 'itemDrop', 'exp', 'petDamage', 'ad', 'crit'],
    boss: ['ad', 'crit', 'critDmg', 'dd', 'boss', 'dh', 'petDamage'],
    pets: ['petDamage', 'eggDrop', 'ad', 'crit', 'critDmg', 'dd', 'maxHp', 'loh'],
    retaliation: ['defense', 'retal', 'maxHp', 'dr', 'loh', 'ad', 'crit'],
  },
  mage: {
    progress: ['ad', 'crit', 'critDmg', 'dd', 'dh', 'maxHp', 'defense', 'loh', 'lucky'],
    farm: ['gold', 'mat', 'exp', 'crit', 'critDmg', 'dd', 'ad', 'lucky'],
    boss: ['ad', 'crit', 'critDmg', 'dd', 'boss', 'dh'],
    pets: ['petDamage', 'ad', 'crit', 'maxHp', 'defense'],
    retaliation: ['defense', 'retal', 'maxHp', 'dr', 'ad', 'crit'],
  },
  rogue: {
    progress: ['ad', 'dh', 'crit', 'critDmg', 'dd', 'gold', 'mat', 'itemDrop', 'loh'],
    farm: ['gold', 'mat', 'itemDrop', 'lucky', 'dh', 'ad', 'crit', 'exp'],
    boss: ['crit', 'critDmg', 'ad', 'dd', 'boss', 'dh'],
    pets: ['petDamage', 'ad', 'dh', 'crit', 'mat', 'loh'],
    retaliation: ['defense', 'retal', 'maxHp', 'dr', 'dh', 'crit'],
  },
  druid: {
    progress: ['petDamage', 'ad', 'crit', 'critDmg', 'dd', 'dh', 'maxHp', 'defense', 'loh'],
    farm: ['gold', 'mat', 'itemDrop', 'eggDrop', 'exp', 'petDamage', 'dh'],
    boss: ['petDamage', 'ad', 'crit', 'critDmg', 'dd', 'boss'],
    pets: ['petDamage', 'eggDrop', 'dh', 'crit', 'critDmg', 'ad', 'loh'],
    retaliation: ['defense', 'retal', 'maxHp', 'dr', 'petDamage', 'loh'],
  },
};

/** Конфигурация гемов по слотам: семья + приоритетная вторичка. */
const G = {
  ad: { weapon: 'garnet', torch: 'jade', armor: 'garnet', jewelry: 'mainStat', secondary: ['Critical Damage', 'Critical Chance'] },
  pet: { weapon: 'jade', torch: 'lapis', armor: 'jade', jewelry: 'mainStat', secondary: ['Double Damage Chance', 'Critical Damage'] },
  farm: { weapon: 'amber', torch: 'amber', armor: 'amber', jewelry: 'amber', secondary: ['Gold Gain', 'EXP Gain'] },
  defense: { weapon: 'garnet', torch: 'garnet', armor: 'garnet', jewelry: 'mainStat', secondary: ['Dodge Chance', 'Max Health'] },
};

export const PROFILES = {
  warrior: {
    progress: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Fierce', 'Precise', 'Brutal', 'Fortified', 'Armored', 'Resilient', 'Vampiric', 'Draining', 'Devastating', 'Relentless', 'Slayer\'s'], talismans: ['Fury + Iron'], pets: t('1 боевой пет (AD/Crit/DH) + 3 пета с Defensive/Sustain бонусами', '1 combat pet (AD/Crit/DH) + 3 pets with defensive or sustain bonuses'), notes: [t('Warrior проще всех на старте S2: щит даёт Block, а блок усиливает Retaliation на 50%.', 'Warrior has the easiest Season 2 start. Its shield grants Block, and blocked hits deal 50% more Retaliation damage.'), t('Culling Strike/Executioner режут время боя по монстрам с большим HP — берите их рано.', 'Take Culling Strike and Executioner early to shorten fights against high-HP monsters.'), t('Если урон упирается в потолок — добавьте Torch (ML 50+) с +All Class Skills: он поднимает все ваши навыки.', 'If your damage stalls, equip a Torch (ML 50+) with +All Class Skills to raise your skill ranks.')] },
    farm: { stance: 'aggressive', gems: G.farm, dropBonuses: ['Prosperous', 'Scavenger\'s', 'Scholarly', 'Fierce', 'Fortified'], talismans: ['Fury + Recovery'], pets: t('пет с Gold/Item bonus + 3 боевых', '1 pet with Gold/Item Drop bonuses + 3 combat pets'), notes: [t('Spoils of War: +5% золота, +5% материалов и +2% шанса дропа предметов за очко (до +25%/+25%/+10% на 5/5) — основной фарм-усилитель Warrior.', 'Spoils of War is the Warrior’s main farming skill. Each point grants +5% gold, +5% materials and +2% Item Drop Chance, reaching +25%, +25% and +10% at 5/5.'), t('Frenzy (Extra Kill) прямо ускоряет фарм и прогресс ML.', 'Frenzy (Extra Kill) directly speeds up farming and ML progression.')] },
    boss: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Slayer\'s', 'Brutal', 'Precise', 'Devastating', 'Fierce', 'Relentless'], talismans: [t('Fury + Fury (инскрипты на крит)', 'Fury + Fury (critical strike inscriptions)')], pets: t('боевой пет на Crit Damage/DD', 'Combat pet with Critical Damage and Double Damage'), notes: [t('Titanic Blow + Overwhelm + Relentless Assault — ядро бурста (тройные удары и доп. удары).', 'Titanic Blow, Overwhelm and Relentless Assault provide burst damage through triple damage and extra hits.'), t('Slayer\'s работает в Daily Boss/Guild Boss/Tower, но не по обычным монстрам.', 'Slayer’s applies to Daily Boss, Guild Boss and Tower. It has no effect on regular monsters.')] },
    pets: { stance: 'beastmaster', gems: G.pet, dropBonuses: ['Companion\'s', 'Fortified', 'Armored', 'Vampiric'], talismans: ['Spirit + Iron'], pets: t('4 пета: 1 атакующий + 3 с бонусами к Pet Damage', '4 pets, with 1 attacker and 3 pets that grant Pet Damage'), notes: [t('У Warrior нет классовых пет-бонусов — пет-билд тут только через экипировку, Runes и Talisman of Spirit.', 'Warriors have no class bonuses for pets. Use gear, runes and Talisman of Spirit to build Pet Damage.'), t('Harmony-стойка на высоких ML даёт больше, если держать оба направления.', 'Harmony gives better returns at high ML when you invest in both character and pet damage.')] },
    retaliation: { stance: 'bulwark', gems: G.defense, dropBonuses: ['Reflecting', 'Armored', 'Fortified', 'Resilient', 'Evasive'], talismans: ['Iron + Fury'], pets: t('пет с Defense/Max Health бонусами', 'Pet with Defense and Max Health bonuses'), notes: [t('Retaliation = Reflecting% × Defense, поэтому каждая единица Defense — это и защита, и урон.', 'Retaliation = Reflecting% × Defense. Each point of Defense reduces incoming damage and increases your damage.'), t('В Bulwark уклонение = 0%: не собирайте Dodge в этой стойке.', 'Bulwark sets Dodge to 0%, so skip Dodge bonuses in this stance.'), t('Strength даёт +0.5 к базе Retaliation за пункт — атрибут не «мусорный» даже для танка.', 'Each point of Strength adds 0.5 base Retaliation, making it useful for tanks.')] },
  },
  archer: {
    progress: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Fierce', 'Precise', 'Brutal', 'Companion\'s', 'Fortified', 'Devastating'], talismans: ['Fury + Spirit'], pets: t('1 боевой + 1 пет на Egg/Item + 2 защитных', '1 combat pet + 1 Egg/Item Drop pet + 2 defensive pets'), notes: [t('Spike Trap мгновенно снимает до 35% HP монстра в начале боя — ускоряет фарм-ML.', 'Spike Trap removes up to 35% of a monster’s HP at the start of combat, speeding up ML farming.'), t('Hunter\'s Instinct может свести обычного монстра к 1 HP — лучший «фарм-снэп» класса.', 'Hunter’s Instinct can reduce a regular monster to 1 HP at the start of combat, making it a strong farming skill.')] },
    farm: { stance: 'beastmaster', gems: G.farm, dropBonuses: ['Scavenger\'s', 'Prosperous', 'Scholarly', 'Companion\'s'], talismans: ['Spirit + Recovery'], pets: t('пет с Item/Gold бонусами + 3 боевых', '1 pet with Item Drop/Gold bonuses + 3 combat pets'), notes: [t('Egg Hunter — единственный классовый источник шанса на яйца: держите 5/5, если фармите петов.', 'Egg Hunter supplies the Archer’s class bonus to egg drops. Keep it at 5/5 when farming pets.'), t('Foraging Companion + Trap Mastery = быстрый фарм материалов.', 'Combine Foraging Companion and Trap Mastery to farm materials quickly.')] },
    boss: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Slayer\'s', 'Brutal', 'Precise', 'Fierce', 'Devastating'], talismans: ['Fury + Spirit'], pets: t('боевой пет на Crit/Double Damage', 'Combat pet with critical strike and Double Damage bonuses'), notes: [t('Perfect Shot + Headshot дают лучший крит-скачок среди классов.', 'Perfect Shot and Headshot give Archers the strongest critical hit spike of any class.'), t('Boss Damage есть и в Hunting (Hunter\'s Mark, 5% за очко).', 'The Hunting branch also grants Boss Damage through Hunter’s Mark (5% per point).')] },
    pets: { stance: 'beastmaster', gems: G.pet, dropBonuses: ['Companion\'s', 'Scavenger\'s', 'Fortified', 'Vampiric'], talismans: ['Spirit + Spirit'], pets: t('4 пета, максимум Pet Damage и Pet Mastery', '4 pets focused on Pet Damage and Pet Mastery'), notes: [t('Beast Bond(+60%) + Pack Leader(+40%) + Strong Pet Bound(+5 Mastery) + Alpha Strike = ядро пет-билда.', 'Beast Bond (+60%), Pack Leader (+40%), Strong Pet Bound (+5 Mastery) and Alpha Strike form the core of the pet build.'), t('Quiver в оффхенде даёт Pet Mastery Level — имплисит, который растёт с тиром.', 'The offhand quiver has built-in Pet Mastery Level that rises with its tier.')] },
    retaliation: { stance: 'bulwark', gems: G.defense, dropBonuses: ['Reflecting', 'Armored', 'Fortified', 'Resilient', 'Evasive'], talismans: ['Iron + Spirit'], pets: t('пет с Defense/HP', 'Pet with Defense and HP'), notes: [t('Archer по своей природе хуже в Retaliation: нет блока щита и нет классовых защитных навыков.', 'Archers have weaker Retaliation because they lack shield Block and defensive class skills.'), t('Если хочется Retaliation — берите Barbed Arrows (LoH) и максимум Fortified/Armored.', 'For Retaliation, take Barbed Arrows for Life on Hit and prioritize Fortified and Armored.')] },
  },
  mage: {
    progress: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Fierce', 'Precise', 'Brutal', 'Devastating', 'Relentless', 'Fortified'], talismans: ['Fury + Recovery'], pets: t('боевой пет + 3 защитных', '1 combat pet + 3 defensive pets'), notes: [t('Mage — самый «скейлящийся» класс: до появления нормальных аффиксов и Torch он слабее воина/разбоя.', 'Mages scale strongly with gear. Until you find good affixes and a Torch, expect less damage than a Warrior or Rogue.'), t('Book в оффхенде даёт Critical Damage — базовый слой крит-урона.', 'The offhand book supplies base Critical Damage.')] },
    farm: { stance: 'aggressive', gems: G.farm, dropBonuses: ['Prosperous', 'Scholarly', 'Fierce', 'Precise'], talismans: ['Recovery + Fury'], pets: t('пет с Gold/EXP бонусами', 'Pet with Gold/EXP bonuses'), notes: [t('У Mage нет классового Item Drop — компенсируйте Scavenger\'s и Amber-гемами.', 'Mages have no Item Drop Chance class skills. Use Scavenger’s and Amber gems to make up the difference.'), t('Soul Harvest даёт рубины и руны — прямой доход на прогресс.', 'Soul Harvest grants rubies and runes to fund progression.')] },
    boss: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Slayer\'s', 'Brutal', 'Precise', 'Devastating', 'Fierce'], talismans: ['Fury + Fury'], pets: t('боевой пет на Crit Damage', 'Combat pet with Critical Damage'), notes: [t('Pyroclasm (+100% к крит-взрыву) и Arcane Cascade (DD→x3) — лучший бурст в игре по одной цели.', 'Pyroclasm (+100% critical explosion damage) and Arcane Cascade (Double Damage can become triple damage) give Mages the highest single-target burst.'), t('Крит-шанс свыше 100% не теряется: он превращается в Crit Damage 1:1.', 'Critical strike chance above 100% converts into Critical Damage at a 1:1 ratio.')] },
    pets: { stance: 'harmony', gems: G.pet, dropBonuses: ['Companion\'s', 'Fierce', 'Fortified'], talismans: ['Spirit + Fury'], pets: t('1 атакующий + 3 с Pet Damage', '1 attacking pet + 3 pets with Pet Damage bonuses'), notes: [t('У мага нет классовых пет-бонусов: пет-билд строится на экипировке, рунax и Talisman of Spirit.', 'Mages have no class bonuses for pets. Build Pet Damage through gear, runes and Talisman of Spirit.')] },
    retaliation: { stance: 'bulwark', gems: G.defense, dropBonuses: ['Reflecting', 'Armored', 'Fortified', 'Resilient'], talismans: ['Iron + Recovery'], pets: t('пет с Defense', 'Pet with Defense'), notes: [t('Магу для Retaliation не хватает блока — опирайтесь на Defense, DR и жизнь.', 'Mages lack shield Block for Retaliation. Prioritize Defense, Damage Reduction and HP.')] },
  },
  rogue: {
    progress: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Fierce', 'Relentless', 'Devastating', 'Precise', 'Brutal', 'Prosperous', 'Scavenger\'s'], talismans: ['Fury + Spirit'], pets: t('боевой пет + фарм-пет', '1 combat pet + 1 farming pet'), notes: [t('Два даггера = 100% Double Hit до других источников: доп. удары — лучший ранний скейл.', 'Two daggers give 100% Double Hit before other bonuses. The extra strikes are your strongest early damage boost.'), t('Claws (ML 25+) дают до +200% крит-шанса на паре — переход в крит-билд.', 'A pair of claws (ML 25+) grants up to +200% critical strike chance for a crit build.')] },
    farm: { stance: 'aggressive', gems: G.farm, dropBonuses: ['Prosperous', 'Scavenger\'s', 'Lucky', 'Scholarly'], talismans: ['Fury + Recovery'], pets: t('пет с Item/Gold бонусами', 'Pet with Item Drop/Gold bonuses'), notes: [t('Rogue — официально лучший «общий» класс для фарма в S2.', 'The Season 2 guide rates Rogue as the best all-around farming class.'), t('Lucky Hands + Treasure Hunter + Black Market = максимум дропа и тиров.', 'Combine Lucky Hands, Treasure Hunter and Black Market to improve drop rates and item tiers.')] },
    boss: { stance: 'aggressive', gems: G.ad, dropBonuses: ['Slayer\'s', 'Brutal', 'Precise', 'Devastating', 'Relentless'], talismans: ['Fury + Fury'], pets: t('боевой пет на Crit Damage', 'Combat pet with Critical Damage'), notes: [t('Shadow Echo + Umbral Cascade — повторные удары, которые «перезапускают» криты и DD.', 'Shadow Echo and Umbral Cascade repeat hits, giving critical strikes and Double Damage another chance to trigger.'), t('First Strike + Contract Killer дают бонусы на всю полосу HP босса.', 'First Strike and Contract Killer give damage bonuses across the boss’s HP bar.')] },
    pets: { stance: 'harmony', gems: G.pet, dropBonuses: ['Companion\'s', 'Scavenger\'s', 'Fierce'], talismans: ['Spirit + Fury'], pets: t('4 пета с Pet Damage/Item Find', '4 pets with Pet Damage and Item Find'), notes: [t('Rogue не пет-класс, но благодаря фарм-навыкам хорошо тянет гибрид на Harmony.', 'The Rogue’s farming skills support a Harmony hybrid, even with few class options for pets.')] },
    retaliation: { stance: 'bulwark', gems: G.defense, dropBonuses: ['Reflecting', 'Armored', 'Fortified', 'Resilient', 'Evasive'], talismans: ['Iron + Fury'], pets: t('пет с Defense', 'Pet with Defense'), notes: [t('У разбоя нет щита: Retaliation придётся собирать только через Drop Bonus Reflecting и Defense.', 'Rogues cannot equip a shield. Build Retaliation through the Reflecting drop bonus and Defense.')] },
  },
  druid: {
    progress: { stance: 'harmony', gems: G.pet, dropBonuses: ['Companion\'s', 'Fierce', 'Fortified', 'Scavenger\'s'], talismans: ['Spirit + Fury'], pets: t('4 пета: атакующий + 3 вспомогательных', '4 pets, with 1 attacker and 3 support pets'), notes: [t('Druid держится на Harmony: класс усиливает пета и конвертирует свой плоский урон в урон пета (Kinship 3% и Feral Bond 4% за очко, общий кап 75%).', 'Harmony suits Druids because they boost their pet and convert flat character damage into Pet Damage. Kinship converts 3% per point and Feral Bond converts 4%, with a shared 75% cap.'), t('Ветки: Lodge усиливает боевого пета (Gnaw, Dam Builder, Tail Slap, Lodgekeeper), Tunnels — фарм (Digger, Keen Snout, Hoard, Deep Roots) и добивание (Undermine), Symbiosis — конверсию урона и крит-урон.', 'Lodge buffs the combat pet with Gnaw, Dam Builder, Tail Slap and Lodgekeeper. Tunnels improves farming with Digger, Keen Snout, Hoard and Deep Roots, and executes enemies with Undermine. Symbiosis improves damage conversion and Critical Damage.')] },
    farm: { stance: 'harmony', gems: G.farm, dropBonuses: ['Prosperous', 'Scavenger\'s', 'Scholarly', 'Companion\'s'], talismans: ['Spirit + Recovery'], pets: t('пет с Egg/Item бонусами', 'Pet with Egg/Item Drop bonuses'), notes: [t('Druid хорошо фармит: Hoard (+5% золота за очко), Digger (+2% материалов и +1% дропа за очко), Keen Snout (яйца) и Deep Roots (опыт пета, руны).', 'Hoard grants +5% gold per point. Digger grants +2% materials and +1% Item Drop Chance per point. Keen Snout helps with eggs and Deep Roots adds pet EXP and runes.')] },
    boss: { stance: 'harmony', gems: G.pet, dropBonuses: ['Slayer\'s', 'Companion\'s', 'Brutal', 'Precise', 'Devastating'], talismans: ['Spirit + Fury'], pets: t('атакующий пет с Crit/DD', 'Attacking pet with critical strike and Double Damage bonuses'), notes: [t('Гибрид даёт босс-урон и от пета, и от персонажа: Timberfall (+5% Boss Damage за очко) и Slayer\'s множат оба.', 'The hybrid deals boss damage through both pet and character. Timberfall (+5% Boss Damage per point) and Slayer’s multiply both.')] },
    pets: { stance: 'beastmaster', gems: G.pet, dropBonuses: ['Companion\'s', 'Scavenger\'s', 'Fortified'], talismans: ['Spirit + Spirit'], pets: t('4 пета с максимальным Pet Damage', '4 pets focused on maximum Pet Damage'), notes: [t('Gnarled Stick (двуручное) даёт Pet Damage в имплисите — обязательный слот для пет-билда.', 'Gnarled Stick is a two-handed weapon with built-in Pet Damage and is essential for this pet build.'), t('Gnaw (10 очков, +8% урона пета за очко) и One Soul (+5% за очко) — база пет-урона, Dam Builder добавляет плоский урон пету.', 'Gnaw (10 points, +8% Pet Damage per point) and One Soul (+5% per point) supply the core Pet Damage. Dam Builder adds flat Pet Damage.')] },
    retaliation: { stance: 'bulwark', gems: G.defense, dropBonuses: ['Reflecting', 'Armored', 'Fortified', 'Resilient'], talismans: ['Iron + Iron'], pets: t('пет с Defense/HP', 'Pet with Defense and HP'), notes: [t('Retaliation-Druid — экспериментальный билд: у Druid нет защитных навыков, кроме Thick Pelt (+5% макс. HP за очко), поэтому Defense и Reflecting берутся только из экипировки, камней и талисманов.', 'Retaliation Druid is experimental. Thick Pelt (+5% max HP per point) is the only defensive class skill, so Defense and Reflecting come from gear, gems and talismans.')] },
  },
};

export function profileFor(classId, goalId) {
  return PROFILES[classId]?.[goalId] || PROFILES.warrior.progress;
}

export function weightsFor(classId, goalId) {
  return W[classId]?.[goalId] || W.warrior.progress;
}

export function statPriorityFor(classId, goalId) {
  return P[classId]?.[goalId] || P.warrior.progress;
}

/* ------------------------------------------------------------------ *
 *  Правила экипировки: какой предмет надевать в каждый слот и почему. *
 *  id семейств — из src/data/items.js (GEAR_FAMILIES, полный Item Codex).
 * ------------------------------------------------------------------ */

const ARMOR_GOAL = {
  progress: { chest: 'wardplate', head: 'visionary_hood', hands: 'slayer_gauntlets', feet: 'grounded_treads' },
  boss: { chest: 'wardplate', head: 'visionary_hood', hands: 'slayer_gauntlets', feet: 'swiftstride_boots' },
  farm: { chest: 'bloodweave_vest', head: 'sage_diadem', hands: 'berserker_grips', feet: 'pathfinder_treads' },
  pets: { chest: 'harmonic_cuirass', head: 'beast_crown', hands: 'symbiotic_handwraps', feet: 'bloodweave_vest' },
  retaliation: { chest: 'wardplate', head: 'sage_diadem', hands: 'slayer_gauntlets', feet: 'grounded_treads' },
};
// Слоты ног: boots-семейства (base уже идёт как «подставка»)
const BOOTS_GOAL = {
  progress: 'grounded_treads',
  boss: 'swiftstride_boots',
  farm: 'pathfinder_treads',
  pets: 'pathfinder_treads',
  retaliation: 'grounded_treads',
};
const JEWELRY = { strength: 'warriors', dexterity: 'rangers', intelligence: 'scholars' };

export function goalGearRules(classId, goal) {
  const main = CLASSES_MAIN_STAT[classId] || 'strength';
  const jw = JEWELRY[main] || 'warriors';
  const rules = {};
  const twoHand = goal === 'boss'; // для «боссового» урона двуручка выгоднее, для остального — оффхенд

  if (classId === 'warrior') {
    rules.mainhand = twoHand ? ['greatsword', 'broken_sword'] : ['broken_sword', 'greatsword'];
    rules.offhand = ['wooden_shield'];
  }
  if (classId === 'archer') {
    rules.mainhand = twoHand ? ['crossbow', 'wooden_bow'] : ['wooden_bow', 'crossbow'];
    rules.offhand = ['quiver'];
  }
  if (classId === 'mage') {
    // Книжка (Crit Damage) обычно сильнее посоха: двуручку оставляем как альтернативу.
    rules.mainhand = ['wooden_rod', 'grand_staff'];
    rules.offhand = ['old_book'];
  }
  if (classId === 'rogue') {
    // Два оружия: для крит-билда клешни, для фарма/прогресса кинжалы (Double Hit).
    const crit = goal === 'boss' || goal === 'pets';
    rules.mainhand = crit ? ['claws', 'rusty_dagger'] : ['rusty_dagger', 'claws'];
    rules.offhand = crit ? ['claws', 'rusty_dagger'] : ['rusty_dagger', 'claws'];
  }
  if (classId === 'druid') {
    rules.mainhand = ['gnarled_stick'];
    rules.offhand = []; // двуручный посох — оффхенд пуст
  }

  rules.torch = ['torch'];
  const armor = ARMOR_GOAL[goal] || ARMOR_GOAL.progress;
  rules.chest = [armor.chest, 'rags'];
  rules.head = [armor.head, 'leather_cap'];
  rules.hands = [armor.hands, 'worn_gloves'];
  rules.feet = [BOOTS_GOAL[goal] || 'grounded_treads', 'sandals_of_starszy'];
  rules.amulet = [`${jw}_amulet`];
  rules.ring = [`${jw}_ring`, jw === 'warriors' ? 'adventurers_ring' : jw === 'rangers' ? 'adventurers_ring' : 'adventurers_ring'];
  rules.belt = [`${jw}_belt`];
  return rules;
}

const CLASSES_MAIN_STAT = { warrior: 'strength', archer: 'dexterity', mage: 'intelligence', rogue: 'dexterity', druid: 'strength' };

/** Стат приоритета → id аффиксов, которые его дают. */
export const STAT_TO_AFFIX = {
  ad: ['striking'],
  crit: ['critchance'],
  critDmg: ['critdamage'],
  dd: ['devastation'],
  dh: ['doublehit'],
  maxHp: ['ambulance'],
  defense: ['fortification', 'fortress', 'bulwark'],
  dr: ['warding'],
  dodge: ['evasive'],
  petDamage: ['petdmg'],
  loh: ['regeneration'],
  lok: ['vampirism'],
  gold: ['wealth'],
  exp: ['experience'],
  itemDrop: [],
  mat: [],
  eggDrop: [],
  block: [],
  retal: [],
  lucky: [],
  boss: [],
};

/** Общий чек-лист нюансов, которые чаще всего ломают билд. */
export const CHECKLIST = [
  { title: t('Крит-шанс выше 100% не пропадает', 'Critical strike chance above 100% still helps'), text: t('Каждый +1% сверх 100% превращается в +1% Critical Damage. Собирать 150% крита — нормально.', 'Each 1% above 100% converts to 1% Critical Damage. A build with 150% critical strike chance can still use the full bonus.') },
  { title: t('Double Hit и Double Damage считаются «полными сотнями»', 'Double Hit and Double Damage build in steps of 100%'), text: t('250% DH = 3 гарантированных удара + 50% на 4-й. 250% DD = ×3 гарантированно и 50% на ×4. Но доп. удары не бьют уже мёртвого монстра — против слабых врагов DH «сгорает».', 'At 250% DH, you get 3 guaranteed hits and a 50% chance of a fourth. At 250% DD, you deal ×3 damage with a 50% chance of ×4. Extra hits stop once the monster dies, limiting their value against weak enemies.') },
  { title: t('Damage Reduction: софт-кап 95%, хард 99%', 'Damage Reduction has a 95% soft cap and a 99% hard cap'), text: t('Выше 95% каждый процент DR работает лишь на 10%. Персонаж всегда получает минимум 1% удара. Flat DR (Wardplate) не слабеет с ростом ML — в отличие от Defense.', 'Above 95%, each extra percentage point of DR gives only 10% of its usual benefit. You always take at least 1% of a hit. Flat DR from Wardplate retains its effect as ML rises, while Defense becomes less effective.') },
  { title: t('Defense — двойной стат', 'Defense affects incoming and outgoing damage'), text: t('Он и снижает урон, и усиливает Retaliation (Retaliation = Reflecting% × Defense). В S2 выживаемость важнее, чем в S1.', 'Defense reduces incoming damage and increases Retaliation (Reflecting% × Defense). Survivability matters more in Season 2 than in Season 1.') },
  { title: t('В Bulwark уклонение = 0%', 'Bulwark sets Dodge to 0%'), text: t('Если играете Retaliation-воина, не собирайте Dodge: он не работает в этой стойке.', 'Dodge bonuses have no effect while your Retaliation Warrior uses this stance.') },
  { title: t('Slayer\'s (Boss Damage) не работает по монстрам', 'Slayer’s (Boss Damage) applies to specific encounters'), text: t('Daily Boss / Guild Boss / Tower — да; Elemental Conflux — 50%; обычные монстры — нет.', 'Slayer’s works in Daily Boss, Guild Boss and Tower, works at 50% in Elemental Conflux, and gives no bonus against regular monsters.') },
  { title: t('Fierce умножает только атаку персонажа', 'Fierce multiplies character Attack Damage'), text: t('Pet Damage он не усиливает. Для пета — Companion\'s.', 'Use Companion’s to increase Pet Damage.') },
  { title: t('EXP Gain не ускоряет Monster Level', 'EXP Gain affects character level'), text: t('Опыт персонажа и прогресс ML — разные вещи.', 'Monster Level advances separately from character EXP.') },
  { title: t('Lucky имеет диминишинг', 'Lucky has diminishing returns'), text: t('Gear Lucky и Black Market складываются в один пул с убывающей отдачей. С ML 260 Lucky влияет и на Gilded-дроп.', 'Lucky from gear shares a pool with Black Market. From ML 260, Lucky also affects Gilded drops.') },
  { title: t('Pet Compounding ограничен балансом', 'Your weakest equipped pet limits compounding'), text: t('Пет считается максимум на 10 компоунд-уровней выше САМОГО СЛАБОГО надетого пета (25 на Permanent). Один перекачанный пет = потеря бонуса.', 'A pet’s effective bonus caps at 10 compound levels above your weakest equipped pet (25 on Permanent). Overleveling one pet alone wastes the extra bonus.') },
  { title: t('Смена класса почти бесплатна, но ограничена', 'Class changes have a cost and cooldown'), text: t('Первая смена — 0, далее 25 Arcstone, кулдаун растёт до недели; снаряжение конвертируется, аффиксы под Rogue рероллятся.', 'Your first change is free. Later changes cost 25 Arcstone and the cooldown grows to a week. Gear converts to the new class and incompatible Rogue affixes reroll.') },
  { title: t('Gear Score ≠ сила', 'Gear Score counts occupied slots'), text: t('Он считает только занятые слоты: под двуручкой оффхенд пуст, и это нормально.', 'A two-handed weapon leaves the offhand empty. Only occupied slots add to the score.') },
  { title: t('Проверяйте источники', 'Check the sources'), text: t('Игра обновляется несколько раз в неделю. Данные приложения — снапшот 1.3.1 от 4 октября 2026; спорные значения помечены как непроверенные.', 'The game updates several times a week. This guide uses the October 4, 2026 snapshot of version 1.3.1 and marks values that still need confirmation.') },
];
