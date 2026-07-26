import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot, X, UserMinus } from "lucide-react";
import { fetchLicenses, fetchAssignments, createLicense, assignSeat, revokeSeat, License, LicenseAssignment } from "../lib/api/software";
import { fetchCompanies, CompanyRow } from "../lib/api/org";
import { fetchEmployees } from "../lib/api/employees";
import { Employee } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabaseClient";

function seatBarColor(used: number, total: number) {
  const pct = total ? used / total : 0;
  if (pct >= 1) return "#EF4444";
  if (pct >= 0.85) return "#F59E0B";
  return "#17B8A6";
}

export default function SoftwareLicenses() {
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [selected, setSelected] = useState<License | null>(null);
  const [assignments, setAssignments] = useState<LicenseAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [seats, setSeats] = useState(1);
  const [cost, setCost] = useState(0);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchLicenses().then(setLicenses);
  useEffect(() => {
    load();
    fetchEmployees().then(setEmployees);
    fetchCompanies().then((cs) => { setCompanies(cs); if (cs.length) setCompanyId(cs[0].id); });
  }, []);

  useEffect(() => {
    if (selected) fetchAssignments(selected.id).then(setAssignments);
  }, [selected]);

  async function refreshSelected() {
    const updated = await fetchLicenses();
    setLicenses(updated);
    if (selected) {
      const match = updated.find((l) => l.id === selected.id);
      if (match) setSelected(match);
      await fetchAssignments(selected.id).then(setAssignments);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createLicense({ software_name: name, company_id: companyId, seats_purchased: seats, cost });
      setName(""); setSeats(1); setCost(0); setShowAdd(false);
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !assignEmployeeId) return;
    setError(null);
    try {
      await assignSeat(selected.id, assignEmployeeId);
      setAssignEmployeeId("");
      await refreshSelected();
    } catch (err: any) { setError(err.message ?? "Failed to assign."); }
  }

  async function handleRevoke(a: LicenseAssignment) {
    if (!selected) return;
    setError(null);
    try {
      await revokeSeat(a.id, selected.id);
      await refreshSelected();
    } catch (err: any) { setError(err.message ?? "Failed to revoke."); }
  }

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
          <Plus size={14} /> Add license
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Software name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Company</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Seats</label>
            <input required type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-20" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Cost</label>
            <input required type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-24" />
          </div>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Software</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">License / Subscription</th>
              <th className="px-5 py-3 font-medium">Seats</th>
              <th className="px-5 py-3 font-medium">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {licenses === null && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {licenses?.map((l) => (
              <tr key={l.id} onClick={() => setSelected(l)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                <td className="px-5 py-3 font-medium text-slate-800">{l.software_name}<div className="text-xs text-slate-400 font-normal">{l.vendor_name}</div></td>
                <td className="px-5 py-3 text-slate-600">{l.company_name}</td>
                <td className="px-5 py-3 text-slate-600">{l.license_type_name} · {l.subscription_type_name}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full" style={{ width: `${Math.min(100, (l.seats_used / l.seats_purchased) * 100)}%`, backgroundColor: seatBarColor(l.seats_used, l.seats_purchased) }} />
                    </div>
                    <span className="text-xs text-slate-500">{l.seats_used}/{l.seats_purchased}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-500">{l.renewal_date ?? "Perpetual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={() => setSelected(null)}>
          <div className="w-[420px] bg-white h-full shadow-xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{selected.software_name}</div>
                <div className="text-sm text-slate-500">{selected.vendor_name} · {selected.company_name}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400"><X size={18} /></button>
            </div>
            <div className="text-sm text-slate-600 mb-4">{selected.seats_used} of {selected.seats_purchased} seats used · renews {selected.renewal_date ?? "never (perpetual)"}</div>

            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Assigned users</div>
            <div className="space-y-2 mb-4">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2">
                  <span className="text-sm text-slate-700">{a.employee_name ?? a.employee_id}</span>
                  <button onClick={() => handleRevoke(a)} disabled={!isSupabaseConfigured} className="text-slate-400 hover:text-red-500 disabled:opacity-30"><UserMinus size={14} /></button>
                </div>
              ))}
              {assignments.length === 0 && <div className="text-xs text-slate-400">No seats assigned yet.</div>}
            </div>

            <form onSubmit={handleAssign} className="flex items-end gap-2">
              <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)} className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm">
                <option value="">Assign to…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button disabled={!isSupabaseConfigured || selected.seats_used >= selected.seats_purchased} className="text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">Assign</button>
            </form>
            {selected.seats_used >= selected.seats_purchased && <div className="text-xs text-amber-600 mt-2">All seats in use — over-license by adding more seats first.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
