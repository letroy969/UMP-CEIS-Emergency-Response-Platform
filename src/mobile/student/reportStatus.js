// How a report's progress is shown to the person who filed it.
export const REPORT_STEPS = ["NEW", "TEAM_DISPATCHED", "ACKNOWLEDGED", "ON_SCENE", "RESOLVED"];
export const REPORT_STEP_LABELS = { NEW: "Received", TEAM_DISPATCHED: "Assigned", ACKNOWLEDGED: "On the way", ON_SCENE: "On scene", RESOLVED: "Resolved" };

export function isClosed(status) {
  return status === "RESOLVED" || status === "CLOSED";
}

export function reportStatusChip(status) {
  if (isClosed(status)) return { className: "m-chip m-chip--green", label: "Resolved" };
  if (status === "NEW") return { className: "m-chip m-chip--orange", label: "Received" };
  return { className: "m-chip m-chip--tint", label: REPORT_STEP_LABELS[status] || status };
}
