import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Productos" }
];

export function AppNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <Link href="/dashboard" className="font-semibold text-slate-900">
          Stock Inteligente
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
        <div className="ml-auto text-xs text-slate-500">MVP</div>
      </div>
    </header>
  );
}
