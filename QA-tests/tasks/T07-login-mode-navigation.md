# T07-login-mode-navigation: Mode navigation, state carry-over, a11y and responsive

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/LoginScreen.jsx` (`switchMode` lines 26-30, toggle lines 119-133) |
| Flow | Navigate between modes: SIGN IN / CREATE ACCOUNT toggle, FORGOT PASSWORD?, BACK TO SIGN IN |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (fresh browser context)
- No backend is needed.

## Test data
- `email = "carry@example.com"`
- `password = "carry123"`
- `name = "Alex"`
- `confirmPassword = "carry123"`
- `mobileViewport = 375 × 812`

## Steps

### TC-01: Happy path — move through every mode and keep the values entered
1. Navigate to `/`. Assert: signin mode is shown, and the `SIGN IN` toggle has background `rgba(0, 229, 255, 0.12)`.
2. Fill `EMAIL` = `email` and `PASSWORD` = `password`.
3. Click the `CREATE ACCOUNT` toggle (the button outside the form).
4. Assert: the `CREATE ACCOUNT` toggle is active and `SIGN IN` is not. `YOUR NAME` and `CONFIRM PASSWORD` appear. `EMAIL` = `email`, `PASSWORD` (exact) = `password` (kept), and `CONFIRM PASSWORD` = `""` (cleared by the toggle).
5. Assert: the `PASSWORD` placeholder is `Minimum 6 characters` and its `autocomplete` is `new-password`.
6. Fill `YOUR NAME` = `name` and `CONFIRM PASSWORD` = `confirmPassword`.
7. Click the `SIGN IN` toggle.
8. Assert: `YOUR NAME` and `CONFIRM PASSWORD` are gone. `EMAIL` = `email`, `PASSWORD` = `password`, the placeholder is `••••••••`, and `autocomplete` is `current-password`.
9. Click the `CREATE ACCOUNT` toggle again. Assert: `YOUR NAME` = `name` (kept) and `CONFIRM PASSWORD` = `""` (cleared again).
10. Click the `SIGN IN` toggle, then click **`FORGOT PASSWORD?`**. Assert: forgot mode is shown and `EMAIL` = `email`.
11. Click the form button **`BACK TO SIGN IN`**. Assert: signin mode is shown, `EMAIL` = `email`, and `PASSWORD` = `password`.

### TC-02: Switching modes clears errors
| Start mode → error triggered | Then click | Expected |
|---|---|---|
| signin, empty submit → `Please enter your email and password.` | `CREATE ACCOUNT` toggle | no error box |
| signup, mismatch → `Passwords do not match.` | `SIGN IN` toggle | no error box |
| signin, empty submit | `FORGOT PASSWORD?` | no error box |
| forgot, empty submit → `Please enter your email address.` | `BACK TO SIGN IN` | no error box |
| forgot, empty submit | `CREATE ACCOUNT` toggle | no error box, signup form shown |

### TC-03: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SIGN IN` (toggle) | click from signup | signin form, toggle active |
| `CREATE ACCOUNT` (toggle) | click from signin | signup form, toggle active |
| `SIGN IN` (toggle) | click while already in signin | no change, values kept, no error |
| `FORGOT PASSWORD?` | click | forgot form. Assert it is `type="button"`, so the sign-in form does NOT submit (no error box appears even when the fields are empty) |
| `BACK TO SIGN IN` (forgot form) | click | signin form. Assert it is `type="button"`, so the forgot form does NOT submit |
| `SIGN IN` (submit) | click with empty fields | `Please enter your email and password.` |
| `CREATE ACCOUNT` (submit) | click with empty fields | `Please enter your email and password.` |
| `SEND RESET LINK` | click with empty email | `Please enter your email address.` |

### TC-04: Negative & edge cases (UX, a11y and responsive candidates)
- **UX CANDIDATE.** In forgot mode, assert that neither toggle has the active background. This is expected to FAIL a "current mode is indicated" check. Record it as **"No active toggle in forgot mode"**.
- **A11Y CANDIDATE.** Assert that the toggles expose their state (`aria-pressed` or `aria-selected`). This is expected to FAIL: they have neither. Record it.
- **A11Y CANDIDATE.** Assert that the page has at least one heading (`h1`) and a `main` landmark. This is expected to FAIL: there are no headings or landmarks. Record it.
- **A11Y CANDIDATE.** Assert that inputs have `name` or `id` attributes. This is expected to FAIL. Record it. Labels still work through the wrapping `<label>`: assert that `getByLabel('EMAIL')` and `getByLabel('PASSWORD', { exact: true })` resolve to exactly one element in each mode.
- **Keyboard.** From page load, press Tab repeatedly. Assert the focus order: `SIGN IN` toggle → `CREATE ACCOUNT` toggle → `EMAIL` → `PASSWORD` → `FORGOT PASSWORD?` → submit `SIGN IN`, and every focused element has a visible focus indicator.
- **Responsive.** Set the viewport to `mobileViewport` and visit each mode (signin, signup, forgot). Assert: `document.documentElement.scrollWidth <= 375` (no horizontal overflow) and every field and button is fully visible without zooming.
- **Reload.** In signup mode with values filled, reload the page. Assert: the page goes back to signin mode with every field empty (state is not persisted).

## Assertions
- [ ] The email is kept across every mode switch.
- [ ] The password is kept between signin and signup.
- [ ] Each toggle click clears `CONFIRM PASSWORD`.
- [ ] Every mode switch clears the visible error.
- [ ] `FORGOT PASSWORD?` and `BACK TO SIGN IN` do not submit their form.
- [ ] The password placeholder and autocomplete switch with the mode.
- [ ] No horizontal overflow at 375px in any mode.
- [ ] UX/A11Y CANDIDATES (expected to fail): there is an active-mode indicator in forgot mode, toggle ARIA state, headings and landmarks, and input name/id.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (4xx/5xx).

## Screenshots required
- Page initial load
- Signup mode with values carried over
- Forgot mode, showing both toggles inactive
- Each mode at a 375px viewport

## Pass criteria
All TCs above pass AND no unexpected console or network errors. The FAILED results flagged as UX/A11Y CANDIDATES are expected findings and must be reported as issues.
