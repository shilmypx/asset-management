import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthGate";
import { X, Database, CircleDot, Network, Plus } from "lucide-react";
import { Asset } from "../lib/mockData";
import { fetchAssets } from "../lib/api/assets";
import { fetchNetworkDetails, fetchRelationships, fetchAllRelationships, createRelationship, isNetworkCategory, NetworkDetail, Relationship } from "../lib/api/network";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { StatusPill, Tag } from "../components/Ui";

function TopologyGraph({ assets, relationships }: { assets: Asset[]; relationships: Relationship[] }) {
  const size = 520;
  const center = size / 2;
  const radius = size / 2 - 70;
  const positions: Record<string, { x: number; y: number }> = {};
  assets.forEach((a, i) => {
    const angle = (i / Math.max(assets.length, 1)) * 2 * Math.PI - Math.PI / 2;
    positions[a.id] = { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  });

  const EDGE_COLOR: Record<string, string> = { connected_to: "#94A3B8", depends_on: "#F59E0B", runs_on: "#6366F1", located_in: "#17B8A6" };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
        {Object.entries(EDGE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: color }} /> {type.replace("_", " ")}</div>
        ))}
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xl mx-auto">
        {relationships.map((r) => {
          const s = positions[r.source_asset_id];
          const t = positions[r.target_asset_id];
          if (!s || !t) return null;
          return <line key={r.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={EDGE_COLOR[r.relationship_type] ?? "#CBD5E1"} strokeWidth={1.5} />;
        })}
        {assets.map((a) => {
          const p = positions[a.id];
          if (!p) return null;
          return (
            <g key={a.id}>
              <circle cx={p.x} cy={p.y} r={22} fill="#F5F6F8" stroke="#17B8A6" strokeWidth={1.5} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9} fill="#0E8478" fontWeight={600}>{a.category.slice(0, 3).toUpperCase()}</text>
              <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize={9} fill="#64748B">{a.tag}</text>
            </g>
          );
        })}
      </svg>
      {relationships.length === 0 && <div className="text-xs text-slate-400 text-center py-8">No relationships mapped yet — add some from a device's detail panel.</div>}
    </div>
  );
}

export default function NetworkComponents() {
  const { can } = useAuth();
  const [viewMode, setViewMode] = useState<"list" | "topology">("list");
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [details, setDetails] = useState<Record<string, NetworkDetail>>({});
  const [selected, setSelected] = useState<Asset | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [targetId, setTargetId] = useState("");
  const [relType, setRelType] = useState("connected_to");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets().then(async (all) => {
      const netAssets = all.filter((a) => isNetworkCategory(a.category));
      setAssets(netAssets);
      const d = await fetchNetworkDetails(netAssets.map((a) => a.id));
      setDetails(d);
    });
    fetchAllRelationships().then(setAllRelationships);
  }, []);

  useEffect(() => {
    if (selected) fetchRelationships(selected.id).then(setRelationships);
  }, [selected]);

  async function handleAddRelationship(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !targetId) return;
    setError(null);
    try {
      await createRelationship(selected.id, targetId, relType);
      setTargetId("");
      await fetchRelationships(selected.id).then(setRelationships);
      await fetchAllRelationships().then(setAllRelationships);
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400">{assets.length} network components</div>
          <div className="flex border border-slate-200 rounded-md overflow-hidden text-xs">
            <button onClick={() => setViewMode("list")} className={`px-2.5 py-1 ${viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-500"}`}>List</button>
            <button onClick={() => setViewMode("topology")} className={`px-2.5 py-1 ${viewMode === "topology" ? "bg-slate-900 text-white" : "text-slate-500"}`}>Topology</button>
          </div>
        </div>
        {isSupabaseConfigured ? (
          <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
        )}
      </div>

      {viewMode === "list" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">IP Address</th>
                <th className="px-5 py-3 font-medium">Rack</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const d = details[a.id];
                return (
                  <tr key={a.id} onClick={() => setSelected(a)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{a.manufacturer} {a.model}</div>
                      <Tag>{a.tag}</Tag>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{a.category}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">{d?.ip_address ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{d?.rack_name ?? "—"}</td>
                    <td className="px-5 py-3"><StatusPill status={a.status} /></td>
                  </tr>
                );
              })}
              {assets.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No network components yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "topology" && <TopologyGraph assets={assets} relationships={allRelationships} />}

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={() => setSelected(null)}>
          <div className="w-[440px] bg-white h-full shadow-xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{selected.manufacturer} {selected.model}</div>
                <Tag>{selected.tag}</Tag>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <div><div className="text-xs text-slate-400">IP Address</div><div className="font-mono text-xs text-slate-700">{details[selected.id]?.ip_address ?? "—"}</div></div>
              <div><div className="text-xs text-slate-400">MAC Address</div><div className="font-mono text-xs text-slate-700">{details[selected.id]?.mac_address ?? "—"}</div></div>
              <div><div className="text-xs text-slate-400">Firmware</div><div className="text-slate-700">{details[selected.id]?.firmware_version ?? "—"}</div></div>
              <div><div className="text-xs text-slate-400">Rack</div><div className="text-slate-700">{details[selected.id]?.rack_name ?? "—"}</div></div>
            </div>

            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Network size={12} /> Relationship map</div>
            <div className="space-y-2 mb-3">
              {relationships.map((r) => {
                const isSource = r.source_asset_id === selected.id;
                const other = isSource ? r.target_name : r.source_name;
                return (
                  <div key={r.id} className="text-sm text-slate-600 border border-slate-100 rounded-md px-3 py-2">
                    {isSource ? "This device" : other} <span className="text-accent-dark">{r.relationship_type.replace("_", " ")}</span> {isSource ? other : "this device"}
                  </div>
                );
              })}
              {relationships.length === 0 && <div className="text-xs text-slate-400">No relationships mapped yet.</div>}
            </div>

            <form onSubmit={handleAddRelationship} className="flex items-end gap-2 flex-wrap">
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-xs flex-1">
                <option value="">Connects to…</option>
                {assets.filter((a) => a.id !== selected.id).map((a) => <option key={a.id} value={a.id}>{a.manufacturer} {a.model}</option>)}
              </select>
              <select value={relType} onChange={(e) => setRelType(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                <option value="connected_to">connected to</option>
                <option value="depends_on">depends on</option>
                <option value="runs_on">runs on</option>
              </select>
              <button disabled={!isSupabaseConfigured || !can("network", "add")} className="text-xs bg-slate-900 text-white px-2 py-1.5 rounded-md disabled:opacity-40 flex items-center gap-1"><Plus size={12} /> Add</button>
            </form>
            {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
