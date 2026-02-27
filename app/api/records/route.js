import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Record from "@/models/Record";
import SchemaConfig from "@/models/SchemaConfig";
import { normalizeRecordInput } from "@/lib/records";

export const GET = withAuth(async (request, user) => {
  await dbConnect();

  const scope = new URL(request.url).searchParams.get("scope") || "";
  const shouldForceMine = scope === "mine";
  const query = shouldForceMine || user.role !== "admin" ? { userId: user.id } : {};
  const records = await Record.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json(
    records.map((record) => ({
      id: String(record._id),
      recordId: record.recordId || String(record._id),
      userId: String(record.userId),
      username: record.username,
      createdAt: record.createdAt,
      values: record.values || {}
    }))
  );
});

export const POST = withAuth(async (request, user) => {
  const body = await request.json().catch(() => ({}));
  await dbConnect();

  const config = await SchemaConfig.findOne({ key: "default" }).lean();
  const fields = config?.fields || [];
  if (fields.length === 0) {
    return NextResponse.json({ error: "Schema is not configured" }, { status: 400 });
  }

  let values;
  try {
    values = normalizeRecordInput(fields, body.values || {});
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const created = await Record.create({
    userId: user.id,
    username: user.username,
    values
  });

  return NextResponse.json({
    id: String(created._id),
    recordId: created.recordId || String(created._id),
    userId: String(created.userId),
    username: created.username,
    createdAt: created.createdAt,
    values: created.values
  });
});
