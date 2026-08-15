'use strict';
/* Plain-Node test runner for src/math.js — no test framework or
   dependencies required. Run with: npm test */
const assert = require('assert');
const {
  randInt, generateProblem, generateSubtractionProblem, buildProblemSet,
  buildColumnPlan, buildSubtractionColumnPlan, placeLabel, placeLabelShort,
  subtractionStepPromptText,
} = require('../src/math.js');

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

test('level 0 problems: 1-digit inputs, correct sum', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(0);
    assert.ok(p.a >= 1 && p.a <= 9, `a=${p.a} is not 1-digit`);
    assert.ok(p.b >= 1 && p.b <= 9, `b=${p.b} is not 1-digit`);
    assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
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

test('level 4 problems: 3-digit + 2-digit combination', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(4);
    assert.ok(p.a >= 100 && p.a <= 999, `a=${p.a} is not 3-digit`);
    assert.ok(p.b >= 10 && p.b <= 99, `b=${p.b} is not 2-digit`);
    assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
  }
});

test('level 5 problems: 3-digit + 3-digit combination', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(5);
    assert.ok(p.a >= 100 && p.a <= 999 && p.b >= 100 && p.b <= 999, `${p.a}+${p.b} inputs must both be 3-digit`);
    assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
  }
});

test('level 6 problems: 4-digit + 3-digit combination', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(6);
    assert.ok(p.a >= 1000 && p.a <= 9999, `a=${p.a} is not 4-digit`);
    assert.ok(p.b >= 100 && p.b <= 999, `b=${p.b} is not 3-digit`);
    assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
  }
});

test('level 7 problems: 4-digit + 4-digit combination', () => {
  for (let i = 0; i < 1000; i++) {
    const p = generateProblem(7);
    assert.ok(p.a >= 1000 && p.a <= 9999 && p.b >= 1000 && p.b <= 9999, `${p.a}+${p.b} inputs must both be 4-digit`);
    assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
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

test('buildColumnPlan reconstructs the exact sum for 3-digit pairs, including thousands overflow', () => {
  [[999, 999], [500, 500], [100, 100], [950, 99], [1, 999]].forEach(([a, b]) => {
    const plan = buildColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a + b, `plan for ${a}+${b} reconstructed to ${reconstructed}`);
  });
  for (let i = 0; i < 3000; i++) {
    const a = randInt(100, 999);
    const b = randInt(100, 999);
    const plan = buildColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a + b, `plan for ${a}+${b} reconstructed to ${reconstructed}`);
  }
});

test('buildColumnPlan reconstructs the exact sum for 4-digit pairs, including ten-thousands overflow', () => {
  [[9999, 9999], [9000, 9000], [1000, 1000], [9999, 1], [5000, 4999]].forEach(([a, b]) => {
    const plan = buildColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a + b, `plan for ${a}+${b} reconstructed to ${reconstructed}`);
  });
  for (let i = 0; i < 3000; i++) {
    const a = randInt(1000, 9999);
    const b = randInt(1000, 9999);
    const plan = buildColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a + b, `plan for ${a}+${b} reconstructed to ${reconstructed}`);
  }
});

test('subtraction levels 0-7: a >= b always, answer is correct, and per-level constraints hold', () => {
  for (let level = 0; level <= 7; level++) {
    for (let i = 0; i < 2000; i++) {
      const p = generateSubtractionProblem(level);
      assert.ok(p.a >= p.b, `level ${level}: ${p.a}-${p.b} should never be negative`);
      assert.strictEqual(p.a - p.b, p.answer, `${p.a}-${p.b} should equal ${p.answer}`);
      if (level === 0) {
        assert.ok(p.a >= 1 && p.a <= 9 && p.b >= 1 && p.b <= 9, `level 0: ${p.a}-${p.b} inputs must both be 1-digit`);
      } else if (level <= 3) {
        assert.ok(p.a >= 10 && p.a <= 99 && p.b >= 10 && p.b <= 99, `level ${level}: ${p.a}-${p.b} inputs must both be 2-digit`);
      } else if (level === 4) {
        assert.ok(p.a >= 100 && p.a <= 999, `level 4: a=${p.a} is not 3-digit`);
        assert.ok(p.b >= 10 && p.b <= 99, `level 4: b=${p.b} is not 2-digit`);
      } else if (level === 5) {
        assert.ok(p.a >= 100 && p.a <= 999 && p.b >= 100 && p.b <= 999, `level 5: ${p.a}-${p.b} inputs must both be 3-digit`);
      } else if (level === 6) {
        assert.ok(p.a >= 1000 && p.a <= 9999, `level 6: a=${p.a} is not 4-digit`);
        assert.ok(p.b >= 100 && p.b <= 999, `level 6: b=${p.b} is not 3-digit`);
      } else {
        assert.ok(p.a >= 1000 && p.a <= 9999 && p.b >= 1000 && p.b <= 9999, `level 7: ${p.a}-${p.b} inputs must both be 4-digit`);
      }
      const plan = buildSubtractionColumnPlan(p.a, p.b);
      if (level === 1) {
        assert.ok(plan.every(s => s.borrowOut === 0), `level 1: ${p.a}-${p.b} should never borrow`);
      }
      if (level === 2) {
        assert.strictEqual(plan[0].borrowOut, 1, `level 2: ${p.a}-${p.b} should borrow the ones column`);
        assert.strictEqual(plan[1].borrowOut, 0, `level 2: ${p.a}-${p.b} should not need a second borrow`);
      }
    }
  }
});

