import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { signInAction } from "./actions";
import { isDevLoginBypassEnabled } from "@/lib/authFlags";

export const dynamic = "force-dynamic";

export default function SignInPage({ searchParams }: { searchParams?: { error?: string } }) {
  const bypass = isDevLoginBypassEnabled();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>{bypass ? "Login deshabilitado temporalmente en desarrollo." : "Acceso seguro para Smart Stock."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
            {bypass ? <p className="text-sm text-amber-700">AUTH_LOGIN_ENABLED=false (dev): podés entrar directo al panel sin autenticar.</p> : null}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {searchParams?.error ? <p className="text-sm text-rose-600">{searchParams.error}</p> : null}
          <p className="text-xs text-zinc-500">
            Seguridad: límite de intentos por email+IP (15 min) y sesiones persistidas en DB con soporte multi-dispositivo.
          </p>
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
