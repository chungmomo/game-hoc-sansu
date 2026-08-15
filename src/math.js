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

  /**
   * Generates an addition problem for the given level.
   * Level 1: 2-digit + 2-digit, no carrying anywhere.
   * Level 2: 2-digit + 2-digit, carries the ones digit but the answer
   * stays 2-digit. Level 3: 2-digit + 2-digit, unconstrained (answer may
   * reach 198). Level 4: 3-digit + 2-digit, unconstrained. Level 5:
   * 3-digit + 3-digit, unconstrained (answer may reach 1998).
   */
  function generateProblem(level) {
    let a, b;
    if (level === 1) {
      const tensA = randInt(1, 8);
      const tensB = randInt(1, 9 - tensA);
      const onesA = randInt(0, 9);
      const onesB = randInt(0, 9 - onesA);
      a = tensA * 10 + onesA;
      b = tensB * 10 + onesB;
    } else if (level === 2) {
      const tensA = randInt(1, 7);
      const tensB = randInt(1, 8 - tensA);
      const onesA = randInt(1, 9);
      const onesB = randInt(10 - onesA, 9);
      a = tensA * 10 + onesA;
      b = tensB * 10 + onesB;
    } else if (level === 3) {
      a = randInt(10, 99);
      b = randInt(10, 99);
    } else if (level === 4) {
      a = randInt(100, 999);
      b = randInt(10, 99);
    } else {
      a = randInt(100, 999);
      b = randInt(100, 999);
    }
    return { a, b, answer: a + b };
  }

  /**
   * Generates a subtraction problem (a - b, always a >= b so the answer
   * is never negative) for the given level. Mirrors generateProblem's
   * difficulty tiers: level 1 no borrowing, level 2 borrows the ones
   * digit only, level 3 free 2-digit, level 4 3-digit - 2-digit, level 5
   * free 3-digit - 3-digit.
   */
  function generateSubtractionProblem(level) {
    let a, b;
    if (level === 1) {
      const tensA = randInt(2, 9);
      const tensB = randInt(1, tensA);
      const onesA = randInt(0, 9);
      const onesB = randInt(0, onesA);
      a = tensA * 10 + onesA;
      b = tensB * 10 + onesB;
    } else if (level === 2) {
      const tensA = randInt(2, 9);
      const tensB = randInt(1, tensA - 1);
      const onesA = randInt(0, 8);
      const onesB = randInt(onesA + 1, 9);
      a = tensA * 10 + onesA;
      b = tensB * 10 + onesB;
    } else if (level === 3) {
      a = randInt(10, 99);
      b = randInt(10, 99);
      if (a < b) { const t = a; a = b; b = t; }
    } else if (level === 4) {
      a = randInt(100, 999);
      b = randInt(10, 99);
    } else {
      a = randInt(100, 999);
      b = randInt(100, 999);
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

  function placeLabel(index) {
    return index === 0 ? 'いちのくらい' : index === 1 ? 'じゅうのくらい' : index === 2 ? 'ひゃくのくらい' : 'せんのくらい';
  }

  /** Compact column-header form of placeLabel(), short enough to never
      wrap inside the narrow per-column layout (the full term is still
      used in stepPromptText()). */
  function placeLabelShort(index) {
    return index === 0 ? 'いちの' : index === 1 ? 'じゅうの' : index === 2 ? 'ひゃくの' : 'せんの';
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
