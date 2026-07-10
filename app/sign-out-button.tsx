"use client";

export function SignOutButton() {
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={signOut}
      className="w-full rounded-full border border-[#3d4454] px-3 py-2 text-sm text-[#c5cad4] transition-colors hover:bg-[#252932]"
    >
      Sign out
    </button>
  );
}
