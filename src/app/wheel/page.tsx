'use client'
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from 'react';

interface Restaurant {
    place_id: string;
    name: string;
    rating: number;
    price_level: number;
    vicinity: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    photos: any[];
    types: string[];
    user_ratings_total: number;
    business_status: string;
}

export default function WheelPage() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get restaurant data from localStorage
    useEffect(() => {
        const storedData = localStorage.getItem('restaurantData');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (parsedData.restaurants && Array.isArray(parsedData.restaurants)) {
                    setRestaurants(parsedData.restaurants);
                }
            } catch (error) {
                console.error('Error parsing restaurant data:', error);
            }
        }
        setIsLoading(false);
    }, []);

    const spinWheel = () => {
        if (restaurants.length === 0) return;
        
        setIsSpinning(true);
        
        // Select restaurant immediately
        const randomIndex = Math.floor(Math.random() * restaurants.length);
        setSelectedRestaurant(restaurants[randomIndex]);
        setIsSpinning(false);
    };

    const getPriceLevelText = (priceLevel: number) => {
        switch (priceLevel) {
            case 1: return 'Inexpensive ($)';
            case 2: return 'Moderate ($$)';
            case 3: return 'Expensive ($$$)';
            case 4: return 'Very Expensive ($$$$)';
            default: return 'Inexpensive ($)'; // Default to inexpensive for free/unknown
        }
    };

    const getStarRating = (rating: number) => {
        return '★'.repeat(Math.floor(rating)) + '☆'.repeat(4 - Math.floor(rating));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fefefe] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-lg text-black">Loading restaurants...</p>
                </div>
            </div>
        );
    }

    if (restaurants.length === 0) {
        return (
            <div className="min-h-screen bg-[#fefefe] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-black mb-4">No Restaurants Found</h1>
                    <p className="text-lg text-gray-600 mb-8">No restaurants match your criteria.</p>
                    <button 
                        onClick={() => router.push('/restaurant-filter')}
                        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Back to Filters
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fefefe] overflow-y-auto">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 h-20 bg-white shadow-lg z-10">
                <div className="flex items-center justify-between h-full px-8">
                    <button 
                        onClick={() => router.push('/')}
                        className="text-3xl font-bold text-black hover:text-gray-700 transition-colors duration-200 cursor-pointer"
                    >
                        Rouleat
                    </button>
                    <button 
                        onClick={() => router.push('/restaurant-filter')}
                        className="text-lg text-black hover:text-gray-700 transition-colors duration-200"
                    >
                        Back to Filters
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-24 px-5 pb-8">
                <h1 className="text-3xl font-bold mb-8 text-black text-center">Random Select</h1>
                
                {/* Results Count */}
                <div className="mb-8 p-5 bg-[#f0f0f0] rounded-lg border border-[#e0e0e0]">
                    <p className="text-lg text-black text-center font-semibold">
                        Found {restaurants.length} restaurants matching your criteria
                    </p>
                </div>

                {/* Random Select Section */}
                <div className="mb-8 text-center">
                    <button 
                        onClick={spinWheel}
                        disabled={isSpinning}
                        className="bg-black text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSpinning ? 'Selecting...' : 'Select Random'}
                    </button>
                </div>

                {/* Selected Restaurant */}
                {selectedRestaurant && (
                    <div className="mb-8 p-6 bg-white rounded-lg border border-[#e0e0e0] shadow-lg">
                        <h2 className="text-2xl font-bold text-black mb-4 text-center"> Selected Restaurant! </h2>
                        <div className="text-center">
                            <h3 className="text-xl font-semibold text-black mb-2">{selectedRestaurant.name}</h3>
                            <p className="text-gray-600 mb-2">{selectedRestaurant.vicinity}</p>
                            <div className="flex justify-center items-center gap-4 mb-4">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 text-lg">{getStarRating(selectedRestaurant.rating)}</span>
                                    <span className="text-black font-semibold">{selectedRestaurant.rating.toFixed(1)}</span>
                                    <span className="text-gray-500">({selectedRestaurant.user_ratings_total} reviews)</span>
                                </div>
                                <div className="text-black font-semibold">
                                    {getPriceLevelText(selectedRestaurant.price_level)}
                                </div>
                            </div>
                            <div className="text-sm text-gray-500">
                                Status: {selectedRestaurant.business_status}
                            </div>
                        </div>
                    </div>
                )}

                {/* All Restaurants List */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-black mb-6">All Restaurants ({restaurants.length})</h2>
                    <div className="grid gap-4">
                        {restaurants.map((restaurant, index) => (
                            <div 
                                key={restaurant.place_id} 
                                className={`p-4 rounded-lg border border-[#e0e0e0] bg-white hover:shadow-md transition-shadow ${
                                    selectedRestaurant?.place_id === restaurant.place_id ? 'ring-2 ring-green-500 bg-green-50' : ''
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-black mb-1">
                                            {index + 1}. {restaurant.name}
                                        </h3>
                                        <p className="text-gray-600 mb-2">{restaurant.vicinity}</p>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-500">{getStarRating(restaurant.rating)}</span>
                                                <span className="text-black font-semibold">{restaurant.rating.toFixed(1)}</span>
                                                <span className="text-gray-500">({restaurant.user_ratings_total})</span>
                                            </div>
                                            <div className="text-black font-semibold">
                                                {getPriceLevelText(restaurant.price_level)}
                                            </div>
                                            <div className="text-gray-500">
                                                {restaurant.business_status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
