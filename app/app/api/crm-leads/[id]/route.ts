import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const body = await req.json()

  if (body.employee_id) {
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
    .update(body)
    .eq('id', id)
    .eq('organization_id', org_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { error } = await supabase!
    .from('crm_leads')
    .delete()
    .eq('id', id)
    .eq('organization_id', org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
