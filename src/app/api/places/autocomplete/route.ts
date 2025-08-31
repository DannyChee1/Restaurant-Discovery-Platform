import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { input, sessionToken } = await request.json();

        if (!input || input.trim().length < 3) {
            return NextResponse.json({ error: 'Input must be at least 3 characters' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not set' }, { status: 500 });
        }

        const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text'
            },
            body: JSON.stringify({
                input: input.trim(),
                sessionToken: sessionToken,
                // includedPrimaryTypes: ['restaurant', 'food', 'establishment'],
                // maxResultCount: 5  // This parameter doesn't exist in Google Places API v1
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Places API error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch places' }, { status: response.status });
        }

        const data = await response.json();
        
        const predictions = data.suggestions?.map((suggestion: any) => {
            if (suggestion.placePrediction) {
                return {
                    place_id: suggestion.placePrediction.placeId,
                    description: suggestion.placePrediction.text.text
                };
            }
            return null;
        }).filter(Boolean) || [];

        return NextResponse.json({ predictions });
    } catch (error) {
        console.error('Error in autocomplete API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
