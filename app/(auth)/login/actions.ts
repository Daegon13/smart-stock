"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { issueBetaToken } from "@/lib/betaAuth";

export async function betaLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  const expected = process.env.BETA_PASSWORD;
  const secret = process.env.BETA_SECRET;

  if (!expected || !secret) {
    // Si no está configurado, no bloqueamos (modo dev/demo)
    cookies().set("ss_beta", "", { path: "/", maxAge: 0 });
    redirect("/dashboard");
  }

  if (password !== expected) {
    redirect("/login?error=1");
  }

  const token = await issueBetaToken(secret);
  cookies().set("ss_beta", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30 // 30 días
  });

  redirect("/dashboard");
}

export async function betaLogout() {
  cookies().set("ss_beta", "", { path: "/", maxAge: 0 });
  redirect("/");
}
