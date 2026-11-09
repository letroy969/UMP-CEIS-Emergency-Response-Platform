import { lazy, Suspense, useState } from "react";
import { isAppMode } from "./mobile/appMode.js";
import LandingSite      from "./LandingSite.jsx";
import CommandCenterApp from "./CommandCenter.jsx";
import VerifyEmail from "./auth/VerifyEmail.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

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
// The phone app is a separate bundle, loaded only when CEIS is launched from the
// Home Screen (see mobile/appMode.js); the website never downloads it.
const MobileApp = lazy(() => import("./mobile/MobileApp.jsx"));

export default function App() {
  if (isAppMode() && window.location.pathname !== "/verify-email") {
    return (
      <Suspense fallback={<div role="status" aria-label="Loading UMP CEIS" style={{ minHeight: "100vh", background: "#0E1530" }} />}>
        <MobileApp />
      </Suspense>
    );
  }
  return (
    <>
      <Screens />
      <ThemeToggle />
    </>
  );
}

function Screens() {
  const [screen, setScreen] = useState(() =>
    new URLSearchParams(window.location.search).get("access") === "system"
      ? "system"
      : "landing",
  );

  if (window.location.pathname === "/verify-email") return <VerifyEmail />;

  if (screen === "landing") {
    return (
      <LandingSite
        onAccessSystem={() => setScreen("system")}
      />
    );
  }

  if (screen === "triage") {
    return (
      <LandingSite
        initialPage="triage"
        onAccessSystem={() => setScreen("system")}
        onBackToPortal={() => setScreen("system")}
      />
    );
  }

  // screen === "system"
  return (
    <CommandCenterApp
      onBack={() => setScreen("landing")}
      onOpenMedicalTriage={() => setScreen("triage")}
    />
  );
}
