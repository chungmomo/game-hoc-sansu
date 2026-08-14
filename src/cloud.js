/* Firebase-backed persistence: one anonymous identity per browser/device,
   holding any number of child "profiles" (each profile = one save-state,
   same shape as PM.Data.defaultState()). Requires the Firebase compat SDK
   (firebase-app/auth/firestore-compat.js) and PM.firebaseConfig to be
   loaded first — see index.html load order. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  const PROFILES_SUBCOLLECTION = 'profiles';

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
      return uid;
    })();

    return readyPromise;
  }

  function profilesRef() {
    return db.collection('users').doc(uid).collection(PROFILES_SUBCOLLECTION);
  }

  async function listProfiles() {
    const snap = await profilesRef().orderBy('createdAt', 'asc').get();
    return snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
  }

  async function createProfile(name, avatarEmoji, defaultState) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = Object.assign({}, defaultState, {
      name,
      avatarEmoji,
      createdAt: now,
      updatedAt: now,
    });
    const ref = await profilesRef().add(doc);
    return ref.id;
  }

  async function deleteProfile(id) {
    await profilesRef().doc(id).delete();
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

  root.PM.Cloud = {
    init,
    listProfiles,
    createProfile,
    deleteProfile,
    loadProfileState,
    saveProfileState,
  };
})(typeof window !== 'undefined' ? window : globalThis);
