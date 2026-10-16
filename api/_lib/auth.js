const RESPONDER_ROLES = new Set(["responder", "security", "medical"]);

function roleSet(profile = {}) {
  const roles = new Set();
  for (const value of [profile.role, ...(Array.isArray(profile.roles) ? profile.roles : [])]) {
    if (typeof value === "string") roles.add(value.toLowerCase());
    if (Array.isArray(value)) value.forEach(role => typeof role === "string" && roles.add(role.toLowerCase()));
  }
  return roles;
}

export function hasRole(user, role) {
  return user.roles.has(role);
}

export function isResponder(user) {
  return [...RESPONDER_ROLES].some(role => user.roles.has(role));
}

export function requireRole(user, expected) {
  if (!expected.some(role => user.roles.has(role))) {
    const error = new Error("Your account is not allowed to perform this action.");
    error.status = 403;
    throw error;
  }
}

export async function authenticate(req, _res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match) {
      const error = new Error("Sign in to continue.");
      error.status = 401;
      throw error;
    }

    const { auth, db } = (await import("./firebaseAdmin.js")).getFirebaseServices();
    const claims = await auth.verifyIdToken(match[1], true);
    if (claims.email_verified !== true || typeof claims.email !== "string") {
      const error = new Error("Verify your email address before using CEIS.");
      error.status = 403;
      throw error;
    }

    const profileSnapshot = await db.collection("users").doc(claims.uid).get();
    if (!profileSnapshot.exists) {
      const error = new Error("Your account profile is not provisioned.");
      error.status = 403;
      throw error;
    }

    req.user = {
      uid: claims.uid,
      email: claims.email,
      name: profileSnapshot.get("fullName") || claims.name || claims.email,
      profile: profileSnapshot.data(),
      roles: roleSet(profileSnapshot.data()),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export async function enforceRateLimit(db, key, max = 30, windowMs = 60000) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const ref = db.collection("apiRateLimits").doc(`${key}_${windowStart}`);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? snapshot.get("count") || 0 : 0;
    if (count >= max) {
      const error = new Error("Too many requests. Wait a minute and try again.");
      error.status = 429;
      throw error;
    }
    transaction.set(ref, { count: count + 1, expiresAt: new Date(windowStart + windowMs * 2) });
  });
}
