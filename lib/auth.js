import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const TOKEN_NAME = "records_token";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "8h" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

export function withAuth(handler, opts = {}) {
  const { role } = opts;
  return async function authedHandler(request, ...rest) {
    const token = request.cookies.get(TOKEN_NAME)?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role && user.role !== role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, user, ...rest);
  };
}

export function clearAuthCookie(response) {
  response.cookies.set(TOKEN_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

export function setAuthCookie(response, token) {
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
}

