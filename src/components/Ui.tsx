import React from "react";
import { STATUS_COLOR } from "../lib/mockData";

export function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || "#94A3B8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c + "1A", color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {status}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-500 bg-slate-100 border border-slate-200"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
    >
      {children}
    </span>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  );
}
