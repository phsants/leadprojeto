"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Assistente IA" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/scoring-rules", label: "Pesos" },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export default function PanelNav({ nome, papel }: { nome: string; papel: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-ink-900">Qualifica Leads</span>
            </div>
            {/* Navegação inline (telas médias/grandes) */}
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLinks pathname={pathname} />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink-800">{nome}</p>
              <p className="text-xs capitalize text-ink-400">{papel}</p>
            </div>
            <button onClick={logout} className="btn-ghost px-3 py-1.5 text-xs">
              Sair
            </button>
          </div>
        </div>
        {/* Navegação em faixa rolável (somente no celular) */}
        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto pb-2 sm:hidden">
          <NavLinks pathname={pathname} />
        </nav>
      </div>
    </header>
  );
}
