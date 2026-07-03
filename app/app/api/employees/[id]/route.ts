import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient, requireOwner } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, org_id, role, error: authError } = await getOrgClient()
  if (authError) return authError
  const roleError = requireOwner(role)
  if (roleError) return roleError

  const body = await req.json()

  const { data, error } = await supabase!
    .from('employees')
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
  const { supabase, org_id, role, error: authError } = await getOrgClient()
  if (authError) return authError
  const roleError = requireOwner(role)
  if (roleError) return roleError

  const { error } = await supabase!
    .from('employees')
    .delete()
    .eq('id', id)
    .eq('organization_id', org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
