"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingState from "@/components/LoadingState";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok || !active) {
        setCheckingSession(false);
        return;
      }
      const user = await res.json();
      if (user.forcePasswordReset) {
        router.replace("/reset-password");
      } else {
        router.replace("/dashboard");
      }
      setCheckingSession(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const json = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setError(json.error || "Login failed");
        return;
      }

      router.push(json.forcePasswordReset ? "/reset-password" : "/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Unable to login right now. Please try again.");
    }
  }

  if (checkingSession) {
    return <LoadingState label="Checking session..." />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form className="card w-full max-w-md space-y-4 rounded-xl p-6" onSubmit={submit}>
        <div className="flex items-center gap-3">
          <Image alt="App logo" src="/logo.png" width={38} height={38} className="h-10 w-10 rounded-md" />
          <div>
            <h1 className="text-xl font-semibold text-orange-900 md:text-2xl">Records Management System</h1>
            <p className="text-sm text-orange-700">Sign in to continue</p>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-orange-900">Username</label>
          <input
            className="input-orange w-full rounded-md bg-orange-50 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-orange-900">Password</label>
          <input
            className="input-orange w-full rounded-md bg-orange-50 px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full rounded-md px-4 py-2 font-medium text-white disabled:opacity-70" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}

