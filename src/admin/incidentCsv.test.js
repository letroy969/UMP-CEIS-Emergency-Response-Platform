import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, incidentsToCsv, UTF8_BOM } from "./incidentCsv.js";

test("cells that would run as spreadsheet formulas are neutralised", () => {
  assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"");
  assert.equal(csvCell("+27 13 002 0010"), "'+27 13 002 0010");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell("-1+1"), "'-1+1");
});

test("negative numbers stay numeric", () => {
  assert.equal(csvCell(-25.4355), "-25.4355");
});

test("commas, quotes and newlines are quoted", () => {
  assert.equal(csvCell("Smoke, level 2"), "\"Smoke, level 2\"");
  assert.equal(csvCell("He said \"help\""), "\"He said \"\"help\"\"\"");
  assert.equal(csvCell("line one\nline two"), "\"line one\nline two\"");
  assert.equal(csvCell(null), "");
});

test("exports one header row plus one row per incident with response times", () => {
  const csv = incidentsToCsv([{
    id: "abc",
    reference: "INC-1",
    type: "fire",
    priority: "P1",
    status: "RESOLVED",
    loc: "Building 5",
    desc: "Smoke",
    responderUid: "r1",
    responder: "Thandi",
    attachments: [{}, {}],
    createdAt: "2026-11-09T08:00:00.000Z",
    dispatchedAt: "2026-11-09T08:03:00.000Z",
    resolvedAt: "2026-11-09T08:45:00.000Z",
  }], { type: { fire: "Fire" }, status: { RESOLVED: "Resolved" } });

  assert.ok(csv.startsWith(`${UTF8_BOM}Reference,Type,Priority,Status`));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^INC-1,Fire,P1,Resolved,Building 5,/);
  assert.match(lines[1], /,Thandi,2,/);
  assert.match(lines[1], /,3,45$/);
});

test("unassigned incidents leave the responder column empty", () => {
  const csv = incidentsToCsv([{ id: "x", responderUid: null, responder: "Pending assignment" }]);
  assert.doesNotMatch(csv, /Pending assignment/);
});
