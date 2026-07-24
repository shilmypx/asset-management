# Enterprise ITAMS — Screens, Fields & Functions

Every screen in the system, organized by module. Each entry lists the screen's purpose, the fields it shows or captures, and the functions/actions available on it. This maps directly to the schema and module list in `ITAMS-Architecture-and-Schema.md`.

---

## 1. Authentication & Session

### 1.1 Login
**Fields:** Username / Email, Password, MFA code (if enabled)
**Functions:** Sign in · Forgot password · Remember device

### 1.2 Password Reset
**Fields:** Email/Username, New password, Confirm password
**Functions:** Request reset link · Set new password · (Admin) Force reset on next login

### 1.3 Account Lockout Notice
**Fields:** Failed attempt count, Lockout expiry
**Functions:** Contact admin to unlock · Auto-unlock after cooldown

---

## 2. Dashboard

### 2.1 Executive Dashboard
**Fields (KPI cards):** Total Assets, Hardware, Software, Licenses, Employees, Assigned Assets, Available Assets, Under Repair, Disposed Assets, Warranty Expiring, License Renewals Due, Contracts Expiring, Maintenance Due, Asset Value, Depreciated Value
**Charts:** Assets by Company · Assets by Category · Assets by Status · Asset Age · Asset Value · Department Distribution · License Usage · Warranty Status · Depreciation Summary
**Panels:** Recent Activity feed · Recent Incidents · Low Stock Accessories · Alerts (warranty, subscription renewal, maintenance due, contract renewal, audit pending, low stock)
**Functions:** Filter by company/date range · Click-through from any KPI/chart to the filtered list screen · Export snapshot to PDF

---

## 3. System Administration

### 3.1 Companies
**Fields:** Name, Code, Is Parent (bool), Parent Company, Logo, Address, Status
**Functions:** Add · Edit · Deactivate · Reorder

### 3.2 Org Units (Branches / Business Units / Divisions)
**Fields:** Company, Parent Org Unit, Name, Type (Branch/Business Unit/Division), Sort Order, Status
**Functions:** Add · Edit · Move (re-parent) · Deactivate · Bulk import via Excel

### 3.3 Departments
**Fields:** Name, Code, Is Shared (bool)
**Functions:** Add · Edit · Assign to companies (for shared departments like IT/HR/Finance)

### 3.4 Locations
**Fields:** Company, Org Unit, Name, Address, Type (Office/Branch/Server Room/Warehouse)
**Functions:** Add · Edit · Deactivate

### 3.5 Cost Centers
**Fields:** Company, Name, Code
**Functions:** Add · Edit · Deactivate

### 3.6 Master Data / Lookups
One screen pattern reused for: Manufacturers, Asset Models, Asset Categories, Asset Statuses, License Types, Subscription Types, Currencies, Depreciation Methods, Employment Types, Barcode Prefixes, Vendors, Repair Vendors, Disposal Vendors, Incident/Change/Problem Categories, Priorities, Severities, Asset Conditions.
**Fields:** Name, Code, Sort Order, Is Active (+ type-specific: Asset Category has `Allow Depreciation` toggle; Barcode Prefix has Company/Category scope)
**Functions:** Add · Edit · Reorder · Activate/Deactivate · (Asset Category only) toggle depreciation eligibility

### 3.7 Depreciation Settings
**Fields:** Scope (Global/Company/Category), Method (Straight Line/Declining Balance/None), Calculation Frequency (Monthly/Quarterly/Annual), Declining Balance Rate (% — shown only when Method = Declining Balance), Default Useful Life, Default Residual Value
**Functions:** Set global default · Override per company · Override per category (category overrides win over company, which wins over global) · Preview calculation (shows a sample amortization schedule for the chosen method + frequency before saving) · Run depreciation now (manually trigger the period-end job instead of waiting for the schedule) · View depreciation schedule for a given asset

### 3.8 Barcode Settings
**Fields:** Prefix per company/category, Format (Code128/QR), Label Size, Label Template, Printer Settings
**Functions:** Configure prefix rules · Design label template · Set default printer

