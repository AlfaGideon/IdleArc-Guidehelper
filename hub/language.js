// Shared by the hub and both standalone apps. Keep Companion's existing preference.
(() => {
  const key = 'iac:lang';
  const isHub = document.documentElement.hasAttribute('data-language-hub');
  let hub;
  try {
    if (parent !== window && parent.IdleArcLanguage?.isHub) hub = parent.IdleArcLanguage;
  } catch { /* A different site can embed the standalone app. */ }

  let saved;
  try { saved = localStorage.getItem(key); } catch { /* Storage can be blocked in an embedded page. */ }
  saved = history.state?.idleArcLanguage || saved;
  let current = hub?.current || (saved === 'en' ? 'en' : 'ru');
  document.documentElement.lang = current;
  if (hub) document.documentElement.classList.add('hub-embedded');

  function paint() {
    for (const label of document.querySelectorAll('[data-en]')) {
      label.dataset.ru ??= label.textContent;
      label.textContent = current === 'en' ? label.dataset.en : label.dataset.ru;
    }
    for (const select of document.querySelectorAll('select[data-language]')) select.value = current;
  }

  function set(language) {
    if (!['ru', 'en'].includes(language) || current === language) return;
    current = language;
    try {
      localStorage.setItem(key, language);
      if (history.state?.idleArcLanguage) {
        const { idleArcLanguage, ...rest } = history.state;
        history.replaceState(rest, '');
      }
    } catch {
      history.replaceState({ ...history.state, idleArcLanguage: language }, '');
    }
    document.documentElement.lang = language;
    paint();
    if (isHub) {
      for (const frame of document.querySelectorAll('.stage iframe')) {
        try { frame.contentWindow?.IdleArcLanguage?.set(language); } catch { /* The frame navigated away. */ }
      }
    }
    window.dispatchEvent(new Event('ia-language'));
  }

  window.IdleArcLanguage = {
    isHub,
    get current() { return current; },
    set: (language) => hub && hub.current !== language ? hub.set(language) : set(language),
  };
  document.addEventListener('DOMContentLoaded', paint);
  document.addEventListener('change', (e) => {
    if (e.target.matches('select[data-language]')) window.IdleArcLanguage.set(e.target.value);
  });
  window.addEventListener('storage', (e) => {
    if (e.key === key || e.key === null) set(localStorage.getItem(key) || 'ru');
  });
})();
