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

// Check if today is a workout day (Mon=1, Wed=3, Fri=5)
export function isTodayWorkoutDay() {
  const day = new Date().getDay();
  return [1, 3, 5].includes(day);
}

// Check if today is Sunday (check-in day)
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

  const day = new Date().getDay();

  // Overload nudge: if there are increase suggestions and it's a workout day
  if ([1,3,5].includes(day) && !state.todaySessionFinished) {
    const increases = Object.entries(state.overloadSuggestions || {})
      .filter(([,v]) => v === 'increase').length;
    const title = increases > 0
      ? `💪 Time to train — ${increases} lift${increases > 1 ? 's' : ''} ready to increase!`
      : '⚔️ Workout day — let\'s go, Jake!';
    const body = increases > 0
      ? 'Your RPE was ≤8 last session. Progressive overload time!'
      : 'Mon/Wed/Fri full-body session is waiting. Get after it.';
    showLocalNotification(title, body);
    localStorage.setItem('fitquest-last-notif', t);
  } else if (day === 0 && (state.weeklyCheckins?.length === 0 || state.weeklyCheckins?.[state.weeklyCheckins.length - 1]?.week !== state.currentWeek)) {
    showLocalNotification('📋 Sunday Check-in', 'Time to log your weight and measurements for Week ' + state.currentWeek);
    localStorage.setItem('fitquest-last-notif', t);
  }
}
