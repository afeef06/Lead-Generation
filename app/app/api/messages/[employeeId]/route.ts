import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { data, error } = await supabase!
    .from('messages')
    .select('*')
    .eq('organization_id', org_id)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { content, sender } = await req.json()

  const { data, error } = await supabase!
    .from('messages')
    .insert([{ organization_id: org_id, employee_id: employeeId, content, sender }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { sender } = await req.json()

  const { error } = await supabase!
    .from('messages')
    .update({ is_read: true })
    .eq('organization_id', org_id)
    .eq('employee_id', employeeId)
    .eq('sender', sender)
    .eq('is_read', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
