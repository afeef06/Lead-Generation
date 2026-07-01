import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { data, error } = await supabase!
    .from('transactions')
    .select('*, clients(name)')
    .eq('organization_id', org_id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data ?? []).map((t) => ({
    ...t,
    client_name: t.clients?.name ?? null,
    clients: undefined,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const body = await req.json()

  const { data, error } = await supabase!
    .from('transactions')
    .insert([{ ...body, organization_id: org_id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
