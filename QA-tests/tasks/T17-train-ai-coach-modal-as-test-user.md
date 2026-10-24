# T17-train-ai-coach-modal-as-test-user: AI Coach modal — modes, send, cooldown, Program Builder save, inbox, copy, clear

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/AICoachTab.jsx` (modal branch `isOpen && onClose`), opened from `src/components/TrainTab.jsx` (`Open AI Coach`); server `api/coach.js` |
| Flow | Open AI Coach → switch mode → send a quick prompt and a typed message → 8 s cooldown; Program Builder → SAVE TO MY PROGRAM; INBOX / MARK ALL READ, COPY FOR AI, CLEAR history |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | yes (minor): `CLEAR` wipes coach history with no confirmation; `SAVE TO MY PROGRAM` overwrites a day template. Throwaway account only |
| Estimated steps | 42 |

> Verification status: **source-derived (not browser-verified)**. Claude responses are non-deterministic, so assertions check structure (a `[ SYSTEM ]` bubble with non-empty text), not wording.

## Preconditions
- App running at `http://localhost:5173` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set. Otherwise mark all TCs **BLOCKED (needs Supabase)**.
- The `/api/*` routes must be served (e.g. `vercel dev`) with `ANTHROPIC_API_KEY` set for the API runtime. Check first: `fetch('/api/coach')` returns `200 {"ok":true}`. If it returns `500 {"ok":false}`, run only TC-05 "missing key" rows and mark the rest **BLOCKED (needs ANTHROPIC_API_KEY)**. If `/api` is not served at all, mark every send-dependent step BLOCKED.
- Signed in as `test-user`, a **throwaway** account (credentials via `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`; never inline them).
- **Quota budget:** `api/coach.js` allows **5 chat messages per user per week** (`questMessagesThisWeek`) and 10 requests/min. This task makes **3** billable sends (TC-01 ×2, TC-03 ×1); TC-05 quota/expired/offline rows add at most 1 more. Before running, ensure `state.questMessagesThisWeek ≤ 1` (reset it on the throwaway account if needed). Cached replies (TC-01 step 13) are free.
- Seed: onboarding complete; `aiCoachHistory = []`; `trainingDays` includes `mon`; a fresh browser context (empty `sessionStorage`, so no cached replies). `localStorage.fitquest_onboarding_complete = "true"`.
- Grant clipboard permissions (`clipboard-read`, `clipboard-write`) for TC-04.

## Test data
- `quickPrompt = "Fire me up!"` (Pre-Workout mode)
- `typedMessage = "Feeling a bit tired today, keep it short"` (typed in Pre-Workout after the first reply → follow-up)
- `buildPrompt = "Build my Monday push session"` (Program Builder quick prompt)
- `formPrompt = "squat"` (Form Tips; only in TC-05 if budget remains)
- `emptyMessage = ""` (allowed; mode default prompt is sent)

## Steps

