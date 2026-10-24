# Route: /?tab=fuel
Source: src/components/NutritionTab.jsx · Analyzed 2026-10-24 · authMode none (auth wall browser-verified; tab body source-derived)

```json
{
  "route": "/?tab=fuel",
  "sourceFile": "src/components/NutritionTab.jsx",
  "title": "FitQuest — AI-Powered Fitness Training",
  "requiresAuth": true,
  "authFailed": true,
  "authWall": {
    "observed": "browser-verified (Playwright chromium, headless, settle 1000ms)",
    "urlAfterRedirects": "http://localhost:5173/?tab=fuel (no redirect; App.jsx line 250 renders <LoginScreen> in place when !user)",
    "reason": "authMode 'none' + dev server has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; console warns cloud sync disabled, so no session can ever exist",
    "visibleText": ["FITQUEST", "YOUR GAMIFIED FITNESS COACH", "SIGN IN", "CREATE ACCOUNT", "EMAIL", "PASSWORD", "FORGOT PASSWORD?", "SIGN IN", "Your data is securely stored in the cloud. Access your progress from any device."],
    "elements": {
      "forms": [
        {
          "id": "login-form",
          "label": "Sign in",
          "fields": [
            { "name": "email", "type": "email", "required": false, "label": "EMAIL", "placeholder": "you@example.com", "validations": ["type=email (browser)"], "sampleValid": "qa.user@example.com", "sampleInvalid": "not-an-email" },
            { "name": "password", "type": "password", "required": false, "label": "PASSWORD", "placeholder": "••••••••", "validations": [], "sampleValid": "CorrectHorse9!", "sampleInvalid": "" }
          ],
          "submit": { "label": "SIGN IN", "destructive": false }
        }
      ],
      "buttons": [
        { "label": "SIGN IN", "type": "submit", "destructive": false, "note": "mode toggle tab" },
        { "label": "CREATE ACCOUNT", "type": "submit", "destructive": false, "note": "mode toggle tab" },
        { "label": "FORGOT PASSWORD?", "type": "button", "destructive": false }
      ]
    },
    "probe": "Clicked first SIGN IN with empty fields: page text unchanged, no visible validation error (inputs lack required attribute).",
    "screenshot": "/tmp/claude-0/-home-user-FITQUEST/ae8b4343-8f6b-59cd-b661-8f958e677236/scratchpad/analyzer-fuel/fuel.png"
  },
  "rolesAllowed": [],
  "analyzedAsRole": "anonymous",
  "verificationNote": "Everything under 'elements', 'flows' and 'assertions' below is source-derived (not browser-verified): the authenticated Fuel tab could not be reached.",
  "elements": {
    "forms": [
      {
        "id": "manual-add-food",
        "label": "OR ADD MANUALLY (no image) / MISSING SOMETHING? (after foods detected)",
        "verification": "source-derived (not browser-verified)",
        "fields": [
          { "name": "addText", "type": "text", "required": true, "label": "(none; Search icon)", "placeholder": "e.g. 2 scrambled eggs", "validations": ["trimmed value must be non-empty (ADD disabled otherwise; Enter no-op)", "Enter triggers submit when not already adding", "typing clears addError"], "sampleValid": "2 scrambled eggs", "sampleInvalid": "   " }
        ],
        "submit": { "label": "ADD (shows '…' while adding)", "destructive": false, "disabledWhen": "adding || !addText.trim()" },
        "errors": ["addError text (red, under input): 'API error <status>' | 'Cloud sync is not configured.' | 'Your session has expired — please sign in again.' | 'Failed to add item.'"],
        "api": ["POST /api/nutrition (Claude, max_tokens 256)", "GET /api/usda?query=<name> (tier 2 only if no reference-db hit)"],
        "onSuccess": "appends food card (source REF|USDA|AI), clears input"
      },
      {
        "id": "food-grams-edit",
        "label": "Per-food gram editor (inline, per detected food card)",
        "verification": "source-derived (not browser-verified)",
        "opens": "click '<N>g' span (title 'Tap to edit'), disabled while card is swiped open",
        "fields": [
          { "name": "grams", "type": "number", "required": false, "label": "(none)", "autoFocus": true, "validations": ["parseInt > 0 required, otherwise edit discarded silently on blur", "Enter blurs/commits", "sets customGrams (overrides S/M/L portion)"], "sampleValid": "180", "sampleInvalid": "0" }
        ],
        "submit": { "label": "(blur / Enter)", "destructive": false }
      },
      {
        "id": "food-macro-edit",
        "label": "Per-food macro editor (Protein / Carbs / Fat tiles)",
        "verification": "source-derived (not browser-verified)",
        "opens": "click a macro tile (not while swiped open)",
        "fields": [
          { "name": "protein|carbs|fat", "type": "number", "inputMode": "decimal", "required": false, "autoFocus": true, "validations": ["Number(value)||0 clamped to >= 0 (negative/garbage becomes 0, no error shown)", "Enter blurs/commits", "Escape cancels", "calories recomputed = P*4 + C*4 + F*9 after save"], "sampleValid": "32.5", "sampleInvalid": "-5" }
        ],
        "submit": { "label": "(blur / Enter)", "destructive": false }
      }
    ],
    "inputs": [
      { "id": "camera-file-input", "type": "file", "accept": "image/*", "capture": "environment", "hidden": true, "triggeredBy": "SCAN MEAL", "validations": ["rejects HEIC/HEIF by MIME or .heic/.heif extension with error 'HEIC photos are not supported. In iPhone Settings → Camera → Formats, choose \"Most Compatible\"...'", "image resized client-side to max 1024px JPEG q0.85"], "sampleValid": "meal.jpg", "sampleInvalid": "meal.heic", "verification": "source-derived (not browser-verified)" },
      { "id": "gallery-file-input", "type": "file", "accept": "image/*", "hidden": true, "triggeredBy": "Upload from gallery", "validations": ["same as camera-file-input"], "sampleValid": "meal.png", "sampleInvalid": "photo.HEIF", "verification": "source-derived (not browser-verified)" }
    ],
    "buttons": [
      { "label": "SCAN MEAL (Take a photo — AI identifies food & macros)", "destructive": false, "opens": "camera file picker", "visibleWhen": "no image", "verification": "source-derived (not browser-verified)" },
      { "label": "Upload from gallery", "destructive": false, "opens": "gallery file picker", "visibleWhen": "no image", "verification": "source-derived (not browser-verified)" },
      { "label": "ADD", "destructive": false, "visibleWhen": "no image OR foods detected and not logged", "verification": "source-derived (not browser-verified)" },
      { "label": "✕ (on image preview, no aria-label)", "destructive": true, "action": "reset(): clears image, foods, error, logged", "visibleWhen": "image selected", "verification": "source-derived (not browser-verified)" },
      { "label": "ANALYZE MEAL", "destructive": false, "visibleWhen": "image && foods.length===0 && !analyzing", "action": "POST /api/nutrition (vision) then reference/USDA enrichment; shows 'SCANNING MEAL…'", "verification": "source-derived (not browser-verified)" },
      { "label": "S / M / L (portion, with preview grams)", "destructive": false, "action": "setPortion; multipliers S=0.75 M=1.0 L=1.5; clears customGrams", "perFoodCard": true, "verification": "source-derived (not browser-verified)" },
      { "label": "⋯ (desktop dot menu, no aria-label)", "destructive": false, "opens": "menu:food-dot-menu", "visibleWhen": "isDesktop", "perFoodCard": true, "verification": "source-derived (not browser-verified)" },
      { "label": "Delete (in ⋯ menu)", "destructive": true, "action": "removes food from current unsaved list, no confirm", "verification": "source-derived (not browser-verified)" },
      { "label": "Remove food (aria-label; trash revealed by swipe-left >30px)", "destructive": true, "action": "removes food from unsaved list, no confirm", "visibleWhen": "!isDesktop (mobile)", "verification": "source-derived (not browser-verified)" },
      { "label": "RE-SCAN", "destructive": true, "action": "reset() discards detected foods", "visibleWhen": "foods detected && !logged", "verification": "source-derived (not browser-verified)" },
      { "label": "LOG MEAL", "destructive": false, "action": "onLogMeal(meal with adjusted foods + totals); shows 'MEAL LOGGED ✓'", "mutates": true, "visibleWhen": "foods detected && !logged", "verification": "source-derived (not browser-verified)" },
      { "label": "SCAN ANOTHER", "destructive": false, "action": "reset()", "visibleWhen": "logged", "verification": "source-derived (not browser-verified)" },
      { "label": "Delete meal (aria-label/title, trash icon)", "destructive": true, "action": "onDeleteMeal(meal.id) immediately, no confirm dialog", "visibleWhen": "today's meals exist with id", "verification": "source-derived (not browser-verified)" }
    ],
    "links": [],
    "modals": [
      { "id": "food-dot-menu", "title": "(popover, not role=dialog)", "kind": "dropdown menu", "closesOn": "any document click / toggle ⋯", "elements": { "buttons": [{ "label": "Delete", "destructive": true }] }, "verification": "source-derived (not browser-verified)" }
    ],
    "tabs": [],
    "displays": [
      { "id": "daily-summary-bar", "component": "src/components/nutrition/DailySummaryBar.jsx", "content": "calorie ring svg role=img aria-label '<cal> of <goal> kcal eaten[, N meal(s)]', 'kcal left'/'kcal over' (red when over), Protein/Carbs/Fat bars '<val> / <goal> g'; default goals 2000 kcal / 155P / 190C / 60F when state.nutritionGoals unset", "verification": "source-derived (not browser-verified)" },
      { "id": "tip", "content": "Include a fork or your hand in the frame — it helps the AI estimate portion size more accurately.", "verification": "source-derived (not browser-verified)" },
      { "id": "detected-foods", "content": "header 'DETECTED FOODS — ADJUST PORTIONS'; per card: name, source badge REF|USDA|AI, '<g>g · <kcal> kcal', S/M/L, macro tiles", "verification": "source-derived (not browser-verified)" },
      { "id": "meal-total", "content": "'MEAL TOTAL' kcal + macros (sumTotals of adjusted foods)", "verification": "source-derived (not browser-verified)" },
      { "id": "analysis-error", "content": "error banner: 'API error <status>' | 'Could not parse response. Try again.' | 'No food items detected. Try a clearer photo.' | 'Analysis failed. Try again.' | HEIC message | 'Cloud sync is not configured.' | session-expired message", "verification": "source-derived (not browser-verified)" }
    ],
    "tables": [
      { "id": "todays-meals", "component": "src/components/nutrition/TodaysMealHistory.jsx", "columns": ["Food names (truncated 40 chars)", "dateStr", "kcal", "Delete"], "sortable": false, "filterable": false, "pagination": false, "rowActions": ["Delete meal"], "header": "TODAY'S MEALS", "hiddenWhen": "no meals for local today (en-CA date compare)", "verification": "source-derived (not browser-verified)" }
    ]
  },
  "flows": [
    "Unauthenticated visit to /?tab=fuel shows LoginScreen (browser-verified)",
    "Scan meal via camera input -> ANALYZE MEAL -> review detected foods -> LOG MEAL (source-derived)",
    "Upload meal photo from gallery -> analyze -> adjust portion S/M/L -> LOG MEAL (source-derived)",
    "Upload HEIC photo -> rejected with HEIC error, no API call (source-derived)",
    "Manually add food by text (Enter or ADD) with no image, then LOG MEAL (source-derived)",
    "Add a missing item via 'MISSING SOMETHING?' after photo analysis (source-derived)",
    "Edit grams inline (tap '<N>g') and verify macros scale (source-derived)",
    "Edit a macro tile value; calories recomputed from 4/4/9 (source-derived)",
    "Remove a detected food via ⋯ > Delete (desktop) or swipe-left trash (mobile) (source-derived)",
    "RE-SCAN / ✕ discards current analysis (destructive, no confirm) (source-derived)",
    "Delete a logged meal from TODAY'S MEALS (destructive, no confirm) (source-derived)",
    "API failure paths: 401/429 (rate limit 15/min, 60/day) /500 surface as 'API error <status>' (source-derived)"
  ],
  "assertions": [
    "Anonymous /?tab=fuel renders SIGN IN / CREATE ACCOUNT form with EMAIL + PASSWORD and FORGOT PASSWORD? (browser-verified)",
    "Empty SIGN IN submit shows no inline validation error and stays on login wall (browser-verified)",
    "Fuel header shows 'FUEL' and 'AI-powered nutrition tracking' (source-derived)",
    "ADD button disabled when input is empty or whitespace only (source-derived)",
    "Selecting a .heic file shows HEIC-not-supported error and no ANALYZE request (source-derived)",
    "ANALYZE MEAL shows 'SCANNING MEAL…' while pending and hides the button (source-derived)",
    "Portion L shows previewG = round(grams*1.5) and scales kcal/macros by 1.5 (source-derived)",
    "Gram edit of 0 or non-numeric is discarded (value unchanged) (source-derived)",
    "Negative macro edit is clamped to 0 (source-derived)",
    "LOG MEAL replaces action buttons with 'MEAL LOGGED ✓' and 'SCAN ANOTHER'; meal appears in TODAY'S MEALS and summary ring updates (source-derived)",
    "Calorie ring turns red with 'kcal over' when day calories exceed goal (source-derived)",
    "Without Supabase configured, ADD/ANALYZE surface 'Cloud sync is not configured.' (source-derived from authFetch)"
  ],
  "api": [
    { "method": "GET", "url": "http://localhost:5173/?tab=fuel", "status": 200, "observed": true },
    { "method": "GET", "url": "https://fonts.googleapis.com/css2?family=Orbitron...&family=Inter...", "status": 200, "observed": true },
    { "method": "POST", "url": "/api/nutrition", "status": null, "observed": false, "note": "source-derived; Bearer Supabase token required; 405 non-POST, 400 invalid body/model, 429 rate/daily limit, 500 missing ANTHROPIC_API_KEY, 502 upstream" },
    { "method": "GET", "url": "/api/usda?query=<food>", "status": null, "observed": false, "note": "source-derived; Bearer token required; 400 missing query, 500 missing USDA_API_KEY, pageSize clamped 1-25 (default 8), dataType whitelist Foundation/SR Legacy/Survey (FNDDS)/Branded" }
  ],
  "console": {
    "errors": [],
    "warnings": ["[FitQuest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled"]
  }
}
```
