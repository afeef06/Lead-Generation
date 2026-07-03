import { createClient } from './server'
import { NextResponse } from 'next/server'

export async function getOrgClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase: null, org_id: null as unknown as string, role: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: orgData } = await supabase
    .from('user_organizations')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()
  const org_id = orgData?.organization_id
  if (!org_id) {
    return { supabase: null, org_id: null as unknown as string, role: null, error: NextResponse.json({ error: 'No organization' }, { status: 403 }) }
  }
  return { supabase, org_id: org_id as string, role: (orgData?.role ?? 'employee') as 'owner' | 'employee', error: null }
}

export function requireOwner(role: 'owner' | 'employee' | null) {
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
