import { betaLogin } from "./actions";
import { isBetaGateMisconfiguredInProd } from "@/lib/betaGate";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string; misconfig?: string; next?: string };
}) {
  const showError = searchParams?.error === "1";
  const envMisconfigured = isBetaGateMisconfiguredInProd();
  const showMisconfig = searchParams?.misconfig === "1" || envMisconfigured;
  const nextRaw = searchParams?.next ?? "/dashboard";
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acceso</CardTitle>
          <CardDescription>
            {showMisconfig
              ? "Configuración incompleta en producción. Definí BETA_PASSWORD y BETA_SECRET para habilitar el acceso."
              : "Ingresá la clave de beta para entrar al panel."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={betaLogin} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <div className="space-y-1">
              <Label htmlFor="password">Clave</Label>
              <Input id="password" name="password" type="password" autoFocus placeholder="••••••••" disabled={showMisconfig} />
              {showError && (
                <p className="text-sm text-rose-600">Clave incorrecta.</p>
              )}
              {showMisconfig && (
                <p className="text-sm text-amber-700">Falta configurar BETA_PASSWORD/BETA_SECRET en producción.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={showMisconfig}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
