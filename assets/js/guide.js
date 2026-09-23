// On-page contents and the optional guided walkthrough, shown in one dock at the
// bottom right of every content page.
//
//   Contents — built from the <h2> of each section in <main>. Sections without an
//              id get one derived from their heading, so the links survive edits.
//   Tour     — a short contextual walkthrough. Steps are defined per page in TOURS
//              below; steps whose target is missing are skipped, so a page can be
//              edited without breaking the tour.
(function () {
  var TOUR_KEY = 'cys401-tour-seen';

  // Page-specific steps: [selector, title, body]. First match wins.
  var TOURS = {
    index: [
      ['#challenges', 'Four challenge tracks', 'Challenges are grouped into Web Security, Cryptography, Security Awareness, and Cybersecurity Ethics. Each card shows how many challenges the track holds and what they are worth.'],
      ['#how-it-works', 'How a challenge works', 'Open a challenge, solve the scenario to uncover a flag, then submit it. Correct flags score points and unlock an explanation.'],
      ['#scoreboard', 'Progress and scoreboard', 'Solved challenges, points earned, and completion status are tracked as you work through the lab.']
    ],
    project: [
      ['#phases', 'Five phases', 'The report and presentation are built phase by phase. This list updates as the project progresses.'],
      ['#plan-download', 'The planning document', 'Our original scope note: what the platform needs to do, the challenge ideas, and how the report maps to it.']
    ],
    challenge: [
      ['.challenge', 'A challenge', 'Each card holds the scenario, its difficulty, the points it is worth, and whether you have solved it.'],
      ['.challenge details', 'Hints', 'Stuck? Open the hint for a nudge that points at the technique without giving the flag away.'],
      ['.challenge .flag-form', 'Submit your flag', 'Flags look like CYS401{...}. Submit one to have it validated; a correct flag scores the points and reveals what the challenge was teaching.'],
      ['#solved-count', 'Your progress', 'Solved challenges and points are counted here and kept on this device.']
    ]
  };

  var CHALLENGE_PAGES = ['web-security', 'cryptography', 'security-awareness', 'ethics'];

  function pageKey() {
    var name = location.pathname.split('/').pop().replace(/\.html$/, '');
    return name === '' ? 'index' : name;
  }

  function slug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  var main = document.getElementById('main');
  if (!main) return;

  // ── Contents ───────────────────────────────────────────────────────────────
  var sections = Array.prototype.slice.call(main.querySelectorAll('section'));
  var last = sections[sections.length - 1];
  var entries = [];

  sections.forEach(function (section) {
    if (section === last) return; // closing call-to-action, not a section of the page
    var heading = section.querySelector('h2');
    if (!heading || heading.classList.contains('sr-only')) return;
    var label = heading.textContent.trim().replace(/\s+/g, ' ');
    if (!label) return;
    if (!section.id) section.id = slug(label) || 'section-' + entries.length;
    entries.push({ id: section.id, label: label, el: section });
  });

  if (!entries.length) return;

  var dock = document.createElement('div');
  dock.className =
    'fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden';

  var panel = document.createElement('nav');
  panel.id = 'toc-panel';
  panel.setAttribute('aria-label', 'On this page');
  panel.className =
    'hidden w-[260px] max-h-[60vh] overflow-y-auto no-scrollbar bg-card border border-brder rounded-card shadow-2xl p-4';
  panel.innerHTML =
    '<p class="text-[11px] font-semibold text-mtext uppercase tracking-widest mb-3">On this page</p>' +
    '<ul class="space-y-1 text-[13px]">' +
    entries
      .map(function (e) {
        return (
          '<li><a href="#' + e.id + '" data-toc-link="' + e.id + '" ' +
          'class="block px-3 py-2 rounded-btn text-stext hover:text-ptext hover:bg-elevated transition-colors">' +
          e.label +
          '</a></li>'
        );
      })
      .join('') +
    '</ul>';

  var buttons = document.createElement('div');
  buttons.className = 'flex items-center gap-2';

  var tocBtn = document.createElement('button');
  tocBtn.type = 'button';
  tocBtn.setAttribute('aria-expanded', 'false');
  tocBtn.setAttribute('aria-controls', 'toc-panel');
  tocBtn.className =
    'flex items-center gap-2 bg-card border border-brder2 hover:bg-elevated text-ptext text-[13px] font-semibold px-4 py-2.5 rounded-btn shadow-lg transition-colors';
  tocBtn.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>Contents';

  var tourBtn = document.createElement('button');
  tourBtn.type = 'button';
  tourBtn.className =
    'flex items-center gap-2 bg-pred hover:bg-bred text-white text-[13px] font-semibold px-4 py-2.5 rounded-btn shadow-lg transition-colors';
  tourBtn.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 17v-5M12 8h.01"/></svg>Tour';

  buttons.appendChild(tocBtn);
  buttons.appendChild(tourBtn);
  dock.appendChild(panel);
  dock.appendChild(buttons);
  document.body.appendChild(dock);

  function setPanel(open) {
    panel.classList.toggle('hidden', !open);
    tocBtn.setAttribute('aria-expanded', String(open));
  }
  tocBtn.addEventListener('click', function () {
    setPanel(panel.classList.contains('hidden'));
  });
  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) setPanel(false);
  });

  // Highlight whichever section is currently in view.
  var links = {};
  entries.forEach(function (e) {
    links[e.id] = panel.querySelector('[data-toc-link="' + e.id + '"]');
  });
  function markActive(id) {
    entries.forEach(function (e) {
      var link = links[e.id];
      if (!link) return;
      var on = e.id === id;
      link.classList.toggle('text-bred', on);
      link.classList.toggle('bg-sred/40', on);
      link.classList.toggle('text-stext', !on);
    });
  }
  if ('IntersectionObserver' in window) {
    var seen = {};
    var spy = new IntersectionObserver(
      function (records) {
        records.forEach(function (r) {
          seen[r.target.id] = r.isIntersecting;
        });
        for (var i = 0; i < entries.length; i++) {
          if (seen[entries[i].id]) {
            markActive(entries[i].id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );
    entries.forEach(function (e) {
      spy.observe(e.el);
    });
  }

  // ── Walkthrough ────────────────────────────────────────────────────────────
  var key = pageKey();
  var steps = (TOURS[CHALLENGE_PAGES.indexOf(key) > -1 ? 'challenge' : key] || []).filter(
    function (s) {
      return document.querySelector(s[0]);
    }
  );
  // Any page without its own script still gets a tour of its sections.
  if (!steps.length) {
    steps = entries.slice(0, 4).map(function (e) {
      return ['#' + e.id, e.label, 'Jump straight here from the Contents button any time.'];
    });
  }
  if (!steps.length) {
    tourBtn.remove();
    return;
  }

  var overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[60] hidden print:hidden';
  overlay.innerHTML =
    '<div id="tour-spot" class="absolute rounded-xl pointer-events-none transition-all duration-200" ' +
    'style="box-shadow:0 0 0 9999px rgba(9,9,11,.78);outline:2px solid #DC2626;outline-offset:4px"></div>' +
    '<div id="tour-box" class="absolute w-[300px] max-w-[calc(100vw-2rem)] bg-card border border-rborder rounded-card shadow-2xl p-5">' +
    '<p id="tour-count" class="text-[11px] font-mono text-pred uppercase tracking-widest mb-2"></p>' +
    '<h3 id="tour-title" class="font-display text-[17px] font-semibold mb-2"></h3>' +
    '<p id="tour-body" class="text-[13px] text-stext leading-relaxed mb-5"></p>' +
    '<div class="flex items-center justify-between gap-3">' +
    '<button type="button" id="tour-skip" class="text-[13px] text-mtext hover:text-stext transition-colors">Skip</button>' +
    '<div class="flex items-center gap-2">' +
    '<button type="button" id="tour-prev" class="border border-brder2 hover:bg-elevated text-[13px] font-semibold px-3 py-2 rounded-btn transition-colors">Back</button>' +
    '<button type="button" id="tour-next" class="bg-pred hover:bg-bred text-white text-[13px] font-semibold px-4 py-2 rounded-btn transition-colors">Next</button>' +
    '</div></div></div>';
  document.body.appendChild(overlay);

  var spot = overlay.querySelector('#tour-spot');
  var box = overlay.querySelector('#tour-box');
  var index = 0;

  function place() {
    var step = steps[index];
    var target = document.querySelector(step[0]);
    if (!target) return end();
    var r = target.getBoundingClientRect();
    var pad = 8;
    spot.style.top = r.top - pad + 'px';
    spot.style.left = r.left - pad + 'px';
    spot.style.width = r.width + pad * 2 + 'px';
    spot.style.height = r.height + pad * 2 + 'px';

    var boxRect = box.getBoundingClientRect();
    var below = r.bottom + 16;
    var top =
      below + boxRect.height < window.innerHeight
        ? below
        : r.top - boxRect.height - 16;
    // Keep the card on screen even when the target is taller than the viewport.
    top = Math.min(Math.max(16, top), Math.max(16, window.innerHeight - boxRect.height - 16));
    var left = Math.min(
      Math.max(16, r.left),
      Math.max(16, window.innerWidth - boxRect.width - 16)
    );
    box.style.top = top + 'px';
    box.style.left = left + 'px';
  }

  // The target is scrolled into view first, so follow it until the scroll settles.
  var tracking = null;
  function track() {
    var until = Date.now() + 900;
    if (tracking) cancelAnimationFrame(tracking);
    (function loop() {
      place();
      tracking = Date.now() < until ? requestAnimationFrame(loop) : null;
    })();
  }

  function render() {
    var step = steps[index];
    var target = document.querySelector(step[0]);
    // 'instant', not 'auto': the stylesheet sets scroll-behavior: smooth, and 'auto'
    // defers to it — leaving the spotlight pointing at nothing mid-scroll.
    if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
    overlay.querySelector('#tour-count').textContent =
      'Step ' + (index + 1) + ' of ' + steps.length;
    overlay.querySelector('#tour-title').textContent = step[1];
    overlay.querySelector('#tour-body').textContent = step[2];
    overlay.querySelector('#tour-prev').disabled = index === 0;
    overlay.querySelector('#tour-prev').classList.toggle('opacity-40', index === 0);
    overlay.querySelector('#tour-next').textContent =
      index === steps.length - 1 ? 'Done' : 'Next';
    track();
  }

  function start() {
    index = 0;
    setPanel(false);
    overlay.classList.remove('hidden');
    render();
  }
  function end() {
    if (tracking) {
      cancelAnimationFrame(tracking);
      tracking = null;
    }
    overlay.classList.add('hidden');
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch (e) {
      /* storage unavailable — the tour just offers itself again next visit */
    }
  }

  tourBtn.addEventListener('click', start);
  overlay.querySelector('#tour-skip').addEventListener('click', end);
  overlay.querySelector('#tour-prev').addEventListener('click', function () {
    if (index > 0) {
      index--;
      render();
    }
  });
  overlay.querySelector('#tour-next').addEventListener('click', function () {
    if (index === steps.length - 1) return end();
    index++;
    render();
  });
  document.addEventListener('keydown', function (e) {
    if (overlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') end();
    if (e.key === 'ArrowRight') overlay.querySelector('#tour-next').click();
    if (e.key === 'ArrowLeft') overlay.querySelector('#tour-prev').click();
  });
  window.addEventListener('resize', function () {
    if (!overlay.classList.contains('hidden')) place();
  });
  window.addEventListener(
    'scroll',
    function () {
      if (!overlay.classList.contains('hidden')) place();
    },
    { passive: true }
  );

  // First visit: offer the tour rather than starting it unasked.
  var seenTour = true;
  try {
    seenTour = !!localStorage.getItem(TOUR_KEY);
  } catch (e) {
    /* storage unavailable */
  }
  if (!seenTour) {
    tourBtn.classList.add('animate-pulse');
    setTimeout(function () {
      tourBtn.classList.remove('animate-pulse');
    }, 6000);
  }
})();
