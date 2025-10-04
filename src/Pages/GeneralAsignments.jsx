import React, { useEffect, useState } from 'react'; 
import { useUser } from '@/components/Contexts/userContext';
import { supabase } from '@/supabaseClient';

const GeneralAssignments = () => {
  const { userData } = useUser();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!userData?.user_id) return;

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          id,
          subject_id,
          proprietor_id,
          subjects (*)
        `)
        .eq('proprietor_id', userData.user_id);

      if (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      } else {
        setSubjects(data);
      }

      setLoading(false);
    };

    fetchSubjects();
  }, [userData?.user_id]);

  return (
    <div className="min-h-screen p-6
      bg-gradient-to-br from-purple-50 via-white to-pink-50
      dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
      ">
      <h2 className="text-4xl font-extrabold text-center
        text-purple-700 dark:text-purple-400 mb-10 drop-shadow
      ">
        📘 Your Subjects
      </h2>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-300 text-lg animate-pulse">
          Loading your subjects...
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map((item) => (
            <div
              key={item.id}
              className="
                backdrop-blur-xl bg-white/80 dark:bg-gray-900/70 
                border border-purple-100 dark:border-purple-700
                shadow-2xl shadow-purple-300/50 dark:shadow-purple-900/70
                rounded-3xl p-6 flex flex-col justify-between
                transition-transform duration-300
                hover:scale-105 hover:shadow-purple-400/70 dark:hover:shadow-purple-700/90
              "
            >
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-300 mb-1">
                  {item.subjects.subject_name}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  <span className="font-semibold">Code:</span>{' '}
                  {item.subjects.subject_code}
                </p>
                {item.subjects.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {item.subjects.description}
                  </p>
                )}
              </div>

<button
  className="
    self-start mt-4 
    bg-gradient-to-r from-purple-500 to-pink-500
    hover:from-pink-600 hover:to-purple-600
    text-white px-5 py-2 rounded-xl shadow-md
    transition-all duration-300
    dark:shadow-purple-900
  "
  onClick={() => {
    localStorage.setItem('selectedAssignmentId', item.id);
    alert(`Viewing assignments for ${item.subjects.subject_name}`);
  }}
>
  ✨ View Assignments
</button>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneralAssignments;
