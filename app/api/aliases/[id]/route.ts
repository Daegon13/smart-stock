import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normName } from "@/lib/posNormalize";
import { requirePermission } from "@/lib/rbac";

const PatchSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().optional(),
  key: z.string().optional(),
  kind: z.enum(["CODE", "NAME"]).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "aliases:write");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { storeId, productId, key, kind } = parsed.data;
  const id = params.id;

  const existing = await prisma.productAlias.findFirst({ where: { id, storeId } });
  if (!existing) return NextResponse.json({ error: { message: "Alias no encontrado" } }, { status: 404 });

  let nextKind = kind ?? existing.kind;
  let nextKey = key ?? existing.key;

  if (nextKind === "NAME") nextKey = normName(nextKey);

  // Si cambian kind/key, necesitamos asegurar la uniqueness (storeId, kind, key)
  if (nextKind !== existing.kind || nextKey !== existing.key) {
    const conflict = await prisma.productAlias.findFirst({
      where: { storeId, kind: nextKind, key: nextKey, NOT: { id } },
      select: { id: true }
    });
    if (conflict) {
      return NextResponse.json({ error: { message: "Ya existe un alias con ese kind/key" } }, { status: 409 });
    }
  }

  if (productId) {
    const p = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true } });
    if (!p) return NextResponse.json({ error: { message: "Producto inválido" } }, { status: 400 });
  }

  const updated = await prisma.productAlias.update({
    where: { id },
    data: {
      kind: nextKind,
      key: nextKey,
      productId: productId ?? existing.productId
    }
  });

  return NextResponse.json({ alias: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "aliases:write");
  if (!perm.ok) return perm.response;

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  if (!storeId) return NextResponse.json({ error: { message: "storeId requerido" } }, { status: 400 });

  const id = params.id;
  const existing = await prisma.productAlias.findFirst({ where: { id, storeId } });
  if (!existing) return NextResponse.json({ ok: true });

  await prisma.productAlias.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
