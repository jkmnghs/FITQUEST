# FitQuest: Multi-User Platform — Implementation Spec
*Research-updated: April 2026*

## 1. Why This Change

FitQuest is currently hardcoded to a single user ("Jake"), a single program (Full Body 3×/week Mon-Wed-Fri), and browser `localStorage`. This works for one person but can't scale to a real product.

**Goals of this upgrade:**
- Any user can sign up and get their own isolated account
- All data (workouts, AI conversations, meals, check-ins) is stored in the cloud per user
- Each new user goes through a research-backed assessment to get a scientifically personalized program
- Users choose their own training days instead of a hardcoded MWF schedule
- The app works across multiple devices seamlessly (cloud sync)
- AI coach uses evidence-based Motivational Interviewing + Filipino cultural adaptations
- Nutrition engine uses validated caloric formulas with Filipino food database

**Target scale:** 50–100 users. No need for complex infrastructure — a simple per-user JSON blob in Supabase is perfect.

**Research basis:** Exercise physiology (NSCA, ACSM, Schoenfeld meta-analyses), behavior change science (SDT, MI, COM-B), Filipino health epidemiology (WHO Expert Consultation, FNRI dietary surveys), and AI coaching literature (HumanGO, SensAI, Athletica case studies).

---

## 2. Architecture

```
Browser (React + Vite PWA)
    │
    ├── Supabase Auth   → email/password sign-in, session management
    ├── Supabase DB     → user_profiles table (one JSONB blob per user)
    └── Vercel API      → /api/coach (Claude AI, unchanged)
```

**Storage decision:** One row per user in `user_profiles.state` (JSONB). The entire game state — workouts, XP, meals, AI history, assessment — lives in that one column. No schema migrations needed as the app grows. Simple, fast, and sufficient at this scale.

**Graceful degradation:** If `VITE_SUPABASE_URL` is missing (e.g. local dev without `.env`), Supabase is skipped entirely. The app falls back to localStorage-only mode so dev/testing still works.

---

## 3. New Dependency

```bash
npm install @supabase/supabase-js
```

---

## 4. Supabase Setup

### 4a. Database Schema (run once in Supabase SQL editor)

```sql
-- One row per registered user. 'state' is the full game JSON blob.
create table public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-Level Security: users can only read/write their own row
alter table public.user_profiles enable row level security;
create policy "select own"  on public.user_profiles for select using (auth.uid() = id);
create policy "insert own"  on public.user_profiles for insert with check (auth.uid() = id);
create policy "update own"  on public.user_profiles for update using (auth.uid() = id);

-- Auto-bump updated_at on every write
create or replace function public.handle_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger on_user_profiles_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

-- Auto-create an empty profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles(id, state) values (new.id, '{}'::jsonb);
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4b. Environment Variables

Add to `.env` locally and to Vercel → Project Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> The anon key is safe to expose in-browser — Supabase's Row Level Security ensures users can only access their own data.

---

## 5. App Flow (User Journey)

```
App starts
    │
    ├─ [Auth loading]  → "LOADING..." full-screen
    │
    ├─ Not signed in   → LoginScreen (email + password)
    │       │
    │       ├─ Sign In  → cloud loads state → continue
    │       └─ Sign Up  → empty profile created → OnboardingScreen
    │
    ├─ [Cloud loading]  → "SYNCING..." full-screen
    │
    ├─ assessment.completed = false  → OnboardingScreen (5 steps)
    │       │
    │       └─ Finish → program assigned → main app
    │
    └─ assessment.completed = true   → Main App (all tabs, unchanged UX)
