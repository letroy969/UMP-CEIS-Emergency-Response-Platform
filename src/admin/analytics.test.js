import test from "node:test";
import assert from "node:assert/strict";
import {
  countBy,
  filterIncidents,
  formatMinutes,
  hourHeatmap,
  median,
  responderPerformance,
  responseTimesByPriority,
  summarize,
  timeSeries,
} from "./analytics.js";

// Local-time fixtures so bucketing tests hold in any timezone.
const now = new Date(2026, 10, 9, 15, 0).getTime(); // Mon 9 Nov 2026, 15:00
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

const incidents = [
  { id: "a", type: "fire", priority: "P1", status: "RESOLVED", isSOS: false, createdAt: at(9, 8), dispatchedAt: at(9, 8, 4), resolvedAt: at(9, 9), responderUid: "r1", responder: "Thandi" },
  { id: "b", type: "medical", priority: "P1", status: "ON_SCENE", isSOS: true, isAnonymous: true, createdAt: at(9, 10), dispatchedAt: at(9, 10, 2), responderUid: "r1", responder: "Thandi" },
  { id: "c", type: "fire", priority: "P3", status: "NEW", createdAt: at(8, 22) },
  { id: "d", type: "security", priority: "P2", status: "CLOSED", createdAt: at(1, 12), dispatchedAt: at(1, 12, 30), resolvedAt: at(1, 14), responderUid: "r2", responder: "Sipho" },
  { id: "e", type: "fire", priority: "P2", status: "RESOLVED", createdAt: new Date(2026, 5, 1, 9).toISOString() },
];

test("median handles odd, even and empty input and ignores missing values", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([null, undefined]), null);
});

test("filters by date range, type and priority", () => {
  assert.deepEqual(filterIncidents(incidents, { range: "7d" }, now).map(i => i.id), ["a", "b", "c"]);
  assert.deepEqual(filterIncidents(incidents, { range: "30d" }, now).map(i => i.id), ["a", "b", "c", "d"]);
  assert.equal(filterIncidents(incidents, { range: "all" }, now).length, 5);
  assert.deepEqual(filterIncidents(incidents, { range: "all", type: "fire", priority: "P2" }, now).map(i => i.id), ["e"]);
});

test("summary counts active, SOS, anonymous and median response times", () => {
  const summary = summarize(filterIncidents(incidents, { range: "30d" }, now));
  assert.equal(summary.total, 4);
  assert.equal(summary.active, 2);
  assert.equal(summary.activeCritical, 1);
  assert.equal(summary.sos, 1);
  assert.equal(summary.anonymous, 1);
  assert.equal(summary.unassigned, 1);
  assert.equal(summary.resolutionRate, 0.5);
  assert.equal(summary.medianDispatchMinutes, 4); // 4, 2, 30 → 4
  assert.equal(summary.medianResolveMinutes, 90); // 60, 120 → 90
});

test("daily series covers every day in the range, including empty days", () => {
  const series = timeSeries(incidents, "7d", now);
  assert.equal(series.length, 7);
  assert.deepEqual(series.at(-1), { key: "2026-11-09", label: series.at(-1).label, total: 2, sos: 1 });
  assert.equal(series.at(-2).total, 1);
  assert.equal(series.reduce((sum, bucket) => sum + bucket.total, 0), 3);
});

test("12-month series groups by Monday-start week", () => {
  const series = timeSeries(incidents, "365d", now);
  assert.ok(series.length >= 52 && series.length <= 54);
  assert.equal(series.at(-1).key, "2026-11-09");
  assert.equal(series.at(-1).total, 2);
  assert.equal(series.at(-2).total, 1); // Sun 8 Nov belongs to the week of Mon 2 Nov
  assert.equal(series.reduce((sum, bucket) => sum + bucket.total, 0), 5);
});

test("all-time series runs monthly from the first report to now", () => {
  const series = timeSeries(incidents, "all", now);
  assert.equal(series.length, 6); // Jun … Nov 2026
  assert.equal(series[0].total, 1);
  assert.equal(series.at(-1).total, 4);
});

test("countBy keeps a fixed order with zeros, or ranks by count", () => {
  assert.deepEqual(countBy(incidents, i => i.priority, ["P1", "P2", "P3", "P4"]).map(r => r.count), [2, 2, 1, 0]);
  assert.deepEqual(countBy(incidents, i => i.type)[0], { key: "fire", count: 3 });
});

test("response times are medians per priority", () => {
  const rows = responseTimesByPriority(incidents);
  assert.deepEqual(rows[0], { priority: "P1", dispatch: 3, resolve: 60, count: 2 });
  assert.equal(rows[3].dispatch, null);
});

test("heatmap places reports on a Monday-first weekday × hour grid", () => {
  const { cells, max } = hourHeatmap(incidents);
  assert.equal(cells[0][8], 1); // Monday 08:00
  assert.equal(cells[6][22], 1); // Sunday 22:00
  assert.equal(max, 1);
});

test("responder performance ranks by workload", () => {
  const rows = responderPerformance(incidents);
  assert.deepEqual(rows[0], { uid: "r1", name: "Thandi", assigned: 2, resolved: 1, active: 1, medianDispatchToResolveMinutes: 56 });
  assert.equal(rows[1].name, "Sipho");
});

test("minutes format into readable durations", () => {
  assert.equal(formatMinutes(null), "—");
  assert.equal(formatMinutes(0.4), "< 1 min");
  assert.equal(formatMinutes(42), "42 min");
  assert.equal(formatMinutes(90), "1.5 h");
  assert.equal(formatMinutes(4320), "3 days");
});
