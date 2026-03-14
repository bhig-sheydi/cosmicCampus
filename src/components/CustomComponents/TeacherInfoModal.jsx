import { useUser } from '@/components/Contexts/userContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient'; // Import supabase
import { 
  X, 
  User, 
  School, 
  BookOpen, 
  GraduationCap, 
  Mail, 
  Phone, 
  Trash2,
  Loader2
} from 'lucide-react';

const TeacherInfoModal = ({ teacher, onClose, onDeleteSubject }) => {
  const { setFetchFlags } = useUser();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSubjectId, setDeletingSubjectId] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Fetch teacher-specific subjects when modal opens
  useEffect(() => {
    if (!teacher?.teacher_id) return;

    const fetchTeacherSubjects = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('teacher_subjects')
          .select(`
            subject_id,
            subjects (
              subject_name
            )
          `)
          .eq('teacher_id', teacher.teacher_id);

        if (error) throw error;
        setSubjects(data || []);
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherSubjects();
    
    // Also update context flags if needed elsewhere
    setFetchFlags(prev => ({ ...prev, teacherSubjects: true }));
  }, [teacher?.teacher_id, setFetchFlags]);

  // Refresh subjects after deletion
  const handleDelete = async (subjectId) => {
    if (!onDeleteSubject) return;
    setDeletingSubjectId(subjectId);
    try {
      await onDeleteSubject(teacher.teacher_id, subjectId);
      // Remove from local state immediately for responsive UI
      setSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
    } finally {
      setDeletingSubjectId(null);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!teacher) return null;

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'T';
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {!imageError && teacher.teacher_pic ? (
                <img
                  src={teacher.teacher_pic}
                  alt={`${teacher.teacher_name}'s profile`}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white/30 shadow-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/30 flex items-center justify-center text-2xl font-bold shadow-lg">
                  {getInitials(teacher.teacher_name)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold truncate">
                {teacher.teacher_name}
              </h2>
              <p className="text-blue-100 text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Teacher ID: {teacher.teacher_id}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* School */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  School
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {teacher.schools?.name || 'Not assigned'}
                </p>
              </div>
            </div>

            {/* Class & Arm */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <User className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Class & Arm
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {teacher.arms?.class?.class_name ? (
                    <span className="inline-flex items-center gap-1">
                      {teacher.arms.class.class_name}
                      <span className="text-gray-400">•</span>
                      <span className="text-green-600 dark:text-green-400">
                        {teacher.arms.arm_name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Not assigned</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Subjects Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Subjects Taught
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {loading ? '...' : subjects.length}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : subjects.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {subjects.map((subject, index) => (
                  <div
                    key={subject.subject_id || index}
                    className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {subject?.subjects?.subject_name?.charAt(0) || 'S'}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {subject?.subjects?.subject_name}
                      </span>
                    </div>

                    {onDeleteSubject && (
                      <button
                        onClick={() => handleDelete(subject.subject_id)}
                        disabled={deletingSubjectId === subject.subject_id}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                        title="Remove subject"
                      >
                        {deletingSubjectId === subject.subject_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No subjects assigned yet
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Click "Assign Subject" to add subjects
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.8);
        }
      `}</style>
    </div>
  );
};

export default TeacherInfoModal;