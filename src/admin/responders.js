const ACTIVE_EXCLUDED = ["RESOLVED", "CLOSED"];

export function activeAssignmentsByResponder(incidents) {
  const counts = {};
  for (const incident of incidents) {
    if (incident.responderUid && !ACTIVE_EXCLUDED.includes(incident.status)) {
      counts[incident.responderUid] = (counts[incident.responderUid] || 0) + 1;
    }
  }
  return counts;
}
