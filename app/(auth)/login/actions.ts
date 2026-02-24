"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { issueBetaToken } from "@/lib/betaAuth";
import { hasBetaGateConfig, isBetaGateMisconfiguredInProd } from "@/lib/betaGate";

export async function betaLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const expected = process.env.BETA_PASSWORD ?? "";
  const secret = process.env.BETA_SECRET ?? "";

  if (!hasBetaGateConfig()) {
    if (isBetaGateMisconfiguredInProd()) {
      redirect("/login?misconfig=1");
    }

    // Si no está configurado, no bloqueamos (modo dev/demo)
    cookies().set("ss_beta", "", { path: "/", maxAge: 0 });
    redirect(nextPath);
  }

  if (password !== expected) {
    redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const token = await issueBetaToken(secret);
  cookies().set("ss_beta", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30 // 30 días
  });

  redirect(nextPath);
}

export async function betaLogout() {
  cookies().set("ss_beta", "", { path: "/", maxAge: 0 });
  redirect("/");
}
