"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createDbSession, verifyPassword, destroyDbSession } from "@/lib/auth";

const attempts = new Map<string, { count: number; expires: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function keyFor(email: string) {
  return `${email.toLowerCase()}`;
}

function isRateLimited(email: string) {
  const key = keyFor(email);
  const current = attempts.get(key);
  if (!current) return false;
  if (Date.now() > current.expires) {
    attempts.delete(key);
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

function noteFailure(email: string) {
  const key = keyFor(email);
  const current = attempts.get(key);
  if (!current || Date.now() > current.expires) {
    attempts.set(key, { count: 1, expires: Date.now() + WINDOW_MS });
    return;
  }
  attempts.set(key, { count: current.count + 1, expires: current.expires });
}

function resetAttempts(email: string) {
  attempts.delete(keyFor(email));
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/signin?error=Credenciales inválidas");
  }

  if (isRateLimited(email)) {
    redirect("/signin?error=Demasiados intentos. Esperá 15 minutos");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    noteFailure(email);
    redirect("/signin?error=Credenciales inválidas");
  }

  resetAttempts(email);
  await createDbSession(user.id);

  await prisma.auditLog.create({
    data: {
      storeId: (await prisma.store.findFirst({ select: { id: true } }))?.id || "",
      role: "SYSTEM",
      action: "auth.login",
      entity: "User",
      entityId: user.id,
      payload: JSON.stringify({ email })
    }
  }).catch(() => {});

  redirect("/dashboard");
}

export async function signOutAction() {
  await destroyDbSession();
  redirect("/signin");
}
