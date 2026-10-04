/**
 * Предметы: аффиксы, Drop Bonuses, тиры/редкости, гнёзда и гемы, семейства снаряжения.
 * Источники: idlearc.fandom.com/wiki/Item_Codex/Affixes, /Item_Codex/Drop_Bonuses,
 *            wiki/Gems, wiki/Items, wiki/Forge, idlearc.com/patch-notes/1-3-1
 */

export const RARITY = [
  { tier: 'T1', ru: 'Normal', color: '#b7b7b7', affixes: 0, mult: 1.0 },
  { tier: 'T2', ru: 'Uncommon', color: '#69d17d', affixes: 1, mult: 1.2 },
  { tier: 'T3', ru: 'Rare', color: '#5ba7ff', affixes: 2, mult: 1.4 },
  { tier: 'T4', ru: 'Epic', color: '#bd76ff', affixes: 3, mult: 1.7 },
  { tier: 'T5', ru: 'Legendary', color: '#ffc857', affixes: 4, mult: 2.0 },
  { tier: 'T6', ru: 'Infernal', color: '#ff6b5f', affixes: 5, mult: 2.5 },
];

/** Аффиксы: базовый ролл × множитель редкости; +3% к значению за каждый +уровень предмета. */
export const AFFIXES = [
  // Префиксы
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

  // Суффиксы
  { id: 'bloodthirst', name: 'of Bloodthirst', type: 'suffix', stat: 'Bloodthirst', ru: 'Bloodthirst (+% к лечению LoH/LoK)', base: '1–2', slots: ['Torch'] },
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

/** Drop Bonuses: отдельная строка на предмете, свои минимальные тиры и роллы T2..T9. */
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
    note: 'Каждые 100% — гарантированный доп. удар, остаток — шанс ещё одного. Доп. удары не «добивают» уже мёртвого монстра.' },
  { id: 'devastating', name: 'Devastating', stat: 'Double Damage Chance', ru: 'Double Damage', cat: 'Offensive', min: 'T3',
    values: ['—', '2–4', '4–7', '7–11', '11–17', '17–28', '28–46', '46–75'],
    note: 'Работает и на персонажа, и на пета, и на элементальный урон.' },
  { id: 'companions', name: "Companion's", stat: 'Pet Damage', ru: 'Урон пета', cat: 'Offensive', min: 'T2',
    values: ['2–4', '5–8', '9–14', '15–22', '22–32', '32–40', '40–50', '50–64'],
    note: 'Умножает урон активного пета, не влияет на атаку персонажа.' },
  { id: 'slayers', name: "Slayer's", stat: 'Boss Damage', ru: 'Урон по боссам', cat: 'Offensive', min: 'T4',
    values: ['—', '—', '5–10', '10–18', '18–28', '28–36', '36–43', '43–50'],
    note: 'Daily Boss, Guild Boss, Tower. По обычным монстрам не работает; в Elemental Conflux — 50% эффективности.' },
  { id: 'fortified', name: 'Fortified', stat: 'Max Health', ru: 'Макс. HP', cat: 'Defensive', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–35', '35–45', '45–60'] },
  { id: 'armored', name: 'Armored', stat: 'Defense', ru: 'Защита', cat: 'Defensive', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–35', '35–45', '45–60'] },
  { id: 'resilient', name: 'Resilient', stat: 'Damage Reduction', ru: 'Снижение урона', cat: 'Defensive', min: 'T3',
    values: ['—', '0.5–1', '1–2', '2–4', '4–6', '6–8', '8–11', '11–15'],
    note: 'Софт-кап 95%, хард-кап 99%; выше 95% работает на 10% эффективности.' },
  { id: 'evasive', name: 'Evasive', stat: 'Dodge Chance', ru: 'Уклонение', cat: 'Defensive', min: 'T4',
    values: ['—', '—', '1–2', '2–4', '4–6', '6–8', '8–11', '11–15'] },
  { id: 'vampiric', name: 'Vampiric', stat: 'Life on Hit', ru: 'HP за удар', cat: 'Sustain', min: 'T2',
    values: ['1–1', '2–2', '3–4', '5–7', '8–11', '11–15', '15–21', '22–30'] },
  { id: 'draining', name: 'Draining', stat: 'Life on Kill', ru: 'HP за убийство', cat: 'Sustain', min: 'T2',
    values: ['3–6', '7–14', '15–25', '26–40', '40–60', '60–90', '90–134', '134–200'] },
  { id: 'bloodthirsty', name: 'Bloodthirsty', stat: 'Bloodthirst', ru: 'Bloodthirst', cat: 'Sustain', min: 'T5',
    values: ['—', '—', '—', '5–10', '11–15', '16–18', '19–21', '22–25'],
    note: 'Новый в S2 % множитель всего лечения LoH/LoK. Также есть Torch-only аффикс того же стата.' },
  { id: 'prosperous', name: 'Prosperous', stat: 'Gold Gain', ru: 'Золото', cat: 'Farming', min: 'T2',
    values: ['2–5', '5–10', '10–16', '16–25', '25–38', '38–53', '53–73', '73–100'] },
  { id: 'scholarly', name: 'Scholarly', stat: 'EXP Gain', ru: 'Опыт', cat: 'Farming', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–37', '37–53', '53–75'] },
  { id: 'scavengers', name: "Scavenger's", stat: 'Item Drop Chance', ru: 'Дроп предметов', cat: 'Farming', min: 'T3',
    values: ['—', '1–3', '3–5', '5–8', '8–12', '12–17', '17–23', '23–32'],
    note: 'У Mage нет классового Item Drop — компенсируйте бонусами на предметах.' },
  { id: 'reflecting', name: 'Reflecting', stat: 'Retaliation Damage', ru: 'Урон возмездия', cat: 'New Mechanic', min: 'T2',
    values: ['2–4', '4–7', '7–12', '12–18', '18–26', '26–34', '34–42', '42–50'],
    note: 'Retaliation = Reflecting% × Defense. Блокированный удар даёт +50% к возмездию.' },
  { id: 'lucky', name: 'Lucky', stat: 'Lucky Chance', ru: 'Удача (шанс высшего тира)', cat: 'New Mechanic', min: 'T4',
    values: ['—', '—', '1–3', '3–6', '6–9', '9–12', '12–15', '15–20'],
    note: 'В S2 Lucky и Black Market складываются в один пул с убывающей отдачей. С ML 260 влияет и на Gilded-дроп.' },
  { id: 'elementalsurge', name: 'Elemental Surge', stat: 'Elemental Amplification', ru: 'Усиление элемента', cat: 'New Mechanic', min: 'T4',
    values: ['—', '—', '3–6', '6–10', '10–15', '15–21', '21–29', '29–40'],
    note: 'Увеличивает бонус элемента при совпадении со слабостью монстра.' },
  { id: 'frenzy', name: 'Frenzy', stat: 'Extra Kill Chance', ru: 'Extra Kill', cat: 'New Mechanic', min: 'T5',
    values: ['—', '—', '—', '2–4', '4–6', '6–8', '8–11', '11–15'] },
];

export const DROP_BONUS_TIER_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7 Gilded', 'T8 Radiant', 'T9 Mythic'];

export const DROP_BONUS_RETYPE_GOLD = { T2: 1000, T3: 5000, T4: 25000, T5: 120000, T6: 500000, T7: 1000000, T8: 2000000, T9: 4000000 };

/** Гемы: базовое значение (Rough, quality 100, socket 0) по семейству и слоту. */
export const GEM_FAMILIES = [
  { id: 'garnet', name: 'Garnet', ru: 'Гранат', slots: { weapon: '+0.5% Attack Damage', torch: '+0.6% Max Health', armor: '+0.6% Defense', jewelry: '+5 Strength' } },
  { id: 'jade', name: 'Jade', ru: 'Жад', slots: { weapon: '+0.5% Pet Damage', torch: '+0.3% Attack Damage', armor: '+0.6% Max Health', jewelry: '+5 Dexterity' } },
  { id: 'lapis', name: 'Lapis', ru: 'Лазурит', slots: { weapon: '+0.25% Attack Damage + 0.25% Pet Damage + 0.25% Retaliation', torch: '+0.3% Pet Damage', armor: '+2% EXP Gain', jewelry: '+5 Intelligence' } },
  { id: 'amber', name: 'Amber', ru: 'Янтарь', slots: { weapon: '+2% Gold Gain', torch: '+1% Item Drop Chance', armor: '+2% Material Drop Chance', jewelry: '+0.8% Gold + 0.8% EXP + 0.4% Item Drop' } },
];

export const GEM_RARITY = [
  { id: 'rough', name: 'Rough', mult: 1.0, secondary: 0, socketCap: 10 },
  { id: 'cut', name: 'Cut', mult: 1.6, secondary: 1, socketCap: 25 },
  { id: 'polished', name: 'Polished', mult: 2.5, secondary: 1, socketCap: 50 },
  { id: 'brilliant', name: 'Brilliant', mult: 4.0, secondary: 2, socketCap: 100 },
  { id: 'flawless', name: 'Flawless', mult: 6.5, secondary: 3, socketCap: null,
    note: 'Только дроп с ML 160, не создаётся фьюзом, не подвержен луут-бустам.' },
];

export const GEM_SECONDARY = [
  { stat: 'Critical Chance', cut: 0.5, polished: 1, brilliant: 1.5, flawless: 2.5 },
  { stat: 'Critical Damage', cut: 2, polished: 4, brilliant: 6, flawless: 10 },
  { stat: 'Double Hit Chance', cut: 0.5, polished: 1, brilliant: 1.5, flawless: 2.5 },
  { stat: 'Double Damage Chance', cut: 0.5, polished: 1, brilliant: 1.5, flawless: 2.5 },
  { stat: 'Life on Hit', cut: 1, polished: 2, brilliant: 4, flawless: 8 },
  { stat: 'Life on Kill', cut: 2, polished: 4, brilliant: 8, flawless: 16 },
  { stat: 'Dodge Chance', cut: 0.3, polished: 0.6, brilliant: 0.9, flawless: 1.5 },
  { stat: 'Max Health', cut: 10, polished: 25, brilliant: 60, flawless: 150 },
  { stat: 'Gold Gain', cut: 1, polished: 2, brilliant: 3, flawless: 5 },
  { stat: 'EXP Gain', cut: 1, polished: 2, brilliant: 3, flawless: 5 },
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

/** Слоты персонажа и типовые имплиситы (T1 → T6). */
export const GEAR_SLOTS = [
  { id: 'mainhand', ru: 'Основная рука', implicitFamily: 'Оружие класса (см. семейства)' },
  { id: 'offhand', ru: 'Вторая рука / оффхенд', implicitFamily: 'Shield / Book / Quiver / второе оружие (Rogue)' },
  { id: 'torch', ru: 'Факел (отдельный слот, все классы)', implicitFamily: '+All Class Skills (1 → 3)' },
  { id: 'chest', ru: 'Нагрудник', implicitFamily: 'Defense + Flat Damage Reduction' },
  { id: 'helmet', ru: 'Шлем', implicitFamily: 'Defense (+ сайдгрейды: Sage Diadem = +All Class Skills)' },
  { id: 'gloves', ru: 'Перчатки', implicitFamily: 'Defense' },
  { id: 'boots', ru: 'Сапоги', implicitFamily: 'Defense' },
  { id: 'amulet', ru: 'Амулет', implicitFamily: 'Атрибуты (Str / Dex / Int / Str&Dex)' },
  { id: 'ring', ru: 'Кольцо', implicitFamily: 'Атрибуты (Str / Dex / Int / Str&Dex)' },
  { id: 'belt', ru: 'Пояс', implicitFamily: 'Атрибуты / Life on Hit / Life on Kill' },
];

/** Имплиситы ключевых семейств: T1 … T6. */
export const WEAPON_IMPLICITS = [
  { family: 'Dagger', cls: 'Rogue', hand: '1H', note: 'Каждый даггер даёт +50% Double Hit Chance (два = 100% до других источников).',
    tiers: ['Dagger Physical Damage: 2–9', '11–26', '33–80', '94–186', '225–415', '452–807'] },
  { family: 'Claws', cls: 'Rogue', hand: '1H', ml: 25, note: 'ML 25+. Встроенный крит-шанс 50 → 100% с каждой клешнёй.',
    tiers: ['Claw Damage: 3–13 / Crit 50', '15–36 / Crit 60', '44–108 / Crit 70', '123–243 / Crit 80', '288–531 / Crit 90', '565–1009 / Crit 100'] },
  { family: 'Greatsword', cls: 'Warrior', hand: '2H', ml: 25, note: 'ML 25+. Двуручное: оффхенд-слот пустой (в Gear Score не считается).',
    tiers: ['Greatsword Damage: 22–80', '89–214', '238–550', '614–1176', '1209–1975', '2074–3705'] },
  { family: 'Crossbow', cls: 'Archer', hand: '2H', ml: 25, note: 'ML 25+. Встроенный Critical Strike Chance 25 → 50%.',
    tiers: ['Crossbow Damage: 8–39 / Crit 25', '44–111 / Crit 30', '127–308 / Crit 35', '353–702 / Crit 40', '807–1472 / Crit 45', '1694–2965 / Crit 50'] },
  { family: 'Grand Staff', cls: 'Mage', hand: '2H', ml: 25, note: 'ML 25+. Встроенный Intelligence 2–6 → 48–60.',
    tiers: ['Staff Damage: 15–71 / Int 2–6', '77–198 / Int 6–14', '206–480 / Int 14–25', '528–1026 / Int 25–36', '1036–1708 / Int 36–48', '1771–3136 / Int 48–60'] },
  { family: 'Gnarled Stick', cls: 'Druid', hand: '2H', note: 'Двуручное оружие друида: урон + Pet Damage 1 → 50.',
    tiers: ['Damage: 6–22 / Pet 1', '28–50 / Pet 10', '55–160 / Pet 20', '175–420 / Pet 30', '450–900 / Pet 40', '950–1500 / Pet 50'] },
  { family: 'Wooden Rod (Wand)', cls: 'Mage', hand: '1H', note: 'Стартовое и базовое одноручное мага.',
    tiers: ['Magic Damage: 11–51', '55–142', '147–343', '377–733', '740–1220', '1265–2240'] },
  { family: 'Wooden Bow', cls: 'Archer', hand: '1H', note: 'Стартовое и базовое одноручное лучника.',
    tiers: ['Physical Damage: 6–28', '32–79', '91–220', '252–501', '576–1052', '1210–2118'] },
  { family: 'Shield', cls: 'Warrior', hand: 'Off', note: 'Имплисит — Block Chance (блок = −50% входящего урона).',
    tiers: ['Block 5–7', '8–10', '11–14', '15–19', '20–22', '23–26'] },
  { family: 'Spellbook', cls: 'Mage', hand: 'Off', note: 'Имплисит — Critical Damage.',
    tiers: ['Crit Dmg 25–29', '31–36', '38–45', '47–57', '59–71', '73–88'] },
  { family: 'Quiver', cls: 'Archer', hand: 'Off', note: 'Имплисит — Pet Mastery Level + Strength & Dexterity.',
    tiers: ['Mastery 1 / Str&Dex 1–3', '2 / 3–7', '3 / 7–13', '4 / 13–19', '5 / 19–25', '6 / 25–31'] },
  { family: 'Torch', cls: 'All', hand: 'Torch', ml: 50, note: 'ML 50+. Даёт +All Class Skills: T4–T5 = 2, T6 = 3.',
    tiers: ['+All Class Skills 1', '1', '1', '2', '2', '3'] },
  { family: 'Wardplate (Chest)', cls: 'All', hand: '—', note: 'Defense + Flat Damage Reduction (не слабеет с ростом ML).',
    tiers: ['Def 11–29 / DR 1', '33–72 / 1–2', '83–189 / 2', '217–421 / 2–3', '484–873 / 3–4', '1006–1749 / 4–5'] },
  { family: 'Gloves / Boots', cls: 'All', hand: '—', note: 'Чистый Defense; на сайдгрейдах может быть второй бонус.',
    tiers: ['Def 6–26', '30–73', '84–202', '231–457', '526–958', '1103–1928'] },
  { family: 'Ring: Warrior\'s / Ranger\'s / Scholar\'s / Adventurer\'s', cls: 'All', hand: '—', note: 'Str / Dex / Int / Str&Dex соответственно; амулеты — те же, но с +1 к роллу.',
    tiers: ['3–11', '12–28', '29–50', '51–74', '75–99', '100–124'] },
  { family: 'Belt: Warrior\'s / Ranger\'s / Scholar\'s', cls: 'All', hand: '—', note: 'Warrior = Life on Hit, Ranger = Life on Kill, Scholar = все атрибуты.',
    tiers: ['LoH 1–3 / LoK 3–9 / все атрибуты 5–13', '4–7 / 10–17 / 14–30', '8–11 / 18–26 / 31–52', '12–15 / 27–37 / 53–76', '16–18 / 38–45 / 77–101', '19–22 / 46–55 / 102–126'] },
];

/** Тир-таблица предметов: макс. +уровень, кол-во аффиксов, дроп-прогресс. */
export const ITEM_TIERS = [
  { tier: 'T1', ru: 'Normal', color: '#b7b7b7', maxPlus: 4, affixes: 0, drop: 'ML 1+', fragment: 'Iron Fragment' },
  { tier: 'T2', ru: 'Uncommon', color: '#69d17d', maxPlus: 9, affixes: 1, drop: 'шанс с ML 10+, основной дроп ML 25+', fragment: 'Steel Fragment' },
  { tier: 'T3', ru: 'Rare', color: '#5ba7ff', maxPlus: 14, affixes: 2, drop: 'шанс с ML 45+, основной дроп ML 65+', fragment: 'Mithril Fragment' },
  { tier: 'T4', ru: 'Epic', color: '#bd76ff', maxPlus: 19, affixes: 3, drop: 'шанс с ML 90+, основной дроп ML 115+', fragment: 'Adamantine Fragment' },
  { tier: 'T5', ru: 'Legendary', color: '#ffc857', maxPlus: 24, affixes: 4, drop: 'шанс с ML 150+, основной дроп ML 185+', fragment: 'Celestial Fragment' },
  { tier: 'T6', ru: 'Infernal', color: '#ff6b5f', maxPlus: null, affixes: 5, drop: 'ML 260+', fragment: '—' },
];
