import { t } from '../i18n.js';

/**
 * Системы игры: статы и формулы, петы, талисманы, руны, прогрессия, стойки, гильдия.
 * Источники: wiki (Stats, Pet Damage, Retaliation, Gems, Mastery, Monster Level, Biomes,
 * Convergence, Elemental Conflux, Talismans, Pets, Runes, Combat Stance, Guild Skill Tree),
 * idlearc.com/patch-notes/1-3-1, idlearc.com/guild-tree, idlearc.com/classes.
 */

export const DATA_META = {
  // BUILD — метка сборки. Меняется при каждом обновлении данных/интерфейса:
  // сервер отдаёт её в /api/build, а интерфейс сравнивает свою метку и предлагает обновиться.
  build: '2026-11-19.1',
  gameVersion: '1.3.1 (Season 2: The Forge)',
  patchDate: t('25 сентября 2026', 'September 25, 2026'),
  verified: t('Данные сверены с официальными источниками и текущим билдом игры на 5 октября 2026', 'Checked against official sources and the game build on October 5, 2026'),
  sources: [
    { label: t('Официальный сайт IdleArc', 'Official IdleArc website'), url: 'https://idlearc.com/' },
    { label: t('Патч-ноты 1.3.1 (официально)', 'Official patch notes for 1.3.1'), url: 'https://idlearc.com/patch-notes/1-3-1' },
    { label: t('Официальные классы и скилл-деревья', 'Official classes and skill trees'), url: 'https://idlearc.com/classes' },
    { label: t('Официальный симулятор гильд-дерева', 'Official guild tree simulator'), url: 'https://idlearc.com/guild-tree' },
    { label: t('IdleArc Companion: данные дерева навыков (сборка 2026-09-29)', 'IdleArc Companion skill tree data (September 29, 2026 build)'), url: 'https://idlearc-companion-web-production.up.railway.app/data/skill_tree_data.json' },
    { label: t('Вики: классы', 'IdleArc Wiki: Classes'), url: 'https://idlearc.fandom.com/wiki/Classes' },
    { label: t('Вики: статы', 'IdleArc Wiki: Stats'), url: 'https://idlearc.fandom.com/wiki/Stats' },
    { label: t('Вики: Item Codex', 'IdleArc Wiki: Item Codex'), url: 'https://idlearc.fandom.com/wiki/Item_Codex' },
    { label: t('Вики: гемы', 'IdleArc Wiki: Gems'), url: 'https://idlearc.fandom.com/wiki/Gems' },
    { label: t('Вики: гайд Season 2', 'IdleArc Wiki: Season 2 guide'), url: 'https://idlearc.fandom.com/wiki/Guide:Season_2_Progression_%26_Strategy_Guide' },
  ],
};

