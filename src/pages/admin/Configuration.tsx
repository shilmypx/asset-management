import React, { useEffect, useState } from "react";
import { Database, CircleDot, Save, Info, Printer, Mail, CheckSquare, Plug, ListChecks } from "lucide-react";
import {
  fetchHrSyncSettings, saveHrSyncSettings, HrSyncSettings,
  fetchLabelSettings, saveLabelSettings, LabelPrintSettings,
  fetchNotificationRoutes, updateNotificationRoute, NotificationRoute,
  fetchApprovalRules, updateApprovalRule, ApprovalRule,
} from "../../lib/api/configuration";
import { fetchRoles, Role } from "../../lib/api/rbac";
import { fetchUsers, UserRow } from "../../lib/api/users";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

type Tab = "integrations" | "barcode" | "notifications" | "approvals" | "master_data";

const EVENT_LABELS: Record<string, string> = {
  renewal: "Subscription/license renewal", warranty_expiry: "Warranty expiry", maintenance_due: "Maintenance due",
  repair_delays: "Repair delays", assignment: "Asset assignment", return: "Asset return",
  approval_requests: "Approval requests", audit_due: "Audit due", contract_expiry: "Contract expiry",
  low_license_availability: "Low license availability",
};
const REQUEST_TYPE_LABELS: Record<string, string> = {
  purchase_order: "Purchase Orders", self_service_request: "Self-Service Requests",
  asset_disposal: "Asset Disposal", change_request: "Change Requests",
};

function LiveBadge() {
  return isSupabaseConfigured ? (
    <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
  );
}

