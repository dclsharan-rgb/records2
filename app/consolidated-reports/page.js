"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import AppShell from "@/components/AppShell";
import LoadingState from "@/components/LoadingState";

export default function ConsolidatedReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState({ userId: "", from: "", to: "" });
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [savingRemarkIds, setSavingRemarkIds] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) return router.replace("/");
      const me = await meRes.json();
      if (!active) return;
      if (me.forcePasswordReset) return router.replace("/reset-password");
      if (me.role !== "admin") return router.replace("/dashboard");
      setUser(me);
      const [usersRes, schemaRes, recordsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/schema"),
        fetch("/api/records")
      ]);
      const usersJson = await usersRes.json();
      const schemaJson = await schemaRes.json();
      const recordsJson = await recordsRes.json();
      if (!active) return;
      setUsers(Array.isArray(usersJson) ? usersJson : []);
      setFields(schemaJson.fields || []);
      setRecords(Array.isArray(recordsJson) ? recordsJson : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const filteredRecords = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return records
      .filter((record) => {
        const created = new Date(record.createdAt);
        if (filter.userId && String(record.userId) !== String(filter.userId)) return false;
        if (filter.from && created < new Date(filter.from)) return false;
        if (filter.to) {
          const end = new Date(filter.to);
          end.setHours(23, 59, 59, 999);
          if (created > end) return false;
        }
        if (!search) return true;
        const textPool = [
          record.recordId || record.id,
          record.username,
          ...fields.map((field) => String(record.values?.[field.name] ?? ""))
        ]
          .join(" ")
          .toLowerCase();
        return textPool.includes(search);
      })
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? diff : -diff;
      });
  }, [records, filter, searchText, fields, sortOrder]);

  const allFilteredSelected =
    filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.includes(r.id));

  function toggleOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredRecords.some((r) => r.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredRecords.map((r) => r.id)])));
  }

  function downloadCurrent() {
    if (!user) return;
    const selectedSet = new Set(selectedIds);
    const rowsSource = selectedSet.size ? filteredRecords.filter((r) => selectedSet.has(r.id)) : filteredRecords;
    const rows = rowsSource.map((record) => {
      const row = { RecordId: record.recordId || record.id, Username: record.username, CreatedAt: record.createdAt };
      for (const field of fields) row[field.label || field.name] = record.values?.[field.name] ?? "";
      row.AdminRemark = record.adminRemark || "";
      return row;
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Records");
    const blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consolidated-records.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteRecord(id) {
    const ok = window.confirm("Delete this record?");
    if (!ok) return;
    const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  async function deleteAllRecords() {
    const ok = window.confirm("Delete ALL records? This cannot be undone.");
    if (!ok) return;
    const res = await fetch("/api/records", { method: "DELETE" });
    if (!res.ok) return;
    setRecords([]);
    setSelectedIds([]);
  }

  async function saveRemark(id) {
    const target = records.find((r) => r.id === id);
    if (!target) return;
    setSavingRemarkIds((prev) => [...prev, id]);
    const res = await fetch(`/api/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminRemark: target.adminRemark || "" })
    });
    setSavingRemarkIds((prev) => prev.filter((x) => x !== id));
    if (!res.ok) return;
  }

  function updateRemark(id, adminRemark) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, adminRemark } : r)));
  }

  if (loading || !user) return <LoadingState label="Loading consolidated reports..." />;

  return (
    <AppShell user={user} title="Consolidated Reports">
      <section className="card rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold text-orange-900">Consolidated Records</h2>
          <button className="btn-primary rounded-md px-3 py-2 text-sm text-white" onClick={downloadCurrent} type="button">
            Download {selectedIds.length > 0 ? "Selected" : "Filtered"}
          </button>
          <button className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700" onClick={deleteAllRecords} type="button">
            Delete All Records
          </button>
        </div>

        <details className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-orange-900">Filters</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <select className="input-orange rounded-md bg-white px-3 py-2 text-sm" value={filter.userId} onChange={(e) => setFilter((p) => ({ ...p, userId: e.target.value }))}>
              <option value="">All users</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.username}</option>)}
            </select>
            <input className="input-orange rounded-md bg-white px-3 py-2 text-sm" placeholder="Search" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <input className="input-orange rounded-md bg-white px-3 py-2 text-sm" type="date" value={filter.from} onChange={(e) => setFilter((p) => ({ ...p, from: e.target.value }))} />
            <input className="input-orange rounded-md bg-white px-3 py-2 text-sm" type="date" value={filter.to} onChange={(e) => setFilter((p) => ({ ...p, to: e.target.value }))} />
            <select className="input-orange rounded-md bg-white px-3 py-2 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </details>

        <div className="mb-3 md:hidden">
          <button className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900" onClick={toggleAllFiltered} type="button">
            {allFilteredSelected ? "Unselect Filtered" : "Select Filtered"}
          </button>
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-orange-200 md:block">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="bg-orange-700 text-orange-50">
              <tr>
                <th className="px-3 py-3 text-left"><input checked={allFilteredSelected} onChange={toggleAllFiltered} type="checkbox" /></th>
                <th className="px-3 py-3 text-left">Record ID</th>
                <th className="px-3 py-3 text-left">Created</th>
                <th className="px-3 py-3 text-left">User</th>
                {fields.map((f) => <th className="px-3 py-3 text-left" key={f.name}>{f.label}</th>)}
                <th className="px-3 py-3 text-left">Admin Remark</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, idx) => (
                <tr className={idx % 2 === 0 ? "bg-white" : "bg-orange-50"} key={record.id}>
                  <td className="px-3 py-2"><input checked={selectedIds.includes(record.id)} onChange={() => toggleOne(record.id)} type="checkbox" /></td>
                  <td className="px-3 py-2 font-mono text-xs">{record.recordId || record.id}</td>
                  <td className="px-3 py-2">{new Date(record.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{record.username}</td>
                  {fields.map((f) => <td className="px-3 py-2" key={`${record.id}_${f.name}`}>{String(record.values?.[f.name] ?? "")}</td>)}
                  <td className="px-3 py-2">
                    <textarea
                      className="input-orange min-h-16 w-56 rounded-md bg-white px-2 py-1 text-xs"
                      value={record.adminRemark || ""}
                      onChange={(e) => updateRemark(record.id, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded-md border border-orange-300 px-2 py-1 text-xs text-orange-900" onClick={() => saveRemark(record.id)} type="button">
                        {savingRemarkIds.includes(record.id) ? "Saving..." : "Save Remark"}
                      </button>
                      <button className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => deleteRecord(record.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredRecords.map((record) => (
            <article className="rounded-lg border border-orange-200 bg-white p-3" key={record.id}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-xs text-orange-900">{record.recordId || record.id}</p>
                <input checked={selectedIds.includes(record.id)} onChange={() => toggleOne(record.id)} type="checkbox" />
              </div>
              <p className="text-xs text-orange-800">{new Date(record.createdAt).toLocaleString()}</p>
              <p className="mt-1 text-sm text-orange-900">User: {record.username}</p>
              <div className="mt-2 space-y-1 text-sm">
                {fields.map((f) => (
                  <p key={`${record.id}_${f.name}`}>
                    <span className="font-medium text-orange-900">{f.label}: </span>
                    <span className="text-orange-800">{String(record.values?.[f.name] ?? "")}</span>
                  </p>
                ))}
              </div>
              <textarea
                className="input-orange mt-3 min-h-20 w-full rounded-md bg-orange-50 px-3 py-2 text-sm"
                placeholder="Admin remark"
                value={record.adminRemark || ""}
                onChange={(e) => updateRemark(record.id, e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button className="rounded-md border border-orange-300 px-3 py-1 text-xs text-orange-900" onClick={() => saveRemark(record.id)} type="button">
                  {savingRemarkIds.includes(record.id) ? "Saving..." : "Save Remark"}
                </button>
                <button className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700" onClick={() => deleteRecord(record.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {filteredRecords.length === 0 && <p className="text-sm text-orange-700">No records match current filters.</p>}
        </div>
      </section>
    </AppShell>
  );
}

