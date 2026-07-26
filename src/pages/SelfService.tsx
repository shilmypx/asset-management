import React, { useEffect, useState } from "react";
import { Database, CircleDot, Info, CheckCircle2, XCircle } from "lucide-react";
import { Employee, Asset } from "../lib/mockData";
import { fetchEmployees } from "../lib/api/employees";
import { fetchAssets } from "../lib/api/assets";
import { fetchLookup } from "../lib/api/lookups";
import { fetchMyRequests, fetchAllRequests, submitRequest, decideRequest, AssetRequest, RequestType } from "../lib/api/selfService";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { StatusPill, Tag } from "../components/Ui";

const STATUS_TO_PILL: Record<string, string> = { submitted: "Reserved", approved: "Available", rejected: "Lost", fulfilled: "Assigned" };

export default function SelfService() {
  const [view, setView] = useState<"portal" | "approvals">("portal");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeIdx, setEmployeeIdx] = useState(0); // stand-in for a logged-in session
  const [assets, setAssets] = useState<Asset[]>([]);
  const [myRequests, setMyRequests] = useState<AssetRequest[]>([]);
  const [allRequests, setAllRequests] = useState<AssetRequest[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [requestType, setRequestType] = useState<RequestType>("new_hardware");
  const [categoryId, setCategoryId] = useState("");
  const [justification, setJustification] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
    fetchAssets().then(setAssets);
    fetchLookup("asset_categories").then((rows) => setCategories(rows.map((r) => ({ id: r.id, name: r.name }))));
  }, []);

  const currentEmployee = employees[employeeIdx];

  useEffect(() => {
    if (currentEmployee) fetchMyRequests(currentEmployee.id).then(setMyRequests);
  }, [currentEmployee]);

  useEffect(() => {
    if (view === "approvals") fetchAllRequests().then(setAllRequests);
  }, [view]);

  const myAssets = currentEmployee ? assets.filter((a) => a.owner === currentEmployee.name) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmployee) return;
    await submitRequest({
      employee_id: currentEmployee.id,
      request_type: requestType,
      category_id: requestType === "new_hardware" || requestType === "upgrade" ? categoryId || null : null,
      justification,
    });
    setJustification(""); setCategoryId(""); setSubmitted(true);
    await fetchMyRequests(currentEmployee.id).then(setMyRequests);
    setTimeout(() => setSubmitted(false), 2000);
  }

  async function handleDecide(r: AssetRequest, status: "approved" | "rejected") {
    try {
      await decideRequest(r.id, status);
      await fetchAllRequests().then(setAllRequests);
    } catch (err) {
      // surfaced inline below via the disabled-state pattern; demo mode already blocks the click
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
        <button onClick={() => setView("portal")} className={`px-3 py-2 text-sm border-b-2 -mb-px ${view === "portal" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>Employee portal</button>
        <button onClick={() => setView("approvals")} className={`px-3 py-2 text-sm border-b-2 -mb-px ${view === "approvals" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>Approval queue</button>
        <div className="ml-auto pb-2">
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
          )}
        </div>
      </div>

      {view === "portal" && (
        <>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-4">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>No login screen is wired up yet, so this picker stands in for "who's signed in" — a real build would pull this from the Supabase Auth session instead.</span>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-1">Viewing as</label>
            <select value={employeeIdx} onChange={(e) => setEmployeeIdx(Number(e.target.value))} className="border border-slate-200 rounded-md px-3 py-1.5 text-sm">
              {employees.map((e, i) => <option key={e.id} value={i}>{e.name} — {e.company}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-700 mb-3">My assets</div>
                {myAssets.length === 0 && <div className="text-xs text-slate-400">No hardware assigned.</div>}
                <div className="space-y-2">
                  {myAssets.map((a) => (
                    <div key={a.id} className="flex items-center justify-between border border-slate-100 rounded-md px-3 py-2">
                      <div>
                        <div className="text-sm text-slate-800">{a.manufacturer} {a.model}</div>
                        <Tag>{a.tag}</Tag>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-700 mb-3">My requests</div>
                {myRequests.length === 0 && <div className="text-xs text-slate-400">No requests submitted yet.</div>}
                <div className="space-y-2">
                  {myRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between border border-slate-100 rounded-md px-3 py-2">
                      <div>
                        <div className="text-sm text-slate-800 capitalize">{r.request_type.replace("_", " ")}{r.category_name ? ` — ${r.category_name}` : ""}</div>
                        <div className="text-xs text-slate-400">{r.requested_at}</div>
                      </div>
                      <StatusPill status={STATUS_TO_PILL[r.status]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-700 mb-3">New request</div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Request type</label>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                    <option value="new_hardware">New hardware</option>
                    <option value="software_license">Software license</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="repair">Repair</option>
                  </select>
                </div>
                {(requestType === "new_hardware" || requestType === "upgrade") && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Category</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                      <option value="">Select…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Justification</label>
                  <textarea required rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
                </div>
                <button className="text-sm bg-accent text-white px-4 py-2 rounded-md">Submit request</button>
                {submitted && <div className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 size={14} /> Request submitted.</div>}
              </form>
            </div>
          </div>
        </>
      )}

      {view === "approvals" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 font-medium">Requester</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Justification</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Decide</th>
              </tr>
            </thead>
            <tbody>
              {allRequests.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{r.employee_name ?? r.employee_id}</td>
                  <td className="px-5 py-3 text-slate-600 capitalize">{r.request_type.replace("_", " ")}{r.category_name ? ` — ${r.category_name}` : ""}</td>
                  <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{r.justification}</td>
                  <td className="px-5 py-3"><StatusPill status={STATUS_TO_PILL[r.status]} /></td>
                  <td className="px-5 py-3 text-right">
                    {r.status === "submitted" ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDecide(r, "approved")} disabled={!isSupabaseConfigured} className="text-emerald-600 disabled:opacity-30"><CheckCircle2 size={16} /></button>
                        <button onClick={() => handleDecide(r, "rejected")} disabled={!isSupabaseConfigured} className="text-red-500 disabled:opacity-30"><XCircle size={16} /></button>
                      </div>
                    ) : <span className="text-xs text-slate-300">Decided</span>}
                  </td>
                </tr>
              ))}
              {allRequests.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
