import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";
import { defaultPortal, profilePortals } from "./roles.js";

let registrationInProgress = false;

export function isRegistrationInProgress() {
  return registrationInProgress;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function waitForFirebaseOperation(operation, description, timeoutMs = 30000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Firebase is taking too long while ${description}. Check your connection and Firebase configuration, then try again.`));
    }, timeoutMs);
  });
  return Promise.race([operation, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function validateNewPassword(password) {
  if (password.length < 12 || password.length > 128) {
    return "Use 12–128 characters.";
  }
  if (!/\p{Ll}/u.test(password) || !/\p{Lu}/u.test(password)
    || !/\p{Nd}/u.test(password) || !/[\p{P}\p{S}]/u.test(password)) {
    return "Include an uppercase letter, lowercase letter, number, and symbol.";
  }
  return "";
}

function emailActionUrl(path) {
  const url = new URL(path, window.location.origin);
  if (url.hostname === "127.0.0.1") url.hostname = "localhost";
  return url.toString();
}

function authError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists for this email. Sign in to request another verification email, or use password reset.",
    "auth/invalid-credential": "We could not sign you in. Check your email and password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a while and try again.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/network-request-failed": "Could not connect to Firebase. Check your connection and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication yet.",
    "permission-denied": "Could not create your account profile in Cloud Firestore. Check the Firestore users create rule and Firebase project configuration.",
    "firestore/permission-denied": "Could not create your account profile in Cloud Firestore. Check the Firestore users create rule and Firebase project configuration.",
    "auth/unauthorized-continue-uri": "Firebase does not allow this email link's return address. In Firebase Console, open Authentication → Settings → Authorized domains and add localhost for local testing or your deployed app domain.",
  };
  return new Error(messages[error.code] || error.message || "Authentication failed. Please try again.");
}

function appUser(firebaseUser, profile) {
  const roles = profilePortals(profile);
  const portal = defaultPortal(roles);
  const role = portal;
  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: profile.fullName || firebaseUser.displayName || firebaseUser.email,
    faculty: profile.faculty || "Faculty not listed",
    year: profile.year || 1,
    dept: profile.department || "",
    role,
    access: role,
    portal,
    roles,
  };
}

export async function loadAppUser(firebaseUser) {
  if (!firebaseUser.emailVerified) {
    throw new Error("Verify your email address before signing in.");
  }
  const email = firebaseUser.email;
  if (!email || !isValidEmail(email)) throw new Error("Your account needs a valid email address.");

  const profileRef = doc(db, "users", firebaseUser.uid);
  const roleRequestKey = `ceis:requested-role:${firebaseUser.uid}`;
  const nextRoleRequestKey = "ceis:requested-role-next";
  const requestedRole = window.localStorage.getItem(roleRequestKey) === "responder"
    || window.localStorage.getItem(nextRoleRequestKey) === "responder"
    ? "responder"
    : null;
  const profile = await runTransaction(db, async transaction => {
    const profileSnapshot = await transaction.get(profileRef);
    if (profileSnapshot.exists()) return profileSnapshot.data();

    const emailName = email.split("@")[0].trim();
    const displayName = firebaseUser.displayName?.trim() || "";
    const fullName = [displayName, emailName]
      .find(name => name.length >= 2 && name.length <= 100) || "CEIS User";
    const newProfile = {
      uid: firebaseUser.uid,
      email,
      fullName,
      role: "student",
      createdAt: serverTimestamp(),
      ...(requestedRole ? {
        requestedRole,
        roleRequestStatus: "pending",
        roleRequestedAt: serverTimestamp(),
      } : {}),
    };
    transaction.set(profileRef, newProfile);
    return newProfile;
  });
  window.localStorage.removeItem(roleRequestKey);
  window.localStorage.removeItem(nextRoleRequestKey);

  return appUser(firebaseUser, profile);
}

export async function registerUser({
  fullName,
  email,
  password,
  requestedRole = null,
  onProgress = () => {},
}) {
  const normalizedName = fullName.trim();
  if (normalizedName.length < 2 || normalizedName.length > 100) {
    throw new Error("Enter a name between 2 and 100 characters.");
  }
  if (!isValidEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (requestedRole !== null && requestedRole !== "responder") {
    throw new Error("Choose a valid account access request.");
  }
  const passwordError = validateNewPassword(password);
  if (passwordError) throw new Error(passwordError);
  registrationInProgress = true;
  let credential;
  const signupDeadline = Date.now() + 4500;
  try {
    onProgress("Creating your Firebase account…");
    credential = await waitForFirebaseOperation(
      createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password),
      "creating your account",
      Math.max(1, signupDeadline - Date.now()),
    );
    if (requestedRole) {
      window.localStorage.setItem(`ceis:requested-role:${credential.user.uid}`, requestedRole);
    }
    await waitForFirebaseOperation(
      updateProfile(credential.user, { displayName: normalizedName }),
      "updating your account",
      Math.max(1, signupDeadline - Date.now()),
    );
    onProgress("Sending your verification email…");
    const verificationEmail = waitForFirebaseOperation(sendEmailVerification(credential.user, {
      url: emailActionUrl(`/verify-email${requestedRole ? "?requestedRole=responder" : ""}`),
      handleCodeInApp: true,
    }), "requesting the verification email", 5000)
      .then(() => null, error => authError(error))
      .finally(async () => {
        try {
          if (auth.currentUser?.uid === credential.user.uid) await signOut(auth);
        } catch (error) {
          console.error("Could not sign out after registration", error);
        } finally {
          registrationInProgress = false;
        }
      });
    return { verificationEmail };
  } catch (error) {
    try {
      if (credential && auth.currentUser?.uid === credential.user.uid) {
        await signOut(auth);
      }
    } catch (signOutError) {
      console.error("Could not sign out after registration failed", signOutError);
    } finally {
      registrationInProgress = false;
    }
    throw authError(error);
  }
}

export async function signInUser(email, password) {
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await credential.user.reload();
    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user, {
        url: emailActionUrl("/verify-email"),
        handleCodeInApp: true,
      });
      await signOut(auth);
      throw new Error("Verify your email address before signing in. We sent you a new verification link.");
    }

    const user = await loadAppUser(credential.user);
    return { user, firebaseUser: credential.user };
  } catch (error) {
    throw authError(error);
  }
}

export async function requestPasswordReset(email) {
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (error) {
    // Keep the response account-neutral so the form does not reveal registration status.
    if (!["auth/user-not-found", "auth/invalid-email"].includes(error.code)) {
      throw authError(error);
    }
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw authError(error);
  }
}

export async function applyEmailVerificationCode(code) {
  const { applyActionCode } = await import("firebase/auth");
  try {
    await applyActionCode(auth, code);
  } catch (error) {
    throw authError(error);
  }
}
