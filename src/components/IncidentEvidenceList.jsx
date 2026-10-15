import { useState } from "react";
import { ExternalLink, FileImage, Video } from "lucide-react";
import { getIncidentAttachmentUrl } from "../incidentApi.js";

export default function IncidentEvidenceList({ incident, user }) {
  const [links, setLinks] = useState({});
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");
  const attachments = incident?.attachments || [];
  if (!attachments.length) return null;

  async function loadLink(attachment) {
    setError("");
    setLoadingId(attachment.id);
    try {
      const link = await getIncidentAttachmentUrl(user, incident.id, attachment.id);
      setLinks(current => ({ ...current, [attachment.id]: link }));
    } catch (requestError) {
      setError(requestError.message || "Evidence could not be opened.");
    } finally {
      setLoadingId("");
    }
  }

  return (
    <section aria-label="Incident evidence" style={{ marginTop: 12, borderTop: "1px solid #C8D0E0", paddingTop: 10 }}>
      <h4 style={{ margin: "0 0 8px", fontSize: 12, color: "#0D1526" }}>Private evidence</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 7 }}>
        {attachments.map(attachment => (
          <li key={attachment.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, overflowWrap: "anywhere", color: "#344060" }}>
              {attachment.kind === "video" ? <Video size={15} aria-hidden="true" /> : <FileImage size={15} aria-hidden="true" />}
              {attachment.name}
            </span>
            {links[attachment.id]?.expiresAt > Date.now() ? (
              <a href={links[attachment.id].url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, color: "#1A2766", fontWeight: 600 }}>
                Open <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : (
              <button type="button" disabled={loadingId === attachment.id} onClick={() => loadLink(attachment)} style={{ flexShrink: 0, border: "1px solid #C8D0E0", borderRadius: 4, background: "#FFFFFF", color: "#1A2766", padding: "5px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {loadingId === attachment.id ? "Loading…" : "View"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" style={{ fontSize: 11, color: "#B83018", margin: "8px 0 0" }}>{error}</p>}
      <p style={{ fontSize: 10.5, color: "#6474A0", margin: "8px 0 0" }}>Private access link expires after five minutes.</p>
    </section>
  );
}
