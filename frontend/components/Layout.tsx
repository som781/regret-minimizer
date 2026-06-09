"use client";

import Link from "next/link";

type Page = "ask" | "timeline" | "insights" | "analytics";

const NAV: { label: string; href: string; page: Page }[] = [
  { label: "Ask", href: "/", page: "ask" },
  { label: "Timeline", href: "/timeline", page: "timeline" },
  { label: "Insights", href: "/insights", page: "insights" },
  { label: "Analytics", href: "/analytics", page: "analytics" },
];

interface Props {
  active: Page;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export default function Layout({ active, sidebar, children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <aside className="w-60 shrink-0 border-r border-[#1e1e1e] flex flex-col overflow-y-auto scrollbar-thin">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-[#1e1e1e]">
          <p className="text-sm font-semibold text-white tracking-tight font-mono">regret-minimizer</p>
          <p className="text-xs text-[#444] mt-0.5">your codebase remembers</p>
        </div>

        {/* Nav */}
        <nav className="px-3 py-3 space-y-0.5">
          {NAV.map(({ label, href, page }) => (
            <Link key={page} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active === page
                  ? "bg-white/5 text-white font-medium"
                  : "text-[#555] hover:text-[#ccc] hover:bg-white/[0.03]"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active === page ? "bg-white" : "bg-[#333]"}`} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sidebar slot */}
        {sidebar && (
          <div className="flex-1 px-3 py-2 border-t border-[#1e1e1e] mt-1 overflow-y-auto scrollbar-thin">
            {sidebar}
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
