import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId") || "";
  if (!storeId) {
    return NextResponse.json({ ok: false, error: "storeId requerido" }, { status: 400 });
  }

  const batches = await prisma.ticketImportBatch.findMany({
    where: { storeId },
    orderBy: { importedAt: "desc" },
    take: 25
  });

  return NextResponse.json({ ok: true, batches });
}
