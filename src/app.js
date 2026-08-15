/* UI wiring: screens, rendering, event handling, and the per-run
   game state machine. Depends on PM.Math, PM.Data, PM.Audio, PM.Effects
   (see index.html for load order). */
(function () {
  'use strict';
  const M = window.PM.Math;
  const D = window.PM.Data;
  const A = window.PM.Audio;
  const E = window.PM.Effects;
  const C = window.PM.Cloud;

  const PROFILE_AVATARS = ['👧', '🧒', '👦', '🐣', '🌟', '🦄', '🐻', '🐰'];

  let state = D.defaultState();
  let game = null; // current 10-problem session, or null on the home/result screens
  let currentProfileId = null;

  function saveState() {
    if (!currentProfileId) return;
    C.saveProfileState(currentProfileId, state);
  }

  /* Addition and subtraction are different skills, so level progress is
     tracked separately per operation (state.selectedLevelByOp /
     maxUnlockedLevelByOp), scoped to whichever operation is selected. */
  function getSelectedLevel() {
    return state.selectedLevelByOp[state.selectedOperation];
  }
  function getMaxUnlockedLevel() {
    return state.maxUnlockedLevelByOp[state.selectedOperation];
  }

  const screens = {};
  const els = {};

  function cacheDom() {
    screens.loading = document.getElementById('screen-loading');
    screens.profiles = document.getElementById('screen-profiles');
    screens.home = document.getElementById('screen-home');
    screens.game = document.getElementById('screen-game');
    screens.result = document.getElementById('screen-result');

    els.loadingText = document.querySelector('#screen-loading .loading-text');
    els.profileGrid = document.getElementById('profile-grid');
    els.btnAddProfile = document.getElementById('btn-add-profile');
    els.btnLinkProfile = document.getElementById('btn-link-profile');
    els.btnSwitchProfile = document.getElementById('btn-switch-profile');

    els.starTotalText = document.getElementById('star-total-text');
    els.operationRow = document.getElementById('operation-row');
    els.princessRow = document.getElementById('princess-row');
    els.levelRow = document.getElementById('level-row');
    els.puzzleGrid = document.getElementById('puzzle-grid');
    els.itemRow = document.getElementById('item-row');
    els.badgeGrid = document.getElementById('badge-grid');
    els.btnStart = document.getElementById('btn-start');
    els.btnReset = document.getElementById('btn-reset');

    els.btnBackHome = document.getElementById('btn-back-home');
    els.progressCurrent = document.getElementById('progress-current');
    els.progressTotal = document.getElementById('progress-total');
    els.progressFill = document.getElementById('progress-fill');
    els.timerWrap = document.getElementById('timer-wrap');
    els.timerFill = document.getElementById('timer-fill');
    els.btnToggleTimer = document.getElementById('btn-toggle-timer');
    els.lives = document.getElementById('lives');
    els.mascot = document.getElementById('mascot');
    els.companionSprite = document.getElementById('companion-sprite');
    els.speechBubble = document.getElementById('speech-bubble');
    els.streakBadge = document.getElementById('streak-badge');
    els.monsterDisplay = document.getElementById('monster-display');
    els.monsterName = document.getElementById('monster-name');
    els.mascotHpFill = document.getElementById('mascot-hp-fill');
    els.monsterHpFill = document.getElementById('monster-hp-fill');
    els.problemCard = document.querySelector('.problem-card');
    els.problemOverview = document.getElementById('problem-overview');
    els.columnTable = document.getElementById('column-table');
    els.animalCounters = document.getElementById('animal-counters');
    els.stepPrompt = document.getElementById('step-prompt');
    els.keypad = document.getElementById('keypad');

    els.resultMascot = document.getElementById('result-mascot');
    els.resultTitle = document.getElementById('result-title');
    els.resultStars = document.getElementById('result-stars');
    els.resultDetail = document.getElementById('result-detail');
    els.resultStory = document.getElementById('result-story');
    els.btnPlayAgain = document.getElementById('btn-play-again');
    els.btnNextLevel = document.getElementById('btn-next-level');
    els.btnGoHome = document.getElementById('btn-go-home');

    els.soundToggles = Array.from(document.querySelectorAll('.sound-toggle'));
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  /* ---------------- sound toggle ---------------- */
  function syncSoundButtons() {
    A.setEnabled(state.soundOn);
    els.soundToggles.forEach(btn => {
      btn.textContent = state.soundOn ? '🔊' : '🔇';
      btn.setAttribute('aria-pressed', String(state.soundOn));
      btn.setAttribute('aria-label', state.soundOn ? 'おとを けす' : 'おとを だす');
    });
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    saveState();
    syncSoundButtons();
  }

  /* ================= SCREEN: PROFILES ================= */
  async function renderProfilePicker() {
    els.profileGrid.innerHTML = '<div class="item-row-empty">よみこみちゅう…</div>';
    let profiles;
    try {
      profiles = await C.listProfiles();
    } catch (e) {
      els.profileGrid.innerHTML = '<div class="item-row-empty">よみこめなかったよ。インターネットを かくにんしてね。</div>';
      return;
    }

    if (profiles.length === 0) {
      els.profileGrid.innerHTML = '<div class="item-row-empty">まだ こが いないよ。したの ボタンから つくってね！</div>';
      return;
    }

    els.profileGrid.innerHTML = '';
    profiles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <button class="profile-delete" aria-label="${p.name}を けす">✕</button>
        <div class="princess-avatar">${p.avatarEmoji || '👧'}</div>
        <div class="princess-name">${p.name}</div>
        <div class="profile-stars">⭐ ${p.totalStars || 0}</div>
        <div class="profile-code">コード: ${p.id}</div>
      `;
      const activate = () => selectProfile(p.id);
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
      card.querySelector('.profile-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProfile(p.id, p.name);
      });
      els.profileGrid.appendChild(card);
    });
  }

  async function selectProfile(id) {
    showScreen('loading');
    state = await C.loadProfileState(id, D.defaultState());
    currentProfileId = id;
    syncSoundButtons();
    syncTimerButton();
    renderHome();
    showScreen('home');
  }

  async function createProfile() {
    const name = (prompt('こどもの なまえを いれてね') || '').trim();
    if (!name) return;
    const avatarEmoji = M.pick(PROFILE_AVATARS);
    const id = await C.createProfile(name, avatarEmoji, D.defaultState());
    alert(`${name}の コード: ${id}\n\nべつの きき で つづきを あそぶときは、この コードを にゅうりょくしてね。`);
    await selectProfile(id);
  }

  async function linkProfile() {
    const raw = (prompt('コードを にゅうりょくしてね（れい：A7K2QX）') || '').trim();
    if (!raw) return;
    const profile = await C.linkProfileByCode(raw);
    if (!profile) {
      alert('その コードの こが みつからなかったよ。もういちど かくにんしてね。');
      return;
    }
    await selectProfile(profile.id);
  }

  async function deleteProfile(id, name) {
    if (!confirm(`${name}の きろくを ぜんぶ けしますか？`)) return;
    await C.deleteProfile(id);
    renderProfilePicker();
  }

  /* ================= SCREEN: HOME ================= */
  function makeSelectableCard(className, innerHtml, isUnlocked, lockedMessage, onSelect) {
    const card = document.createElement('div');
    card.className = className;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = innerHtml;
    const activate = () => {
      if (!isUnlocked) {
        E.showToast(lockedMessage);
        return;
      }
      onSelect();
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
    return card;
  }

  function renderHome() {
    els.starTotalText.textContent = state.totalStars;

    els.operationRow.innerHTML = '';
    D.OPERATIONS.forEach(op => {
      const className = 'level-card' + (op.id === state.selectedOperation ? ' selected' : '');
      const html = `
        <div class="level-emoji">${op.emoji}</div>
        <div class="level-name">${op.name}</div>
      `;
      const card = makeSelectableCard(className, html, true, '', () => {
        state.selectedOperation = op.id;
        saveState();
        renderHome();
      });
      els.operationRow.appendChild(card);
    });

    els.princessRow.innerHTML = '';
    D.PRINCESSES.forEach(p => {
      const unlocked = D.isPrincessUnlocked(state, p);
      const className = 'princess-card' + (p.id === state.selectedPrincessId ? ' selected' : '') + (unlocked ? '' : ' locked');
      const html = `
        <div class="princess-avatar">${p.avatar}</div>
        <div class="princess-name">${p.name}</div>
        ${unlocked ? '' : `<div class="princess-lock">🔒 ${p.unlockStars}⭐</div>`}
      `;
      const card = makeSelectableCard(className, html, unlocked, `${p.name}を つかうには ほしが ${p.unlockStars}こ ひつようだよ！がんばってね！`, () => {
        state.selectedPrincessId = p.id;
        saveState();
        renderHome();
      });
      els.princessRow.appendChild(card);
    });

    els.levelRow.innerHTML = '';
    const maxUnlocked = getMaxUnlockedLevel();
    D.LEVELS.forEach(lv => {
      const unlocked = lv.id <= maxUnlocked;
      const className = 'level-card' + (lv.id === getSelectedLevel() ? ' selected' : '');
      const html = `
        <div class="level-emoji">${lv.emoji}</div>
        <div class="level-name">${lv.name}${unlocked ? '' : ' 🔒'}</div>
        <div class="level-desc">${lv.desc}</div>
      `;
      const card = makeSelectableCard(className, html, unlocked, 'まえの むずかしさを おわらせてから えらんでね！', () => {
        state.selectedLevelByOp[state.selectedOperation] = lv.id;
        saveState();
        renderHome();
      });
      card.style.opacity = unlocked ? '1' : '.55';
      els.levelRow.appendChild(card);
    });

    renderCollection();
    renderBadges();
  }

  /** Achievement badges — each one's "earned" state is derived purely
      from `state` (see D.BADGES), so there's nothing to keep in sync
      here beyond redrawing. */
  function renderBadges() {
    if (!els.badgeGrid) return;
    const earned = new Set(D.getEarnedBadgeIds(state));
    els.badgeGrid.innerHTML = D.BADGES.map(b => {
      const got = earned.has(b.id);
      return `
        <div class="badge-slot${got ? ' collected' : ''}" title="${got ? b.desc : '？？？'}">
          <div class="badge-emoji">${got ? b.emoji : '❓'}</div>
          <div class="badge-name">${got ? b.name : '？？？'}</div>
        </div>`;
    }).join('');
  }

  /** Home-screen recap of the adventure so far: which pieces of the
      escape-journey album have been collected (one per defeated
      monster, in a fixed order) and which items are in the bag. */
  function renderCollection() {
    if (!els.puzzleGrid || !els.itemRow) return;

    els.puzzleGrid.innerHTML = D.PUZZLE_PIECES.map((piece, i) => {
      const collected = i < state.puzzlePiecesCollected;
      return `<div class="puzzle-slot${collected ? ' collected' : ''}">${collected ? piece : '?'}</div>`;
    }).join('');

    if (state.itemsCollected.length === 0) {
      els.itemRow.innerHTML = `<div class="item-row-empty">まだ アイテムは ないよ</div>`;
      return;
    }
    const counts = new Map();
    state.itemsCollected.forEach(i => counts.set(i, (counts.get(i) || 0) + 1));
    els.itemRow.innerHTML = Array.from(counts.entries()).map(([i, count]) => {
      const item = D.ITEMS[i];
      return `<div class="item-badge" title="${item.name}">${item.icon || item.emoji}${count > 1 ? `<span class="item-count">×${count}</span>` : ''}</div>`;
    }).join('');
  }

  /* ================= SCREEN: GAME ================= */
  function startGame(level) {
    const operation = state.selectedOperation;
    const monster = D.getCurrentMonster(state);
    game = {
      level,
      operation,
      monster,
      problems: operation === 'add'
        ? M.buildProblemSet(level, D.PROBLEMS_PER_SET)
        : M.buildProblemSet(level, D.PROBLEMS_PER_SET, M.generateSubtractionProblem),
      index: 0,
      correctCount: 0,
      starsEarned: 0,
      streak: 0,
      peakStreak: 0,
      problemHadMistake: false,
      luckyIndex: M.randInt(1, D.PROBLEMS_PER_SET - 2),
      livesIcons: ['💖', '💖', '💖'],
      princessHp: 100,
      monsterHp: 100,
      buffer: '',
      locked: false,
    };
    showScreen('game');
    renderMascotHeader();
    renderMonster();
    renderStreakBadge();
    renderHpBars();
    E.showToast(D.MONSTER_APPEAR_MESSAGE(monster));
    renderProblem();
  }

  function renderMascotHeader() {
    const p = D.getSelectedPrincess(state);
    els.mascot.textContent = p.mascot;
    els.lives.textContent = game.livesIcons.join('');
    // Shared mischievous familiar, not tied to any one princess — same
    // sprite regardless of who's selected, just a bit of extra flair.
    if (els.companionSprite) els.companionSprite.innerHTML = D.COMPANION_SPRITE || '';
  }

  function renderMonster() {
    if (!els.monsterDisplay) return;
    // innerHTML so monsters with a hand-drawn SVG `icon` render it;
    // older entries fall back to their plain `emoji` character.
    els.monsterDisplay.innerHTML = game.monster.icon || game.monster.emoji;
    els.monsterName.textContent = game.monster.name;
  }

  function renderHpBars() {
    if (els.mascotHpFill) {
      els.mascotHpFill.style.width = game.princessHp + '%';
      els.mascotHpFill.classList.toggle('low', game.princessHp <= 30);
    }
    if (els.monsterHpFill) {
      els.monsterHpFill.style.width = game.monsterHp + '%';
      els.monsterHpFill.classList.toggle('low', game.monsterHp <= 30);
    }
  }

  function renderStreakBadge() {
    if (!els.streakBadge) return;
    if (game.streak >= 2) {
      els.streakBadge.textContent = `🔥${game.streak}`;
      els.streakBadge.classList.add('visible');
    } else {
      els.streakBadge.textContent = '';
      els.streakBadge.classList.remove('visible');
    }
  }

  function renderProgress() {
    els.progressCurrent.textContent = game.index + 1;
    els.progressTotal.textContent = D.PROBLEMS_PER_SET;
    els.progressFill.style.width = (game.index / D.PROBLEMS_PER_SET) * 100 + '%';
  }

  /* ---------------- per-problem countdown timer ---------------- */
  const TIMER_BASE_SECONDS = 15;
  const TIMER_PER_COLUMN_SECONDS = 10;

  /** One timer per problem (not per column) — it keeps counting across
      wrong-answer retries within the same problem and only resets when a
      new problem starts, matching "1 phép tính" (one calculation). */
  function startProblemTimer() {
    stopProblemTimer();
    if (!state.timerEnabled || !game) {
      if (els.timerWrap) els.timerWrap.classList.add('hidden');
      return;
    }
    if (els.timerWrap) els.timerWrap.classList.remove('hidden');
    game.timerTotal = TIMER_BASE_SECONDS + game.columnPlan.length * TIMER_PER_COLUMN_SECONDS;
    game.timerRemaining = game.timerTotal;
    if (els.timerFill) {
      els.timerFill.style.width = '100%';
      els.timerFill.classList.remove('low');
    }
    game.timerInterval = setInterval(() => {
      game.timerRemaining -= 0.1;
      const pct = Math.max(0, (game.timerRemaining / game.timerTotal) * 100);
      if (els.timerFill) {
        els.timerFill.style.width = pct + '%';
        els.timerFill.classList.toggle('low', pct <= 30);
      }
      if (game.timerRemaining <= 0) onTimeUp();
    }, 100);
  }

  function stopProblemTimer() {
    if (game && game.timerInterval) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
    }
  }

  /** Timing out mid-problem is treated exactly like a wrong column
      answer (lose a heart, encourage, monster counter-attack) — same
      "always another try" philosophy as loseHeart() — then the timer
      just restarts for another attempt at the same problem. */
  function onTimeUp() {
    if (!game || game.locked) return;
    const colEl = activeColumnEl();
    if (colEl) {
      colEl.classList.remove('correct-pop');
      void colEl.offsetWidth;
      colEl.classList.add('wrong-shake');
    }
    els.speechBubble.textContent = 'じかんぎれ！もういちど がんばろう！';
    A.playWrongSound();
    flashClass(els.monsterDisplay, 'attacking', 550);
    E.spawnProjectile(els.monsterDisplay, els.mascot, '💥', () => {
      flashClass(els.mascot, 'hit', 500);
      game.princessHp = Math.max(0, game.princessHp - 20);
      renderHpBars();
    });
    game.problemHadMistake = true;
    loseHeart();
    game.buffer = '';
    setTimeout(() => {
      if (colEl) colEl.classList.remove('wrong-shake');
      updateActiveResultDisplay();
    }, 420);
    startProblemTimer();
  }

  function syncTimerButton() {
    if (!els.btnToggleTimer) return;
    els.btnToggleTimer.textContent = state.timerEnabled ? '⏱️' : '⏱️🚫';
    els.btnToggleTimer.setAttribute('aria-pressed', String(state.timerEnabled));
    els.btnToggleTimer.setAttribute('aria-label', state.timerEnabled ? 'タイマーを けす' : 'タイマーを つける');
  }

  function toggleTimer() {
    state.timerEnabled = !state.timerEnabled;
    saveState();
    syncTimerButton();
    if (game && screens.game.classList.contains('active')) startProblemTimer();
  }

  function renderProblem() {
    const prob = game.problems[game.index];
    game.columnPlan = game.operation === 'add'
      ? M.buildColumnPlan(prob.a, prob.b)
      : M.buildSubtractionColumnPlan(prob.a, prob.b);
    game.currentStep = 0;
    game.buffer = '';
    game.locked = false;
    game.problemHadMistake = false;

    renderProgress();
    const isLucky = game.index === game.luckyIndex;
    els.problemCard.classList.toggle('lucky', isLucky);
    els.speechBubble.textContent = isLucky ? D.LUCKY_PROBLEM_MESSAGE : M.pick(D.STARTER_MESSAGES);
    if (isLucky) E.showToast(D.LUCKY_PROBLEM_MESSAGE);
    const opSymbol = game.operation === 'add' ? '+' : '－';
    els.problemOverview.innerHTML = `
      <span class="overview-label">もんだい</span>
      <div class="overview-numbers">
        <div>${prob.a}</div>
        <div>${opSymbol} ${prob.b}</div>
        <div class="overview-line hidden"></div>
        <div class="overview-answer hidden">&nbsp;</div>
      </div>
    `;
    renderColumnTable();
    renderStepPrompt();
    startProblemTimer();
  }

  /** Once every column is solved, assemble the digits into the whole
      final number and show it under a line beneath the two addends —
      the classic written-addition finish — so the child sees and has
      a moment to register the complete answer, not just the separate
      per-column digits. */
  function revealFinalAnswer() {
    const digits = game.columnPlan.map(s => s.digit).reverse().join('');
    const answer = String(Number(digits)); // strip meaningless leading zeros (subtraction, e.g. "001" -> "1")
    const numbersEl = els.problemOverview.querySelector('.overview-numbers');
    if (!numbersEl) return;
    const line = numbersEl.querySelector('.overview-line');
    const answerEl = numbersEl.querySelector('.overview-answer');
    if (!line || !answerEl) return;
    line.classList.remove('hidden');
    answerEl.classList.remove('hidden');
    answerEl.textContent = answer;
    flashClass(answerEl, 'pop-in', 500);
  }

  function renderStepPrompt() {
    const step = game.columnPlan[game.currentStep];
    els.stepPrompt.textContent = game.operation === 'add'
      ? M.stepPromptText(step)
      : M.subtractionStepPromptText(step);
    renderAnimalCounters(step);
  }

  function pickTwoDistinctAnimals() {
    const pool = D.ANIMAL_POOL;
    const i = M.randInt(0, pool.length - 1);
    let j = M.randInt(0, pool.length - 1);
    while (j === i) j = M.randInt(0, pool.length - 1);
    return [pool[i], pool[j]];
  }

  /** Shows step.x copies of one animal and step.y copies of another
      next to the active column, as a counting aid before the child
      does the addition — skipped for the synthetic "write the carry
      down" step, which has nothing to count. */
  function renderAnimalCounters(step) {
    if (!els.animalCounters) return;
    if (step.synthetic) {
      els.animalCounters.innerHTML = '';
      return;
    }
    const [animalA, animalB] = pickTwoDistinctAnimals();
    els.animalCounters.innerHTML = `
      <div class="animal-row">${animalA.repeat(step.x)}</div>
      <div class="animal-row">${animalB.repeat(step.y)}</div>
    `;
  }

  function renderColumnTable(opts) {
    const pendingCarryFlight = !!(opts && opts.pendingCarryFlight);
    const current = game.currentStep;
    const cols = [...game.columnPlan].reverse();

    const isAdd = game.operation === 'add';
    let html = `
      <div class="place-col plus-col">
        <div class="place-label">&nbsp;</div>
        <div class="digit-a">&nbsp;</div>
        <div class="digit-b">${isAdd ? '+' : '－'}</div>
        <div class="carry-slot">&nbsp;</div>
        <div class="line"></div>
        <div class="digit-result">&nbsp;</div>
      </div>`;

    cols.forEach(step => {
      const isActive = step.index === current;
      const isDone = step.index < current;
      const known = step.index <= current;
      // Subtraction resolves borrowing directly into the step prompt
      // text (see subtractionStepPromptText) rather than a separate
      // carry-style indicator, so the carry-slot stays empty for it.
      const carryHtml = (isAdd && known && step.carryIn > 0) ? `${step.carryIn}` : '&nbsp;';
      const digitA = step.synthetic ? '&nbsp;' : step.x;
      const digitB = step.synthetic ? '&nbsp;' : step.y;

      let resultHtml, resultClass;
      if (isDone) {
        resultHtml = String(step.digit);
        resultClass = 'digit-result';
      } else if (isActive) {
        resultHtml = game.buffer.length ? game.buffer : '?';
        resultClass = 'digit-result' + (game.buffer.length ? ' entering' : ' placeholder');
      } else {
        resultHtml = '&nbsp;';
        resultClass = 'digit-result placeholder';
      }

      const carryFlightPending = isActive && pendingCarryFlight && step.carryIn > 0;
      const carrySlotClass = carryFlightPending ? ' carry-pending' : (isActive && step.carryIn > 0 ? ' pop-in' : '');
      const stateClass = isActive ? ' active' : isDone ? ' done' : '';
      html += `
        <div class="place-col${stateClass}" data-step-index="${step.index}">
          <div class="place-label">${M.placeLabelShort(step.index)}</div>
          <div class="digit-a">${digitA}</div>
          <div class="digit-b">${digitB}</div>
          <div class="carry-slot${carrySlotClass}">${carryHtml}</div>
          <div class="line"></div>
          <div class="${resultClass}">${resultHtml}</div>
        </div>`;
    });

    els.columnTable.innerHTML = html;
  }

  function activeColumnEl() {
    const step = game.columnPlan[game.currentStep];
    return els.columnTable.querySelector(`.place-col[data-step-index="${step.index}"]`);
  }

  function updateActiveResultDisplay() {
    const el = activeColumnEl();
    const resultEl = el && el.querySelector('.digit-result');
    if (!resultEl) return;
    resultEl.textContent = game.buffer.length ? game.buffer : '?';
    resultEl.className = 'digit-result' + (game.buffer.length ? ' entering' : ' placeholder');
  }

  /** Briefly applies an animation class (e.g. "attacking"/"hit") to an
      element, restarting it even if it's already mid-play. */
  function flashClass(el, className, duration) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth; // reflow, so re-adding the class restarts the animation
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  function loseHeart() {
    let brokeOne = false;
    for (let i = game.livesIcons.length - 1; i >= 0; i--) {
      if (game.livesIcons[i] === '💖') { game.livesIcons[i] = '💔'; brokeOne = true; break; }
    }
    if (!brokeOne) game.livesIcons = ['💖', '💖', '💖'];
    els.lives.textContent = game.livesIcons.join('');
  }

  /** What the child must type for a column: the raw sum for addition
      (which may be 2 digits, teaching "write X, carry Y"), or the
      already-resolved single digit for subtraction. */
  function expectedColumnValue(step) {
    return game.operation === 'add' ? step.sum : step.digit;
  }

  function currentExpectedLen() {
    return String(expectedColumnValue(game.columnPlan[game.currentStep])).length;
  }

  function pressDigit(digit) {
    if (!game || game.locked) return;
    if (game.buffer.length < currentExpectedLen()) {
      game.buffer += digit;
      A.playKeyClick(digit);
      updateActiveResultDisplay();
    }
  }

  function pressClear() {
    if (!game || game.locked) return;
    game.buffer = game.buffer.slice(0, -1);
    A.playKeyClear();
    updateActiveResultDisplay();
  }

  function submitAnswer() {
    if (!game || game.locked) return;
    if (game.buffer.length === 0) {
      E.showToast('すうじを いれてね！');
      return;
    }
    const step = game.columnPlan[game.currentStep];
    const userSum = Number(game.buffer);
    const colEl = activeColumnEl();

    if (userSum === expectedColumnValue(step)) {
      game.locked = true;
      const rewardEmoji = D.getSelectedPrincess(state).rewardEmoji;
      colEl.classList.add('correct-pop');
      A.playStepDing();
      E.stickerAtElement(colEl, rewardEmoji);

      const isLastStep = game.currentStep === game.columnPlan.length - 1;
      if (isLastStep) {
        stopProblemTimer(); // freeze the bar during the celebration pause below
        const wasPerfect = !game.problemHadMistake;
        const isLucky = game.index === game.luckyIndex;
        let starsForProblem = 1;
        let bonusMessage = null;

        if (isLucky && wasPerfect) {
          starsForProblem += 1;
          bonusMessage = D.LUCKY_PROBLEM_MESSAGE;
        }
        if (wasPerfect) {
          game.streak++;
          game.peakStreak = Math.max(game.peakStreak, game.streak);
          if (D.STREAK_MILESTONES.includes(game.streak)) {
            starsForProblem += D.STREAK_BONUS_STARS;
            bonusMessage = M.pick(D.STREAK_MESSAGES);
          }
        } else {
          game.streak = 0;
        }
        renderStreakBadge();

        game.correctCount++;
        game.starsEarned += starsForProblem;
        const isBonusRound = starsForProblem > 1;
        els.speechBubble.textContent = bonusMessage || M.pick(D.PRAISE_MESSAGES);
        A.playCorrectSound();
        E.spawnConfetti(isBonusRound ? 30 : 16, rewardEmoji);
        E.spawnStickerBurst(isBonusRound ? 9 : 5, rewardEmoji);
        flashClass(els.mascot, 'attacking', 550);
        E.spawnProjectile(els.mascot, els.monsterDisplay, '🪄', () => {
          flashClass(els.monsterDisplay, 'hit', 500);
          game.monsterHp = Math.max(0, game.monsterHp - 100 / D.PROBLEMS_PER_SET);
          renderHpBars();
        });
        revealFinalAnswer();
        setTimeout(nextProblem, 2000);
      } else {
        els.speechBubble.textContent = M.pick(D.COLUMN_PRAISE);
        // Subtraction resolves borrowing into the next step's prompt text
        // (see subtractionStepPromptText) rather than a flown carry digit,
        // so there's nothing to animate here for it — v1 keeps that
        // simpler than mirroring the addition carry-flight in reverse.
        const carryDigit = game.operation === 'add' ? step.carryOut : 0;
        const carryFromRect = carryDigit > 0 ? colEl.querySelector('.digit-result').getBoundingClientRect() : null;
        setTimeout(() => {
          game.currentStep++;
          game.buffer = '';
          game.locked = false;
          renderColumnTable({ pendingCarryFlight: carryDigit > 0 });
          renderStepPrompt();
          if (carryFromRect) {
            const carrySlotEl = els.columnTable.querySelector('.place-col.active .carry-slot');
            E.flyCarry(carryFromRect, carrySlotEl.getBoundingClientRect(), carryDigit, () => {
              carrySlotEl.classList.remove('carry-pending');
              carrySlotEl.classList.add('pop-in');
            });
          }
        }, 650);
      }
    } else {
      colEl.classList.remove('correct-pop');
      void colEl.offsetWidth; // restart the shake animation if it's already mid-play
      colEl.classList.add('wrong-shake');
      els.speechBubble.textContent = M.pick(D.ENCOURAGE_MESSAGES);
      A.playWrongSound();
      flashClass(els.monsterDisplay, 'attacking', 550);
      E.spawnProjectile(els.monsterDisplay, els.mascot, '💥', () => {
        flashClass(els.mascot, 'hit', 500);
        game.princessHp = Math.max(0, game.princessHp - 20);
        renderHpBars();
      });
      game.problemHadMistake = true;
      loseHeart();
      game.buffer = '';
      setTimeout(() => {
        colEl.classList.remove('wrong-shake');
        updateActiveResultDisplay();
      }, 420);
    }
  }

  function nextProblem() {
    game.index++;
    if (game.index >= D.PROBLEMS_PER_SET) {
      finishSet();
    } else {
      renderProblem();
    }
  }

  /* ================= SCREEN: RESULT ================= */
  function finishSet() {
    stopProblemTimer();
    const badgesBefore = new Set(D.getEarnedBadgeIds(state));

    const correct = game.correctCount;
    const earned = game.starsEarned;
    state.totalStars += earned;
    state.bestStreak = Math.max(state.bestStreak || 0, game.peakStreak);

    const passed = correct >= D.PASS_THRESHOLD;
    let leveledUp = false;
    const maxUnlocked = state.maxUnlockedLevelByOp[game.operation];
    if (passed && game.level === maxUnlocked && maxUnlocked < D.LEVELS.length) {
      state.maxUnlockedLevelByOp[game.operation] = maxUnlocked + 1;
      leveledUp = true;
    }

    let storyLine = `${game.monster.emoji} ${game.monster.name}は まだ ちかくに いるよ…もういちど たたかおう！`;
    if (passed) {
      const defeatedMonster = game.monster;
      state.monstersDefeated++;
      let pieceNote = '';
      if (state.puzzlePiecesCollected < D.PUZZLE_PIECES.length) {
        const piece = D.PUZZLE_PIECES[state.puzzlePiecesCollected];
        state.puzzlePiecesCollected++;
        pieceNote = ` ${piece}の かけらを ひろった！`;
        if (D.isAlbumComplete(state)) pieceNote += ' 🎉 ぼうけんの アルバムが かんせいしたよ！';
      }
      const itemIndex = M.randInt(0, D.ITEMS.length - 1);
      state.itemsCollected.push(itemIndex);
      const item = D.ITEMS[itemIndex];
      storyLine = `${D.MONSTER_DEFEATED_MESSAGE(defeatedMonster)}${pieceNote} ${item.emoji}${item.name}を てにいれた！`;
    }
    els.resultStory.textContent = storyLine;

    saveState();

    const p = D.getSelectedPrincess(state);
    els.resultMascot.textContent = leveledUp ? '🎊' : p.avatar;
    els.resultTitle.textContent =
      correct === D.PROBLEMS_PER_SET ? 'かんぺき！さんすう おひめさまだね！' :
      passed ? 'よく できました！' : 'よく がんばったね！';
    els.resultStars.textContent = '⭐'.repeat(correct) + '☆'.repeat(D.PROBLEMS_PER_SET - correct);
    const bonusNote = earned > correct ? `（おまけで +${earned - correct}こ！）` : '';
    els.resultDetail.textContent =
      `${D.PROBLEMS_PER_SET}もんちゅう ${correct}もん せいかい — ほし +${earned}こ${bonusNote} — ぜんぶで ${state.totalStars}こ` +
      (leveledUp ? ' — 🎉 あたらしい むずかしさが あいたよ！' : '');

    els.btnNextLevel.style.display = (game.level < D.LEVELS.length && (game.level + 1) <= state.maxUnlockedLevelByOp[game.operation]) ? 'inline-block' : 'none';

    showScreen('result');
    if (correct >= D.CELEBRATE_STARS_THRESHOLD) {
      E.spawnConfetti(40, p.rewardEmoji);
      A.playCelebrateSound();
    }

    const newBadgeIds = D.getEarnedBadgeIds(state).filter(id => !badgesBefore.has(id));
    newBadgeIds.forEach(id => {
      const badge = D.BADGES.find(b => b.id === id);
      if (!badge) return;
      E.showToast(`🏅 あたらしい きろく：${badge.name}！`);
      E.spawnConfetti(20, [badge.emoji]);
    });
  }

  /* ================= wiring ================= */
  function bindEvents() {
    els.btnAddProfile.addEventListener('click', createProfile);
    els.btnLinkProfile.addEventListener('click', linkProfile);
    els.btnSwitchProfile.addEventListener('click', () => {
      showScreen('profiles');
      renderProfilePicker();
    });

    els.btnStart.addEventListener('click', () => startGame(getSelectedLevel()));

    els.btnReset.addEventListener('click', () => {
      if (confirm('いままでの きろくと ほしを ぜんぶ けしますか？')) {
        const keepSound = state.soundOn;
        state = D.defaultState();
        state.soundOn = keepSound;
        saveState();
        renderHome();
      }
    });

    els.btnBackHome.addEventListener('click', () => {
      stopProblemTimer();
      showScreen('home');
      renderHome();
    });

    els.keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.key');
      if (!btn) return;
      const key = btn.dataset.key;
      if (key === 'clear') pressClear();
      else if (key === 'submit') submitAnswer();
      else pressDigit(key);
    });

    document.addEventListener('keydown', (e) => {
      if (!screens.game.classList.contains('active') || !game) return;
      if (e.key >= '0' && e.key <= '9') {
        pressDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressClear();
      } else if (e.key === 'Enter') {
        submitAnswer();
      }
    });

    els.btnPlayAgain.addEventListener('click', () => startGame(game.level));
    els.btnNextLevel.addEventListener('click', () => {
      const next = Math.min(game.level + 1, D.LEVELS.length);
      state.selectedLevelByOp[game.operation] = next;
      saveState();
      startGame(next);
    });
    els.btnGoHome.addEventListener('click', () => {
      stopProblemTimer();
      showScreen('home');
      renderHome();
    });

    els.soundToggles.forEach(btn => btn.addEventListener('click', toggleSound));
    if (els.btnToggleTimer) els.btnToggleTimer.addEventListener('click', toggleTimer);
  }

  async function init() {
    cacheDom();
    bindEvents();
    showScreen('loading');
    try {
      await C.init();
    } catch (e) {
      if (els.loadingText) els.loadingText.textContent = 'つながらなかったよ。インターネットを かくにんして、ページを つくりなおしてね。';
      return;
    }
    await renderProfilePicker();
    showScreen('profiles');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
