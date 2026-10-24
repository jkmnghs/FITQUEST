# T20-fuel-auth-wall-anonymous: Anonymous deep link to Fuel tab shows the login wall

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/App.jsx` (line 250, `if (!user) return <LoginScreen …/>`), `src/components/LoginScreen.jsx` |
| Flow | Unauthenticated visit to /?tab=fuel shows LoginScreen (browser-verified) |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 22 |

> Verification status: TC-01, and the empty-field part of TC-02 that touches the **mode-toggle** SIGN IN, were browser-verified by the analyzer (Playwright chromium, headless). Everything else in this task comes from reading `LoginScreen.jsx`, `useAuth.js` and `api/_auth.js`. In particular the analyzer clicked the **first** `SIGN IN` (the mode-toggle tab, which sits outside the `<form>`), not the submit button. TC-02 covers the real submit button.

## Preconditions
- App running at `http://localhost:5173`. The analyzer observed this port; `vite.config.js` sets `server.port` to 3000, so use whatever port the dev server prints.
- Anonymous: a fresh browser context with no Supabase session in localStorage.
- This task targets the environment where the analysis was done: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are **not** set. The console shows `[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled`. With Supabase configured, TC-01 still holds for an anonymous user, but the TC-02 rows marked "(no Supabase)" will change.
- No seed data needed.

## Test data
- `validEmail = "qa.user@example.com"`
- `validPassword = "CorrectHorse9!"` (a dummy value. It is never sent anywhere because `supabase` is null)
- `badEmail = "not-an-email"`
- `emptyRequired = ""`
- Viewports: desktop `1280×800`, mobile `375×812`

## Steps

### TC-01: Happy path: an anonymous user hitting the Fuel deep link sees the login wall
1. Open a fresh context. Navigate to `http://localhost:5173/?tab=fuel`.
2. Wait for network idle plus 1000 ms.
3. Assert: `document.title` is `FitQuest — AI-Powered Fitness Training`.
4. Assert: the URL is still `http://localhost:5173/?tab=fuel`. No redirect happens: App.jsx renders `<LoginScreen>` in place.
5. Assert that this text is visible: `FITQUEST`, `YOUR GAMIFIED FITNESS COACH`, the `SIGN IN` and `CREATE ACCOUNT` toggle buttons, the `EMAIL` label (input placeholder `you@example.com`), the `PASSWORD` label (input placeholder `••••••••`), `FORGOT PASSWORD?`, the submit button `SIGN IN`, and `Your data is securely stored in the cloud.` / `Access your progress from any device.`
6. Assert that none of the Fuel tab content is in the DOM: no `FUEL` header, no `AI-powered nutrition tracking`, no `SCAN MEAL`, no `Upload from gallery`, no `OR ADD MANUALLY`, no input with placeholder `e.g. 2 scrambled eggs`, no `svg[role=img]` whose aria-label contains `kcal eaten`.
7. Assert that the app shell is absent: no `nav[aria-label="Primary"]`, no `Train` / `Fuel` / `Progress` / `Profile` tab buttons, no `Signed in as` text.
8. Assert: the console has exactly one FitQuest warning, `[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled`, and zero console errors.
9. Assert: no request was made to `/api/nutrition` or `/api/usda`.
10. Resize to `375×812`. Assert: no horizontal overflow (`document.documentElement.scrollWidth <= 375`), and the login card is fully visible.

### TC-02: Form validation: `login-form` (sign-in mode)
Use the **submit** button, i.e. the `SIGN IN` button inside the `<form>` (`button[type=submit]`), not the mode-toggle tab.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| email | Both empty → submit → red box text `Please enter your email and password.` | `not-an-email` + valid password → native HTML5 validation blocks the submit: `input[type=email].validationMessage` is non-empty, no red app error box appears, button label stays `SIGN IN` | n/a (no maxLength) |
| password | `qa.user@example.com` + empty password → `Please enter your email and password.` | n/a | n/a |

Steps:
1. Click the **mode-toggle** `SIGN IN` (first button). Assert: the page text is unchanged and no error box appears. This matches the analyzer's browser-verified probe.
2. Leave both fields empty. Click the submit `SIGN IN`. Assert: the error box with text `Please enter your email and password.` is visible.
3. Type `qa.user@example.com` into EMAIL. Assert: the error box is still visible, because typing does not clear `localError`. Click submit with PASSWORD empty. Assert: the same message.
4. Clear EMAIL, type `not-an-email`, type `CorrectHorse9!` into PASSWORD, click submit. Assert: `validationMessage` on the email input is non-empty and no new app error is rendered.
5. (no Supabase) Enter `qa.user@example.com` / `CorrectHorse9!` and click submit. Assert: the button may flash `PLEASE WAIT...`, then reads `SIGN IN` again. No error box appears (`signIn` returns `false` without setting `authError`, see `useAuth.js` line 56). The page stays on the login wall at `/?tab=fuel`. **Record as a UX defect:** the user gets no feedback that sign-in cannot work.

