import { useState } from "react";
import { sendCampusAlert } from "../incidentApi.js";

export default function CampusAlertComposer({ user }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const result = await sendCampusAlert(user, { title, body });
      const delivery = result.delivery || {};
      setFeedback(`Alert recorded for ${result.recipientCount} accounts. Push sent: ${delivery.push?.sent || 0}; SMS sent: ${delivery.sms?.sent || 0}; PA webhook: ${delivery.pa?.configured ? (delivery.pa.sent ? "accepted" : "failed") : "not configured"}.`);
      setTitle("");
      setBody("");
    } catch (requestError) {
      setError(requestError.message || "The alert could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ maxWidth: 1320, margin: "0 auto", padding: "14px 3% 0" }}>
      {!open ? <button type="button" onClick={() => setOpen(true)} style={{ background: "#a51c30", color: "#fff", border: 0, borderRadius: 5, padding: "9px 15px", fontWeight: 700, cursor: "pointer" }}>Compose campus alert</button> : (
        <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #d8dee8", borderLeft: "4px solid #a51c30", borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Campus emergency alert</div>
          <input aria-label="Alert title" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required placeholder="Alert title" style={{ display: "block", width: "100%", padding: 10, marginBottom: 8, border: "1px solid #cbd2dc", borderRadius: 5 }} />
          <textarea aria-label="Alert message" value={body} onChange={event => setBody(event.target.value)} maxLength={1000} required rows={3} placeholder="State what is happening and what people should do." style={{ display: "block", width: "100%", padding: 10, marginBottom: 8, border: "1px solid #cbd2dc", borderRadius: 5, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={busy} style={{ background: "#a51c30", color: "#fff", border: 0, borderRadius: 5, padding: "9px 15px", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Sending…" : "Send alert"}</button>
            <button type="button" onClick={() => setOpen(false)} style={{ background: "#fff", border: "1px solid #cbd2dc", borderRadius: 5, padding: "9px 15px", cursor: "pointer" }}>Close</button>
          </div>
          {feedback && <p role="status" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, color: "#176b39" }}>{feedback}</p>}
          {error && <p role="alert" style={{ marginTop: 10, fontSize: 12, color: "#a51c30" }}>{error}</p>}
        </form>
      )}
    </section>
  );
}
