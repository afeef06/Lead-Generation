import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

const ANTHROPIC_INPUT_RATE  = 0.80 / 1_000_000;
const ANTHROPIC_OUTPUT_RATE = 4.00 / 1_000_000;
const AVG_INPUT_TOKENS  = 460;
const AVG_OUTPUT_TOKENS = 80;

const GOOGLE_TEXT_SEARCH_RATE  = 0.032;
const GOOGLE_DETAILS_RATE      = 0.017;
const GOOGLE_MONTHLY_CREDIT    = 200.00;
const ASSUMED_SAVES_PER_SEARCH = 12;

const HUNTER_RATE_PER_CREDIT = 0.068;
const HUNTER_FREE_CREDITS    = 25;

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
    .select('id, framework_score, email')
    .eq('organization_id', uo.organization_id);

  const allLeads      = leads ?? [];
  const totalLeads    = allLeads.length;
  const scoredLeads   = allLeads.filter(l => l.framework_score !== null).length;
  const hunterLeads   = allLeads.filter(l => l.email && !l.email.startsWith('info@')).length;

  // Anthropic
  const anthropicInput  = scoredLeads * AVG_INPUT_TOKENS  * ANTHROPIC_INPUT_RATE;
  const anthropicOutput = scoredLeads * AVG_OUTPUT_TOKENS * ANTHROPIC_OUTPUT_RATE;
  const anthropicTotal  = anthropicInput + anthropicOutput;

  // Google Places
  const estimatedSearches    = totalLeads > 0 ? Math.max(1, Math.ceil(totalLeads / ASSUMED_SAVES_PER_SEARCH)) : 0;
  const googleTextSearch     = estimatedSearches * GOOGLE_TEXT_SEARCH_RATE;
  const googleDetails        = totalLeads * GOOGLE_DETAILS_RATE;
  const googleTotal          = googleTextSearch + googleDetails;
  const googleCreditUsed     = Math.min(googleTotal, GOOGLE_MONTHLY_CREDIT);
  const googleCreditRemaining = Math.max(0, GOOGLE_MONTHLY_CREDIT - googleTotal);

  // Hunter
  const hunterPaidCredits = Math.max(0, hunterLeads - HUNTER_FREE_CREDITS);
  const hunterTotal       = hunterPaidCredits * HUNTER_RATE_PER_CREDIT;
  const hunterFreeUsed    = Math.min(hunterLeads, HUNTER_FREE_CREDITS);

  return NextResponse.json({
    totals: {
      anthropic: anthropicTotal,
      google:    googleTotal,
      hunter:    hunterTotal,
      overall:   anthropicTotal + googleTotal + hunterTotal,
    },
    anthropic: {
      scoredLeads,
      avgInputTokens:  AVG_INPUT_TOKENS,
      avgOutputTokens: AVG_OUTPUT_TOKENS,
      inputCost:       anthropicInput,
      outputCost:      anthropicOutput,
      total:           anthropicTotal,
      model:           'claude-haiku-4-5-20251001',
    },
    google: {
      totalLeads,
      estimatedSearches,
      textSearchCost:      googleTextSearch,
      detailsCost:         googleDetails,
      total:               googleTotal,
      creditUsed:          googleCreditUsed,
      creditRemaining:     googleCreditRemaining,
      creditTotal:         GOOGLE_MONTHLY_CREDIT,
    },
    hunter: {
      hunterLeads,
      freeUsed:    hunterFreeUsed,
      freeTotal:   HUNTER_FREE_CREDITS,
      paidCredits: hunterPaidCredits,
      total:       hunterTotal,
    },
  });
}
