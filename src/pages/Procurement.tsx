import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthGate";
import { Plus, Database, CircleDot, Package, ChevronRight } from "lucide-react";
import { fetchPurchaseOrders, fetchPOLines, createPurchaseOrder, addPOLine, setPOStatus, receivePOLine, PurchaseOrder, POLine, POStatus } from "../lib/api/procurement";
import { fetchCompanies, CompanyRow } from "../lib/api/org";
import { fetchLookup } from "../lib/api/lookups";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const STATUS_STYLE: Record<POStatus, string> = {
  draft: "bg-slate-100 text-slate-500",
  pending_approval: "bg-amber-50 text-amber-600",
  approved: "bg-indigo-50 text-indigo-600",
  ordered: "bg-blue-50 text-blue-600",
  received: "bg-emerald-50 text-emerald-600",
  closed: "bg-slate-100 text-slate-400",
  cancelled: "bg-red-50 text-red-500",
};
const NEXT_STATUS: Partial<Record<POStatus, POStatus>> = {
  draft: "pending_approval",
  pending_approval: "approved",
  approved: "ordered",
  ordered: "received",
  received: "closed",
};

export default function Procurement() {
  const { can } = useAuth();
  const [pos, setPos] = useState<PurchaseOrder[] | null>(null);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<POLine[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showLineForm, setShowLineForm] = useState(false);
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState(1);
  const [lineCost, setLineCost] = useState(0);
  const [receiveCategory, setReceiveCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadPOs = () => fetchPurchaseOrders().then(setPos);

  useEffect(() => {
    loadPOs();
    fetchCompanies().then((cs) => { setCompanies(cs); if (cs.length) setCompanyId(cs[0].id); });
    fetchLookup("asset_categories").then((rows) => setCategoryOptions(rows.map((r) => ({ id: r.id, name: r.name }))));
    fetchLookup("asset_statuses").then((rows) => setStatusOptions(rows.map((r) => ({ id: r.id, name: r.name }))));
  }, []);

  useEffect(() => {
    if (selected) fetchPOLines(selected.id).then(setLines);
  }, [selected]);

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPurchaseOrder({ company_id: companyId, po_number: poNumber });
      setPoNumber(""); setShowAdd(false);
      await loadPOs();
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      await addPOLine({ po_id: selected.id, description: lineDesc, quantity: lineQty, unit_cost: lineCost });
      setLineDesc(""); setLineQty(1); setLineCost(0); setShowLineForm(false);
      await fetchPOLines(selected.id).then(setLines);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleAdvanceStatus() {
    if (!selected) return;
    const next = NEXT_STATUS[selected.status];
    if (!next) return;
    setError(null);
    try {
      await setPOStatus(selected.id, next);
      const updated = { ...selected, status: next };
      setSelected(updated);
      await loadPOs();
    } catch (err: any) { setError(err.message ?? "Failed to update status."); }
  }

  async function handleReceiveLine(line: POLine) {
    if (!selected || !receiveCategory) { setError("Pick a category before receiving."); return; }
    const availableStatus = statusOptions.find((s) => s.name === "Available");
    if (!availableStatus) { setError("No 'Available' status found."); return; }
    setError(null);
    try {
      await receivePOLine(line, selected, receiveCategory, availableStatus.id);
      await fetchPOLines(selected.id).then(setLines);
    } catch (err: any) { setError(err.message ?? "Failed to receive line."); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured || !can("procurement", "add")} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> New purchase order
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreatePO} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">PO number</label>
            <input required value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-2026-XXX" className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Company</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden h-fit">
          {pos === null && <div className="p-6 text-center text-sm text-slate-400">Loading…</div>}
          {pos?.map((po) => (
            <button key={po.id} onClick={() => setSelected(po)} className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-slate-50 last:border-0 hover:bg-slate-50 ${selected?.id === po.id ? "bg-slate-50" : ""}`}>
              <div>
                <div className="text-sm font-medium text-slate-800">{po.po_number}</div>
                <div className="text-xs text-slate-400">{po.company_name} · {po.vendor_name ?? "No vendor"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[po.status]}`}>{po.status.replace("_", " ")}</span>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            </button>
          ))}
        </div>

        <div className="col-span-3">
          {!selected && <div className="text-sm text-slate-400 p-6">Select a purchase order to view line items.</div>}
          {selected && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{selected.po_number}</div>
                  <div className="text-xs text-slate-400">{selected.company_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[selected.status]}`}>{selected.status.replace("_", " ")}</span>
                  {NEXT_STATUS[selected.status] && (
                    <button onClick={handleAdvanceStatus} disabled={!isSupabaseConfigured || !can("procurement", "edit")} className="text-xs bg-slate-900 text-white px-2 py-1 rounded-md disabled:opacity-40">
                      Advance → {NEXT_STATUS[selected.status]!.replace("_", " ")}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Line items</span>
                <button onClick={() => setShowLineForm((s) => !s)} disabled={!isSupabaseConfigured || !can("procurement", "add")} className="text-xs text-accent-dark disabled:opacity-40">+ Add line</button>
              </div>

              {showLineForm && (
                <form onSubmit={handleAddLine} className="flex items-end gap-2 mb-3 flex-wrap">
                  <input required placeholder="Description" value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1 text-xs flex-1" />
                  <input required type="number" min={1} placeholder="Qty" value={lineQty} onChange={(e) => setLineQty(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1 text-xs w-16" />
                  <input required type="number" min={0} placeholder="Unit cost" value={lineCost} onChange={(e) => setLineCost(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1 text-xs w-24" />
                  <button className="text-xs bg-slate-900 text-white px-2 py-1 rounded-md">Add</button>
                </form>
              )}

              {selected.status === "ordered" && (
                <div className="mb-3">
                  <label className="text-xs text-slate-500 block mb-1">Category for received items</label>
                  <select value={receiveCategory} onChange={(e) => setReceiveCategory(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                    <option value="">Select…</option>
                    {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border border-slate-100 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-700">{l.description}</div>
                        <div className="text-xs text-slate-400">Qty {l.quantity} · {l.unit_cost} each</div>
                      </div>
                    </div>
                    {l.received_asset_id ? (
                      <span className="text-xs text-emerald-600">Received → asset created</span>
                    ) : selected.status === "ordered" ? (
                      <button onClick={() => handleReceiveLine(l)} disabled={!isSupabaseConfigured || !can("procurement", "edit")} className="text-xs bg-accent text-white px-2 py-1 rounded-md disabled:opacity-40">
                        Receive
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">Not yet ordered</span>
                    )}
                  </div>
                ))}
                {lines.length === 0 && <div className="text-xs text-slate-400">No line items yet.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
