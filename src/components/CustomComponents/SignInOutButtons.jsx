import React, { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const AttendanceSystem = () => {
  const [message, setMessage] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const acceptedFingerPrint = "c979d165a5ef22089ffb9b2bfad49ce8"; // Replace with your accepted fingerprint

  useEffect(() => {
    const loadFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      // Log the fingerprint
      console.log("Device Fingerprint:", fingerprint);

      // Set fingerprint in the state
      setDeviceFingerprint(fingerprint);
    };

    loadFingerprint();
  }, []);

  // Allowed location coordinates (latitude and longitude)
  const allowedLocation = {
    lat:  4.847223, // Replace with your allowed latitude
    lng: 6.974604, // Replace with your allowed longitude
  };

  const tolerance = 0.0001; // Adjust based on acceptable proximity

  // Handle attendance action
  const handleAction = async (action) => {
    if (deviceFingerprint !== acceptedFingerPrint) {
      setMessage(
        `Sign-up rejected. Please use your authorized device to fill in attendance. ${deviceFingerprint}`,
        
      );
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          const isWithinLatitude =
            Math.abs(latitude - allowedLocation.lat) <= tolerance;
          const isWithinLongitude =
            Math.abs(longitude - allowedLocation.lng) <= tolerance;

          if (isWithinLatitude && isWithinLongitude) {
            setMessage(`You have ${action}. Device ID: ${deviceFingerprint}`);
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
        the correct location.
      </p>
    </div>
  );
};

export default AttendanceSystem;
