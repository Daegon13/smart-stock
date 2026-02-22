import { AppShell } from "@/components/AppShell";
import { TourMount } from "@/components/tour/TourMount";
import { I18nProvider } from "@/components/i18n/I18nProvider";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppShell>
        <TourMount />
        {children}
      </AppShell>
    </I18nProvider>
  );
}
