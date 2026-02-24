"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createDbSession, verifyPassword, destroyDbSession } from "@/lib/auth";
import { clearLoginFailures, isLoginRateLimited, registerLoginFailure } from "@/lib/loginRateLimit";
import { isDevLoginBypassEnabled } from "@/lib/authFlags";

function getClientIp() {
  const h = headers();
  return h.get("x-forwarded-for") || h.get("x-real-ip") || "unknown";
}

export async function signInAction(formData: FormData) {
  if (isDevLoginBypassEnabled()) {
    redirect("/dashboard");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const ip = getClientIp();

  if (!email || !password) {
    redirect("/signin?error=Credenciales inválidas");
  }

  if (isLoginRateLimited(email, ip)) {
    redirect("/signin?error=Demasiados intentos. Esperá 15 minutos");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    registerLoginFailure(email, ip);
    redirect("/signin?error=Credenciales inválidas");
  }

  clearLoginFailures(email, ip);
  await createDbSession(user.id);

  redirect("/dashboard");
}

export async function signOutAction() {
  await destroyDbSession();
  redirect("/signin");
}
