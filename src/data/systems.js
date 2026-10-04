/**
 * Системы игры: статы и формулы, петы, талисманы, руны, прогрессия, стойки, гильдия.
 * Источники: wiki (Stats, Pet Damage, Retaliation, Gems, Mastery, Monster Level, Biomes,
 * Convergence, Elemental Conflux, Talismans, Pets, Runes, Combat Stance, Guild Skill Tree),
 * idlearc.com/patch-notes/1-3-1, idlearc.com/guild-tree, idlearc.com/classes.
 */

export const DATA_META = {
  // BUILD — метка сборки. Меняется при каждом обновлении данных/интерфейса:
  // сервер отдаёт её в /api/build, а интерфейс сравнивает свою метку и предлагает обновиться.
  build: '2026-10-04.14',
  gameVersion: '1.3.1 (Season 2: The Forge)',
  patchDate: '25 сентября 2026',
  verified: 'Данные сверены с официальными источниками и текущим билдом игры на 4 октября 2026',
  sources: [
    { label: 'Официальный сайт IdleArc', url: 'https://idlearc.com/' },
    { label: 'Патч-ноты 1.3.1 (официально)', url: 'https://idlearc.com/patch-notes/1-3-1' },
    { label: 'Официальные классы и скилл-деревья', url: 'https://idlearc.com/classes' },
    { label: 'Официальный симулятор гильд-дерева', url: 'https://idlearc.com/guild-tree' },
    { label: 'IdleArc Companion: данные дерева навыков (сборка 2026-09-29)', url: 'https://idlearc-companion-web-production.up.railway.app/data/skill_tree_data.json' },
    { label: 'Вики: классы', url: 'https://idlearc.fandom.com/wiki/Classes' },
    { label: 'Вики: статы', url: 'https://idlearc.fandom.com/wiki/Stats' },
    { label: 'Вики: Item Codex', url: 'https://idlearc.fandom.com/wiki/Item_Codex' },
    { label: 'Вики: гемы', url: 'https://idlearc.fandom.com/wiki/Gems' },
    { label: 'Вики: гайд Season 2', url: 'https://idlearc.fandom.com/wiki/Guide:Season_2_Progression_%26_Strategy_Guide' },
  ],
};

