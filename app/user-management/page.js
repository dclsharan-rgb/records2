"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingState from "@/components/LoadingState";

export default function UserManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "Welcome@123", role: "user" });
  const [message, setMessage] = useState("");
  const [busyUserId, setBusyUserId] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = await meRes.json();
      if (!active) return;
      if (me.forcePasswordReset) return router.replace("/reset-password");
      if (me.role !== "admin") return router.replace("/dashboard");
      setUser(me);

      const usersRes = await fetch("/api/admin/users");
      const usersJson = await usersRes.json();
      if (!active) return;
      setUsers(Array.isArray(usersJson) ? usersJson : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function createUser(e) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser)
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error || "Failed to create user");
    setUsers((prev) => [json, ...prev]);
    setNewUser({ username: "", password: "Welcome@123", role: "user" });
    setMessage("User created.");
  }

  async function resetUserPassword(targetUser) {
    const suggested = "Welcome@123";
    const newPassword = window.prompt(`Set temporary password for ${targetUser.username}:`, suggested);
    if (!newPassword) return;
    setBusyUserId(targetUser._id);
    setMessage("");
    const res = await fetch(`/api/admin/users/${targetUser._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password", newPassword })
    });
    const json = await res.json();
    setBusyUserId("");
    if (!res.ok) return setMessage(json.error || "Failed to reset password");
    setUsers((prev) => prev.map((u) => (u._id === targetUser._id ? json.user : u)));
    setMessage(`Password reset for ${targetUser.username}. User must change it on next login.`);
  }

  async function deleteUser(targetUser) {
    const ok = window.confirm(`Delete user "${targetUser.username}" and all their records?`);
    if (!ok) return;
    setBusyUserId(targetUser._id);
    setMessage("");
    const res = await fetch(`/api/admin/users/${targetUser._id}`, { method: "DELETE" });
    const json = await res.json();
    setBusyUserId("");
    if (!res.ok) return setMessage(json.error || "Failed to delete user");
    setUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
    setMessage(`Deleted user ${targetUser.username}.`);
  }

  if (loading || !user) return <LoadingState label="Loading user management..." />;

  return (
    <AppShell user={user} title="User Management">
      <section className="card rounded-xl p-4">
        <h2 className="mb-4 text-lg font-semibold text-orange-900">Add User</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={createUser}>
          <input className="input-orange rounded-md bg-orange-50 px-3 py-2" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} required />
          <input className="input-orange rounded-md bg-orange-50 px-3 py-2" placeholder="Initial Password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required />
          <select className="input-orange rounded-md bg-orange-50 px-3 py-2" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary rounded-md px-4 py-2 text-white" type="submit">Create User</button>
        </form>
        {message && <p className="mt-3 text-sm text-orange-800">{message}</p>}
      </section>

      <section className="card mt-6 rounded-xl p-4">
        <h2 className="mb-4 text-lg font-semibold text-orange-900">Users</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((u) => (
            <article className="rounded-lg border border-orange-200 bg-orange-50 p-3" key={u._id}>
              <p className="text-base font-semibold text-orange-900">{u.username}</p>
              <p className="text-sm text-orange-800">Role: {u.role}</p>
              <p className="text-sm text-orange-800">Reset Required: {u.forcePasswordReset ? "Yes" : "No"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-orange-300 bg-white px-3 py-1 text-xs text-orange-900 disabled:opacity-60"
                  disabled={busyUserId === u._id}
                  onClick={() => resetUserPassword(u)}
                  type="button"
                >
                  {busyUserId === u._id ? "Please wait..." : "Reset Password"}
                </button>
                <button
                  className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs text-red-700 disabled:opacity-60"
                  disabled={busyUserId === u._id || u._id === user.id}
                  onClick={() => deleteUser(u)}
                  type="button"
                >
                  Delete User
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

