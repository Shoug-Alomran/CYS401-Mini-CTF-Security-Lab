// Lab components for the challenge cards and the lab-*.html pages. Challenge
// authors build a lab from data attributes; see CHALLENGES.md for the full guide.
//
//   <div data-lab-material data-label="Intercepted note"><pre>...</pre></div>
//       A block of challenge material (ciphertext, email, transcript) with a Copy button.
//   <div data-lab-tools="base64,caesar,xor"></div>
//       A small decoding toolkit. Tools: base64, hex, caesar, xor.
//   <form data-lab-quiz data-mode="multi|single|text" data-lock='{"s":"…","iv":"…","c":"…"}'>
//       Questions whose correct answer unlocks the flag. Options are checkboxes
//       (multi), radios (single), or one text box (text). Make the lock with
//       lab-builder.html; the page never contains the answer or the plain flag.
//
// Locks: the flag is encrypted with AES-GCM under a key derived (PBKDF2-SHA256)
// from the normalised answer, so only the right answer decrypts it. Anyone can
// still try answers offline, so locks suit labs where guessing is not trivial;
// the flag itself is still checked, rate-limited, and scored on the server.

const ITERATIONS = 150000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const bytesToB64 = (bytes) => btoa(String.fromCharCode(...bytes));

// Answers compare case-, space-, and order-insensitively.
export function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.map(normalizeAnswer).filter(Boolean).sort().join(",");
  }
  return String(answer || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function keyFor(answer, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(normalizeAnswer(answer)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Returns { s, iv, c } (base64) for data-lock attributes.
export async function lockFlag(flag, answer) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(answer, salt);
  const c = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(flag)),
  );
  return { s: bytesToB64(salt), iv: bytesToB64(iv), c: bytesToB64(c) };
}

// Resolves to the flag, or null when the answer is wrong.
export async function unlockFlag(lock, answer) {
  try {
    const data = typeof lock === "string" ? JSON.parse(lock) : lock;
    const key = await keyFor(answer, b64ToBytes(data.s));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(data.iv) },
      key,
      b64ToBytes(data.c),
    );
    return dec.decode(plain);
  } catch (e) {
    return null;
  }
}

// ── Encoders (used by the toolkit and by lab-builder.html) ─────────────────
export const codec = {
  base64Encode: (s) => bytesToB64(enc.encode(s)),
  base64Decode: (s) => dec.decode(b64ToBytes(s.trim())),
  hexEncode: (s) =>
    Array.from(enc.encode(s), (b) => b.toString(16).padStart(2, "0")).join(""),
  hexDecode: (s) =>
    dec.decode(
      Uint8Array.from(
        (s.replace(/[^0-9a-f]/gi, "").match(/../g) || []).map((h) =>
          parseInt(h, 16),
        ),
      ),
    ),
  caesar: (s, shift) => {
    const k = ((Number(shift) % 26) + 26) % 26;
    return s.replace(/[a-z]/gi, (ch) => {
      const base = ch <= "Z" ? 65 : 97;
      return String.fromCharCode(((ch.charCodeAt(0) - base + k) % 26) + base);
    });
  },
  // XOR of two byte strings given as hex; the shorter one repeats (a short key).
  xorHex: (aHex, bHex) => {
    const a = (aHex.replace(/[^0-9a-f]/gi, "").match(/../g) || []).map((h) =>
      parseInt(h, 16),
    );
    const b = (bHex.replace(/[^0-9a-f]/gi, "").match(/../g) || []).map((h) =>
      parseInt(h, 16),
    );
    if (!a.length || !b.length) return "";
    const [long, short] = a.length >= b.length ? [a, b] : [b, a];
    return long
      .map((x, i) =>
        (x ^ short[i % short.length]).toString(16).padStart(2, "0"),
      )
      .join("");
  },
};

// ── UI ─────────────────────────────────────────────────────────────────────
const INPUT =
  "w-full bg-main border border-brder2 rounded-btn px-3 py-2.5 text-[13px] font-mono text-ptext placeholder:text-mtext focus:border-pred focus:outline-none";
const SMALL_BTN =
  "text-[12px] font-semibold border border-brder2 hover:bg-elevated px-3 py-1.5 rounded-btn transition-colors";

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escape(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = old), 1200);
  } catch (e) {
    /* clipboard blocked — the text is still selectable */
  }
}

function setupMaterial(box) {
  const label = box.dataset.label || "Material";
  const content = box.querySelector("pre, .lab-content") || box;
  const header = el(
    `<div class="flex items-center justify-between gap-3 mb-2">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-mtext">${escape(label)}</p>
      <button type="button" class="${SMALL_BTN}">Copy</button>
    </div>`,
  );
  header
    .querySelector("button")
    .addEventListener("click", (e) =>
      copy(content.innerText.trim(), e.currentTarget),
    );
  box.prepend(header);
}

