// Dark mode for the student and staff portals. The saved preference lives in
// Firestore (users/{uid}/private/preferences); a per-account local copy lets the
// theme apply before Firestore answers, so the page does not flash light first.
// The styles themselves are in pages/portalStyles.js under [data-ceis-theme].

const key = uid => `ceis:dark-mode:${uid}`;

export function applyTheme(uid, dark) {
  if (dark) document.documentElement.dataset.ceisTheme = "dark";
  else delete document.documentElement.dataset.ceisTheme;
  try {
    if (uid) window.localStorage.setItem(key(uid), dark ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode); the Firestore value still applies.
  }
}

export function cachedDarkMode(uid) {
  try {
    return window.localStorage.getItem(key(uid)) === "1";
  } catch {
    return false;
  }
}

// Called when leaving the student/staff portal so other portals stay light.
export function clearTheme() {
  delete document.documentElement.dataset.ceisTheme;
}
