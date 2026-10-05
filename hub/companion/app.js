(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slugify = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const clone = value => JSON.parse(JSON.stringify(value));
  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
  const fmtInt = value => {
    try { return BigInt(value).toLocaleString(); } catch { return Number(value || 0).toLocaleString(); }
  };
  const fmtNum = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const human = value => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Percent$/i, '%')
    .replace(/Chance$/i, 'Chance');


  /* ---------------- i18n ---------------- */
  let LANG = (() => { try { return localStorage.getItem('iac:lang') || 'ru'; } catch { return 'ru'; } })();
  const I18N = {
    ru: {
      nav_home:'Главная', nav_codex:'Кодекс', nav_tools:'Инструменты', nav_passive:'Пассивка', nav_build:'Билды',
      passiveTitle:'Пассивное дерево', passiveEyebrow:'Прокачка по классам',
      passiveKicker:'200 этажей • 20 тиров • 500 узлов',
      passiveIntro:'Выбери класс и цель прокачки — план строится по порядку этажей, без перескоков.',
      pts:'очк.', point:'очко', budget:'Очков доступно',
      ruleTitle:'Правило дерева:',
      ruleBody:'этаж открывается только если на предыдущем этаже есть хотя бы 1 очко, а новый тир — только когда в предыдущем набрано пороговое число очков. Перескочить через этаж нельзя.',
      guideTitle:'Рекомендации по прокачке', guideSub:'Что брать за {cls} и почему.',
      planTitle:'Готовый план', planSub:'Распределено {n} очк., доведёт до этажа {row}.',
      tierReached:'Дойдёшь до тира {tier}', applyPlan:'Применить план', clearPlan:'Сбросить очки',
      stepsTitle:'Следующие шаги', stepsSub:'Ближайшие 8 вложений от текущего состояния твоего билда.',
      stepsDone:'Текущее распределение уже совпадает с планом.',
      latticeKicker:'Интерактивная решётка', latticeTitle:'Дерево по тирам',
      latticeNote:'Звёздочка — узел из рекомендованного плана. Замок — этаж ещё закрыт.',
      tierN:'Тир {n}', rowN:'Этаж {n}', rowsRange:'этажи {a}–{b}', milestone:'milestone',
      tierNeed:'Нужно {need} очк. в тире {prev} (сейчас {have})', startTier:'Стартовый тир',
      allocatedHere:'здесь вложено {n} очк.',
      recommended:'Рекомендовано планом',
      leftover:'Осталось нераспределённых очков: {n} (упёрлись в лимиты узлов).',
      noPlan:'Увеличь количество очков, чтобы построить план.',
      lockRow:'Этаж {row} закрыт: сначала вложи хотя бы 1 очко в этаж {prev}. Перескакивать нельзя.',
      lockTier:'Тир {tier} закрыт: нужно {need} очк. в предыдущем тире (сейчас {have}).',
      lockRemove:'Нельзя убрать последнее очко с этажа {row} — на нём держатся этажи до {last}.',
      lockThreshold:'Нельзя: тир {tier} упадёт ниже порога в {need} очк.',
      applied:'План применён: {n} очк.', cleared:'Пассивные очки сброшены.',
      langName:'RU'
    },
    en: {
      nav_home:'Home', nav_codex:'Codex', nav_tools:'Tools', nav_passive:'Passive', nav_build:'Builds',
      passiveTitle:'Passive Tree', passiveEyebrow:'Per-class progression',
      passiveKicker:'200 floors • 20 tiers • 500 nodes',
      passiveIntro:'Pick a class and a goal — the plan is built floor by floor, no skipping.',
      pts:'pts', point:'point', budget:'Available points',
      ruleTitle:'Tree rule:',
      ruleBody:'a floor only opens when the floor above holds at least 1 point, and a tier only opens once the previous tier hits its threshold. Floors can never be skipped.',
      guideTitle:'Levelling advice', guideSub:'What to take on {cls} and why.',
      planTitle:'Generated plan', planSub:'{n} points placed, reaches floor {row}.',
      tierReached:'Reaches tier {tier}', applyPlan:'Apply plan', clearPlan:'Clear points',
      stepsTitle:'Next steps', stepsSub:'The next 8 investments from your current build state.',
      stepsDone:'Your allocation already matches the plan.',
      latticeKicker:'Interactive lattice', latticeTitle:'Tree by tier',
      latticeNote:'A star marks a node from the recommended plan. A lock means the floor is not open yet.',
      tierN:'Tier {n}', rowN:'Floor {n}', rowsRange:'floors {a}–{b}', milestone:'milestone',
      tierNeed:'Needs {need} pts in tier {prev} (currently {have})', startTier:'Starting tier',
      allocatedHere:'{n} points allocated here',
      recommended:'Recommended by the plan',
      leftover:'{n} points left unspent (node caps reached).',
      noPlan:'Raise the point budget to build a plan.',
      lockRow:'Floor {row} is locked: put at least 1 point into floor {prev} first. No skipping.',
      lockTier:'Tier {tier} is locked: {need} points needed in the previous tier (currently {have}).',
      lockRemove:'Cannot remove the last point of floor {row} — floors up to {last} depend on it.',
      lockThreshold:'Blocked: tier {tier} would drop below its {need} point threshold.',
      applied:'Plan applied: {n} points.', cleared:'Passive points cleared.',
      langName:'EN'
    }
  };
  function t(key, vars) {
    let s = (I18N[LANG] && I18N[LANG][key]) || (I18N.en[key]) || key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.split('{' + k + '}').join(String(v)); });
    return s;
  }
  function setLang(next) {
    LANG = next;
    try { localStorage.setItem('iac:lang', next); } catch {}
    document.documentElement.lang = next;
    setupNav();
    render({preserveViewport:false});
  }
  window.IA_SET_LANG = setLang;
  window.IA_GET_LANG = () => LANG;

  const ROUTES = [
    { id: 'home', label: 'Home', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8.25a.75.75 0 0 1-.75.75H14.5v-6h-5v6H3.75a.75.75 0 0 1-.75-.75z"/></svg>' },
    { id: 'codex', label: 'Codex', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.75A2.75 2.75 0 0 1 6.75 2H11v17H6.75A2.75 2.75 0 0 0 4 21.75zm16 0A2.75 2.75 0 0 0 17.25 2H13v17h4.25A2.75 2.75 0 0 1 20 21.75z"/></svg>' },
    { id: 'tools', label: 'Tools', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a5 5 0 0 0-6.37 6.37L3 18l3 3 5.33-5.33A5 5 0 0 0 17.7 9.3l-3.2 3.2-3-3z"/></svg>' },
    { id: 'passive', label: 'Passive', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a2.2 2.2 0 0 1 2.2 2.2c0 .9-.5 1.6-1.2 2v2.3h3.3a2.2 2.2 0 1 1 0 2.4H13v2.4h4.3a2.2 2.2 0 1 1 0 2.4H13v2.1c.7.4 1.2 1.1 1.2 2A2.2 2.2 0 1 1 11 19.6c0-.9.5-1.6 1.2-2v-2.1H7.9a2.2 2.2 0 1 1 0-2.4H12v-2.4H8.9a2.2 2.2 0 1 1 0-2.4H11V6.2c-.7-.4-1.2-1.1-1.2-2A2.2 2.2 0 0 1 12 2z"/></svg>' },
    { id: 'build', label: 'Builds', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V22l-6-3.6L6 22z"/></svg>' },
  ];

  const BUILD_SECTIONS = [
    ['character','Character'], ['skills','Skill Trees'], ['gear','Items, Affixes & Gems'],
    ['talismans','Talismans'], ['drop_bonuses','Drop Bonuses'], ['priorities','Stat Priorities'],
    ['stance','Combat Stance'], ['runes','Rune Grid'], ['pets','Pets']
  ];
  const GEM_FAMILIES = ['Amber','Garnet','Jade','Lapis'];
  const TALISMANS = ['Fury','Spirit','Iron','Recovery'];
  const STANCES = ['Aggressive','Beastmaster','Harmony'];
  const OFFENSE = ['Flat Attack Damage','Flat Pet Damage','% Attack Damage','% Pet Damage','Critical Chance','Critical Damage','Double Hit','Double Damage','Retaliation'];
  const DEFENSE = ['Max Health','Defense','Damage Reduction','Dodge Chance','Block Chance','Life on Hit','Life on Kill'];
  const PET_BONUSES = ['Attack Damage %','Pet Damage %','Health %','Dodge %','Block Chance','EXP Gain','Gold Gain','Item Quantity','Strength','Dexterity','Intelligence','Life on Kill','Life on Hit','Crit Chance','Double Hit','Double Damage','Crit Damage','Defense %','Strength %','Dexterity %','Intelligence %','All Skills','Pet Mastery'];
  const GEAR_SLOT_LABELS = { weapon1:'Weapon', weapon2:'Weapon 2', offhand:'Offhand', torch:'Torch', head:'Head', chest:'Chest', hands:'Hands', feet:'Feet', belt:'Belt', ring1:'Ring 1', ring2:'Ring 2', amulet:'Amulet' };
  const GEAR_GEMS = { weapon1:3, weapon2:3, offhand:0, torch:4, head:2, chest:2, hands:2, feet:2, belt:2, ring1:1, ring2:1, amulet:1 };
  const CLASS_NAMES = {1:'Warrior',2:'Archer',3:'Mage',4:'Rogue',5:'Druid'};

  const state = {
    data: null,
    route: location.hash.replace('#','') || 'home',
    codexTab: 'items',
    codexSearch: '',
    tool: 'upgrade',
    skillClassId: 1,
    skillBranchIndex: 0,
    passiveTier: 0,
    passiveClassId: 1,
    passiveProfile: 'balanced',
    passiveBudget: 120,
    runeConfig: { type:'', shape:'', secondary:'', word:'' },
    buildTab: 'overview',
    build: null,
    installPrompt: null,
    petCalc: null,
  };

  const PET_CALC_KEY = 'iac:web:petCalc';
  const PET_CALC_DEFAULTS = {rarity:'legendary',formula:'attack_pet_damage',base:'15',level:'0',progress:'0',sacRarity:'legendary',affix:'exp_gain',affixLevel:'1'};
  function petCalcState() {
    if (state.petCalc) return state.petCalc;
    try { state.petCalc = {...PET_CALC_DEFAULTS, ...JSON.parse(localStorage.getItem(PET_CALC_KEY) || '{}')}; }
    catch { state.petCalc = {...PET_CALC_DEFAULTS}; }
    return state.petCalc;
  }
  function savePetCalc() {
    try { localStorage.setItem(PET_CALC_KEY, JSON.stringify(petCalcState())); } catch {}
  }

  function defaultBuild() {
    return {
      v: 1,
      name: 'My Build',
      included: BUILD_SECTIONS.map(([id]) => id),
      level: null,
      classId: 1,
      classAlloc: {},
      passiveAlloc: {},
      gear: {},
      primaryStats: [],
      offensivePriority: [],
      defensivePriority: [],
      stance: '',
      talismans: [],
      dropBonuses: [],
      runes: [],
      pets: Array.from({length:4}, () => ({petId:null, bonus:''})),
    };
  }

  function normalizeBuild(input) {
    const d = defaultBuild();
    const b = {...d, ...(input || {})};
    b.included = Array.isArray(b.included) ? b.included : d.included;
    b.classAlloc = b.classAlloc || {};
    b.passiveAlloc = b.passiveAlloc || {};
    b.gear = b.gear || {};
    b.primaryStats = Array.isArray(b.primaryStats) ? b.primaryStats : [];
    b.offensivePriority = Array.isArray(b.offensivePriority) ? b.offensivePriority : [];
    b.defensivePriority = Array.isArray(b.defensivePriority) ? b.defensivePriority : [];
    b.talismans = Array.isArray(b.talismans) ? b.talismans.slice(0,2) : [];
    b.dropBonuses = Array.isArray(b.dropBonuses) ? b.dropBonuses : (Array.isArray(b.dropBonusIds) ? b.dropBonusIds : []);
    b.runes = Array.isArray(b.runes) ? b.runes : [];
    b.pets = Array.isArray(b.pets) ? b.pets.slice(0,4) : [];
    while (b.pets.length < 4) b.pets.push({petId:null, bonus:''});
    if (b.level === 1 && Object.keys(b.classAlloc).length === 0 && Object.keys(b.passiveAlloc).length === 0) b.level = null;
    return b;
  }

  function saveDraft() {
    localStorage.setItem('iac:web:draft', JSON.stringify(state.build));
  }

  function getSavedBuilds() {
    try { return JSON.parse(localStorage.getItem('iac:web:savedBuilds') || '{}'); } catch { return {}; }
  }

  function setSavedBuilds(map) {
    localStorage.setItem('iac:web:savedBuilds', JSON.stringify(map));
  }

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    $('#toastRoot').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function openModal(html, wide = false) {
    $('#modalRoot').innerHTML = `<div class="modal-backdrop" data-close-modal="1"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    $('.modal-backdrop').addEventListener('click', e => { if (e.target.dataset.closeModal) closeModal(); });
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }

  function go(route) {
    state.route = route;
    history.replaceState(null, '', `#${route}`);
    render({preserveViewport:false});
    window.scrollTo(0, 0);
  }

  async function loadData() {
    const [codex, materials, refs, skills] = await Promise.all([
      fetch('./data/item_codex_data.json').then(r => r.json()),
      fetch('./data/materials.json').then(r => r.json()),
      fetch('./data/reference_data.json').then(r => r.json()),
      fetch('./data/skill_tree_data.json').then(r => r.json()),
    ]);
    if (codex.drop_bonuses && !Array.isArray(codex.drop_bonuses)) {
      codex.drop_bonuses = Object.entries(codex.drop_bonuses).map(([id, value]) => ({ id, ...value }));
    }
    state.data = {codex, materials, refs, skills};
    try { state.build = normalizeBuild(JSON.parse(localStorage.getItem('iac:web:draft') || 'null')); }
    catch { state.build = defaultBuild(); }
    if (!state.build) state.build = defaultBuild();
    state.skillClassId = state.build.classId || 1;
  }

  function setupNav() {
    const side = ROUTES.map(r => `<button class="nav-btn" data-route="${r.id}"><span class="nav-icon">${r.icon}</span><span>${t('nav_'+r.id)}</span></button>`).join('');
    $('#sideNav').innerHTML = side;
    $('#bottomNav').innerHTML = side;
    $$('.brand').forEach(b => b.addEventListener('click', () => {
      if (window.parent && window.parent !== window) { window.parent.postMessage({type:'ia-flip'}, '*'); }
      else go('home');
    }));
    document.addEventListener('click', e => {
      const route = e.target.closest('[data-route]')?.dataset.route;
      if (route) go(route);
    });
  }

  function setTitle(title, eyebrow = 'IdleArc Companion') {
    $('#pageTitle').textContent = title;
    $('#eyebrow').textContent = eyebrow;
    document.body.dataset.route = state.route;
    const verified = state.data?.codex?.verified_date || 'current data';
    const meta = $('#appMeta');
    if (meta) meta.textContent = `${navigator.onLine ? 'online' : 'offline'} • web • data ${verified}`;
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.route === state.route));
  }

  function classById(id) { return state.data.skills.classes.find(c => Number(c.id) === Number(id)); }
  function allClassSkills(clsId) { const c = classById(clsId); return c ? c.branches.flatMap(b => b.skills.map(s => ({...s, branch:b.name}))) : []; }
  function itemVariant(itemName) { return state.data.codex.item_variants?.[itemName] || null; }
  function itemImage(item, tier = 1) {
    const v = itemVariant(item.name);
    const raw = v?.tiers?.[String(tier)]?.image || v?.tiers?.[tier]?.image;
    if (raw) return `./assets/items/${String(raw).split('/').pop()}`;
    const special = item.name === 'Sandals of Starszy' ? 'sandals' : slugify(item.name);
    return `./assets/items/${special}.webp`;
  }
  function petImage(pet) { return pet?.asset ? `./assets/${pet.asset}` : './icons/icon.svg'; }
  function skillImage(skill) { return skill?.asset ? `./assets/${skill.asset}` : './icons/icon.svg'; }
  function materialName(slug) { return state.data.materials.find(m => m.slug === slug)?.name || human(slug); }

  function render({preserveViewport=true} = {}) {
    if (!state.data) return;
    const viewport = preserveViewport ? {
      x: window.scrollX, y: window.scrollY, route: state.route,
      activeId: document.activeElement?.closest?.('#content') ? document.activeElement.id : '',
      selectionStart: typeof document.activeElement?.selectionStart === 'number' ? document.activeElement.selectionStart : null,
      selectionEnd: typeof document.activeElement?.selectionEnd === 'number' ? document.activeElement.selectionEnd : null,
      selectionDirection: document.activeElement?.selectionDirection || 'none'
    } : null;
    const content = $('#content');
    switch (state.route) {
      case 'codex': setTitle('Codex', 'Reference'); content.innerHTML = renderCodex(); bindCodex(); break;
      case 'tools': setTitle('Tools', 'Planning'); content.innerHTML = renderTools(); bindTools(); break;
      case 'passive': setTitle(t('passiveTitle'), t('passiveEyebrow')); content.innerHTML = renderPassivePage(); bindPassivePage(); break;
      case 'build': setTitle('Builds', 'Planner'); content.innerHTML = renderBuildStudio(); bindBuildStudio(); break;
      default: state.route = 'home'; setTitle('Home'); content.innerHTML = renderHome(); bindHome();
    }
    saveDraft();
    if (viewport) {
      const restore = () => {
        if (state.route !== viewport.route) return;
        if (viewport.activeId) {
          const next = document.getElementById(viewport.activeId);
          if (next && document.activeElement !== next) {
            try { next.focus({preventScroll:true}); } catch { next.focus(); }
            if (viewport.selectionStart !== null && typeof next.setSelectionRange === 'function') {
              try { next.setSelectionRange(viewport.selectionStart, viewport.selectionEnd, viewport.selectionDirection); } catch {}
            }
          }
        }
        window.scrollTo(viewport.x, viewport.y);
      };
      requestAnimationFrame(() => { restore(); setTimeout(restore, 80); });
    }
  }

  function renderHome() {
    return `
      <div class="home-dashboard">
        <button class="companion-search" data-global-search aria-label="Search items, materials, currencies, and more">
          <span class="search-glyph" aria-hidden="true">⌕</span>
          <span class="home-search-copy"><strong>Search the Companion</strong><small>Items, materials, currencies &amp; more</small></span>
          <span class="home-search-arrow" aria-hidden="true">›</span>
        </button>
        <section class="home-welcome panel">
          <h2>Your IdleArc toolkit, offline.</h2>
          <p>Plan builds, compare gear, calculate upgrades, and map skill trees.</p>
        </section>
        <div class="home-quick-label">Quick access</div>
      <div class="home-tool-grid">
          ${homeShortcut('upgrade','⇧','Upgrade','Exact costs')}
          ${homeShortcut('compare','⇄','Compare','Equipment side by side')}
          ${homeShortcut('skills','✦','Skill Trees','Class and Passive')}
          ${homeShortcut('codex','▤','Codex','Browse reference data')}
        </div>
      </div>
    `;
  }

  function homeShortcut(action, icon, title, body) {
    return `<button class="tool-card home-shortcut" data-home-action="${action}"><span class="tool-icon" aria-hidden="true">${icon}</span><span class="home-shortcut-copy"><strong>${title}</strong><small>${body}</small></span><span class="home-shortcut-arrow" aria-hidden="true">›</span></button>`;
  }

  function bindHome() {
    $('[data-global-search]')?.addEventListener('click', openGlobalSearch);
    $$('[data-home-action]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.homeAction;
      if (a === 'codex') return go('codex');
      state.tool = a; go('tools');
    }));
  }

  const CODEX_TABS = [
    ['items','Equipment'],['materials','Materials'],['currencies','Currencies'],['pets','Pets'],['runes','Runes'],['words','Rune Words'],['affixes','Affixes'],['drops','Drop Bonuses']
  ];

  const CODEX_CURRENCIES = ['Gold','Rubies','Arcstone','Guildstone','Pet Shards'];

  function renderCodex() {
    return `<div class="tabs">${CODEX_TABS.map(([id,label]) => `<button class="tab-btn ${state.codexTab===id?'active':''}" data-codex-tab="${id}">${label}</button>`).join('')}</div>
      <div class="search-row"><div class="field"><input id="codexSearch" class="input" type="search" placeholder="Search ${CODEX_TABS.find(x=>x[0]===state.codexTab)?.[1] || 'Codex'}…" value="${esc(state.codexSearch)}"></div></div>
      <div id="codexResults">${renderCodexResults()}</div>`;
  }

  function renderCodexResults() {
    const q = state.codexSearch.trim().toLowerCase();
    const {codex, materials, refs} = state.data;
    if (state.codexTab === 'items') {
      const rows = codex.items.filter(i => !q || [i.name,i.type,i.category,i.slot,CLASS_NAMES[i.allowed_classes?.[0]]].filter(Boolean).some(v => String(v).toLowerCase().includes(q)));
      return rows.length ? `<div class="card-list">${rows.map(i => `<button class="list-card clickable" data-item-name="${esc(i.name)}"><img class="thumb" src="${itemImage(i)}" alt=""><div class="list-main"><div class="list-title">${esc(i.name)}</div><div class="list-meta">${esc(human(i.type))}${i.allowed_classes?.length ? ` • ${i.allowed_classes.map(id=>CLASS_NAMES[id]).join(', ')}` : ''}</div></div><span class="pill">${esc(human(i.slot))}</span></button>`).join('')}</div>` : empty('No equipment matches that search.');
    }
    if (state.codexTab === 'materials') {
      const rows = materials.filter(m => !q || [m.name,m.slug,m.type,m.tier].some(v => String(v ?? '').toLowerCase().includes(q))).sort(byName);
      return rows.length ? `<div class="card-list">${rows.map(m => `<div class="list-card"><div class="thumb" style="display:grid;place-items:center;font-weight:900;color:var(--gold)">${esc((m.name||'?').slice(0,2).toUpperCase())}</div><div class="list-main"><div class="list-title">${esc(m.name)}</div><div class="list-meta">${esc(human(m.type))}${m.tier ? ` • Tier ${m.tier}` : ''}</div></div><span class="pill">${esc(m.slug)}</span></div>`).join('')}</div>` : empty('No materials match that search.');
    }
    if (state.codexTab === 'currencies') {
      const rows = CODEX_CURRENCIES.filter(name => !q || name.toLowerCase().includes(q));
      return rows.length ? `<div class="card-list">${rows.map(name => `<div class="list-card"><div class="thumb currency-mark" aria-hidden="true">${esc(name.slice(0,1))}</div><div class="list-main"><div class="list-title">${esc(name)}</div><div class="list-meta">In-game currency</div></div><span class="pill">Currency</span></div>`).join('')}</div>` : empty('No currencies match that search.');
    }
    if (state.codexTab === 'pets') {
      const rows = refs.pets.filter(p => !q || [p.name,p.type,p.description].some(v => String(v||'').toLowerCase().includes(q))).sort(byName);
      return `<div class="grid grid-2">${rows.map(p => `<div class="list-card"><img class="thumb large" src="${petImage(p)}" alt=""><div class="list-main"><div class="list-title">${esc(p.name)}</div><div class="list-meta">${esc(human(p.type))} • ${esc(p.description || '')}</div><div class="chips" style="margin-top:7px"><span class="pill">Damage ${fmtNum(p.damage_min_low)}–${fmtNum(p.damage_max_high)}</span></div></div></div>`).join('')}</div>`;
    }
    if (state.codexTab === 'runes') {
      const rows = refs.rune_types.filter(r => !q || [r.name,r.primary_stat,r.secondary_stat,r.color].some(v => String(v||'').toLowerCase().includes(q)));
      return `<div class="grid grid-2">${rows.map(r => `<div class="list-card"><div class="thumb" style="display:grid;place-items:center;background:${safeRuneColor(r.color)};font-weight:900">${esc(r.name.slice(0,2).toUpperCase())}</div><div class="list-main"><div class="list-title">${esc(r.name)}</div><div class="list-meta">Primary: ${esc(human(r.primary_stat))}<br>Secondary: ${esc(human(r.secondary_stat))}</div></div></div>`).join('')}</div>
      <h2 class="section-title">Shapes</h2><div class="grid grid-3">${refs.rune_shapes.map(s => `<div class="panel"><strong>${esc(s.name)}</strong><div class="list-meta">${esc(s.size)} • ${fmtNum(s.efficiency)}× efficiency</div></div>`).join('')}</div>`;
    }
    if (state.codexTab === 'words') {
      const rows = refs.rune_words.filter(w => !q || [w.name,w.requirements,w.base_stats].some(v => String(v||'').toLowerCase().includes(q))).sort(byName);
      return `<div class="card-list">${rows.map(w => `<div class="list-card"><div class="thumb" style="display:grid;place-items:center;font-weight:900;color:#dacfff">${w.rune_count}</div><div class="list-main"><div class="list-title">${esc(w.name)}</div><div class="list-meta">${esc(w.requirements)}</div><div class="list-meta" style="color:#cfd8ea;margin-top:4px">${esc(w.base_stats)}</div></div><span class="pill accent">${w.rune_count} runes</span></div>`).join('')}</div>`;
    }
    if (state.codexTab === 'affixes') {
      const rows = codex.affixes.filter(a => !q || JSON.stringify(a).toLowerCase().includes(q)).sort(byName);
      return `<div class="card-list">${rows.map(a => `<div class="list-card"><div class="list-main"><div class="list-title">${esc(a.name || a.stat || `Affix ${a.id}`)}</div><div class="list-meta">${esc(human(a.stat || a.key || ''))}</div>${a.applicable_to ? `<div class="chips" style="margin-top:6px">${a.applicable_to.slice(0,8).map(x=>`<span class="pill">${esc(human(x))}</span>`).join('')}</div>`:''}</div><span class="pill">#${esc(a.id)}</span></div>`).join('')}</div>`;
    }
    const rows = codex.drop_bonuses.filter(d => !q || JSON.stringify(d).toLowerCase().includes(q)).sort(byName);
    return `<div class="card-list">${rows.map(d => `<div class="list-card"><div class="list-main"><div class="list-title">${esc(d.name || d.id)}</div><div class="list-meta">${esc(d.description || human(d.stat || d.key || ''))}</div></div><span class="pill accent">${esc(d.id)}</span></div>`).join('')}</div>`;
  }

  function safeRuneColor(color) {
    return ({red:'#7e2f48',green:'#246d4a',blue:'#284f8a',pink:'#7d436f',purple:'#513b86',orange:'#8b5c27',cyan:'#246f78'})[String(color).toLowerCase()] || '#24304a';
  }
  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }

  function bindCodex() {
    $$('[data-codex-tab]').forEach(b => b.addEventListener('click', () => { state.codexTab = b.dataset.codexTab; state.codexSearch=''; render(); }));
    $('#codexSearch')?.addEventListener('input', e => { state.codexSearch = e.target.value; $('#codexResults').innerHTML = renderCodexResults(); bindCodexResultActions(); });
    bindCodexResultActions();
  }
  function bindCodexResultActions() {
    $$('[data-item-name]').forEach(b => b.addEventListener('click', () => showItem(b.dataset.itemName)));
  }

  function showItem(name) {
    const {codex} = state.data;
    const item = codex.items.find(i => i.name === name); if (!item) return;
    const rows = Object.entries(item.implicit_by_tier || {}).map(([tier,v]) => `<tr><td>T${tier} ${esc(codex.tiers[tier]?.name || '')}</td><td>${fmtInt(v.min)}–${fmtInt(v.max)}</td><td>${v.affix_slots ?? codex.tiers[tier]?.affix_slots ?? ''}</td></tr>`).join('');
    const aliases = itemVariant(name);
    const aliasText = aliases ? Object.entries(aliases.tiers || {}).map(([t,v]) => `T${t}: ${v.name}`).join(' • ') : '';
    openModal(`<div class="modal-head"><div class="item-detail-head"><img class="thumb large" src="${itemImage(item)}" alt=""><div><h2>${esc(item.name)}</h2><div class="list-meta">${esc(human(item.type))} • ${esc(human(item.slot))}</div></div></div><button class="modal-close" data-modal-close>×</button></div>
      ${aliasText ? `<div class="panel-sub">${esc(aliasText)}</div>` : ''}
      <div class="hr"></div>
      <dl class="kv"><dt>Implicit</dt><dd>${esc(human(item.implicit_stat))}${item.damage_label ? ` • ${esc(item.damage_label)}` : ''}</dd><dt>Base value</dt><dd>${fmtNum(item.base_value)}</dd><dt>Classes</dt><dd>${item.allowed_classes?.length ? item.allowed_classes.map(id=>CLASS_NAMES[id]).join(', ') : 'All compatible classes'}</dd>${item.drop_note?`<dt>Drop note</dt><dd>${esc(item.drop_note)}</dd>`:''}</dl>
      <h3 class="section-title">Tier implicit ranges</h3><div class="scroll-x"><table class="tier-table"><thead><tr><th>Tier</th><th>Range</th><th>Affix slots</th></tr></thead><tbody>${rows}</tbody></table></div>`, true);
    $('[data-modal-close]')?.addEventListener('click', closeModal);
  }

  function renderTools() {
    const tabs = [['upgrade','Upgrade'],['compare','Compare'],['skills','Skills'],['pets','Pets']];
    return `<div class="tabs">${tabs.map(([id,label])=>`<button class="tab-btn ${state.tool===id?'active':''}" data-tool-tab="${id}">${label}</button>`).join('')}</div><div id="toolBody">${renderToolBody()}</div>`;
  }

  function renderToolBody() {
    return state.tool==='compare'?renderCompareTool():state.tool==='skills'?renderSkillTool():state.tool==='pets'?renderPetTool():renderUpgradeTool();
  }

  function bindToolBody() {
    if (state.tool === 'upgrade') bindUpgradeTool();
    if (state.tool === 'compare') bindCompareTool();
    if (state.tool === 'skills') bindSkillTool();
    if (state.tool === 'pets') bindPetTool();
  }

  function bindTools() {
    $$('[data-tool-tab]').forEach(b => b.addEventListener('click', () => {
      state.tool=b.dataset.toolTab;
      $$('[data-tool-tab]').forEach(tab=>tab.classList.toggle('active',tab.dataset.toolTab===state.tool));
      const body=$('#toolBody');
      if(!body)return;
      body.innerHTML=renderToolBody();
      bindToolBody();
    }));
    bindToolBody();
  }

  const PET_CALC_RARITIES = {uncommon:{label:'Uncommon',sacrifice:1,perLevel:3},rare:{label:'Rare',sacrifice:2,perLevel:4},epic:{label:'Epic',sacrifice:4,perLevel:5},legendary:{label:'Legendary',sacrifice:8,perLevel:8}};
  const PET_AFFIX_RULES = {exp_gain:{label:'EXP Gain',base:1,step:.2,suffix:'%'},gold_gain:{label:'Gold Gain',base:1,step:.2,suffix:'%'},item_quantity:{label:'Item Quantity',base:1,step:.1,suffix:'%'},material_quantity:{label:'Material Quantity',base:1,step:.1,suffix:'%'},ruby_drops:{label:'Ruby Drops',base:1,step:.1,suffix:'%'},rune_drops:{label:'Rune Drops',base:1,step:.1,suffix:'%'},element_conversion:{label:'Damage Converted to Element',base:5,step:.5,suffix:'%'},all_skills:{label:'All Class Skills',base:1,step:1,suffix:'',max:2,special:'allskills'},extra_kill:{label:'Extra Kill Chance',base:3,step:0,suffix:'%',max:1,fixed:true}};
  function petCompoundValue(rarity,formula,base,levels) {
    const n=Math.max(0,Number(levels)||0);
    if(formula==='fixed')return base;
    if(formula==='attribute_percent')return base+n*(rarity==='legendary'?3:1);
    if(formula==='attack_pet_damage'){if(rarity!=='legendary')return base*(1+.10*n);const a=Math.min(n,10),b=Math.min(Math.max(n-10,0),10),c=Math.max(n-20,0);return base*(1+.20*a+.10*b+.05*c);}
    return base*(1+n*(rarity==='legendary'?.20:.10));
  }
  function petAffixValue(rule,level){let l=Math.max(1,Number(level)||1);if(rule.max)l=Math.min(l,rule.max);if(rule.special==='allskills')return l>=2?2:1;return rule.base+(l-1)*rule.step;}
  function petAffixNextCost(rule,level){const l=Math.max(1,Number(level)||1);if(rule.fixed||(rule.max&&l>=rule.max))return null;return Math.floor(l/20)+1;}
  function petAffixTotalCost(rule,target){if(rule.fixed)return 0;let t=Math.max(1,Number(target)||1);if(rule.max)t=Math.min(t,rule.max);let total=0;for(let l=1;l<t;l++)total+=Math.floor(l/20)+1;return total;}
  function petNumberField(id,label,value,min=0,max=''){return `<div class="field"><label for="${id}">${label}</label><div class="pet-stepper"><button type="button" class="pet-step-btn" data-pet-step="${id}" data-delta="-1" aria-label="Decrease ${label}">−</button><input id="${id}" class="input pet-number-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" data-min="${min}" ${max!==''?`data-max="${max}"`:''} value="${esc(value)}" aria-label="${label}"><button type="button" class="pet-step-btn" data-pet-step="${id}" data-delta="1" aria-label="Increase ${label}">+</button></div><small class="pet-field-help">Tap the number to type, or use +/− to adjust by one.</small></div>`;}
  function renderPetTool(){
    const v=petCalcState(), opts=Object.entries(PET_CALC_RARITIES), affixOptions=Object.entries(PET_AFFIX_RULES).map(([id,r])=>`<option value="${id}" ${v.affix===id?'selected':''}>${esc(r.label)}</option>`).join('');
    return `<div class="pet-calc-layout"><section class="panel pet-calc-card"><div class="panel-head"><div><div class="section-kicker">Pet progression</div><h2 class="panel-title">Compound Calculator</h2><p class="panel-sub">Plan Compound levels, sacrifice points, and projected Hatch Bonus value.</p></div><span class="pill accent">Season 2</span></div>
      <div class="field-row"><div class="field"><label for="petRarity">Target rarity</label><select id="petRarity" class="select">${opts.map(([id,r])=>`<option value="${id}" ${v.rarity===id?'selected':''}>${r.label}</option>`).join('')}</select></div><div class="field"><label for="petFormula">Hatch Bonus scaling</label><select id="petFormula" class="select"><option value="attack_pet_damage" ${v.formula==='attack_pet_damage'?'selected':''}>Attack / Pet Damage</option><option value="standard" ${v.formula==='standard'?'selected':''}>Standard Hatch Bonus</option><option value="attribute_percent" ${v.formula==='attribute_percent'?'selected':''}>STR / DEX / INT %</option><option value="fixed" ${v.formula==='fixed'?'selected':''}>Fixed / non-scaling</option></select></div></div>
      <div class="field-row pet-fields-row"><div class="field"><label for="petBase">Base bonus</label><input id="petBase" class="input" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="${esc(v.base)}"></div>${petNumberField('petLevel','Compound level',v.level)}</div>
      <div class="field-row pet-fields-row">${petNumberField('petProgress','Current compound points',v.progress)}<div class="field"><label for="petSacRarity">Sacrifice rarity</label><select id="petSacRarity" class="select">${opts.map(([id,r])=>`<option value="${id}" ${v.sacRarity===id?'selected':''}>${r.label} • ${r.sacrifice} pt</option>`).join('')}</select></div></div>
      <div id="petCompoundResult" class="pet-result" aria-live="polite"></div><p class="calc-note">Projection uses the recovered Compound scaling rules. The game server determines final rounding, effective caps, and special-case previews.</p></section>
      <section class="panel pet-calc-card"><div class="panel-head"><div><div class="section-kicker">Pet Shards</div><h2 class="panel-title">Pet Affix Calculator</h2><p class="panel-sub">Check current affix values and the shard cost to upgrade.</p></div></div>
      <div class="field-row"><div class="field"><label for="petAffix">Affix</label><select id="petAffix" class="select">${affixOptions}</select></div>${petNumberField('petAffixLevel','Affix level',v.affixLevel,1,PET_AFFIX_RULES[v.affix]?.max||'')}</div>
      <div class="pet-quick-steps" aria-label="Quickly increase affix level"><span>Quick add</span>${[10,25,50,100].map(n=>`<button type="button" class="pet-quick-step" data-pet-adjust="petAffixLevel" data-amount="${n}" aria-label="Add ${n} affix levels">+${n}</button>`).join('')}</div>
      <div id="petAffixResult" class="pet-result" aria-live="polite"></div><p class="calc-note">Next-level shard cost = floor(current level ÷ 20) + 1. Captured Level 95 Item Quantity is 10.4% with a 5-shard next upgrade.</p></section></div>`;
  }
  function bindPetTool(){
    const v=petCalcState();
    const compound=()=>{v.rarity=$('#petRarity').value;v.formula=$('#petFormula').value;v.base=$('#petBase').value;v.level=$('#petLevel').value;v.progress=$('#petProgress').value;v.sacRarity=$('#petSacRarity').value;savePetCalc();const base=Math.max(0,Number(v.base)||0),level=Math.max(0,Number(v.level)||0),progress=Math.max(0,Number(v.progress)||0),rr=PET_CALC_RARITIES[v.rarity],sr=PET_CALC_RARITIES[v.sacRarity],active=petCompoundValue(v.rarity,v.formula,base,level),mod=progress%rr.perLevel,remaining=mod===0&&progress>0?0:rr.perLevel-mod,count=remaining<=0?0:Math.ceil(remaining/sr.sacrifice);$('#petCompoundResult').innerHTML=`<div class="metric-row"><div class="metric"><strong>${fmtNum(active)}</strong><span>projected active bonus</span></div><div class="metric"><strong>${rr.perLevel}</strong><span>points per level</span></div></div><div class="pet-result-line"><b>${remaining<=0?'Next level ready':`${remaining} points remaining`}</b><span>${remaining<=0?'You have enough progress.':`${count} ${sr.label} sacrifice${count===1?'':'s'}`}</span></div>`;};
    const affix=(commit=false)=>{v.affix=$('#petAffix').value;const rule=PET_AFFIX_RULES[v.affix],input=$('#petAffixLevel'),raw=input.value;let level=Math.max(1,Number(raw)||1);if(rule.max)level=Math.min(level,rule.max);input.dataset.max=rule.max||'';if(commit){input.value=String(level);v.affixLevel=input.value;}else{v.affixLevel=raw;}savePetCalc();const current=petAffixValue(rule,level),next=petAffixNextCost(rule,level),total=petAffixTotalCost(rule,level);$('#petAffixResult').innerHTML=`<div class="metric-row"><div class="metric"><strong>+${fmtNum(current)}${rule.suffix}</strong><span>current value</span></div><div class="metric"><strong>${next==null?'Max / fixed':next}</strong><span>${next==null?'next upgrade':'shards next'}</span></div></div><div class="pet-result-line"><b>${fmtInt(total)} Pet Shards</b><span>total from Level 1 to ${Math.min(level,rule.max||level)}</span></div>`;};
    ['petRarity','petFormula','petBase','petLevel','petProgress','petSacRarity'].forEach(id=>$('#'+id)?.addEventListener(['petBase','petLevel','petProgress'].includes(id)?'input':'change',compound));
    $('#petAffix')?.addEventListener('change',()=>affix(true));
    $('#petAffixLevel')?.addEventListener('input',()=>affix(false));
    $('#petAffixLevel')?.addEventListener('change',()=>affix(true));
    $('#petAffixLevel')?.addEventListener('blur',()=>affix(true));
    const adjustLevel=(input,delta)=>{const min=Number(input.dataset.min??input.min??0),rawMax=input.dataset.max??input.max,max=rawMax===''?Infinity:Number(rawMax),current=Number(input.value)||0;input.value=String(Math.max(min,Math.min(max,current+delta)));input.dispatchEvent(new Event('input',{bubbles:true}));};
    $$('[data-pet-step]').forEach(b=>b.addEventListener('click',()=>adjustLevel($('#'+b.dataset.petStep),Number(b.dataset.delta))));
    $$('[data-pet-adjust]').forEach(b=>b.addEventListener('click',()=>adjustLevel($('#'+b.dataset.petAdjust),Number(b.dataset.amount))));
    compound();affix();
  }

  function stages() {
    const out=[];
    for (let t=1;t<=6;t++) out.push({id:`T${t}`, label:`T${t} ${state.data.codex.tiers[String(t)]?.name || ''}`, tier:t, rank:null});
    for (let r=1;r<=30;r++) out.push({id:`A${r}`, label:`A${r} Awakened`, tier:null, rank:r});
    return out;
  }
  function stageMax(s) { return s.tier ? Number(state.data.codex.tiers[String(s.tier)].max_level) : 30; }
  function stageRows(s) { return s.tier ? state.data.codex.tiers[String(s.tier)].rows : state.data.codex.awaken.rows[String(s.rank)]; }
  function stageOptions(selected) { return stages().map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${esc(s.label)}</option>`).join(''); }
  function levelOptions(stageId, selected) { const s=stages().find(x=>x.id===stageId) || stages()[0]; return Array.from({length:stageMax(s)+1},(_,i)=>`<option value="${i}" ${Number(selected)===i?'selected':''}>+${i}</option>`).join(''); }

  function renderUpgradeTool() {
    return `<div class="grid grid-2"><div class="panel"><div class="panel-head"><div><h2 class="panel-title">Exact base-cost route</h2><p class="panel-sub">Adds configured upgrade rows and promotions. Failed attempts are not included, matching the Android planner.</p></div></div>
      <div class="field-row"><div class="field"><label>Current stage</label><select id="upCurrentStage" class="select">${stageOptions('T1')}</select></div><div class="field"><label>Current +level</label><select id="upCurrentLevel" class="select">${levelOptions('T1',0)}</select></div></div>
      <div class="field-row" style="margin-top:10px"><div class="field"><label>Target stage</label><select id="upTargetStage" class="select">${stageOptions('T6')}</select></div><div class="field"><label>Target +level</label><select id="upTargetLevel" class="select">${levelOptions('T6',30)}</select></div></div>
      <button id="calcUpgrade" class="primary-btn" style="margin-top:12px">Calculate route</button></div>
      <div class="panel" id="upgradeResult"><div class="empty">Choose a route and calculate it.</div></div></div>`;
  }

  function bindUpgradeTool() {
    const refreshLevels = (stageEl, levelEl) => { levelEl.innerHTML = levelOptions(stageEl.value, Math.min(Number(levelEl.value||0), stageMax(stages().find(s=>s.id===stageEl.value)))); };
    $('#upCurrentStage').addEventListener('change',()=>refreshLevels($('#upCurrentStage'),$('#upCurrentLevel')));
    $('#upTargetStage').addEventListener('change',()=>refreshLevels($('#upTargetStage'),$('#upTargetLevel')));
    $('#calcUpgrade').addEventListener('click', () => {
      const result = calculateUpgrade($('#upCurrentStage').value, Number($('#upCurrentLevel').value), $('#upTargetStage').value, Number($('#upTargetLevel').value));
      $('#upgradeResult').innerHTML = renderUpgradeResult(result);
    });
  }

  function addMat(map, slug, qty) { map[slug] = (map[slug] || 0n) + BigInt(qty || 0); }
  function calculateUpgrade(currentId, currentLevel, targetId, targetLevel) {
    const list=stages(), ci=list.findIndex(s=>s.id===currentId), ti=list.findIndex(s=>s.id===targetId);
    if (ci < 0 || ti < 0 || ti < ci || (ci===ti && targetLevel<currentLevel)) return {valid:false,message:'Target must be at or after your current progression.'};
    let gold=0n, mats={}, attempts=0, idx=ci, level=currentLevel;
    const addRow = row => {
      gold += BigInt(row.gold || 0); addMat(mats,row.fragment_slug,row.fragments);
      Object.entries(row.monster_materials||{}).forEach(([k,v])=>addMat(mats,k,v));
      if (Array.isArray(row.extra_materials)) row.extra_materials.forEach(x=>addMat(mats,x.slug,x.quantity));
      else Object.entries(row.extra_materials||{}).forEach(([k,v])=>addMat(mats,k,v));
      attempts++;
    };
    const addTransition = (from,to) => {
      if (from.tier && from.tier < 6) {
        const p = state.data.codex.tier_upgrades.find(x=>Number(x.from_tier)===from.tier);
        gold += BigInt(p.gold || 0); addMat(mats,p.essence.slug,p.essence.quantity); Object.entries(p.monster_materials||{}).forEach(([k,v])=>addMat(mats,k,v));
      } else {
        const rank = from.tier===6 ? 1 : to.rank;
        const t = state.data.codex.awaken.transitions.find(x=>Number(x.rank)===rank);
        gold += BigInt(t.gold || 0); (t.materials||[]).forEach(x=>addMat(mats,x.slug,x.quantity));
      }
      attempts++;
    };
    while (idx < ti) {
      const s=list[idx], rows=stageRows(s), max=stageMax(s);
      while (level < max) { const row=rows.find(r=>Number(r.current)===level); if(!row) return {valid:false,message:`Missing configured row for ${s.id} +${level}.`}; addRow(row); level++; }
      addTransition(s,list[idx+1]); idx++; level=0;
    }
    const s=list[ti], rows=stageRows(s);
    while (level < targetLevel) { const row=rows.find(r=>Number(r.current)===level); if(!row) return {valid:false,message:`Missing configured row for ${s.id} +${level}.`}; addRow(row); level++; }
    return {valid:true,gold,mats,attempts,message:'Base configured route. Failed attempts are not included.'};
  }

  function renderUpgradeResult(r) {
    if (!r.valid) return `<div class="empty">${esc(r.message)}</div>`;
    const mats = Object.entries(r.mats).sort((a,b)=>materialName(a[0]).localeCompare(materialName(b[0])));
    return `<div class="panel-head"><div><h2 class="panel-title">Route total</h2><p class="panel-sub">${esc(r.message)}</p></div><span class="pill accent">${r.attempts} configured steps</span></div>
      <div class="metric-row"><div class="metric"><strong>${fmtInt(r.gold)}</strong><span>Gold</span></div><div class="metric"><strong>${mats.length}</strong><span>material types</span></div></div>
      <div class="hr"></div><div class="card-list">${mats.map(([slug,qty])=>`<div class="list-card"><div class="list-main"><div class="list-title">${esc(materialName(slug))}</div><div class="list-meta">${esc(slug)}</div></div><strong>${fmtInt(qty)}</strong></div>`).join('')}</div>`;
  }

  function renderCompareTool() {
    const options = state.data.codex.items.slice().sort(byName).map(i=>`<option value="${esc(i.name)}">${esc(i.name)}</option>`).join('');
    return `<div class="panel"><div class="field-row three"><div class="field"><label>Item A</label><select id="cmpA" class="select"><option value="">Choose item</option>${options}</select></div><div class="field"><label>Item B</label><select id="cmpB" class="select"><option value="">Choose item</option>${options}</select></div><div class="field"><label>Tier</label><select id="cmpTier" class="select">${[1,2,3,4,5,6].map(t=>`<option value="${t}">T${t} ${esc(state.data.codex.tiers[String(t)].name)}</option>`).join('')}</select></div></div></div><div id="compareResult" style="margin-top:14px">${empty('Choose two items to compare.')}</div>`;
  }
  function bindCompareTool() {
    const update=()=>$('#compareResult').innerHTML=renderCompareResult($('#cmpA').value,$('#cmpB').value,Number($('#cmpTier').value));
    ['cmpA','cmpB','cmpTier'].forEach(id=>$('#'+id).addEventListener('change',update));
  }
  function renderCompareResult(aName,bName,tier) {
    if(!aName||!bName) return empty('Choose two items to compare.');
    const a=state.data.codex.items.find(i=>i.name===aName), b=state.data.codex.items.find(i=>i.name===bName);
    const av=a.implicit_by_tier?.[String(tier)], bv=b.implicit_by_tier?.[String(tier)];
    const card=i=>`<div class="panel"><div class="item-detail-head"><img class="thumb large" src="${itemImage(i,tier)}" alt=""><div><h2 style="margin:0;font-size:18px">${esc(i.name)}</h2><div class="list-meta">${esc(human(i.type))}</div></div></div><div class="hr"></div><dl class="kv"><dt>Implicit</dt><dd>${esc(human(i.implicit_stat))}</dd><dt>Range</dt><dd>${i.implicit_by_tier?.[String(tier)]?`${fmtInt(i.implicit_by_tier[String(tier)].min)}–${fmtInt(i.implicit_by_tier[String(tier)].max)}`:'Not configured'}</dd><dt>Affix slots</dt><dd>${i.implicit_by_tier?.[String(tier)]?.affix_slots ?? state.data.codex.tiers[String(tier)].affix_slots}</dd><dt>Two-handed</dt><dd>${i.two_handed?'Yes':'No'}</dd><dt>Classes</dt><dd>${i.allowed_classes?.length?i.allowed_classes.map(id=>CLASS_NAMES[id]).join(', '):'General'}</dd></dl></div>`;
    return `<div class="grid grid-2">${card(a)}${card(b)}</div>${av&&bv&&a.implicit_stat===b.implicit_stat?`<div class="panel" style="margin-top:14px"><strong>Range difference</strong><div class="list-meta" style="margin-top:5px">Max: ${fmtInt(BigInt(bv.max)-BigInt(av.max))} (B − A) • Min: ${fmtInt(BigInt(bv.min)-BigInt(av.min))} (B − A)</div></div>`:''}`;
  }

  function renderSkillTool() {
    const cls=classById(state.skillClassId) || state.data.skills.classes[0];
    const alloc=state.build.classAlloc;
    const spent=Object.values(alloc).reduce((n,v)=>n+Number(v||0),0);
    const pSpent=Object.values(state.build.passiveAlloc).reduce((n,v)=>n+Number(v||0),0);
    const tierCount=state.data.skills.passive.tiers.length;
    const tier=Math.max(0,Math.min(tierCount-1,Number(state.passiveTier||0)));
    state.passiveTier=tier;
    const branchIndex=Math.max(0,Math.min(cls.branches.length-1,Number(state.skillBranchIndex||0)));
    state.skillBranchIndex=branchIndex;
    const branch=cls.branches[branchIndex];
    return `<section class="skill-command panel">
      <div class="panel-head"><div><div class="section-kicker">Build-linked planner</div><h2 class="panel-title">${esc(cls.name)} Skill Tree</h2><p class="panel-sub">Pick a class and branch, then work downward through its tiers. Allocations stay linked to Build Studio.</p></div><span class="pill accent">${spent} class pts • ${pSpent} passive pts</span></div>
      <div class="class-selector">${state.data.skills.classes.map(c=>`<button class="class-selector-btn ${Number(c.id)===Number(cls.id)?'active':''}" data-skill-class="${c.id}"><span class="class-orb">${esc(c.name.slice(0,1))}</span><span>${esc(c.name)}</span></button>`).join('')}</div>
      <div class="skill-branch-selector">${cls.branches.map((b,i)=>`<button class="skill-branch-btn ${i===branchIndex?'active':''}" data-skill-branch="${i}"><span>${esc(b.name)}</span><small>${b.skills.length} skills</small></button>`).join('')}</div>
      <div class="class-tree-scroll"><div class="class-tree">${renderSkillBranch(branch,branchIndex)}</div></div>
    </section>
    <section class="passive-section">
      <div class="passive-heading"><div><div class="section-kicker">20 tiers • 500 nodes</div><h2 class="section-title">Passive Skill Tree</h2><p class="section-note">One tier at a time keeps the lattice readable on a phone while preserving the actual progression.</p></div><span class="pill accent">Tier ${tier+1}</span></div>
      <div class="passive-tier-strip">${state.data.skills.passive.tiers.map((t,i)=>`<button class="passive-tier-btn ${i===tier?'active':''} ${passiveTierSpent(i)?'has-points':''}" data-passive-tier="${i}" title="Tier ${i+1}">${i+1}</button>`).join('')}</div>
      ${renderPassiveTier(tier)}
    </section>`;
  }

  function classBranchProgress(branch) {
    const alloc=state.build.classAlloc;
    const tier1=branch.skills.filter(s=>Number(s.tier)===1).reduce((n,s)=>n+Number(alloc[String(s.id)]||0),0);
    const tier2=branch.skills.filter(s=>Number(s.tier)===2).reduce((n,s)=>n+Number(alloc[String(s.id)]||0),0);
    return {tier1,tier2,total:tier1+tier2+branch.skills.filter(s=>Number(s.tier)===3).reduce((n,s)=>n+Number(alloc[String(s.id)]||0),0)};
  }
  function prerequisiteIds(skill) {
    return (skill.prerequisites||[]).map(p=>Number(typeof p==='object'?p.id:p)).filter(Number.isFinite);
  }
  function skillUnlockState(branch, skill, alloc=state.build.classAlloc) {
    const progress=classBranchProgress(branch);
    const tier=Number(skill.tier||1);
    const gateMet=tier===1 || (tier===2 ? progress.tier1>=Number(skill.points_required_to_unlock||5) : progress.tier1+progress.tier2>=Number(skill.points_required_to_unlock||10));
    const missing=prerequisiteIds(skill).find(id=>Number(alloc[String(id)]||0)<=0);
    const prereq=missing?allClassSkills(state.skillClassId).find(s=>Number(s.id)===missing):null;
    return {unlocked:gateMet&&!missing,gateMet,missing,prereq,progress};
  }
  function canClassSkillChange(id,delta) {
    const cls=classById(state.skillClassId); if(!cls)return false;
    let branch=null,skill=null;
    for(const b of cls.branches){const found=b.skills.find(s=>Number(s.id)===Number(id));if(found){branch=b;skill=found;break;}}
    if(!branch||!skill)return false;
    const alloc={...state.build.classAlloc};
    const cur=Number(alloc[String(id)]||0), next=cur+delta;
    if(next<0||next>Number(skill.max_rank))return false;
    if(delta>0 && !skillUnlockState(branch,skill,alloc).unlocked)return false;
    if(next)alloc[String(id)]=next; else delete alloc[String(id)];
    // Every already-learned skill must remain legal after a removal.
    for(const b of cls.branches){
      const tier1=b.skills.filter(s=>Number(s.tier)===1).reduce((n,s)=>n+Number(alloc[String(s.id)]||0),0);
      const tier2=b.skills.filter(s=>Number(s.tier)===2).reduce((n,s)=>n+Number(alloc[String(s.id)]||0),0);
      for(const s of b.skills){
        if(Number(alloc[String(s.id)]||0)<=0)continue;
        const t=Number(s.tier||1);
        if(t===2 && tier1<Number(s.points_required_to_unlock||5))return false;
        if(t===3 && tier1+tier2<Number(s.points_required_to_unlock||10))return false;
        if(prerequisiteIds(s).some(pid=>Number(alloc[String(pid)]||0)<=0))return false;
      }
    }
    return true;
  }

  function renderSkillBranch(branch, branchIndex) {
    const tiers=[1,2,3];
    return `<section class="skill-lane focused"><div class="skill-lane-title"><span>${esc(branch.name)}</span><small>${branch.skills.length} skills • branch ${branchIndex+1}</small></div><div class="skill-tier-track">${tiers.map(t=>{
      const skills=branch.skills.filter(s=>Number(s.tier)===t);
      return `<div class="skill-tier-column"><div class="skill-tier-label"><span>Tier ${t}</span><small>${t===1?'Open':`${t===2?5:10} branch pts`}</small></div><div class="skill-tier-nodes">${skills.map(skill=>renderSkillNode(branch,skill)).join('')}</div></div>`;
    }).join('')}</div></section>`;
  }

  function renderSkillNode(branch, skill) {
    const rank=Number(state.build.classAlloc[String(skill.id)]||0);
    const active=rank>0, maxed=rank>=skill.max_rank, unlock=skillUnlockState(branch,skill);
    const canAdd=canClassSkillChange(skill.id,1), canRemove=canClassSkillChange(skill.id,-1);
    const lockText=!unlock.gateMet ? `Unlocks at ${skill.points_required_to_unlock} branch points` : (unlock.prereq ? `Requires ${unlock.prereq.name}` : '');
    return `<article class="skill-node tree-node ${active?'active':''} ${maxed?'maxed':''} ${!unlock.unlocked&&!active?'locked':''}">
      <button class="skill-art-button" data-skill-inc="${skill.id}" title="${canAdd?`Add point to ${esc(skill.name)}`:esc(lockText||'Unavailable')}" ${canAdd?'':'disabled'}><img src="${skillImage(skill)}" alt=""><span class="skill-rank-badge">${rank}/${skill.max_rank}</span></button>
      <div class="skill-node-copy"><h4>${esc(skill.name)}</h4><p>${esc(skill.description)}</p>${lockText?`<div class="skill-lock-note">${esc(lockText)}</div>`:''}</div>
      <div class="rank-box compact"><button data-skill-dec="${skill.id}" ${canRemove?'':'disabled'}>−</button><span>${rank}/${skill.max_rank}</span><button data-skill-inc="${skill.id}" ${canAdd?'':'disabled'}>+</button></div>
    </article>`;
  }

  function passiveKey(rowIndex,nodeIndex,node) { return `${rowIndex}:${nodeIndex}:${node.stat}`; }
  function passiveTierSpent(tierIndex) {
    const tier=state.data.skills.passive.tiers[tierIndex]; if(!tier)return 0;
    let total=0;
    for(let ri=tier.start_row;ri<=tier.end_row;ri++){
      const row=state.data.skills.passive.rows[ri];
      row?.nodes?.forEach((node,ni)=>{total+=Number(state.build.passiveAlloc[passiveKey(ri,ni,node)]||0);});
    }
    return total;
  }
  function renderPassiveTier(tierIndex, planAlloc) {
    const tier=state.data.skills.passive.tiers[tierIndex];
    if(!tier)return empty('Passive tier unavailable.');
    const unlocked=passiveTierUnlocked(tierIndex);
    const rows=[];
    for(let ri=tier.start_row;ri<=tier.end_row;ri++){
      const row=state.data.skills.passive.rows[ri]; if(!row)continue;
      const rowOpen = unlocked && passiveRowUnlocked(ri);
      const isNext = rowOpen && passiveRowSpent(ri)===0;
      rows.push(`<div class="passive-lattice-row ${row.milestone?'milestone':''} ${rowOpen?'':'row-locked'} ${isNext?'row-next':''}">
        <div class="passive-row-index" title="${t('rowN',{n:ri+1})}">${ri+1}${rowOpen?'':'<span class="lock-dot">\u00a0🔒</span>'}</div>
        <div class="passive-node-row">${row.nodes.map((node,ni)=>{
        const key=passiveKey(ri,ni,node), rank=Number(state.build.passiveAlloc[key]||0);
        const want=Number((planAlloc||{})[key]||0);
        const label=passiveStatLabel(node.stat);
        return `<button class="passive-node ${rank?'active':''} ${rowOpen?'':'locked'} ${want>rank?'suggested':''}" data-passive-inc="${esc(key)}" title="${esc(label)} ${esc(passiveNodeValue(node))}">
          <span class="passive-node-core"><strong>${esc(label)}</strong><small>${esc(passiveNodeValue(node))} / ${t('point')}</small><b>${rank}/${node.max_points}</b></span>
          ${want>rank?`<span class="node-flag" title="${t('recommended')}">★${want}</span>`:''}
          ${rank?`<span class="passive-minus" data-passive-dec="${esc(key)}">−</span>`:''}</button>`;
      }).join('')}</div></div>`);
    }
    const head = `<div class="passive-tier-head"><div><h3>${t('tierN',{n:tierIndex+1})} ${unlocked?'':'🔒'}</h3>
      <p>${tier.unlock_threshold?t('tierNeed',{need:tier.unlock_threshold,prev:tierIndex,have:passiveTierSpentIn(tierIndex-1)}):t('startTier')} • ${t('allocatedHere',{n:passiveTierSpentIn(tierIndex)})}</p></div>
      ${tierIndex>0?`<button class="mini-btn" data-passive-tier="${tierIndex-1}">← ${t('tierN',{n:tierIndex})}</button>`:''}
      ${tierIndex<state.data.skills.passive.tiers.length-1?`<button class="mini-btn" data-passive-tier="${tierIndex+1}">${t('tierN',{n:tierIndex+2})} →</button>`:''}</div>`;
    return `<div class="passive-tier-card panel ${unlocked?'':'tier-locked'}">${head}<div class="passive-lattice">${rows.join('')}</div></div>`;
  }

  function renderPreservingView() {
    const y=window.scrollY;
    const tierLeft=$('.passive-tier-strip')?.scrollLeft || 0;
    render();
    window.scrollTo(0,y);
    const strip=$('.passive-tier-strip');
    if(strip)strip.scrollLeft=tierLeft;
    requestAnimationFrame(()=>window.scrollTo(0,y));
  }
  function refreshSkillTool() {
    const body=$('#toolBody'); if(!body)return renderPreservingView();
    const y=window.scrollY, left=$('.passive-tier-strip')?.scrollLeft||0;
    body.innerHTML=renderSkillTool(); bindSkillTool();
    const strip=$('.passive-tier-strip'); if(strip)strip.scrollLeft=left;
    window.scrollTo(0,y);
  }
  function bindSkillTool() {
    $$('[data-skill-class]').forEach(b=>b.addEventListener('click',()=>{state.skillClassId=Number(b.dataset.skillClass); state.skillBranchIndex=0; state.build.classId=state.skillClassId; state.build.classAlloc={}; saveDraft(); refreshSkillTool();}));
    $$('[data-skill-branch]').forEach(b=>b.addEventListener('click',()=>{state.skillBranchIndex=Number(b.dataset.skillBranch);refreshSkillTool();}));
    $$('[data-skill-inc]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();adjustClassSkill(Number(b.dataset.skillInc),1);}));
    $$('[data-skill-dec]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();adjustClassSkill(Number(b.dataset.skillDec),-1);}));
    $$('[data-passive-tier]').forEach(b=>b.addEventListener('click',()=>{state.passiveTier=Number(b.dataset.passiveTier);refreshSkillTool();}));
    $$('[data-passive-inc]').forEach(b=>b.addEventListener('click',e=>{ if(e.target.closest('[data-passive-dec]'))return; adjustPassive(b.dataset.passiveInc,1);}));
    $$('[data-passive-dec]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();adjustPassive(b.dataset.passiveDec,-1);}));
  }
  function adjustClassSkill(id,delta) {
    const skill=allClassSkills(state.skillClassId).find(s=>Number(s.id)===id); if(!skill)return;
    if(!canClassSkillChange(id,delta)){ toast(delta>0?'That skill is still locked.':'That point is keeping a later skill unlocked.'); return; }
    const cur=Number(state.build.classAlloc[String(id)]||0), next=cur+delta;
    if(next) state.build.classAlloc[String(id)]=next; else delete state.build.classAlloc[String(id)];
    saveDraft(); refreshSkillTool();
  }
  function adjustPassive(key,delta) {
    const [ri,ni]=key.split(':').map(Number), node=state.data.skills.passive.rows[ri]?.nodes?.[ni]; if(!node)return;
    const reason=passiveBlockReason(ri,delta);
    if(reason){ toast(reason); return; }
    const cur=Number(state.build.passiveAlloc[key]||0), next=Math.max(0,Math.min(Number(node.max_points),cur+delta));
    if(next===cur) return;
    if(next) state.build.passiveAlloc[key]=next; else delete state.build.passiveAlloc[key];
    saveDraft();
    if(state.route==='passive') renderPreservingView(); else refreshSkillTool();
  }

  /* ============================================================
     PASSIVE TREE MODULE — per-class progression guide
     Rules enforced:
       • Floors (rows) cannot be skipped: a row only opens when the
         row directly above it holds at least 1 point.
       • A tier only opens when the previous tier holds at least
         its configured unlock_threshold of points.
     ============================================================ */

  const PASSIVE_PROFILES = [
    { id:'balanced', ru:'Баланс',       en:'Balanced',    ruNote:'Ровный рост урона и выживаемости.',            enNote:'Even mix of damage and survivability.' },
    { id:'boss',     ru:'Боссы',        en:'Boss killer', ruNote:'Максимум урона в одну цель, меньше фарм-статов.', enNote:'Max single-target damage, fewer farm stats.' },
    { id:'farm',     ru:'Фарм / лут',   en:'Farm / loot', ruNote:'Дроп, материалы, золото и опыт.',               enNote:'Drop chance, materials, gold and EXP.' },
    { id:'tank',     ru:'Танк',         en:'Tank',        ruNote:'HP, защита, уклонение и вампиризм.',            enNote:'HP, defense, dodge and leech.' },
    { id:'pets',     ru:'Петы',         en:'Pet damage',  ruNote:'Ставка на урон питомцев.',                      enNote:'Leans on pet damage scaling.' },
  ];

  const PASSIVE_CLASS_WEIGHTS = {
    1: { strength:9, dexterity:3, intelligence:2, attack_damage_percent:10, attack_damage_flat:7, crit_damage:7, crit_chance:6,
         double_damage_chance:7, double_hit_chance:6, max_hp_percent:7, max_hp_flat:4, defense_percent:6, defense:4,
         life_on_kill:5, life_on_hit:4, dodge_chance:3, pet_damage_percent:2, pet_damage_flat:2, exp_gain:3, gold_gain:3,
         item_drop_chance:3, material_drop_chance:3 },
    2: { strength:3, dexterity:9, intelligence:2, attack_damage_percent:10, attack_damage_flat:7, crit_damage:7, crit_chance:8,
         double_damage_chance:7, double_hit_chance:9, max_hp_percent:5, max_hp_flat:3, defense_percent:3, defense:2,
         life_on_kill:4, life_on_hit:3, dodge_chance:5, pet_damage_percent:2, pet_damage_flat:2, exp_gain:3, gold_gain:3,
         item_drop_chance:3, material_drop_chance:3 },
    3: { strength:2, dexterity:3, intelligence:9, attack_damage_percent:10, attack_damage_flat:6, crit_damage:9, crit_chance:7,
         double_damage_chance:8, double_hit_chance:5, max_hp_percent:6, max_hp_flat:4, defense_percent:4, defense:3,
         life_on_kill:4, life_on_hit:3, dodge_chance:3, pet_damage_percent:2, pet_damage_flat:2, exp_gain:3, gold_gain:3,
         item_drop_chance:3, material_drop_chance:3 },
    4: { strength:3, dexterity:9, intelligence:2, attack_damage_percent:9, attack_damage_flat:6, crit_damage:9, crit_chance:10,
         double_damage_chance:7, double_hit_chance:9, max_hp_percent:4, max_hp_flat:3, defense_percent:3, defense:2,
         life_on_kill:4, life_on_hit:4, dodge_chance:6, pet_damage_percent:2, pet_damage_flat:2, exp_gain:3, gold_gain:3,
         item_drop_chance:3, material_drop_chance:3 },
    5: { strength:3, dexterity:3, intelligence:8, attack_damage_percent:6, attack_damage_flat:4, crit_damage:5, crit_chance:5,
         double_damage_chance:5, double_hit_chance:5, max_hp_percent:7, max_hp_flat:4, defense_percent:5, defense:4,
         life_on_kill:6, life_on_hit:4, dodge_chance:4, pet_damage_percent:10, pet_damage_flat:8, exp_gain:4, gold_gain:3,
         item_drop_chance:3, material_drop_chance:3 },
  };

  const PASSIVE_PROFILE_MODS = {
    balanced:{},
    boss:{ attack_damage_percent:1.3, attack_damage_flat:1.2, crit_damage:1.3, crit_chance:1.2, double_damage_chance:1.25,
           double_hit_chance:1.2, strength:1.15, dexterity:1.15, intelligence:1.15,
           exp_gain:0.4, gold_gain:0.4, item_drop_chance:0.4, material_drop_chance:0.4 },
    farm:{ item_drop_chance:2.4, material_drop_chance:2.1, gold_gain:1.9, exp_gain:1.9, attack_damage_percent:1.05 },
    tank:{ max_hp_percent:1.9, max_hp_flat:1.7, defense_percent:1.9, defense:1.7, dodge_chance:1.7, life_on_hit:1.7,
           life_on_kill:1.7, attack_damage_percent:0.8, crit_chance:0.7, crit_damage:0.7 },
    pets:{ pet_damage_percent:2.4, pet_damage_flat:2.2, intelligence:1.2, attack_damage_percent:0.7, attack_damage_flat:0.6,
           crit_chance:0.7, crit_damage:0.7 },
  };

  const PASSIVE_CLASS_NOTES = {
    1:{ ru:['Варвар живёт с силы и процента урона — ставь очки в Strength и Attack Damage % в каждом доступном ряду.',
            'Каждый 10-й ряд (milestone) даёт жирный одноразовый бонус: Max HP % и Double Hit там почти всегда лучше флэт-статов.',
            'С 60-го ряда начинай добирать Defense % и Life on Kill — иначе на рейдах не хватит устойчивости.'],
        en:['Warrior scales off Strength and Attack Damage % — take them in every row you can.',
            'Every 10th row is a milestone with one big bonus: Max HP % and Double Hit usually beat flat stats there.',
            'From row 60 start mixing in Defense % and Life on Kill or raids will out-damage you.'] },
    2:{ ru:['Лучник: Dexterity + Double Hit — это основной множитель DPS, он важнее крит-урона на ранних тирах.',
            'Крит-шанс добирай до комфортных значений, потом переключайся на Attack Damage %.',
            'Dodge на milestone-рядах экономит кучу зелий в башне.'],
        en:['Archer: Dexterity + Double Hit is the core DPS multiplier, ahead of crit damage early on.',
            'Push crit chance to a comfortable value, then swap back to Attack Damage %.',
            'Dodge on milestone rows saves a lot of potions in the tower.'] },
    3:{ ru:['Маг масштабируется от Intelligence и Crit Damage — бери их, даже если ряд предлагает «жирный» флэт.',
            'Double Damage для мага сильнее Double Hit из-за высокого базового удара.',
            'Max HP % обязателен: у мага самая низкая база выживаемости.'],
        en:['Mage scales on Intelligence and Crit Damage — take them even over juicy flat nodes.',
            'Double Damage beats Double Hit for mages because of the high base hit.',
            'Max HP % is mandatory: the mage has the thinnest survivability base.'] },
    4:{ ru:['Разбойник — чистый крит-класс: Crit Chance → Crit Damage → Double Hit, в таком порядке.',
            'Dexterity держи рядом с крит-статами, она усиливает и урон, и уклонение.',
            'Не распыляйся на защиту до 100-го ряда, лучше убивать быстрее.'],
        en:['Rogue is a pure crit class: Crit Chance → Crit Damage → Double Hit, in that order.',
            'Keep Dexterity close behind, it feeds both damage and dodge.',
            'Skip defense until row 100 — killing faster is the better defense.'] },
    5:{ ru:['Друид: весь прирост идёт в Pet Damage % — это главный стат ветки.',
            'Life on Kill + Max HP % делают друида самым автономным классом для оффлайн-фарма.',
            'Intelligence берём как вторичный стат, Attack Damage — по остаточному принципу.'],
        en:['Druid: everything funnels into Pet Damage % — it is the branch-defining stat.',
            'Life on Kill + Max HP % make the druid the best offline/idle farmer.',
            'Intelligence is the secondary stat; personal Attack Damage is a leftover pick.'] },
  };

  const PASSIVE_MILESTONE_ADVICE = {
    ru:'Ряды 10, 20, 30 … — milestone-ряды: один узел, один очень сильный бонус. Их нельзя обойти, поэтому планируй очки так, чтобы дойти до них без простоя.',
    en:'Rows 10, 20, 30 … are milestone rows: one node, one very strong bonus. They cannot be bypassed, so plan points to reach them without stalling.'
  };

  /* ---------- gating helpers ---------- */
  function passiveRows() { return state.data.skills.passive.rows; }
  function passiveTiersCfg() { return state.data.skills.passive.tiers; }
  function passiveRowSpent(rowIndex, alloc) {
    const map = alloc || state.build.passiveAlloc, row = passiveRows()[rowIndex];
    if (!row) return 0;
    return row.nodes.reduce((n, node, ni) => n + Number(map[passiveKey(rowIndex, ni, node)] || 0), 0);
  }
  function passiveTierOfRow(rowIndex) {
    return passiveTiersCfg().findIndex(t => rowIndex >= t.start_row && rowIndex <= t.end_row);
  }
  function passiveTierSpentIn(tierIndex, alloc) {
    const tier = passiveTiersCfg()[tierIndex]; if (!tier) return 0;
    let total = 0;
    for (let ri = tier.start_row; ri <= tier.end_row; ri++) total += passiveRowSpent(ri, alloc);
    return total;
  }
  function passiveTierUnlocked(tierIndex, alloc) {
    if (tierIndex <= 0) return true;
    const need = Number(passiveTiersCfg()[tierIndex]?.unlock_threshold || 0);
    return passiveTierSpentIn(tierIndex - 1, alloc) >= need && passiveTierUnlocked(tierIndex - 1, alloc);
  }
  /** A floor opens only when the floor right above it holds at least one point. */
  function passiveRowUnlocked(rowIndex, alloc) {
    if (rowIndex <= 0) return true;
    if (!passiveTierUnlocked(passiveTierOfRow(rowIndex), alloc)) return false;
    return passiveRowSpent(rowIndex - 1, alloc) > 0;
  }
  function passiveLastFilledRow(alloc) {
    const rows = passiveRows();
    for (let i = rows.length - 1; i >= 0; i--) if (passiveRowSpent(i, alloc) > 0) return i;
    return -1;
  }
  function passiveSpentTotal(alloc) {
    return Object.values(alloc || state.build.passiveAlloc).reduce((n, v) => n + Number(v || 0), 0);
  }
  function passiveBlockReason(rowIndex, delta) {
    if (delta > 0) {
      const tier = passiveTierOfRow(rowIndex);
      if (!passiveTierUnlocked(tier)) {
        const need = Number(passiveTiersCfg()[tier]?.unlock_threshold || 0);
        return t('lockTier', { tier: tier + 1, need, have: passiveTierSpentIn(tier - 1) });
      }
      if (!passiveRowUnlocked(rowIndex)) return t('lockRow', { row: rowIndex + 1, prev: rowIndex });
      return '';
    }
    if (passiveRowSpent(rowIndex) <= 1) {
      const last = passiveLastFilledRow();
      if (last > rowIndex) return t('lockRemove', { row: rowIndex + 1, last: last + 1 });
      const tier = passiveTierOfRow(rowIndex);
      for (let later = tier + 1; later < passiveTiersCfg().length; later++) {
        if (passiveTierSpentIn(later) > 0) return t('lockRemove', { row: rowIndex + 1, last: last + 1 });
      }
    } else {
      // removing a non-last point of this row is fine, but never drop a tier under its threshold
      const tier = passiveTierOfRow(rowIndex);
      const nextNeed = Number(passiveTiersCfg()[tier + 1]?.unlock_threshold || 0);
      if (passiveTierSpentIn(tier + 1) > 0 && passiveTierSpentIn(tier) - 1 < nextNeed)
        return t('lockThreshold', { tier: tier + 1, need: nextNeed });
    }
    return '';
  }

  /* ---------- recommendation engine ---------- */
  function passiveStatMedians() {
    if (state._passiveMedians) return state._passiveMedians;
    const buckets = {};
    passiveRows().forEach(r => r.nodes.forEach(n => { (buckets[n.stat] = buckets[n.stat] || []).push(Number(n.per_point) || 0); }));
    const med = {};
    Object.entries(buckets).forEach(([k, arr]) => { arr.sort((a, b) => a - b); med[k] = arr[Math.floor(arr.length / 2)] || 1; });
    state._passiveMedians = med;
    return med;
  }
  function passiveWeights(classId, profile) {
    const base = PASSIVE_CLASS_WEIGHTS[classId] || PASSIVE_CLASS_WEIGHTS[1];
    const mods = PASSIVE_PROFILE_MODS[profile] || {};
    const out = {};
    Object.entries(base).forEach(([k, v]) => { out[k] = v * (mods[k] == null ? 1 : mods[k]); });
    return out;
  }
  function passiveNodeScore(node, weights, medians) {
    const w = weights[node.stat] == null ? 1 : weights[node.stat];
    const med = medians[node.stat] || 1;
    const quality = 0.55 + 0.45 * ((Number(node.per_point) || 0) / med);
    return w * quality;
  }

  /**
   * Builds a legal allocation for `budget` points.
   * Walks floor by floor (never skipping one), tops a tier up to the
   * unlock threshold before moving on, then spends leftovers on the
   * best already-unlocked nodes.
   */
  function passivePlan(classId, profile, budget) {
    const rows = passiveRows(), tiers = passiveTiersCfg();
    const weights = passiveWeights(classId, profile), medians = passiveStatMedians();
    const alloc = {}, order = [];
    let left = Math.max(0, Math.floor(budget));

    const scored = rows.map((row, ri) => row.nodes
      .map((node, ni) => ({ ri, ni, node, key: passiveKey(ri, ni, node), score: passiveNodeScore(node, weights, medians) }))
      .sort((a, b) => b.score - a.score));

    const put = (cand, pts) => {
      const cur = Number(alloc[cand.key] || 0);
      const add = Math.min(pts, Number(cand.node.max_points) - cur);
      if (add <= 0) return 0;
      alloc[cand.key] = cur + add;
      order.push({ ...cand, points: add });
      left -= add;
      return add;
    };

    let reachedRow = -1, stalledTier = -1;
    for (let ti = 0; ti < tiers.length && left > 0; ti++) {
      const tier = tiers[ti];
      // 1) one point per floor so nothing is skipped
      for (let ri = tier.start_row; ri <= tier.end_row && left > 0; ri++) {
        put(scored[ri][0], 1);
        reachedRow = ri;
      }
      if (left <= 0) break;
      // 2) top the tier up to the threshold the next tier asks for
      const need = Number(tiers[ti + 1]?.unlock_threshold || 0);
      let inTier = 0;
      for (let ri = tier.start_row; ri <= tier.end_row; ri++)
        for (let ni = 0; ni < rows[ri].nodes.length; ni++) inTier += Number(alloc[passiveKey(ri, ni, rows[ri].nodes[ni])] || 0);
      const pool = [];
      for (let ri = tier.start_row; ri <= tier.end_row; ri++) pool.push(...scored[ri]);
      pool.sort((a, b) => b.score - a.score);
      let pi = 0;
      while (inTier < need && left > 0 && pi < pool.length) {
        const added = put(pool[pi], Math.min(need - inTier, left));
        inTier += added; pi++;
      }
      if (inTier < need) { stalledTier = ti; break; }
    }
    // 3) leftovers into the best unlocked nodes
    if (left > 0 && reachedRow >= 0) {
      const pool = [];
      for (let ri = 0; ri <= reachedRow; ri++) pool.push(...scored[ri]);
      pool.sort((a, b) => b.score - a.score);
      for (const cand of pool) { if (left <= 0) break; put(cand, left); }
    }
    return { alloc, order, spent: budget - left, leftover: left, reachedRow, stalledTier };
  }

  /* ---------- rendering ---------- */
  function passiveStatLabel(stat) {
    const d = state.data.skills.passive.stat_display?.[stat] || {};
    const name = d.name || human(stat);
    return LANG === 'ru' ? (PASSIVE_STAT_RU[stat] || name) : name;
  }
  function passiveNodeValue(node) {
    const d = state.data.skills.passive.stat_display?.[node.stat] || {};
    const fmt = d.format || '+{value}';
    return fmt.replace('{value}', fmtNum(node.per_point));
  }

  function renderPassivePage() {
    const cls = classById(state.passiveClassId || state.skillClassId || 1) || state.data.skills.classes[0];
    state.passiveClassId = Number(cls.id);
    const profile = state.passiveProfile || 'balanced';
    const budget = Number(state.passiveBudget || 120);
    const plan = passivePlan(cls.id, profile, budget);
    const spent = passiveSpentTotal();
    const last = passiveLastFilledRow();
    const notes = (PASSIVE_CLASS_NOTES[cls.id] || PASSIVE_CLASS_NOTES[1])[LANG] || [];
    const tierCount = passiveTiersCfg().length;
    const tier = Math.max(0, Math.min(tierCount - 1, Number(state.passiveTier || 0)));
    state.passiveTier = tier;

    return `
    <section class="panel passive-hero">
      <div class="panel-head">
        <div>
          <div class="section-kicker">${t('passiveKicker')}</div>
          <h2 class="panel-title">${esc(className(cls))} — ${t('passiveTitle')}</h2>
          <p class="panel-sub">${t('passiveIntro')}</p>
        </div>
        <span class="pill accent">${spent} ${t('pts')}</span>
      </div>
      <div class="class-selector">${state.data.skills.classes.map(c => `
        <button class="class-selector-btn ${Number(c.id) === Number(cls.id) ? 'active' : ''}" data-passive-class="${c.id}">
          <span class="class-orb">${esc(className(c).slice(0, 1))}</span><span>${esc(className(c))}</span>
        </button>`).join('')}</div>

      <div class="passive-controls">
        <div class="passive-profiles">${PASSIVE_PROFILES.map(p => `
          <button class="profile-btn ${p.id === profile ? 'active' : ''}" data-passive-profile="${p.id}">
            <strong>${esc(LANG === 'ru' ? p.ru : p.en)}</strong><small>${esc(LANG === 'ru' ? p.ruNote : p.enNote)}</small>
          </button>`).join('')}</div>
        <label class="passive-budget">
          <span>${t('budget')}</span>
          <input id="passiveBudget" type="number" min="1" max="1500" value="${budget}" />
        </label>
      </div>

      <div class="rule-banner">
        <strong>${t('ruleTitle')}</strong>
        <span>${t('ruleBody')}</span>
      </div>
    </section>

    <section class="grid grid-2">
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">${t('guideTitle')}</h3>
        <p class="panel-sub">${t('guideSub', { cls: esc(className(cls)) })}</p></div></div>
        <ul class="advice-list">${notes.map(n => `<li>${esc(n)}</li>`).join('')}
          <li>${esc(PASSIVE_MILESTONE_ADVICE[LANG])}</li></ul>
        <div class="chips">${passivePriorityChips(cls.id, profile)}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">${t('planTitle')}</h3>
        <p class="panel-sub">${t('planSub', { n: plan.spent, row: plan.reachedRow + 1 })}</p></div>
        <span class="pill">${t('tierReached', { tier: passiveTierOfRow(Math.max(0, plan.reachedRow)) + 1 })}</span></div>
        <div class="hero-actions">
          <button class="primary-btn" id="applyPassivePlan">${t('applyPlan')}</button>
          <button class="ghost-btn" id="clearPassivePlan">${t('clearPlan')}</button>
        </div>
        <div class="plan-summary">${passivePlanSummary(plan)}</div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><div><h3 class="panel-title">${t('stepsTitle')}</h3>
      <p class="panel-sub">${t('stepsSub')}</p></div></div>
      <ol class="step-list">${passiveNextSteps(plan, last).map(s => `<li>${s}</li>`).join('') || `<li>${t('stepsDone')}</li>`}</ol>
    </section>

    <section class="passive-section">
      <div class="passive-heading">
        <div><div class="section-kicker">${t('latticeKicker')}</div>
        <h2 class="section-title">${t('latticeTitle')}</h2>
        <p class="section-note">${t('latticeNote')}</p></div>
        <span class="pill accent">${t('tierN', { n: tier + 1 })}</span>
      </div>
      <div class="passive-tier-strip">${passiveTiersCfg().map((tt, i) => `
        <button class="passive-tier-btn ${i === tier ? 'active' : ''} ${passiveTierSpentIn(i) ? 'has-points' : ''} ${passiveTierUnlocked(i) ? '' : 'locked'}"
          data-passive-tier="${i}" title="${t('tierN', { n: i + 1 })}">${i + 1}</button>`).join('')}</div>
      ${renderPassiveTier(tier, plan.alloc)}
    </section>`;
  }

  function className(c) {
    const ru = { Warrior: 'Воин', Archer: 'Лучник', Mage: 'Маг', Rogue: 'Разбойник', Druid: 'Друид' };
    return LANG === 'ru' ? (ru[c.name] || c.name) : c.name;
  }

  function passivePriorityChips(classId, profile) {
    const w = passiveWeights(classId, profile);
    return Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([stat, val], i) => `<span class="pill ${i < 3 ? 'accent' : ''}">${i + 1}. ${esc(passiveStatLabel(stat))}</span>`).join('');
  }

  function passivePlanSummary(plan) {
    const tiers = passiveTiersCfg();
    const byTier = {};
    plan.order.forEach(o => { const ti = passiveTierOfRow(o.ri); (byTier[ti] = byTier[ti] || []).push(o); });
    const blocks = Object.keys(byTier).map(Number).sort((a, b) => a - b).map(ti => {
      const list = byTier[ti];
      const pts = list.reduce((n, o) => n + o.points, 0);
      const merged = {};
      list.forEach(o => { merged[o.node.stat] = (merged[o.node.stat] || 0) + o.points; });
      const top = Object.entries(merged).sort((a, b) => b[1] - a[1]);
      return `<details class="plan-tier"${ti === 0 ? ' open' : ''}>
        <summary><strong>${t('tierN', { n: ti + 1 })}</strong>
          <span>${t('rowsRange', { a: tiers[ti].start_row + 1, b: tiers[ti].end_row + 1 })}</span>
          <b>${pts} ${t('pts')}</b></summary>
        <div class="chips">${top.map(([stat, n]) => `<span class="pill">${esc(passiveStatLabel(stat))} ×${n}</span>`).join('')}</div>
        <table class="mini-table"><tbody>${list.map(o => `<tr>
          <td>${t('rowN', { n: o.ri + 1 })}${passiveRows()[o.ri].milestone ? ` <em>${t('milestone')}</em>` : ''}</td>
          <td>${esc(passiveStatLabel(o.node.stat))}</td>
          <td>${esc(passiveNodeValue(o.node))}</td>
          <td><b>+${o.points}</b></td></tr>`).join('')}</tbody></table>
      </details>`;
    });
    if (plan.leftover > 0) blocks.push(`<p class="help">${t('leftover', { n: plan.leftover })}</p>`);
    return blocks.join('') || `<div class="empty">${t('noPlan')}</div>`;
  }

  function passiveNextSteps(plan, lastRow) {
    const steps = [];
    const cur = state.build.passiveAlloc;
    for (const o of plan.order) {
      const have = Number(cur[o.key] || 0);
      if (have >= Number(plan.alloc[o.key] || 0)) continue;
      steps.push(`${t('rowN', { n: o.ri + 1 })} → <strong>${esc(passiveStatLabel(o.node.stat))}</strong> ${esc(passiveNodeValue(o.node))} <span class="pill">+${Number(plan.alloc[o.key]) - have} ${t('pts')}</span>`);
      if (steps.length >= 8) break;
    }
    return steps;
  }

  function bindPassivePage() {
    $$('[data-passive-class]').forEach(b => b.addEventListener('click', () => {
      state.passiveClassId = Number(b.dataset.passiveClass); renderPreservingView();
    }));
    $$('[data-passive-profile]').forEach(b => b.addEventListener('click', () => {
      state.passiveProfile = b.dataset.passiveProfile; renderPreservingView();
    }));
    const budget = $('#passiveBudget');
    if (budget) budget.addEventListener('change', () => { state.passiveBudget = Math.max(1, Number(budget.value) || 1); renderPreservingView(); });
    const apply = $('#applyPassivePlan');
    if (apply) apply.addEventListener('click', () => {
      const plan = passivePlan(state.passiveClassId, state.passiveProfile || 'balanced', Number(state.passiveBudget || 120));
      state.build.passiveAlloc = plan.alloc;
      state.build.classId = state.passiveClassId;
      saveDraft(); toast(t('applied', { n: plan.spent })); renderPreservingView();
    });
    const clear = $('#clearPassivePlan');
    if (clear) clear.addEventListener('click', () => { state.build.passiveAlloc = {}; saveDraft(); toast(t('cleared')); renderPreservingView(); });
    $$('[data-passive-tier]').forEach(b => b.addEventListener('click', () => { state.passiveTier = Number(b.dataset.passiveTier); renderPreservingView(); }));
    $$('[data-passive-inc]').forEach(b => b.addEventListener('click', e => { if (e.target.closest('[data-passive-dec]')) return; adjustPassive(b.dataset.passiveInc, 1); }));
    $$('[data-passive-dec]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); adjustPassive(b.dataset.passiveDec, -1); }));
  }

  const PASSIVE_STAT_RU = {
    strength: 'Сила', dexterity: 'Ловкость', intelligence: 'Интеллект',
    attack_damage_flat: 'Урон атаки', attack_damage_percent: 'Урон атаки %',
    pet_damage_flat: 'Урон пета', pet_damage_percent: 'Урон пета %',
    crit_chance: 'Шанс крита', crit_damage: 'Урон крита',
    double_hit_chance: 'Двойной удар', double_damage_chance: 'Двойной урон',
    defense: 'Защита', defense_percent: 'Защита %',
    max_hp_flat: 'Макс. HP', max_hp_percent: 'Макс. HP %',
    dodge_chance: 'Уклонение', life_on_hit: 'Вампиризм (удар)', life_on_kill: 'Вампиризм (убийство)',
    exp_gain: 'Опыт', gold_gain: 'Золото', item_drop_chance: 'Шанс дропа', material_drop_chance: 'Дроп материалов',
  };

  const BUILD_TABS=[['overview','Build'],['gear','Gear'],['skills','Skills'],['runes','Runes'],['pets','Pets'],['saved','Saved'],['share','Share']];
  function renderBuildStudio() {
    const completed=buildCompletion(), b=state.build;
    const gearCount=Object.values(b.gear).filter(g=>g?.item).length;
    const skillPts=Object.values(b.classAlloc).reduce((n,v)=>n+Number(v||0),0)+Object.values(b.passiveAlloc).reduce((n,v)=>n+Number(v||0),0);
    const pets=b.pets.filter(p=>p.petId).length;
    return `<section class="build-hero panel"><div class="build-identity"><div class="class-crest">${esc((CLASS_NAMES[b.classId]||'?').slice(0,1))}</div><div><div class="section-kicker">Current draft</div><h2>${esc(b.name || 'Untitled build')}</h2><p>${esc(CLASS_NAMES[b.classId])}${b.level?` • Level ${b.level}`:''} • autosaved locally</p></div></div><div class="build-completion"><strong>${completed}%</strong><span>setup</span></div><div class="progress-bar"><span style="width:${completed}%"></span></div><div class="build-snapshot"><span><b>${gearCount}</b> gear</span><span><b>${skillPts}</b> skill pts</span><span><b>${b.runes.length}</b> runes</span><span><b>${pets}/4</b> pets</span></div></section>
      <div class="build-shell"><aside class="build-side">${BUILD_TABS.map(([id,label])=>`<button class="${state.buildTab===id?'active':''}" data-build-tab="${id}"><span>${buildTabIcon(id)}</span>${label}</button>`).join('')}</aside><div id="buildBody">${renderBuildTab()}</div></div>`;
  }
  function buildTabIcon(id){return ({overview:'◆',gear:'◈',skills:'✦',runes:'▦',pets:'●',saved:'▣',share:'↗'})[id]||'•';}

  function buildCompletion() {
    let done=0,total=6;
    if(state.build.classId)done++;
    if(Object.values(state.build.gear).some(g=>g?.item))done++;
    if(Object.keys(state.build.classAlloc).length||Object.keys(state.build.passiveAlloc).length)done++;
    if(state.build.runes.length)done++;
    if(state.build.pets.some(p=>p.petId))done++;
    if(state.build.offensivePriority.length||state.build.defensivePriority.length)done++;
    return Math.round(done/total*100);
  }
  function renderBuildTab() {
    switch(state.buildTab){case'gear':return renderBuildGear();case'skills':return renderBuildSkills();case'runes':return renderBuildRunes();case'pets':return renderBuildPets();case'saved':return `<div class="panel"><div class="panel-head"><div><h2 class="panel-title">Saved builds</h2><p class="panel-sub">Stored on this device.</p></div><span class="pill">${Object.keys(getSavedBuilds()).length}</span></div>${renderSavedBuilds()}</div>`;case'share':return renderBuildShare();default:return renderBuildOverview();}
  }
  function renderBuildOverview() {
    const b=state.build, priorityCount=b.offensivePriority.length+b.defensivePriority.length;
    const classPts=Object.values(b.classAlloc).reduce((n,v)=>n+Number(v||0),0), passivePts=Object.values(b.passiveAlloc).reduce((n,v)=>n+Number(v||0),0);
    return `<div class="build-jump-grid">
      <button data-build-jump="gear"><span>◈</span><strong>Gear</strong><small>${Object.values(b.gear).filter(g=>g?.item).length} slots set</small></button>
      <button data-build-jump="skills"><span>✦</span><strong>Skills</strong><small>${classPts} class • ${passivePts} passive</small></button>
      <button data-build-jump="runes"><span>▦</span><strong>Runes</strong><small>${b.runes.length} placed</small></button>
      <button data-build-jump="pets"><span>●</span><strong>Pets</strong><small>${b.pets.filter(p=>p.petId).length}/4 selected</small></button>
    </div>
    <div class="panel"><div class="panel-head"><div><div class="section-kicker">Identity</div><h2 class="panel-title">Character</h2><p class="panel-sub">Only fill what matters for this build. Level is intentionally optional and stays empty when you clear it.</p></div></div>
      <div class="field-row three"><div class="field"><label>Build name</label><input id="buildName" class="input" value="${esc(b.name)}"></div><div class="field"><label>Class</label><select id="buildClass" class="select">${Object.entries(CLASS_NAMES).map(([id,n])=>`<option value="${id}" ${Number(id)===Number(b.classId)?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>Character level</label><input id="buildLevel" class="input" inputmode="numeric" pattern="[0-9]*" placeholder="Optional" value="${b.level??''}"></div></div>
      <div class="build-option-grid"><div><div class="label">Primary stats</div><div class="chips" style="margin-top:8px">${['STR','INT','DEX'].map(s=>`<button class="chip-btn ${b.primaryStats.includes(s)?'active':''}" data-primary="${s}">${s}</button>`).join('')}</div></div><div><div class="label">Combat stance</div><div class="chips" style="margin-top:8px">${STANCES.map(s=>`<button class="chip-btn ${b.stance===s?'active':''}" data-stance="${s}">${s}</button>`).join('')}</div></div><div><div class="label">Talismans (up to 2)</div><div class="chips" style="margin-top:8px">${TALISMANS.map(s=>`<button class="chip-btn ${b.talismans.includes(s)?'active':''}" data-talisman="${s}">${s}</button>`).join('')}</div></div></div></div>
      <div class="panel"><div class="panel-head"><div><div class="section-kicker">Ordered ranking</div><h2 class="panel-title">Stat priorities</h2><p class="panel-sub">Rank up to 10 total offensive + defensive stats. Higher means more important.</p></div><span class="pill ${priorityCount>=10?'warn':''}">${priorityCount}/10</span></div>
        <div class="priority-columns">${renderPriorityEditor('Offensive',OFFENSE,b.offensivePriority,'offense')}${renderPriorityEditor('Defensive',DEFENSE,b.defensivePriority,'defense')}</div>
      </div>
      <div class="panel"><div class="panel-head"><div><div class="section-kicker">Export control</div><h2 class="panel-title">Share sections</h2><p class="panel-sub">Choose which parts are included when exporting a share code.</p></div></div><div class="chips">${BUILD_SECTIONS.map(([id,label])=>`<button class="chip-btn ${b.included.includes(id)?'active':''}" data-include="${id}">${esc(label)}</button>`).join('')}</div></div>`;
  }

  function renderPriorityEditor(title,options,selected,key) {
    const remaining=options.filter(x=>!selected.includes(x));
    return `<div style="margin-top:12px"><div class="label">${title}</div><div class="priority-list" style="margin-top:7px">${selected.map((s,i)=>`<div class="priority-item"><span class="priority-num">${i+1}</span><span>${esc(s)}</span><span><button class="mini-btn" data-priority-up="${key}:${i}" ${i===0?'disabled':''}>↑</button> <button class="mini-btn" data-priority-down="${key}:${i}" ${i===selected.length-1?'disabled':''}>↓</button> <button class="mini-btn" data-priority-remove="${key}:${i}">×</button></span></div>`).join('') || '<div class="help">Nothing ranked yet.</div>'}</div>${state.build.offensivePriority.length+state.build.defensivePriority.length<10&&remaining.length?`<div class="field-row" style="margin-top:8px"><select class="select" data-priority-add="${key}"><option value="">Add ${title.toLowerCase()} stat…</option>${remaining.map(s=>`<option>${esc(s)}</option>`).join('')}</select></div>`:''}</div>`;
  }

  function buildSlots() {
    const ids=['weapon1']; if(state.build.classId===4)ids.push('weapon2'); else if([1,2,3].includes(Number(state.build.classId)))ids.push('offhand'); ids.push('torch','head','chest','hands','feet','belt','ring1','ring2','amulet'); return ids;
  }
  function itemsForSlot(slot) {
    return state.data.codex.items.filter(item=>{
      const classOk=!item.allowed_classes?.length||item.allowed_classes.map(Number).includes(Number(state.build.classId)); if(!classOk)return false;
      if(['weapon1','weapon2'].includes(slot))return item.category==='weapon'; if(slot==='offhand')return item.category==='shield'; if(slot==='torch')return item.category==='torch'; if(['ring1','ring2'].includes(slot))return item.slot==='ring'; return item.slot===slot;
    }).sort(byName);
  }
  function buildStageOptions(value='Base') { return ['Base',...stages().map(s=>s.id)].map(id=>`<option value="${id}" ${id===value?'selected':''}>${id==='Base'?'Base item':esc(stages().find(s=>s.id===id)?.label||id)}</option>`).join(''); }
  function renderBuildGear() {
    return `<div class="panel"><div class="panel-head"><div><div class="section-kicker">Loadout</div><h2 class="panel-title">Gear</h2><p class="panel-sub">Tap a slot to pick gear. Customize only the slots where progression, affixes, alternatives, or gems matter.</p></div><span class="pill accent">${Object.values(state.build.gear).filter(g=>g?.item).length}/${buildSlots().length} equipped</span></div><div class="gear-grid">${buildSlots().map(slot=>renderGearCard(slot)).join('')}</div></div>`;
  }
  function renderGearCard(slot) {
    const g=state.build.gear[slot]||{item:'',progression:'Base',alternative:'',affixes:[],gems:Array(GEAR_GEMS[slot]).fill('')};
    const items=itemsForSlot(slot), chosen=items.find(i=>i.name===g.item);
    const compatAffixes=chosen?state.data.codex.affixes.filter(a=>(a.applicable_to||[]).some(x=>x==='all'||x===chosen.type||x===chosen.category||x===chosen.slot)):[];
    const gemCount=GEAR_GEMS[slot]||0, gemUsed=(g.gems||[]).filter(Boolean).length;
    return `<article class="gear-card ${chosen?'equipped':''}" data-gear-card="${slot}">
      <div class="gear-slot-top"><span class="slot-name">${esc(GEAR_SLOT_LABELS[slot])}</span>${g.progression&&g.progression!=='Base'?`<span class="gear-stage">${esc(g.progression)}</span>`:''}</div>
      <button class="gear-pick-surface" data-gear-pick="${slot}">${chosen?`<img src="${itemImage(chosen)}" alt=""><strong>${esc(chosen.name)}</strong><small>${esc(human(chosen.type))}${gemCount?` • ${gemUsed}/${gemCount} gems`:''}</small>`:`<span class="empty-slot-glyph">＋</span><strong>Choose item</strong><small>${items.length} compatible</small>`}</button>
      ${g.item?`<div class="gear-actions"><button class="mini-btn" data-gear-pick="${slot}">Change</button><button class="mini-btn" data-gear-custom="${slot}">Details</button></div><div class="gear-custom"><div class="field-row"><div class="field"><label>Rarity / Awakening</label><select class="select" data-gear-progression="${slot}">${buildStageOptions(g.progression||'Base')}</select></div><div class="field"><label>Alternative item</label><select class="select" data-gear-alt="${slot}"><option value="">None</option>${items.filter(i=>i.name!==g.item).map(i=>`<option value="${esc(i.name)}" ${i.name===g.alternative?'selected':''}>${esc(i.name)}</option>`).join('')}</select></div></div>${compatAffixes.length?`<div style="margin-top:10px"><div class="label">Affixes</div><div class="chips" style="margin-top:7px">${compatAffixes.map(a=>`<button class="chip-btn ${(g.affixes||[]).map(Number).includes(Number(a.id))?'active':''}" data-gear-affix="${slot}:${a.id}">${esc(a.name||a.stat||`Affix ${a.id}`)}</button>`).join('')}</div></div>`:''}${gemCount?`<div style="margin-top:10px"><div class="label">Gems</div><div class="gem-row" style="margin-top:7px">${Array.from({length:gemCount},(_,i)=>`<select class="select" style="width:auto;min-width:110px" data-gear-gem="${slot}:${i}"><option value="">Empty</option>${GEM_FAMILIES.map(x=>`<option ${g.gems?.[i]===x?'selected':''}>${x}</option>`).join('')}</select>`).join('')}</div></div>`:''}<button class="danger-btn" data-gear-clear="${slot}" style="margin-top:10px">Clear slot</button></div>`:''}
    </article>`;
  }


  function renderBuildSkills() {
    const c=classById(state.build.classId), classPts=Object.values(state.build.classAlloc).reduce((n,v)=>n+Number(v||0),0), passivePts=Object.values(state.build.passiveAlloc).reduce((n,v)=>n+Number(v||0),0);
    const selected=allClassSkills(state.build.classId).filter(s=>Number(state.build.classAlloc[String(s.id)]||0)>0);
    return `<div class="panel"><div class="panel-head"><div><h2 class="panel-title">Skill Trees</h2><p class="panel-sub">Build Studio shares the same allocation state as the full Skill Planner.</p></div><span class="pill accent">${classPts} class • ${passivePts} passive</span></div><div class="chips">${selected.slice(0,20).map(s=>`<span class="pill">${esc(s.name)} ${state.build.classAlloc[String(s.id)]}/${s.max_rank}</span>`).join('')||'<span class="help">No class skills allocated yet.</span>'}</div><div class="hero-actions"><button class="primary-btn" data-open-skill-planner>Open full Skill Planner</button><button class="ghost-btn" data-clear-skills>Clear allocations</button></div></div>`;
  }

  function runeDims(size) { const [w,h]=String(size||'1×1').split('×').map(Number); return [w||1,h||1]; }
  function runeCells(r) { const [w,h]=runeDims(r.shape); const cells=[]; for(let x=0;x<w;x++)for(let y=0;y<h;y++)cells.push(`${r.col+x}:${r.row+y}`); return cells; }
  function canPlaceRune(candidate,ignoreId=null) {
    const [w,h]=runeDims(candidate.shape); if(candidate.col<0||candidate.row<0||candidate.col+w>6||candidate.row+h>7)return false;
    const target=new Set(runeCells(candidate)); return state.build.runes.filter(r=>r.id!==ignoreId).every(r=>!runeCells(r).some(c=>target.has(c)));
  }
  function ensureRuneConfig() {
    const refs=state.data.refs, cfg=state.runeConfig || (state.runeConfig={type:'',shape:'',secondary:'',word:''});
    const types=refs.rune_types.map(r=>r.name), shapes=refs.rune_shapes.map(r=>r.size), secondary=refs.rune_secondary_stats.slice(), words=['',...refs.rune_words.map(w=>w.name)];
    if(!types.includes(cfg.type))cfg.type=types[0]||'';
    if(!shapes.includes(cfg.shape))cfg.shape=shapes[0]||'1×1';
    if(!secondary.includes(cfg.secondary))cfg.secondary=secondary[0]||'';
    if(!words.includes(cfg.word))cfg.word='';
    return cfg;
  }
  function renderBuildRunes() {
    const refs=state.data.refs, cfg=ensureRuneConfig();
    return `<div class="rune-layout"><div class="panel"><div class="panel-head"><div><h2 class="panel-title">6×7 Rune Grid</h2><p class="panel-sub">Tap an empty cell to place the configured rune. Tap a rune to remove it; drag it to move.</p></div><span class="pill accent">${state.build.runes.length} placed</span></div><div id="runeGrid" class="rune-grid">${Array.from({length:42},(_,i)=>`<button class="rune-cell" data-rune-cell="${i%6}:${Math.floor(i/6)}" aria-label="Rune cell"></button>`).join('')}${state.build.runes.map(renderRunePiece).join('')}</div></div>
      <div class="panel"><div class="panel-head"><div><h2 class="panel-title">Rune setup</h2><p class="panel-sub">Your configured rune stays selected after placement until you change it.</p></div><span class="pill accent">armed</span></div><div class="field" style="margin-top:12px"><label>Rune type</label><select id="runeType" class="select">${refs.rune_types.map(r=>`<option ${r.name===cfg.type?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:10px"><label>Size</label><select id="runeShape" class="select">${refs.rune_shapes.map(r=>`<option value="${esc(r.size)}" ${r.size===cfg.shape?'selected':''}>${esc(r.name)} • ${esc(r.size)}</option>`).join('')}</select></div><div class="field" style="margin-top:10px"><label>Secondary stat</label><select id="runeSecondary" class="select">${refs.rune_secondary_stats.map(r=>`<option value="${esc(r)}" ${r===cfg.secondary?'selected':''}>${esc(human(r))}</option>`).join('')}</select></div><div class="field" style="margin-top:10px"><label>Rune Word tag</label><select id="runeWord" class="select"><option value="" ${cfg.word===''?'selected':''}>None</option>${refs.rune_words.map(w=>`<option ${w.name===cfg.word?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div><button id="autoPlaceRune" class="primary-btn" style="margin-top:12px">Place in first open spot</button><div class="hr"></div><div class="card-list">${state.build.runes.map((r,i)=>`<div class="list-card"><div class="list-main"><div class="list-title">${i+1}. ${esc(r.type)} ${esc(r.shape)}</div><div class="list-meta">${esc(human(r.secondary))}${r.word?` • ${esc(r.word)}`:''} • ${r.col+1},${r.row+1}</div></div><button class="mini-btn" data-remove-rune="${esc(r.id)}">×</button></div>`).join('')||'<div class="help">No runes placed yet.</div>'}</div></div></div>`;
  }
  function renderRunePiece(r) {
    const [w,h]=runeDims(r.shape), gap=4, pad=6;
    const left=`calc(${r.col}/6 * (100% - ${pad*2}px) + ${pad}px + ${r.col*gap/6}px)`;
    const top=`calc(${r.row}/7 * (100% - ${pad*2}px) + ${pad}px + ${r.row*gap/7}px)`;
    const width=`calc(${w}/6 * (100% - ${pad*2}px) - ${gap*(1-w/6)}px)`;
    const height=`calc(${h}/7 * (100% - ${pad*2}px) - ${gap*(1-h/7)}px)`;
    return `<div class="rune-piece ${slugify(r.type)}" data-rune-id="${esc(r.id)}" style="left:${left};top:${top};width:${width};height:${height}">${esc(r.type.slice(0,3).toUpperCase())}<small>${esc(r.shape)}</small></div>`;
  }

  function renderBuildPets() {
    const refs=state.data.refs;
    return `<div class="panel"><div class="panel-head"><div><h2 class="panel-title">Pets</h2><p class="panel-sub">Four slots, each with an optional build-relevant bonus tag.</p></div></div><div class="grid grid-2">${state.build.pets.map((p,i)=>{const pet=refs.pets.find(x=>Number(x.id)===Number(p.petId));return `<div class="pet-slot">${pet?`<img src="${petImage(pet)}" alt="">`:`<div class="thumb" style="display:grid;place-items:center">${i+1}</div>`}<div><div class="field"><label>Pet ${i+1}</label><select class="select" data-pet-id="${i}"><option value="">Empty</option>${refs.pets.slice().sort(byName).map(x=>`<option value="${x.id}" ${Number(p.petId)===Number(x.id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:7px"><label>Bonus focus</label><select class="select" data-pet-bonus="${i}"><option value="">None</option>${PET_BONUSES.map(x=>`<option ${p.bonus===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div></div></div>`}).join('')}</div></div>`;
  }

  function shareState() {
    const allowed=new Set(state.build.included); const b=clone(state.build); const out={v:1,name:b.name,included:b.included};
    if(allowed.has('character')){if(b.level!=null)out.level=b.level;out.classId=b.classId;out.primaryStats=b.primaryStats;}
    if(allowed.has('skills')){out.classAlloc=b.classAlloc;out.passiveAlloc=b.passiveAlloc;if(out.classId==null)out.classId=b.classId;}
    if(allowed.has('gear'))out.gear=b.gear;
    if(allowed.has('talismans'))out.talismans=b.talismans;
    if(allowed.has('drop_bonuses'))out.dropBonuses=b.dropBonuses;
    if(allowed.has('priorities')){out.offense=b.offensivePriority;out.defense=b.defensivePriority;}
    if(allowed.has('stance'))out.stance=b.stance;
    if(allowed.has('runes'))out.runes=b.runes;
    if(allowed.has('pets'))out.pets=b.pets;
    return out;
  }

  async function encodeIAC(obj) {
    const raw=new TextEncoder().encode(JSON.stringify(obj));
    if('CompressionStream' in window){const cs=new CompressionStream('deflate');const compressed=await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();return 'IAC1:'+base64url(new Uint8Array(compressed));}
    return 'IACJ:'+base64url(raw);
  }
  function base64url(bytes){let bin='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function fromBase64url(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0));}
  async function decodeIAC(code){const clean=code.trim();if(clean.startsWith('IACJ:'))return JSON.parse(new TextDecoder().decode(fromBase64url(clean.slice(5))));if(!clean.startsWith('IAC1:'))throw new Error('Build code must start with IAC1:.');const bytes=fromBase64url(clean.slice(5));if(!('DecompressionStream'in window))throw new Error('This browser cannot decompress IAC1 codes. Use a current Chrome, Edge, Safari, or Firefox build.');const ds=new DecompressionStream('deflate');const raw=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();return JSON.parse(new TextDecoder().decode(raw));}

  function buildSummary() {
    const b=state.build, lines=[`IdleArc Companion Build: ${b.name||'Untitled'}`,''];
    if(b.included.includes('character')){let s=`Character: ${b.level?`Level ${b.level} `:''}${CLASS_NAMES[b.classId]||`Class ${b.classId}`}`;lines.push(s);if(b.primaryStats.length)lines.push(`Primary stats: ${b.primaryStats.join(' / ')}`);}
    if(b.included.includes('skills'))lines.push(`Skills: ${Object.values(b.classAlloc).reduce((n,v)=>n+Number(v||0),0)} class points • ${Object.values(b.passiveAlloc).reduce((n,v)=>n+Number(v||0),0)} passive points`);
    if(b.included.includes('gear')&&Object.values(b.gear).some(g=>g?.item)){lines.push('','Gear:');buildSlots().forEach(slot=>{const g=b.gear[slot];if(!g?.item)return;const extras=[];if(g.progression&&g.progression!=='Base')extras.push(g.progression);if(g.affixes?.length)extras.push(`${g.affixes.length} affix${g.affixes.length===1?'':'es'}`);const gems=(g.gems||[]).filter(Boolean);if(gems.length)extras.push(`${gems.join('/')} gems`);lines.push(`• ${GEAR_SLOT_LABELS[slot]}: ${g.item}${extras.length?` (${extras.join(', ')})`:''}`);if(g.alternative)lines.push(`  Alt: ${g.alternative}`);});}
    if(b.included.includes('talismans')&&b.talismans.length)lines.push(`Talismans: ${b.talismans.join(' + ')}`);
    if(b.included.includes('drop_bonuses')&&b.dropBonuses.length){const names=b.dropBonuses.map(id=>state.data.codex.drop_bonuses.find(x=>x.id===id)?.name).filter(Boolean);if(names.length)lines.push(`Drop bonuses: ${names.join(', ')}`);}
    if(b.included.includes('priorities')){if(b.offensivePriority.length)lines.push(`Offense: ${b.offensivePriority.map((s,i)=>`${i+1}. ${s}`).join(' • ')}`);if(b.defensivePriority.length)lines.push(`Defense: ${b.defensivePriority.map((s,i)=>`${i+1}. ${s}`).join(' • ')}`);}
    if(b.included.includes('stance')&&b.stance)lines.push(`Combat stance: ${b.stance}`);
    if(b.included.includes('runes')&&b.runes.length){lines.push(`Runes: ${b.runes.length} placed`);const words=[...new Set(b.runes.map(r=>r.word).filter(Boolean))];if(words.length)lines.push(`Rune Words: ${words.join(', ')}`);}
    if(b.included.includes('pets')){const pets=b.pets.map(p=>{const pet=state.data.refs.pets.find(x=>Number(x.id)===Number(p.petId));return pet?(p.bonus?`${pet.name} (${p.bonus})`:pet.name):null}).filter(Boolean);if(pets.length)lines.push(`Pets: ${pets.join(' • ')}`);}
    lines.push('','Import this build in IdleArc Companion with the attached build code.'); return lines.join('\n');
  }

  function renderBuildShare() {
    return `<div class="panel"><div class="panel-head"><div><h2 class="panel-title">Save & share</h2><p class="panel-sub">The PWA uses the same IAC1 deflate + URL-safe Base64 format as the Android app when the browser supports it.</p></div></div><div class="hero-actions"><button id="saveBuild" class="primary-btn">Save build</button><button id="exportBuild" class="ghost-btn">Generate code</button><button id="shareBuild" class="ghost-btn">Share summary</button><button id="importBuild" class="ghost-btn">Import code</button></div><div class="field" style="margin-top:14px"><label>Readable summary</label><div class="summary-box">${esc(buildSummary())}</div></div><div id="shareCodeArea"></div></div>`;
  }

  function bindBuildStudio() {
    $$('[data-build-tab]').forEach(b=>b.addEventListener('click',()=>{
      state.buildTab=b.dataset.buildTab;
      $$('[data-build-tab]').forEach(tab=>tab.classList.toggle('active',tab.dataset.buildTab===state.buildTab));
      const body=$('#buildBody');
      if(!body)return;
      body.innerHTML=renderBuildTab();
      bindBuildTab();
    }));
    bindBuildTab();
  }
  function bindBuildTab() {
    if(state.buildTab==='overview')bindBuildOverview(); if(state.buildTab==='gear')bindBuildGear(); if(state.buildTab==='skills')bindBuildSkills(); if(state.buildTab==='runes')bindBuildRunes(); if(state.buildTab==='pets')bindBuildPets(); if(state.buildTab==='saved')bindSaved(); if(state.buildTab==='share')bindBuildShare();
  }
  function bindBuildOverview() {
    $$('[data-build-jump]').forEach(b=>b.addEventListener('click',()=>{
      state.buildTab=b.dataset.buildJump;
      $$('[data-build-tab]').forEach(tab=>tab.classList.toggle('active',tab.dataset.buildTab===state.buildTab));
      const body=$('#buildBody');
      if(!body)return;
      body.innerHTML=renderBuildTab();
      bindBuildTab();
    }));
    $('#buildName').addEventListener('input',e=>{state.build.name=e.target.value;saveDraft();});
    $('#buildClass').addEventListener('change',e=>{const next=Number(e.target.value);if(next!==Number(state.build.classId)){state.build.classId=next;state.skillClassId=next;state.build.classAlloc={};state.build.gear={};saveDraft();render();}});
    $('#buildLevel').addEventListener('input',e=>{const v=e.target.value.trim();state.build.level=/^\d+$/.test(v)&&Number(v)>0?Number(v):null;saveDraft();});
    $$('[data-primary]').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.primary,arr=state.build.primaryStats;state.build.primaryStats=arr.includes(s)?arr.filter(x=>x!==s):[...arr,s];saveDraft();render();}));
    $$('[data-stance]').forEach(b=>b.addEventListener('click',()=>{state.build.stance=state.build.stance===b.dataset.stance?'':b.dataset.stance;saveDraft();render();}));
    $$('[data-talisman]').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.talisman,arr=state.build.talismans;if(arr.includes(s))state.build.talismans=arr.filter(x=>x!==s);else if(arr.length<2)state.build.talismans=[...arr,s];else return toast('Builds can carry up to two talisman types.');saveDraft();render();}));
    $$('[data-include]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.include,arr=state.build.included;state.build.included=arr.includes(id)?arr.filter(x=>x!==id):[...arr,id];saveDraft();render();}));
    $$('[data-priority-add]').forEach(s=>s.addEventListener('change',()=>{if(!s.value)return;const key=s.dataset.priorityAdd, total=state.build.offensivePriority.length+state.build.defensivePriority.length;if(total>=10)return toast('The combined priority limit is 10.');const arr=key==='offense'?state.build.offensivePriority:state.build.defensivePriority;arr.push(s.value);saveDraft();render();}));
    $$('[data-priority-remove]').forEach(b=>b.addEventListener('click',()=>priorityAction(b.dataset.priorityRemove,'remove')));$$('[data-priority-up]').forEach(b=>b.addEventListener('click',()=>priorityAction(b.dataset.priorityUp,'up')));$$('[data-priority-down]').forEach(b=>b.addEventListener('click',()=>priorityAction(b.dataset.priorityDown,'down')));
  }
  function priorityAction(spec,action){const[key,idxRaw]=spec.split(':'),idx=Number(idxRaw),arr=key==='offense'?state.build.offensivePriority:state.build.defensivePriority;if(action==='remove')arr.splice(idx,1);else{const j=action==='up'?idx-1:idx+1;if(j>=0&&j<arr.length)[arr[idx],arr[j]]=[arr[j],arr[idx]];}saveDraft();render();}

  function bindBuildGear() {
    $$('[data-gear-pick]').forEach(b=>b.addEventListener('click',()=>showGearPicker(b.dataset.gearPick)));
    $$('[data-gear-custom]').forEach(b=>b.addEventListener('click',()=>b.closest('.gear-card').classList.toggle('open')));
    $$('[data-gear-progression]').forEach(s=>s.addEventListener('change',()=>{ensureGear(s.dataset.gearProgression).progression=s.value;saveDraft();}));
    $$('[data-gear-alt]').forEach(s=>s.addEventListener('change',()=>{ensureGear(s.dataset.gearAlt).alternative=s.value;saveDraft();}));
    $$('[data-gear-affix]').forEach(b=>b.addEventListener('click',()=>{const[slot,id]=b.dataset.gearAffix.split(':'),g=ensureGear(slot),n=Number(id);g.affixes=g.affixes||[];g.affixes=g.affixes.includes(n)?g.affixes.filter(x=>x!==n):[...g.affixes,n];saveDraft();render();}));
    $$('[data-gear-gem]').forEach(s=>s.addEventListener('change',()=>{const[slot,idx]=s.dataset.gearGem.split(':'),g=ensureGear(slot);g.gems=g.gems||Array(GEAR_GEMS[slot]).fill('');g.gems[Number(idx)]=s.value;saveDraft();}));
    $$('[data-gear-clear]').forEach(b=>b.addEventListener('click',()=>{delete state.build.gear[b.dataset.gearClear];saveDraft();render();}));
  }
  function ensureGear(slot){if(!state.build.gear[slot])state.build.gear[slot]={item:'',progression:'Base',alternative:'',affixes:[],gems:Array(GEAR_GEMS[slot]).fill('')};return state.build.gear[slot];}
  function showGearPicker(slot){const items=itemsForSlot(slot);openModal(`<div class="modal-head"><div><h2>Choose ${esc(GEAR_SLOT_LABELS[slot])}</h2><p class="panel-sub">${items.length} compatible equipment families.</p></div><button class="modal-close" data-modal-close>×</button></div><input id="gearPickerSearch" class="input" type="search" placeholder="Search equipment…"><div id="gearPickerList" class="card-list" style="margin-top:10px">${gearPickerRows(items,slot)}</div>`,true);$('[data-modal-close]').addEventListener('click',closeModal);$('#gearPickerSearch').addEventListener('input',e=>{$('#gearPickerList').innerHTML=gearPickerRows(items.filter(i=>i.name.toLowerCase().includes(e.target.value.toLowerCase())),slot);bindPicker();});const bindPicker=()=>$$('[data-pick-item]').forEach(b=>b.addEventListener('click',()=>{const g=ensureGear(slot);g.item=b.dataset.pickItem;g.progression='Base';g.alternative='';g.affixes=[];g.gems=Array(GEAR_GEMS[slot]).fill('');closeModal();saveDraft();render();}));bindPicker();}
  function gearPickerRows(items,slot){return items.map(i=>`<button class="list-card clickable" data-pick-item="${esc(i.name)}"><img class="thumb" src="${itemImage(i)}" alt=""><div class="list-main"><div class="list-title">${esc(i.name)}</div><div class="list-meta">${esc(human(i.type))}</div></div></button>`).join('')||empty('No compatible items.');}
  function bindBuildSkills(){ $('[data-open-skill-planner]')?.addEventListener('click',()=>{state.skillClassId=state.build.classId;state.tool='skills';go('tools');}); $('[data-clear-skills]')?.addEventListener('click',()=>{state.build.classAlloc={};state.build.passiveAlloc={};saveDraft();render();}); }

  function bindBuildRunes() {
    const cfg=ensureRuneConfig();
    const syncConfig=()=>{cfg.type=$('#runeType')?.value||cfg.type;cfg.shape=$('#runeShape')?.value||cfg.shape;cfg.secondary=$('#runeSecondary')?.value||cfg.secondary;cfg.word=$('#runeWord')?.value??cfg.word;};
    [['runeType','type'],['runeShape','shape'],['runeSecondary','secondary'],['runeWord','word']].forEach(([id,key])=>$('#'+id)?.addEventListener('change',e=>{cfg[key]=e.target.value;}));
    const place=(col,row)=>{syncConfig();const r={id:`r${Date.now()}${Math.random().toString(36).slice(2,7)}`,type:cfg.type,shape:cfg.shape,secondary:cfg.secondary,word:cfg.word,col,row};if(canPlaceRune(r)){state.build.runes.push(r);saveDraft();renderPreservingView();}else toast('That rune size does not fit at that cell.');};
    $$('[data-rune-cell]').forEach(c=>c.addEventListener('click',()=>{const[col,row]=c.dataset.runeCell.split(':').map(Number);if(!state.build.runes.some(r=>runeCells(r).includes(`${col}:${row}`)))place(col,row);}));
    $('#autoPlaceRune').addEventListener('click',()=>{syncConfig();for(let row=0;row<7;row++)for(let col=0;col<6;col++){const test={id:'test',shape:cfg.shape,col,row};if(canPlaceRune(test)){place(col,row);return;}}toast('No open space for that rune size.');});
    $$('[data-remove-rune]').forEach(b=>b.addEventListener('click',()=>{state.build.runes=state.build.runes.filter(r=>r.id!==b.dataset.removeRune);saveDraft();renderPreservingView();}));
    $$('[data-rune-id]').forEach(piece=>{
      piece.addEventListener('click',e=>{if(piece.dataset.dragged==='1'){piece.dataset.dragged='';return;}state.build.runes=state.build.runes.filter(r=>r.id!==piece.dataset.runeId);saveDraft();renderPreservingView();});
      piece.addEventListener('pointerdown',e=>{const rune=state.build.runes.find(r=>r.id===piece.dataset.runeId);if(!rune)return;piece.setPointerCapture(e.pointerId);piece.classList.add('dragging');const grid=$('#runeGrid'),rect=grid.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,orig={col:rune.col,row:rune.row};let moved=false;const move=ev=>{if(Math.abs(ev.clientX-startX)+Math.abs(ev.clientY-startY)>8)moved=true;};const up=ev=>{piece.removeEventListener('pointermove',move);piece.removeEventListener('pointerup',up);piece.classList.remove('dragging');if(!moved)return;piece.dataset.dragged='1';const col=Math.floor((ev.clientX-rect.left)/rect.width*6),row=Math.floor((ev.clientY-rect.top)/rect.height*7),candidate={...rune,col,row};if(canPlaceRune(candidate,rune.id)){rune.col=col;rune.row=row;}else{rune.col=orig.col;rune.row=orig.row;toast('That move does not fit.');}saveDraft();renderPreservingView();};piece.addEventListener('pointermove',move);piece.addEventListener('pointerup',up);});
    });
  }
  function bindBuildPets(){$$('[data-pet-id]').forEach(s=>s.addEventListener('change',()=>{state.build.pets[Number(s.dataset.petId)].petId=s.value?Number(s.value):null;saveDraft();render();}));$$('[data-pet-bonus]').forEach(s=>s.addEventListener('change',()=>{state.build.pets[Number(s.dataset.petBonus)].bonus=s.value;saveDraft();}));}
  function bindBuildShare(){
    $('#saveBuild').addEventListener('click',()=>{const map=getSavedBuilds(),name=(state.build.name||'Untitled').trim()||'Untitled';map[name]=clone(state.build);setSavedBuilds(map);toast(`Saved “${name}”.`);});
    $('#exportBuild').addEventListener('click',async()=>{try{const code=await encodeIAC(shareState());$('#shareCodeArea').innerHTML=`<div class="field" style="margin-top:14px"><label>Build code</label><textarea id="buildCodeOut" class="textarea code-box" readonly>${esc(code)}</textarea><button id="copyBuildCode" class="ghost-btn" style="margin-top:7px">Copy code</button></div>`;$('#copyBuildCode').addEventListener('click',async()=>{await navigator.clipboard.writeText(code);toast('Build code copied.');});}catch(err){toast(err.message);}});
    $('#shareBuild').addEventListener('click',async()=>{const code=await encodeIAC(shareState()),text=`${buildSummary()}\n\n${code}`;if(navigator.share){try{await navigator.share({title:`IdleArc build: ${state.build.name}`,text});}catch{}}else{await navigator.clipboard.writeText(text);toast('Build summary copied.');}});
    $('#importBuild').addEventListener('click',()=>{openModal(`<div class="modal-head"><div><h2>Import build</h2><p class="panel-sub">Paste an Android or web IAC1 build code.</p></div><button class="modal-close" data-modal-close>×</button></div><textarea id="importCode" class="textarea code-box" placeholder="IAC1:…"></textarea><button id="doImport" class="primary-btn" style="margin-top:10px">Import</button>`);$('[data-modal-close]').addEventListener('click',closeModal);$('#doImport').addEventListener('click',async()=>{try{const obj=await decodeIAC($('#importCode').value);state.build=normalizeImportedBuild(obj);state.skillClassId=state.build.classId;saveDraft();closeModal();toast('Build imported.');render();}catch(err){toast(err.message||'Could not import build.');}});});
  }
  function normalizeImportedBuild(obj){const b=defaultBuild();b.name=obj.name||b.name;b.included=Array.isArray(obj.included)?obj.included:b.included;b.level=obj.level??null;b.classId=Number(obj.classId||1);b.primaryStats=obj.primaryStats||[];b.classAlloc=obj.classAlloc||{};b.passiveAlloc=obj.passiveAlloc||{};b.gear={};Object.entries(obj.gear||{}).forEach(([slot,g])=>b.gear[slot]={item:g.item||g.itemName||'',progression:g.progression||'Base',alternative:g.alternative||g.alternativeItemName||'',affixes:(g.affixes||g.affixIds||[]).map(Number),gems:g.gems||[]});b.talismans=obj.talismans||[];b.dropBonuses=obj.dropBonuses||obj.dropBonusIds||[];b.offensivePriority=obj.offense||obj.offensivePriority||[];b.defensivePriority=obj.defense||obj.defensivePriority||[];b.stance=obj.stance||'';b.runes=(obj.runes||[]).map(r=>({id:r.id||`r${Math.random()}`,type:r.type||'',shape:r.shape||'1×1',secondary:r.secondary||r.secondaryStat||'',word:r.word||r.runeWord||'',col:Number(r.col||0),row:Number(r.row||0)}));b.pets=(obj.pets||[]).map(p=>({petId:p.petId??null,bonus:p.bonus||''})).slice(0,4);while(b.pets.length<4)b.pets.push({petId:null,bonus:''});return b;}

  function renderSavedBuilds(){const map=getSavedBuilds(),entries=Object.entries(map);return entries.length?`<div class="card-list">${entries.map(([name,b])=>`<div class="list-card saved-build"><div class="list-main"><div class="list-title">${esc(name)}</div><div class="list-meta">${esc(CLASS_NAMES[b.classId]||'Unknown class')}${b.level?` • Level ${b.level}`:''} • ${(b.runes||[]).length} runes • ${(b.pets||[]).filter(p=>p.petId).length} pets</div></div><div><button class="mini-btn" data-load-saved="${esc(name)}">Load</button> <button class="mini-btn" data-delete-saved="${esc(name)}">Delete</button></div></div>`).join('')}</div>`:empty('No saved builds yet. Build Studio auto-saves your draft, and named saves will appear here.');}
  function bindSaved(){$$('[data-load-saved]').forEach(b=>b.addEventListener('click',()=>{const map=getSavedBuilds();state.build=normalizeBuild(clone(map[b.dataset.loadSaved]));state.skillClassId=state.build.classId;saveDraft();state.buildTab='overview';go('build');toast(`Loaded “${b.dataset.loadSaved}”.`);}));$$('[data-delete-saved]').forEach(b=>b.addEventListener('click',()=>{const map=getSavedBuilds();delete map[b.dataset.deleteSaved];setSavedBuilds(map);render();}));}

  function openGlobalSearch(){
    openModal(`<div class="modal-head"><div><h2>Search Companion</h2><p class="panel-sub">Equipment, materials, currencies, pets, Rune Words, and class skills.</p></div><button class="modal-close" data-modal-close>×</button></div><input id="globalSearch" class="input" type="search" placeholder="Search items, materials, currency…" autocomplete="off"><div id="globalSearchResults" style="margin-top:10px">${empty('Type at least two characters.')}</div>`,true);
    $('[data-modal-close]').addEventListener('click',closeModal);
    const input=$('#globalSearch');
    input.addEventListener('input',e=>{
      const q=e.target.value.trim().toLowerCase();
      $('#globalSearchResults').innerHTML=q.length<2?empty('Type at least two characters.'):globalSearchResults(q);
      bindGlobalSearchResults();
    });
    bindGlobalSearchResults();
    input.focus({preventScroll:true});
  }
  function bindGlobalSearchResults(){
    $$('[data-global-tab]').forEach(b=>b.addEventListener('click',()=>{
      state.codexTab=b.dataset.globalTab;
      state.codexSearch=b.dataset.globalQuery||'';
      closeModal();
      go('codex');
    }));
  }
  function globalSearchResults(q){
    const {codex,materials,refs}=state.data;
    const items=codex.items.filter(x=>x.name.toLowerCase().includes(q)).slice(0,8);
    const mats=materials.filter(x=>x.name.toLowerCase().includes(q)).slice(0,6);
    const currencies=CODEX_CURRENCIES.filter(x=>x.toLowerCase().includes(q)).slice(0,6);
    const pets=refs.pets.filter(x=>x.name.toLowerCase().includes(q)).slice(0,6);
    const words=refs.rune_words.filter(x=>x.name.toLowerCase().includes(q)).slice(0,6);
    const skills=state.data.skills.classes.flatMap(c=>c.branches.flatMap(b=>b.skills.map(s=>({...s,className:c.name})))).filter(x=>x.name.toLowerCase().includes(q)).slice(0,8);
    const row=(title,meta,tab,query=title)=>`<button type="button" class="list-card clickable" data-global-tab="${tab}" data-global-query="${esc(query)}"><span class="list-main"><span class="list-title">${esc(title)}</span><span class="list-meta">${esc(meta)}</span></span><span class="home-search-arrow" aria-hidden="true">›</span></button>`;
    return [
      items.length?`<h3 class="section-title">Equipment</h3>${items.map(x=>row(x.name,human(x.type),'items')).join('')}`:'',
      mats.length?`<h3 class="section-title">Materials</h3>${mats.map(x=>row(x.name,human(x.type),'materials')).join('')}`:'',
      currencies.length?`<h3 class="section-title">Currencies</h3>${currencies.map(x=>row(x,'In-game currency','currencies')).join('')}`:'',
      pets.length?`<h3 class="section-title">Pets</h3>${pets.map(x=>row(x.name,human(x.type),'pets')).join('')}`:'',
      words.length?`<h3 class="section-title">Rune Words</h3>${words.map(x=>row(x.name,x.requirements,'words')).join('')}`:'',
      skills.length?`<h3 class="section-title">Skills</h3>${skills.map(x=>`<div class="list-card"><span class="list-main"><span class="list-title">${esc(x.name)}</span><span class="list-meta">${esc(x.className)} • ${esc(x.description)}</span></span></div>`).join('')}`:''
    ].join('')||empty('No matches.');
  }

  function useSmartPicker() {
    return !!(window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
  }
  function smartSelectTitle(select) {
    const field=select.closest('.field');
    const label=field?.querySelector('label')?.textContent?.trim();
    if(label)return label;
    if(select.dataset.priorityAdd)return `Add ${select.dataset.priorityAdd} stat`;
    if(select.dataset.petId!==undefined)return 'Choose pet';
    if(select.dataset.petBonus!==undefined)return 'Choose pet bonus';
    if(select.dataset.gearProgression)return 'Rarity / Awakening';
    if(select.dataset.gearAlt)return 'Alternative item';
    if(select.dataset.gearGem)return 'Choose gem';
    return select.getAttribute('aria-label') || 'Choose an option';
  }
  function openSmartSelect(select) {
    const scrollX=window.scrollX, scrollY=window.scrollY;
    const options=[...select.options].map((o,i)=>({i,value:o.value,label:o.textContent,disabled:o.disabled,selected:o.selected}));
    const searchable=options.length>11;
    const title=smartSelectTitle(select);
    const renderRows=(q='')=>options.filter(o=>!q||o.label.toLowerCase().includes(q.toLowerCase())).map(o=>`<button class="select-picker-row ${o.selected?'selected':''}" data-select-option="${o.i}" ${o.disabled?'disabled':''}><span>${esc(o.label)}</span>${o.selected?'<b>✓</b>':''}</button>`).join('')||empty('No matching options.');
    openModal(`<div class="modal-head"><div><div class="section-kicker">Quick picker</div><h2>${esc(title)}</h2><p class="panel-sub">Tap once. No tiny native dropdown gymnastics required.</p></div><button class="modal-close" data-modal-close>×</button></div>${searchable?'<input id="smartSelectSearch" class="input" type="search" placeholder="Search options…" autocomplete="off">':''}<div id="smartSelectRows" class="select-picker-list">${renderRows()}</div>`);
    $('[data-modal-close]')?.addEventListener('click',closeModal);
    const bindRows=()=>$$('[data-select-option]').forEach(b=>b.addEventListener('click',()=>{const o=options[Number(b.dataset.selectOption)];if(!o||o.disabled)return;select.value=o.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));closeModal();requestAnimationFrame(()=>window.scrollTo(scrollX,scrollY));}));
    bindRows();
    $('#smartSelectSearch')?.addEventListener('input',e=>{$('#smartSelectRows').innerHTML=renderRows(e.target.value);bindRows();});
  }
  function setupSmartSelects() {
    let gesture=null, suppressClickUntil=0;
    const findSelect=e=>e.target instanceof Element ? e.target.closest('select.select') : null;
    const clear=()=>{gesture=null;};

    // Intercept touch before Android opens the native select popup. A short
    // tap opens the in-app list; movement is left alone so page scrolling works.
    document.addEventListener('pointerdown',e=>{
      if(!useSmartPicker()||e.pointerType==='mouse')return;
      const select=findSelect(e);
      if(!select||select.disabled)return;
      e.preventDefault();
      gesture={select,pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
    },{capture:true,passive:false});
    document.addEventListener('pointermove',e=>{
      if(gesture&&gesture.pointerId===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>10)gesture.moved=true;
    },{capture:true,passive:true});
    document.addEventListener('pointerup',e=>{
      if(!gesture||gesture.pointerId!==e.pointerId)return;
      const {select,moved}=gesture; clear(); e.preventDefault();
      if(moved)return;
      e.stopPropagation(); suppressClickUntil=performance.now()+650; openSmartSelect(select);
    },{capture:true,passive:false});
    document.addEventListener('pointercancel',clear,{capture:true});

    // Fallback for touch browsers that dispatch click without Pointer Events.
    document.addEventListener('click',e=>{
      if(!useSmartPicker())return;
      const select=findSelect(e);
      if(!select||select.disabled)return;
      e.preventDefault(); e.stopPropagation();
      if(performance.now()<suppressClickUntil)return;
      openSmartSelect(select);
    },{capture:true});

    // Keep keyboard access available when a touch device is paired with a
    // hardware keyboard.
    document.addEventListener('keydown',e=>{
      if(!useSmartPicker()||!['Enter',' '].includes(e.key))return;
      const select=findSelect(e);
      if(!select||select.disabled)return;
      e.preventDefault();openSmartSelect(select);
    },{capture:true});
  }

  function setupInstall(){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;$('#installButton').hidden=false;$('#installButtonTop').hidden=false;});const install=async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$('#installButton').hidden=true;$('#installButtonTop').hidden=true;};$('#installButton').addEventListener('click',install);$('#installButtonTop').addEventListener('click',install);}
  function updateOnline(){const badge=$('#offlineBadge');badge.textContent=navigator.onLine?'Online • offline cache ready':'Offline mode';badge.style.color=navigator.onLine?'var(--green)':'var(--gold)';}

  async function init(){
    document.addEventListener('error',e=>{const img=e.target;if(img instanceof HTMLImageElement && !img.dataset.fallback){img.dataset.fallback='1';img.src='./icons/icon.svg';}},true);
    setupNav(); setupInstall(); setupSmartSelects(); updateOnline(); window.addEventListener('online',updateOnline); window.addEventListener('offline',updateOnline);
    $('#globalSearchButton').addEventListener('click',openGlobalSearch);
    $('#content').innerHTML='<div class="grid grid-2"><div class="skeleton"></div><div class="skeleton"></div></div>';
    try{await loadData();render();}catch(err){console.error(err);$('#content').innerHTML=`<div class="panel"><h2>Could not load Companion data</h2><p class="panel-sub">${esc(err.message)}</p></div>`;}
    /* service worker отключён: в превью он только мешает (кэширует старые файлы) */
    if('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations){
      navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
    }
  }
  window.addEventListener('hashchange',()=>{state.route=location.hash.replace('#','')||'home';render({preserveViewport:false});window.scrollTo(0,0);});
  window.addEventListener('DOMContentLoaded',init);
})();