```

---

## 6. Onboarding Assessment

Research basis: NSCA warns against over-assessment killing onboarding. The ACSM simplified preparticipation screening to 3 factors. Cap at 7 screens max — collect essentials upfront, profile progressively over time.

### 6a. The 7 Steps (Research-Validated)

| Step | Screen | Question / Data | Why It Matters |
|------|--------|-----------------|----------------|
| 1 | Safety (PAR-Q+) | 7 yes/no: cardiovascular symptoms, chest pain, dizziness, bone/joint issues, medications | ~33% of adults flagged — non-negotiable safety gate (ACSM standard) |
| 2 | Goal | Body recomp · Fat loss · Build muscle · Get stronger | Determines rep ranges, rest periods, cardio volume |
| 3 | Experience | Beginner (<6 mo) · Intermediate (6 mo–2 yr) · Advanced (2+ yr) | Single most critical programming variable — dictates progression rate and volume tolerance |
| 4 | Schedule | Days/week (2·3·4·5+) + session length (30·45·60·90 min) | Determines program split and total weekly volume |
| 5 | Equipment | Full gym · Dumbbells + machines · Barbell at home · Bodyweight only | Gates exercise selection |
| 6 | Body stats | Age · Sex · Weight (kg/lbs) · Height · Waist circumference (cm) | Powers Mifflin-St Jeor BMR formula; waist enables Asian-adjusted obesity risk |
| 7 | Training days + injuries | Day-of-week grid (must pick exactly N days) + optional injury notes | Replaces hardcoded MWF; injury info shapes exercise substitutions |

> **PAR-Q+ flag handling:** If any PAR-Q+ answer is "Yes", show a warning: "We recommend getting clearance from your doctor before starting. You can still explore the app, but please consult a healthcare provider before your first session." Do NOT block access — just inform.

### 6b. What Happens on "Finish"

1. `selectProgram(assessment)` — pure function, picks best program ID (see §7a)
2. `buildInitialWeights(program)` — creates starting `liftWeights` and `liftHistory` using program's `startKg` values, scaled by experience level
3. `calculateNutritionGoals(assessment)` — runs Mifflin-St Jeor formula with TDEE multiplier and goal-based macro split (see §10)
4. State is updated: `assessment.completed = true`, `programId`, `sessionsPerWeek`, `activeExercises`, `trainingDays`, `nutritionGoals`, `bmi`, `bmiCategory`
5. Immediately saved to Supabase cloud
6. Main app renders with a personalized welcome message in the AI coach tab

### 6c. Data Stored in State

```js
assessment: {
  completed: false,
  parqFlagged: false,          // true if any PAR-Q+ question was Yes
  goal: null,                  // 'recomp' | 'fat_loss' | 'muscle' | 'strength'
  level: null,                 // 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: null,           // 2 | 3 | 4 | 5
  sessionLength: null,         // 30 | 45 | 60 | 90 (minutes)
  equipment: null,             // 'full_gym' | 'dumbbells' | 'barbell_home' | 'bodyweight'
  trainingDays: [],            // e.g. ['tue', 'thu', 'sat']
  injuries: '',                // optional free text
  programId: null,             // assigned after completion
  // Body stats (Step 6)
  age: null,
  sex: null,                   // 'male' | 'female'
  weightKg: null,
  heightCm: null,
  waistCm: null,               // for Asian central obesity screening
}
```

---

## 7. Program Library

### 7a. Program Selection Logic

```
equipment === 'bodyweight'                           → bodyweight_3x
daysPerWeek <= 2                                     → fullbody_2x
daysPerWeek >= 4 AND level !== 'beginner'            → fullbody_4x
sessionLength <= 30                                  → express_3x (future)
default (3 days / any gym / beginner/intermediate)   → fullbody_3x  ← current
```

### 7b. Evidence-Based Training Parameters by Goal

Research (Schoenfeld meta-analyses, NSCA guidelines, Rhea et al. 2003) establishes these parameters. All programs are parameterized against these targets:

| Variable | Recomp | Fat Loss | Hypertrophy | Strength |
|---|---|---|---|---|
| Load (% 1RM equiv.) | 67–85% | 60–80% | 67–85% | ≥80% |
| Reps per set | 6–12 | 8–15 | 6–12 | 1–6 |
| Weekly sets/muscle | 10–15 | 8–15 | 10–20+ | 6–12 |
| Rest periods | 1–2 min | 0.5–1.5 min | 1–2 min | 2–5 min |
| Cardio sessions/wk | 2–3 | 3–5 | Optional | Minimal |
| Protein target (g/kg) | ≥2.0 | 2.3–3.1 | 1.6–2.2 | 1.6–2.2 |

### 7c. Programs (new file: `src/data/programs.js`)

Each program object shape:
```js
{
  id: 'fullbody_3x',
  name: 'Full Body 3×/week',
  description: 'Description shown to user',
  sessionsPerWeek: 3,
  targetGoal: ['recomp', 'muscle'],   // goals this program suits
  progressionModel: 'linear',         // 'linear' | 'dup' | 'block'
  exercises: [
    {
      id: 'squat', name: 'Barbell Squat',
      sets: 3, reps: 10, rest: '2.5 min', restSec: 150,
      rpe: 8, startKg: 45,
      // Beginner scaling — multiplied against startKg based on assessment.level
      beginnerScale: 0.7,    // beginner starts at 70% of startKg
      advancedScale: 1.3,    // advanced starts at 130% of startKg
      note: 'Cue text...'
    },
    // ...
  ]
}
```

| Program ID | Name | Days/wk | Equipment | Who It's For | Progression Model |
|---|---|---|---|---|---|
| `fullbody_3x` | Full Body 3×/week | 3 | Full gym | Beginners/intermediate — default | Linear (+2.5 kg/session) |
| `fullbody_2x` | Full Body 2×/week | 2 | Full gym | Busy schedules, +1 set/exercise | Linear (+2.5 kg/session) |
| `fullbody_4x` | Full Body 4×/week | 4 | Full gym | Intermediate+ more frequency | DUP (Mon 4×8/Wed 5×5/Fri 3×12) |
| `bodyweight_3x` | Bodyweight 3×/week | 3 | None | Beginners, no gym | Rep-based progression |

**Bodyweight program exercises:** Push-up, Bodyweight Squat, Inverted Row, Reverse Lunge, Glute Bridge, Tricep Dip, Plank

### 7d. Progression Algorithm — The "2-for-2 Rule" (NSCA standard)

Replace the current flat +2.5 kg/week rule with the research-backed 2-for-2 rule:

```
IF user hits target reps on all sets for 2 consecutive sessions:
  THEN suggest weight increase:
    Upper body lifts:  +1.25–2.5 kg
    Lower body lifts:  +2.5–5 kg
    Bodyweight exercises: advance to harder variation
