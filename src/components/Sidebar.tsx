import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Laptop, Settings, Network, ShieldCheck, UserCog, ListTree, MapPin, ScanBarcode, ShoppingCart } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/org", label: "Org Structure", icon: Building2 },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/assets", label: "Hardware Assets", icon: Laptop },
  { to: "/checkout", label: "Check-Out / Check-In", icon: ScanBarcode },
  { to: "/procurement", label: "Procurement", icon: ShoppingCart },
];

const ADMIN_NAV = [
  { to: "/admin/companies", label: "Companies", icon: Building2 },
  { to: "/admin/org-units", label: "Org Units", icon: Network },
  { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
  { to: "/admin/users", label: "Users", icon: UserCog },
  { to: "/admin/master-data", label: "Master Data", icon: ListTree },
  { to: "/admin/org-settings", label: "Depts / Locations / Cost Centers", icon: MapPin },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-full flex flex-col" style={{ backgroundColor: "#12151C" }}>
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <div className="h-8 w-8 rounded-md flex items-center justify-center font-bold text-sm bg-accent text-[#062E29]">
          IT
        </div>
        <div>
          <div className="text-white text-sm font-semibold leading-tight">ITAMS</div>
          <div className="text-[11px] text-white/40 leading-tight">Karawa Group</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-accent/10 text-accent" : "text-white/60 hover:text-white/80"
                }`
              }
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}

        <div className="pt-4 mt-4 border-t border-white/10">
          <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-white/30 flex items-center gap-1.5">
            <Settings size={11} /> System Admin
          </div>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? "bg-accent/10 text-accent" : "text-white/60 hover:text-white/80"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-[11px] text-white/30">
        ITAMS v0.1 · Karawa Group
      </div>
    </aside>
  );
}
