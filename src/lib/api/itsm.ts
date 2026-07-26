import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type Incident = {
  id: string;
  incident_number: string;
  asset_tag?: string | null;
  employee_name?: string | null;
  priority: string;
  status: string;
  assigned_engineer?: string | null;
  root_cause: string | null;
  resolution: string | null;
  opened_at: string;
};
export type TimelineEntry = { id: string; incident_id: string; event_text: string; created_at: string };

export type Problem = { id: string; problem_number: string; title: string; root_cause: string | null; known_error: string | null; fix: string | null; status: string };
export type Change = { id: string; change_number: string; title: string; description: string | null; risk_level: string | null; status: string; scheduled_at: string | null };

let mockIncidents: Incident[] = [
  { id: "inc1", incident_number: "INC-0142", asset_tag: "KWA-LAP-00232", employee_name: "Youssef Hariri", priority: "High", status: "In Progress", assigned_engineer: "Ahmed Al-Sayed", root_cause: null, resolution: null, opened_at: "2026-07-24" },
  { id: "inc2", incident_number: "INC-0140", asset_tag: "O2C-PRN-00410", employee_name: "Layla Mansour", priority: "Medium", status: "Resolved", assigned_engineer: "Ahmed Al-Sayed", root_cause: "Toner sensor misread", resolution: "Replaced toner cartridge", opened_at: "2026-07-18" },
];
const mockTimeline: Record<string, TimelineEntry[]> = {
  inc1: [{ id: "t1", incident_id: "inc1", event_text: "Ticket opened — battery swelling reported", created_at: "2026-07-24 09:12" }, { id: "t2", incident_id: "inc1", event_text: "Escalated to hardware team, sent for repair", created_at: "2026-07-24 11:40" }],
};
let mockProblems: Problem[] = [
  { id: "p1", problem_number: "PRB-0009", title: "Recurring battery failures on 2022-batch MacBooks", root_cause: "Faulty battery lot from supplier", known_error: "Batteries swell after ~18 months", fix: "Proactive replacement program initiated", status: "Known Error" },
];
let mockChanges: Change[] = [
  { id: "ch1", change_number: "CHG-0021", title: "Migrate email to new spam filter provider", description: "Switching from legacy filter to cloud-based provider", risk_level: "Medium", status: "Approved", scheduled_at: "2026-08-01" },
];

export async function fetchIncidents(): Promise<Incident[]> {
  if (!isSupabaseConfigured) return mockIncidents;
  const { data, error } = await supabase
    .from("incidents")
    .select("id, incident_number, status, root_cause, resolution, opened_at, priorities(name), assets(barcode), employees(first_name, last_name), engineer:users!assigned_engineer_id(username)")
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id, incident_number: r.incident_number, status: r.status, root_cause: r.root_cause, resolution: r.resolution, opened_at: r.opened_at,
    priority: r.priorities?.name ?? "—", asset_tag: r.assets?.barcode ?? null,
    employee_name: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : null, assigned_engineer: r.engineer?.username ?? null,
  }));
}

export async function fetchTimeline(incidentId: string): Promise<TimelineEntry[]> {
  if (!isSupabaseConfigured) return mockTimeline[incidentId] ?? [];
  const { data, error } = await supabase.from("incident_timeline").select("*").eq("incident_id", incidentId).order("created_at");
  if (error) throw error;
  return data as TimelineEntry[];
}

export async function createIncident(input: { incident_number: string; employee_id: string | null; asset_id: string | null; priority_id: string; status: string }) {
  if (!isSupabaseConfigured) {
    mockIncidents = [{ id: `inc${Date.now()}`, incident_number: input.incident_number, priority: "—", status: input.status, opened_at: new Date().toISOString().slice(0, 10), root_cause: null, resolution: null }, ...mockIncidents];
    return;
  }
  const { error } = await supabase.from("incidents").insert(input);
  if (error) throw error;
}

export async function addTimelineEntry(incidentId: string, text: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("incident_timeline").insert({ incident_id: incidentId, event_text: text });
  if (error) throw error;
}

export async function updateIncidentStatus(incidentId: string, status: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const patch: any = { status };
  if (status === "Resolved") patch.resolved_at = new Date().toISOString();
  const { error } = await supabase.from("incidents").update(patch).eq("id", incidentId);
  if (error) throw error;
}

export async function fetchProblems(): Promise<Problem[]> {
  if (!isSupabaseConfigured) return mockProblems;
  const { data, error } = await supabase.from("problems").select("*").order("problem_number", { ascending: false });
  if (error) throw error;
  return data as Problem[];
}
export async function createProblem(input: { problem_number: string; title: string }) {
  if (!isSupabaseConfigured) {
    mockProblems = [{ id: `p${Date.now()}`, ...input, root_cause: null, known_error: null, fix: null, status: "Open" }, ...mockProblems];
    return;
  }
  const { error } = await supabase.from("problems").insert({ ...input, status: "Open" });
  if (error) throw error;
}

export async function fetchChanges(): Promise<Change[]> {
  if (!isSupabaseConfigured) return mockChanges;
  const { data, error } = await supabase.from("changes").select("*").order("change_number", { ascending: false });
  if (error) throw error;
  return data as Change[];
}
export async function createChange(input: { change_number: string; title: string; risk_level: string; scheduled_at: string | null }) {
  if (!isSupabaseConfigured) {
    mockChanges = [{ id: `ch${Date.now()}`, ...input, description: null, status: "Requested" }, ...mockChanges];
    return;
  }
  const { error } = await supabase.from("changes").insert({ ...input, status: "requested" });
  if (error) throw error;
}
