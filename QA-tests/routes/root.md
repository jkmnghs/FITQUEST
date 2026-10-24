# Route: /

Source: src/App.jsx → src/components/LoginScreen.jsx · Analyzed 2026-10-24 · authMode none (login wall browser-verified)

```json
{
  "route": "/",
  "sourceFile": "src/App.jsx",
  "title": "FitQuest — AI-Powered Fitness Training",
  "requiresAuth": false,
  "authFailed": false,
  "rolesAllowed": null,
  "analyzedAsRole": "anonymous",
  "urlAfterRedirects": "http://localhost:5173/",
  "renderedComponent": "LoginScreen (src/components/LoginScreen.jsx). useAuth: supabase is null, so loading=false and user=null, and App renders <BgFx/><LoginScreen/>. The authenticated app shell and SetPasswordScreen cannot be reached in this environment.",
  "environmentNotes": [
    "No VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is set, so supabase=null and signIn, signUp, resetPassword and resendConfirmation all return false right away without setting authError.",
    "Native HTML5 constraint validation is active. The form has no noValidate, and the email inputs are type=email, so the browser blocks submit for a malformed email before handleSubmit runs."
  ],
  "initialState": {
    "headings": [],
    "landmarks": [],
    "breadcrumbs": [],
    "visibleText": ["FITQUEST", "YOUR GAMIFIED FITNESS COACH", "Your data is securely stored in the cloud.", "Access your progress from any device."],
    "images": [{ "src": "/fq-emblem.png", "alt": "", "decorative": true, "loaded": true }],
    "ariaSnapshot": "- text: FITQUEST YOUR GAMIFIED FITNESS COACH\n- button \"SIGN IN\"\n- button \"CREATE ACCOUNT\"\n- text: EMAIL\n- textbox \"EMAIL\" (placeholder you@example.com)\n- text: PASSWORD\n- textbox \"PASSWORD\" (placeholder ••••••••)\n- button \"FORGOT PASSWORD?\"\n- button \"SIGN IN\"\n- text: Your data is securely stored in the cloud. Access your progress from any device.",
    "mobile375": { "horizontalOverflow": false }
  },
  "selectorNotes": [
    "Inputs have no name or id. Each is wrapped in a <label>, so getByLabel('EMAIL' | 'PASSWORD' | 'YOUR NAME' | 'CONFIRM PASSWORD') works. Note that in signup mode 'PASSWORD' is a substring of 'CONFIRM PASSWORD', so use exact:true.",
    "Two buttons are named 'SIGN IN' (the mode toggle and the submit in signin mode), and two are named 'CREATE ACCOUNT' (the toggle and the submit in signup mode). Use form button[type=submit] for the submit, and the button outside the form (or .first()) for the toggle.",
    "The mode-toggle buttons have no type attribute, sit outside the form, and have no aria-pressed or aria-selected. The active mode shows only through color: background rgba(0,229,255,0.12) and color var(--cyan).",
    "The error box is a plain <div> with no role=alert or aria-live. Locate it by its text, or with form div[style*='var(--red)']."
  ],
  "elements": {
    "forms": [
      {
        "id": "signin-form",
        "label": "Sign in (mode='signin', default)",
        "observed": "browser",
        "fields": [
          { "name": "email", "type": "email", "required": false, "label": "EMAIL", "placeholder": "you@example.com", "autocomplete": "email", "maxLength": null,
            "validations": [
              "custom: an empty email or password shows 'Please enter your email and password.'",
              "native type=email: a value without '@' blocks submit with a browser tooltip (\"Please include an '@' in the email address. 'notanemail' is missing an '@'.\"). handleSubmit does not run, so any previous error message stays on screen.",
              "source-derived: useAuth.normalizeEmail trims and lowercases the email before it is sent to Supabase"
            ],
            "sampleValid": "test@example.com", "sampleInvalid": "notanemail" },
          { "name": "password", "type": "password", "required": false, "label": "PASSWORD", "placeholder": "••••••••", "autocomplete": "current-password", "maxLength": null,
            "validations": ["custom: empty shows 'Please enter your email and password.'", "no minimum length in signin mode"],
            "sampleValid": "whatever123", "sampleInvalid": "" }
        ],
        "submit": { "label": "SIGN IN", "loadingLabel": "PLEASE WAIT... (source-derived, disabled while loading)", "destructive": false },
        "secondaryActions": [{ "label": "FORGOT PASSWORD?", "type": "button", "opens": "mode:forgot" }],
        "probes": {
          "emptySubmit": "Shows 'Please enter your email and password.'",
          "emailOnly": "Shows 'Please enter your email and password.'",
          "invalidEmail": "Native validation blocks submit. The earlier custom error stays visible.",
          "enterKeyInPasswordField": "Submits the form; validation runs the same way",
          "validCredentials_noSupabase": "Silent no-op: no error, no navigation, and the button returns to 'SIGN IN' right away. onSignIn returned false and authError was never set."
        }
      },
      {
        "id": "signup-form",
        "label": "Create account (mode='signup')",
        "observed": "browser",
        "fields": [
          { "name": "name", "type": "text", "required": false, "label": "YOUR NAME", "placeholder": "e.g. Alex", "autocomplete": "name", "maxLength": 30,
            "validations": ["custom: an empty or whitespace-only name (name.trim()) shows 'Please enter your name.' This check runs only after email and password are both non-empty.", "maxLength=30 is enforced; typing 40 characters keeps 30", "the name is trimmed before it is passed to onSignUp"],
            "sampleValid": "Alex", "sampleInvalid": "   " },
          { "name": "email", "type": "email", "required": false, "label": "EMAIL", "placeholder": "you@example.com", "autocomplete": "email", "maxLength": null,
            "validations": ["custom: empty shows 'Please enter your email and password.'", "native type=email: a value without '@' blocks submit (browser tooltip)"],
            "sampleValid": "new@example.com", "sampleInvalid": "bad" },
          { "name": "password", "type": "password", "required": false, "label": "PASSWORD", "placeholder": "Minimum 6 characters", "autocomplete": "new-password", "maxLength": null,
            "validations": ["custom: empty shows 'Please enter your email and password.'", "custom: length < 6 shows 'Password must be at least 6 characters.' This is checked AFTER the match check, so a short mismatched pair shows the mismatch message."],
            "sampleValid": "secret1", "sampleInvalid": "abc" },
          { "name": "confirmPassword", "type": "password", "required": false, "label": "CONFIRM PASSWORD", "placeholder": "Repeat your password", "autocomplete": "new-password", "maxLength": null,
            "validations": ["custom: if it differs from password, submit shows 'Passwords do not match.'", "live visual cue: when the field is non-empty and does not match, the border turns '1px solid rgba(255, 50, 50, 0.5)'"],
            "sampleValid": "secret1", "sampleInvalid": "secret2" }
        ],
        "validationOrder": ["email && password non-empty", "name.trim() non-empty", "password === confirmPassword", "password.length >= 6"],
        "submit": { "label": "CREATE ACCOUNT", "loadingLabel": "PLEASE WAIT... (source-derived)", "destructive": false },
        "probes": {
          "emptySubmit": "Shows 'Please enter your email and password.'",
          "noName": "Shows 'Please enter your name.'",
          "whitespaceName": "Shows 'Please enter your name.'",
          "mismatch": "Shows 'Passwords do not match.' and the red confirm border",
          "shortPassword(abc/abc)": "Shows 'Password must be at least 6 characters.'",
          "invalidEmail": "Native validation blocks submit; the earlier error stays",
          "valid_noSupabase": "Silent no-op: no error and no 'CHECK YOUR EMAIL' screen. The form stays as it was."
        },
        "stateCarryover": "Switching modes keeps the email (and the password from signin). The toggle's onClick clears confirmPassword. When signup was entered from signin, the email was carried over."
      },
      {
        "id": "forgot-form",
        "label": "Forgot password (mode='forgot')",
        "observed": "browser",
        "intro": "Enter your email and we'll send you a link to reset your password.",
        "fields": [
          { "name": "email", "type": "email", "required": false, "label": "EMAIL", "placeholder": "you@example.com", "autocomplete": "email", "maxLength": null,
            "validations": ["custom: empty shows 'Please enter your email address.'", "native type=email: a value without '@' blocks submit"],
            "sampleValid": "test@example.com", "sampleInvalid": "bad" }
        ],
        "submit": { "label": "SEND RESET LINK", "loadingLabel": "SENDING... (source-derived)", "destructive": false },
        "secondaryActions": [{ "label": "BACK TO SIGN IN", "type": "button", "opens": "mode:signin" }],
        "probes": {
          "emptySubmit": "Shows 'Please enter your email address.'",
          "invalidEmail": "Native validation blocks submit; the earlier error stays",
          "valid_noSupabase": "Silent no-op: no error and no 'CHECK YOUR EMAIL' screen",
          "emailCarriedFromSignin": true,
          "enteringModeClearsError": true
        }
      },
      {
        "id": "set-password-form",
        "label": "SetPasswordScreen (inline in src/App.jsx; shown when user && passwordRecovery)",
        "observed": "source-derived (needs a Supabase PASSWORD_RECOVERY event)",
        "fields": [
          { "name": "password", "type": "password", "label": "NEW PASSWORD", "placeholder": "Minimum 6 characters", "autocomplete": "new-password", "validations": ["length < 6 shows 'Password must be at least 6 characters.' (checked FIRST)"], "sampleValid": "newpass1", "sampleInvalid": "abc" },
          { "name": "confirm", "type": "password", "label": "CONFIRM PASSWORD", "placeholder": "Repeat new password", "autocomplete": "new-password", "validations": ["a mismatch shows 'Passwords do not match.'"], "sampleValid": "newpass1", "sampleInvalid": "newpass2" }
        ],
        "submit": { "label": "SET PASSWORD", "loadingLabel": "UPDATING...", "destructive": false },
        "secondaryActions": [{ "label": "CANCEL — SIGN OUT", "type": "button", "action": "signOut", "destructive": false }],
        "notes": "Validation order is the reverse of signup (length before match). Heading text: 'FITQUEST' / 'SET NEW PASSWORD'."
      }
    ],
    "buttons": [
      { "label": "SIGN IN", "context": "mode toggle (outside form)", "destructive": false, "opens": "mode:signin", "sideEffects": "clears localError and authError, signUpDone, resetDone, confirmPassword, resendNote" },
      { "label": "CREATE ACCOUNT", "context": "mode toggle (outside form)", "destructive": false, "opens": "mode:signup", "sideEffects": "same as the SIGN IN toggle" },
      { "label": "FORGOT PASSWORD?", "context": "signin form, type=button", "destructive": false, "opens": "mode:forgot" },
      { "label": "SIGN IN", "context": "signin submit", "destructive": false },
      { "label": "CREATE ACCOUNT", "context": "signup submit", "destructive": false },
      { "label": "SEND RESET LINK", "context": "forgot submit", "destructive": false },
      { "label": "BACK TO SIGN IN", "context": "forgot form, type=button", "destructive": false, "opens": "mode:signin" },
      { "label": "BACK TO SIGN IN", "context": "resetDone panel (source-derived)", "destructive": false, "opens": "mode:signin" },
      { "label": "DIDN'T GET IT? RESEND / RESEND IN {n}s", "context": "signUpDone panel (source-derived)", "destructive": false, "notes": "Disabled during a 60s cooldown that starts after a successful resend. Shows the note 'Confirmation email sent.' on success or 'Could not resend — try again shortly.' on failure." },
      { "label": "GO TO SIGN IN", "context": "signUpDone panel (source-derived)", "destructive": false, "opens": "mode:signin" }
    ],
    "links": [],
    "modals": [],
    "tabs": [
      { "id": "auth-mode-toggle", "kind": "segmented button toggle (no ARIA tab roles)", "panels": ["SIGN IN", "CREATE ACCOUNT"], "hiddenThirdMode": "forgot (reached through FORGOT PASSWORD?; neither toggle shows as active... both toggles stay visible and 'SIGN IN' is not highlighted because mode==='forgot')" }
    ],
    "statusPanels": [
      { "id": "reset-done", "observed": "source-derived (needs onResetPassword to return true)", "content": "Hex mail icon, 'CHECK YOUR EMAIL', 'We sent a password reset link to {email}. Click it to set a new password.', button BACK TO SIGN IN" },
      { "id": "signup-done", "observed": "source-derived (needs onSignUp to return true)", "content": "Hex mail icon, 'CHECK YOUR EMAIL', 'We sent a confirmation link to {email}. Click it to activate your account — you'll be signed in automatically.', a RESEND button with cooldown, GO TO SIGN IN" },
      { "id": "auth-loading", "observed": "source-derived", "content": "SyncIndicator 'LOADING...' while the initial session check is in flight (not shown when supabase is null)" }
    ],
    "tables": []
  },
  "errorMessages": {
    "browserObserved": [
      "Please enter your email and password.",
      "Please enter your name.",
      "Passwords do not match.",
      "Password must be at least 6 characters.",
      "Please enter your email address.",
      "native: Please include an '@' in the email address. '<value>' is missing an '@'."
    ],
    "sourceDerived_authError_fromSupabase": [
      "An account with this email already exists. Try signing in or use \"Forgot Password?\" to recover access. (signUp, 'already registered' variants)",
      "Too many attempts. Please wait a few minutes before trying again. (signUp, rate limit)",
      "<raw Supabase error.message> (signIn, signUp other errors, resetPassword, resendConfirmation, updatePassword)"
    ],
    "displayRule": "displayError = localError || authError. Switching modes clears both (verified in the browser)."
  },
  "flows": [
    "Sign in with email and password (needs a Supabase backend; currently a silent no-op)",
    "Switch to Create Account, fill name, email, password and confirm, then submit and see the CHECK YOUR EMAIL confirmation panel",
    "Resend the confirmation email from the signup-done panel (60s cooldown)",
    "Forgot password: enter the email, SEND RESET LINK, see the CHECK YOUR EMAIL panel, then BACK TO SIGN IN",
    "Navigate between modes: SIGN IN / CREATE ACCOUNT toggle, FORGOT PASSWORD?, BACK TO SIGN IN",
    "Client-side validation for every mode (empty fields, name, mismatch, min length, native email format)",
    "Password recovery: the recovery link leads to SetPasswordScreen, then SET PASSWORD or CANCEL — SIGN OUT (source-derived)"
  ],
  "assertions": [
    "With no session, / renders LoginScreen: 'FITQUEST', 'YOUR GAMIFIED FITNESS COACH', EMAIL and PASSWORD fields, a 'FORGOT PASSWORD?' button and a 'SIGN IN' submit",
    "Submitting the empty signin form shows 'Please enter your email and password.'",
    "Clicking the CREATE ACCOUNT toggle reveals the YOUR NAME (maxlength 30) and CONFIRM PASSWORD fields and changes the password placeholder to 'Minimum 6 characters'",
    "Signup with a whitespace-only name shows 'Please enter your name.'",
    "Signup with mismatched passwords shows 'Passwords do not match.', and the confirm field border turns red before submit",
    "Signup with a 3-character matching password shows 'Password must be at least 6 characters.'",
    "Forgot mode with an empty email shows 'Please enter your email address.'",
    "An email without '@' is blocked by native validation (input:invalid, validationMessage set) and handleSubmit does not run",
    "Switching modes clears any visible error message",
    "The email value is kept across mode switches",
    "Pressing Enter in the password field submits the form",
    "No horizontal overflow at 375px width",
    "BUG CANDIDATE: when Supabase is not configured, valid sign-in, sign-up and reset submissions give no feedback at all. The functions return false without setting authError, so the user sees nothing happen.",
    "BUG CANDIDATE: a stale error message stays visible when native email validation blocks the next submit (for example 'Please enter your email and password.' remains after typing a malformed email)",
    "A11Y CANDIDATE: no heading elements or landmarks; the error box has no role=alert or aria-live; the mode toggle has no aria-pressed or aria-selected; inputs have no name or id attributes",
    "UX CANDIDATE: in forgot mode neither toggle shows as active; the CREATE ACCOUNT / SIGN IN toggles stay visible on the CHECK YOUR EMAIL panels"
  ],
  "api": [
    { "method": "GET", "url": "http://localhost:5173/", "status": 200 },
    { "method": "GET", "url": "https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=Inter:wght@400..700&display=swap", "status": 200 },
    { "method": "POST", "url": "<VITE_SUPABASE_URL>/auth/v1/token?grant_type=password", "status": null, "note": "source-derived: supabase.auth.signInWithPassword; not called (supabase=null)" },
    { "method": "POST", "url": "<VITE_SUPABASE_URL>/auth/v1/signup", "status": null, "note": "source-derived: supabase.auth.signUp with options.data.full_name and emailRedirectTo=origin" },
    { "method": "POST", "url": "<VITE_SUPABASE_URL>/auth/v1/recover", "status": null, "note": "source-derived: resetPasswordForEmail with redirectTo=origin" },
    { "method": "POST", "url": "<VITE_SUPABASE_URL>/auth/v1/resend", "status": null, "note": "source-derived: resend type=signup" },
    { "method": "PUT", "url": "<VITE_SUPABASE_URL>/auth/v1/user", "status": null, "note": "source-derived: updateUser({password}) from SetPasswordScreen" }
  ],
  "console": {
    "errors": [],
    "warnings": ["[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled"],
    "pageErrors": []
  },
  "artifacts": {
    "script": "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/probe.js",
    "rawOutput": "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/out.json",
    "screenshots": [
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/signin_initial.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/signin_after_valid.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/forgot_initial.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/signup_initial.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/signup_after_valid.png",
      "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-root/mobile.png"
    ]
  }
}
```
