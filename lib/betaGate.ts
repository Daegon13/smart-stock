export function hasBetaGateConfig() {
  return Boolean(process.env.BETA_PASSWORD && process.env.BETA_SECRET);
}

export function isBetaGateMisconfiguredInProd() {
  return process.env.NODE_ENV === "production" && !hasBetaGateConfig();
}
