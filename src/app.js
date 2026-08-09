/* UI wiring: screens, rendering, event handling, and the per-run
   game state machine. Depends on PM.Math, PM.Data, PM.Audio, PM.Effects
   (see index.html for load order). */
(function () {
  'use strict';
  const M = window.PM.Math;
  const D = window.PM.Data;
  const A = window.PM.Audio;
  const E = window.PM.Effects;

  let state = D.loadState();
  let game = null; // current 10-problem session, or null on the home/result screens

  function saveState() { D.saveState(state); }

  const screens = {};
  const els = {};

  function cacheDom() {
    screens.home = document.getElementById('screen-home');
    screens.game = document.getElementById('screen-game');
    screens.result = document.getElementById('screen-result');

    els.starTotalText = document.getElementById('star-total-text');
    els.princessRow = document.getElementById('princess-row');
    els.levelRow = document.getElementById('level-row');
    els.btnStart = document.getElementById('btn-start');
    els.btnReset = document.getElementById('btn-reset');

    els.btnBackHome = document.getElementById('btn-back-home');
    els.progressCurrent = document.getElementById('progress-current');
    els.progressTotal = document.getElementById('progress-total');
    els.progressFill = document.getElementById('progress-fill');
    els.lives = document.getElementById('lives');
    els.mascot = document.getElementById('mascot');
    els.speechBubble = document.getElementById('speech-bubble');
    els.problemOverview = document.getElementById('problem-overview');
    els.columnTable = document.getElementById('column-table');
    els.stepPrompt = document.getElementById('step-prompt');
    els.keypad = document.getElementById('keypad');

    els.resultMascot = document.getElementById('result-mascot');
    els.resultTitle = document.getElementById('result-title');
    els.resultStars = document.getElementById('result-stars');
    els.resultDetail = document.getElementById('result-detail');
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
    D.LEVELS.forEach(lv => {
      const unlocked = lv.id <= state.maxUnlockedLevel;
      const className = 'level-card' + (lv.id === state.selectedLevel ? ' selected' : '');
      const html = `
        <div class="level-emoji">${lv.emoji}</div>
        <div class="level-name">${lv.name}${unlocked ? '' : ' 🔒'}</div>
        <div class="level-desc">${lv.desc}</div>
      `;
      const card = makeSelectableCard(className, html, unlocked, 'まえの むずかしさを おわらせてから えらんでね！', () => {
        state.selectedLevel = lv.id;
        saveState();
        renderHome();
      });
      card.style.opacity = unlocked ? '1' : '.55';
      els.levelRow.appendChild(card);
    });
  }

  /* ================= SCREEN: GAME ================= */
  function startGame(level) {
    game = {
      level,
      problems: M.buildProblemSet(level, D.PROBLEMS_PER_SET),
      index: 0,
      correctCount: 0,
      livesIcons: ['💖', '💖', '💖'],
      buffer: '',
      locked: false,
    };
    showScreen('game');
    renderMascotHeader();
    renderProblem();
  }

  function renderMascotHeader() {
    const p = D.getSelectedPrincess(state);
    els.mascot.textContent = p.mascot;
    els.lives.textContent = game.livesIcons.join('');
  }

  function renderProgress() {
    els.progressCurrent.textContent = game.index + 1;
    els.progressTotal.textContent = D.PROBLEMS_PER_SET;
    els.progressFill.style.width = (game.index / D.PROBLEMS_PER_SET) * 100 + '%';
  }

  function renderProblem() {
    const prob = game.problems[game.index];
    game.columnPlan = M.buildColumnPlan(prob.a, prob.b);
    game.currentStep = 0;
    game.buffer = '';
    game.locked = false;

    renderProgress();
    els.speechBubble.textContent = M.pick(D.STARTER_MESSAGES);
    els.problemOverview.textContent = `もんだい：${prob.a} + ${prob.b} = ?`;
    renderColumnTable();
    renderStepPrompt();
  }

  function renderStepPrompt() {
    const step = game.columnPlan[game.currentStep];
    els.stepPrompt.textContent = M.stepPromptText(step);
  }

  function renderColumnTable(opts) {
    const pendingCarryFlight = !!(opts && opts.pendingCarryFlight);
    const current = game.currentStep;
    const cols = [...game.columnPlan].reverse();

    let html = `
      <div class="place-col plus-col">
        <div class="place-label">&nbsp;</div>
        <div class="digit-a">&nbsp;</div>
        <div class="digit-b">+</div>
        <div class="carry-slot">&nbsp;</div>
        <div class="line"></div>
        <div class="digit-result">&nbsp;</div>
      </div>`;

    cols.forEach(step => {
      const isActive = step.index === current;
      const isDone = step.index < current;
      const known = step.index <= current;
      const carryHtml = (known && step.carryIn > 0) ? `くり${step.carryIn}` : '&nbsp;';
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
          <div class="place-label">${M.placeLabel(step.index)}</div>
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

  function loseHeart() {
    let brokeOne = false;
    for (let i = game.livesIcons.length - 1; i >= 0; i--) {
      if (game.livesIcons[i] === '💖') { game.livesIcons[i] = '💔'; brokeOne = true; break; }
    }
    if (!brokeOne) game.livesIcons = ['💖', '💖', '💖'];
    els.lives.textContent = game.livesIcons.join('');
  }

  function currentExpectedLen() {
    return String(game.columnPlan[game.currentStep].sum).length;
  }

  function pressDigit(digit) {
    if (!game || game.locked) return;
    if (game.buffer.length < currentExpectedLen()) {
      game.buffer += digit;
      updateActiveResultDisplay();
    }
  }

  function pressClear() {
    if (!game || game.locked) return;
    game.buffer = game.buffer.slice(0, -1);
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

    if (userSum === step.sum) {
      game.locked = true;
      colEl.classList.add('correct-pop');
      A.playStepDing();
      E.stickerAtElement(colEl);

      const isLastStep = game.currentStep === game.columnPlan.length - 1;
      if (isLastStep) {
        game.correctCount++;
        els.speechBubble.textContent = M.pick(D.PRAISE_MESSAGES);
        A.playCorrectSound();
        E.spawnConfetti(16);
        E.spawnStickerBurst(5);
        setTimeout(nextProblem, 1150);
      } else {
        els.speechBubble.textContent = M.pick(D.COLUMN_PRAISE);
        const carryDigit = step.carryOut;
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
    const correct = game.correctCount;
    state.totalStars += correct;

    const passed = correct >= D.PASS_THRESHOLD;
    let leveledUp = false;
    if (passed && game.level === state.maxUnlockedLevel && state.maxUnlockedLevel < D.LEVELS.length) {
      state.maxUnlockedLevel++;
      leveledUp = true;
    }
    saveState();

    const p = D.getSelectedPrincess(state);
    els.resultMascot.textContent = leveledUp ? '🎊' : p.avatar;
    els.resultTitle.textContent =
      correct === D.PROBLEMS_PER_SET ? 'かんぺき！さんすう おひめさまだね！' :
      passed ? 'よく できました！' : 'よく がんばったね！';
    els.resultStars.textContent = '⭐'.repeat(correct) + '☆'.repeat(D.PROBLEMS_PER_SET - correct);
    els.resultDetail.textContent =
      `${D.PROBLEMS_PER_SET}もんちゅう ${correct}もん せいかい — ほし ${state.totalStars}こ` +
      (leveledUp ? ' — 🎉 あたらしい むずかしさが あいたよ！' : '');

    els.btnNextLevel.style.display = (game.level < D.LEVELS.length && (game.level + 1) <= state.maxUnlockedLevel) ? 'inline-block' : 'none';

    showScreen('result');
    if (correct >= D.CELEBRATE_STARS_THRESHOLD) {
      E.spawnConfetti(40);
      A.playCelebrateSound();
    }
  }

  /* ================= wiring ================= */
  function bindEvents() {
    els.btnStart.addEventListener('click', () => startGame(state.selectedLevel));

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
      state.selectedLevel = next;
      saveState();
      startGame(next);
    });
    els.btnGoHome.addEventListener('click', () => {
      showScreen('home');
      renderHome();
    });

    els.soundToggles.forEach(btn => btn.addEventListener('click', toggleSound));
  }

  function init() {
    cacheDom();
    bindEvents();
    syncSoundButtons();
    renderHome();
    showScreen('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
