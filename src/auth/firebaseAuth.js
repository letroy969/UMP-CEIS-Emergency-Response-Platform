import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

const STAFF_ROLES = new Set(["staff", "admin", "security", "medical"]);

function authError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists for this email. Sign in or use password reset.",
    "auth/invalid-credential": "We could not sign you in. Check your email and password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a while and try again.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/network-request-failed": "Could not connect to Firebase. Check your connection and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication yet.",
  };
  return new Error(messages[error.code] || error.message || "Authentication failed. Please try again.");
}

function appUser(firebaseUser, profile) {
  const role = STAFF_ROLES.has(profile.role) ? profile.role : "student";
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    name: profile.fullName || firebaseUser.displayName || firebaseUser.email,
    faculty: profile.faculty || "Faculty not listed",
    year: profile.year || 1,
    dept: profile.department || "",
    role,
    access: ({ admin: "full", staff: "staff", security: "security", medical: "medical", student: "student" })[role],
    portal: role === "student" ? "student" : "staff",
  };
}

export async function loadAppUser(firebaseUser) {
  if (!firebaseUser.emailVerified) {
    throw new Error("Verify your email address before signing in.");
  }
  const profileSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
  if (!profileSnapshot.exists()) {
    throw new Error("Your CEIS profile is missing. Please contact support.");
  }
  return appUser(firebaseUser, profileSnapshot.data());
}

export async function registerUser({ fullName, email, password }) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await updateProfile(credential.user, { displayName: fullName.trim() });
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      email: credential.user.email,
      fullName: fullName.trim(),
      role: "student",
      createdAt: serverTimestamp(),
    });
    await sendEmailVerification(credential.user, {
      url: `${window.location.origin}/verify-email`,
      handleCodeInApp: true,
    });
    await signOut(auth);
  } catch (error) {
    throw authError(error);
  }
}

export async function signInUser(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await credential.user.reload();
    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user, {
        url: `${window.location.origin}/verify-email`,
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
