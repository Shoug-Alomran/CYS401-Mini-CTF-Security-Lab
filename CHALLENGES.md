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

## Current placeholders

All placeholder locks open to `CYS401{replace_me}`, which is not a real flag. Their placeholder answers are:

| Card             | Lab                                                      | Placeholder answer                   |
| ---------------- | -------------------------------------------------------- | ------------------------------------ |
| WEB-01 to WEB-04 | "Lab coming soon": lab pages not built yet               | n/a                                  |
| CRY-01           | Base64 material and Base64 tool                          | decodes to the placeholder flag      |
| CRY-02           | Caesar (ROT13) material and Caesar tool                  | decodes to the placeholder flag      |
| CRY-03           | Two XOR ciphertexts (key `k3y!`) and XOR/hex tools       | message 2 holds the placeholder flag |
| AWR-01           | Email and multi-select quiz                              | a, c, d, f                           |
| AWR-02           | Password list and single-choice quiz                     | c                                    |
| AWR-03           | Transcript (to be written) and multi-select quiz         | a, b, d                              |
| ETH-01           | Engagement letter (to be finished) and multi-select quiz | a, c, e                              |
| ETH-02           | Single-choice quiz                                       | b                                    |

## Limits to mention in the report

Quiz locks are checked in the browser, so a student could brute-force a quiz with few options offline. Submitting the flag still goes through the server, which checks it, throttles guessing, and scores each challenge once.
