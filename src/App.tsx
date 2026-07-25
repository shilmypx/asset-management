import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import OrgStructure from "./pages/OrgStructure";
import Employees from "./pages/Employees";
import Assets from "./pages/Assets";
import CompaniesAdmin from "./pages/admin/Companies";
import OrgUnitsAdmin from "./pages/admin/OrgUnits";
import RolesAdmin from "./pages/admin/Roles";
import UsersAdmin from "./pages/admin/Users";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/org": "Org Structure",
  "/employees": "Employees",
  "/assets": "Hardware Assets",
  "/admin/companies": "Admin · Companies",
  "/admin/org-units": "Admin · Org Units",
  "/admin/roles": "Admin · Roles & Permissions",
  "/admin/users": "Admin · Users",
};

export default function App() {
  const [company, setCompany] = useState("All Companies");
  const [search, setSearch] = useState("");
  const location = useLocation();
  const showSearch = location.pathname === "/employees" || location.pathname === "/assets";

  return (
    <div className="flex h-screen w-full bg-[#F5F6F8]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <TopBar
          title={TITLES[location.pathname] ?? "ITAMS"}
          company={company}
          setCompany={setCompany}
          search={search}
          setSearch={setSearch}
          showSearch={showSearch}
        />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/org" element={<OrgStructure />} />
          <Route path="/employees" element={<Employees company={company} search={search} />} />
          <Route path="/assets" element={<Assets company={company} search={search} />} />
          <Route path="/admin/companies" element={<CompaniesAdmin />} />
          <Route path="/admin/org-units" element={<OrgUnitsAdmin />} />
          <Route path="/admin/roles" element={<RolesAdmin />} />
          <Route path="/admin/users" element={<UsersAdmin />} />
        </Routes>
      </div>
    </div>
  );
}
