import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You are a strategic analyst for R&R Collective, a growth consultancy. Given a company profile, identify which of R&R's 5 frameworks this company most needs, score the fit 0.0–10.0, and write one sentence of reasoning. Respond only with valid JSON — no markdown, no explanation.

The 5 frameworks:
- brand_positioning: has revenue but weak differentiation, unclear messaging, no premium positioning
- client_acquisition: relies on referrals, no systematic outreach, inconsistent pipeline, no inbound funnel
- growth_infrastructure: revenue plateaued, high CAC, no retention system, no KPI framework, ad hoc marketing
- scaling_roadmap: growing fast but operationally chaotic, no SOPs, margins compressing, hiring without structure
- venture_development: strong operator with capital or concept looking to co-build a new venture

Response format: {"framework":"<key>","score":<0.0-10.0>,"reasoning":"<one sentence>"}`;

type LeadInput = {
  place_id: string;
  name: string;
  address: string;
  types: string[];
  rating: number | null;
  user_ratings_total: number | null;
  website: string;
};

const TYPE_MAP: Record<string, string> = {
  clothing_store: 'Fashion / Apparel', store: 'Retail', restaurant: 'Food & Beverage',
  food: 'Food & Beverage', gym: 'Fitness', health: 'Health & Wellness',
  beauty_salon: 'Beauty & Wellness', spa: 'Beauty & Wellness',
  real_estate_agency: 'Real Estate', lawyer: 'Professional Services',
  accounting: 'Professional Services', hotel: 'Hospitality', lodging: 'Hospitality',
  travel_agency: 'Travel', advertising_agency: 'Marketing', marketing: 'Marketing',
};

function inferIndustry(types: string[]): string {
  for (const t of types) {
    if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  const meaningful = types.find(t => t !== 'establishment' && t !== 'point_of_interest' && t !== 'store');
  return meaningful?.replace(/_/g, ' ') ?? 'Local Business';
}

async function scoreOne(client: Anthropic, lead: LeadInput) {
  const industry = inferIndustry(lead.types);
  const presence = [
    lead.website ? `website at ${lead.website}` : 'no website listed',
    lead.rating != null
      ? `rated ${lead.rating}/5 with ${lead.user_ratings_total?.toLocaleString()} reviews`
      : 'no public ratings',
  ].join('; ');

  const prompt = `Company: ${lead.name}. Location: ${lead.address}. Industry: ${industry}. Online presence: ${presence}.`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(text) as { framework: string; score: number; reasoning: string };
  return { place_id: lead.place_id, ...parsed };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { leads } = await req.json() as { leads: LeadInput[] };
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'leads array required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const settled = await Promise.allSettled(leads.map(l => scoreOne(client, l)));

  const scores: Record<string, { framework: string; score: number; reasoning: string }> = {};
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const { place_id, framework, score, reasoning } = result.value;
      scores[place_id] = { framework, score, reasoning };
    } else {
      console.error(`Scoring failed for ${leads[i].name}:`, result.reason);
    }
  });

  return NextResponse.json({ scores });
}