export const STATS = [
  { id: 'ad', name: 'Attack Damage', ru: t('Сила атаки', 'Attack Damage'), group: 'Offense', desc: t('Базовый урон персонажа: база → аддитивные бонусы → мультипликативные слои.', 'Start with base character damage, add bonuses, then apply multipliers.') },
  { id: 'petDamage', name: 'Pet Damage', ru: t('Урон пета', 'Pet Damage'), group: 'Offense', desc: t('Считается ОТДЕЛЬНО от атаки персонажа. Складывается из атрибутов, гильдии, сетов, Time Boosts, Pet Mastery и классовых модификаторов.', 'Calculated separately from character attacks. Sources include attributes, guild bonuses, sets, Time Boosts, Pet Mastery and class modifiers.') },
  { id: 'crit', name: 'Critical Strike Chance', ru: t('Шанс крита', 'Critical Strike Chance'), group: 'Offense', desc: t('При 100% — гарантированный крит. Выше 100% каждый +1% превращается в +1% Critical Damage.', 'At 100%, every hit is a critical strike. Each additional 1% converts into 1% Critical Damage.') },
  { id: 'critDmg', name: 'Critical Damage', ru: t('Урон крита', 'Critical Damage'), group: 'Offense', desc: t('Множитель крит-удара. Сверх 100% крит-шанса добавляется 1:1.', 'Multiplies the damage dealt by critical hits. Critical strike chance above 100% adds to this stat at a 1:1 ratio.') },
  { id: 'dh', name: 'Double Hit Chance', ru: t('Двойной удар', 'Double Hit Chance'), group: 'Offense', desc: t('Каждые полные 100% — гарантированный доп. удар, остаток — шанс ещё одного (250% = 3 гарантированных + 50% на 4-й). Доп. удары не срабатывают, если враг уже мёртв.', 'Each full 100% guarantees an extra strike. The remainder gives a chance of one more. At 250%, you get 3 hits with a 50% chance of a fourth. Extra strikes stop when the enemy dies.') },
  { id: 'dd', name: 'Double Damage Chance', ru: t('Двойной урон', 'Double Damage Chance'), group: 'Offense', desc: t('Каждые 100% — гарантированная ступень множителя, остаток — шанс следующей (250% = ×3 и 50% на ×4). Работает на персонажа, пета и элементный урон.', 'Each full 100% adds a guaranteed step to the damage multiplier. The remainder gives a chance of the next step. At 250%, damage is ×3 with a 50% chance of ×4. Applies to character, pet and elemental damage.') },
  { id: 'boss', name: 'Boss Damage', ru: t('Урон по боссам', 'Boss Damage'), group: 'Offense', desc: t('Отдельный стат. Daily Boss, Guild Boss, Tower. В Elemental Conflux — 50% эффективности.', 'A separate stat for Daily Boss, Guild Boss and Tower. It applies at 50% strength in Elemental Conflux.') },
  { id: 'retal', name: 'Retaliation', ru: t('Возмездие', 'Retaliation'), group: 'Offense', desc: t('Retaliation = Reflecting% × Defense. Срабатывает на каждую атаку монстра (даже если он промахнулся). Блокированный удар — на 50% сильнее. Strength даёт +0.5 к базе за пункт.', 'Retaliation = Reflecting% × Defense. It triggers on every monster attack, even a miss. A blocked attack deals 50% more Retaliation damage. Each point of Strength adds 0.5 base Retaliation.') },
  { id: 'maxHp', name: 'Max Health', ru: t('Макс. HP', 'Max Health'), group: 'Defense' },
  { id: 'defense', name: 'Defense', ru: t('Защита', 'Defense'), group: 'Defense', desc: t('Снижает входящий урон по растущей кривой: чем выше ML, тем труднее наращивать эффект. Также усиливает Retaliation.', 'Reduces incoming damage. At higher ML, you need more Defense for the same reduction. Defense also increases Retaliation.') },
  { id: 'dr', name: 'Damage Reduction', ru: t('Снижение урона', 'Damage Reduction'), group: 'Defense', desc: t('Софт-кап 95%, хард-кап 99%. Выше 95% каждый процент работает на 10% эффективности. Персонаж всегда получает минимум 1% удара.', 'Soft cap 95%, hard cap 99%. Above 95%, each additional point is 10% effective. You always take at least 1% of a hit.') },
  { id: 'block', name: 'Block Chance', ru: t('Шанс блока', 'Block Chance'), group: 'Defense', desc: t('Имплисит щита. Блок снижает входящий урон на 50% и усиливает Retaliation на 50%.', 'Shields have built-in Block Chance. Blocking reduces incoming damage by 50% and increases Retaliation by 50%.') },
  { id: 'dodge', name: 'Dodge Chance', ru: t('Уклонение', 'Dodge Chance'), group: 'Defense', desc: t('В стойке Bulwark уклонение = 0%.', 'Bulwark sets Dodge Chance to 0%.') },
  { id: 'loh', name: 'Life on Hit', ru: t('HP за удар', 'Life on Hit'), group: 'Sustain' },
  { id: 'lok', name: 'Life on Kill', ru: t('HP за убийство', 'Life on Kill'), group: 'Sustain' },
  { id: 'bloodthirst', name: 'Bloodthirst', ru: t('Bloodthirst (+% к LoH/LoK)', 'Bloodthirst'), group: 'Sustain', desc: t('Новый стат S2: множитель всего лечения за удар/убийство.', 'A Season 2 stat that multiplies all healing from Life on Hit and Life on Kill.') },
  { id: 'gold', name: 'Gold Gain', ru: t('Золото', 'Gold Gain'), group: 'Farming' },
  { id: 'exp', name: 'EXP Gain', ru: t('Опыт', 'EXP Gain'), group: 'Farming', desc: t('Влияет только на Character Level, НЕ ускоряет Monster Level.', 'Only increases Character Level EXP. Monster Level progresses separately.') },
  { id: 'itemDrop', name: 'Item Drop Chance', ru: t('Дроп предметов', 'Item Drop Chance'), group: 'Farming' },
  { id: 'mat', name: 'Material Drops', ru: t('Материалы', 'Material Drops'), group: 'Farming' },
  { id: 'eggDrop', name: 'Pet Egg drop chance', ru: t('Дроп яиц', 'Pet Egg drop chance'), group: 'Farming' },
  { id: 'lucky', name: 'Lucky Chance', ru: t('Удача', 'Lucky Chance'), group: 'Farming', desc: t('Шанс более высокого тира дропа. Гир-лук и Black Market складываются в один пул с диминишингом.', 'Gives a chance for higher-tier loot. Lucky from gear and Black Market share a pool with diminishing returns.') },
  { id: 'extraKill', name: 'Extra Kill Chance', ru: t('Двойное убийство', 'Extra Kill Chance'), group: 'Farming' },
];

