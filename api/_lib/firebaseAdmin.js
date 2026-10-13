import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let services;

export function getFirebaseServices() {
  if (services) return services;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!projectId || !rawCredentials) {
    const error = new Error("Firebase server credentials are not configured.");
    error.status = 503;
    throw error;
  }

  let credentials;
  try {
    credentials = JSON.parse(rawCredentials);
  } catch {
    const error = new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
    error.status = 503;
    throw error;
  }

  const app = getApps()[0] || initializeApp({
    credential: cert(credentials),
    projectId,
  });
  services = { auth: getAuth(app), db: getFirestore(app), messaging: getMessaging(app) };
  return services;
}
