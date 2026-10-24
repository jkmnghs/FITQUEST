# T30-progress-auth-wall-anonymous: Anonymous visit to /?tab=progress renders the login wall in place

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/ProgressTab.jsx` (wall: `src/App.jsx` + `src/components/LoginScreen.jsx`) |
| Flow | Unauthenticated visit to /?tab=progress renders the LoginScreen in place |
| Requires auth | no (this task checks the auth wall while signed out) |
| Required role | `anonymous` |
| Destructive | no |
| Estimated steps | 22 |

> Verification status: browser-verified (Playwright chromium, headless) during analysis, with no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set. TC-05 checks the current silent-failure behavior when Supabase is not configured.

## Preconditions
- App running at `http://localhost:5173`
- Anonymous: no Supabase session in storage. Use a fresh browser context or clear localStorage first.
- No seed data needed.
- TC-01 to TC-04 apply whether or not Supabase env vars are set. TC-05 applies only when the dev server runs **without** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (the analysis configuration).

## Test data
- `wellFormedEmail = "qa+progress-wall@example.test"`
- `anyPassword = "qa-pass-123"`
- `badEmail = "bad"`
- `shortPassword = "x"`
- `signupName = "QA Progress"`
- `signupPassword = "qa-pass-123"`
- `mismatchConfirm = "qa-pass-124"`
- `tooShortPassword = "abc12"` (5 chars)
- `emptyRequired = ""`

## Steps

### TC-01: Happy path (anonymous): the deep link shows the login wall and no Progress content
1. Open a fresh browser context and navigate to `http://localhost:5173/?tab=progress`.
2. Assert: the URL stays `http://localhost:5173/?tab=progress` with no redirect.
3. Assert: document title is `FitQuest — AI-Powered Fitness Training`.
4. Assert: the text `FITQUEST` and `YOUR GAMIFIED FITNESS COACH` are visible.
5. Assert: the mode toggle buttons `SIGN IN` and `CREATE ACCOUNT` are visible.
6. Assert: an EMAIL input (`type=email`, placeholder `you@example.com`, `autocomplete=email`) and a PASSWORD input (`type=password`, placeholder `••••••••`, `autocomplete=current-password`) are visible.
7. Assert: a `FORGOT PASSWORD?` button and a `SIGN IN` submit button are visible.
8. Assert: footer text `Your data is securely stored in the cloud. Access your progress from any device.` is visible.
9. Assert: none of these Progress tab strings are present in the DOM: `Weekly Summary`, `Body Metrics`, `Check-in`, `Stats & Trends`, `SAVE CHECK-IN (+25 XP)`, `Weekly Success Checklist`.
10. Assert: the page has no `h1`–`h3` elements and no `<a>` links (this matches the analysis baseline).

### TC-02: Form validation: sign-in mode
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| EMAIL + PASSWORD both empty | "Please enter your email and password." | n/a | n/a |
| EMAIL `"bad"`, PASSWORD `"x"` | n/a | Native `type=email` validation blocks the submit. No new app error appears, and the earlier error text (if any) stays on screen. | n/a |

1. Click **`SIGN IN`** (submit) with both fields empty. Assert: `Please enter your email and password.` is visible.
2. Fill EMAIL = `badEmail`, PASSWORD = `shortPassword`. Click **`SIGN IN`**. Assert: the browser's native email validity bubble appears (`input:invalid` matches EMAIL) and no network request goes to Supabase auth.

### TC-03: Mode coverage: CREATE ACCOUNT
1. Click the **`CREATE ACCOUNT`** mode toggle.
2. Assert: fields YOUR NAME (placeholder `e.g. Alex`), EMAIL, PASSWORD (placeholder `Minimum 6 characters`) and CONFIRM PASSWORD (placeholder `Repeat your password`) are visible, along with a **`CREATE ACCOUNT`** submit button. Any earlier sign-in error is cleared.
3. Submit with all fields empty. Assert: `Please enter your email and password.`
4. Fill EMAIL = `wellFormedEmail`, PASSWORD = `signupPassword`, YOUR NAME = `emptyRequired`. Submit. Assert: `Please enter your name.`
5. Fill YOUR NAME = `signupName`, CONFIRM PASSWORD = `mismatchConfirm`. Submit. Assert: `Passwords do not match.`
6. Set PASSWORD = `tooShortPassword`, CONFIRM PASSWORD = `tooShortPassword`. Submit. Assert: `Password must be at least 6 characters.`

### TC-04: Mode coverage: FORGOT PASSWORD
1. Click **`SIGN IN`** (mode toggle), then click **`FORGOT PASSWORD?`**.
2. Assert: text `Enter your email and we'll send you a link to reset your password.`, an EMAIL field, and the buttons **`SEND RESET LINK`** and **`BACK TO SIGN IN`** are visible.
3. Clear EMAIL and click **`SEND RESET LINK`**. Assert: `Please enter your email address.`
4. Click **`BACK TO SIGN IN`**. Assert: the sign-in form (EMAIL, PASSWORD, `SIGN IN`) is shown again and the forgot-password error is gone.

### TC-05: Negative & edge cases
- **Silent sign-in failure (no Supabase env):** fill EMAIL = `wellFormedEmail`, PASSWORD = `anyPassword` and click **`SIGN IN`**. Wait 3 s. Assert: no error message, no navigation (URL stays `/?tab=progress`, the login wall is still shown), and no network request to any `*.supabase.co` host. This is a **known UX defect**: the user gets no feedback. Record it as an observation. Do not fail the task on it unless the runner is configured to fail on known defects.
- **Console baseline:** assert the console contains the warning `[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled` (expected when env is absent) and **no** console errors.
- **Unknown tab value:** navigate to `http://localhost:5173/?tab=bogus`. Assert: the same login wall renders (an anonymous user never reaches a tab).

## Assertions
- [ ] `/?tab=progress` renders the login wall in place with no redirect.
- [ ] `FITQUEST`, `YOUR GAMIFIED FITNESS COACH`, `SIGN IN`, `CREATE ACCOUNT`, `FORGOT PASSWORD?` and the footer copy are visible.
- [ ] No Progress tab content is in the DOM.
- [ ] Empty sign-in shows `Please enter your email and password.`
- [ ] Malformed email is blocked by native validation.
- [ ] CREATE ACCOUNT shows `Please enter your name.`, `Passwords do not match.` and `Password must be at least 6 characters.` for the matching inputs.
- [ ] FORGOT PASSWORD with empty email shows `Please enter your email address.`
- [ ] Well-formed sign-in with no Supabase env gives no feedback (known defect, recorded).
- [ ] No console errors in DevTools at any step. Only the Supabase-missing warning is expected.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load (login wall on `/?tab=progress`)
- Empty sign-in error state
- CREATE ACCOUNT mode with each validation error
- FORGOT PASSWORD mode with its empty-email error
- Final state 3 s after the well-formed sign-in (silent failure)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
