# CYS401

An educational website covering cybersecurity fundamentals: the threat landscape, the CIA Triad, access control, and protection mechanisms.

**Live site:** https://shoug-alomran.github.io/cys401/

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `about.html` | About |
| `project.html` | Semester project (topic, phases, grading, timeline) |
| `threats.html` | Threat Landscape |
| `cia-triad.html` | CIA Triad |
| `access-control.html` | Access Control |
| `protection.html` | Protection Mechanisms |
| `team.html` | Team |
| `404.html` | Not found page |

## Structure

- `assets/js/layout.js` holds the **shared header and footer** for every page. To add or rename a nav link, edit the `NAV` array there. The active link is highlighted automatically.
- `assets/js/tailwind-config.js` holds the shared Tailwind theme (colors, fonts).
- `assets/css/styles.css` holds the small amount of custom CSS.

Each page includes `<div id="site-header"></div>`, `<div id="site-footer"></div>`, and `<script src="assets/js/layout.js"></script>`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deployment

`.github/workflows/pages.yml` checks internal links and deploys to GitHub Pages on every push to `main`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
