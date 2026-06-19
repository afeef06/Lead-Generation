import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: uo } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!uo) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope');

  let query = supabase
    .from('leads')
    .select('*')
    .eq('organization_id', uo.organization_id)
    .order('created_at', { ascending: false });

  if (scope === 'mine') {
    query = query.eq('created_by', user.id);
  }

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: leads ?? [] });
}
