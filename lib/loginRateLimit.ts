const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptState = { count: number; expires: number };
const attempts = new Map<string, AttemptState>();

function normalizeIp(raw: string | null | undefined) {
  if (!raw) return "unknown";
  return raw.split(",")[0]?.trim() || "unknown";
}

function keyFor(email: string, ip: string | null | undefined) {
  return `${email.toLowerCase()}::${normalizeIp(ip)}`;
}

export function isLoginRateLimited(email: string, ip: string | null | undefined) {
  const key = keyFor(email, ip);
  const current = attempts.get(key);
  if (!current) return false;
  if (Date.now() > current.expires) {
    attempts.delete(key);
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

export function registerLoginFailure(email: string, ip: string | null | undefined) {
  const key = keyFor(email, ip);
  const current = attempts.get(key);
  if (!current || Date.now() > current.expires) {
    attempts.set(key, { count: 1, expires: Date.now() + WINDOW_MS });
    return;
  }
  attempts.set(key, { count: current.count + 1, expires: current.expires });
}

export function clearLoginFailures(email: string, ip: string | null | undefined) {
  attempts.delete(keyFor(email, ip));
}

export function getLoginRateLimitConfig() {
  return { windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS, storage: "in-memory" };
}
