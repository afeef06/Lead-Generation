import { getOrgClient } from '@/lib/supabase/org'
import { NextResponse } from 'next/server'

export async function GET() {
  const { role, error } = await getOrgClient()
  if (error) return error
  return NextResponse.json({ role })
}
