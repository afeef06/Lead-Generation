import { NextRequest, NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const { data, error } = await supabase!
    .from('tasks')
    .select('*, clients(name), projects(name)')
    .eq('organization_id', org_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data ?? []).map(t => ({
    ...t,
    client_name: t.clients?.name ?? null,
    project_name: t.projects?.name ?? null,
    clients: undefined,
    projects: undefined,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const body = await req.json()

  const { data, error } = await supabase!
    .from('tasks')
    .insert([{ ...body, organization_id: org_id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