### TC-01: Happy path — get a pre-workout pep talk, then a follow-up
1. Sign in as `test-user`. Navigate to `http://localhost:5173/?tab=train`.
2. Click **`Open AI Coach`**. Assert: `GET /api/coach` is sent; a `role=dialog` named `AI Coach` (`aria-modal="true"`) slides up with `Close AI Coach`, `AI COACH`, `Powered by Claude · Knows your data`, buttons `INBOX` and `COPY FOR AI`, and **no** `CLEAR` (history empty). No `API key not configured.` banner.
3. Assert: `role=group` `Coach mode` holds 7 buttons `Pre-Workout`, `Post-Session`, `Overload Plan`, `Form Tips`, `Check-in Review`, `Program Builder`, `Physique Analysis`; only `Pre-Workout` has `aria-pressed="true"`.
4. Assert: the mode card `PRE-WORKOUT` with text starting `Hit the button below to get a fired-up pre-workout pep talk tailored to Week {currentWeek}`; the hint `Optional: add a note (feeling tired? had a bad week?) or just hit →`; input placeholder `Feeling a bit tired today...`; Send button aria-label `Send`; quick prompts `Fire me up!`, `I'm feeling strong`, `Rough day, help`.
5. Click the quick prompt **`Fire me up!`**.
6. Assert immediately: a user bubble `Fire me up!`; `role=status` `Coach is thinking` with `[ SYSTEM ] ANALYZING`; the Send button aria-label `Sending` and `disabled`.
7. Assert: `POST /api/coach` with body `model: "claude-haiku-4-5"`, `max_tokens: 500`, a `system` string, and exactly one `messages` entry (one-shot mode); request carries an `Authorization: Bearer …` header. Response `200`.
8. Assert: the thinking bubble disappears; an assistant bubble headed `[ SYSTEM ]` with non-empty text appears; `CLEAR` is now visible in the header.
9. Assert: the Send button shows `8s` and aria-label `Wait 8 seconds`, `disabled`; it counts down to `1s` and then returns to `Send` (enabled) after ~8 s.
10. During the cooldown, type `typedMessage` and press **Enter**. Assert: nothing is sent (no new POST); the text stays in the input.
11. After the cooldown, press **Enter** again. Assert: a user bubble with `typedMessage`; a POST whose `messages` content is the raw `typedMessage` (follow-up path); a new assistant bubble; the input clears; cooldown restarts.
12. Close the dialog with `Close AI Coach`, reopen it. Assert: the history (2 user + 2 assistant bubbles in Pre-Workout) is still shown; reload the page, reopen; assert the history persisted (saved via `onSaveHistory`, last 20).
13. Cache: click **`CLEAR`** (see TC-04 for its checks) and wait for any cooldown to end. Click `Fire me up!` again. Assert: the reply appears **instantly** with **no** POST to `/api/coach` (served from `sessionStorage` key `fq-ai-pep-wk…`, 30-min TTL) and no cooldown starts.

### TC-02: Form validation — `ai-coach-input`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| userMessage | `""` or `"   "` → not an error: trimmed to empty and the mode's default prompt is sent; the user bubble shows the mode label (e.g. `Pre-Workout`) | identical prompt within 5 s → silently dropped (no POST, no bubble) | no maxLength; server clamps via `sanitizeAnthropicBody`. Do not spend quota testing this |
| Send during cooldown | Button `disabled`, Enter ignored | n/a | n/a |
| Send while loading | Button `disabled` (`Sending`); a second Enter is ignored | n/a | n/a |

Steps (no extra quota): the cooldown and loading rows are covered by TC-01 steps 6, 9 and 10. The whitespace row is covered without a real send in TC-05 (missing-key path), or by observation only.

