import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import SchemaConfig from "@/models/SchemaConfig";
import { ensureBootstrapData } from "@/lib/bootstrap";

function normalizeFieldName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFields(fields = []) {
  const seen = new Set();
  const normalized = [];

  for (const field of fields) {
    const type = ["string", "number", "boolean", "date"].includes(field.type) ? field.type : null;
    const label = String(field.label || "").trim();
    const name = normalizeFieldName(field.name || label);

    if (!name || !label || !type || seen.has(name)) {
      continue;
    }

    seen.add(name);
    normalized.push({
      name,
      label,
      type,
      required: !!field.required
    });
  }

  return normalized;
}

export const GET = withAuth(async () => {
  await ensureBootstrapData();
  await dbConnect();
  const config = await SchemaConfig.findOne({ key: "default" }).lean();
  return NextResponse.json({ fields: config?.fields || [] });
});

export const POST = withAuth(async (request, user) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const fields = normalizeFields(Array.isArray(body.fields) ? body.fields : []);

  if (fields.length === 0) {
    return NextResponse.json({ error: "At least one valid field is required" }, { status: 400 });
  }

  await dbConnect();
  const saved = await SchemaConfig.findOneAndUpdate(
    { key: "default" },
    { $set: { fields } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ fields: saved.fields });
});

