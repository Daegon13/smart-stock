import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/rbac";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const role = normalizeRole(body?.role);

  const res = NextResponse.json({ ok: true, role });
  // Demo: cookie legible por cliente (para mostrar UI). En producción: esto debería venir de auth real.
  res.cookies.set("ss_role", role, { path: "/", sameSite: "lax" });

  return res;
}
