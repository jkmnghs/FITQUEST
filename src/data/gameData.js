export const EXERCISES = [
  { id: 'squat',    name: 'Barbell Squat',       sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 45,   note: 'Compound quad/glute — prioritize depth' },
  { id: 'bench',    name: 'Bench Press',          sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 42.5, note: 'Barbell or DB — whichever available' },
  { id: 'rdl',      name: 'Romanian Deadlift',    sets: 3, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 55,   note: 'Hinge pattern — slight knee bend' },
  { id: 'pulldown', name: 'Lat Pulldown',         sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 47.5, note: 'Full stretch top, squeeze bottom' },
  { id: 'ohp',      name: 'DB Overhead Press',    sets: 2, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 15,   note: 'Seated or standing — control negative' },
  { id: 'legcurl',  name: 'Leg Curl',             sets: 2, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 40,   note: 'Hips FLAT on pad — slow controlled reps' },
  { id: 'plank',    name: 'Plank',                sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
];

export const PHASES = [
  { weeks: [1, 2],      name: 'PHASE 1', desc: 'Foundation — Find RPE 8 baselines',       icon: '🔍' },
  { weeks: [3, 8],      name: 'PHASE 2', desc: 'Linear Progression — +2.5kg/week',         icon: '📈' },
  { weeks: [9, 9],      name: 'PHASE 3', desc: 'Deload — 80% weight, 2 sets',              icon: '🧘' },
  { weeks: [10, 12],    name: 'PHASE 4', desc: 'Continued Progression',                    icon: '⚡' }
];

export const RANKS = [
  { l: 'E', name: 'Novice',      minLevel: 1,  color: '#78909c' },
  { l: 'D', name: 'Apprentice',  minLevel: 3,  color: '#66bb6a' },
  { l: 'C', name: 'Warrior',     minLevel: 6,  color: '#00e5ff' },
  { l: 'B', name: 'Champion',    minLevel: 10, color: '#b388ff' },
  { l: 'A', name: 'Elite',       minLevel: 15, color: '#ff9100' },
  { l: 'S', name: 'Legendary',   minLevel: 20, color: '#ffd600' }
];

export const ACHIEVEMENTS = [
  { id: 'first',   icon: '⚔️',  name: 'First Blood',      desc: 'Complete 1 session',           check: s => s.totalSessions >= 1 },
  { id: 'w5',      icon: '🔥',  name: 'On Fire',           desc: '5 sessions done',               check: s => s.totalSessions >= 5 },
  { id: 'w15',     icon: '💪',  name: 'Dedicated',         desc: '15 sessions done',              check: s => s.totalSessions >= 15 },
  { id: 'w36',     icon: '🏆',  name: 'Program Complete',  desc: '36 sessions (full 12wk)',       check: s => s.totalSessions >= 36 },
  { id: 's3',      icon: '🗡️',  name: '3-Day Streak',      desc: '3 training days straight',      check: s => s.bestStreak >= 3 },
  { id: 's7',      icon: '⚡',  name: 'Iron Week',         desc: 'All 3 sessions in a week',      check: s => s.perfectWeeks >= 1 },
  { id: 's4w',     icon: '🌟',  name: 'Month Strong',      desc: '4 perfect weeks',               check: s => s.perfectWeeks >= 4 },
  { id: 'v5k',     icon: '🏋️',  name: '5K Volume',         desc: '5,000 kg total volume',         check: s => s.totalVolume >= 5000 },
  { id: 'v25k',    icon: '💎',  name: '25K Volume',        desc: '25,000 kg total volume',        check: s => s.totalVolume >= 25000 },
  { id: 'l5',      icon: '🎖️',  name: 'Level 5',           desc: 'Reach Level 5',                 check: s => s.level >= 5 },
  { id: 'l10',     icon: '👑',  name: 'Level 10',          desc: 'Reach Level 10',                check: s => s.level >= 10 },
  { id: 'hrs5',    icon: '📊',  name: '5 Hours',           desc: '5 hours total training',        check: s => s.totalMinutes >= 300 },
  { id: 'ci',      icon: '📋',  name: 'Accountable',       desc: 'Complete 4 weekly check-ins',   check: s => s.checkins >= 4 },
  { id: 'deload',  icon: '🧘',  name: 'Smart Recovery',    desc: 'Complete deload week',          check: s => s.deloadDone }
];

export const FORM_TIPS = {
  squat: [
    'Brace your core like you\'re about to take a punch — 360° of tension.',
    'Drive your knees out over your pinky toes throughout the rep.',
    'Think "chest up" on the way up to prevent folding forward.',
    'Break at hips AND knees simultaneously — don\'t hinge first.',
    'Your feet should be about shoulder-width, toes 15-30° out.'
  ],
  bench: [
    'Retract and depress your shoulder blades — think "bend the bar."',
    'Drive your feet into the floor throughout the entire set.',
    'Touch the bar to your lower chest/upper sternum — not your neck.',
    'Elbows at ~45° from your torso, not flared 90° out.',
    'A slight arch is fine. Use leg drive to transfer power through your whole body.'
  ],
  rdl: [
    'Push your hips BACK — this is a hinge, not a squat.',
    'Keep the bar dragging close to your legs the entire way down.',
    'Stop when you feel a deep hamstring stretch — usually just below the knee.',
    'Squeeze your glutes and drive your hips through at the top.',
    'Soft bend in knees throughout — this is not a stiff-leg deadlift.'
  ],
  pulldown: [
    'Lead with your elbows pulling DOWN — not your hands pulling.',
    'Get a full stretch at the top. Don\'t short-rep it.',
    'Lean back ~15° — creates better lat angle.',
    'Pause and squeeze your lats at the bottom for 1 second.',
    'Don\'t let your shoulders shrug up. Keep them packed down.'
  ],
  ohp: [
    'Stack the weight over your wrists, elbows, and shoulders.',
    'Press in a slight backward arc — bar travels slightly behind your head at top.',
    'Squeeze your glutes and brace abs to protect your lower back.',
    'Don\'t let your head jut forward — "push your face through the window."',
    'Control the eccentric — 2-3 seconds down, explosive up.'
  ],
  legcurl: [
    'HIPS FLAT. This is the most important cue. If hips rise, you\'re cheating.',
    'Full range of motion — don\'t stop short at the top.',
    '2-second hold at peak contraction, 3-second negative.',
    'Don\'t use momentum — if you\'re swinging, drop the weight.',
    'Point toes slightly to emphasize different hamstring heads.'
  ],
  plank: [
    'Neutral spine — don\'t let your hips pike up or sag.',
    'Squeeze glutes AND quads — your whole body should be under tension.',
    'Push the floor away. Think of lengthening your body, not just holding.',
    'Breathe! Don\'t hold your breath. Slow, controlled breaths.',
    'If your form breaks, stop. Quality over duration every time.'
  ]
};

export const DEFAULT_STATE = {
  name: 'Jake Mangahas',
  level: 1,
  xp: 0,
  totalXp: 0,
  streak: 0,
  bestStreak: 0,
  lastDate: null,
  currentWeek: 1,
  unit: 'kg',
  totalSessions: 0,
  totalVolume: 0,
  totalMinutes: 0,
  perfectWeeks: 0,
  checkins: 0,
  deloadDone: false,
  log: [],
  achDone: [],
  weekProgress: {},
  backfillLock: {},
  todayExDone: [],
  todayExDate: null,
  todayExDetails: {},
  todaySessionFinished: false,
  liftWeights: { squat: 45, bench: 42.5, rdl: 55, pulldown: 47.5, ohp: 15, legcurl: 40 },
  liftHistory: { squat: [], bench: [], rdl: [], pulldown: [], ohp: [], legcurl: [] },
  weeklyRPE: {},
  overloadSuggestions: {},
  personalRecords: {},
  sessionStartTime: null,
  weeklyCheckins: [],
  notificationsEnabled: false,
  aiCoachHistory: []
};
