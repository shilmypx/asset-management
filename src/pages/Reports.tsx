import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthGate";
import { Download, FileBarChart, Printer } from "lucide-react";
import { fetchAssets } from "../lib/api/assets";
import { fetchEmployees } from "../lib/api/employees";
import { fetchLicenses } from "../lib/api/software";
import { fetchContracts } from "../lib/api/contracts";
import { Asset, Employee } from "../lib/mockData";
import { License } from "../lib/api/software";
import { Contract } from "../lib/api/contracts";
import { exportToCsv } from "../lib/csv";
import { StatusPill, Tag } from "../components/Ui";

type ReportId = "assets_by_company" | "warranty" | "disposed" | "employee_assets" | "license_renewals" | "contract_renewals";

const REPORTS: { id: ReportId; label: string; description: string }[] = [
  { id: "assets_by_company", label: "Assets by Company", description: "Full asset register grouped by company" },
  { id: "warranty", label: "Warranty Report", description: "All assets with warranty end dates, soonest first" },
  { id: "disposed", label: "Disposed Assets", description: "Everything marked Disposed" },
  { id: "employee_assets", label: "Employee Assets", description: "Every employee and what's currently assigned to them" },
  { id: "license_renewals", label: "Upcoming License Renewals", description: "Software licenses sorted by renewal date" },
  { id: "contract_renewals", label: "Contract Renewals", description: "Vendor/AMC/support contracts sorted by renewal date" },
];

