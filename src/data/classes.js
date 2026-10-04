/**
 * Классы IdleArc: ветки, классовые навыки, точные значения за очко и капы.
 *
 * Источники:
 *  - idlearc.com/classes (официальный сайт, правила очков и тиров)
 *  - idlearc.com/patch-notes/1-3-1 (официальные патч-ноты Season 2)
 *  - idlearc.fandom.com/wiki/{Warrior,Archer,Mage,Rogue,Druid}
 *
 * key действия (perPoint) — вклад ОДНОГО очка навыка:
 *  ad %, crit %, critDmg %, dh %, dd %, boss %, petDmg %, petMastery (flat),
 *  maxHp (flat), loh (flat), lok (flat), defense (flat/%), dr %, block %, dodge %,
 *  gold %, mat %, itemDrop %, eggDrop %, exp %, matDupe %, luckyTier %, ruby %, rune %,
 *  extraKill %, cull % (мгновенное убийство от % HP), trap % (урон от % HP в начале боя),
 *  vsHigh %, vsLow %, ddTriple % (шанс тройного урона), critDouble % (шанс x2 крит),
 *  echoTrigger %, echoDamage %, echoTwice %, dhBonusDmg %, petDoubleStrike %,
 *  magicBlastChance %, magicBlastDmg %, critExplode %, instakillNonBoss %
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
      // Might
      { id: 'w_culling', branch: 'Might', tier: 1, name: 'Culling Strike', ru: 'Добивающий удар', max: 5,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: 'Мгновенно убивает врага, когда у него остаётся {cull}% макс. HP. Кап 35%.' },
      { id: 'w_iron', branch: 'Might', tier: 1, name: 'Iron Constitution', ru: 'Железная конституция', max: 10,
        perPoint: { maxHp: 10, ad: 2 }, s2: 'В Season 2 также даёт Defense (патч-ноты 1.3.1).',
        text: '+{maxHp} макс. HP и +{ad}% атаки.' },
      { id: 'w_recovery', branch: 'Might', tier: 2, name: 'Battle Recovery', ru: 'Боевое восстановление', max: 5,
        perPoint: { lok: 8, dh: 1, dd: 1 }, s2: 'В Season 2 также даёт Defense (патч-ноты 1.3.1).',
        text: '+{lok} HP за убийство, +{dh}% Double Hit, +{dd}% Double Damage.' },
      { id: 'w_bloodthirst', branch: 'Might', tier: 2, name: 'Bloodthirst', ru: 'Кровожадность', max: 5,
        perPoint: { loh: 4, extraKill: 1 }, cap: { extraKill: 10 },
        text: '+{loh} HP за удар и +{extraKill}% шанс, что убийство засчитается дважды (Extra Kill). Кап Extra Kill 10%.' },
      { id: 'w_executioner', branch: 'Might', tier: 3, name: 'Executioner', ru: 'Палач', max: 5,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: '+{cull}% к порогу добивания, складывается с Culling Strike.' },
      { id: 'w_counterstrike', branch: 'Might', tier: 3, name: 'Counterstrike', ru: 'Контрудар', max: 5,
        unverified: true, s2: 'Season 2 заменил Victory Rush на Counterstrike, очки возвращены бесплатно.',
        text: 'Эффект в патч-нотах не расписан — уточняйте в игре (вероятно, Retaliation/контратака).' },

      // Strength
      { id: 'w_mighty', branch: 'Strength', tier: 1, name: 'Mighty Strikes', ru: 'Могучие удары', max: 10,
        perPoint: { ad: 5 }, text: '+{ad}% атаки.' },
      { id: 'w_focus', branch: 'Strength', tier: 1, name: 'Battle Focus', ru: 'Боевой фокус', max: 5,
        perPoint: { crit: 2 }, text: '+{crit}% шанс крита.' },
      { id: 'w_crushing', branch: 'Strength', tier: 2, name: 'Crushing Blows', ru: 'Сокрушающие удары', max: 5,
        perPoint: { critDmg: 8 }, s2: 'В Season 2 также даёт Defense (патч-ноты 1.3.1).',
        text: '+{critDmg}% урона от крита.' },
      { id: 'w_titans', branch: 'Strength', tier: 2, name: "Titan's Grip", ru: 'Хватка титана', max: 5,
        perPoint: { ad: 3 }, text: '+{ad}% атаки.' },
      { id: 'w_overwhelm', branch: 'Strength', tier: 3, name: 'Overwhelm', ru: 'Подавление', max: 5,
        perPoint: { dd: 2, boss: 5 }, text: '+{dd}% Double Damage и +{boss}% урона по боссам.' },
      { id: 'w_titanic', branch: 'Strength', tier: 3, name: 'Titanic Blow', ru: 'Титанический удар', max: 5,
        perPoint: { ddTriple: 4 }, cap: { ddTriple: 50 },
        text: '{ddTriple}% шанс, что удар станет Titanic Blow (тройной урон). Кап 50%.' },

      // Finesse
      { id: 'w_berserk', branch: 'Finesse', tier: 1, name: 'Berserk', ru: 'Берсерк', max: 10,
        perPoint: { dh: 2 }, text: '+{dh}% Double Hit.' },
      { id: 'w_spoils', branch: 'Finesse', tier: 1, name: 'Spoils of War', ru: 'Военные трофеи', max: 5,
        perPoint: { gold: 2, mat: 5 }, text: '+{gold}% золота и +{mat}% материалов.' },
      { id: 'w_keen', branch: 'Finesse', tier: 2, name: 'Keen Edge', ru: 'Острая кромка', max: 5,
        perPoint: { critDmg: 8 }, text: '+{critDmg}% урона от крита.' },
      { id: 'w_deflection', branch: 'Finesse', tier: 2, name: 'Deflection', ru: 'Отражение', max: 5,
        perPoint: { block: 2 }, text: '+{block}% шанс блока.' },
      { id: 'w_lethal', branch: 'Finesse', tier: 3, name: 'Lethal Blow', ru: 'Смертельный удар', max: 5,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'w_relentless', branch: 'Finesse', tier: 3, name: 'Relentless Assault', ru: 'Безжалостный натиск', max: 5,
        perPoint: { dhBonusDmg: 10 }, cap: { dhBonusDmg: 100 },
        text: 'Если сработал Double Hit, шанс {dhBonusDmg}% ударить ещё раз. Кап 100%.' },
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

      { id: 'a_spiketrap', branch: 'Hunting', tier: 1, name: 'Spike Trap', ru: 'Шипастая ловушка', max: 10,
        perPoint: { trap: 1.5 }, cap: { trap: 35 },
        text: 'В начале боя мгновенно наносит {trap}% макс. HP врага. Кап 35%.' },
      { id: 'a_barbed', branch: 'Hunting', tier: 1, name: 'Barbed Arrows', ru: 'Зазубренные стрелы', max: 5,
        perPoint: { loh: 2 }, text: '+{loh} HP за удар.' },
      { id: 'a_venomtrap', branch: 'Hunting', tier: 2, name: 'Venomous Trap', ru: 'Ядовитая ловушка', max: 5,
        perPoint: { ad: 3, dd: 1 }, text: '+{ad}% атаки и +{dd}% Double Damage.' },
      { id: 'a_trapmastery', branch: 'Hunting', tier: 2, name: 'Trap Mastery', ru: 'Мастерство ловушек', max: 5,
        perPoint: { trap: 1 }, cap: { trap: 35 },
        text: 'Ловушки наносят ещё {trap}% макс. HP врага в начале боя.' },
      { id: 'a_huntersmark', branch: 'Hunting', tier: 3, name: "Hunter's Mark", ru: 'Метка охотника', max: 5,
        perPoint: { vsLow: 3, boss: 5 },
        text: '+{vsLow}% урона по врагам ниже 50% HP и +{boss}% урона по боссам.' },
      { id: 'a_instinct', branch: 'Hunting', tier: 3, name: "Hunter's Instinct", ru: 'Инстинкт охотника', max: 5,
        perPoint: { instakillNonBoss: 1 }, cap: { instakillNonBoss: 5 },
        text: '{instakillNonBoss}% шанс, что ловушка опустит обычного монстра до 1 HP в начале боя.' },

      { id: 'a_beastbond', branch: 'Beastmaster', tier: 1, name: 'Beast Bond', ru: 'Связь со зверем', max: 5,
        perPoint: { petDmg: 12 }, text: '+{petDmg}% бонус к урону пета.' },
      { id: 'a_egghunter', branch: 'Beastmaster', tier: 1, name: 'Egg Hunter', ru: 'Охотник за яйцами', max: 5,
        perPoint: { eggDrop: 1 }, text: '+{eggDrop}% шанс дропа Pet Egg (единственный классовый источник яиц).' },
      { id: 'a_packleader', branch: 'Beastmaster', tier: 2, name: 'Pack Leader', ru: 'Вожак стаи', max: 5,
        perPoint: { petDmg: 8 }, text: '+{petDmg}% урона пета.' },
      { id: 'a_foraging', branch: 'Beastmaster', tier: 2, name: 'Foraging Companion', ru: 'Спутник-собиратель', max: 5,
        perPoint: { mat: 5 }, text: '+{mat}% материалов.' },
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
      { id: 'm_blast', branch: 'Arcane', tier: 1, name: 'Magic Blast', ru: 'Магический взрыв', max: 10,
        perPoint: { magicBlastDmg: 3 }, cap: { magicBlastDmg: 100 }, base: { magicBlastChance: 50 },
        text: '50% шанс, что удар нанесёт ещё +{magicBlastDmg}% урона. Кап +100%.' },
      { id: 'm_siphon', branch: 'Arcane', tier: 1, name: 'Arcane Siphon', ru: 'Тайный сифон', max: 5,
        perPoint: { loh: 2, dd: 1 }, text: '+{loh} HP за удар и +{dd}% Double Damage.' },
      { id: 'm_surge', branch: 'Arcane', tier: 2, name: 'Arcane Surge', ru: 'Тайный всплеск', max: 5,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'm_unstable', branch: 'Arcane', tier: 2, name: 'Unstable Energy', ru: 'Нестабильная энергия', max: 5,
        perPoint: { magicBlastChance: 5 }, cap: { magicBlastChance: 100 },
        text: '+{magicBlastChance}% к шансу срабатывания Magic Blast.' },
      { id: 'm_spellmastery', branch: 'Arcane', tier: 3, name: 'Spell Mastery', ru: 'Мастерство заклинаний', max: 5,
        perPoint: { ad: 3 }, text: '+{ad}% атаки.' },
      { id: 'm_cascade', branch: 'Arcane', tier: 3, name: 'Arcane Cascade', ru: 'Тайный каскад', max: 5,
        perPoint: { ddTriple: 8 }, cap: { ddTriple: 100 },
        text: '{ddTriple}% шанс, что Double Damage превратится в тройной урон. Кап 100%.' },

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

      { id: 'm_wild', branch: 'Chaos', tier: 1, name: 'Wild Magic', ru: 'Дикая магия', max: 10,
        perPoint: { crit: 2, critDmg: 1 }, text: '+{crit}% шанс крита и +{critDmg}% урона от крита.' },
      { id: 'm_fortune', branch: 'Chaos', tier: 1, name: "Fortune's Favor", ru: 'Благосклонность фортуны', max: 5,
        perPoint: { gold: 4, mat: 5 }, text: '+{gold}% золота и +{mat}% материалов.' },
      { id: 'm_chaosbolt', branch: 'Chaos', tier: 2, name: 'Chaos Bolt', ru: 'Снаряд хаоса', max: 5,
        perPoint: { critDmg: 10 }, text: '+{critDmg}% урона от крита.' },
      { id: 'm_soulharvest', branch: 'Chaos', tier: 2, name: 'Soul Harvest', ru: 'Жатва душ', max: 5,
        perPoint: { lok: 4, ruby: 2, rune: 1 }, text: '+{lok} HP за убийство, +{ruby}% рубинов, +{rune}% рун.' },
      { id: 'm_reality', branch: 'Chaos', tier: 3, name: 'Reality Warp', ru: 'Искажение реальности', max: 5,
        perPoint: { dh: 2, boss: 5 }, text: '+{dh}% Double Hit и +{boss}% урона по боссам.' },
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
      { id: 'r_precision', branch: 'Assassin', tier: 1, name: 'Precision Strikes', ru: 'Точные удары', max: 5,
        perPoint: { crit: 4 }, s2: 'В 1.3.1 слегка уменьшено.', text: '+{crit}% шанс крита.' },
      { id: 'r_sharpened', branch: 'Assassin', tier: 1, name: 'Sharpened Blades', ru: 'Заточенные клинки', max: 5,
        perPoint: { critDmg: 6 }, s2: 'В 1.3.1 слегка уменьшено.', text: '+{critDmg}% урона от крита.' },
      { id: 'r_firststrike', branch: 'Assassin', tier: 2, name: 'First Strike', ru: 'Первый удар', max: 5,
        perPoint: { vsHigh: 4 }, text: '+{vsHigh}% урона по врагам выше 50% HP.' },
      { id: 'r_contract', branch: 'Assassin', tier: 2, name: 'Contract Killer', ru: 'Нанятый убийца', max: 5,
        perPoint: { boss: 5 }, text: '+{boss}% урона по боссам.' },
      { id: 'r_ambush', branch: 'Assassin', tier: 3, name: 'Deadly Ambush', ru: 'Смертельная засада', max: 5,
        perPoint: { dd: 4 }, text: '+{dd}% Double Damage.' },
      { id: 'r_coup', branch: 'Assassin', tier: 3, name: 'Coup de Grâce', ru: 'Удар милосердия', max: 10,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: 'Мгновенно убивает врага при {cull}% макс. HP. Кап 35%.' },

      { id: 'r_swift', branch: 'Shadow-walker', tier: 1, name: 'Swift Blades', ru: 'Быстрые клинки', max: 5,
        perPoint: { dh: 4 }, s2: 'В 1.3.1 слегка уменьшено.', text: '+{dh}% Double Hit.' },
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

      { id: 'r_scavenger', branch: 'Thief', tier: 1, name: 'Scavenger', ru: 'Падальщик', max: 5,
        perPoint: { gold: 5, mat: 2 }, text: '+{gold}% золота и +{mat}% материалов.' },
      { id: 'r_pickpocket', branch: 'Thief', tier: 1, name: 'Pickpocket', ru: 'Карманник', max: 5,
        perPoint: { gold: 8 }, text: '+{gold}% золота.' },
      { id: 'r_luckyhands', branch: 'Thief', tier: 2, name: 'Lucky Hands', ru: 'Счастливые руки', max: 5,
        perPoint: { matDupe: 2 }, cap: { matDupe: 20 },
        text: '{matDupe}% шанс удвоить дроп материала. Кап 20%.' },
      { id: 'r_treasure', branch: 'Thief', tier: 2, name: 'Treasure Hunter', ru: 'Охотник за сокровищами', max: 5,
        perPoint: { itemDrop: 2 }, text: '+{itemDrop}% шанс дропа предметов.' },
      { id: 'r_blackmarket', branch: 'Thief', tier: 3, name: 'Black Market', ru: 'Чёрный рынок', max: 5,
        perPoint: { luckyTier: 2 }, text: '+{luckyTier}% шанс, что выпадет предмет более высокого тира (Lucky Tier).' },
      { id: 'r_masterthief', branch: 'Thief', tier: 3, name: 'Master Thief', ru: 'Мастер-вор', max: 5,
        perPoint: { gold: 3, mat: 3, itemDrop: 2 }, text: '+{gold}% золота, +{mat}% материалов, +{itemDrop}% дропа предметов.' },
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
    caveat: 'Точные эффекты и принадлежность навыков к ветками официально не опубликованы в текстовом виде (описания только в игре). Ниже — 18 названий из wiki; проценты требуют проверки в игре.',
    skills: [
      { id: 'd_dambuilder', branch: null, tier: null, name: 'Dam Builder', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_deeproots', branch: null, tier: null, name: 'Deep Roots', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_digger', branch: null, tier: null, name: 'Digger', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_earthbind', branch: null, tier: null, name: 'Earthbind', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_feralbond', branch: null, tier: null, name: 'Feral Bond', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_gnaw', branch: null, tier: null, name: 'Gnaw', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_hoard', branch: null, tier: null, name: 'Hoard', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_keensnout', branch: null, tier: null, name: 'Keen Snout', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_kinship', branch: null, tier: null, name: 'Kinship', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_lodgekeeper', branch: null, tier: null, name: 'Lodgekeeper', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_onesoul', branch: null, tier: null, name: 'One Soul', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_sharedinstinct', branch: null, tier: null, name: 'Shared Instinct', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_tailslap', branch: null, tier: null, name: 'Tail Slap', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_thickpelt', branch: null, tier: null, name: 'Thick Pelt', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_timberfall', branch: null, tier: null, name: 'Timberfall', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_twinheart', branch: null, tier: null, name: 'Twin Heart', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_undermine', branch: null, tier: null, name: 'Undermine', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
      { id: 'd_wildattunement', branch: null, tier: null, name: 'Wild Attunement', ru: '—', max: 10, unverified: true, text: 'Эффект не подтверждён внешними источниками.' },
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
  if (skill.branch == null || skill.tier == null) return true; // данные Druid не подтверждены — не блокируем
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
