import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ScanBarcode, ArrowRightLeft, Database, CircleDot, CheckCircle2, Camera, User, Building2, MapPin } from "lucide-react";
import { Asset, Employee } from "../lib/mockData";
import { fetchAssets } from "../lib/api/assets";
import { fetchEmployees } from "../lib/api/employees";
import { fetchLookup } from "../lib/api/lookups";
import { fetchDepartments, fetchLocations, Department, Location } from "../lib/api/orgSettings";
import { fetchCompanies } from "../lib/api/org";
import { checkOutAsset, checkInAsset, AssignableOwnerType } from "../lib/api/checkout";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthGate";
import { StatusPill, Tag } from "../components/Ui";
import CameraScanner from "../components/CameraScanner";

type Tab = "checkout" | "checkin";

const OWNER_TYPES: { value: AssignableOwnerType; label: string; icon: any }[] = [
  { value: "employee", label: "Employee", icon: User },
  { value: "department", label: "Department", icon: Building2 },
  { value: "location", label: "Location", icon: MapPin },
];

export default function CheckOutCheckIn() {
  const { can } = useAuth();
  const location = useLocation();
  const prefill = location.state as { prefillAssetId?: string; tab?: Tab } | null;
  const [tab, setTab] = useState<Tab>(prefill?.tab ?? "checkout");
  const [showScanner, setShowScanner] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<(Location & { companyName?: string })[]>([]);
  const [statusIds, setStatusIds] = useState<Record<string, string>>({});
  const [ownerType, setOwnerType] = useState<AssignableOwnerType>("employee");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [condition, setCondition] = useState("Good");
  const [remarks, setRemarks] = useState("");
  const [accessories, setAccessories] = useState<Record<string, boolean>>({ Charger: false, Bag: false, Mouse: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = () => fetchAssets().then(setAssets);

  useEffect(() => {
    reload();
    fetchEmployees().then(setEmployees);
    fetchDepartments().then(setDepartments);
    fetchLookup("asset_statuses").then((rows) => {
      const map: Record<string, string> = {};
      rows.forEach((r) => (map[r.name] = r.id));
      setStatusIds(map);
    });
    // Locations are company-scoped, but "assign to location" is common
    // across companies (a printer sits in a location regardless of which
    // company's checkout screen you're on) — so pull every company's
    // locations and show them with the company name inline, rather than
    // forcing a separate company picker before you can even see the list.
    fetchCompanies().then(async (companies) => {
      const all = await Promise.all(companies.map(async (c) => (await fetchLocations(c.id)).map((l) => ({ ...l, companyName: c.name }))));
      setLocations(all.flat());
    });
  }, []);

  useEffect(() => {
    if (prefill?.prefillAssetId) setSelectedAssetId(prefill.prefillAssetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  const availableAssets = assets.filter((a) => a.status === "Available");
  const assignedAssets = assets.filter((a) => a.status === "Assigned");

  async function handleCheckOut(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null); setSaving(true);
    try {
      await checkOutAsset(selectedAssetId, ownerType, selectedOwnerId, statusIds["Assigned"]);
      setSuccess("Asset checked out.");
      setSelectedAssetId(""); setSelectedOwnerId("");
      await reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to check out.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null); setSaving(true);
    try {
      await checkInAsset(selectedAssetId, statusIds["Available"], condition, remarks);
      setSuccess(condition === "Good" ? "Asset checked in — back in inventory." : "Asset checked in — flagged for repair.");
      setSelectedAssetId(""); setCondition("Good"); setRemarks("");
      await reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to check in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
        <button onClick={() => { setTab("checkout"); setSelectedAssetId(""); setError(null); setSuccess(null); }} className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${tab === "checkout" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>
          <ArrowRightLeft size={14} /> Check-Out
        </button>
        <button onClick={() => { setTab("checkin"); setSelectedAssetId(""); setError(null); setSuccess(null); }} className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${tab === "checkin" ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}>
          <ScanBarcode size={14} /> Check-In
        </button>
        <div className="ml-auto pb-2">
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — assignment disabled until Supabase is connected</span>
          )}
        </div>
      </div>

      {tab === "checkout" && (
        <form onSubmit={handleCheckOut} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Assign to</label>
            <div className="flex border border-slate-200 rounded-md overflow-hidden w-fit">
              {OWNER_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setOwnerType(t.value); setSelectedOwnerId(""); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${ownerType === t.value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    <Icon size={12} /> {t.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {ownerType === "employee" ? "Assigned to a person — laptops, phones, individually-issued gear." : "Shared equipment (printers, dashboard monitors, pen drives) that belongs to a place or team, not one person."}
            </div>
          </div>

          {ownerType === "employee" && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Select employee</label>
              <select required value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">Select…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.company}</option>)}
              </select>
            </div>
          )}
          {ownerType === "department" && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Select department</label>
              <select required value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">Select…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}{d.is_shared ? " (shared across companies)" : ""}</option>)}
              </select>
            </div>
          )}
          {ownerType === "location" && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Select location</label>
              <select required value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">Select…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.companyName}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500 block mb-1">Select asset (barcode-scan target)</label>
            <div className="flex items-center gap-2">
              <select required value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">Select…</option>
                {availableAssets.map((a) => <option key={a.id} value={a.id}>{a.tag} — {a.manufacturer} {a.model}</option>)}
              </select>
              <button type="button" onClick={() => setShowScanner(true)} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 shrink-0"><Camera size={13} /> Scan</button>
            </div>
            {availableAssets.length === 0 && <div className="text-xs text-slate-400 mt-1">No available assets to check out right now.</div>}
          </div>
          {selectedAssetId && (
            <div className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-md px-3 py-2">
              {(() => { const a = availableAssets.find((x) => x.id === selectedAssetId); return a ? <>Assigning <Tag>{a.tag}</Tag> — currently <StatusPill status={a.status} /></> : null; })()}
            </div>
          )}
          <button disabled={saving || !isSupabaseConfigured || !can("hardware_assets", "edit")} className="text-sm bg-accent text-white px-4 py-2 rounded-md disabled:opacity-40">
            {saving ? "Assigning…" : "Confirm check-out"}
          </button>
        </form>
      )}

      {tab === "checkin" && (
        <form onSubmit={handleCheckIn} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Scan / select asset</label>
            <div className="flex items-center gap-2">
              <select required value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">Select…</option>
                {assignedAssets.map((a) => <option key={a.id} value={a.id}>{a.tag} — {a.manufacturer} {a.model} (with {a.owner})</option>)}
              </select>
              <button type="button" onClick={() => setShowScanner(true)} className="flex items-center gap-1 text-xs border border-slate-200 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 shrink-0"><Camera size={13} /> Scan</button>
            </div>
            {assignedAssets.length === 0 && <div className="text-xs text-slate-400 mt-1">No assigned assets to check in right now.</div>}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
              <option>Good</option>
              <option>Damaged</option>
              <option>Needs Repair</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Accessories returned</label>
            <div className="flex gap-4">
              {Object.keys(accessories).map((key) => (
                <label key={key} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input type="checkbox" checked={accessories[key]} onChange={(e) => setAccessories({ ...accessories, [key]: e.target.checked })} /> {key}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <button disabled={saving || !isSupabaseConfigured || !can("hardware_assets", "edit")} className="text-sm bg-accent text-white px-4 py-2 rounded-md disabled:opacity-40">
            {saving ? "Processing…" : "Complete check-in"}
          </button>
        </form>
      )}

      {success && <div className="flex items-center gap-1.5 text-sm text-emerald-600 mt-3"><CheckCircle2 size={14} /> {success}</div>}
      {error && <div className="text-sm text-red-500 mt-3">{error}</div>}

      {showScanner && (
        <CameraScanner
          onClose={() => setShowScanner(false)}
          onDetected={(code) => {
            const pool = tab === "checkout" ? availableAssets : assignedAssets;
            const match = pool.find((a) => a.tag === code);
            if (match) setSelectedAssetId(match.id);
            else setError(`Scanned "${code}" doesn't match any ${tab === "checkout" ? "available" : "assigned"} asset.`);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}
