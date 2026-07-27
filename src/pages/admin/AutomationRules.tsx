import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot, Info, Zap } from "lucide-react";
import { fetchRules, createRule, toggleRule, AutomationRule, TriggerEvent, RuleAction } from "../../lib/api/automationRules";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  warranty_expiring: "Warranty expiring",
  contract_expiring: "Contract expiring",
  repair_returned: "Repair returned",
  license_threshold_reached: "License threshold reached",
  asset_idle: "Asset idle",
  disposal_due: "Disposal due",
};
const ACTION_LABELS: Record<RuleAction, string> = {
  send_notification: "Send notification",
  create_task: "Create task",
  change_status: "Change status",
  create_disposal_request: "Create disposal request",
};

export default function AutomationRulesAdmin() {
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<TriggerEvent>("warranty_expiring");
  const [action, setAction] = useState<RuleAction>("send_notification");
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchRules().then(setRules);
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createRule({ name, trigger_event: trigger, action });
      setName(""); setShowAdd(false);
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleToggle(rule: AutomationRule) {
    try {
      await toggleRule(rule.id, !rule.is_active);
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to update."); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> New rule
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-4">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>This screen manages rule <em>configuration</em> only. Actually running rules on a schedule (checking for warranty expirations daily, etc.) needs a scheduled job — a Supabase Edge Function on a cron trigger — which isn't part of this frontend and would be a separate deployment step.</span>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Rule name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Trigger</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerEvent)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value as RuleAction)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3 font-medium">Rule</th><th className="px-5 py-3 font-medium">Trigger</th><th className="px-5 py-3 font-medium">Action</th><th className="px-5 py-3 font-medium">Active</th>
          </tr></thead>
          <tbody>
            {rules === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {rules?.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800 flex items-center gap-1.5"><Zap size={13} className="text-slate-400" /> {r.name}</td>
                <td className="px-5 py-3 text-slate-600">{TRIGGER_LABELS[r.trigger_event]}</td>
                <td className="px-5 py-3 text-slate-600">{ACTION_LABELS[r.action]}</td>
                <td className="px-5 py-3">
                  <button onClick={() => handleToggle(r)} disabled={!isSupabaseConfigured} className="disabled:opacity-40">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{r.is_active ? "Active" : "Inactive"}</span>
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
