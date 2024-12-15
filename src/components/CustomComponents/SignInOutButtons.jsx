import React from "react";

const SignInOutButtons = () => {
  const roomLatitude = 4.869231;
  const roomLongitude = 6.9479208333333334;
  const roomRadius = 10; // Radius in meters for the "room"

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
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

  const handleAction = (action) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(
          latitude,
          longitude,
          roomLatitude,
          roomLongitude
        );

        if (distance <= roomRadius) {
          alert(`You have successfully ${action}. Welcome!`);
        } else {
          alert(
            `You are not in the room. Your current distance from the room is approximately ${Math.round(
              distance
            )} meters. Please go to the designated area.`
          );
        }
      },
      () => {
        alert("Unable to fetch your location. Please try again.");
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-purple-100">
      <h1 className="text-4xl font-bold text-purple-600 mb-8">
        Smart Attendance System
      </h1>
      <div className="space-x-4">
        <button
          className="px-8 py-3 font-bold text-white bg-gradient-to-r from-purple-500 to-purple-700 rounded-full shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
          onClick={() => handleAction("signed in")}
        >
          Sign In
        </button>
        <button
          className="px-8 py-3 font-bold text-purple-700 bg-white border-2 border-purple-500 rounded-full shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
          onClick={() => handleAction("signed out")}
        >
          Sign Out
        </button>
      </div>
      <p className="mt-6 text-gray-600 text-center">
        Sign-in and sign-out is restricted to a specific room. Ensure you are in
        the correct location.
      </p>
    </div>
  );
};

export default SignInOutButtons;