```

Store `consecutiveCompletions[exId]` in state. When it hits 2, set `overloadSuggestions[exId] = 'increase'`. Reset to 0 after any increase. This replaces the current RPE-only system (which is kept as a secondary signal).

### 7e. Experience-Level Progression Rates

| Level | Strength gain rate | Volume tolerance | Deload frequency |
|---|---|---|---|
| Beginner | +2.5–5 kg/session possible | Low (1–3 sets per exercise) | Every 8–10 weeks |
| Intermediate | +2.5 kg/week | Moderate (3–4 sets) | Every 4–6 weeks |
| Advanced | +2.5 kg/month | High (4–5 sets, higher frequency) | Every 3–4 weeks |

All programs share the same **12-week / 4-phase structure**:
- Weeks 1–2: Foundation (find baselines — RPE 7-8, no failure)
- Weeks 3–8: Linear Progression (2-for-2 rule governs load increases)
- Week 9: Deload (80% weight, 2 sets — mandatory, built into all programs)
- Weeks 10–12: Continued Progression (reset 2-for-2 counter)

---

## 8. Filipino-Specific Features (NEW — Research-Driven)

These are FitQuest's biggest competitive differentiators. No competing app addresses these.

### 8a. BMI & Body Composition — Asian-Adjusted Thresholds

| Classification | Standard BMI | **Asian-Adjusted (WHO 2004)** |
|---|---|---|
| Normal | 18.5–24.9 | 18.5–22.9 |
| **Overweight** | **25.0–29.9** | **23.0–27.4** |
| **Obese** | **≥30.0** | **≥27.5** |

**Why this matters:** Using standard cutoffs, 35% of hypertensive and 24% of diabetic Filipino women are missed. Normal-weight central obesity (waist-to-height ratio ≥0.5) affects **39.3% of Filipinos** — highest in studied populations.

**Implementation:**
- Calculate BMI using weight/height from assessment Step 6
- Display BMI with Asian-adjusted category labels
- Show waist-to-height ratio if waist circumference provided (waist÷height ≥0.5 = elevated risk)
- Add a note: "Filipino health research uses lower BMI thresholds than global standards"

### 8b. Filipino Food Database

The current nutrition module needs Filipino-specific foods. Mean Filipino dietary intake is ~70% carbs, with rice as the primary protein source (19% of total protein).

**Priority foods to add to `src/data/foodDatabase.js`:**

| Food | Cal | Protein | Carbs | Fat | Notes |
|---|---|---|---|---|---|
| Steamed rice (1 cup, 186g) | 242 | 5g | 53g | 0.4g | Primary staple — must be accurate |
| Chicken adobo (1 cup) | 285 | 32g | 5g | 15g | Most common viand |
| Sinigang na baboy (1 cup) | 180 | 15g | 8g | 9g | Tamarind-based soup |
| Tinola (1 cup) | 145 | 20g | 6g | 4g | Ginger chicken soup |
| Pork sisig (1 serving) | 420 | 28g | 3g | 32g | High-fat — awareness prompt |
| Bangus (milkfish, 100g) | 148 | 20g | 0g | 7g | Affordable protein source |
| Longganisa (2 pcs) | 280 | 12g | 6g | 22g | High sodium — note |
| Pandesal (1 pc, 50g) | 145 | 4g | 28g | 1g | Common breakfast |
| Lumpia (2 pcs) | 200 | 8g | 22g | 9g | Popular snack |
| Coconut water (1 cup) | 46 | 2g | 9g | 0.5g | Natural hydration option |

**Macro imbalance coaching:** Filipino average is 70/13/15 (carb/protein/fat). FitQuest targets should shift toward 55/20/25 with protein-focused nudges. The AI should suggest: "Try replacing half a cup of rice with a chicken thigh — same calories, +20g protein."

**Micronutrient flags to display in nutrition tab:**
- Iron: 97–99% of Filipinos are insufficient → flag if dietary iron is low
- Calcium: 95–98% insufficient → highlight dairy/leafy greens
- Vitamin D: ~55% deficient → supplement recommendation
- Vitamin C: 96–98% insufficient → highlight citrus/bell peppers

### 8c. Tropical Climate Adaptations

Philippines climate: 25–35°C, 71–85% humidity year-round.

**Workout recommendations to add:**
- Default training time suggestions: "Early morning (5–7am) or evening (6–8pm) workouts are more comfortable in Philippine climate"
- Hydration reminders: add 20% to standard recommendations; mention coconut water as a culturally natural option
- Heat index alert: if user mentions "it's very hot" in AI chat, reduce intensity by 10–15% and add extra rest

### 8d. Health Risk Context

Filipino health prevalence data to inform AI coaching responses:

- **Hypertension:** 37% of Filipino adults → if PAR-Q+ flags cardiovascular symptoms, AI emphasizes medical clearance more urgently; never prescribe high-intensity cardio without clearance
- **Diabetes:** 4.3M diagnosed, 2.8M undiagnosed → PAR-Q+ blood sugar question is important; AI suggests post-meal walks (proven blood glucose regulation)
- **Night-shift workers (BPO):** Large Filipino BPO workforce → training schedule must support non-standard hours; AI should ask "What shift are you working?" and not assume daytime availability

### 8e. Cultural Communication Norms

AI coach language adaptations for Filipino users:

| Value | Communication Impact | Implementation |
|---|---|---|
| *Hiya* (shame/face-saving) | Never shame missed workouts; no negative comparisons | "Life happens — let's just pick up where we left off" |
| *Pakikisama* (group harmony) | Community framing resonates | "We're in this together"; future: social/family challenges |
| *Utang na loob* (reciprocity) | Express genuine appreciation | "Thank you for trusting us with your fitness journey" |
| Indirect communication | Soften corrections | "You might try keeping your chest up a bit more" not "Your form is wrong" |
| Family orientation | Connect fitness to family | "More energy for the people who matter to you" |
| Humor + emoji | Natural in Filipino digital comms | Light humor and emoji are appropriate (not clinical/cold) |

---

## 9. Nutrition Engine (Research-Updated)

### 9a. Caloric Formula — Mifflin-St Jeor (Primary)

American Dietetic Association recommended formula. Accurate within 10% for 82% of non-obese individuals.

```js
// src/utils/nutrition.js — new file
export function calcBMR({ weightKg, heightCm, age, sex }) {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return sex === 'male' ? base + 5 : base - 161;
}

