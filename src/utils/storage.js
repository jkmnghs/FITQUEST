const SK = 'fitquest-recomp-v2';

export function storageSet(val) {
  const str = JSON.stringify(val);
  try { localStorage.setItem(SK, str); } catch (e) {}
  try { sessionStorage.setItem(SK, str); } catch (e) {}
}

export function storageGet() {
  try {
    const v = localStorage.getItem(SK);
    if (v) return JSON.parse(v);
  } catch (e) {}
  try {
    const v = sessionStorage.getItem(SK);
    if (v) return JSON.parse(v);
  } catch (e) {}
  return null;
}

export function storageClear() {
  try { localStorage.removeItem(SK); } catch (e) {}
  try { sessionStorage.removeItem(SK); } catch (e) {}
}
