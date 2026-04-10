# FitQuest: Multi-User Platform — Implementation Spec

## 1. Why This Change

FitQuest is currently hardcoded to a single user ("Jake"), a single program (Full Body 3×/week Mon-Wed-Fri), and browser `localStorage`. This works for one person but can't scale to a real product.

**Goals of this upgrade:**
- Any user can sign up and get their own isolated account
- All data (workouts, AI conversations, meals, check-ins) is stored in the cloud per user
- Each new user goes through a short assessment to get a personalized program
- Users choose their own training days instead of a hardcoded MWF schedule
- The app works across multiple devices seamlessly (cloud sync)

**Target scale:** 50–100 users. No need for complex infrastructure — a simple per-user JSON blob in Supabase is perfect.

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

### 6a. The 5 Steps

| Step | Question | Options |
|------|----------|---------|
| 1 | What's your primary goal? | Body recomp · Fat loss · Build muscle · Get stronger |
| 2 | What's your fitness level? | Beginner (new to lifting) · Intermediate (6+ months) · Advanced (2+ yrs) |
| 3 | How many days/week can you train? | 2 · 3 · 4 · 5+ |
| 4 | What equipment do you have? | Full gym · Dumbbells + machines · Barbell at home · Bodyweight only |
| 5 | Pick your training days | Day-of-week picker (Mon–Sun), must select exactly N days from step 3 |

Step 5 also has an optional **injury/notes** text field.

### 6b. What Happens on "Finish"

1. `selectProgram(assessment)` — pure function, picks best program ID
2. `buildInitialWeights(program)` — creates starting `liftWeights` and `liftHistory`
3. State is updated: `assessment.completed = true`, `programId`, `sessionsPerWeek`, `activeExercises`, `trainingDays`
4. Immediately saved to Supabase cloud
5. Main app renders

### 6c. Data Stored in State

```js
assessment: {
  completed: false,
  goal: null,          // 'recomp' | 'fat_loss' | 'muscle' | 'strength'
  level: null,         // 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: null,   // 2 | 3 | 4 | 5
  equipment: null,     // 'full_gym' | 'dumbbells' | 'barbell_home' | 'bodyweight'
  trainingDays: [],    // e.g. ['tue', 'thu', 'sat']
  injuries: '',        // optional free text
  programId: null,     // assigned after completion
}
```

---

## 7. Program Library

### 7a. Program Selection Logic

```
equipment === 'bodyweight'              → bodyweight_3x
daysPerWeek === 2                       → fullbody_2x
daysPerWeek === 4+ AND not beginner     → fullbody_4x
default (3 days, full gym, beginner)    → fullbody_3x   ← current program
```

### 7b. Programs (new file: `src/data/programs.js`)

Each program object shape:
```js
{
  id: 'fullbody_3x',
  name: 'Full Body 3×/week',
  description: 'Description shown to user',
  sessionsPerWeek: 3,
  exercises: [
    {
      id: 'squat', name: 'Barbell Squat',
      sets: 3, reps: 10, rest: '2.5 min', restSec: 150,
      rpe: 8, startKg: 45, note: 'Cue text...'
    },
    // ...
  ]
}
```

| Program ID | Name | Days/wk | Equipment | Who It's For |
|---|---|---|---|---|
| `fullbody_3x` | Full Body 3×/week | 3 | Full gym | Beginners/intermediate — current default |
| `fullbody_2x` | Full Body 2×/week | 2 | Full gym | Busy schedules, same exercises, +1 set each |
| `fullbody_4x` | Full Body 4×/week | 4 | Full gym | Intermediate+ wanting more frequency |
| `bodyweight_3x` | Bodyweight 3×/week | 3 | None | Beginners with no gym access |

**Bodyweight program exercises:** Push-up, Bodyweight Squat, Inverted Row, Reverse Lunge, Glute Bridge, Tricep Dip, Plank

All programs share the same **12-week / 4-phase structure**:
- Weeks 1–2: Foundation (find baselines)
- Weeks 3–8: Linear Progression (+2.5 kg/week)
- Week 9: Deload (80% weight, 2 sets)
- Weeks 10–12: Continued Progression

---

## 8. Files to Create

### `src/lib/supabaseClient.js`
Single Supabase client instance. Returns `null` when env vars are missing so the rest of the app can skip cloud calls gracefully.

```js
// Key logic:
export const supabase = (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)
  ? createClient(url, key)
  : null;
```

---

### `src/hooks/useAuth.js`
React hook that manages the full auth lifecycle.

**Returns:** `{ session, user, loading, authError, signIn, signUp, signOut }`

**Behavior:**
- On mount: calls `supabase.auth.getSession()` to restore existing session
- Subscribes to `onAuthStateChange` for session updates (login, logout, token refresh)
- `loading` is `true` only during the initial session check
- `signIn(email, password)` → returns `true` on success, sets `authError` on failure
- `signUp(email, password)` → same pattern
- `signOut()` → clears session + sets `session = null`

