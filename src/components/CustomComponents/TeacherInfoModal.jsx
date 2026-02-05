import { useUser } from '@/components/Contexts/userContext';
import { useEffect } from 'react';

const TeacherInfoModal = ({ teacher, onClose, onDeleteSubject }) => {
  const { teacherSubjects, setFetchFlags } = useUser();

  // Fetch teacher subjects when modal opens
  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, teacherSubjects: true }));
  }, [setFetchFlags]);

  // Trap focus (optional accessibility logic placeholder)
  useEffect(() => {
    const trapFocus = (e) => {
      if (e.key === 'Tab') {
        // optional focus trapping logic
      }
    };

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, []);

  if (!teacher) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800 max-w-md w-full">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Teacher Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
          >
            &times;
          </button>
        </div>

        {/* Teacher Info */}
        <div className="flex flex-col items-center text-center">
          <img
            src={teacher.teacher_pic || '/placeholder-profile.png'}
            alt={`${teacher.teacher_name}'s profile`}
            className="w-24 h-24 rounded-full mb-4 object-cover"
          />
          <p className="dark:text-gray-200">
            <strong>Name:</strong> {teacher.teacher_name}
          </p>
          <p className="dark:text-gray-200">
            <strong>School:</strong> {teacher.schools?.name || 'N/A'}
          </p>
          <p className="dark:text-gray-200">
            <strong>Class:</strong>{' '}
            {teacher.arms?.class?.class_name
              ? `${teacher.arms.class.class_name} (${teacher.arms.arm_name})`
              : 'N/A'}
          </p>
        </div>

        {/* Subjects */}
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Subjects Taught
          </h3>

          {teacherSubjects?.length > 0 ? (
            <div className="space-y-2">
              {teacherSubjects.map((subject, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded"
                >
                  <span className="dark:text-gray-200">
                    {subject?.subjects?.subject_name}
                  </span>

                  <button
                    onClick={() =>
                      onDeleteSubject(
                        teacher.teacher_id,
                        subject.subject_id
                      )
                    }
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-40"
                    disabled={!onDeleteSubject}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="dark:text-gray-400 text-sm">
              No subjects assigned yet.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
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
