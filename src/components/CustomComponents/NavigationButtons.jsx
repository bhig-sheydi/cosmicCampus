import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationButtons = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-start mb-4">
      <div className="flex justify-start mb-4">
        <button
          onClick={() => {
            localStorage.setItem("selectedSubjectView", "assignments");
            navigate("/dashboard/teachhersAsignment");
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          View Assignments
        </button>

        <button
          onClick={() => navigate("/dashboard/teachersTests")}
          className="ml-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          View Tests
        </button>

        <button
          onClick={() => navigate("/dashboard/teachersExams")}
          className="ml-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          View Exams
        </button>
      </div>
    </div>
  );
};

export default NavigationButtons;