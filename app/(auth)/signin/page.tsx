import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { signInAction } from "./actions";

export const dynamic = "force-dynamic";

export default function SignInPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Acceso seguro para Smart Stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {searchParams?.error ? <p className="text-sm text-rose-600">{searchParams.error}</p> : null}
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
