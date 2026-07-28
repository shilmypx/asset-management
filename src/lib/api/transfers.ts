import { supabase, isSupabaseConfigured } from "../supabaseClient";

export async function transferAsset(input: { asset_id: string; to_company_id: string; to_location_id: string | null; reason: string }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");

  const { data: current, error: fetchError } = await supabase.from("assets").select("company_id, location_id").eq("id", input.asset_id).single();
  if (fetchError) throw fetchError;

  const { error: logError } = await supabase.from("asset_transfers").insert({
    asset_id: input.asset_id,
    from_company_id: current.company_id,
    to_company_id: input.to_company_id,
    from_location_id: current.location_id,
    to_location_id: input.to_location_id,
    reason: input.reason,
  });
  if (logError) throw logError;

  const { error: updateError } = await supabase
    .from("assets")
    .update({ company_id: input.to_company_id, location_id: input.to_location_id })
    .eq("id", input.asset_id);
  if (updateError) throw updateError;
}
