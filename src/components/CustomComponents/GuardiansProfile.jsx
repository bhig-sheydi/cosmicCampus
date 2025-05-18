import React, { useEffect } from 'react';
import { useUser } from '../Contexts/userContext';

const GuardiansProfile = () => {
  const { guardianStudents, setFetchFlags } = useUser();

  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, guardianStudents: true }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-10">Guardians & Their Students</h1>

      {guardianStudents?.length === 0 ? (
        <p className="text-lg text-gray-600">No students found.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {guardianStudents.map(({ guardians, students }) => (
            <li
              key={students.id}
              className="bg-white rounded-2xl shadow-md border border-gray-200 p-6"
            >
              <div className="flex items-center mb-4 gap-4">
                {guardians?.guardian_picture && (
                  <img
                    src={guardians.guardian_picture}
                    alt="Guardian"
                    className="w-12 h-12 rounded-full object-cover border"
                  />
                )}
                <div>
                  <h2 className="text-md text-gray-500">Guardian</h2>
                  <p className="text-lg font-semibold text-gray-800">
                    {guardians?.guardianname || 'Unknown Guardian'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-lg font-medium text-gray-800 mb-1">
                  {students.student_name}
                </p>
                <p className="text-sm text-gray-600 mb-1">Age: {students.age}</p>
                <p className="text-sm text-gray-600 mb-1">
                  Class: {students.class?.class_name || '—'}
                </p>

                {students.student_picture && (
                  <img
                    src={students.student_picture}
                    alt={`${students.student_name}'s picture`}
                    className="w-24 h-24 object-cover rounded-full border mt-2"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GuardiansProfile;
