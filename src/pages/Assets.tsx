import React, { useState } from "react";
import { X, ChevronRight, Barcode, Package } from "lucide-react";
import { ASSETS, Asset } from "../lib/mockData";
import { StatusPill, Tag, Field } from "../components/Ui";

function Detail({ asset, onClose, onOpenChild }: { asset: Asset; onClose: () => void; onOpenChild: (a: Asset) => void }) {
  const children = ASSETS.filter((a) => a.parentId === asset.id);
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={onClose}>
      <div className="w-[460px] bg-white h-full shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md flex items-center justify-center bg-accent/10">
              <Package size={18} className="text-accent-dark" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{asset.manufacturer} {asset.model}</div>
              <Tag>{asset.tag}</Tag>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <StatusPill status={asset.status} />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Category" value={asset.category} />
            <Field label="Serial Number" value={asset.serial} />
            <Field label="Company" value={asset.company} />
            <Field label="Location" value={asset.location} />
            <Field label="Owner" value={`${asset.owner} (${asset.ownerType})`} />
            <Field label="Purchase Date" value={asset.purchaseDate} />
            <Field label="Cost" value={asset.cost} />
            <Field label="Warranty End" value={asset.warrantyEnd} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-md px-3 py-2">
            <Barcode size={14} /> {asset.tag} · scan-ready for check-in / check-out
          </div>

          {asset.isBundle && children.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Bundle Components ({children.length})
              </div>
              <div className="space-y-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpenChild(c)}
                    className="w-full flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 hover:border-slate-300 text-left"
                  >
                    <div>
                      <div className="text-sm text-slate-800">{c.category} — {c.model}</div>
                      <Tag>{c.tag}</Tag>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {asset.parentId && (
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
              Part of bundle <Tag>{asset.parentId}</Tag>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Assets({ company, search }: { company: string; search: string }) {
  const [selected, setSelected] = useState<Asset | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  const topLevel = ASSETS.filter((a) => !a.parentId);
  const categories = ["All Categories", ...Array.from(new Set(topLevel.map((a) => a.category)))];

  const filtered = topLevel.filter(
    (a) =>
      (company === "All Companies" || a.company === company) &&
      (categoryFilter === "All Categories" || a.category === categoryFilter) &&
      (a.model.toLowerCase().includes(search.toLowerCase()) ||
        a.tag.toLowerCase().includes(search.toLowerCase()) ||
        a.owner.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-slate-400">{filtered.length} assets</div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-700">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Asset</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Warranty End</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} onClick={() => setSelected(a)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-800">{a.manufacturer} {a.model}</div>
                  <Tag>{a.tag}</Tag>
                  {a.isBundle && <span className="ml-2 text-[11px] text-indigo-500">bundle · 4 components</span>}
                </td>
                <td className="px-5 py-3 text-slate-600">{a.category}</td>
                <td className="px-5 py-3 text-slate-600">{a.owner}</td>
                <td className="px-5 py-3 text-slate-600">{a.company}</td>
                <td className="px-5 py-3"><StatusPill status={a.status} /></td>
                <td className="px-5 py-3 text-slate-500">{a.warrantyEnd}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No assets match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <Detail asset={selected} onClose={() => setSelected(null)} onOpenChild={(c) => setSelected(c)} />}
    </div>
  );
}
