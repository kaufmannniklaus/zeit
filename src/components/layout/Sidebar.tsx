"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, ScanSearch, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/zeiterfassung", label: "Zeiterfassung", icon: Clock },
  { href: "/scan", label: "Scan-Abgleich", icon: ScanSearch },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  // Auf der Login-Seite keine Sidebar anzeigen
  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 min-h-screen bg-card border-r"
        aria-label="Hauptnavigation"
      >
        <div className="px-6 py-5 border-b">
          <span className="text-xl font-bold tracking-tight">Zeit</span>
        </div>
        <nav className="flex-1 p-3 space-y-1" aria-label="Seiten">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
            aria-label="Abmelden"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex justify-around py-2"
        aria-label="Mobile Navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
              pathname.startsWith(href)
                ? "text-primary font-medium"
                : "text-muted-foreground"
            )}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
          >
            <Icon className="h-5 w-5" />
            <span>{label.split("-")[0]}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground transition-colors"
          aria-label="Abmelden"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
}
