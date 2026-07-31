import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthGate";
import { Plus, Database, CircleDot } from "lucide-react";
import { fetchRoles, fetchPermissions, fetchGrantedPermissionIds, setPermission, createRole, Role, Permission } from "../../lib/api/rbac";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  hardware_assets: "Hardware Assets",
  software_licenses: "Software Licenses",
  incidents: "Incidents",
  reports: "Reports",
  settings: "Settings",
  procurement: "Procurement",
  network: "Network Components",
  repairs: "Repair & Maintenance",
  contracts: "Contracts & Warranty",
  inventory_audit: "Inventory Audit",
  requests: "Self-Service Requests",
  automation_rules: "Automation Rules",
};
const ACTION_ORDER = ["view", "add", "edit", "delete", "approve", "export", "print", "import"];

export default function RolesAdmin() {
  const { can } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions().then(setPermissions);
    fetchRoles().then((rs) => {
      setRoles(rs);
      if (rs.length) setSelectedRole(rs[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedRole) fetchGrantedPermissionIds(selectedRole.id).then(setGranted);
  }, [selectedRole]);

  const modules = Array.from(new Set(permissions.map((p) => p.module)));
  const byModuleAction: Record<string, Permission> = {};
  permissions.forEach((p) => (byModuleAction[`${p.module}:${p.action}`] = p));

  async function toggle(module: string, action: string) {
    if (!selectedRole || !isSupabaseConfigured) return;
    const perm = byModuleAction[`${module}:${action}`];
    if (!perm) return;
    const isGranted = granted.has(perm.id);
    const next = new Set(granted);
    isGranted ? next.delete(perm.id) : next.add(perm.id);
    setGranted(next); // optimistic
    try {
      await setPermission(selectedRole.id, perm.id, !isGranted);
    } catch (err: any) {
      setGranted(granted); // revert
      setError(err.message ?? "Failed to update permission.");
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const role = await createRole(newName, "");
      setNewName(""); setShowAdd(false);
      setRoles((r) => [...r, role]);
      setSelectedRole(role);
    } catch (err: any) {
      setError(err.message ?? "Failed to create role.");
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedRole?.id ?? ""}
            onChange={(e) => setSelectedRole(roles.find((r) => r.id === e.target.value) ?? null)}
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5"
          >
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured || !can("settings", "add")} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> Create role
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreateRole} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Role name</label>
            <input required value={newName} onChange={(e) => setNewName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
        <table className="text-sm border-collapse min-w-[720px] w-full">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-xs text-slate-400 font-medium">Module</th>
              {ACTION_ORDER.map((a) => (
                <th key={a} className="px-2 py-2 text-xs text-slate-400 font-medium capitalize">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m, i) => (
              <tr key={m} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                <td className="px-3 py-2 font-medium text-slate-700">{MODULE_LABELS[m] ?? m}</td>
                {ACTION_ORDER.map((a) => {
                  const perm = byModuleAction[`${m}:${a}`];
                  const checked = perm ? granted.has(perm.id) : false;
                  return (
                    <td key={a} className="px-2 py-2 text-center">
                      {perm && (
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!isSupabaseConfigured || !can("settings", "edit")}
                          onChange={() => toggle(m, a)}
                          aria-label={`${m} ${a}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-3">Changes apply immediately to everyone assigned this role.</p>
      </div>
    </div>
  );
}
