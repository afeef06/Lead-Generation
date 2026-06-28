import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../../../lib/supabase/server';

const SYSTEM = `You are a lead scoring analyst for R&R Collective, a marketing and web agency serving owner-operated local service businesses in the US.

Given a local business profile, score their marketing gap on three services (0.0–10.0 each):

website_score: How badly do they need a website build or rebuild?
- 10: No website at all — just a Google listing or social page
- 8–9: Website exists but is a broken DIY template, not mobile-friendly, no HTTPS, no CTA, no booking, no tracking
- 5–7: Website exists but is outdated, thin content, no GA4/pixel, weak or no call to action
- 0–4: Solid modern site with tracking and clear conversion path

ads_score: How badly do they need paid advertising and local presence management?
- 10: No Google Ads, no Meta ads, unclaimed or incomplete Google Business Profile, invisible in local map pack
- 8–9: GBP claimed but no photos, few/no reviews, rating under 4.0, or last review 12+ months ago
- 5–7: Some ad presence but sending traffic to homepage, no conversion tracking, inconsistent NAP across directories
- 0–4: Active well-tracked campaigns, strong reviews, dominant in local map pack

consulting_score: How badly do they need a marketing strategy and consulting plan?
- 10: Already spending money with nothing to show — budget exists but is completely misdirected, no tracking, contradictory messaging across channels
- 8–9: Actively growing (hiring, expanding) but no coherent marketing strategy or plan
- 5–7: Some structure but inconsistent — site, ads, and GBP all tell different stories
- 0–4: Clear coherent strategy and messaging, tracking in place

opportunity_score: set this to the highest of the three sub-scores
service_primary: the service with the highest score
service_secondary: the service with the second highest score
reasoning: one sentence — the single most visible gap, phrased as a hook the salesperson can open with

Respond only with valid JSON — no markdown, no explanation, no code fences.
Response format: {"service_primary":"<website|ads|consulting>","service_secondary":"<website|ads|consulting>","website_score":<0.0-10.0>,"ads_score":<0.0-10.0>,"consulting_score":<0.0-10.0>,"opportunity_score":<0.0-10.0>,"reasoning":"<one sentence>"}`;

type ScoreResult = {
  service_primary: string;
  service_secondary: string;
  website_score: number;
  ads_score: number;
  consulting_score: number;
  opportunity_score: number;
  reasoning: string;
};

const BATCH = 10;

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

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
    .select('id, name, address, phone, website, rating, review_count')
    .eq('organization_id', uo.organization_id)
    .is('website_score', null);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ rescored: 0, message: 'All leads already scored' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let rescored = 0;

  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(async lead => {
      const presence = [
        lead.website ? `has website: ${lead.website}` : 'no website listed',
        lead.rating != null
          ? `Google rating ${lead.rating}/5 with ${lead.review_count} reviews`
          : 'no Google reviews or rating',
      ].join('; ');

      const prompt = `Business: ${lead.name}. Location: ${lead.address ?? 'unknown'}. Online presence: ${presence}.`;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(text) as ScoreResult;
      return { id: lead.id, ...parsed };
    }));

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { id, service_primary, service_secondary, website_score, ads_score, consulting_score, opportunity_score, reasoning } = result.value;
        await supabase
          .from('leads')
          .update({
            framework_match: service_primary,
            framework_score: opportunity_score,
            framework_reasoning: reasoning,
            service_secondary,
            website_score,
            ads_score,
            consulting_score,
          })
          .eq('id', id);
        rescored++;
      } else {
        console.error('Rescore failed for batch item:', result.reason);
      }
    }
  }

  return NextResponse.json({ rescored, total: leads.length });
}
