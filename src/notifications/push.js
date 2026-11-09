import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, auth } from "../lib/firebase.js";
import { registerPushToken, removePushToken } from "../incidentApi.js";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const SW_URL = "/firebase-messaging-sw.js";

export function isPushConfigured() {
  return Boolean(VAPID_KEY);
}

// "unsupported" | "unconfigured" | "denied" | "default" (not asked yet) | "granted"
export async function pushStatus() {
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !(await isSupported().catch(() => false))) return "unsupported";
  if (!VAPID_KEY) return "unconfigured";
  return Notification.permission;
}

function requireUser(user) {
  if (!user || !auth.currentUser || auth.currentUser.uid !== user.uid) throw new Error("Sign in to enable notifications.");
}

async function registration() {
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

// Gets this device's current FCM token and stores it on the account. Tokens
// rotate, so this also runs quietly on every portal load once permission is granted.
async function registerDevice(user) {
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await registration() });
  if (!token) throw new Error("Firebase did not create a push token. Check the Firebase web push certificate setup.");
  await registerPushToken(user, token);
  return token;
}

export async function enablePushNotifications(user) {
  requireUser(user);
  const status = await pushStatus();
  if (status === "unsupported") throw new Error("This browser cannot receive push notifications. On iPhone, add CEIS to your Home Screen first.");
  if (status === "unconfigured") throw new Error("Push notifications are not configured for this deployment.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them for this site in your browser settings.");
  const token = await registerDevice(user);
  bindForegroundMessages();
  return token;
}

// Called on portal load: if the user already allowed notifications, refresh the
// device token and listen for messages, without prompting.
export async function syncPushNotifications(user) {
  requireUser(user);
  if ((await pushStatus()) !== "granted") return false;
  await registerDevice(user);
  bindForegroundMessages();
  return true;
}

export async function disablePushNotifications(user) {
  requireUser(user);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await registration() }).catch(() => null);
  if (token) await removePushToken(user, token);
  await deleteToken(messaging).catch(() => {});
}

// While a CEIS tab is open, Firebase hands messages to the page instead of the
// service worker, so nothing would appear. Show them as system notifications
// anyway (admins and responders keep the portal open) and tell any listeners.
const foregroundListeners = new Set();
let foregroundBound = false;

function bindForegroundMessages() {
  if (foregroundBound) return;
  foregroundBound = true;
  onMessage(getMessaging(app), async payload => {
    const title = payload.notification?.title || "UMP Campus Safety";
    const body = payload.notification?.body || "A campus safety update is available.";
    const data = payload.data || {};
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL) || await registration();
      await reg.showNotification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        data,
        tag: data.incidentId || data.alertId || "ceis-alert",
        renotify: true,
        requireInteraction: ["sos", "backup", "campus-alert", "dispatch"].includes(data.kind),
      });
    } catch (error) {
      console.error("Foreground notification could not be shown", error);
    }
    foregroundListeners.forEach(listener => listener({ title, body, data }));
  });
}

export function onForegroundNotification(listener) {
  foregroundListeners.add(listener);
  return () => foregroundListeners.delete(listener);
}
