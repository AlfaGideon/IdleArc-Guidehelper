/**
 * Иконки предметов: рисуем сами во встроенном SVG (без внешних картинок и запросов в сеть).
 *
 * Почему так: в приложении-превью запрещены внешние ассеты, а официальные иконки лежат
 * на сервере игры — их нельзя тянуть напрямую. Поэтому каждое семейство предметов получает
 * узнаваемый рисунок (меч, посох, лук, нагрудник, шлем, кольцо, факел…), который окрашивается
 * в цвет тира T1…T6. Названия семейств — официальные, из Item Codex.
 */

/** Цвета тиров: [основной, тёмный, блик]. */
const TIER_COLORS = {
  1: ['#b7b7b7', '#7f8188', '#e9ebf0'],
  2: ['#69d17d', '#3a8f4f', '#d8f7de'],
  3: ['#5ba7ff', '#2e6dbb', '#d7e9ff'],
  4: ['#bd76ff', '#7d3fc0', '#eed9ff'],
  5: ['#ffc857', '#b9862a', '#fff0cd'],
  6: ['#ff6b5f', '#b03a30', '#ffd9d4'],
};

export const tierColors = (tier) => TIER_COLORS[Math.min(6, Math.max(1, Math.round(Number(tier) || 1)))];

const STEEL = '#c9ccd6';
const STEEL_D = '#83879a';
const WOOD = '#b07a3f';
const WOOD_D = '#7c5326';
const LEATHER = '#a06f4c';
const LEATHER_D = '#6d472c';
const CLOTH = '#b9bec9';
const GOLD = '#e8c46a';
const GOLD_D = '#a8883a';

/** Обёртка: полотно 64×64 и лёгкая тень-подставка. */
function wrap(inner) {
  return `<svg viewBox="0 0 64 64" role="img" xmlns="http://www.w3.org/2000/svg">`
    + `<ellipse cx="32" cy="58" rx="16" ry="3.2" fill="rgba(0,0,0,.35)"/>${inner}</svg>`;
}

/* ------------------------------- фигуры оружия ------------------------------- */

const blade = (a, b, len) => `<polygon points="32,3 38,${3 + len * 0.55} 34,${10 + len} 30,${10 + len} 26,${3 + len * 0.55}" fill="${STEEL}"/>`
  + `<polygon points="32,3 34.5,${4 + len * 0.5} 33,${9 + len} 30,${9 + len}" fill="${b}"/>`;

