import assert from "node:assert/strict";
import test from "node:test";
import { evidenceObjectKey, getR2Storage, parseEvidenceObjectKey, signEvidenceUpload } from "./r2Storage.js";

test("builds and parses incident evidence object keys", () => {
  const attachmentId = "123e4567-e89b-12d3-a456-426614174000.jpg";
  const key = evidenceObjectKey("incident-123", attachmentId);
  assert.equal(key, `incidents/incident-123/attachments/${attachmentId}`);
  assert.deepEqual(parseEvidenceObjectKey(key), { incidentId: "incident-123", attachmentId });
});

test("rejects unsafe evidence object keys", () => {
  assert.throws(() => evidenceObjectKey("../private", "123e4567-e89b-12d3-a456-426614174000.jpg"));
  assert.throws(() => evidenceObjectKey("incident-123", "../private.jpg"));
  assert.equal(parseEvidenceObjectKey("incidents/incident-123/other/file.jpg"), null);
});

test("signs private upload headers and avoids an implicit checksum header", async () => {
  const keys = ["R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    R2_ACCOUNT_ID: "test-account",
    R2_BUCKET_NAME: "test-evidence",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
  });

  try {
    const storage = getR2Storage();
    const url = new URL(await signEvidenceUpload(storage, {
      objectKey: evidenceObjectKey("incident-123", "123e4567-e89b-12d3-a456-426614174000.jpg"),
      contentType: "image/jpeg",
      uid: "test-user",
    }));
    assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "cache-control;content-type;host;x-amz-meta-uid");
    assert.equal(url.searchParams.has("x-amz-sdk-checksum-algorithm"), false);
    assert.equal(url.searchParams.has("x-amz-meta-uid"), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