export const STATS = [
  { id: 'ad', name: 'Attack Damage', ru: 'Сила атаки', group: 'Offense', desc: 'Базовый урон персонажа: база → аддитивные бонусы → мультипликативные слои.' },
  { id: 'petDamage', name: 'Pet Damage', ru: 'Урон пета', group: 'Offense', desc: 'Считается ОТДЕЛЬНО от атаки персонажа. Складывается из атрибутов, гильдии, сетов, Time Boosts, Pet Mastery и классовых модификаторов.' },
  { id: 'crit', name: 'Critical Strike Chance', ru: 'Шанс крита', group: 'Offense', desc: 'При 100% — гарантированный крит. Выше 100% каждый +1% превращается в +1% Critical Damage.' },
  { id: 'critDmg', name: 'Critical Damage', ru: 'Урон крита', group: 'Offense', desc: 'Множитель крит-удара. Сверх 100% крит-шанса добавляется 1:1.' },
  { id: 'dh', name: 'Double Hit Chance', ru: 'Двойной удар', group: 'Offense', desc: 'Каждые полные 100% — гарантированный доп. удар, остаток — шанс ещё одного (250% = 3 гарантированных + 50% на 4-й). Доп. удары не срабатывают, если враг уже мёртв.' },
  { id: 'dd', name: 'Double Damage Chance', ru: 'Двойной урон', group: 'Offense', desc: 'Каждые 100% — гарантированная ступень множителя, остаток — шанс следующей (250% = ×3 и 50% на ×4). Работает на персонажа, пета и элементный урон.' },
  { id: 'boss', name: 'Boss Damage', ru: 'Урон по боссам', group: 'Offense', desc: 'Отдельный стат. Daily Boss, Guild Boss, Tower. В Elemental Conflux — 50% эффективности.' },
  { id: 'retal', name: 'Retaliation', ru: 'Возмездие', group: 'Offense', desc: 'Retaliation = Reflecting% × Defense. Срабатывает на каждую атаку монстра (даже если он промахнулся). Блокированный удар — на 50% сильнее. Strength даёт +0.5 к базе за пункт.' },
  { id: 'maxHp', name: 'Max Health', ru: 'Макс. HP', group: 'Defense' },
  { id: 'defense', name: 'Defense', ru: 'Защита', group: 'Defense', desc: 'Снижает входящий урон по растущей кривой: чем выше ML, тем труднее наращивать эффект. Также усиливает Retaliation.' },
  { id: 'dr', name: 'Damage Reduction', ru: 'Снижение урона', group: 'Defense', desc: 'Софт-кап 95%, хард-кап 99%. Выше 95% каждый процент работает на 10% эффективности. Персонаж всегда получает минимум 1% удара.' },
  { id: 'block', name: 'Block Chance', ru: 'Шанс блока', group: 'Defense', desc: 'Имплисит щита. Блок снижает входящий урон на 50% и усиливает Retaliation на 50%.' },
  { id: 'dodge', name: 'Dodge Chance', ru: 'Уклонение', group: 'Defense', desc: 'В стойке Bulwark уклонение = 0%.' },
  { id: 'loh', name: 'Life on Hit', ru: 'HP за удар', group: 'Sustain' },
  { id: 'lok', name: 'Life on Kill', ru: 'HP за убийство', group: 'Sustain' },
  { id: 'bloodthirst', name: 'Bloodthirst', ru: 'Bloodthirst (+% к LoH/LoK)', group: 'Sustain', desc: 'Новый стат S2: множитель всего лечения за удар/убийство.' },
  { id: 'gold', name: 'Gold Gain', ru: 'Золото', group: 'Farming' },
  { id: 'exp', name: 'EXP Gain', ru: 'Опыт', group: 'Farming', desc: 'Влияет только на Character Level, НЕ ускоряет Monster Level.' },
  { id: 'itemDrop', name: 'Item Drop Chance', ru: 'Дроп предметов', group: 'Farming' },
  { id: 'mat', name: 'Material Drops', ru: 'Материалы', group: 'Farming' },
  { id: 'eggDrop', name: 'Pet Egg drop chance', ru: 'Дроп яиц', group: 'Farming' },
  { id: 'lucky', name: 'Lucky Chance', ru: 'Удача', group: 'Farming', desc: 'Шанс более высокого тира дропа. Гир-лук и Black Market складываются в один пул с диминишингом.' },
  { id: 'extraKill', name: 'Extra Kill Chance', ru: 'Двойное убийство', group: 'Farming' },
];

export const PRIMARY_ATTRS = [
  { id: 'strength', name: 'Strength', ru: 'Сила', perPoint: ['+0.75% Attack Damage', '+0.5% Max Health', '+0.5 Retaliation'] },
  { id: 'dexterity', name: 'Dexterity', ru: 'Ловкость', perPoint: ['+0.05% Dodge Chance', '+0.1% Pet Damage'] },
  { id: 'intelligence', name: 'Intelligence', ru: 'Интеллект', perPoint: ['+0.38% Attack Damage', '+0.05% Pet Damage', '+0.2% Double Damage Chance'] },
];

export const STANCES = [
  { id: 'aggressive', name: 'Aggressive', ru: 'Агрессия', focus: 'Attack Damage', best: 'Урон от оружия/скиллов, боссы, криты', note: 'Классическая стойка для AD-билдов.' },
  { id: 'beastmaster', name: 'Beastmaster', ru: 'Повелитель зверей', focus: 'Pet Damage', best: 'Пет-билды (Archer, Druid, гибриды)', note: 'Перевес в урон активного пета и его бонусы.' },
  { id: 'harmony', name: 'Harmony', ru: 'Гармония', focus: 'Баланс атаки и пета', best: 'Гибридные билды и поздний гейм (после ML 180 скейл растёт быстрее)', note: 'Требует развивать оба направления; в S2 серьёзно усилена на высоких ML.' },
  { id: 'bulwark', name: 'Bulwark', ru: 'Бастион', focus: 'Retaliation (возмездие)', best: 'Воин-танк, «отражающие» билды', note: 'Даёт базовое Reflecting, но Dodge Chance = 0% в этой стойке.' },
];

