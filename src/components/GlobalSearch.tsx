import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Camera, Laptop, Users, Edit, UserPlus, ArrowRightLeft, TriangleAlert, X } from "lucide-react";
import { fetchAssets } from "../lib/api/assets";
import { fetchEmployees } from "../lib/api/employees";
import { fetchCompanies, CompanyRow } from "../lib/api/org";
import { fetchLocations } from "../lib/api/orgSettings";
import { transferAsset } from "../lib/api/transfers";
import { Asset, Employee } from "../lib/mockData";
import { StatusPill, Tag } from "./Ui";
import CameraScanner from "./CameraScanner";

function QuickTransfer({ asset, onDone }: { asset: Asset; onDone: () => void }) {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchCompanies().then((cs) => setCompanies(cs));
  }, []);
  React.useEffect(() => {
    if (companyId) fetchLocations(companyId).then((l) => setLocations(l));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await transferAsset({ asset_id: asset.id, to_company_id: companyId, to_location_id: locationId || null, reason });
      onDone();
    } catch (err: any) {
      setError(err.message ?? "Failed to transfer.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex items-end gap-2 flex-wrap bg-slate-50 rounded-md p-2">
      <select required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1 text-xs">
        <option value="">To company…</option>
        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1 text-xs">
        <option value="">To location (optional)…</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1 text-xs flex-1 min-w-[100px]" />
      <button className="text-xs bg-slate-900 text-white px-2 py-1 rounded-md">Confirm transfer</button>
      {error && <div className="text-xs text-red-500 w-full">{error}</div>}
    </form>
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [searched, setSearched] = useState(false);
  const [assetResults, setAssetResults] = useState<Asset[]>([]);
  const [employeeResults, setEmployeeResults] = useState<Employee[]>([]);
  const [transferringId, setTransferringId] = useState<string | null>(null);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    const [assets, employees] = await Promise.all([fetchAssets(), fetchEmployees()]);
    const lower = q.toLowerCase();
    setAssetResults(assets.filter((a) => a.tag.toLowerCase().includes(lower) || a.serial.toLowerCase().includes(lower) || a.model.toLowerCase().includes(lower) || a.manufacturer.toLowerCase().includes(lower)));
    setEmployeeResults(employees.filter((e) => e.name.toLowerCase().includes(lower) || e.id.toLowerCase().includes(lower) || e.email.toLowerCase().includes(lower)));
    setSearched(true);
  }

  function handleScanResult(code: string) {
    setQuery(code);
    setShowScanner(false);
    runSearch(code);
  }

  function clear() {
    setQuery("");
    setSearched(false);
    setAssetResults([]);
    setEmployeeResults([]);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <form onSubmit={(e) => { e.preventDefault(); runSearch(query); }} className="flex items-center gap-2 mb-1">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets, employees, barcodes, serial numbers…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md"
          />
          {query && (
            <button type="button" onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 text-sm border border-slate-200 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50">
          <Camera size={14} /> Scan
        </button>
        <button className="text-sm bg-accent text-white px-4 py-2 rounded-md">Search</button>
      </form>

      {searched && (
        <div className="mt-3 space-y-4">
          {assetResults.length === 0 && employeeResults.length === 0 && (
            <div className="text-sm text-slate-400 py-4 text-center">No matches for "{query}".</div>
          )}

          {assetResults.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Laptop size={12} /> Assets ({assetResults.length})</div>
              <div className="space-y-2">
                {assetResults.map((a) => (
                  <div key={a.id} className="border border-slate-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{a.manufacturer} {a.model}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Tag>{a.tag}</Tag>
                          <span className="text-xs text-slate-400">{a.company} · {a.location}</span>
                        </div>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button onClick={() => navigate("/assets", { state: { openAssetId: a.id } })} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50"><Edit size={11} /> Edit</button>
                      {a.status === "Available" ? (
                        <button onClick={() => navigate("/checkout", { state: { prefillAssetId: a.id, tab: "checkout" } })} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50"><UserPlus size={11} /> Assign</button>
                      ) : (
                        <button onClick={() => setTransferringId(transferringId === a.id ? null : a.id)} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50"><ArrowRightLeft size={11} /> Transfer</button>
                      )}
                      <button onClick={() => navigate("/itsm", { state: { prefillAssetId: a.id, tab: "incidents" } })} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50"><TriangleAlert size={11} /> Incident</button>
                      <button onClick={() => navigate("/itsm", { state: { tab: "changes" } })} className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50">Change</button>
                      <button onClick={() => navigate("/itsm", { state: { tab: "problems" } })} className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50">Problem</button>
                    </div>
                    {transferringId === a.id && <QuickTransfer asset={a} onDone={() => { setTransferringId(null); runSearch(query); }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {employeeResults.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={12} /> Employees ({employeeResults.length})</div>
              <div className="space-y-2">
                {employeeResults.map((e) => (
                  <div key={e.id} className="border border-slate-200 rounded-md p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{e.name}</div>
                      <div className="flex items-center gap-2 mt-0.5"><Tag>{e.id}</Tag><span className="text-xs text-slate-400">{e.company} · {e.dept}</span></div>
                    </div>
                    <button onClick={() => navigate("/employees", { state: { openEmployeeId: e.id } })} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50"><Edit size={11} /> View / Edit</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showScanner && <CameraScanner onDetected={handleScanResult} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
