// Challenge behaviour for the four category pages: flag submission, hints,
// progress, and the explanation shown after a correct answer.
//
// Flags are validated server-side by Firestore security rules (see firebase.js and
// firestore.rules): the page holds no flags, and progress is stored per account.
import {
  configured,
  onSession,
  submitFlag,
  logHint,
  mySolves,
  escapeHtml,
} from "./firebase.js";
import { CHALLENGES } from "./challenge-data.js";

const cards = Array.from(document.querySelectorAll(".challenge"));
const solvedCount = document.getElementById("solved-count");
const pointsCount = document.getElementById("points-count");
const here = location.pathname.split("/").pop() || "index.html";
let solved = {}; // challengeId -> Date | true

const pointsFor = (card) => {
  const c = CHALLENGES.find((x) => x.id === card.dataset.id);
  return c ? c.points : 0;
};

function updateTotals() {
  let count = 0;
  let points = 0;
  cards.forEach((card) => {
    if (solved[card.dataset.id]) {
      count++;
      points += pointsFor(card);
    }
  });
  if (solvedCount) solvedCount.textContent = String(count);
  if (pointsCount) pointsCount.textContent = String(points);
}

function feedback(card, message, tone) {
  const el = card.querySelector(".flag-feedback");
  if (!el) return;
  const color =
    { ok: "text-success", bad: "text-pred", info: "text-stext" }[tone] ||
    "text-stext";
  el.innerHTML = message;
  el.className = "flag-feedback mt-3 text-[13px] leading-relaxed " + color;
}

function setFormEnabled(card, enabled, label) {
  const input = card.querySelector(".flag-input");
  const button = card.querySelector(".flag-form button");
  if (input) input.disabled = !enabled;
  if (button) {
    button.disabled = !enabled;
    button.classList.toggle("opacity-50", !enabled);
    button.classList.toggle("cursor-not-allowed", !enabled);
    if (label) button.textContent = label;
  }
}

function markSolved(card, when, announce) {
  const status = card.querySelector(".challenge-status");
  const explain = card.querySelector(".challenge-explain");
  const form = card.querySelector(".flag-form");

  card.classList.add("border-rborder");
  if (status) {
    status.textContent = "Solved";
    status.className =
      "challenge-status ml-auto text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-success/40 bg-success/10 text-success";
  }
  if (explain) explain.classList.remove("hidden");
  if (form) form.classList.add("hidden");
  const date = when instanceof Date ? " on " + when.toLocaleString() : "";
  feedback(
    card,
    announce
      ? "Flag accepted &mdash; " + pointsFor(card) + " points captured."
      : "Solved" +
          escapeHtml(date) +
          " &middot; " +
          pointsFor(card) +
          " points.",
    "ok",
  );
}

function resetCard(card) {
  const status = card.querySelector(".challenge-status");
  const explain = card.querySelector(".challenge-explain");
  const form = card.querySelector(".flag-form");
  card.classList.remove("border-rborder");
  if (status) {
    status.textContent = "Unsolved";
    status.className =
      "challenge-status ml-auto text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-brder2 text-mtext";
  }
  if (explain) explain.classList.add("hidden");
  if (form) form.classList.remove("hidden");
  feedback(card, "", "info");
}

async function render(session) {
  solved = {};
  cards.forEach(resetCard);

  if (!configured) {
    cards.forEach((card) => {
      setFormEnabled(card, false, "Submit Flag");
      feedback(
        card,
        "Flag submission opens once the platform&rsquo;s accounts are connected.",
        "info",
      );
    });
  } else if (!session.user) {
    const next = encodeURIComponent(here + "#challenges");
    cards.forEach((card) => {
      setFormEnabled(card, false, "Submit Flag");
      feedback(
        card,
        '<a href="auth.html?next=' +
          next +
          '" class="text-bred font-semibold hover:underline">Log in</a> or ' +
          '<a href="auth.html?next=' +
          next +
          '#signup" class="text-bred font-semibold hover:underline">create an account</a> to submit flags and save your progress.',
        "info",
      );
    });
  } else {
    // Keep the forms locked until progress has loaded, so a submission can't race it.
    cards.forEach((card) => setFormEnabled(card, false, "Loading\u2026"));
    try {
      (await mySolves()).forEach((s) => {
        solved[s.challengeId] = s.solvedAt || true;
      });
    } catch (e) {
      /* progress unavailable — cards stay unsolved, submissions still work */
    }
    cards.forEach((card) => {
      if (solved[card.dataset.id])
        markSolved(card, solved[card.dataset.id], false);
      else setFormEnabled(card, true, "Submit Flag");
    });
  }
  updateTotals();
}

cards.forEach((card) => {
  const form = card.querySelector(".flag-form");
  const input = card.querySelector(".flag-input");
  const hint = card.querySelector("details");
  const id = card.dataset.id;

  if (hint) {
    hint.addEventListener("toggle", () => {
      if (hint.open) logHint(id);
    });
  }
  if (!form || !input) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return feedback(card, "Enter a flag before submitting.", "bad");
    if (value.length > 200 || !/^CYS401\{.*\}$/i.test(value)) {
      return feedback(
        card,
        "Not a valid flag format. Flags look like CYS401{...}.",
        "bad",
      );
    }

    setFormEnabled(card, false, "Checking…");
    try {
      const result = await submitFlag(id, value);
      if (result === "correct" || result === "solved") {
        solved[id] = new Date();
        markSolved(card, solved[id], result === "correct");
        updateTotals();
      } else if (result === "throttled") {
        feedback(
          card,
          "Too many attempts. Wait a few seconds before submitting again.",
          "bad",
        );
      } else {
        feedback(
          card,
          "Incorrect flag. Try the hint, then submit again.",
          "bad",
        );
      }
    } catch (err) {
      feedback(
        card,
        escapeHtml(
          err.message ||
            "Could not submit. Check your connection and try again.",
        ),
        "bad",
      );
    } finally {
      if (!solved[id]) setFormEnabled(card, true, "Submit Flag");
    }
  });
});

if (cards.length) {
  // Locked until the session is known, so a submission never runs as "logged out".
  cards.forEach((card) => setFormEnabled(card, false, "Loading\u2026"));
  onSession(render);
}
