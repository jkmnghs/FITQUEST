# T46-profile-backup-export-import: Export, Import (cancel-only), Resync and Snapshot backup

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/OtherTabs.jsx` (`SettingsTab.handleExport`, IMPORT file handler, RESYNC FROM CLOUD); `src/components/BackupCard.jsx` (`ExportNudge`, `BackupCard`); `src/components/ui/ConfirmDialog.jsx` |
| Flow | Export downloads fitquest-backup-YYYY-MM-DD.json and dismisses the ExportNudge. Import valid backup → confirm (CANCEL only here); invalid shape and unparseable file each show their own dialog. Restore server snapshot via BackupCard (cancel only) (source-derived) |
| Requires auth | yes |
| Required role | qa-throwaway |
| Destructive | yes (gated: IMPORT → `RESTORE` and snapshot restore are exercised on their **cancel paths only**) |
| Estimated steps | 34 |

## SAFETY — read before running
- **NEVER click `RESTORE` in the `Restore from backup?` dialog.** It replaces all current progress with the file's contents and cannot be undone. This task covers its gating and CANCEL paths only, even on the throwaway account.
- **Do not confirm `Restore` / `Restore anyway` in the snapshot dialog.** Cancel only.
- `ConfirmDialog` moves focus to its **confirm** button about 40 ms after opening. **Never press Enter or Space while a dialog is open.** Close dialogs only with the **`CANCEL`** button, the **Escape** key or a click on the backdrop.
- If a run would need to confirm a restore to pass, stop and mark that step BLOCKED (requires explicit human approval) instead.

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- Sign in as `qa-throwaway`: a **dedicated, disposable** Supabase test account resolved through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. Never use a real person's account.
- Onboarding completed, and `localStorage.fitquest_onboarding_complete = "true"`.
- Seed for the ExportNudge (TC-01): `state.totalSessions > 0`, and `state.lastExportAt` missing or more than 14 days old. If it cannot be arranged, record the nudge sub-steps as N/A.
- Seed for the BackupCard (TC-05): a row in `user_profiles.state_backup` that differs from the current state. If none exists, the card does not render; record TC-05 as N/A.
- The browser context allows downloads (Playwright `acceptDownloads: true`).
- Create these fixture files in the runner's scratch directory (not in the repo) before starting:
  - `qa-unreadable.json` with the exact content `this is not json {`
  - `qa-wrong-shape.json` with the content `{"hello":"world"}`
  - `qa-string-level.json` with the content `{"level":"1","currentWeek":1,"log":[]}`
  - `qa-array.json` with the content `[]`
  - `qa-valid-shape.json`: use the file downloaded in TC-01 (the account's own export)
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: source-derived (not browser-verified).

## Test data
- `expectedFilename = "fitquest-backup-<UTC YYYY-MM-DD>.json"` (`new Date().toISOString().slice(0,10)`, so the date is **UTC**, not local)
- Fixture files as listed in the Preconditions

## Steps

### TC-01: Happy path — EXPORT downloads a valid backup and clears the nudge
1. Sign in as `qa-throwaway`. Navigate to `/?tab=profile`. Scroll to `Training data`.
2. Assert: the helper `Export your progress as a JSON file, or restore from a previous backup.` shows, with the buttons `EXPORT` and `IMPORT`.
3. If seeded: assert that the yellow ExportNudge button shows `You have never backed up` (when `lastExportAt` is missing) or `Last backup was <N> days ago`, with the subtext `<totalSessions> sessions of progress. Tap to save a copy.`
4. Click **`EXPORT`** (or the ExportNudge, which does the same). Assert: exactly one download starts, and its filename equals `expectedFilename`.
5. Open the downloaded file. Assert: it is valid, pretty-printed (2-space) JSON whose object has a numeric `level`, a numeric `currentWeek` and an array `log`, and whose `name` matches the Preferences Name.
6. Assert: the ExportNudge is gone, because `lastExportAt` is now set.
7. Reload. Assert: the ExportNudge is still absent (`lastExportAt` persisted).
8. Save the file as `qa-valid-shape.json` for TC-03.

### TC-02: Modal coverage — `unreadable-file` and `invalid-backup`
1. Click **`IMPORT`**. Assert: a native file chooser opens, filtered to `.json` (`input[type=file][accept=".json"]`). Choose `qa-unreadable.json`.
2. Assert: an `alertdialog` titled `Couldn't read that file` shows the message `Make sure you picked the .json backup FitQuest exported.` and the buttons `DISMISS` and `OK`, styled non-destructive (no red icon).
3. Click **`DISMISS`**. Assert: the dialog closes and no state changes (Name, level and week are unchanged).
4. Click **`IMPORT`** and choose `qa-wrong-shape.json`. Assert: an `alertdialog` titled `Invalid backup file` with the message `That file doesn't look like a FitQuest backup.` and the buttons `DISMISS` / `OK`. Click **`OK`**. Assert: it closes with no change.
5. Click **`IMPORT`** and choose `qa-string-level.json`. Assert: `Invalid backup file` (a string `level` fails the shape check). Press **Escape**. Assert: it closes.
6. Click **`IMPORT`** and choose `qa-array.json`. Assert: `Invalid backup file`. Click the backdrop. Assert: it closes.
7. Choose `qa-wrong-shape.json` again, twice in a row. Assert: the dialog opens both times, because the input value is reset after each pick.

### TC-03: Modal coverage — `confirm-import` (CANCEL PATHS ONLY — never click RESTORE)
1. Click **`IMPORT`** and choose `qa-valid-shape.json`.
2. Assert: an `alertdialog` (`aria-modal="true"`, `aria-labelledby="fq-confirm-title"`) titled `Restore from backup?` shows the message `This replaces all current progress with the contents of this file. It cannot be undone.`, a red warning icon, and the buttons `CANCEL` and `RESTORE` (red gradient).
3. Assert: `RESTORE` is the focused element. This is a gating risk: an accidental Enter would confirm. Record it as an accessibility/safety observation.
4. Click **`CANCEL`**. **Do NOT click `RESTORE`.** Assert: the dialog closes, and the state is unchanged (Name, `Current Week`, the Achievements count and the program are the same as before). Focus returns near `IMPORT`.
5. Repeat step 1. Press **Escape**. Assert: it closes with no change.
6. Repeat step 1. Click the backdrop. Assert: it closes with no change.

### TC-04: RESYNC FROM CLOUD
Run this only when the `RESYNC FROM CLOUD` button is rendered (`onSyncFromCloud` provided). Otherwise record N/A. It overwrites local state with the cloud copy and has no confirm. That is acceptable on the throwaway account only.
1. Click **`RESYNC FROM CLOUD`**. Assert: the label becomes `SYNCING...` with a spinning icon, and the button is `disabled` while syncing.
2. Assert: afterwards the label is `RESYNC FROM CLOUD` again, and `Last synced: HH:MM` (the local time) shows below it.
3. Double-click quickly. Assert: only one sync request burst is sent (disabled while syncing).

### TC-05: Modal coverage — BackupCard snapshot (CANCEL PATH ONLY)
Run this only if the card renders. Otherwise record N/A with the reason "no differing state_backup".
1. Assert: the card title is `Recovery snapshot available` (green), or `Snapshot available — but it holds less` (yellow, risky). The subtext starts `Taken automatically because a save would have reduced your progress`, optionally followed by ` · <date>`.
2. Click **`▸ What would change (<N>)`**. Assert: `aria-expanded="true"`, the label starts with `▾`, and N rows render as `<label>  <now> → <after>`, with `<after>` in red when it is lower. For risky snapshots, the line `A higher session count does not mean a better copy…` shows.
3. Click **`RESTORE THIS SNAPSHOT`**. Assert: the dialog title is `Restore this snapshot?` (message `Your current state is kept as the new snapshot, so this can be undone.`, confirm `Restore`). In the risky case it is `This snapshot has less data` (message starting `Restoring would reduce:` and listing the losses, confirm `Restore anyway`, red styling).
4. Click **`CANCEL`**. **Do not confirm.** Assert: the dialog closes, the button still reads `RESTORE THIS SNAPSHOT`, no `rpc/restore_state_backup` request is sent, and no toast appears.

### TC-06: Negative & edge cases
- Export near UTC midnight: if the local date differs from the UTC date, record that the filename uses the UTC date (observation).
- Cancel the native file chooser without picking a file. Assert: no dialog appears and no error is logged (`if (!file) return`).
- Pick a large non-JSON file renamed to `.json` (for example 5 MB of text). Assert: `Couldn't read that file` appears, and the UI does not freeze for more than 2 s.

## Assertions
- [ ] EXPORT downloads `fitquest-backup-<UTC date>.json` with a valid backup shape, and hides the ExportNudge.
- [ ] Unparseable JSON shows `Couldn't read that file`. Wrong-shape JSON shows `Invalid backup file`. Both close with no state change.
- [ ] A valid backup shows `Restore from backup?` with `RESTORE`. CANCEL, Escape and backdrop all close it with **no** import.
- [ ] `RESTORE` was never clicked during this run.
- [ ] RESYNC shows `SYNCING...` while busy, then `Last synced: HH:MM`.
- [ ] The BackupCard dialog title and confirm label match the risk level. Cancel sends no RPC.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Training data export/import area, initial (with the ExportNudge if seeded)
- `Couldn't read that file` dialog
- `Invalid backup file` dialog
- `Restore from backup?` dialog
- BackupCard expanded diff and its confirm dialog (if present)
- Final state after the cancels (unchanged)

## Pass criteria
All non-BLOCKED and non-N/A TCs pass, no restore or import was ever confirmed, AND there are no unexpected console or network errors.
