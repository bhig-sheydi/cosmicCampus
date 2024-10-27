import React from 'react';
import { useUser } from '../contexts/UserContext';

const StudentsList = () => {
  const { students } = useUser(); // Access students from context

  if (!students.length) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-500">No students found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-indigo-600">
        Students List
      </h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 rounded-lg shadow-lg">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">School</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Class ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2">
                  {student.student_name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {student.schools?.name || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {student.class_id || 'N/A'}
                </td>
                <td
                  className={`border border-gray-300 px-4 py-2 font-semibold ${
                    student.is_paid ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {student.is_paid ? 'Paid' : 'Not Paid'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentsList;
