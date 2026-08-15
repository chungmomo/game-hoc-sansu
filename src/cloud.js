/* Firebase-backed persistence: each child "profile" (same shape as
   PM.Data.defaultState()) lives in a top-level `profiles` collection,
   keyed by a short human-typeable code (e.g. "A7K2QX"). Anonymous auth
   still gates access (Firestore rules require request.auth != null), but
   the *code itself* — not the browser's anonymous uid — is what selects a
   profile, so typing the same code into the app on a different device
   resumes the same profile there. See README.md "Thiết lập Firebase" for
   the Firestore rules this requires and the security tradeoff it implies.

   Requires the Firebase compat SDK (firebase-app/auth/firestore-compat.js)
   and PM.firebaseConfig to be loaded first — see index.html load order. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  const PROFILES_COLLECTION = 'profiles';
  const LEGACY_PROFILES_SUBCOLLECTION = 'profiles'; // old path: users/{uid}/profiles
  const LINKED_CODES_KEY = 'pm_linked_profile_codes';
  const MIGRATED_FLAG_KEY = 'pm_migrated_to_codes_v1';
  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — easy to read aloud
  const CODE_LENGTH = 6;

  let app = null;
  let db = null;
  let uid = null;
  let readyPromise = null;

  function init() {
    if (readyPromise) return readyPromise;

    readyPromise = (async () => {
      app = firebase.initializeApp(root.PM.firebaseConfig);
      db = firebase.firestore();

      try {
        await db.enablePersistence({ synchronizeTabs: true });
      } catch (e) {
        /* Offline cache unavailable (old browser, or unsupported) — app
           still works online, it just won't survive a lost connection. */
      }

      const cred = await firebase.auth().signInAnonymously();
      uid = cred.user.uid;
      await migrateLegacyProfiles();
      return uid;
    })();

    return readyPromise;
  }

  function profilesRef() {
    return db.collection(PROFILES_COLLECTION);
  }

  /* ---------------- local "which codes has this device seen" cache ----
     Firestore alone can't answer "list every profile this device knows
     about" once profiles aren't nested under the device's own uid, so we
     keep a small local index of codes (own creations + codes typed in via
     "continue with a code"). It's purely a convenience list — the profile
     data itself always lives in, and is loaded fresh from, Firestore. */
  function readLinkedCodes() {
    try {
      return JSON.parse(localStorage.getItem(LINKED_CODES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function addLinkedCode(code) {
    const codes = readLinkedCodes();
    if (!codes.includes(code)) {
      codes.push(code);
      localStorage.setItem(LINKED_CODES_KEY, JSON.stringify(codes));
    }
  }

  function removeLinkedCode(code) {
    const codes = readLinkedCodes().filter(c => c !== code);
    localStorage.setItem(LINKED_CODES_KEY, JSON.stringify(codes));
  }

  function randomCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }

  async function generateUnusedCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomCode();
      const snap = await profilesRef().doc(code).get();
      if (!snap.exists) return code;
    }
    throw new Error('Could not generate a free profile code');
  }

  async function listProfiles() {
    const [ownedSnap, linkedCodes] = await Promise.all([
      profilesRef().where('ownerUid', '==', uid).get(),
      Promise.resolve(readLinkedCodes()),
    ]);

    const byId = new Map();
    ownedSnap.docs.forEach(doc => byId.set(doc.id, Object.assign({ id: doc.id }, doc.data())));

    const missingCodes = linkedCodes.filter(code => !byId.has(code));
    const fetched = await Promise.all(missingCodes.map(code => profilesRef().doc(code).get()));
    fetched.forEach(snap => {
      if (snap.exists) byId.set(snap.id, Object.assign({ id: snap.id }, snap.data()));
    });

    return Array.from(byId.values()).sort((a, b) => {
      const at = a.createdAt ? a.createdAt.toMillis() : 0;
      const bt = b.createdAt ? b.createdAt.toMillis() : 0;
      return at - bt;
    });
  }

  async function createProfile(name, avatarEmoji, defaultState) {
    const code = await generateUnusedCode();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = Object.assign({}, defaultState, {
      name,
      avatarEmoji,
      ownerUid: uid,
      createdAt: now,
      updatedAt: now,
    });
    await profilesRef().doc(code).set(doc);
    addLinkedCode(code);
    return code;
  }

  /* Loads a profile by a code typed in on a (possibly different) device
     and remembers it locally so it shows up in listProfiles() from now
     on. Returns null if no profile has that code. */
  async function linkProfileByCode(rawCode) {
    const code = rawCode.trim().toUpperCase();
    const snap = await profilesRef().doc(code).get();
    if (!snap.exists) return null;
    addLinkedCode(code);
    return Object.assign({ id: snap.id }, snap.data());
  }

  async function deleteProfile(id) {
    await profilesRef().doc(id).delete();
    removeLinkedCode(id);
  }

  async function loadProfileState(id, defaultState) {
    const snap = await profilesRef().doc(id).get();
    if (!snap.exists) return Object.assign({}, defaultState);
    return Object.assign({}, defaultState, snap.data());
  }

  function saveProfileState(id, state) {
    return profilesRef().doc(id).set(Object.assign({}, state, {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }), { merge: true });
  }

  /* One-time-per-device: profiles created before the code-based scheme
     lived at users/{uid}/profiles/{autoId}. Copy any such profiles for
     this device's uid into the new top-level collection (fresh code,
     same data) so existing progress isn't stranded. Safe to run more
     than once — it no-ops once MIGRATED_FLAG_KEY is set, and it never
     deletes the legacy docs. */
  async function migrateLegacyProfiles() {
    if (localStorage.getItem(MIGRATED_FLAG_KEY)) return;

    try {
      const legacySnap = await db.collection('users').doc(uid)
        .collection(LEGACY_PROFILES_SUBCOLLECTION).get();

      for (const doc of legacySnap.docs) {
        const code = await generateUnusedCode();
        const data = Object.assign({}, doc.data(), { ownerUid: uid });
        await profilesRef().doc(code).set(data);
        addLinkedCode(code);
      }
    } catch (e) {
      /* If this fails (offline, permissions not updated yet, etc.) we'll
         just retry next load — don't block the app on it. */
      return;
    }

    localStorage.setItem(MIGRATED_FLAG_KEY, '1');
  }

  root.PM.Cloud = {
    init,
    listProfiles,
    createProfile,
    linkProfileByCode,
    deleteProfile,
    loadProfileState,
    saveProfileState,
  };
})(typeof window !== 'undefined' ? window : globalThis);
