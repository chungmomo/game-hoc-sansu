/* =========================================================
   Công Chúa Toán Học — phép cộng 2 chữ số kiểu Kumon
   Nhân vật công chúa là thiết kế gốc (icon + tên tự đặt),
   không sử dụng hình ảnh / tên nhân vật có bản quyền.
   ========================================================= */

const STORAGE_KEY = 'princessMathState_v1';

const PRINCESSES = [
  { id: 'rose',    name: 'Công Chúa Hoa Hồng',  avatar: '👸🏻', mascot: '🧚', theme: '#ff8fc7', unlockStars: 0   },
  { id: 'snow',    name: 'Công Chúa Băng Tuyết', avatar: '👸🏼', mascot: '❄️', theme: '#8fd8ff', unlockStars: 10  },
  { id: 'mermaid', name: 'Công Chúa Biển Cả',   avatar: '🧜‍♀️', mascot: '🐚', theme: '#4fd1c5', unlockStars: 25  },
  { id: 'forest',  name: 'Công Chúa Rừng Xanh', avatar: '🧝‍♀️', mascot: '🌿', theme: '#8bc34a', unlockStars: 45  },
  { id: 'star',    name: 'Công Chúa Ánh Sao',   avatar: '🧚‍♀️', mascot: '🌟', theme: '#b388ff', unlockStars: 70  },
  { id: 'rainbow', name: 'Nữ Hoàng Cầu Vồng',   avatar: '🦄',   mascot: '🌈', theme: '#ffd54f', unlockStars: 100 },
];

const LEVELS = [
  { id: 1, name: 'Dễ',   emoji: '🌸', desc: 'Không nhớ, số nhỏ' },
  { id: 2, name: 'Vừa',  emoji: '🌟', desc: 'Có nhớ hàng đơn vị' },
  { id: 3, name: 'Khó',  emoji: '🔥', desc: 'Có nhớ, số lớn hơn' },
];

const PROBLEMS_PER_SET = 10;

const PRAISE_MESSAGES = [
  'Giỏi quá đi mất! 🎉', 'Chính xác luôn nè! ✨', 'Công chúa tự hào về bé! 👑',
  'Xuất sắc! Bé làm đúng rồi! 💖', 'Wao, bé tính nhanh ghê!', 'Đúng rồi đó, bé giỏi lắm!',
];
const ENCOURAGE_MESSAGES = [
  'Không sao đâu, bé thử lại nha! 💪', 'Công chúa tin bé làm được!',
  'Xem kỹ lại phép cộng nhé!', 'Cố lên bé ơi, sắp đúng rồi!', 'Bình tĩnh tính lại nhé công chúa nhỏ!',
];
const START_HINTS = {
  1: ['Cộng hàng đơn vị trước, rồi đến hàng chục nhé!', 'Phép tính này dễ lắm, bé thử xem nào!'],
  2: ['Nhớ để ý hàng đơn vị, có thể phải nhớ 1 sang hàng chục đó!', 'Cộng đơn vị trước, nếu lớn hơn 9 thì nhớ 1 nhé!'],
  3: ['Phép tính này khó hơn chút, bé cố lên nhé!', 'Cộng cẩn thận từng hàng một nha công chúa!'],
};

/* ---------------- state ---------------- */
let state = loadState();

let game = null; // current game session

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    }
  } catch (e) { /* ignore corrupt state */ }
  return defaultState();
}

function defaultState() {
  return {
    totalStars: 0,
    selectedPrincessId: PRINCESSES[0].id,
    selectedLevel: 1,
    maxUnlockedLevel: 1,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------------- helpers ---------------- */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function isPrincessUnlocked(p) { return state.totalStars >= p.unlockStars; }
function getSelectedPrincess() {
  return PRINCESSES.find(p => p.id === state.selectedPrincessId) || PRINCESSES[0];
}

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
    let onesA = randInt(1, 9);
    let onesB = randInt(10 - onesA, 9);
    if (onesB > 9) onesB = 9;
    if (onesA + onesB < 10) onesB = 10 - onesA;
    a = tensA * 10 + onesA;
    b = tensB * 10 + onesB;
  } else {
    a = randInt(10, 99);
    b = randInt(10, 99);
  }
  return { a, b, answer: a + b };
}

function buildProblemSet(level, count) {
  const list = [];
  for (let i = 0; i < count; i++) list.push(generateProblem(level));
  return list;
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    Object.assign(toast.style, {
      position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%) translateY(-40px)',
      background: '#fff', color: '#8c5cff', fontWeight: '800', fontFamily: "'Baloo 2', sans-serif",
      padding: '.6rem 1.2rem', borderRadius: '999px', boxShadow: '0 6px 16px rgba(0,0,0,.18)',
      zIndex: 200, opacity: '0', transition: 'transform .25s ease, opacity .25s ease', pointerEvents: 'none',
      maxWidth: '86vw', textAlign: 'center', fontSize: '.9rem',
    });
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-40px)';
  }, 1700);
}

