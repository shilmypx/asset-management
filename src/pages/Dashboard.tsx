import React, { useEffect, useMemo, useState } from "react";
import { Boxes, Laptop, TriangleAlert, ShieldCheck, Database, CircleDot } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Asset, STATUS_COLOR } from "../lib/mockData";
import { fetchAssets } from "../lib/api/assets";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { Tag } from "../components/Ui";
import GlobalSearch from "../components/GlobalSearch";

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
      </div>
      <div className="h-9 w-9 rounded-md flex items-center justify-center" style={{ backgroundColor: (accent || "#17B8A6") + "1A" }}>
        <Icon size={16} style={{ color: accent || "#17B8A6" }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[] | null>(null);

  useEffect(() => {
    fetchAssets().then(setAssets);
  }, []);

  const all = assets ?? [];

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    all.forEach((a) => (map[a.status] = (map[a.status] || 0) + 1));
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [all]);

  const byCompany = useMemo(() => {
    const map: Record<string, number> = {};
    all.forEach((a) => (map[a.company] = (map[a.company] || 0) + 1));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [all]);

  const total = all.length;
  const assigned = all.filter((a) => a.status === "Assigned").length;
  const repair = all.filter((a) => a.status === "Under Repair").length;
  const warrantySoon = all.filter((a) => a.warrantyEnd !== "—" && new Date(a.warrantyEnd) < new Date("2026-01-01")).length;
  const PIE_COLORS = ["#17B8A6", "#6366F1", "#F59E0B", "#94A3B8"];

  if (assets === null) {
    return <div className="p-8 text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <GlobalSearch />
      <div className="flex justify-end -mt-2">
        {isSupabaseConfigured ? (
          <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live — connected to Supabase</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Assets" value={total} icon={Boxes} />
        <KpiCard label="Assigned" value={assigned} icon={Laptop} accent="#6366F1" />
        <KpiCard label="Under Repair" value={repair} icon={TriangleAlert} accent="#F59E0B" />
        <KpiCard label="Warranty Expiring" value={warrantySoon} icon={ShieldCheck} accent="#EF4444" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm font-medium text-slate-700 mb-4">Assets by Status</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLOR[entry.status] || "#94A3B8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm font-medium text-slate-700 mb-4">Assets by Company</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCompany} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {byCompany.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="text-sm font-medium text-slate-700 mb-3">Recent Activity</div>
        <div className="text-xs text-slate-400 mb-2">
          Placeholder — wiring this to real data needs the audit_logs table (see db/schema.sql section 15), not yet queried anywhere in the app.
        </div>
        <ul className="text-sm text-slate-600 divide-y divide-slate-100">
          <li className="py-2 flex justify-between"><span><Tag>AST-00232</Tag> sent for repair — MacBook Pro 14</span><span className="text-slate-400">2 days ago</span></li>
          <li className="py-2 flex justify-between"><span><Tag>AST-00301</Tag> bundle assigned to Fatima Nasser</span><span className="text-slate-400">5 days ago</span></li>
          <li className="py-2 flex justify-between"><span>New employee <span className="font-medium text-slate-700">Sara Idris</span> onboarded — Joy</span><span className="text-slate-400">1 week ago</span></li>
          <li className="py-2 flex justify-between"><span><Tag>AST-00098</Tag> disposed — certificate on file</span><span className="text-slate-400">3 weeks ago</span></li>
        </ul>
      </div>
    </div>
  );
}
