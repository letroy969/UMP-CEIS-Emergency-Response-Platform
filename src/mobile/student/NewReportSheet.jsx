import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Crosshair, LoaderCircle, Phone } from "lucide-react";
import { INC_TYPES, MBOMBELA_BUILDINGS, PRIORITY } from "../../constants.js";
import { MAPPED_BUILDINGS } from "../../maps/campusBuildings.js";
import { checkCampusLocation, getCurrentLocation } from "../../maps/location.js";
import { createIncident, uploadIncidentAttachment } from "../../incidentApi.js";
import CampusMap from "../../components/CampusMap.jsx";
import IncidentEvidenceCapture from "../../components/IncidentEvidenceCapture.jsx";
import { Sheet } from "../ui.jsx";

const STEPS = ["What's happening?", "Where?", "Details", "Photos & video", "Review"];
const EMPTY_FORM = { type: "medical", building: "", desc: "", priority: "P3" };

// Step-by-step incident report. Same data and API calls as the website's report
// form (incident first, then evidence uploads), laid out one question per step.
export default function NewReportSheet({ open, onClose, authUser, onSubmitted, onOpenTriage }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [files, setFiles] = useState([]);
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const submittingRef = useRef(false);

  async function captureLocation() {
    setLocating(true);
    setLocationNote("Finding your location…");
    try {
      const current = await getCurrentLocation();
      setLocation(current);
      setForm(value => ({ ...value, building: "" }));
      setLocationNote(`Location captured (±${Math.round(current.accuracyMeters)} m).`);
    } catch (locationError) {
      setLocationNote(`${locationError.message || "Location is unavailable."} Choose a building or tap the map instead.`);
    } finally {
      setLocating(false);
    }
  }

  // Start finding the location as soon as the sheet opens, like the website does.
  useEffect(() => {
    if (open) captureLocation();
  }, [open]);

  function reset() {
    setStep(0);
    setForm(EMPTY_FORM);
    setLocation(null);
    setLocationNote("");
    setFiles([]);
    setRecording(false);
    setProgress(null);
    setError("");
    setResult(null);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  const hasLocation = Boolean(location || form.building);
  const canContinue = [true, hasLocation && !locating, true, !recording, hasLocation && !recording][step];

  async function submit() {
    if (submittingRef.current || !hasLocation || recording) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    const mapped = MAPPED_BUILDINGS.find(building => building.id === form.building);
    const point = location || (mapped ? { latitude: mapped.lat, longitude: mapped.lng, accuracyMeters: null, capturedAt: new Date().toISOString(), source: "mapped-building" } : null);
    const campusCheck = point ? checkCampusLocation(point) : "unknown";
    let incident;
    try {
      incident = await createIncident(authUser, {
        type: form.type,
        priority: form.priority,
        building: location ? "" : form.building,
        buildingName: location ? (mapped?.name || null) : MBOMBELA_BUILDINGS.find(building => building.id === form.building)?.name,
        desc: form.desc,
        lat: point?.latitude ?? null,
        lng: point?.longitude ?? null,
        accuracy: point?.accuracyMeters ?? null,
        locationCapturedAt: point?.capturedAt ?? null,
        locationSource: point?.source ?? null,
        campusVerified: campusCheck === "inside" ? true : campusCheck === "outside" ? false : null,
      });
    } catch (submitError) {
      setError(submitError.message);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    let uploadError = "";
    for (const [index, file] of files.entries()) {
      setProgress({ index: index + 1, total: files.length, percent: 0 });
      try {
        await uploadIncidentAttachment(authUser, incident.id, file, value => setProgress({ index: index + 1, total: files.length, percent: Math.round(value * 100) }));
      } catch (uploadIssue) {
        uploadError = `${uploadIssue.message} Your report was still saved as ${incident.reference}.`;
        break;
      }
    }
    setProgress(null);
    setResult({ reference: incident.reference, id: incident.id, type: form.type, uploadError });
    submittingRef.current = false;
    setSubmitting(false);
    onSubmitted?.(incident);
  }

  const type = INC_TYPES[form.type];

  return (
    <Sheet open={open} onClose={close} title={result ? "Report sent" : STEPS[step]} full dismissible={!submitting}
      left={!result && step > 0 && !submitting ? <button type="button" className="m-btn m-btn--small m-btn--plain" onClick={() => setStep(value => value - 1)}>Back</button> : null}>
      {result ? (
        <div style={{ textAlign: "center", paddingTop: 20 }}>
          <CheckCircle2 size={64} color="var(--m-green)" aria-hidden="true" />
          <h2 style={{ fontSize: 24, margin: "12px 0 6px" }}>Report saved</h2>
          <p style={{ color: "var(--m-text-2)", margin: "0 0 4px" }}>Reference <strong>{result.reference}</strong></p>
          <p className="m-muted" style={{ margin: "0 12px 18px" }}>The admin team has been alerted. You can follow its progress under Reports.</p>
          {result.uploadError && <div className="m-alert m-alert--warn" role="alert" style={{ textAlign: "left", marginBottom: 14 }}>{result.uploadError}</div>}
          {result.type === "medical" && (
            <div className="m-card" style={{ textAlign: "left", marginBottom: 14 }}>
              <p style={{ fontSize: 15, margin: "0 0 10px" }}>Would guided medical triage help while you wait? It gives information only and does not contact emergency services.</p>
              <button type="button" className="m-btn m-btn--tinted m-btn--block" onClick={() => { close(); onOpenTriage(); }}>Open medical triage</button>
            </div>
          )}
          <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={close}>Done</button>
        </div>
      ) : (
        <>
          <div aria-hidden="true" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {STEPS.map((label, index) => <span key={label} style={{ flex: 1, height: 4, borderRadius: 3, background: index <= step ? "var(--m-tint)" : "var(--m-sep)", transition: "background .3s" }} />)}
          </div>
          {error && <div className="m-alert m-alert--error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

          {step === 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {Object.entries(INC_TYPES).map(([key, value]) => (
                  <button key={key} type="button" onClick={() => setForm(current => ({ ...current, type: key }))} aria-pressed={form.type === key}
                    style={{ minHeight: 92, borderRadius: 16, border: `2px solid ${form.type === key ? value.color : "transparent"}`, background: form.type === key ? `${value.color}18` : "var(--m-surface)", boxShadow: "var(--m-card-shadow)", color: "var(--m-text)", display: "grid", placeItems: "center", gap: 4, padding: 8, cursor: "pointer" }}>
                    <value.icon size={26} color={value.color} aria-hidden="true" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{value.label}</span>
                  </button>
                ))}
              </div>
              {form.type === "medical" && (
                <div className="m-alert m-alert--error" style={{ marginTop: 14 }}>
                  <strong>Life-threatening?</strong> Call now, then finish the report.
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <a className="m-btn m-btn--small m-btn--danger" href="tel:10177"><Phone size={15} aria-hidden="true" />EMS 10177</a>
                    <a className="m-btn m-btn--small m-btn--plain" href="tel:+27130020010"><Phone size={15} aria-hidden="true" />Campus Security</a>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="m-card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {locating ? <LoaderCircle size={20} className="m-spin" aria-hidden="true" /> : <Crosshair size={20} color={location ? "var(--m-green)" : "var(--m-text-3)"} aria-hidden="true" />}
                  <span role="status" style={{ flex: 1, fontSize: 15 }}>{locationNote || "Location not captured yet."}</span>
                </div>
                <button type="button" className="m-btn m-btn--small m-btn--tinted" style={{ marginTop: 10 }} onClick={captureLocation} disabled={locating}>{location ? "Refresh my location" : "Use my location"}</button>
              </div>
              {!location && !locating && (
                <label className="m-field">
                  <span className="m-field-label">Or choose a campus building</span>
                  <select className="m-input" value={form.building} onChange={event => setForm(current => ({ ...current, building: event.target.value }))}>
                    <option value="">Select a building…</option>
                    {MBOMBELA_BUILDINGS.map(building => <option key={building.id} value={building.id}>Building {building.id} — {building.name}</option>)}
                  </select>
                </label>
              )}
              <div className="m-embed m-report-map">
                <CampusMap compact incidents={[]} selectedBuilding={form.building} location={location} allowLocationSelection
                  onLocationChange={next => { setLocation(next); if (next?.source !== "mapped-building") setForm(current => ({ ...current, building: "" })); }}
                  onBuildingClick={building => {
                    const mapped = MAPPED_BUILDINGS.find(item => item.id === building.id);
                    setForm(current => ({ ...current, building: building.id }));
                    if (mapped) setLocation({ latitude: mapped.lat, longitude: mapped.lng, accuracyMeters: null, capturedAt: new Date().toISOString(), source: "mapped-building" });
                  }} />
              </div>
              <p className="m-muted" style={{ margin: "8px 4px 0" }}>Tap the map to pin the exact spot.</p>
            </>
          )}

          {step === 2 && (
            <>
              <span className="m-field-label">How urgent is it?</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
                {["P1", "P2", "P3", "P4"].map(priority => (
                  <button key={priority} type="button" aria-pressed={form.priority === priority} onClick={() => setForm(current => ({ ...current, priority }))}
                    style={{ minHeight: 56, borderRadius: 14, border: `2px solid ${form.priority === priority ? PRIORITY[priority].color : "transparent"}`, background: form.priority === priority ? `${PRIORITY[priority].color}18` : "var(--m-surface)", boxShadow: "var(--m-card-shadow)", color: "var(--m-text)", cursor: "pointer", textAlign: "left", padding: "8px 12px" }}>
                    <div style={{ fontWeight: 700, color: PRIORITY[priority].color }}>{priority}</div>
                    <div style={{ fontSize: 13, color: "var(--m-text-2)" }}>{PRIORITY[priority].label}</div>
                  </button>
                ))}
              </div>
              <label className="m-field">
                <span className="m-field-label">What&apos;s happening? (optional)</span>
                <textarea className="m-input" maxLength={4000} value={form.desc} onChange={event => setForm(current => ({ ...current, desc: event.target.value }))} placeholder="Anything that helps responders: what you see, injuries, hazards…" />
              </label>
            </>
          )}

          {step === 3 && (
            <div className="m-embed">
              <IncidentEvidenceCapture files={files} onFilesChange={setFiles} disabled={submitting} onRecordingChange={setRecording} />
            </div>
          )}

          {step === 4 && (
            <div className="m-group">
              {[
                ["Type", type?.label],
                ["Urgency", `${form.priority} — ${PRIORITY[form.priority].label}`],
                ["Location", location ? (location.source === "mapped-building" ? MAPPED_BUILDINGS.find(b => b.id === form.building)?.name || "Pinned on map" : `GPS (±${Math.round(location.accuracyMeters || 0)} m)`) : MBOMBELA_BUILDINGS.find(b => b.id === form.building)?.name],
                ["Details", form.desc || "None"],
                ["Photos & video", files.length ? `${files.length} attached` : "None"],
              ].map(([label, value]) => (
                <div key={label} className="m-row" style={{ cursor: "default", alignItems: "flex-start" }}>
                  <span style={{ width: 110, flexShrink: 0, color: "var(--m-text-3)", fontSize: 15 }}>{label}</span>
                  <span style={{ flex: 1, fontSize: 15, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {progress && <p className="m-muted" role="status" style={{ marginTop: 12 }}>Uploading {progress.index} of {progress.total} · {progress.percent}%</p>}

          <div style={{ position: "sticky", bottom: 0, paddingTop: 16, marginTop: 8, background: "linear-gradient(transparent, var(--m-bg) 30%)" }}>
            {step < STEPS.length - 1 ? (
              <button type="button" className="m-btn m-btn--primary m-btn--block" disabled={!canContinue} onClick={() => setStep(value => value + 1)}>
                {step === 1 && !hasLocation ? "Add a location to continue" : step === 3 && recording ? "Stop recording to continue" : "Continue"}
              </button>
            ) : (
              <button type="button" className="m-btn m-btn--danger m-btn--block" disabled={!canContinue || submitting} onClick={submit}>
                {submitting ? <><LoaderCircle size={18} className="m-spin" aria-hidden="true" />Sending report…</> : "Send report"}
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
