import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Database, CircleDot } from "lucide-react";
import { Employee } from "../lib/mockData";
import { fetchEmployees } from "../lib/api/employees";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { StatusPill, Tag, Field } from "../components/Ui";

function statusToPill(status: Employee["status"]) {
  if (status === "Active") return "Available";
  if (status === "On Leave") return "Reserved";
  return "Disposed";
}

function Detail({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={onClose}>
      <div className="w-[440px] bg-white h-full shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1">{emp.id}</div>
            <div className="text-lg font-semibold text-slate-900">{emp.name}</div>
            <div className="text-sm text-slate-500">{emp.title}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <StatusPill status={statusToPill(emp.status)} />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Company" value={emp.company} />
            <Field label="Department" value={emp.dept} />
            <Field label="Email" value={emp.email} />
            <Field label="Manager" value={emp.manager} />
            <Field label="Joined" value={emp.joined} />
          </div>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Assigned hardware/software lookups join against the assets and software_licenses tables next — not wired to this panel yet.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Employees({ company, search }: { company: string; search: string }) {
  const location = useLocation();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);

  useEffect(() => {
    const openId = (location.state as any)?.openEmployeeId;
    if (openId && employees) {
      const match = employees.find((e) => e.id === openId);
      if (match) setSelected(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, location.state]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
  }, []);

  const filtered = (employees ?? []).filter(
    (e) =>
      (company === "All Companies" || e.company === company) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      <div className="flex justify-end mb-2">
        {isSupabaseConfigured ? (
          <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live — connected to Supabase</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">Company / Dept</th>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {employees === null && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {employees !== null && filtered.map((e) => (
              <tr key={e.id} onClick={() => setSelected(e)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-800">{e.name}</div>
                  <Tag>{e.id}</Tag>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  <div>{e.company}</div>
                  <div className="text-xs text-slate-400">{e.dept}</div>
                </td>
                <td className="px-5 py-3 text-slate-600">{e.title}</td>
                <td className="px-5 py-3">
                  <StatusPill status={statusToPill(e.status)} />
                  <div className="text-xs text-slate-400 mt-0.5">{e.status}</div>
                </td>
                <td className="px-5 py-3 text-slate-500">{e.joined}</td>
              </tr>
            ))}
            {employees !== null && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No employees match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && <Detail emp={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
