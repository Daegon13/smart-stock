import { requireActiveStore } from "@/lib/auth";

export async function withActiveStore<T>(handler: (ctx: { storeId: string; orgId: string; franchiseId: string; role: string }) => Promise<T>) {
  const access = await requireActiveStore();
  return handler(access);
}

export function canMutate(role: string) {
  return role !== "READONLY";
}
