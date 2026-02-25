export function isLoginSystemEnabled() {
  // En producción nunca deshabilitamos auth por seguridad.
  if (process.env.NODE_ENV === "production") return true;

  const raw = (process.env.AUTH_LOGIN_ENABLED || "true").toLowerCase();
  return raw !== "false";
}

export function isDevLoginBypassEnabled() {
  return !isLoginSystemEnabled() && process.env.NODE_ENV !== "production";
}
