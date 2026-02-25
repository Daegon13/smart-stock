import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { isDevLoginBypassEnabled } from "@/lib/authFlags";

export const ACTIVE_STORE_COOKIE = "ss_active_store";
const SESSION_COOKIE = "ss_session";
const SESSION_TTL_DAYS = 30;

export type AuthRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "READONLY";

type UserSession = {
  userId: string;
  email: string;
  name: string | null;
  sessionToken: string;
};

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, hash: string) {
  const [algo, salt, expected] = hash.split(":");
  if (algo !== "scrypt" || !salt || !expected) return false;

  try {
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function createDbSession(userId: string) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, sessionToken, expires } });
  cookies().set(SESSION_COOKIE, sessionToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
  });
  return sessionToken;
}

export async function destroyDbSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { sessionToken: token } });
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  cookies().set(ACTIVE_STORE_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getUserSession(): Promise<UserSession | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true }
    });
    if (!session || session.expires < new Date()) {
      cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
      return null;
    }

    return {
      userId: session.userId,
      email: session.user.email,
      name: session.user.name,
      sessionToken: session.sessionToken
    };
  } catch {
    // Compatibilidad: si la migración de auth aún no está aplicada, evitamos romper toda la app.
    cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return null;
  }
}

export async function requireUser() {
  if (isDevLoginBypassEnabled() || (process.env.ALLOW_DEMO_NO_AUTH === "true" && process.env.NODE_ENV !== "production")) {
    return {
      userId: "demo-user",
      email: "demo@localhost",
      name: "Demo",
      sessionToken: "demo"
    };
  }

  const session = await getUserSession();
  if (session) return session;

  redirect("/signin");
}

export async function requireOrgAccess(orgId: string) {
  const user = await requireUser();
  if (user.userId === "demo-user") return { user, role: "OWNER" as AuthRole };

  const orgMember = await prisma.orgMember.findUnique({
    where: { userId_organizationId: { userId: user.userId, organizationId: orgId } }
  });
  if (!orgMember) redirect("/select-store");
  return { user, role: orgMember.role as AuthRole };
}

export async function requireStoreAccess(storeId: string) {
  const user = await requireUser();
  if (user.userId === "demo-user") {
    const demo = await prisma.store.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    if (!demo) redirect("/select-store");
    return { orgId: "", franchiseId: "", storeId: demo.id, role: "OWNER" as AuthRole };
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store?.organizationId) redirect("/select-store");

  const [storeMember, orgMember] = await Promise.all([
    prisma.storeMember.findUnique({ where: { userId_storeId: { userId: user.userId, storeId } } }),
    prisma.orgMember.findUnique({ where: { userId_organizationId: { userId: user.userId, organizationId: store.organizationId } } })
  ]);

  const role = (storeMember?.role || orgMember?.role) as AuthRole | undefined;
  if (!role) redirect("/select-store");

  return {
    orgId: store.organizationId,
    franchiseId: store.franchiseId || "",
    storeId: store.id,
    role
  };
}

export async function getActiveStoreFromSession() {
  const activeStoreId = cookies().get(ACTIVE_STORE_COOKIE)?.value;
  if (activeStoreId) {
    try {
      const access = await requireStoreAccess(activeStoreId);
      const store = await prisma.store.findUnique({ where: { id: access.storeId } });
      if (store) return store;
    } catch {
      // noop
    }
  }

  if (isDevLoginBypassEnabled() || (process.env.ALLOW_DEMO_NO_AUTH === "true" && process.env.NODE_ENV !== "production")) {
    const demo = await prisma.store.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
    if (demo) return demo;
  }

  redirect("/select-store");
}

export async function setActiveStoreForSession(storeId: string) {
  await requireStoreAccess(storeId);
  cookies().set(ACTIVE_STORE_COOKIE, storeId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
  });
}

export async function requireActiveStore() {
  const activeStoreId = cookies().get(ACTIVE_STORE_COOKIE)?.value;
  if (!activeStoreId) redirect("/select-store");
  return requireStoreAccess(activeStoreId);
}
