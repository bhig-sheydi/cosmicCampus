import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/components/Contexts/userContext';
import { supabase } from '@/supabaseClient';
import { ListFilterIcon } from 'lucide-react';
import TeacherInfoModal from "../components/CustomComponents/TeacherInfoModal";

const TeacherList = () => {
  const { 
    setFetchFlags,
    teachers, 
    setTeachers, 
    classes, 
    subjects, 
    userSchools, 
    userData, 
    selectedTeacher, 
    setSelectedTeacher,
    teacherSubjectsFull
  } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectTeacherId, setSubjectTeacherId] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [classTeacherId, setClassTeacherId] = useState(null);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState('');
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedArmForAssignment, setSelectedArmForAssignment] = useState('');
const [arms, setArms] = useState([]);


  const schools = userSchools;

  // Initialize fetch flags once
  useEffect(() => {
    setFetchFlags(prev => ({
      ...prev,
      userData: true,
      classes: true,
      userSchools: true,
      subjects: true,
      teacherSubjectsFull: true
    }));
  }, []);

  // Debounced fetch for search to reduce requests
useEffect(() => {
  if (!userData?.user_id) return;

  const delay = setTimeout(() => {
    loadTeachers();
  }, 300);

  return () => clearTimeout(delay);
}, [
  userData?.user_id,
  page,
  searchQuery,
  selectedClass,
  selectedSchool,
  selectedSubject
]);

const deleteTeacherSubject = async (teacherId, subjectId) => {
  if (!teacherId || !subjectId) return;

  const confirmDelete = window.confirm('Remove this subject from teacher?');
  if (!confirmDelete) return;

  const { error } = await supabase
    .from('teacher_subjects')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('subject_id', subjectId);

  if (error) {
    console.error(error);
    alert('Failed to remove subject');
    return;
  }

  loadTeachers(); // refresh UI
};


const fetchArms = async (classId) => {
  if (!classId) return;

  const schoolId = userSchools?.[0]?.id; // ✅ correct source

  if (!schoolId) {
    console.warn('School ID not found');
    return;
  }

  const { data, error } = await supabase
    .from('arms')
    .select('arm_id, arm_name')
    .eq('class_id', classId)
    .eq('school_id', schoolId);

  if (error) {
    console.error('Failed to fetch arms:', error.message);
    return;
  }

  setArms(data || []);
};



const assignArmToTeacher = async () => {
  if (!classTeacherId || !selectedArmForAssignment) return;

  const { error } = await supabase
    .from('teachers')
    .update({ arm_id: selectedArmForAssignment })
    .eq('teacher_id', classTeacherId);

  if (error) {
    alert('Failed to assign class');
    return;
  }

  setShowClassModal(false);
  loadTeachers();
};



const fetchTeachers = useCallback(async ({
  page = 1,
  pageSize = 10,
  searchQuery = '',
  selectedClass = '',
  selectedSchool = '',
  selectedSubject = '',
}) => {
  if (!userData?.user_id) {
  throw new Error('User not ready');
}
 // safety check

let query = supabase
  .from('teachers')
  .select(`
    *,
    schools(name),
    arms (
      arm_id,
      arm_name,
      class:class (
        class_id,
        class_name
      )
    ),
   teacher_subjects(
  subject_id,
  subjects (
    subject_name
  )
)

  `, { count: 'exact' })
  .eq('teacher_proprietor', userData.user_id);
 // ✅ fetch only teachers of this proprietor

  if (searchQuery) query = query.ilike('teacher_name', `%${searchQuery}%`);
if (selectedClass && selectedClass !== 'null') {
 query = query.eq('arms.class_id', selectedClass);

}

if (selectedClass === 'null') {
  query = query.is('arm_id', null);
}


  if (selectedSchool) query = query.eq('schools.name', selectedSchool);
  if (selectedSubject) query = query.eq('teacher_subjects.subjects.subject_name', selectedSubject);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data, count };
}, [userData?.user_id]);