export const PRIMARY_ATTRS = [
  { id: 'strength', name: 'Strength', ru: t('Сила', 'Strength'), perPoint: ['+0.75% Attack Damage', '+0.5% Max Health', '+0.5 Retaliation'] },
  { id: 'dexterity', name: 'Dexterity', ru: t('Ловкость', 'Dexterity'), perPoint: ['+0.05% Dodge Chance', '+0.1% Pet Damage'] },
  { id: 'intelligence', name: 'Intelligence', ru: t('Интеллект', 'Intelligence'), perPoint: ['+0.38% Attack Damage', '+0.05% Pet Damage', '+0.2% Double Damage Chance'] },
];

export const STANCES = [
  { id: 'aggressive', name: 'Aggressive', ru: t('Агрессия', 'Aggressive'), focus: 'Attack Damage', best: t('Урон от оружия/скиллов, боссы, криты', 'Weapon and skill damage, bosses and critical hits'), note: t('Классическая стойка для AD-билдов.', 'The standard stance for Attack Damage builds.') },
  { id: 'beastmaster', name: 'Beastmaster', ru: t('Повелитель зверей', 'Beastmaster'), focus: 'Pet Damage', best: t('Пет-билды (Archer, Druid, гибриды)', 'Pet builds for Archers, Druids and hybrids'), note: t('Перевес в урон активного пета и его бонусы.', 'Favors active pet damage and pet bonuses.') },
  { id: 'harmony', name: 'Harmony', ru: t('Гармония', 'Harmony'), focus: t('Баланс атаки и пета', 'Balanced character and pet attacks'), best: t('Гибридные билды и поздний гейм (после ML 180 скейл растёт быстрее)', 'Hybrid builds and late-game progression, with faster scaling after ML 180'), note: t('Требует развивать оба направления; в S2 серьёзно усилена на высоких ML.', 'Invest in both character and pet damage. Season 2 significantly increased high-ML scaling.') },
  { id: 'bulwark', name: 'Bulwark', ru: t('Бастион', 'Bulwark'), focus: t('Retaliation (возмездие)', 'Retaliation'), best: t('Воин-танк, «отражающие» билды', 'Warrior tanks and builds that reflect damage'), note: t('Даёт базовое Reflecting, но Dodge Chance = 0% в этой стойке.', 'Grants base Reflecting and sets Dodge Chance to 0%.') },
];

export const MASTERY = {
  elements: ['Fire', 'Water', 'Air', 'Earth', 'Poison', 'Nature'],
  noMastery: ['Mystery', 'Physical'],
  bossRule: t('В боях с боссами применяется ВАША САМАЯ ВЫСОКАЯ Mastery (не важна слабость босса).', 'Boss fights use your highest Mastery regardless of the boss’s elemental weakness.'),
  unlock: t('Elemental Conflux открывается на ML 30', 'Elemental Conflux unlocks at ML 30'),
  table: [
    { level: 0, bonus: 0, cost: 10, total: 0 }, { level: 1, bonus: 7, cost: 35, total: 10 },
    { level: 2, bonus: 9, cost: 55, total: 45 }, { level: 3, bonus: 11, cost: 80, total: 100 },
    { level: 4, bonus: 13, cost: 110, total: 180 }, { level: 5, bonus: 15, cost: 150, total: 290 },
    { level: 6, bonus: 17, cost: 200, total: 440 }, { level: 7, bonus: 19, cost: 260, total: 640 },
    { level: 8, bonus: 21, cost: 330, total: 900 }, { level: 9, bonus: 23, cost: 420, total: 1230 },
    { level: 10, bonus: 25, cost: null, total: 1650 },
  ],
  conflux: { dailyMinutes: 60, dailyShardCap: 100, expMult: 2, rareMatsFromML: 90, rareMatRate: t('≈×3 к дропу Abyssal Ember / Eternal Sigil / Primeval Core при игре на самом высоком доступном ML', 'About ×3 drops for Abyssal Ember, Eternal Sigil and Primeval Core when playing at your highest available ML') },
  elementNote: t('Элементарная конверсия оружия: суммарно до 100% урона в элементы; бонус слабости применяется только по совпадающему элементу (в S1 базовый бонус 25%).', 'Weapons can convert up to 100% of their damage into elements. Only the element matching an enemy’s weakness gets the weakness bonus (25% base in Season 1).'),
};

