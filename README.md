# FitQuest — Jake Mangahas's Recomp (React Edition)

A fully featured 12-week body recomposition tracking app, converted from vanilla HTML/JS to a clean Vite + React architecture.

## What's New vs Original

### 🐛 Bug Fixed
- **Session Timer**: The original had a stacking `setInterval` bug — every re-render created a new interval without clearing the old one, causing the timer to jump erratically. Fixed using a `useRef` + single `useEffect` with proper cleanup.

### 🤖 AI Coach (New)
A Claude-powered coaching tab with 5 modes:
- **Pre-Workout Pep Talk** — Energizes you with personalized motivation based on your current week, lifts, and streak
- **Post-Session Analysis** — Reviews today's completed sets, RPE data, and tells you what it means for next session
- **Progressive Overload Plan** — Shows exactly which lifts to increase, repeat, or back off based on your RPE history
- **Form Tips** — Detailed cues for any of the 7 program exercises
- **Check-in Review** — Analyzes your weight trend data and gives honest recomp progress feedback

The AI coach knows ALL your data: current week, lift weights, PRs, RPE history, body weight trend, session completion rates.

### 🔔 Push Notifications (New)
- Mon/Wed/Fri workout reminders (fires on app open if it's a training day)
- Sunday check-in reminder
- Progressive overload nudge (tells you how many lifts are ready to increase)
- Enable in the Settings tab

## Setup

### Requirements
- Node.js 18+
- npm or yarn

### Install & Run

```bash
# Extract this zip and cd into the folder
cd fitquest

# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### API Key for AI Coach

The AI Coach uses the Anthropic API. You need to configure your API key.

**Option A: Vite environment variable (recommended for local dev)**

Create `.env.local` in the project root:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Then update `src/components/AICoachTab.jsx` — find the fetch call and add:
```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
}
```

**Option B: Use via claude.ai artifact** (already configured — no key needed when running inside Claude)

> ⚠️ Never commit your API key to git. Add `.env.local` to `.gitignore`.

## Project Structure

```
fitquest/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker (push notifications)
└── src/
    ├── main.jsx            # Entry point
    ├── App.jsx             # Root — tab routing, notification setup
    ├── index.css           # Global styles + CSS variables
    ├── data/
    │   └── gameData.js     # Exercises, phases, ranks, achievements, form tips
    ├── utils/
    │   ├── storage.js      # localStorage + sessionStorage fallback
    │   ├── gameLogic.js    # Pure functions (XP, rank, phase, weight conversion)
    │   └── notifications.js # Push notification registration + scheduling
    ├── hooks/
    │   └── useGameState.js # Central state management hook
    └── components/
        ├── BgFx.jsx        # Animated background orbs + grid
        ├── Toast.jsx       # Toast notification
        ├── Header.jsx      # Avatar, rank, XP bar, phase banner
        ├── WorkoutTab.jsx  # Main workout view + session timer (fixed)
        ├── ExerciseModal.jsx # Exercise detail sheet + form tips + rest timer
        ├── RestTimer.jsx   # Circular rest timer (fixed: no interval stacking)
        ├── StatsTab.jsx    # Stats, weight chart, PRs, lift progression
        ├── RankTab.jsx     # Rank display + ladder
        ├── CheckinTab.jsx  # Sunday check-in form + history
        ├── AICoachTab.jsx  # 🤖 Claude-powered AI coaching (NEW)
        └── OtherTabs.jsx   # Achievements, Log, Summary, Settings
```

## Key Architecture Decisions

- **Single state hook** (`useGameState`) — all game state in one place with auto-save
- **Pure utility functions** — game logic separated from React (easy to test)
- **Multi-layer storage** — localStorage + sessionStorage fallback for robustness
- **Proper timer cleanup** — `useRef` + `useEffect` with return cleanup function
- **Progressive enhancement** — notifications degrade gracefully if unsupported
