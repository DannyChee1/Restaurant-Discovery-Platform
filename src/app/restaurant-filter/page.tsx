'use client'
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function RestaurantFilter() {
    const router = useRouter();
    const [useCurrentLocation, setUseCurrentLocation] = useState(false);
    const [location, setLocation] = useState<{ coords: { latitude: number; longitude: number; altitude: number | null; accuracy: number | null; altitudeAccuracy: number | null; heading: number | null; speed: number | null }; timestamp: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [distance, setDistance] = useState(5); // in km (float)
    const [selectedBudget, setSelectedBudget] = useState(1); // Google's 1-4 (no free)
    const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
    const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
    // const [isBackButtonPressed, setIsBackButtonPressed] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [address, setAddress] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState<{ place_id: string; description: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [rating, setRating] = useState(0); // Google's 0-4
    const [restaurantCount, setRestaurantCount] = useState(0);
    const [isSearchingRestaurants, setIsSearchingRestaurants] = useState(false);
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const sessionToken = useRef<string | null>(null);

    const cuisines = ['All', 'American', 'Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Thai', 'Indian', 'Turkish', 'Lebanese', 'Greek', 'Italian', 'Spanish', 'French', 'Mexican', 'Brazilian', 'German', 'African', 'Mediterranean', 'Middle Eastern', 'Pizza', 'Seafood', 'Steak House', 'Sushi', 'Vegan', 'Vegetarian'];

    const dietaryRestrictions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher', 'Pescatarian'];

    const toggleCuisine = (cuisine: string) => {
        if (cuisine === 'All') {
            if (selectedCuisines.includes('All')) {
                setSelectedCuisines([]);
            }
            else {
                setSelectedCuisines(cuisines);
            }
        } 
        else {
            if (selectedCuisines.includes('All')) {
                setSelectedCuisines([cuisine]);
            } 
            else {
                if (selectedCuisines.includes(cuisine)) {
                    setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
                } 
                else {
                    setSelectedCuisines([...selectedCuisines, cuisine]);
                }
            }
        }
    };

    const toggleRestriction = (restriction: string) => {
        if (selectedRestrictions.includes(restriction)) {
            setSelectedRestrictions(selectedRestrictions.filter(r => r !== restriction));
        } else {
            setSelectedRestrictions([...selectedRestrictions, restriction]);
        }
    };

    const handleSearchAndGoToWheel = async () => {
        if (selectedCuisines.length === 0) {
            setErrorMessage('Please select at least one cuisine');
            setShowError(true);
            return;
        }
        
        // console.log('Location state:', location);
        if (!location || !location.coords) {
            setErrorMessage('Please select a location');
            setShowError(true);
            return;
        }
        
        setShowError(false);
        
        const restaurants = await searchRestaurants();
        
        // Store restaurants in localStorage and navigate to wheel
        if (restaurants && restaurants.length > 0) {
            // Store in localStorage with a timestamp to avoid conflicts
            const restaurantData = {
                restaurants: restaurants,
                timestamp: Date.now()
            };
            localStorage.setItem('restaurantData', JSON.stringify(restaurantData));
        }
        
        // Navigate to wheel page
        router.push('/wheel');
    };

    const reverseGeocode = async (latitude: number, longitude: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data: { address?: { display_name: string }; display_name?: string } = await response.json();
            if (data && data.display_name) {
                setAddress(data.display_name);
                return;
            }

        } catch (error) {
            console.warn("Error fetching address:", error);
        }
    };

    const handleLocationToggle = async () => {
        if (!useCurrentLocation) {
            try {
                const currentLocation = await getCurrentPosition();
                setLocation(currentLocation);
                await reverseGeocode(currentLocation.coords.latitude, currentLocation.coords.longitude);
                setUseCurrentLocation(true);
                setSearchQuery('');
                setPredictions([]);
            } 
            catch (error: any) {
                const errorMessage = error.message || 'Could not get location';
                setLocationError(errorMessage);
                setUseCurrentLocation(false);
                console.error('Location error:', error);
            }
        } 
        else {
            setUseCurrentLocation(false);
            setLocation(null);
            setLocationError(null);
            setAddress(null);
        }
    };

    const getCurrentPosition = (): Promise<{ coords: { latitude: number; longitude: number; altitude: number | null; accuracy: number | null; altitudeAccuracy: number | null; heading: number | null; speed: number | null }; timestamp: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 30000, // 10 seconds
                maximumAge: 0 // 1 minute
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        coords: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            altitude: position.coords.altitude,
                            accuracy: position.coords.accuracy,
                            altitudeAccuracy: position.coords.altitudeAccuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                        },
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    let errorMessage = 'Unknown error occurred';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access was denied. Please click "Allow" when the browser asks for location permission, or try clicking the toggle again.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable. Please check if your device location services are enabled.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please try clicking the toggle again.';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                options
            );
        });
    };

    // const handleSearchPress = () => {
    //     setSearchQuery('');
    //     setUseCurrentLocation(false);
    //     setLocation(null);
    //     setLocationError(null);
    // };

    // Generate a new session token
    const generateSessionToken = () => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionToken.current = token;
        return token;
    };

    // Initialize session token
    useEffect(() => {
        generateSessionToken();
    }, []);

    // Load saved filters from localStorage
    useEffect(() => {
        const savedFilters = localStorage.getItem('restaurantFilters');
        if (savedFilters) {
            try {
                const filters = JSON.parse(savedFilters);
                
                // Set all filters at once to avoid timing issues
                if (filters.useCurrentLocation !== undefined) setUseCurrentLocation(filters.useCurrentLocation);
                if (filters.location !== undefined) setLocation(filters.location);
                if (filters.address !== undefined) setAddress(filters.address);
                if (filters.distance !== undefined) setDistance(filters.distance);
                if (filters.selectedBudget !== undefined) setSelectedBudget(filters.selectedBudget);
                if (filters.selectedCuisines !== undefined) setSelectedCuisines(filters.selectedCuisines);
                if (filters.selectedRestrictions !== undefined) setSelectedRestrictions(filters.selectedRestrictions);
                if (filters.rating !== undefined) setRating(filters.rating);
            } catch (error) {
                console.error('Error loading saved filters:', error);
            }
        }
        setIsLoadingFilters(false);
    }, []);

    // Save filters to localStorage whenever they change (but not when loading)
    useEffect(() => {
        if (!isLoadingFilters) {
            const filters = {
                useCurrentLocation,
                location,
                address,
                distance,
                selectedBudget,
                selectedCuisines,
                selectedRestrictions,
                rating
            };
            localStorage.setItem('restaurantFilters', JSON.stringify(filters));
        }
    }, [useCurrentLocation, location, address, distance, selectedBudget, selectedCuisines, selectedRestrictions, rating, isLoadingFilters]);

    const searchPlaces = useCallback(async (text: string) => {
        if (!text.trim()) {
            setPredictions([]);
            return;
        }

        try {
            // Add a small delay to prevent too many requests
            await new Promise(resolve => setTimeout(resolve, 300));

            const response = await fetch('/api/places/autocomplete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: text,
                    sessionToken: sessionToken.current
                    // For now, do without location bias. Potentially could get ip and use that to get location bias.
                })
            });
            if (!response.ok) {
                throw new Error('Failed to fetch predictions');
            }
            const data = await response.json();
            setPredictions(data.predictions || []);
            

        } catch (error) {
            console.error('Error fetching predictions:', error);
            setPredictions([]);
        }
    }, []);

    const handlePlaceSelect = async (place: { place_id: string; description: string }) => {
        try {
            setAddress(place.description);
            
            const placeDetails = await getPlaceDetails(place.place_id);
            // console.log('Place details:', placeDetails);
            if (placeDetails && placeDetails.geometry) {
                const newLocation = {
                    coords: {
                        latitude: placeDetails.geometry.location.lat,
                        longitude: placeDetails.geometry.location.lng,
                        altitude: null,
                        accuracy: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null,
                    },
                    timestamp: Date.now()
                };
                // console.log('Setting location:', newLocation);
                setLocation(newLocation);
            } else {
                console.error('No geometry found in place details');
            }
            
            setSearchQuery('');
            setPredictions([]);
            setIsSearching(false);

            // Generate a new session token after successful place selection
            generateSessionToken();
        } catch (error) {
            console.error('Error setting location:', error);
        }
    };

    const getPlaceDetails = async (placeId: string): Promise<{ geometry: { location: { lat: number; lng: number } } } | null> => {
        try {
            // console.log('Fetching place details for:', placeId);
            const response = await fetch('/api/places/details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    placeId: placeId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch place details');
            }

            const data = await response.json();
            // console.log('Place details received:', data.place);
            return data.place;
        } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
        }
    };

    const debouncedSearch = useCallback(
        (text: string) => {
            const timeoutId = setTimeout(() => {
                if (text.trim().length > 2) {
                    searchPlaces(text);
                } else {
                    setPredictions([]);
                }
            }, 300); // 300ms delay
            return () => clearTimeout(timeoutId);
        },
        [searchPlaces]
    );

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        debouncedSearch(text);
    };

    const clearFilters = () => {
        setUseCurrentLocation(false);
        setLocation(null);
        setAddress(null);
        setDistance(5);
        setSelectedBudget(1);
        setSelectedCuisines([]);
        setSelectedRestrictions([]);
        setRating(0);
        setSearchQuery('');
        setPredictions([]);
        setRestaurantCount(0);
        setShowError(false);
        setErrorMessage('');
        localStorage.removeItem('restaurantFilters');
    };

    const searchRestaurants = async () => {
        if (!location || !location.coords) {
            setRestaurantCount(0);
            return;
        }

        setIsSearchingRestaurants(true);
        try {
            const response = await fetch('/api/places/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    location: {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude
                    },
                    radius: distance,
                    cuisine: selectedCuisines.length > 0 ? selectedCuisines : null,
                    priceLevel: selectedBudget,
                    minRating: rating,
                    dietaryRestrictions: selectedRestrictions.length > 0 ? selectedRestrictions : null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch restaurants');
            }

            const data = await response.json();
            setRestaurantCount(data.total_results || 0);
            
            if (data.restaurants && data.restaurants.length > 0) {
                return data.restaurants;
            }
            return [];
        } catch (error) {
            console.error('Error searching restaurants:', error);
            setRestaurantCount(0);
            return [];
        } finally {
            setIsSearchingRestaurants(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fefefe] overflow-y-auto">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 h-20 bg-white shadow-lg z-10">
                <div className="flex items-center h-full px-8">
                    <button 
                        onClick={() => router.push('/')}
                        className="text-3xl font-bold text-black hover:text-gray-700 transition-colors duration-200 cursor-pointer"
                    >
                        Rouleat
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-45 px-5 pb-32 overflow-y-auto">
                <div className="flex justify-between items-center mt-8 mb-8">
                    <h1 className="text-3xl font-bold text-black">Filters</h1>
                    <button 
                        onClick={clearFilters}
                        className="text-sm text-gray-600 hover:text-black transition-colors duration-200 underline"
                    >
                        Clear All Filters
                    </button>
                </div>

                {/* Location Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-black">Location</h2>
                    {address ? <p className="text-base text-black mb-4">Address: {address}</p> : <p className="text-base text-black mb-4">Address: None Selected</p>}
                    {locationError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                            <p className="text-sm text-red-700">{locationError}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-base text-black">Use Current Location</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={useCurrentLocation}
                                onChange={handleLocationToggle}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div>
                        </label>
                    </div>
                    {!useCurrentLocation && (
                        <div className="mt-2.5 relative z-10">
                            <input
                                className="h-11 w-full border border-[#e0e0e0] rounded-lg px-4 text-base bg-white"
                                placeholder="Search for a location"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onFocus={() => setIsSearching(true)}
                                onBlur={() => {
                                    setTimeout(() => setIsSearching(false), 200);
                                }}
                            />
                            {isSearching && predictions.length > 0 && (
                                <div className="absolute top-11 left-0 right-0 bg-white border border-[#e0e0e0] rounded-lg mt-1 max-h-50 z-20">
                                    {predictions.map((prediction) => (
                                        <button
                                            key={prediction.place_id}
                                            className="w-full p-4 text-left border-b border-[#e0e0e0] hover:bg-gray-50"
                                            onClick={() => handlePlaceSelect(prediction)}
                                        >
                                            <span className="text-sm text-black">{prediction.description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Distance Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-black">Distance</h2>
                    <div className="px-2.5">
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={distance}
                            onChange={(e) => setDistance(parseFloat(e.target.value))}
                            className="w-full h-10 bg-black rounded-lg appearance-none cursor-pointer slider"
                        />
                        <p className="text-center text-base text-black mt-2.5">{distance.toFixed(1)} km</p>
                    </div>
                </div>

                {/* Rating Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-black">Rating</h2>
                    <div className="px-2.5">
                        <input
                            type="range"
                            min="0"
                            max="4"
                            step="0.5"
                            value={rating}
                            onChange={(e) => setRating(parseFloat(e.target.value))}
                            className="w-full h-10 bg-black rounded-lg appearance-none cursor-pointer slider"
                        />
                        <p className="text-center text-base text-black mt-2.5">{rating.toFixed(1)}+ Stars</p>
                    </div>
                </div>

                {/* Budget Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-black">Budget</h2>
                    <div className="flex justify-between gap-2.5">
                        <button
                            className={`flex-1 p-4 rounded-lg border border-[#e0e0e0] text-center transition-colors duration-200 ${
                                selectedBudget === 1 ? 'bg-black border-[#34C759]' : 'bg-[#f0f0f0]'
                            }`}
                            onClick={() => setSelectedBudget(1)}
                        >
                            <span className={`block text-xl font-bold ${selectedBudget === 1 ? 'text-white' : 'text-black'}`}>$</span>
                            <span className={`block text-xs mt-1 ${selectedBudget === 1 ? 'text-white' : 'text-[#666]'}`}>Inexpensive</span>
                        </button>
                        <button
                            className={`flex-1 p-4 rounded-lg border border-[#e0e0e0] text-center transition-colors duration-200 ${
                                selectedBudget === 2 ? 'bg-black border-[#34C759]' : 'bg-[#f0f0f0]'
                            }`}
                            onClick={() => setSelectedBudget(2)}
                        >
                            <span className={`block text-xl font-bold ${selectedBudget === 2 ? 'text-white' : 'text-black'}`}>$$</span>
                            <span className={`block text-xs mt-1 ${selectedBudget === 2 ? 'text-white' : 'text-[#666]'}`}>Moderate</span>
                        </button>
                        <button
                            className={`flex-1 p-4 rounded-lg border border-[#e0e0e0] text-center transition-colors duration-200 ${
                                selectedBudget === 3 ? 'bg-black border-[#34C759]' : 'bg-[#f0f0f0]'
                            }`}
                            onClick={() => setSelectedBudget(3)}
                        >
                            <span className={`block text-xl font-bold ${selectedBudget === 3 ? 'text-white' : 'text-black'}`}>$$$</span>
                            <span className={`block text-xs mt-1 ${selectedBudget === 3 ? 'text-white' : 'text-[#666]'}`}>Expensive</span>
                        </button>
                        <button
                            className={`flex-1 p-4 rounded-lg border border-[#e0e0e0] text-center transition-colors duration-200 ${
                                selectedBudget === 4 ? 'bg-black border-[#34C759]' : 'bg-[#f0f0f0]'
                            }`}
                            onClick={() => setSelectedBudget(4)}
                        >
                            <span className={`block text-xl font-bold ${selectedBudget === 4 ? 'text-white' : 'text-black'}`}>$$$$</span>
                            <span className={`block text-xs mt-1 ${selectedBudget === 4 ? 'text-white' : 'text-[#666]'}`}>Very Expensive</span>
                        </button>
                    </div>
                </div>

                {/* Cuisine Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-black">Cuisine</h2>
                    <div className="flex flex-wrap gap-2.5 mb-2.5">
                        {cuisines.map((cuisine) => (
                            <button
                                key={cuisine}
                                className={`py-2.5 px-5 rounded-full border border-[#e0e0e0] min-w-[30%] text-center transition-colors duration-200 ${
                                    selectedCuisines.includes(cuisine) ? 'bg-black border-[#34C759]' : ''
                                }`}
                                onClick={() => toggleCuisine(cuisine)}
                            >
                                <span className={`text-base ${selectedCuisines.includes(cuisine) ? 'text-white' : 'text-black'}`}>{cuisine}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dietary Restrictions Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-black">Dietary Restrictions</h2>
                    <div className="flex flex-wrap gap-2.5 mb-2.5">
                        {dietaryRestrictions.map((restriction) => (
                            <button
                                key={restriction}
                                className={`py-2.5 px-5 rounded-full border border-[#e0e0e0] min-w-[30%] text-center transition-colors duration-200 ${
                                    selectedRestrictions.includes(restriction) ? 'bg-black border-[#34C759]' : ''
                                }`}
                                onClick={() => toggleRestriction(restriction)}
                            >
                                <span className={`text-base ${selectedRestrictions.includes(restriction) ? 'text-white' : 'text-black'}`}>{restriction}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-8 p-5 bg-[#f0f0f0] rounded-lg border border-[#e0e0e0]">
                    {isSearchingRestaurants ? (
                        <p className="text-lg text-black text-center font-semibold">Searching restaurants...</p>
                    ) : restaurantCount > 0 ? (
                        <p className="text-lg text-black text-center font-semibold">
                            Number of locations found: {restaurantCount}
                        </p>
                    ) : (
                        <p className="text-lg text-black text-center font-semibold">
                            Click &quot;Search & Go to Wheel&quot; to find restaurants
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#eee]">
                {showError && (
                    <p className="text-[#FF3B30] text-xs text-center mb-2">{errorMessage}</p>
                )}
                <button 
                    className="w-full bg-black p-4 rounded-lg text-center transition-colors duration-200 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSearchAndGoToWheel}
                    disabled={isSearchingRestaurants}
                >
                    <span className="text-white text-lg font-semibold">
                        {isSearchingRestaurants ? 'Searching Restaurants...' : 'Search & Go to Wheel'}
                    </span>
                </button>
            </div>

            <style jsx>{`
                .slider {
                    -webkit-appearance: none;
                    appearance: none;
                    background: transparent;
                    cursor: pointer;
                }
                
                .slider::-webkit-slider-track {
                    background: #e5e7eb;
                    height: 8px;
                    border-radius: 4px;
                }
                
                .slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #000;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .slider::-moz-range-track {
                    background: #e5e7eb;
                    height: 8px;
                    border-radius: 4px;
                    border: none;
                }
                
                .slider::-moz-range-thumb {
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #000;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
            `}</style>
        </div>
    );
}