export const PETS = {
  hatch: [
    { rarity: 'Common', chance: 50, unlock: t('всегда', 'Always'), bonusPool: 0 },
    { rarity: 'Uncommon', chance: 25, unlock: t('всегда', 'Always'), bonusPool: 12, perBonus: 8.3 },
    { rarity: 'Rare', chance: 15, unlock: t('всегда', 'Always'), bonusPool: 15, perBonus: 6.7 },
    { rarity: 'Epic', chance: 8, unlock: t('после 10 яиц', 'After 10 eggs'), bonusPool: 20, perBonus: 5.0 },
    { rarity: 'Legendary', chance: 2, unlock: t('после 20 яиц', 'After 20 eggs'), bonusPool: 23, perBonus: 4.5 },
  ],
  pity: { epic: 20, legendary: 60 },
  slots: 4,
  shardAffixes: [
    { affix: 'EXP Gain', base: '+1%', perLevel: '+0.2%', cap: '—' },
    { affix: 'Gold Gain', base: '+1%', perLevel: '+0.2%', cap: '—' },
    { affix: 'Item Quantity', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'Material Quantity', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: t('Конверсия урона в элемент', 'Elemental damage conversion'), base: '+5%', perLevel: '+0.5%', cap: '—' },
    { affix: 'Ruby Drops', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'Rune Drops', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'All Class Skills', base: '+1', perLevel: t('+1 за уровень', '+1 per level'), cap: t('макс. +2', 'Max +2') },
    { affix: 'Extra Kill Chance', base: '+3%', perLevel: t('фиксировано', 'Fixed'), cap: t('фикс.', 'Fixed') },
  ],
  compoundCaps: [
    { rarity: 'Uncommon', cap: '+10' }, { rarity: 'Rare', cap: '+20' },
    { rarity: 'Epic', cap: '+30' }, { rarity: 'Legendary', cap: t('без капа', 'No cap') },
  ],
  compoundBalance: t('Бонус надетого пета считается не выше чем на 10 компоунд-уровней выше САМОГО СЛАБОГО надетого пета (25 на Permanent-реалме). Пустой слот = +0.', 'An equipped pet’s bonus caps at 10 compound levels above your weakest equipped pet, or 25 levels on the Permanent realm. An empty slot counts as +0.'),
  legendaryGrowth: [
    { group: 'Attack Damage, Pet Damage, Retaliation, Crit Chance, Critical Damage, Strength, Dexterity, Intelligence, Item Find, Gold Gain, EXP Gain', curve: t('×1.20 до +10, ×1.10 до +30, затем ×1.07', '×1.20 through +10, ×1.10 through +30, then ×1.07') },
    { group: 'Max Health, Dodge, Double Hit, Double Damage, Block, Life on Hit, Life on Kill', curve: t('×1.20 до +10, затем ×1.10', '×1.20 through +10, then ×1.10') },
    { group: 'Defense', curve: t('×1.20 до +10, затем +2% за уровень', '×1.20 through +10, then +2% per level') },
  ],
  notes: [
    t('Вид (species) выбирается независимо от редкости, шансы у всех видов равны.', 'Each species has the same base hatch chance, independent of rarity.'),
    t('Pet Mastery Points можно вкладывать в Favourite Pets — повышает вес вида при хэтче.', 'Spend Pet Mastery Points on Favourite Pets to make those species more likely to hatch.'),
    t('У одного вида может быть несколько копий под разные задачи: бой, голд/Item Find, EXP, активности.', 'Keep multiple copies of one species for different tasks such as combat, Gold/Item Find, EXP and activities.'),
    t('Reforging петов использует те же шансы редкости, что и хэтч; заблокированные петы не расходуются.', 'Pet reforging uses the same rarity odds as hatching. Locked pets are protected.'),
  ],
};

