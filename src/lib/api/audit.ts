import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { Asset } from "../mockData";

export type ScanResult = "matched" | "mismatched_location" | "unexpected" | "missing";
export type AuditSession = { id: string; company_id: string; company_name?: string; started_at: string; completed_at: string | null; status: "in_progress" | "completed" };
export type Scan = { id: string; audit_session_id: string; asset_id: string | null; scanned_barcode: string; result: ScanResult; scanned_at: string };

let mockSessions: AuditSession[] = [];
let mockScans: Record<string, Scan[]> = {};

export async function fetchSessions(): Promise<AuditSession[]> {
  if (!isSupabaseConfigured) return mockSessions;
  const { data, error } = await supabase.from("audit_sessions").select("id, company_id, started_at, completed_at, status, companies(name)").order("started_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, company_name: r.companies?.name }));
}

export async function startSession(companyId: string): Promise<AuditSession> {
  if (!isSupabaseConfigured) {
    const session: AuditSession = { id: `sess${Date.now()}`, company_id: companyId, started_at: new Date().toISOString(), completed_at: null, status: "in_progress" };
    mockSessions = [session, ...mockSessions];
    mockScans[session.id] = [];
    return session;
  }
  const { data, error } = await supabase.from("audit_sessions").insert({ company_id: companyId, status: "in_progress" }).select().single();
  if (error) throw error;
  return data as AuditSession;
}

export async function fetchScans(sessionId: string): Promise<Scan[]> {
  if (!isSupabaseConfigured) return mockScans[sessionId] ?? [];
  const { data, error } = await supabase.from("audit_scans").select("*").eq("audit_session_id", sessionId).order("scanned_at", { ascending: false });
  if (error) throw error;
  return data as Scan[];
}

/** Scans one barcode: matches against expectedAssets (assets belonging to the audited company), records the result. */
export async function scanBarcode(sessionId: string, barcode: string, expectedAssets: Asset[]): Promise<ScanResult> {
  const match = expectedAssets.find((a) => a.tag === barcode);
  const result: ScanResult = match ? "matched" : "unexpected";

  if (!isSupabaseConfigured) {
    const scan: Scan = { id: `scan${Date.now()}`, audit_session_id: sessionId, asset_id: match?.id ?? null, scanned_barcode: barcode, result, scanned_at: new Date().toISOString() };
    mockScans[sessionId] = [scan, ...(mockScans[sessionId] ?? [])];
    return result;
  }
  const { error } = await supabase.from("audit_scans").insert({ audit_session_id: sessionId, asset_id: match?.id ?? null, scanned_barcode: barcode, result });
  if (error) throw error;
  return result;
}

/** Closes the session. "Missing" isn't a scan — it's every expected asset that was never scanned, computed here at completion time. */
export async function completeSession(sessionId: string, expectedAssets: Asset[], scans: Scan[]) {
  const scannedAssetIds = new Set(scans.map((s) => s.asset_id).filter(Boolean));
  const missing = expectedAssets.filter((a) => !scannedAssetIds.has(a.id));

  if (!isSupabaseConfigured) {
    const session = mockSessions.find((s) => s.id === sessionId);
    if (session) { session.status = "completed"; session.completed_at = new Date().toISOString(); }
    const missingScans: Scan[] = missing.map((a) => ({ id: `miss${a.id}`, audit_session_id: sessionId, asset_id: a.id, scanned_barcode: a.tag, result: "missing", scanned_at: new Date().toISOString() }));
    mockScans[sessionId] = [...(mockScans[sessionId] ?? []), ...missingScans];
    return missing;
  }

  const { error: updateError } = await supabase.from("audit_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId);
  if (updateError) throw updateError;

  if (missing.length) {
    const rows = missing.map((a) => ({ audit_session_id: sessionId, asset_id: a.id, scanned_barcode: a.tag, result: "missing" as const }));
    const { error: insertError } = await supabase.from("audit_scans").insert(rows);
    if (insertError) throw insertError;
  }
  return missing;
}
