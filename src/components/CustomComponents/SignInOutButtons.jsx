import React, { useState } from "react";

const AttendanceSystem = () => {
  const [message, setMessage] = useState("");

  const allowedLocation = {
    lat: 4.8822894, // Replace with your allowed latitude
    lng: 7.018906, // Replace with your allowed longitude
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const R = 6371e3; // Earth's radius in meters
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleAction = async (action) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = calculateDistance(
            allowedLocation.lat,
            allowedLocation.lng,
            latitude,
            longitude
          );

          console.log("Current Position:", latitude, longitude);
          console.log("Allowed Position:", allowedLocation.lat, allowedLocation.lng);
          console.log("Calculated Distance (meters):", distance);

          if (distance <= 10) { // Increased threshold to 10 meters
            setMessage(`You have ${action}.`);
          } else {
            setMessage(
              `You are not in the correct location. Distance: ${distance.toFixed(
                2
              )} meters away.`
            );
          }
        },
        (error) => {
          setMessage("Unable to fetch your location. Please try again.");
          console.error("Geolocation error:", error);
        }
      );
    } else {
      setMessage("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-purple-100 dark:from-gray-800 dark:to-purple-900">
      <h1 className="text-4xl font-bold text-purple-600 dark:text-gray-100 mb-8">
        Smart Attendance System
      </h1>
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          className="px-8 py-3 font-bold text-white bg-gradient-to-r from-purple-500 to-purple-700 rounded-full shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
          onClick={() => handleAction("signed in")}
          aria-label="Sign In"
        >
          Sign In
        </button>
        <button
          className="px-8 py-3 font-bold text-purple-700 bg-white border-2 border-purple-500 rounded-full shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
          onClick={() => handleAction("signed out")}
          aria-label="Sign Out"
        >
          Sign Out
        </button>
      </div>
      {message && (
        <p className="mt-6 text-center text-gray-600 dark:text-gray-300">
          {message}
        </p>
      )}
      <p className="mt-6 text-gray-600 text-center dark:text-gray-400">
        Sign-in and sign-out is restricted to a specific room. Ensure you are in
        the correct location.
      </p>
    </div>
  );
};

export default AttendanceSystem;
