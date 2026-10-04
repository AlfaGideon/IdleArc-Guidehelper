/**
 * Предметы IdleArc: полный каталог 40 семейств экипировки, аффиксы, Drop Bonuses,
 * гемы, сокеты и таблица дропа по Monster Level.
 *
 * Источники:
 *  - idlearc.fandom.com/wiki/Item_Codex (карточки всех семейств: имена по тирам, имплиситы, совместимые аффиксы)
 *  - idlearc.fandom.com/wiki/Item_Codex/Affixes, /Item_Codex/Drop_Bonuses
 *  - idlearc.fandom.com/wiki/Gems
 *  - idlearc.com/patch-notes/1-3-1 (официальные патч-ноты Season 2)
 */

export const RARITY = [
  { tier: 'T1', name: 'Normal', ru: 'Обычный', color: '#b7b7b7', affixes: 0, mult: 1.0, maxPlus: 4 },
  { tier: 'T2', name: 'Uncommon', ru: 'Необычный', color: '#69d17d', affixes: 1, mult: 1.2, maxPlus: 9 },
  { tier: 'T3', name: 'Rare', ru: 'Редкий', color: '#5ba7ff', affixes: 2, mult: 1.4, maxPlus: 14 },
  { tier: 'T4', name: 'Epic', ru: 'Эпический', color: '#bd76ff', affixes: 3, mult: 1.7, maxPlus: 19 },
  { tier: 'T5', name: 'Legendary', ru: 'Легендарный', color: '#ffc857', affixes: 4, mult: 2.0, maxPlus: 24 },
  { tier: 'T6', name: 'Infernal', ru: 'Инфернальный', color: '#ff6b5f', affixes: 5, mult: 2.5, maxPlus: 30 },
];

/** Аффиксы: базовый ролл × множитель редкости; +3% к значению за каждый +уровень предмета. */
export const AFFIXES = [
  { id: 'blazing', name: 'Blazing', type: 'prefix', stat: 'Fire Conversion', ru: 'Конверсия в огонь', base: '3–5', slots: ['Weapon'] },
  { id: 'earthen', name: 'Earthen', type: 'prefix', stat: 'Earth Conversion', ru: 'Конверсия в землю', base: '3–5', slots: ['Weapon'] },
  { id: 'tidal', name: 'Tidal', type: 'prefix', stat: 'Water Conversion', ru: 'Конверсия в воду', base: '3–5', slots: ['Weapon'] },
  { id: 'voltaic', name: 'Voltaic', type: 'prefix', stat: 'Air Conversion', ru: 'Конверсия в воздух', base: '3–5', slots: ['Weapon'] },
  { id: 'venomous', name: 'Venomous', type: 'prefix', stat: 'Poison Conversion', ru: 'Конверсия в яд', base: '3–5', slots: ['Weapon'] },
  { id: 'verdant', name: 'Verdant', type: 'prefix', stat: 'Nature Conversion', ru: 'Конверсия в природу', base: '3–5', slots: ['Weapon'] },
  { id: 'evasive', name: 'Evasive', type: 'prefix', stat: 'Dodge Chance', ru: 'Шанс уклонения', base: '0.5–1', slots: ['Chest', 'Helmet', 'Boots', 'Gloves', 'Shield', 'Torch'] },
  { id: 'ambulance', name: 'of Ambulance', type: 'prefix', stat: 'Max Health', ru: 'Макс. HP', base: '10–50', slots: ['Chest', 'Helmet', 'Boots', 'Gloves', 'Amulet', 'Ring', 'Belt'] },
  { id: 'fortification', name: 'of Fortification', type: 'prefix', stat: 'Flat Defense', ru: 'Плоская защита', base: '3–10', slots: ['Chest', 'Helmet', 'Boots', 'Gloves'] },
  { id: 'petdmg', name: 'of Pet Damage', type: 'prefix', stat: 'Pet Damage', ru: 'Урон пета', base: '2–8', slots: ['All'] },
  { id: 'bulwark', name: 'of the Bulwark', type: 'prefix', stat: 'Local Defense', ru: 'Локальная защита (% от Defense предмета)', base: '10–30', slots: ['Chest', 'Helmet', 'Boots', 'Gloves'] },
  { id: 'warding', name: 'of Warding', type: 'prefix', stat: 'Damage Reduction', ru: 'Снижение урона', base: '1–3', slots: ['Chest', 'Helmet', 'Shield', 'Torch'] },
  { id: 'bloodthirst', name: 'of Bloodthirst', type: 'suffix', stat: 'Bloodthirst (+% к LoH/LoK)', ru: 'Bloodthirst', base: '1–2', slots: ['Torch'] },
  { id: 'critchance', name: 'of Crit Chance', type: 'suffix', stat: 'Critical Strike Chance', ru: 'Шанс крита', base: '1–2', slots: ['All'] },
  { id: 'critdamage', name: 'of Crit Damage', type: 'suffix', stat: 'Critical Damage', ru: 'Урон крита', base: '1–3', slots: ['All'] },
  { id: 'devastation', name: 'of Devastation', type: 'suffix', stat: 'Double Damage Chance', ru: 'Шанс Double Damage', base: '1–2', slots: ['All'] },
  { id: 'dexterity', name: 'of Dexterity', type: 'suffix', stat: 'Dexterity', ru: 'Ловкость', base: '2–4', slots: ['Weapon', 'Ring', 'Amulet', 'Belt'] },
  { id: 'doublehit', name: 'of Double Hit', type: 'suffix', stat: 'Double Hit Chance', ru: 'Шанс Double Hit', base: '1–2', slots: ['Weapon', 'Amulet', 'Ring', 'Belt'] },
  { id: 'experience', name: 'of Experience', type: 'suffix', stat: 'EXP Gain', ru: 'Опыт', base: '1–3', slots: ['All'] },
  { id: 'intelligence', name: 'of Intelligence', type: 'suffix', stat: 'Intelligence', ru: 'Интеллект', base: '2–4', slots: ['Weapon', 'Ring', 'Amulet', 'Belt'] },
  { id: 'regeneration', name: 'of Regeneration', type: 'suffix', stat: 'Life on Hit', ru: 'HP за удар', base: '1–1', slots: ['Weapon', 'Ring', 'Amulet'] },
  { id: 'strength', name: 'of Strength', type: 'suffix', stat: 'Strength', ru: 'Сила', base: '2–4', slots: ['Weapon', 'Ring', 'Amulet', 'Belt'] },
  { id: 'striking', name: 'of Striking', type: 'suffix', stat: 'Flat Damage', ru: 'Плоский урон', base: '4–10', slots: ['Ring', 'Amulet', 'Belt'] },
  { id: 'fortress', name: 'of the Fortress', type: 'suffix', stat: 'Defense', ru: 'Защита', base: '3–8', slots: ['Belt', 'Ring', 'Amulet'] },
  { id: 'vampirism', name: 'of Vampirism', type: 'suffix', stat: 'Life on Kill', ru: 'HP за убийство', base: '3–10', slots: ['Weapon', 'Ring', 'Amulet'] },
  { id: 'wealth', name: 'of Wealth', type: 'suffix', stat: 'Gold Gain', ru: 'Золото', base: '2–5', slots: ['All'] },
];

