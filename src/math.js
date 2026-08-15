/* Pure arithmetic and problem-generation logic — no DOM access.
   Loads unmodified in the browser (attaches to window.PM.Math) and
   in Node for the automated tests in test/math.test.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PM = root.PM || {};
    root.PM.Math = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  /** Retries `sample()` (which returns null when the pair it drew
      doesn't satisfy the level's digit constraint) until it returns a
      value, up to `maxAttempts` times. Used instead of deriving one
      digit from another so every valid combination is equally likely
      — the old nested-derivation style (pick tensA, then constrain
      tensB's range from it) skewed results toward small leading
      digits, since a big tensA left tensB almost no room. The
      constraints here are all satisfied by at least ~20% of random
      draws, so this converges in a handful of attempts. */
  function sampleUntilValid(sample, maxAttempts) {
    for (let i = 0; i < maxAttempts; i++) {
      const result = sample();
      if (result) return result;
    }
    return sample.fallback();
  }

  /**
   * Generates an addition problem for the given level.
   * Level 1: 2-digit + 2-digit, no carrying anywhere.
   * Level 2: 2-digit + 2-digit, carries the ones digit but the answer
   * stays 2-digit. Level 3: 2-digit + 2-digit, unconstrained (answer may
   * reach 198). Level 4: 3-digit + 2-digit, unconstrained. Level 5:
   * 3-digit + 3-digit, unconstrained (answer may reach 1998). Level 6:
   * 4-digit + 3-digit, unconstrained. Level 7: 4-digit + 4-digit,
   * unconstrained (answer may reach 19998).
   */
  function generateProblem(level) {
    let a, b;
    if (level === 1) {
      const sample = () => {
        const x = randInt(10, 99);
        const y = randInt(10, 99);
        const noCarry = (Math.floor(x / 10) + Math.floor(y / 10) < 10) && (x % 10 + y % 10 < 10);
        return noCarry ? [x, y] : null;
      };
      sample.fallback = () => [12, 13];
      [a, b] = sampleUntilValid(sample, 200);
    } else if (level === 2) {
      const sample = () => {
        const x = randInt(10, 99);
        const y = randInt(10, 99);
        // < 9, not < 10 — the +1 carried in from the ones column still
        // needs to fit without pushing the tens sum to 10 (which would
        // carry again into the hundreds, breaking "answer stays 2-digit").
        const tensOk = Math.floor(x / 10) + Math.floor(y / 10) < 9;
        const onesCarries = (x % 10) + (y % 10) >= 10;
        return (tensOk && onesCarries) ? [x, y] : null;
      };
      sample.fallback = () => [19, 15];
      [a, b] = sampleUntilValid(sample, 200);
    } else if (level === 3) {
      a = randInt(10, 99);
      b = randInt(10, 99);
    } else if (level === 4) {
      a = randInt(100, 999);
      b = randInt(10, 99);
    } else if (level === 5) {
      a = randInt(100, 999);
      b = randInt(100, 999);
    } else if (level === 6) {
      a = randInt(1000, 9999);
      b = randInt(100, 999);
    } else {
      a = randInt(1000, 9999);
      b = randInt(1000, 9999);
    }
    return { a, b, answer: a + b };
  }

  /**
   * Generates a subtraction problem (a - b, always a >= b so the answer
   * is never negative) for the given level. Mirrors generateProblem's
   * difficulty tiers: level 1 no borrowing, level 2 borrows the ones
   * digit only, level 3 free 2-digit, level 4 3-digit - 2-digit, level 5
   * free 3-digit - 3-digit, level 6 4-digit - 3-digit, level 7 free
   * 4-digit - 4-digit.
   */
  function generateSubtractionProblem(level) {
    let a, b;
    if (level === 1) {
      const sample = () => {
        const x = randInt(10, 99);
        const y = randInt(10, 99);
        const noBorrow = (Math.floor(x / 10) >= Math.floor(y / 10)) && (x % 10 >= y % 10);
        return noBorrow ? [x, y] : null;
      };
      sample.fallback = () => [38, 25];
      [a, b] = sampleUntilValid(sample, 200);
    } else if (level === 2) {
      const sample = () => {
        const x = randInt(10, 99);
        const y = randInt(10, 99);
        const tensOk = Math.floor(x / 10) > Math.floor(y / 10);
        const onesBorrows = (x % 10) < (y % 10);
        return (tensOk && onesBorrows) ? [x, y] : null;
      };
      sample.fallback = () => [42, 27];
      [a, b] = sampleUntilValid(sample, 200);
    } else if (level === 3) {
      a = randInt(10, 99);
      b = randInt(10, 99);
      if (a < b) { const t = a; a = b; b = t; }
    } else if (level === 4) {
      a = randInt(100, 999);
      b = randInt(10, 99);
    } else if (level === 5) {
      a = randInt(100, 999);
      b = randInt(100, 999);
      if (a < b) { const t = a; a = b; b = t; }
    } else if (level === 6) {
      a = randInt(1000, 9999);
      b = randInt(100, 999);
    } else {
      a = randInt(1000, 9999);
      b = randInt(1000, 9999);
      if (a < b) { const t = a; a = b; b = t; }
    }
    return { a, b, answer: a - b };
  }

  function isSameProblem(p1, p2) {
    return p1.a === p2.a && p1.b === p2.b;
  }

  /** Builds a worksheet of `count` problems, avoiding back-to-back
      duplicates. `generator` defaults to the addition generator; pass
      generateSubtractionProblem for a subtraction worksheet. */
  function buildProblemSet(level, count, generator) {
    const gen = generator || generateProblem;
    const list = [];
    for (let i = 0; i < count; i++) {
      let problem = gen(level);
      let attempts = 0;
      while (list.length > 0 && isSameProblem(problem, list[list.length - 1]) && attempts < 10) {
        problem = gen(level);
        attempts++;
      }
      list.push(problem);
    }
    return list;
  }

  /** Digits of n, least-significant first: 36 -> [6, 3]. */
  function digitsLSB(n) {
    return String(n).split('').reverse().map(Number);
  }

  /**
   * Builds the column-by-column addition plan a child works through on
   * paper: for each place value, x + y + carry-in = sum, written digit,
   * and carry-out. If a carry propagates past both numbers' digits, a
   * final synthetic step just asks to write that carry down.
   */
  function buildColumnPlan(a, b) {
    const da = digitsLSB(a);
    const db = digitsLSB(b);
    const len = Math.max(da.length, db.length);
    const steps = [];
    let carry = 0;
    for (let i = 0; i < len; i++) {
      const x = da[i] || 0;
      const y = db[i] || 0;
      const sum = x + y + carry;
      steps.push({ index: i, x, y, carryIn: carry, sum, digit: sum % 10, carryOut: Math.floor(sum / 10), synthetic: false });
      carry = Math.floor(sum / 10);
    }
    if (carry > 0) {
      steps.push({ index: len, x: 0, y: 0, carryIn: carry, sum: carry, digit: carry, carryOut: 0, synthetic: true });
    }
    return steps;
  }

  /**
   * Builds the column-by-column subtraction plan (a - b, a >= b) a child
   * works through on paper: for each place value, borrow-in reduces this
   * column's digit, borrowing again from the next column (borrow-out) if
   * it's still not enough. Borrowing chains naturally through zero
   * columns (e.g. 500 - 258) without any special-casing. Since a >= b is
   * guaranteed by the caller, the final borrow-out is always 0 — there's
   * no overflow/synthetic step the way addition can carry past both
   * numbers' digits.
   */
  function buildSubtractionColumnPlan(a, b) {
    const da = digitsLSB(a);
    const db = digitsLSB(b);
    const steps = [];
    let borrow = 0;
    for (let i = 0; i < da.length; i++) {
      const x = da[i];
      const y = db[i] || 0;
      let effectiveX = x - borrow;
      let borrowOut = 0;
      if (effectiveX < y) {
        effectiveX += 10;
        borrowOut = 1;
      }
      steps.push({ index: i, x, y, borrowIn: borrow, effectiveX, digit: effectiveX - y, borrowOut });
      borrow = borrowOut;
    }
    return steps;
  }

  const PLACE_NAMES = ['いち', 'じゅう', 'ひゃく', 'せん', 'まん'];

  function placeLabel(index) {
    return (PLACE_NAMES[index] || 'まん') + 'のくらい';
  }

  /** Compact column-header form of placeLabel(), short enough to never
      wrap inside the narrow per-column layout (the full term is still
      used in stepPromptText()). */
  function placeLabelShort(index) {
    return (PLACE_NAMES[index] || 'まん') + 'の';
  }

  function stepPromptText(step) {
    const label = placeLabel(step.index);
    if (step.synthetic) {
      return `${label}：くりあがりの ${step.carryIn} を したに かいてね ✍️`;
    }
    let text = `${label}：${step.x} + ${step.y}`;
    if (step.carryIn > 0) text += ` + くりあがり${step.carryIn}`;
    text += ' = ?';
    return text;
  }

  /** Shows the subtraction already "post-borrow" (effectiveX) so the
      child only has to do the final single-digit subtraction — the
      borrowing bookkeeping itself is resolved for them, same way carry
      is resolved into a single sum for addition. */
  function subtractionStepPromptText(step) {
    const label = placeLabel(step.index);
    return `${label}：${step.effectiveX} － ${step.y} = ?`;
  }

  return {
    randInt,
    pick,
    generateProblem,
    generateSubtractionProblem,
    buildProblemSet,
    digitsLSB,
    buildColumnPlan,
    buildSubtractionColumnPlan,
    placeLabel,
    placeLabelShort,
    stepPromptText,
    subtractionStepPromptText,
  };
});
