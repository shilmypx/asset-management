import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import OrgStructure from "./pages/OrgStructure";
import Employees from "./pages/Employees";
import Assets from "./pages/Assets";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/org": "Org Structure",
  "/employees": "Employees",
  "/assets": "Hardware Assets",
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
        </Routes>
      </div>
    </div>
  );
}
