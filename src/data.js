/* Game content (princesses, levels, message pools) and save-state
   persistence. Browser-only (uses localStorage) but has no other UI
   dependency. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  const STORAGE_KEY = 'princessMathState_v1';

  /* Princess mascots are an original design (custom icon + name) —
     no Disney (or other) character names or artwork are used. */
  const PRINCESSES = [
    { id: 'rose',    name: 'Công Chúa Hoa Hồng',  avatar: '👸🏻', mascot: '🧚', unlockStars: 0   },
    { id: 'snow',    name: 'Công Chúa Băng Tuyết', avatar: '👸🏼', mascot: '❄️', unlockStars: 10  },
    { id: 'mermaid', name: 'Công Chúa Biển Cả',   avatar: '🧜‍♀️', mascot: '🐚', unlockStars: 25  },
    { id: 'forest',  name: 'Công Chúa Rừng Xanh', avatar: '🧝‍♀️', mascot: '🌿', unlockStars: 45  },
    { id: 'star',    name: 'Công Chúa Ánh Sao',   avatar: '🧚‍♀️', mascot: '🌟', unlockStars: 70  },
    { id: 'rainbow', name: 'Nữ Hoàng Cầu Vồng',   avatar: '🦄',   mascot: '🌈', unlockStars: 100 },
  ];

  const LEVELS = [
    { id: 1, name: 'Dễ',  emoji: '🌸', desc: 'Không nhớ, số nhỏ' },
    { id: 2, name: 'Vừa', emoji: '🌟', desc: 'Có nhớ hàng đơn vị' },
    { id: 3, name: 'Khó', emoji: '🔥', desc: 'Có nhớ, số lớn hơn' },
  ];

  const PROBLEMS_PER_SET = 10;
  const PASS_THRESHOLD = 6;          // correct answers needed to unlock the next level
  const CELEBRATE_STARS_THRESHOLD = 8; // correct answers needed for the big confetti finale

  const PRAISE_MESSAGES = [
    'Giỏi quá đi mất! 🎉', 'Chính xác luôn nè! ✨', 'Công chúa tự hào về bé! 👑',
    'Xuất sắc! Bé làm đúng rồi! 💖', 'Wao, bé tính nhanh ghê!', 'Đúng rồi đó, bé giỏi lắm!',
  ];
  const COLUMN_PRAISE = ['Đúng rồi! ✨', 'Chuẩn luôn!', 'Giỏi ghê!', 'Chính xác!', 'Tính hay lắm!'];
  const ENCOURAGE_MESSAGES = [
    'Không sao đâu, bé thử lại nha! 💪', 'Công chúa tin bé làm được!',
    'Xem kỹ lại phép cộng nhé!', 'Cố lên bé ơi, sắp đúng rồi!', 'Bình tĩnh tính lại nhé công chúa nhỏ!',
  ];
  const STARTER_MESSAGES = [
    'Mình cùng tính từng hàng một nhé!', 'Cộng hàng đơn vị trước nha bé!',
    'Bé cùng công chúa giải phép tính này nào!', 'Từng bước một, bé sẽ làm được!',
  ];
  const STICKER_POOL = ['🦋', '🌸', '🍭', '🎈', '🦄', '🍬', '🧁', '🌟', '💫', '🎀', '🐬', '🌈', '🍓', '🐣'];
  const CONFETTI_EMOJI = ['🎉', '✨', '💖', '⭐', '🌸', '👑', '🎊'];

  function defaultState() {
    return {
      totalStars: 0,
      selectedPrincessId: PRINCESSES[0].id,
      selectedLevel: 1,
      maxUnlockedLevel: 1,
      soundOn: true,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* localStorage unavailable or payload corrupt — fall back to defaults */ }
    return defaultState();
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private browsing / quota exceeded — progress just won't persist */ }
  }

  function isPrincessUnlocked(state, princess) {
    return state.totalStars >= princess.unlockStars;
  }

  function getSelectedPrincess(state) {
    return PRINCESSES.find(p => p.id === state.selectedPrincessId) || PRINCESSES[0];
  }

  root.PM.Data = {
    STORAGE_KEY,
    PRINCESSES,
    LEVELS,
    PROBLEMS_PER_SET,
    PASS_THRESHOLD,
    CELEBRATE_STARS_THRESHOLD,
    PRAISE_MESSAGES,
    COLUMN_PRAISE,
    ENCOURAGE_MESSAGES,
    STARTER_MESSAGES,
    STICKER_POOL,
    CONFETTI_EMOJI,
    defaultState,
    loadState,
    saveState,
    isPrincessUnlocked,
    getSelectedPrincess,
  };
})(typeof window !== 'undefined' ? window : globalThis);
