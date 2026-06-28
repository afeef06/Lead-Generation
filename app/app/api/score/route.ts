import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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
reasoning: one sentence — the single most visible gap, phrased as a hook the salesperson can open with (what can we screenshot or show them immediately?)

Target niches we care about most (score these higher when data is thin):
Home/trade: HVAC, plumbing, electrical, roofing, remodeling, landscaping, pest control, concrete, fencing, garage doors, solar, pool/spa
Professional: law firms, CPAs, bookkeepers, financial advisors, insurance brokers, real estate teams, mortgage brokers
Health & aesthetics: dental, orthodontics, med spa, chiropractic, physical therapy, optometry, veterinary
Premium lifestyle: interior design, custom cabinetry, kitchen/bath showrooms

Avoid scoring businesses in restaurants, pre-revenue startups, or commodity trades — if forced to score them, cap opportunity_score at 5.

Respond only with valid JSON — no markdown, no explanation, no code fences.
Response format: {"service_primary":"<website|ads|consulting>","service_secondary":"<website|ads|consulting>","website_score":<0.0-10.0>,"ads_score":<0.0-10.0>,"consulting_score":<0.0-10.0>,"opportunity_score":<0.0-10.0>,"reasoning":"<one sentence>"}`;

type LeadInput = {
  place_id: string;
  name: string;
  address: string;
  types: string[];
  rating: number | null;
  user_ratings_total: number | null;
  website: string;
};

export type ScoreResult = {
  service_primary: string;
  service_secondary: string;
  website_score: number;
  ads_score: number;
  consulting_score: number;
  opportunity_score: number;
  reasoning: string;
};

const TYPE_MAP: Record<string, string> = {
  // Home & trade
  plumber: 'Plumbing', electrician: 'Electrical', roofing_contractor: 'Roofing',
  general_contractor: 'General Contractor', painter: 'Painting',
  landscaper: 'Landscaping', pest_control_service: 'Pest Control',
  hvac_contractor: 'HVAC', pool_cleaning_service: 'Pool & Spa',
  fence_contractor: 'Fencing', solar_energy_equipment_supplier: 'Solar',
  garage_door_supplier: 'Garage Doors', concrete_contractor: 'Concrete',
  flooring_store: 'Flooring', window_installation_service: 'Windows',
  // Professional
  lawyer: 'Law Firm', legal_services: 'Legal Services',
  accounting: 'Accounting / CPA', financial_planner: 'Financial Advisor',
  insurance_agency: 'Insurance', real_estate_agency: 'Real Estate',
  mortgage_broker: 'Mortgage',
  // Health
  dentist: 'Dental', orthodontist: 'Orthodontics',
  physiotherapist: 'Physical Therapy', chiropractor: 'Chiropractic',
  optometrist: 'Optometry', veterinary_care: 'Veterinary',
  medical_spa: 'Med Spa', beauty_salon: 'Salon / Aesthetics',
  // Premium lifestyle
  interior_designer: 'Interior Design', furniture_store: 'Custom Furniture',
  kitchen_furniture_store: 'Kitchen & Bath', home_goods_store: 'Home Goods',
  // Generic fallbacks
  store: 'Retail', restaurant: 'Restaurant', gym: 'Fitness',
  real_estate: 'Real Estate', marketing: 'Marketing Agency',
};

function inferIndustry(types: string[]): string {
  for (const t of types) {
    if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  const meaningful = types.find(
    t => !['establishment', 'point_of_interest', 'store', 'local_business', 'business'].includes(t)
  );
  return meaningful?.replace(/_/g, ' ') ?? 'Local Business';
}

async function scoreOne(client: Anthropic, lead: LeadInput): Promise<{ place_id: string } & ScoreResult> {
  const industry = inferIndustry(lead.types);
  const presence = [
    lead.website ? `has website: ${lead.website}` : 'no website listed',
    lead.rating != null
      ? `Google rating ${lead.rating}/5 with ${lead.user_ratings_total?.toLocaleString()} reviews`
      : 'no Google reviews or rating',
  ].join('; ');

  const prompt = `Business: ${lead.name}. Location: ${lead.address}. Industry: ${industry}. Online presence: ${presence}.`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(text) as ScoreResult;
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

  const scores: Record<string, ScoreResult> = {};
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const { place_id, ...rest } = result.value;
      scores[place_id] = rest;
    } else {
      console.error(`Scoring failed for ${leads[i].name}:`, result.reason);
    }
  });

  return NextResponse.json({ scores });
}
