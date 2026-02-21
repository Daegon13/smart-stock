import { betaLogin } from "./actions";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const showError = searchParams?.error === "1";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acceso</CardTitle>
          <CardDescription>
            Ingresá la clave de beta para entrar al panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={betaLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">Clave</Label>
              <Input id="password" name="password" type="password" autoFocus placeholder="••••••••" />
              {showError && (
                <p className="text-sm text-rose-600">Clave incorrecta.</p>
              )}
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
