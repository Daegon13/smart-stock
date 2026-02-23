import { panelLogin } from "./actions";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string; next?: string };
}) {
  const err = searchParams?.error ?? "";
  const showError = err === "invalid" || err === "1";
  const setupError = err === "setup";
  const rateError = err === "rate";
  const nextRaw = searchParams?.next ?? "/today";
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/today";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acceso</CardTitle>
          <CardDescription>
            Ingresá con tu email y contraseña para entrar al panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={panelLogin} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoFocus placeholder="duenio@local.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" />
              {showError ? <p className="text-sm text-rose-600">No se pudo iniciar sesión con los datos ingresados.</p> : null}
              {rateError ? <p className="text-sm text-rose-600">Demasiados intentos. Esperá un minuto y volvé a intentar.</p> : null}
              {setupError ? <p className="text-sm text-rose-600">Falta configurar AUTH_EMAIL/AUTH_SECRET y AUTH_PASSWORD o AUTH_PASSWORD_HASH.</p> : null}
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