function IntegrationsTab() {
  const [settings, setSettings] = useState<HrSyncSettings | null>(null);
  const [mode, setMode] = useState<"manual" | "api">("manual");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [frequency, setFrequency] = useState("manual");
  const [active, setActive] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHrSyncSettings().then((s) => {
      setSettings(s); setMode(s.mode); setEndpoint(s.api_endpoint ?? ""); setFrequency(s.sync_frequency); setActive(s.is_active);
    });
  }, []);

  async function handleSave() {
    setError(null);
    try {
      await saveHrSyncSettings({ id: settings?.id ?? "", mode, api_endpoint: endpoint || null, api_key: apiKey || null, sync_frequency: frequency, is_active: active });
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await fetchHrSyncSettings().then(setSettings);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-xl">
      <div className="flex items-center gap-2 mb-1"><Plug size={15} className="text-slate-400" /><span className="text-sm font-medium text-slate-800">Employee information sync (HR system)</span></div>
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 my-3">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>Employees are entered manually today (see Employee Management → Bulk Import). This screen lets you switch to automatic API sync once your HR system integration is ready — nothing changes until you flip the mode below.</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Sync mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
            <option value="manual">Manual entry / bulk import (current)</option>
            <option value="api">API sync with HR system</option>
          </select>
        </div>
        {mode === "api" && (
          <>
            <div>
              <label className="text-xs text-slate-500 block mb-1">API endpoint</label>
              <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://hr.karawa.qa/api/v1/employees" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">API key {settings?.has_api_key && <span className="text-slate-400">(already set — leave blank to keep it)</span>}</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings?.has_api_key ? "••••••••" : "Enter API key"} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Sync frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                <option value="manual">Manual trigger only</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Enable sync
            </label>
            {settings?.last_synced_at && <div className="text-xs text-slate-400">Last synced: {new Date(settings.last_synced_at).toLocaleString()}</div>}
          </>
        )}
        <button onClick={handleSave} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Save size={14} /> Save
        </button>
        {saved && <span className="text-xs text-emerald-600 ml-2">Saved.</span>}
        {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
}

function BarcodeTab() {
  const [s, setS] = useState<LabelPrintSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchLabelSettings().then(setS); }, []);

  function update<K extends keyof LabelPrintSettings>(key: K, value: LabelPrintSettings[K]) {
    if (s) setS({ ...s, [key]: value });
  }

  async function handleSave() {
    if (!s) return;
    setError(null);
    try {
      await saveLabelSettings(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  if (!s) return <div className="text-sm text-slate-400">Loading…</div>;
  const labelsPerPage = s.labels_per_row * s.labels_per_column;
  const usedWidth = s.labels_per_row * s.label_width_mm + (s.labels_per_row - 1) * s.horizontal_spacing_mm + s.margin_left_mm * 2;
  const overflow = usedWidth > s.page_width_mm;

  const Field = ({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit?: string }) => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}{unit ? ` (${unit})` : ""}</label>
      <input type="number" step="0.1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4"><Printer size={15} className="text-slate-400" /><span className="text-sm font-medium text-slate-800">Barcode / QR label printing</span></div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Printer</label>
            <input value={s.printer_name ?? ""} onChange={(e) => update("printer_name", e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Default barcode format</label>
            <select value={s.barcode_format} onChange={(e) => update("barcode_format", e.target.value as any)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              <option value="code128">Code128 (barcode)</option>
              <option value="qr">QR code</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Page</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Field label="Page width" unit="mm" value={s.page_width_mm} onChange={(v) => update("page_width_mm", v)} />
          <Field label="Page height" unit="mm" value={s.page_height_mm} onChange={(v) => update("page_height_mm", v)} />
          <Field label="Top margin" unit="mm" value={s.margin_top_mm} onChange={(v) => update("margin_top_mm", v)} />
          <Field label="Left margin" unit="mm" value={s.margin_left_mm} onChange={(v) => update("margin_left_mm", v)} />
        </div>

        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Label grid</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Field label="Labels per row" value={s.labels_per_row} onChange={(v) => update("labels_per_row", v)} />
          <Field label="Labels per column" value={s.labels_per_column} onChange={(v) => update("labels_per_column", v)} />
          <Field label="Horizontal spacing" unit="mm" value={s.horizontal_spacing_mm} onChange={(v) => update("horizontal_spacing_mm", v)} />
          <Field label="Vertical spacing" unit="mm" value={s.vertical_spacing_mm} onChange={(v) => update("vertical_spacing_mm", v)} />
        </div>

        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Label size & text</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Field label="Label width" unit="mm" value={s.label_width_mm} onChange={(v) => update("label_width_mm", v)} />
          <Field label="Label height" unit="mm" value={s.label_height_mm} onChange={(v) => update("label_height_mm", v)} />
          <Field label="Font size" unit="pt" value={s.font_size_pt} onChange={(v) => update("font_size_pt", v)} />
          <div>
            <label className="text-xs text-slate-500 block mb-1">Font family</label>
            <select value={s.font_family} onChange={(e) => update("font_family", e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              <option value="sans-serif">Sans-serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
        </div>

        <button onClick={handleSave} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Save size={14} /> Save
        </button>
        {saved && <span className="text-xs text-emerald-600 ml-2">Saved.</span>}
        {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 h-fit">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Computed layout</div>
        <div className="text-sm text-slate-700 space-y-1.5">
          <div className="flex justify-between"><span className="text-slate-400">Labels per page</span><span className="font-medium">{labelsPerPage}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Grid width used</span><span className={overflow ? "text-red-500 font-medium" : "font-medium"}>{usedWidth.toFixed(1)} mm</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Page width</span><span>{s.page_width_mm} mm</span></div>
        </div>
        {overflow && <div className="text-xs text-red-500 mt-3">Grid is wider than the page — reduce labels per row, label width, or spacing.</div>}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [routes, setRoutes] = useState<NotificationRoute[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchNotificationRoutes().then(setRoutes);
  useEffect(() => { load(); fetchRoles().then(setRoles); }, []);

  async function handleChange(r: NotificationRoute, changes: Partial<NotificationRoute>) {
    setError(null);
    try {
      await updateNotificationRoute(r.id, changes);
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to update."); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
          <th className="px-4 py-2.5">Event</th><th className="px-4 py-2.5">Recipient type</th><th className="px-4 py-2.5">Recipient</th><th className="px-4 py-2.5">Channel</th><th className="px-4 py-2.5">Active</th>
        </tr></thead>
        <tbody>
          {routes === null && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
          {routes?.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-2.5 font-medium text-slate-700">{EVENT_LABELS[r.event_type] ?? r.event_type}</td>
              <td className="px-4 py-2.5">
                <select value={r.recipient_type} onChange={(e) => handleChange(r, { recipient_type: e.target.value as any })} disabled={!isSupabaseConfigured} className="border border-slate-200 rounded-md px-2 py-1 text-xs">
                  <option value="specific_email">Specific email</option>
                  <option value="role">Role</option>
                  <option value="requester_manager">Requester's manager</option>
                </select>
              </td>
              <td className="px-4 py-2.5">
                {r.recipient_type === "specific_email" && (
                  <input defaultValue={r.recipient_email ?? ""} onBlur={(e) => handleChange(r, { recipient_email: e.target.value })} disabled={!isSupabaseConfigured} placeholder="name@karawa.qa" className="border border-slate-200 rounded-md px-2 py-1 text-xs w-48" />
                )}
                {r.recipient_type === "role" && (
                  <select value={r.recipient_role_id ?? ""} onChange={(e) => handleChange(r, { recipient_role_id: e.target.value })} disabled={!isSupabaseConfigured} className="border border-slate-200 rounded-md px-2 py-1 text-xs">
                    <option value="">Select role…</option>
                    {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                )}
                {r.recipient_type === "requester_manager" && <span className="text-xs text-slate-400">Resolved per-request from the employee's manager field</span>}
              </td>
              <td className="px-4 py-2.5">
                <select value={r.channel} onChange={(e) => handleChange(r, { channel: e.target.value as any })} disabled={!isSupabaseConfigured} className="border border-slate-200 rounded-md px-2 py-1 text-xs">
                  <option value="email">Email</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="both">Both</option>
                </select>
              </td>
              <td className="px-4 py-2.5">
                <input type="checkbox" checked={r.is_active} onChange={(e) => handleChange(r, { is_active: e.target.checked })} disabled={!isSupabaseConfigured} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <div className="text-xs text-red-500 px-4 py-2">{error}</div>}
    </div>
  );
}

function ApprovalsTab() {
  const [rules, setRules] = useState<ApprovalRule[] | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchApprovalRules().then(setRules);
  useEffect(() => { load(); fetchUsers().then(setUsers); }, []);

  async function handleChange(r: ApprovalRule, changes: Partial<Pick<ApprovalRule, "requires_approval" | "approver_user_id">>) {
    setError(null);
    try {
      await updateApprovalRule(r.id, changes);
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to update."); }
  }

  return (
    <div>
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-4 max-w-2xl">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>The approver is notified automatically via the "Approval requests" row on the Email Notifications tab — set that up alongside this so approvals don't sit unnoticed.</span>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-w-2xl">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-2.5">Request type</th><th className="px-4 py-2.5">Requires approval</th><th className="px-4 py-2.5">Approver</th>
          </tr></thead>
          <tbody>
            {rules === null && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {rules?.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-slate-700 flex items-center gap-1.5"><CheckSquare size={13} className="text-slate-400" /> {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}</td>
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={r.requires_approval} onChange={(e) => handleChange(r, { requires_approval: e.target.checked })} disabled={!isSupabaseConfigured} />
                </td>
                <td className="px-4 py-2.5">
                  {r.requires_approval ? (
                    <select value={r.approver_user_id ?? ""} onChange={(e) => handleChange(r, { approver_user_id: e.target.value })} disabled={!isSupabaseConfigured} className="border border-slate-200 rounded-md px-2 py-1 text-xs">
                      <option value="">Select approver…</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  ) : <span className="text-xs text-slate-300">Auto-approved</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <div className="text-xs text-red-500 px-4 py-2">{error}</div>}
      </div>
    </div>
  );
}

function MasterDataTab() {
  const links = [
    { to: "/admin/master-data", label: "Categories, Manufacturers, Statuses, License & Subscription Types, Currencies, Employment Types, Vendors", note: "One screen, table selector at the top" },
    { to: "/admin/org-settings", label: "Departments, Locations, Cost Centers", note: "Company-scoped, tabbed" },
    { to: "/admin/companies", label: "Companies", note: "Karawa + sister companies" },
    { to: "/admin/org-units", label: "Org Units", note: "Branches / business units / divisions" },
    { to: "/admin/roles", label: "Roles & Permission Matrix", note: "Controls what shows up under Settings elsewhere" },
  ];
  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-4">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>These already exist as their own screens (each dropdown type has its own add/edit form and validation) rather than being rebuilt here — this tab is just a map so "all master data" has one place to start from.</span>
      </div>
      <div className="space-y-2">
        {links.map((l) => (
          <a key={l.to} href={l.to} className="flex items-center justify-between border border-slate-200 rounded-md px-4 py-3 hover:bg-slate-50 bg-white">
            <div>
              <div className="text-sm font-medium text-slate-800">{l.label}</div>
              <div className="text-xs text-slate-400">{l.note}</div>
            </div>
            <span className="text-xs text-accent-dark">Open →</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Configuration() {
  const [tab, setTab] = useState<Tab>("integrations");

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "integrations", label: "Integrations", icon: Plug },
    { id: "barcode", label: "Barcode / Label Printing", icon: Printer },
    { id: "notifications", label: "Email Notifications", icon: Mail },
    { id: "approvals", label: "Approvals", icon: CheckSquare },
    { id: "master_data", label: "Master Data", icon: ListChecks },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 border-b border-slate-200">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${tab === t.id ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="pb-2"><LiveBadge /></div>
      </div>

      {tab === "integrations" && <IntegrationsTab />}
      {tab === "barcode" && <BarcodeTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "approvals" && <ApprovalsTab />}
      {tab === "master_data" && <MasterDataTab />}
    </div>
  );
}
