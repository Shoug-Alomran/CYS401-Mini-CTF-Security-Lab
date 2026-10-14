// Security tests for firestore.rules, run against the local Firestore emulator.
//   cd tests && npm install && npm test
// Each test performs the same writes the site does (see assets/js/firebase.js)
// and checks that the rules accept legitimate actions and reject attacks.
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  serverTimestamp,
  increment
} from 'firebase/firestore';

const FLAG = 'CYS401{view_source_first}';
const sha = (s) => createHash('sha256').update(s.trim().replace(/\s+/g, '').toLowerCase()).digest('hex');
const norm = (s) => s.trim().replace(/\s+/g, '').toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cys401',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'challenges/WEB-01'), { category: 'web', title: 'Hidden in Plain Sight', difficulty: 'Easy', points: 50 });
    await setDoc(doc(db, 'challenges/WEB-02'), { category: 'web', title: 'Guest Access', difficulty: 'Easy', points: 75 });
    await setDoc(doc(db, 'flagHashes/WEB-01'), { hash: sha(FLAG) });
    await setDoc(doc(db, 'flagHashes/WEB-02'), { hash: sha('CYS401{cookies_are_not_identity}') });
  });
});

after(async () => {
  await env.cleanup();
});

// ── helpers that mirror firebase.js ─────────────────────────────────────────
function signUpBatch(db, uid, username, role = 'user') {
  const b = writeBatch(db);
  b.set(doc(db, 'usernames', username.toLowerCase()), { uid });
  b.set(doc(db, 'users', uid), { username, role, createdAt: serverTimestamp(), lastAttemptAt: null });
  b.set(doc(db, 'scores', uid), { username, points: 0, solved: 0, lastChallenge: null, lastSolveAt: null });
  return b.commit();
}

async function register(uid, username) {
  await signUpBatch(env.authenticatedContext(uid).firestore(), uid, username);
  return env.authenticatedContext(uid).firestore();
}

function solveBatch(db, uid, username, challengeId, flag, points) {
  const b = writeBatch(db);
  b.update(doc(db, 'users', uid), { lastAttemptAt: serverTimestamp() });
  b.set(doc(collection(db, 'attempts')), { uid, username, challengeId, flag: norm(flag), correct: true, at: serverTimestamp() });
  b.set(doc(db, 'solves', uid + '_' + challengeId), { uid, challengeId, flag: norm(flag), points, solvedAt: serverTimestamp() });
  b.update(doc(db, 'scores', uid), { points: increment(points), solved: increment(1), lastChallenge: challengeId, lastSolveAt: serverTimestamp() });
  return b.commit();
}

function missBatch(db, uid, username, challengeId, flag, correct = false) {
  const b = writeBatch(db);
  b.update(doc(db, 'users', uid), { lastAttemptAt: serverTimestamp() });
  b.set(doc(collection(db, 'attempts')), { uid, username, challengeId, flag: norm(flag), correct, at: serverTimestamp() });
  return b.commit();
}

async function readAsAdmin(path) {
  let data;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore(), path))).data();
  });
  return data;
}

// ── Accounts ────────────────────────────────────────────────────────────────
test('T-A1 sign-up creates profile, username, and scoreboard row', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(signUpBatch(db, 'alice', 'alice'));
  assert.equal((await readAsAdmin('users/alice')).role, 'user');
});

test('T-A2 a user cannot sign up as admin', async () => {
  const db = env.authenticatedContext('mallory').firestore();
  await assertFails(signUpBatch(db, 'mallory', 'mallory', 'admin'));
});

test('T-A3 usernames are unique (case-insensitive)', async () => {
  await register('alice', 'alice');
  const db = env.authenticatedContext('bob').firestore();
  await assertFails(signUpBatch(db, 'bob', 'ALICE'));
});

test('T-A4 a user cannot promote themselves to admin', async () => {
  const db = await register('alice', 'alice');
  await assertFails(updateDoc(doc(db, 'users/alice'), { role: 'admin' }));
});

test('T-A5 users cannot read other profiles', async () => {
  await register('alice', 'alice');
  const bob = await register('bob', 'bob');
  await assertFails(getDoc(doc(bob, 'users/alice')));
});

// ── Flags ───────────────────────────────────────────────────────────────────
test('T-F1 nobody can read flag hashes', async () => {
  const db = await register('alice', 'alice');
  await assertFails(getDoc(doc(db, 'flagHashes/WEB-01')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'flagHashes/WEB-01')));
});

test('T-F2 a correct flag is accepted and scores the challenge points', async () => {
  const db = await register('alice', 'alice');
  await assertSucceeds(solveBatch(db, 'alice', 'alice', 'WEB-01', FLAG, 50));
  const score = await readAsAdmin('scores/alice');
  assert.equal(score.points, 50);
  assert.equal(score.solved, 1);
});

test('T-F3 flags are case- and whitespace-insensitive', async () => {
  const db = await register('alice', 'alice');
  await assertSucceeds(solveBatch(db, 'alice', 'alice', 'WEB-01', '  cys401{VIEW_source_first} ', 50));
});

test('T-F4 a wrong flag cannot create a solve, but is logged as incorrect', async () => {
  const db = await register('alice', 'alice');
  await assertFails(solveBatch(db, 'alice', 'alice', 'WEB-01', 'CYS401{guess}', 50));
  await assertSucceeds(missBatch(db, 'alice', 'alice', 'WEB-01', 'CYS401{guess}'));
});

test('T-F5 a wrong flag cannot be logged as correct', async () => {
  const db = await register('alice', 'alice');
  await assertFails(missBatch(db, 'alice', 'alice', 'WEB-01', 'CYS401{guess}', true));
});

