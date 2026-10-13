import { useState } from "react";
import { enablePushNotifications } from "../notifications/push.js";

export default function PushNotificationsButton({ user, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      await enablePushNotifications(user);
      setMessage("Emergency notifications enabled on this device.");
    } catch (error) {
      setMessage(error.message || "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={enable} disabled={busy} aria-label="Enable emergency push notifications"
        style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", borderRadius: 5, padding: compact ? "6px 9px" : "8px 11px", cursor: busy ? "wait" : "pointer", fontSize: compact ? 11 : 12 }}>
        {busy ? "Enabling…" : "Enable alerts"}
      </button>
      {message && <span role="status" aria-live="polite" style={{ maxWidth: 230, color: "#fff", fontSize: 11 }}>{message}</span>}
    </span>
  );
}
