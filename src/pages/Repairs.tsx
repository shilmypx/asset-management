import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot, Wrench, CheckCircle2 } from "lucide-react";
import { fetchRepairs, fetchReplacements, createRepair, issueReplacement, completeRepair, RepairRecord, Replacement } from "../lib/api/repairs";
import { fetchAssets } from "../lib/api/assets";
import { fetchLookup } from "../lib/api/lookups";
import { Asset } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { Tag } from "../components/Ui";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-slate-100 text-slate-500",
  in_progress: "bg-amber-50 text-amber-600",
  completed: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-500",
};

export default function Repairs() {
  const [repairs, setRepairs] = useState<RepairRecord[] | null>(null);
  const [selected, setSelected] = useState<RepairRecord | null>(null);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [statusIds, setStatusIds] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [issue, setIssue] = useState("");
  const [underWarranty, setUnderWarranty] = useState(true);
  const [replacementSource, setReplacementSource] = useState<"warranty_vendor" | "internal_stock">("internal_stock");
  const [replacementAssetId, setReplacementAssetId] = useState("");
  const [repairCost, setRepairCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchRepairs().then(setRepairs);
  useEffect(() => {
    load();
    fetchAssets().then(setAssets);
    fetchLookup("asset_statuses").then((rows) => {
      const map: Record<string, string> = {};
      rows.forEach((r) => (map[r.name] = r.id));
      setStatusIds(map);
    });
  }, []);

  useEffect(() => {
    if (selected) fetchReplacements(selected.id).then(setReplacements);
  }, [selected]);

  async function refreshSelected() {
    const all = await fetchRepairs();
    setRepairs(all);
    if (selected) {
      const match = all.find((r) => r.id === selected.id);
      if (match) { setSelected(match); await fetchReplacements(match.id).then(setReplacements); }
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createRepair({ asset_id: assetId, issue_description: issue, under_warranty: underWarranty, statusIdUnderRepair: statusIds["Under Repair"] });
      setAssetId(""); setIssue(""); setShowAdd(false);
      await load();
      await fetchAssets().then(setAssets);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleIssueReplacement() {
    if (!selected) return;
    setError(null);
    try {
      await issueReplacement(selected.id, selected.asset_id, replacementAssetId, replacementSource, statusIds["Assigned"]);
      setReplacementAssetId("");
      await refreshSelected();
      await fetchAssets().then(setAssets);
    } catch (err: any) { setError(err.message ?? "Failed to issue replacement."); }
  }

  async function handleComplete() {
    if (!selected) return;
    setError(null);
    try {
      await completeRepair(selected.id, selected.asset_id, statusIds["Available"], repairCost || null);
      await refreshSelected();
      await fetchAssets().then(setAssets);
    } catch (err: any) { setError(err.message ?? "Failed to complete repair."); }
  }

  const availableForReplacement = assets.filter((a) => a.status === "Available" && a.id !== selected?.asset_id);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> Send for repair
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Asset</label>
            <select required value={assetId} onChange={(e) => setAssetId(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {assets.filter((a) => a.status !== "Under Repair").map((a) => <option key={a.id} value={a.id}>{a.tag} — {a.manufacturer} {a.model}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Issue description</label>
            <textarea required rows={2} value={issue} onChange={(e) => setIssue(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={underWarranty} onChange={(e) => setUnderWarranty(e.target.checked)} /> Under warranty
          </label>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && !selected && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden h-fit">
          {repairs === null && <div className="p-6 text-center text-sm text-slate-400">Loading…</div>}
          {repairs?.map((r) => (
            <button key={r.id} onClick={() => setSelected(r)} className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 ${selected?.id === r.id ? "bg-slate-50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{r.asset_tag}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>{r.status.replace("_", " ")}</span>
              </div>
              <div className="text-xs text-slate-400 truncate">{r.issue_description}</div>
            </button>
          ))}
        </div>

        <div className="col-span-3">
          {!selected && <div className="text-sm text-slate-400 p-6">Select a repair record for details.</div>}
          {selected && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Wrench size={13} /> {selected.asset_tag}</div>
                  <div className="text-xs text-slate-400">{selected.vendor_name ?? "No vendor assigned"} · sent {selected.sent_date}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[selected.status]}`}>{selected.status.replace("_", " ")}</span>
              </div>
              <div className="text-sm text-slate-600 mb-4">{selected.issue_description}</div>

              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Temporary replacement</div>
              <div className="space-y-2 mb-3">
                {replacements.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border border-slate-100 rounded-md px-3 py-2 text-sm">
                    <span>{r.replacement_source === "internal_stock" ? "Internal stock" : "Warranty vendor loaner"}{r.replacement_asset_id ? ` — ${r.replacement_asset_id}` : ""}</span>
                    {r.recovered_at ? <span className="text-xs text-slate-400">Recovered</span> : <span className="text-xs text-amber-600">Active</span>}
                  </div>
                ))}
                {replacements.length === 0 && <div className="text-xs text-slate-400">No replacement issued.</div>}
              </div>

              {selected.status !== "completed" && (
                <>
                  {replacements.every((r) => r.recovered_at) && (
                    <div className="flex items-end gap-2 mb-4 flex-wrap">
                      <select value={replacementSource} onChange={(e) => setReplacementSource(e.target.value as any)} className="border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                        <option value="internal_stock">From internal stock</option>
                        <option value="warranty_vendor">From warranty vendor loaner</option>
                      </select>
                      {replacementSource === "internal_stock" && (
                        <select value={replacementAssetId} onChange={(e) => setReplacementAssetId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-xs flex-1">
                          <option value="">Pick asset…</option>
                          {availableForReplacement.map((a) => <option key={a.id} value={a.id}>{a.tag} — {a.manufacturer} {a.model}</option>)}
                        </select>
                      )}
                      <button onClick={handleIssueReplacement} disabled={!isSupabaseConfigured || (replacementSource === "internal_stock" && !replacementAssetId)} className="text-xs bg-slate-900 text-white px-2 py-1.5 rounded-md disabled:opacity-40">
                        Issue replacement
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Repair cost</label>
                      <input type="number" min={0} value={repairCost} onChange={(e) => setRepairCost(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1.5 text-xs w-28" />
                    </div>
                    <button onClick={handleComplete} disabled={!isSupabaseConfigured} className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Mark returned / complete
                    </button>
                  </div>
                </>
              )}
              {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