test('T-F6 a correct flag cannot be logged as incorrect', async () => {
  const db = await register('alice', 'alice');
  await assertFails(missBatch(db, 'alice', 'alice', 'WEB-01', FLAG, false));
});

test('T-F7 one challenge\'s flag does not solve another', async () => {
  const db = await register('alice', 'alice');
  await assertFails(solveBatch(db, 'alice', 'alice', 'WEB-02', FLAG, 75));
});

test('T-F8 submissions faster than every 5 seconds are rejected', async () => {
  const db = await register('alice', 'alice');
  await assertSucceeds(missBatch(db, 'alice', 'alice', 'WEB-01', 'CYS401{one}'));
  await assertFails(missBatch(db, 'alice', 'alice', 'WEB-01', 'CYS401{two}'));
  await assertFails(solveBatch(db, 'alice', 'alice', 'WEB-01', FLAG, 50));
  await sleep(5500);
  await assertSucceeds(solveBatch(db, 'alice', 'alice', 'WEB-01', FLAG, 50));
});

test('T-F9 a solved challenge cannot score twice', async () => {
  const db = await register('alice', 'alice');
  await assertSucceeds(solveBatch(db, 'alice', 'alice', 'WEB-01', FLAG, 50));
  await sleep(5500);
  await assertFails(solveBatch(db, 'alice', 'alice', 'WEB-01', FLAG, 50));
  assert.equal((await readAsAdmin('scores/alice')).points, 50);
});

test('T-F10 logged-out visitors cannot submit flags', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'solves/x_WEB-01'), { uid: 'x', challengeId: 'WEB-01', flag: norm(FLAG), points: 50, solvedAt: serverTimestamp() }));
});

// ── Scoreboard integrity ────────────────────────────────────────────────────
test('T-S1 the scoreboard is publicly readable', async () => {
  await register('alice', 'alice');
  await assertSucceeds(getDocs(collection(env.unauthenticatedContext().firestore(), 'scores')));
});

test('T-S2 a user cannot raise their own score directly', async () => {
  const db = await register('alice', 'alice');
  await assertFails(updateDoc(doc(db, 'scores/alice'), { points: 9999 }));
  await assertFails(updateDoc(doc(db, 'scores/alice'), { points: increment(50), solved: increment(1), lastChallenge: 'WEB-01', lastSolveAt: serverTimestamp() }));
});

test('T-S3 a solve cannot claim more points than the challenge is worth', async () => {
  const db = await register('alice', 'alice');
  await assertFails(solveBatch(db, 'alice', 'alice', 'WEB-01', FLAG, 500));
});

test('T-S4 a user cannot change another user\'s score', async () => {
  await register('alice', 'alice');
  const bob = await register('bob', 'bob');
  await assertFails(updateDoc(doc(bob, 'scores/alice'), { points: 0 }));
});

// ── Privacy and audit ───────────────────────────────────────────────────────
test('T-P1 users can read their own solves and attempts, not others\'', async () => {
  const alice = await register('alice', 'alice');
  const bob = await register('bob', 'bob');
  await assertSucceeds(solveBatch(alice, 'alice', 'alice', 'WEB-01', FLAG, 50));
  await assertSucceeds(getDoc(doc(alice, 'solves/alice_WEB-01')));
  await assertFails(getDoc(doc(bob, 'solves/alice_WEB-01')));
});

test('T-P2 attempts cannot be edited or deleted', async () => {
  const db = await register('alice', 'alice');
  const ref = doc(collection(db, 'attempts'));
  const b = writeBatch(db);
  b.update(doc(db, 'users/alice'), { lastAttemptAt: serverTimestamp() });
  b.set(ref, { uid: 'alice', username: 'alice', challengeId: 'WEB-01', flag: 'cys401{x}', correct: false, at: serverTimestamp() });
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(ref, { correct: true }));
  await assertFails(deleteDoc(ref));
});

// ── Admin ───────────────────────────────────────────────────────────────────
async function makeAdmin(uid) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), 'users', uid), { role: 'admin' });
  });
}

test('T-R1 an admin can change roles, load challenges, and read the log', async () => {
  const admin = await register('admin1', 'admin1');
  await register('bob', 'bob');
  await makeAdmin('admin1');
  await assertSucceeds(updateDoc(doc(admin, 'users/bob'), { role: 'admin' }));
  await assertSucceeds(setDoc(doc(admin, 'challenges/WEB-03'), { category: 'web', title: 'x', difficulty: 'Medium', points: 100 }));
  await assertSucceeds(setDoc(doc(admin, 'flagHashes/WEB-03'), { hash: sha('CYS401{x}') }));
  await assertSucceeds(getDocs(collection(admin, 'attempts')));
  await assertSucceeds(getDocs(collection(admin, 'users')));
});

test('T-R2 a normal user cannot edit challenges, flags, or read all users', async () => {
  const db = await register('bob', 'bob');
  await assertFails(setDoc(doc(db, 'challenges/WEB-01'), { points: 1 }));
  await assertFails(setDoc(doc(db, 'flagHashes/WEB-01'), { hash: sha('CYS401{mine}') }));
  await assertFails(getDocs(collection(db, 'users')));
  await assertFails(getDocs(collection(db, 'attempts')));
});

// ── Hints ───────────────────────────────────────────────────────────────────
test('T-H1 hint use is recorded once per challenge', async () => {
  const db = await register('alice', 'alice');
  await assertSucceeds(setDoc(doc(db, 'hints/alice_WEB-01'), { uid: 'alice', challengeId: 'WEB-01', at: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'hints/alice_WEB-01'), { uid: 'alice', challengeId: 'WEB-01', at: serverTimestamp() }));
});
