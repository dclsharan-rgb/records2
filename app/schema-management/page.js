"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingState from "@/components/LoadingState";

const emptyField = { name: "", label: "", type: "string", required: false };
const withUiKey = (field) => ({ ...field, uiKey: crypto.randomUUID() });

export default function SchemaManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [fields, setFields] = useState([]);
  const [message, setMessage] = useState("");

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
      const schemaRes = await fetch("/api/admin/schema");
      const schemaJson = await schemaRes.json();
      if (!active) return;
      setFields(Array.isArray(schemaJson.fields) ? schemaJson.fields.map(withUiKey) : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function saveSchema() {
    setMessage("");
    const res = await fetch("/api/admin/schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error || "Failed to save schema");
    setFields((json.fields || []).map(withUiKey));
    setMessage("Schema saved.");
  }

  function updateField(index, key, value) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  }

  if (loading || !user) return <LoadingState label="Loading schema management..." />;

  return (
    <AppShell user={user} title="Schema Management">
      <section className="card rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold text-orange-900">Input Configuration</h2>
          <button className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900" onClick={() => setFields((prev) => [...prev, withUiKey({ ...emptyField })])} type="button">
            Add Field
          </button>
          <button className="btn-primary rounded-md px-3 py-2 text-sm text-white" onClick={saveSchema} type="button">
            Save Schema
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div className="grid gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 md:grid-cols-5" key={field.uiKey}>
              <input className="input-orange rounded-md bg-white px-3 py-2" placeholder="name" value={field.name} onChange={(e) => updateField(index, "name", e.target.value)} />
              <input className="input-orange rounded-md bg-white px-3 py-2" placeholder="label" value={field.label} onChange={(e) => updateField(index, "label", e.target.value)} />
              <select className="input-orange rounded-md bg-white px-3 py-2" value={field.type} onChange={(e) => updateField(index, "type", e.target.value)}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="date">date</option>
              </select>
              <label className="flex items-center gap-2 rounded-md border border-orange-300 bg-white px-3 py-2 text-sm">
                <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(index, "required", e.target.checked)} />
                Required
              </label>
              <button className="rounded-md border border-red-300 px-3 py-2 text-red-700" onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))} type="button">
                Remove
              </button>
            </div>
          ))}
        </div>
        {message && <p className="mt-3 text-sm text-orange-800">{message}</p>}
      </section>
    </AppShell>
  );
}

