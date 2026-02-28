"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import AppShell from "@/components/AppShell";
import DynamicRecordForm from "@/components/DynamicRecordForm";
import LoadingState from "@/components/LoadingState";

export default function MyRecordsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const filteredRecords = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return records
      .filter((record) => {
        const created = new Date(record.createdAt);
        if (fromDate && created < new Date(fromDate)) return false;
        if (toDate) {
          const end = new Date(toDate);
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
  }, [records, searchText, fromDate, toDate, sortOrder, fields]);

  useEffect(() => {
    let active = true;
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = await meRes.json();
      if (!active) return;
      if (me.forcePasswordReset) {
        router.replace("/reset-password");
        return;
      }
      setUser(me);

      const [schemaRes, recordRes] = await Promise.all([fetch("/api/admin/schema"), fetch("/api/records?scope=mine")]);
      const schemaJson = await schemaRes.json();
      const recordsJson = await recordRes.json();
      if (!active) return;
      setFields(schemaJson.fields || []);
      setRecords(Array.isArray(recordsJson) ? recordsJson : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

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
      if (user.role === "admin") {
        row.AdminRemark = record.adminRemark || "";
      }
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
    a.download = `${user.username}-records.xlsx`;
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

  if (loading || !user) return <LoadingState label="Loading my records..." />;

  return (
    <AppShell user={user} title="My Records">
      <section className="card rounded-xl p-4">
        <h2 className="mb-4 text-lg font-semibold text-orange-900">Add Record</h2>
        <DynamicRecordForm fields={fields} onSaved={(record) => setRecords((prev) => [record, ...prev])} />
      </section>

      <section className="card mt-6 rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold text-orange-900">My Records</h2>
          <button className="btn-primary rounded-md px-3 py-2 text-sm text-white" onClick={downloadCurrent} type="button">
            Download {selectedIds.length > 0 ? "Selected" : "Filtered"}
          </button>
        </div>
        <details className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-orange-900">Filters</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <input className="input-orange rounded-md bg-white px-3 py-2 text-sm" placeholder="Search" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <input className="input-orange rounded-md bg-white px-3 py-2 text-sm" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input className="input-orange rounded-md bg-white px-3 py-2 text-sm" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
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
          <table className="min-w-[860px] w-full text-sm">
            <thead className="bg-orange-700 text-orange-50">
              <tr>
                <th className="px-3 py-3 text-left"><input checked={allFilteredSelected} onChange={toggleAllFiltered} type="checkbox" /></th>
                <th className="px-3 py-3 text-left">Record ID</th>
                <th className="px-3 py-3 text-left">Created</th>
                {fields.map((f) => <th key={f.name} className="px-3 py-3 text-left">{f.label}</th>)}
                {user.role === "admin" && <th className="px-3 py-3 text-left">Admin Remark</th>}
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, idx) => (
                <tr className={idx % 2 === 0 ? "bg-white" : "bg-orange-50"} key={record.id}>
                  <td className="px-3 py-2"><input checked={selectedIds.includes(record.id)} onChange={() => toggleOne(record.id)} type="checkbox" /></td>
                  <td className="px-3 py-2 font-mono text-xs">{record.recordId || record.id}</td>
                  <td className="px-3 py-2">{new Date(record.createdAt).toLocaleString()}</td>
                  {fields.map((f) => <td className="px-3 py-2" key={`${record.id}_${f.name}`}>{String(record.values?.[f.name] ?? "")}</td>)}
                  {user.role === "admin" && <td className="px-3 py-2">{record.adminRemark || ""}</td>}
                  <td className="px-3 py-2">
                    <button className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => deleteRecord(record.id)} type="button">
                      Delete
                    </button>
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
              <div className="mt-2 space-y-1 text-sm">
                {fields.map((f) => (
                  <p key={`${record.id}_${f.name}`}>
                    <span className="font-medium text-orange-900">{f.label}: </span>
                    <span className="text-orange-800">{String(record.values?.[f.name] ?? "")}</span>
                  </p>
                ))}
                {user.role === "admin" && (
                  <p>
                    <span className="font-medium text-orange-900">Admin Remark: </span>
                    <span className="text-orange-800">{record.adminRemark || "-"}</span>
                  </p>
                )}
              </div>
              <button className="mt-3 rounded-md border border-red-300 px-3 py-1 text-xs text-red-700" onClick={() => deleteRecord(record.id)} type="button">
                Delete
              </button>
            </article>
          ))}
          {filteredRecords.length === 0 && <p className="text-sm text-orange-700">No records match current filters.</p>}
        </div>
      </section>
    </AppShell>
  );
}