### 3.9 Notification Templates
**Fields:** Event Type, Subject, Body Template, Channels (Email/Dashboard/Toast), Trigger Offsets (30/15/7/1/0 days)
**Functions:** Add · Edit · Preview · Test send · Enable/disable per event type

---

## 4. User Management & RBAC

### 4.1 Users List
**Fields:** Username, Linked Employee, Email, Role(s), Status, Last Login, Failed Attempts, MFA Enabled
**Functions:** Search/filter · Add user · Lock/unlock account · Reset password · Bulk deactivate

### 4.2 User Detail / Create
**Fields:** Select Employee (auto-fills name/email/dept) *or* standalone account, Username, Email, Role assignment(s) (with company scope), MFA toggle, Status
**Functions:** Save · Assign roles · Force password reset · View login history · Deactivate

### 4.3 Roles & Permission Matrix
**Fields:** Role Name, Description, Is System Role. Matrix: Module (Dashboard/Employees/Hardware/Software/Incidents/Reports/Settings/…) × Action (View/Add/Edit/Delete/Approve/Export/Print/Import)
**Functions:** Create role · Toggle each permission cell · Clone role · Delete custom role · Assign role to company scope

---

## 5. Employee Management

### 5.1 Employee List
**Fields (columns):** Employee ID, Name, Company, Business Unit/Branch, Department, Title, Employment Type, Status, Joining Date
**Functions:** Search · Filter (status, department, business unit, location) · Add (manual) · Bulk Import (Excel/CSV) · Bulk Export · Sort

### 5.2 Employee Add / Edit Form
**Fields (grouped):**
- *Identity:* Full Name, Employee ID, Work Email, Directory/SSO Username
- *Organization:* Job Title, Department, Cost Center, Manager (searchable select), Company, Business Unit/Branch
- *Employment:* Employment Type, Status, Joining Date, Termination Date
- *Location:* Primary Office, Shipping Address (for remote/hybrid equipment delivery)
- *Contact:* Phone
**Functions:** Save · Validate uniqueness (Employee ID/Email) · Trigger onboarding procurement on save (new hire) · Trigger offboarding asset-retrieval workflow on Termination Date

### 5.3 Bulk Import
**Fields:** File upload (Excel/CSV), Column mapping, Mode (Add/Update)
**Functions:** Upload · Map columns · Validate (produces error/validation report) · Commit import · Download validation report

### 5.4 Employee Profile / Detail
**Fields displayed:** All Employee fields + tabs: Assigned Hardware, Assigned Software & SaaS Licenses, Assigned Accounts, Assignment History, Incidents, Requests, Repair History
**Functions:** Edit · Deactivate/Offboard (triggers asset retrieval) · Assign new asset · View full history · Print employee asset summary

---

## 6. Procurement

### 6.1 Purchase Requests
**Fields:** Requested By, Item Description, Category, Quantity, Justification, Status
**Functions:** Submit request · Approve/Reject · Convert to PO line

### 6.2 Purchase Orders List
**Fields (columns):** PO Number, Vendor, Company, Status, Total Cost, Requested By, Created Date
**Functions:** Search/filter by status · Create PO · Export

### 6.3 Purchase Order Detail
**Fields:** PO Number, Vendor, Company, Status (Draft/Pending Approval/Approved/Ordered/Received/Closed/Cancelled), Line Items (Description, Category, Qty, Unit Cost), Total Cost, Currency, Requested By, Approved By
**Functions:** Add/remove line items · Submit for approval · Approve/Reject · Mark Received (each received line converts to an Asset record, auto-populating Purchase Date/Cost/Vendor) · Attach invoice · Close/Cancel PO

---

## 7. Hardware Asset Management

### 7.1 Asset List
**Fields (columns):** Asset Tag/Barcode, Category icon, Manufacturer/Model, Serial Number, Status, Company, Owner, Location, Warranty End
**Functions:** Search (by tag, serial, owner) · Filter (category, status, company, location) · Add (manual) · Bulk Import · Bulk Update · Bulk Assignment · Bulk Disposal · Scan barcode to jump to asset · Export

