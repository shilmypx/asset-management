import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot, ScanLine, CheckCircle2, AlertTriangle, HelpCircle, Ban } from "lucide-react";
import { fetchSessions, startSession, fetchScans, scanBarcode, completeSession, AuditSession, Scan } from "../lib/api/audit";
import { fetchCompanies, CompanyRow } from "../lib/api/org";
import { fetchAssets } from "../lib/api/assets";
import { Asset } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { Tag } from "../components/Ui";

const RESULT_STYLE: Record<string, { color: string; icon: any }> = {
  matched: { color: "text-emerald-600", icon: CheckCircle2 },
  mismatched_location: { color: "text-amber-600", icon: AlertTriangle },
  unexpected: { color: "text-red-500", icon: HelpCircle },
  missing: { color: "text-slate-400", icon: Ban },
};

export default function InventoryAudit() {
  const [sessions, setSessions] = useState<AuditSession[] | null>(null);
  const [active, setActive] = useState<AuditSession | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [missingReport, setMissingReport] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions().then(setSessions);
    fetchCompanies().then((cs) => { setCompanies(cs); if (cs.length) setCompanyId(cs[0].id); });
    fetchAssets().then(setAssets);
  }, []);

  const expectedAssets = assets.filter((a) => a.company === companies.find((c) => c.id === (active?.company_id ?? companyId))?.name);

  async function handleStart() {
    setError(null);
    try {
      const session = await startSession(companyId);
      setActive(session);
      setScans([]);
      setMissingReport(null);
      await fetchSessions().then(setSessions);
    } catch (err: any) { setError(err.message ?? "Failed to start session."); }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !barcodeInput) return;
    setError(null);
    try {
      const result = await scanBarcode(active.id, barcodeInput, expectedAssets);
      setLastResult(result);
      setBarcodeInput("");
      await fetchScans(active.id).then(setScans);
    } catch (err: any) { setError(err.message ?? "Failed to record scan."); }
  }

  async function handleComplete() {
    if (!active) return;
    setError(null);
    try {
      const missing = await completeSession(active.id, expectedAssets, scans);
      setMissingReport(missing);
      await fetchSessions().then(setSessions);
      await fetchScans(active.id).then(setScans);
      setActive({ ...active, status: "completed" });
    } catch (err: any) { setError(err.message ?? "Failed to complete session."); }
  }

  const tally = { matched: 0, mismatched_location: 0, unexpected: 0, missing: 0 } as Record<string, number>;
  scans.forEach((s) => (tally[s.result] = (tally[s.result] ?? 0) + 1));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — sessions work in-memory only</span>
          )}
        </div>
        {!active && (
          <div className="flex items-end gap-2">
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={handleStart} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md">
              <Plus size={14} /> Start audit session
            </button>
          </div>
        )}
      </div>
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      {active && active.status === "in_progress" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-slate-700">Scanning: {companies.find((c) => c.id === active.company_id)?.name}</div>
            <button onClick={handleComplete} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md">Complete audit</button>
          </div>
          <form onSubmit={handleScan} className="flex items-center gap-2 mb-4">
            <ScanLine size={16} className="text-slate-400" />
            <input autoFocus value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Scan or type barcode, e.g. KWA-LAP-00231" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm font-mono" />
            <button className="text-sm bg-accent text-white px-3 py-2 rounded-md">Record</button>
          </form>
          {lastResult && (
            <div className={`text-sm mb-3 flex items-center gap-1.5 ${RESULT_STYLE[lastResult].color}`}>
              {React.createElement(RESULT_STYLE[lastResult].icon, { size: 14 })}
              {lastResult === "matched" ? "Matched — found in expected inventory" : lastResult === "unexpected" ? "Unexpected — not in this company's expected assets" : lastResult}
            </div>
          )}
          <div className="grid grid-cols-4 gap-3 text-center text-xs mb-4">
            <div className="bg-emerald-50 rounded-md py-2"><div className="text-lg font-semibold text-emerald-600">{tally.matched}</div>Matched</div>
            <div className="bg-amber-50 rounded-md py-2"><div className="text-lg font-semibold text-amber-600">{tally.mismatched_location}</div>Mismatched</div>
            <div className="bg-red-50 rounded-md py-2"><div className="text-lg font-semibold text-red-500">{tally.unexpected}</div>Unexpected</div>
            <div className="bg-slate-50 rounded-md py-2"><div className="text-lg font-semibold text-slate-500">{expectedAssets.length - scans.filter((s) => s.result === "matched").length}</div>Not yet scanned</div>
          </div>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {scans.map((s) => {
              const style = RESULT_STYLE[s.result];
              return (
                <div key={s.id} className={`flex items-center gap-2 text-xs ${style.color}`}>
                  {React.createElement(style.icon, { size: 12 })} <Tag>{s.scanned_barcode}</Tag> {s.result.replace("_", " ")}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {missingReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Audit complete — {missingReport.length} asset{missingReport.length === 1 ? "" : "s"} never scanned</div>
          {missingReport.length === 0 ? (
            <div className="text-xs text-emerald-600">Every expected asset was accounted for.</div>
          ) : (
            <div className="space-y-1">
              {missingReport.map((a) => <div key={a.id} className="text-xs text-slate-500 flex items-center gap-2"><Ban size={12} className="text-slate-400" /><Tag>{a.tag}</Tag> {a.manufacturer} {a.model} — last known owner {a.owner}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3 font-medium">Company</th><th className="px-5 py-3 font-medium">Started</th><th className="px-5 py-3 font-medium">Completed</th><th className="px-5 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {sessions === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {sessions?.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 text-slate-700">{s.company_name ?? companies.find((c) => c.id === s.company_id)?.name}</td>
                <td className="px-5 py-3 text-slate-500">{new Date(s.started_at).toLocaleString()}</td>
                <td className="px-5 py-3 text-slate-500">{s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{s.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
