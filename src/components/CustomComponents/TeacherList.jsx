import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '@/supabaseClient';
import { ListFilterIcon } from 'lucide-react';
import TeacherInfoModal from "./TeacherInfoModal"

const TeacherList = () => {
  const { teachers, setTeachers, classes, subjects, userSchools, userData, teacherSubjects, selectedTeacher, setSelectedTeacher ,teacherSubjectsFull} = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectTeacherId, setSubjectTeacherId] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false); // For class assignment modal
  const [classTeacherId, setClassTeacherId] = useState(null); // For assigning class
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState(''); // Class selected in modal
  
  
  // New states for teacher info modal
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const schools = userSchools;




  const assignClassToTeacher = async () => {
    if (!classTeacherId || !selectedClassForAssignment) {
      alert("Please select a class to assign.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teachers')
        .update({ teacher_class: selectedClassForAssignment })
        .eq('teacher_id', classTeacherId);

      if (error) {
        console.error('Error updating teacher class:', error);
        alert('Failed to assign class. Please try again.');
      } else {
        alert('Class assigned successfully!');
        setTeachers((prevTeachers) =>
          prevTeachers.map((teacher) =>
            teacher.teacher_id === classTeacherId
              ? { ...teacher, class_id: selectedClassForAssignment }
              : teacher
          )
        );
        setShowClassModal(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to assign class. Please try again.');
    }
  };

  useEffect(() => {


     console.log("selected teachersssss", teachers)
    const timer = setTimeout(() => {
      // Your existing logic or remove if unnecessary
    }, 10000);
    return () => clearTimeout(timer);
  }, [teachers]);

  const filteredTeachers = teachers?.filter((teacher) => {
    const matchesName = teacher.teacher_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || teacher?.teacher_class == selectedClass;
    const matchesSchool = !selectedSchool || teacher.schools?.name === selectedSchool;
    const matchesSubject =
      !selectedSubject ||
      teacherSubjectsFull?.some(
        (subject) =>
          subject?.teacher_id === teacher?.teacher_id &&
          subject?.subjects?.subject_name === selectedSubject
      );
    return matchesName && matchesClass && matchesSchool && matchesSubject;
  });
  
  
  const deleteTeacher = async (teacherId) => {
    if (!teacherId) {
      console.error('No teacher ID provided');
      alert('Failed to delete teacher. Please try again.');
      return;
    }
  
    try {
      console.log('Deleting teacher with ID:', teacherId);
  
      // Update the `requests` table to set status to 'rejected'
      const { error: requestError } = await supabase
        .from('requests')
        .update({ status: 'rejected' })
        .eq('teacher_id', teacherId);
  
      if (requestError) throw requestError;
  
      // Update the `teachers` table to set teacher_school to NULL
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({ teacher_school: null }) // Use `null` directly
        .eq('teacher_id', teacherId);
  
      if (teacherError) throw teacherError;



      const { error: proprietorError } = await supabase
      .from('teachers')
      .update({ teacher_proprietor: null }) 
      .eq('teacher_id', teacherId);
      

    if (proprietorError) throw proprietorError;



    const { error: subjectError } = await supabase
    .from('teacher_subjects')
    .delete()
    .eq('teacher_id', teacherId);
    

  if (subjectError) throw subjectError;



  const { error: ClassError } = await supabase
  .from('teachers')
  .update({ teacher_class: null }) 
  .eq('teacher_id', teacherId);
  

if (ClassError) throw ClassError;
  
      alert('Teacher deleted successfully!');
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Failed to delete teacher. Please try again.');
    }
  };
  
  
  
  const assignSubjectToTeacher = async () => {
    if (!subjectTeacherId || !selectedSubject) {
      console.log("Subject Teacher ID or selected subject not set");
      return;
    }
  
    try {
      console.log('Assigning subject:', { teacher_id: subjectTeacherId, subject_id: selectedSubject });
  
      const { data, error } = await supabase
        .from('teacher_subjects')
        .insert([{ teacher_id: subjectTeacherId, subject_id: selectedSubject , owner_id: userData?.user_id}]);
  
      if (error) {
        console.error('Error inserting data into subject_teachers:', error);
        alert('Failed to assign subject. Please try again.');
      } else {
        console.log('Subject assigned successfully:', data);
        alert('Subject assigned successfully!');
        setShowSubjectModal(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to assign subject. Please try again.');
    }
  };

  const handleTeacherNameClick = (teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherModal(true);
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-[100%]">
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

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-6 pl-32">
        <div className="relative">
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => setShowFiltersDropdown((prev) => !prev)}
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
      setShowFiltersDropdown(false); // Close dropdown after selection
    }}
    className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
  >
    <option value="">All Subjects</option>
    {subjects.map((subject, index) => (
      <option key={index} value={subject.subject_name}>
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
                  {classes?.map((classItem) => (
                    <option key={classItem?.class_id} value={classItem?.class_id}>
                      {classItem.class_name}
                    </option>
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
                  {schools.map((school, index) => (
                    <option key={index} value={school.name}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sm:w-100px overflow-hidden xl:w-full lg-w-full">
        <table className="min-w-full border-collapse border rounded-lg shadow-lg dark:border-gray-700 overflow-x-scroll">
          <thead className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white dark:bg-gradient-to-r dark:from-indigo-800 dark:via-purple-700 dark:to-pink-700">
            <tr>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Name</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">School</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Class ID</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:hover:bg-gray-700">
                  <td
                    className="border px-4 py-2 dark:border-gray-700 dark:text-white cursor-pointer text-blue-600 hover:underline"
                    onClick={() => handleTeacherNameClick(teacher)}
                  >
                    {teacher.teacher_name}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">{teacher.schools?.name || 'N/A'}</td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">  {teacher.class && teacher.class.class_name ? teacher.class.class_name : 'No Class Assigned'}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 gap-4">
                    <button
                      onClick={() => {
                        setSubjectTeacherId(teacher?.teacher_id);
                        setShowSubjectModal(true);
                        ()=>{console.log(teacher?.teacher_id)}
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      Assign Subject
                    </button>
                    <button
                      onClick={() => {deleteTeacher(teacher?.teacher_id), setSelectedTeacher(teacher?.teacher_id)}}
                      className="bg-red-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 ml-2"
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => {
                        setClassTeacherId(teacher.teacher_id);
                        setShowClassModal(true);
                      }}
                      className="bg-green-500 ml-2 text-white px-4 py-2  rounded-md shadow-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                    >
                      Assign Class
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4 dark:text-white">
                  No teachers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>



      {/* Class Assignment Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              Assign Class
            </h2>
            <select
              value={selectedClassForAssignment}
              onChange={(e) => setSelectedClassForAssignment(e.target.value)}
              className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4"
            >
              <option value="">Select a class</option>
              {classes.map((classItem) => (
                <option key={classItem.class_id} value={classItem.class_id}>
                  {classItem.class_name}
                </option>
              ))}
            </select>
            <div className="flex justify-end">
              <button
                onClick={assignClassToTeacher}
                className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
              >
                Assign
              </button>
              <button
                onClick={() => setShowClassModal(false)}
                className="ml-4 bg-gray-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Subject Assignment Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              Assign Subject
            </h2>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4"
            >
              <option value="">Select a subject</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject.id}>
                  {subject.subject_name}
                </option>
              ))}
            </select>
            <div className="flex justify-end">
              <button
                onClick={assignSubjectToTeacher}
                className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Assign
              </button>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="ml-4 bg-gray-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Information Modal */}
      {showTeacherModal && (
        <TeacherInfoModal
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherModal(false);
            setSelectedTeacher(null);
          }}
        />
      )}
    </div>
  );
};

export default TeacherList;
