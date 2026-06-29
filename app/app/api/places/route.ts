import { NextRequest, NextResponse } from 'next/server';

export interface PlacesResult {
  place_id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number | null;
  user_ratings_total: number | null;
  types: string[];
  maps_url: string;
}

interface NewPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
}

interface NewPlacesResponse {
  places?: NewPlace[];
  nextPageToken?: string;
  error?: { message: string; status: string };
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'nextPageToken',
].join(',');

async function searchPlaces(body: Record<string, unknown>, apiKey: string): Promise<NewPlacesResponse> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<NewPlacesResponse>;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get('niche')?.trim();
  const city = searchParams.get('city')?.trim();
  const name = searchParams.get('name')?.trim();
  const pagetoken = searchParams.get('pagetoken');
  const query = searchParams.get('query');

  let textQuery: string;
  let queryLabel: string;
  let requestBody: Record<string, unknown>;

  if (pagetoken) {
    textQuery = query ?? '';
    queryLabel = textQuery;
    requestBody = { textQuery, pageToken: pagetoken, pageSize: 20 };
  } else if (name) {
    textQuery = city ? `${name} in ${city}` : name;
    queryLabel = textQuery;
    requestBody = { textQuery, pageSize: 20 };
  } else {
    if (!niche || !city) {
      return NextResponse.json({ error: 'Provide name, or both niche and city' }, { status: 400 });
    }
    textQuery = `${niche} in ${city}`;
    queryLabel = textQuery;
    requestBody = { textQuery, pageSize: 20 };
  }

  const data = await searchPlaces(requestBody, apiKey);

  if (data.error) {
    console.error('[places] API error:', data.error.status, data.error.message);
    return NextResponse.json(
      { error: data.error.message || `Google Places error: ${data.error.status}` },
      { status: 502 }
    );
  }

  const places = data.places ?? [];

  const results: PlacesResult[] = places.map(p => ({
    place_id: p.id,
    name: p.displayName?.text ?? 'Unknown',
    address: p.formattedAddress ?? '',
    phone: p.nationalPhoneNumber ?? '',
    website: p.websiteUri ?? '',
    rating: p.rating ?? null,
    user_ratings_total: p.userRatingCount ?? null,
    types: p.types ?? [],
    maps_url: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
  }));

  return NextResponse.json({
    results,
    query: queryLabel,
    total: results.length,
    next_page_token: data.nextPageToken ?? null,
  });
}
