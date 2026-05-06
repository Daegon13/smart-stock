function parseBoolEnv(value: string | undefined, defaultValue: boolean) {
  if (value == null || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

function isVercelProduction() {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || isVercelProduction();
}

export function isAuthEnabled() {
  return parseBoolEnv(process.env.AUTH_LOGIN_ENABLED, true);
}

export function isLoginSystemEnabled() {
  return isAuthEnabled();
}

export function isShowcaseMode() {
  return parseBoolEnv(process.env.SHOWCASE_MODE ?? process.env.NEXT_PUBLIC_SHOWCASE_MODE, false);
}

export function isPublicShowcaseMode() {
  return isShowcaseMode();
}

export function isShowcaseReadonly() {
  if (!isShowcaseMode()) return parseBoolEnv(process.env.SHOWCASE_READONLY, false);
  return parseBoolEnv(process.env.SHOWCASE_READONLY, true);
}

export function isDemoNoAuthAllowed() {
  return parseBoolEnv(process.env.ALLOW_DEMO_NO_AUTH, false) && !isProductionRuntime();
}

export function shouldBypassLogin() {
  if (isShowcaseMode()) return true;
  if (isDemoNoAuthAllowed()) return true;
  if (isAuthEnabled()) return false;

  if (process.env.VERCEL === "1") return !isVercelProduction();
  return process.env.NODE_ENV !== "production";
}

export function isAuthBypassAllowed() {
  return shouldBypassLogin();
}

export function isDemoSeedAllowed() {
  return parseBoolEnv(process.env.ALLOW_DEMO_SEED, false) || process.env.NODE_ENV !== "production";
}

export function getDefaultShowcaseStoreId() {
  return process.env.DEMO_STORE_ID || process.env.SHOWCASE_STORE_ID || undefined;
}

export function hasBetaGateCredentials() {
  return Boolean(process.env.BETA_PASSWORD && process.env.BETA_SECRET);
}
