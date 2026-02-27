"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingState from "@/components/LoadingState";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.replace("/");
        return;
      }
      const me = await res.json();
      if (!active) return;
      if (me.forcePasswordReset) {
        router.replace("/reset-password");
        return;
      }
      setUser(me);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading || !user) return <LoadingState label="Loading dashboard..." />;

  return (
    <AppShell user={user} title="Dashboard">
      <section className="card rounded-xl p-4">
        <h3 className="text-lg font-semibold text-orange-900">Quick Access</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <a className="rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900" href="/my-records">
            My Records
          </a>
          {user.role === "admin" && (
            <>
              <a className="rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900" href="/user-management">
                User Management
              </a>
              <a className="rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900" href="/schema-management">
                Schema Management
              </a>
              <a className="rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900" href="/consolidated-reports">
                Consolidated Reports
              </a>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}

