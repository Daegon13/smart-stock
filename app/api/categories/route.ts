import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

function slugify(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  const scope = searchParams.get("scope") || "";

  if (!storeId) return NextResponse.json({ error: { message: "storeId requerido" } }, { status: 400 });

  const categories = await prisma.category.findMany({
    where: { storeId, ...(scope ? { scope } : {}) },
    orderBy: [{ scope: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({ categories });
}

const CreateSchema = z.object({
  storeId: z.string().min(1),
  scope: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional()
});

export async function POST(req: Request) {
  const perm = requirePermission(req, "categories:write");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { storeId, scope, name, color, icon } = parsed.data;
  const slug = slugify(name);

  const created = await prisma.category.upsert({
    where: { storeId_scope_slug: { storeId, scope, slug } },
    create: { storeId, scope, name, slug, color: color || null, icon: icon || null },
    update: { name, color: color || null, icon: icon || null }
  });

  return NextResponse.json({ category: created });
}
