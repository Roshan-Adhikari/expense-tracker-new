"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, CreditCard, Users, FolderKanban,
  Settings,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import NProgress from "nprogress";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Expenses", href: "/expenses", icon: CreditCard },
  { name: "Friends", href: "/friends", icon: Users },
  { name: "Groups", href: "/groups", icon: FolderKanban },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/expenses": "My Expenses",
  "/friends": "Friends",
  "/groups": "Groups",
};

/* ─── Desktop Sidebar ─── */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen glass border-r border-border/50 sticky top-0 left-0 p-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center justify-between px-2 py-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow shrink-0">
            <span className="text-white font-black text-xl">E</span>
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Expense Tracker
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={name}
              href={href}
              prefetch={true}
              onClick={() => { if (!active) NProgress.start(); }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                active
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                active ? "bg-primary/20" : "bg-transparent group-hover:bg-muted"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">{name}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-border/50">
        <UserMenu />
      </div>
    </aside>
  );
}

/* ─── Mobile Top Header ─── */
export function MobileHeader() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([key]) =>
    pathname === key || pathname.startsWith(`${key}/`)
  )?.[1] ?? "Expense Tracker";

  const isRoot = !Object.keys(pageTitles).some(k => pathname.startsWith(k));

  if (isRoot) return null; // Hide on landing/login pages

  return (
    <header className="md:hidden mobile-header sticky top-0 z-40 pt-safe">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Logo or page icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <h1 className="text-base font-bold tracking-tight">{title}</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu direction="down" />
        </div>
      </div>
    </header>
  );
}

/* ─── Mobile Bottom Navigation ─── */
export function BottomNav() {
  const pathname = usePathname();

  // Hide on non-app pages
  const isAppPage = Object.keys(pageTitles).some(k => pathname.startsWith(k));
  if (!isAppPage) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass pb-safe">
      <nav className="flex items-center h-16">
        {navItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={name}
              href={href}
              prefetch={true}
              onClick={() => { if (!active) NProgress.start(); }}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative"
            >
              {/* Active pill indicator */}
              {active && (
                <span className="absolute top-1.5 w-10 h-0.5 rounded-full bg-primary" />
              )}
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200",
                  active
                    ? "bg-primary/15 text-primary scale-110"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
