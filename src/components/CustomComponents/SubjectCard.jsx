import React from 'react';

const SubjectCard = ({ subjectAssignment, onCreateAssessment }) => {
  const { subjects } = subjectAssignment;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
          {subjects.subject_name}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">Level: {subjects.level}</p>
        <p className="text-gray-600 dark:text-gray-300">Track: {subjects.track}</p>
      </div>
      <button
        className="mt-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
        onClick={() => onCreateAssessment(subjectAssignment)}
      >
        Create Assessment
      </button>
    </div>
  );
};

export default SubjectCard;