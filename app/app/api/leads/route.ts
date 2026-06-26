import { NextRequest, NextResponse } from 'next/server';
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

  const { data: leads } = await supabase
    .from('leads')
    .select('place_id')
    .eq('organization_id', uo.organization_id)
    .not('place_id', 'is', null);

  return NextResponse.json({ place_ids: leads?.map(l => l.place_id) ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: uo } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!uo) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const body = await req.json();

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      organization_id: uo.organization_id,
      place_id: body.place_id,
      name: body.name,
      address: body.address,
      phone: body.phone ?? '',
      website: body.website ?? '',
      rating: body.rating ?? null,
      review_count: body.user_ratings_total ?? null,
      framework_match: body.framework_match ?? null,
      framework_score: body.framework_score ?? null,
      framework_reasoning: body.framework_reasoning ?? null,
      source: body.source ?? 'google_places',
      created_by: user.id,
      created_by_email: user.email ?? null,
      created_by_name: (user.user_metadata as { full_name?: string })?.full_name ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already saved' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead }, { status: 201 });
}
