import { useState } from "react";
import { CheckCircle2, LoaderCircle, Phone, Siren } from "lucide-react";
import { activateSOS } from "../../incidentApi.js";
import { EMERGENCY_NUMBERS } from "../data.js";
import { HoldButton, Sheet } from "../ui.jsx";

// SOS: hold to send. Same request as the website's SOS button (identity + GPS),
// which alerts admins and responders and auto-dispatches the nearest one.
export default function SOSSheet({ open, onClose, authUser, onSent }) {
  const [state, setState] = useState({ phase: "ready", result: null, error: "" });

  function close() {
    if (state.phase === "sending") return;
    setState({ phase: "ready", result: null, error: "" });
    onClose();
  }

  function send() {
    if (!navigator.geolocation) {
      setState({ phase: "error", result: null, error: "This device cannot share its location. Call Campus Security or EMS now." });
      return;
    }
    setState({ phase: "sending", result: null, error: "" });
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const result = await activateSOS(authUser, position);
        setState({ phase: "sent", result, error: "" });
        onSent?.(result);
      } catch (error) {
        setState({ phase: "error", result: null, error: error.message || "SOS could not be sent. Call for help directly." });
      }
    }, locationError => {
      setState({
        phase: "error",
        result: null,
        error: locationError.code === locationError.PERMISSION_DENIED
          ? "Location access is needed to send help to you. Allow it in Settings › Privacy › Location Services, or call now."
          : "Your location could not be found. Call Campus Security or EMS now.",
      });
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  const { phase, result, error } = state;

  return (
    <Sheet open={open} onClose={close} title="Emergency SOS" full dismissible={phase !== "sending"}>
      <div style={{ textAlign: "center" }}>
        {phase === "ready" && (
          <>
            <p style={{ fontSize: 16, color: "var(--m-text-2)", margin: "4px 12px 6px" }}>Press and hold for 1.5 seconds. Your name and GPS location go to campus responders and the admin team.</p>
            <HoldButton onComplete={send} label="Press and hold to send SOS">
              <span style={{ display: "grid", placeItems: "center", gap: 4 }}>
                <Siren size={52} aria-hidden="true" />
                <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>SOS</span>
                <span style={{ fontSize: 13, opacity: .9 }}>Hold to send</span>
              </span>
            </HoldButton>
            <button type="button" className="m-btn m-btn--small m-btn--plain" style={{ marginBottom: 6 }}
              onClick={() => { if (window.confirm("Send an emergency SOS with your location now?")) send(); }}>
              Send without holding
            </button>
          </>
        )}
        {phase === "sending" && (
          <div style={{ padding: "60px 0" }} role="status">
            <LoaderCircle size={56} className="m-spin" color="var(--m-red)" aria-hidden="true" />
            <h2 style={{ fontSize: 22, margin: "14px 0 4px" }}>Sending SOS…</h2>
            <p className="m-muted">Getting your location and alerting responders.</p>
          </div>
        )}
        {phase === "sent" && result && (
          <div style={{ padding: "24px 4px" }} role="status">
            <CheckCircle2 size={64} color="var(--m-green)" aria-hidden="true" />
            <h2 style={{ fontSize: 24, margin: "12px 0 6px" }}>SOS sent</h2>
            <p style={{ color: "var(--m-text-2)", margin: "0 0 6px" }}>Reference <strong>{result.incident.reference}</strong></p>
            <p style={{ fontSize: 16, margin: "0 8px 16px" }}>
              {result.dispatch?.assigned
                ? `${result.dispatch.responder} has been dispatched${result.dispatch.distanceKm != null ? ` (${result.dispatch.distanceKm} km away)` : ""}. Stay where you are and keep your phone with you.`
                : "Responders and the admin team have been alerted. The first responder to accept will come to your location. If you are in danger, also call now."}
            </p>
          </div>
        )}
        {phase === "error" && <div className="m-alert m-alert--error" role="alert" style={{ textAlign: "left", margin: "10px 0 16px" }}>{error}</div>}
      </div>

      <h2 className="m-section-title" style={{ marginLeft: 4 }}>Call for help</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {EMERGENCY_NUMBERS.map(item => (
          <a key={item.key} className="m-btn m-btn--block" href={item.href} style={{ justifyContent: "space-between", background: item.key === "ems" ? "var(--m-red)" : "var(--m-surface)", color: item.key === "ems" ? "#fff" : "var(--m-text)", boxShadow: "var(--m-card-shadow)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Phone size={18} aria-hidden="true" />{item.label}</span>
            <span style={{ fontWeight: 700 }}>{item.number}</span>
          </a>
        ))}
      </div>
      {phase === "error" && <button type="button" className="m-btn m-btn--tinted m-btn--block" style={{ marginTop: 14 }} onClick={() => setState({ phase: "ready", result: null, error: "" })}>Try SOS again</button>}
    </Sheet>
  );
}
