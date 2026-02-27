import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export const GET = withAuth(async () => {
  await dbConnect();
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(users.map((u) => ({ ...u, _id: String(u._id) })));
}, { role: "admin" });

export const POST = withAuth(async (request) => {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const role = body.role === "admin" ? "admin" : "user";
  const password = String(body.password || "Welcome@123");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  await dbConnect();
  const exists = await User.findOne({ username: new RegExp(`^${username}$`, "i") });
  if (exists) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await User.create({
    username,
    passwordHash,
    role,
    forcePasswordReset: true
  });

  return NextResponse.json({
    _id: String(created._id),
    username: created.username,
    role: created.role,
    forcePasswordReset: created.forcePasswordReset
  });
}, { role: "admin" });