### 7.2 Asset Add / Edit Form
**Fields (grouped):**
- *Basic Info:* Asset Name, Asset Tag (auto-generate button), Category, Manufacturer, Model, Serial Number, Status
- *Financials:* PO #, Purchase Date, Vendor, Purchase Price & Currency, Warranty Expiration, Depreciation Method
- *Assignment:* Assigned To (searchable, resolves to Employee/Department/Location/Business Unit/Project), Assigned Date (auto), Office/Site, Department (auto-fill from assignee)
- *Technical:* OS & Version, IP Address, MAC Address, Storage & RAM specs (for network/compute categories)
- *Attachments:* Invoice/Receipt upload, Condition Notes (textarea), Photos
- *Bundle:* Is Bundle toggle → add/remove child components (each gets own tag/serial)
**Functions:** Save · Generate barcode/QR · Attach files · Add bundle child · Split child from bundle · Delete (soft, with disposal check)

### 7.3 Asset Detail View
**Fields displayed:** All Asset fields + tabs: Assignment History, Incident History, Repair History, Attachments, Bundle Components (if applicable), Depreciation Schedule
**Functions:** Edit · Check-Out · Check-In · Transfer · Send for Repair · Dispose · Print barcode label · View bundle parent/children · Add note/attachment

---

## 8. Check-Out / Check-In / Transfer / Disposal (Easy Screens)

### 8.1 Check-Out
**Fields:** Select Employee (or Department/Location/Project), Scan/Select Asset, Assignment Date, Signature capture
**Functions:** Scan barcode · Confirm assignment · Capture e-signature · Generate assignment record · Print handover slip

### 8.2 Check-In
**Fields:** Scan Asset, Condition (Good/Damaged/Needs Repair), Accessories Returned (checklist), Remarks
**Functions:** Scan barcode · Record condition · Update inventory status to Available · Flag for repair if damaged

### 8.3 Asset Transfer
**Fields:** Asset, From Company/Org Unit/Location, To Company/Org Unit/Location, Reason, Transferred By, Date
**Functions:** Confirm transfer · Update location/ownership · Log in transfer history

### 8.4 Hardware Disposal
**Fields:** Asset, Reason, Approved By, Data Wipe Confirmation (checkbox), Certificate Upload, Disposal Vendor, Disposal Date
**Functions:** Request disposal · Approve · Confirm data wipe · Upload certificate · Finalize disposal (status → Disposed)

---

## 9. Software & SaaS License Management

### 9.1 Software License List
**Fields (columns):** Software Name, Vendor, License Type, Subscription Type, Seats Purchased/Used/Available, Renewal Date, Cost
**Functions:** Search/filter · Add license · Bulk import · Export

### 9.2 Software License Add / Edit Form
**Fields (grouped):**
- *General:* Software Name, Publisher/Vendor, Category (SaaS/Desktop App/Cloud Infra), License Type (Per-User/Per-Seat/Concurrent/Site)
- *Licensing:* Total Seats, Available Seats (calculated), License Key (encrypted, admin-only view)
- *Cost & Terms:* Subscription Type, Cost per Seat/Total, Contract Start Date, Renewal Date, Auto-Renew toggle
- *Assignment:* Assigned Users/Teams (multi-select)
**Functions:** Save · Assign/revoke seats · Reveal license key (permission-gated) · Set renewal reminders

### 9.3 Software License Detail
**Fields displayed:** All license fields + Assigned Users list, Assigned Devices list, Installation History
**Functions:** Assign to employee/device · Revoke · View compliance status (installed vs. licensed) · Renew

### 9.4 SaaS Subscriptions
**Fields:** Service Name (M365, Google Workspace, Zoom, Dropbox, Canva, Adobe, OpenAI, etc.), Owner, Business Unit, Assigned Users, Subscription, Renewal Date, Cost, Vendor, Invoices/Contracts
**Functions:** Add · Assign/remove users · Track renewal · Attach contract/invoice

---

## 10. Network Components

### 10.1 Network Asset List
**Fields (columns):** Device Name/Tag, Category (Switch/Router/Firewall/AP/NAS), IP, MAC, Location/Rack, Status
**Functions:** Search/filter · Add · Bulk import

