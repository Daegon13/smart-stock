"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, Sticker } from "@/components/ui";

type Role = "owner" | "manager" | "staff" | "viewer";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    if (k === name) return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

export function RoleSwitcher() {
  const [role, setRole] = useState<Role>("owner");
  const options = useMemo(
    () => [
      { value: "owner", label: "Owner (todo)" },
      { value: "manager", label: "Manager" },
      { value: "staff", label: "Staff" },
      { value: "viewer", label: "Viewer (solo lectura)" }
    ],
    []
  );

  useEffect(() => {
    const c = readCookie("ss_role") as Role | null;
    if (c) setRole(c);
  }, []);

  async function onChange(next: string) {
    const r = (next as Role) || "owner";
    setRole(r);

    await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: r })
    }).catch(() => null);

    // refrescar para que el servidor lea el rol en APIs
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <Sticker tone={role === "viewer" ? "amber" : role === "staff" ? "blue" : role === "manager" ? "green" : "purple"}>
        🔐 Rol
      </Sticker>
      <Select value={role} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