export const MASTERY = {
  elements: ['Fire', 'Water', 'Air', 'Earth', 'Poison', 'Nature'],
  noMastery: ['Mystery', 'Physical'],
  bossRule: 'В боях с боссами применяется ВАША САМАЯ ВЫСОКАЯ Mastery (не важна слабость босса).',
  unlock: 'Elemental Conflux открывается на ML 30',
  table: [
    { level: 0, bonus: 0, cost: 10, total: 0 }, { level: 1, bonus: 7, cost: 35, total: 10 },
    { level: 2, bonus: 9, cost: 55, total: 45 }, { level: 3, bonus: 11, cost: 80, total: 100 },
    { level: 4, bonus: 13, cost: 110, total: 180 }, { level: 5, bonus: 15, cost: 150, total: 290 },
    { level: 6, bonus: 17, cost: 200, total: 440 }, { level: 7, bonus: 19, cost: 260, total: 640 },
    { level: 8, bonus: 21, cost: 330, total: 900 }, { level: 9, bonus: 23, cost: 420, total: 1230 },
    { level: 10, bonus: 25, cost: null, total: 1650 },
  ],
  conflux: { dailyMinutes: 60, dailyShardCap: 100, expMult: 2, rareMatsFromML: 90, rareMatRate: '≈×3 к дропу Abyssal Ember / Eternal Sigil / Primeval Core при игре на самом высоком доступном ML' },
  elementNote: 'Элементарная конверсия оружия: суммарно до 100% урона в элементы; бонус слабости применяется только по совпадающему элементу (в S1 базовый бонус 25%).',
};

export const PETS = {
  hatch: [
    { rarity: 'Common', chance: 50, unlock: 'всегда', bonusPool: 0 },
    { rarity: 'Uncommon', chance: 25, unlock: 'всегда', bonusPool: 12, perBonus: 8.3 },
    { rarity: 'Rare', chance: 15, unlock: 'всегда', bonusPool: 15, perBonus: 6.7 },
    { rarity: 'Epic', chance: 8, unlock: 'после 10 яиц', bonusPool: 20, perBonus: 5.0 },
    { rarity: 'Legendary', chance: 2, unlock: 'после 20 яиц', bonusPool: 23, perBonus: 4.5 },
  ],
  pity: { epic: 20, legendary: 60 },
  slots: 4,
  shardAffixes: [
    { affix: 'EXP Gain', base: '+1%', perLevel: '+0.2%', cap: '—' },
    { affix: 'Gold Gain', base: '+1%', perLevel: '+0.2%', cap: '—' },
    { affix: 'Item Quantity', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'Material Quantity', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'Конверсия урона в элемент', base: '+5%', perLevel: '+0.5%', cap: '—' },
    { affix: 'Ruby Drops', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'Rune Drops', base: '+1%', perLevel: '+0.1%', cap: '—' },
    { affix: 'All Class Skills', base: '+1', perLevel: '+1 за уровень', cap: 'макс. +2' },
    { affix: 'Extra Kill Chance', base: '+3%', perLevel: 'фиксировано', cap: 'фикс.' },
  ],
  compoundCaps: [
    { rarity: 'Uncommon', cap: '+10' }, { rarity: 'Rare', cap: '+20' },
    { rarity: 'Epic', cap: '+30' }, { rarity: 'Legendary', cap: 'без капа' },
  ],
  compoundBalance: 'Бонус надетого пета считается не выше чем на 10 компоунд-уровней выше САМОГО СЛАБОГО надетого пета (25 на Permanent-реалме). Пустой слот = +0.',
  legendaryGrowth: [
    { group: 'Attack Damage, Pet Damage, Retaliation, Crit Chance, Critical Damage, Strength, Dexterity, Intelligence, Item Find, Gold Gain, EXP Gain', curve: '×1.20 до +10, ×1.10 до +30, затем ×1.07' },
    { group: 'Max Health, Dodge, Double Hit, Double Damage, Block, Life on Hit, Life on Kill', curve: '×1.20 до +10, затем ×1.10' },
    { group: 'Defense', curve: '×1.20 до +10, затем +2% за уровень' },
  ],
  notes: [
    'Вид (species) выбирается независимо от редкости, шансы у всех видов равны.',
    'Pet Mastery Points можно вкладывать в Favourite Pets — повышает вес вида при хэтче.',
    'У одного вида может быть несколько копий под разные задачи: бой, голд/Item Find, EXP, активности.',
    'Reforging петов использует те же шансы редкости, что и хэтч; заблокированные петы не расходуются.',
  ],
};

