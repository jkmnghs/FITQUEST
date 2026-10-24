# Route: /?tab=train
Source: src/components/TrainTab.jsx · Analyzed 2026-10-24 · authMode none (auth wall browser-verified; tab body source-derived)

```json
{
  "route": "/?tab=train",
  "sourceFile": "src/components/TrainTab.jsx",
  "title": "FitQuest — AI-Powered Fitness Training",
  "finalUrl": "http://localhost:5173/?tab=train",
  "requiresAuth": true,
  "authFailed": true,
  "authFailedReason": "authMode 'none' and no credentials; the dev server has no VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY, so useAuth has no session and App renders LoginScreen instead of the tab shell. The URL stays /?tab=train with no redirect. initialTabFromUrl would resolve 'train' (it is on the NAV_TABS whitelist), but TrainTab is never mounted.",
  "rolesAllowed": [],
  "analyzedAsRole": "anonymous",
  "authWall": {
    "verification": "browser-verified (Playwright chromium, headless)",
    "description": "Full-screen LoginScreen: 'FITQUEST / YOUR GAMIFIED FITNESS COACH'. It has two mode toggles (SIGN IN / CREATE ACCOUNT, both type=submit buttons), an email+password form, FORGOT PASSWORD? and SIGN IN, and the footer 'Your data is securely stored in the cloud. Access your progress from any device.'",
    "forms": [
      {
        "id": "login-signin",
        "label": "Sign in",
        "fields": [
          { "name": "email", "type": "email", "required": false, "label": "EMAIL", "placeholder": "you@example.com", "autocomplete": "email", "validations": ["native type=email check (\"Please include an '@' in the email address...\")", "app check: empty -> 'Please enter your email and password.'"], "sampleValid": "qa.user@example.com", "sampleInvalid": "not-an-email" },
          { "name": "password", "type": "password", "required": false, "label": "PASSWORD", "placeholder": "••••••••", "autocomplete": "current-password", "validations": ["app check: empty -> 'Please enter your email and password.'"], "sampleValid": "Passw0rd!", "sampleInvalid": "" }
        ],
        "submit": { "label": "SIGN IN", "destructive": false },
        "observedErrors": ["Empty submit -> 'Please enter your email and password.'", "Native email validation blocks submit of 'not-an-email'. The earlier app error text stays on screen."]
      },
      {
        "id": "login-signup",
        "label": "Create account (shown after the CREATE ACCOUNT toggle)",
        "fields": [
          { "name": "name", "type": "text", "label": "YOUR NAME", "placeholder": "e.g. Alex", "sampleValid": "Alex", "sampleInvalid": "" },
          { "name": "email", "type": "email", "label": "EMAIL", "placeholder": "you@example.com", "sampleValid": "qa.new@example.com", "sampleInvalid": "bad@" },
          { "name": "password", "type": "password", "label": "PASSWORD", "placeholder": "Minimum 6 characters", "validations": ["min 6 chars (per placeholder/source)"], "sampleValid": "Passw0rd!", "sampleInvalid": "12345" },
          { "name": "confirmPassword", "type": "password", "label": "CONFIRM PASSWORD", "placeholder": "Repeat your password", "validations": ["must match password"], "sampleValid": "Passw0rd!", "sampleInvalid": "Mismatch1" }
        ],
        "submit": { "label": "CREATE ACCOUNT", "destructive": false }
      },
      {
        "id": "login-reset",
        "label": "Forgot password (shown after FORGOT PASSWORD?)",
        "fields": [ { "name": "email", "type": "email", "label": "EMAIL", "placeholder": "you@example.com", "sampleValid": "qa.user@example.com", "sampleInvalid": "nope" } ],
        "submit": { "label": "SEND RESET LINK", "destructive": false },
        "secondary": [ { "label": "BACK TO SIGN IN" } ]
      }
    ]
  },
  "elements": {
    "_note": "Everything below is source-derived (not browser-verified). The authenticated Train tab could not be reached. Sources: TrainTab.jsx, WorkoutTab.jsx, ExerciseModal.jsx, RestTimer.jsx, AICoachTab.jsx, ProgramCompleteModal.jsx, ui/ConfirmDialog.jsx, App.jsx. TrainTab does not import ProgramEditorTab, so ProgramEditorTab is not part of this route.",
    "forms": [
      {
        "id": "exercise-log-weighted",
        "verification": "source-derived (not browser-verified)",
        "label": "ExerciseModal set table (non-plank exercise); one row per set, columns #, KG/LBS, REPS, RPE, check",
        "container": "role=dialog aria-modal aria-label={exercise name}",
        "fields": [
          { "name": "weightKg[i]", "type": "number", "inputMode": "decimal", "required": false, "label": "unit column (KG/LBS)", "placeholder": "{displayWt} (prescribed weight)", "defaultValue": "prescribed display weight", "validations": ["no client error message; clamped to 0..1000 kg on complete; NaN -> 0; lbs converted to kg"], "sampleValid": "60", "sampleInvalid": "-5 (silently clamped to 0)" },
          { "name": "reps[i]", "type": "number", "inputMode": "numeric", "required": false, "label": "REPS", "placeholder": "{ex.reps}", "defaultValue": "", "validations": ["clamped to 0..100 on complete; NaN -> 0"], "sampleValid": "8", "sampleInvalid": "150 (silently clamped to 100)" },
          { "name": "rpe[i]", "type": "select", "required": false, "label": "RPE", "options": ["-", "6", "7", "8", "9", "10"], "defaultValue": "8", "sampleValid": "8", "sampleInvalid": "- (saved as 0)" }
        ],
        "rowActions": [ { "label": "Complete set N / Undo set N", "ariaPressed": true, "effect": "toggle done; checking a set that is not the last opens RestTimer after 300ms with ex.restSec" } ],
        "extraActions": [ { "label": "+ EXTRA SET", "effect": "appends a row marked isExtra (shown as 'N+')" } ],
        "submit": { "label": "COMPLETE EXERCISE", "destructive": false, "opens": "modal:exercise-complete-confirm" }
      },
      {
        "id": "exercise-log-plank",
        "verification": "source-derived (not browser-verified)",
        "label": "ExerciseModal set table (isPlank exercise); columns #, SECONDS, TIMER, check",
        "fields": [
          { "name": "time[i]", "type": "number", "inputMode": "numeric", "label": "SECONDS", "placeholder": "45-60", "validations": ["max(0, value) on complete"], "sampleValid": "45", "sampleInvalid": "-10 (clamped to 0)" }
        ],
        "rowActions": [ { "label": "▶ / '{n}s'", "effect": "first click starts the stopwatch; second click stops it and writes the elapsed seconds into time[i]" }, { "label": "Complete set N / Undo set N" } ],
        "submit": { "label": "COMPLETE EXERCISE", "destructive": false, "opens": "modal:exercise-complete-confirm" }
      },
      {
        "id": "exercise-picker-search",
        "verification": "source-derived (not browser-verified)",
        "label": "Add/Swap exercise picker search",
        "fields": [ { "name": "pickerSearch", "type": "text", "required": false, "placeholder": "Search exercises...", "validations": ["case-insensitive substring filter on name; no match -> 'No exercises found'"], "sampleValid": "press", "sampleInvalid": "zzzzqqq" } ],
        "submit": null
      },
      {
        "id": "ai-coach-input",
        "verification": "source-derived (not browser-verified)",
        "label": "AI Coach message input (Enter sends)",
        "fields": [ { "name": "userMessage", "type": "text", "required": false, "placeholder": "mode-dependent: pep 'Feeling a bit tired today...', analysis 'My squat felt heavy today...', overload 'Should I add 2.5kg to everything?', form 'squat  (or bench, rdl, etc.)', checkin 'Am I on track for my goal?', build 'e.g. Build me a Monday push session', physique 'Should I focus on fat loss or muscle?'", "validations": ["trimmed; empty allowed (a mode-default prompt is sent)", "8s cooldown after a successful response (button shows '{n}s', disabled)", "identical prompt within 5s is dropped", "non-build responses cached in sessionStorage for 30 min"], "sampleValid": "Fire me up!", "sampleInvalid": "(the same prompt resent within 5s is ignored)" } ],
        "submit": { "label": "Send (aria-label 'Send' / 'Sending' / 'Wait N seconds')", "destructive": false }
      }
    ],
    "buttons": [
      { "label": "Open AI Coach", "ariaLabel": "Open AI Coach", "text": "AI Coach · form tips & overload plan | new message", "destructive": false, "opens": "modal:ai-coach", "verification": "source-derived (not browser-verified)", "notes": "unread badge shows the count, capped at 9+; clicking also calls onMarkAgentRead and onOpenInbox" },
      { "label": "Previous week", "ariaLabel": "Previous week", "destructive": false, "disabledWhen": "viewingWeek <= 1", "verification": "source-derived (not browser-verified)" },
      { "label": "Next week", "ariaLabel": "Next week", "destructive": false, "disabledWhen": "viewingWeek >= currentWeek", "verification": "source-derived (not browser-verified)" },
      { "label": "Day dots ('{Day} complete — tap to clear' | '{Day} marked as skipped' | '{Day} missed — resolve it' | '{Day} upcoming')", "destructive": false, "opens": "modal:missed-day (only for done/skipped days)", "disabledWhen": "upcoming day", "verification": "source-derived (not browser-verified)" },
      { "label": "Session CTA (one at a time): BACK TO WEEK N | ASK YOUR COACH | SESSION COMPLETE (disabled) | FINISH SESSION · d/t | START SESSION | TAP AN EXERCISE TO LOG (disabled)", "destructive": false, "opens": "FINISH -> modal:finish-confirm; ASK YOUR COACH -> modal:ai-coach; START SESSION -> onStartSession (mutates state)", "verification": "source-derived (not browser-verified)" },
      { "label": "TRAIN ANYWAY →", "destructive": false, "visibleWhen": "rest day and current week", "opens": "inline overtraining warning with ASK COACH FIRST and TRAIN", "verification": "source-derived (not browser-verified)" },
      { "label": "ASK COACH FIRST", "destructive": false, "opens": "modal:ai-coach", "verification": "source-derived (not browser-verified)" },
      { "label": "TRAIN", "destructive": false, "effect": "overrides the rest day and shows exercise cards in loggable state", "verification": "source-derived (not browser-verified)" },
      { "label": "Week {n} of 12", "ariaExpanded": true, "destructive": false, "effect": "toggles the 12-week cycle map; its buttons are aria-label 'Week {wn}' with aria-current on the viewed week", "verification": "source-derived (not browser-verified)" },
      { "label": "Exercise card", "role": "button", "ariaLabel": "Log sets for {name}", "destructive": false, "opens": "modal:exercise", "keyboard": "Enter/Space", "gestures": "swipe left > 40px (touch or mouse drag) reveals SWAP/DELETE; swipe right > 20px hides them", "verification": "source-derived (not browser-verified)" },
      { "label": "Actions for {name}", "ariaHaspopup": "menu", "ariaExpanded": true, "destructive": false, "opens": "menu with SWAP and REMOVE (role=menuitem)", "verification": "source-derived (not browser-verified)" },
      { "label": "SWAP (swipe action / menuitem)", "destructive": false, "opens": "modal:exercise-picker (swap)", "verification": "source-derived (not browser-verified)" },
      { "label": "DELETE / REMOVE (swipe action / menuitem)", "destructive": true, "opens": "modal:confirm-remove-exercise", "verification": "source-derived (not browser-verified)" },
      { "label": "＋ ADD EXERCISE", "destructive": false, "opens": "modal:exercise-picker (add)", "visibleWhen": "not a rest-day preview", "verification": "source-derived (not browser-verified)" },
      { "label": "FINISH SESSION | FINISH SESSION · PERFECT!", "destructive": false, "opens": "modal:finish-confirm", "visibleWhen": "current week, session not finished, >= 1 exercise done", "verification": "source-derived (not browser-verified)" },
      { "label": "Go to current week (N)", "element": "span with onClick (not a button; not keyboard reachable)", "destructive": false, "visibleWhen": "viewing a past week", "verification": "source-derived (not browser-verified)" },
      { "label": "Next workout: {title}", "destructive": false, "effect": "accordion that lists the next training day's exercises with sets × reps", "visibleWhen": "next day has a template with exercises", "verification": "source-derived (not browser-verified)" }
    ],
    "links": [
      { "label": "Train (tab)", "href": "/?tab=train", "note": "App tab bar / desktop rail: role=tablist aria-label='Primary' buttons with aria-selected; not anchors", "verification": "source-derived (not browser-verified)" },
      { "label": "Fuel (tab)", "href": "/?tab=fuel", "verification": "source-derived (not browser-verified)" },
      { "label": "Progress (tab)", "href": "/?tab=progress", "verification": "source-derived (not browser-verified)" },
      { "label": "Profile (tab)", "href": "/?tab=profile", "verification": "source-derived (not browser-verified)" }
    ],
    "modals": [
      { "id": "exercise", "verification": "source-derived (not browser-verified)", "title": "{exercise name} (eyebrow 'EXERCISE' or 'DELOAD · EXERCISE')", "role": "dialog aria-modal", "close": ["Close (aria-label 'Close')", "Escape", "backdrop click"], "elements": { "chips": ["RPE {rpe|5-6}", "Rest {rest}"], "formTip": "rotating FORM tip banner when FORM_TIPS[exId] exists", "referenceStrip": "Last time / PR / live est. 1RM", "buttons": ["Plate calculator Show/Hide (barbell only, aria-expanded)", "bar options 20 kg/15 kg/10 kg (45/35/22 lb)", "+ EXTRA SET", "COMPLETE EXERCISE"], "forms": ["exercise-log-weighted | exercise-log-plank"], "completedState": "if already done: 'COMPLETED', 'x/y sets', volume, Max RPE (no inputs)", "footer": "'{done}/{total} sets checked' with a per-set progress strip" } },
      { "id": "exercise-complete-confirm", "verification": "source-derived (not browser-verified)", "title": "Complete Exercise?", "elements": { "text": ["{exName}", "{done}/{total} sets checked", "Heads up: N prescribed set(s) not checked"], "buttons": ["CANCEL", "COMPLETE (calls onCompleteExercise, which mutates state)"] } },
      { "id": "rest-timer", "verification": "source-derived (not browser-verified)", "title": "Rest timer, m:ss left (aria-label)", "role": "dialog aria-modal", "elements": { "text": ["RECOVERING|READY", "{exName}", "Rest after Set i of n", "m:ss | GO!", "REST | NEXT SET"], "buttons": ["SKIP", "+30s (while counting)", "NEXT SET → (when done)"], "sideEffects": "Web Audio beep and navigator.vibrate at 0" } },
      { "id": "exercise-picker", "verification": "source-derived (not browser-verified)", "title": "ADD EXERCISE | SWAP — {name} (aria-label 'Add exercise' / 'Swap exercise')", "role": "dialog aria-modal", "close": ["CANCEL", "backdrop click"], "elements": { "inputs": ["Search exercises..."], "tabs": ["ALL", "one tab per category from getPickerCategories(assessment.equipment)"], "list": "exercise buttons (BW badge for bodyweight/plank). In add mode existing ones are excluded; in swap mode the current one is excluded. Click calls onSwapExercise (mutates state).", "empty": "No exercises found" } },
      { "id": "confirm-remove-exercise", "verification": "source-derived (not browser-verified)", "title": "Remove {name}?", "role": "dialog aria-modal aria-labelledby=fq-confirm-title", "elements": { "message": "It comes off this training day. You can add it back any time from + ADD EXERCISE.", "buttons": ["CANCEL", "REMOVE (destructive)"], "keyboard": "Escape cancels" } },
      { "id": "finish-confirm", "verification": "source-derived (not browser-verified)", "title": "Finish Today's Session?", "elements": { "text": ["{done}/{total} exercises completed", "This will lock in your session for Week N.", "Skipped: ..."], "buttons": ["CANCEL", "FINISH (calls onFinishSession, which mutates state; on cycle week 12 last session it opens program-complete after 2s)"] } },
      { "id": "missed-day", "verification": "source-derived (not browser-verified)", "title": "{Day} · Week {n} (aria-label '{Day}, week {n}')", "role": "dialog aria-modal", "close": ["CANCEL", "backdrop click"], "elements": { "variants": { "done": ["CLEAR THIS DAY (destructive-ish: removes the session)"], "markedSkipped": ["UNDO SKIP"], "missed": ["I DID IT — LOG IT | LOG IT FOR THAT WEEK (backfill)", "MARK AS SKIPPED"] } } },
      { "id": "program-complete", "verification": "source-derived (not browser-verified)", "title": "Program complete celebration", "elements": { "buttons": ["CONTINUE SAME PROGRAM", "SWITCH PROGRAM -> one button per program in PROGRAMS ('(current)' marked)", "← BACK"] } },
      { "id": "ai-coach", "verification": "source-derived (not browser-verified)", "title": "AI Coach (aria-label)", "role": "dialog aria-modal (bottom sheet)", "close": ["Close AI Coach", "backdrop click"], "elements": { "header": "AI COACH · Powered by Claude · Knows your data", "buttons": ["INBOX (toggles Quest inbox)", "COPY FOR AI -> COPIED! (clipboard, with execCommand fallback)", "CLEAR (only when history exists; wipes coach history)", "MARK ALL READ (inside inbox when unread)", "SAVE TO MY PROGRAM | SAVE ALL N DAYS TO MY PROGRAM (on a program_preview message in build mode)"], "modeGroup": "role=group aria-label='Coach mode', aria-pressed buttons: Pre-Workout, Post-Session, Overload Plan, Form Tips, Check-in Review, Program Builder, Physique Analysis", "quickPrompts": { "pep": ["Fire me up!", "I'm feeling strong", "Rough day, help"], "analysis": ["How'd I do?", "What to focus on next?"], "overload": ["What increases next?", "Explain the logic", "Am I progressing well?"], "form": ["Squat", "Bench", "RDL", "Lat Pulldown", "OHP", "Leg Curl"], "checkin": ["Am I on track?", "Weight trend ok?", "Halfway check"], "build": ["Build my Monday push session", "Set up Wednesday pull day", "Add lateral raises to Friday", "Design a full body day"], "physique": ["Analyze my physique", "Should I cut or bulk?", "Am I recomping?", "What does my BMI say?"] }, "states": ["ThinkingBubble role=status aria-label='Coach is thinking'", "Error: {msg}. Make sure your API key is configured.", "API key not configured banner when GET /api/coach returns 500", "Inbox empty: NO MESSAGES YET"], "forms": ["ai-coach-input"] } }
    ],
    "tabs": [
      { "id": "primary-nav", "type": "role=tablist (App)", "items": ["Train", "Fuel", "Progress", "Profile"], "hiddenWhen": "any WorkoutTab modal is open (onModalChange)", "verification": "source-derived (not browser-verified)" },
      { "id": "coach-modes", "type": "aria-pressed button group", "items": ["Pre-Workout", "Post-Session", "Overload Plan", "Form Tips", "Check-in Review", "Program Builder", "Physique Analysis"], "verification": "source-derived (not browser-verified)" },
      { "id": "picker-categories", "type": "button row", "items": ["ALL", "...equipment-filtered categories"], "verification": "source-derived (not browser-verified)" }
    ],
    "tables": [
      { "id": "recent-sessions", "verification": "source-derived (not browser-verified)", "columns": ["Name", "Date · Wk N", "+XP"], "limit": 5, "empty": "No sessions logged yet. Your journey starts now.", "sortable": false, "filterable": false, "pagination": false, "rowActions": [] },
      { "id": "exercise-cards", "verification": "source-derived (not browser-verified)", "columns": ["Name (+ overload badge ↑ +2.5 / = SAME / ↓ DELOAD)", "XP or DONE", "sets × reps @ weight unit", "RPE", "rest", "Last / PR"], "rowActions": ["Log sets", "SWAP", "REMOVE"] },
      { "id": "finish-area-summary", "verification": "source-derived (not browser-verified)", "columns": ["Exercise", "setsCompleted/setsPrescribed"], "footer": "{pct}% · d/t exercises • +{bonus} bonus XP" }
    ]
  },
  "flows": [
    "Unauthenticated visit to /?tab=train shows the LoginScreen; the tab content is never rendered (browser-verified)",
    "Login wall: an empty SIGN IN shows 'Please enter your email and password.' (browser-verified)",
    "Login wall: switch to CREATE ACCOUNT, then FORGOT PASSWORD?, then BACK TO SIGN IN (browser-verified)",
    "Start a session: START SESSION; the elapsed timer appears in the hero",
    "Log a weighted exercise: tap the card, edit weight/reps/RPE, check sets (rest timer opens between sets), COMPLETE EXERCISE, then COMPLETE in the confirm",
    "Use the rest timer: SKIP, +30s, NEXT SET → when it reaches 0",
    "Log a plank: ▶ starts the stopwatch, stopping fills SECONDS, check set, complete",
    "Add an extra set ('N+' row) and the plate calculator with a bar-size toggle (barbell lifts only)",
    "Close the exercise modal with ×, Escape, or a backdrop click; in-progress sets survive a reopen",
    "Add exercise: ＋ ADD EXERCISE, search/filter by category, pick one",
    "Swap exercise via the ⋯ menu or a swipe, then pick a replacement",
    "Remove exercise via the ⋯ menu, then the REMOVE confirm (destructive; cancel it during analysis)",
    "Finish session: FINISH SESSION, then the FINISH confirm (shows skipped exercises); on the final week-12 session the program-complete modal follows",
    "Program complete: CONTINUE SAME PROGRAM or SWITCH PROGRAM, then pick a program",
    "Navigate weeks: Previous/Next week, the 'Week n of 12' cycle map, BACK TO WEEK N, Go to current week",
    "Resolve a missed day: tap a red day dot, then LOG IT / MARK AS SKIPPED / CANCEL; a done day offers CLEAR THIS DAY; a skipped day offers UNDO SKIP",
    "Rest day: ASK YOUR COACH, or TRAIN ANYWAY → warning → TRAIN (override) or ASK COACH FIRST",
    "Expand the Next workout preview accordion",
    "AI Coach: open, switch mode, send a quick prompt or typed message, then the 8s cooldown",
    "AI Coach Program Builder: request a day, then SAVE TO MY PROGRAM on the preview",
    "AI Coach: INBOX toggle, MARK ALL READ, COPY FOR AI, CLEAR history"
  ],
  "assertions": [
    "Without auth, /?tab=train renders the 'SIGN IN' / 'CREATE ACCOUNT' login wall and the URL stays /?tab=train (browser-verified)",
    "Empty login submit shows 'Please enter your email and password.' (browser-verified)",
    "Email 'not-an-email' is blocked by native validation (browser-verified). Finding: the previous app error text is not cleared.",
    "Sign-up mode shows YOUR NAME, EMAIL, PASSWORD ('Minimum 6 characters'), CONFIRM PASSWORD (browser-verified)",
    "Authenticated: the 'Open AI Coach' button is first in the tab and opens a dialog named 'AI Coach'",
    "Hero CTA shows START SESSION before the session starts and 'FINISH SESSION · d/t' after >= 1 exercise is done",
    "Previous week is disabled on week 1; Next week is disabled on the current week",
    "Clicking an exercise card opens a dialog whose accessible name is the exercise name; Escape closes it",
    "Checking set 1 of n (n > 1) opens the 'Rest timer' dialog with 'Rest after Set 1 of n'",
    "+ EXTRA SET adds a row labelled 'N+'",
    "COMPLETE EXERCISE opens the 'Complete Exercise?' confirm with 'Heads up: N prescribed set(s) not checked' when sets are unchecked",
    "The REMOVE action opens the 'Remove {name}?' confirm; CANCEL leaves the card in place",
    "The picker search with a nonsense query shows 'No exercises found'",
    "The tab bar is hidden while any WorkoutTab modal is open",
    "Recent Sessions shows the empty state 'No sessions logged yet. Your journey starts now.' for a new user",
    "AI Coach send button becomes disabled with a '{n}s' countdown after a response",
    "Source observation: TrainTab renders AICoachTab without unreadAgentCount, onMarkAgentRead or onOpenInbox. The INBOX badge inside the coach never shows, and the inbox 'MARK ALL READ' button calls an undefined handler.",
    "Source observation: 'Go to current week (N)' is a clickable span, not a button, so keyboard users cannot reach it"
  ],
  "api": [
    { "method": "GET", "url": "http://localhost:5173/?tab=train", "status": 200, "verification": "browser-verified" },
    { "method": "GET", "url": "https://fonts.googleapis.com/css2?family=Orbitron...&family=Inter...", "status": 200, "verification": "browser-verified" },
    { "method": "GET", "url": "/fq-emblem.png", "status": null, "verification": "browser-verified (request observed)" },
    { "method": "GET", "url": "/api/coach", "status": null, "note": "Sent when the AI Coach modal opens, to detect the API key (500 = missing)", "verification": "source-derived (not browser-verified)" },
    { "method": "POST", "url": "/api/coach", "status": null, "note": "authPostJSON with { model: 'claude-haiku-4-5', system, messages, tools?: [save_day_program] }. Handles 429 and 401.", "verification": "source-derived (not browser-verified)" },
    { "method": "*", "url": "Supabase (state load/save, auth)", "status": null, "note": "Not configured on this dev server; needed for seeding an authenticated Train tab", "verification": "source-derived (not browser-verified)" }
  ],
  "console": {
    "errors": [],
    "warnings": [ "[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled" ]
  },
  "artifacts": {
    "screenshot": "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-train/train.png",
    "scripts": [ "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-train/run.js", "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-train/probe.js" ]
  }
}
```
