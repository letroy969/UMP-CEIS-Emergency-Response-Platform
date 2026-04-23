import { useState } from "react";
import LandingSite      from "./LandingSite.jsx";
import CommandCenterApp from "./CommandCenter.jsx";

/**
 * UMP CEIS — Unified Application Root
 *
 * Screens:
 *   "landing"  →  Public marketing / info site  (LandingSite)
 *   "system"   →  Login + Student / Admin portals  (CommandCenterApp)
 *
 * The LandingSite calls onAccessSystem() whenever the user clicks any
 * "Access System" CTA. This swaps to the Command Centre which handles
 * its own login, student portal, and admin dashboard routing internally.
 */
export default function App() {
  const [screen, setScreen] = useState("landing");

  if (screen === "landing") {
    return (
      <LandingSite
        onAccessSystem={() => setScreen("system")}
      />
    );
  }

  // screen === "system"
  return (
    <CommandCenterApp
      onBack={() => setScreen("landing")}
    />
  );
}
