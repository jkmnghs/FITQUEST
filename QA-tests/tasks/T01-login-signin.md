# T01-login-signin: Sign in with email and password

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/App.jsx` (renders `src/components/LoginScreen.jsx`; auth logic in `src/hooks/useAuth.js`) |
| Flow | Sign in with email and password |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (no Supabase session in localStorage; use a fresh browser context)
- **No-backend TCs (TC-01, TC-03, TC-04)**: run against the current environment, where `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset (`supabase = null`).
- **Backend TCs (TC-02, TC-05)** need a configured Supabase backend: both env vars are set, the dev server has been restarted, and at least one confirmed account exists. Resolve that account's email and password at run time through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`, and never write them into this file. If no backend is configured, mark TC-02 and TC-05 **BLOCKED (needs Supabase backend)**, not FAILED.

## Test data
- `noBackendEmail = "test@example.com"`
- `noBackendPassword = "whatever123"`
- `validEmail` / `validPassword` = credentials of a confirmed Supabase account, resolved at run time (backend TCs only)
- `mixedCaseEmail` = `validEmail` upper-cased with 2 leading and 2 trailing spaces, e.g. `"  QA@EXAMPLE.TEST  "` (tests `normalizeEmail` trim + lowercase)
- `wrongPassword = "definitely-wrong-123"`

## Steps

### TC-01: Page renders the login wall (no backend)
1. Navigate to `/`.
2. Assert: document title is `FitQuest — AI-Powered Fitness Training`.
3. Assert: the text `FITQUEST` and `YOUR GAMIFIED FITNESS COACH` are visible.
4. Assert: two toggle buttons `SIGN IN` and `CREATE ACCOUNT` sit above the form. `SIGN IN` is active: its background is `rgba(0, 229, 255, 0.12)` and its color is cyan.
5. Assert: field `EMAIL` (placeholder `you@example.com`, `type=email`, `autocomplete=email`) and field `PASSWORD` (placeholder `••••••••`, `type=password`, `autocomplete=current-password`) are visible.
6. Assert: the `FORGOT PASSWORD?` button and the submit `form button[type=submit]` with label `SIGN IN` are visible.
7. Assert: the footer text `Your data is securely stored in the cloud.` and `Access your progress from any device.` is visible.
8. Assert: no error box is rendered (no `form div[style*="var(--red)"]`).
9. Assert: the console shows only the warning `[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled`, with no errors.

### TC-02: Happy path — sign in with valid credentials [BACKEND]
1. Navigate to `/`.
2. Fill `EMAIL` = `validEmail`.
3. Fill `PASSWORD` (exact label) = `validPassword`.
4. Click the submit **`SIGN IN`** (`form button[type=submit]`).
5. Assert: while the request is in flight, the submit reads `PLEASE WAIT...` and is `disabled`.
6. Assert: `POST <VITE_SUPABASE_URL>/auth/v1/token?grant_type=password` returns 200.
7. Assert: LoginScreen unmounts. The `SIGN IN` / `CREATE ACCOUNT` toggles and the `EMAIL` field are gone, and the authenticated app (boot screen, onboarding or main tab shell) renders.
8. Reload the page. Assert: the user is still signed in, and LoginScreen does not render again.

### TC-03: BUG CANDIDATE — valid sign-in with no backend gives no feedback (no backend)
This TC is **expected to FAIL** in the current environment and expose the bug.
1. Navigate to `/`.
2. Fill `EMAIL` = `noBackendEmail`, `PASSWORD` = `noBackendPassword`.
3. Click the submit **`SIGN IN`**.
4. Assert (expected behaviour): a visible error message tells the user that sign-in is unavailable or failed.
5. Record the actual behaviour. Per the analysis, there is no error, no navigation, and the submit goes back to `SIGN IN` right away, because `signIn` returns `false` without calling `setAuthError`. If this is observed, mark TC-03 FAILED with the label **"Silent no-op when Supabase is not configured"**, and attach a screenshot and the console log.
6. Assert: no network request goes to any `/auth/v1/` endpoint.

### TC-04: Enter key submits (no backend)
1. Navigate to `/`. Leave both fields empty.
2. Focus `PASSWORD` and press `Enter`.
3. Assert: the error box shows `Please enter your email and password.`
4. Fill `EMAIL` = `noBackendEmail` and `PASSWORD` = `noBackendPassword`, then press `Enter` in `PASSWORD`.
5. Assert: the error box disappears (`localError` is cleared on submit). The result is otherwise the same as TC-03.

### TC-05: Negative — wrong password and email normalisation [BACKEND]
1. Navigate to `/`. Fill `EMAIL` = `validEmail`, `PASSWORD` = `wrongPassword`. Click the submit **`SIGN IN`**.
2. Assert: the token request returns 400, and the error box shows the raw Supabase message (typically `Invalid login credentials`).
3. Assert: the submit is enabled again with the label `SIGN IN`.
4. Click the `CREATE ACCOUNT` toggle. Assert: the error box is gone, because switching modes clears `authError`.
5. Click the `SIGN IN` toggle. Clear and fill `EMAIL` = `mixedCaseEmail`, `PASSWORD` = `validPassword`. Click the submit **`SIGN IN`**.
6. Note: native `type=email` validation may strip the spaces, or may reject them. If the browser blocks submit, record that and skip to step 8.
7. Assert: the request body `email` is lowercased and trimmed, and sign-in succeeds as in TC-02 step 7.
8. Sign out through the app so the next TC starts clean.

## Assertions
- [ ] `/` with no session renders LoginScreen with `FITQUEST`, `YOUR GAMIFIED FITNESS COACH`, `EMAIL`, `PASSWORD`, `FORGOT PASSWORD?` and the submit `SIGN IN`.
- [ ] The `SIGN IN` toggle is visually active by default.
- [ ] Pressing Enter in `PASSWORD` submits the form.
- [ ] [BACKEND] Valid credentials replace LoginScreen with the authenticated app, and the session survives a reload.
- [ ] [BACKEND] Wrong credentials show the Supabase error text in the error box.
- [ ] BUG CANDIDATE (expected to fail with no backend): valid sign-in with no backend shows visible feedback.
- [ ] No console errors at any step. The only expected warning is the missing-env warning when there is no backend.
- [ ] No failed network requests (4xx/5xx), except the expected 400 in TC-05.

## Screenshots required
- Page initial load (signin mode)
- The state after submitting valid credentials with no backend (TC-03, as evidence of the silent no-op)
- The error box after a wrong password (TC-05)
- Final state after a successful sign-in (TC-02)

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors. TC-03 is a known bug candidate: a FAILED result there is the expected finding and must be reported as a defect.
