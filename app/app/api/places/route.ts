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

async function googleTextSearch(params: Record<string, string>, apiKey: string): Promise<TextSearchResponse> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('key', apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json() as Promise<TextSearchResponse>;
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

  let searchParams2: Record<string, string>;
  let queryLabel: string;

  if (pagetoken) {
    // Google page tokens need a few seconds before they become valid
    await new Promise(r => setTimeout(r, 3000));
    searchParams2 = { pagetoken };
    queryLabel = searchParams.get('query') ?? '';
  } else if (name) {
    const q = city ? `${name} in ${city}` : name;
    searchParams2 = { query: q };
    queryLabel = q;
  } else {
    if (!niche || !city) {
      return NextResponse.json({ error: 'Provide name, or both niche and city' }, { status: 400 });
    }
    searchParams2 = { query: `${niche} in ${city}` };
    queryLabel = `${niche} in ${city}`;
  }

  let searchData = await googleTextSearch(searchParams2, apiKey);

  // Retry once if the token isn't ready yet
  if (pagetoken && searchData.status === 'INVALID_REQUEST') {
    console.error('[places] pagetoken INVALID_REQUEST on first attempt, retrying in 2s. error_message:', searchData.error_message);
    await new Promise(r => setTimeout(r, 2000));
    searchData = await googleTextSearch(searchParams2, apiKey);
  }

  if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
    console.error('[places] Google error:', searchData.status, searchData.error_message);
    return NextResponse.json(
      {
        error: searchData.error_message || `Google Places error: ${searchData.status}`,
        _debug: pagetoken
          ? { tokenLen: pagetoken.length, tokenHead: pagetoken.slice(0, 12), tokenTail: pagetoken.slice(-6), status: searchData.status, errorMessage: searchData.error_message }
          : undefined,
      },
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
