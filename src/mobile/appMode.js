// Decides whether CEIS runs as the iPhone/phone app (launched from the Home
// Screen) instead of the desktop website. Nothing here changes the website:
// desktop browsers and normal mobile-browser visits keep the existing design.
//
// App mode is on when:
//   - the page was launched from the Home Screen (standalone display mode)
//     on a touch device, or
//   - the URL has ?app=1 (for testing in Safari before adding to the Home
//     Screen); ?app=0 turns the override off again.

const FORCE_KEY = "ceis:app-mode";

export function decideAppMode({ search = "", standalone = false, coarsePointer = false, forced = false }) {
  const flag = new URLSearchParams(search).get("app");
  if (flag === "1") return true;
  if (flag === "0") return false;
  if (forced) return true;
  return Boolean(standalone && coarsePointer);
}

let cached;

export function isAppMode() {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined") return (cached = false);
  const search = window.location.search;
  const flag = new URLSearchParams(search).get("app");
  try {
    if (flag === "1") window.sessionStorage.setItem(FORCE_KEY, "1");
    if (flag === "0") window.sessionStorage.removeItem(FORCE_KEY);
  } catch {
    // Storage unavailable: the query flag still applies to this load.
  }
  let forced = false;
  try { forced = window.sessionStorage.getItem(FORCE_KEY) === "1"; } catch { /* ignore */ }
  cached = decideAppMode({
    search,
    standalone: window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true,
    coarsePointer: Boolean(window.matchMedia?.("(pointer: coarse)").matches),
    forced,
  });
  return cached;
}

// In app mode the layout runs edge to edge (under the status bar and around
// the home indicator) and pads itself with the safe-area insets. Applied only
// in app mode so the website's viewport is untouched.
export function applyAppViewport() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
  document.documentElement.classList.add("ceis-app-mode");
}