### 10.2 Network Asset Detail
**Fields:** All standard asset fields + IP Address, MAC Address, Firmware Version, OS, Port Count, Config Backup file, Rack, Rack Position, Maintenance Schedule
**Functions:** Edit · Upload config backup · Schedule maintenance · View relationship map

### 10.3 Data Center / Rack View
**Fields:** Data Center Name, Location, Racks (Name, Position, Devices per rack)
**Functions:** Add rack · Place/move device in rack · Visual rack elevation view

### 10.4 Relationship / Dependency Map
**Fields:** Source Asset, Target Asset, Relationship Type (Runs On/Depends On/Connected To/Located In)
**Functions:** Add relationship edge · Visual graph view (App → Server → Rack → Data Center → Branch → Company) · Impact analysis ("what breaks if this goes down") · Export diagram

---

## 11. Discovery & Reconciliation

### 11.1 Discovered Devices
**Fields (columns):** IP, MAC, Hostname, OS, Discovered Via (Agent/Agentless Scan), First Seen, Last Seen, Reconciliation Status (New/Matched/Ignored)
**Functions:** Run scan · Match to existing asset · Create new asset from device · Ignore

### 11.2 Software Installations (per device)
**Fields:** Software Name, Version, Detected Date, Authorized (Y/N, computed), Usage Frequency (Frequent/Occasional/Unused)
**Functions:** Reconcile against licenses · Flag unauthorized installs · Generate shelfware report

---

## 12. Repair & Maintenance

### 12.1 Repair Records List
**Fields (columns):** Asset, Issue, Vendor, Sent Date, Est. Return, Actual Return, Status, Cost
**Functions:** Search/filter by status · Create repair record

### 12.2 Repair Detail
**Fields:** Asset, Issue Description, Vendor, Sent Date, Estimated/Actual Return Date, Repair Cost, Under Warranty (bool), Notes, Replacement (Source: Warranty Vendor/Internal Stock, Replacement Asset, Issued/Recovered dates)
**Functions:** Log repair · Issue temporary replacement · Auto-recover replacement on return · Close repair record · View repair history for this asset

---

## 13. Contracts & Warranty

### 13.1 Contracts List
**Fields (columns):** Title, Type (AMC/Maintenance/Support/Software Agreement/Vendor Contract), Vendor, Related Asset/License, Start/End Date, Renewal Date, Status
**Functions:** Search/filter · Add contract · Set renewal alert

### 13.2 Contract Detail
**Fields:** All list fields + Auto-Renew toggle, Cost, Currency, Document upload
**Functions:** Edit · Attach document · Renew · Cancel

### 13.3 Warranty Extensions
**Fields:** Asset, Extended By (Vendor), Previous End Date, New End Date, Cost, Purchased Date
**Functions:** Add extension (does not overwrite original warranty term) · View warranty history on asset

---

## 14. Incident / Problem / Change Management

### 14.1 Incident List
**Fields (columns):** Incident #, Asset, Employee, Priority, Severity, Status, Assigned Engineer, SLA Due
**Functions:** Search/filter · Create incident · Bulk assign

### 14.2 Incident Detail
**Fields:** Incident #, linked Asset (optional), Reporting Employee, Priority, Category, Severity, Status, Assigned Engineer, Root Cause, Resolution, Timeline (log entries), Attachments, Escalation flag, Related Problems, Related Changes
**Functions:** Assign engineer · Update status · Add timeline entry · Attach file · Escalate · Link to Problem/Change · Resolve/Close

### 14.3 Problem List / Detail
**Fields:** Problem #, Title, Root Cause, Known Error, Fix, Status, Linked Incidents
**Functions:** Create · Link incidents · Document known error/fix · Close

### 14.4 Change Request List / Detail
**Fields:** Change #, Title, Description, Related Asset, Risk Level, Status, Requested By, Approved By, Scheduled Date, Rollback Plan
**Functions:** Submit change · Approve/Reject · Schedule · Implement · Rollback · Close

---

## 15. Inventory Audit

### 15.1 Audit Sessions List
**Fields (columns):** Scope (Org Unit/Location/Category), Started By, Started/Completed Date, Status
**Functions:** Start new audit session · View past sessions

