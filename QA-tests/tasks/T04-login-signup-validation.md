# T04-login-signup-validation: Form validation — signup-form

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/LoginScreen.jsx` (`handleSubmit` lines 53-56; confirm border at line 337) |
| Flow | Client-side validation for the Create Account mode |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 26 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (fresh browser context)
- No backend is needed. All checks run on the client.

## Test data
- `name = "Alex"`
- `email = "new@example.com"`
- `password = "secret1"`
- `confirmPassword = "secret1"`
- `whitespaceName = "   "`
- `mismatchConfirm = "secret2"`
- `shortPassword = "abc"`
- `shortMismatchConfirm = "abd"`
- `badEmail = "bad"`
- `tooLongName = 40 × "a"`

Validation order (from the source): (1) email and password non-empty → (2) `name.trim()` non-empty → (3) `password === confirmPassword` → (4) `password.length >= 6`.

## Steps

### TC-01: Happy path — valid input passes every client check
1. Navigate to `/` and click the `CREATE ACCOUNT` toggle.
2. Click the submit **`CREATE ACCOUNT`** (`form button[type=submit]`) with every field empty.
3. Assert: the error box shows `Please enter your email and password.`
4. Fill `YOUR NAME` = `name`, `EMAIL` = `email`, `PASSWORD` (exact) = `password`, `CONFIRM PASSWORD` = `confirmPassword`.
5. Click the submit **`CREATE ACCOUNT`**.
6. Assert: no validation error box is rendered. With no backend, the next step is the silent no-op covered in T03 TC-02. With a backend, it is the `CHECK YOUR EMAIL` panel.

### TC-02: Form validation — `signup-form`
Start each row from a fresh `/`, click the `CREATE ACCOUNT` toggle, fill the values listed (fields not listed get their valid Test data value), then click the submit **`CREATE ACCOUNT`**.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| YOUR NAME | `""` → `Please enter your name.` ; `whitespaceName` → `Please enter your name.` | n/a | `tooLongName` → the input keeps 30 chars, and no error |
| EMAIL | `""` → `Please enter your email and password.` | `badEmail` → native tooltip (`Please include an '@' …`), the input matches `:invalid`, and no custom error | n/a |
| PASSWORD (exact) | `""` → `Please enter your email and password.` | `shortPassword` + confirm `shortPassword` → `Password must be at least 6 characters.` | n/a |
| CONFIRM PASSWORD | `""` (password = `password`) → `Passwords do not match.` | `mismatchConfirm` → `Passwords do not match.` | n/a |

### TC-03: Validation precedence
1. Empty `YOUR NAME`, empty `EMAIL`, `PASSWORD` = `password`. Submit. Assert: `Please enter your email and password.` (the email check wins over the name check).
2. Empty `YOUR NAME`, `EMAIL` = `email`, `PASSWORD` = `shortPassword`, `CONFIRM PASSWORD` = `shortMismatchConfirm`. Submit. Assert: `Please enter your name.`
3. Fill `YOUR NAME` = `name` and keep the rest. Submit. Assert: `Passwords do not match.` (the match check runs BEFORE the length check).
4. Set `CONFIRM PASSWORD` = `shortPassword` (it now matches). Submit. Assert: `Password must be at least 6 characters.`
5. Set `PASSWORD` = `"abcdef"` and `CONFIRM PASSWORD` = `"abcdef"` (exactly 6). Submit. Assert: no validation error (this is the boundary).
6. Set `PASSWORD` = `"abcde"` and `CONFIRM PASSWORD` = `"abcde"` (5). Submit. Assert: `Password must be at least 6 characters.`

### TC-04: Live mismatch cue on CONFIRM PASSWORD
1. In signup mode, fill `PASSWORD` (exact) = `password`.
2. Assert: the `CONFIRM PASSWORD` border is `1px solid rgba(255, 255, 255, 0.1)` (it is empty, so not red).
3. Type `secret` (a partial value) into `CONFIRM PASSWORD`. Assert: its border is `1px solid rgba(255, 50, 50, 0.5)` before any submit.
4. Type `1`, so the value is `secret1`. Assert: the border goes back to `1px solid rgba(255, 255, 255, 0.1)`.
5. Change `PASSWORD` to `secret9`. Assert: the `CONFIRM PASSWORD` border turns red again.

### TC-05: Negative & edge cases
- **BUG CANDIDATE — stale error after native email validation (expected to FAIL).** Submit an empty form, then assert `Please enter your email and password.` Fill every field with valid values except `EMAIL` = `badEmail`, and submit. Assert (expected behaviour): the stale message is cleared. Per the analysis it stays visible, because the native check blocks `handleSubmit`. If it stays, mark this FAILED with the label **"Stale error after native email validation"** and take a screenshot.
- Trigger `Passwords do not match.`, then click the `SIGN IN` toggle and then the `CREATE ACCOUNT` toggle. Assert: the error box is gone and `CONFIRM PASSWORD` is empty, because the toggle clears `confirmPassword`. `PASSWORD` keeps its value.
- Press `Enter` in `CONFIRM PASSWORD` while every field is empty. Assert: `Please enter your email and password.`
- Assert: no request goes to `/auth/v1/signup` for any validation-failure case above.

## Assertions
- [ ] Empty email or password shows `Please enter your email and password.`
- [ ] An empty or whitespace-only name shows `Please enter your name.`
- [ ] A mismatched confirm shows `Passwords do not match.`, and the confirm border turns red live, before submit.
- [ ] A matching password shorter than 6 characters shows `Password must be at least 6 characters.` 6 characters is accepted.
- [ ] The mismatch check runs before the length check.
- [ ] `YOUR NAME` is capped at 30 characters.
- [ ] A malformed email is blocked natively.
- [ ] BUG CANDIDATE (expected to fail): a stale error is cleared when native validation blocks the submit.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (4xx/5xx).

## Screenshots required
- Signup mode initial load
- Each validation error state (email/password, name, mismatch, short password)
- The live red border on `CONFIRM PASSWORD`
- The native email tooltip with the stale error box

## Pass criteria
All TCs above pass AND no unexpected console or network errors. A FAILED result in the TC-05 stale-error bullet is the expected finding and must be reported as a defect.