test('buildSubtractionColumnPlan reconstructs the exact difference for known borrow-chain edge cases', () => {
  [[500, 258], [300, 299], [999, 1], [999, 999], [100, 99], [910, 111], [10, 10]].forEach(([a, b]) => {
    const plan = buildSubtractionColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a - b, `plan for ${a}-${b} reconstructed to ${reconstructed}`);
    assert.strictEqual(plan[plan.length - 1].borrowOut, 0, `plan for ${a}-${b} should never leave a leftover borrow`);
  });
});

test('buildSubtractionColumnPlan reconstructs the exact difference for 5000 random pairs (2-digit and 3-digit)', () => {
  for (let i = 0; i < 5000; i++) {
    const [lo, hi] = i % 2 === 0 ? [10, 99] : [100, 999];
    let a = randInt(lo, hi);
    let b = randInt(lo, hi);
    if (a < b) { const t = a; a = b; b = t; }
    const plan = buildSubtractionColumnPlan(a, b);
    const reconstructed = Number(plan.map(s => s.digit).reverse().join(''));
    assert.strictEqual(reconstructed, a - b, `plan for ${a}-${b} reconstructed to ${reconstructed}`);
    assert.strictEqual(plan[plan.length - 1].borrowOut, 0, `plan for ${a}-${b} should never leave a leftover borrow`);
  }
});

test('subtractionStepPromptText shows the already-borrowed value for 500 - 258', () => {
  const plan = buildSubtractionColumnPlan(500, 258);
  assert.deepStrictEqual(plan.map(subtractionStepPromptText), [
    'いちのくらい：10 － 8 = ?',
    'じゅうのくらい：9 － 5 = ?',
    'ひゃくのくらい：4 － 2 = ?',
  ]);
});

test('buildProblemSet avoids back-to-back duplicate problems (addition and subtraction)', () => {
  for (let level = 0; level <= 7; level++) {
    for (let trial = 0; trial < 50; trial++) {
      const set = buildProblemSet(level, 10);
      for (let i = 1; i < set.length; i++) {
        assert.ok(
          !(set[i].a === set[i - 1].a && set[i].b === set[i - 1].b),
          `level ${level} set has consecutive duplicate ${set[i].a}+${set[i].b}`
        );
      }
      const subSet = buildProblemSet(level, 10, generateSubtractionProblem);
      for (let i = 1; i < subSet.length; i++) {
        assert.ok(
          !(subSet[i].a === subSet[i - 1].a && subSet[i].b === subSet[i - 1].b),
          `level ${level} subtraction set has consecutive duplicate ${subSet[i].a}-${subSet[i].b}`
        );
      }
    }
  }
});

test('placeLabel returns the right Japanese place-value name', () => {
  assert.strictEqual(placeLabel(0), 'いちのくらい');
  assert.strictEqual(placeLabel(1), 'じゅうのくらい');
  assert.strictEqual(placeLabel(2), 'ひゃくのくらい');
  assert.strictEqual(placeLabel(3), 'せんのくらい');
  assert.strictEqual(placeLabel(4), 'まんのくらい');
});

test('placeLabelShort stays short enough to never wrap in the narrow column header', () => {
  for (let i = 0; i <= 4; i++) {
    assert.ok(placeLabelShort(i).length <= 4, `placeLabelShort(${i}) is too long: ${placeLabelShort(i)}`);
  }
  assert.strictEqual(placeLabelShort(0), 'いちの');
  assert.strictEqual(placeLabelShort(1), 'じゅうの');
  assert.strictEqual(placeLabelShort(2), 'ひゃくの');
  assert.strictEqual(placeLabelShort(3), 'せんの');
  assert.strictEqual(placeLabelShort(4), 'まんの');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