### TC-03: Modal coverage — Program Builder save
1. Click mode **`Program Builder`**. Assert: `aria-pressed="true"` on it only; mode card `PROGRAM BUILDER`; hint `Describe the session you want — the AI will design and save it`; placeholder `e.g. Build me a Monday push session`; quick prompts `Build my Monday push session`, `Set up Wednesday pull day`, `Add lateral raises to Friday`, `Design a full body day`. Pre-Workout messages are hidden (history is filtered by mode).
2. Click **`Build my Monday push session`**. Assert: POST body has `max_tokens: 4000`, `tools[0].name = "save_day_program"`, `tool_choice.type = "auto"`.
3. Assert (when Claude calls the tool): a bubble `[ SYSTEM ] PROGRAM BUILDER`, a card titled `MONDAY PROGRAM PROPOSAL` (or `{n}-DAY PROGRAM PROPOSAL`), `{k} exercises`, numbered rows each showing `{kg}kg` or `BW` · `{sets}×{reps}` · rest · `RPE {n}`, and the button `SAVE TO MY PROGRAM` (or `SAVE ALL {n} DAYS TO MY PROGRAM`). If Claude replies with text only, record it and mark this step **INCONCLUSIVE** (model behaviour), not FAILED.
4. Nothing is saved yet: close the coach and assert the `Next workout:` / Monday exercises are unchanged. Reopen the coach, select `Program Builder`.
5. Click **`SAVE TO MY PROGRAM`**. Assert: the card header changes to `PROGRAM SAVED` with `Monday` beneath, a green check, and the save button disappears.
6. Close the coach. Assert: if Monday is the next training day, `Next workout: {title}` lists the proposed exercises (expand it). Otherwise verify `dayTemplates.mon` in the saved user state (Supabase `user_profiles.state`) matches the proposal. Reload; assert persistence.
7. Close paths: click the backdrop. Assert: the dialog closes. Reopen; press `Escape`. Assert and record: there is **no Escape handler**, so the dialog stays open (accessibility finding). Close with `Close AI Coach`.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Open AI Coach` | click | `AI Coach` dialog; `GET /api/coach` |
| each `Coach mode` button | click | Only that button `aria-pressed="true"`; mode card, hint, placeholder and quick prompts change (e.g. `Form Tips` → placeholder `squat  (or bench, rdl, etc.)`, prompts `Squat`, `Bench`, `RDL`, `Lat Pulldown`, `OHP`, `Leg Curl`) |
| `COPY FOR AI` | click | Label `COPIED!` for 2 s, then `COPY FOR AI`; clipboard holds the training report text (non-empty) |
| `INBOX` | click | Messages area replaced by the inbox; input hidden. Empty account → `NO MESSAGES YET` and `Quest will message you automatically after workouts, milestones, and on Mondays.` Click again → chat returns |
| `MARK ALL READ` | click (only if the account has unread agent messages: header `QUEST INBOX · {n} NEW`) | **Finding:** TrainTab does not pass `onMarkAgentRead` to AICoachTab, so this button calls `undefined` and nothing changes; the `NEW` tags remain. Record as a defect |
| `INBOX` unread badge | observe with unread agent messages | **Finding:** `unreadAgentCount` is not passed by TrainTab, so the badge inside the coach never shows, while the `Open AI Coach` button does show the count (capped `9+`). Record |
| `CLEAR` | click → (no confirm) | All coach bubbles across all modes disappear immediately; `CLEAR` hides; history saved as `[]` (persists after reload). Record the missing confirmation as a UX finding |
| `Close AI Coach` | click | Dialog closes |
| backdrop | click | Dialog closes |

### TC-05: Negative & edge cases
- **Missing API key** (run when `GET /api/coach` returns 500): open the coach. Assert the banner `API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables and redeploy.` Send `Fire me up!`. Assert: POST returns `500`, the error box `Error: API key not configured. Make sure your API key is configured.`, no cooldown starts (`Send` enabled). Within 5 s, click `Fire me up!` again. Assert: no new POST (duplicate drop). After 5 s it sends again. Whitespace row: type `"   "`, press Enter; assert the user bubble reads `Pre-Workout`.
- **Weekly quota exhausted:** on an account with `questMessagesThisWeek = 5`, send once. Assert: `429` and `Error: Weekly quest message limit reached (5/5).. Make sure your API key is configured.` (note the misleading API-key suffix; record as a UX defect).
- **Expired session:** clear the Supabase session from localStorage without reloading, then send. Assert: `Error: Session expired — please refresh the page.. Make sure your API key is configured.`
- **Network offline:** go offline and send. Assert an `Error: …` box; the thinking bubble disappears; `Send` re-enables.
- **XSS safety:** assistant text is HTML-escaped before `**bold**`/`*italic*` formatting. If the reply contains `<`, assert it renders literally (no injected elements).
- Opening the coach must not change the tab bar: the coach overlay is not reported via `onModalChange`, so the tab bar stays rendered under the backdrop; assert clicks on it are blocked by the overlay (z-index 9999).

## Assertions
- [ ] `Open AI Coach` opens a dialog named `AI Coach`; mode buttons are `aria-pressed` toggles.
- [ ] A quick prompt produces a user bubble, a `Coach is thinking` status, then a `[ SYSTEM ]` reply.
- [ ] The Send button becomes `Wait N seconds` / `{n}s` for 8 s after a reply; Enter is ignored during it.
- [ ] Repeat prompts within 30 min are served from cache with no POST.
- [ ] Program Builder shows a proposal and `SAVE TO MY PROGRAM` writes the day template (persists).
- [ ] COPY FOR AI → `COPIED!`; INBOX toggles; CLEAR wipes history.
- [ ] Findings recorded: no Escape close, MARK ALL READ no-op, INBOX badge never shown, CLEAR without confirm, error text suffix.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except the deliberate 429/500/401 cases in TC-05.

## Screenshots required
- Coach dialog on open (Pre-Workout)
- Thinking state, then the first reply with the `8s` cooldown
- Program proposal card, then `PROGRAM SAVED`
- Inbox empty state
- `API key not configured.` banner and error box (if run)
- Final state after CLEAR

## Pass criteria
All TCs above pass AND no unexpected console/network errors. Steps that depend on Claude choosing to call `save_day_program` are INCONCLUSIVE, not FAILED, if the model does not call it. Stay within the 5-message weekly quota.
