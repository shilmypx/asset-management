import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot, FileText, ShieldPlus } from "lucide-react";
import { fetchContracts, createContract, fetchWarrantyExtensions, addWarrantyExtension, Contract, WarrantyExtension, ContractType } from "../lib/api/contracts";
import { fetchCompanies, CompanyRow } from "../lib/api/org";
import { fetchAssets } from "../lib/api/assets";
import { Asset } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { Tag } from "../components/Ui";

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
function renewalBadge(days: number | null) {
  if (days === null) return "bg-slate-100 text-slate-400";
  if (days < 0) return "bg-red-50 text-red-500";
  if (days <= 30) return "bg-amber-50 text-amber-600";
  return "bg-emerald-50 text-emerald-600";
}

export default function Contracts() {
  const [tab, setTab] = useState<"contracts" | "warranty">("contracts");
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [extensions, setExtensions] = useState<WarrantyExtension[] | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contractType, setContractType] = useState<ContractType>("AMC");
  const [endDate, setEndDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [cost, setCost] = useState(0);
  const [extAssetId, setExtAssetId] = useState("");
  const [extNewEnd, setExtNewEnd] = useState("");
  const [extCost, setExtCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts().then(setContracts);
    fetchWarrantyExtensions().then(setExtensions);
    fetchCompanies().then((cs) => { setCompanies(cs); if (cs.length) setCompanyId(cs[0].id); });
    fetchAssets().then(setAssets);
  }, []);

  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createContract({ company_id: companyId, contract_type: contractType, title, end_date: endDate, renewal_date: renewalDate || null, auto_renew: autoRenew, cost });
      setTitle(""); setEndDate(""); setRenewalDate(""); setCost(0); setShowAdd(false);
      await fetchContracts().then(setContracts);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleAddExtension(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const asset = assets.find((a) => a.id === extAssetId);
      await addWarrantyExtension({ asset_id: extAssetId, previous_end_date: asset?.warrantyEnd ?? null, new_end_date: extNewEnd, cost: extCost });
      setExtAssetId(""); setExtNewEnd(""); setExtCost(0);
      await fetchWarrantyExtensions().then(setExtensions);
      await fetchAssets().then(setAssets);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
        <button onClick={() => { setTab("contracts"); setShowAdd(false); }} className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${tab === "contracts" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}><FileText size={14} /> Contracts</button>
        <button onClick={() => { setTab("warranty"); setShowAdd(false); }} className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${tab === "warranty" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}><ShieldPlus size={14} /> Warranty Extensions</button>
        <div className="ml-auto pb-2">
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
          )}
        </div>
      </div>

      {tab === "contracts" && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
              <Plus size={14} /> Add contract
            </button>
          </div>
          {showAdd && (
            <form onSubmit={handleAddContract} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Title</label>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Company</label>
                  <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Type</label>
                  <select value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                    <option value="AMC">AMC</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="support">Support</option>
                    <option value="software_agreement">Software agreement</option>
                    <option value="vendor_contract">Vendor contract</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Cost</label>
                  <input required type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">End date</label>
                  <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Renewal date</label>
                  <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} /> Auto-renew
              </label>
              <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
            </form>
          )}
          {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 font-medium">Title</th><th className="px-5 py-3 font-medium">Type</th><th className="px-5 py-3 font-medium">Company</th><th className="px-5 py-3 font-medium">Renewal</th><th className="px-5 py-3 font-medium">Auto-renew</th>
              </tr></thead>
              <tbody>
                {contracts === null && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
                {contracts?.map((c) => {
                  const d = daysUntil(c.renewal_date);
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-800">{c.title}<div className="text-xs text-slate-400 font-normal">{c.vendor_name}</div></td>
                      <td className="px-5 py-3 text-slate-600 capitalize">{c.contract_type.replace("_", " ")}</td>
                      <td className="px-5 py-3 text-slate-600">{c.company_name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${renewalBadge(d)}`}>{c.renewal_date ?? "—"}{d !== null ? ` (${d}d)` : ""}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{c.auto_renew ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "warranty" && (
        <>
          <form onSubmit={handleAddExtension} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Asset</label>
              <select required value={extAssetId} onChange={(e) => setExtAssetId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                <option value="">Select…</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} — {a.manufacturer} {a.model}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">New warranty end</label>
              <input required type="date" value={extNewEnd} onChange={(e) => setExtNewEnd(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Cost</label>
              <input required type="number" min={0} value={extCost} onChange={(e) => setExtCost(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-28" />
            </div>
            <button disabled={!isSupabaseConfigured} className="text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">Log extension</button>
          </form>
          {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 font-medium">Asset</th><th className="px-5 py-3 font-medium">Previous End</th><th className="px-5 py-3 font-medium">New End</th><th className="px-5 py-3 font-medium">Cost</th><th className="px-5 py-3 font-medium">Purchased</th>
              </tr></thead>
              <tbody>
                {extensions === null && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
                {extensions?.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3"><Tag>{e.asset_tag}</Tag></td>
                    <td className="px-5 py-3 text-slate-500">{e.previous_end_date ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-700 font-medium">{e.new_end_date}</td>
                    <td className="px-5 py-3 text-slate-600">{e.cost ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{e.purchased_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