export function calcTDEE(bmr, daysPerWeek) {
  // Infer activity level from training frequency
  const multiplier = daysPerWeek <= 2 ? 1.375
    : daysPerWeek <= 3 ? 1.55
    : daysPerWeek <= 5 ? 1.725 : 1.9;
  return Math.round(bmr * multiplier);
}

export function calcNutritionGoals(assessment) {
  const bmr  = calcBMR(assessment);
  const tdee = calcTDEE(bmr, assessment.daysPerWeek);
  const proteinPerKg = { recomp: 2.0, fat_loss: 2.5, muscle: 1.8, strength: 1.8 };
  const calAdj       = { recomp: 0,   fat_loss: -400, muscle: +250, strength: +100 };

  const calories = Math.max(
    assessment.sex === 'female' ? 1200 : 1500,  // safety floor
    tdee + (calAdj[assessment.goal] ?? 0)
  );
  const protein = Math.round(assessment.weightKg * (proteinPerKg[assessment.goal] ?? 2.0));
  const fat     = Math.round((calories * 0.25) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat };
}

export function calcBMI(weightKg, heightCm) {
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  // Asian-adjusted WHO 2004 cutoffs for Filipino users
  const category = bmi < 18.5 ? 'Underweight'
    : bmi < 23   ? 'Normal'
    : bmi < 27.5 ? 'Overweight'
    : 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, category };
}
```

**Safety floor:** Never recommend below 1,200 kcal/day (women) or 1,500 kcal/day (men) — absolute constraint enforced in code.

### 9b. State additions for nutrition

```js
// Added to DEFAULT_STATE in gameData.js:
bmi: null,
bmiCategory: null,
waistToHeightRatio: null,   // waist ÷ height; ≥0.5 = elevated risk
nutritionGoals: { calories: 2000, protein: 155, carbs: 190, fat: 60 },  // keeps existing key
```

---

## 10. AI Coach Architecture (Research-Updated)

### 10a. Core Method — Motivational Interviewing (MI)

MI is validated across 130+ studies for health behavior change. Four core techniques (OARS) must be reflected in every system prompt:

- **Open questions** before prescribing: "What would reaching this goal mean to you?"
- **Affirmations:** Behavior-specific praise, 4:1 positive-to-corrective ratio
- **Reflective listening:** "It sounds like consistency is the main challenge right now"
- **Summarizing:** Recap key points before giving advice

**Never:** guilt-trip, shame missed workouts, compare users negatively, label foods as "bad/good/clean/dirty", prescribe exercise as punishment for eating.

### 10b. Three-Layer Memory (inject into every conversation)

**Layer 1 — User Profile (persistent in `state.assessment`):**
Assessment data, PAR-Q+ flags, dietary restrictions, medical conditions, Filipino cultural signals.

**Layer 2 — Episodic Memory (semi-persistent, stored in `state.aiEpisodic`):**
- Subjective feedback: "knee bothered me", "felt great"
- Temp life events: "traveling next week", "starting new job" ← expire after 7 days
- Preferences: "hates burpees", "loves deadlifts"
- Milestone dates

**Layer 3 — Working Memory (injected per conversation):**
```
Current week + phase | Last 3 workout summaries | Active flags (injury/deload/plateau)
Recent weight trend  | 3-5 episodic memory notes | Consecutive completion counts
```

**Phrases that create "my coach knows me":**
- "Last time you mentioned your knee was bothering you — how's that today?"
- "Today is your 30th workout! Your squat is up 15 kg from when we started."
- "Your consistency this month is the best you've had since starting."

### 10c. Adaptive Logic (behavior patterns)

| Signal | Response |
|---|---|
| 1 missed session | Casual: "Missed you yesterday — everything okay?" |
| 2 consecutive misses | Gentle check-in: "Want me to shorten sessions or shift the schedule?" |
| 3+ misses | Offer 10-min minimum viable workout; look for day-of-week pattern |
| 7+ days absent | Re-entry: reduce volume 10–20%, non-judgmental fresh-start framing |
| 2-for-2 rule triggers | "Great consistency — ready to bump the weight up 2.5 kg?" |
| Plateau (2+ weeks no change) | Deload first → rep range change → frequency adjust → nutrition audit |
| Low sleep/stress reports | Suggest deload: "Sometimes lighter sessions are exactly what the body needs" |

### 10d. Safety Hard Limits

These constraints are written into the system prompt and cannot be overridden by conversation:

```
ABSOLUTE PROHIBITIONS:
- Never diagnose medical conditions
- Never recommend <1,200 kcal/day (women) or <1,500 kcal/day (men)
- Never label foods as good/bad/clean/dirty
- Never suggest exercising to "burn off" a meal
- Never advise on pregnancy exercise without physician clearance
- Never recommend stopping medications
- Never encourage >2 lbs/week weight loss