export const TALISMANS = {
  types: [
    { id: 'fury', name: 'Fury', ru: t('Ярость', 'Fury'), stats: 'Attack Damage + Crit Chance',
      levels: [[0, '2%', '0.50%'], [1, '4%', '1%'], [2, '7%', '1.60%'], [3, '11%', '2.30%'], [4, '16%', '3.20%'], [5, '22%', '4.20%'], [6, '29%', '5.50%'], [7, '37%', '7%'], [8, '46%', '8.80%'], [9, '56%', '11%']] },
    { id: 'spirit', name: 'Spirit', ru: t('Дух', 'Spirit'), stats: 'Pet Damage + Pet Mastery',
      levels: [[0, '3%', '1'], [1, '6%', '1'], [2, '10%', '1'], [3, '15%', '1'], [4, '21%', '1'], [5, '28%', '2'], [6, '36%', '3'], [7, '45%', '4'], [8, '55%', '5'], [9, '66%', '6']] },
    { id: 'iron', name: 'Iron', ru: t('Железо', 'Iron'), stats: 'Max Health + Damage Reduction',
      levels: [[0, '10', '0.50%'], [1, '22', '1%'], [2, '36', '1.70%'], [3, '54', '2.50%'], [4, '76', '3.50%'], [5, '104', '4.70%'], [6, '138', '6.10%'], [7, '180', '7.80%'], [8, '230', '9.80%'], [9, '290', '12%']] },
    { id: 'recovery', name: 'Recovery', ru: t('Восстановление', 'Recovery'), stats: 'Life on Hit + Life on Kill',
      levels: [[0, '1', '2'], [1, '2', '3'], [2, '3', '4'], [3, '4', '5'], [4, '5', '7'], [5, '7', '9'], [6, '8', '12'], [7, '10', '15'], [8, '12', '18'], [9, '15', '24']] },
  ],
  slots: 2,
  sacrificeBonuses: [
    { stat: 'Double Damage Chance', value: '10%' }, { stat: 'Double Hit Chance', value: '10%' },
    { stat: 'Strength', value: '50' }, { stat: 'Dexterity', value: '50' }, { stat: 'Intelligence', value: '50' },
    { stat: 'Crit Damage', value: '75%' }, { stat: 'EXP Gain', value: '50%' }, { stat: 'Gold Gain', value: '50%' },
  ],
  infusion: t('Инфузия +0 → +9 за золото и рубины, каждая гарантирована. У каждой платной инфузии 10% Lucky: следующий уровень бесплатно (на финальном +9 — полный возврат стоимости).', 'Spend gold and rubies to infuse a talisman from +0 to +9. Every infusion succeeds. Each paid infusion has a 10% Lucky chance to make the next level free. On the final +9 infusion, Lucky refunds the full cost.'),
  inscription: {
    odds: [['Common', 75], ['Greater', 20], ['Perfect', 5]],
    guarantees: t('Минимум Greater раз в 5 драфтов, минимум Perfect раз в 11 драфтов.', 'Get at least one Greater every 5 drafts and one Perfect every 11 drafts.'),
    stacking: t('Каждые 10 копий одного инскрипта дают +10% к его суммарному значению.', 'Every 10 copies of an inscription add 10% to its total value.'),
    reroll: t('3 реролла на драфт: первый бесплатно, далее 5 Arcstone; удержание одного оффера — 5 Arcstone.', 'Each draft allows 3 rerolls. The first is free and the others cost 5 Arcstone each. Holding one offer costs 5 Arcstone.'),
    affixes: [
      { affix: 'Attack Damage', values: ['8%', '12%', '20%'], chance: '3.6%' },
      { affix: 'Crit Chance', values: ['10%', '15%', '25%'], chance: '7.1%' },
      { affix: 'Damage Reduction', values: ['0.5%', '1%', '1.5%'], chance: '7.1%' },
      { affix: 'Max Health', values: ['100', '150', '250'], chance: '7.1%' },
      { affix: 'Life on Hit', values: ['6', '9', '15'], chance: '7.1%' },
      { affix: 'Life on Kill', values: ['12', '18', '30'], chance: '7.1%' },
      { affix: 'Pet Damage', values: ['10%', '15%', '25%'], chance: '3.6%' },
      { affix: 'Double Damage Chance', values: ['6%', '9%', '15%'], chance: '7.1%' },
      { affix: 'Double Hit Chance', values: ['6%', '9%', '15%'], chance: '7.1%' },
      { affix: 'Strength', values: ['6', '10', '15'], chance: '7.1%' },
      { affix: 'Dexterity', values: ['6', '10', '15'], chance: '7.1%' },
      { affix: 'Intelligence', values: ['6', '10', '15'], chance: '7.1%' },
      { affix: 'Crit Damage', values: ['10%', '15%', '25%'], chance: '7.1%' },
      { affix: 'EXP Gain', values: ['8%', '12%', '20%'], chance: '7.1%' },
      { affix: 'Gold Gain', values: ['8%', '12%', '20%'], chance: '7.1%' },
    ],
  },
};

export const RUNES = {
  grid: t('Rune Grid — сетка рун (в игре 6 × 7 слотов)', 'The Rune Grid has 6 × 7 slots.'),
  sources: [t('Дроп с монстров', 'Monster drops'), t('Rune Dust за каждое убийство (тем больше, чем выше ML)', 'Every kill grants Rune Dust. Higher ML gives more per kill.')],
  reroll: t('Rune Exchange: 3 неснятые руны одной формы + 1 рубин → реролл в выбранную форму/тип. Premium открывает Reforge Workshop (массовый реролл с авто-заполнением и защитой цели).', 'At the Rune Exchange, trade 3 available runes of the same shape and 1 ruby to reroll into a selected shape or type. Premium unlocks the Reforge Workshop for bulk rerolls, auto-fill and target protection.'),
  note: t('Полные таблицы рун и Rune Words (24 слова в S2) официально текстом не публикуются — планируйте слоты под 7 типов рун и подбирайте слова под задачу (урон / пет / защита / фарм).', 'The full rune tables and the 24 Season 2 Rune Words are unavailable as official text. Plan space for 7 rune types and choose words for damage, pets, defense or farming.'),
};

