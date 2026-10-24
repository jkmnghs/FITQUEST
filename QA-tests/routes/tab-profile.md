# Route: /?tab=profile
Source: src/components/ProfileTab.jsx · Analyzed 2026-10-24 · authMode none (auth wall browser-verified; tab body source-derived)

```json
{
  "route": "/?tab=profile",
  "sourceFile": "src/components/ProfileTab.jsx",
  "title": "FitQuest — AI-Powered Fitness Training",
  "requiresAuth": true,
  "authFailed": true,
  "authWall": {
    "observed": "browser-verified (Playwright chromium, headless, settle 1000ms)",
    "finalUrl": "http://localhost:5173/?tab=profile",
    "redirected": false,
    "description": "No redirect happens. App.jsx returns <LoginScreen> in place of the app shell whenever useAuth().user is null, so Header, the tab bar and ProfileTab never mount. The ?tab=profile query is kept in the URL, so initialTabFromUrl would pick 'profile' after sign-in. With no VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY set, supabase is null and signing in is impossible. authMode was 'none' and no credentials were supplied.",
    "reason": "authMode none + Supabase env vars missing in dev server",
    "loginWallElements": {
      "modeToggles": [{ "label": "SIGN IN", "type": "submit" }, { "label": "CREATE ACCOUNT", "type": "submit" }],
      "form": {
        "fields": [
          { "label": "EMAIL", "type": "email", "placeholder": "you@example.com", "required": false },
          { "label": "PASSWORD", "type": "password", "placeholder": "••••••••", "required": false }
        ],
        "buttons": [{ "label": "FORGOT PASSWORD?", "type": "button" }, { "label": "SIGN IN", "type": "submit" }]
      },
      "validationProbe": [
        { "action": "submit empty", "result": "Inline error 'Please enter your email and password.' (JS validator, not native required)" },
        { "action": "email='not-an-email', password='x'", "result": "Native type=email constraint blocks submit. The earlier inline error stays on screen (stale message, never cleared)" }
      ],
      "otherSourceValidators": ["signup: 'Please enter your name.'", "signup: 'Passwords do not match.'", "signup: 'Password must be at least 6 characters.'", "forgot: 'Please enter your email address.'"]
    },
    "screenshots": [
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-profile/initial.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-profile/auth-wall-after-probe.png"
    ]
  },
  "rolesAllowed": [],
  "analyzedAsRole": "anonymous",
  "guards": ["useAuth (user null -> LoginScreen; passwordRecovery -> SetPasswordScreen; cloudLoading/bootHold -> SyncIndicator; cloudLoadFailed -> CloudLoadFailedScreen)", "initialTabFromUrl (NAV_TABS whitelist: train|fuel|progress|profile, else 'train')", "LazyTab (Suspense, fallback ProfileTabSkeleton)"],
  "verificationNote": "Every element under 'elements', 'flows' and 'assertions' comes from reading the source and is NOT browser-verified, because the authenticated UI could not be reached. Each entry carries provenance 'source-derived (not browser-verified)'.",
  "elements": {
    "sections": [
      { "heading": "Warrior Rank", "component": "RankTab", "interactive": false, "provenance": "source-derived (not browser-verified)" },
      { "heading": "My Program", "component": "ProgramEditorTab", "provenance": "source-derived (not browser-verified)" },
      { "heading": "Achievements", "component": "AchievementsTab (OtherTabs.jsx)", "interactive": false, "notes": "Grid of achievements, locked ones show 'Locked'", "provenance": "source-derived (not browser-verified)" },
      { "heading": "Settings", "component": "SettingsTab (OtherTabs.jsx)", "groups": ["Account (only if userEmail)", "Preferences", "Notifications", "Training data", "Danger zone"], "provenance": "source-derived (not browser-verified)" }
    ],
    "forms": [
      {
        "id": "change-password",
        "label": "Account > CHANGE PASSWORD panel (not a <form>; inline panel)",
        "visibleWhen": "userEmail && onChangePassword, toggled by CHANGE PASSWORD button",
        "fields": [
          { "name": "pwCurrent", "type": "password", "label": "Current password", "autoComplete": "current-password", "required": false, "validations": ["server: verified via signInWithPassword -> 'Current password is incorrect.'"], "sampleValid": "<the user's current password>", "sampleInvalid": "wrong-password-123", "provenance": "source-derived (not browser-verified)" },
          { "name": "pwNext", "type": "password", "label": "New password", "autoComplete": "new-password", "validations": ["length >= 6 -> 'New password must be at least 6 characters.'"], "sampleValid": "NewPass#2026", "sampleInvalid": "abc", "provenance": "source-derived (not browser-verified)" },
          { "name": "pwConfirm", "type": "password", "label": "Confirm new password", "autoComplete": "new-password", "validations": ["must equal pwNext -> 'New passwords do not match.'"], "sampleValid": "NewPass#2026", "sampleInvalid": "NewPass#2027", "provenance": "source-derived (not browser-verified)" }
        ],
        "submit": { "label": "UPDATE PASSWORD", "busyLabel": "UPDATING...", "destructive": false, "mutates": "supabase.auth.updateUser({password})", "successText": "Password updated. (panel auto-closes after 1800ms)", "errorSource": "authError from useAuth (e.g. 'Current password is incorrect.', 'You must be signed in to change your password.')" },
        "provenance": "source-derived (not browser-verified)"
      },
      {
        "id": "preferences",
        "label": "Preferences (auto-save on change via onUpdate)",
        "fields": [
          { "name": "name", "type": "text", "label": "Name", "maxLength": 20, "validations": ["maxLength 20 (DOM)"], "sampleValid": "Jake", "sampleInvalid": "ThisNameIsWayTooLongForField", "provenance": "source-derived (not browser-verified)" },
          { "name": "currentWeek", "type": "select", "label": "Current Week", "options": "Week 1 .. Week max(currentWeek+4, 12)", "sampleValid": "2", "sampleInvalid": null, "provenance": "source-derived (not browser-verified)" },
          { "name": "unit", "type": "select", "label": "Unit", "options": ["kg", "lbs"], "sampleValid": "lbs", "sampleInvalid": null, "provenance": "source-derived (not browser-verified)" }
        ],
        "submit": null,
        "provenance": "source-derived (not browser-verified)"
      },
      {
        "id": "nutrition-goals",
        "label": "Training data > Nutrition goals (accordion, aria-expanded)",
        "fields": [
          { "name": "calories", "type": "number", "min": 0, "placeholder": "2000", "label": "Calories (kcal)", "validations": ["Number(v)||0 coercion; min=0 DOM only, negatives not rejected in JS"], "sampleValid": "2200", "sampleInvalid": "-50", "provenance": "source-derived (not browser-verified)" },
          { "name": "protein", "type": "number", "min": 0, "placeholder": "155", "label": "Protein (g)", "sampleValid": "160", "sampleInvalid": "-1", "provenance": "source-derived (not browser-verified)" },
          { "name": "carbs", "type": "number", "min": 0, "placeholder": "190", "label": "Carbs (g)", "sampleValid": "200", "sampleInvalid": "-1", "provenance": "source-derived (not browser-verified)" },
          { "name": "fat", "type": "number", "min": 0, "placeholder": "60", "label": "Fat (g)", "sampleValid": "65", "sampleInvalid": "-1", "provenance": "source-derived (not browser-verified)" }
        ],
        "submit": null,
        "notes": "Writes immediately on change; the header row shows '<calories> kcal' or '—'",
        "provenance": "source-derived (not browser-verified)"
      },
      {
        "id": "backfill-past-weeks",
        "label": "Training data > Backfill Past Weeks (accordion)",
        "fields": [
          { "name": "backfillW", "type": "select", "label": "Week", "options": "Week 1 .. Week currentWeek", "default": "max(1, currentWeek-1)", "sampleValid": "1", "provenance": "source-derived (not browser-verified)" },
          { "name": "backfillDay", "type": "button-group", "label": "Training day to log", "options": "state.trainingDays sorted (default mon/wed/fri); buttons for already-recorded days are disabled and show ' ✓'", "provenance": "source-derived (not browser-verified)" },
          { "name": "backfillDuration", "type": "range", "min": 20, "max": 120, "step": 5, "default": 50, "label": "Session duration", "sampleValid": "60", "sampleInvalid": "15 (clamped by range)", "provenance": "source-derived (not browser-verified)" },
          { "name": "weight[exerciseId]", "type": "number", "min": 0, "max": 1000, "placeholder": "current liftWeight or startKg", "label": "<UNIT> per exercise (not shown for plank)", "validations": ["blank keeps current weight; parseFloat > 0; clamped to 1000; lbs converted /2.205"], "sampleValid": "60", "sampleInvalid": "5000", "provenance": "source-derived (not browser-verified)" },
          { "name": "sets[exerciseId]", "type": "number", "min": 0, "max": "ex.sets + 2", "default": "3 (plank 2)", "label": "Sets (0=skip)", "sampleValid": "3", "sampleInvalid": "-1", "provenance": "source-derived (not browser-verified)" }
        ],
        "submit": { "label": "dynamic: 'SELECT A DAY ABOVE' | '<DAY> ALREADY RECORDED' | 'LOG WEEK <n> — <DAY>'", "disabledUnless": "day selected && not already recorded && programExercises.length > 0", "destructive": false, "mutates": "onBackfillWeek(week, day, pct, customWeights, sets, duration)" },
        "provenance": "source-derived (not browser-verified)"
      },
      {
        "id": "delete-account",
        "label": "Danger zone > Delete account (inline typed confirmation, no modal)",
        "fields": [
          { "name": "deleteConfirm", "type": "text", "placeholder": "DELETE", "validations": ["must equal 'DELETE' exactly (case-sensitive) for the submit to enable"], "sampleValid": "DELETE", "sampleInvalid": "delete", "provenance": "source-derived (not browser-verified)" }
        ],
        "submit": { "label": "DELETE FOREVER", "busyLabel": "DELETING...", "destructive": true, "disabledUnless": "deleteConfirm === 'DELETE' && !deleteBusy", "mutates": "POST /api/account-delete (Bearer token via authFetch) -> deletes user_profiles row + auth user; then onReset() + onSignOut()", "errorText": "server body.error ('Could not delete the account. Please try again.') or 'Delete failed (<status>)', or the authFetch errors 'Cloud sync is not configured.' / 'Your session has expired — please sign in again.'", "cancel": "CANCEL" },
        "notes": "This section renders even when userEmail is absent, unlike the Account group. There is no ConfirmDialog step: the typed 'DELETE' is the only gate. NEVER submit in tests against real data.",
        "provenance": "source-derived (not browser-verified)"
      },
      {
        "id": "program-editor-day",
        "label": "My Program > per-day template editor",
        "fields": [
          { "name": "day.title", "type": "text", "placeholder": "<Day> session — e.g. PUSH + SHOULDERS + ABS", "sampleValid": "PUSH + ABS", "provenance": "source-derived (not browser-verified)" },
          { "name": "day.sessionMinutes", "type": "number", "min": 20, "max": 180, "step": 5, "default": 75, "validations": ["parseInt||75 (0/blank falls back to 75); min/max DOM only"], "sampleValid": "60", "sampleInvalid": "500", "provenance": "source-derived (not browser-verified)" },
          { "name": "addSearch", "type": "text", "placeholder": "Search or type custom name…", "validations": ["USE ignores blank; an exact catalog-name match picks the catalog item"], "sampleValid": "Bench Press", "sampleInvalid": "   ", "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.startKg", "type": "number", "min": 0, "step": 0.5, "sampleValid": "40", "sampleInvalid": "-5", "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.sets", "type": "number", "min": 1, "max": 10, "sampleValid": "4", "sampleInvalid": "11", "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.repMin", "type": "number", "min": 1, "sampleValid": "8", "sampleInvalid": "0", "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.repMax", "type": "number", "min": 1, "sampleValid": "12", "sampleInvalid": "0", "notes": "No cross-field check that repMax >= repMin", "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.restSec", "type": "select", "options": "REST_OPTIONS", "default": 120, "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.rpe", "type": "select", "options": [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10], "default": 8, "provenance": "source-derived (not browser-verified)" },
          { "name": "exercise.note", "type": "text", "placeholder": "e.g. Prioritize full ROM", "provenance": "source-derived (not browser-verified)" }
        ],
        "submit": { "label": "SAVE PROGRAM (shows '✓ SAVED' for 2.5s)", "destructive": false, "mutates": "updateSetting('dayTemplates', merged drafts)" },
        "provenance": "source-derived (not browser-verified)"
      }
    ],
    "buttons": [
      { "label": "CLAIM CYCLE REWARD", "visibleWhen": "week is 12th of the cycle", "destructive": false, "opens": "modal:ProgramCompleteModal (App showCycleComplete)", "provenance": "source-derived (not browser-verified)" },
      { "label": "SIGN OUT", "destructive": false, "action": "supabase.auth.signOut, returns to LoginScreen, no confirm", "provenance": "source-derived (not browser-verified)" },
      { "label": "CHANGE PASSWORD / CANCEL", "destructive": false, "opens": "inline:change-password", "provenance": "source-derived (not browser-verified)" },
      { "label": "ENABLE NOTIFICATIONS", "visibleWhen": "notifStatus not granted/denied", "destructive": false, "action": "onRequestNotif -> browser Notification permission prompt; status badge OFF/ENABLED/BLOCKED", "provenance": "source-derived (not browser-verified)" },
      { "label": "Backfill Past Weeks ▾", "destructive": false, "opens": "accordion:backfill-past-weeks", "provenance": "source-derived (not browser-verified)" },
      { "label": "Nutrition goals › (<n> kcal)", "ariaExpanded": true, "destructive": false, "opens": "accordion:nutrition-goals", "provenance": "source-derived (not browser-verified)" },
      { "label": "You have never backed up / Last backup was N days ago (ExportNudge)", "visibleWhen": "totalSessions > 0 && lastExportAt older than 14 days or missing", "destructive": false, "action": "same as EXPORT", "provenance": "source-derived (not browser-verified)" },
      { "label": "▸ What would change (N) (BackupCard)", "ariaExpanded": true, "visibleWhen": "server snapshot exists (user_profiles.state_backup) and differs from current", "destructive": false, "provenance": "source-derived (not browser-verified)" },
      { "label": "RESTORE THIS SNAPSHOT (BackupCard)", "busyLabel": "RESTORING…", "destructive": true, "opens": "modal:confirm-restore-snapshot", "mutates": "supabase.rpc('restore_state_backup'); toast 'Snapshot restored ✓' or 'Restore failed — check your connection.'", "provenance": "source-derived (not browser-verified)" },
      { "label": "RESYNC FROM CLOUD / SYNCING...", "destructive": false, "notes": "Overwrites local state with the cloud copy. Disabled while syncing. Shows 'Last synced: HH:MM'", "provenance": "source-derived (not browser-verified)" },
      { "label": "EXPORT", "destructive": false, "action": "downloads fitquest-backup-YYYY-MM-DD.json; sets lastExportAt", "provenance": "source-derived (not browser-verified)" },
      { "label": "IMPORT (label wrapping hidden input[type=file][accept=.json])", "destructive": true, "opens": "modal:confirm-import | modal:invalid-backup | modal:unreadable-file", "provenance": "source-derived (not browser-verified)" },
      { "label": "Reset today's session", "destructive": true, "opens": "modal:confirm-reset-today", "provenance": "source-derived (not browser-verified)" },
      { "label": "Reset all progress", "destructive": true, "opens": "modal:confirm-reset-all", "provenance": "source-derived (not browser-verified)" },
      { "label": "Delete account", "destructive": true, "opens": "inline:delete-account", "provenance": "source-derived (not browser-verified)" },
      { "label": "Day tabs (Mon..Sun, per trainingDays) in My Program", "destructive": false, "provenance": "source-derived (not browser-verified)" },
      { "label": "Edit <exercise> (✎)", "ariaLabel": "Edit <name>", "destructive": false, "opens": "inline exercise editor with DONE", "provenance": "source-derived (not browser-verified)" },
      { "label": "↑ / ↓", "ariaLabel": "Move <name> up/down", "destructive": false, "notes": "Disabled at list ends", "provenance": "source-derived (not browser-verified)" },
      { "label": "✕", "ariaLabel": "Delete <name>", "destructive": true, "notes": "Removes the exercise from the draft with NO confirm. Persists only after SAVE PROGRAM", "provenance": "source-derived (not browser-verified)" },
      { "label": "+ add exercise / USE / catalog suggestion / ← back / ADD TO <DAY> / CANCEL", "destructive": false, "provenance": "source-derived (not browser-verified)" },
      { "label": "CLEAR DAY", "visibleWhen": "day has exercises", "destructive": true, "opens": "modal:confirm-clear-day", "provenance": "source-derived (not browser-verified)" },
      { "label": "SAVE PROGRAM", "destructive": false, "provenance": "source-derived (not browser-verified)" }
    ],
    "links": [],
    "modals": [
      { "id": "confirm-reset-today", "role": "alertdialog", "title": "Clear today's session?", "message": "Your logged sets for today are discarded so you can re-run the session. Past weeks are untouched.", "confirmLabel": "CLEAR", "cancelLabel": "CANCEL", "destructiveStyling": false, "onConfirm": "onResetToday()", "provenance": "source-derived (not browser-verified)" },
      { "id": "confirm-reset-all", "role": "alertdialog", "title": "Reset ALL progress?", "message": "Every session, lift, streak and achievement is erased and you start again from Week 1. This cannot be undone — export a backup first if you might want it back.", "confirmLabel": "ERASE EVERYTHING", "cancelLabel": "CANCEL", "destructiveStyling": true, "onConfirm": "onReset() (wipes local + cloud state)", "provenance": "source-derived (not browser-verified)" },
      { "id": "confirm-import", "role": "alertdialog", "title": "Restore from backup?", "message": "This replaces all current progress with the contents of this file. It cannot be undone.", "confirmLabel": "RESTORE", "destructiveStyling": true, "trigger": "file JSON object with numeric level, numeric currentWeek and array log", "onConfirm": "onImport(data)", "provenance": "source-derived (not browser-verified)" },
      { "id": "invalid-backup", "role": "alertdialog", "title": "Invalid backup file", "message": "That file doesn't look like a FitQuest backup.", "confirmLabel": "OK", "cancelLabel": "DISMISS", "trigger": "valid JSON that fails the shape check", "provenance": "source-derived (not browser-verified)" },
      { "id": "unreadable-file", "role": "alertdialog", "title": "Couldn't read that file", "message": "Make sure you picked the .json backup FitQuest exported.", "confirmLabel": "OK", "cancelLabel": "DISMISS", "trigger": "JSON.parse throws", "provenance": "source-derived (not browser-verified)" },
      { "id": "confirm-restore-snapshot", "role": "alertdialog", "title": "'Restore this snapshot?' or, when the snapshot holds less data, 'This snapshot has less data'", "message": "'Your current state is kept as the new snapshot, so this can be undone.' (risky case adds 'Restoring would reduce:' plus the list of losses)", "confirmLabel": "Restore | Restore anyway", "destructiveStyling": "only when risky", "provenance": "source-derived (not browser-verified)" },
      { "id": "confirm-clear-day", "role": "alertdialog", "title": "Clear <Day>?", "message": "Every exercise on this day is removed. You can rebuild it by hand or ask the AI Coach to design it.", "confirmLabel": "CLEAR DAY", "destructiveStyling": true, "provenance": "source-derived (not browser-verified)" }
    ],
    "modalLibrary": "Custom ConfirmDialog (src/components/ui/ConfirmDialog.jsx): portal to body, overlay role=presentation (backdrop click cancels), inner role=alertdialog aria-modal=true aria-labelledby=fq-confirm-title aria-describedby=fq-confirm-message. Escape cancels; confirm button focused after 40ms; focus returns to opener on close. Default labels CONFIRM/CANCEL. Promise-based via useConfirm(); a second confirm() resolves the pending one as false.",
    "tabs": [
      { "id": "nav", "items": ["train", "fuel", "progress", "profile"], "notes": "App-level nav (tab bar + desktop rail). ?tab= deep link, whitelisted", "provenance": "source-derived (not browser-verified)" },
      { "id": "program-day-tabs", "items": "state.trainingDays", "provenance": "source-derived (not browser-verified)" }
    ],
    "accordions": ["Backfill Past Weeks", "Nutrition goals", "BackupCard 'What would change'", "Change password panel", "Delete account panel"],
    "tables": [
      { "id": "backfill-exercise-grid", "columns": ["Exercise", "<UNIT>", "Sets (0=skip)"], "sortable": false, "filterable": false, "pagination": false, "footer": "Completion (auto) done/total pct%", "provenance": "source-derived (not browser-verified)" },
      { "id": "backup-diff", "columns": ["label", "now", "→", "after (red if lower)"], "provenance": "source-derived (not browser-verified)" }
    ],
    "toasts": ["Snapshot restored ✓", "Restore failed — check your connection."]
  },
  "destructiveActions": [
    { "action": "Delete account -> DELETE FOREVER", "severity": "irreversible", "endpoint": "POST /api/account-delete", "gate": "typed 'DELETE' only, no modal" },
    { "action": "Reset all progress -> ERASE EVERYTHING", "severity": "irreversible (local + cloud)", "gate": "ConfirmDialog destructive" },
    { "action": "IMPORT -> RESTORE", "severity": "irreversible overwrite", "gate": "ConfirmDialog destructive" },
    { "action": "RESTORE THIS SNAPSHOT", "severity": "reversible (current state becomes the new snapshot)", "gate": "ConfirmDialog" },
    { "action": "Reset today's session -> CLEAR", "severity": "today's sets discarded", "gate": "ConfirmDialog, styled as non-destructive" },
    { "action": "CLEAR DAY (program)", "severity": "draft only until SAVE PROGRAM", "gate": "ConfirmDialog destructive" },
    { "action": "Delete exercise ✕ (program)", "severity": "draft only until SAVE PROGRAM", "gate": "none" },
    { "action": "RESYNC FROM CLOUD", "severity": "overwrites local state with the cloud copy", "gate": "none" },
    { "action": "UPDATE PASSWORD", "severity": "credential change", "gate": "current-password verification" },
    { "action": "SIGN OUT", "severity": "session end", "gate": "none" }
  ],
  "flows": [
    "Unauthenticated visit to /?tab=profile shows LoginScreen with URL unchanged (browser-verified)",
    "After sign-in, deep link ?tab=profile opens the Profile tab (source-derived)",
    "Change password: validation errors for <6 chars and mismatch; wrong current password shows 'Current password is incorrect.'; success shows 'Password updated.' and the panel closes (source-derived)",
    "Edit Name/Week/Unit preferences; changes persist immediately (source-derived)",
    "Edit nutrition goals in the accordion; header kcal value updates (source-derived)",
    "Backfill a past week: pick week, then day, then duration/weights/sets, then LOG WEEK n — DAY; recorded days are disabled (source-derived)",
    "Export downloads fitquest-backup-YYYY-MM-DD.json and dismisses the ExportNudge (source-derived)",
    "Import valid backup -> confirm -> state replaced; invalid shape and unparseable file each show their own dialog (source-derived)",
    "Restore server snapshot via BackupCard with diff preview and confirm (source-derived)",
    "Enable push notifications; badge shows OFF/ENABLED/BLOCKED (source-derived)",
    "Reset today's session (confirm, then cancel path) (source-derived; destructive)",
    "Reset all progress (confirm, then cancel path) (source-derived; destructive)",
    "Delete account: open panel, button stays disabled until 'DELETE' is typed, cancel path (source-derived; destructive, never submit)",
    "Program editor: switch day, add catalog/custom exercise, edit fields, reorder, delete, clear day (confirm), save program (source-derived)",
    "Claim cycle reward at week 12 of the cycle opens ProgramCompleteModal (source-derived)"
  ],
  "assertions": [
    "Visiting /?tab=profile unauthenticated renders the 'SIGN IN' / 'CREATE ACCOUNT' login wall and no Profile content (browser-verified)",
    "Submitting the empty login form shows 'Please enter your email and password.' (browser-verified)",
    "An invalid email with native type=email validation does not submit, and the earlier inline error stays visible (browser-verified)",
    "Profile renders section headings 'Warrior Rank', 'My Program', 'Achievements', 'Settings' (source-derived)",
    "New password 'abc' shows 'New password must be at least 6 characters.' (source-derived)",
    "Mismatched new/confirm shows 'New passwords do not match.' (source-derived)",
    "DELETE FOREVER stays disabled until the input equals 'DELETE' exactly (source-derived)",
    "Reset all progress opens an alertdialog titled 'Reset ALL progress?' with 'ERASE EVERYTHING'; Escape and CANCEL close it without reset (source-derived)",
    "Importing non-JSON shows 'Couldn't read that file'; JSON without level/currentWeek/log shows 'Invalid backup file' (source-derived)",
    "Backfill submit reads 'SELECT A DAY ABOVE' and stays disabled with no day selected (source-derived)",
    "Name input enforces maxLength 20 (source-derived)",
    "ExportNudge appears only when totalSessions > 0 and the last export is at least 14 days old or missing (source-derived)"
  ],
  "observations": [
    "Account deletion has no modal confirmation, unlike the other destructive actions. It is gated only by typing 'DELETE' (source-derived)",
    "The Danger zone's Delete account renders even when userEmail is absent, while the Account group is hidden in that case (source-derived)",
    "'Reset today's session' confirm is not styled destructive, but it discards today's logged sets (source-derived)",
    "Nutrition goal inputs coerce with Number(v)||0, so negatives pass and blank becomes 0 (source-derived)",
    "Program editor has no repMax >= repMin check. Its exercise delete (✕) has no confirm (source-derived)",
    "SettingsTab has two identical useEffects that reset backfillDay when backfillW changes. They are redundant but harmless (source-derived)",
    "On the login screen the inline error is not cleared when native email validation blocks a later submit (browser-verified)"
  ],
  "api": [
    { "method": "GET", "url": "http://localhost:5173/?tab=profile", "status": 200, "observed": true },
    { "method": "GET", "url": "https://fonts.googleapis.com/css2?family=Orbitron...&family=Inter...", "status": 200, "observed": true },
    { "method": "POST", "url": "/api/account-delete", "status": "200 {ok:true} | 401 (requireUser) | 405 non-POST | 500 {error}", "observed": false, "provenance": "source-derived (not browser-verified)" },
    { "method": "SUPABASE", "url": "auth.signInWithPassword + auth.updateUser (change password)", "observed": false, "provenance": "source-derived (not browser-verified)" },
    { "method": "SUPABASE", "url": "from('user_profiles').select('state_backup, state_backup_at') (BackupCard)", "observed": false, "provenance": "source-derived (not browser-verified)" },
    { "method": "SUPABASE", "url": "rpc('restore_state_backup')", "observed": false, "provenance": "source-derived (not browser-verified)" },
    { "method": "SUPABASE", "url": "auth.signOut", "observed": false, "provenance": "source-derived (not browser-verified)" }
  ],
  "console": {
    "errors": [],
    "warnings": ["[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled"]
  }
}
```
