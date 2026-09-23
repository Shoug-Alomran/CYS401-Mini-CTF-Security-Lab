# CYS401 CTF Lab

The website for our CYS401 semester project: the **Mini Capture-the-Flag (CTF) Security Lab Platform** — an educational lab where users solve cybersecurity challenges, capture flags, and track their progress across four categories (Web Security, Cryptography, Security Awareness, and Cybersecurity Ethics).

**Live site:** https://ctf-lab.shoug-tech.com/

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `about.html` | About |
| `project.html` | Semester project (scope, phases, grading, timeline) |
| `web-security.html` | Challenge track 01 — Web Security |
| `cryptography.html` | Challenge track 02 — Cryptography |
| `security-awareness.html` | Challenge track 03 — Security Awareness |
| `ethics.html` | Challenge track 04 — Cybersecurity Ethics |
| `team.html` | Team |
| `404.html` | Not found page |

## Structure

- `assets/js/layout.js` holds the **shared header and footer** for every page. To add or rename a nav link, edit the `NAV` array there. The active link is highlighted automatically.
- `assets/js/challenges.js` runs the **challenge behaviour** on the four category pages: flag validation, hints, points, and progress. Each challenge card carries its expected flag base64-encoded in `data-flag`, and solved challenges are stored in `localStorage` — a front-end demo, so the graded platform validates on the server instead.
- `assets/js/tailwind-config.js` holds the shared Tailwind theme (colors, fonts).
- `assets/css/styles.css` holds the small amount of custom CSS.

Each page includes `<div id="site-header"></div>`, `<div id="site-footer"></div>`, and `<script src="assets/js/layout.js"></script>`. The four challenge pages also include `<script src="assets/js/challenges.js"></script>`.

## Challenges

| Track | Challenges | Points |
| --- | --- | --- |
| Web Security | WEB-01 … WEB-04 | 350 |
| Cryptography | CRY-01 … CRY-03 | 300 |
| Security Awareness | AWR-01 … AWR-03 | 250 |
| Cybersecurity Ethics | ETH-01, ETH-02 | 300 |

Flags use the format `CYS401{...}`. To edit a challenge, change its card in the category page: `data-flag` holds the base64-encoded flag, and the card carries the scenario, hint, and post-solve explanation.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deployment

`.github/workflows/pages.yml` checks internal links and deploys to GitHub Pages on every push to `main`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
