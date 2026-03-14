import { useState, useEffect } from 'react';

export const useStudents = (students, classes, schools) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [ageFilter, setAgeFilter] = useState({ operator: '', value: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  const applyAgeFilter = (studentAge) => {
    const { operator, value } = ageFilter;
    const numericValue = parseInt(value, 10);
    if (!operator || isNaN(numericValue)) return true;
    switch (operator) {
      case '>': return studentAge > numericValue;
      case '<': return studentAge < numericValue;
      case '=': return studentAge === numericValue;
      default: return true;
    }
  };

  const safeStudents = Array.isArray(students) ? students : [];
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeSchools = Array.isArray(schools) ? schools : [];

  const filteredStudents = safeStudents.filter((student) =>
    student?.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedClass === '' || String(student?.class?.class_name) === selectedClass) &&
    (selectedSchool === '' || student?.schools?.name === selectedSchool) &&
    applyAgeFilter(student?.age)
  );

  const clearFilters = () => {
    setSelectedClass('');
    setSelectedSchool('');
    setAgeFilter({ operator: '', value: '' });
  };

  const hasActiveFilters = selectedClass || selectedSchool || ageFilter.operator;

  return {
    searchQuery, setSearchQuery,
    searchInput, setSearchInput,
    selectedClass, setSelectedClass,
    selectedSchool, setSelectedSchool,
    ageFilter, setAgeFilter,
    showFilters, setShowFilters,
    filteredStudents,
    clearFilters,
    hasActiveFilters
  };
};