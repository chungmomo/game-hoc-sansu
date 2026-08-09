/* Game content (princesses, levels, message pools) and save-state
   persistence. Browser-only (uses localStorage) but has no other UI
   dependency. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  const STORAGE_KEY = 'princessMathState_v1';

  /* Princess mascots are an original design (custom icon + name) —
     no Disney (or other) character names or artwork are used. The
     "Ice Queen" is inspired by Andersen's public-domain fairy tale
     "The Snow Queen" (1844), not any studio's copyrighted character.
     Each has its own rewardEmoji pool used for confetti/stickers when
     that princess is the one selected. */
  const PRINCESSES = [
    { id: 'rose',    name: 'ばらの おひめさま',    avatar: '👸🏻', mascot: '🧚', unlockStars: 0,
      rewardEmoji: ['🌹', '🌸', '💐', '🦋', '🍓', '💕'] },
    { id: 'snow',    name: 'こおりの じょおうさま', avatar: '👸🏼', mascot: '❄️', unlockStars: 10,
      rewardEmoji: ['❄️', '⛄', '🧊', '💎', '✨', '🤍'] },
    { id: 'mermaid', name: 'うみの おひめさま',    avatar: '🧜‍♀️', mascot: '🐚', unlockStars: 25,
      rewardEmoji: ['🐚', '🐬', '🌊', '🫧', '🦪', '💙'] },
    { id: 'forest',  name: 'もりの おひめさま',    avatar: '🧝‍♀️', mascot: '🌿', unlockStars: 45,
      rewardEmoji: ['🌿', '🍃', '🦋', '🐿️', '🌼', '🍄'] },
    { id: 'star',    name: 'ほしの おひめさま',    avatar: '🧚‍♀️', mascot: '🌟', unlockStars: 70,
      rewardEmoji: ['🌟', '💫', '⭐', '🌠', '✨', '🔭'] },
    { id: 'rainbow', name: 'にじの じょおう',      avatar: '🦄',   mascot: '🌈', unlockStars: 100,
      rewardEmoji: ['🌈', '🎊', '🦄', '💛', '🧡', '💜'] },
  ];

  const LEVELS = [
    { id: 1, name: 'やさしい',   emoji: '🌸', desc: 'くりあがりなし・ちいさいかず' },
    { id: 2, name: 'ふつう',     emoji: '🌟', desc: 'いちのくらいで くりあがりあり' },
    { id: 3, name: 'むずかしい', emoji: '🔥', desc: 'くりあがりあり・おおきいかず' },
  ];

  const PROBLEMS_PER_SET = 10;
  const PASS_THRESHOLD = 6;          // correct answers needed to unlock the next level
  const CELEBRATE_STARS_THRESHOLD = 8; // correct answers needed for the big confetti finale

  const PRAISE_MESSAGES = [
    'すごいね！🎉', 'せいかい！✨', 'おひめさまも よろこんでるよ！👑',
    'すばらしい！せいかいだよ！💖', 'わあ、けいさん はやいね！', 'せいかい！じょうずだね！',
  ];
  const COLUMN_PRAISE = ['せいかい！✨', 'ばっちり！', 'じょうず！', 'そのとおり！', 'けいさん じょうずだね！'];
  const ENCOURAGE_MESSAGES = [
    'だいじょうぶ、もういちど やってみよう！💪', 'おひめさまは できると しんじてるよ！',
    'もういちど けいさんを みてみよう！', 'がんばれ、もうすこしだよ！', 'あわてずに もういちど けいさんしてみよう！',
  ];
  const STARTER_MESSAGES = [
    'ひとつずつ くらいを けいさんしよう！', 'まず いちのくらいから けいさんしよう！',
    'おひめさまと いっしょに といてみよう！', 'ひとつずつ すすめば だいじょうぶ！',
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
