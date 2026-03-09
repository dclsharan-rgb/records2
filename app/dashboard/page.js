"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingState from "@/components/LoadingState";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function DashboardPage() {
  const router = useRouter();
  const current = getCurrentMonthYear();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [rows, setRows] = useState([]);

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

    return () => { active = false };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    setTableLoading(true);
    setMessage("");

    (async () => {
      const res = await fetch(`/api/dashboard-status?month=${month}&year=${year}`);
      const json = await res.json();

      if (!active) return;

      setRows(Array.isArray(json.rows) ? json.rows : []);
      setTableLoading(false);
    })();

    return () => { active = false };
  }, [user, month, year]);

  function updateRow(index, key, value) {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [key]: value === "" ? "" : Number(value) }
          : row
      )
    );
  }

  async function saveStatus() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/dashboard-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, rows })
    });

    const json = await res.json();

    setSaving(false);

    if (!res.ok) {
      setMessage(json.error || "Failed to save dashboard status");
      return;
    }

    setRows(Array.isArray(json.rows) ? json.rows : []);
    setMessage("Dashboard status saved.");
  }

  // TOTAL CALCULATION
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.jd += Number(row.jd || 0);
        acc.schedule += Number(row.schedule || 0);
        acc.closures += Number(row.closures || 0);
        return acc;
      },
      { jd: 0, schedule: 0, closures: 0 }
    );
  }, [rows]);

  if (loading || !user) return <LoadingState label="Loading dashboard..." />;

  return (
    <AppShell user={user} title="Dashboard">

      <section className="card mt-6 rounded-xl p-4">

        <div className="mb-4 flex flex-wrap items-center gap-2">

          <h3 className="mr-auto text-lg font-semibold text-orange-900">
            Monthly Team Status
          </h3>

          <select
            className="input-orange rounded-md bg-orange-50 px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="input-orange rounded-md bg-orange-50 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[current.year - 1, current.year, current.year + 1, current.year + 2].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            )}
          </select>

          {user.role === "admin" && (
            <button
              className="btn-primary rounded-md px-3 py-2 text-sm text-white disabled:opacity-70"
              disabled={saving || tableLoading}
              onClick={saveStatus}
              type="button"
            >
              {saving ? "Saving..." : "Save Status"}
            </button>
          )}
        </div>

        {message && <p className="mb-4 text-sm text-orange-800">{message}</p>}

        {tableLoading ? (
          <LoadingState label="Loading monthly status..." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-orange-200">

            <table className="min-w-full text-sm">

              <thead className="bg-orange-700 text-orange-50">
                <tr>
                  <th className="px-3 py-3 text-left">People</th>
                  <th className="px-3 py-3 text-left">Total JDs Shared</th>
                  <th className="px-3 py-3 text-left">Total JDs Scheduled</th>
                  <th className="px-3 py-3 text-left">Total Closures</th>
                </tr>
              </thead>

              <tbody>

                {rows.map((row, index) => (
                  <tr
                    key={row.userId}
                    className={index % 2 === 0 ? "bg-white" : "bg-orange-50"}
                  >

                    <td className="px-3 py-2 font-medium text-orange-900">
                      {row.username}
                    </td>

                    {["jd","schedule","closures"].map((key) => (
                      <td className="px-3 py-2" key={key}>
                        {user.role === "admin" ? (
                          <input
                            className="input-orange w-28 rounded-md bg-white px-3 py-2"
                            min="0"
                            type="number"
                            value={row[key] ?? 0}
                            onChange={(e) =>
                              updateRow(index, key, e.target.value)
                            }
                          />
                        ) : (
                          <span className="text-orange-800">
                            {row[key] ?? 0}
                          </span>
                        )}
                      </td>
                    ))}

                  </tr>
                ))}

                <tr className="bg-orange-200 font-bold text-orange-900">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2">{totals.jd}</td>
                  <td className="px-3 py-2">{totals.schedule}</td>
                  <td className="px-3 py-2">{totals.closures}</td>
                </tr>

              </tbody>
            </table>

          </div>
        )}

      </section>

    </AppShell>
  );
}
