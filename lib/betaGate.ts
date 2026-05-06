import { hasBetaGateCredentials } from "@/lib/runtimeFlags";

export function hasBetaGateConfig() {
  return hasBetaGateCredentials();
}

export function isBetaGateMisconfiguredInProd() {
  return process.env.NODE_ENV === "production" && !hasBetaGateConfig();
}
