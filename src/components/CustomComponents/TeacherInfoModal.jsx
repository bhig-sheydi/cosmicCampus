import { useUser } from '@/components/Contexts/userContext';

import { useEffect } from 'react';
const TeacherInfoModal = ({ teacher, onClose,  }) => {


   const  {teacherSubjects} = useUser()
    
  
   useEffect(() => {
    const trapFocus = (e) => {
      if (e.key === 'Tab') {
        // Custom focus-trapping logic
      }
    };
  
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, []);
  
        
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              Teacher Information
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </div>
          <div className="flex flex-col items-center">
            <img
              src={teacher.teacher_pic || '/placeholder-profile.png'}
              alt={`${teacher.teacher_name}'s profile`}
              className="w-24 h-24 rounded-full mb-4 object-cover"
            />
            <p><strong>Name:</strong> {teacher.teacher_name}</p>
            <p><strong>School:</strong> {teacher.schools?.name || 'N/A'}</p>
            <p><strong>Class ID:</strong> {teacher?.class?.class_name|| 'N/A'}</p>
          </div>
  
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              Subjects Taught:
            </h3>
            {teacherSubjects?.length > 0 ? (
              <ul className="list-disc pl-5">
                {teacherSubjects.map((subject, index) => (
                  <li key={index} className="dark:text-gray-300">
                    {subject?.subjects?.subject_name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dark:text-gray-400">No subjects assigned yet.</p>
            )}
          </div>
  
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default TeacherInfoModal;
  