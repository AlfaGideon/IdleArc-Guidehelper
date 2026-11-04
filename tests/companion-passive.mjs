import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const rules = require('../hub/companion/passive-rules.js');
const data = JSON.parse(fs.readFileSync(new URL('../hub/companion/data/skill_tree_data.json', import.meta.url))).passive;
const { rows, tiers } = data;
assert.equal(rows.length, 200);
for (let ri = 0; ri < rows.length; ri++) assert.equal(rules.isMilestone(rows[ri], ri), (ri + 1) % 10 === 0);
const alloc = { [rules.key(9, 0, rows[9].nodes[0])]: 1 };
assert.equal(rules.canAdd(rows, alloc, 9, 1), false);
assert.equal(rules.canAdd(rows, {}, 9, 1), true);
const old = Object.fromEntries(rows[9].nodes.map((n, i) => [rules.key(9, i, n), 1]));
const clean = rules.normalize(rows, old);
assert.equal(rules.rowSpent(rows, clean, 9), 1, 'invalid saved milestones are repaired');
assert.equal(rules.normalize(rows, clean)[rules.key(9, 0, rows[9].nodes[0])], 1);
// Run the real planner in a tiny DOM shim; no production-only test hooks needed.
const source = fs.readFileSync(new URL('../hub/companion/app.js', import.meta.url), 'utf8');
const injected = source.replace('  window.addEventListener(\'DOMContentLoaded\',init);',
  '  window.__test = { passivePlan, passiveWeights, passiveRows, passiveBlockReason, state };');
const sandbox = { window: { IA_PASSIVE_RULES: rules, addEventListener() {} }, document: {},
  localStorage: { getItem() { return null; } }, location: { hash: '' } };
vm.runInNewContext(injected, sandbox);
const api = sandbox.window.__test;
api.state.data = { skills: { passive: data } };
api.state.build = { passiveAlloc: {} };
for (const budget of [1, 10, 20, 30, 120, 250, 1000, 1500]) {
  const plan = api.passivePlan(1, 'balanced', budget);
  assert.equal(plan.spent + plan.leftover, budget);
  assert.ok(plan.spent <= budget);
  for (let ri = 0; ri < rows.length; ri++) {
    if (rules.isMilestone(rows[ri], ri)) assert.ok(rules.rowSpent(rows, plan.alloc, ri) <= 1, `budget ${budget}, row ${ri + 1}`);
  }
}
api.state.build.passiveAlloc = alloc;
assert.ok(api.passiveBlockReason(9, 1, 1));
console.log('Companion passive milestones: planner, manual selection, saved allocations OK');