export const TALISMANS = {
  types: [
    { id: 'fury', name: 'Fury', ru: 'Ярость', stats: 'Attack Damage + Crit Chance',
      levels: [[0, '2%', '0.50%'], [1, '4%', '1%'], [2, '7%', '1.60%'], [3, '11%', '2.30%'], [4, '16%', '3.20%'], [5, '22%', '4.20%'], [6, '29%', '5.50%'], [7, '37%', '7%'], [8, '46%', '8.80%'], [9, '56%', '11%']] },
    { id: 'spirit', name: 'Spirit', ru: 'Дух', stats: 'Pet Damage + Pet Mastery',
      levels: [[0, '3%', '1'], [1, '6%', '1'], [2, '10%', '1'], [3, '15%', '1'], [4, '21%', '1'], [5, '28%', '2'], [6, '36%', '3'], [7, '45%', '4'], [8, '55%', '5'], [9, '66%', '6']] },
    { id: 'iron', name: 'Iron', ru: 'Железо', stats: 'Max Health + Damage Reduction',
      levels: [[0, '10', '0.50%'], [1, '22', '1%'], [2, '36', '1.70%'], [3, '54', '2.50%'], [4, '76', '3.50%'], [5, '104', '4.70%'], [6, '138', '6.10%'], [7, '180', '7.80%'], [8, '230', '9.80%'], [9, '290', '12%']] },
    { id: 'recovery', name: 'Recovery', ru: 'Восстановление', stats: 'Life on Hit + Life on Kill',
      levels: [[0, '1', '2'], [1, '2', '3'], [2, '3', '4'], [3, '4', '5'], [4, '5', '7'], [5, '7', '9'], [6, '8', '12'], [7, '10', '15'], [8, '12', '18'], [9, '15', '24']] },
  ],
  slots: 2,
  sacrificeBonuses: [
    { stat: 'Double Damage Chance', value: '10%' }, { stat: 'Double Hit Chance', value: '10%' },
    { stat: 'Strength', value: '50' }, { stat: 'Dexterity', value: '50' }, { stat: 'Intelligence', value: '50' },
    { stat: 'Crit Damage', value: '75%' }, { stat: 'EXP Gain', value: '50%' }, { stat: 'Gold Gain', value: '50%' },
  ],
  infusion: 'Инфузия +0 → +9 за золото и рубины, каждая гарантирована. У каждой платной инфузии 10% Lucky: следующий уровень бесплатно (на финальном +9 — полный возврат стоимости).',
  inscription: {
    odds: [['Common', 75], ['Greater', 20], ['Perfect', 5]],
    guarantees: 'Минимум Greater раз в 5 драфтов, минимум Perfect раз в 11 драфтов.',
    stacking: 'Каждые 10 копий одного инскрипта дают +10% к его суммарному значению.',
    reroll: '3 реролла на драфт: первый бесплатно, далее 5 Arcstone; удержание одного оффера — 5 Arcstone.',
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
  grid: 'Rune Grid — сетка рун (в игре 6 × 7 слотов)',
  sources: ['Дроп с монстров', 'Rune Dust за каждое убийство (тем больше, чем выше ML)'],
  reroll: 'Rune Exchange: 3 неснятые руны одной формы + 1 рубин → реролл в выбранную форму/тип. Premium открывает Reforge Workshop (массовый реролл с авто-заполнением и защитой цели).',
  note: 'Полные таблицы рун и Rune Words (24 слова в S2) официально текстом не публикуются — планируйте слоты под 7 типов рун и подбирайте слова под задачу (урон / пет / защита / фарм).',
};

export const GUILD_TREE = {
  pointsRule: 'Каждый уровень гильдии = 1 очко; после 68 уровня — 2 очка.',
  rankGates: 'Ранги 1–3 открыты сразу; ранги 4–6 — после 15 очков в дереве; ранги 7–10 — после 35 очков.',
  ascension: { at: 68, note: 'Mastery: 1 ранг на уровень гильдии после 68.' },
  staircase: 'Family-узлы: лестница — семейство проходит рубеж в 10 рангов только если другое семейство уже дошло до него (и далее третье — до предыдущего рубежа).',
  reset: 'Полный сброс: 1000 Guild Arcstone, кулдаун 24 часа.',
  boost: 'Bonus Boost множит бонусы дерева: +15% / +25% / +35% / +50%.',
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
    { ml: 10, what: 'Малый шанс Uncommon-дропа' },
    { ml: 20, what: 'Гемы и сокеты (первый сокет — 25K золота)' },
    { ml: 25, what: 'Основной дроп Uncommon; двуручное оружие и Claws в общем пуле оружия' },
    { ml: 30, what: 'Elemental Conflux (Mastery, Elemental Shards, ×2 EXP)' },
    { ml: 45, what: 'Малый шанс Rare-дропа' },
    { ml: 50, what: 'Дроп Torch' },
    { ml: 65, what: 'Основной дроп Rare; второй сокет (50M)' },
    { ml: 90, what: 'Малый шанс Epic; Conflux становится фармом редких материалов (×3)' },
    { ml: 115, what: 'Основной дроп Epic; третий сокет (20B)' },
    { ml: 150, what: 'Малый шанс Legendary' },
    { ml: 160, what: 'Flawless-гемы (дроп-онли); четвёртый сокет (2T)' },
    { ml: 185, what: 'Основной дроп Legendary' },
    { ml: 260, what: 'T6 Infernal-дроп; Lucky начинает влиять на Gilded-дроп; астральные катализаторы' },
    { ml: 300, what: 'Биом Oblivion\'s Crown' },
    { ml: 350, what: 'The Convergence — эндгейм-биом и Lattice' },
  ],
  biomes: [
    { name: 'Verdant Woods', ml: 'старт', tier: 1 }, { name: 'Scorched Sands', ml: 10, tier: 1 },
    { name: 'Murky Depths', ml: 30, tier: 2 }, { name: 'Frozen Peaks', ml: 45, tier: 3 },
    { name: 'Shadow Realm', ml: 65, tier: 4 }, { name: 'Infernal Pits', ml: 90, tier: 5 },
    { name: 'Elderwood', ml: 115, tier: 6 }, { name: 'Glasslands', ml: 150, tier: 7 },
    { name: 'Drowned Abyss', ml: 185, tier: 8 }, { name: 'Shattered Summit', ml: 220, tier: 9 },
    { name: 'Umbral Rift', ml: 260, tier: 10 }, { name: "Oblivion's Crown", ml: 300, tier: 11 },
    { name: 'The Convergence', ml: 350, tier: 12 },
  ],
  fightingLevel: 'Можно фармить ниже текущего ML, но не более чем на 30 уровней ниже.',
  mlProgress: 'С Murky Depths и далее слабейший монстр биома даёт на 10% меньше прогресса ML, сильнейший — на 10% больше.',
  convergence: {
    seats: 'Старт — 4 сиденья; Lattice расширяет до 6. Сиденье можно залочить на любого монстра или оставить Wild.',
    wild: 'Wild-сиденья дают +25% к дропу и только там появляются Convergent Elites.',
    tier: 'Автотир растёт каждые 200 убийств; смерть снижает тир на 5.',
    formulas: ['HP монстра: 1 + 0.10T + 0.001T²', 'Урон монстра: 1 + 0.03T + 0.0002T²', 'Resonance: 1 + 0.05T', 'Yield: 1 + 0.03T', 'С нодой Thick Skin урон: 1 + 0.015T + 0.0001T²'],
    elites: 'Базовый шанс элиты 1%, pity 300 убийств, HP ×6, награды ×6, Resonance ×10, +3 бонусных материала, 5–15 Pet Shards.',
    lattice: '37 нод, 6 созвездий (Might, Bastion, Harvest, Fortune, Ascendance, Wild), максимум 2 Keystone, до 3 лоадаутов.',
  },
  activities: [
    { name: 'Daily Boss (Boss Fight)', unlock: '—', details: '30 секунд урона по боссу, окно ~каждые 3 часа; награда по брекетам урона; Slayer\'s работает.' },
    { name: 'Guild Boss', unlock: 'гильдия', details: 'Урон гильд-боссу; растёт от Guild Boss Damage в дереве Fortune.' },
    { name: 'Dungeons', unlock: '—', details: 'Направления: Crypt, Gold Hoard, Den, Vault, Mine — у каждого свои награды и требования ML.' },
    { name: 'The Tower', unlock: 'Character Level 10', details: 'Этажи по 30 секунд, каждый 5-й — босс. Tower получает Boss Damage. Провал = 10 мин кулдаун (или 10 Arcstone). В 1.3.1 башня бьёт заметно больнее.' },
    { name: 'Elemental Conflux', unlock: 'ML 30', details: '60 минут в день, кап 100 Elemental Shards в день, ×2 EXP, с ML 90 — ×3 к редким материалам.' },
    { name: 'Rift Raids', unlock: 'S2', details: 'Пачка 2–4 игрока против Rift Titan по Might пачки; каждый наносит один 30-секундный удар. Работают AD-, Pet- и Retaliation-билды.' },
    { name: 'Goblin Invasion', unlock: 'ивент', details: 'Опциональный ивент: убийства призывают 9 тематических гоблинов и Goblin King.' },
    { name: 'Arcstone Ascent / Arc Pass', unlock: 'S2', details: 'Arc Pass — 30 уровней, Free + Premium (3000 Arcstone).' },
  ],
};

