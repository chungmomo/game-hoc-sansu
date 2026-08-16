'use strict';
/* Plain-Node test runner for src/math.js — no test framework or
   dependencies required. Run with: npm test */
const assert = require('assert');
const {
  randInt, generateProblem, generateSubtractionProblem, buildProblemSet,
  buildColumnPlan, buildSubtractionColumnPlan, placeLabel, placeLabelShort,
  subtractionStepPromptText, generateMultiplicationProblem, generateDivisionProblem,
  buildSingleStepPlan,
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

/* Add/sub levels are 1-100: 4 digit-count tiers (1-4 digits) of 25
   sub-levels each (id = (digits-1)*25 + subLevel). digitBounds(digits)
   mirrors that scheme for the assertions below. */
function digitBounds(digits) {
  if (digits === 1) return [1, 9];
  const lo = Math.pow(10, digits - 1);
  const hi = Math.pow(10, digits) - 1;
  return [lo, hi];
}

test('addition levels 1-100: correct digit count and sum for every tier/sub-level boundary', () => {
  // id 1/25/26/50/51/75/76/100 covers every tier's first and last sub-level
  [1, 13, 25, 26, 50, 51, 75, 76, 88, 100].forEach(level => {
    const digits = Math.min(4, Math.ceil(level / 25));
    const [lo, hi] = digitBounds(digits);
    for (let i = 0; i < 500; i++) {
      const p = generateProblem(level);
      assert.ok(p.a >= lo && p.a <= hi, `level ${level}: a=${p.a} should be ${digits}-digit`);
      assert.ok(p.b >= lo && p.b <= hi, `level ${level}: b=${p.b} should be ${digits}-digit`);
      assert.strictEqual(p.a + p.b, p.answer, `${p.a}+${p.b} should equal ${p.answer}`);
    }
  });
});

test('addition sub-level 1 of every tier never carries', () => {
  [1, 26, 51, 76].forEach(level => {
    for (let i = 0; i < 500; i++) {
      const p = generateProblem(level);
      buildColumnPlan(p.a, p.b).forEach(step => {
        assert.strictEqual(step.carryOut, 0, `level ${level} (sub-level 1): ${p.a}+${p.b} produced a carry at column ${step.index}`);
      });
    }
  });
});

test('addition sub-level 25 (mastery) of every tier always carries somewhere', () => {
  [25, 50, 75, 100].forEach(level => {
    for (let i = 0; i < 500; i++) {
      const p = generateProblem(level);
      const plan = buildColumnPlan(p.a, p.b);
      assert.ok(plan.some(step => step.carryOut > 0), `level ${level} (sub-level 25): ${p.a}+${p.b} should carry at least once`);
    }
  });
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

test('subtraction levels 1-100: a >= b always, correct digit count and difference for every tier/sub-level boundary', () => {
  [1, 13, 25, 26, 50, 51, 75, 76, 88, 100].forEach(level => {
    const digits = Math.min(4, Math.ceil(level / 25));
    const [lo, hi] = digitBounds(digits);
    for (let i = 0; i < 500; i++) {
      const p = generateSubtractionProblem(level);
      assert.ok(p.a >= p.b, `level ${level}: ${p.a}-${p.b} should never be negative`);
      assert.strictEqual(p.a - p.b, p.answer, `${p.a}-${p.b} should equal ${p.answer}`);
      assert.ok(p.a >= lo && p.a <= hi, `level ${level}: a=${p.a} should be ${digits}-digit`);
      assert.ok(p.b >= lo && p.b <= hi, `level ${level}: b=${p.b} should be ${digits}-digit`);
    }
  });
});

test('subtraction sub-level 1 of every tier never borrows', () => {
  [1, 26, 51, 76].forEach(level => {
    for (let i = 0; i < 500; i++) {
      const p = generateSubtractionProblem(level);
      const plan = buildSubtractionColumnPlan(p.a, p.b);
      assert.ok(plan.every(s => s.borrowOut === 0), `level ${level} (sub-level 1): ${p.a}-${p.b} should never borrow`);
    }
  });
});

test('subtraction sub-level 25 (mastery) borrows somewhere, for tiers with a column to borrow from (2+ digits)', () => {
  // the 1-digit tier (level 25) is excluded — a single column can never
  // borrow, regardless of how "hard" that tier's difficulty ramp gets.
  [50, 75, 100].forEach(level => {
    for (let i = 0; i < 500; i++) {
      const p = generateSubtractionProblem(level);
      const plan = buildSubtractionColumnPlan(p.a, p.b);
      assert.ok(plan.some(s => s.borrowOut > 0), `level ${level} (sub-level 25): ${p.a}-${p.b} should borrow at least once`);
    }
  });
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
  [1, 25, 26, 50, 51, 75, 76, 100].forEach(level => {
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
  });
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

test('multiplication levels 1-3: correct product and per-level times-table range', () => {
  for (let level = 1; level <= 3; level++) {
    for (let i = 0; i < 2000; i++) {
      const p = generateMultiplicationProblem(level);
      assert.strictEqual(p.a * p.b, p.answer, `${p.a}×${p.b} should equal ${p.answer}`);
      assert.ok(p.a >= 1 && p.a <= 9 && p.b >= 1 && p.b <= 9, `${p.a}×${p.b}: both factors should be single-digit`);
      if (level === 1) {
        const inTable = (n) => n >= 2 && n <= 5;
        assert.ok(inTable(p.a) || inTable(p.b), `level 1: ${p.a}×${p.b} should involve the 2-5 times table`);
      } else if (level === 2) {
        assert.ok(p.a === 6 || p.a === 7 || p.b === 6 || p.b === 7, `level 2: ${p.a}×${p.b} should involve the 6-7 times table`);
      }
    }
  }
});

test('division levels 1-3: always exact (no remainder), correct quotient, per-level divisor range', () => {
  for (let level = 1; level <= 3; level++) {
    for (let i = 0; i < 2000; i++) {
      const p = generateDivisionProblem(level);
      assert.strictEqual(p.a % p.b, 0, `${p.a}÷${p.b} should divide evenly`);
      assert.strictEqual(p.a / p.b, p.answer, `${p.a}÷${p.b} should equal ${p.answer}`);
      assert.ok(p.answer >= 1 && p.answer <= 9, `quotient ${p.answer} should be single-digit`);
      assert.ok(p.b >= 2 && p.b <= 9, `divisor ${p.b} should be 2-9`);
      if (level === 1) assert.ok(p.b >= 2 && p.b <= 5, `level 1: divisor ${p.b} should be 2-5`);
      else if (level === 2) assert.ok(p.b === 6 || p.b === 7, `level 2: divisor ${p.b} should be 6-7`);
    }
  }
});

test('buildProblemSet works with the multiplication/division generators (no consecutive dup)', () => {
  [generateMultiplicationProblem, generateDivisionProblem].forEach(gen => {
    for (let level = 1; level <= 3; level++) {
      for (let trial = 0; trial < 30; trial++) {
        const set = buildProblemSet(level, 10, gen);
        assert.strictEqual(set.length, 10);
        for (let i = 1; i < set.length; i++) {
          assert.ok(!(set[i].a === set[i - 1].a && set[i].b === set[i - 1].b), 'set has consecutive duplicate');
        }
      }
    }
  });
});

test('buildSingleStepPlan wraps a fact into the one-element plan shape the game loop expects', () => {
  const plan = buildSingleStepPlan(7, 8, 56);
  assert.strictEqual(plan.length, 1);
  assert.deepStrictEqual(plan[0], { index: 0, x: 7, y: 8, digit: 56, synthetic: false });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
