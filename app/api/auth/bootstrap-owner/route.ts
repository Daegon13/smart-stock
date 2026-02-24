import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isAllowed() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ALLOW_AUTH_BOOTSTRAP === "true";
}

export async function POST(req: Request) {
  if (!isAllowed()) {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const name = String(body?.name || "Owner");
  const orgName = String(body?.organizationName || "Default Org");
  const franchiseName = String(body?.franchiseName || "Default Franchise");
  const storeName = String(body?.storeName || "Main Store");

  if (!email || password.length < 8) {
    return NextResponse.json({ ok: false, error: "email y password>=8 requeridos" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: { name, passwordHash: hashPassword(password) },
      create: { email, name, passwordHash: hashPassword(password) }
    });

    const org = await tx.organization.create({ data: { name: orgName } });
    const franchise = await tx.franchise.create({ data: { name: franchiseName, organizationId: org.id } });
    const store = await tx.store.create({ data: { name: storeName, organizationId: org.id, franchiseId: franchise.id } });

    await tx.orgMember.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: { role: "OWNER" },
      create: { userId: user.id, organizationId: org.id, role: "OWNER" }
    });

    return { userId: user.id, organizationId: org.id, franchiseId: franchise.id, storeId: store.id };
  });

  return NextResponse.json({ ok: true, ...result });
}
