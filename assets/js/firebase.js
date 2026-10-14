// Firebase client for the CTF Lab: accounts, flag submission, progress, and the
// scoreboard. Loaded as a module on every page; it also fills the account area in
// the shared header (#auth-slot, rendered by layout.js).
//
// The browser never sees a flag or a flag hash. A submission is written to
// Firestore, and firestore.rules hash it server-side and compare it with
// flagHashes/{id}, accepting the solve only on a match.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  increment
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { CHALLENGES } from './challenge-data.js';

// Local testing against the Firebase emulators (see README.md, "Testing"): only on
// localhost, and only after running localStorage.setItem('cys401-emulator', '1').
const emulate = (() => {
  try {
    return location.hostname === 'localhost' && localStorage.getItem('cys401-emulator') === '1';
  } catch (e) {
    return false;
  }
})();
const config = emulate ? { apiKey: 'demo-key', projectId: 'demo-cys401', authDomain: 'localhost' } : firebaseConfig;

export const configured = Boolean(config.apiKey && config.projectId);

const app = configured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = !app ? null : emulate ? initializeFirestore(app, { experimentalForceLongPolling: true }) : getFirestore(app);
if (emulate) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// ── Session state ────────────────────────────────────────────────────────────
let state = { ready: !configured, user: null, profile: null };
let signingUp = false;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(state));
  renderAuthSlot();
}

// Calls fn now (if auth state is known) and on every change. Returns an unsubscribe.
export function onSession(fn) {
  listeners.add(fn);
  if (state.ready) fn(state);
  return () => listeners.delete(fn);
}

// Resolves once Firebase has restored (or ruled out) a signed-in session.
export function sessionReady() {
  return new Promise((resolve) => {
    const off = onSession((s) => {
      if (s.ready) {
        resolve(s);
        setTimeout(() => off(), 0);
      }
    });
  });
}

if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (signingUp) return; // signUp() publishes the session once the profile exists
    let profile = null;
    if (user) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        profile = snap.exists() ? snap.data() : null;
      } catch (e) {
        profile = null;
      }
    }
    state = { ready: true, user, profile };
    emit();
  });
}

// ── Accounts ─────────────────────────────────────────────────────────────────
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists. Log in instead.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/weak-password': 'Choose a password of at least 8 characters.',
  'auth/password-does-not-meet-requirements': 'That password does not meet the password policy.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. This account is temporarily locked — try again later or reset your password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this project yet.'
};

export function friendlyError(err) {
  return (err && AUTH_ERRORS[err.code]) || (err && err.message) || 'Something went wrong. Try again.';
}

function requireConfigured() {
  if (!configured) throw new Error('Accounts are not connected yet: add the Firebase config in assets/js/firebase-config.js.');
}

export async function signUp(username, email, password) {
  requireConfigured();
  if (!USERNAME_RE.test(username)) {
    throw new Error('Usernames are 3–20 characters: letters, numbers, and underscores.');
  }
  if (password.length < 8) throw new Error(AUTH_ERRORS['auth/weak-password']);

  const nameRef = doc(db, 'usernames', username.toLowerCase());
  if ((await getDoc(nameRef)).exists()) throw new Error('That username is taken.');

  signingUp = true;
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    signingUp = false;
    throw e;
  }
  const uid = cred.user.uid;
  try {
    // One atomic batch: reserve the name, create the profile and the scoreboard row.
    await profileBatch(uid, username, nameRef).commit();
    await updateProfile(cred.user, { displayName: username });
  } catch (e) {
    // Most likely the name was claimed between the check and the write.
    // Roll the auth account back so the email can be used again.
    await cred.user.delete().catch(() => {});
    signingUp = false;
    throw new Error(e.code === 'permission-denied' ? 'That username is taken.' : friendlyError(e));
  }
  const snap = await getDoc(doc(db, 'users', uid));
  signingUp = false;
  state = { ready: true, user: cred.user, profile: snap.data() };
  emit();
  return cred.user;
}