export const GUILD_TREE = {
  pointsRule: t('Каждый уровень гильдии = 1 очко; после 68 уровня — 2 очка.', 'Each guild level grants 1 point. Levels after 68 grant 2 points each.'),
  rankGates: t('Ранги 1–3 открыты сразу; ранги 4–6 — после 15 очков в дереве; ранги 7–10 — после 35 очков.', 'Ranks 1–3 are available immediately. Spend 15 points in the tree to unlock ranks 4–6 and 35 points to unlock ranks 7–10.'),
  ascension: { at: 68, note: t('Mastery: 1 ранг на уровень гильдии после 68.', 'Gain 1 Mastery rank per guild level after level 68.') },
  staircase: t('Family-узлы: лестница — семейство проходит рубеж в 10 рангов только если другое семейство уже дошло до него (и далее третье — до предыдущего рубежа).', 'To pass a 10-rank milestone in one family, another family must already have reached it. At higher milestones, a third family must also have reached the previous milestone.'),
  reset: t('Полный сброс: 1000 Guild Arcstone, кулдаун 24 часа.', 'A full reset costs 1,000 Guild Arcstone and has a 24-hour cooldown.'),
  boost: t('Bonus Boost множит бонусы дерева: +15% / +25% / +35% / +50%.', 'Bonus Boost multiplies tree bonuses by an additional 15%, 25%, 35% or 50%.'),
  nodes: [
    { family: 'Vanguard', bonus: 'Attack Damage', rank1: '+5.19%' },
    { family: 'Vanguard', bonus: 'Pet Damage', rank1: '+5.19%' },
    { family: 'Vanguard', bonus: 'Retaliation Damage', rank1: '+5.19%' },
    { family: 'Vanguard', bonus: 'Flat Attack Damage', rank1: '+4' },
    { family: 'Vanguard', bonus: 'Flat Pet Damage', rank1: '+4' },
    { family: 'Finesse', bonus: 'Critical Strike Chance', rank1: '+2%' },
    { family: 'Finesse', bonus: 'Dodge Chance', rank1: '+1.18%' },
    { family: 'Finesse', bonus: 'Defense', rank1: '+2.33%' },
    { family: 'Fortune', bonus: 'Gold Gain', rank1: '+4.15%' },
    { family: 'Fortune', bonus: 'EXP Gain', rank1: '+3.15%' },
    { family: 'Fortune', bonus: 'Guild Boss Damage', rank1: '+8.5%' },
  ],
  masteryPerRank: {
    'Attack Damage': '+0.3%', 'Pet Damage': '+0.3%', 'Retaliation Damage': '+0.3%',
    'Flat Attack Damage': '+12.5', 'Flat Pet Damage': '+12.5', 'Critical Strike Chance': '+0.125%',
    'Dodge Chance': '+0.1%', 'Defense': '+0.15%', 'Gold Gain': '+0.75%', 'EXP Gain': '+0.6%', 'Guild Boss Damage': '+0.5%',
  },
  familyPerRank: {
    Vanguard: ['+0.9% Attack Damage', '+0.9% Pet Damage', '+0.9% Retaliation Damage', '+37.5 Flat Attack Damage', '+37.5 Flat Pet Damage'],
    Finesse: ['+0.375% Critical Strike Chance', '+0.3% Dodge Chance', '+0.45% Defense'],
    Fortune: ['+2.25% Gold Gain', '+1.8% EXP Gain', '+1.5% Guild Boss Damage'],
  },
};

