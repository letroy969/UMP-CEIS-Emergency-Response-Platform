import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { app, auth } from "../lib/firebase.js";
import { registerPushToken, removePushToken } from "../incidentApi.js";

export async function enablePushNotifications(user) {
  if (!user || !auth.currentUser || auth.currentUser.uid !== user.uid) throw new Error("Sign in to enable notifications.");
  if (!(await isSupported())) throw new Error("Push notifications are not supported by this browser.");
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error("Push notifications are not configured for this deployment.");
  if (!("serviceWorker" in navigator) || !("Notification" in window)) throw new Error("This browser cannot receive push notifications.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications in your browser settings to receive emergency updates.");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not create a push token. Check the Firebase web push certificate setup.");
  await registerPushToken(user, token);
  return token;
}

export async function disablePushNotifications(user) {
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
  if (token) await removePushToken(user, token);
  await deleteToken(messaging);
}
