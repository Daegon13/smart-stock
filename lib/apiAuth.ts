import { cookies } from "next/headers";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { normalizeRole, type Role } from "@/lib/rbac";

function parseBoolEnv(value: string | undefined, defaultValue: boolean) {
  if (value == null) return defaultValue;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "off"].includes(v)) return false;
  return defaultValue;
}

export type ApiRole = Role | "ADMIN" | "MANAGER" | "OWNER" | "READONLY" | "STAFF";

export type ApiAuthContext = {
  storeId: string;
  role: ApiRole;
};

/**
 * Flag principal para activar/desactivar el sistema de login.
 * - default: true
 * - si es false, el proyecto entra en modo bypass (demo) en TODOS los entornos,
 *   incluido Vercel Production, para acelerar iteración.
 */
export function isLoginSystemEnabled() {
  return parseBoolEnv(process.env.AUTH_LOGIN_ENABLED, true);
}

/**
 * Bypass de login (modo demo): cuando el sistema de login está desactivado.
 */
export function isDevLoginBypassEnabled() {
  return !isLoginSystemEnabled();
}

function getRequestRole(): Role {
  // Compatibilidad temporal con el selector de rol de demo; auth real debe reemplazar esto.
  return normalizeRole(cookies().get("ss_role")?.value);
}

export function canMutate(role: ApiRole | null | undefined) {
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
