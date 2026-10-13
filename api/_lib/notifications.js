import { createHmac } from "node:crypto";
import { FieldPath, FieldValue } from "firebase-admin/firestore";

async function pushToUsers(services, userIds, notification, data = {}) {
  const tokens = [];
  for (const uid of [...new Set(userIds)].slice(0, 500)) {
    const docs = await services.db.collection("users").doc(uid).collection("pushTokens").limit(20).get();
    docs.forEach(doc => tokens.push({ uid, ref: doc.ref, token: doc.get("token") }));
  }
  if (!tokens.length) return { sent: 0, failed: 0, configured: Boolean(process.env.VITE_FIREBASE_VAPID_KEY) };

  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const batch = tokens.slice(offset, offset + 500);
    const result = await services.messaging.sendEachForMulticast({
      tokens: batch.map(item => item.token),
      notification,
      data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
      webpush: { fcmOptions: { link: "/" }, notification: { icon: "/favicon.svg", tag: data.incidentId || "ceis-alert" } },
    });
    sent += result.successCount;
    failed += result.failureCount;
    const stale = [];
    result.responses.forEach((item, index) => {
      if (!item.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(item.error?.code)) {
        stale.push(batch[index].ref.delete());
      }
    });
    await Promise.allSettled(stale);
  }
  return { sent, failed, configured: true };
}

async function smsToOptedInUsers(services, userIds, message) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) return { configured: false, sent: 0 };
  const profiles = await Promise.all([...new Set(userIds)].slice(0, 200).map(async uid => {
    const profile = (await services.db.collection("users").doc(uid).get()).data();
    return profile?.smsOptIn && /^\+[1-9]\d{7,14}$/.test(profile.phoneE164 || "") ? profile.phoneE164 : null;
  }));
  const recipients = profiles.filter(Boolean);
  const deliveries = await Promise.allSettled(recipients.map(phoneE164 => {
    const form = new URLSearchParams({ To: phoneE164, From: TWILIO_FROM_NUMBER, Body: message.slice(0, 1200) });
    return fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(5000),
    }).then(response => {
      if (!response.ok) throw new Error(`SMS provider returned ${response.status}.`);
    });
  }));
  return { configured: true, sent: deliveries.filter(item => item.status === "fulfilled").length, failed: deliveries.filter(item => item.status === "rejected").length, capped: recipients.length >= 200 };
}

async function sendPaWebhook(payload) {
  const { PA_WEBHOOK_URL, PA_WEBHOOK_SECRET } = process.env;
  if (!PA_WEBHOOK_URL || !PA_WEBHOOK_SECRET) return { configured: false };
  let endpoint;
  try { endpoint = new URL(PA_WEBHOOK_URL); } catch { return { configured: true, sent: false, error: "PA webhook URL is invalid." }; }
  if (endpoint.protocol !== "https:") return { configured: true, sent: false, error: "PA webhook must use HTTPS." };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", PA_WEBHOOK_SECRET).update(body).digest("hex");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ceis-signature": `sha256=${signature}` },
      body,
      signal: AbortSignal.timeout(5000),
    });
    return { configured: true, sent: response.ok, status: response.status };
  } catch (error) {
    return { configured: true, sent: false, error: error.message };
  }
}

export async function notifyUsers(services, { userIds, title, body, data = {}, emergency = false }) {
  const results = { push: { sent: 0, failed: 0, configured: true }, sms: { configured: false, sent: 0 }, pa: { configured: false } };
  try {
    results.push = await pushToUsers(services, userIds, { title, body }, data);
  } catch (error) {
    results.push = { configured: true, sent: 0, failed: userIds.length, error: error.message };
  }
  if (emergency) {
    try { results.sms = await smsToOptedInUsers(services, userIds, `${title}: ${body}`); }
    catch (error) { results.sms = { configured: true, sent: 0, failed: 1, error: error.message }; }
    results.pa = await sendPaWebhook({ title, body, ...data, createdAt: new Date().toISOString() });
  }
  await services.db.collection("notificationDeliveries").add({
    userCount: userIds.length,
    title,
    data,
    emergency,
    results,
    createdAt: FieldValue.serverTimestamp(),
  });
  return results;
}

export async function usersWithRole(services, roles) {
  const users = services.db.collection("users");
  const queries = [
    users.where("role", "in", roles),
    users.where("role", "array-contains-any", roles),
    users.where("roles", "array-contains-any", roles),
  ];
  const ids = new Set();
  await Promise.all(queries.map(async baseQuery => {
    let page = await baseQuery.orderBy(FieldPath.documentId()).limit(500).get();
    while (!page.empty) {
      page.docs.forEach(doc => ids.add(doc.id));
      if (page.size < 500) break;
      page = await baseQuery.orderBy(FieldPath.documentId()).startAfter(page.docs.at(-1)).limit(500).get();
    }
  }));
  return [...ids];
}
