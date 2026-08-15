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
    screens.admin = document.getElementById('screen-admin');

    els.loadingText = document.querySelector('#screen-loading .loading-text');
    els.profileGrid = document.getElementById('profile-grid');
    els.btnAddProfile = document.getElementById('btn-add-profile');
    els.btnLinkProfile = document.getElementById('btn-link-profile');
    els.btnSwitchProfile = document.getElementById('btn-switch-profile');

    els.promptModal = document.getElementById('prompt-modal');
    els.promptTitle = document.getElementById('prompt-modal-title');
    els.promptInput = document.getElementById('prompt-modal-input');
    els.promptError = document.getElementById('prompt-modal-error');
    els.promptCancel = document.getElementById('prompt-modal-cancel');
    els.promptConfirm = document.getElementById('prompt-modal-confirm');

    els.starTotalText = document.getElementById('star-total-text');
    els.operationRow = document.getElementById('operation-row');
    els.princessRow = document.getElementById('princess-row');
    els.digitGroupRow = document.getElementById('digit-group-row');
    els.levelRow = document.getElementById('level-row');
    els.puzzleGrid = document.getElementById('puzzle-grid');
    els.itemRow = document.getElementById('item-row');
    els.badgeGrid = document.getElementById('badge-grid');
    els.btnStart = document.getElementById('btn-start');
    els.btnReset = document.getElementById('btn-reset');

    els.customProblemSummary = document.getElementById('custom-problem-summary');
    els.btnOpenAdmin = document.getElementById('btn-open-admin');
    els.adminOperationRow = document.getElementById('admin-operation-row');
    els.adminInputA = document.getElementById('admin-input-a');
    els.adminOpSymbol = document.getElementById('admin-op-symbol');
    els.adminInputB = document.getElementById('admin-input-b');
    els.btnAdminAdd = document.getElementById('btn-admin-add');
    els.adminFormError = document.getElementById('admin-form-error');
    els.adminProblemList = document.getElementById('admin-problem-list');
    els.adminProblemCount = document.getElementById('admin-problem-count');
    els.btnAdminPractice = document.getElementById('btn-admin-practice');
    els.btnAdminBack = document.getElementById('btn-admin-back');

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

  /* ---------------- text prompt modal (in-app replacement for
     window.prompt, styled to match the rest of the UI) ---------------- */
  let promptResolve = null;
  let promptRequired = true;
  let promptErrorMsg = 'にゅうりょくしてね';

  function openPrompt({ title, placeholder = '', maxlength, required = true, errorMsg = 'にゅうりょくしてね' }) {
    return new Promise((resolve) => {
      promptResolve = resolve;
      promptRequired = required;
      promptErrorMsg = errorMsg;
      els.promptTitle.textContent = title;
      els.promptInput.value = '';
      els.promptInput.placeholder = placeholder;
      if (maxlength) els.promptInput.maxLength = maxlength;
      else els.promptInput.removeAttribute('maxlength');
      els.promptError.textContent = '';
      els.promptError.classList.add('hidden');
      els.promptModal.classList.add('visible');
      els.promptModal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => els.promptInput.focus());
    });
  }

  function closePrompt(value) {
    els.promptModal.classList.remove('visible');
    els.promptModal.setAttribute('aria-hidden', 'true');
    if (promptResolve) { promptResolve(value); promptResolve = null; }
  }

  function confirmPrompt() {
    const val = els.promptInput.value.trim();
    if (promptRequired && !val) {
      els.promptError.textContent = promptErrorMsg;
      els.promptError.classList.remove('hidden');
      els.promptInput.focus();
      return;
    }
    closePrompt(val || null);
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
    const name = await openPrompt({
      title: 'こどもの なまえを いれてね',
      placeholder: 'なまえ',
      maxlength: 20,
      errorMsg: 'なまえを いれてね',
    });
    if (!name) return;
    const avatarEmoji = M.pick(PROFILE_AVATARS);
    const id = await C.createProfile(name, avatarEmoji, D.defaultState());
    alert(`${name}の コード: ${id}\n\nべつの きき で つづきを あそぶときは、この コードを にゅうりょくしてね。`);
    await selectProfile(id);
  }

  async function linkProfile() {
    const raw = await openPrompt({
      title: 'コードを にゅうりょくしてね（れい：A7K2QX）',
      placeholder: 'コード',
      maxlength: 6,
      errorMsg: 'コードを いれてね',
    });
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

    const maxUnlocked = getMaxUnlockedLevel();
    // DIGIT_GROUPS is a digit-count shortcut for add/sub's shared LEVELS
    // list — multiplication/division practice times tables instead (see
    // MUL_LEVELS/DIV_LEVELS), a different difficulty dimension that
    // doesn't have a digit-count grouping, so the shortcut row just
    // doesn't apply and stays hidden for those two operations.
    const isDigitBasedOp = state.selectedOperation === 'add' || state.selectedOperation === 'sub';

    els.digitGroupRow.innerHTML = '';
    els.digitGroupRow.classList.toggle('hidden', !isDigitBasedOp);
    if (isDigitBasedOp) {
      D.DIGIT_GROUPS.forEach(group => {
        const levelsInGroup = group.levelIds.map(id => D.LEVELS.find(lv => lv.id === id)).filter(Boolean);
        const unlockedLevels = levelsInGroup.filter(lv => lv.id <= maxUnlocked);
        const groupUnlocked = unlockedLevels.length > 0;
        const isSelected = levelsInGroup.some(lv => lv.id === getSelectedLevel());
        const className = 'level-card' + (isSelected ? ' selected' : '');
        const html = `<div class="level-name">${group.label}${groupUnlocked ? '' : ' 🔒'}</div>`;
        const card = makeSelectableCard(className, html, groupUnlocked, 'さきに まえの けたすうを おわらせてから えらんでね！', () => {
          const target = unlockedLevels[unlockedLevels.length - 1];
          state.selectedLevelByOp[state.selectedOperation] = target.id;
          saveState();
          renderHome();
        });
        card.style.opacity = groupUnlocked ? '1' : '.55';
        els.digitGroupRow.appendChild(card);
      });
    }

    els.levelRow.innerHTML = '';
    D.getLevelsForOp(state.selectedOperation).forEach(lv => {
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
    renderCustomProblemSummary();
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

  /** Home-screen recap of how many parent/child-authored problems are
      waiting, across both operations they can currently be filed under. */
  function renderCustomProblemSummary() {
    if (!els.customProblemSummary) return;
    const cp = state.customProblems || { add: [], sub: [] };
    const addCount = (cp.add || []).length;
    const subCount = (cp.sub || []).length;
    els.customProblemSummary.textContent = (addCount + subCount) > 0
      ? `たしざん ${addCount}こ・ひきざん ${subCount}こ`
      : 'まだ もんだいが ないよ';
  }

  /* ================= SCREEN: ADMIN (custom problems) =================
     Lets a parent type in specific problems (e.g. from homework) instead
     of relying on the random generator, then practice exactly that list.
     Kept to add/sub for now — mul/div's problems (and what counts as a
     valid one, e.g. clean division) aren't wired up here yet. Each
     problem is just { a, b }; the operation decides how it's scored and
     which practice list (state.customProblems.add / .sub) it lives in.
     adminOperation is this screen's own toggle, independent of
     state.selectedOperation, so browsing "かけざん" on the home screen
     doesn't leave this screen with no valid operation to show. */
  let adminOperation = 'add';

  function getCustomProblems(op) {
    if (!state.customProblems) state.customProblems = { add: [], sub: [] };
    const key = op || adminOperation;
    if (!state.customProblems[key]) state.customProblems[key] = [];
    return state.customProblems[key];
  }

  function renderAdminScreen() {
    if (!els.adminOperationRow) return;
    els.adminOperationRow.innerHTML = '';
    D.OPERATIONS.filter(op => op.id === 'add' || op.id === 'sub').forEach(op => {
      const className = 'level-card' + (op.id === adminOperation ? ' selected' : '');
      const html = `
        <div class="level-emoji">${op.emoji}</div>
        <div class="level-name">${op.name}</div>
      `;
      const card = makeSelectableCard(className, html, true, '', () => {
        adminOperation = op.id;
        renderAdminScreen();
      });
      els.adminOperationRow.appendChild(card);
    });
    els.adminOpSymbol.textContent = adminOperation === 'add' ? '＋' : '－';
    els.adminInputA.value = '';
    els.adminInputB.value = '';
    els.adminFormError.classList.add('hidden');
    renderAdminProblemList();
  }

  function renderAdminProblemList() {
    const list = getCustomProblems();
    els.adminProblemCount.textContent = list.length;
    if (els.btnAdminPractice) els.btnAdminPractice.disabled = list.length === 0;
    if (list.length === 0) {
      els.adminProblemList.innerHTML = `<div class="item-row-empty">まだ もんだいが ないよ</div>`;
      return;
    }
    const opSymbol = adminOperation === 'add' ? '＋' : '－';
    els.adminProblemList.innerHTML = list.map((p, i) => `
      <div class="admin-problem-row">
        <span class="admin-problem-text">${p.a} ${opSymbol} ${p.b}</span>
        <button class="admin-problem-delete" data-index="${i}" aria-label="けす">✕</button>
      </div>
    `).join('');
  }

  function showAdminError(msg) {
    els.adminFormError.textContent = msg;
    els.adminFormError.classList.remove('hidden');
  }

  function addCustomProblem() {
    const a = parseInt(els.adminInputA.value, 10);
    const b = parseInt(els.adminInputB.value, 10);
    els.adminFormError.classList.add('hidden');
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      showAdminError('すうじを 2つ いれてね');
      return;
    }
    if (a > 99999 || b > 99999) {
      showAdminError('すうじが おおきすぎるよ');
      return;
    }
    if (adminOperation === 'sub' && a < b) {
      showAdminError('ひきざんは 1つめが 2つめより おおきい すうじに してね');
      return;
    }
    getCustomProblems().push({ a, b });
    saveState();
    els.adminInputA.value = '';
    els.adminInputB.value = '';
    els.adminInputA.focus();
    renderAdminProblemList();
  }

  function deleteCustomProblem(index) {
    getCustomProblems().splice(index, 1);
    saveState();
    renderAdminProblemList();
  }

  function startCustomGame() {
    const list = getCustomProblems();
    if (list.length === 0) return;
    const operation = adminOperation;
    const problems = M.shuffle(list).map(p => ({
      a: p.a,
      b: p.b,
      answer: operation === 'add' ? p.a + p.b : p.a - p.b,
    }));
    beginGame({ problems, level: state.selectedLevelByOp[operation] || 1, operation, isCustom: true });
  }

  /* ================= SCREEN: GAME ================= */
  const PROBLEM_GENERATORS = {
    sub: M.generateSubtractionProblem,
    mul: M.generateMultiplicationProblem,
    div: M.generateDivisionProblem,
  };

  /** Shared game-session setup for both the graded level flow and the
      "practice my own problems" admin flow below — `total` (not the
      fixed D.PROBLEMS_PER_SET) drives progress/results throughout, so a
      shorter or longer custom problem list works without special-casing
      the rest of the game loop. */
  function beginGame({ problems, level, operation, isCustom }) {
    const monster = D.getCurrentMonster(state);
    game = {
      level,
      operation,
      monster,
      isCustom: !!isCustom,
      problems,
      total: problems.length,
      index: 0,
      correctCount: 0,
      starsEarned: 0,
      streak: 0,
      peakStreak: 0,
      problemHadMistake: false,
      luckyIndex: problems.length >= 3 ? M.randInt(1, problems.length - 2) : -1,
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

  function startGame(level) {
    const operation = state.selectedOperation;
    const problems = M.buildProblemSet(level, D.PROBLEMS_PER_SET, PROBLEM_GENERATORS[operation]);
    beginGame({ problems, level, operation, isCustom: false });
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
    els.progressTotal.textContent = game.total;
    els.progressFill.style.width = (game.index / game.total) * 100 + '%';
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
    if (game.operation === 'add') game.columnPlan = M.buildColumnPlan(prob.a, prob.b);
    else if (game.operation === 'sub') game.columnPlan = M.buildSubtractionColumnPlan(prob.a, prob.b);
    else game.columnPlan = M.buildSingleStepPlan(prob.a, prob.b, prob.answer);
    game.currentStep = 0;
    game.buffer = '';
    game.locked = false;
    game.problemHadMistake = false;

    renderProgress();
    const isLucky = game.index === game.luckyIndex;
    els.problemCard.classList.toggle('lucky', isLucky);
    els.speechBubble.textContent = isLucky ? D.LUCKY_PROBLEM_MESSAGE : M.pick(D.STARTER_MESSAGES);
    if (isLucky) E.showToast(D.LUCKY_PROBLEM_MESSAGE);
    const opSymbol = { add: '+', sub: '－', mul: '×', div: '÷' }[game.operation];
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
    if (game.operation === 'add') els.stepPrompt.textContent = M.stepPromptText(step);
    else if (game.operation === 'sub') els.stepPrompt.textContent = M.subtractionStepPromptText(step);
    else els.stepPrompt.textContent = `${step.x} ${game.operation === 'mul' ? '×' : '÷'} ${step.y} = ?`;
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
    if (step.synthetic || game.operation === 'mul' || game.operation === 'div') {
      els.animalCounters.innerHTML = `
        <div class="animal-row">&nbsp;</div>
        <div class="animal-row">&nbsp;</div>
      `;
      return;
    }
    const [animalA, animalB] = pickTwoDistinctAnimals();
    els.animalCounters.innerHTML = `
      <div class="animal-row">${animalA.repeat(step.x)}</div>
      <div class="animal-row">${animalB.repeat(step.y)}</div>
    `;
  }

  /** Multiplication/division facts are a single big answer box, not a
      multi-column table — no place-label/carry-slot/digit-a/digit-b
      needed since the fact itself is already shown in problem-overview.
      Keeps the same `.place-col[data-step-index="0"] .digit-result`
      shape the rest of the input handling (activeColumnEl,
      updateActiveResultDisplay, submitAnswer's colEl) relies on. */
  function renderSingleStepBox() {
    const resultHtml = game.buffer.length ? game.buffer : '?';
    const resultClass = 'digit-result' + (game.buffer.length ? ' entering' : ' placeholder');
    els.columnTable.innerHTML = `
      <div class="place-col active single-step" data-step-index="0">
        <div class="line"></div>
        <div class="${resultClass}">${resultHtml}</div>
      </div>`;
  }

  function renderColumnTable(opts) {
    if (game.operation === 'mul' || game.operation === 'div') {
      renderSingleStepBox();
      return;
    }
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
          game.monsterHp = Math.max(0, game.monsterHp - 100 / game.total);
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
    if (game.index >= game.total) {
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

    // Custom (parent-authored) practice sets can be any length, so the
    // pass/celebrate bars scale by the same ratio the graded flow uses
    // (D.PASS_THRESHOLD / D.CELEBRATE_STARS_THRESHOLD out of
    // D.PROBLEMS_PER_SET) rather than the fixed absolute counts.
    const passThreshold = Math.ceil(game.total * D.PASS_THRESHOLD / D.PROBLEMS_PER_SET);
    const celebrateThreshold = Math.ceil(game.total * D.CELEBRATE_STARS_THRESHOLD / D.PROBLEMS_PER_SET);
    const passed = correct >= passThreshold;
    let leveledUp = false;
    if (!game.isCustom) {
      const maxUnlocked = state.maxUnlockedLevelByOp[game.operation];
      if (passed && game.level === maxUnlocked && maxUnlocked < D.getMaxLevelIdForOp(game.operation)) {
        state.maxUnlockedLevelByOp[game.operation] = maxUnlocked + 1;
        leveledUp = true;
      }
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
      correct === game.total ? 'かんぺき！さんすう おひめさまだね！' :
      passed ? 'よく できました！' : 'よく がんばったね！';
    // Repeating one glyph per problem reads as a cute star row at small
    // set sizes, but with a set in the thousands it'd mean rendering
    // thousands of characters — fall back to a compact count instead.
    els.resultStars.textContent = game.total <= 30
      ? '⭐'.repeat(correct) + '☆'.repeat(game.total - correct)
      : `⭐ ${correct} / ${game.total}`;
    const bonusNote = earned > correct ? `（おまけで +${earned - correct}こ！）` : '';
    els.resultDetail.textContent =
      `${game.total}もんちゅう ${correct}もん せいかい — ほし +${earned}こ${bonusNote} — ぜんぶで ${state.totalStars}こ` +
      (leveledUp ? ' — 🎉 あたらしい むずかしさが あいたよ！' : '');

    els.btnNextLevel.style.display = (!game.isCustom && game.level < D.getMaxLevelIdForOp(game.operation) && (game.level + 1) <= state.maxUnlockedLevelByOp[game.operation]) ? 'inline-block' : 'none';

    showScreen('result');
    if (correct >= celebrateThreshold) {
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

    els.promptConfirm.addEventListener('click', confirmPrompt);
    els.promptCancel.addEventListener('click', () => closePrompt(null));
    els.promptModal.addEventListener('click', (e) => {
      if (e.target === els.promptModal) closePrompt(null);
    });
    els.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmPrompt(); }
      else if (e.key === 'Escape') { e.preventDefault(); closePrompt(null); }
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

    if (els.btnOpenAdmin) {
      els.btnOpenAdmin.addEventListener('click', () => {
        showScreen('admin');
        renderAdminScreen();
      });
    }
    if (els.btnAdminBack) {
      els.btnAdminBack.addEventListener('click', () => {
        showScreen('home');
        renderHome();
      });
    }
    if (els.btnAdminAdd) els.btnAdminAdd.addEventListener('click', addCustomProblem);
    if (els.adminInputA) {
      els.adminInputA.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); els.adminInputB.focus(); }
      });
    }
    if (els.adminInputB) {
      els.adminInputB.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addCustomProblem(); }
      });
    }
    if (els.adminProblemList) {
      els.adminProblemList.addEventListener('click', (e) => {
        const btn = e.target.closest('.admin-problem-delete');
        if (!btn) return;
        deleteCustomProblem(Number(btn.dataset.index));
      });
    }
    if (els.btnAdminPractice) els.btnAdminPractice.addEventListener('click', startCustomGame);

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

    els.btnPlayAgain.addEventListener('click', () => {
      if (game.isCustom) startCustomGame();
      else startGame(game.level);
    });
    els.btnNextLevel.addEventListener('click', () => {
      const next = Math.min(game.level + 1, D.getMaxLevelIdForOp(game.operation));
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
