import React, { useState } from 'react';

const SubjectClassesModal = ({
  isOpen,
  onClose,
  subjectName,
  classesForSubject,
  onSetTest,
  onSetExam,
  onSetHomework
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredClasses = classesForSubject.filter(item =>
    `${item.class_name} ${item.arm_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          Classes Offering: {subjectName}
        </h2>

        <input
          type="text"
          placeholder="Search class..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
        />

        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((item, index) => (
              <li
                key={index}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-md"
              >
                <div className="flex flex-col gap-2">
                  <span className="font-semibold">
                    {item.class_name} — {item.arm_name}
                  </span>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                      onClick={() => onSetTest(item)}
                    >
                      Set Test
                    </button>

                    <button
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      onClick={() => onSetExam(item)}
                    >
                      Set Exam
                    </button>

                    <button
                      className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                      onClick={() => onSetHomework(item)}
                    >
                      Set Homework
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No classes found.</p>
          )}
        </ul>

        <div className="flex justify-end mt-6">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubjectClassesModal;