import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { setAuthCookie, signToken, withAuth } from "@/lib/auth";
import User from "@/models/User";
import { dbConnect } from "@/lib/mongodb";

export const POST = withAuth(async (request, user) => {
  const body = await request.json().catch(() => ({}));
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await dbConnect();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(user.id, {
    passwordHash,
    forcePasswordReset: false
  });

  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
    forcePasswordReset: false
  });

  const response = NextResponse.json({ ok: true });
  setAuthCookie(response, token);
  return response;
});

