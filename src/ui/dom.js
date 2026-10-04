/** Минимальные DOM-хелперы (без фреймворков). */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    // Числа/булевы/строки превращаем в текстовый узел: appendChild(0) в браузере бросает TypeError,
    // а в таблицы часто попадают числа прямо из данных (кол-во вторичек, ML, золото).
    if (typeof c === 'object') {
      if (!c.nodeType) throw new Error(`el(${tag}): в children попал объект без nodeType (${Object.keys(c).slice(0, 4).join(', ')}) — для карточек передавайте массив, а не объект`);
      node.appendChild(c);
    } else node.appendChild(document.createTextNode(String(c)));
  }
  return node;
}

export function card(title, children, extraClass = '') {
  return el('section', { class: `card ${extraClass}`.trim() }, [
    title ? el('h2', { text: title }) : null,
    ...[].concat(children),
  ]);
}

export function table(headers, rows, opts = {}) {
  const thead = el('thead', {}, [el('tr', {}, headers.map((h) => el('th', { text: h, class: opts.numeric?.includes(h) ? 'num' : '' })))]);
  const tbody = el('tbody', {}, rows.map((r) => el('tr', {}, r.map((cell, i) =>
    el('td', { class: opts.numeric?.includes(headers[i]) ? 'num' : '' }, [cell == null || cell === '' ? '—' : cell])))));
  return el('table', {}, [thead, tbody]);
}

export function chips(items) {
  return el('div', { class: 'chips' }, items.map((i) => (typeof i === 'string' ? el('span', { class: 'chip', text: i }) : el('span', { class: `chip ${i.kind || ''}`, text: i.text }))));
}

export function kpi(items) {
  return el('div', { class: 'kpi' }, items.map((it) => el('div', { class: 'k' }, [el('b', { text: it.value }), el('span', { text: it.label })])));
}

export function copyButton(text, label = 'Скопировать') {
  return el('button', {
    class: 'btn',
    text: label,
    onclick: async (e) => {
      try {
        await navigator.clipboard.writeText(text);
        e.target.textContent = 'Скопировано ✓';
        setTimeout(() => { e.target.textContent = label; }, 1500);
      } catch {
        e.target.textContent = 'Не удалось скопировать';
      }
    },
  });
}
