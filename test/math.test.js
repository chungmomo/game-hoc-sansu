'use strict';
/* Plain-Node test runner for src/math.js — no test framework or
   dependencies required. Run with: npm test */
const assert = require('assert');
const { randInt, generateProblem, buildProblemSet, buildColumnPlan, placeLabel } = require('../src/math.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.message}`);
  }
}

test('randInt stays within the requested bounds', () => {
  for (let i = 0; i < 1000; i++) {
    const n = randInt(3, 7);
    assert.ok(n >= 3 && n <= 7, `randInt(3,7) returned ${n}`);
  }
});

test('level 1 problems: 2-digit inputs, correct sum, no carrying', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(1);
    assert.ok(p.a >= 10 && p.a <= 99, `a=${p.a} is not 2-digit`);
    assert.ok(p.b >= 10 && p.b <= 99, `b=${p.b} is not 2-digit`);
    assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
    buildColumnPlan(p.a, p.b).forEach(step => {
      assert.strictEqual(step.carryOut, 0, `level 1 problem ${p.a}+${p.b} produced a carry at column ${step.index}`);
    });
  }
});

test('level 2 problems: carry the ones digit, answer stays under 100', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(2);
    assert.ok(p.a >= 10 && p.a <= 99 && p.b >= 10 && p.b <= 99, `${p.a}+${p.b} inputs must both be 2-digit`);
    assert.strictEqual(p.a + p.b, p.answer);
    assert.ok(p.answer < 100, `${p.a}+${p.b}=${p.answer} should stay under 100`);
    const plan = buildColumnPlan(p.a, p.b);
    assert.ok(plan[0].carryOut > 0, `${p.a}+${p.b} should carry out of the ones column`);
  }
});

test('level 3 problems: any 2-digit + 2-digit combination', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(3);
    assert.ok(p.a >= 10 && p.a <= 99 && p.b >= 10 && p.b <= 99);
    assert.strictEqual(p.a + p.b, p.answer);
  }
});

test('buildColumnPlan reconstructs the exact sum for known edge cases', () => {
  [[10, 10], [99, 99], [90, 10], [50, 50], [1, 1], [9, 9], [45, 55]].forEach(([a, b]) => {
    const plan = buildColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a + b, `plan for ${a}+${b} reconstructed to ${reconstructed}`);
  });
});

test('buildColumnPlan reconstructs the exact sum for 3000 random pairs', () => {
  for (let i = 0; i < 3000; i++) {
    const a = randInt(1, 99);
    const b = randInt(1, 99);
    const plan = buildColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a + b, `plan for ${a}+${b} reconstructed to ${reconstructed}`);
  }
});

test('buildProblemSet avoids back-to-back duplicate problems', () => {
  for (let level = 1; level <= 3; level++) {
    for (let trial = 0; trial < 50; trial++) {
      const set = buildProblemSet(level, 10);
      for (let i = 1; i < set.length; i++) {
        assert.ok(
          !(set[i].a === set[i - 1].a && set[i].b === set[i - 1].b),
          `level ${level} set has consecutive duplicate ${set[i].a}+${set[i].b}`
        );
      }
    }
  }
});

test('placeLabel returns the right Vietnamese place-value name', () => {
  assert.strictEqual(placeLabel(0), 'Đơn Vị');
  assert.strictEqual(placeLabel(1), 'Chục');
  assert.strictEqual(placeLabel(2), 'Trăm');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
