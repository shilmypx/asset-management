import React from "react";
import { Search } from "lucide-react";
import { COMPANIES } from "../lib/mockData";

type Props = {
  title: string;
  company: string;
  setCompany: (v: string) => void;
  search?: string;
  setSearch?: (v: string) => void;
  showSearch?: boolean;
};

export default function TopBar({ title, company, setCompany, search, setSearch, showSearch }: Props) {
  return (
    <div className="no-print flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        {showSearch && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch?.(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
            />
          </div>
        )}
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-700"
        >
          {COMPANIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