const shapes = {
  // Одноручный / полуторный меч
  sword: (a, b) => blade(a, b, 22)
    + `<rect x="18" y="36" width="28" height="4.6" rx="2" fill="${GOLD_D}"/>`
    + `<rect x="19.5" y="37" width="25" height="1.8" rx="1" fill="${GOLD}"/>`
    + `<rect x="29.4" y="40" width="5.2" height="12" rx="2.2" fill="${LEATHER_D}"/>`
    + `<circle cx="32" cy="54" r="4" fill="${GOLD_D}"/><circle cx="32" cy="54" r="2.2" fill="${GOLD}"/>`,

  // Двуручный (большой) меч
  greatsword: (a, b) => `<polygon points="32,2 40,16 36,44 28,44 24,16" fill="${STEEL}"/>`
    + `<polygon points="32,2 35.5,14 33,44 30,44 27,14" fill="${b}"/>`
    + `<rect x="14" y="44" width="36" height="5.4" rx="2.4" fill="${GOLD_D}"/>`
    + `<rect x="15.5" y="45.2" width="33" height="2" rx="1" fill="${GOLD}"/>`
    + `<rect x="29" y="49" width="6" height="9" rx="2.4" fill="${LEATHER_D}"/>`
    + `<circle cx="32" cy="59" r="3.6" fill="${GOLD_D}"/>`,

  // Кинжал
  dagger: (a, b) => `<polygon points="32,16 36,26 34,38 30,38 28,26" fill="${STEEL}"/>`
    + `<polygon points="32,16 33.6,26 32.4,38 30,38 28.4,26" fill="${b}"/>`
    + `<rect x="22" y="38" width="20" height="3.8" rx="1.8" fill="${GOLD_D}"/>`
    + `<rect x="30" y="41" width="4.2" height="10" rx="2" fill="${LEATHER_D}"/>`
    + `<circle cx="32.1" cy="52.5" r="3" fill="${GOLD}"/>`,

  // Жезл / посох
  wand: (a, b) => `<rect x="29.4" y="22" width="4.6" height="30" rx="2.2" fill="${WOOD_D}"/>`
    + `<rect x="30.4" y="23" width="1.8" height="28" fill="${WOOD}"/>`
    + `<circle cx="31.8" cy="15" r="8" fill="${a}"/>`
    + `<circle cx="31.8" cy="15" r="5" fill="${b}"/><circle cx="29.6" cy="12.6" r="1.8" fill="#fff" opacity=".85"/>`,

  // Большой посох
  staff: (a, b) => `<rect x="29" y="14" width="5.4" height="42" rx="2.6" fill="${WOOD_D}"/>`
    + `<rect x="30.2" y="15" width="2" height="40" fill="${WOOD}"/>`
    + `<path d="M31.7 12 C22 12 16 18 18 26 C20 20 25 17 31.7 17 Z" fill="${a}"/>`
    + `<path d="M31.7 12 C41 12 47 18 45 26 C43 20 38 17 31.7 17 Z" fill="${b}"/>`
    + `<circle cx="31.7" cy="10" r="4.6" fill="${a}"/><circle cx="30" cy="8.4" r="1.6" fill="#fff" opacity=".8"/>`,

  // Лук
  bow: (a, b) => `<path d="M20 6 C34 16 34 48 20 58" stroke="${WOOD_D}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    + `<path d="M20 6 C32 16 32 48 20 58" stroke="${WOOD}" stroke-width="2" fill="none"/>`
    + `<line x1="20" y1="6" x2="20" y2="58" stroke="#e9ebf0" stroke-width="1.6"/>`
    + `<line x1="20" y1="32" x2="46" y2="32" stroke="${STEEL_D}" stroke-width="2.4"/>`
    + `<polygon points="52,32 44,28.4 44,35.6" fill="${a}"/>`,

  // Арбалет
  crossbow: (a, b) => `<rect x="24" y="6" width="16" height="34" rx="3" fill="${WOOD_D}"/>`
    + `<rect x="26" y="8" width="12" height="30" rx="2" fill="${WOOD}"/>`
    + `<path d="M8 16 C18 24 46 24 56 16" stroke="${STEEL_D}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    + `<line x1="8" y1="16" x2="56" y2="16" stroke="#e9ebf0" stroke-width="1.4"/>`
    + `<rect x="26" y="40" width="12" height="12" rx="3" fill="${LEATHER_D}"/>`
    + `<polygon points="32,4 36,12 28,12" fill="${a}"/>`,

  // Когти
  claws: (a, b) => [0, 1, 2].map((i) => {
    const x = 18 + i * 12;
    return `<path d="M${x} 54 C${x + 2} 40 ${x + 4} 28 ${x + 1} 12" stroke="${STEEL}" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + `<path d="M${x + 1} 50 C${x + 3} 38 ${x + 4} 28 ${x + 2} 14" stroke="${b}" stroke-width="1.6" fill="none" opacity=".8"/>`;
  }).join('') + `<rect x="12" y="52" width="40" height="6" rx="3" fill="${LEATHER_D}"/>`,

  // Корявый посох друида
  stick: (a, b) => `<path d="M30 60 C26 44 34 34 30 20 C28 14 30 10 34 6" stroke="${WOOD_D}" stroke-width="6" fill="none" stroke-linecap="round"/>`
    + `<path d="M31 58 C27 44 34 34 31 20 C29 15 31 12 34 8" stroke="${WOOD}" stroke-width="2" fill="none"/>`
    + `<path d="M33 22 C40 18 46 20 48 24 C42 24 37 25 33 27 Z" fill="${a}"/>`
    + `<path d="M30 34 C23 30 17 32 15 37 C21 36 26 37 30 39 Z" fill="${b}"/>`
    + `<circle cx="35" cy="8" r="3.4" fill="${a}"/>`,

  // Щит
  shield: (a, b) => `<path d="M32 4 L56 12 V32 C56 46 45 56 32 61 C19 56 8 46 8 32 V12 Z" fill="${WOOD_D}"/>`
    + `<path d="M32 8 L52 14.5 V32 C52 44 43 52.5 32 57 C21 52.5 12 44 12 32 V14.5 Z" fill="${WOOD}"/>`
    + `<path d="M32 8 L52 14.5 V32 H32 Z" fill="rgba(0,0,0,.14)"/>`
    + `<circle cx="32" cy="30" r="8" fill="${STEEL_D}"/><circle cx="32" cy="30" r="4" fill="${a}"/>`
    + `<circle cx="32" cy="14" r="2.2" fill="${STEEL}"/><circle cx="18" cy="20" r="2.2" fill="${STEEL}"/><circle cx="46" cy="20" r="2.2" fill="${STEEL}"/>`
    + `<circle cx="18" cy="42" r="2.2" fill="${STEEL}"/><circle cx="46" cy="42" r="2.2" fill="${STEEL}"/>`,

  // Книга заклинаний
  book: (a, b) => `<rect x="10" y="10" width="44" height="44" rx="4" fill="${LEATHER_D}"/>`
    + `<rect x="14" y="10" width="40" height="44" rx="4" fill="${LEATHER}"/>`
    + `<rect x="18" y="14" width="32" height="36" rx="2" fill="#f2ead6"/>`
    + `<rect x="18" y="14" width="6" height="36" fill="${b}" opacity=".55"/>`
    + `<circle cx="40" cy="30" r="8" fill="${a}" opacity=".9"/><circle cx="40" cy="30" r="3.4" fill="#fff" opacity=".75"/>`
    + `<rect x="14" y="24" width="6" height="16" rx="2" fill="${GOLD_D}"/>`,

  // Колчан
  quiver: (a, b) => `<path d="M20 14 L44 14 L40 58 L24 58 Z" fill="${LEATHER_D}"/>`
    + `<path d="M23 16 L41 16 L38 55 L26 55 Z" fill="${LEATHER}"/>`
    + `<rect x="19" y="18" width="26" height="5" rx="2" fill="${b}"/>`
    + `<rect x="21" y="46" width="22" height="5" rx="2" fill="${b}"/>`
    + [0, 1, 2].map((i) => {
      const x = 24 + i * 7;
      return `<line x1="${x}" y1="14" x2="${x - 2}" y2="2" stroke="${WOOD}" stroke-width="2"/>`
        + `<polygon points="${x - 2},2 ${x - 6},8 ${x - 1},8" fill="${a}"/>`;
    }).join(''),

  // Нагрудник
  chest: (a, b) => `<path d="M20 10 L32 14 L44 10 L54 16 L50 30 L46 28 L46 56 L18 56 L18 28 L14 30 L10 16 Z" fill="${STEEL_D}"/>`
    + `<path d="M23 13 L32 16 L41 13 L49 17.5 L46 27 L43 25.5 L43 53 L21 53 L21 25.5 L18 27 L15 17.5 Z" fill="${STEEL}"/>`
    + `<path d="M32 14 L44 10 L54 16 L50 30 L46 28 L46 56 L32 56 Z" fill="rgba(0,0,0,.12)"/>`
    + `<circle cx="32" cy="34" r="5.4" fill="${a}"/><circle cx="32" cy="34" r="2.4" fill="${b}"/>`
    + `<rect x="24" y="44" width="16" height="3" rx="1.5" fill="${b}"/>`,

  // Шлем
  helm: (a, b) => `<path d="M14 34 C14 18 22 8 32 8 C42 8 50 18 50 34 L50 46 C50 52 44 56 32 56 C20 56 14 52 14 46 Z" fill="${STEEL_D}"/>`
    + `<path d="M18 34 C18 20 24 12 32 12 C40 12 46 20 46 34 L46 45 C46 49.5 41 52.5 32 52.5 C23 52.5 18 49.5 18 45 Z" fill="${STEEL}"/>`
    + `<path d="M32 12 L46 20 L46 34 L32 34 Z" fill="rgba(0,0,0,.14)"/>`
    + `<rect x="20" y="30" width="24" height="9" rx="3" fill="#20222b"/>`
    + `<rect x="30" y="12" width="4" height="18" rx="1.6" fill="${b}" opacity=".7"/>`
    + `<circle cx="32" cy="13" r="3.2" fill="${a}"/>`,
};

/* ------------------------------ фигуры брони/украшений ------------------------------ */

const armorShapes = {
  // Перчатки
  gloves: (a, b) => `<path d="M18 26 L18 46 C18 53 22 57 28 57 L40 57 C46 57 50 53 50 46 L50 22 C50 18 46 16 43 18 L40 20 L40 12 C40 8 35 8 34 12 L34 20 L32 20 L32 10 C32 6 27 6 26 10 L26 20 L24 18 C21 16 18 18 18 22 Z" fill="${LEATHER_D}"/>`
    + `<path d="M21 27 L21 45 C21 50 24 54 29 54 L39 54 C43 54 47 50 47 45 L47 23 C47 21 45 20 43 21 L38 24 L38 13 C38 11 36 11 35.6 13 L35.6 24 L31 24 L31 11 C31 9 28.6 9 28.6 11 L28.6 24 L23 21 C22 20.4 21 20.6 21 22 Z" fill="${LEATHER}"/>`
    + `<rect x="20" y="40" width="28" height="8" rx="3" fill="${b}"/>`
    + `<circle cx="34" cy="44" r="2.6" fill="${a}"/>`,

  // Обувь
  boots: (a, b) => `<path d="M20 12 L38 12 L40 34 C40 38 42 40 46 42 L52 45 C56 47 56 54 50 54 L20 54 C16 54 14 52 14 48 L14 18 C14 14 16 12 20 12 Z" fill="${LEATHER_D}"/>`
    + `<path d="M22 15 L36 15 L38 34 C38 39 41 42 45 44 L49 46 C51 47 51 51 47 51 L22 51 C19.5 51 18.5 50 18.5 47.5 L18.5 19 C18.5 16.4 20 15 22 15 Z" fill="${LEATHER}"/>`
    + `<rect x="14" y="50" width="42" height="5" rx="2.4" fill="#2a2c35"/>`
    + `<rect x="18" y="30" width="22" height="6" rx="3" fill="${b}"/>`
    + `<circle cx="28" cy="33" r="3" fill="${a}"/>`,

  // Пояс
  belt: (a, b) => `<path d="M6 26 L58 26 L58 40 L6 40 Z" fill="${LEATHER_D}"/>`
    + `<path d="M6 28 L58 28 L58 38 L6 38 Z" fill="${LEATHER}"/>`
    + `<rect x="24" y="22" width="16" height="20" rx="4" fill="${GOLD_D}"/>`
    + `<rect x="27" y="25" width="10" height="14" rx="3" fill="${GOLD}"/>`
    + `<circle cx="32" cy="32" r="3" fill="${b}"/>`
    + [12, 18, 46, 52].map((x) => `<circle cx="${x}" cy="33" r="2.2" fill="${STEEL}"/>`).join(''),

  // Кольцо
  ring: (a, b) => `<circle cx="32" cy="38" r="15" fill="none" stroke="${GOLD_D}" stroke-width="7"/>`
    + `<circle cx="32" cy="38" r="15" fill="none" stroke="${GOLD}" stroke-width="3.4"/>`
    + `<polygon points="32,10 40,20 32,30 24,20" fill="${a}"/>`
    + `<polygon points="32,10 40,20 32,30 30,20" fill="${b}"/>`
    + `<circle cx="30" cy="18" r="2" fill="#fff" opacity=".8"/>`,

  // Амулет
  amulet: (a, b) => `<path d="M14 12 C18 30 26 34 32 34 C38 34 46 30 50 12" stroke="${GOLD_D}" stroke-width="3.4" fill="none" stroke-dasharray="4 3"/>`
    + `<circle cx="32" cy="42" r="13" fill="${GOLD_D}"/>`
    + `<circle cx="32" cy="42" r="10" fill="${a}"/>`
    + `<circle cx="32" cy="42" r="6" fill="${b}"/>`
    + `<circle cx="28.5" cy="38.5" r="2.4" fill="#fff" opacity=".8"/>`,

  // Факел
  torch: (a, b) => `<rect x="28" y="30" width="8" height="28" rx="3" fill="${WOOD_D}"/>`
    + `<rect x="29.4" y="31" width="3" height="26" fill="${WOOD}"/>`
    + `<rect x="24" y="26" width="16" height="7" rx="2.6" fill="${LEATHER_D}"/>`
    + `<path d="M32 4 C24 12 22 18 24 24 C26 28 30 30 32 30 C34 30 38 28 40 24 C42 18 40 12 32 4 Z" fill="${b}"/>`
    + `<path d="M32 10 C27 16 26 20 28 24 C29 26.5 31 28 32 28 C33 28 35 26.5 36 24 C38 20 37 16 32 10 Z" fill="${a}"/>`
    + `<path d="M32 16 C30 19 30 22 31 24 C31.6 25.4 32.4 26 32 26 C33 25.6 34 24.4 34 22.6 C34 20 33.4 18.4 32 16 Z" fill="#fff" opacity=".7"/>`,

  // Замок — для слотов, недоступных классу
  lock: (a, b) => `<path d="M22 28 V20 C22 12 26 8 32 8 C38 8 42 12 42 20 V28" stroke="${STEEL_D}" stroke-width="6" fill="none"/>`
    + `<rect x="14" y="26" width="36" height="30" rx="6" fill="${STEEL_D}"/>`
    + `<rect x="17" y="29" width="30" height="24" rx="4" fill="${STEEL}"/>`
    + `<circle cx="32" cy="38" r="4" fill="#2a2c35"/><rect x="30.4" y="38" width="3.2" height="9" rx="1.6" fill="#2a2c35"/>`
    + `<circle cx="32" cy="9" r="2.4" fill="${a}"/>`,
};

/** Какому рисунку соответствует семейство (по id из Item Codex). */
const SHAPE_BY_FAMILY = {
  broken_sword: 'sword', greatsword: 'greatsword',
  wooden_rod: 'wand', grand_staff: 'staff',
  wooden_bow: 'bow', crossbow: 'crossbow',
  rusty_dagger: 'dagger', claws: 'claws', gnarled_stick: 'stick',
  wooden_shield: 'shield', old_book: 'book', quiver: 'quiver',
  rags: 'chest', wardplate: 'chest', bloodweave_vest: 'chest', harmonic_cuirass: 'chest',
  leather_cap: 'helm', visionary_hood: 'helm', beast_crown: 'helm', sage_diadem: 'helm',
  worn_gloves: 'gloves', slayer_gauntlets: 'gloves', berserker_grips: 'gloves', symbiotic_handwraps: 'gloves',
  sandals_of_starszy: 'boots', swiftstride_boots: 'boots', grounded_treads: 'boots', pathfinder_treads: 'boots',
  warriors_belt: 'belt', rangers_belt: 'belt', scholars_belt: 'belt',
  warriors_ring: 'ring', rangers_ring: 'ring', scholars_ring: 'ring', adventurers_ring: 'ring',
  warriors_amulet: 'amulet', rangers_amulet: 'amulet', scholars_amulet: 'amulet', adventurers_amulet: 'amulet',
  torch: 'torch',
};

/** Рисунок по имени фигуры: 'sword', 'helm', … */
export function shapeArt(shape, tier = 1) {
  const [a, b] = tierColors(tier);
  const fn = shapes[shape] || armorShapes[shape];
  return wrap(fn ? fn(a, b) : armorShapes.lock(a, b));
}

/** Рисунок предмета: принимает семейство (объект или id) и тир. */
export function itemArt(family, tier = 1) {
  const id = typeof family === 'string' ? family : family?.id;
  return shapeArt(SHAPE_BY_FAMILY[id] || 'lock', tier);
}

/** Рисунок закрытой ячейки (слот недоступен классу). */
export function lockArt(tier = 1) {
  const [a] = tierColors(tier);
  return wrap(armorShapes.lock(a, '#5b5f70'));
}

export const knownShape = (familyId) => SHAPE_BY_FAMILY[familyId] || null;
export const SHAPES = SHAPE_BY_FAMILY;
