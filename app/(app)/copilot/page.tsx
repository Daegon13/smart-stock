import { AICopilot } from "@/components/AICopilot";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";

export default async function CopilotPage() {
  const store = await getOrCreateDefaultStore();
  return <AICopilot storeId={store.id} />;
}
