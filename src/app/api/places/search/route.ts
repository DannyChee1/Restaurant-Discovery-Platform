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
            // Map cuisines to Google's place types
            const cuisineMap: { [key: string]: string } = {
                'American': 'american_restaurant',
                'Chinese': 'chinese_restaurant',
                'Japanese': 'japanese_restaurant',
                'Korean': 'korean_restaurant',
                'Vietnamese': 'vietnamese_restaurant',
                'Thai': 'thai_restaurant',
                'Indian': 'indian_restaurant',
                'Turkish': 'turkish_restaurant',
                'Lebanese': 'lebanese_restaurant',
                'Greek': 'greek_restaurant',
                'Italian': 'italian_restaurant',
                'Spanish': 'spanish_restaurant',
                'French': 'french_restaurant',
                'Mexican': 'mexican_restaurant',
                'Brazilian': 'brazilian_restaurant',
                'German': 'german_restaurant',
                'African': 'african_restaurant',
                'Mediterranean': 'mediterranean_restaurant',
                'Middle Eastern': 'middle_eastern_restaurant',
                'Pizza': 'pizza_restaurant',
                'Seafood': 'seafood_restaurant',
                'Steak House': 'steak_house',
                'Sushi': 'sushi_restaurant',
                'Vegan': 'vegan_restaurant',
                'Vegetarian': 'vegetarian_restaurant'
            };
            
            // const placeTypes = cuisine.map((c: string) => cuisineMap[c] || c.toLowerCase().replace(/\s+/g, '_') + '_restaurant');
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

        const formattedRestaurants = restaurants.map((restaurant: { place_id: string; name: string; rating?: number; price_level?: number; vicinity: string; geometry: any; photos?: any[]; types?: string[]; user_ratings_total?: number; business_status?: string }) => ({
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
