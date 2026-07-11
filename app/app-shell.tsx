"use client";

import { ReactNode, useEffect } from "react";
import { ConnectBankButton } from "./connect-bank-button";
import { RefreshButton } from "./refresh-button";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = {
  children: ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", active: true },
  { id: "accounts", label: "Accounts", active: false },
  { id: "budgets", label: "Budgets", active: false },
];

export function AppShell({ children, search, onSearchChange }: AppShellProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("activity-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-full bg-paper">
      <aside className="hidden w-[210px] shrink-0 flex-col gap-1.5 bg-ink px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-3 pt-1">
          <div className="h-7 w-7 shrink-0 rounded-[9px] bg-accent shadow-accent" />
          <span className="text-body font-extrabold text-surface">Summit</span>
        </div>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-caption ${
              item.active
                ? "bg-accent font-bold text-surface shadow-accent"
                : "font-semibold text-dark-nav"
            }`}
          >
            {item.label}
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-2 px-2 pb-1 pt-4">
          <ConnectBankButton variant="sidebar" />
          <RefreshButton variant="sidebar" />
          <SignOutButton variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 shadow-sm">
          <h1 className="text-body font-extrabold text-ink">Dashboard</h1>
          <div className="flex items-center gap-3">
            <label className="relative hidden w-[260px] sm:block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                ⌕
              </span>
              <input
                id="activity-search"
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search transactions…"
                className="w-full rounded-xl border-[1.5px] border-border-strong bg-field py-2 pl-9 pr-16 text-caption font-regular text-ink outline-none placeholder:text-muted focus:border-accent"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-border bg-wash px-2 py-0.5 font-mono text-xs text-muted">
                ⌘K
              </span>
            </label>
            <div className="flex items-center gap-2 md:hidden">
              <ConnectBankButton />
              <RefreshButton />
            </div>
          </div>
        </header>

        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
