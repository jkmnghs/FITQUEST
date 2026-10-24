# T10-train-auth-wall-anonymous: Anonymous deep link to the Train tab shows the login wall

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/TrainTab.jsx` (never mounted while anonymous; gate is `src/App.jsx` line 250 `if (!user) return <LoginScreen …/>`; screen is `src/components/LoginScreen.jsx`) |
| Flow | Unauthenticated visit to /?tab=train shows the LoginScreen; tab content is never rendered. Empty SIGN IN error; CREATE ACCOUNT / FORGOT PASSWORD? / BACK TO SIGN IN mode switches |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 24 |

> Verification status: TC-01, TC-02 rows 1-2 and TC-03 were **browser-verified** by the analyzer (Playwright chromium, headless) against a dev server with no Supabase env. TC-04 and TC-05 are source-derived. The full login form is covered in depth by T01-T05. This task only proves the Train deep link stays behind the wall.

## Preconditions
- App running at `http://localhost:5173` (use the port the dev server prints).
- Anonymous: a fresh browser context with no Supabase session in localStorage.
- Environment as analyzed: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are **not** set. The console shows `[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled`. If Supabase is configured, TC-01 to TC-03 still apply to an anonymous user.
- No seed data needed.

## Test data
- `validEmail = "qa.user@example.com"`
- `validPassword = "Passw0rd!"` (dummy; never sent because `supabase` is null)
- `badEmail = "not-an-email"`
- `emptyRequired = ""`
- Viewports: desktop `1280×800`, mobile `375×812`

## Steps

### TC-01: Happy path — anonymous user hitting the Train deep link sees the login wall
1. Open a fresh context. Navigate to `http://localhost:5173/?tab=train`.
2. Wait for network idle plus 1000 ms.
3. Assert: `document.title` is `FitQuest — AI-Powered Fitness Training`.
4. Assert: the URL is still `http://localhost:5173/?tab=train` (no redirect; LoginScreen renders in place).
5. Assert visible: `FITQUEST`, `YOUR GAMIFIED FITNESS COACH`, the `SIGN IN` and `CREATE ACCOUNT` toggles, label `EMAIL` (placeholder `you@example.com`), label `PASSWORD` (placeholder `••••••••`), `FORGOT PASSWORD?`, the submit `SIGN IN` (`form button[type=submit]`), and the footer `Your data is securely stored in the cloud.` / `Access your progress from any device.`
6. Assert: no Train tab content is in the DOM: no button with aria-label `Open AI Coach`, no `section[aria-label="Today's session"]`, no text `DAILY QUEST`, `START SESSION`, `＋ ADD EXERCISE`, `Recent Sessions`, `Week 1 of 12`.
7. Assert: the app shell is absent: no `nav[aria-label="Primary"]`, no `role=tab` buttons `Train` / `Fuel` / `Progress` / `Profile`, no `Signed in as` text.
8. Assert: the console has exactly one FitQuest warning (the missing-env warning above) and zero errors.
9. Assert: no request was made to `/api/coach` (AICoachTab never mounts).
10. Resize to `375×812`. Assert: `document.documentElement.scrollWidth <= 375` and the login card is fully visible.

### TC-02: Form validation — `login-signin` (on the Train deep link)
Use the **submit** `SIGN IN` inside the `<form>`, not the mode toggle.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| email + password | both empty → submit → error box `Please enter your email and password.` (browser-verified) | n/a | n/a |
| email | `""` + `validPassword` → `Please enter your email and password.` | `badEmail` + `validPassword` → native `type=email` validation blocks submit; `input[type=email].validationMessage` is non-empty (browser-verified) | n/a (no maxLength) |
| password | `validEmail` + `""` → `Please enter your email and password.` | n/a | n/a |

Steps:
1. Leave both fields empty. Click the submit `SIGN IN`. Assert: the error box shows `Please enter your email and password.`
2. Fill EMAIL = `badEmail`, PASSWORD = `validPassword`. Click submit. Assert: `validationMessage` on the email input is non-empty. **Finding (browser-verified):** the previous app error `Please enter your email and password.` is still on screen, because native validation stops `handleSubmit` before it can clear `localError`. Record as a minor UX defect.
3. Clear EMAIL, fill `validEmail`; clear PASSWORD. Submit. Assert: `Please enter your email and password.`
4. After every step assert: the URL is still `/?tab=train`, and no Train content (TC-01 step 6) appeared.