EATING DISORDER RED FLAGS (trigger support protocol):
- Obsessive sub-floor calorie targets
- Mentions of fasting beyond 24 hours
- "I need to burn off what I ate" framing
- Persistent body hatred language
→ Response: warm concern, Hopeline PH (02-804-4673), professional support recommendation

MEDICAL BOUNDARY PHRASING:
"That's really in the territory of a physical therapist/doctor.
I can modify your exercises to work around it in the meantime."

ACUTE SYMPTOM PROTOCOL (chest pain / severe pain / breathing difficulty):
"Please stop exercising immediately and contact a healthcare provider."
```

### 10e. System Prompt Architecture

Ordered sections (each must be present):
1. Identity + role
2. **Safety rules** (highest priority — override all other instructions)
3. Communication style (MI + Filipino cultural adaptations)
4. Capabilities and limits
5. Adaptive behavior rules (MI graduated responses)
6. Uncertainty protocol (tiered confidence framework — see below)
7. **Injected user context** (Layer 3 working memory)

**Tiered confidence framework:**

| Level | Phrasing |
|---|---|
| High consensus | "Research consistently shows…" |
| Moderate evidence | "Evidence suggests… though individual needs vary" |
| Contested/individual | "The science is still evolving — let's try this for 2–3 weeks and see how you respond" |
| Outside AI scope | "That's something a specialist would be better equipped to answer" |

---

## 11. Files to Create

### `src/lib/supabaseClient.js`
Single Supabase client instance. Returns `null` when env vars are missing — all cloud functions check for null before calling.

### `src/hooks/useAuth.js`
Auth lifecycle hook. Returns `{ session, user, loading, authError, signIn, signUp, signOut }`.
- `getSession()` on mount + `onAuthStateChange` subscription
- `loading = true` only during initial session check

### `src/utils/nutrition.js`
New file. Exports: `calcBMR`, `calcTDEE`, `calcNutritionGoals`, `calcBMI`. All pure functions. Used during `completeAssessment` and visible in the nutrition tab.

### `src/data/foodDatabase.js`
Filipino food database extension. Adds adobo, sinigang, tinola, bangus, pandesal, longganisa, and other staples with accurate macros. Merged with or extends the existing food lookup.

### `src/components/LoginScreen.jsx`
Full-screen auth gate. Dark cyberpunk style (CSS vars, Orbitron font).
- Email + password inputs
- "SIGN IN" / "CREATE ACCOUNT" toggle mode
- Red error display for `authError`
- Loading state on buttons

### `src/components/OnboardingScreen.jsx`
7-step assessment flow (research-updated from original 5 steps). Matches existing card/button styling.

**Step structure:**
```
┌─────────────────────────────────┐
│  STEP 3 OF 7                    │
│  ▓▓▓▓▓▓▓▓░░░░░░  (progress bar) │
│                                 │
│  What's your fitness level?     │
│                                 │
│  [ ○ Beginner    ]              │
│  [ ● Intermediate ]             │
│  [ ○ Advanced    ]              │
│                                 │
│  [← BACK]           [NEXT →]   │
└─────────────────────────────────┘
```

- Step 1: PAR-Q+ (7 yes/no health questions) — flags displayed as warning, not block
- Steps 2–5: Goal, Experience, Schedule (days + session length), Equipment
- Step 6: Body stats (age, sex, weight, height, optional waist)
- Step 7: Day-of-week grid (must select exactly N days) + optional injury notes
- "FINISH" disabled until exactly N days selected and body stats filled

---

## 12. Files to Modify

### `src/utils/storage.js` — Add cloud functions

Keep all existing `localStorage` functions unchanged. Add:

```js
// Reads user state from Supabase (returns null if not found or error)
export async function cloudGet(userId)