### TC-03: Modal coverage: n/a (no dialogs). Covers the login-screen mode switches instead
1. Click the toggle `CREATE ACCOUNT`. Assert: `YOUR NAME` (placeholder `e.g. Alex`, maxLength 30), `EMAIL`, `PASSWORD` (placeholder `Minimum 6 characters`) and `CONFIRM PASSWORD` (placeholder `Repeat your password`) are visible. The submit label is `CREATE ACCOUNT` and `FORGOT PASSWORD?` is hidden.
2. Submit empty. Assert: `Please enter your email and password.` Fill in email `qa.user@example.com` and password `abc12`, leave name empty, submit. Assert: `Please enter your name.`
3. Fill in name `QA Tester`, set confirm to `abc13`, submit. Assert: `Passwords do not match.` and the CONFIRM PASSWORD border is red. Set password and confirm both to `abc12`, submit. Assert: `Password must be at least 6 characters.`
4. Click the toggle `SIGN IN`. Assert: the error box is cleared, because `switchMode` clears `localError`.
5. Click `FORGOT PASSWORD?`. Assert: the text `Enter your email and we'll send you a link to reset your password.` is visible along with the buttons `SEND RESET LINK` and `BACK TO SIGN IN`. Clear EMAIL and submit. Assert: `Please enter your email address.`
6. Click `BACK TO SIGN IN`. Assert: sign-in mode is back, with the `FORGOT PASSWORD?` link visible.
7. After every step, assert: the URL is still `/?tab=fuel`.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SIGN IN` (toggle) | click | Sign-in mode. No text change if already in sign-in mode |
| `CREATE ACCOUNT` (toggle) | click | Sign-up fields appear (TC-03 step 1) |
| `FORGOT PASSWORD?` | click | Forgot-password form appears |
| `SIGN IN` (submit) | click with empty fields | `Please enter your email and password.` |
| `SEND RESET LINK` | click with `qa.user@example.com` (no Supabase) | Label flashes `SENDING...`, then returns to `SEND RESET LINK`. No `CHECK YOUR EMAIL` screen, no error |
| `BACK TO SIGN IN` | click | Returns to sign-in mode |

### TC-05: Negative & edge cases
- Reload `/?tab=fuel` three times in a row. Each time the login wall renders and the Fuel UI never flashes. (`authLoading` is false immediately when supabase is null. If a `LOADING...` SyncIndicator ever appears, record its duration.)
- Navigate to `/?tab=FUEL` (uppercase) and to `/?tab=bogus`. Assert: the same login wall renders. The tab param only matters after sign-in.
- From the page context, run `fetch('/api/nutrition', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'})`. Assert: status `401` and body `{"error":"Authentication required"}` (`api/_auth.js` `requireUser`, which runs before any Anthropic call). This 401 is expected and is not a failure.
- Run `fetch('/api/nutrition')` (GET). Assert: status `405` and body `{"error":"Method not allowed"}`.
- Run `fetch('/api/usda?query=egg')` with no Authorization header. Assert: the status is not 2xx and no USDA data is returned.

## Assertions
- [ ] `/?tab=fuel` renders LoginScreen in place with the URL unchanged (browser-verified).
- [ ] No Fuel-tab content, nav rail or tab bar is in the DOM while anonymous.
- [ ] Empty submit shows `Please enter your email and password.` (the source-derived submit path, separate from the toggle probe).
- [ ] Malformed email is blocked by native validation before the app runs `handleSubmit`.
- [ ] With Supabase absent, sign-in fails silently. Logged as a UX defect.
- [ ] Unauthenticated `POST /api/nutrition` returns 401 `Authentication required`.
- [ ] No console errors in DevTools at any step. The only allowed warning is the missing-Supabase warning.
- [ ] No failed network requests (no 4xx/5xx), except the deliberate 401/405 probes in TC-05.

## Screenshots required
- Page initial load (desktop and 375 px)
- Empty-submit error state (`Please enter your email and password.`)
- Native email validation bubble or state
- Create-account mode with `Passwords do not match.`
- Forgot-password mode
- Final state after TC-02 step 5 (still on the login wall)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
