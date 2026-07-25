import React, { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Database, CircleDot } from "lucide-react";
import { fetchCompanies, fetchOrgUnits, CompanyRow, OrgUnitRow } from "../lib/api/org";
import { isSupabaseConfigured } from "../lib/supabaseClient";

type TreeNode = OrgUnitRow & { children: TreeNode[] };

function buildTree(units: OrgUnitRow[]): TreeNode[] {
  const byId: Record<string, TreeNode> = {};
  units.forEach((u) => (byId[u.id] = { ...u, children: [] }));
  const roots: TreeNode[] = [];
  units.forEach((u) => {
    const node = byId[u.id];
    if (u.parent_org_unit_id && byId[u.parent_org_unit_id]) {
      byId[u.parent_org_unit_id].children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function UnitNode({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
        style={{ paddingLeft: depth * 22 + 8 }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />
        ) : (
          <span className="w-3.5" />
        )}
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        <span className="text-sm text-slate-700">{node.name}</span>
        <span className="text-[11px] text-slate-400">{node.type.replace("_", " ")}</span>
      </div>
      {hasChildren && open && node.children.map((c) => <UnitNode key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

function CompanyBlock({ company }: { company: CompanyRow }) {
  const [units, setUnits] = useState<OrgUnitRow[] | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetchOrgUnits(company.id).then(setUnits);
  }, [company.id]);

  const tree = units ? buildTree(units) : [];

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-2 cursor-pointer" onClick={() => setOpen(!open)}>
        {tree.length > 0 ? (
          open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
        ) : (
          <span className="w-3.5" />
        )}
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="font-semibold text-slate-900">{company.name}</span>
        {company.is_parent && <span className="text-xs text-slate-400 ml-2">Parent Company</span>}
        {!company.is_parent && <span className="text-xs text-slate-400 ml-2">Sister Company</span>}
      </div>
      {open && units === null && <div className="text-xs text-slate-400 pl-8 pb-2">Loading…</div>}
      {open && tree.map((n) => <UnitNode key={n.id} node={n} depth={1} />)}
    </div>
  );
}

export default function OrgStructure() {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null);

  useEffect(() => {
    fetchCompanies().then(setCompanies);
  }, []);

  return (
    <div className="p-8">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium text-slate-700">Company Hierarchy</div>
          <div className="flex items-center gap-1.5 text-xs">
            {isSupabaseConfigured ? (
              <span className="flex items-center gap-1 text-accent-dark"><Database size={12} /> Live — connected to Supabase</span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400"><CircleDot size={12} /> Demo data — connect Supabase to persist changes</span>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-400 mb-4">
          Karawa (parent, shared IT/HR/Finance) → O2 Café (branches) · Joy &amp; JOT Events (business units → divisions)
        </div>
        {companies === null && <div className="text-sm text-slate-400">Loading…</div>}
        {companies?.map((c) => (
          <CompanyBlock key={c.id} company={c} />
        ))}
      </div>
    </div>
  );
}
