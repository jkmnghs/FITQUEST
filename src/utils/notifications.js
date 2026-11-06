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

// Training days are flexible: any day is a workout day while the current week
// still has sessions to do. `trainingDays` is kept for callers' signatures.
export function isTodayWorkoutDay(_trainingDays, state) {
  if (!state) return true;
  const wp = state.weekProgress?.[state.currentWeek];
  if (wp?.completed) return false;
  return (wp?.count || 0) < (state.sessionsPerWeek || 3);
}

// Check-in day = Sunday, the last day to fit the week's sessions in.
export function isTodayCheckinDay() {
  return new Date().getDay() === 0;
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
  if (isTodayWorkoutDay(trainingDays, state) && !state.todaySessionFinished) {
    const increases = Object.entries(state.overloadSuggestions || {})
      .filter(([,v]) => v === 'increase').length;
    const title = increases > 0
      ? `💪 Time to train — ${increases} lift${increases > 1 ? 's' : ''} ready to increase!`
      : `⚔️ ${Math.max(0, (state.sessionsPerWeek || 3) - (state.weekProgress?.[state.currentWeek]?.count || 0))} session(s) left this week — let's go, ${userName}!`;
    const body = increases > 0
      ? 'Your RPE was ≤8 last session. Progressive overload time!'
      : 'Any day works — just get them in before Sunday to keep your streak.';
    showLocalNotification(title, body);
    localStorage.setItem('fitquest-last-notif', t);
  } else if (isTodayCheckinDay(trainingDays) && (state.weeklyCheckins?.length === 0 || state.weeklyCheckins?.[state.weeklyCheckins.length - 1]?.week !== state.currentWeek)) {
    showLocalNotification('📋 Check-in Time', 'Log your weight and measurements for Week ' + state.currentWeek);
    localStorage.setItem('fitquest-last-notif', t);
  }
}
