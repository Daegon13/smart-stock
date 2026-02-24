import { NextResponse } from "next/server";
import { getRequestId, logApiEvent } from "@/lib/observability";
import { normalizeRole } from "@/lib/rbac";

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  // Seguridad: en producción, no permitimos setear rol por cookie desde el cliente.
  if (process.env.NODE_ENV === "production") {
    logApiEvent({
      requestId,
      route: "/api/session/role",
      method: "POST",
      status: 403,
      message: "blocked in production"
    });

    return NextResponse.json(
      { ok: false, error: "Not available in production" },
      { status: 403, headers: { "x-request-id": requestId, "cache-control": "no-store" } }
    );
  }

  const body = await req.json().catch(() => null);
  const role = normalizeRole(body?.role);

  logApiEvent({
    requestId,
    route: "/api/session/role",
    method: "POST",
    status: 200,
    message: `role set to ${role}`
  });

  const res = NextResponse.json(
    { ok: true, role },
    { headers: { "x-request-id": requestId, "cache-control": "no-store" } }
  );
  // Demo: cookie legible por cliente (para mostrar UI). En producción: esto debería venir de auth real.
  res.cookies.set("ss_role", role, { path: "/", sameSite: "lax", secure: false });

  return res;
}
