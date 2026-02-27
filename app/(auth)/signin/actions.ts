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

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error("[auth] prisma.user.findUnique failed during signin", error);
    redirect(
      "/signin?error=Auth%20no%20inicializado%20en%20DB.%20Ejecut%C3%A1%20migraciones%20(prisma%20migrate%20deploy)%20y%20bootstrap%20admin."
    );
  }

  if (!user) {
    redirect("/signin?error=Usuario%20inexistente.%20Ejecut%C3%A1%20bootstrap%20admin%20o%20cre%C3%A1%20usuarios.");
  }

  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    registerLoginFailure(email, ip);
    redirect("/signin?error=Credenciales inválidas");
  }

  clearLoginFailures(email, ip);

  try {
    await createDbSession(user.id);
  } catch (error) {
    console.error("[auth] createDbSession failed during signin", error);
    redirect(
      "/signin?error=Auth%20no%20inicializado%20en%20DB.%20Ejecut%C3%A1%20migraciones%20(prisma%20migrate%20deploy)%20y%20bootstrap%20admin."
    );
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await destroyDbSession();
  redirect("/signin");
}
