import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { 
            location, 
            radius, 
            cuisine, 
            priceLevel, 
            minRating,
            dietaryRestrictions 
        } = await request.json();

        if (!location || !location.lat || !location.lng) {
            return NextResponse.json({ error: 'Location coordinates are required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not set' }, { status: 500 });
        }

        // Build search parameters
        const params = new URLSearchParams({
            location: `${location.lat},${location.lng}`,
            radius: radius ? (radius * 1000).toString() : '5000',
            type: 'restaurant',
            key: apiKey
        });

        // Add cuisine filter using Google's place types
        if (cuisine && cuisine.length > 0 && !cuisine.includes('All')) {
            // Use keyword search for multiple cuisines
            const cuisineKeywords = cuisine.join(' OR ');
            params.append('keyword', cuisineKeywords);
        }

        if (priceLevel !== undefined && priceLevel !== null) {
            params.append('price_level', priceLevel.toString());
        }

        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            const dietaryKeywords = dietaryRestrictions.join(' OR ');
            if (params.has('keyword')) {
                params.set('keyword', `${params.get('keyword')} ${dietaryKeywords}`);
            } else {
                params.append('keyword', dietaryKeywords);
            }
        }

        const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Places API error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: response.status });
        }

        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Google Places API error:', data);
            return NextResponse.json({ error: 'Places API error: ' + data.status }, { status: 400 });
        }

        // Filter results by minimum rating if specified
        let restaurants = data.results || [];
        
        if (minRating) {
            restaurants = restaurants.filter((restaurant: { rating?: number }) => 
                restaurant.rating && restaurant.rating >= minRating
            );
        }

        const formattedRestaurants = restaurants.map((restaurant: { place_id: string; name: string; rating?: number; price_level?: number; vicinity: string; geometry: { location: { lat: number; lng: number } }; photos?: { photo_reference: string; height: number; width: number; html_attributions: string[] }[]; types?: string[]; user_ratings_total?: number; business_status?: string }) => ({
            place_id: restaurant.place_id,
            name: restaurant.name,
            rating: restaurant.rating || 0,
            price_level: restaurant.price_level || 1, // Default free restaurants to inexpensive (1)
            vicinity: restaurant.vicinity,
            geometry: restaurant.geometry,
            photos: restaurant.photos || [],
            types: restaurant.types || [],
            user_ratings_total: restaurant.user_ratings_total || 0,
            business_status: restaurant.business_status
        }));

        return NextResponse.json({ 
            restaurants: formattedRestaurants,
            total_results: formattedRestaurants.length,
            next_page_token: data.next_page_token
        });

    } catch (error) {
        console.error('Error in restaurant search API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
