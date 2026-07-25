import { supabase, isSupabaseConfigured } from "../supabaseClient";

export async function checkOutAsset(assetId: string, employeeId: string, statusId: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error: assignError } = await supabase.from("asset_assignments").insert({
    asset_id: assetId,
    assigned_to_type: "employee",
    assigned_to_id: employeeId,
    action_type: "checkout",
  });
  if (assignError) throw assignError;

  const { error: assetError } = await supabase
    .from("assets")
    .update({ current_owner_type: "employee", current_owner_id: employeeId, status_id: statusId })
    .eq("id", assetId);
  if (assetError) throw assetError;
}

export async function checkInAsset(assetId: string, availableStatusId: string, condition: string, remarks: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");

  // Close out the most recent open checkout for this asset
  const { data: openAssignment, error: findError } = await supabase
    .from("asset_assignments")
    .select("id")
    .eq("asset_id", assetId)
    .eq("action_type", "checkout")
    .is("returned_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  if (openAssignment) {
    const { error: updateError } = await supabase
      .from("asset_assignments")
      .update({ returned_at: new Date().toISOString(), condition_on_return: condition, remarks })
      .eq("id", openAssignment.id);
    if (updateError) throw updateError;
  }

  const { error: insertError } = await supabase.from("asset_assignments").insert({
    asset_id: assetId,
    action_type: "checkin",
    condition_on_return: condition,
    remarks,
    returned_at: new Date().toISOString(),
  });
  if (insertError) throw insertError;

  const nextStatus = condition === "Damaged" || condition === "Needs Repair" ? null : availableStatusId;
  const { error: assetError } = await supabase
    .from("assets")
    .update({
      current_owner_type: null,
      current_owner_id: null,
      ...(nextStatus ? { status_id: nextStatus } : {}),
    })
    .eq("id", assetId);
  if (assetError) throw assetError;
}
