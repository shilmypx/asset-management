import React from "react";
import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../lib/AuthGate";
import { LayoutDashboard, Building2, Users, Laptop, Settings, Network, ShieldCheck, UserCog, ListTree, MapPin, SlidersHorizontal, ScanBarcode, ShoppingCart, UserCheck, KeyRound, Router, Wrench, FileText, AlertCircle, BarChart3, Printer, Zap, ScanLine } from "lucide-react";

// `module` is what gates visibility — can(module, "view"). Screens with no
// module (Org Structure) are organizational context everyone should be
// able to see, so they're left unrestricted rather than force-mapped to a
// module that doesn't really fit. Self-Service is deliberately
// unrestricted too — it's the employee-facing request portal, meant for
// every employee, not just people with a "requests" permission; the
// Approval Queue tab inside it checks requests:approve on its own instead.
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, module: "dashboard" },
  { to: "/org", label: "Org Structure", icon: Building2, module: null },
  { to: "/employees", label: "Employees", icon: Users, module: "employees" },
  { to: "/assets", label: "Hardware Assets", icon: Laptop, module: "hardware_assets" },
  { to: "/checkout", label: "Check-Out / Check-In", icon: ScanBarcode, module: "hardware_assets" },
  { to: "/procurement", label: "Procurement", icon: ShoppingCart, module: "procurement" },
  { to: "/self-service", label: "Self-Service", icon: UserCheck, module: null },
  { to: "/software", label: "Software & SaaS Licenses", icon: KeyRound, module: "software_licenses" },
  { to: "/network", label: "Network Components", icon: Router, module: "network" },
  { to: "/repairs", label: "Repair & Maintenance", icon: Wrench, module: "repairs" },
  { to: "/contracts", label: "Contracts & Warranty", icon: FileText, module: "contracts" },
  { to: "/itsm", label: "Incidents / Problems / Changes", icon: AlertCircle, module: "incidents" },
  { to: "/audit", label: "Inventory Audit", icon: ScanLine, module: "inventory_audit" },
  { to: "/reports", label: "Reports", icon: BarChart3, module: "reports" },
  { to: "/barcodes", label: "Barcode Printing", icon: Printer, module: "hardware_assets" },
];

const ADMIN_NAV = [
  { to: "/admin/companies", label: "Companies", icon: Building2, module: "settings" },
  { to: "/admin/org-units", label: "Org Units", icon: Network, module: "settings" },
  { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, module: "settings" },
  { to: "/admin/automation-rules", label: "Automation Rules", icon: Zap, module: "automation_rules" },
  { to: "/admin/users", label: "Users", icon: UserCog, module: "settings" },
  { to: "/admin/configuration", label: "Configuration", icon: SlidersHorizontal, module: "settings" },
  { to: "/admin/master-data", label: "Master Data", icon: ListTree, module: "settings" },
  { to: "/admin/org-settings", label: "Depts / Locations / Cost Centers", icon: MapPin, module: "settings" },
];

export default function Sidebar() {
  const { profile, signOut, isSupabaseConfigured, can } = useAuth();
  const visibleNav = NAV.filter((item) => !item.module || can(item.module, "view"));
  const visibleAdminNav = ADMIN_NAV.filter((item) => can(item.module, "view"));

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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
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

        {visibleAdminNav.length > 0 && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-white/30 flex items-center gap-1.5">
              <Settings size={11} /> System Admin
            </div>
            {visibleAdminNav.map((item) => {
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
        )}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        {profile ? (
          <div className="flex items-center justify-between">
            <div className="text-xs leading-tight">
              <div className="text-white/70">{profile.employeeName ?? profile.email}</div>
              <div className="text-white/30">{profile.roleNames.join(", ") || "No role assigned"}</div>
            </div>
            <button onClick={signOut} title="Sign out" className="text-white/40 hover:text-white/70">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-white/30">
            {isSupabaseConfigured ? "ITAMS v0.1 · Karawa Group" : "Demo mode · no backend connected"}
          </div>
        )}
      </div>
    </aside>
  );
}
