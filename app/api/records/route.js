import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Record from "@/models/Record";
import SchemaConfig from "@/models/SchemaConfig";
import { normalizeRecordInput } from "@/lib/records";
import mongoose from "mongoose";

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
      values: record.values || {},
      ...(user.role === "admin" ? { adminRemark: record.adminRemark || "" } : {})
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
    values: created.values,
    ...(user.role === "admin" ? { adminRemark: created.adminRemark || "" } : {})
  });
});

export const DELETE = withAuth(async (request, user) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : null;

  if (ids && ids.length > 0) {
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const result = await Record.deleteMany({ _id: { $in: objectIds } });
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount || 0 });
  }

  const result = await Record.deleteMany({});
  return NextResponse.json({ ok: true, deletedCount: result.deletedCount || 0 });
});