### 15.2 Audit Scan Screen (mobile-friendly)
**Fields:** Scanned Barcode, matched Asset (auto-lookup), Result (Matched/Mismatched Location/Unexpected/Missing)
**Functions:** Scan barcode · Confirm location · Flag mismatch · Complete session

### 15.3 Audit Report
**Fields:** Session summary — Matched count, Mismatched Location count, Unexpected devices, Missing assets (never scanned)
**Functions:** View discrepancies · Export report · Trigger investigation/incident on missing assets

---

## 16. Self-Service Portal (Employee-facing)

### 16.1 My Assets
**Fields:** List of Assigned Hardware, Assigned Software/SaaS Licenses
**Functions:** View details · Report issue (creates Incident) · Request return/transfer

### 16.2 New Request
**Fields:** Request Type (New Hardware/Software License/Upgrade/Repair), Category, Justification
**Functions:** Submit · Attach supporting file

### 16.3 My Requests
**Fields (columns):** Request Type, Category, Status (Submitted/Approved/Rejected/Fulfilled), Requested Date
**Functions:** Track status · Cancel pending request

### 16.4 Request Approval Queue (Manager/Admin view)
**Fields:** Requester, Request Type, Justification, Status
**Functions:** Approve · Reject (with reason) · Convert approved request to Purchase Order or direct assignment

---

## 17. Automation Rules

### 17.1 Rules List
**Fields (columns):** Rule Name, Trigger Event, Action, Active (toggle)
**Functions:** Add rule · Enable/disable · Delete

### 17.2 Rule Builder
**Fields:** Name, Trigger Event (Warranty Expiring/Contract Expiring/Repair Returned/License Threshold Reached/Asset Idle/Disposal Due), Condition (e.g. days-before threshold, category filter), Action (Send Notification/Create Task/Change Status/Create Disposal Request)
**Functions:** Configure trigger · Configure condition · Configure action · Test rule · Save

---

## 18. Barcode Management

### 18.1 Barcode / Label Print
**Fields:** Asset(s) selected, Label Template, Label Size, Printer
**Functions:** Generate barcode/QR · Preview label · Print single · Bulk print (batch of asset tags) · Reprint

---

## 19. Reports

### 19.1 Report List / Builder
**Standard reports:** Assets by Company/Department/Employee, Asset History, Asset Lifecycle, Warranty Report, Depreciation Report, Incident Report, Repair Cost Report, Software License Report, Expired/Upcoming License Renewals, Vendor Report, Inventory Audit Report, Disposed Assets Report, Audit Log Report, Employee Assets Report, Contract Report, Change Report, Problem Report
**Fields (for custom report builder):** Data source (module), Columns to include, Filters, Grouping, Sort order
**Functions:** Run standard report · Build custom report · Save report template · Export (PDF/Excel/CSV) · Schedule recurring email delivery

---

## 20. Audit Trail

### 20.1 Audit Log Viewer
**Fields (columns):** User, Action (Login/Logout/Create/Update/Delete/Assign/Return/Transfer/Approval/Import/Export/Password Reset), Entity Type, Entity, Old Value, New Value, Date/Time, IP Address, Browser
**Functions:** Search/filter by user, action, date range, entity · Export log · View field-level diff

---

## 21. Notifications

### 21.1 Notification Center
**Fields (columns):** Type (Renewal/Warranty/Maintenance/Assignment/Return/Incident/Approval), Related Entity, Channel, Sent Date, Read status
**Functions:** Mark read/unread · Click-through to related record · Configure personal notification preferences (email/dashboard toggle per type)

---

## Cross-cutting UI functions (apply across most list screens)

- Global search (assets, employees, barcode, serial number, software, IP, hostname, vendor, license, incident)
- Column sort/filter/show-hide
- Bulk select + bulk action (assign/update/dispose/export) where applicable
- Keyboard shortcuts for barcode-scanner-driven workflows
- Dark mode / light mode toggle
- Responsive layout: desktop, tablet, mobile (audit and check-out/in screens are mobile-first)