// Upserts full state to Supabase
export async function cloudSet(userId, state)

// Resets cloud state to empty object
export async function cloudClear(userId)

// Debounced write — batches rapid state changes, fires after 3s of inactivity
export function cloudSetDebounced(userId, state)
```

All functions no-op gracefully if `supabase` client is `null` (missing env vars).

---

### `src/hooks/useGameState.js` — Cloud sync + assessment action

**Signature change:** `useGameState(userId)` — receives auth user ID from App

**New `cloudLoading` state:**
- `true` on mount when `userId` is set (while fetching from Supabase)
- Set to `false` once cloud fetch resolves

**On mount effect (triggered when `userId` changes):**
```
1. Set cloudLoading = true
2. Call cloudGet(userId)
3. If cloud state is empty AND localStorage has data:
   → Auto-migrate: cloudSet(userId, localData), show toast "Progress synced to account ✓"
   → Use localData as initial state
4. If cloud state has data:
   → Use cloudData (cloud wins over local)
5. Run mergeState() + checkDayReset() on chosen state
6. Set state + set cloudLoading = false
```

**Auto-save effect (existing effect, augmented):**
```js
// Existing: storageSet(state)
// NEW: also call cloudSetDebounced(userId, state)
```

**`pagehide` / `beforeunload` handler (existing, augmented):**
```js
// Existing: storageSet(state)
// NEW: also cloudSet(userId, state)  ← synchronous best-effort
```

**Updated actions:**
- `resetAll()` → also calls `cloudClear(userId)`
- `importData(data)` → also calls `cloudSet(userId, merged)` immediately

**New action `completeAssessment(assessment)`:**
```
1. selectProgram(assessment)              → programId
2. getProgramById(programId)              → program
3. buildInitialWeights(program, level)    → liftWeights, liftHistory (scaled by experience level)
4. calcNutritionGoals(assessment)         → nutritionGoals
5. calcBMI(weightKg, heightCm)            → bmi, bmiCategory (Asian-adjusted)
6. waistToHeightRatio = waistCm / heightCm (flag if ≥0.5)
7. setState with: assessment (completed=true), programId, sessionsPerWeek,
                  activeExercises, trainingDays, liftWeights, liftHistory,
                  nutritionGoals, bmi, bmiCategory, waistToHeightRatio
