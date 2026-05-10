export async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      return true;
    } catch (e) {
      console.error('SW registration failed:', e);
      return false;
    }
  }
  return false;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result;
}

export function showLocalNotification(title, body, icon = '/icon-192.png') {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon, badge: icon, vibrate: [200, 100, 200] });
  } catch (e) {}
}

export function scheduleWorkoutReminders(enabled) {
  if (!enabled || Notification.permission !== 'granted') return;
  // Store reminder preference — actual scheduling done by the app on load
  localStorage.setItem('fitquest-reminders', enabled ? 'true' : 'false');
}

// Map day abbreviations to JS day numbers (0 = Sunday)
const DAY_MAP = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function getWorkoutDayNumbers(trainingDays) {
  return (trainingDays || []).map(d => DAY_MAP[d]).filter(n => n !== undefined);
}

// Check if today is a workout day — uses user's training schedule from state.
// Falls back to Mon/Wed/Fri if no training days are configured yet.
export function isTodayWorkoutDay(trainingDays) {
  const day = new Date().getDay();
  const days = trainingDays?.length ? getWorkoutDayNumbers(trainingDays) : [1, 3, 5];
  return days.includes(day);
}

// Check-in day = day after the user's last training day, or Sunday by default.
export function isTodayCheckinDay(trainingDays) {
  const day = new Date().getDay();
  if (!trainingDays?.length) return day === 0; // fallback: Sunday
  const nums = getWorkoutDayNumbers(trainingDays).sort((a, b) => a - b);
  // The day after the highest training day (wrapping around to Sunday)
  const lastTrainingDay = nums[nums.length - 1];
  const checkinDay = (lastTrainingDay + 1) % 7;
  return day === checkinDay;
}

export function getDayName() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}

// Fire contextual notification on app open
export function maybeFireOpenNotification(state) {
  if (!state.notificationsEnabled || Notification.permission !== 'granted') return;

  const t = new Date().toDateString();
  const lastNotif = localStorage.getItem('fitquest-last-notif');
  if (lastNotif === t) return; // already fired one today

  const trainingDays = state.assessment?.trainingDays;
  const userName = state.name || 'Champ';

  // Overload nudge: if there are increase suggestions and it's a workout day
  if (isTodayWorkoutDay(trainingDays) && !state.todaySessionFinished) {
    const increases = Object.entries(state.overloadSuggestions || {})
      .filter(([,v]) => v === 'increase').length;
    const title = increases > 0
      ? `💪 Time to train — ${increases} lift${increases > 1 ? 's' : ''} ready to increase!`
      : `⚔️ Workout day — let's go, ${userName}!`;
    const body = increases > 0
      ? 'Your RPE was ≤8 last session. Progressive overload time!'
      : 'Your full-body session is waiting. Get after it.';
    showLocalNotification(title, body);
    localStorage.setItem('fitquest-last-notif', t);
  } else if (isTodayCheckinDay(trainingDays) && (state.weeklyCheckins?.length === 0 || state.weeklyCheckins?.[state.weeklyCheckins.length - 1]?.week !== state.currentWeek)) {
    showLocalNotification('📋 Check-in Time', 'Log your weight and measurements for Week ' + state.currentWeek);
    localStorage.setItem('fitquest-last-notif', t);
  }
}
