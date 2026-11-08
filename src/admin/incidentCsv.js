const COLUMNS = [
  ["Reference", incident => incident.reference || incident.id],
  ["Type", (incident, labels) => labels.type?.[incident.type] || incident.type],
  ["Priority", incident => incident.priority],
  ["Status", (incident, labels) => labels.status?.[incident.status] || incident.status],
  ["Location", incident => incident.loc],
  ["Building", incident => incident.building],
  ["Latitude", incident => incident.lat],
  ["Longitude", incident => incident.lng],
  ["Campus verified", incident => incident.campusVerified == null ? "" : incident.campusVerified ? "yes" : "no"],
  ["Description", incident => incident.desc],
  ["Reporter", incident => incident.reporter],
  ["Responder", incident => incident.responderUid ? incident.responder : ""],
  ["Evidence files", incident => incident.attachments?.length || 0],
  ["Reported at", incident => incident.createdAt],
  ["Dispatched at", incident => incident.dispatchedAt],
  ["Resolved at", incident => incident.resolvedAt],
  ["Minutes to dispatch", incident => minutesBetween(incident.createdAt, incident.dispatchedAt)],
  ["Minutes to resolve", incident => minutesBetween(incident.createdAt, incident.resolvedAt)],
];

function minutesBetween(start, end) {
  if (!start || !end) return "";
  const minutes = (new Date(end) - new Date(start)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes * 10) / 10 : "";
}

// Spreadsheet apps execute cells that start with these characters as formulas.
// Incident descriptions are user-supplied, so they are neutralised with a quote.
export function csvCell(value) {
  if (value == null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value !== "number") text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// The byte-order mark makes Excel open the file as UTF-8 so names with accents survive.
export const UTF8_BOM = String.fromCharCode(0xfeff);

export function incidentsToCsv(incidents, labels = {}) {
  const header = COLUMNS.map(([name]) => csvCell(name)).join(",");
  const rows = incidents.map(incident => COLUMNS.map(([, read]) => csvCell(read(incident, labels))).join(","));
  return `${UTF8_BOM}${[header, ...rows].join("\r\n")}\r\n`;
}

export function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
