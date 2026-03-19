"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, ScanSearch, LayoutDashboard, Settings, LogOut, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/tages-tracker", label: "Tages-Tracker", icon: Timer },
  { href: "/zeiterfassung", label: "Zeiterfassung", icon: Clock },
  { href: "/scan", label: "Scan-Abgleich", icon: ScanSearch },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-52 min-h-screen border-r border-sidebar-border relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse 200% 18% at 50% 0%, oklch(0.78 0.155 72 / 8%) 0%, transparent 65%), var(--color-sidebar)`,
        }}
        aria-label="Hauptnavigation"
      >
        {/* Logo */}
        <div className="px-5 pt-7 pb-5">
          <span
            className="block text-[2rem] leading-none text-sidebar-foreground tracking-tight select-none"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
          >
            Zeit
          </span>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-px flex-1 bg-gradient-to-r from-sidebar-primary/50 to-transparent" />
            <div className="w-1 h-1 rounded-full bg-sidebar-primary/70 shrink-0" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-1 space-y-0.5" aria-label="Seiten">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/45 hover:text-sidebar-foreground/75 hover:bg-white/[0.04]"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-full" />
                )}
                <Icon
                  className={cn("h-[15px] w-[15px] shrink-0", isActive && "opacity-90")}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2.5 py-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/30 hover:text-destructive hover:bg-destructive/10 w-full transition-all duration-150"
            aria-label="Abmelden"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-sidebar-border z-50 flex justify-around items-stretch"
        style={{ background: `var(--color-sidebar)` }}
        aria-label="Mobile Navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] transition-all duration-150 min-w-0",
                isActive
                  ? "text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/40"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-sidebar-primary rounded-full" />
              )}
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label.split("-")[0]}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] text-sidebar-foreground/30 transition-all duration-150 hover:text-destructive"
          aria-label="Abmelden"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
}