export default function Reports() {
  const { can } = useAuth();
  const [active, setActive] = useState<ReportId>("assets_by_company");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    fetchAssets().then(setAssets);
    fetchEmployees().then(setEmployees);
    fetchLicenses().then(setLicenses);
    fetchContracts().then(setContracts);
  }, []);

  function handleExport() {
    if (active === "assets_by_company") exportToCsv("assets-by-company.csv", assets.map((a) => ({ tag: a.tag, company: a.company, category: a.category, model: `${a.manufacturer} ${a.model}`, status: a.status, owner: a.owner })));
    if (active === "warranty") exportToCsv("warranty-report.csv", [...assets].filter((a) => a.warrantyEnd !== "—").sort((a, b) => a.warrantyEnd.localeCompare(b.warrantyEnd)).map((a) => ({ tag: a.tag, model: `${a.manufacturer} ${a.model}`, warranty_end: a.warrantyEnd, company: a.company })));
    if (active === "disposed") exportToCsv("disposed-assets.csv", assets.filter((a) => a.status === "Disposed").map((a) => ({ tag: a.tag, model: `${a.manufacturer} ${a.model}`, company: a.company, purchase_date: a.purchaseDate })));
    if (active === "employee_assets") exportToCsv("employee-assets.csv", employees.map((e) => ({ employee: e.name, company: e.company, assets: assets.filter((a) => a.owner === e.name).map((a) => a.tag).join("; ") || "none" })));
    if (active === "license_renewals") exportToCsv("license-renewals.csv", licenses.map((l) => ({ software: l.software_name, company: l.company_name, renewal: l.renewal_date ?? "perpetual", seats: `${l.seats_used}/${l.seats_purchased}` })));
    if (active === "contract_renewals") exportToCsv("contract-renewals.csv", contracts.map((c) => ({ title: c.title, company: c.company_name, type: c.contract_type, renewal: c.renewal_date ?? "—", auto_renew: c.auto_renew })));
  }

  return (
    <div className="p-8">
      <div className="grid grid-cols-4 gap-4 print:block">
        <div className="col-span-1 space-y-1 no-print">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => setActive(r.id)} className={`w-full text-left px-3 py-2.5 rounded-md text-sm ${active === r.id ? "bg-accent/10 text-accent-dark font-medium" : "text-slate-600 hover:bg-slate-50"}`}>
              <div className="flex items-center gap-2"><FileBarChart size={14} /> {r.label}</div>
            </button>
          ))}
        </div>

        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3 no-print">
            <div>
              <div className="text-sm font-medium text-slate-800">{REPORTS.find((r) => r.id === active)?.label}</div>
              <div className="text-xs text-slate-400">{REPORTS.find((r) => r.id === active)?.description}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} disabled={!can("reports", "print")} className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md disabled:opacity-40">
                <Printer size={14} /> Print / Save as PDF
              </button>
              <button onClick={handleExport} disabled={!can("reports", "export")} className="flex items-center gap-1.5 text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md disabled:opacity-40">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {active === "assets_by_company" && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-4 py-2.5">Asset</th><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Owner</th><th className="px-4 py-2.5">Status</th></tr></thead>
                <tbody>{assets.map((a) => <tr key={a.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2"><Tag>{a.tag}</Tag> {a.manufacturer} {a.model}</td><td className="px-4 py-2 text-slate-600">{a.company}</td><td className="px-4 py-2 text-slate-600">{a.owner}</td><td className="px-4 py-2"><StatusPill status={a.status} /></td></tr>)}</tbody>
              </table>
            )}
            {active === "warranty" && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-4 py-2.5">Asset</th><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Warranty End</th></tr></thead>
                <tbody>{[...assets].filter((a) => a.warrantyEnd !== "—").sort((a, b) => a.warrantyEnd.localeCompare(b.warrantyEnd)).map((a) => <tr key={a.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2"><Tag>{a.tag}</Tag> {a.manufacturer} {a.model}</td><td className="px-4 py-2 text-slate-600">{a.company}</td><td className="px-4 py-2 text-slate-600">{a.warrantyEnd}</td></tr>)}</tbody>
              </table>
            )}
            {active === "disposed" && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-4 py-2.5">Asset</th><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Purchase Date</th></tr></thead>
                <tbody>{assets.filter((a) => a.status === "Disposed").map((a) => <tr key={a.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2"><Tag>{a.tag}</Tag> {a.manufacturer} {a.model}</td><td className="px-4 py-2 text-slate-600">{a.company}</td><td className="px-4 py-2 text-slate-600">{a.purchaseDate}</td></tr>)}</tbody>
              </table>
            )}
            {active === "employee_assets" && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-4 py-2.5">Employee</th><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Assets</th></tr></thead>
                <tbody>{employees.map((e) => { const owned = assets.filter((a) => a.owner === e.name); return <tr key={e.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2 font-medium text-slate-700">{e.name}</td><td className="px-4 py-2 text-slate-600">{e.company}</td><td className="px-4 py-2 text-slate-600">{owned.length ? owned.map((a) => a.tag).join(", ") : <span className="text-slate-300">none</span>}</td></tr>; })}</tbody>
              </table>
            )}
            {active === "license_renewals" && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-4 py-2.5">Software</th><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Renewal</th><th className="px-4 py-2.5">Seats</th></tr></thead>
                <tbody>{[...licenses].sort((a, b) => (a.renewal_date ?? "9999").localeCompare(b.renewal_date ?? "9999")).map((l) => <tr key={l.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2 font-medium text-slate-700">{l.software_name}</td><td className="px-4 py-2 text-slate-600">{l.company_name}</td><td className="px-4 py-2 text-slate-600">{l.renewal_date ?? "Perpetual"}</td><td className="px-4 py-2 text-slate-600">{l.seats_used}/{l.seats_purchased}</td></tr>)}</tbody>
              </table>
            )}
            {active === "contract_renewals" && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50"><th className="px-4 py-2.5">Contract</th><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Renewal</th></tr></thead>
                <tbody>{[...contracts].sort((a, b) => (a.renewal_date ?? "9999").localeCompare(b.renewal_date ?? "9999")).map((c) => <tr key={c.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2 font-medium text-slate-700">{c.title}</td><td className="px-4 py-2 text-slate-600">{c.company_name}</td><td className="px-4 py-2 text-slate-600 capitalize">{c.contract_type.replace("_", " ")}</td><td className="px-4 py-2 text-slate-600">{c.renewal_date ?? "—"}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
