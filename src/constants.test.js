import test from "node:test";
import assert from "node:assert/strict";
import { INC_TYPES, PRIORITY, STATUS_FLOW, STATUS_LABEL } from "./constants.js";
import { INCIDENT_TYPES, PRIORITIES, STATUSES } from "../api/_lib/validation.js";

test("client incident types match the API's accepted types", () => {
  assert.deepEqual(new Set(Object.keys(INC_TYPES)), INCIDENT_TYPES);
});

test("client priorities match the API's accepted priorities", () => {
  assert.deepEqual(new Set(Object.keys(PRIORITY)), PRIORITIES);
});

test("client status flow matches the API's accepted statuses and every status has a label", () => {
  assert.deepEqual(new Set(STATUS_FLOW), STATUSES);
  assert.deepEqual(new Set(Object.keys(STATUS_LABEL)), STATUSES);
});