const TOOLS = {
  base64: {
    label: "Base64",
    render:
      () => `<textarea rows="2" class="${INPUT}" data-in placeholder="Paste Base64 or text"></textarea>
      <div class="flex gap-2 mt-2"><button type="button" class="${SMALL_BTN}" data-act="decode">Decode</button><button type="button" class="${SMALL_BTN}" data-act="encode">Encode</button></div>`,
    run: (root, act) =>
      (act === "decode" ? codec.base64Decode : codec.base64Encode)(
        root.querySelector("[data-in]").value,
      ),
  },
  hex: {
    label: "Hex",
    render:
      () => `<textarea rows="2" class="${INPUT}" data-in placeholder="Paste hex or text"></textarea>
      <div class="flex gap-2 mt-2"><button type="button" class="${SMALL_BTN}" data-act="decode">Hex → text</button><button type="button" class="${SMALL_BTN}" data-act="encode">Text → hex</button></div>`,
    run: (root, act) =>
      (act === "decode" ? codec.hexDecode : codec.hexEncode)(
        root.querySelector("[data-in]").value,
      ),
  },
  caesar: {
    label: "Caesar shift",
    render:
      () => `<textarea rows="2" class="${INPUT}" data-in placeholder="Paste the message"></textarea>
      <div class="flex flex-wrap items-center gap-2 mt-2"><label class="text-[12px] text-stext">Shift <input type="number" min="0" max="25" value="0" data-shift class="w-16 ml-1 bg-main border border-brder2 rounded px-2 py-1 text-[12px] font-mono text-ptext"></label>
      <button type="button" class="${SMALL_BTN}" data-act="apply">Apply</button><button type="button" class="${SMALL_BTN}" data-act="all">Show all 25</button></div>`,
    run: (root, act) => {
      const text = root.querySelector("[data-in]").value;
      if (act === "all")
        return Array.from(
          { length: 25 },
          (_, i) =>
            `${String(i + 1).padStart(2, " ")}: ${codec.caesar(text, i + 1)}`,
        ).join("\n");
      return codec.caesar(text, root.querySelector("[data-shift]").value);
    },
  },
  xor: {
    label: "XOR (hex)",
    render:
      () => `<input class="${INPUT}" data-a placeholder="Hex A (e.g. ciphertext 1)">
      <input class="${INPUT} mt-2" data-b placeholder="Hex B (e.g. ciphertext 2 or a key)">
      <div class="flex gap-2 mt-2"><button type="button" class="${SMALL_BTN}" data-act="xor">A ⊕ B</button><button type="button" class="${SMALL_BTN}" data-act="text">A ⊕ B as text</button></div>`,
    run: (root, act) => {
      const out = codec.xorHex(
        root.querySelector("[data-a]").value,
        root.querySelector("[data-b]").value,
      );
      return act === "text" ? codec.hexDecode(out) : out;
    },
  },
};

function setupTools(box) {
  const names = (box.dataset.labTools || "")
    .split(",")
    .map((s) => s.trim())
    .filter((n) => TOOLS[n]);
  box.classList.add("space-y-3");
  box.innerHTML =
    `<p class="text-[11px] font-semibold uppercase tracking-wider text-mtext">Toolkit</p>` +
    names
      .map(
        (
          n,
        ) => `<div class="bg-main/60 border border-brder rounded-xl p-3" data-tool="${n}">
        <p class="text-[12px] font-semibold text-ptext mb-2">${TOOLS[n].label}</p>${TOOLS[n].render()}
        <pre class="hidden mt-2 text-[12px] font-mono text-success whitespace-pre-wrap break-all bg-main border border-brder rounded-lg p-2" data-out></pre></div>`,
      )
      .join("");
  box.querySelectorAll("[data-tool]").forEach((root) => {
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const out = root.querySelector("[data-out]");
      let result;
      try {
        result = TOOLS[root.dataset.tool].run(root, btn.dataset.act);
      } catch (err) {
        result = "Could not convert that input.";
      }
      out.textContent = result || "(empty)";
      out.classList.remove("hidden");
    });
  });
}

// Shows an unlocked flag with a button that drops it into the card's flag box.
export function showFlag(container, flag) {
  const card = container.closest(".challenge");
  container.innerHTML = `<div class="mt-3 bg-success/10 border border-success/40 rounded-xl p-3">
    <p class="text-[12px] text-success mb-1">Correct — here is your flag:</p>
    <p class="font-mono text-[14px] text-ptext break-all">${escape(flag)}</p>
    <div class="flex gap-2 mt-2">
      <button type="button" class="${SMALL_BTN}" data-copy>Copy</button>
      ${card ? `<button type="button" class="${SMALL_BTN}" data-use>Put it in the flag box</button>` : ""}
    </div></div>`;
  container
    .querySelector("[data-copy]")
    .addEventListener("click", (e) => copy(flag, e.currentTarget));
  const use = container.querySelector("[data-use]");
  if (use) {
    use.addEventListener("click", () => {
      const input = card.querySelector(".flag-input");
      if (input && !input.disabled) {
        input.value = flag;
        input.focus();
      }
    });
  }
}

function setupQuiz(form) {
  const mode = form.dataset.mode || "multi";
  const result =
    form.querySelector("[data-lab-result]") ||
    form.appendChild(el("<div data-lab-result></div>"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let answer;
    if (mode === "text") {
      answer =
        (form.querySelector("input[type=text], textarea") || {}).value || "";
    } else {
      answer = Array.from(form.querySelectorAll("input:checked")).map(
        (i) => i.value,
      );
      if (mode === "single") answer = answer[0] || "";
    }
    if (!answer || (Array.isArray(answer) && !answer.length)) {
      result.innerHTML = `<p class="mt-3 text-[13px] text-pred">Choose an answer first.</p>`;
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    const flag = await unlockFlag(form.dataset.lock, answer);
    if (btn) btn.disabled = false;
    if (flag) showFlag(result, flag);
    else
      result.innerHTML = `<p class="mt-3 text-[13px] text-pred">Not quite. Review the material and try again.</p>`;
  });
}

function init() {
  document.querySelectorAll("[data-lab-material]").forEach(setupMaterial);
  document.querySelectorAll("[data-lab-tools]").forEach(setupTools);
  document.querySelectorAll("form[data-lab-quiz]").forEach(setupQuiz);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
}
