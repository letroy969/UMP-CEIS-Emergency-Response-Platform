import { useState } from "react";
import { ExternalLink, FileImage, Paperclip, RefreshCw, Video } from "lucide-react";
import { getIncidentAttachmentUrl } from "../incidentApi.js";

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Photos and videos attached to an incident, previewed inline. The server
// issues a private link that expires after five minutes (and logs each one on
// the incident timeline); an expired preview can be reloaded with one click.
export default function IncidentEvidenceList({ incident, user }) {
  const [links, setLinks] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const attachments = incident?.attachments || [];
  if (!attachments.length) return null;

  async function load(attachment) {
    setErrors(current => ({ ...current, [attachment.id]: "" }));
    setLoading(current => ({ ...current, [attachment.id]: true }));
    try {
      const link = await getIncidentAttachmentUrl(user, incident.id, attachment.id);
      setLinks(current => ({ ...current, [attachment.id]: link }));
    } catch (requestError) {
      setErrors(current => ({ ...current, [attachment.id]: requestError.message || "This attachment could not be opened." }));
    } finally {
      setLoading(current => ({ ...current, [attachment.id]: false }));
    }
  }

  const isLive = attachment => links[attachment.id]?.expiresAt > Date.now();
  const unloaded = attachments.filter(attachment => !isLive(attachment) && !loading[attachment.id]);

  return (
    <section aria-label="Incident attachments" style={{ marginTop: 12, borderTop: "1px solid #C8D0E0", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h4 style={{ display: "inline-flex", alignItems: "center", gap: 5, margin: 0, fontSize: 12, color: "#0D1526" }}>
          <Paperclip size={14} aria-hidden="true" /> Attachments ({attachments.length})
        </h4>
        {unloaded.length > 1 && (
          <button type="button" onClick={() => unloaded.forEach(load)} style={{ border: "1px solid #C8D0E0", borderRadius: 4, background: "#FFFFFF", color: "#1A2766", padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>View all</button>
        )}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {attachments.map(attachment => {
          const link = links[attachment.id];
          const live = isLive(attachment);
          return (
            <li key={attachment.id} style={{ fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, overflowWrap: "anywhere", color: "#344060" }}>
                  {attachment.kind === "video" ? <Video size={15} aria-hidden="true" /> : <FileImage size={15} aria-hidden="true" />}
                  {attachment.name}
                  <span style={{ color: "#6474A0" }}>{formatSize(attachment.size)}</span>
                </span>
                {live ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, color: "#1A2766", fontWeight: 600 }}>
                    Full size <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <button type="button" disabled={loading[attachment.id]} onClick={() => load(attachment)} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, border: "1px solid #C8D0E0", borderRadius: 4, background: "#FFFFFF", color: "#1A2766", padding: "5px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {link && <RefreshCw size={12} aria-hidden="true" />}
                    {loading[attachment.id] ? "Loading…" : link ? "Reload" : "View"}
                  </button>
                )}
              </div>
              {link && (
                attachment.kind === "video" ? (
                  <video src={link.url} controls preload="metadata" style={{ display: "block", width: "100%", maxHeight: 260, marginTop: 6, borderRadius: 6, background: "#0D1526" }} />
                ) : (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${attachment.name} full size`}>
                    <img src={link.url} alt={`Evidence: ${attachment.name}`} style={{ display: "block", maxWidth: "100%", maxHeight: 260, marginTop: 6, borderRadius: 6, border: "1px solid #C8D0E0", objectFit: "contain", background: "#F5F7FA" }} />
                  </a>
                )
              )}
              {errors[attachment.id] && <p role="alert" style={{ fontSize: 11, color: "#B83018", margin: "6px 0 0" }}>{errors[attachment.id]}</p>}
            </li>
          );
        })}
      </ul>
      <p style={{ fontSize: 10.5, color: "#6474A0", margin: "8px 0 0" }}>Private links expire after five minutes; each one is recorded on the incident timeline.</p>
    </section>
  );
}
