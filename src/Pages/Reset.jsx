import React, { useState } from "react"; 
import { ResetPassword as ResetEmailPassword } from "./ResetPasswordEmail"; // your existing component
import ResetStudentPassword from "./ResetStudentPassword";

export default function ResetPasswordPage() {
  const [userType, setUserType] = useState(null); // ❌ removed TS type annotation

  // If the user has selected an option, render the appropriate component
  if (userType === "student") {
    return <ResetStudentPassword />;
  }

  if (userType === "other") {
    return <ResetEmailPassword />;
  }

  // Initial questionnaire
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
        <p className="text-gray-600">Who are you?</p>
        <div className="flex flex-col space-y-3 mt-4">
          <button
            onClick={() => setUserType("student")}
            className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Student
          </button>
          <button
            onClick={() => setUserType("other")}
            className="py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Teacher / Guardian / Other
          </button>
        </div>
      </div>
    </div>
  );
}