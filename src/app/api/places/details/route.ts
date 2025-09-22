import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { placeId } = await request.json();

        if (!placeId) {
            return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not set' }, { status: 500 });
        }

        const fields = [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'rating',
            'user_ratings_total',
            'price_level',
            'photos',
            'types',
            'business_status',
            'formatted_phone_number',
            'website',
            'opening_hours',
            'reviews'
        ].join(',');

        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Places API error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch place details' }, { status: response.status });
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Google Places API error:', data);
            return NextResponse.json({ error: 'Places API error: ' + data.status }, { status: 400 });
        }

        const place = data.result;

        const formattedPlace = {
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            geometry: place.geometry,
            rating: place.rating || 0,
            user_ratings_total: place.user_ratings_total || 0,
            price_level: place.price_level || 0,
            photos: place.photos?.map((photo: { photo_reference: string; height: number; width: number; html_attributions: string[] }) => ({
                photo_reference: photo.photo_reference,
                height: photo.height,
                width: photo.width,
                html_attributions: photo.html_attributions
            })) || [],
            types: place.types || [],
            business_status: place.business_status,
            formatted_phone_number: place.formatted_phone_number,
            website: place.website,
            opening_hours: place.opening_hours ? {
                open_now: place.opening_hours.open_now,
                weekday_text: place.opening_hours.weekday_text || []
            } : null,
            reviews: place.reviews?.map((review: { author_name: string; rating: number; text: string; time: number; relative_time_description: string }) => ({
                author_name: review.author_name,
                rating: review.rating,
                text: review.text,
                time: review.time,
                relative_time_description: review.relative_time_description
            })) || []
        };

        return NextResponse.json({ place: formattedPlace });

    } catch (error) {
        console.error('Error in place details API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
