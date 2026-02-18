import { NextResponse } from "next/server";

export type Role = "owner" | "manager" | "staff" | "viewer";

const ALL = "*";

const ROLE_PERMS: Record<Role, string[]> = {
  owner: [ALL],
  manager: [
    "ai:execute",
    "products:write",
    "categories:write",
    "aliases:write",
    "orders:write",
    "orders:receive",
    "tickets:reconcile"
  ],
  staff: [
    "aliases:write",
    "tickets:reconcile",
    "orders:receive"
  ],
  viewer: []
};

export function normalizeRole(value: unknown): Role {
  const v = String(value || "").toLowerCase();
  if (v === "owner" || v === "manager" || v === "staff" || v === "viewer") return v;
  return "owner";
}

function parseCookie(cookieHeader: string, key: string): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    if (k === key) return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

export function getRoleFromRequest(req: Request): Role {
  const fromHeader = req.headers.get("x-role");
  if (fromHeader) return normalizeRole(fromHeader);

  const cookie = req.headers.get("cookie") || "";
  const fromCookie = parseCookie(cookie, "ss_role");
  if (fromCookie) return normalizeRole(fromCookie);

  return "owner";
}

export function hasPermission(role: Role, perm: string): boolean {
  const perms = ROLE_PERMS[role] || [];
  return perms.includes(ALL) || perms.includes(perm);
}

export function requirePermission(req: Request, perm: string): { ok: true; role: Role } | { ok: false; role: Role; response: NextResponse } {
  const role = getRoleFromRequest(req);
  if (!hasPermission(role, perm)) {
    return {
      ok: false,
      role,
      response: NextResponse.json(
        { error: { message: "Sin permisos para esta acción", perm, role } },
        { status: 403 }
      )
    };
  }
  return { ok: true, role };
}
