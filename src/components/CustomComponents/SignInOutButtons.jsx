import React from "react";

const SignInOutButtons = () => {
  const workLatitude = 6.5896448;
  const workLongitude = 3.3390592;

  const handleAction = (action) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (
          Math.abs(latitude - workLatitude) < 0.001 &&
          Math.abs(longitude - workLongitude) < 0.001
        ) {
          alert(`You have successfully ${action}. Welcome!`);
        } else {
          alert("You are not yet at work. Please proceed to your location.");
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
        Click the buttons to sign in or sign out. Ensure you are at your work
        location.
      </p>
    </div>
  );
};

export default SignInOutButtons;
