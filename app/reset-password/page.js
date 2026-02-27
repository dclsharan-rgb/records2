"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingState from "@/components/LoadingState";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok && active) {
        router.replace("/");
        return;
      }
      if (!active) return;
      const user = await res.json();
      if (!user.forcePasswordReset) {
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

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword })
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "Could not reset password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (checkingSession) {
    return <LoadingState label="Preparing reset password..." />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form className="card w-full max-w-md space-y-4 rounded-xl p-6" onSubmit={submit}>
        <div className="flex items-center gap-3">
          <Image alt="App logo" src="/logo.png" width={36} height={36} className="h-9 w-9 rounded-md" />
          <h1 className="text-xl font-semibold text-orange-900">Records Management System</h1>
        </div>
        <h2 className="text-lg font-semibold text-orange-900">Reset Password</h2>
        <p className="text-sm text-orange-700">You must reset your password on first login.</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-orange-900">New Password</label>
          <input
            className="input-orange w-full rounded-md bg-orange-50 px-3 py-2"
            type="password"
            value={newPassword}
            minLength={8}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full rounded-md px-4 py-2 font-medium text-white disabled:opacity-70" disabled={loading} type="submit">
          {loading ? "Saving..." : "Save Password"}
        </button>
      </form>
    </main>
  );
}

