"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/panelAuth";
import { issuePanelToken } from "@/lib/panelToken";

const loginAttemptBuckets = new Map<string, { count: number; resetAt: number }>();

function safeNext(nextRaw: string) {
  return nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/today";
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getClientIp() {
  const h = headers();
  const forwarded = h.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;
  return h.get("x-real-ip") || "unknown";
}

function consumeLoginAttempt(ip: string, maxAttempts: number, windowSeconds: number) {
  const now = Date.now();
  const key = `login:${ip}`;
  const current = loginAttemptBuckets.get(key);

  if (!current || current.resetAt <= now) {
    loginAttemptBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true as const };
  }

  if (current.count >= maxAttempts) {
    return { allowed: false as const };
  }

  current.count += 1;
  return { allowed: true as const };
}

function clearLoginAttempts(ip: string) {
  loginAttemptBuckets.delete(`login:${ip}`);
}

export async function panelLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNext(String(formData.get("next") ?? ""));

  const expectedEmail = String(process.env.AUTH_EMAIL || "").trim().toLowerCase();
  const secret = process.env.AUTH_SECRET || process.env.BETA_SECRET;

  if (!expectedEmail || !secret) {
    redirect(`/login?error=setup&next=${encodeURIComponent(nextPath)}`);
  }

  const maxAttempts = toPositiveInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 10);
  const windowSeconds = toPositiveInt(process.env.AUTH_LOGIN_WINDOW_SECONDS, 60);
  const ip = getClientIp();
  const rate = consumeLoginAttempt(ip, maxAttempts, windowSeconds);
  if (!rate.allowed) {
    redirect(`/login?error=rate&next=${encodeURIComponent(nextPath)}`);
  }

  if (email !== expectedEmail || !verifyPassword(password)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`);
  }

  clearLoginAttempts(ip);
  const maxAgeSeconds = toPositiveInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS, 60 * 60 * 24 * 30);
  const token = await issuePanelToken(secret, email, maxAgeSeconds);
  cookies().set("ss_auth", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds
  });

  cookies().set("ss_beta", "", { path: "/", maxAge: 0 });

  redirect(nextPath);
}

export async function panelLogout() {
  cookies().set("ss_auth", "", { path: "/", maxAge: 0 });
  cookies().set("ss_beta", "", { path: "/", maxAge: 0 });
  redirect("/");
}
