import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { setAuthCookie, signToken } from "@/lib/auth";
import { ensureBootstrapData } from "@/lib/bootstrap";
import User from "@/models/User";
import { dbConnect } from "@/lib/mongodb";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    await ensureBootstrapData();
    await dbConnect();

    const safeUsername = escapeRegex(username);
    const user = await User.findOne({ username: new RegExp(`^${safeUsername}$`, "i") });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      id: String(user._id),
      username: user.username,
      role: user.role,
      forcePasswordReset: !!user.forcePasswordReset
    });

    const response = NextResponse.json({
      id: String(user._id),
      username: user.username,
      role: user.role,
      forcePasswordReset: !!user.forcePasswordReset
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Login failed: ${error?.message || "Unknown server error"}`
        : "Login failed due to server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
