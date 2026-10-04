/**
 * Классы IdleArc: ветки, классовые навыки, точные значения за очко и капы.
 *
 * Проверено 2026-10-04 (игра 1.3.1 / Season 2). Источники:
 *  1. idlearc.com/classes — официальные ветви, тиры, максимальные ранги (5/10) и правила тиров
 *     (Tier 2 открывается после 5 очков в этой же ветке, Tier 3 — после 10).
 *  2. idlearc.com/patch-notes/1-3-1 — баланс Season 2: Counterstrike заменил Victory Rush,
 *     Iron Constitution / Battle Recovery / Crushing Blows переведены на Defense,
 *     крит- и double-hit-навыки Rogue слегка ослаблены, фарм-навыки выровнены по классам.
 *  3. IdleArc Companion, data/skill_tree_data.json (сборка 2026-09-29, данные текущего билда) —
 *     точные значения за ранг, капы, тиры и принадлежность к ветвям для всех 5 классов,
 *     включая Druid (Lodge / Tunnels / Symbiosis).
 *  4. idlearc.fandom.com/wiki/{Warrior,Archer,Mage,Rogue} — сверка (страницы обновлены 2026-09-08,
 *     поэтому для изменённых в 1.3.1 навыков приоритет у пунктов 1–3).
 *
 * key действия (perPoint) — вклад ОДНОГО очка навыка:
 *  ad %, crit %, critDmg %, dh %, dd %, boss %, petDmg %, petMastery (flat), petDmgFlat (flat),
 *  maxHp (flat), maxHpPct %, loh (flat), lok (flat), defense % , defFlat (flat), dr %,
 *  block %, dodge %, retal %, flatToPet % (конверсия плоского урона в пета), elemWeak %,
 *  gold %, mat %, itemDrop %, eggDrop %, exp %, petExp %, matDupe %, luckyTier %,
 *  ruby %, rune %, extraKill %, cull % (мгновенное убийство от % HP),
 *  trap % (урон от % HP в начале боя), vsHigh %, vsLow %, ddTriple % (шанс тройного урона),
 *  critDouble % (шанс x2 крит), echoTrigger %, echoDamage %, echoTwice %, dhBonusDmg %,
 *  extraStrike % (шанс доп. удара после Double Hit), petDoubleStrike %,
 *  magicBlastChance %, magicBlastDmg %, critExplode %, instakillNonBoss %
 *
 * `cap` — предел эффекта в игре (сверх него +All Class Skills ничего не добавляет);
 * `base` — стартовое значение эффекта (например, 50% шанс Magic Blast);
 * `requires` — id навыка-предусловия (открывается после вложения очка в него).
 */

export const CLASS_SKILL_RULES = {
  firstPointAtLevel: 1,
  levelsPerPoint: 3,
  tierUnlock: { 2: 5, 3: 10 }, // очков в этой же ветке для открытия тира
  refundCostArcstonePerPoint: 1,
  note: 'Первый классовый скилл-поинт на 1 уровне, далее +1 каждые 3 уровня персонажа.',
};

