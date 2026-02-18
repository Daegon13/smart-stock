import { prisma } from "@/lib/db";

export async function writeAudit(args: {
  storeId: string;
  role: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  payload?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        storeId: args.storeId,
        role: args.role,
        action: args.action,
        entity: args.entity || null,
        entityId: args.entityId || null,
        payload: args.payload ? JSON.stringify(args.payload).slice(0, 4000) : null,
        ip: args.ip || null,
        userAgent: args.userAgent || null
      }
    });
  } catch {
    // en demo/local: si aún no se migró el schema, no rompemos la app
  }
}
