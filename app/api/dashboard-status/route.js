import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import DashboardMonthlyStatus from "@/models/DashboardMonthlyStatus";
import User from "@/models/User";

function normalizeMonthYear(searchParams) {
  const now = new Date();
  const month = Number(searchParams.get("month") || now.getMonth() + 1);
  const year = Number(searchParams.get("year") || now.getFullYear());
  return {
    month: Math.min(12, Math.max(1, month)),
    year: Number.isFinite(year) ? year : now.getFullYear()
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function buildRows(existingRows = []) {
  const users = await User.find({}, { username: 1 }).sort({ username: 1 }).lean();
  const existingByUser = new Map(existingRows.map((row) => [String(row.userId), row]));

  return users.map((user) => {
    const found = existingByUser.get(String(user._id));
    return {
      userId: String(user._id),
      username: user.username,
      schedule: found ? toNumber(found.schedule) : 0,
      jd: found ? toNumber(found.jd) : 0,
      closures: found ? toNumber(found.closures) : 0
    };
  });
}

export const GET = withAuth(async (request) => {
  await dbConnect();
  const url = new URL(request.url);
  const { month, year } = normalizeMonthYear(url.searchParams);

  const doc = await DashboardMonthlyStatus.findOne({ month, year }).lean();
  const rows = await buildRows(doc?.rows || []);

  return NextResponse.json({ month, year, rows });
});

export const POST = withAuth(async (request, user) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const body = await request.json().catch(() => ({}));
  const month = Math.min(12, Math.max(1, Number(body.month)));
  const year = Number(body.year);
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!Number.isFinite(month) || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Valid month and year are required" }, { status: 400 });
  }

  const validRows = rows
    .filter((row) => mongoose.Types.ObjectId.isValid(row.userId))
    .map((row) => ({
      userId: row.userId,
      username: String(row.username || "").trim(),
      schedule: toNumber(row.schedule),
      jd: toNumber(row.jd),
      closures: toNumber(row.closures)
    }));

  const saved = await DashboardMonthlyStatus.findOneAndUpdate(
    { month, year },
    { $set: { month, year, rows: validRows } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    month: saved.month,
    year: saved.year,
    rows: saved.rows.map((row) => ({
      userId: String(row.userId),
      username: row.username,
      schedule: toNumber(row.schedule),
      jd: toNumber(row.jd),
      closures: toNumber(row.closures)
    }))
  });
});
