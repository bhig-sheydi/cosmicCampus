import React, { useState } from "react";

const AttendanceSystem = () => {
  const [message, setMessage] = useState("");

  // Allowed location coordinates (latitude and longitude)
  const allowedLocation = {
    lat: 4.846387, // Replace with your allowed latitude
    lng:  7.015629,  // Replace with your allowed longitude
  };

  // Tolerance for comparison (degrees)
  const tolerance = 1; // Adjust based on acceptable proximity

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
            setMessage(
              `You are not in the correct location. Latitude: ${latitude.toFixed(
                6
              )}, Longitude: ${longitude.toFixed(6)}`
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
        the correct location test1 change.
      </p>
    </div>
  );
};

export default AttendanceSystem;
