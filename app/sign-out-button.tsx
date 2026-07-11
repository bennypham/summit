"use client";

export function SignOutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const btnClass =
    variant === "sidebar"
      ? "w-full rounded-full border border-dark-border px-3 py-2 text-caption font-semibold text-dark-muted transition-colors hover:bg-dark-surface"
      : "rounded-full border border-border-strong bg-surface px-4 py-2 text-caption font-semibold text-body transition-colors hover:bg-wash";

  return (
    <button onClick={signOut} className={btnClass}>
      Sign out
    </button>
  );
}
