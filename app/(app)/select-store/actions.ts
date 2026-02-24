"use server";

import { redirect } from "next/navigation";
import { setActiveStoreForSession } from "@/lib/auth";

export async function selectStoreAction(formData: FormData) {
  const storeId = String(formData.get("storeId") || "");
  if (!storeId) redirect("/select-store?error=1");
  await setActiveStoreForSession(storeId);
  redirect("/dashboard");
}