export const PROGRESSION = {
  mlUnlocks: [
    { ml: 10, what: t('Малый шанс Uncommon-дропа', 'Small chance of Uncommon drops') },
    { ml: 20, what: t('Гемы и сокеты (первый сокет — 25K золота)', 'Gems and sockets unlock. The first socket costs 25K gold.') },
    { ml: 25, what: t('Основной дроп Uncommon; двуручное оружие и Claws в общем пуле оружия', 'Uncommon becomes the most common drop. Two-handed weapons and Claws enter the general weapon pool.') },
    { ml: 30, what: 'Elemental Conflux (Mastery, Elemental Shards, ×2 EXP)' },
    { ml: 45, what: t('Малый шанс Rare-дропа', 'Small chance of Rare drops') },
    { ml: 50, what: t('Дроп Torch', 'Torches can drop') },
    { ml: 65, what: t('Основной дроп Rare; второй сокет (50M)', 'Rare becomes the most common drop. The second socket costs 50M.') },
    { ml: 90, what: t('Малый шанс Epic; Conflux становится фармом редких материалов (×3)', 'Small chance of Epic drops. Conflux becomes a source of rare materials (×3).') },
    { ml: 115, what: t('Основной дроп Epic; третий сокет (20B)', 'Epic becomes the most common drop. The third socket costs 20B.') },
    { ml: 150, what: t('Малый шанс Legendary', 'Small chance of Legendary drops') },
    { ml: 160, what: t('Flawless-гемы (дроп-онли); четвёртый сокет (2T)', 'Flawless gems can drop. The fourth socket costs 2T.') },
    { ml: 185, what: t('Основной дроп Legendary', 'Legendary becomes the most common drop') },
    { ml: 260, what: t('T6 Infernal-дроп; Lucky начинает влиять на Gilded-дроп; астральные катализаторы', 'T6 Infernal drops, Lucky begins affecting Gilded drops, and astral catalysts unlock') },
    { ml: 300, what: t('Биом Oblivion\'s Crown', 'Oblivion’s Crown biome') },
    { ml: 350, what: t('The Convergence — эндгейм-биом и Lattice', 'The Convergence endgame biome and Lattice') },
  ],
  biomes: [
    { name: 'Verdant Woods', ml: t('старт', 'Start'), tier: 1 }, { name: 'Scorched Sands', ml: 10, tier: 1 },
    { name: 'Murky Depths', ml: 30, tier: 2 }, { name: 'Frozen Peaks', ml: 45, tier: 3 },
    { name: 'Shadow Realm', ml: 65, tier: 4 }, { name: 'Infernal Pits', ml: 90, tier: 5 },
    { name: 'Elderwood', ml: 115, tier: 6 }, { name: 'Glasslands', ml: 150, tier: 7 },
    { name: 'Drowned Abyss', ml: 185, tier: 8 }, { name: 'Shattered Summit', ml: 220, tier: 9 },
    { name: 'Umbral Rift', ml: 260, tier: 10 }, { name: "Oblivion's Crown", ml: 300, tier: 11 },
    { name: 'The Convergence', ml: 350, tier: 12 },
  ],
  fightingLevel: t('Можно фармить ниже текущего ML, но не более чем на 30 уровней ниже.', 'You can farm up to 30 Monster Levels below your current ML.'),
  mlProgress: t('С Murky Depths и далее слабейший монстр биома даёт на 10% меньше прогресса ML, сильнейший — на 10% больше.', 'From Murky Depths onward, the weakest monster in each biome gives 10% less ML progress and the strongest gives 10% more.'),
  convergence: {
    seats: t('Старт — 4 сиденья; Lattice расширяет до 6. Сиденье можно залочить на любого монстра или оставить Wild.', 'Start with 4 seats. The Lattice expands this to 6. Lock a seat to any monster or leave it Wild.'),
    wild: t('Wild-сиденья дают +25% к дропу и только там появляются Convergent Elites.', 'Wild seats grant +25% drops and are the only seats where Convergent Elites appear.'),
    tier: t('Автотир растёт каждые 200 убийств; смерть снижает тир на 5.', 'Auto-tier increases every 200 kills. Dying drops the tier by 5.'),
    formulas: [t('HP монстра: 1 + 0.10T + 0.001T²', 'Monster HP: 1 + 0.10T + 0.001T²'), t('Урон монстра: 1 + 0.03T + 0.0002T²', 'Monster damage: 1 + 0.03T + 0.0002T²'), 'Resonance: 1 + 0.05T', 'Yield: 1 + 0.03T', t('С нодой Thick Skin урон: 1 + 0.015T + 0.0001T²', 'Monster damage with Thick Skin: 1 + 0.015T + 0.0001T²')],
    elites: t('Базовый шанс элиты 1%, pity 300 убийств, HP ×6, награды ×6, Resonance ×10, +3 бонусных материала, 5–15 Pet Shards.', 'Base elite chance is 1%, with a guarantee at 300 kills. Elites have ×6 HP and give ×6 rewards, ×10 Resonance, 3 bonus materials and 5–15 Pet Shards.'),
    lattice: t('37 нод, 6 созвездий (Might, Bastion, Harvest, Fortune, Ascendance, Wild), максимум 2 Keystone, до 3 лоадаутов.', '37 nodes in 6 constellations (Might, Bastion, Harvest, Fortune, Ascendance and Wild), up to 2 Keystones and 3 loadouts.'),
  },
  activities: [
    { name: 'Daily Boss (Boss Fight)', unlock: '—', details: t('30 секунд урона по боссу, окно ~каждые 3 часа; награда по брекетам урона; Slayer\'s работает.', 'Deal as much damage as possible in 30 seconds. The boss window opens about every 3 hours and rewards depend on your damage bracket. Slayer’s applies.') },
    { name: 'Guild Boss', unlock: t('гильдия', 'Guild'), details: t('Урон гильд-боссу; растёт от Guild Boss Damage в дереве Fortune.', 'Damage against the Guild Boss increases with Guild Boss Damage in the Fortune tree.') },
    { name: 'Dungeons', unlock: '—', details: t('Направления: Crypt, Gold Hoard, Den, Vault, Mine — у каждого свои награды и требования ML.', 'Crypt, Gold Hoard, Den, Vault and Mine each have their own rewards and ML requirements.') },
    { name: 'The Tower', unlock: 'Character Level 10', details: t('Этажи по 30 секунд, каждый 5-й — босс. Tower получает Boss Damage. Провал = 10 мин кулдаун (или 10 Arcstone). В 1.3.1 башня бьёт заметно больнее.', 'Each floor lasts 30 seconds and every fifth floor has a boss. Boss Damage works in the Tower. Failure triggers a 10-minute cooldown you can skip for 10 Arcstone. Tower enemies hit harder in 1.3.1.') },
    { name: 'Elemental Conflux', unlock: 'ML 30', details: t('60 минут в день, кап 100 Elemental Shards в день, ×2 EXP, с ML 90 — ×3 к редким материалам.', '60 minutes per day, up to 100 Elemental Shards per day, ×2 EXP and ×3 rare materials from ML 90.') },
    { name: 'Rift Raids', unlock: 'S2', details: t('Пачка 2–4 игрока против Rift Titan по Might пачки; каждый наносит один 30-секундный удар. Работают AD-, Pet- и Retaliation-билды.', 'A party of 2–4 players faces a Rift Titan scaled to party Might. Each player takes one 30-second attack. Attack Damage, Pet Damage and Retaliation builds all work.') },
    { name: 'Goblin Invasion', unlock: t('ивент', 'Event'), details: t('Опциональный ивент: убийства призывают 9 тематических гоблинов и Goblin King.', 'In this optional event, kills summon 9 themed goblins and the Goblin King.') },
    { name: 'Arcstone Ascent / Arc Pass', unlock: 'S2', details: t('Arc Pass — 30 уровней, Free + Premium (3000 Arcstone).', 'Arc Pass has 30 tiers and two tracks. Premium costs 3,000 Arcstone.') },
  ],
};

