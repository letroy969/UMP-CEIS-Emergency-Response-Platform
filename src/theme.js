import { useSyncExternalStore } from "react";
import { isAppMode } from "./mobile/appMode.js";

// One light/dark setting for the whole app (landing page, sign-in and every
// portal). Light is the default; the choice is remembered on this device.
// Signed-in students and staff also have it saved to their account (see
// StudentPortal in CommandCenter.jsx), so it follows them across devices.
// The dark styles live in index.css under html[data-ceis-theme="dark"].

const STORAGE_KEY = "ceis:theme";
const listeners = new Set();
let current = "light";

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function paint(mode) {
  // The phone app (src/mobile) has real light/dark colour tokens, so it gets
  // its own attribute instead of the website's colour-inversion dark mode.
  const attribute = isAppMode() ? "ceisMobileTheme" : "ceisTheme";
  if (mode === "dark") document.documentElement.dataset[attribute] = "dark";
  else delete document.documentElement.dataset[attribute];
}

// Call once before the first render so a saved dark choice applies without a light flash.
export function initTheme() {
  current = readStored();
  paint(current);
}

export function getTheme() {
  return current;
}

export function setTheme(mode) {
  const next = mode === "dark" ? "dark" : "light";
  if (next === current) return;
  current = next;
  paint(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
  listeners.forEach(listener => listener(next));
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "light");
}
