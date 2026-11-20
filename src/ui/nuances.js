import { t as tr } from '../i18n.js';
import { el, card, table } from './dom.js';
import { CHECKLIST } from '../data/builds.js';
import { DATA_META } from '../data/systems.js';

export function render(root) {
  root.innerHTML = '';
  root.appendChild(card(tr('Как пользоваться приложением', 'How to use the guide'), [
    el('p', { text: tr('В планировщике восемь страниц. При изменении настроек рекомендации пересчитываются сразу.', 'The planner has eight pages. Its recommendations update when you change a setting.') }),
    el('ol', {}, [
      el('li', { text: tr('Класс и цель. Выберите класс и цель сборки. От них зависят приоритеты навыков, характеристики, Drop Bonuses и камни.', 'Class and goal. Choose your class and build goal. They determine your skill priorities, stats, Drop Bonuses, and gems.') }),
      el('li', { text: tr('Уровни. Укажите уровень персонажа и Monster Level (ML). Первое классовое очко даётся на уровне 1, затем по одному каждые 3 уровня. ML определяет доступные предметы, тиры, редкость камней и сокеты.', 'Levels. Set your character level and Monster Level (ML). You gain one class skill point at level 1 and another every 3 levels. ML determines available items, tiers, gem rarities, and sockets.') }),
      el('li', { text: tr('Навыки. Посмотрите распределение очков по трём веткам или измените его кнопками «+» и «−». Укажите бонус +All Class Skills от факела, петов и Sage Diadem, чтобы увидеть итоговые ранги.', 'Skills. Review the allocation across three branches or adjust it with + and −. Enter +All Class Skills from your Torch, pets, and Sage Diadem to see your effective ranks.') }),
      el('li', { text: tr('Снаряжение. На схеме 13 ячеек, включая два кольца и два талисмана. Откройте карточку, чтобы посмотреть характеристики предмета. Доступные предметы зависят от класса и ML.', 'Gear. The layout has 13 positions, including two rings and two talismans. Open a card to see the item details. Available items depend on your class and ML.') }),
      el('li', { text: tr('Кузница. Посмотрите, какие ячейки улучшать сначала. Для каждой видны тир, уровень улучшения «+N» и стоимость следующего шага.', 'Forge. See which slots to upgrade first. Each slot shows its tier, upgrade level (+N), and cost for the next step.') }),
      el('li', { text: tr('Камни. Сравните рекомендованные камни, их эффекты и альтернативы для каждого типа снаряжения. Посмотрите, какая редкость доступна на вашем ML.', 'Gems. Compare recommended gems, their effects, and alternatives for each type of gear. See which rarities can drop at your ML.') }),
      el('li', { text: tr('Что дальше. Посмотрите чек-лист под ваш уровень, ML и цель, приоритет характеристик, талисманы и петов.', 'Next steps. Review the checklist for your character level, ML, and goal, including stat priorities, talismans, and pets.') }),
      el('li', { text: tr('Сборка. Скопируйте список снаряжения или текст плана, обменяйтесь кодом сборки или сохраните именованный набор в браузере.', 'Build. Copy the gear list or plan text, share a build code, or save a named loadout in this browser.') }),
    ]),
    el('ul', { class: 'tight' }, [
      el('li', { text: tr('Пассивное дерево показывает, куда вкладывать пассивные очки для вашего класса и цели.', 'The Passive Skill Tree shows where to spend passive points for your class and goal.') }),
      el('li', { text: tr('Калькуляторы: проверьте, что даёт конкретный крит/DH/DD-билд или Retaliation, посчитайте значение гема и стоимость Mastery.', 'Calculators let you compare critical hits, Double Hit, Double Damage, and Retaliation, check a gem’s effect, or calculate a Mastery upgrade cost.') }),
      el('li', { text: tr('Кодекс: справочник по официальным данным — 40 семейств предметов, аффиксы, Drop Bonuses, гемы, навыки, петы, талисманы, гильдия, ML-анлоки.', 'The Codex covers 40 official item families, affixes, Drop Bonuses, gems, skills, pets, talismans, the guild, and Monster Level unlocks.') }),
    ]),
    el('p', { class: 'muted', text: tr('Формат подписей везде один: «Русское (English)» — сначала понятное по-русски, в скобках игровое название, чтобы легко искать в игре.', 'English labels use in-game names so you can find the same skills and items in IdleArc.') }),
  ]));

  root.appendChild(card(tr('Нюансы, которые чаще всего ломают билд', 'Common build pitfalls'), [
    el('div', { class: 'grid cols-2' }, CHECKLIST.map((c) =>
      el('div', { class: 'infobox' }, [el('b', { text: c.title }), el('p', { text: c.text })]))),
  ]));

  root.appendChild(card(tr('Данные и источники', 'Data and sources'), [
    el('p', { text: tr(
      `Версия игры: ${DATA_META.gameVersion} · Патч вышел ${DATA_META.patchDate}. ${DATA_META.verified}.`,
      `Game version: ${DATA_META.gameVersion} · Patch released ${DATA_META.patchDate}. ${DATA_META.verified}.`,
    ) }),
    table([tr('Источник', 'Source'), tr('Ссылка', 'Link')], DATA_META.sources.map((s) => [s.label, el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.url })])),
    el('div', { class: 'warnbox', style: 'margin-top:10px' }, [
      el('b', { text: tr('Откуда берутся цифры в классовых навыках', 'Where the class skill values come from') }),
      el('ul', { class: 'tight' }, [
        el('li', { text: tr('Все 90 классовых навыков (5 классов × 3 ветки × 6 навыков) сверены с данными текущего билда игры: ветка, тир, максимальный ранг (5 или 10 очков), значение за очко и кап эффекта. Для Druid это ветки Lodge / Tunnels / Symbiosis, а не восстановленные по смыслу: в каждой ветке по два навыка на тир, у Gnaw, Digger и Kinship — 10 очков.', 'All 90 class skills (5 classes × 3 branches × 6 skills) were checked against the game build for branch, tier, maximum rank (5 or 10 points), value per point, and effect cap. Druid has two skills per tier in each of its Lodge, Tunnels, and Symbiosis branches. Gnaw, Digger, and Kinship have 10 ranks each.') }),
        el('li', { text: tr('Правила тиров — официальные: Tier 2 открывается после 5 очков в этой же ветке, Tier 3 — после 10. Отдельные навыки требуют вложенного очка в навык-предусловие (например, Umbral Cascade у Rogue — после Shadow Echo); это видно в таблице навыков и в кодексе.', 'Tier 2 requires 5 points in the same branch. Tier 3 requires 10. Some skills also require a point in another skill. For example, a Rogue must invest in Shadow Echo before Umbral Cascade. The skills table and Codex show these prerequisites.') }),
        el('li', { text: tr('Изменения Season 2 (патч 1.3.1) учтены: Counterstrike вместо Victory Rush, Defense у Iron Constitution / Battle Recovery / Crushing Blows, ослабленные крит- и double-hit-навыки Rogue, выровненные фарм-навыки всех классов, сокеты и гемы с ML 20.', 'Season 2 changes in patch 1.3.1 include Counterstrike replacing Victory Rush, Defense on Iron Constitution, Battle Recovery and Crushing Blows, weaker Rogue critical and Double Hit skills, rebalanced farming skills for all classes, and sockets and gems starting at ML 20.') }),
        el('li', { text: tr('Расчёты урона (вкладка «Калькуляторы») — модель на основе официальных правил (крит >100%, «полные сотни» DH/DD, капы DR 95/99%). Порядок слоёв урона в игре не раскрыт: используйте как сравнение вариантов, а не как точный DPS.', 'The damage calculators use the official rules for Crit Chance above 100%, each full 100% of Double Hit or Double Damage, and the 95% and 99% DR caps. The full order of damage layers is unpublished, so use the estimates to compare builds.') }),
        el('li', { text: tr('Названия в интерфейсе игры — английские, поэтому приложение дублирует их: русская подпись + оригинальное название.', 'The game uses English item and skill names. Russian mode also shows the original in-game names.') }),
      ]),
    ]),
    el('p', { class: 'muted', text: tr('Игра обновляется очень часто (несколько балансных патчей в неделю). Если видите расхождение — сверяйтесь с патч-нотами и обновите снапшот данных в src/data/*.js.', 'Balance patches can arrive several times a week. If a value differs from the game, check the patch notes and update the relevant snapshot in src/data/*.js.') }),
  ]));

  root.appendChild(card(tr('Дисклеймер', 'Disclaimer'), [
    el('p', { text: tr('Это неофициальный фанатский помощник. Он не связан с разработчиком IdleArc, не подключается к аккаунту игры, не автоматизирует геймплей и не требует логина. Все данные — публичные материалы официального сайта игры и открытой вики с указанием источников.', 'This unofficial fan guide is independent of the IdleArc developer. It uses public information from the official site and community wiki, linked above. It works without a login or game-account connection and does not automate gameplay.') }),
  ]));
}
