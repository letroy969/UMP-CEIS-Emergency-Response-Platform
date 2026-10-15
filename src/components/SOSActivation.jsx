import { useState } from "react";
import { LoaderCircle, Siren } from "lucide-react";
import { activateSOS } from "../incidentApi.js";

export default function SOSActivation({ user }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function sendSOS() {
    if (!navigator.geolocation) {
      setError("This device cannot provide GPS location. Call Campus Security or emergency services directly.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const response = await activateSOS(user, position);
        setResult(response);
      } catch (requestError) {
        setError(requestError.message || "SOS could not be sent. Call for help directly.");
      } finally {
        setBusy(false);
      }
    }, locationError => {
      setError(locationError.code === locationError.PERMISSION_DENIED
        ? "Location permission is needed to dispatch help to you. Call Campus Security or emergency services directly."
        : "Your location could not be determined. Call Campus Security or emergency services directly.");
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  return (
    <section aria-label="Emergency SOS" style={{ background: "#fff4f2", border: "1px solid #f2c4bd", borderLeft: "5px solid #c62828", borderRadius: 10, padding: 18, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ color: "#9d1b1b", fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Need urgent campus help?</div>
          <p style={{ color: "#62413d", fontSize: 12.5, lineHeight: 1.55 }}>SOS sends your identity and GPS location to the incident system and tries to assign the nearest responder who has marked themselves available.</p>
        </div>
        <button type="button" onClick={sendSOS} disabled={busy}
          aria-label={busy ? "Sending SOS" : "Send emergency SOS"}
          style={{ background: busy ? "#9e9e9e" : "#b42318", color: "#fff", border: 0, borderRadius: 7, padding: "13px 22px", fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer", minWidth: 150,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,transition:"transform .18s ease,box-shadow .18s ease" }}>
          {busy ? <LoaderCircle size={17} aria-hidden="true" style={{animation:"spin 1s linear infinite"}}/> : <Siren size={17} aria-hidden="true"/>}
          {busy ? "Sending SOS…" : "Send SOS"}
        </button>
      </div>
      {result && <p role="status" aria-live="polite" style={{ color: result.dispatch?.assigned ? "#176b39" : "#8a4b08", fontSize: 12.5, marginTop: 12, lineHeight: 1.55 }}>
        {result.dispatch?.assigned
          ? `SOS ${result.incident.reference} sent. ${result.dispatch.responder} was assigned (${result.dispatch.distanceKm} km away). Keep your phone available.`
          : `SOS ${result.incident.reference} recorded, but no available responder was found. Call Campus Security or emergency services now.`}
      </p>}
      {error && <p role="alert" style={{ color: "#9d1b1b", fontSize: 12.5, marginTop: 12 }}>{error}</p>}
      <div style={{ marginTop: 10, color: "#62413d", fontSize: 11.5 }}>
        <a href="tel:+27130020010" style={{ color: "#8e1e17", fontWeight: 700 }}>Call UMP Campus Security: +27 13 002 0010</a>
        <span> · </span><a href="tel:10177" style={{ color: "#8e1e17", fontWeight: 700 }}>SA EMS: 10177</a>
      </div>
    </section>
  );
}
