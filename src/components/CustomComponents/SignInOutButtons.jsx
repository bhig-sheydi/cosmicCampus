import React, { useState, useEffect } from "react";
import { useUser } from "../Contexts/userContext";
import QrScanner from "react-qr-scanner";

const AttendanceSystem = () => {
  const [message, setMessage] = useState("");
  const [qrData, setQrData] = useState(null);
  const [useBackCamera, setUseBackCamera] = useState(false); // Track camera mode
  const [cameraOptions, setCameraOptions] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null); // Store the selected camera
  const { teacherAttendance, teacher } = useUser();

  const allowedLocation = {
    lat: teacher[0]?.accepted_lag,
    lng: teacher[0]?.accepted_long,
  };
  const tolerance = 0.0009;

  // Fetch available cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter((device) => device.kind === "videoinput");
      setCameraOptions(videoInputs);
      if (videoInputs.length > 0) {
        setSelectedCamera(videoInputs[0].deviceId); // Default to the first camera
      }
    });
  }, []);

  const toggleCamera = () => {
    setUseBackCamera((prev) => !prev);
    if (cameraOptions.length > 1) {
      const currentIndex = cameraOptions.findIndex(
        (camera) => camera.deviceId === selectedCamera
      );
      const nextIndex = (currentIndex + 1) % cameraOptions.length;
      setSelectedCamera(cameraOptions[nextIndex].deviceId);
    }
  };

  const verifyLocationAndQRCode = (action) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const isWithinLatitude =
            Math.abs(latitude - allowedLocation.lat) <= tolerance;
          const isWithinLongitude =
            Math.abs(longitude - allowedLocation.lng) <= tolerance;

          if (
            isWithinLatitude &&
            isWithinLongitude &&
            qrData === "teacherId:12345;location:Room101;date:2024-12-26"
          ) {
            setMessage(
              `You have successfully ${action}. Your current location is Latitude: ${latitude.toFixed(
                6
              )}, Longitude: ${longitude.toFixed(6)}.`
            );
          } else {
            setMessage(
              "Attendance failed: Invalid QR code or incorrect location."
            );
          }
        },
        () => {
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
      <div className="relative mb-6 w-64 h-64">
        <QrScanner
          delay={300}
          onError={(error) => {
            console.error("QR Scanner Error: ", error);
            setMessage("Error accessing the camera. Please check your permissions.");
          }}
          onScan={(result) => {
            if (result) {
              setQrData(result.text);
            }
          }}
          constraints={{
            video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <p className="text-gray-600 dark:text-gray-300 mt-4 text-center">
          QR Code: {qrData || "No QR code detected"}
        </p>
      </div>
      <div className="flex flex-wrap gap-4 justify-center pt-10">
        <button
          className="px-8 py-3 font-bold text-white bg-gradient-to-r from-purple-500 to-purple-700 rounded-full shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
          onClick={() => verifyLocationAndQRCode("signed in")}
          aria-label="Sign In"
        >
          Sign In
        </button>
        <button
          className="px-8 py-3 font-bold text-purple-700 bg-white border-2 border-purple-500 rounded-full shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
          onClick={() => verifyLocationAndQRCode("signed out")}
          aria-label="Sign Out"
        >
          Sign Out
        </button>
      </div>
      <button
        className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full"
        onClick={toggleCamera}
      >
        Switch to {useBackCamera ? "Front Camera" : "Back Camera"}
      </button>
      {cameraOptions.length > 0 && (
        <p className="text-gray-500 mt-2 text-sm">
          {cameraOptions.length} cameras detected.
        </p>
      )}
      {message && (
        <p className="mt-6 text-center text-gray-600 dark:text-gray-300">
          {message}
        </p>
      )}
      <p className="mt-6 text-gray-600 text-center dark:text-gray-400">
        Sign-in and sign-out is restricted to a specific room. Ensure you are in
        the correct location and scan the correct QR code. test2
      </p>
    </div>
  );
};

export default AttendanceSystem;
