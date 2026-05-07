import { NextResponse } from "next/server";
import { isShowcaseReadonly } from "@/lib/runtimeFlags";

export const SHOWCASE_READONLY_MESSAGE = "La demo pública está en modo solo lectura.";

export function isMutatingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function isReadonlyProtectedApiPath(pathname: string) {
  return (
    pathname === "/api/products" ||
    pathname.startsWith("/api/products/") ||
    pathname === "/api/movements" ||
    pathname === "/api/categories" ||
    pathname.startsWith("/api/categories/") ||
    pathname === "/api/aliases" ||
    pathname.startsWith("/api/aliases/") ||
    pathname === "/api/import/csv" ||
    pathname === "/api/import/tickets" ||
    (pathname.startsWith("/api/import/batches/") && pathname.endsWith("/undo")) ||
    pathname === "/api/purchases/drafts" ||
    pathname === "/api/purchases/orders" ||
    (pathname.startsWith("/api/purchases/orders/") && pathname.endsWith("/receive")) ||
    pathname === "/api/tickets/resolve" ||
    pathname === "/api/stock/recalculate" ||
    pathname === "/api/demo/seed" ||
    pathname === "/api/ai/execute"
  );
}

export function rejectMutationInShowcase(method = "POST") {
  if (!isShowcaseReadonly() || !isMutatingMethod(method)) return null;

  return NextResponse.json(
    { ok: false, error: { message: SHOWCASE_READONLY_MESSAGE } },
    { status: 403, headers: { "cache-control": "no-store" } }
  );
}

export function canMutateInRuntime() {
  return !isShowcaseReadonly();
}
