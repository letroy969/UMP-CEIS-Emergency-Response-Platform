import { Moon, Sun } from "lucide-react";
import { toggleTheme, useTheme } from "../theme.js";

// Floating light/dark switch shown on every screen of the app.
export default function ThemeToggle() {
  const dark = useTheme() === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" className="ceis-theme-toggle" onClick={toggleTheme} aria-label={label} aria-pressed={dark} title={label}>
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
