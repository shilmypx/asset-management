import React, { useState } from "react";
import { X } from "lucide-react";
import { EMPLOYEES, ASSETS, Employee } from "../lib/mockData";
import { StatusPill, Tag, Field } from "../components/Ui";

function statusToPill(status: Employee["status"]) {
  if (status === "Active") return "Available";
  if (status === "On Leave") return "Reserved";
  return "Disposed";
}

function Detail({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const owned = ASSETS.filter((a) => a.owner === emp.name);
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
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Assigned Hardware ({owned.length})</div>
            {owned.length === 0 && <div className="text-sm text-slate-400">No hardware assigned.</div>}
            <div className="space-y-2">
              {owned.map((a) => (
                <div key={a.id} className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2">
                  <div>
                    <div className="text-sm text-slate-800">{a.manufacturer} {a.model}</div>
                    <Tag>{a.tag}</Tag>
                  </div>
                  <StatusPill status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Employees({ company, search }: { company: string; search: string }) {
  const [selected, setSelected] = useState<Employee | null>(null);
  const filtered = EMPLOYEES.filter(
    (e) =>
      (company === "All Companies" || e.company === company) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
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
            {filtered.map((e) => (
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
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No employees match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && <Detail emp={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
