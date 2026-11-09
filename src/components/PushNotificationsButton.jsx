import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, X } from "lucide-react";
import {
  disablePushNotifications,
  enablePushNotifications,
  onForegroundNotification,
  pushStatus,
  syncPushNotifications,
} from "../notifications/push.js";

const LABEL = {
  checking: "Alerts…",
  unsupported: "Alerts unavailable",
  unconfigured: "Alerts not set up",
  denied: "Alerts blocked",
  default: "Enable alerts",
  granted: "Alerts on",
};

const HELP = {
  unsupported: "This browser cannot receive push notifications. On iPhone, add CEIS to your Home Screen (Share → Add to Home Screen) and open it from there.",
  unconfigured: "Push notifications are not configured for this deployment yet.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
  default: "Get emergency alerts on this device, even when CEIS is closed.",
  granted: "Emergency alerts are on for this device. Click to turn them off.",
};

// Header (dark) or page (light) control for this device's emergency alerts.
// `showBanners` renders in-app banners for alerts that arrive while CEIS is
// open; enable it on one instance per page so banners are not duplicated.
export default function PushNotificationsButton({ user, compact = false, variant = compact ? "dark" : "light", showBanners = compact }) {
  const [status, setStatus] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    let active = true;
    pushStatus()
      .then(async current => {
        if (!active) return;
        setStatus(current);
        if (current === "granted") await syncPushNotifications(user);
      })
      .catch(error => console.error("Push notifications could not be refreshed", error));
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!showBanners) return undefined;
    return onForegroundNotification(alert => {
      const id = `${Date.now()}-${Math.random()}`;
      setBanners(current => [...current.slice(-2), { ...alert, id }]);
      const urgent = ["sos", "backup", "campus-alert", "dispatch"].includes(alert.data?.kind);
      if (!urgent) window.setTimeout(() => setBanners(current => current.filter(item => item.id !== id)), 12000);
    });
  }, [showBanners]);

  async function toggle() {
    if (["unsupported", "unconfigured", "denied", "checking"].includes(status)) {
      setMessage(HELP[status] || "");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (status === "granted") {
        if (!window.confirm("Turn off emergency alerts on this device?")) return;
        await disablePushNotifications(user);
        setStatus("default");
        setMessage("Alerts turned off on this device.");
      } else {
        await enablePushNotifications(user);
        setStatus("granted");
        setMessage("Emergency alerts are on for this device.");
      }
    } catch (error) {
      setStatus(await pushStatus().catch(() => status));
      setMessage(error.message || "Could not change notification settings.");
    } finally {
      setBusy(false);
    }
  }

  const dark = variant === "dark";
  const on = status === "granted";
  const Icon = on ? BellRing : status === "default" ? Bell : BellOff;
  const colors = dark
    ? { background: on ? "rgba(46,160,90,.25)" : "rgba(255,255,255,.08)", border: on ? "1px solid rgba(120,220,150,.5)" : "1px solid rgba(255,255,255,.18)", color: "#fff", text: "#fff" }
    : { background: on ? "#E8F5EA" : "#fff", border: `1px solid ${on ? "#2E7D46" : "#1A2766"}`, color: on ? "#1B6B3A" : "#1A2766", text: "#344060" };

  return (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} disabled={busy} aria-pressed={on} title={HELP[status]}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: colors.background, border: colors.border, color: colors.color, borderRadius: 5, padding: compact ? "6px 9px" : "8px 12px", cursor: busy ? "wait" : "pointer", fontSize: compact ? 11.5 : 12.5, fontWeight: 700 }}>
          <Icon size={compact ? 13 : 15} aria-hidden="true" />
          {busy ? "Working…" : LABEL[status]}
        </button>
        {message && <span role="status" aria-live="polite" style={{ maxWidth: 260, color: colors.text, fontSize: 11.5 }}>{message}</span>}
      </span>
      {showBanners && banners.length > 0 && (
        <div aria-live="assertive" style={{ position: "fixed", top: 12, right: 12, zIndex: 9500, display: "grid", gap: 8, width: "min(360px, calc(100vw - 24px))" }}>
          {banners.map(banner => {
            const urgent = ["sos", "backup", "campus-alert", "dispatch"].includes(banner.data?.kind);
            return (
              <div key={banner.id} role="alert" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: "#fff", borderLeft: `5px solid ${urgent ? "#B83018" : "#1A2766"}`, boxShadow: "0 12px 30px rgba(10,20,45,.25)" }}>
                <BellRing size={18} color={urgent ? "#B83018" : "#1A2766"} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0D1526" }}>{banner.title}</div>
                  <div style={{ fontSize: 12.5, color: "#344060", marginTop: 2 }}>{banner.body}</div>
                </div>
                <button type="button" aria-label="Dismiss alert" onClick={() => setBanners(current => current.filter(item => item.id !== banner.id))} style={{ border: 0, background: "none", color: "#6474A0", cursor: "pointer", padding: 2 }}><X size={16} aria-hidden="true" /></button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
