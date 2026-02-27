"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function AppShell({ user, title, children }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl p-3 md:p-8">
      <div className="card mb-4 flex items-center gap-3 rounded-xl p-3">
        <Image alt="App logo" src="/logo.png" width={36} height={36} className="h-9 w-9 rounded-md" />
        <h1 className="text-base font-semibold text-orange-900 md:text-lg">Records Management System</h1>
      </div>
      <div className="card mb-6 rounded-xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-orange-900 md:text-2xl">{title}</h2>
            <p className="text-sm text-orange-700">
              Logged in as <span className="font-medium">{user.username}</span> ({user.role})
            </p>
          </div>
          <div className="relative">
            <button
              className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900"
              onClick={() => setMenuOpen((v) => !v)}
              type="button"
            >
              Menu
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-orange-200 bg-white p-2 shadow-lg">
                <a className="block rounded-md px-3 py-2 text-sm text-orange-900 hover:bg-orange-50" href="/dashboard">
                  Dashboard
                </a>
                <a className="block rounded-md px-3 py-2 text-sm text-orange-900 hover:bg-orange-50" href="/my-records">
                  My Records
                </a>
                {user.role === "admin" && (
                  <>
                    <a className="block rounded-md px-3 py-2 text-sm text-orange-900 hover:bg-orange-50" href="/user-management">
                      User Management
                    </a>
                    <a className="block rounded-md px-3 py-2 text-sm text-orange-900 hover:bg-orange-50" href="/schema-management">
                      Schema Management
                    </a>
                    <a className="block rounded-md px-3 py-2 text-sm text-orange-900 hover:bg-orange-50" href="/consolidated-reports">
                      Consolidated Reports
                    </a>
                  </>
                )}
                <button
                  className="mt-1 w-full rounded-md border border-orange-300 px-3 py-2 text-left text-sm text-orange-900 disabled:opacity-70"
                  onClick={logout}
                  type="button"
                  disabled={loggingOut}
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </main>
  );
}
