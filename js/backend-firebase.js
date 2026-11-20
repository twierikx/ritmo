// Firebase backend: Google sign-in and Cloud Firestore (with an offline cache for the gym).
// Data lives under ritmo/{uid}: the profile, runs/{runId} and runs/{runId}/days/{yyyy-mm-dd}.
import { firebaseConfig } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, onSnapshot, setDoc, getDocs,
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (err) {
  console.warn('[ritmo] offline cache niet beschikbaar', err);
  db = getFirestore(app);
}

const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';
const toUser = (u) => u && { uid: u.uid, name: firstName(u.displayName) || (u.email || '').split('@')[0], email: u.email || '', photo: u.photoURL || '' };
const userRef = (uid) => doc(db, 'ritmo', uid);
const runsCol = (uid) => collection(db, 'ritmo', uid, 'runs');
const runRef = (uid, runId) => doc(db, 'ritmo', uid, 'runs', runId);
const daysCol = (uid, runId) => collection(db, 'ritmo', uid, 'runs', runId, 'days');

export const backend = {
  demo: false,

  onAuth(cb) {
    return onAuthStateChanged(auth, (u) => cb(toUser(u)));
  },
  async signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  },
  signOut() {
    return fbSignOut(auth);
  },

  watchProfile(uid, cb, onError) {
    // Metadata changes too: a first start offline only learns "no profile yet" once the server answers.
    return onSnapshot(userRef(uid), { includeMetadataChanges: true }, (s) => {
      // Missing from the offline cache only means not loaded yet: wait for the server,
      // so a new phone never starts a fresh schedule over an existing one.
      if (!s.exists() && s.metadata.fromCache) return;
      cb(s.exists() ? s.data() : null);
    }, (err) => { console.error('[ritmo] profiel', err); if (onError) onError(err); });
  },
  saveProfile(uid, patch) {
    return setDoc(userRef(uid), patch, { merge: true });
  },

  async createRun(uid, data) {
    const ref = doc(runsCol(uid));
    // Not awaited: offline the write waits in the cache until there is a connection.
    setDoc(ref, data).catch((err) => console.error('[ritmo] nieuw schema', err));
    return ref.id;
  },
  async listRuns(uid) {
    const s = await getDocs(runsCol(uid));
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  watchRun(uid, runId, cb, onError) {
    return onSnapshot(runRef(uid, runId), (s) => {
      if (!s.exists() && s.metadata.fromCache) return;
      cb(s.exists() ? { id: s.id, ...s.data() } : null);
    }, (err) => { console.error('[ritmo] schema', err); if (onError) onError(err); });
  },
  saveRun(uid, runId, patch) {
    return setDoc(runRef(uid, runId), patch, { merge: true });
  },

  watchDays(uid, runId, cb, onError) {
    return onSnapshot(daysCol(uid, runId), (snap) => {
      cb(snap.docChanges().map((c) => ({ type: c.type, id: c.doc.id, data: c.doc.data() })));
    }, (err) => { console.error('[ritmo] dagen', err); if (onError) onError(err); });
  },
  saveDay(uid, runId, date, patch) {
    return setDoc(doc(daysCol(uid, runId), date), patch, { merge: true });
  },
};