### TC-03: Modal coverage — n/a (no dialogs on the wall). Covers the login mode switches instead
1. Click the toggle `CREATE ACCOUNT`. Assert visible: `YOUR NAME` (placeholder `e.g. Alex`), `EMAIL`, `PASSWORD` (placeholder `Minimum 6 characters`), `CONFIRM PASSWORD` (placeholder `Repeat your password`); submit label `CREATE ACCOUNT`; `FORGOT PASSWORD?` is hidden.
2. Click the toggle `SIGN IN`. Assert: sign-in fields are back and `FORGOT PASSWORD?` is visible.
3. Click `FORGOT PASSWORD?`. Assert: a single `EMAIL` field, the submit `SEND RESET LINK` and the button `BACK TO SIGN IN` are visible.
4. Click `BACK TO SIGN IN`. Assert: sign-in mode with `PASSWORD` and `FORGOT PASSWORD?` visible.
5. Assert after each step: URL still `/?tab=train`.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SIGN IN` (toggle) | click | Stays in sign-in mode; no error box |
| `CREATE ACCOUNT` (toggle) | click | Sign-up fields appear (TC-03 step 1) |
| `FORGOT PASSWORD?` | click | Reset form with `SEND RESET LINK` |
| `BACK TO SIGN IN` | click | Returns to sign-in mode |
| `SIGN IN` (submit) | click, both empty | `Please enter your email and password.` |
| `SIGN IN` (submit) | click with `validEmail` / `validPassword` (no Supabase) | Label may flash `PLEASE WAIT...` then returns to `SIGN IN`; no error, still on the wall at `/?tab=train`. Same silent no-op defect as T01 TC-03 |

### TC-05: Negative & edge cases
- Reload `/?tab=train` three times. Each time the login wall renders and no Train skeleton or content flashes (`authLoading` is false immediately when supabase is null).
- Navigate to `/?tab=TRAIN`, `/?tab=bogus` and `/`. Assert: the same login wall renders for each.
- From the page context run `fetch('/api/coach')` (GET). If `/api` is served (e.g. `vercel dev`): assert status `200` with `{"ok":true}` when `ANTHROPIC_API_KEY` is set, or `500` with `{"ok":false}` when unset. This health check is deliberately unauthenticated. If the dev server does not serve `/api` (HTML/404 response), record **N/A (no API runtime)**.
- Run `fetch('/api/coach', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'})` with no Authorization header. Assert: status `401` (`requireUser` runs before any Anthropic call); body is not an Anthropic response. Expected 401, not a failure. N/A if `/api` is not served.
- Run `fetch('/api/coach', {method:'PUT'})`. Assert: `405` `{"error":"Method not allowed"}` (N/A if not served).

## Assertions
- [ ] `/?tab=train` renders LoginScreen in place; URL unchanged (browser-verified).
- [ ] No Train tab content, AI Coach button, tab bar or rail is in the DOM while anonymous.
- [ ] Empty submit shows `Please enter your email and password.` (browser-verified).
- [ ] `not-an-email` is blocked by native validation; stale app error remains visible (finding).
- [ ] Mode switches CREATE ACCOUNT → SIGN IN → FORGOT PASSWORD? → BACK TO SIGN IN work and keep the URL.
- [ ] Unauthenticated `POST /api/coach` returns 401 (when `/api` is served).
- [ ] No console errors in DevTools at any step; the only allowed warning is the missing-Supabase warning.
- [ ] No failed network requests (no 4xx/5xx) except the deliberate probes in TC-05.

## Screenshots required
- Page initial load (desktop and 375 px)
- Empty-submit error state
- Native email validation state with the stale app error still visible
- Create-account mode
- Forgot-password mode

## Pass criteria
All TCs above pass AND no unexpected console/network errors. The stale-error finding in TC-02 step 2 and the silent sign-in no-op in TC-04 are reported as defects, not as test failures.