const loadTeachers = useCallback(async () => {
  if (!userData?.user_id) return;

  setLoading(true);
  try {
    const { data, count } = await fetchTeachers({
      page,
      pageSize,
      searchQuery,
      selectedClass,
      selectedSchool,
      selectedSubject
    });

    setTeachers(data);
    setTotal(count);
  } catch (error) {
    console.error('Failed to fetch teachers:', error.message);
  } finally {
    setLoading(false);
  }
}, [
  userData?.user_id,
  page,
  pageSize,
  searchQuery,
  selectedClass,
  selectedSchool,
  selectedSubject,
  fetchTeachers
]);


  // Realtime updates
  useEffect(() => {
    const teacherSub = supabase
      .channel('public:teachers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => {
        loadTeachers();
      })
      .subscribe();

    return () => supabase.removeChannel(teacherSub);
  }, [loadTeachers]);

  // Client-side filtering fallback (useMemo to avoid recomputation)
  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter(teacher => {
      const matchesName = teacher.teacher_name.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesClass =
  !selectedClass ||
  (selectedClass === 'null'
    ? !teacher.arm_id
    : teacher.arms?.class?.class_id == selectedClass);

      const matchesSchool = !selectedSchool || teacher.schools?.name === selectedSchool;
      const matchesSubject =
        !selectedSubject ||
        teacherSubjectsFull?.some(
          subject =>
            subject?.teacher_id === teacher?.teacher_id &&
            subject?.subjects?.subject_name === selectedSubject
        );
      return matchesName && matchesClass && matchesSchool && matchesSubject;
    });
  }, [teachers, searchQuery, selectedClass, selectedSchool, selectedSubject, teacherSubjectsFull]);

  const deleteTeacher = async (teacherId) => {
    if (!teacherId) return alert('Failed to delete teacher. Please try again.');

    try {
      // Batch all updates/deletes in parallel
      const [requestErr, teacherErr, proprietorErr, subjectErr, classErr] = await Promise.all([
        supabase.from('requests').update({ status: 'rejected' }).eq('teacher_id', teacherId),
        supabase.from('teachers').update({ teacher_school: null }).eq('teacher_id', teacherId),
        supabase.from('teachers').update({ teacher_proprietor: null }).eq('teacher_id', teacherId),
        supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId),
        supabase.from('teachers').update({ teacher_class: null }).eq('teacher_id', teacherId)
      ].map(p => p.catch(e => e.error)));

      if (requestErr || teacherErr || proprietorErr || subjectErr || classErr) throw new Error('Error deleting teacher');
      alert('Teacher deleted successfully!');
      loadTeachers(); // refresh list instantly
    } catch (error) {
      console.error(error);
      alert('Failed to delete teacher. Please try again.');
    }
  };

  // const assignClassToTeacher = async () => {
  //   if (!classTeacherId || !selectedClassForAssignment) return;

  //   const { error } = await supabase
  //     .from('teachers')
  //     .update({ teacher_class: selectedClassForAssignment })
  //     .eq('teacher_id', classTeacherId);

  //   if (error) return alert('Failed to assign class');
  //   setShowClassModal(false);
  //   loadTeachers();
  // };

  const assignSubjectToTeacher = async () => {
    if (!subjectTeacherId || !selectedSubject) return;

    const { error } = await supabase
      .from('teacher_subjects')
      .insert({
        teacher_id: subjectTeacherId,
        subject_id: selectedSubject,
        owner_id: userData?.user_id
      });

    if (error) return alert('Failed to assign subject');
    setShowSubjectModal(false);
    loadTeachers();
  };

  const handleTeacherNameClick = (teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherModal(true);
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        Teachers List
      </h1>    

      <div className="mb-4 sm:mb-6 flex items-center justify-center">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[80%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
      </div>

      {/* Filters Dropdown */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-6 pl-32">
        <div className="relative">
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => setShowFiltersDropdown(prev => !prev)}
          >
            <ListFilterIcon className="text-2xl text-blue-500 group-hover:text-purple-500 dark:text-indigo-400 dark:group-hover:text-indigo-600" />
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              Filter options
            </span>
          </div>
          {showFiltersDropdown && (
            <div className="absolute top-10 left-0 w-[600%] mt-2 border rounded-md bg-white shadow-lg z-10 p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="mb-4">
                <label className="block font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  Filter by Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setShowFiltersDropdown(false);
                  }}
                  className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.subject_name}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  Filter by Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setShowFiltersDropdown(false);
                  }}
                  className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                >
                  <option value="">All Classes</option>
                  <option value="null">No Class</option>
                  {classes?.map((c) => (
                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  Filter by School
                </label>
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    setShowFiltersDropdown(false);
                  }}
                  className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                >
                  <option value="">All Schools</option>
                  {schools.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teachers Table */}
      <div className="overflow-x-auto sm:w-full">
        <table className="min-w-full border-collapse border rounded-lg shadow-lg dark:border-gray-700">
          <thead className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white dark:bg-gradient-to-r dark:from-indigo-800 dark:via-purple-700 dark:to-pink-700">
            <tr>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Name</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">School</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Class</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? filteredTeachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:hover:bg-gray-700">
                <td className="border px-4 py-2 dark:border-gray-700 dark:text-white cursor-pointer text-blue-600 hover:underline" onClick={() => handleTeacherNameClick(teacher)}>
                  {teacher.teacher_name}
                </td>
                <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">{teacher.schools?.name || 'N/A'}</td>
     <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
  {teacher.arms?.class?.class_name
    ? `${teacher.arms.class.class_name} (${teacher.arms.arm_name})`
    : 'No Class Assigned'}
</td>

                <td className="border px-4 py-2 dark:border-gray-700 flex gap-2">
                  <button onClick={() => { setSubjectTeacherId(teacher.teacher_id); setShowSubjectModal(true); }} className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">Assign Subject</button>
                  <button onClick={() => deleteTeacher(teacher.teacher_id)} className="bg-red-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700">Delete</button>
                  <button onClick={() => { setClassTeacherId(teacher.teacher_id); setShowClassModal(true); }} className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700">Assign Class</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="text-center py-4 dark:text-white">No teachers found</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-center mt-6 space-x-4">
          <button onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page === 1} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">Previous</button>
          <span className="text-lg font-medium">Page {page} of {Math.ceil(total / pageSize)}</span>
          <button onClick={() => setPage(prev => prev + 1)} disabled={page >= Math.ceil(total / pageSize)} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Modals */}
{showClassModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800 w-full max-w-md">
      
      <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        Assign Class & Arm
      </h2>

      {/* CLASS SELECT */}
      <select
        value={selectedClassForAssignment}
        onChange={(e) => {
          const classId = e.target.value;
          setSelectedClassForAssignment(classId);
          setSelectedArmForAssignment('');
          if (classId) fetchArms(classId);
        }}
        className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4"
      >
        <option value="">Select a class</option>
        {classes.map(c => (
          <option key={c.class_id} value={c.class_id}>
            {c.class_name}
          </option>
        ))}
      </select>

      {/* ARM SELECT */}
      <select
        value={selectedArmForAssignment}
        onChange={(e) => setSelectedArmForAssignment(e.target.value)}
        disabled={!selectedClassForAssignment}
        className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4 disabled:opacity-50"
      >
        <option value="">Select an arm</option>
        {arms.map(a => (
          <option key={a.arm_id} value={a.arm_id}>
            {a.arm_name}
          </option>
        ))}
      </select>

      <div className="flex justify-end gap-4">
        <button
           onClick={assignArmToTeacher}
          disabled={!selectedArmForAssignment}
          className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Assign
        </button>

        <button
          onClick={() => {
            setShowClassModal(false);
            setSelectedClassForAssignment('');
            setSelectedArmForAssignment('');
            setArms([]);
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>

    </div>
  </div>
)}


      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">Assign Subject</h2>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4">
              <option value="">Select a subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
            <div className="flex justify-end gap-4">
              <button onClick={assignSubjectToTeacher} className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">Assign</button>
              <button onClick={() => setShowSubjectModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTeacherModal && (
<TeacherInfoModal 
  teacher={selectedTeacher}
  onClose={() => {
    setShowTeacherModal(false);
    setSelectedTeacher(null);
  }}
  onDeleteSubject={deleteTeacherSubject}
/>

      )}
    </div>
  );
};

export default TeacherList;
