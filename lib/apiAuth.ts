import { requireActiveStore } from "@/lib/auth";

function parseBoolEnv(value: string | undefined, defaultValue: boolean) {
  if (value == null) return defaultValue;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "off"].includes(v)) return false;
  return defaultValue;
}

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

export async function withActiveStore<T>(
  handler: (ctx: {
    storeId: string;
    orgId: string;
    franchiseId: string;
    role: string;
  }) => Promise<T>,
): Promise<T> {
  const ctx = await requireActiveStore();
  return handler({
    storeId: ctx.storeId,
    orgId: ctx.orgId,
    franchiseId: ctx.franchiseId,
    role: ctx.role,
  });
}

export function canMutate(role: string): boolean {
  return role !== "READONLY";
}
