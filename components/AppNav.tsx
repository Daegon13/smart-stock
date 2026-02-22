import Link from "next/link";

const nav = [
  { href: "/today", label: "Hoy" },
  { href: "/import", label: "Importar ventas" }
];

export function AppNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <Link href="/dashboard" className="font-semibold text-slate-900">
          Reposición
        </Link>
        <nav className="flex items-center gap-4">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        {process.env.NODE_ENV !== "production" ? <div className="ml-auto text-xs text-slate-500">Beta</div> : null}
      </div>
    </header>
  );
}
