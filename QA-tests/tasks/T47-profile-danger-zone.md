# T47-profile-danger-zone: Danger zone gating — Reset today, Reset all progress, Delete account (cancel paths only)

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/OtherTabs.jsx` (`SettingsTab` › `Danger zone`, `submitAccountDelete`); `src/components/ui/ConfirmDialog.jsx`; endpoint `POST /api/account-delete` |
| Flow | Reset today's session (cancel path); Reset all progress (cancel path); Delete account: open panel, button stays disabled until 'DELETE' is typed, cancel path (source-derived; destructive, never submit) |
| Requires auth | yes |
| Required role | test-user |
| Destructive | yes (irreversible actions are exercised on their **gating and cancel paths only**) |
| Estimated steps | 32 |

## SAFETY — read before running
- **NEVER click `DELETE FOREVER`.** It calls `POST /api/account-delete`, which permanently deletes the Supabase auth user and the `user_profiles` row, then wipes local and cloud state and signs out. There is **no** confirmation dialog after it: the typed `DELETE` is the only gate.
- **NEVER click `ERASE EVERYTHING`.** It erases every session, lift, streak and achievement, locally and in the cloud.
- **Do not click `CLEAR`** in the `Clear today's session?` dialog. This task covers cancel paths only.
- These rules apply even on the throwaway account. A run must **never** confirm any of these actions against a real account. If any step seems to need confirming, stop and mark it BLOCKED (requires explicit human approval).
- `ConfirmDialog` moves focus to its **confirm** button (`CLEAR` / `ERASE EVERYTHING`) about 40 ms after opening. **Never press Enter or Space while a dialog is open.** Close dialogs only with the **`CANCEL`** button, the **Escape** key or a click on the backdrop.
- With `DELETE` typed and `DELETE FOREVER` enabled, do not press Tab then Enter or Space. Click **`CANCEL`** directly with the mouse.
- As a safety net, the runner must block `POST **/api/account-delete` (Playwright `page.route(..., r => r.abort())`) for the whole task. Any attempt to reach it is a FAILED run, as is any `rpc` or state write that a reset would trigger.

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- Sign in as `test-user`: a **dedicated, disposable** Supabase test account resolved through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. Never use a real person's account.
- Onboarding completed, and `localStorage.fitquest_onboarding_complete = "true"`.
- Seed: the account has at least 1 logged session and at least 1 achievement, so "no state change" is observable. Before starting, record the baseline: Name, `Current Week`, the `<n>/<total> UNLOCKED` count and today's logged sets on `Train`.
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: source-derived (not browser-verified).

## Test data
- `exactConfirm = "DELETE"` (enables the button; **never submit**)
- `lowerConfirm = "delete"`
- `mixedConfirm = "Delete"`
- `trailingSpace = "DELETE "`
- `leadingSpace = " DELETE"`
- `partial = "DELET"`
- `emptyConfirm = ""`

## Steps

### TC-01: Happy path — Danger zone renders and every gate holds
1. Sign in as `test-user`. Navigate to `/?tab=profile`. Scroll to `Settings` › `Danger zone`.
2. Assert: the group header `Danger zone` is pink (`#ff8a9b`) and holds three rows in this order, all pink: `Reset today's session`, `Reset all progress`, `Delete account`.
3. Run TC-02, TC-03 and TC-04 below (cancel paths only).
4. Reload the page. Assert: every baseline value recorded in the Preconditions is unchanged, the user is still signed in, and no `POST /api/account-delete` was ever attempted.

