# FitQuest

A gamified 12-week fitness tracking PWA built with React + Vite, Supabase auth, and Claude AI. Users earn XP, rank up, and get coached by an AI that knows their full training history.

## Features

### 🏋️ Training Programs
7 structured programs that auto-select based on your equipment and goals:

| Program | Equipment | Days/week |
|---|---|---|
| Full Body 3×/week | Full gym | 3 |
| Full Body 2×/week | Full gym | 2 |
| Full Body 4×/week | Full gym | 4 |
| Dumbbell 3×/week | Dumbbells + machines | 3 |
| Dumbbell 4×/week | Dumbbells + machines | 4 |
| Dumbbells Only 3×/week | Dumbbells only | 3 |
| Bodyweight 3×/week | No equipment | 3 |

All programs follow the same 12-week / 4-phase structure:
- **Phase 1** (Weeks 1–2) — Find working baselines
- **Phase 2** (Weeks 3–8) — Linear progression +2.5kg/week
- **Phase 3** (Week 9) — Deload at 80% weight
- **Phase 4** (Weeks 10–12) — Continued progression

### 💪 Exercise Management
- Swipe left on any exercise card to reveal **SWAP** and **DELETE** buttons
- **+ ADD EXERCISE** button at the bottom of every workout
- 70+ exercises across 7 categories: Chest, Back, Legs, Shoulders, Arms, Core, Cardio
- Search + category filter in the exercise picker
- Gym and home/bodyweight exercises included

### 🎮 Gamification
- XP earned per completed set, bonus for finishing sessions
- 10 rank tiers (Recruit → Elite) with animated rank-up celebrations
- 20+ achievements (streaks, PRs, program completion, etc.)
- Weekly session tracker with dot indicators

### 🤖 AI Coach (Claude Haiku)
A reactive coach tab with 5 modes:
- **Pre-Workout** — personalized motivation based on your week, lifts, and streak
- **Post-Session** — reviews completed sets and RPE data
- **Progressive Overload** — tells you exactly which lifts to increase, repeat, or back off
- **Form Tips** — detailed cues for any exercise
- **Check-in Review** — analyzes weight trend and recomp progress

### 🤖 Proactive Agent (Vercel Cron)
A background agent that runs on schedule and sends inbox messages:
- Detects personal records and sends congratulations
- Monitors missed sessions and sends accountability nudges
- Can switch your program via tool call (`switch_program`)
- Can update lift weights (`update_lift_weight`)
- All messages appear in the AI Coach inbox tab

### 🍽️ Nutrition Tracker
- AI-powered meal photo analysis (camera or gallery)
- USDA FoodData Central integration for verified macros
- Manual food entry with AI lookup
- Daily macro progress bars (calories, protein, carbs, fat)
- Goals auto-calculated from your assessment (height, weight, goal)

### 📊 Stats & Check-ins
- Weight trend chart with 30/60/90-day views
- Lift progression graphs per exercise
- Personal records tracking
- Weekly check-in form (weight, energy, sleep, notes)

### 🔔 Push Notifications
- Workout day reminders
- Sunday check-in reminder
- Progressive overload nudge

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 |
| Auth & DB | Supabase (`user_profiles.state` JSONB) |
| AI | Claude claude-haiku-4-5-20251001 (coach + agent) |
| Hosting | Vercel (serverless functions + cron) |
| PWA | Service worker + Web Push |

---

## Local Setup

### Requirements
- Node.js 18+
- A Supabase project
- An Anthropic API key
- A USDA FoodData Central API key (free)

### Install & Run

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env` file in the project root (never commit this):

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
USDA_API_KEY=your-usda-key
```

Get a free USDA API key at https://fdc.nal.usda.gov/api-key-signup

### Supabase Setup

Create a `user_profiles` table:

```sql
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  state jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "Users can read own profile"
  on user_profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on user_profiles for insert with check (auth.uid() = id);
```

---

## Project Structure

```
fitquest/
├── api/                    # Vercel serverless functions
│   ├── coach.js            # AI coach endpoint
│   ├── agent.js            # Proactive agent (tool-calling loop)
│   ├── agent-weekly.js     # Cron trigger for weekly agent runs
│   ├── nutrition.js        # Meal photo analysis + USDA lookup
│   ├── usda.js             # USDA food search
│   ├── ping.js             # Health check
│   └── _programs.js        # Shared program definitions for API layer
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
└── src/
    ├── App.jsx             # Root — tab routing, state wiring
    ├── data/
    │   ├── gameData.js     # Ranks, achievements, XP config
    │   └── programs.js     # 7 program definitions + selectProgram()
    ├── hooks/
    │   ├── useGameState.js       # Central state + cloud sync
    │   ├── useAgentMessages.js   # Agent inbox + poll logic
    │   ├── useAuth.js            # Supabase auth
    │   └── useSubscription.js    # Subscription state
    ├── utils/
    │   ├── gameLogic.js    # XP, rank, phase, weight conversion (pure)
    │   ├── storage.js      # localStorage + Supabase cloud sync
    │   ├── nutrition.js    # Macro goal calculations
    │   ├── nutritionUtils.js
    │   ├── notifications.js
    │   └── coachExport.js  # Formats state snapshot for AI context
    └── components/
        ├── WorkoutTab.jsx        # Exercise cards, swipe UI, exercise picker
        ├── AICoachTab.jsx        # Coach chat + agent inbox
        ├── NutritionTab.jsx      # Meal log + macro bars
        ├── StatsTab.jsx          # Charts, PRs, lift history
        ├── CheckinTab.jsx        # Weekly check-in form
        ├── RankTab.jsx           # Rank ladder
        ├── ExerciseModal.jsx     # Exercise detail + set logging + rest timer
        ├── OnboardingScreen.jsx  # 7-step assessment flow
        ├── LoginScreen.jsx       # Supabase auth UI
        └── OtherTabs.jsx         # Achievements, log, settings
```

---

## Running Tests

```bash
npm test
```

Tests cover game logic (XP, rank, phase) and nutrition utilities.