// For a login that has no profile yet (e.g. a user added in the Firebase console):
// reserve a username and create the profile and scoreboard row.
export async function completeProfile(username) {
  requireConfigured();
  const user = state.user;
  if (!user) throw new Error('Log in first.');
  if (!USERNAME_RE.test(username)) {
    throw new Error('Usernames are 3–20 characters: letters, numbers, and underscores.');
  }
  const nameRef = doc(db, 'usernames', username.toLowerCase());
  if ((await getDoc(nameRef)).exists()) throw new Error('That username is taken.');
  try {
    await profileBatch(user.uid, username, nameRef).commit();
  } catch (e) {
    throw new Error(e.code === 'permission-denied' ? 'That username is taken.' : friendlyError(e));
  }
  await updateProfile(user, { displayName: username }).catch(() => {});
  const snap = await getDoc(doc(db, 'users', user.uid));
  state = { ready: true, user, profile: snap.data() };
  emit();
}

function profileBatch(uid, username, nameRef) {
  const batch = writeBatch(db);
  batch.set(nameRef, { uid });
  batch.set(doc(db, 'users', uid), {
    username,
    role: 'user',
    createdAt: serverTimestamp(),
    lastAttemptAt: null
  });
  batch.set(doc(db, 'scores', uid), {
    username,
    points: 0,
    solved: 0,
    lastChallenge: null,
    lastSolveAt: null
  });
  return batch;
}

export async function logIn(email, password) {
  requireConfigured();
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}

export async function resetPassword(email) {
  requireConfigured();
  await sendPasswordResetEmail(auth, email);
}

export async function logOut() {
  if (auth) await signOut(auth);
}

// ── Flags ────────────────────────────────────────────────────────────────────
export function normalizeFlag(value) {
  return (value || '').trim().replace(/\s+/g, '').toLowerCase();
}

// Returns 'correct' | 'incorrect' | 'throttled' | 'solved'.
export async function submitFlag(challengeId, rawFlag) {
  requireConfigured();
  const user = state.user;
  if (!user || !state.profile) throw new Error('Log in to submit flags.');
  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) throw new Error('Unknown challenge.');

  const flag = normalizeFlag(rawFlag);
  const uid = user.uid;
  const userRef = doc(db, 'users', uid);
  const attemptRef = () => doc(collection(db, 'attempts'));
  const attempt = (correct) => ({
    uid,
    username: state.profile.username,
    challengeId,
    flag,
    correct,
    at: serverTimestamp()
  });

  // Try to record a solve. The rules reject this whole batch unless the flag's
  // hash matches, the challenge is unsolved, and the 5-second throttle allows it.
  const solve = writeBatch(db);
  solve.update(userRef, { lastAttemptAt: serverTimestamp() });
  solve.set(attemptRef(), attempt(true));
  solve.set(doc(db, 'solves', uid + '_' + challengeId), {
    uid,
    challengeId,
    flag,
    points: challenge.points,
    solvedAt: serverTimestamp()
  });
  solve.update(doc(db, 'scores', uid), {
    points: increment(challenge.points),
    solved: increment(1),
    lastChallenge: challengeId,
    lastSolveAt: serverTimestamp()
  });
  try {
    await solve.commit();
    return 'correct';
  } catch (e) {
    if (e.code !== 'permission-denied') throw e;
  }

  // Not accepted. Log a failed attempt; the rules only allow correct:false when
  // the flag really is wrong, so if this is also denied, the throttle (or an
  // existing solve) is the reason.
  const miss = writeBatch(db);
  miss.update(userRef, { lastAttemptAt: serverTimestamp() });
  miss.set(attemptRef(), attempt(false));
  try {
    await miss.commit();
    return 'incorrect';
  } catch (e) {
    if (e.code !== 'permission-denied') throw e;
    const solved = await getDocFromServer(doc(db, 'solves', uid + '_' + challengeId)).catch(() => null);
    return solved && solved.exists() ? 'solved' : 'throttled';
  }
}

export async function logHint(challengeId) {
  const user = state.user;
  if (!configured || !user) return;
  // Create-only in the rules, so a repeat open is simply rejected.
  await setDoc(doc(db, 'hints', user.uid + '_' + challengeId), {
    uid: user.uid,
    challengeId,
    at: serverTimestamp()
  }).catch(() => {});
}

