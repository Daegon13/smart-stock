import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

const PatchSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().optional(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "categories:write");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { storeId, name, color, icon } = parsed.data;
  const id = params.id;

  const existing = await prisma.category.findFirst({ where: { id, storeId } });
  if (!existing) return NextResponse.json({ error: { message: "Categoría no encontrada" } }, { status: 404 });

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      color: color === undefined ? existing.color : color,
      icon: icon === undefined ? existing.icon : icon
    }
  });

  return NextResponse.json({ category: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "categories:write");
  if (!perm.ok) return perm.response;

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  if (!storeId) return NextResponse.json({ error: { message: "storeId requerido" } }, { status: 400 });

  const id = params.id;
  const existing = await prisma.category.findFirst({ where: { id, storeId } });
  if (!existing) return NextResponse.json({ ok: true });

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