export const CLASS_CHANGE = {
  cost: 'Первая смена класса — бесплатно, далее 25 Arcstone за смену.',
  cooldown: 'Кулдаун растёт: 2 часа → 12 часов → 1 день → 1 неделя (далее остаётся неделя).',
  restriction: 'Нельзя менять класс слишком близко к концу сезона.',
  gear: 'Оружие и оффхенды (надеты и в стэше) конвертируются в новый класс; при переходе в/из Rogue несовместимые аффиксы рероллятся. Навыки класса сбрасываются, очки возвращаются.',
};

export const SEASON2_SYSTEMS = [
  { name: 'The Forge', details: 'Прогресс привязан к СЛОТУ, а не к предмету: Tier, Enhance, Awaken. Любой надетый предмет сразу работает на уровне слота. Каждый тир открывает новую позицию аффикса и даёт Free Pick.' },
  { name: 'Gear Score', details: 'Считает только слоты, в которых есть предмет: апгрейды слота + небольшой бонус за редкость. Пустые слоты (например, оффхенд под двуручкой или пустой Torch) = 0.' },
  { name: 'Sockets & Gems', details: '20 сокетов на все слоты у любого класса; открываются по ML (20/65/115/160), уровни сокетов покупаются золотом (+0.04 к множителю слота за уровень).' },
  { name: 'Reforging', details: 'Нужно минимум 3 одинаковых неснятых незалоченных предмета. Anchor Stones сохраняют выбранные свойства. Рефордж поднимает редкость.' },
  { name: 'Essences', details: 'Апгрейд предмета к следующей редкости (Uncommon → Infernal); нужна эссенция целевого тира.' },
  { name: 'Retaliation', details: 'Заменяет Thorns: броня бьёт в ответ на каждую атаку монстра, блокированные — на 50% сильнее. Урон = Reflecting% × Defense, криты и доп. удары работают.' },
  { name: 'Torch slot', details: 'Отдельный слот у всех классов: +All Class Skills (1–3 в зависимости от тира), свои аффиксы (в т.ч. Bloodthirst).' },
  { name: 'Dungeon Destinations', details: 'Выбор направления данжа: Crypt, Gold Hoard, Den, Vault, Mine.' },
];
