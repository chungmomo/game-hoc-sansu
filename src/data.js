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
    /* isWarrior: her avatar isn't a fixed emoji — renderWarriorAvatar()
       in app.js draws Icons.warriorPrincessBody and layers whichever
       collected items (state.itemsCollected, see WARRIOR_ITEM_SLOTS
       below) she has onto fixed body positions, paper-doll style. She
       still needs a plain emoji for contexts that can't render that
       (browser tab icon, plain-text messages), hence avatar/mascot
       stay set to something reasonable as a fallback. */
    { id: 'warrior', name: 'せんしの おひめさま',  avatar: '⚔️', mascot: '🗡️', unlockStars: 60, isWarrior: true,
      rewardEmoji: ['⚔️', '🛡️', '🔥', '💪', '⭐', '👑'] },
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

  /* 100 add/sub levels: 4 digit-count tiers (1-4 digits) of 25 sub-levels
     each, id = (digits-1)*25 + subLevel, so id 1 is "1-digit, sub-level
     1" and id 100 is "4-digit, sub-level 25". Within a tier, difficulty
     no longer comes from a handful of hand-written levels — it ramps
     smoothly via carry/borrow chance (see math.js's chanceForSubLevel,
     which must stay in sync with LEVELS_PER_GROUP below). desc always
     talks about "くりあがり／くりさがり" generically since add and sub
     share this same list (only the generator differs); tierForSubLevel
     buckets the 25 sub-levels into 5 named/emoji bands purely for
     flavor on the level-stepper display. */
  const LEVELS_PER_GROUP = 25;
  const DIGIT_TIERS = [
    { digits: 1, label: '1けた' },
    { digits: 2, label: '2けた' },
    { digits: 3, label: '3けた' },
    { digits: 4, label: '4けた' },
  ];

  function tierForSubLevel(subLevel) {
    if (subLevel <= 5) return { name: 'にゅうもん', emoji: '🔰' };
    if (subLevel <= 10) return { name: 'やさしい', emoji: '🌸' };
    if (subLevel <= 15) return { name: 'ふつう', emoji: '🌟' };
    if (subLevel <= 20) return { name: 'むずかしい', emoji: '🔥' };
    return { name: 'たつじん', emoji: '👑' };
  }

  function difficultyDesc(subLevel) {
    if (subLevel <= 5) return 'くりあがり／くりさがり なし';
    if (subLevel <= 20) return 'くりあがり／くりさがり ときどき';
    return 'くりあがり／くりさがり おおい';
  }

  const LEVELS = [];
  DIGIT_TIERS.forEach((tier, tierIndex) => {
    for (let subLevel = 1; subLevel <= LEVELS_PER_GROUP; subLevel++) {
      const band = tierForSubLevel(subLevel);
      LEVELS.push({
        id: tierIndex * LEVELS_PER_GROUP + subLevel,
        digits: tier.digits,
        subLevel,
        name: `${band.name} ${subLevel}`,
        emoji: band.emoji,
        desc: `${tier.label}どうし・${difficultyDesc(subLevel)}`,
      });
    }
  });

  /* Highest level id reachable through normal progression — just
     LEVELS.length now that there's no separate warm-up tier sitting
     outside the numbering. */
  const MAX_LEVEL_ID = Math.max(...LEVELS.map(lv => lv.id));

  /* Groups LEVELS by operand digit count, for the digit-count shortcut
     row on the home screen — purely a navigation convenience, it
     doesn't change how levels unlock. */
  const DIGIT_GROUPS = DIGIT_TIERS.map(tier => ({
    digits: tier.digits,
    label: tier.label,
    levelIds: LEVELS.filter(lv => lv.digits === tier.digits).map(lv => lv.id),
  }));

  /* Same digit-count level tiers apply to both add and sub — only the
     underlying number generator (carry vs. borrow) differs, so LEVELS is
     shared between them. Multiplication/division practice single facts
     (times tables) instead, a different difficulty dimension entirely,
     so they get their own short level lists — see MUL_LEVELS/DIV_LEVELS
     and getLevelsForOp() below. */
  const OPERATIONS = [
    { id: 'add', name: 'たしざん', emoji: '➕' },
    { id: 'sub', name: 'ひきざん', emoji: '➖' },
    { id: 'mul', name: 'かけざん', emoji: '✖️' },
    { id: 'div', name: 'わりざん', emoji: '➗' },
  ];

  const MUL_LEVELS = [
    { id: 1, name: 'やさしい',   emoji: '🌸', desc: '2〜5の だん' },
    { id: 2, name: 'ふつう',     emoji: '🌟', desc: '6・7の だん' },
    { id: 3, name: 'むずかしい', emoji: '🔥', desc: '8・9の だん・ぜんぶ' },
  ];
  const DIV_LEVELS = [
    { id: 1, name: 'やさしい',   emoji: '🌸', desc: '2〜5で わる' },
    { id: 2, name: 'ふつう',     emoji: '🌟', desc: '6・7で わる' },
    { id: 3, name: 'むずかしい', emoji: '🔥', desc: '8・9で わる・ぜんぶ' },
  ];

  function getLevelsForOp(operationId) {
    if (operationId === 'mul') return MUL_LEVELS;
    if (operationId === 'div') return DIV_LEVELS;
    return LEVELS;
  }

  /* Mirrors MAX_LEVEL_ID for whichever operation is active — MUL_LEVELS/
     DIV_LEVELS have no id-0 warm-up gap, so their own length already is
     the highest id. */
  function getMaxLevelIdForOp(operationId) {
    if (operationId === 'mul') return MUL_LEVELS.length;
    if (operationId === 'div') return DIV_LEVELS.length;
    return MAX_LEVEL_ID;
  }

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

  /* STICKER_POOL entries are plain strings dropped straight into
     innerHTML, so a hand-drawn SVG icon (see icons.js) slots in next
     to the emoji ones with no extra plumbing. */
  const STICKER_POOL = [
    '🦋', '🌸', '🍭', '🎈', '🦄', '🍬', '🧁', '🌟', '💫', '🎀', '🐬', '🌈', '🍓', '🐣',
    '🍩', '🍪', '🍦', '🧸', '🎁', '🪄', '🔮', '🌺', '🍒', '🍇',
    Icons.starSticker, Icons.sunSticker, Icons.sparkleSticker,
  ];
  const CONFETTI_EMOJI = ['🎉', '✨', '💖', '⭐', '🌸', '👑', '🎊'];

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

  /* Maps each ITEMS index to a fixed spot on the warrior princess's
     body (renderWarriorAvatar() in app.js) — the two wand entries (0,
     8) and two potion entries (7, 9) are flavor variants of the same
     equipment, so they share a slot; whichever one was collected first
     is what displays there. left/top are percentages against
     Icons.warriorPrincessBody's own 100x140 viewBox, so they track the
     art directly instead of needing separate upkeep. */
  const WARRIOR_ITEM_SLOTS = {
    0: { slot: 'weapon', left: 82, top: 51 },
    1: { slot: 'shield', left: 18, top: 51 },
    2: { slot: 'feet', left: 50, top: 91 },
    3: { slot: 'head', left: 50, top: 4 },
    4: { slot: 'ring', left: 18, top: 60 },
    5: { slot: 'back', left: 50, top: 40 },
    6: { slot: 'waistLeft', left: 38, top: 65 },
    7: { slot: 'waistRight', left: 62, top: 65 },
    8: { slot: 'weapon', left: 82, top: 51 },
    9: { slot: 'waistRight', left: 62, top: 65 },
  };

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
    { id: 'add-master',    name: 'たしざん たつじん',  emoji: '➕', desc: 'たしざん さいこうレベルクリア',  check: s => (s.maxUnlockedLevelByOp && s.maxUnlockedLevelByOp.add || 1) >= MAX_LEVEL_ID },
    { id: 'sub-master',    name: 'ひきざん たつじん',  emoji: '➖', desc: 'ひきざん さいこうレベルクリア',  check: s => (s.maxUnlockedLevelByOp && s.maxUnlockedLevelByOp.sub || 1) >= MAX_LEVEL_ID },
    { id: 'mul-master',    name: 'かけざん たつじん',  emoji: '✖️', desc: 'かけざん さいこうレベルクリア',  check: s => (s.maxUnlockedLevelByOp && s.maxUnlockedLevelByOp.mul || 1) >= MUL_LEVELS.length },
    { id: 'div-master',    name: 'わりざん たつじん',  emoji: '➗', desc: 'わりざん さいこうレベルクリア',  check: s => (s.maxUnlockedLevelByOp && s.maxUnlockedLevelByOp.div || 1) >= DIV_LEVELS.length },
    { id: 'monster-10',    name: 'ゆうしゃ',          emoji: '🗡️', desc: 'ようかいを 10たい たおした',     check: s => (s.monstersDefeated || 0) >= 10 },
    { id: 'album-complete', name: 'コレクター',        emoji: '🏆', desc: 'ぼうけんアルバムを かんせい',    check: s => isAlbumComplete(s) },
  ];

  function defaultState() {
    return {
      totalStars: 0,
      selectedPrincessId: PRINCESSES[0].id,
      selectedOperation: 'add',
      selectedLevelByOp: { add: 1, sub: 1, mul: 1, div: 1 },
      maxUnlockedLevelByOp: { add: 1, sub: 1, mul: 1, div: 1 },
      soundOn: true,
      timerEnabled: true,
      monstersDefeated: 0,
      itemsCollected: [],
      puzzlePiecesCollected: 0,
      bestStreak: 0,
      // Parent/child-authored problems (see the "じぶんで もんだいを
      // つくろう" admin screen), scoped per operation like level
      // progress above. Each entry is a plain { a, b }.
      customProblems: { add: [], sub: [] },
      // Which collected item the child has chosen to show in each of the
      // warrior princess's equipment slots — freely chosen, not limited
      // to that slot's original item mapping — see openWarriorItemPicker()
      // in app.js. Keyed by slot name, value is an ITEMS index, or -1
      // (WARRIOR_SLOT_EMPTY) if explicitly cleared. A slot with no entry
      // here falls back to whichever collected item was originally
      // mapped to it (WARRIOR_ITEM_SLOTS).
      warriorEquipped: {},
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
    MAX_LEVEL_ID,
    DIGIT_GROUPS,
    MUL_LEVELS,
    DIV_LEVELS,
    getLevelsForOp,
    getMaxLevelIdForOp,
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
    COMPANION_SPRITE,
    MONSTERS,
    MONSTER_APPEAR_MESSAGE,
    MONSTER_DEFEATED_MESSAGE,
    ITEMS,
    WARRIOR_ITEM_SLOTS,
    PUZZLE_PIECES,
    getCurrentMonster,
    isAlbumComplete,
    getEarnedBadgeIds,
    defaultState,
    isPrincessUnlocked,
    getSelectedPrincess,
  };
})(typeof window !== 'undefined' ? window : globalThis);
