import { t } from '../i18n.js';

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
  note: t('Первый классовый скилл-поинт на 1 уровне, далее +1 каждые 3 уровня персонажа.', 'Gain your first class skill point at level 1 and one more every 3 character levels.'),
};

export const CLASSES = [
  {
    id: 'warrior',
    name: 'Warrior',
    ru: t('Воин', 'Warrior'),
    role: t('Ближний бой, щит, тяжёлые удары, выживаемость, Retaliation', 'Melee combat, shields, heavy hits, survivability and Retaliation'),
    desc: 'Master of melee combat with shields.',
    starter: 'Broken Sword',
    mainStat: 'strength',
    offhand: 'Shield (Block Chance)',
    weapons: [t('Sword + Shield (одноручное + оффхенд)', 'Sword + Shield (one-handed weapon and offhand)'), t('Greatsword (двуручное, с ML 25)', 'Greatsword (two-handed, from ML 25)')],
    branches: ['Might', 'Strength', 'Finesse'],
    branchRu: { Might: t('Мощь', 'Might'), Strength: t('Сила', 'Strength'), Finesse: t('Мастерство', 'Finesse') },
    bestFor: [t('Новички', 'Beginners'), t('Защитные и Retaliation-билды', 'Defensive and Retaliation builds'), t('Прогресс, когда не хватает выживаемости', 'Progression when survival is the bottleneck')],
    skills: [
      // Might — выживание, добивание, Extra Kill. В 1.3.1 Iron Constitution / Battle Recovery /
      // Crushing Blows переведены на Defense, а Victory Rush заменён на Counterstrike.
      { id: 'w_culling', branch: 'Might', tier: 1, name: 'Culling Strike', ru: t('Добивающий удар', 'Culling Strike'), max: 5,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: t('Мгновенно убивает врага, когда у него остаётся {cull}% макс. HP. Общий кап порога добивания (вместе с Executioner) — 35%.', 'Instantly kills an enemy at {cull}% of its max HP. The combined threshold with Executioner caps at 35%.') },
      { id: 'w_iron', branch: 'Might', tier: 1, name: 'Iron Constitution', ru: t('Железная конституция', 'Iron Constitution'), max: 10,
        perPoint: { defense: 2 },
        text: '+{defense}% Defense.' },
      { id: 'w_recovery', branch: 'Might', tier: 2, name: 'Battle Recovery', ru: t('Боевое восстановление', 'Battle Recovery'), max: 5,
        perPoint: { defFlat: 50, lok: 8 },
        text: t('+{defFlat} Defense (плоское значение) и +{lok} HP за убийство.', '+{defFlat} flat Defense and +{lok} Life on Kill.') },
      { id: 'w_bloodthirst', branch: 'Might', tier: 2, name: 'Bloodthirst', ru: t('Кровожадность', 'Bloodthirst'), max: 5,
        perPoint: { loh: 4, extraKill: 1 }, cap: { extraKill: 10 },
        text: t('+{loh} HP за удар и +{extraKill}% шанс, что убийство засчитается дважды (Extra Kill). Кап 10%.', '+{loh} Life on Hit and a +{extraKill}% chance for a kill to count twice (Extra Kill). Chance caps at 10%.') },
      { id: 'w_executioner', branch: 'Might', tier: 3, name: 'Executioner', ru: t('Палач', 'Executioner'), max: 5,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: t('+{cull}% к порогу добивания, складывается с Culling Strike. Общий кап 35%.', 'Raises the execution threshold by {cull}%. Stacks with Culling Strike up to a combined 35%.') },
      { id: 'w_counterstrike', branch: 'Might', tier: 3, name: 'Counterstrike', ru: t('Контрудар', 'Counterstrike'), max: 5,
        perPoint: { retal: 2 }, cap: { retal: 25 },
        s2: t('В 1.3.1 Counterstrike заменил Victory Rush (патч-ноты 1.3.1), очки за старый навык вернули бесплатно.', 'Patch 1.3.1 replaced Victory Rush with Counterstrike and refunded the points spent on the old skill.'),
        text: t('Заблокированные удары врага получают ответ на +{retal}% сильнее (Retaliation). Кап 25%.', 'Blocking increases Retaliation damage by a further {retal}%, capped at 25%.') },

      // Strength — урон, криты, Double Damage, урон по боссам
      { id: 'w_mighty', branch: 'Strength', tier: 1, name: 'Mighty Strikes', ru: t('Могучие удары', 'Mighty Strikes'), max: 10,
        perPoint: { ad: 5 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'w_focus', branch: 'Strength', tier: 1, name: 'Battle Focus', ru: t('Боевой фокус', 'Battle Focus'), max: 5,
        perPoint: { crit: 2 }, text: t('+{crit}% шанс крита.', '+{crit}% Critical Strike Chance.') },
      { id: 'w_crushing', branch: 'Strength', tier: 2, name: 'Crushing Blows', ru: t('Сокрушающие удары', 'Crushing Blows'), max: 5,
        perPoint: { critDmg: 3, defense: 2 },
        text: t('+{critDmg}% урона от крита и +{defense}% Defense.', '+{critDmg}% Critical Damage and +{defense}% Defense.') },
      { id: 'w_titans', branch: 'Strength', tier: 2, name: "Titan's Grip", ru: t('Хватка титана', "Titan's Grip"), max: 5,
        perPoint: { ad: 3 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'w_overwhelm', branch: 'Strength', tier: 3, name: 'Overwhelm', ru: t('Подавление', 'Overwhelm'), max: 5,
        perPoint: { dd: 2, boss: 5 }, cap: { boss: 100 },
        text: t('+{dd}% Double Damage и +{boss}% урона по боссам. Общий кап Boss Damage — 100%.', '+{dd}% Double Damage and +{boss}% Boss Damage. Total Boss Damage caps at 100%.') },
      { id: 'w_titanic', branch: 'Strength', tier: 3, name: 'Titanic Blow', ru: t('Титанический удар', 'Titanic Blow'), max: 5,
        perPoint: { ddTriple: 4 }, cap: { ddTriple: 80 },
        text: t('{ddTriple}% шанс, что удар станет Titanic Blow (тройной урон). Кап 80%.', 'A {ddTriple}% chance to land a Titanic Blow for triple damage. Chance caps at 80%.') },

      // Finesse — Double Hit, блок и Retaliation, фарм-бонусы
      { id: 'w_berserk', branch: 'Finesse', tier: 1, name: 'Berserk', ru: t('Берсерк', 'Berserk'), max: 10,
        perPoint: { dh: 2 }, text: '+{dh}% Double Hit.' },
      { id: 'w_spoils', branch: 'Finesse', tier: 1, name: 'Spoils of War', ru: t('Военные трофеи', 'Spoils of War'), max: 5,
        perPoint: { gold: 5, mat: 5, itemDrop: 2 },
        s2: t('В 1.3.1 фарм-навыки классов выровнены: Warrior получает и шанс дропа предметов.', 'Patch 1.3.1 brought class farming skills closer together. Warriors now gain Item Drop Chance too.'),
        text: t('+{gold}% золота, +{mat}% материалов и +{itemDrop}% шанс дропа предметов.', '+{gold}% Gold Gain, +{mat}% Material Drops and +{itemDrop}% Item Drop Chance.') },
      { id: 'w_keen', branch: 'Finesse', tier: 2, name: 'Keen Edge', ru: t('Острая кромка', 'Keen Edge'), max: 5,
        perPoint: { critDmg: 8 }, text: t('+{critDmg}% урона от крита.', '+{critDmg}% Critical Damage.') },
      { id: 'w_deflection', branch: 'Finesse', tier: 2, name: 'Deflection', ru: t('Отражение', 'Deflection'), max: 5,
        perPoint: { block: 2, retal: 4 }, cap: { block: 25, retal: 40 },
        text: t('+{block}% шанс блока (кап 25%) и +{retal}% Retaliation (кап 40%).', '+{block}% Block Chance (cap 25%) and +{retal}% Retaliation (cap 40%).') },
      { id: 'w_lethal', branch: 'Finesse', tier: 3, name: 'Lethal Blow', ru: t('Смертельный удар', 'Lethal Blow'), max: 5,
        perPoint: { dd: 2, ruby: 2 },
        text: t('+{dd}% Double Damage и +{ruby}% шанс дропа рубинов.', '+{dd}% Double Damage and +{ruby}% Ruby Drop Chance.') },
      { id: 'w_relentless', branch: 'Finesse', tier: 3, name: 'Relentless Assault', ru: t('Безжалостный натиск', 'Relentless Assault'), max: 5,
        perPoint: { extraStrike: 10 }, cap: { extraStrike: 100 },
        text: t('Если сработал Double Hit, шанс {extraStrike}% ударить ещё раз. Кап 100%.', 'When Double Hit triggers, gain a {extraStrike}% chance to strike again. Chance caps at 100%.') },
    ],
  },

  {
    id: 'archer',
    name: 'Archer',
    ru: t('Лучник', 'Archer'),
    role: t('Дальний бой, ловушки, криты, пет-билды', 'Ranged attacks, traps, critical hits and pet builds'),
    desc: 'Ranged fighter with Pet Mastery.',
    starter: 'Wooden Bow',
    mainStat: 'dexterity',
    offhand: 'Quiver (Pet Mastery)',
    weapons: [t('Bow + Quiver (одноручное + оффхенд)', 'Bow + Quiver (one-handed weapon and offhand)'), t('Crossbow (двуручное, ML 25+, встроенный крит 25→50%)', 'Crossbow (two-handed, ML 25+, built-in crit chance rises from 25% to 50%)')],
    branches: ['Marksmanship', 'Hunting', 'Beastmaster'],
    branchRu: { Marksmanship: t('Стрельба', 'Marksmanship'), Hunting: t('Охота', 'Hunting'), Beastmaster: t('Повелитель зверей', 'Beastmaster') },
    bestFor: [t('Пет-билды (Pet Damage)', 'Pet Damage builds'), t('Фарм яиц (Pet Eggs)', 'Farming Pet Eggs'), t('Криты и шикарный одно-таргет урон', 'Critical hits and high single-target damage')],
    skills: [
      // Marksmanship — базовый урон, криты, Double Damage
      { id: 'a_archery', branch: 'Marksmanship', tier: 1, name: 'Archery', ru: t('Стрельба из лука', 'Archery'), max: 10,
        perPoint: { ad: 5 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'a_steady', branch: 'Marksmanship', tier: 1, name: 'Steady Aim', ru: t('Твёрдый прицел', 'Steady Aim'), max: 10,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'a_precision', branch: 'Marksmanship', tier: 2, name: 'Precision', ru: t('Точность', 'Precision'), max: 5,
        perPoint: { crit: 4 }, text: t('+{crit}% шанс крита.', '+{crit}% Critical Strike Chance.') },
      { id: 'a_doublenock', branch: 'Marksmanship', tier: 2, name: 'Double Nock', ru: t('Двойной натяг', 'Double Nock'), max: 5,
        perPoint: { dh: 2 }, text: '+{dh}% Double Hit.' },
      { id: 'a_headshot', branch: 'Marksmanship', tier: 3, name: 'Headshot', ru: t('Выстрел в голову', 'Headshot'), max: 5,
        perPoint: { critDmg: 10 }, text: t('+{critDmg}% урона от крита.', '+{critDmg}% Critical Damage.') },
      { id: 'a_perfect', branch: 'Marksmanship', tier: 3, name: 'Perfect Shot', ru: t('Идеальный выстрел', 'Perfect Shot'), max: 5,
        perPoint: { critDouble: 4 }, cap: { critDouble: 60 },
        text: t('{critDouble}% шанс, что крит нанесёт двойной крит-урон. Кап 60%.', 'A {critDouble}% chance for a critical hit to deal double critical damage. Chance caps at 60%.') },

      // Hunting — ловушки, добивание обычных монстров, босс-урон
      { id: 'a_spiketrap', branch: 'Hunting', tier: 1, name: 'Spike Trap', ru: t('Шипастая ловушка', 'Spike Trap'), max: 10,
        perPoint: { trap: 1.5 }, cap: { trap: 35 },
        text: t('В начале боя мгновенно наносит {trap}% макс. HP врага. Общий кап урона ловушек — 35%.', 'At the start of combat, deals damage equal to {trap}% of the enemy’s max HP. Total trap damage caps at 35%.') },
      { id: 'a_barbed', branch: 'Hunting', tier: 1, name: 'Barbed Arrows', ru: t('Зазубренные стрелы', 'Barbed Arrows'), max: 5,
        perPoint: { loh: 2 }, text: t('+{loh} HP за удар.', '+{loh} Life on Hit.') },
      { id: 'a_venomtrap', branch: 'Hunting', tier: 2, name: 'Venomous Trap', ru: t('Ядовитая ловушка', 'Venomous Trap'), max: 5,
        perPoint: { ad: 3, dd: 1 }, text: t('+{ad}% атаки и +{dd}% Double Damage.', '+{ad}% Attack Damage and +{dd}% Double Damage.') },
      { id: 'a_trapmastery', branch: 'Hunting', tier: 2, name: 'Trap Mastery', ru: t('Мастерство ловушек', 'Trap Mastery'), max: 5,
        perPoint: { trap: 1 }, cap: { trap: 35 },
        text: t('Ловушки наносят ещё {trap}% макс. HP врага в начале боя (общий кап 35%).', 'Traps deal an extra {trap}% of the enemy’s max HP at the start of combat, up to a combined 35%.') },
      { id: 'a_huntersmark', branch: 'Hunting', tier: 3, name: "Hunter's Mark", ru: t('Метка охотника', "Hunter's Mark"), max: 5,
        perPoint: { vsLow: 3, boss: 5 }, cap: { boss: 100 },
        text: t('+{vsLow}% урона по врагам ниже 50% HP и +{boss}% урона по боссам (общий кап Boss Damage 100%).', '+{vsLow}% damage against enemies below 50% HP and +{boss}% Boss Damage (total Boss Damage cap 100%).') },
      { id: 'a_instinct', branch: 'Hunting', tier: 3, name: "Hunter's Instinct", ru: t('Инстинкт охотника', "Hunter's Instinct"), max: 5,
        perPoint: { instakillNonBoss: 1 }, cap: { instakillNonBoss: 15 },
        text: t('{instakillNonBoss}% шанс, что ловушка опустит обычного монстра до 1 HP в начале боя. Кап 15% (достигается с +All Class Skills).', 'A {instakillNonBoss}% chance for a trap to reduce a regular monster to 1 HP at the start of combat. Chance caps at 15%, reachable with +All Class Skills.') },

      // Beastmaster — пет, яйца, фарм
      { id: 'a_beastbond', branch: 'Beastmaster', tier: 1, name: 'Beast Bond', ru: t('Связь со зверем', 'Beast Bond'), max: 5,
        perPoint: { petDmg: 12 }, text: t('+{petDmg}% бонус к урону пета.', '+{petDmg}% bonus to Pet Damage.') },
      { id: 'a_egghunter', branch: 'Beastmaster', tier: 1, name: 'Egg Hunter', ru: t('Охотник за яйцами', 'Egg Hunter'), max: 5,
        perPoint: { eggDrop: 1, itemDrop: 2 }, cap: { eggDrop: 15 },
        text: t('+{eggDrop}% шанс дропа Pet Egg (кап 15%) и +{itemDrop}% шанс дропа предметов.', '+{eggDrop}% Pet Egg Drop Chance (cap 15%) and +{itemDrop}% Item Drop Chance.') },
      { id: 'a_packleader', branch: 'Beastmaster', tier: 2, name: 'Pack Leader', ru: t('Вожак стаи', 'Pack Leader'), max: 5,
        perPoint: { petDmg: 8 }, text: t('+{petDmg}% урона пета.', '+{petDmg}% Pet Damage.') },
      { id: 'a_foraging', branch: 'Beastmaster', tier: 2, name: 'Foraging Companion', ru: t('Спутник-собиратель', 'Foraging Companion'), max: 5,
        perPoint: { gold: 5, mat: 5 }, text: t('+{gold}% золота и +{mat}% материалов.', '+{gold}% Gold Gain and +{mat}% Material Drops.') },
      { id: 'a_strongpet', branch: 'Beastmaster', tier: 3, name: 'Strong Pet Bound', ru: t('Крепкая связь', 'Strong Pet Bound'), max: 5,
        perPoint: { petMastery: 1 }, text: t('+{petMastery} уровень Pet Mastery.', '+{petMastery} Pet Mastery levels.') },
      { id: 'a_alpha', branch: 'Beastmaster', tier: 3, name: 'Alpha Strike', ru: t('Удар альфы', 'Alpha Strike'), max: 5,
        perPoint: { petDoubleStrike: 3 }, cap: { petDoubleStrike: 60 },
        text: t('{petDoubleStrike}% шанс, что пет ударит дважды. Кап 60%.', 'A {petDoubleStrike}% chance for your pet to strike twice. Chance caps at 60%.') },
    ],
  },

  {
    id: 'mage',
    name: 'Mage',
    ru: t('Маг', 'Mage'),
    role: t('Магический урон, криты, Double Damage, бурст по боссу', 'Magic damage, critical hits, Double Damage and burst damage against bosses'),
    desc: 'Wielder of arcane magic.',
    starter: 'Wooden Rod',
    mainStat: 'intelligence',
    offhand: 'Old Book (Critical Damage)',
    weapons: [t('Wand + Book (одноручное + оффхенд)', 'Wand + Book (one-handed weapon and offhand)'), t('Grand Staff (двуручное, ML 25+, встроенный Intelligence)', 'Grand Staff (two-handed, ML 25+, built-in Intelligence)')],
    branches: ['Arcane', 'Destruction', 'Chaos'],
    branchRu: { Arcane: t('Тайная магия', 'Arcane'), Destruction: t('Разрушение', 'Destruction'), Chaos: t('Хаос', 'Chaos') },
    bestFor: [t('Максимальный урон по боссам', 'Maximum boss damage'), t('Крит-скалирование в мид/лейте', 'Critical damage scaling in the mid and late game'), t('Требует больше экипировки до раскрытия', 'Players willing to invest in gear before the class reaches full strength')],
    caveat: t('У Mage нет классовых навыков «мгновенного убийства»/срезания HP врага — ему тяжелее в обычном фарме монстров. Wiki-гайд Season 2 советует брать мага осторожно на старте.', 'Mages have no class skills that instantly kill enemies or remove a share of their HP. This slows regular monster farming. The Season 2 wiki guide advises caution when starting as a Mage.'),
    skills: [
      // Arcane — Magic Blast, Double Damage, тройной урон
      { id: 'm_blast', branch: 'Arcane', tier: 1, name: 'Magic Blast', ru: t('Магический взрыв', 'Magic Blast'), max: 10,
        perPoint: { magicBlastDmg: 3 }, base: { magicBlastChance: 50 },
        text: t('50% шанс, что удар нанесёт ещё +{magicBlastDmg}% урона.', 'Each hit has a 50% chance to deal an extra {magicBlastDmg}% damage.') },
      { id: 'm_siphon', branch: 'Arcane', tier: 1, name: 'Arcane Siphon', ru: t('Тайный сифон', 'Arcane Siphon'), max: 5,
        perPoint: { loh: 2, dd: 1 }, text: t('+{loh} HP за удар и +{dd}% Double Damage.', '+{loh} Life on Hit and +{dd}% Double Damage.') },
      { id: 'm_surge', branch: 'Arcane', tier: 2, name: 'Arcane Surge', ru: t('Тайный всплеск', 'Arcane Surge'), max: 5,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'm_unstable', branch: 'Arcane', tier: 2, name: 'Unstable Energy', ru: t('Нестабильная энергия', 'Unstable Energy'), max: 5,
        requires: 'm_blast', perPoint: { magicBlastChance: 5 }, cap: { magicBlastChance: 100 },
        text: t('Требует Magic Blast. +{magicBlastChance}% к шансу его срабатывания (база 50%, кап 100%).', 'Requires Magic Blast. Adds {magicBlastChance}% to its trigger chance (50% base, 100% cap).') },
      { id: 'm_spellmastery', branch: 'Arcane', tier: 3, name: 'Spell Mastery', ru: t('Мастерство заклинаний', 'Spell Mastery'), max: 5,
        perPoint: { ad: 3 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'm_cascade', branch: 'Arcane', tier: 3, name: 'Arcane Cascade', ru: t('Тайный каскад', 'Arcane Cascade'), max: 5,
        perPoint: { ddTriple: 8 }, cap: { ddTriple: 100 },
        text: t('{ddTriple}% шанс, что Double Damage превратится в тройной урон. Кап 100%.', 'A {ddTriple}% chance for Double Damage to deal triple damage. Chance caps at 100%.') },

      // Destruction — криты, огонь, урон по одной цели
      { id: 'm_fire', branch: 'Destruction', tier: 1, name: 'Fire Infusion', ru: t('Огненная инфузия', 'Fire Infusion'), max: 10,
        perPoint: { ad: 5 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'm_combustion', branch: 'Destruction', tier: 1, name: 'Combustion', ru: t('Возгорание', 'Combustion'), max: 5,
        perPoint: { dd: 2 }, text: '+{dd}% Double Damage.' },
      { id: 'm_burningsoul', branch: 'Destruction', tier: 2, name: 'Burning Soul', ru: t('Горящая душа', 'Burning Soul'), max: 5,
        perPoint: { critDmg: 8 }, text: t('+{critDmg}% урона от крита.', '+{critDmg}% Critical Damage.') },
      { id: 'm_melting', branch: 'Destruction', tier: 2, name: 'Melting Point', ru: t('Точка плавления', 'Melting Point'), max: 5,
        perPoint: { crit: 2 }, text: t('+{crit}% шанс крита.', '+{crit}% Critical Strike Chance.') },
      { id: 'm_inferno', branch: 'Destruction', tier: 3, name: 'Inferno', ru: t('Инферно', 'Inferno'), max: 5,
        perPoint: { ad: 2 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'm_pyroclasm', branch: 'Destruction', tier: 3, name: 'Pyroclasm', ru: t('Пироклазм', 'Pyroclasm'), max: 5,
        perPoint: { critExplode: 5 }, cap: { critExplode: 100 },
        text: t('Криты взрываются, нанося +{critExplode}% урона. Кап 100%.', 'Critical hits explode for +{critExplode}% damage, capped at 100%.') },

      // Chaos — крит-шанс и крит-урон, фарм, гибрид
      { id: 'm_wild', branch: 'Chaos', tier: 1, name: 'Wild Magic', ru: t('Дикая магия', 'Wild Magic'), max: 10,
        perPoint: { crit: 2, critDmg: 1 }, text: t('+{crit}% шанс крита и +{critDmg}% урона от крита.', '+{crit}% Critical Strike Chance and +{critDmg}% Critical Damage.') },
      { id: 'm_fortune', branch: 'Chaos', tier: 1, name: "Fortune's Favor", ru: t('Благосклонность фортуны', "Fortune's Favor"), max: 5,
        perPoint: { gold: 5, mat: 5 }, text: t('+{gold}% золота и +{mat}% материалов.', '+{gold}% Gold Gain and +{mat}% Material Drops.') },
      { id: 'm_chaosbolt', branch: 'Chaos', tier: 2, name: 'Chaos Bolt', ru: t('Снаряд хаоса', 'Chaos Bolt'), max: 5,
        perPoint: { critDmg: 10 }, text: t('+{critDmg}% урона от крита.', '+{critDmg}% Critical Damage.') },
      { id: 'm_soulharvest', branch: 'Chaos', tier: 2, name: 'Soul Harvest', ru: t('Жатва душ', 'Soul Harvest'), max: 5,
        perPoint: { lok: 4, ruby: 3, rune: 1 }, text: t('+{lok} HP за убийство, +{ruby}% рубинов, +{rune}% рун.', '+{lok} Life on Kill, +{ruby}% rubies and +{rune}% runes.') },
      { id: 'm_reality', branch: 'Chaos', tier: 3, name: 'Reality Warp', ru: t('Искажение реальности', 'Reality Warp'), max: 5,
        perPoint: { dh: 2, boss: 5 }, cap: { boss: 100 },
        text: t('+{dh}% Double Hit и +{boss}% урона по боссам (общий кап Boss Damage 100%).', '+{dh}% Double Hit and +{boss}% Boss Damage (total Boss Damage cap 100%).') },
      { id: 'm_incarnate', branch: 'Chaos', tier: 3, name: 'Chaos Incarnate', ru: t('Воплощение хаоса', 'Chaos Incarnate'), max: 5,
        perPoint: { crit: 2, dh: 2, dd: 2 }, text: t('+{crit}% крит, +{dh}% Double Hit, +{dd}% Double Damage.', '+{crit}% Critical Strike Chance, +{dh}% Double Hit and +{dd}% Double Damage.') },
    ],
  },

  {
    id: 'rogue',
    name: 'Rogue',
    ru: t('Разбойник', 'Rogue'),
    role: t('Два оружия, криты, Double Hit, Shadow Echo, фарм', 'Dual wielding, critical hits, Double Hit, Shadow Echo and farming'),
    desc: 'Dual-wielding assassin who strikes with twin daggers.',
    starter: 'Rusty Dagger',
    mainStat: 'dexterity',
    offhand: t('Второе оружие (только Rogue носит 2 оружия)', 'Second weapon (only Rogues can dual wield)'),
    weapons: [t('2 × Dagger (каждый даёт +50% Double Hit Chance)', '2 × Dagger (each grants +50% Double Hit Chance)'), t('2 × Claws (ML 25+, каждая даёт крит-шанс 50→100%)', '2 × Claws (ML 25+, each grants 50–100% critical strike chance)')],
    branches: ['Assassin', 'Shadow-walker', 'Thief'],
    branchRu: { Assassin: t('Ассасин', 'Assassin'), 'Shadow-walker': t('Тенеход', 'Shadow-walker'), Thief: t('Вор', 'Thief') },
    bestFor: [t('Фарм и скорость прогресса (лучший «общий» класс S2)', 'Farming and fast progression (the best all-around class in Season 2)'), t('Double Hit / крит-билды', 'Double Hit and critical strike builds'), t('Голд и материалы', 'Gold and materials')],
    skills: [
      // Assassin — криты, добивание, урон по боссам (в 1.3.1 крит-навыки слегка ослаблены)
      { id: 'r_precision', branch: 'Assassin', tier: 1, name: 'Precision Strikes', ru: t('Точные удары', 'Precision Strikes'), max: 5,
        perPoint: { crit: 3 }, s2: t('В 1.3.1 снижено до 3% за очко.', 'Reduced to 3% per point in 1.3.1.'), text: t('+{crit}% шанс крита.', '+{crit}% Critical Strike Chance.') },
      { id: 'r_sharpened', branch: 'Assassin', tier: 1, name: 'Sharpened Blades', ru: t('Заточенные клинки', 'Sharpened Blades'), max: 5,
        perPoint: { critDmg: 5 }, s2: t('В 1.3.1 снижено до 5% за очко.', 'Reduced to 5% per point in 1.3.1.'), text: t('+{critDmg}% урона от крита.', '+{critDmg}% Critical Damage.') },
      { id: 'r_firststrike', branch: 'Assassin', tier: 2, name: 'First Strike', ru: t('Первый удар', 'First Strike'), max: 5,
        perPoint: { vsHigh: 4 }, text: t('+{vsHigh}% урона по врагам выше 50% HP.', '+{vsHigh}% damage against enemies above 50% HP.') },
      { id: 'r_contract', branch: 'Assassin', tier: 2, name: 'Contract Killer', ru: t('Нанятый убийца', 'Contract Killer'), max: 5,
        perPoint: { boss: 5 }, cap: { boss: 100 }, text: t('+{boss}% урона по боссам (общий кап 100%).', '+{boss}% Boss Damage (total cap 100%).') },
      { id: 'r_ambush', branch: 'Assassin', tier: 3, name: 'Deadly Ambush', ru: t('Смертельная засада', 'Deadly Ambush'), max: 5,
        perPoint: { dd: 4 }, text: '+{dd}% Double Damage.' },
      { id: 'r_coup', branch: 'Assassin', tier: 3, name: 'Coup de Grâce', ru: t('Удар милосердия', 'Coup de Grâce'), max: 10,
        perPoint: { cull: 1 }, cap: { cull: 35 },
        text: t('Мгновенно убивает врага при {cull}% макс. HP. Общий кап порога добивания — 35%.', 'Instantly kills an enemy at {cull}% of its max HP. The combined execution threshold caps at 35%.') },

      // Shadow-walker — Double Hit, Shadow Echo и второе эхо
      { id: 'r_swift', branch: 'Shadow-walker', tier: 1, name: 'Swift Blades', ru: t('Быстрые клинки', 'Swift Blades'), max: 5,
        perPoint: { dh: 3 }, s2: t('В 1.3.1 снижено до 3% за очко.', 'Reduced to 3% per point in 1.3.1.'), text: '+{dh}% Double Hit.' },
      { id: 'r_umbral', branch: 'Shadow-walker', tier: 1, name: 'Umbral Blades', ru: t('Теневые клинки', 'Umbral Blades'), max: 5,
        perPoint: { ad: 5 }, text: t('+{ad}% атаки.', '+{ad}% Attack Damage.') },
      { id: 'r_echo', branch: 'Shadow-walker', tier: 2, name: 'Shadow Echo', ru: t('Теневое эхо', 'Shadow Echo'), max: 5,
        perPoint: { echoTrigger: 5 }, base: { echoDamage: 40 }, cap: { echoTrigger: 100, echoDamage: 80 },
        text: t('{echoTrigger}% шанс повторить удар на 40% его урона. Кап шанса 100%, кап урона 80%.', 'A {echoTrigger}% chance to repeat a hit for 40% of its damage. Chance caps at 100% and damage caps at 80%.') },
      { id: 'r_phantom', branch: 'Shadow-walker', tier: 2, name: 'Phantom Strike', ru: t('Призрачный удар', 'Phantom Strike'), max: 5,
        perPoint: { dhBonusDmg: 3 }, text: t('Удары Double Hit наносят на {dhBonusDmg}% больше урона.', 'Double Hit strikes deal {dhBonusDmg}% more damage.') },
      { id: 'r_echomastery', branch: 'Shadow-walker', tier: 3, name: 'Echo Mastery', ru: t('Мастерство эха', 'Echo Mastery'), max: 10,
        perPoint: { echoTrigger: 2, echoDamage: 2 }, cap: { echoTrigger: 100, echoDamage: 80 },
        text: t('+{echoTrigger}% к шансу Shadow Echo и +{echoDamage}% к его урону. Капы: 100% / 80%.', '+{echoTrigger}% Shadow Echo trigger chance and +{echoDamage}% echo damage. Chance caps at 100% and damage caps at 80%.') },
      { id: 'r_cascade', branch: 'Shadow-walker', tier: 3, name: 'Umbral Cascade', ru: t('Теневой каскад', 'Umbral Cascade'), max: 10,
        requires: 'r_echo', perPoint: { echoTwice: 4 }, cap: { echoTwice: 75 },
        text: t('Требует Shadow Echo. {echoTwice}% шанс, что эхо сработает второй раз. Кап 75%.', 'Requires Shadow Echo. A {echoTwice}% chance for an echo to trigger a second time. Chance caps at 75%.') },

      // Thief — золото, материалы, дроп, Lucky Tier (у Rogue золота больше всех)
      { id: 'r_scavenger', branch: 'Thief', tier: 1, name: 'Scavenger', ru: t('Падальщик', 'Scavenger'), max: 5,
        perPoint: { gold: 2, mat: 2 }, text: t('+{gold}% золота и +{mat}% материалов.', '+{gold}% Gold Gain and +{mat}% Material Drops.') },
      { id: 'r_pickpocket', branch: 'Thief', tier: 1, name: 'Pickpocket', ru: t('Карманник', 'Pickpocket'), max: 5,
        perPoint: { gold: 4 }, text: t('+{gold}% золота.', '+{gold}% Gold Gain.') },
      { id: 'r_luckyhands', branch: 'Thief', tier: 2, name: 'Lucky Hands', ru: t('Счастливые руки', 'Lucky Hands'), max: 5,
        perPoint: { matDupe: 2 }, cap: { matDupe: 15 },
        text: t('{matDupe}% шанс удвоить дроп материала. Кап 15%.', 'A {matDupe}% chance to double a material drop. Chance caps at 15%.') },
      { id: 'r_treasure', branch: 'Thief', tier: 2, name: 'Treasure Hunter', ru: t('Охотник за сокровищами', 'Treasure Hunter'), max: 5,
        perPoint: { itemDrop: 2 }, text: t('+{itemDrop}% шанс дропа предметов.', '+{itemDrop}% Item Drop Chance.') },
      { id: 'r_blackmarket', branch: 'Thief', tier: 3, name: 'Black Market', ru: t('Чёрный рынок', 'Black Market'), max: 5,
        perPoint: { luckyTier: 2 }, cap: { luckyTier: 20 },
        text: t('+{luckyTier}% шанс, что выпадет предмет более высокого тира (Lucky Tier). Кап 20%. Складывается с Lucky у экипировки в один пул.', 'A +{luckyTier}% chance to drop a higher-tier item (Lucky Tier), capped at 20%. Shares a pool with Lucky from gear.') },
      { id: 'r_masterthief', branch: 'Thief', tier: 3, name: 'Master Thief', ru: t('Мастер-вор', 'Master Thief'), max: 5,
        perPoint: { gold: 2, mat: 3, itemDrop: 1 },
        text: t('+{gold}% золота, +{mat}% материалов, +{itemDrop}% дропа предметов.', '+{gold}% Gold Gain, +{mat}% Material Drops and +{itemDrop}% Item Drop Chance.') },
    ],
  },

  {
    id: 'druid',
    name: 'Druid',
    ru: t('Друид', 'Druid'),
    role: t('Гибрид: урон + пет, Harmony-механика, фарм яиц', 'Hybrid character and pet damage, Harmony and egg farming'),
    desc: 'Wild guardian who channels strength into a mighty pet companion (Season 2).',
    starter: 'Gnarled Stick',
    mainStat: 'strength',
    offhand: t('Нет (двуручное Gnarled Stick)', 'None (Gnarled Stick is two-handed)'),
    weapons: [t('Gnarled Stick (двуручное): физический урон + Pet Damage в имплисите', 'Gnarled Stick (two-handed) has built-in Physical Damage and Pet Damage')],
    branches: ['Lodge', 'Tunnels', 'Symbiosis'],
    branchRu: { Lodge: t('Ложа', 'Lodge'), Tunnels: t('Тоннели', 'Tunnels'), Symbiosis: t('Симбиоз', 'Symbiosis') },
    bestFor: [t('Пет-прогресс и фарм яиц', 'Pet progression and egg farming'), t('Сложная, но сильная Harmony-игра', 'A demanding but powerful Harmony build'), t('Игроки, любящие микро-менеджмент', 'Players who enjoy micromanagement')],
    caveat: t('Тиры и максимальные ранги Druid сверены с данными текущего билда: в каждой ветке (Lodge / Tunnels / Symbiosis) по два навыка на тир, у Gnaw, Digger и Kinship — 10 очков, у остальных — по 5. Ключевое отличие от других классов: у Druid почти нет прямых бонусов себе — он усиливает пета и конвертирует свой плоский урон в его урон (Kinship / Feral Bond, общий кап 75%).', 'The current build confirms two skills per tier in each Druid branch (Lodge, Tunnels and Symbiosis). Gnaw, Digger and Kinship take 10 points each. The other skills take 5. Druids gain few direct bonuses. They strengthen their pet and convert flat Attack Damage into Pet Damage through Kinship and Feral Bond (combined cap 75%).'),
    skills: [
      // Lodge — боевой пет, здоровье, босс-урон (тиры и ранги — данные текущего билда)
      { id: 'd_gnaw', branch: 'Lodge', tier: 1, name: 'Gnaw', ru: t('Грызня', 'Gnaw'), max: 10,
        perPoint: { petDmg: 8 }, text: t('+{petDmg}% урона пета.', '+{petDmg}% Pet Damage.') },
      { id: 'd_thickpelt', branch: 'Lodge', tier: 1, name: 'Thick Pelt', ru: t('Толстая шкура', 'Thick Pelt'), max: 5,
        perPoint: { maxHpPct: 5 }, text: t('+{maxHpPct}% макс. HP персонажа.', '+{maxHpPct}% character max HP.') },
      { id: 'd_dambuilder', branch: 'Lodge', tier: 2, name: 'Dam Builder', ru: t('Строитель плотин', 'Dam Builder'), max: 5,
        perPoint: { petDmgFlat: 15 }, text: t('+{petDmgFlat} к урону пета (плоское значение).', '+{petDmgFlat} flat Pet Damage.') },
      { id: 'd_timberfall', branch: 'Lodge', tier: 2, name: 'Timberfall', ru: t('Валка леса', 'Timberfall'), max: 5,
        perPoint: { boss: 5 }, cap: { boss: 100 },
        text: t('+{boss}% урона по боссам (общий кап Boss Damage 100%).', '+{boss}% Boss Damage (total Boss Damage cap 100%).') },
      { id: 'd_tailslap', branch: 'Lodge', tier: 3, name: 'Tail Slap', ru: t('Удар хвостом', 'Tail Slap'), max: 5,
        perPoint: { petDoubleStrike: 3 }, cap: { petDoubleStrike: 60 },
        text: t('{petDoubleStrike}% шанс, что пет ударит дважды. Кап 60%.', 'A {petDoubleStrike}% chance for your pet to strike twice. Chance caps at 60%.') },
      { id: 'd_lodgekeeper', branch: 'Lodge', tier: 3, name: 'Lodgekeeper', ru: t('Хранитель ложи', 'Lodgekeeper'), max: 5,
        perPoint: { petMastery: 1 }, text: t('+{petMastery} уровень Pet Mastery.', '+{petMastery} Pet Mastery levels.') },

      // Tunnels — фарм: материалы, яйца, золото, руны и добивание
      { id: 'd_digger', branch: 'Tunnels', tier: 1, name: 'Digger', ru: t('Копатель', 'Digger'), max: 10,
        perPoint: { mat: 2, itemDrop: 1 }, text: t('+{mat}% материалов и +{itemDrop}% шанс дропа предметов.', '+{mat}% Material Drops and +{itemDrop}% Item Drop Chance.') },
      { id: 'd_keensnout', branch: 'Tunnels', tier: 1, name: 'Keen Snout', ru: t('Чуткий нос', 'Keen Snout'), max: 5,
        perPoint: { eggDrop: 1, mat: 1 }, cap: { eggDrop: 15 },
        text: t('+{eggDrop}% шанс дропа Pet Egg (кап 15%) и +{mat}% материалов.', '+{eggDrop}% Pet Egg Drop Chance (cap 15%) and +{mat}% Material Drops.') },
      { id: 'd_hoard', branch: 'Tunnels', tier: 2, name: 'Hoard', ru: t('Кладовая', 'Hoard'), max: 5,
        perPoint: { gold: 5 }, text: t('+{gold}% золота.', '+{gold}% Gold Gain.') },
      { id: 'd_earthbind', branch: 'Tunnels', tier: 2, name: 'Earthbind', ru: t('Оковы земли', 'Earthbind'), max: 5,
        perPoint: { crit: 3 }, text: t('+{crit}% шанс крита.', '+{crit}% Critical Strike Chance.') },
      { id: 'd_undermine', branch: 'Tunnels', tier: 3, name: 'Undermine', ru: t('Подкоп', 'Undermine'), max: 5,
        perPoint: { cull: 2 }, cap: { cull: 35 },
        text: t('Мгновенно убивает врага, когда у него остаётся {cull}% макс. HP. Общий кап порога добивания — 35%.', 'Instantly kills an enemy at {cull}% of its max HP. The combined execution threshold caps at 35%.') },
      { id: 'd_deeproots', branch: 'Tunnels', tier: 3, name: 'Deep Roots', ru: t('Глубокие корни', 'Deep Roots'), max: 5,
        perPoint: { petExp: 1, rune: 1 }, cap: { petExp: 15 },
        text: t('+{petExp}% опыт пета (кап 15%) и +{rune}% шанс дропа рун.', '+{petExp}% pet EXP (cap 15%) and +{rune}% Rune Drop Chance.') },

      // Symbiosis — конвертация урона в пета, крит-урон, усиление слабости стихий
      { id: 'd_kinship', branch: 'Symbiosis', tier: 1, name: 'Kinship', ru: t('Родство', 'Kinship'), max: 10,
        perPoint: { flatToPet: 3 }, cap: { flatToPet: 75 },
        text: t('Превращает {flatToPet}% вашего плоского урона (Attack Damage) в урон пета. Общий кап с Feral Bond — 75%.', 'Converts {flatToPet}% of your flat Attack Damage into Pet Damage. Shares a 75% cap with Feral Bond.') },
      { id: 'd_sharedinstinct', branch: 'Symbiosis', tier: 1, name: 'Shared Instinct', ru: t('Общий инстинкт', 'Shared Instinct'), max: 5,
        perPoint: { critDmg: 10 }, text: t('+{critDmg}% урона от крита.', '+{critDmg}% Critical Damage.') },
      { id: 'd_feralbond', branch: 'Symbiosis', tier: 2, name: 'Feral Bond', ru: t('Связь с диким', 'Feral Bond'), max: 5,
        perPoint: { flatToPet: 4 }, cap: { flatToPet: 75 },
        text: t('Превращает {flatToPet}% плоского урона в урон пета — усиливает то же, что Kinship. Общий кап 75%.', 'Converts {flatToPet}% of your flat damage into Pet Damage. Shares a 75% cap with Kinship.') },
      { id: 'd_twinheart', branch: 'Symbiosis', tier: 2, name: 'Twin Heart', ru: t('Двойное сердце', 'Twin Heart'), max: 5,
        perPoint: { loh: 2 }, text: t('+{loh} HP за удар.', '+{loh} Life on Hit.') },
      { id: 'd_wildattunement', branch: 'Symbiosis', tier: 3, name: 'Wild Attunement', ru: t('Дикое созвучие', 'Wild Attunement'), max: 5,
        perPoint: { elemWeak: 3 }, cap: { elemWeak: 25 },
        text: t('Усиливает бонус пета по слабости стихий на {elemWeak}% за очко. Кап 25%.', 'Increases the pet’s elemental weakness bonus by {elemWeak}% per point. The bonus caps at 25%.') },
      { id: 'd_onesoul', branch: 'Symbiosis', tier: 3, name: 'One Soul', ru: t('Одна душа', 'One Soul'), max: 5,
        perPoint: { petDmg: 5 }, text: t('+{petDmg}% урона пета.', '+{petDmg}% Pet Damage.') },
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
