// Run with: node --test tests/atom-motion.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('src/app.js', 'utf8');
function motion() {
  let seed = 1234;
  const math = Object.create(Math);
  math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  const ctx = vm.createContext({ Math: math, flipReducedMotion: { matches: false } });
  vm.runInContext(source.slice(source.indexOf('const atomMotion ='), source.indexOf('function drawAtom(')) + '\nthis.state = atomMotion;', ctx);
  return { ctx, step: delta => ctx.updateAtomMotion(delta) };
}
test('ten minutes of wandering stays bounded and changes direction', () => {
  const { ctx, step } = motion();
  let lastX = .5, lastVelocity = 0, turns = 0, min = 1, max = 0;
  for (let i = 0; i < 36000; i++) {
    step(1);
    const { x, y } = ctx.state;
    assert.ok(x >= .04 && x <= .96 && y >= .04 && y <= .96);
    const velocity = x - lastX;
    if (velocity * lastVelocity < 0) turns++;
    assert.ok(Math.abs(velocity) < .02, 'no position jumps');
    min = Math.min(min, x); max = Math.max(max, x);
    lastVelocity = velocity; lastX = x;
  }
  assert.ok(turns > 40);
  assert.ok(max - min > .6);
});
test('same path at 30, 60, 90 and 120 Hz', () => {
  const states = [30, 60, 90, 120].map(hz => {
    const { ctx, step } = motion();
    for (let i = 0; i < hz * 60; i++) step(60 / hz);
    return ctx.state;
  });
  for (const state of states) {
    assert.ok(Math.abs(state.x - states[0].x) < 1e-9);
    assert.ok(Math.abs(state.y - states[0].y) < 1e-9);
  }
});
test('reduced motion and zero elapsed time freeze steering; long gaps are capped', () => {
  const a = motion(), b = motion();
  a.ctx.flipReducedMotion.matches = true;
  a.step(60);
  assert.equal(a.ctx.state.x, .5);
  assert.equal(a.ctx.state.untilTurn, 0);
  a.ctx.flipReducedMotion.matches = false;
  a.step(0);
  assert.equal(a.ctx.state.untilTurn, 0);
  a.step(600); b.step(6);
  assert.equal(a.ctx.state.x, b.ctx.state.x);
});