export const CLASSES = [
  {
    id: 'warrior',
    name: 'Warrior',
    ru: 'Воин',
    role: 'Ближний бой, щит, тяжёлые удары, выживаемость, Retaliation',
    desc: 'Master of melee combat with shields.',
    starter: 'Broken Sword',
    mainStat: 'strength',
    offhand: 'Shield (Block Chance)',
    weapons: ['Sword + Shield (одноручное + оффхенд)', 'Greatsword (двуручное, с ML 25)'],
    branches: ['Might', 'Strength', 'Finesse'],
    branchRu: { Might: 'Мощь', Strength: 'Сила', Finesse: 'Мастерство' },
    bestFor: ['Новички', 'Защитные и Retaliation-билды', 'Прогресс, когда не хватает выживаемости'],
    skills: [
      // Might — выживание, добивание, Extra Kill. В 1.3.1 Iron Constitution / Battle Recovery /
      // Crushing Blows переведены на Defense, а Victory Rush заменён на Counterstrike.
      { id: 'w_culling', branch: 'Might', tier: 1, name: 'Culling Strike', ru: 'Добивающий удар', max: 5,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: 'Мгновенно убивает врага, когда у него остаётся {cull}% макс. HP. Общий кап порога добивания (вместе с Executioner) — 35%.' },
      { id: 'w_iron', branch: 'Might', tier: 1, name: 'Iron Constitution', ru: 'Железная конституция', max: 10,
        perPoint: { defense: 2 },
        text: '+{defense}% Defense.' },
      { id: 'w_recovery', branch: 'Might', tier: 2, name: 'Battle Recovery', ru: 'Боевое восстановление', max: 5,
        perPoint: { defFlat: 50, lok: 8 },
        text: '+{defFlat} Defense (плоское значение) и +{lok} HP за убийство.' },
      { id: 'w_bloodthirst', branch: 'Might', tier: 2, name: 'Bloodthirst', ru: 'Кровожадность', max: 5,
        perPoint: { loh: 4, extraKill: 1 }, cap: { extraKill: 10 },
        text: '+{loh} HP за удар и +{extraKill}% шанс, что убийство засчитается дважды (Extra Kill). Кап 10%.' },
      { id: 'w_executioner', branch: 'Might', tier: 3, name: 'Executioner', ru: 'Палач', max: 5,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: '+{cull}% к порогу добивания, складывается с Culling Strike. Общий кап 35%.' },
      { id: 'w_counterstrike', branch: 'Might', tier: 3, name: 'Counterstrike', ru: 'Контрудар', max: 5,
        perPoint: { retal: 2 }, cap: { retal: 25 },
        s2: 'В 1.3.1 Counterstrike заменил Victory Rush (патч-ноты 1.3.1), очки за старый навык вернули бесплатно.',
        text: 'Заблокированные удары врага получают ответ на +{retal}% сильнее (Retaliation). Кап 25%.' },

      // Strength — урон, криты, Double Damage, урон по боссам
      { id: 'w_mighty', branch: 'Strength', tier: 1, name: 'Mighty Strikes', ru: 'Могучие удары', max: 10,
        perPoint: { ad: 5 }, text: '+{ad}% атаки.' },
      { id: 'w_focus', branch: 'Strength', tier: 1, name: 'Battle Focus', ru: 'Боевой фокус', max: 5,
        perPoint: { crit: 2 }, text: '+{crit}% шанс крита.' },
      { id: 'w_crushing', branch: 'Strength', tier: 2, name: 'Crushing Blows', ru: 'Сокрушающие удары', max: 5,
        perPoint: { critDmg: 3, defense: 2 },
        text: '+{critDmg}% урона от крита и +{defense}% Defense.' },
      { id: 'w_titans', branch: 'Strength', tier: 2, name: "Titan's Grip", ru: 'Хватка титана', max: 5,
        perPoint: { ad: 3 }, text: '+{ad}% атаки.' },
      { id: 'w_overwhelm', branch: 'Strength', tier: 3, name: 'Overwhelm', ru: 'Подавление', max: 5,
        perPoint: { dd: 2, boss: 5 }, cap: { boss: 100 },
        text: '+{dd}% Double Damage и +{boss}% урона по боссам. Общий кап Boss Damage — 100%.' },
      { id: 'w_titanic', branch: 'Strength', tier: 3, name: 'Titanic Blow', ru: 'Титанический удар', max: 5,
        perPoint: { ddTriple: 4 }, cap: { ddTriple: 80 },
        text: '{ddTriple}% шанс, что удар станет Titanic Blow (тройной урон). Кап 80%.' },

      // Finesse — Double Hit, блок и Retaliation, фарм-бонусы
      { id: 'w_berserk', branch: 'Finesse', tier: 1, name: 'Berserk', ru: 'Берсерк', max: 10,
        perPoint: { dh: 2 }, text: '+{dh}% Double Hit.' },
      { id: 'w_spoils', branch: 'Finesse', tier: 1, name: 'Spoils of War', ru: 'Военные трофеи', max: 5,
        perPoint: { gold: 5, mat: 5, itemDrop: 2 },
        s2: 'В 1.3.1 фарм-навыки классов выровнены: Warrior получает и шанс дропа предметов.',
        text: '+{gold}% золота, +{mat}% материалов и +{itemDrop}% шанс дропа предметов.' },
      { id: 'w_keen', branch: 'Finesse', tier: 2, name: 'Keen Edge', ru: 'Острая кромка', max: 5,
        perPoint: { critDmg: 8 }, text: '+{critDmg}% урона от крита.' },
      { id: 'w_deflection', branch: 'Finesse', tier: 2, name: 'Deflection', ru: 'Отражение', max: 5,
        perPoint: { block: 2, retal: 4 }, cap: { block: 25, retal: 40 },
        text: '+{block}% шанс блока (кап 25%) и +{retal}% Retaliation (кап 40%).' },
      { id: 'w_lethal', branch: 'Finesse', tier: 3, name: 'Lethal Blow', ru: 'Смертельный удар', max: 5,
        perPoint: { dd: 2, ruby: 2 },
        text: '+{dd}% Double Damage и +{ruby}% шанс дропа рубинов.' },
      { id: 'w_relentless', branch: 'Finesse', tier: 3, name: 'Relentless Assault', ru: 'Безжалостный натиск', max: 5,
        perPoint: { extraStrike: 10 }, cap: { extraStrike: 100 },
        text: 'Если сработал Double Hit, шанс {extraStrike}% ударить ещё раз. Кап 100%.' },
    ],
  },

  {
    id: 'archer',
    name: 'Archer',
    ru: 'Лучник',
    role: 'Дальний бой, ловушки, криты, пет-билды',
    desc: 'Ranged fighter with Pet Mastery.',
    starter: 'Wooden Bow',
    mainStat: 'dexterity',
    offhand: 'Quiver (Pet Mastery)',
    weapons: ['Bow + Quiver (одноручное + оффхенд)', 'Crossbow (двуручное, ML 25+, встроенный крит 25→50%)'],
    branches: ['Marksmanship', 'Hunting', 'Beastmaster'],
    branchRu: { Marksmanship: 'Стрельба', Hunting: 'Охота', Beastmaster: 'Повелитель зверей' },
    bestFor: ['Пет-билды (Pet Damage)', 'Фарм яиц (Pet Eggs)', 'Криты и шикарный одно-таргет урон'],
    skills: [
      // Marksmanship — базовый урон, криты, Double Damage
      { id: 'a_archery', branch: 'Marksmanship', tier: 1, name: 'Archery', ru: 'Стрельба из лука', max: 10,
        perPoint: { ad: 5 }, text: '+{ad}% атаки.' },
      { id: 'a_steady', branch: 'Marksmanship', tier: 1, name: 'Steady Aim', ru: 'Твёрдый прицел', max: 10,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'a_precision', branch: 'Marksmanship', tier: 2, name: 'Precision', ru: 'Точность', max: 5,
        perPoint: { crit: 4 }, text: '+{crit}% шанс крита.' },
      { id: 'a_doublenock', branch: 'Marksmanship', tier: 2, name: 'Double Nock', ru: 'Двойной натяг', max: 5,
        perPoint: { dh: 2 }, text: '+{dh}% Double Hit.' },
      { id: 'a_headshot', branch: 'Marksmanship', tier: 3, name: 'Headshot', ru: 'Выстрел в голову', max: 5,
        perPoint: { critDmg: 10 }, text: '+{critDmg}% урона от крита.' },
      { id: 'a_perfect', branch: 'Marksmanship', tier: 3, name: 'Perfect Shot', ru: 'Идеальный выстрел', max: 5,
        perPoint: { critDouble: 4 }, cap: { critDouble: 60 },
        text: '{critDouble}% шанс, что крит нанесёт двойной крит-урон. Кап 60%.' },

      // Hunting — ловушки, добивание обычных монстров, босс-урон
      { id: 'a_spiketrap', branch: 'Hunting', tier: 1, name: 'Spike Trap', ru: 'Шипастая ловушка', max: 10,
        perPoint: { trap: 1.5 }, cap: { trap: 35 },
        text: 'В начале боя мгновенно наносит {trap}% макс. HP врага. Общий кап урона ловушек — 35%.' },
      { id: 'a_barbed', branch: 'Hunting', tier: 1, name: 'Barbed Arrows', ru: 'Зазубренные стрелы', max: 5,
        perPoint: { loh: 2 }, text: '+{loh} HP за удар.' },
      { id: 'a_venomtrap', branch: 'Hunting', tier: 2, name: 'Venomous Trap', ru: 'Ядовитая ловушка', max: 5,
        perPoint: { ad: 3, dd: 1 }, text: '+{ad}% атаки и +{dd}% Double Damage.' },
      { id: 'a_trapmastery', branch: 'Hunting', tier: 2, name: 'Trap Mastery', ru: 'Мастерство ловушек', max: 5,
        perPoint: { trap: 1 }, cap: { trap: 35 },
        text: 'Ловушки наносят ещё {trap}% макс. HP врага в начале боя (общий кап 35%).' },
      { id: 'a_huntersmark', branch: 'Hunting', tier: 3, name: "Hunter's Mark", ru: 'Метка охотника', max: 5,
        perPoint: { vsLow: 3, boss: 5 }, cap: { boss: 100 },
        text: '+{vsLow}% урона по врагам ниже 50% HP и +{boss}% урона по боссам (общий кап Boss Damage 100%).' },
      { id: 'a_instinct', branch: 'Hunting', tier: 3, name: "Hunter's Instinct", ru: 'Инстинкт охотника', max: 5,
        perPoint: { instakillNonBoss: 1 }, cap: { instakillNonBoss: 15 },
        text: '{instakillNonBoss}% шанс, что ловушка опустит обычного монстра до 1 HP в начале боя. Кап 15% (достигается с +All Class Skills).' },

      // Beastmaster — пет, яйца, фарм
      { id: 'a_beastbond', branch: 'Beastmaster', tier: 1, name: 'Beast Bond', ru: 'Связь со зверем', max: 5,
        perPoint: { petDmg: 12 }, text: '+{petDmg}% бонус к урону пета.' },
      { id: 'a_egghunter', branch: 'Beastmaster', tier: 1, name: 'Egg Hunter', ru: 'Охотник за яйцами', max: 5,
        perPoint: { eggDrop: 1, itemDrop: 2 }, cap: { eggDrop: 15 },
        text: '+{eggDrop}% шанс дропа Pet Egg (кап 15%) и +{itemDrop}% шанс дропа предметов.' },
      { id: 'a_packleader', branch: 'Beastmaster', tier: 2, name: 'Pack Leader', ru: 'Вожак стаи', max: 5,
        perPoint: { petDmg: 8 }, text: '+{petDmg}% урона пета.' },
      { id: 'a_foraging', branch: 'Beastmaster', tier: 2, name: 'Foraging Companion', ru: 'Спутник-собиратель', max: 5,
        perPoint: { gold: 5, mat: 5 }, text: '+{gold}% золота и +{mat}% материалов.' },
      { id: 'a_strongpet', branch: 'Beastmaster', tier: 3, name: 'Strong Pet Bound', ru: 'Крепкая связь', max: 5,
        perPoint: { petMastery: 1 }, text: '+{petMastery} уровень Pet Mastery.' },
      { id: 'a_alpha', branch: 'Beastmaster', tier: 3, name: 'Alpha Strike', ru: 'Удар альфы', max: 5,
        perPoint: { petDoubleStrike: 3 }, cap: { petDoubleStrike: 60 },
        text: '{petDoubleStrike}% шанс, что пет ударит дважды. Кап 60%.' },
    ],
  },

  {
    id: 'mage',
    name: 'Mage',
    ru: 'Маг',
    role: 'Магический урон, криты, Double Damage, бурст по боссу',
    desc: 'Wielder of arcane magic.',
    starter: 'Wooden Rod',
    mainStat: 'intelligence',
    offhand: 'Old Book (Critical Damage)',
    weapons: ['Wand + Book (одноручное + оффхенд)', 'Grand Staff (двуручное, ML 25+, встроенный Intelligence)'],
    branches: ['Arcane', 'Destruction', 'Chaos'],
    branchRu: { Arcane: 'Тайная магия', Destruction: 'Разрушение', Chaos: 'Хаос' },
    bestFor: ['Максимальный урон по боссам', 'Крит-скалирование в мид/лейте', 'Требует больше экипировки до раскрытия'],
    caveat: 'У Mage нет классовых навыков «мгновенного убийства»/срезания HP врага — ему тяжелее в обычном фарме монстров. Wiki-гайд Season 2 советует брать мага осторожно на старте.',
    skills: [
      // Arcane — Magic Blast, Double Damage, тройной урон
      { id: 'm_blast', branch: 'Arcane', tier: 1, name: 'Magic Blast', ru: 'Магический взрыв', max: 10,
        perPoint: { magicBlastDmg: 3 }, base: { magicBlastChance: 50 },
        text: '50% шанс, что удар нанесёт ещё +{magicBlastDmg}% урона.' },
      { id: 'm_siphon', branch: 'Arcane', tier: 1, name: 'Arcane Siphon', ru: 'Тайный сифон', max: 5,
        perPoint: { loh: 2, dd: 1 }, text: '+{loh} HP за удар и +{dd}% Double Damage.' },
      { id: 'm_surge', branch: 'Arcane', tier: 2, name: 'Arcane Surge', ru: 'Тайный всплеск', max: 5,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'm_unstable', branch: 'Arcane', tier: 2, name: 'Unstable Energy', ru: 'Нестабильная энергия', max: 5,
        requires: 'm_blast', perPoint: { magicBlastChance: 5 }, cap: { magicBlastChance: 100 },
        text: 'Требует Magic Blast. +{magicBlastChance}% к шансу его срабатывания (база 50%, кап 100%).' },
      { id: 'm_spellmastery', branch: 'Arcane', tier: 3, name: 'Spell Mastery', ru: 'Мастерство заклинаний', max: 5,
        perPoint: { ad: 3 }, text: '+{ad}% атаки.' },
      { id: 'm_cascade', branch: 'Arcane', tier: 3, name: 'Arcane Cascade', ru: 'Тайный каскад', max: 5,
        perPoint: { ddTriple: 8 }, cap: { ddTriple: 100 },
        text: '{ddTriple}% шанс, что Double Damage превратится в тройной урон. Кап 100%.' },

      // Destruction — криты, огонь, урон по одной цели
      { id: 'm_fire', branch: 'Destruction', tier: 1, name: 'Fire Infusion', ru: 'Огненная инфузия', max: 10,
        perPoint: { ad: 5 }, text: '+{ad}% атаки.' },
      { id: 'm_combustion', branch: 'Destruction', tier: 1, name: 'Combustion', ru: 'Возгорание', max: 5,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'm_burningsoul', branch: 'Destruction', tier: 2, name: 'Burning Soul', ru: 'Горящая душа', max: 5,
        perPoint: { critDmg: 8 }, text: '+{critDmg}% урона от крита.' },
      { id: 'm_melting', branch: 'Destruction', tier: 2, name: 'Melting Point', ru: 'Точка плавления', max: 5,
        perPoint: { crit: 2 }, text: '+{crit}% шанс крита.' },
      { id: 'm_inferno', branch: 'Destruction', tier: 3, name: 'Inferno', ru: 'Инферно', max: 5,
        perPoint: { ad: 2 }, text: '+{ad}% атаки.' },
      { id: 'm_pyroclasm', branch: 'Destruction', tier: 3, name: 'Pyroclasm', ru: 'Пироклазм', max: 5,
        perPoint: { critExplode: 5 }, cap: { critExplode: 100 },
        text: 'Криты взрываются, нанося +{critExplode}% урона. Кап 100%.' },

      // Chaos — крит-шанс и крит-урон, фарм, гибрид
      { id: 'm_wild', branch: 'Chaos', tier: 1, name: 'Wild Magic', ru: 'Дикая магия', max: 10,
        perPoint: { crit: 2, critDmg: 1 }, text: '+{crit}% шанс крита и +{critDmg}% урона от крита.' },
      { id: 'm_fortune', branch: 'Chaos', tier: 1, name: "Fortune's Favor", ru: 'Благосклонность фортуны', max: 5,
        perPoint: { gold: 5, mat: 5 }, text: '+{gold}% золота и +{mat}% материалов.' },
      { id: 'm_chaosbolt', branch: 'Chaos', tier: 2, name: 'Chaos Bolt', ru: 'Снаряд хаоса', max: 5,
        perPoint: { critDmg: 10 }, text: '+{critDmg}% урона от крита.' },
      { id: 'm_soulharvest', branch: 'Chaos', tier: 2, name: 'Soul Harvest', ru: 'Жатва душ', max: 5,
        perPoint: { lok: 4, ruby: 3, rune: 1 }, text: '+{lok} HP за убийство, +{ruby}% рубинов, +{rune}% рун.' },
      { id: 'm_reality', branch: 'Chaos', tier: 3, name: 'Reality Warp', ru: 'Искажение реальности', max: 5,
        perPoint: { dh: 2, boss: 5 }, cap: { boss: 100 },
        text: '+{dh}% Double Hit и +{boss}% урона по боссам (общий кап Boss Damage 100%).' },
      { id: 'm_incarnate', branch: 'Chaos', tier: 3, name: 'Chaos Incarnate', ru: 'Воплощение хаоса', max: 5,
        perPoint: { crit: 2, dh: 2, dd: 2 }, text: '+{crit}% крит, +{dh}% Double Hit, +{dd}% Double Damage.' },
    ],
  },

  {
    id: 'rogue',
    name: 'Rogue',
    ru: 'Разбойник',
    role: 'Два оружия, криты, Double Hit, Shadow Echo, фарм',
    desc: 'Dual-wielding assassin who strikes with twin daggers.',
    starter: 'Rusty Dagger',
    mainStat: 'dexterity',
    offhand: 'Второе оружие (только Rogue носит 2 оружия)',
    weapons: ['2 × Dagger (каждый даёт +50% Double Hit Chance)', '2 × Claws (ML 25+, каждая даёт крит-шанс 50→100%)'],
    branches: ['Assassin', 'Shadow-walker', 'Thief'],
    branchRu: { Assassin: 'Ассасин', 'Shadow-walker': 'Тенеход', Thief: 'Вор' },
    bestFor: ['Фарм и скорость прогресса (лучший «общий» класс S2)', 'Double Hit / крит-билды', 'Голд и материалы'],
    skills: [
      // Assassin — криты, добивание, урон по боссам (в 1.3.1 крит-навыки слегка ослаблены)
      { id: 'r_precision', branch: 'Assassin', tier: 1, name: 'Precision Strikes', ru: 'Точные удары', max: 5,
        perPoint: { crit: 3 }, s2: 'В 1.3.1 снижено до 3% за очко.', text: '+{crit}% шанс крита.' },
      { id: 'r_sharpened', branch: 'Assassin', tier: 1, name: 'Sharpened Blades', ru: 'Заточенные клинки', max: 5,
        perPoint: { critDmg: 5 }, s2: 'В 1.3.1 снижено до 5% за очко.', text: '+{critDmg}% урона от крита.' },
      { id: 'r_firststrike', branch: 'Assassin', tier: 2, name: 'First Strike', ru: 'Первый удар', max: 5,
        perPoint: { vsHigh: 4 }, text: '+{vsHigh}% урона по врагам выше 50% HP.' },
      { id: 'r_contract', branch: 'Assassin', tier: 2, name: 'Contract Killer', ru: 'Нанятый убийца', max: 5,
        perPoint: { boss: 5 }, cap: { boss: 100 }, text: '+{boss}% урона по боссам (общий кап 100%).' },
      { id: 'r_ambush', branch: 'Assassin', tier: 3, name: 'Deadly Ambush', ru: 'Смертельная засада', max: 5,
        perPoint: { dd: 4 }, text: '+{dd}% Double Damage.' },
      { id: 'r_coup', branch: 'Assassin', tier: 3, name: 'Coup de Grâce', ru: 'Удар милосердия', max: 10,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: 'Мгновенно убивает врага при {cull}% макс. HP. Общий кап порога добивания — 35%.' },

      // Shadow-walker — Double Hit, Shadow Echo и второе эхо
      { id: 'r_swift', branch: 'Shadow-walker', tier: 1, name: 'Swift Blades', ru: 'Быстрые клинки', max: 5,
        perPoint: { dh: 3 }, s2: 'В 1.3.1 снижено до 3% за очко.', text: '+{dh}% Double Hit.' },
      { id: 'r_umbral', branch: 'Shadow-walker', tier: 1, name: 'Umbral Blades', ru: 'Теневые клинки', max: 5,
        perPoint: { ad: 5 }, text: '+{ad}% атаки.' },
      { id: 'r_echo', branch: 'Shadow-walker', tier: 2, name: 'Shadow Echo', ru: 'Теневое эхо', max: 5,
        perPoint: { echoTrigger: 5 }, base: { echoDamage: 40 }, cap: { echoTrigger: 100, echoDamage: 80 },
        text: '{echoTrigger}% шанс повторить удар на 40% его урона. Кап шанса 100%, кап урона 80%.' },
      { id: 'r_phantom', branch: 'Shadow-walker', tier: 2, name: 'Phantom Strike', ru: 'Призрачный удар', max: 5,
        perPoint: { dhBonusDmg: 3 }, text: 'Удары Double Hit наносят на {dhBonusDmg}% больше урона.' },
      { id: 'r_echomastery', branch: 'Shadow-walker', tier: 3, name: 'Echo Mastery', ru: 'Мастерство эха', max: 10,
        perPoint: { echoTrigger: 2, echoDamage: 2 }, cap: { echoTrigger: 100, echoDamage: 80 },
        text: '+{echoTrigger}% к шансу Shadow Echo и +{echoDamage}% к его урону. Капы: 100% / 80%.' },
      { id: 'r_cascade', branch: 'Shadow-walker', tier: 3, name: 'Umbral Cascade', ru: 'Теневой каскад', max: 10,
        requires: 'r_echo', perPoint: { echoTwice: 4 }, cap: { echoTwice: 75 },
        text: 'Требует Shadow Echo. {echoTwice}% шанс, что эхо сработает второй раз. Кап 75%.' },

      // Thief — золото, материалы, дроп, Lucky Tier (у Rogue золота больше всех)
      { id: 'r_scavenger', branch: 'Thief', tier: 1, name: 'Scavenger', ru: 'Падальщик', max: 5,
        perPoint: { gold: 2, mat: 2 }, text: '+{gold}% золота и +{mat}% материалов.' },
      { id: 'r_pickpocket', branch: 'Thief', tier: 1, name: 'Pickpocket', ru: 'Карманник', max: 5,
        perPoint: { gold: 4 }, text: '+{gold}% золота.' },
      { id: 'r_luckyhands', branch: 'Thief', tier: 2, name: 'Lucky Hands', ru: 'Счастливые руки', max: 5,
        perPoint: { matDupe: 2 }, cap: { matDupe: 15 },
        text: '{matDupe}% шанс удвоить дроп материала. Кап 15%.' },
      { id: 'r_treasure', branch: 'Thief', tier: 2, name: 'Treasure Hunter', ru: 'Охотник за сокровищами', max: 5,
        perPoint: { itemDrop: 2 }, text: '+{itemDrop}% шанс дропа предметов.' },
      { id: 'r_blackmarket', branch: 'Thief', tier: 3, name: 'Black Market', ru: 'Чёрный рынок', max: 5,
        perPoint: { luckyTier: 2 }, cap: { luckyTier: 20 },
        text: '+{luckyTier}% шанс, что выпадет предмет более высокого тира (Lucky Tier). Кап 20%. Складывается с Lucky у экипировки в один пул.' },
      { id: 'r_masterthief', branch: 'Thief', tier: 3, name: 'Master Thief', ru: 'Мастер-вор', max: 5,
        perPoint: { gold: 2, mat: 3, itemDrop: 1 },
        text: '+{gold}% золота, +{mat}% материалов, +{itemDrop}% дропа предметов.' },
    ],
  },

  {
    id: 'druid',
    name: 'Druid',
    ru: 'Друид',
    role: 'Гибрид: урон + пет, Harmony-механика, фарм яиц',
    desc: 'Wild guardian who channels strength into a mighty pet companion (Season 2).',
    starter: 'Gnarled Stick',
    mainStat: 'strength',
    offhand: 'Нет (двуручное Gnarled Stick)',
    weapons: ['Gnarled Stick (двуручное): физический урон + Pet Damage в имплисите'],
    branches: ['Lodge', 'Tunnels', 'Symbiosis'],
    branchRu: { Lodge: 'Ложа', Tunnels: 'Тоннели', Symbiosis: 'Симбиоз' },
    bestFor: ['Пет-прогресс и фарм яиц', 'Сложная, но сильная Harmony-игра', 'Игроки, любящие микро-менеджмент'],
    caveat: 'Тиры и максимальные ранги Druid сверены с данными текущего билда: в каждой ветке (Lodge / Tunnels / Symbiosis) по два навыка на тир, у Gnaw, Digger и Kinship — 10 очков, у остальных — по 5. Ключевое отличие от других классов: у Druid почти нет прямых бонусов себе — он усиливает пета и конвертирует свой плоский урон в его урон (Kinship / Feral Bond, общий кап 75%).',
    skills: [
      // Lodge — боевой пет, здоровье, босс-урон (тиры и ранги — данные текущего билда)
      { id: 'd_gnaw', branch: 'Lodge', tier: 1, name: 'Gnaw', ru: 'Грызня', max: 10,
        perPoint: { petDmg: 8 }, text: '+{petDmg}% урона пета.' },
      { id: 'd_thickpelt', branch: 'Lodge', tier: 1, name: 'Thick Pelt', ru: 'Толстая шкура', max: 5,
        perPoint: { maxHpPct: 5 }, text: '+{maxHpPct}% макс. HP персонажа.' },
      { id: 'd_dambuilder', branch: 'Lodge', tier: 2, name: 'Dam Builder', ru: 'Строитель плотин', max: 5,
        perPoint: { petDmgFlat: 15 }, text: '+{petDmgFlat} к урону пета (плоское значение).' },
      { id: 'd_timberfall', branch: 'Lodge', tier: 2, name: 'Timberfall', ru: 'Валка леса', max: 5,
        perPoint: { boss: 5 }, cap: { boss: 100 },
        text: '+{boss}% урона по боссам (общий кап Boss Damage 100%).' },
      { id: 'd_tailslap', branch: 'Lodge', tier: 3, name: 'Tail Slap', ru: 'Удар хвостом', max: 5,
        perPoint: { petDoubleStrike: 3 }, cap: { petDoubleStrike: 60 },
        text: '{petDoubleStrike}% шанс, что пет ударит дважды. Кап 60%.' },
      { id: 'd_lodgekeeper', branch: 'Lodge', tier: 3, name: 'Lodgekeeper', ru: 'Хранитель ложи', max: 5,
        perPoint: { petMastery: 1 }, text: '+{petMastery} уровень Pet Mastery.' },

      // Tunnels — фарм: материалы, яйца, золото, руны и добивание
      { id: 'd_digger', branch: 'Tunnels', tier: 1, name: 'Digger', ru: 'Копатель', max: 10,
        perPoint: { mat: 2, itemDrop: 1 }, text: '+{mat}% материалов и +{itemDrop}% шанс дропа предметов.' },
      { id: 'd_keensnout', branch: 'Tunnels', tier: 1, name: 'Keen Snout', ru: 'Чуткий нос', max: 5,
        perPoint: { eggDrop: 1, mat: 1 }, cap: { eggDrop: 15 },
        text: '+{eggDrop}% шанс дропа Pet Egg (кап 15%) и +{mat}% материалов.' },
      { id: 'd_hoard', branch: 'Tunnels', tier: 2, name: 'Hoard', ru: 'Кладовая', max: 5,
        perPoint: { gold: 5 }, text: '+{gold}% золота.' },
      { id: 'd_earthbind', branch: 'Tunnels', tier: 2, name: 'Earthbind', ru: 'Оковы земли', max: 5,
        perPoint: { crit: 3 }, text: '+{crit}% шанс крита.' },
      { id: 'd_undermine', branch: 'Tunnels', tier: 3, name: 'Undermine', ru: 'Подкоп', max: 5,
        perPoint: { cull: 2 }, cap: { cull: 35 },
        text: 'Мгновенно убивает врага, когда у него остаётся {cull}% макс. HP. Общий кап порога добивания — 35%.' },
      { id: 'd_deeproots', branch: 'Tunnels', tier: 3, name: 'Deep Roots', ru: 'Глубокие корни', max: 5,
        perPoint: { petExp: 1, rune: 1 }, cap: { petExp: 15 },
        text: '+{petExp}% опыт пета (кап 15%) и +{rune}% шанс дропа рун.' },

      // Symbiosis — конвертация урона в пета, крит-урон, усиление слабости стихий
      { id: 'd_kinship', branch: 'Symbiosis', tier: 1, name: 'Kinship', ru: 'Родство', max: 10,
        perPoint: { flatToPet: 3 }, cap: { flatToPet: 75 },
        text: 'Превращает {flatToPet}% вашего плоского урона (Attack Damage) в урон пета. Общий кап с Feral Bond — 75%.' },
      { id: 'd_sharedinstinct', branch: 'Symbiosis', tier: 1, name: 'Shared Instinct', ru: 'Общий инстинкт', max: 5,
        perPoint: { critDmg: 10 }, text: '+{critDmg}% урона от крита.' },
      { id: 'd_feralbond', branch: 'Symbiosis', tier: 2, name: 'Feral Bond', ru: 'Связь с диким', max: 5,
        perPoint: { flatToPet: 4 }, cap: { flatToPet: 75 },
        text: 'Превращает {flatToPet}% плоского урона в урон пета — усиливает то же, что Kinship. Общий кап 75%.' },
      { id: 'd_twinheart', branch: 'Symbiosis', tier: 2, name: 'Twin Heart', ru: 'Двойное сердце', max: 5,
        perPoint: { loh: 2 }, text: '+{loh} HP за удар.' },
      { id: 'd_wildattunement', branch: 'Symbiosis', tier: 3, name: 'Wild Attunement', ru: 'Дикое созвучие', max: 5,
        perPoint: { elemWeak: 3 }, cap: { elemWeak: 25 },
        text: 'Усиливает бонус пета по слабости стихий на {elemWeak}% за очко. Кап 25%.' },
      { id: 'd_onesoul', branch: 'Symbiosis', tier: 3, name: 'One Soul', ru: 'Одна душа', max: 5,
        perPoint: { petDmg: 5 }, text: '+{petDmg}% урона пета.' },
    ],
  },
];

export const classById = (id) => CLASSES.find((c) => c.id === id);

/** Сколько классовых очков доступно на уровне персонажа. */
export function classPointsForLevel(level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  return 1 + Math.floor((lvl - 1) / 3);
}

/** Открыт ли навык при данном распределении (правила тиров официального сайта). */
export function isSkillUnlocked(skill, allocations) {
  if (skill.branch == null || skill.tier == null) return true; // без ветки/тира навык не блокируется гейтом
  if (skill.tier === 1) return true;
  const needed = CLASS_SKILL_RULES.tierUnlock[skill.tier];
  const spent = spentInBranch(skill.branch, allocations);
  if (spent < needed) return false;
  if (skill.requires) return (allocations[skill.requires] || 0) > 0;
  return true;
}

export function spentInBranch(branch, allocations) {
  let sum = 0;
  for (const c of CLASSES) {
    for (const s of c.skills) {
      if (s.branch === branch) sum += allocations[s.id] || 0;
    }
  }
  return sum;
}
