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
   * Generates a 2-digit + 2-digit addition problem for the given level.
   * Level 1: no carrying anywhere. Level 2: carries the ones digit but
   * the answer stays 2-digit. Level 3: unconstrained (answer may reach 198).
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
    } else {
      a = randInt(10, 99);
      b = randInt(10, 99);
    }
    return { a, b, answer: a + b };
  }

  function isSameProblem(p1, p2) {
    return p1.a === p2.a && p1.b === p2.b;
  }

  /** Builds a worksheet of `count` problems, avoiding back-to-back duplicates. */
  function buildProblemSet(level, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      let problem = generateProblem(level);
      let attempts = 0;
      while (list.length > 0 && isSameProblem(problem, list[list.length - 1]) && attempts < 10) {
        problem = generateProblem(level);
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

  function placeLabel(index) {
    return index === 0 ? 'Đơn Vị' : index === 1 ? 'Chục' : 'Trăm';
  }

  function stepPromptText(step) {
    const label = placeLabel(step.index);
    if (step.synthetic) {
      return `Hàng ${label}: mang nhớ ${step.carryIn} xuống, viết mấy? ✍️`;
    }
    let text = `Hàng ${label}: ${step.x} + ${step.y}`;
    if (step.carryIn > 0) text += ` + nhớ ${step.carryIn}`;
    text += ' = ?';
    return text;
  }

  return {
    randInt,
    pick,
    generateProblem,
    buildProblemSet,
    digitsLSB,
    buildColumnPlan,
    placeLabel,
    stepPromptText,
  };
});
