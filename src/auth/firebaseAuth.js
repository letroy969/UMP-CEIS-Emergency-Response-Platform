import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

const ROLE_PORTALS = {
  student: "student",
  staff: "staff",
  admin: "admin",
  responder: "responder",
  security: "responder",
  medical: "responder",
};

export function isUmpEmail(email) {
  return /^[^\s@]+@ump\.ac\.za$/i.test(email.trim());
}

export function validateNewPassword(password) {
  if (password.length < 12 || password.length > 128) {
    return "Use 12–128 characters.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)
    || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Include an uppercase letter, lowercase letter, number, and symbol.";
  }
  return "";
}

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
  const storedRole = profile.role;
  const role = storedRole === "security" || storedRole === "medical"
    ? "responder"
    : ROLE_PORTALS[storedRole] ? storedRole : "student";
  const portal = ROLE_PORTALS[role];
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
  if (!isUmpEmail(email)) {
    throw new Error("Use your university email address ending in @ump.ac.za.");
  }
  const passwordError = validateNewPassword(password);
  if (passwordError) throw new Error(passwordError);
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
  if (!isUmpEmail(email)) {
    throw new Error("Use your university email address ending in @ump.ac.za.");
  }
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

export async function requestPasswordReset(email) {
  if (!isUmpEmail(email)) {
    throw new Error("Use your university email address ending in @ump.ac.za.");
  }
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
      url: `${window.location.origin}/`,
      handleCodeInApp: false,
    });
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
