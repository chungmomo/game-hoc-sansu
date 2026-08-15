/* Game content (princesses, levels, message pools) and the shape of a
   save-state. Persistence itself lives in PM.Cloud (Firebase) — this
   file only knows what a default state looks like. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  /* Princess mascots are an original design (custom icon + name) —
     no Disney (or other) character names or artwork are used. The
     "Ice Queen" is inspired by Andersen's public-domain fairy tale
     "The Snow Queen" (1844), not any studio's copyrighted character.
     Each has its own rewardEmoji pool used for confetti/stickers when
     that princess is the one selected. */
  const PRINCESSES = [
    { id: 'rose',    name: 'まいひめ',             avatar: '👸🏻', mascot: '🧚', unlockStars: 0,
      rewardEmoji: ['🌹', '🌸', '💐', '🦋', '🍓', '💕'] },
    { id: 'buddy',   name: 'げんきな おひめさま',  avatar: '👧',   mascot: '✌️', unlockStars: 0,
      rewardEmoji: ['✌️', '😝', '🎀', '🍭', '💚', '🧡'] },
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
    { id: 'sun',     name: 'たいようの じょおう',  avatar: '👸🏽', mascot: '☀️', unlockStars: 150,
      rewardEmoji: ['☀️', '🌻', '🍯', '🐝', '🧡', '🌾'] },
    { id: 'cosmos',  name: 'うちゅうの じょおう',  avatar: '🧞‍♀️', mascot: '🌌', unlockStars: 220,
      rewardEmoji: ['🌌', '🪐', '☄️', '🌠', '💫', '🔮'] },
    { id: 'thunder',   name: 'かみなりの じょおう', avatar: '🧙‍♀️', mascot: '⚡', unlockStars: 300,
      rewardEmoji: ['⚡', '🌩️', '💜', '✨', '🔮', '🦋'] },
    { id: 'fireworks', name: 'はなびの じょおう',   avatar: '👸🏿', mascot: '🎆', unlockStars: 400,
      rewardEmoji: ['🎆', '🎇', '✨', '🎊', '💖', '🌟'] },
    { id: 'legend',    name: 'でんせつの じょおう', avatar: '👑',   mascot: '🏆', unlockStars: 550,
      rewardEmoji: ['👑', '💎', '🏆', '✨', '🌟', '💫'] },
  ];

  const LEVELS = [
    { id: 1, name: 'やさしい',   emoji: '🌸', desc: 'くりあがりなし・ちいさいかず' },
    { id: 2, name: 'ふつう',     emoji: '🌟', desc: 'いちのくらいで くりあがりあり' },
    { id: 3, name: 'むずかしい', emoji: '🔥', desc: 'くりあがりあり・おおきいかず' },
    { id: 4, name: 'とくべつ',   emoji: '💎', desc: '3けた + 2けたの けいさん' },
    { id: 5, name: 'たつじん',   emoji: '👑', desc: '3けた + 3けたの けいさん' },
    { id: 6, name: 'だいたつじん', emoji: '🏆', desc: '4けた + 3けたの けいさん' },
    { id: 7, name: 'でんせつ',   emoji: '🐉', desc: '4けた + 4けたの けいさん' },
  ];

  /* Same 5 level tiers apply to both operations — only the underlying
     number generator (carry vs. borrow) differs, so LEVELS is shared. */
  const OPERATIONS = [
    { id: 'add', name: 'たしざん', emoji: '➕' },
    { id: 'sub', name: 'ひきざん', emoji: '➖' },
  ];

  const PROBLEMS_PER_SET = 10;
  const PASS_THRESHOLD = 6;          // correct answers needed to unlock the next level
  const CELEBRATE_STARS_THRESHOLD = 8; // correct answers needed for the big confetti finale

  const STREAK_MILESTONES = [3, 5, 8]; // consecutive perfect problems that trigger a streak bonus
  const STREAK_BONUS_STARS = 1;        // extra stars awarded at each milestone

  const PRAISE_MESSAGES = [
    'すごいね！🎉', 'せいかい！✨', 'おひめさまも よろこんでるよ！👑',
    'すばらしい！せいかいだよ！💖', 'わあ、けいさん はやいね！', 'せいかい！じょうずだね！',
    'かんぺき！さすがだね！🌟', 'やったね！だいせいかい！', 'ぴったり あってるよ！😊',
    'その ちょうし！すごい じょうずだよ！',
  ];
  const COLUMN_PRAISE = [
    'せいかい！✨', 'ばっちり！', 'じょうず！', 'そのとおり！', 'けいさん じょうずだね！',
    'いいね！', 'かんぺき！', 'ナイス けいさん！', 'そう、それ！', 'すごいぞ！',
  ];
  const ENCOURAGE_MESSAGES = [
    'だいじょうぶ、もういちど やってみよう！💪', 'おひめさまは できると しんじてるよ！',
    'もういちど けいさんを みてみよう！', 'がんばれ、もうすこしだよ！', 'あわてずに もういちど けいさんしてみよう！',
    'だれでも まちがえるよ、つぎ いこう！', 'ゆっくりで だいじょうぶだよ！',
    'もうすこし！ふぁいと！', 'いっしょに もういちど かんがえよう！',
  ];
  const STARTER_MESSAGES = [
    'ひとつずつ くらいを けいさんしよう！', 'まず いちのくらいから けいさんしよう！',
    'おひめさまと いっしょに といてみよう！', 'ひとつずつ すすめば だいじょうぶ！',
    'つぎの もんだいだよ、がんばろう！', 'あたらしい もんだいが きたよ！',
    'この もんだい、といてみよう！', 'よし、つぎ いってみよう！',
  ];
  const STREAK_MESSAGES = [
    'れんぞく せいかい！🔥 すごい！', 'ノリノリだね！🔥 その ちょうしで！',
    'つぎつぎ せいかい！🔥 かっこいい！', '🔥 だいこうちょう！ とまらないね！',
  ];
  const LUCKY_PROBLEM_MESSAGE = '✨ラッキーもんだい！せいかいで ほしが 2こ もらえるよ！✨';
  const Icons = root.PM.Icons || {};

  /* STICKER_POOL/ANIMAL_POOL entries are plain strings dropped straight
     into innerHTML, so a hand-drawn SVG icon (see icons.js) slots in
     next to the emoji ones with no extra plumbing. */
  const STICKER_POOL = [
    '🦋', '🌸', '🍭', '🎈', '🦄', '🍬', '🧁', '🌟', '💫', '🎀', '🐬', '🌈', '🍓', '🐣',
    Icons.starSticker, Icons.sunSticker, Icons.sparkleSticker,
  ];
  const CONFETTI_EMOJI = ['🎉', '✨', '💖', '⭐', '🌸', '👑', '🎊'];
  /* Two of these (never the same one twice at once) are shown as a
     counting aid next to the active column — e.g. 7 cows + 3 monkeys
     for "7 + 3" — so the child can visually count before calculating. */
  const ANIMAL_POOL = [
    '🐮', '🐒', '🐰', '🐶', '🐱', '🐭', '🐹', '🐷', '🐸', '🦁', '🐯', '🐻', '🐼', '🐨', '🦊', '🐔', '🐧', '🐤',
    Icons.monkeyAnimal, Icons.penguinAnimal, Icons.bunnyAnimal,
  ];

  /* A small mischievous familiar shown next to the mascot's HP bar
     during battle — see icons.js. Not tied to any one princess, so it
     doesn't touch the "no Disney artwork" princess avatar/mascot fields. */
  const COMPANION_SPRITE = Icons.companionSprite;

  /* Story mode: まいひめ was captured by monsters and uses her math
     "spells" (each 10-problem set) to fight her way free — she is
     always the active hero, never a passive character waiting to be
     rescued. All monsters/items are original, generic fantasy-folklore
     creatures (oni, wolves, dragons, ghosts...), not tied to any
     copyrighted franchise. */
  /* `icon` (hand-drawn SVG, see icons.js) is shown in the big battle
     display; `emoji` stays a plain character since it's also embedded
     inline inside narrative sentences (MONSTER_APPEAR_MESSAGE etc.),
     which are rendered via textContent and can't hold markup. */
  const MONSTERS = [
    { name: 'こわもての おおかみ',   emoji: '🐺' },
    { name: 'ものかげの こうもり',   emoji: '🦇' },
    { name: 'どろんこの りゅうのこ', emoji: '🐉' },
    { name: 'とげとげの さそり',     emoji: '🦂' },
    { name: 'くらやみの くも',       emoji: '🕷️' },
    { name: 'わらう おばけ',         emoji: '👻' },
    { name: 'おおきな おに',         emoji: '👹' },
    { name: 'いばりんぼうの とかげ', emoji: '🦎' },
    { name: 'いたずらな こおに',     emoji: '😈', icon: Icons.impMonster },
    { name: 'ぷるぷるの スライム',   emoji: '🟢', icon: Icons.slimeMonster },
    { name: 'あかんべえの おばけ',   emoji: '👻', icon: Icons.ghostMonster },
  ];
  const MONSTER_APPEAR_MESSAGE = (monster) => `${monster.emoji} ${monster.name}が あらわれた！まほうで たたかおう！`;
  const MONSTER_DEFEATED_MESSAGE = (monster) => `${monster.emoji} ${monster.name}は にげていったよ！やったね！`;

  const ITEMS = [
    { name: 'ひかりの つえ',   emoji: '🪄' },
    { name: 'まもりの たて',   emoji: '🛡️' },
    { name: 'かぜの くつ',     emoji: '👢' },
    { name: 'ゆうきの ぼうし', emoji: '🧢' },
    { name: 'ほしの ゆびわ',   emoji: '💍' },
    { name: 'まほうの がいとう', emoji: '🧥' },
    { name: 'たからの かぎ',   emoji: '🗝️' },
    { name: 'いのちの くすり', emoji: '🧪' },
    { name: 'いたずらの まほうづえ', emoji: '🪄', icon: Icons.wandItem },
    { name: 'くすくす ポーション', emoji: '🧪', icon: Icons.potionItem },
  ];

  /* Awarded one at a time, in order, on every defeated monster — once
     all are collected the escape-journey "album" is complete. */
  const PUZZLE_PIECES = ['🌳', '🏰', '🌙', '⭐', '🦋', '🌸', '🍄', '🌈', '🔑'];

  /* Achievement badges: each `check` is a pure function of state, so
     "earned" is always derived rather than stored — no separate flags to
     keep in sync. maxUnlockedLevelByOp/bestStreak are introduced by the
     operation-select and timer/streak features below. */
  const BADGES = [
    { id: 'first-star',    name: 'はじめの いっぽ',   emoji: '⭐', desc: 'はじめて ほしを あつめた',        check: s => s.totalStars >= 1 },
    { id: 'stars-50',      name: 'ほしめいじん',      emoji: '🌟', desc: 'ほしを 50こ あつめた',           check: s => s.totalStars >= 50 },
    { id: 'stars-200',     name: 'ほしはかせ',        emoji: '💫', desc: 'ほしを 200こ あつめた',          check: s => s.totalStars >= 200 },
    { id: 'streak-8',      name: 'れんぞく めいじん',  emoji: '🔥', desc: '8もん れんぞく せいかい',        check: s => (s.bestStreak || 0) >= 8 },
    { id: 'add-master',    name: 'たしざん たつじん',  emoji: '➕', desc: 'たしざん さいこうレベルクリア',  check: s => (s.maxUnlockedLevelByOp && s.maxUnlockedLevelByOp.add || 1) >= LEVELS.length },
    { id: 'sub-master',    name: 'ひきざん たつじん',  emoji: '➖', desc: 'ひきざん さいこうレベルクリア',  check: s => (s.maxUnlockedLevelByOp && s.maxUnlockedLevelByOp.sub || 1) >= LEVELS.length },
    { id: 'monster-10',    name: 'ゆうしゃ',          emoji: '🗡️', desc: 'ようかいを 10たい たおした',     check: s => (s.monstersDefeated || 0) >= 10 },
    { id: 'album-complete', name: 'コレクター',        emoji: '🏆', desc: 'ぼうけんアルバムを かんせい',    check: s => isAlbumComplete(s) },
  ];

  function defaultState() {
    return {
      totalStars: 0,
      selectedPrincessId: PRINCESSES[0].id,
      selectedOperation: 'add',
      selectedLevelByOp: { add: 1, sub: 1 },
      maxUnlockedLevelByOp: { add: 1, sub: 1 },
      soundOn: true,
      timerEnabled: true,
      monstersDefeated: 0,
      itemsCollected: [],
      puzzlePiecesCollected: 0,
      bestStreak: 0,
    };
  }

  function isPrincessUnlocked(state, princess) {
    return state.totalStars >= princess.unlockStars;
  }

  function getSelectedPrincess(state) {
    return PRINCESSES.find(p => p.id === state.selectedPrincessId) || PRINCESSES[0];
  }

  function getCurrentMonster(state) {
    return MONSTERS[state.monstersDefeated % MONSTERS.length];
  }

  function isAlbumComplete(state) {
    return state.puzzlePiecesCollected >= PUZZLE_PIECES.length;
  }

  function getEarnedBadgeIds(state) {
    return BADGES.filter(b => b.check(state)).map(b => b.id);
  }

  root.PM.Data = {
    PRINCESSES,
    LEVELS,
    OPERATIONS,
    BADGES,
    PROBLEMS_PER_SET,
    PASS_THRESHOLD,
    CELEBRATE_STARS_THRESHOLD,
    STREAK_MILESTONES,
    STREAK_BONUS_STARS,
    PRAISE_MESSAGES,
    COLUMN_PRAISE,
    ENCOURAGE_MESSAGES,
    STARTER_MESSAGES,
    STREAK_MESSAGES,
    LUCKY_PROBLEM_MESSAGE,
    STICKER_POOL,
    CONFETTI_EMOJI,
    ANIMAL_POOL,
    COMPANION_SPRITE,
    MONSTERS,
    MONSTER_APPEAR_MESSAGE,
    MONSTER_DEFEATED_MESSAGE,
    ITEMS,
    PUZZLE_PIECES,
    getCurrentMonster,
    isAlbumComplete,
    getEarnedBadgeIds,
    defaultState,
    isPrincessUnlocked,
    getSelectedPrincess,
  };
})(typeof window !== 'undefined' ? window : globalThis);