/* ---------------- confetti ---------------- */
const CONFETTI_EMOJI = ['🎉', '✨', '💖', '⭐', '🌸', '👑', '🎊'];
function spawnConfetti(count) {
  const layer = document.getElementById('confetti-layer');
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.textContent = pick(CONFETTI_EMOJI);
    const duration = 1.4 + Math.random() * 1.2;
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.animationDuration = duration + 's';
    piece.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), duration * 1000 + 100);
  }
}

/* ---------------- sound (WebAudio, no assets needed) ---------------- */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}
function playTone(freq, start, duration, type = 'sine', gainVal = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainVal;
  osc.connect(gain).connect(ctx.destination);
  const t0 = ctx.currentTime + start;
  osc.start(t0);
  gain.gain.setValueAtTime(gainVal, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.stop(t0 + duration + 0.02);
}
function playCorrectSound() {
  try { playTone(523, 0, 0.12); playTone(659, 0.1, 0.12); playTone(784, 0.2, 0.2); } catch (e) {}
}
function playWrongSound() {
  try { playTone(220, 0, 0.18, 'sawtooth', 0.05); } catch (e) {}
}
function playCelebrateSound() {
  try {
    [523, 587, 659, 784, 880].forEach((f, i) => playTone(f, i * 0.12, 0.18));
  } catch (e) {}
}

/* ================= SCREEN: HOME ================= */
const screens = {
  home: document.getElementById('screen-home'),
  game: document.getElementById('screen-game'),
  result: document.getElementById('screen-result'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function renderHome() {
  document.getElementById('star-total-text').textContent = state.totalStars;

  const princessRow = document.getElementById('princess-row');
  princessRow.innerHTML = '';
  PRINCESSES.forEach(p => {
    const unlocked = isPrincessUnlocked(p);
    const card = document.createElement('div');
    card.className = 'princess-card' + (p.id === state.selectedPrincessId ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <div class="princess-avatar">${p.avatar}</div>
      <div class="princess-name">${p.name}</div>
      ${unlocked ? '' : `<div class="princess-lock">🔒 ${p.unlockStars}⭐</div>`}
    `;
    card.addEventListener('click', () => {
      if (!unlocked) {
        showToast(`Cần ${p.unlockStars} sao để mở khóa ${p.name}! Bé cố lên nhé!`);
        return;
      }
      state.selectedPrincessId = p.id;
      saveState();
      renderHome();
    });
    princessRow.appendChild(card);
  });

  const levelRow = document.getElementById('level-row');
  levelRow.innerHTML = '';
  LEVELS.forEach(lv => {
    const unlocked = lv.id <= state.maxUnlockedLevel;
    const card = document.createElement('div');
    card.className = 'level-card' + (lv.id === state.selectedLevel ? ' selected' : '');
    card.style.opacity = unlocked ? '1' : '.55';
    card.innerHTML = `
      <div class="level-emoji">${lv.emoji}</div>
      <div class="level-name">${lv.name}${unlocked ? '' : ' 🔒'}</div>
      <div class="level-desc">${lv.desc}</div>
    `;
    card.addEventListener('click', () => {
      if (!unlocked) {
        showToast('Bé hoàn thành cấp độ trước để mở khóa nhé!');
        return;
      }
      state.selectedLevel = lv.id;
      saveState();
      renderHome();
    });
    levelRow.appendChild(card);
  });
}

document.getElementById('btn-start').addEventListener('click', () => {
  startGame(state.selectedLevel);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Xóa toàn bộ tiến trình và sao đã thu thập?')) {
    state = defaultState();
    saveState();
    renderHome();
  }
});

/* ================= SCREEN: GAME ================= */
function startGame(level) {
  game = {
    level,
    problems: buildProblemSet(level, PROBLEMS_PER_SET),
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
  const p = getSelectedPrincess();
  document.getElementById('mascot').textContent = p.mascot;
  document.getElementById('lives').textContent = game.livesIcons.join('');
}

function renderProgress() {
  document.getElementById('progress-current').textContent = game.index + 1;
  document.getElementById('progress-total').textContent = PROBLEMS_PER_SET;
  const pct = (game.index / PROBLEMS_PER_SET) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
}

function renderProblem() {
  const prob = game.problems[game.index];
  game.buffer = '';
  game.expectedLen = String(prob.answer).length;
  game.locked = false;

  renderProgress();

  document.getElementById('row-a').innerHTML = `<span>${prob.a}</span>`;
  document.getElementById('row-b').innerHTML = `<span class="plus-sign">+</span><span>${prob.b}</span>`;

  const hints = START_HINTS[game.level];
  document.getElementById('speech-bubble').textContent = pick(hints);

  renderAnswerBoxes();
}

function renderAnswerBoxes() {
  const row = document.getElementById('row-answer');
  row.className = 'col-row num-row answer-row';
  let html = '';
  for (let i = 0; i < game.expectedLen; i++) {
    const digit = game.buffer[i];
    html += `<span class="digit-box${digit === undefined ? ' placeholder' : ''}">${digit === undefined ? '_' : digit}</span>`;
  }
  row.innerHTML = html;
}

document.getElementById('keypad').addEventListener('click', (e) => {
  const btn = e.target.closest('.key');
  if (!btn || !game || game.locked) return;
  const key = btn.dataset.key;

  if (key === 'clear') {
    game.buffer = game.buffer.slice(0, -1);
    renderAnswerBoxes();
    return;
  }
  if (key === 'submit') {
    submitAnswer();
    return;
  }
  if (game.buffer.length < game.expectedLen) {
    game.buffer += key;
    renderAnswerBoxes();
  }
});

function submitAnswer() {
  if (game.buffer.length === 0) {
    showToast('Bé nhập kết quả trước nhé!');
    return;
  }
  const prob = game.problems[game.index];
  const userAnswer = Number(game.buffer);
  const row = document.getElementById('row-answer');

  if (userAnswer === prob.answer) {
    game.locked = true;
    row.classList.add('correct-pop');
    game.correctCount++;
    document.getElementById('speech-bubble').textContent = pick(PRAISE_MESSAGES);
    playCorrectSound();
    spawnConfetti(14);
    setTimeout(nextProblem, 950);
  } else {
    row.classList.remove('correct-pop');
    void row.offsetWidth;
    row.classList.add('wrong-shake');
    document.getElementById('speech-bubble').textContent = pick(ENCOURAGE_MESSAGES);
    playWrongSound();
    let brokeOne = false;
    for (let i = game.livesIcons.length - 1; i >= 0; i--) {
      if (game.livesIcons[i] === '💖') { game.livesIcons[i] = '💔'; brokeOne = true; break; }
    }
    if (!brokeOne) {
      game.livesIcons = ['💖', '💖', '💖'];
    }
    document.getElementById('lives').textContent = game.livesIcons.join('');
    game.buffer = '';
    setTimeout(() => {
      row.classList.remove('wrong-shake');
      renderAnswerBoxes();
    }, 420);
  }
}

function nextProblem() {
  const row = document.getElementById('row-answer');
  row.classList.remove('correct-pop');
  game.index++;
  if (game.index >= PROBLEMS_PER_SET) {
    finishSet();
  } else {
    renderProblem();
  }
}

document.getElementById('btn-back-home').addEventListener('click', () => {
  showScreen('home');
  renderHome();
});

/* ================= SCREEN: RESULT ================= */
function finishSet() {
  const correct = game.correctCount;
  state.totalStars += correct;

  const passed = correct >= 6;
  let leveledUp = false;
  if (passed && game.level === state.maxUnlockedLevel && state.maxUnlockedLevel < LEVELS.length) {
    state.maxUnlockedLevel++;
    leveledUp = true;
  }
  saveState();

  const p = getSelectedPrincess();
  document.getElementById('result-mascot').textContent = leveledUp ? '🎊' : p.avatar;
  document.getElementById('result-title').textContent =
    correct === PROBLEMS_PER_SET ? 'Hoàn Hảo! Bé Là Công Chúa Toán Học!' :
    passed ? 'Bé Làm Rất Tốt!' : 'Bé Đã Cố Gắng Rồi!';
  document.getElementById('result-stars').textContent = '⭐'.repeat(correct) + '☆'.repeat(PROBLEMS_PER_SET - correct);
  document.getElementById('result-detail').textContent =
    `Đúng ${correct}/${PROBLEMS_PER_SET} câu — Tổng cộng ${state.totalStars} sao` +
    (leveledUp ? ` — 🎉 Mở khóa cấp độ mới!` : '');

  const nextBtn = document.getElementById('btn-next-level');
  const hasNext = game.level < LEVELS.length && game.level < state.maxUnlockedLevel + (leveledUp ? 0 : 1) && (game.level + 1) <= state.maxUnlockedLevel;
  nextBtn.style.display = (game.level < LEVELS.length && (game.level + 1) <= state.maxUnlockedLevel) ? 'inline-block' : 'none';

  showScreen('result');
  if (correct >= 8) {
    spawnConfetti(40);
    playCelebrateSound();
  }
}

document.getElementById('btn-play-again').addEventListener('click', () => {
  startGame(game.level);
});
document.getElementById('btn-next-level').addEventListener('click', () => {
  const next = Math.min(game.level + 1, LEVELS.length);
  state.selectedLevel = next;
  saveState();
  startGame(next);
});
document.getElementById('btn-go-home').addEventListener('click', () => {
  showScreen('home');
  renderHome();
});

/* ================= INIT ================= */
renderHome();
showScreen('home');