// ── Progress and scoreboard ──────────────────────────────────────────────────
// Read from the server, and skip documents with pending writes: the SDK overlays
// writes the rules have not ruled on yet, and a rejected solve must never count.
export async function mySolves() {
  if (!configured || !state.user) return [];
  const snap = await getDocsFromServer(query(collection(db, 'solves'), where('uid', '==', state.user.uid)));
  return snap.docs.filter((d) => !d.metadata.hasPendingWrites).map((d) => {
    const data = d.data();
    return { ...data, solvedAt: data.solvedAt ? data.solvedAt.toDate() : null };
  });
}

export async function myHints() {
  if (!configured || !state.user) return [];
  const snap = await getDocsFromServer(query(collection(db, 'hints'), where('uid', '==', state.user.uid)));
  return snap.docs.map((d) => d.data().challengeId);
}

// Ranked by points, then by who reached that score first.
export async function scoreboard() {
  if (!configured) return [];
  const snap = await getDocsFromServer(collection(db, 'scores'));
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      username: data.username,
      points: data.points || 0,
      solved: data.solved || 0,
      lastSolveAt: data.lastSolveAt ? data.lastSolveAt.toDate() : null
    };
  });
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      (a.lastSolveAt ? a.lastSolveAt.getTime() : Infinity) - (b.lastSolveAt ? b.lastSolveAt.getTime() : Infinity) ||
      a.username.localeCompare(b.username)
  );
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

// ── Admin ────────────────────────────────────────────────────────────────────
export function isAdmin() {
  return Boolean(state.profile && state.profile.role === 'admin');
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Writes the catalogue and, for every "ID flag" pair given, the flag's hash.
export async function seedChallenges(flagsById) {
  const batch = writeBatch(db);
  for (const c of CHALLENGES) {
    batch.set(doc(db, 'challenges', c.id), {
      category: c.category,
      title: c.title,
      difficulty: c.difficulty,
      points: c.points
    });
    if (flagsById[c.id]) {
      batch.set(doc(db, 'flagHashes', c.id), { hash: await sha256Hex(normalizeFlag(flagsById[c.id])) });
    }
  }
  await batch.commit();
}

export async function adminData() {
  const [users, attempts, challenges] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'attempts'), orderBy('at', 'desc'), limit(100))),
    getDocs(collection(db, 'challenges'))
  ]);
  return {
    users: users.docs.map((d) => ({ uid: d.id, ...d.data() })),
    attempts: attempts.docs.map((d) => {
      const data = d.data();
      return { ...data, at: data.at ? data.at.toDate() : null };
    }),
    seeded: challenges.docs.map((d) => d.id)
  };
}

export async function setRole(uid, role) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { role });
  await batch.commit();
}

// ── Header account area ──────────────────────────────────────────────────────
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderAuthSlot() {
  const slots = document.querySelectorAll('[data-auth-slot]');
  if (!slots.length) return;
  const btn = 'text-[14px] font-semibold px-4 py-2.5 rounded-btn transition-colors';
  let html;
  if (!state.ready) {
    html = '';
  } else if (state.user && state.profile) {
    html =
      (isAdmin() ? '<a href="admin.html" class="' + btn + ' text-stext hover:text-ptext">Admin</a>' : '') +
      '<a href="dashboard.html" class="' + btn + ' border border-brder2 hover:bg-elevated inline-flex items-center gap-2">' +
      '<span class="w-2 h-2 rounded-full bg-success"></span>' + escapeHtml(state.profile.username) + '</a>' +
      '<button type="button" data-logout class="' + btn + ' text-stext hover:text-ptext">Log out</button>';
  } else if (state.user) {
    html =
      '<a href="auth.html" class="' + btn + ' bg-pred hover:bg-bred text-white">Finish setup</a>' +
      '<button type="button" data-logout class="' + btn + ' text-stext hover:text-ptext">Log out</button>';
  } else {
    html =
      '<a href="auth.html" class="' + btn + ' text-stext hover:text-ptext">Log in</a>' +
      '<a href="auth.html#signup" class="' + btn + ' bg-pred hover:bg-bred text-white">Sign up</a>';
  }
  slots.forEach((slot) => {
    slot.innerHTML = html;
    const out = slot.querySelector('[data-logout]');
    if (out) out.addEventListener('click', () => logOut().then(() => location.assign('index.html')));
  });
}

document.addEventListener('layout:ready', renderAuthSlot);
renderAuthSlot();
