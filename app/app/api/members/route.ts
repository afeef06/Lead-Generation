import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: uo } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!uo) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const { data: rows } = await supabase
    .from('leads')
    .select('created_by, created_by_email')
    .eq('organization_id', uo.organization_id)
    .not('created_by', 'is', null);

  const seen = new Set<string>();
  const members: { id: string; email: string }[] = [];
  for (const row of rows ?? []) {
    if (row.created_by && !seen.has(row.created_by)) {
      seen.add(row.created_by);
      members.push({ id: row.created_by, email: row.created_by_email ?? row.created_by });
    }
  }

  return NextResponse.json({ members, currentUserId: user.id });
}
