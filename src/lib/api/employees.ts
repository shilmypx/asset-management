import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { EMPLOYEES, Employee } from "../mockData";

export async function fetchEmployees(): Promise<Employee[]> {
  if (!isSupabaseConfigured) {
    return EMPLOYEES;
  }
  const { data, error } = await supabase.from("v_employees").select("*").order("name");
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.employee_number,
    name: r.name,
    company: r.company_name ?? "—",
    dept: r.department_name ?? "—",
    title: r.title ?? "—",
    status: (r.status?.charAt(0).toUpperCase() + r.status?.slice(1)) as Employee["status"],
    email: r.email,
    joined: r.joining_date,
    manager: r.manager_name ?? "—",
  }));
}
