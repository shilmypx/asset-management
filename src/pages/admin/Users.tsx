import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthGate";
import { Plus, Database, CircleDot, Lock, Unlock, Info } from "lucide-react";
import { fetchUsers, toggleLock, createUserProfile, UserRow } from "../../lib/api/users";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { fetchEmployees } from "../../lib/api/employees";
import { Employee } from "../../lib/mockData";

export default function UsersAdmin() {
  const { can } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchUsers().then(setUsers);
  useEffect(() => {
    load();
    fetchEmployees().then(setEmployees);
  }, []);

  async function handleLockToggle(u: UserRow) {
    try {
      await toggleLock(u.id, !u.is_locked);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to update.");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUserProfile({ employee_id: employeeId, username, email });
      setEmployeeId(""); setUsername(""); setEmail(""); setShowAdd(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-slate-700">Users</h2>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured || !can("settings", "add")} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> Add user
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-4">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>Credentials are handled by Supabase Auth, not this screen. "Add user" creates the app-side profile (employee link, username, role) — sending the actual invite/password-setup email is a separate step via the Supabase dashboard or an Edge Function using the service role key, which can't run from the browser.</span>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Employee</label>
            <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Username</label>
            <input required value={username} onChange={(e) => setUsername(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Username</th>
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">Roles</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Last Login</th>
              <th className="px-5 py-3 font-medium text-right">Lock</th>
            </tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{u.username}<div className="text-xs text-slate-400 font-normal">{u.email}</div></td>
                <td className="px-5 py-3 text-slate-600">{u.employee_name ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{u.role_names.length ? u.role_names.join(", ") : <span className="text-slate-300">No role assigned</span>}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{u.status}</span>
                </td>
                <td className="px-5 py-3 text-slate-500">{u.last_login_at ?? "Never"}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleLockToggle(u)} disabled={!isSupabaseConfigured || !can("settings", "edit")} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                    {u.is_locked ? <Lock size={14} className="text-red-500" /> : <Unlock size={14} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
