/* Firebase Web App config for this project. This is NOT a secret — the
   Firebase web config identifies which project to talk to, it does not
   grant access by itself. Actual data access is restricted by the
   Firestore Security Rules set on the project (see README.md). It is
   safe to commit this file once filled in.

   How to fill this in:
   1. https://console.firebase.google.com/ → create a project.
   2. In the project, click the "</>" (web app) icon to register a web
      app — no hosting needed, just registering is enough.
   3. Firebase shows a `firebaseConfig` object. Copy each value below.
   See README.md for the full setup guide (Firestore + Anonymous auth). */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  root.PM.firebaseConfig = {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.appspot.com',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  };
})(typeof window !== 'undefined' ? window : globalThis);
