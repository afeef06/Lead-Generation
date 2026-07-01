import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { data, error } = await supabase!
    .from('crm_leads')
    .select('*, employees(name)')
    .eq('organization_id', org_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data ?? []).map(l => ({
    ...l,
    employee_name: l.employees?.name ?? l.employee_name ?? null,
    employees: undefined,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const body = await req.json()

  // Auto-populate employee_name from employee_id
  if (body.employee_id && !body.employee_name) {
    const { data: emp } = await supabase!
      .from('employees')
      .select('name')
      .eq('id', body.employee_id)
      .eq('organization_id', org_id)
      .single()
    if (emp) body.employee_name = emp.name
  }

  const { data, error } = await supabase!
    .from('crm_leads')
    .insert([{ ...body, organization_id: org_id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
