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
        (
          document.getElementById("activity-search") ??
          document.getElementById("activity-search-mobile")
        )?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 bg-paper">
      <aside className="hidden h-full w-60 shrink-0 flex-col gap-1.5 overflow-y-auto bg-ink px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-3 pt-1">
          <div className="h-7 w-7 shrink-0 rounded-[9px] bg-accent" />
          <span className="text-section-title text-surface">
            Summit
          </span>
        </div>

        {navItems.map(({ id, label, Icon, active }) => (
          <div
            key={id}
            className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-list-secondary ${
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
          <div className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-list-secondary font-semibold text-dark-nav">
            <IconSettings />
            Settings
          </div>
          <ConnectBankButton variant="sidebar" />
          <RefreshButton variant="sidebar" />
          <SignOutButton variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-col gap-3 px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-3 lg:items-center">
            <div className="min-w-0">
              {/* Local clock — suppressHydrationWarning: server/client timezones can differ. */}
              <h1
                className="text-[26px] font-extrabold leading-8 tracking-title text-ink"
                suppressHydrationWarning
              >
                {timeGreeting()}
              </h1>
              <p
                className="truncate text-list-secondary text-muted"
                suppressHydrationWarning
              >
                {headerDate()} · {headerSubtitle}
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-3 lg:flex">
              <SearchField
                id="activity-search"
                search={search}
                onSearchChange={onSearchChange}
                className="w-[260px]"
              />
              <HeaderIcons />
            </div>

            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <HeaderIcons />
            </div>
          </div>

          <div className="lg:hidden">
            <SearchField
              id="activity-search-mobile"
              search={search}
              onSearchChange={onSearchChange}
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2 lg:hidden">
            <ConnectBankButton />
            <RefreshButton />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-8 pt-2">
          {children}
        </main>
      </div>
    </div>
  );
}

function HeaderIcons() {
  return (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
        <span className="text-muted" aria-hidden>
          🔔
        </span>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[14px] font-bold text-surface">
        S
      </div>
    </>
  );
}

function SearchField({
  id,
  search,
  onSearchChange,
  className,
}: {
  id: string;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`search-pill-field flex items-center shrink-0 ${className ?? ""}`}>
      <SearchIcon />
      <input
        id={id}
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search transactions…"
        className="search-pill-input"
      />
    </label>
  );
}

function SearchIcon() {
  return (
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
  );
}
