import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot, AlertCircle, X } from "lucide-react";
import {
  fetchIncidents, fetchTimeline, createIncident, addTimelineEntry, updateIncidentStatus,
  fetchProblems, createProblem, fetchChanges, createChange, Incident, TimelineEntry, Problem, Change,
} from "../lib/api/itsm";
import { fetchEmployees } from "../lib/api/employees";
import { fetchAssets } from "../lib/api/assets";
import { fetchLookup } from "../lib/api/lookups";
import { Employee, Asset } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { Tag } from "../components/Ui";

const PRIORITY_STYLE: Record<string, string> = { High: "bg-red-50 text-red-500", Medium: "bg-amber-50 text-amber-600", Low: "bg-slate-100 text-slate-500" };
const STATUS_STYLE: Record<string, string> = { Open: "bg-slate-100 text-slate-500", "In Progress": "bg-amber-50 text-amber-600", Resolved: "bg-emerald-50 text-emerald-600", Closed: "bg-slate-100 text-slate-400" };

function IncidentsTab() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [priorities, setPriorities] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [incidentNumber, setIncidentNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchIncidents().then(setIncidents);
  useEffect(() => {
    load();
    fetchEmployees().then(setEmployees);
    fetchAssets().then(setAssets);
  }, []);

  useEffect(() => { if (selected) fetchTimeline(selected.id).then(setTimeline); }, [selected]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createIncident({ incident_number: incidentNumber, employee_id: employeeId || null, asset_id: assetId || null, priority_id: priorityId, status: "Open" });
      setIncidentNumber(""); setEmployeeId(""); setAssetId(""); setShowAdd(false);
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to save."); }
  }

  async function handleAddNote() {
    if (!selected || !newNote) return;
    try {
      await addTimelineEntry(selected.id, newNote);
      setNewNote("");
      await fetchTimeline(selected.id).then(setTimeline);
    } catch (err: any) { setError(err.message ?? "Failed to add note."); }
  }

  async function handleStatusChange(status: string) {
    if (!selected) return;
    try {
      await updateIncidentStatus(selected.id, status);
      setSelected({ ...selected, status });
      await load();
    } catch (err: any) { setError(err.message ?? "Failed to update status."); }
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> Create incident
        </button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <input required placeholder="INC-0143" value={incidentNumber} onChange={(e) => setIncidentNumber(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-28" />
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
            <option value="">Reporting employee…</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
            <option value="">Related asset (optional)…</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.tag}</option>)}
          </select>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3 font-medium">Incident</th><th className="px-5 py-3 font-medium">Reported by</th><th className="px-5 py-3 font-medium">Priority</th><th className="px-5 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {incidents === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {incidents?.map((i) => (
              <tr key={i.id} onClick={() => setSelected(i)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                <td className="px-5 py-3 font-medium text-slate-800">{i.incident_number}{i.asset_tag && <div className="text-xs text-slate-400 font-normal"><Tag>{i.asset_tag}</Tag></div>}</td>
                <td className="px-5 py-3 text-slate-600">{i.employee_name ?? "—"}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[i.priority] ?? "bg-slate-100 text-slate-500"}`}>{i.priority}</span></td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[i.status] ?? ""}`}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={() => setSelected(null)}>
          <div className="w-[440px] bg-white h-full shadow-xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{selected.incident_number}</div>
                <div className="text-sm text-slate-500">{selected.employee_name ?? "No reporter"} {selected.asset_tag ? `· ${selected.asset_tag}` : ""}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400"><X size={18} /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {["Open", "In Progress", "Resolved", "Closed"].map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)} disabled={!isSupabaseConfigured} className={`text-xs px-2 py-1 rounded-full disabled:opacity-40 ${selected.status === s ? STATUS_STYLE[s] : "bg-slate-50 text-slate-400"}`}>{s}</button>
              ))}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Timeline</div>
            <div className="space-y-2 mb-3">
              {timeline.map((t) => <div key={t.id} className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3"><div>{t.event_text}</div><div className="text-xs text-slate-400">{t.created_at}</div></div>)}
              {timeline.length === 0 && <div className="text-xs text-slate-400">No updates logged yet.</div>}
            </div>
            <div className="flex gap-2">
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add update…" className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
              <button onClick={handleAddNote} disabled={!isSupabaseConfigured} className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md disabled:opacity-40">Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProblemsTab() {
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");

  const load = () => fetchProblems().then(setProblems);
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await createProblem({ problem_number: number, title });
    setNumber(""); setTitle(""); setShowAdd(false);
    await load();
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd((s) => !s)} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md"><Plus size={14} /> Log problem</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3">
          <input required placeholder="PRB-0010" value={number} onChange={(e) => setNumber(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-28" />
          <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-5 py-3 font-medium">Problem</th><th className="px-5 py-3 font-medium">Known Error</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            {problems === null && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {problems?.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{p.problem_number}<div className="text-xs text-slate-400 font-normal">{p.title}</div></td>
                <td className="px-5 py-3 text-slate-600">{p.known_error ?? "—"}</td>
                <td className="px-5 py-3"><span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ChangesTab() {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [risk, setRisk] = useState("Low");
  const [scheduled, setScheduled] = useState("");

  const load = () => fetchChanges().then(setChanges);
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await createChange({ change_number: number, title, risk_level: risk, scheduled_at: scheduled || null });
    setNumber(""); setTitle(""); setScheduled(""); setShowAdd(false);
    await load();
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd((s) => !s)} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md"><Plus size={14} /> Request change</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <input required placeholder="CHG-0022" value={number} onChange={(e) => setNumber(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-28" />
          <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm flex-1" />
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <input type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-5 py-3 font-medium">Change</th><th className="px-5 py-3 font-medium">Risk</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Scheduled</th></tr></thead>
          <tbody>
            {changes === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {changes?.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{c.change_number}<div className="text-xs text-slate-400 font-normal">{c.title}</div></td>
                <td className="px-5 py-3 text-slate-600">{c.risk_level ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600 capitalize">{c.status}</td>
                <td className="px-5 py-3 text-slate-500">{c.scheduled_at ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ITSM() {
  const [tab, setTab] = useState<"incidents" | "problems" | "changes">("incidents");
  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
        <button onClick={() => setTab("incidents")} className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${tab === "incidents" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}><AlertCircle size={14} /> Incidents</button>
        <button onClick={() => setTab("problems")} className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === "problems" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>Problems</button>
        <button onClick={() => setTab("changes")} className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === "changes" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>Changes</button>
        <div className="ml-auto pb-2">
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
          )}
        </div>
      </div>
      {tab === "incidents" && <IncidentsTab />}
      {tab === "problems" && <ProblemsTab />}
      {tab === "changes" && <ChangesTab />}
    </div>
  );
}
