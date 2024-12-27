import React, { useState } from "react";
import { supabase } from '@/supabaseClient';
import { useUser } from '@/components/Contexts/userContext'

const SetLocation = ({ teacherId, onLocationSet }) => {
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const { userData } = useUser();

    const handleSetLocation = async () => {
        if (navigator.geolocation) {
            setLoading(true); // Show loading while setting location
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });
                    setMessage(
                        `Location set to Latitude: ${latitude}, Longitude: ${longitude}.`
                    );

                    // Update Supabase
                    try {
                        const { error } = await supabase
                            .from("teachers")
                            .update({
                                accepted_lag: latitude,
                                accepted_long: longitude,
                            })
                            .eq("teacher_id", userData.user_id); // Ensure you're updating the correct teacher's row

                        if (error) {
                            setMessage("Failed to update location in the database.");
                            console.error(error);
                        } else {
                            setMessage("Location updated successfully in the database.");
                        }

                        if (onLocationSet) {
                            onLocationSet({ lat: latitude, lng: longitude });
                        }
                    } catch (err) {
                        setMessage("An error occurred while updating the location.");
                        console.error(err);
                    } finally {
                        setLoading(false);
                    }
                },
                () => {
                    setMessage("Unable to fetch your location. Please try again.");
                    setLoading(false);
                }
            );
        } else {
            setMessage("Geolocation is not supported by your browser.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <button
                onClick={handleSetLocation}
                className="px-6 py-3 font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                disabled={loading} // Disable button while loading
            >
                {loading ? "Setting Location..." : "Set Current Location"}
            </button>
            {message && <p className="mt-4 text-gray-700">{message}</p>}
            {location.lat && location.lng && (
                <p className="mt-2 text-sm text-gray-500">
                    Latitude: {location.lat}, Longitude: {location.lng}
                </p>
            )}
        </div>
    );
};

export default SetLocation;
