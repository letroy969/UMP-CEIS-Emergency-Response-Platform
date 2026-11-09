import { useEffect, useState } from "react";
import { Compass, ExternalLink, MapPin, Navigation } from "lucide-react";
import { BD, GREEN, GREENL, MID, NAVY, NK, ORANGE, ORANGEL, PAPER, SL, WHITE } from "../../constants.js";
import { directionsLinks, formatDistance, navigationSummary, navigationTarget } from "../../maps/navigation.js";

// Phone compass heading in degrees clockwise from north, when the device has one.
function useCompassHeading(enabled) {
  const [heading, setHeading] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const onOrientation = event => {
      if (Number.isFinite(event.webkitCompassHeading)) setHeading(event.webkitCompassHeading); // iOS
      else if (event.absolute && Number.isFinite(event.alpha)) setHeading((360 - event.alpha) % 360); // Android
    };
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, onOrientation, true);
    return () => window.removeEventListener(eventName, onOrientation, true);
  }, [enabled]);
  return heading;
}

const linkStyle = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", border: `1px solid ${BD}`, borderRadius: 6, background: WHITE, color: NAVY, fontSize: 12.5, fontWeight: 700, textDecoration: "none" };

export default function NavigationPanel({ incident, position, locationError, onArrive, arriving }) {
  const [compassOn, setCompassOn] = useState(false);
  const [compassError, setCompassError] = useState("");
  const compassHeading = useCompassHeading(compassOn);
  const target = navigationTarget(incident);

  if (!target) {
    return (
      <div style={{ padding: 14, background: ORANGEL, border: `1px solid ${ORANGE}40`, borderRadius: 8, fontSize: 13, color: NK }}>
        <strong>No map location for this report.</strong> It has no GPS fix and its building is not on the campus map. Use the written location: <em>{incident.loc}</em>.
      </div>
    );
  }

  const summary = navigationSummary(position, target);
  const links = directionsLinks(target);
  // Device compass first; otherwise the GPS course while moving; otherwise north-up.
  const heading = compassHeading ?? position?.heading ?? null;
  const arrowRotation = summary ? (summary.bearing - (heading ?? 0) + 360) % 360 : 0;
  const canArrive = ["TEAM_DISPATCHED", "ACKNOWLEDGED"].includes(incident.status);

  async function enableCompass() {
    setCompassError("");
    try {
      // iOS 13+ requires an explicit permission prompt from a user gesture.
      if (typeof window.DeviceOrientationEvent?.requestPermission === "function") {
        const result = await window.DeviceOrientationEvent.requestPermission();
        if (result !== "granted") { setCompassError("Compass permission was not granted."); return; }
      }
      setCompassOn(true);
    } catch {
      setCompassError("This device does not provide a compass.");
    }
  }

  return (
    <section aria-label="Navigation guide" style={{ border: `1px solid ${BD}`, borderRadius: 10, padding: 14, background: WHITE }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div aria-hidden="true" style={{ position: "relative", width: 92, height: 92, borderRadius: "50%", background: PAPER, border: `2px solid ${BD}`, flexShrink: 0 }}>
          {!heading && <span style={{ position: "absolute", top: 3, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800, color: MID }}>N</span>}
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", transform: `rotate(${arrowRotation}deg)`, transition: "transform .4s ease" }}>
            <Navigation size={44} color={summary?.arrived ? GREEN : NAVY} fill={summary?.arrived ? GREEN : NAVY} style={{ transform: "rotate(-45deg)" }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }} aria-live="polite">
          {summary ? (
            summary.arrived ? (
              <div style={{ fontSize: 20, fontWeight: 800, color: GREEN }}>You have arrived</div>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: NK, fontFamily: "'IBM Plex Mono',monospace" }}>{formatDistance(summary.meters)}</div>
                <div style={{ fontSize: 14, color: NK, fontWeight: 600 }}>Head {summary.direction}{heading != null ? " (follow the arrow)" : ""}</div>
                <div style={{ fontSize: 12.5, color: SL, marginTop: 2 }}>≈ {summary.walkMinutes} min on foot · ≈ {summary.driveMinutes} min by vehicle</div>
              </>
            )
          ) : (
            <div style={{ fontSize: 13, color: SL }}>{locationError || "Finding your location…"}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: MID, marginTop: 6 }}>
            <MapPin size={13} aria-hidden="true" />
            {target.label}{target.source === "gps" ? (target.accuracyMeters ? ` · reporter GPS ±${Math.round(target.accuracyMeters)} m` : " · reporter GPS") : " · building location (report had no GPS)"}
            {position?.accuracyMeters ? ` · your GPS ±${Math.round(position.accuracyMeters)} m` : ""}
          </div>
        </div>
      </div>

      {summary?.arrived && canArrive && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12, padding: 10, background: GREENL, borderRadius: 7 }}>
          <span style={{ fontSize: 13, color: NK }}>You are at the reported location. Let the team know.</span>
          <button type="button" onClick={onArrive} disabled={arriving} style={{ padding: "8px 14px", background: GREEN, color: WHITE, border: 0, borderRadius: 6, fontWeight: 800, cursor: arriving ? "wait" : "pointer" }}>{arriving ? "Updating…" : "Mark on scene"}</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <a href={links.google} target="_blank" rel="noopener noreferrer" style={linkStyle}><Navigation size={14} aria-hidden="true" />Google Maps (walk)</a>
        <a href={links.googleDriving} target="_blank" rel="noopener noreferrer" style={linkStyle}><ExternalLink size={14} aria-hidden="true" />Google Maps (drive)</a>
        <a href={links.waze} target="_blank" rel="noopener noreferrer" style={linkStyle}><ExternalLink size={14} aria-hidden="true" />Waze</a>
        {!compassOn && (
          <button type="button" onClick={enableCompass} style={{ ...linkStyle, cursor: "pointer" }}><Compass size={14} aria-hidden="true" />Use phone compass</button>
        )}
      </div>
      {compassError && <p style={{ fontSize: 11.5, color: MID, margin: "6px 0 0" }}>{compassError}</p>}
      <p style={{ fontSize: 11, color: MID, margin: "8px 0 0" }}>The arrow and distance are straight-line guidance and update as you move. Use Google Maps or Waze for road-by-road directions.</p>
    </section>
  );
}
