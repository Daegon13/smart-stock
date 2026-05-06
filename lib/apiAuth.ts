import { cookies } from "next/headers";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { normalizeRole, type Role } from "@/lib/rbac";
import { isLoginSystemEnabled, isAuthBypassAllowed, isShowcaseReadonly } from "@/lib/runtimeFlags";

export type ApiRole = Role | "ADMIN" | "MANAGER" | "OWNER" | "READONLY" | "STAFF";

export type ApiAuthContext = {
  storeId: string;
  role: ApiRole;
};

export { isLoginSystemEnabled };

export function isDevLoginBypassEnabled() {
  return isAuthBypassAllowed();
}

function getRequestRole(): Role {
  // Compatibilidad temporal con el selector de rol de demo; auth real debe reemplazar esto.
  return normalizeRole(cookies().get("ss_role")?.value);
}

export function canMutate(role: ApiRole | null | undefined) {
  if (isShowcaseReadonly()) return false;

  const normalized = String(role || "").toLowerCase();
  return normalized !== "readonly" && normalized !== "viewer";
}

export async function getActiveStore() {
  return getOrCreateDefaultStore();
}

export async function requireAuth(): Promise<ApiAuthContext> {
  const store = await getActiveStore();
  return { storeId: store.id, role: getRequestRole() };
}

export async function withActiveStore<T>(handler: (context: ApiAuthContext) => T | Promise<T>): Promise<T> {
  return handler(await requireAuth());
}