---

### `src/components/LoginScreen.jsx`
Full-screen auth gate. Matches the dark cyberpunk design (CSS vars, Orbitron font).

**UI elements:**
- FitQuest logo / title
- Tagline
- Email input
- Password input
- "SIGN IN" primary button
- "CREATE ACCOUNT" secondary link/button (toggles mode)
- Error message display (red) when `authError` is set
- Loading state on buttons while auth is in flight

**Toggle behavior:** A single screen that switches between "Sign In" and "Sign Up" mode with a link below the main button.

---

### `src/components/OnboardingScreen.jsx`
5-step assessment form shown once to new users. Matches existing card/button styling.

**UI structure:**
```
┌─────────────────────────────────┐
│  STEP 2 OF 5                    │
│  ▓▓▓▓▓░░░░░░░░░  (progress bar) │
│                                 │
│  What's your fitness level?     │
│                                 │
│  [ ○ Beginner   ]               │
│  [ ● Intermediate ]             │
│  [ ○ Advanced   ]               │
│                                 │
│  [← BACK]          [NEXT →]     │
└─────────────────────────────────┘
```

- Step 5 replaces radio buttons with a day-of-week grid (M T W T F S S)
- The "FINISH" button on step 5 is disabled until exactly N days are selected
- Step 5 also has an optional injury notes `<textarea>`

---

## 9. Files to Modify

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
1. Run selectProgram(assessment) → programId
2. Get program from getProgramById(programId)
3. Build starting liftWeights + liftHistory for the program
4. setState with: assessment (completed=true), programId, sessionsPerWeek,
                  activeExercises, trainingDays, liftWeights, liftHistory
5. cloudSet(userId, newState)  ← save immediately, not debounced
```

**Return value — add:**
```js
{ ...existing, cloudLoading, completeAssessment }
```

---

### `src/data/gameData.js` — DEFAULT_STATE additions

Add to `DEFAULT_STATE`:
```js
// Program fields
programId: 'fullbody_3x',
sessionsPerWeek: 3,
activeExercises: null,   // null = use built-in EXERCISES (backwards compat)

// Onboarding assessment
assessment: {
  completed: false,
  goal: null,
  level: null,
  daysPerWeek: null,
  equipment: null,
  trainingDays: [],
  injuries: '',
  programId: null,
}
```

Change `name` default from `'Jake'` to `''` (users set their own name during assessment).

> **Backwards compatibility:** Existing `localStorage` users who upgrade will have `assessment.completed = undefined`. The app treats this as `false` only if it's a **new account**. Existing users who sign up get prompted to create an account — their localStorage data is migrated and `assessment.completed` is set to `true` automatically during migration (they skip onboarding since they already have workout history).

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

## 11. File Change Summary

| File | Action | Change Size |
|---|---|---|
| `src/lib/supabaseClient.js` | **Create** | ~10 lines |
| `src/hooks/useAuth.js` | **Create** | ~55 lines |
| `src/components/LoginScreen.jsx` | **Create** | ~120 lines |
| `src/components/OnboardingScreen.jsx` | **Create** | ~250 lines |
| `src/data/programs.js` | **Create** | ~120 lines |
| `src/utils/storage.js` | **Modify** | +50 lines (additive) |
| `src/hooks/useGameState.js` | **Modify** | +70 lines, 2 actions |
| `src/data/gameData.js` | **Modify** | +15 lines to DEFAULT_STATE |
| `src/utils/gameLogic.js` | **Modify** | +15 lines (selectProgram) |
| `src/App.jsx` | **Modify** | +30 lines (gates) |
| `src/components/WorkoutTab.jsx` | **Modify** | ~5 lines (prop swap) |
| `src/components/ExerciseModal.jsx` | **Modify** | ~5 lines (prop swap) |
| `src/components/OtherTabs.jsx` | **Modify** | +20 lines (account section) |
| `src/utils/notifications.js` | **Modify** | +10 lines (dynamic days) |

---

## 12. Verification Checklist

After implementation:

- [ ] `npm run dev` → app shows `LoginScreen` instead of main app
- [ ] Sign up → Supabase dashboard shows new row in `auth.users` + `user_profiles`
- [ ] `OnboardingScreen` appears after sign-up, completes in 5 steps
- [ ] Assigned program shows correct exercises in WorkoutTab
- [ ] Complete a workout → `user_profiles.state` JSONB updates in Supabase dashboard
- [ ] Sign out → `LoginScreen` shows
- [ ] Sign in again (same browser) → same workout state loads from cloud
- [ ] Sign in from a different browser → same state (cloud wins)
- [ ] Existing user with localStorage data signs up → data migrated, onboarding skipped
- [ ] User on 2-day program completes 2 sessions → week marked complete (not 3)
- [ ] Push notifications fire on user's chosen days, not hardcoded MWF
- [ ] `npm run build` → no TypeScript or import errors
