# Route: /?tab=progress
Source: src/components/ProgressTab.jsx · Analyzed 2026-10-24 · authMode none (auth wall browser-verified; tab body source-derived + isolated-mount harness)

```json
{
  "route": "/?tab=progress",
  "sourceFile": "src/components/ProgressTab.jsx",
  "title": "FitQuest — AI-Powered Fitness Training",
  "requiresAuth": true,
  "authFailed": true,
  "authWall": {
    "verification": "browser-verified (Playwright chromium, headless, settleMs 1000)",
    "urlAfterLoad": "http://localhost:5173/?tab=progress (no redirect; App.jsx renders <LoginScreen> in place when useAuth().user is null)",
    "reason": "authMode 'none', and the dev server has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, so supabase is null and useAuth().signIn/signUp return false without making a network call. The authenticated Progress tab cannot be reached in the real app.",
    "observed": "Login wall reads 'FITQUEST / YOUR GAMIFIED FITNESS COACH'. Mode toggle buttons are SIGN IN and CREATE ACCOUNT. The form has EMAIL (type=email, placeholder 'you@example.com', autocomplete=email) and PASSWORD (type=password, placeholder '••••••••', autocomplete=current-password). Below them are a FORGOT PASSWORD? button, a SIGN IN submit button, and the footer 'Your data is securely stored in the cloud. Access your progress from any device.' The page has no headings (h1-h3) and no links.",
    "validationProbed": [
      {"action": "submit empty sign-in", "result": "'Please enter your email and password.'"},
      {"action": "submit email 'bad' / password 'x'", "result": "Native type=email validation blocks the submit. The earlier error text stays on screen."},
      {"action": "submit well-formed email/password", "result": "Nothing happens: no error, no navigation, no request. signIn returns false because supabase is null. This is a silent failure with no feedback to the user."}
    ],
    "otherModes": {
      "createAccount": "Fields: YOUR NAME (placeholder 'e.g. Alex'), EMAIL, PASSWORD (placeholder 'Minimum 6 characters'), CONFIRM PASSWORD (placeholder 'Repeat your password'). Submit button: CREATE ACCOUNT. Validators in source (LoginScreen.jsx:53-56): 'Please enter your email and password.', 'Please enter your name.', 'Passwords do not match.', 'Password must be at least 6 characters.'",
      "forgotPassword": "Text 'Enter your email and we'll send you a link to reset your password.', an EMAIL field, and buttons SEND RESET LINK and BACK TO SIGN IN. Empty email gives 'Please enter your email address.' (source)."
    },
    "screenshots": [
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-progress/auth-wall.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-progress/forgot.png"
    ]
  },
  "rolesAllowed": [],
  "analyzedAsRole": "anonymous",
  "verificationNote": "Every element below is source-derived (not browser-verified) in the real authenticated app. As an extra check, ProgressTab was mounted in isolation in the same browser. The harness imported /src/components/ProgressTab.jsx through the Vite dev server, rendered it into a detached root with a fixture state, and used a stub onSubmitCheckin. No project files were changed. Elements marked 'harness-verified' rendered and behaved as described in that isolated mount. Harness screenshot: /tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-progress/progress-mounted.png",
  "elements": {
    "forms": [
      {
        "id": "weekly-checkin",
        "label": "Week {currentWeek} Check-in / Weekly Measurements (CheckinTab.jsx)",
        "verification": "source-derived (not browser-verified); harness-verified",
        "formElement": "None. The inputs sit inside <label> wrappers, so there is no <form>. Submitting is an onClick on a <button> and pressing Enter does not submit.",
        "fields": [
          {"name": "weight", "type": "number", "required": true, "label": "Weight", "accessibleName": "Weight {unit}", "placeholder": "e.g. 70.0", "unit": "state.unit (kg|lbs)", "step": "0.1", "min": "1", "max": "500", "inputMode": "decimal", "default": "This week's check-in weight, else the latest check-in weight, else ''", "validations": ["parseFloat(weight) must be > 0 and <= 500; otherwise 'Enter a valid weight between 1–500 {unit}'"], "sampleValid": "79.5", "sampleInvalid": "600", "verification": "source-derived (not browser-verified); harness-verified (0 and 600 both show the error)"},
          {"name": "waist", "type": "number", "required": false, "label": "Waist", "accessibleName": "Waist cm", "placeholder": "Optional — in cm", "unit": "cm", "step": "0.1", "min": "0", "max": "250", "inputMode": "decimal", "default": "This week's waist if > 0, else ''", "validations": ["Blank or 0 is allowed", "If > 0 it must be between max(55, round(heightCm*0.30)) and 250; otherwise 'Enter {minWaist}–250 cm, or leave blank. Measure in centimetres around your navel — not inches or pant size.'", "A negative value gives 'Enter a valid waist measurement'"], "sampleValid": "86", "sampleInvalid": "32", "verification": "source-derived (not browser-verified); harness-verified DEFECT: any waist > 0 throws 'ReferenceError: getHeightCm is not defined' (CheckinTab.jsx:45 calls getHeightCm, but the file never imports it from ../utils/bodyMetrics). No error message appears and onSubmit is never called, so a check-in that includes a waist value cannot be saved, whether the value is valid (86) or invalid (32)."},
          {"name": "sleep", "type": "number", "required": false, "label": "Sleep", "accessibleName": "Sleep hrs/night", "placeholder": "Optional", "unit": "hrs/night", "step": "0.5", "min": "0", "max": "24", "inputMode": "decimal", "default": "This week's sleep if > 0, else ''", "validations": ["If not blank, it must be a number between 0 and 24; otherwise 'Enter a valid sleep value (0–24 hours)'"], "sampleValid": "7.5", "sampleInvalid": "30", "verification": "source-derived (not browser-verified); harness-verified"}
        ],
        "submit": {"label": "SAVE CHECK-IN (+25 XP) | UPDATE CHECK-IN (this week already checked in) | OVERWRITE CHECK-IN (confirm step)", "destructive": false, "notes": "If this week already has a check-in, the first valid click only reveals a gold warning: 'Already checked in Week N (W unit). Tap again to overwrite.' The second click calls onSubmitCheckin(weight, waist, sleep). On success the form is replaced by 'CHECK-IN SAVED! +25 XP', or 'CHECK-IN SAVED! UPDATED' for a repeat check-in. Changing the weight field resets the overwrite prompt. This mutates state: submitCheckin in useGameState.js:999 recomputes BMI, adds a log entry, calls addXP(25), and calls cloudSet(userId, ...).", "verification": "source-derived (not browser-verified); harness-verified (save with no waist gives 'CHECK-IN SAVED! +25 XP' and the stub received [79.5, 0, 0])"}
      }
    ],
    "standaloneInputs": [
      {"id": "weekly-success-checklist", "type": "checkbox-group (button role=checkbox, aria-checked)", "items": ["3/3 workouts completed", "Progressive overload on 2+ exercises", "155g+ protein on 6/7 days", "7+ hours sleep on 5/7 nights", "Followed exact set prescription (no extras)", "Tracked all workouts in FitQuest"], "behavior": "Each item toggles in local state only and is not saved. The score line reads 'N/6 completed' and appends ' · PERFECT WEEK!' at 6/6. Its colour is green at 5 or more and cyan at 3 or more. The aria-hidden progress segments fill as items are checked.", "verification": "source-derived (not browser-verified); harness-verified (6 checkboxes; clicking one sets aria-checked=true and shows '1/6 completed')"}
    ],
    "buttons": [
      {"label": "‹", "ariaLabel": null, "destructive": false, "opens": "SummaryTab: previous week (viewWeek = max(1, viewWeek-1))", "verification": "source-derived (not browser-verified); harness-verified. a11y gap: the only accessible name is the glyph '‹'"},
      {"label": "›", "ariaLabel": null, "destructive": false, "opens": "SummaryTab: next week (viewWeek = min(currentWeek, viewWeek+1))", "verification": "source-derived (not browser-verified); harness-verified (clamps at currentWeek). a11y gap: the only accessible name is the glyph '›'"},
      {"label": "SAVE CHECK-IN (+25 XP) / UPDATE CHECK-IN / OVERWRITE CHECK-IN", "destructive": false, "opens": "Inline overwrite warning, then the saved state", "verification": "source-derived (not browser-verified); harness-verified"},
      {"label": "Checklist row x6 (role=checkbox)", "destructive": false, "opens": null, "verification": "source-derived (not browser-verified); harness-verified"},
      {"label": "App nav tab 'Progress' (Header/App NAV_TABS: train, fuel, progress, profile)", "destructive": false, "opens": "tab:progress", "verification": "source-derived (not browser-verified)"}
    ],
    "links": [],
    "modals": [],
    "tabs": [
      {"id": "app-nav", "panels": ["train", "fuel", "progress", "profile"], "notes": "The ?tab= value is whitelisted against NAV_TABS by initialTabFromUrl; an unknown value falls back to 'train'. The Progress panel is wrapped in LazyTab (Suspense with ProgressTabSkeleton as the fallback).", "verification": "source-derived (not browser-verified)"}
    ],
    "sections": [
      {"id": "weekly-summary", "header": "Weekly Summary", "content": "Week selector; 'WEEK N RECAP' card showing Sessions 'count/sessionsPerWeek', Avg Completion %, XP Earned, and Weight Change ('—' unless this week and the previous week both have check-ins); highlight list (all sessions completed, 'Ready to increase: …', 'Repeat weight: …', and 'Check-in: W unit' or 'No check-in yet this week'); SESSION BREAKDOWN list when sessions exist", "verification": "source-derived (not browser-verified); harness-verified"},
      {"id": "body-metrics", "header": "Body Metrics", "condition": "state.bmi && state.assessment", "content": "BMI MetricBox (category derived live: <18.5 Underweight, <25 Normal, <30 Overweight, else Obese; note 'WHO standard cutoffs'). Weight MetricBox (latest check-in or assessment weight, with a delta tag or 'Starting'). Waist/Ht MetricBox, shown only if a waist is known ('Elevated' at 0.5 or above, otherwise 'Healthy'; note '< 0.5 = low risk'). Baseline row: Height, Age, Sex, Goal. BMI scale bar from 14 to 40 with UNDER/NORMAL/OVER/OBESE labels and 18.5/25/30 ticks.", "verification": "source-derived (not browser-verified); harness-verified", "notes": "Source suspicion: the Weight MetricBox always appends ' kg' and subtracts assessment.weightKg from the latest check-in weight. For users with unit=lbs it shows the lbs value labelled kg and a delta that mixes units."},
      {"id": "checkin", "header": "Week {currentWeek} Check-in", "content": "CheckinTab: day banner ('✓ It's Sunday — check-in day!' or 'Today is {Day} · Sunday is the recommended check-in day'), the weekly-checkin form, the Weekly Success Checklist, and Check-in History (last 8 entries, newest first: Week N, date, weight, waist cm, sleep h)", "verification": "source-derived (not browser-verified); harness-verified", "notes": "The title 'Week N Check-in' renders twice: once from ProgressTab's SectionHeader and once from CheckinTab's SectionTitle (harness-verified)."},
      {"id": "stats-trends", "header": "Stats & Trends", "content": "Power Stats tiles: Total XP, Sessions, Volume ({unit}) in thousands with 'k', Best Streak; all use CountUp. Weight Trend SVG chart with Start, Current, Change and Rate/wk. It needs at least 2 check-ins; otherwise it shows 'No check-ins yet' or 'Need one more check-in'. Waist Trend chart needs at least 2 waist entries. Sleep Trend chart needs at least 1 sleep entry and draws a 7h target line, with Last, Avg and Target. Personal Records list, or 'Complete workouts to set your first PRs!'. Lift Progression cards: exercise name, ↑ +2.5 / = REPEAT / ↓ DELOAD tag, current weight, +gain, PR badge, progress bar.", "verification": "source-derived (not browser-verified); harness-verified", "notes": "The empty-state copy says 'Tap the More → Check-in tab every Sunday.' NAV_TABS has no 'More' tab, so this copy is stale."}
    ],
    "tables": [
      {"id": "checkin-history", "columns": ["Week", "Date", "Weight", "Waist (cm)", "Sleep (h)"], "sortable": false, "filterable": false, "pagination": false, "rowActions": [], "notes": "Last 8 entries, newest first; rendered as divs, not a <table>", "verification": "source-derived (not browser-verified); harness-verified"},
      {"id": "personal-records", "columns": ["Exercise", "Week • Date", "Weight"], "sortable": false, "filterable": false, "pagination": false, "rowActions": [], "notes": "Sorted by weight descending; plank exercises are excluded", "verification": "source-derived (not browser-verified)"},
      {"id": "session-breakdown", "columns": ["Session N", "Date", "Completion %"], "sortable": false, "filterable": false, "pagination": false, "rowActions": [], "verification": "source-derived (not browser-verified)"}
    ]
  },
  "flows": [
    "Unauthenticated visit to /?tab=progress renders the LoginScreen in place (browser-verified)",
    "Authenticated deep link /?tab=progress opens the Progress tab directly via the initialTabFromUrl whitelist (source-derived)",
    "Browse past weeks in the Weekly Summary with ‹ and ›, clamped to the range 1..currentWeek (source-derived; harness-verified)",
    "Submit a weekly check-in with weight only and get 'CHECK-IN SAVED! +25 XP' (source-derived; harness-verified)",
    "Submit a weekly check-in with weight, waist and sleep (source-derived; currently broken: ReferenceError getHeightCm, harness-verified)",
    "Re-submit this week's check-in: UPDATE CHECK-IN, then the overwrite warning, then OVERWRITE CHECK-IN, then 'CHECK-IN SAVED! UPDATED' (source-derived)",
    "Toggle the Weekly Success Checklist items and watch the N/6 score and PERFECT WEEK! (source-derived; harness-verified)",
    "View the Body Metrics BMI, Weight and Waist/Ht cards and the BMI scale (source-derived; harness-verified)",
    "View Stats & Trends: power stats, weight/waist/sleep charts with their empty states, PRs, lift progression (source-derived; harness-verified)"
  ],
  "assertions": [
    "Unauthenticated: /?tab=progress shows the 'SIGN IN' / 'CREATE ACCOUNT' login wall and no Progress content (browser-verified)",
    "Unauthenticated: an empty SIGN IN submit shows 'Please enter your email and password.' (browser-verified)",
    "Without Supabase env vars, a well-formed SIGN IN gives no feedback at all (browser-verified; silent failure)",
    "Weight 0 or 600 shows 'Enter a valid weight between 1–500 kg' (harness-verified)",
    "Sleep 30 shows 'Enter a valid sleep value (0–24 hours)' (harness-verified)",
    "Waist 32 with heightCm 180 should show 'Enter 55–250 cm, or leave blank. …' (source-derived). Actual: a ReferenceError is thrown and no message appears (harness-verified DEFECT)",
    "A valid weight-only check-in calls onSubmitCheckin(79.5, 0, 0) and shows 'CHECK-IN SAVED! +25 XP' (harness-verified)",
    "When this week already has a check-in, the first click shows 'Already checked in Week N … Tap again to overwrite.' and the button becomes 'OVERWRITE CHECK-IN' (source-derived)",
    "The checklist renders 6 role=checkbox rows; clicking one toggles aria-checked and the score becomes '1/6 completed' (harness-verified)",
    "Body Metrics is hidden when state.bmi is falsy (source-derived)",
    "The Weight Trend chart shows 'No check-ins yet' with 0 check-ins and 'Need one more check-in' with 1 (source-derived; harness-verified for 1)",
    "The 'Week N Check-in' heading is duplicated (harness-verified; cosmetic)",
    "Known defect: CheckinTab.jsx:45 references getHeightCm without importing it, so any waist > 0 makes saving impossible (harness-verified)"
  ],
  "api": [
    {"method": "GET", "url": "http://localhost:5173/?tab=progress", "status": 200},
    {"method": "GET", "url": "https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=Inter:wght@400..700&display=swap", "status": 200},
    {"method": "N/A (source-derived)", "url": "Supabase auth signInWithPassword / signUp / resetPasswordForEmail; never called because supabase is null", "status": null},
    {"method": "N/A (source-derived)", "url": "cloudSet(userId, state) Supabase upsert after a check-in is submitted (useGameState.js submitCheckin)", "status": null}
  ],
  "console": {
    "errors": [
      "ReferenceError: getHeightCm is not defined (harness only, when saving a check-in with waist > 0)"
    ],
    "warnings": [
      "[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled"
    ]
  }
}
```
