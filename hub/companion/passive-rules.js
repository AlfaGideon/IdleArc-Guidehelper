/* Shared passive allocation invariants for the Companion UI and its tests. */
(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  if (root) root.IA_PASSIVE_RULES = rules;
})(typeof window !== 'undefined' ? window : null, function () {
  function key(ri, ni, node) { return `${ri}:${ni}:${node.stat}`; }
  function isMilestone(row, ri) { return !!row && (row.milestone === true || (ri + 1) % 10 === 0); }
  function rowSpent(rows, alloc, ri) {
    return (rows[ri]?.nodes || []).reduce((n, node, ni) => n + Number(alloc[key(ri, ni, node)] || 0), 0);
  }
  function canAdd(rows, alloc, ri, ni) {
    const row = rows[ri], node = row?.nodes?.[ni];
    if (!node) return false;
    const current = Number(alloc[key(ri, ni, node)] || 0);
    if (current >= Number(node.max_points)) return false;
    return !isMilestone(row, ri) || rowSpent(rows, alloc, ri) < 1;
  }
  // Existing saves/imports from older versions may include all three milestones.
  // Preserve the first selected node, drop the others and clamp impossible ranks.
  function normalize(rows, alloc) {
    const out = {};
    rows.forEach((row, ri) => {
      row.nodes.forEach((node, ni) => {
        const value = Number(alloc?.[key(ri, ni, node)] || 0);
        const limit = Math.min(Number(node.max_points) || 0, isMilestone(row, ri) ? 1 : Infinity);
        if (Number.isFinite(value) && value > 0 && (!isMilestone(row, ri) || rowSpent(rows, out, ri) === 0))
          out[key(ri, ni, node)] = Math.min(Math.floor(value), limit);
      });
    });
    return out;
  }
  return { key, isMilestone, rowSpent, canAdd, normalize };
});