8. cloudSet(userId, newState)             ← save immediately, not debounced
```

**Return value — add:**
```js
{ ...existing, cloudLoading, completeAssessment }
```

---

### `src/data/gameData.js` — DEFAULT_STATE additions

```js
// Program fields
programId: 'fullbody_3x',
sessionsPerWeek: 3,
activeExercises: null,        // null = use built-in EXERCISES (backwards compat)
consecutiveCompletions: {},   // { [exId]: number } — for 2-for-2 rule

// Body composition
bmi: null,
bmiCategory: null,            // Asian-adjusted category
waistToHeightRatio: null,

// Onboarding assessment (research-updated 7-step)
assessment: {
  completed: false,
  parqFlagged: false,
  goal: null,          // 'recomp' | 'fat_loss' | 'muscle' | 'strength'
  level: null,         // 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: null,   // 2 | 3 | 4 | 5
  sessionLength: null, // 30 | 45 | 60 | 90 (minutes)
  equipment: null,     // 'full_gym' | 'dumbbells' | 'barbell_home' | 'bodyweight'
  trainingDays: [],    // e.g. ['tue', 'thu', 'sat']
  injuries: '',
  programId: null,
  age: null, sex: null, weightKg: null, heightCm: null, waistCm: null,
}
```

Change `name` default from `'Jake'` to `''` (set by user during onboarding or settings).

> **Backwards compatibility:** Existing users who sign up get their localStorage data auto-migrated. Since `totalSessions > 0`, `assessment.completed` is set to `true` during migration — **onboarding is skipped**. All history, XP, PRs are preserved.

---

### `src/App.jsx` — Auth + onboarding gates

```jsx
function App() {
  const { user, loading: authLoading, authError, signIn, signUp, signOut } = useAuth();
  const { state, cloudLoading, completeAssessment, ...actions } = useGameState(user?.id);

  // Gate rendering
  if (authLoading)  return <FullScreenLoader label="LOADING..." />;
  if (!user)        return <LoginScreen authError={authError} onSignIn={signIn} onSignUp={signUp} />;
  if (cloudLoading) return <FullScreenLoader label="SYNCING..." />;
  if (!state.assessment?.completed)
                    return <OnboardingScreen onComplete={completeAssessment} />;

  // Main app — unchanged from here down
  return <MainApp state={state} {...actions} onSignOut={signOut} userEmail={user.email} />;
}
```

Pass `onSignOut={signOut}` and `userEmail={user.email}` through to `SettingsTab`.

---

### `src/components/WorkoutTab.jsx` — Accept `exercises` prop

Currently imports `EXERCISES` directly from `gameData.js`. Change to receive an `exercises` prop:

```jsx
// Before:
import { EXERCISES } from '../data/gameData';

