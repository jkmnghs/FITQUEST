const SK = 'fitquest-recomp-v2';

export function storageSet(val) {
  const str = JSON.stringify(val);
  try { localStorage.setItem(SK, str); } catch (e) { console.warn('[FitQuest] localStorage write failed:', e); }
  try { sessionStorage.setItem(SK, str); } catch (e) { console.warn('[FitQuest] sessionStorage write failed:', e); }
}

export function storageGet() {
  try {
    const v = localStorage.getItem(SK);
    if (v) return JSON.parse(v);
  } catch (e) { console.warn('[FitQuest] localStorage read failed:', e); }
  try {
    const v = sessionStorage.getItem(SK);
    if (v) return JSON.parse(v);
  } catch (e) { console.warn('[FitQuest] sessionStorage read failed:', e); }
  return null;
}

export function storageClear() {
  try { localStorage.removeItem(SK); } catch (e) {}
  try { sessionStorage.removeItem(SK); } catch (e) {}
}
