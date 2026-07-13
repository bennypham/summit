"use client";

import { ReactNode, useEffect } from "react";
import { ConnectBankButton } from "./connect-bank-button";
import {
  IconAccounts,
  IconBudgets,
  IconDashboard,
  IconReports,
  IconSettings,
} from "./nav-icons";
import { RefreshButton } from "./refresh-button";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = {
  children: ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
  headerSubtitle: string;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", Icon: IconDashboard, active: true },
  { id: "accounts", label: "Accounts", Icon: IconAccounts, active: false },
  { id: "budgets", label: "Budgets", Icon: IconBudgets, active: false },
  { id: "reports", label: "Reports", Icon: IconReports, active: false },
] as const;

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function AppShell({
  children,
  search,
  onSearchChange,
  headerSubtitle,
}: AppShellProps) {
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
      <aside className="hidden w-60 shrink-0 flex-col gap-1.5 bg-ink px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-3 pt-1">
          <div className="h-7 w-7 shrink-0 rounded-[9px] bg-accent" />
          <span className="text-[17px] font-extrabold leading-[22px] text-surface">
            Summit
          </span>
        </div>

        {navItems.map(({ id, label, Icon, active }) => (
          <div
            key={id}
            className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14px] ${
              active
                ? "bg-accent font-bold text-surface"
                : "font-semibold text-dark-nav"
            }`}
          >
            <Icon active={active} />
            {label}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-1.5 pt-4">
          <div className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14px] font-semibold text-dark-nav">
            <IconSettings />
            Settings
          </div>
          <ConnectBankButton variant="sidebar" />
          <RefreshButton variant="sidebar" />
          <SignOutButton variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-5 pb-5 pt-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[26px] font-extrabold leading-8 tracking-title text-ink">
              {timeGreeting()}
            </h1>
            <p className="text-[14px] font-medium text-muted">
              {headerDate()} · {headerSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="search-pill-field hidden sm:flex">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                className="shrink-0 text-muted"
                aria-hidden
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="20"
                  y1="20"
                  x2="16.5"
                  y2="16.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                id="activity-search"
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search transactions…"
                className="search-pill-input"
              />
            </label>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
              <span className="text-muted" aria-hidden>
                🔔
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[14px] font-bold text-surface">
              S
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <ConnectBankButton />
              <RefreshButton />
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 px-5 pb-8 pt-2">{children}</main>
      </div>
    </div>
  );
}
