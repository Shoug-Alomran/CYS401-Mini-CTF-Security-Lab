// Challenge behaviour for the four category pages: flag submission, validation,
// progress tracking, and the explanation shown after a correct answer.
//
// This is the front-end demo of the CTF Lab. Expected flags are base64-encoded in
// each challenge's data-flag attribute, so they are obscured but not secret, and
// progress is kept in localStorage on this device only. The graded platform
// validates submissions on the server and stores progress per account.
(function () {
  var STORE_KEY = 'cys401-ctf-progress';

  function loadSolved() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveSolved(solved) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(solved));
    } catch (e) {
      /* storage unavailable (private window, blocked cookies) — progress just won't persist */
    }
  }

  function expected(card) {
    try {
      return atob(card.getAttribute('data-flag') || '');
    } catch (e) {
      return '';
    }
  }

  function normalize(value) {
    return (value || '').trim().replace(/\s+/g, '').toLowerCase();
  }

  var cards = Array.prototype.slice.call(document.querySelectorAll('.challenge'));
  if (!cards.length) return;

  var solved = loadSolved();
  var solvedCount = document.getElementById('solved-count');
  var pointsCount = document.getElementById('points-count');

  function pointsFor(card) {
    var text = card.querySelector('.text-pred');
    var n = text ? parseInt(text.textContent, 10) : 0;
    return isNaN(n) ? 0 : n;
  }

  function updateTotals() {
    var count = 0;
    var points = 0;
    cards.forEach(function (card) {
      if (solved[card.getAttribute('data-id')]) {
        count++;
        points += pointsFor(card);
      }
    });
    if (solvedCount) solvedCount.textContent = String(count);
    if (pointsCount) pointsCount.textContent = String(points);
  }

  function markSolved(card, announce) {
    var status = card.querySelector('.challenge-status');
    var explain = card.querySelector('.challenge-explain');
    var feedback = card.querySelector('.flag-feedback');
    var input = card.querySelector('.flag-input');

    card.classList.add('border-rborder');
    if (status) {
      status.textContent = 'Solved';
      status.className =
        'challenge-status ml-auto text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-success/40 bg-success/10 text-success';
    }
    if (explain) explain.classList.remove('hidden');
    if (input) {
      input.value = expected(card);
      input.setAttribute('readonly', 'readonly');
      input.classList.add('text-success', 'border-success/40');
    }
    if (feedback && announce) {
      feedback.textContent =
        'Flag accepted — ' + pointsFor(card) + ' points captured.';
      feedback.className = 'flag-feedback mt-3 text-[13px] leading-relaxed text-success';
    } else if (feedback) {
      feedback.classList.add('hidden');
    }
  }

  function reject(card, message) {
    var feedback = card.querySelector('.flag-feedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = 'flag-feedback mt-3 text-[13px] leading-relaxed text-pred';
  }

  cards.forEach(function (card) {
    var form = card.querySelector('.flag-form');
    var input = card.querySelector('.flag-input');
    if (solved[card.getAttribute('data-id')]) markSolved(card, false);
    if (!form || !input) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!value) {
        reject(card, 'Enter a flag before submitting.');
        return;
      }
      if (!/^CYS401\{.*\}$/i.test(value)) {
        reject(card, 'Not a valid flag format. Flags look like CYS401{...}.');
        return;
      }
      if (normalize(value) !== normalize(expected(card))) {
        reject(card, 'Incorrect flag. Try the hint, then submit again.');
        return;
      }
      solved[card.getAttribute('data-id')] = true;
      saveSolved(solved);
      markSolved(card, true);
      updateTotals();
    });
  });

  updateTotals();
})();
