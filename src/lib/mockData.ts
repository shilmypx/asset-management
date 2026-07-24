export type OrgNode = {
  id: string;
  name: string;
  tag?: string;
  shared?: string[];
  type?: "branch" | "business_unit" | "division";
  children?: OrgNode[];
};

function divisions(): OrgNode[] {
  return [
    { id: crypto.randomUUID(), name: "Sales & Administration", type: "division" },
    { id: crypto.randomUUID(), name: "Operations", type: "division" },
    { id: crypto.randomUUID(), name: "Delivery", type: "division" },
  ];
}

export const ORG: OrgNode[] = [
  { id: "karawa", name: "Karawa", tag: "Parent Company", shared: ["IT", "HR", "Finance"], children: [] },
  {
    id: "o2cafe",
    name: "O2 Café",
    tag: "Sister Company",
    children: [
      { id: "b1", name: "Branch 01", type: "branch" },
      { id: "b2", name: "Branch 02", type: "branch" },
      { id: "b3", name: "Branch 03", type: "branch" },
    ],
  },
  {
    id: "joy",
    name: "Joy",
    tag: "Sister Company",
    children: [
      { id: "joy-acronis", name: "Acronis", type: "business_unit", children: divisions() },
      { id: "joy-designing", name: "Designing", type: "business_unit", children: divisions() },
      { id: "joy-crafting", name: "Crafting", type: "business_unit", children: divisions() },
    ],
  },
  {
    id: "jot",
    name: "JOT Events",
    tag: "Sister Company",
    children: [
      { id: "jot-acronis", name: "Acronis", type: "business_unit", children: divisions() },
      { id: "jot-designing", name: "Designing", type: "business_unit", children: divisions() },
      { id: "jot-crafting", name: "Crafting", type: "business_unit", children: divisions() },
    ],
  },
];

export const COMPANIES = ["All Companies", "Karawa", "O2 Café", "Joy", "JOT Events"];

export type Employee = {
  id: string;
  name: string;
  company: string;
  dept: string;
  title: string;
  status: "Active" | "On Leave" | "Terminated";
  email: string;
  joined: string;
  manager: string;
};

export const EMPLOYEES: Employee[] = [
  { id: "E-1001", name: "Ahmed Al-Sayed", company: "Karawa", dept: "IT", title: "Systems Administrator", status: "Active", email: "ahmed.alsayed@karawa.qa", joined: "2021-03-14", manager: "—" },
  { id: "E-1002", name: "Fatima Nasser", company: "Karawa", dept: "HR", title: "HR Business Partner", status: "Active", email: "fatima.nasser@karawa.qa", joined: "2020-07-01", manager: "—" },
  { id: "E-1003", name: "Youssef Hariri", company: "Karawa", dept: "Finance", title: "Finance Analyst", status: "Active", email: "youssef.hariri@karawa.qa", joined: "2022-01-10", manager: "Fatima Nasser" },
  { id: "E-1004", name: "Layla Mansour", company: "O2 Café", dept: "Branch 01", title: "Branch Manager", status: "Active", email: "layla.mansour@o2cafe.qa", joined: "2019-11-20", manager: "—" },
  { id: "E-1005", name: "Omar Zayed", company: "O2 Café", dept: "Branch 02", title: "Barista Lead", status: "On Leave", email: "omar.zayed@o2cafe.qa", joined: "2023-02-05", manager: "Layla Mansour" },
  { id: "E-1006", name: "Noor Kassem", company: "Joy", dept: "Acronis · Sales & Administration", title: "Sales Executive", status: "Active", email: "noor.kassem@joy.qa", joined: "2022-09-12", manager: "—" },
  { id: "E-1007", name: "Hamza Rahim", company: "Joy", dept: "Designing · Operations", title: "Graphic Designer", status: "Active", email: "hamza.rahim@joy.qa", joined: "2021-06-18", manager: "Noor Kassem" },
  { id: "E-1008", name: "Sara Idris", company: "Joy", dept: "Crafting · Delivery", title: "Logistics Coordinator", status: "Active", email: "sara.idris@joy.qa", joined: "2023-04-02", manager: "—" },
  { id: "E-1009", name: "Khalid Barakat", company: "JOT Events", dept: "Acronis · Operations", title: "Event Producer", status: "Active", email: "khalid.barakat@jotevents.qa", joined: "2020-10-08", manager: "—" },
  { id: "E-1010", name: "Rania Fakhoury", company: "JOT Events", dept: "Designing · Sales & Administration", title: "Account Manager", status: "Terminated", email: "rania.fakhoury@jotevents.qa", joined: "2018-05-30", manager: "Khalid Barakat" },
];

export type AssetStatus = "Available" | "Assigned" | "Under Repair" | "Reserved" | "Disposed" | "Lost" | "Damaged";

export type Asset = {
  id: string;
  tag: string;
  category: string;
  manufacturer: string;
  model: string;
  serial: string;
  status: AssetStatus;
  company: string;
  owner: string;
  ownerType: string;
  location: string;
  purchaseDate: string;
  cost: string;
  warrantyEnd: string;
  parentId: string | null;
  isBundle?: boolean;
};

