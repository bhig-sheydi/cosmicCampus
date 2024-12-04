import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/Contexts/userContext';
import { supabase } from '@/supabaseClient';
import { ListFilterIcon } from 'lucide-react';

const StudentsList = () => {
  const { students, setStudents, classes, userSchools } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [ageFilter, setAgeFilter] = useState({ operator: '', value: '' });
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null); // New state for selected student
  const [showAssignClassModal, setShowAssignClassModal] = useState(false);

  const schools = userSchools;
  
  const handleStudentClick = (student) => {
    setSelectedStudent(student);
  };

  const closeInfoCard = () => {
    setSelectedStudent(null);
  };

  const promoteStudent = (student) => {
    if (student.class_id == null) {
      alert('Cannot promote a student with no class!');
      return;
    }
    const nextClassId = student.class_id + 1;
    updateStudentClass(student.id, nextClassId);
  };

  const demoteStudent = (student) => {
    if (student?.class_id == null || student?.class_id <= 1) {
      alert('Cannot demote a student further!');
      return;
    }
    const previousClassId = student.class_id - 1;
    updateStudentClass(student.id, previousClassId);
  };


  
  const updateStudentClass = async (studentId, newClassId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ class_id: newClassId })
        .eq('id', studentId);

      if (error) throw error;

      const updatedStudents = students.map((student) =>
        student.id === studentId ? { ...student, class_id: newClassId } : student
      );

      setStudents(updatedStudents);
      alert('Student class updated successfully!');
    } catch (error) {
      console.error('Error updating student class:', error);
      alert('Failed to update student class. Please try again.');
    }
  };

  const assignClassToStudent = async (studentId, newClassId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ class_id: newClassId })
        .eq('id', studentId);

      if (error) throw error;

      const updatedStudents = students.map((student) =>
        student.id === studentId ? { ...student, class_id: newClassId } : student
      );

      setStudents(updatedStudents);
      alert('Class assigned successfully!');
      setShowAssignClassModal(false);
    } catch (error) {
      console.error('Error assigning class:', error);
      alert('Failed to assign class. Please try again.');
    }
  };

  const handleAssignClass = (studentId) => {
    setCurrentStudentId(studentId);
    setShowAssignClassModal(true);
  };


  useEffect(() => {
    const timer = setTimeout(() => setLoadingClasses(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const applyAgeFilter = (studentAge) => {
    const { operator, value } = ageFilter;
    const numericValue = parseInt(value, 10);

    if (!operator || isNaN(numericValue)) return true; // No filter applied

    switch (operator) {
      case '>':
        return studentAge > numericValue;
      case '<':
        return studentAge < numericValue;
      case '=':
        return studentAge === numericValue;
      default:
        return true;
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedClass === '' || String(student.class?.class_name) === selectedClass) &&
      (selectedSchool === '' || student.schools?.name === selectedSchool) &&
      applyAgeFilter(student.age)
  );
  

  const deleteStudent = async (studentId) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'rejected' })
        .eq('student_id', studentId);
      if (error) throw error;

      const updatedStudents = students.filter((s) => s.id !== studentId);
      setStudents(updatedStudents);
      alert('Student deleted successfully!');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  return (
    <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-[100%]">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        Students List
      </h1>    
  
      {/* Search Bar */}
      <div className="mb-4 sm:mb-6 flex items-center justify-center">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[80%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
      </div>
  
      {/* Filter and Dropdown */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-6  pl-32">
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
              {/* Class Filter */}
              <div className="mb-4">
                <label className="block font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  Filter by Class
                </label>
                {loadingClasses ? (
                  <p className="text-center py-2 text-gray-400 dark:text-gray-300">
                    Loading classes...
                  </p>
                ) : (
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
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.class_name}>
                        {classItem.class_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
  
              {/* School Filter */}
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
  
              {/* Age Filter */}
              <div>
                <label className="block font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  Filter by Age
                </label>
                <div className="flex gap-2">
                  <select
                    value={ageFilter.operator}
                    onChange={(e) =>
                      setAgeFilter((prev) => ({ ...prev, operator: e.target.value }))
                    }
                    className="w-1/3 px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  >
                    <option value="">Operator</option>
                    <option value=">">Greater than</option>
                    <option value="<">Less than</option>
                    <option value="=">Equal to</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Age"
                    value={ageFilter.value}
                    onChange={(e) =>
                      setAgeFilter((prev) => ({ ...prev, value: e.target.value }))
                    }
                    className="w-2/3 px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  
      {/* Table */}
      <div className=" sm:w-100px overflow-hidden xl:w-full lg-w-full">
        <table className="min-w-full border-collapse border rounded-lg shadow-lg dark:border-gray-700 overflow-x-scroll">
          <thead className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white dark:bg-gradient-to-r dark:from-indigo-800 dark:via-purple-700 dark:to-pink-700">
            <tr>
              <th className="border px-4 py-2 text-left dark:border-gray-700">
                Name
              </th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">
                School
              </th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">
                Class ID
              </th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">
                Payment Status
              </th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">
                Age
              </th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:hover:bg-gray-700">
                <td
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => handleStudentClick(student)}
                >
                  {student.student_name}
                </td>
                
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {student.schools?.name || 'N/A'}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {student?.class?.class_name || 'N/A'}
                  </td>
                  <td
                    className={`border px-4 py-2 font-semibold dark:border-gray-700 ${
                      student.is_paid
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {student.is_paid ? 'Paid' : 'Not Paid'}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {student.age}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700">
                  <button
                    onClick={() => promoteStudent(student)}
                    className="bg-green-500 text-white px-2 py-1 rounded-md shadow hover:bg-green-600"
                  >
                    Promote
                  </button>
                  <button
                    onClick={() => demoteStudent(student)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded-md shadow hover:bg-yellow-600 mx-2"
                  >
                    Demote
                  </button>
                  <button
                    onClick={() => handleAssignClass(student?.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded-md shadow hover:bg-blue-600"
                  >
                    Assign Class
                  </button>
                    <button
                      onClick={() => deleteStudent(student.id)}
                      className="bg-red-500 ml-2 text-white px-2 py-1 rounded-md shadow-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                      Delete Student
                    </button>




                    
                    
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-gray-500 py-4 dark:text-gray-300">
                  No students found matching the search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>

              {/* Assign Class Modal */}
      {showAssignClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">
              Assign Class to Student
            </h2>
            <select
              onChange={(e) => assignClassToStudent(currentStudentId, e.target.value)}
              className="w-full px-4 py-2 border rounded-md shadow-lg focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            >
              <option value="">Select a Class</option>
              {classes.map((classItem) => (
                <option key={classItem.class_id} value={classItem.class_id}>
                  {classItem.class_name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAssignClassModal(false)}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md shadow hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


       
        {/* Student Info Card */}
        {selectedStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-red-500 absolute top-4 right-4 text-xl font-bold"
            >
              &times;
            </button>
            <div className="text-center">
              {/* Profile Picture */}
              <img
                src={selectedStudent.student_picture || '/default-profile.png'}
                alt={`${selectedStudent.student_name}'s profile`}
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              {/* Student Information */}
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {selectedStudent.student_name}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{selectedStudent.schools?.name || 'N/A'}</p>
              <p className="text-gray-600 dark:text-gray-300">Class: {selectedStudent.class?.class_name || 'N/A'}</p>
              <p className="text-gray-600 dark:text-gray-300">Age: {selectedStudent.age}</p>
              <p
                className={`font-semibold ${
                  selectedStudent.is_paid ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {selectedStudent.is_paid ? 'Paid' : 'Not Paid'}
              </p>
            </div>
          </div>
        </div>
      )}

      </div>

     
    </div>
  );
  
  
  
};

export default StudentsList;
