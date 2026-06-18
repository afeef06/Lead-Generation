import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const VALID_STAGES = new Set(['discovered', 'qualified', 'outreach', 'closed']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const update: Record<string, string> = {};

  if (body.stage !== undefined) {
    if (!VALID_STAGES.has(body.stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }
    update.stage = body.stage;
  }

  if (body.notes !== undefined) {
    update.notes = body.notes;
  }

  if (body.email !== undefined) {
    update.email = body.email;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', id)
    .eq('organization_id', uo.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lead });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: uo } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!uo) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('organization_id', uo.organization_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
