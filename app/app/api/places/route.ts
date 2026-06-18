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

interface GooglePlaceCandidate {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

interface TextSearchResponse {
  status: string;
  results: GooglePlaceCandidate[];
  next_page_token?: string;
  error_message?: string;
}

interface PlaceDetailsResponse {
  status: string;
  result: GooglePlaceCandidate;
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<Partial<GooglePlaceCandidate>> {
  const fields = 'formatted_phone_number,website,rating,user_ratings_total';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json() as PlaceDetailsResponse;
  if (data.status === 'OK') return data.result;
  return {};
}

async function fetchPage(url: string, apiKey: string) {
  const res = await fetch(`${url}&key=${apiKey}`);
  const data = await res.json() as TextSearchResponse;
  return data;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get('niche')?.trim();
  const city = searchParams.get('city')?.trim();
  const pagetoken = searchParams.get('pagetoken');

  let textSearchUrl: string;
  let queryLabel: string;

  if (pagetoken) {
    // Google requires a short delay before a page token becomes valid
    await new Promise(r => setTimeout(r, 2000));
    textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(pagetoken)}`;
    queryLabel = searchParams.get('query') ?? '';
  } else {
    if (!niche || !city) {
      return NextResponse.json({ error: 'niche and city are required' }, { status: 400 });
    }
    const query = encodeURIComponent(`${niche} in ${city}`);
    textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}`;
    queryLabel = `${niche} in ${city}`;
  }

  const searchData = await fetchPage(textSearchUrl, apiKey);

  if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
    return NextResponse.json(
      { error: searchData.error_message || `Google Places error: ${searchData.status}` },
      { status: 502 }
    );
  }

  const rawResults = searchData.results ?? [];
  const top20 = rawResults.slice(0, 20);

  const details = await Promise.all(
    top20.map(r => getPlaceDetails(r.place_id, apiKey))
  );

  const results: PlacesResult[] = top20.map((r, i) => ({
    place_id: r.place_id,
    name: r.name,
    address: r.formatted_address,
    phone: details[i].formatted_phone_number ?? '',
    website: details[i].website ?? '',
    rating: details[i].rating ?? r.rating ?? null,
    user_ratings_total: details[i].user_ratings_total ?? r.user_ratings_total ?? null,
    types: r.types ?? [],
    maps_url: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
  }));

  return NextResponse.json({
    results,
    query: queryLabel,
    total: results.length,
    next_page_token: searchData.next_page_token ?? null,
  });
}
