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
      ? "btn-ghost w-full border-dark-border text-dark-muted hover:border-dark-muted hover:bg-dark-surface"
      : "btn-ghost text-caption";

  return (
    <button onClick={signOut} className={btnClass}>
      Sign out
    </button>
  );
}