export const DROP_BONUSES = [
  { id: 'fierce', name: 'Fierce', stat: 'Attack Damage', ru: 'Атака', cat: 'Offensive', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–34', '34–42', '42–50'],
    note: 'Умножает Attack Damage ДО критов и доп. ударов. НЕ влияет на урон пета.' },
  { id: 'precise', name: 'Precise', stat: 'Critical Strike Chance', ru: 'Шанс крита', cat: 'Offensive', min: 'T2',
    values: ['2–3', '3–5', '5–8', '8–12', '12–19', '19–30', '30–47', '47–75'],
    note: 'Крит-шанс свыше 100% конвертируется в Crit Damage 1:1.' },
  { id: 'brutal', name: 'Brutal', stat: 'Critical Damage', ru: 'Урон крита', cat: 'Offensive', min: 'T2',
    values: ['2–3', '3–5', '5–8', '8–12', '12–19', '19–30', '30–47', '47–75'],
    note: 'Игнорирует обычный кап аффикса Crit Damage.' },
  { id: 'relentless', name: 'Relentless', stat: 'Double Hit Chance', ru: 'Double Hit', cat: 'Offensive', min: 'T3',
    values: ['—', '2–4', '4–7', '7–11', '11–17', '17–28', '28–46', '46–75'],
    note: 'Каждые 100% — гарантированный доп. удар, остаток — шанс ещё одного.' },
  { id: 'devastating', name: 'Devastating', stat: 'Double Damage Chance', ru: 'Double Damage', cat: 'Offensive', min: 'T3',
    values: ['—', '2–4', '4–7', '7–11', '11–17', '17–28', '28–46', '46–75'],
    note: 'Работает и на персонажа, и на пета, и на элементальный урон.' },
  { id: 'companions', name: "Companion's", stat: 'Pet Damage', ru: 'Урон пета', cat: 'Offensive', min: 'T2',
    values: ['2–4', '5–8', '9–14', '15–22', '22–32', '32–40', '40–50', '50–64'],
    note: 'Умножает урон активного пета, не влияет на атаку персонажа.' },
  { id: 'slayers', name: "Slayer's", stat: 'Boss Damage', ru: 'Урон по боссам', cat: 'Offensive', min: 'T4',
    values: ['—', '—', '5–10', '10–18', '18–28', '28–36', '36–43', '43–50'],
    note: 'Daily Boss, Guild Boss, Tower. По монстрам не работает; в Conflux — 50%.' },
  { id: 'fortified', name: 'Fortified', stat: 'Max Health', ru: 'Макс. HP', cat: 'Defensive', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–35', '35–45', '45–60'] },
  { id: 'armored', name: 'Armored', stat: 'Defense', ru: 'Защита', cat: 'Defensive', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–35', '35–45', '45–60'] },
  { id: 'resilient', name: 'Resilient', stat: 'Damage Reduction', ru: 'Снижение урона', cat: 'Defensive', min: 'T3',
    values: ['—', '0.5–1', '1–2', '2–4', '4–6', '6–8', '8–11', '11–15'],
    note: 'Софт-кап 95%, хард-кап 99%; выше 95% работает на 10%.' },
  { id: 'evasive', name: 'Evasive', stat: 'Dodge Chance', ru: 'Уклонение', cat: 'Defensive', min: 'T4',
    values: ['—', '—', '1–2', '2–4', '4–6', '6–8', '8–11', '11–15'] },
  { id: 'vampiric', name: 'Vampiric', stat: 'Life on Hit', ru: 'HP за удар', cat: 'Sustain', min: 'T2',
    values: ['1–1', '2–2', '3–4', '5–7', '8–11', '11–15', '15–21', '22–30'] },
  { id: 'draining', name: 'Draining', stat: 'Life on Kill', ru: 'HP за убийство', cat: 'Sustain', min: 'T2',
    values: ['3–6', '7–14', '15–25', '26–40', '40–60', '60–90', '90–134', '134–200'] },
  { id: 'bloodthirsty', name: 'Bloodthirsty', stat: 'Bloodthirst', ru: 'Bloodthirst', cat: 'Sustain', min: 'T5',
    values: ['—', '—', '—', '5–10', '11–15', '16–18', '19–21', '22–25'],
    note: 'Новый в S2 множитель лечения LoH/LoK.' },
  { id: 'prosperous', name: 'Prosperous', stat: 'Gold Gain', ru: 'Золото', cat: 'Farming', min: 'T2',
    values: ['2–5', '5–10', '10–16', '16–25', '25–38', '38–53', '53–73', '73–100'] },
  { id: 'scholarly', name: 'Scholarly', stat: 'EXP Gain', ru: 'Опыт', cat: 'Farming', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–37', '37–53', '53–75'] },
  { id: 'scavengers', name: "Scavenger's", stat: 'Item Drop Chance', ru: 'Дроп предметов', cat: 'Farming', min: 'T3',
    values: ['—', '1–3', '3–5', '5–8', '8–12', '12–17', '17–23', '23–32'],
    note: 'У Mage нет классового Item Drop — компенсируйте этим бонусом.' },
  { id: 'reflecting', name: 'Reflecting', stat: 'Retaliation Damage', ru: 'Урон возмездия', cat: 'New Mechanic', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–34', '34–42', '42–50'],
    note: 'Retaliation = Reflecting% × Defense. Блокированный удар даёт +50%.' },
  { id: 'lucky', name: 'Lucky', stat: 'Lucky Chance', ru: 'Удача (высший тир)', cat: 'New Mechanic', min: 'T4',
    values: ['—', '—', '1–3', '3–6', '6–9', '9–12', '12–15', '15–20'],
    note: 'Lucky + Black Market — один пул с убывающей отдачей. С ML 260 влияет на Gilded-дроп.' },
  { id: 'elementalsurge', name: 'Elemental Surge', stat: 'Elemental Amplification', ru: 'Усиление элемента', cat: 'New Mechanic', min: 'T4',
    values: ['—', '—', '3–6', '6–10', '10–15', '15–21', '21–29', '29–40'] },
  { id: 'frenzy', name: 'Frenzy', stat: 'Extra Kill Chance', ru: 'Extra Kill', cat: 'New Mechanic', min: 'T5',
    values: ['—', '—', '—', '2–4', '4–6', '6–8', '8–11', '11–15'] },
];

export const DROP_BONUS_TIER_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7 Gilded', 'T8 Radiant', 'T9 Mythic'];
export const DROP_BONUS_CATEGORIES = ['Offensive', 'Defensive', 'Sustain', 'Farming', 'New Mechanic'];

/** Каталожные категории: какие бонусы уместны в каких слотах. */
export const DROP_BONUS_SLOT_CATEGORIES = {
  mainhand: ['Offensive'],
  offhand: ['Offensive', 'Defensive'],
  torch: ['Offensive', 'Sustain', 'Farming'],
  chest: ['Defensive', 'Sustain'],
  head: ['Defensive', 'Offensive'],
  hands: ['Offensive', 'Defensive'],
  feet: ['Defensive', 'Farming'],
  amulet: ['Offensive', 'Farming'],
  ring: ['Offensive', 'Farming'],
  belt: ['Sustain', 'Offensive', 'Farming'],
};

/* ---------------------------------- Гемы ---------------------------------- */

export const GEM_FAMILIES = [
  { id: 'garnet', name: 'Garnet', ru: 'Гранат', slots: { weapon: '+0.5% Attack Damage', torch: '+0.6% Max Health', armor: '+0.6% Defense', jewelry: '+5 Strength' } },
  { id: 'jade', name: 'Jade', ru: 'Жад', slots: { weapon: '+0.5% Pet Damage', torch: '+0.3% Attack Damage', armor: '+0.6% Max Health', jewelry: '+5 Dexterity' } },
  { id: 'lapis', name: 'Lapis', ru: 'Лазурит', slots: { weapon: '+0.25% Attack Damage + 0.25% Pet Damage + 0.25% Retaliation', torch: '+0.3% Pet Damage', armor: '+2% EXP Gain', jewelry: '+5 Intelligence' } },
  { id: 'amber', name: 'Amber', ru: 'Янтарь', slots: { weapon: '+2% Gold Gain', torch: '+1% Item Drop Chance', armor: '+2% Material Drop Chance', jewelry: '+0.8% Gold + 0.8% EXP + 0.4% Item Drop' } },
];

export const GEM_RARITY = [
  { id: 'rough', name: 'Rough', ru: 'Черновой', mult: 1.0, secondary: 0, socketCap: 10 },
  { id: 'cut', name: 'Cut', ru: 'Огранённый', mult: 1.6, secondary: 1, socketCap: 25 },
  { id: 'polished', name: 'Polished', ru: 'Полированный', mult: 2.5, secondary: 1, socketCap: 50 },
  { id: 'brilliant', name: 'Brilliant', ru: 'Блестящий', mult: 4.0, secondary: 2, socketCap: 100 },
  { id: 'flawless', name: 'Flawless', ru: 'Безупречный', mult: 6.5, secondary: 3, socketCap: null,
    note: 'Только дроп с ML 160, не создаётся фьюзом, не подвержен луут-бустам.' },
];

export const GEM_SECONDARY = [
  { stat: 'Critical Chance', ru: 'Шанс крита', cut: 0.5, polished: 1, brilliant: 1.5, flawless: 2.5 },
  { stat: 'Critical Damage', ru: 'Урон крита', cut: 2, polished: 4, brilliant: 6, flawless: 10 },
  { stat: 'Double Hit Chance', ru: 'Double Hit', cut: 0.5, polished: 1, brilliant: 1.5, flawless: 2.5 },
  { stat: 'Double Damage Chance', ru: 'Double Damage', cut: 0.5, polished: 1, brilliant: 1.5, flawless: 2.5 },
  { stat: 'Life on Hit', ru: 'HP за удар', cut: 1, polished: 2, brilliant: 4, flawless: 8 },
  { stat: 'Life on Kill', ru: 'HP за убийство', cut: 2, polished: 4, brilliant: 8, flawless: 16 },
  { stat: 'Dodge Chance', ru: 'Уклонение', cut: 0.3, polished: 0.6, brilliant: 0.9, flawless: 1.5 },
  { stat: 'Max Health', ru: 'Макс. HP', cut: 10, polished: 25, brilliant: 60, flawless: 150 },
  { stat: 'Gold Gain', ru: 'Золото', cut: 1, polished: 2, brilliant: 3, flawless: 5 },
  { stat: 'EXP Gain', ru: 'Опыт', cut: 1, polished: 2, brilliant: 3, flawless: 5 },
];

export const GEM_SOCKET_UNLOCKS = [
  { socket: 1, ml: 20, gold: '25K' },
  { socket: 2, ml: 65, gold: '50M' },
  { socket: 3, ml: 115, gold: '20B' },
  { socket: 4, ml: 160, gold: '2T' },
];

export const GEM_SOCKET_LEVELS = [
  { level: 1, mult: 1.04, gold: '25K' }, { level: 2, mult: 1.08, gold: '45K' },
  { level: 3, mult: 1.12, gold: '81K' }, { level: 4, mult: 1.16, gold: '145.8K' },
  { level: 5, mult: 1.2, gold: '262.44K' }, { level: 6, mult: 1.24, gold: '472.39K' },
  { level: 7, mult: 1.28, gold: '850.31K' }, { level: 8, mult: 1.32, gold: '1.53M' },
  { level: 9, mult: 1.36, gold: '2.75M' }, { level: 10, mult: 1.4, gold: '4.96M' },
];

export const GEM_DROP_TABLE = [
  { ml: '20+', rough: 100, cut: 0, polished: 0, brilliant: 0 },
  { ml: '25+', rough: 85, cut: 15, polished: 0, brilliant: 0 },
  { ml: '45+', rough: 70, cut: 30, polished: 0, brilliant: 0 },
  { ml: '65+', rough: 45, cut: 45, polished: 10, brilliant: 0 },
  { ml: '90+', rough: 25, cut: 55, polished: 20, brilliant: 0 },
  { ml: '115+', rough: 0, cut: 55, polished: 40, brilliant: 5 },
  { ml: '160+', rough: 0, cut: 30, polished: 56, brilliant: 14 },
  { ml: '220+', rough: 0, cut: 0, polished: 62, brilliant: 38 },
  { ml: '300+', rough: 0, cut: 0, polished: 40, brilliant: 60 },
];

/* ------------------------- Каталог семейств экипировки ------------------------- */

const WEAPON_PREFIXES = ['Blazing', 'Earthen', 'of Pet Damage', 'Tidal', 'Venomous', 'Verdant', 'Voltaic'];
const WEAPON_SUFFIXES = ['of Crit Chance', 'of Crit Damage', 'of Devastation', 'of Dexterity', 'of Double Hit', 'of Experience', 'of Intelligence', 'of Regeneration', 'of Strength', 'of Vampirism', 'of Wealth'];
const ARMOR_AFFIXES = {
  prefixes: ['Evasive', 'of Ambulance', 'of Fortification', 'of Pet Damage', 'of the Bulwark', 'of Warding'],
  suffixes: ['of Crit Chance', 'of Crit Damage', 'of Devastation', 'of Experience', 'of Wealth'],
};
const ARMOR_AFFIXES_NO_WARDING = {
  prefixes: ['Evasive', 'of Ambulance', 'of Fortification', 'of Pet Damage', 'of the Bulwark'],
  suffixes: ARMOR_AFFIXES.suffixes,
};
const JEWELRY_AFFIXES = {
  prefixes: ['of Ambulance', 'of Pet Damage'],
  suffixes: ['of Crit Chance', 'of Crit Damage', 'of Devastation', 'of Dexterity', 'of Double Hit', 'of Experience', 'of Intelligence', 'of Regeneration', 'of Strength', 'of Striking', 'of the Fortress', 'of Vampirism', 'of Wealth'],
};

/**
 * 40 семейств экипировки. implicitTiers — значения T1…T6 в порядке тиров,
 * tierNames — отображаемые имена T1…T6 + A1 (пробуждённый), как в Item Codex.
 */
export const GEAR_FAMILIES = [
  // ---------- Оружие ----------
  { id: 'broken_sword', name: 'Broken Sword', ru: 'Воинский меч', slot: 'mainhand', cls: 'warrior', hand: '1H', unlock: 'Standard',
    tierNames: ['Broken Sword', 'Iron Sword', 'Steel Broadsword', 'Silver Saber', 'Runed Warblade', 'Frostfang Blade', 'Royal Dragonblade'],
    implicit: 'Melee Physical Damage', implicitTiers: ['15–55', '61–148', '164–379', '423–811', '834–1,362', '1,430–2,555'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES },
  { id: 'greatsword', name: 'Greatsword', ru: 'Двуручный меч', slot: 'mainhand', cls: 'warrior', hand: '2H', unlock: 'ML 25',
    tierNames: ['Broken Iron Greatsword', 'Steel Greatsword', 'Emerald Greatsword', 'Crescent Greatsword', 'Golden Greatsword', 'Arcane Steel Greatsword', 'Crimson Greatsword'],
    implicit: 'Greatsword Physical Damage', implicitTiers: ['22–80', '89–214', '238–550', '614–1,176', '1,209–1,975', '2,074–3,705'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES,
    note: 'Двуручное: слот оффхенда остаётся пустым (в Gear Score не считается). Больше урона в одном слоте, но теряете щит и его Block.' },
  { id: 'wooden_rod', name: 'Wooden Rod', ru: 'Жезл мага', slot: 'mainhand', cls: 'mage', hand: '1H', unlock: 'Standard',
    tierNames: ['Broken Wooden Wand', 'Wooden Wand', 'Apprentice Orb Wand', 'Bronze Focus Wand', 'Amethyst Crystal Wand', 'Royal Sun Wand', 'Archmage Crown Wand'],
    implicit: 'Magic Damage', implicitTiers: ['11–51', '55–142', '147–343', '377–733', '740–1,220', '1,265–2,240'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES },
  { id: 'grand_staff', name: 'Grand Staff', ru: 'Большой посох', slot: 'mainhand', cls: 'mage', hand: '2H', unlock: 'ML 25',
    tierNames: ['Broken Grand Staff', 'Greenwood Grand Staff', 'Amber Grand Staff', 'Shadow Grand Staff', 'Frost Grand Staff', 'Ember Grand Staff', 'Archmage Grand Staff'],
    implicit: 'Grand Staff Magic Damage + Intelligence', implicitTiers: ['15–71 / Int 2–6', '77–198 / 6–14', '206–480 / 14–25', '528–1,026 / 25–36', '1,036–1,708 / 36–48', '1,771–3,136 / 48–60'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES, note: 'Двуручное: бесплатная Intelligence в имплисите, но без книжки (Crit Damage оффхенда).' },
  { id: 'wooden_bow', name: 'Wooden Bow', ru: 'Лук лучника', slot: 'mainhand', cls: 'archer', hand: '1H', unlock: 'Standard',
    tierNames: ['Wooden Short Bow', 'Wooden Bow', 'Reinforced Hunting Bow', 'Bonewood Recurve Bow', 'Shadowsteel Bow', 'Silver War Bow', 'Dragonbone Bow'],
    implicit: 'Physical Damage', implicitTiers: ['6–28', '32–79', '91–220', '252–501', '576–1,052', '1,210–2,118'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES },
  { id: 'crossbow', name: 'Crossbow', ru: 'Арбалет', slot: 'mainhand', cls: 'archer', hand: '2H', unlock: 'ML 25',
    tierNames: ['Worn Crossbow', 'Oak Crossbow', 'Reinforced Crossbow', 'Bonewood Crossbow', 'Shadowsteel Crossbow', 'Silver War Crossbow', 'Dragonbone Crossbow'],
    implicit: 'Crossbow Damage + Critical Strike Chance', implicitTiers: ['8–39 / Crit 25', '44–111 / 30', '127–308 / 35', '353–702 / 40', '807–1,472 / 45', '1,694–2,965 / 50'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES, note: 'Двуручное: до +50% крит-шанса встроенно, но без Pet Mastery квивера.' },
  { id: 'rusty_dagger', name: 'Rusty Dagger', ru: 'Кинжал разбоя', slot: 'mainhand', cls: 'rogue', hand: '1H', unlock: 'Standard',
    tierNames: ['Broken Dagger', 'Iron Dagger', 'Shadowfang Dagger', 'Verdant Dagger', 'Sapphire Dagger', 'Amethyst Dagger', 'Royal Dagger'],
    implicit: 'Dagger Physical Damage', implicitTiers: ['2–9', '11–26', '33–80', '94–186', '225–415', '452–807'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES, note: 'Каждый кинжал даёт +50% Double Hit — два кинжала = 100% до прочих источников.' },
  { id: 'claws', name: 'Claws', ru: 'Когти', slot: 'mainhand', cls: 'rogue', hand: '1H', unlock: 'ML 25',
    tierNames: ['Broken Claws', 'Steel Claws', 'Venomfang Claws', 'Duskrazor Claws', 'Frostbite Claws', 'Bloodshard Claws', 'Nightcrown Claws'],
    implicit: 'Claw Damage + Critical Strike Chance', implicitTiers: ['3–13 / Crit 50', '15–36 / 60', '44–108 / 70', '123–243 / 80', '288–531 / 90', '565–1,009 / 100'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES, note: 'Когти меняют крит-билд: до +200% крит-шанса на паре, но нет бонуса Double Hit кинжалов.' },
  { id: 'gnarled_stick', name: 'Gnarled Stick', ru: 'Посох друида', slot: 'mainhand', cls: 'druid', hand: '2H', unlock: 'Standard',
    tierNames: ['Gnarled Stick', 'Ironbark Stick', 'Mosswood Stick', 'Silverbark Stick', 'Runed Stick', 'Wildheart Stick', 'Ancient Grove Stick'],
    implicit: 'Physical Damage + Pet Damage', implicitTiers: ['6–22 / Pet 1', '28–50 / 10', '55–160 / 20', '175–420 / 30', '450–900 / 40', '950–1,500 / 50'],
    prefixes: WEAPON_PREFIXES, suffixes: WEAPON_SUFFIXES, note: 'Единственное оружие друида: двуручное, с пет-уроном в имплисите.' },

  // ---------- Оффхенды ----------
  { id: 'wooden_shield', name: 'Wooden Shield', ru: 'Щит', slot: 'offhand', cls: 'warrior', hand: 'Off', unlock: 'Standard',
    tierNames: ['Broken Shield', 'Wooden Buckler', 'Iron Banded Shield', 'Studded Guard Shield', 'Steel Crest Shield', 'Gilded Shield', 'Grand Crest Shield'],
    implicit: 'Block Chance', implicitTiers: ['5–7', '8–10', '11–14', '15–19', '20–22', '23–26'],
    prefixes: ['Evasive', 'of Pet Damage', 'of Warding'], suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Block снижает входящий урон на 50% и усиливает Retaliation на 50%.' },
  { id: 'old_book', name: 'Old Book', ru: 'Книга заклинаний', slot: 'offhand', cls: 'mage', hand: 'Off', unlock: 'Standard',
    tierNames: ['Ragged Spellbook', 'Leather Spellbook', 'Reinforced Spellbook', 'Studded Spellbook', 'Gilded Spellbook', 'Noble Spellbook', 'Grand Crest Spellbook'],
    implicit: 'Critical Damage', implicitTiers: ['25–29', '31–36', '38–45', '47–57', '59–71', '73–88'],
    prefixes: ['Evasive', 'of Pet Damage', 'of Warding'], suffixes: ARMOR_AFFIXES.suffixes,
    note: 'База крит-урона для мага: заменять только на двуручку осознанно.' },
  { id: 'quiver', name: 'Quiver', ru: 'Колчан', slot: 'offhand', cls: 'archer', hand: 'Off', unlock: 'Standard',
    tierNames: ['Old Quiver', 'Leather Quiver', 'Hardened Quiver', 'Ironclad Quiver', 'Darksteel Quiver', 'Gilded Quiver', 'Grand Crest Quiver'],
    implicit: 'Pet Mastery Level + Strength & Dexterity', implicitTiers: ['1 / Str&Dex 1–3', '2 / 3–7', '3 / 7–13', '4 / 13–19', '5 / 19–25', '6 / 25–31'],
    prefixes: ['Evasive', 'of Pet Damage', 'of Warding'], suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Главный источник Pet Mastery для пет-билда лучника.' },

  // ---------- Броня: база ----------
  { id: 'rags', name: 'Rags', ru: 'Нагрудник (база)', slot: 'chest', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Rags', 'Leather Armor', 'Dark Leather Armor', 'Wildhide Armor', 'Chainmail Armor', 'Steel Plate Armor', 'Gilded Plate Armor'],
    implicit: 'Defense', implicitTiers: ['22–58', '67–144', '166–378', '434–842', '968–1,746', '2,012–3,497'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'leather_cap', name: 'Leather Cap', ru: 'Шлем (база)', slot: 'head', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Ragged Leather Cap', 'Leather Cap', 'Dark Leather Hood', 'Wildhide Hood', 'Chainmail Helm', 'Steel Plate Helm', 'Gilded Plate Helm'],
    implicit: 'Defense', implicitTiers: ['10–34', '38–91', '104–245', '282–553', '636–1,154', '1,330–2,320'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'worn_gloves', name: 'Worn Gloves', ru: 'Перчатки (база)', slot: 'hands', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Worn Ragged Gloves', 'Leather Gloves', 'Dark Leather Gloves', 'Wildhide Gloves', 'Chainmail Gloves', 'Steel Plate Gauntlets', 'Gilded Plate Gauntlets'],
    implicit: 'Defense', implicitTiers: ['6–26', '30–73', '84–202', '231–457', '526–958', '1,103–1,928'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'sandals_of_starszy', name: 'Sandals of Starszy', ru: 'Обувь (база)', slot: 'feet', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Sandals of Starszy', 'Leather Boots', 'Dark Leather Boots', 'Wildhide Boots', 'Chainmail Boots', 'Steel Plate Boots', 'Gilded Plate Boots'],
    implicit: 'Defense', implicitTiers: ['6–26', '30–73', '84–202', '231–457', '526–958', '1,103–1,928'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes },

  // ---------- Броня: сайдгрейды ----------
  { id: 'wardplate', name: 'Wardplate', ru: 'Вардплейт (Defense + Flat DR)', slot: 'chest', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Wardplate', 'Wardplate', 'Wardplate', 'Wardplate', 'Wardplate', 'Wardplate', 'Wardplate'],
    implicit: 'Defense + Flat Damage Reduction', implicitTiers: ['11–29 / DR 1', '33–72 / 1–2', '83–189 / 2', '217–421 / 2–3', '484–873 / 3–4', '1,006–1,749 / 4–5'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Flat DR не слабеет с ростом Monster Level — лучший выбор для танка/Retaliation.' },
  { id: 'bloodweave_vest', name: 'Bloodweave Vest', ru: 'Кровавый жилет (Defense + LoH)', slot: 'chest', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Bloodweave Vest', 'Bloodweave Vest', 'Bloodweave Vest', 'Bloodweave Vest', 'Bloodweave Vest', 'Bloodweave Vest', 'Bloodweave Vest'],
    implicit: 'Defense + Life on Hit', implicitTiers: ['13–35 / LoH 1–2', '40–86 / 2–4', '99–227 / 4–6', '260–505 / 6–8', '581–1,048 / 8–10', '1,207–2,098 / 10–13'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Постоянный отхил на любом билде — сильный выбор для долгих фарм-сессий.' },
  { id: 'harmonic_cuirass', name: 'Harmonic Cuirass', ru: 'Гармоничная кираса (AD+Pet)', slot: 'chest', cls: 'all', hand: '—', unlock: 'ML 50, 3% редкий ролл',
    tierNames: ['Harmonic Cuirass', 'Harmonic Cuirass', 'Harmonic Cuirass', 'Harmonic Cuirass', 'Harmonic Cuirass', 'Harmonic Cuirass', 'Harmonic Cuirass'],
    implicit: 'Defense + Attack & Pet Damage', implicitTiers: ['13–35 / 1–2', '40–86 / 2–4', '99–227 / 4–8', '260–505 / 8–13', '581–1,048 / 13–19', '1,207–2,098 / 19–22'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Один бонус усиливает и атаку, и пета — идеальна для Harmony-билдов.' },
  { id: 'visionary_hood', name: 'Visionary Hood', ru: 'Капюшон провидца (Crit)', slot: 'head', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Visionary Hood', 'Visionary Hood', 'Visionary Hood', 'Visionary Hood', 'Visionary Hood', 'Visionary Hood', 'Visionary Hood'],
    implicit: 'Defense + Critical Strike Chance', implicitTiers: ['6–20 / Crit 1–2', '23–55 / 2–3', '63–147 / 3–4', '169–332 / 4–5', '382–693 / 5–6', '798–1,392 / 6–7'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'beast_crown', name: 'Beast Crown', ru: 'Венец зверя (Pet Damage)', slot: 'head', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Beast Crown', 'Beast Crown', 'Beast Crown', 'Beast Crown', 'Beast Crown', 'Beast Crown', 'Beast Crown'],
    implicit: 'Defense + Pet Damage', implicitTiers: ['6–20 / 2–4', '23–55 / 4–7', '63–147 / 7–14', '169–332 / 14–22', '382–693 / 22–32', '798–1,392 / 32–40'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'sage_diadem', name: 'Sage Diadem', ru: 'Диадема мудреца (+All Class Skills)', slot: 'head', cls: 'all', hand: '—', unlock: 'ML 50, 3% редкий ролл',
    tierNames: ['Sage Diadem', 'Sage Diadem', 'Sage Diadem', 'Sage Diadem', 'Sage Diadem', 'Sage Diadem', 'Sage Diadem'],
    implicit: 'Defense + All Class Skills', implicitTiers: ['6–20 / +1', '23–55 / +1', '63–147 / +1', '169–332 / +1', '382–693 / +1', '798–1,392 / +1'],
    prefixes: ARMOR_AFFIXES.prefixes, suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Один из трёх источников +All Class Skills (вместе с Torch и легендарными петами).' },
  { id: 'slayer_gauntlets', name: 'Slayer Gauntlets', ru: 'Перчатки убийцы (Crit)', slot: 'hands', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Slayer Gauntlets', 'Slayer Gauntlets', 'Slayer Gauntlets', 'Slayer Gauntlets', 'Slayer Gauntlets', 'Slayer Gauntlets', 'Slayer Gauntlets'],
    implicit: 'Defense + Critical Strike Chance', implicitTiers: ['3–13 / 1–2', '15–37 / 2–3', '42–101 / 3–5', '116–229 / 5–7', '263–479 / 7–9', '552–964 / 9–10'],
    prefixes: ARMOR_AFFIXES_NO_WARDING.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'berserker_grips', name: 'Berserker Grips', ru: 'Хватка берсерка (AD)', slot: 'hands', cls: 'all', hand: '—', unlock: 'ML 50, 3% редкий ролл',
    tierNames: ['Berserker Grips', 'Berserker Grips', 'Berserker Grips', 'Berserker Grips', 'Berserker Grips', 'Berserker Grips', 'Berserker Grips'],
    implicit: 'Defense + Attack Damage', implicitTiers: ['3–13 / 2–4', '15–37 / 4–7', '42–101 / 7–14', '116–229 / 14–22', '263–479 / 22–32', '552–964 / 32–40'],
    prefixes: ARMOR_AFFIXES_NO_WARDING.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'symbiotic_handwraps', name: 'Symbiotic Handwraps', ru: 'Симбиотические обмотки (AD+Pet)', slot: 'hands', cls: 'all', hand: '—', unlock: 'ML 25, 15% редкий ролл',
    tierNames: ['Symbiotic Handwraps', 'Symbiotic Handwraps', 'Symbiotic Handwraps', 'Symbiotic Handwraps', 'Symbiotic Handwraps', 'Symbiotic Handwraps', 'Symbiotic Handwraps'],
    implicit: 'Defense + Attack & Pet Damage', implicitTiers: ['3–14 / 1–2', '17–40 / 2–4', '46–111 / 4–8', '127–251 / 8–13', '289–527 / 13–19', '607–1,060 / 19–22'],
    prefixes: ARMOR_AFFIXES_NO_WARDING.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'swiftstride_boots', name: 'Swiftstride Boots', ru: 'Быстроходы (Double Hit)', slot: 'feet', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Swiftstride Boots', 'Swiftstride Boots', 'Swiftstride Boots', 'Swiftstride Boots', 'Swiftstride Boots', 'Swiftstride Boots', 'Swiftstride Boots'],
    implicit: 'Defense + Double Hit Chance', implicitTiers: ['4–16 / 1–2', '18–44 / 2–3', '50–121 / 3–4', '139–274 / 4–5', '316–575 / 5–7', '662–1,157 / 7–8'],
    prefixes: ARMOR_AFFIXES_NO_WARDING.prefixes, suffixes: ARMOR_AFFIXES.suffixes },
  { id: 'grounded_treads', name: 'Grounded Treads', ru: 'Устойчивые сапоги (Block)', slot: 'feet', cls: 'all', hand: '—', unlock: 'ML 25',
    tierNames: ['Grounded Treads', 'Grounded Treads', 'Grounded Treads', 'Grounded Treads', 'Grounded Treads', 'Grounded Treads', 'Grounded Treads'],
    implicit: 'Defense + Block Chance', implicitTiers: ['4–18 / 1–2', '21–51 / 2–3', '59–141 / 3–5', '162–320 / 5–7', '368–671 / 7–9', '772–1,350 / 9–10'],
    prefixes: ARMOR_AFFIXES_NO_WARDING.prefixes, suffixes: ARMOR_AFFIXES.suffixes,
    note: 'Block с сапог работает и на Warrior с щитом, и на Retaliation-билды других классов.' },
  { id: 'pathfinder_treads', name: 'Pathfinder Treads', ru: 'Сапоги следопыта (Gold+EXP)', slot: 'feet', cls: 'all', hand: '—', unlock: 'ML 50, 3% редкий ролл',
    tierNames: ['Pathfinder Treads', 'Pathfinder Treads', 'Pathfinder Treads', 'Pathfinder Treads', 'Pathfinder Treads', 'Pathfinder Treads', 'Pathfinder Treads'],
    implicit: 'Defense + Gold & EXP Gain', implicitTiers: ['4–16 / 1–2', '18–44 / 2–3', '50–121 / 3–5', '139–274 / 5–8', '316–575 / 8–10', '662–1,157 / 10–12'],
    prefixes: ARMOR_AFFIXES_NO_WARDING.prefixes, suffixes: ARMOR_AFFIXES.suffixes },

  // ---------- Украшения ----------
  { id: 'warriors_belt', name: "Warrior's Belt", ru: 'Пояс воина (LoH)', slot: 'belt', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Warrior\'s Belt'], implicit: 'Life on Hit', implicitTiers: ['1–3', '4–7', '8–11', '12–15', '16–18', '19–22'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'rangers_belt', name: "Ranger's Belt", ru: 'Пояс охотника (LoK)', slot: 'belt', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Ranger\'s Belt'], implicit: 'Life on Kill', implicitTiers: ['3–9', '10–17', '18–26', '27–37', '38–45', '46–55'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'scholars_belt', name: "Scholar's Belt", ru: 'Пояс учёного (все атрибуты)', slot: 'belt', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Scholar\'s Belt'], implicit: 'All Attributes', implicitTiers: ['5–13', '14–30', '31–52', '53–76', '77–101', '102–126'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'warriors_ring', name: "Warrior's Ring", ru: 'Кольцо воина (Strength)', slot: 'ring', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Warrior\'s Ring'], implicit: 'Strength', implicitTiers: ['3–11', '12–28', '29–50', '51–74', '75–99', '100–124'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'rangers_ring', name: "Ranger's Ring", ru: 'Кольцо охотника (Dexterity)', slot: 'ring', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Ranger\'s Ring'], implicit: 'Dexterity', implicitTiers: ['3–11', '12–28', '29–50', '51–74', '75–99', '100–124'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'scholars_ring', name: "Scholar's Ring", ru: 'Кольцо учёного (Intelligence)', slot: 'ring', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Scholar\'s Ring'], implicit: 'Intelligence', implicitTiers: ['3–11', '12–28', '29–50', '51–74', '75–99', '100–124'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'adventurers_ring', name: "Adventurer's Ring", ru: 'Кольцо авантюриста (Str&Dex)', slot: 'ring', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Adventurer\'s Ring'], implicit: 'Strength & Dexterity', implicitTiers: ['3–11', '12–28', '29–50', '51–74', '75–99', '100–124'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'warriors_amulet', name: "Warrior's Amulet", ru: 'Амулет воина (Strength)', slot: 'amulet', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Warrior\'s Amulet'], implicit: 'Strength', implicitTiers: ['4–12', '13–29', '30–51', '52–75', '76–100', '101–125'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'rangers_amulet', name: "Ranger's Amulet", ru: 'Амулет охотника (Dexterity)', slot: 'amulet', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Ranger\'s Amulet'], implicit: 'Dexterity', implicitTiers: ['4–12', '13–29', '30–51', '52–75', '76–100', '101–125'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'scholars_amulet', name: "Scholar's Amulet", ru: 'Амулет учёного (Intelligence)', slot: 'amulet', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Scholar\'s Amulet'], implicit: 'Intelligence', implicitTiers: ['4–12', '13–29', '30–51', '52–75', '76–100', '101–125'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },
  { id: 'adventurers_amulet', name: "Adventurer's Amulet", ru: 'Амулет авантюриста (Str&Dex)', slot: 'amulet', cls: 'all', hand: '—', unlock: 'Standard',
    tierNames: ['Adventurer\'s Amulet'], implicit: 'Strength & Dexterity', implicitTiers: ['4–12', '13–29', '30–51', '52–75', '76–100', '101–125'],
    prefixes: JEWELRY_AFFIXES.prefixes, suffixes: JEWELRY_AFFIXES.suffixes },

  // ---------- Факел ----------
  { id: 'torch', name: 'Torch', ru: 'Факел', slot: 'torch', cls: 'all', hand: '—', unlock: 'ML 50 (вес 24/9000)',
    tierNames: ['Torch'], implicit: 'All Class Skills', implicitTiers: ['+1', '+1', '+1', '+2', '+2', '+3'],
    prefixes: ['Evasive', 'of Pet Damage', 'of Warding'], suffixes: ['of Bloodthirst', 'of Crit Chance', 'of Crit Damage', 'of Devastation', 'of Experience', 'of Wealth'],
    note: 'Отдельный слот у всех классов: поднимает эффективный ранг всех изученных классовых навыков.' },
];

export const SLOT_ORDER = ['mainhand', 'offhand', 'torch', 'chest', 'head', 'hands', 'feet', 'amulet', 'ring', 'belt'];
export const SLOT_RU = {
  mainhand: 'Основная рука', offhand: 'Вторая рука', torch: 'Факел', chest: 'Нагрудник', head: 'Шлем',
  hands: 'Перчатки', feet: 'Обувь', amulet: 'Амулет', ring: 'Кольцо', belt: 'Пояс',
};
/** Английские названия слотов (как в игре) — для подписей «Русское (English)». */
export const SLOT_EN = {
  mainhand: 'Main Hand', offhand: 'Off Hand', torch: 'Torch', chest: 'Chest', head: 'Head',
  hands: 'Hands', feet: 'Feet', amulet: 'Amulet', ring: 'Ring', belt: 'Belt',
};

/** К какому гем-«региону» относится слот (эффект гема зависит от региона). */
export const SLOT_GEM_REGION = {
  mainhand: 'weapon', offhand: 'weapon', torch: 'torch',
  chest: 'armor', head: 'armor', hands: 'armor', feet: 'armor',
  amulet: 'jewelry', ring: 'jewelry', belt: 'jewelry',
};

/** Таблица дропа редкостей по Monster Level (Item Codex → Drop tiers). */
export const DROP_TIER_TABLE = [
  { upTo: 9, normal: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 14, normal: 60, uncommon: 40, rare: 0, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 24, normal: 50, uncommon: 50, rare: 0, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 44, normal: 35, uncommon: 65, rare: 0, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 49, normal: 35, uncommon: 35, rare: 30, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 64, normal: 20, uncommon: 50, rare: 30, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 89, normal: 15, uncommon: 25, rare: 60, epic: 0, legendary: 0, infernal: 0 },
  { upTo: 99, normal: 15, uncommon: 25, rare: 40, epic: 20, legendary: 0, infernal: 0 },
  { upTo: 114, normal: 10, uncommon: 15, rare: 55, epic: 20, legendary: 0, infernal: 0 },
  { upTo: 149, normal: 5, uncommon: 10, rare: 25, epic: 60, legendary: 0, infernal: 0 },
  { upTo: 184, normal: 4, uncommon: 8, rare: 16, epic: 62, legendary: 10, infernal: 0 },
  { upTo: 219, normal: 5, uncommon: 5, rare: 15, epic: 25, legendary: 50, infernal: 0 },
  { upTo: 259, normal: 4, uncommon: 4, rare: 9, epic: 18, legendary: 65, infernal: 0 },
  { upTo: 299, normal: 3, uncommon: 3, rare: 7, epic: 12, legendary: 35, infernal: 40 },
  { upTo: 9999, normal: 2, uncommon: 2, rare: 4, epic: 10, legendary: 22, infernal: 60 },
];

/** Тир-таблица предметов (апгрейд/аффиксы/фрагменты). */
export const ITEM_TIERS = [
  { tier: 'T1', name: 'Normal', ru: 'Обычный', color: '#b7b7b7', maxPlus: 4, affixes: 0, drop: 'ML 1+', fragment: 'Iron Fragment', fullGold: '1,700', fullFragments: 10 },
  { tier: 'T2', name: 'Uncommon', ru: 'Необычный', color: '#69d17d', maxPlus: 9, affixes: 1, drop: 'шанс с ML 10+, основной дроп ML 25+', fragment: 'Steel Fragment', fullGold: '35,100', fullFragments: 45 },
  { tier: 'T3', name: 'Rare', ru: 'Редкий', color: '#5ba7ff', maxPlus: 14, affixes: 2, drop: 'шанс с ML 45+, основной дроп ML 65+', fragment: 'Mithril Fragment', fullGold: '428,750', fullFragments: 84 },
  { tier: 'T4', name: 'Epic', ru: 'Эпический', color: '#bd76ff', maxPlus: 19, affixes: 3, drop: 'шанс с ML 90+, основной дроп ML 115+', fragment: 'Adamantine Fragment', fullGold: '4,180,000', fullFragments: 190 },
  { tier: 'T5', name: 'Legendary', ru: 'Легендарный', color: '#ffc857', maxPlus: 24, affixes: 4, drop: 'шанс с ML 150+, основной дроп ML 185+', fragment: 'Celestial Fragment', fullGold: '31,800,000', fullFragments: 456 },
  { tier: 'T6', name: 'Infernal', ru: 'Инфернальный', color: '#ff6b5f', maxPlus: 30, affixes: 5, drop: 'ML 260+', fragment: 'Infernal Fragment', fullGold: '287,100,000', fullFragments: 1170 },
];

/** Monster Level, с которого семейство становится доступным ('Standard' → 1, 'ML 25' → 25, 'ML 50, 3%…' → 50). */
export function familyUnlockMl(family) {
  const m = String(family?.unlock || '').match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

export const familyById = (id) => GEAR_FAMILIES.find((f) => f.id === id);
export const familiesForSlot = (slot) => GEAR_FAMILIES.filter((f) => f.slot === slot);
export const familiesForClass = (cls) => GEAR_FAMILIES.filter((f) => f.cls === 'all' || f.cls === cls);

/* ------------------------------------------------------------------------------------------------
 * Экран персонажа (как в игре) и Кузница (Forge, Season 2)
 * ------------------------------------------------------------------------------------------------
 * В игре экипировка — это сетка ячеек, а прогресс качается Кузницей ПО СЛОТАМ:
 * слот имеет свой тир и «+N» (шаги Кузницы), поэтому в карточке видно «T4 +19» даже тогда,
 * когда сам выпавший предмет был ниже тиром. Ячейки ниже расположены как в игровом окне:
 *   Факел · Амулет · Вторая рука
 *   Оружие · Нагрудник · Оружие 2
 *   Кольцо 1 · Кольцо 2 · Пояс
 *   Шлем · Перчатки · Обувь
 * Источники: официальные патч-ноты 1.3.1, вики (Forge, Items), Item Codex → Forge, forge.tracks_by_class.
 */
export const GEAR_CELLS = [
  // Сетка повторяет игровое окно снаряжения построчно (как на скриншоте игрока):
  //   1) Факел · Шлем · Амулет
  //   2) Оружие · Нагрудник · Вторая рука (у разбойника — Оружие 2, у друида — «Двуручное»)
  //   3) Кольцо 1 · Пояс · Кольцо 2
  //   4) Талисман 1 · Перчатки · Обувь · Талисман 2
  { id: 'torch', slot: 'torch', ru: 'Факел', en: 'Torch', row: 1, col: 1 },
  { id: 'head', slot: 'head', ru: 'Шлем', en: 'Head', row: 1, col: 2 },
  { id: 'amulet', slot: 'amulet', ru: 'Амулет', en: 'Amulet', row: 1, col: 3 },
  { id: 'mainhand', slot: 'mainhand', ru: 'Оружие', en: 'Weapon', row: 2, col: 1 },
  { id: 'chest', slot: 'chest', ru: 'Нагрудник', en: 'Chest', row: 2, col: 2 },
  { id: 'hand2', slot: 'offhand', ru: 'Вторая рука', en: 'Off Hand', row: 2, col: 3 },
  { id: 'ring1', slot: 'ring', ru: 'Кольцо 1', en: 'Ring 1', row: 3, col: 1 },
  { id: 'belt', slot: 'belt', ru: 'Пояс', en: 'Belt', row: 3, col: 2 },
  { id: 'ring2', slot: 'ring', ru: 'Кольцо 2', en: 'Ring 2', row: 3, col: 3 },
  { id: 'talisman1', slot: 'talisman', ru: 'Талисман 1', en: 'Talisman 1', row: 4, col: 1 },
  { id: 'hands', slot: 'hands', ru: 'Перчатки', en: 'Hands', row: 4, col: 2 },
  { id: 'feet', slot: 'feet', ru: 'Обувь', en: 'Feet', row: 4, col: 3 },
  { id: 'talisman2', slot: 'talisman', ru: 'Талисман 2', en: 'Talisman 2', row: 4, col: 4 },
];

export const gearCellById = (id) => GEAR_CELLS.find((c) => c.id === id);

/** Ячейки, которые показываются в последней строке (4 в строке, как в игре). */
export const GEAR_LAST_ROW = GEAR_CELLS.filter((c) => c.row === 4).map((c) => c.id);

/** Сколько камней-сокетов даёт ячейка (Torch — 4, оружие — 3, броня — 2, украшения — 1, щит — 0). */
export const SLOT_GEM_COUNT = {
  mainhand: 3, offhand: 0, torch: 4,
  head: 2, chest: 2, hands: 2, feet: 2, belt: 2,
  ring: 1, amulet: 1, talisman: 0,
};

/**
 * Что класс может носить в руках и почему часть ячеек закрыта.
 * «Вторая рука» (hand2) — универсальная ячейка второй руки:
 *   • воин/лучник/маг — оффхенд (щит, книга, колчан);
 *   • разбойник — второе оружие (парные кинжалы/когти), щита у него нет;
 *   • друид — ячейка закрыта: посох двуручный, обе руки заняты.
 */
export const CLASS_GEAR_RULES = {
  warrior: { hand2: 'offhand', locked: {} },
  archer: { hand2: 'offhand', locked: {} },
  mage: { hand2: 'offhand', locked: {} },
  rogue: { hand2: 'weapon2', locked: {} },
  druid: {
    hand2: 'twohanded',
    locked: { hand2: 'У Друида посох (Gnarled Stick) двуручный — обе руки заняты, отдельной второй руки нет.' },
  },
};

/** Подписи универсальной ячейки второй руки по классам. */
export const HAND2_LABELS = {
  offhand: { ru: 'Вторая рука', en: 'Off Hand' },
  weapon2: { ru: 'Оружие 2', en: 'Weapon 2' },
  twohanded: { ru: 'Двуручное', en: 'Two-handed' },
};

/** Талисманы — два слота из того же игрового окна (Gear tab → Talismans). */
export const TALISMAN_CELL_IDS = ['talisman1', 'talisman2'];

/** Имя предмета после Awaken (ранг 1), если название опубликовано в Item Codex. */
export const FAMILY_AWAKEN = {
  broken_sword: 'Royal Dragonblade',
  greatsword: 'Crimson Greatsword',
  wooden_rod: 'Archmage Crown Wand',
  grand_staff: 'Archmage Grand Staff',
  wooden_bow: 'Dragonbone Bow',
  crossbow: 'Dragonbone Crossbow',
  rusty_dagger: 'Royal Dagger',
  claws: 'Nightcrown Claws',
  gnarled_stick: 'Ancient Grove Stick',
  wooden_shield: 'Grand Crest Shield',
  old_book: 'Grand Crest Spellbook',
  quiver: 'Grand Crest Quiver',
  rags: 'Gilded Plate Armor',
  leather_cap: 'Gilded Plate Helm',
  worn_gloves: 'Gilded Plate Gauntlets',
  sandals_of_starszy: 'Gilded Plate Boots',
};