export const CLASS_CHANGE = {
  cost: t('Первая смена класса — бесплатно, далее 25 Arcstone за смену.', 'The first class change is free. Each later change costs 25 Arcstone.'),
  cooldown: t('Кулдаун растёт: 2 часа → 12 часов → 1 день → 1 неделя (далее остаётся неделя).', 'The cooldown increases from 2 hours to 12 hours, then 1 day and finally 1 week. Later changes keep the 1-week cooldown.'),
  restriction: t('Нельзя менять класс слишком близко к концу сезона.', 'Class changes are unavailable near the end of a season.'),
  gear: t('Оружие и оффхенды (надеты и в стэше) конвертируются в новый класс; при переходе в/из Rogue несовместимые аффиксы рероллятся. Навыки класса сбрасываются, очки возвращаются.', 'Equipped and stashed weapons and offhands convert to your new class. Switching to or from Rogue rerolls incompatible affixes. Class skills reset and their points are refunded.'),
};

export const SEASON2_SYSTEMS = [
  { name: 'The Forge', details: t('Прогресс привязан к СЛОТУ, а не к предмету: Tier, Enhance, Awaken. Любой надетый предмет сразу работает на уровне слота. Каждый тир открывает новую позицию аффикса и даёт Free Pick.', 'The Forge tracks Tier, Enhance and Awaken for each slot. Any item you equip uses the slot’s level immediately. Each tier opens a new affix position and grants a Free Pick.') },
  { name: 'Gear Score', details: t('Считает только слоты, в которых есть предмет: апгрейды слота + небольшой бонус за редкость. Пустые слоты (например, оффхенд под двуручкой или пустой Torch) = 0.', 'Each occupied slot adds its slot upgrades and a small rarity bonus. Empty slots, such as the offhand with a two-handed weapon or an empty Torch slot, add zero.') },
  { name: 'Sockets & Gems', details: t('20 сокетов на все слоты у любого класса; открываются по ML (20/65/115/160), уровни сокетов покупаются золотом (+0.04 к множителю слота за уровень).', 'Every class has 20 sockets across its gear slots. Sockets unlock at ML 20, 65, 115 and 160. Buy socket levels with gold to add 0.04 to the slot multiplier per level.') },
  { name: 'Reforging', details: t('Нужно минимум 3 одинаковых неснятых незалоченных предмета. Anchor Stones сохраняют выбранные свойства. Рефордж поднимает редкость.', 'Reforging raises rarity and requires at least 3 identical, available, unlocked items. Anchor Stones preserve selected properties.') },
  { name: 'Essences', details: t('Апгрейд предмета к следующей редкости (Uncommon → Infernal); нужна эссенция целевого тира.', 'To upgrade an item to its next rarity from Uncommon through Infernal, use the essence of the target tier.') },
  { name: 'Retaliation', details: t('Заменяет Thorns: броня бьёт в ответ на каждую атаку монстра, блокированные — на 50% сильнее. Урон = Reflecting% × Defense, криты и доп. удары работают.', 'Retaliation replaces Thorns. Armor strikes back on every monster attack, dealing Reflecting% × Defense. Blocking adds 50% damage. Critical hits and extra strikes apply.') },
  { name: 'Torch slot', details: t('Отдельный слот у всех классов: +All Class Skills (1–3 в зависимости от тира), свои аффиксы (в т.ч. Bloodthirst).', 'Every class has a Torch slot. It grants +1 to +3 All Class Skills depending on tier, with its own affixes including Bloodthirst.') },
  { name: 'Dungeon Destinations', details: t('Выбор направления данжа: Crypt, Gold Hoard, Den, Vault, Mine.', 'Choose a dungeon destination from Crypt, Gold Hoard, Den, Vault and Mine.') },
];
