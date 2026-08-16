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

  /** Fisher–Yates shuffle, returns a new array (leaves `arr` untouched). */
  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** Picks `count` distinct wrong answers near the real one, for a
      multiple-choice quiz — close enough that a child has to actually
      compute rather than guess by size, but never negative or equal to
      the real answer. The offset scales with the answer's own size (a
      fixed ±1-5 would be trivially easy to spot next to a 4-digit
      answer, and too tight to stay non-negative next to a 1-digit one). */
  function generateDistractors(answer, count) {
    const maxOffset = Math.max(3, Math.round(answer * 0.2) + 2);
    const seen = new Set([answer]);
    const distractors = [];
    let attempts = 0;
    while (distractors.length < count && attempts < 200) {
      attempts++;
      const offset = randInt(1, maxOffset);
      const candidate = answer + (Math.random() < 0.5 ? -offset : offset);
      if (candidate < 0 || seen.has(candidate)) continue;
      seen.add(candidate);
      distractors.push(candidate);
    }
    // Fallback for the rare case randomness didn't find enough distinct
    // candidates in range (e.g. answer is 0 or 1) — just count outward.
    let filler = 1;
    while (distractors.length < count) {
      const candidate = answer + filler;
      filler++;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      distractors.push(candidate);
    }
    return distractors;
  }

  /* Add/sub levels are 1-100: 4 digit-count tiers (1-4 digits) of 25
     sub-levels each — id = (digits-1)*25 + subLevel. Must stay in sync
     with data.js's LEVELS_PER_GROUP (also 25); duplicated here rather
     than imported so this file keeps loading standalone in Node for
     the tests (see the file banner comment). */
  const LEVELS_PER_GROUP = 25;

  function digitGroupForLevel(level) {
    const digits = Math.min(4, Math.max(1, Math.ceil(level / LEVELS_PER_GROUP)));
    const subLevel = ((level - 1) % LEVELS_PER_GROUP) + 1;
    return { digits, subLevel };
  }

  /** Sub-level 1 -> 0% chance (no carrying/borrowing anywhere), ramping
      to 100% by sub-level 21 and staying there for the last few
      "mastery" levels — a continuous difficulty ramp instead of a
      handful of hand-tuned tiers. */
  function chanceForSubLevel(subLevel) {
    return Math.min(1, (subLevel - 1) / 20);
  }

  /**
   * Generates an addition problem for the given level (1-100, see
   * digitGroupForLevel). Both operands have the tier's digit count;
   * each column independently has `carryChance` probability of
   * requiring a carry (that column's digits summing to >= 10).
   */
  function generateProblem(level) {
    const { digits, subLevel } = digitGroupForLevel(level);
    const carryChance = chanceForSubLevel(subLevel);
    const da = [];
    const db = [];
    for (let i = 0; i < digits; i++) {
      const minDigit = i === digits - 1 ? 1 : 0; // no leading zero
      if (Math.random() < carryChance) {
        const x = randInt(Math.max(minDigit, 1), 9);
        const y = randInt(10 - x, 9);
        da.push(x); db.push(y);
      } else {
        // x capped at 9-minDigit so there's always room left for y to
        // satisfy its own no-leading-zero floor (matters when this is
        // the top column of both operands, minDigit=1 for x and y alike).
        const x = randInt(minDigit, 9 - minDigit);
        const y = randInt(minDigit, 9 - x);
        da.push(x); db.push(y);
      }
    }
    const a = Number(da.slice().reverse().join(''));
    const b = Number(db.slice().reverse().join(''));
    return { a, b, answer: a + b };
  }

  /**
   * Generates a subtraction problem (a - b, always a >= b) for the
   * given level, same digit-tier/sub-level scheme as generateProblem
   * but ramping borrow chance instead of carry chance. Columns build
   * bottom-up (ones first); once any lower column has been forced to
   * need a borrow (x < y there), the top column is built with a
   * *strict* x > y instead of just x >= y — a tie at the top would let
   * that lower borrow decide the overall magnitude instead, which could
   * flip a >= b (and silently cancel the very borrow the sub-level was
   * trying to create). The final swap is just a defensive backstop.
   */
  function generateSubtractionProblem(level) {
    const { digits, subLevel } = digitGroupForLevel(level);
    const borrowChance = chanceForSubLevel(subLevel);
    const da = [];
    const db = [];
    let hadForcedBorrow = false;
    for (let i = 0; i < digits; i++) {
      const minDigit = i === digits - 1 ? 1 : 0;
      const isTopColumn = i === digits - 1;
      if (!isTopColumn && Math.random() < borrowChance) {
        const y = randInt(minDigit + 1, 9);
        const x = randInt(minDigit, y - 1);
        da.push(x); db.push(y);
        hadForcedBorrow = true;
      } else if (isTopColumn && hadForcedBorrow) {
        const y = randInt(minDigit, 8);
        const x = randInt(y + 1, 9);
        da.push(x); db.push(y);
      } else {
        const y = randInt(minDigit, 9);
        const x = randInt(Math.max(minDigit, y), 9);
        da.push(x); db.push(y);
      }
    }
    let a = Number(da.slice().reverse().join(''));
    let b = Number(db.slice().reverse().join(''));
    if (a < b) { const t = a; a = b; b = t; }
    return { a, b, answer: a - b };
  }

  /**
   * Generates a multiplication fact (a × b) for the given level — plain
   * multiplication-table practice, not long-form column multiplication.
   * Level 1: the 2-5 times tables. Level 2: 6-7. Level 3: 8-9, plus the
   * full 2-9 range unconstrained. Multiplicand/multiplier order is
   * randomized so the "table number" isn't always in the same position.
   */
  function generateMultiplicationProblem(level) {
    let table;
    if (level === 1) table = randInt(2, 5);
    else if (level === 2) table = randInt(6, 7);
    else table = randInt(2, 9);
    const other = randInt(1, 9);
    const [a, b] = Math.random() < 0.5 ? [table, other] : [other, table];
    return { a, b, answer: a * b };
  }

  /**
   * Generates a division fact (a ÷ b) for the given level, always exact
   * (no remainder) — built from a random divisor/quotient pair so a is
   * guaranteed divisible by b. Mirrors generateMultiplicationProblem's
   * tiers: level 1 divides by 2-5, level 2 by 6-7, level 3 by 8-9 plus
   * the full 2-9 range.
   */
  function generateDivisionProblem(level) {
    let divisor;
    if (level === 1) divisor = randInt(2, 5);
    else if (level === 2) divisor = randInt(6, 7);
    else divisor = randInt(2, 9);
    const quotient = randInt(1, 9);
    return { a: divisor * quotient, b: divisor, answer: quotient };
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

  /** Multiplication/division facts are single-step recall (bảng cửu
      chương), not a column algorithm — this wraps a fact into the same
      one-element "plan" shape addition/subtraction use, so the rest of
      the game (buffer entry, submit, reveal) needs no separate code
      path for them. */
  function buildSingleStepPlan(a, b, answer) {
    return [{ index: 0, x: a, y: b, digit: answer, synthetic: false }];
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
    shuffle,
    generateDistractors,
    generateProblem,
    generateSubtractionProblem,
    generateMultiplicationProblem,
    generateDivisionProblem,
    buildProblemSet,
    digitsLSB,
    buildColumnPlan,
    buildSubtractionColumnPlan,
    buildSingleStepPlan,
    placeLabel,
    placeLabelShort,
    stepPromptText,
    subtractionStepPromptText,
  };
});
