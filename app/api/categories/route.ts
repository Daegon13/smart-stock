import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canMutate, withActiveStore } from "@/lib/apiAuth";

function slugify(s: string) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET(req: Request) {
  return withActiveStore(async ({ storeId }) => {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "";
    const categories = await prisma.category.findMany({ where: { storeId, ...(scope ? { scope } : {}) }, orderBy: [{ scope: "asc" }, { name: "asc" }] });
    return NextResponse.json({ categories });
  });
}

const CreateSchema = z.object({ storeId: z.string().optional(), scope: z.string().min(1), name: z.string().min(1), color: z.string().optional(), icon: z.string().optional() });

export async function POST(req: Request) {
  return withActiveStore(async ({ storeId, role }) => {
    if (!canMutate(role)) return NextResponse.json({ error: { message: "Sin permisos" } }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });

    const { scope, name, color, icon } = parsed.data;
    const slug = slugify(name);
    const created = await prisma.category.upsert({
      where: { storeId_scope_slug: { storeId, scope, slug } },
      create: { storeId, scope, name, slug, color: color || null, icon: icon || null },
      update: { name, color: color || null, icon: icon || null }
    });

    return NextResponse.json({ category: created });
  });
}
