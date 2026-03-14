import React from 'react';
import { Search, Filter, X } from 'lucide-react';

const SearchFilterBar = ({
  searchInput, setSearchInput,
  showFilters, setShowFilters,
  selectedClass, setSelectedClass,
  selectedSchool, setSelectedSchool,
  ageFilter, setAgeFilter,
  hasActiveFilters, clearFilters,
  classes, schools
}) => {
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeSchools = Array.isArray(schools) ? schools : [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>
        
        <FilterButton 
          showFilters={showFilters} 
          hasActiveFilters={hasActiveFilters} 
          onClick={() => setShowFilters(!showFilters)} 
        />
      </div>

      {showFilters && (
        <FilterPanel
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          selectedSchool={selectedSchool}
          setSelectedSchool={setSelectedSchool}
          ageFilter={ageFilter}
          setAgeFilter={setAgeFilter}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          classes={safeClasses}
          schools={safeSchools}
        />
      )}
    </div>
  );
};

const FilterButton = ({ showFilters, hasActiveFilters, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
      showFilters || hasActiveFilters
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
    }`}
  >
    <Filter className="w-4 h-4" />
    Filters
    {hasActiveFilters && (
      <span className="ml-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
        1
      </span>
    )}
  </button>
);

const FilterPanel = ({
  selectedClass, setSelectedClass,
  selectedSchool, setSelectedSchool,
  ageFilter, setAgeFilter,
  hasActiveFilters, clearFilters,
  classes, schools
}) => (
  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Class</label>
      <select
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
      >
        <option value="">All Classes</option>
        {classes.map((c) => (
          <option key={c?.class_id} value={c?.class_name || ''}>
            {c?.class_name || 'Unnamed'}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">School</label>
      <select
        value={selectedSchool}
        onChange={(e) => setSelectedSchool(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
      >
        <option value="">All Schools</option>
        {schools.map((s, i) => (
          <option key={i} value={s?.name || ''}>{s?.name || 'Unnamed'}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
      <div className="flex gap-2">
        <select
          value={ageFilter.operator}
          onChange={(e) => setAgeFilter(prev => ({ ...prev, operator: e.target.value }))}
          className="w-1/2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg dark:text-white"
        >
          <option value="">Any</option>
          <option value=">">Older</option>
          <option value="<">Younger</option>
          <option value="=">Exact</option>
        </select>
        <input
          type="number"
          placeholder="Age"
          value={ageFilter.value}
          onChange={(e) => setAgeFilter(prev => ({ ...prev, value: e.target.value }))}
          className="w-1/2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg dark:text-white"
        />
      </div>
    </div>

    <div className="flex items-end">
      <button
        onClick={clearFilters}
        disabled={!hasActiveFilters}
        className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 rounded-lg disabled:opacity-50"
      >
        Clear Filters
      </button>
    </div>
  </div>
);

export default SearchFilterBar;