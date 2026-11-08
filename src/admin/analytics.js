// Pure analytics over the incident list the Admin Portal already streams from
// Firestore, so every chart reacts live to new reports and to the filters.

export const RANGES = Object.freeze([
  ["7d", "7 days", 7],
  ["30d", "30 days", 30],
  ["90d", "90 days", 90],
  ["365d", "12 months", 365],
  ["all", "All time", null],
]);

export const STATUS_ORDER = Object.freeze(["NEW", "ACKNOWLEDGED", "TEAM_DISPATCHED", "ON_SCENE", "RESOLVED", "CLOSED"]);
export const PRIORITY_ORDER = Object.freeze(["P1", "P2", "P3", "P4"]);
export const WEEKDAYS = Object.freeze(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const CLOSED = new Set(["RESOLVED", "CLOSED"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function time(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function startOfDay(ms) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Monday-based weekday index (0 = Monday … 6 = Sunday).
function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function minutesBetween(start, end) {
  const a = time(start);
  const b = time(end);
  if (a == null || b == null || b < a) return null;
  return (b - a) / 60000;
}

export function median(values) {
  const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function rangeStart(range, now = Date.now()) {
  const days = RANGES.find(([key]) => key === range)?.[2];
  return days ? startOfDay(now - (days - 1) * DAY_MS).getTime() : null;
}

export function filterIncidents(incidents, { range = "30d", type = "all", priority = "all" } = {}, now = Date.now()) {
  const from = rangeStart(range, now);
  return incidents.filter(incident => {
    const created = time(incident.createdAt);
    if (created == null) return false;
    if (from != null && created < from) return false;
    if (type !== "all" && incident.type !== type) return false;
    if (priority !== "all" && incident.priority !== priority) return false;
    return true;
  });
}

export function summarize(incidents) {
  const resolved = incidents.filter(incident => CLOSED.has(incident.status));
  return {
    total: incidents.length,
    active: incidents.filter(incident => !CLOSED.has(incident.status)).length,
    activeCritical: incidents.filter(incident => !CLOSED.has(incident.status) && incident.priority === "P1").length,
    sos: incidents.filter(incident => incident.isSOS).length,
    anonymous: incidents.filter(incident => incident.isAnonymous).length,
    resolved: resolved.length,
    resolutionRate: incidents.length ? resolved.length / incidents.length : null,
    medianDispatchMinutes: median(incidents.map(incident => minutesBetween(incident.createdAt, incident.dispatchedAt))),
    medianResolveMinutes: median(incidents.map(incident => minutesBetween(incident.createdAt, incident.resolvedAt))),
    unassigned: incidents.filter(incident => !incident.responderUid && !CLOSED.has(incident.status)).length,
  };
}

// Buckets by day up to 90 days, by week (Monday start) for 12 months, and by
// month for all time, so the chart never has more than ~90 points.
export function timeSeries(incidents, range = "30d", now = Date.now()) {
  const days = RANGES.find(([key]) => key === range)?.[2];
  const buckets = [];
  let bucketOf;

  if (days && days <= 90) {
    const start = startOfDay(now - (days - 1) * DAY_MS);
    for (let i = 0; i < days; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      buckets.push({ key: dayKey(date), label: date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), total: 0, sos: 0 });
    }
    bucketOf = date => dayKey(date);
  } else if (days) {
    const start = startOfDay(now - (days - 1) * DAY_MS);
    start.setDate(start.getDate() - weekdayIndex(start));
    for (let date = new Date(start); date.getTime() <= now; date.setDate(date.getDate() + 7)) {
      buckets.push({ key: dayKey(date), label: `Wk of ${date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`, total: 0, sos: 0 });
    }
    bucketOf = date => {
      const monday = startOfDay(date.getTime());
      monday.setDate(monday.getDate() - weekdayIndex(monday));
      return dayKey(monday);
    };
  } else {
    const times = incidents.map(incident => time(incident.createdAt)).filter(value => value != null);
    const first = new Date(times.length ? Math.min(...times) : now);
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const last = new Date(now);
    while (cursor.getFullYear() < last.getFullYear() || (cursor.getFullYear() === last.getFullYear() && cursor.getMonth() <= last.getMonth())) {
      buckets.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, label: cursor.toLocaleDateString("en-ZA", { month: "short", year: "numeric" }), total: 0, sos: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    bucketOf = date => `${date.getFullYear()}-${date.getMonth()}`;
  }

  const index = new Map(buckets.map(bucket => [bucket.key, bucket]));
  for (const incident of incidents) {
    const created = time(incident.createdAt);
    if (created == null) continue;
    const bucket = index.get(bucketOf(new Date(created)));
    if (!bucket) continue;
    bucket.total += 1;
    if (incident.isSOS) bucket.sos += 1;
  }
  return buckets;
}

// Counts per value. With an explicit order every listed value appears (zeros
// included, in that order); otherwise values are ranked by count.
export function countBy(incidents, read, order = null) {
  const counts = new Map();
  for (const incident of incidents) {
    const key = read(incident);
    if (key == null || key === "") continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (order) return order.map(key => ({ key, count: counts.get(key) || 0 }));
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
}

export function responseTimesByPriority(incidents) {
  return PRIORITY_ORDER.map(priority => {
    const rows = incidents.filter(incident => incident.priority === priority);
    const dispatch = median(rows.map(incident => minutesBetween(incident.createdAt, incident.dispatchedAt)));
    const resolve = median(rows.map(incident => minutesBetween(incident.createdAt, incident.resolvedAt)));
    return {
      priority,
      dispatch: dispatch == null ? null : Math.round(dispatch * 10) / 10,
      resolve: resolve == null ? null : Math.round(resolve * 10) / 10,
      count: rows.length,
    };
  });
}

// 7 × 24 grid (Monday first) of report counts in the viewer's local time.
export function hourHeatmap(incidents) {
  const cells = WEEKDAYS.map(() => Array(24).fill(0));
  let max = 0;
  for (const incident of incidents) {
    const created = time(incident.createdAt);
    if (created == null) continue;
    const date = new Date(created);
    const row = cells[weekdayIndex(date)];
    row[date.getHours()] += 1;
    max = Math.max(max, row[date.getHours()]);
  }
  return { cells, max };
}

export function responderPerformance(incidents) {
  const byResponder = new Map();
  for (const incident of incidents) {
    if (!incident.responderUid) continue;
    if (!byResponder.has(incident.responderUid)) {
      byResponder.set(incident.responderUid, { uid: incident.responderUid, name: incident.responder, rows: [] });
    }
    byResponder.get(incident.responderUid).rows.push(incident);
  }
  return [...byResponder.values()].map(({ uid, name, rows }) => {
    const resolveTimes = rows.map(incident => minutesBetween(incident.dispatchedAt, incident.resolvedAt));
    const medianMinutes = median(resolveTimes);
    return {
      uid,
      name,
      assigned: rows.length,
      resolved: rows.filter(incident => CLOSED.has(incident.status)).length,
      active: rows.filter(incident => !CLOSED.has(incident.status)).length,
      medianDispatchToResolveMinutes: medianMinutes == null ? null : Math.round(medianMinutes),
    };
  }).sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name));
}

export function formatMinutes(minutes) {
  if (minutes == null) return "—";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 6) / 10} h`;
  return `${Math.round(minutes / 144) / 10} days`;
}
