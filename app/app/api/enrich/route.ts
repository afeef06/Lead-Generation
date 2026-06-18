import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

function extractDomain(website: string): string | null {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

interface HunterEmail {
  value: string;
  confidence: number;
  type: string;
}

async function hunterSearch(domain: string, apiKey: string) {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { data?: { emails?: HunterEmail[] }; errors?: { details: string }[] };

  if (data.errors?.length) return null;

  const emails = data.data?.emails ?? [];
  if (emails.length === 0) return null;

  const GENERIC = new Set(['info', 'hello', 'contact', 'hi', 'support', 'team']);
  const generic = emails.find(e => GENERIC.has(e.value.split('@')[0]));
  const best = generic ?? emails.sort((a, b) => b.confidence - a.confidence)[0];

  return { email: best.value, confidence: best.confidence, source: 'hunter' as const };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id, website } = await req.json() as { lead_id?: string; website?: string };
  if (!website) return NextResponse.json({ error: 'website required' }, { status: 400 });

  const domain = extractDomain(website);
  if (!domain) return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });

  let result: { email: string; confidence?: number; source: 'hunter' | 'inferred' } | null = null;

  const hunterKey = process.env.HUNTER_API_KEY;
  if (hunterKey) {
    result = await hunterSearch(domain, hunterKey).catch(() => null);
  }

  if (!result) {
    result = { email: `info@${domain}`, source: 'inferred' };
  }

  if (lead_id) {
    await supabase.from('leads').update({ email: result.email }).eq('id', lead_id);
  }

  return NextResponse.json({ ...result, domain });
}
