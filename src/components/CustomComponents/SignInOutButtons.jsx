import React, { useState } from "react";

const AttendanceSystem = () => {
  const [message, setMessage] = useState("");

  // Allowed location coordinates (latitude and longitude)
  const allowedLocation = {
    lat: 4.849177, // Replace with your allowed latitude
    lng: 7.019100, // Replace with your allowed longitude
  };

  // Tolerance for comparison (degrees)
  const tolerance = 0.0009; // Tolerance for 100 meters

  // Function to calculate distance between two coordinates in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of the Earth in meters
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Handle attendance action
  const handleAction = async (action) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          const isWithinLatitude =
            Math.abs(latitude - allowedLocation.lat) <= tolerance;
          const isWithinLongitude =
            Math.abs(longitude - allowedLocation.lng) <= tolerance;

          if (isWithinLatitude && isWithinLongitude) {
            setMessage(`You have ${action}.`);
          } else {
            const distance = calculateDistance(
              latitude,
              longitude,
              allowedLocation.lat,
              allowedLocation.lng
            );
            const walkingSpeed = 1.39; // Average walking speed in meters/second
            const walkingTime = distance / walkingSpeed; // Time in seconds
            const walkingMinutes = Math.ceil(walkingTime / 60); // Convert to minutes and round up

            setMessage(
              `You are ${distance.toFixed(1)} meters away from the office. It will take approximately ${walkingMinutes} minutes to walk there at normal speed.`
            );
          }
        },
        (error) => {
          setMessage("Unable to fetch your location. Please try again.");
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
        the correct location test12.
      </p>
    </div>
  );
};

export default AttendanceSystem;
