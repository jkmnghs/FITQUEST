# T02-login-signin-validation: Form validation — signin-form

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/LoginScreen.jsx` (`handleSubmit`, lines 40-70) |
| Flow | Client-side validation for the sign-in mode |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (fresh browser context)
- No backend is needed. Every validation here runs on the client before any Supabase call.

## Test data
- `validEmail = "test@example.com"`
- `validPassword = "whatever123"`
- `emptyRequired = ""`
- `badEmail = "notanemail"` (no `@`)
- `shortPassword = "a"` (sign-in has no minimum length)
- `whitespaceEmail = "   "`

## Steps

### TC-01: Happy path — valid input clears the validation error
1. Navigate to `/`.
2. Click the submit **`SIGN IN`** (`form button[type=submit]`) with both fields empty.
3. Assert: the error box shows exactly `Please enter your email and password.`
4. Fill `EMAIL` = `validEmail` and `PASSWORD` = `validPassword`.
5. Click the submit **`SIGN IN`**.
6. Assert: the error box `Please enter your email and password.` is no longer rendered. (`setLocalError(null)` runs at the start of submit.) What happens after that depends on the backend: see T01 TC-02 and TC-03.

### TC-02: Form validation — `signin-form`
Run each row starting from a fresh `/` load. Fill the listed values, then click the submit **`SIGN IN`**.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| EMAIL (empty, PASSWORD = `validPassword`) | `Please enter your email and password.` | `badEmail` → the native tooltip `Please include an '@' in the email address. 'notanemail' is missing an '@'.`, the input matches `:invalid`, and no custom error box appears | n/a (no maxLength) |
| PASSWORD (empty, EMAIL = `validEmail`) | `Please enter your email and password.` | n/a | n/a |
| PASSWORD = `shortPassword`, EMAIL = `validEmail` | none. The form submits (sign-in has no length rule) | n/a | n/a |
| EMAIL = `whitespaceEmail`, PASSWORD = `validPassword` | the browser sanitises the `type=email` value to `""`, so it either shows `Please enter your email and password.` or shows a native tooltip. Record which one appears | n/a | n/a |

For each row, also assert:
- [ ] the error box is a single `<div>` placed above the submit button, in red text
- [ ] the submit label stays `SIGN IN` and the button is not disabled

### TC-03: BUG CANDIDATE — stale error stays after native email validation blocks submit
This TC is **expected to FAIL** and expose the bug.
1. Navigate to `/`.
2. Click the submit **`SIGN IN`** with both fields empty.
3. Assert: the error box shows `Please enter your email and password.`
4. Fill `EMAIL` = `badEmail`, `PASSWORD` = `validPassword`.
5. Click the submit **`SIGN IN`**.
6. Assert: native validation blocks the submit. `EMAIL` has `validity.typeMismatch === true` and a non-empty `validationMessage`.
7. Assert (expected behaviour): the earlier message `Please enter your email and password.` is no longer visible, because both fields are now filled.
8. Record the actual behaviour. Per the analysis, the stale message stays visible because `handleSubmit` never runs. If it does, mark TC-03 FAILED with the label **"Stale error after native email validation"** and attach a screenshot showing the native tooltip and the stale red box together.

### TC-04: Negative & edge cases
- Click the submit **`SIGN IN`** 5 times quickly with empty fields. Assert: exactly one error box is rendered, with the text `Please enter your email and password.`
- Fill only `EMAIL` = `validEmail` and press `Enter` in `EMAIL`. Assert: the error box shows `Please enter your email and password.`
- Trigger the empty-field error, then click `FORGOT PASSWORD?`. Assert: forgot mode shows no error box, because switching modes clears `localError`.
- Check accessibility of the error box. Assert: the error `<div>` has no `role="alert"` and no `aria-live`. Record this as the A11Y finding **"Validation error not announced to screen readers"**. This is expected to fail an a11y audit.

## Assertions
- [ ] Empty email and/or empty password shows `Please enter your email and password.`
- [ ] A malformed email is blocked by native `type=email` validation, and `handleSubmit` does not run.
- [ ] Sign-in mode has no minimum password length.
- [ ] BUG CANDIDATE (expected to fail): a stale custom error is cleared when native validation blocks the next submit.
- [ ] A11Y CANDIDATE (expected to fail): the error box is announced, through `role=alert` or `aria-live`.
- [ ] No console errors in DevTools at any step.
- [ ] No network requests to `/auth/v1/` during any validation-failure case.

## Screenshots required
- Page initial load
- The empty-field error state
- The native email tooltip (TC-02, EMAIL row)
- The stale error together with the native tooltip (TC-03)

## Pass criteria
All TCs above pass AND no unexpected console or network errors. A FAILED result in TC-03 and in the TC-04 a11y bullet is the expected finding and must be reported as a defect or a11y issue.
