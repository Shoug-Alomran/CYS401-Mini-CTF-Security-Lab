# Challenge labs: guide for Member 3

Every challenge card on the four `*-challenges.html` pages has a **Lab** panel (`<div class="challenge-lab">`, marked "Draft lab · placeholder content"). The panels are wired up and working, but their content is placeholder. Replace it with the real scenario material, then remove the "Draft lab" line.

Search the challenge pages for `TODO(Member 3)` to find every spot.

## The flag must be reachable

A player has to be able to get the flag from what the lab shows. For each challenge:

1. Pick the real flag, `CYS401{...}`.
2. Build the material so solving it reveals that flag (see the lab types below).
3. Load the flag on the **Admin** page (paste `ID CYS401{...}`, then **Save to Firestore**), and update the team's `flags.private.txt`. The server only accepts flags that are loaded there.

Never put a plain flag or an answer in page source or in an HTML comment. Players can read both.

## Lab types (all handled by `assets/js/labs.js`)

### Material: the thing to analyse

```html
<div data-lab-material data-label="Intercepted note"><pre>...text...</pre></div>
```

Shows the text with a **Copy** button. Use it for ciphertexts, emails, password lists, transcripts, and letters.

### Toolkit: decoding helpers

```html
<div data-lab-tools="base64,caesar,xor,hex"></div>
```

Pick only the tools the challenge needs.

### Quiz: the right answer unlocks the flag

```html
<form data-lab-quiz data-mode="multi" data-lock='{"s":"…","iv":"…","c":"…"}'>
  <label><input type="checkbox" value="a" /> option text</label>
  ...
  <button type="submit">Check answer</button>
  <div data-lab-result></div>
</form>
```

- **Modes:** `multi` (checkboxes; the answer is the set of checked values), `single` (radios), and `text` (one text box).
- **Matching:** answers ignore case, extra spaces, and order.
- **Lock:** `data-lock` is the flag encrypted with the correct answer, so the page holds neither.

## Making locks and crypto material

Run from the repo root (Node 20+):

```sh
# Lock a flag for a quiz (multi: list the correct option values)
node --input-type=module -e "import {lockFlag} from './assets/js/labs.js'; console.log(JSON.stringify(await lockFlag('CYS401{real_flag}', ['a','c','d','f'])))"

# Single answer or text answer
node --input-type=module -e "import {lockFlag} from './assets/js/labs.js'; console.log(JSON.stringify(await lockFlag('CYS401{real_flag}', 'c')))"

# Crypto material
node --input-type=module -e "import {codec} from './assets/js/labs.js'; console.log(codec.base64Encode('CYS401{real_flag}'))"
node --input-type=module -e "import {codec} from './assets/js/labs.js'; console.log(codec.caesar('The flag is CYS401{real_flag}', 13))"
node --input-type=module -e "import {codec} from './assets/js/labs.js'; console.log(codec.xorHex(codec.hexEncode('your message'), codec.hexEncode('key')))"
```

Paste the lock output into `data-lock='...'`. Keep the single quotes around it.

## Status

| Card | Lab | Status |
| --- | --- | --- |
| WEB-01 | Areej's "Secret Cyber Clubhouse" (to be integrated) | Draft panel |
| WEB-02 to WEB-04 | Lab pages not built yet | Draft panel |
| CRY-01 | Config file with a Base64 "encrypted" password and a Base64 tool | Done |
| CRY-02 | Caesar-shifted note and a Caesar tool | Done |
| CRY-03 | Two ciphertexts XORed with a reused 4-byte key, with XOR/hex tools | Done |
| AWR-01 | Phishing email and a select-all quiz (4 correct) | Done |
| AWR-02 | Audited password list and a single-choice quiz | Done |
| AWR-03 | Vishing call transcript and a select-all quiz (4 correct) | Done |
| ETH-01 | Engagement letter and a select-all quiz on six actions (3 permitted) | Done |
| ETH-02 | Responsible-disclosure scenario and a single-choice quiz | Done |

The real flags are in `flags.private.txt` and the correct quiz answers are in `answers.private.txt`. Both files are git-ignored: share them with the team privately, never in the repo. After changing any flag, paste the `flags.private.txt` lines on the Admin page and press **Save to Firestore**.

## Limits to mention in the report

Quiz locks are checked in the browser, so a student could brute-force a quiz with few options offline. Submitting the flag still goes through the server, which checks it, throttles guessing, and scores each challenge once.
