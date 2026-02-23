import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/rbac";
import { getRequestId, logApiEvent } from "@/lib/observability";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });
  // Seguridad: en producción, no permitimos setear rol por cookie desde el cliente.
  if (process.env.NODE_ENV === "production") {
    logApiEvent({ requestId, route: "/api/session/role", method: "POST", status: 403, message: "disabled in production" });
    return json({ ok: false, error: "Not available in production" }, 403);
  }

  const body = await req.json().catch(() => null);
  const role = normalizeRole(body?.role);

  logApiEvent({ requestId, route: "/api/session/role", method: "POST", status: 200, message: `role set: ${role}` });
  const res = json({ ok: true, role });
  // Demo: cookie legible por cliente (para mostrar UI). En producción: esto debería venir de auth real.
  res.cookies.set("ss_role", role, { path: "/", sameSite: "lax" });

  return res;
}
