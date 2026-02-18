import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normName, normCodeLoose } from "@/lib/posNormalize";
import { requirePermission } from "@/lib/rbac";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  const kind = searchParams.get("kind") || "";
  const q = (searchParams.get("q") || "").trim();

  if (!storeId) return NextResponse.json({ error: { message: "storeId requerido" } }, { status: 400 });

  const where: any = { storeId };
  if (kind) where.kind = kind;

  const list = await prisma.productAlias.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id: true, name: true, sku: true } } }
  });

  const filtered = q
    ? list.filter((a) => {
        const kk = a.kind === "NAME" ? normName(a.key) : normCodeLoose(a.key);
        const qq = a.kind === "NAME" ? normName(q) : normCodeLoose(q);
        return kk.includes(qq) || (a.product?.name ? normName(a.product.name).includes(normName(q)) : false);
      })
    : list;

  return NextResponse.json({ aliases: filtered });
}

const CreateSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  kind: z.enum(["CODE", "NAME"]),
  key: z.string().min(1)
});

export async function POST(req: Request) {
  const perm = requirePermission(req, "aliases:write");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { storeId, productId, kind, key } = parsed.data;

  const product = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: { message: "Producto inválido" } }, { status: 400 });

  const finalKey = kind === "NAME" ? normName(key) : key.trim();

  const created = await prisma.productAlias.upsert({
    where: { storeId_kind_key: { storeId, kind, key: finalKey } },
    create: { storeId, productId, kind, key: finalKey },
    update: { productId }
  });

  return NextResponse.json({ alias: created });
}
