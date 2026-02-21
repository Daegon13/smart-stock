import { betaLogout } from "../login/actions";

export const dynamic = "force-dynamic";

export default function LogoutPage() {
  return (
    <form action={betaLogout} className="p-6">
      <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
        Cerrar sesión
      </button>
    </form>
  );
}
