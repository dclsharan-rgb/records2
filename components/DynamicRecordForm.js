"use client";

import { useMemo, useState } from "react";

export default function DynamicRecordForm({ fields, onSaved }) {
  const initialValues = useMemo(() => {
    const values = {};
    for (const field of fields) {
      values[field.name] = "";
    }
    return values;
  }, [fields]);

  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateValue(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values })
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error || "Failed to save record");
      return;
    }

    setValues(initialValues);
    onSaved?.(json);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {fields.map((field) => (
        <div key={field.name}>
          <label className="mb-1 block text-sm font-medium text-orange-900">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          <input
            className="input-orange w-full rounded-md bg-orange-50 px-3 py-2"
            type={field.type === "date" ? "date" : "text"}
            placeholder={field.type === "boolean" ? "true or false" : ""}
            required={field.required}
            value={values[field.name] ?? ""}
            onChange={(e) => updateValue(field.name, e.target.value)}
          />
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        className="btn-primary rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving..." : "Save Record"}
      </button>
    </form>
  );
}
