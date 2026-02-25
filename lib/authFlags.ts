function isVercelProduction() {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

export function isLoginSystemEnabled() {
  const raw = (process.env.AUTH_LOGIN_ENABLED || "true").toLowerCase();
  return raw !== "false";
}

export function isDevLoginBypassEnabled() {
  if (isLoginSystemEnabled()) return false;

  // En Vercel Preview permitimos bypass para iteración.
  if (process.env.VERCEL === "1") {
    return !isVercelProduction();
  }

  // Local/otros entornos: solo fuera de producción.
  return process.env.NODE_ENV !== "production";
}