export const ASSETS: Asset[] = [
  { id: "AST-00231", tag: "KWA-LAP-00231", category: "Laptop", manufacturer: "Dell", model: "Latitude 5440", serial: "SN-DL5440-9921", status: "Assigned", company: "Karawa", owner: "Ahmed Al-Sayed", ownerType: "Employee", location: "Doha HQ · IT Floor", purchaseDate: "2023-08-01", cost: "3,450 QAR", warrantyEnd: "2026-08-01", parentId: null },
  { id: "AST-00232", tag: "KWA-LAP-00232", category: "Laptop", manufacturer: "Apple", model: "MacBook Pro 14", serial: "SN-MBP14-4471", status: "Under Repair", company: "Karawa", owner: "Youssef Hariri", ownerType: "Employee", location: "Doha HQ · Finance", purchaseDate: "2022-11-15", cost: "8,900 QAR", warrantyEnd: "2025-11-15", parentId: null },
  { id: "AST-00301", tag: "KWA-BND-00301", category: "Bundle", manufacturer: "Dell", model: "OptiPlex Desktop Bundle", serial: "—", status: "Assigned", company: "Karawa", owner: "Fatima Nasser", ownerType: "Employee", location: "Doha HQ · HR", purchaseDate: "2023-02-20", cost: "4,200 QAR", warrantyEnd: "2026-02-20", parentId: null, isBundle: true },
  { id: "AST-00302", tag: "KWA-CPU-00302", category: "Desktop", manufacturer: "Dell", model: "OptiPlex 7020 (CPU)", serial: "SN-OP7020-1123", status: "Assigned", company: "Karawa", owner: "Fatima Nasser", ownerType: "Employee", location: "Doha HQ · HR", purchaseDate: "2023-02-20", cost: "included", warrantyEnd: "2026-02-20", parentId: "AST-00301" },
  { id: "AST-00303", tag: "KWA-MON-00303", category: "Monitor", manufacturer: "Dell", model: "P2422H", serial: "SN-P2422H-2287", status: "Assigned", company: "Karawa", owner: "Fatima Nasser", ownerType: "Employee", location: "Doha HQ · HR", purchaseDate: "2023-02-20", cost: "included", warrantyEnd: "2026-02-20", parentId: "AST-00301" },
  { id: "AST-00304", tag: "KWA-KBD-00304", category: "Keyboard", manufacturer: "Dell", model: "KB216", serial: "SN-KB216-6650", status: "Assigned", company: "Karawa", owner: "Fatima Nasser", ownerType: "Employee", location: "Doha HQ · HR", purchaseDate: "2023-02-20", cost: "included", warrantyEnd: "—", parentId: "AST-00301" },
  { id: "AST-00305", tag: "KWA-MSE-00305", category: "Mouse", manufacturer: "Dell", model: "MS116", serial: "SN-MS116-8834", status: "Assigned", company: "Karawa", owner: "Fatima Nasser", ownerType: "Employee", location: "Doha HQ · HR", purchaseDate: "2023-02-20", cost: "included", warrantyEnd: "—", parentId: "AST-00301" },
  { id: "AST-00410", tag: "O2C-PRN-00410", category: "Printer", manufacturer: "HP", model: "LaserJet M404", serial: "SN-M404-3391", status: "Available", company: "O2 Café", owner: "Branch 02", ownerType: "Location", location: "O2 Café · Branch 02", purchaseDate: "2022-05-10", cost: "1,150 QAR", warrantyEnd: "2025-05-10", parentId: null },
  { id: "AST-00520", tag: "JOY-SRV-00520", category: "Server", manufacturer: "HPE", model: "ProLiant DL380", serial: "SN-DL380-7712", status: "Assigned", company: "Joy", owner: "Data Center Rack 3", ownerType: "Location", location: "Doha HQ · Data Center", purchaseDate: "2021-09-01", cost: "38,000 QAR", warrantyEnd: "2025-09-01", parentId: null },
  { id: "AST-00611", tag: "JOT-RTR-00611", category: "Router", manufacturer: "Cisco", model: "ISR 4331", serial: "SN-ISR4331-5502", status: "Reserved", company: "JOT Events", owner: "Unassigned Stock", ownerType: "Location", location: "Doha HQ · IT Store", purchaseDate: "2024-01-20", cost: "6,700 QAR", warrantyEnd: "2027-01-20", parentId: null },
  { id: "AST-00098", tag: "KWA-LAP-00098", category: "Laptop", manufacturer: "Lenovo", model: "ThinkPad T14", serial: "SN-T14-0091", status: "Disposed", company: "Karawa", owner: "—", ownerType: "—", location: "Disposed", purchaseDate: "2019-04-12", cost: "3,100 QAR", warrantyEnd: "2022-04-12", parentId: null },
];

export const STATUS_COLOR: Record<string, string> = {
  Available: "#17B8A6",
  Assigned: "#6366F1",
  "Under Repair": "#F59E0B",
  Reserved: "#8B5CF6",
  Disposed: "#94A3B8",
  Lost: "#EF4444",
  Damaged: "#EF4444",
};
