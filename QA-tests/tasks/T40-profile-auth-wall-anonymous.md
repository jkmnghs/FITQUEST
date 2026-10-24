# T40-profile-auth-wall-anonymous: Anonymous visit to the Profile deep link shows the login wall

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/ProfileTab.jsx` (gate in `src/App.jsx`: `useAuth().user === null` renders `src/components/LoginScreen.jsx`) |
| Flow | Unauthenticated visit to /?tab=profile shows LoginScreen with URL unchanged (browser-verified) |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous: use a fresh browser context with no Supabase session in localStorage.
- This task covers the behaviour the analyzer verified in a real browser (Playwright chromium, headless, 1000 ms settle). It runs in the current environment, where `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset (`supabase = null`). It also passes with a configured backend, as long as no session exists.
- No seed data needed.

## Test data
- `deepLink = "/?tab=profile"`
- `badTabLink = "/?tab=admin"` (not in the `NAV_TABS` whitelist `train|fuel|progress|profile`)
- `emptyEmail = ""`, `emptyPassword = ""`
- `badEmail = "not-an-email"`, `anyPassword = "x"`

## Steps

### TC-01: Happy path — deep link is held behind the login wall
1. Navigate to `http://localhost:5173/?tab=profile`.
2. Wait 1000 ms.
3. Assert: the final URL is still `http://localhost:5173/?tab=profile`. No redirect happened, and the `tab=profile` query string is kept.
4. Assert: the document title is `FitQuest — AI-Powered Fitness Training`.
5. Assert: the login wall is visible, with two mode toggles `SIGN IN` and `CREATE ACCOUNT`, an `EMAIL` field (`type=email`, placeholder `you@example.com`), a `PASSWORD` field (`type=password`, placeholder `••••••••`), a `FORGOT PASSWORD?` button and a submit button labelled `SIGN IN`.
6. Assert: no Profile content is in the DOM. The headings `Warrior Rank`, `My Program`, `Achievements` and `Settings` are absent, and so are the bottom tab bar items `Train` / `Fuel` / `Progress` / `Profile` and the app Header.
7. Assert: the console has no errors. When there is no backend, the only allowed warning is `[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled`.

### TC-02: Form validation — login wall `signin` form
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| EMAIL + PASSWORD (both empty) | "Please enter your email and password." (inline, JS validator, not native `required`) | n/a | n/a |
| EMAIL | (same combined message) | `not-an-email` → native `type=email` constraint bubble, so the form does not submit | n/a |

1. On `/?tab=profile`, leave `EMAIL` and `PASSWORD` empty. Click the submit **`SIGN IN`**.
2. Assert: the inline error `Please enter your email and password.` is visible. The URL is unchanged.
3. Fill `EMAIL` = `not-an-email`, `PASSWORD` = `x`. Click the submit **`SIGN IN`**.
4. Assert: the browser's native email-validation message blocks the submit (`input[type=email]:invalid` matches). No request goes to any `/auth/v1/` endpoint.
5. Assert (observed defect, browser-verified): the earlier inline error `Please enter your email and password.` is **still visible**, because it is never cleared. Record it as a UX bug: **"Stale login error persists when native email validation blocks submit"**.

### TC-03: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `CREATE ACCOUNT` (toggle) | click | Signup mode renders: `YOUR NAME` (placeholder `e.g. Alex`, maxLength 30), `EMAIL`, `PASSWORD` (placeholder `Minimum 6 characters`) and `CONFIRM PASSWORD` (placeholder `Repeat your password`). The submit reads `CREATE ACCOUNT`, and any earlier inline error is cleared. URL stays `/?tab=profile`. |
| `SIGN IN` (toggle) | click | Signin mode returns with `EMAIL` / `PASSWORD`, `FORGOT PASSWORD?` and the submit `SIGN IN`. |
| `FORGOT PASSWORD?` | click | Forgot mode renders the text `Enter your email and we'll send you a link to reset your password.`, an `EMAIL` field, `SEND RESET LINK` and `BACK TO SIGN IN`. Clicking `SEND RESET LINK` with an empty email shows `Please enter your email address.` |
| `BACK TO SIGN IN` | click | Signin mode is back and the error is cleared. |

### TC-04: Negative & edge cases (client-side validators, no network needed)
The validators in `LoginScreen.handleSubmit` run before any network call, so these run with or without a backend. Never submit a fully valid signup here, because that would call `onSignUp`.
- Signup mode with `YOUR NAME` = `""`, `EMAIL` = `"qa+wall@example.test"`, `PASSWORD` = `"abcdef"`, `CONFIRM PASSWORD` = `"abcdef"`. Click **`CREATE ACCOUNT`**. Assert: `Please enter your name.`
- Signup mode with `YOUR NAME` = `"QA"`, `PASSWORD` = `"abcdef"`, `CONFIRM PASSWORD` = `"abcdeg"`. Assert: the confirm field's border turns red while typing, and submit shows `Passwords do not match.`
- Signup mode with `YOUR NAME` = `"QA"`, `PASSWORD` = `"abc"`, `CONFIRM PASSWORD` = `"abc"`. Assert: `Password must be at least 6 characters.`
- Navigate to `/?tab=admin`. Assert: the same login wall renders, the URL keeps `?tab=admin`, and no console error appears. Note: `initialTabFromUrl` would fall back to `train` after sign-in.
- Navigate to `/?tab=PROFILE` (upper case). Assert: the login wall renders. Note: the whitelist is case-sensitive, so after sign-in this would open `train`.

## Assertions
- [ ] `/?tab=profile` with no session renders LoginScreen in place of the app shell. The URL is unchanged and there is no redirect.
- [ ] No Profile, Header or tab-bar content is rendered for an anonymous visitor.
- [ ] Empty submit shows `Please enter your email and password.`
- [ ] Invalid email is blocked by native validation. The stale inline error stays visible (known defect).
- [ ] No console errors at any step. The only expected warning is the missing-Supabase-env warning.
- [ ] No failed network requests (4xx/5xx).

## Screenshots required
- Page initial load at `/?tab=profile` (login wall)
- Inline error after the empty submit
- Native email-validation state with the stale inline error still shown
- Signup and forgot-password modes
- Each signup validation message (TC-04)

## Pass criteria
All TCs above pass AND no unexpected console or network errors. The stale-error observation in TC-02 step 5 is an expected finding and must be reported as a defect, not as a test failure.
