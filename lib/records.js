export function coerceValueByType(rawValue, type) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  if (type === "number") {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new Error("Invalid number value");
    }
    return parsed;
  }

  if (type === "boolean") {
    const normalized = String(rawValue).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    throw new Error("Boolean must be true or false");
  }

  if (type === "date") {
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date value");
    }
    return date.toISOString().slice(0, 10);
  }

  return String(rawValue);
}

export function normalizeRecordInput(schemaFields, payloadValues = {}) {
  const values = {};
  for (const field of schemaFields) {
    const rawValue = payloadValues[field.name];
    if (field.required && (rawValue === undefined || rawValue === null || rawValue === "")) {
      throw new Error(`Field "${field.label || field.name}" is required`);
    }
    values[field.name] = coerceValueByType(rawValue, field.type);
  }
  return values;
}

export function flattenRecordsForExcel(records, schemaFields, opts = {}) {
  const { includeAdminRemark = false } = opts;
  return records.map((record) => {
    const row = {
      RecordId: record.recordId || record.id || String(record._id || ""),
      Username: record.username,
      CreatedAt: record.createdAt
    };
    for (const field of schemaFields) {
      row[field.label || field.name] = record.values?.[field.name] ?? "";
    }
    if (includeAdminRemark) {
      row.AdminRemark = record.adminRemark || "";
    }
    return row;
  });
}
