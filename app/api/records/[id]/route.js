import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Record from "@/models/Record";

export const DELETE = withAuth(async (_request, user, context) => {
  await dbConnect();
  const id = context?.params?.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid record id" }, { status: 400 });
  }

  const query = user.role === "admin" ? { _id: id } : { _id: id, userId: user.id };
  const deleted = await Record.findOneAndDelete(query).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
});

export const PATCH = withAuth(async (request, user, context) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const id = context?.params?.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid record id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const adminRemark = String(body.adminRemark || "").slice(0, 2000);

  const updated = await Record.findByIdAndUpdate(id, { $set: { adminRemark } }, { new: true }).lean();
  if (!updated) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: String(updated._id),
    adminRemark: updated.adminRemark || ""
  });
});

