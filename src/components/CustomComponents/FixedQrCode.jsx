import React from "react";
import QRCode from "react-qr-code";

const FixedQRCode = () => {
  const fixedQRValue = "https://example.com/attendance-location";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Attendance QR Code</h1>
      <QRCode value={fixedQRValue} size={256} />
      <p className="mt-4 text-gray-600">
        Scan this QR code to mark your attendance.
      </p>
    </div>
  );
};

export default FixedQRCode;