### TC-02: Modal coverage — `confirm-reset-today` (CANCEL ONLY)
1. Click **`Reset today's session`**.
2. Assert: an `alertdialog` (`aria-modal="true"`) titled `Clear today's session?` shows the message `Your logged sets for today are discarded so you can re-run the session. Past weeks are untouched.` and the buttons `CANCEL` and `CLEAR`. It uses **non-destructive** styling: cyan confirm and no red icon. Record this as an observation, because it still discards data.
3. Click **`CANCEL`**. **Do not click `CLEAR`.** Assert: the dialog closes, today's logged sets on `Train` are unchanged, and focus returns to `Reset today's session`.
4. Reopen it and press **Escape**. Assert: it closes with no change.
5. Reopen it and click the backdrop. Assert: it closes with no change.

### TC-03: Modal coverage — `confirm-reset-all` (CANCEL ONLY — never ERASE EVERYTHING)
1. Click **`Reset all progress`**.
2. Assert: an `alertdialog` titled `Reset ALL progress?` shows the message `Every session, lift, streak and achievement is erased and you start again from Week 1. This cannot be undone — export a backup first if you might want it back.`, a red warning icon, a red-tinted border, and the buttons `CANCEL` and `ERASE EVERYTHING` (red gradient).
3. Assert: the focused element is `ERASE EVERYTHING`. Record it as a safety observation: Enter would erase.
4. Click **`CANCEL`**. **Do NOT click `ERASE EVERYTHING`.** Assert: the dialog closes, and `Current Week` and the achievements count equal the baseline.
5. Reopen it and press **Escape**. Assert: it closes with no change.
6. Reopen it and click the backdrop (outside the dialog box). Assert: it closes with no change.
7. Click inside the dialog body (on the message text). Assert: the dialog stays open, because only a direct backdrop click cancels. Then click **`CANCEL`**.

### TC-04: Form validation — `delete-account` gate (NEVER click DELETE FOREVER)
1. Click **`Delete account`**. Assert: the row is replaced inline (no modal) by the red text `This permanently deletes your account and all training data. It cannot be undone. Type DELETE to confirm.`, a text input with the placeholder `DELETE` and an empty value, and the buttons `CANCEL` and `DELETE FOREVER`.
2. Assert: `DELETE FOREVER` is `disabled`, with a dim background and `cursor: not-allowed`.
3. For each value below, clear the input, type the value, and assert the button state. **Never click the button.**

| Input value | `DELETE FOREVER` state |
|---|---|
| `emptyConfirm` `""` | disabled |
| `partial` `"DELET"` | disabled |
| `lowerConfirm` `"delete"` | disabled (case-sensitive) |
| `mixedConfirm` `"Delete"` | disabled |
| `leadingSpace` `" DELETE"` | disabled (no trim) |
| `trailingSpace` `"DELETE "` | disabled (no trim) |
| `exactConfirm` `"DELETE"` | **enabled**: solid red background, white text, pointer cursor. **DO NOT CLICK.** |

4. With `exactConfirm` typed, click **`CANCEL`** with the mouse. Assert: the panel collapses back to the `Delete account` row, no network request was made, and the user is still signed in.
5. Click **`Delete account`** again. Assert: the input is empty again (`setDeleteConfirm('')` on open) and `DELETE FOREVER` is disabled.
6. Click **`CANCEL`**.

### TC-05: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Reset today's session` | click → `CANCEL` / Escape / backdrop | Dialog closes. Today's sets are unchanged. |
| `CLEAR` | **not clicked** | — |
| `Reset all progress` | click → `CANCEL` / Escape / backdrop | Dialog closes. Progress is unchanged. |
| `ERASE EVERYTHING` | **not clicked** | — |
| `Delete account` | click | The inline panel opens with an empty input. |
| `DELETE FOREVER` | **not clicked**; only checked for enabled/disabled | Disabled unless the input equals `DELETE` exactly. |
| `CANCEL` (delete panel) | click | The panel closes and no request is sent. |

### TC-06: Negative & edge cases (observation only, no submits)
- Open `Reset all progress`, then (without closing it) trigger a second confirm. For example, use the keyboard to reach `Reset today's session` behind the overlay. Assert: either the overlay blocks it, or the first dialog is replaced and resolves as cancelled (`useConfirm` resolves the pending one as `false`). Either way, no reset happens. Record which behaviour occurred.
- Observation to report: account deletion is the only irreversible action here **without** a modal confirm, and it is gated only by typed text. Report it as a UX/safety finding for review.
- Observation to report: `Danger zone` › `Delete account` renders even when there is no `userEmail`, whereas the `Account` group is hidden in that case. Code-review only; do not try to reproduce on a real account.

## Assertions
- [ ] `Danger zone` lists `Reset today's session`, `Reset all progress` and `Delete account`.
- [ ] `Clear today's session?` and `Reset ALL progress?` dialogs open with the exact titles, messages and labels, and close with no state change on CANCEL, Escape and backdrop.
- [ ] `DELETE FOREVER` is enabled only for the exact, case-sensitive, untrimmed value `DELETE`.
- [ ] The delete panel CANCEL collapses it. Reopening clears the input.
- [ ] `CLEAR`, `ERASE EVERYTHING` and `DELETE FOREVER` were **never** clicked, and no `POST /api/account-delete` was sent.
- [ ] Baseline state unchanged after reload, and the user is still signed in.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Danger zone initial
- `Clear today's session?` dialog
- `Reset ALL progress?` dialog
- Delete panel with `DELETE FOREVER` disabled (`delete` typed)
- Delete panel with `DELETE FOREVER` enabled (`DELETE` typed, not clicked)
- Final state after reload (unchanged)

## Pass criteria
All non-BLOCKED TCs pass, none of `CLEAR` / `ERASE EVERYTHING` / `DELETE FOREVER` was activated, the account still exists and is signed in, AND there are no unexpected console or network errors.
