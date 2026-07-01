import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { error } = await supabase!
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('organization_id', org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const body = await req.json()

  const { data, error } = await supabase!
    .from('transactions')
    .update(body)
    .eq('id', id)
    .eq('organization_id', org_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
