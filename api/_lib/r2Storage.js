import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedStorage;
let cachedCredentials;

export const EVIDENCE_TYPES = Object.freeze({
  "image/jpeg": Object.freeze({ kind: "image", extension: "jpg", maxBytes: 10 * 1024 * 1024 }),
  "image/png": Object.freeze({ kind: "image", extension: "png", maxBytes: 10 * 1024 * 1024 }),
  "image/webp": Object.freeze({ kind: "image", extension: "webp", maxBytes: 10 * 1024 * 1024 }),
  "video/webm": Object.freeze({ kind: "video", extension: "webm", maxBytes: 40 * 1024 * 1024 }),
  "video/mp4": Object.freeze({ kind: "video", extension: "mp4", maxBytes: 40 * 1024 * 1024 }),
});

const ATTACHMENT_ID = /^[a-f0-9-]{36}\.(jpg|png|webp|webm|mp4)$/;

export function evidenceObjectKey(incidentId, attachmentId) {
  if (typeof incidentId !== "string" || !incidentId || incidentId.includes("/")
    || typeof attachmentId !== "string" || !ATTACHMENT_ID.test(attachmentId)) {
    const error = new Error("Invalid incident evidence object key.");
    error.status = 400;
    throw error;
  }
  return `incidents/${incidentId}/attachments/${attachmentId}`;
}

export function parseEvidenceObjectKey(key) {
  if (typeof key !== "string") return null;
  const match = /^incidents\/([^/]+)\/attachments\/([a-f0-9-]{36}\.(?:jpg|png|webp|webm|mp4))$/.exec(key);
  return match ? { incidentId: match[1], attachmentId: match[2] } : null;
}

export function getR2Storage() {
  const { R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    const error = new Error("Cloudflare R2 evidence storage is not configured.");
    error.status = 503;
    error.publicMessage = "Evidence uploads are unavailable: configure the server-only Cloudflare R2 bucket credentials.";
    throw error;
  }

  if (!cachedStorage
    || cachedCredentials.accountId !== R2_ACCOUNT_ID
    || cachedCredentials.bucketName !== R2_BUCKET_NAME
    || cachedCredentials.accessKeyId !== R2_ACCESS_KEY_ID
    || cachedCredentials.secretAccessKey !== R2_SECRET_ACCESS_KEY) {
    cachedCredentials = {
      accountId: R2_ACCOUNT_ID,
      bucketName: R2_BUCKET_NAME,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    };
    cachedStorage = {
      bucketName: R2_BUCKET_NAME,
      client: new S3Client({
        region: "auto",
        requestChecksumCalculation: "WHEN_REQUIRED",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      }),
    };
  }
  return cachedStorage;
}

export function signEvidenceUpload(r2, { objectKey, contentType, uid }) {
  return getSignedUrl(r2.client, new PutObjectCommand({
    Bucket: r2.bucketName,
    Key: objectKey,
    ContentType: contentType,
    CacheControl: "private, no-store",
    Metadata: { uid },
  }), {
    expiresIn: 300,
    signableHeaders: new Set(["cache-control", "content-type"]),
    unhoistableHeaders: new Set(["x-amz-meta-uid"]),
  });
}
