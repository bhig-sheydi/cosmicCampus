import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/Contexts/userContext';
import { Users, TrendingUp } from 'lucide-react';
import { useStudents } from '@/components/hooks/UseStudents';
import { usePromotion } from '@/components/hooks/usePromotion';
import SearchFilterBar from '@/components/CustomComponents/SearchFilterBar';
import StudentsTable from '@/components/CustomComponents/StudentsTable';
import StudentCards from '@/components/CustomComponents/StudentCards';
import StudentDetailModal from '@/components/CustomComponents/StudentDetailModal';
import MassPromoteModal from '@/components/CustomComponents/MassPromoteModal';
import AssignClassModal from '@/components/CustomComponents/AssignClassModal';
import Pagination from '@/components/CustomComponents/Pagination';
import EmptyState from '@/components/CustomComponents/EmptyState';
import { Loader2 } from 'lucide-react';

const StudentsList = () => {
  const { 
    userData, 
    students, 
    setStudents, 
    classes, 
    userSchools, 
    selectedStudent, 
    setSelectedStudent,
    setFetchFlags 
  } = useUser();
  
  // Trigger data fetching on mount
  useEffect(() => {
    setFetchFlags(prev => ({ 
      ...prev, 
      students: true, 
      classes: true, 
      userSchools: true,
      userData: true
    }));
  }, [setFetchFlags]);

  const {
    searchQuery, setSearchQuery, searchInput, setSearchInput,
    selectedClass, setSelectedClass, selectedSchool, setSelectedSchool,
    ageFilter, setAgeFilter, showFilters, setShowFilters,
    filteredStudents, clearFilters, hasActiveFilters
  } = useStudents(students, classes, userSchools);

  const {
    showMassPromoteModal, setShowMassPromoteModal,
    massPromoteSchool, setMassPromoteSchool,
    selectedPromoteClass, setSelectedPromoteClass,
    promotingClass, promotionStatus, studentsByClass,
    promoteStudent, demoteStudent, handleMassPromote
  } = usePromotion(userData, students, classes, setFetchFlags);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null); // ← CHANGED: Store full student, not just ID
  const [showAssignModal, setShowAssignModal] = useState(false);
  const studentsPerPage = 20;

  // ← CHANGED: Now receives full student object
  const handleAssignClass = (student) => {
    console.log("Opening assign modal for:", student); // DEBUG
    setSelectedStudentForAssign(student); // ← Store full student object
    setShowAssignModal(true);
  };

  const handleStudentClick = (student) => setSelectedStudent(student);
  const closeInfoCard = () => setSelectedStudent(null);

  // Client-side pagination of filtered results
  const totalStudents = filteredStudents.length;
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  // Loading state
  if (!students || students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <Header 
          totalStudents={totalStudents} 
          onMassPromote={() => setShowMassPromoteModal(true)} 
        />

        <SearchFilterBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          selectedSchool={selectedSchool}
          setSelectedSchool={setSelectedSchool}
          ageFilter={ageFilter}
          setAgeFilter={setAgeFilter}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          classes={classes}
          schools={userSchools}
        />

        {filteredStudents.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden lg:block">
              <StudentsTable
                students={paginatedStudents}
                onStudentClick={handleStudentClick}
                onPromote={promoteStudent}
                onDemote={demoteStudent}
                onAssign={handleAssignClass}  // ← Now passes full student
              />
            </div>
            <div className="lg:hidden">
              <StudentCards
                students={paginatedStudents}
                onStudentClick={handleStudentClick}
                onPromote={promoteStudent}
                onDemote={demoteStudent}
                onAssign={handleAssignClass}  // ← Now passes full student
              />
            </div>
          </>
        )}

        {totalStudents > studentsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalStudents / studentsPerPage)}
            onPageChange={setCurrentPage}
            totalItems={totalStudents}
            itemsPerPage={studentsPerPage}
          />
        )}

        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={closeInfoCard}
            onPromote={promoteStudent}
            onDemote={demoteStudent}
          />
        )}

        {showMassPromoteModal && (
          <MassPromoteModal
            schools={userSchools}
            massPromoteSchool={massPromoteSchool}
            setMassPromoteSchool={setMassPromoteSchool}
            selectedPromoteClass={selectedPromoteClass}
            setSelectedPromoteClass={setSelectedPromoteClass}
            studentsByClass={studentsByClass}
            promotionStatus={promotionStatus}
            promotingClass={promotingClass}
            onClose={() => setShowMassPromoteModal(false)}
            onPromote={handleMassPromote}
          />
        )}

        {showAssignModal && (
          <AssignClassModal
            classes={classes}
            currentStudent={selectedStudentForAssign}  // ← CHANGED: Pass full student object
            onSuccess={(assignmentData) => {
              console.log("Assignment successful:", assignmentData);
              setFetchFlags(prev => ({ ...prev, students: true }));
              setShowAssignModal(false);
              setSelectedStudentForAssign(null);
            }}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedStudentForAssign(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

const Header = ({ totalStudents, onMassPromote }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Users className="w-6 h-6 text-white" />
        </div>
        Students
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage and organize your student records
      </p>
    </div>
    
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <span className="font-semibold text-blue-600">{totalStudents}</span>
        <span>total students</span>
      </div>
      
      <button
        onClick={onMassPromote}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
      >
        <TrendingUp className="w-4 h-4" />
        <span className="hidden sm:inline">Mass Promote</span>
      </button>
    </div>
  </div>
);

export default StudentsList;