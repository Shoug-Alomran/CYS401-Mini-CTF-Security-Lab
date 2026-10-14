# CYS401 CTF Lab

The website for our CYS401 semester project: the **Mini Capture-the-Flag (CTF) Security Lab Platform** — an educational lab where users solve cybersecurity challenges, capture flags, and track their progress across four categories (Web Security, Cryptography, Security Awareness, and Cybersecurity Ethics).

**Live site:** https://ctf-lab.shoug-tech.com/

## Pages

| File                                 | Page                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `index.html`                         | Home                                                                                                                 |
| `about.html`                         | About                                                                                                                |
| `project.html`                       | Semester project (scope, phases, grading, timeline)                                                                  |
| `report.html`                        | Completed report sections (introduction, security analysis, literature review, requirements, conclusion, references) |
| `web-security.html`                  | Workshop 1 — Web Security (lessons)                                                                                  |
| `web-security-challenges.html`       | Challenges 1 — Web Security (flag cards)                                                                             |
| `cryptography.html`                  | Workshop 2 — Cryptography (lessons)                                                                                  |
| `cryptography-challenges.html`       | Challenges 2 — Cryptography (flag cards)                                                                             |
| `security-awareness.html`            | Workshop 3 — Security Awareness (lessons)                                                                            |
| `security-awareness-challenges.html` | Challenges 3 — Security Awareness (flag cards)                                                                       |
| `ethics.html`                        | Workshop 4 — Cybersecurity Ethics (lessons)                                                                          |
| `ethics-challenges.html`             | Challenges 4 — Cybersecurity Ethics (flag cards)                                                                     |
| `scoreboard.html`                    | Public scoreboard (all players ranked by points)                                                                     |
| `auth.html`                          | Log in / sign up                                                                                                     |
| `dashboard.html`                     | Signed-in user's progress: points, completion %, solves with timestamps                                              |
| `account.html`                       | Account settings: change username (with availability check), email, password; delete account                         |
| `admin.html`                         | Admin only: load challenges and flag hashes, manage roles, submission log                                            |
| `team.html`                          | Team                                                                                                                 |
| `404.html`                           | Not found page                                                                                                       |
| `ctf-plan.pdf`                       | Project plan — scope, challenge ideas, flag system, report phases (linked from the Project page)                     |

## Structure

- `assets/js/layout.js` holds the **shared header and footer** for every page. To add or rename a nav link, edit the `NAV` array there: plain links, or groups (`{ label, items }`) that render as header dropdowns (Workshops, Challenges, About). The active link is highlighted automatically.
- `assets/js/guide.js` adds the **Contents panel and the guided walkthrough** to the dock at the bottom right of every page. The contents list is generated from each section's `<h2>`; tour steps live in the `TOURS` object, and steps whose target is missing are skipped.
- `assets/js/firebase.js` is the **Firebase client**: sign-up and login (Firebase Authentication), flag submission, progress, the scoreboard, admin actions, and the account buttons in the header. `layout.js` loads it on every page.
- `assets/js/firebase-config.js` holds the Firebase project's web config.
- `assets/js/challenge-data.js` is the **challenge catalogue** (id, track, title, difficulty, points). No flags.
- `assets/js/challenges.js` runs the **challenge cards** on the four `*-challenges.html` pages: submit, hint logging, solved state, and the explanation shown after a correct flag.
- `firestore.rules` is the **server side**: the Firestore security rules that validate flags, protect scores, throttle guessing, and enforce roles (see below).
- `assets/js/tailwind-config.js` holds the shared Tailwind theme (colors, fonts).
- `assets/css/styles.css` holds the small amount of custom CSS.

Each page includes `<div id="site-header"></div>`, `<div id="site-footer"></div>`, and `<script src="assets/js/layout.js"></script>`. The four `*-challenges.html` pages also include `<script type="module" src="assets/js/challenges.js"></script>`.

## Challenges

| Track                | Challenges      | Points |
| -------------------- | --------------- | ------ |
| Web Security         | WEB-01 … WEB-04 | 350    |
| Cryptography         | CRY-01 … CRY-03 | 300    |
| Security Awareness   | AWR-01 … AWR-03 | 250    |
| Cybersecurity Ethics | ETH-01, ETH-02  | 300    |

Flags use the format `CYS401{...}` and are case- and whitespace-insensitive. The pages never contain flags: each flag's SHA-256 hash is stored in Firestore (`flagHashes/{id}`), which no client can read.

To edit a challenge, change its card in the track's `*-challenges.html` page (scenario, hint, explanation) and its entry in `assets/js/challenge-data.js` (title, points), then press **Save to Firestore** on the admin page. To change a flag, paste the new `ID flag` line on the admin page.

## How flags are checked

There is no custom server: Firestore security rules do the server-side work.

1. A signed-in user submits a flag. The browser writes one atomic batch: the solve, the score increase, an attempt log entry, and a throttle timestamp.
2. The rules hash the submitted flag with SHA-256 and compare it with `flagHashes/{id}`. On a mismatch the whole batch is rejected, so no points are added.
3. The rules also require that the score rises by exactly the challenge's points, that each challenge scores once per user, and that submissions are at least 5 seconds apart (brute-force throttling).
4. Every attempt, right or wrong, is logged in `attempts`, and the rules verify its `correct` field, so the admin log can't be faked.

Roles: everyone signs up as `user`. An `admin` can load challenges and flags, change roles, and read the submission log.

## Sessions and inactivity

- After **30 minutes with no activity** in any tab, the site shows a 60-second warning, then logs the user out and returns them to the login page (`auth.html?reason=idle`). Activity in any tab keeps every tab signed in, and logging out signs out all tabs.
- A session reopened after the limit (for example a browser left closed) is logged out on arrival.
- **Keep me logged in on this device** at login and sign-up is unticked by default. Unticked, the session also ends when the browser closes, which suits shared and lab computers.
- The timer runs in the browser, so it protects an unattended computer but does not revoke Firebase refresh tokens. Revoking them needs the Firebase Admin SDK (Cloud Functions).

Change the limit with `IDLE_LIMIT_MS` in `assets/js/firebase.js`.

## Firebase setup (one time)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (the free Spark plan is enough; Google Analytics is not needed).
2. **Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Firestore Database → Create database** → production mode → a nearby location (e.g. `me-central2` Dammam, or `europe-west`).
4. **Firestore → Rules:** replace everything with the contents of `firestore.rules` and **Publish**.
5. **Project settings → General → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values into `assets/js/firebase-config.js`.
6. **Authentication → Settings → Authorized domains:** add `ctf-lab.shoug-tech.com` (localhost is there by default).
7. Sign up on the site, then in **Firestore → Data → users → (your uid)** change `role` from `user` to `admin`.
8. Open `admin.html`, paste the flags (one `ID flag` per line; the team keeps them in the git-ignored `flags.private.txt`), and press **Save to Firestore**.

## Testing

`tests/rules.test.mjs` runs 32 security tests against the Firestore emulator (needs Node and Java):

```sh
cd tests
npm install
npm test
```

They cover sign-up and roles, renaming and account deletion, hidden flags, correct, wrong, and forged submissions, the 5-second throttle, double-scoring, direct score edits, privacy of solves and attempts, admin-only actions, and hint logging.

To click through the site against the emulators instead of the real project, start `npx firebase emulators:start --only auth,firestore --project demo-cys401 --config ../firebase.json` from `tests/`, serve the site on `localhost`, and run `localStorage.setItem('cys401-emulator', '1')` in the browser console.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deployment

`.github/workflows/pages.yml` checks internal links and deploys to GitHub Pages on every push to `main`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
