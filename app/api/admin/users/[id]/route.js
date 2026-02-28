import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Record from "@/models/Record";

export const DELETE = withAuth(async (_request, sessionUser, context) => {
  await dbConnect();
  const id = context?.params?.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (String(sessionUser.id) === String(id)) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const deletedUser = await User.findByIdAndDelete(id).lean();
  if (!deletedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await Record.deleteMany({ userId: id });
  return NextResponse.json({ ok: true, id });
}, { role: "admin" });

export const PATCH = withAuth(async (request, _sessionUser, context) => {
  await dbConnect();
  const id = context?.params?.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  if (action !== "reset_password") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const newPassword = String(body.newPassword || "Welcome@123");
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await User.findByIdAndUpdate(
    id,
    { $set: { passwordHash, forcePasswordReset: true } },
    { new: true, projection: { passwordHash: 0 } }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: { ...updated, _id: String(updated._id) } });
}, { role: "admin" });

