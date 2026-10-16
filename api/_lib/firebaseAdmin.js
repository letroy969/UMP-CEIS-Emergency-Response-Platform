import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

let services;

export function getFirebaseServices() {
  if (services) return services;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!projectId) {
    const error = new Error("Firebase server project id is not configured.");
    error.status = 503;
    error.publicMessage = "Authenticated reporting is unavailable: configure FIREBASE_PROJECT_ID for the API server.";
    throw error;
  }

  let credential;
  if (rawCredentials) {
    let credentials;
    try {
      credentials = JSON.parse(rawCredentials);
    } catch {
      const error = new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
      error.status = 503;
      error.publicMessage = "Authenticated reporting is unavailable: FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.";
      throw error;
    }
    credential = cert(credentials);
  } else {
    const configuredCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const defaultCredentialPath = process.env.APPDATA
      ? join(process.env.APPDATA, "gcloud", "application_default_credentials.json")
      : join(homedir(), ".config", "gcloud", "application_default_credentials.json");
    const hasLocalCredentials = configuredCredentialPath
      ? existsSync(configuredCredentialPath)
      : existsSync(defaultCredentialPath);
    const isGoogleManagedRuntime = Boolean(
      process.env.K_SERVICE
      || process.env.FUNCTION_TARGET
      || process.env.GAE_ENV
      || process.env.GOOGLE_CLOUD_PROJECT,
    );
    if (!hasLocalCredentials && !isGoogleManagedRuntime) {
      const error = new Error("Firebase Application Default Credentials are not configured.");
      error.status = 503;
      error.publicMessage = "Authenticated reporting is unavailable: configure server Firebase Admin credentials or sign in with Google Application Default Credentials.";
      throw error;
    }
    try {
      credential = applicationDefault();
    } catch (cause) {
      const error = new Error("Firebase Application Default Credentials are not available.", { cause });
      error.status = 503;
      error.publicMessage = "Authenticated reporting is unavailable: configure server Firebase Admin credentials or sign in with Google Application Default Credentials.";
      throw error;
    }
  }

  const app = getApps()[0] || initializeApp({
    credential,
    projectId,
  });
  services = {
    auth: getAuth(app),
    appCheck: getAppCheck(app),
    db: getFirestore(app),
    messaging: getMessaging(app),
  };
  return services;
}
