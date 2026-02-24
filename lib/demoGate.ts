export function isDemoAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SEED === "true";
}
