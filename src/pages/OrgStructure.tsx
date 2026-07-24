import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ORG, OrgNode } from "../lib/mockData";

function Node({ node, depth }: { node: OrgNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 rounded-md hover:bg-slate-50 cursor-pointer"
        style={{ paddingLeft: depth * 22 + 8 }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
        ) : (
          <span className="w-3.5" />
        )}
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: depth === 0 ? "#17B8A6" : depth === 1 ? "#6366F1" : "#CBD5E1" }} />
        <span className={depth === 0 ? "font-semibold text-slate-900" : "text-slate-700"}>{node.name}</span>
        {node.tag && <span className="text-xs text-slate-400 ml-2">{node.tag}</span>}
        {node.shared && <span className="text-xs text-slate-400 ml-2">shared: {node.shared.join(", ")}</span>}
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgStructure() {
  return (
    <div className="p-8">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="text-sm font-medium text-slate-700 mb-1">Company Hierarchy</div>
        <div className="text-xs text-slate-400 mb-4">
          Karawa (parent, shared IT/HR/Finance) → O2 Café (branches) · Joy &amp; JOT Events (business units → divisions)
        </div>
        {ORG.map((c) => (
          <Node key={c.id} node={c} depth={0} />
        ))}
      </div>
    </div>
  );
}
