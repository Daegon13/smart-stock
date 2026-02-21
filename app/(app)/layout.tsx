import { AppShell } from "@/components/AppShell";
import { TourMount } from "@/components/tour/TourMount";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <TourMount />
      {children}
    </AppShell>
  );
}