// After:
export default function WorkoutTab({ state, exercises, ...props }) {
  // use `exercises` instead of `EXERCISES`
```

`App.jsx` passes: `exercises={state.activeExercises || EXERCISES}`

---

### `src/components/ExerciseModal.jsx` — Accept `exercises` prop

Same change as WorkoutTab. Currently finds exercise by ID with `EXERCISES.find(...)`. Change to use a prop:

```jsx
export default function ExerciseModal({ exId, exercises, ...props }) {
  const ex = exercises.find(e => e.id === exId);
```

WorkoutTab passes its `exercises` prop down to `ExerciseModal`.

---

### `src/components/OtherTabs.jsx` — Account section in Settings

Add a new "Account" section at the top of `SettingsTab`:

```
┌─────────────────────────────────┐
│  ACCOUNT                        │
│  jake@email.com                 │
│  [ SIGN OUT ]  (red button)     │
└─────────────────────────────────┘
```

Props added to `SettingsTab`: `userEmail`, `onSignOut`.

---

### `src/utils/notifications.js` — Dynamic training days

**Replace hardcoded `[1, 3, 5]` (Mon/Wed/Fri) with:**
```js
// Build the set of JS day numbers from trainingDays in state
// trainingDays: ['mon', 'wed', 'fri'] → [1, 3, 5]
const DAY_MAP = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };

function getWorkoutDayNumbers(trainingDays) {
  return (trainingDays || []).map(d => DAY_MAP[d]);
}
```

**Update `isTodayWorkoutDay(trainingDays)`** — receives training days from state, not hardcoded.

**Update `maybeFireOpenNotification(state)`** — already receives state, just use `state.trainingDays` instead of `[1,3,5]`.

**Update `isTodayCheckinDay(trainingDays)`** — check-in day defaults to the day after the user's last training day, or Sunday if not set.

---

## 10. Backwards Compatibility for Existing User

When the existing single user (Jake) creates an account:

1. App shows `LoginScreen` → user signs up with email
2. Supabase creates empty `user_profiles` row
3. `useGameState` cloud load: cloud is empty, localStorage has full data
4. Auto-migration fires: local data is written to cloud, toast shown
5. Since `state.totalSessions > 0`, `assessment.completed` is set to `true` during migration — **onboarding is skipped**
6. All existing workout history, XP, streaks, PRs are preserved

---

## 15. File Change Summary

| File | Action | Change Size | Key Change |
|---|---|---|---|
| `src/lib/supabaseClient.js` | **Create** | ~10 lines | Null-safe Supabase singleton |
| `src/hooks/useAuth.js` | **Create** | ~55 lines | Full auth lifecycle |
| `src/utils/nutrition.js` | **Create** | ~50 lines | Mifflin-St Jeor, Asian BMI, macro calc |
| `src/data/foodDatabase.js` | **Create** | ~100 lines | Filipino food entries |
| `src/components/LoginScreen.jsx` | **Create** | ~120 lines | Auth gate UI |
| `src/components/OnboardingScreen.jsx` | **Create** | ~350 lines | 7-step assessment (PAR-Q+, body stats) |
| `src/data/programs.js` | **Create** | ~150 lines | 4 programs + 2-for-2 progression |
| `src/utils/storage.js` | **Modify** | +50 lines | Add cloudGet/Set/Clear/Debounced |
| `src/hooks/useGameState.js` | **Modify** | +100 lines | Cloud sync, completeAssessment, 2-for-2 tracking |
| `src/data/gameData.js` | **Modify** | +25 lines | Updated DEFAULT_STATE (assessment, BMI, program fields) |
| `src/utils/gameLogic.js` | **Modify** | +15 lines | selectProgram, buildInitialWeights |
| `src/App.jsx` | **Modify** | +30 lines | Auth + onboarding gates |
| `src/components/WorkoutTab.jsx` | **Modify** | ~5 lines | Accept `exercises` prop |
| `src/components/ExerciseModal.jsx` | **Modify** | ~5 lines | Accept `exercises` prop |
| `src/components/OtherTabs.jsx` | **Modify** | +25 lines | Account section + Filipino health context |
| `src/utils/notifications.js` | **Modify** | +15 lines | Dynamic training days |

---

## 16. Verification Checklist

**Auth & Cloud:**
- [ ] `npm run dev` → `LoginScreen` shows instead of main app
- [ ] Sign up → Supabase dashboard shows row in `auth.users` + `user_profiles`
- [ ] Sign out → `LoginScreen` returns
- [ ] Sign in from different browser → same state (cloud wins over local)
- [ ] Existing localStorage user signs up → data migrated, onboarding skipped

**Onboarding Assessment:**
- [ ] 7-step flow completes correctly (PAR-Q+, goal, level, schedule, equipment, body stats, days)
- [ ] PAR-Q+ "Yes" answer shows warning but doesn't block progress
- [ ] Body stats calculate correct BMI with Asian-adjusted category (test: 68 kg, 170 cm → BMI 23.5 → "Overweight" not "Normal")
- [ ] `nutritionGoals` populated after onboarding (calories not 2000 flat anymore — personalized)
- [ ] Correct program assigned: bodyweight user → `bodyweight_3x`; 2-day user → `fullbody_2x`
- [ ] Correct exercises show in WorkoutTab after program assignment

**Progression (2-for-2 Rule):**
- [ ] Complete all sets at target reps → `consecutiveCompletions[exId]` increments
- [ ] Two consecutive full completions → `overloadSuggestions[exId] = 'increase'`
- [ ] Counter resets after weight increase

**Filipino Features:**
- [ ] Filipino food entries appear in nutrition search (adobo, sinigang, pandesal, etc.)
- [ ] BMI display uses Asian-adjusted categories
- [ ] Waist-to-height ratio ≥0.5 shows elevated risk indicator

**Notifications & Schedule:**
- [ ] User on Tue/Thu/Sat schedule → notifications fire on those days, not Mon/Wed/Fri
- [ ] 2-day program user completes 2 sessions → week advances (not stuck waiting for 3rd)

**AI Coach:**
- [ ] Coach references assessment data in first conversation
- [ ] Coach does not shame missed workouts
- [ ] Coach does not recommend calories below safety floor

**Build:**
- [ ] `npm run build` completes without errors
