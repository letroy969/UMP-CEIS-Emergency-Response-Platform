const SESSION_KEY = "ump-ceis.auth-session.v1";

export function readAuthSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null");
    return session?.user && session?.refreshToken ? session : null;
  } catch {
    return null;
  }
}

export function writeAuthSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
