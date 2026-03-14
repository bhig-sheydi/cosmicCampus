// TeacherList.jsx - Self-contained version
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useUser } from '@/components/Contexts/userContext';
import { supabase } from '@/supabaseClient';
import { 
  ListFilterIcon, Search, X, ChevronLeft, ChevronRight, 
  User, School, BookOpen, Trash2, Loader2 
} from 'lucide-react';
import TeacherInfoModal from "../components/CustomComponents/TeacherInfoModal";

// Create a singleton QueryClient (or use Context)
let queryClientInstance = null;

const getQueryClient = () => {
  if (!queryClientInstance) {
    queryClientInstance = {
      cache: new Map(),
      subscribe: (key, callback) => {
        // Simple pub-sub for cache invalidation
        if (!queryClientInstance.listeners) queryClientInstance.listeners = new Map();
        if (!queryClientInstance.listeners.has(key)) queryClientInstance.listeners.set(key, new Set());
        queryClientInstance.listeners.get(key).add(callback);
        return () => queryClientInstance.listeners.get(key).delete(callback);
      },
      invalidateQueries: (key) => {
        const cacheKey = Array.isArray(key) ? key.join('-') : key;
        queryClientInstance.cache.delete(cacheKey);
        // Notify listeners
        queryClientInstance.listeners?.get(cacheKey)?.forEach(cb => cb());
      },
      setQueryData: (key, data) => {
        const cacheKey = Array.isArray(key) ? key.join('-') : key;
        queryClientInstance.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          staleTime: 5 * 60 * 1000
        });
        queryClientInstance.listeners?.get(cacheKey)?.forEach(cb => cb());
      },
      getQueryData: (key) => {
        const cacheKey = Array.isArray(key) ? key.join('-') : key;
        const cached = queryClientInstance.cache.get(cacheKey);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > cached.staleTime) {
          queryClientInstance.cache.delete(cacheKey);
          return null;
        }
        return cached.data;
      }
    };
  }
  return queryClientInstance;
};

// Custom hook that mimics React Query without the dependency
const useCachedQuery = (key, fetchFn, options = {}) => {
  const [data, setData] = useState(() => getQueryClient().getQueryData(key));
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState(null);
  
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    const cacheKey = Array.isArray(key) ? key.join('-') : key;
    const cached = getQueryClient().getQueryData(key);
    
    if (cached) {
      setData(cached);
      setIsLoading(false);
      // Background refresh if stale
      fetchFn().then(newData => {
        getQueryClient().setQueryData(key, newData);
        setData(newData);
      }).catch(console.error);
    } else {
      setIsLoading(true);
      fetchFn()
        .then(newData => {
          getQueryClient().setQueryData(key, newData);
          setData(newData);
          setError(null);
        })
        .catch(err => setError(err))
        .finally(() => setIsLoading(false));
    }
    
    // Subscribe to cache updates
    return getQueryClient().subscribe(cacheKey, () => {
      const updated = getQueryClient().getQueryData(key);
      if (updated) setData(updated);
    });
  }, [JSON.stringify(key), enabled]);
  
  const refetch = useCallback(() => {
    getQueryClient().invalidateQueries(key);
    setIsLoading(true);
    return fetchFn()
      .then(newData => {
        getQueryClient().setQueryData(key, newData);
        setData(newData);
        setError(null);
        return newData;
      })
      .catch(err => {
        setError(err);
        throw err;
      })
      .finally(() => setIsLoading(false));
  }, [fetchFn, key]);
  
  return { data, isLoading, error, refetch };
};

// Rest of your component remains similar...
const FilterBadge = memo(({ label, value, onClear }) => {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      {label}: {value}
      <button onClick={onClear} className="hover:text-blue-600 dark:hover:text-blue-300">
        <X size={14} />
      </button>
    </span>
  );
});

const StatCard = memo(({ label, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
));

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const TeacherList = () => {
  const { 
    setFetchFlags,
    userData, 
    userSchools, 
    classes, 
    subjects,
    teacherSubjectsFull
  } = useUser();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState('');
  const [selectedArmForAssignment, setSelectedArmForAssignment] = useState('');
  const [arms, setArms] = useState([]);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setFetchFlags(prev => ({
      ...prev,
      userData: true,
      classes: true,
      userSchools: true,
      subjects: true,
      teacherSubjectsFull: true
    }));
  }, [setFetchFlags]);

  const fetchTeachers = useCallback(async () => {
    if (!userData?.user_id) throw new Error('User not authenticated');

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
          subjects(subject_name)
        )
      `, { count: 'exact' })
      .eq('teacher_proprietor', userData.user_id);

    if (debouncedSearch) query = query.ilike('teacher_name', `%${debouncedSearch}%`);
    if (selectedClass && selectedClass !== 'null') query = query.eq('arms.class_id', selectedClass);
    if (selectedClass === 'null') query = query.is('arm_id', null);
    if (selectedSchool) query = query.eq('schools.name', selectedSchool);
    if (selectedSubject) query = query.eq('teacher_subjects.subjects.subject_name', selectedSubject);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, count, error } = await query.range(from, to);
    if (error) throw error;
    
    return { data, count };
  }, [userData?.user_id, page, debouncedSearch, selectedClass, selectedSchool, selectedSubject]);

  // Use custom cached query hook instead of React Query
  const { data: teachersData, isLoading, error, refetch } = useCachedQuery(
    ['teachers', page, debouncedSearch, selectedClass, selectedSchool, selectedSubject],
    fetchTeachers,
    { enabled: !!userData?.user_id }
  );

  const teachers = teachersData?.data || [];
  const total = teachersData?.count || 0;

  // Optimistic mutations
  const deleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;
    
    try {
      await Promise.all([
        supabase.from('requests').update({ status: 'rejected' }).eq('teacher_id', teacherId),
        supabase.from('teachers').update({ 
          teacher_school: null, 
          teacher_proprietor: null, 
          teacher_class: null 
        }).eq('teacher_id', teacherId),
        supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId)
      ]);
      refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to delete teacher');
    }
  };

  const assignSubject = async () => {
    if (!selectedTeacher || !selectedSubject) return;
    
    const { error } = await supabase
      .from('teacher_subjects')
      .insert({
        teacher_id: selectedTeacher.teacher_id,
        subject_id: selectedSubject,
        owner_id: userData?.user_id
      });

    if (error) {
      alert('Failed to assign subject');
      return;
    }
    
    setActiveModal(null);
    refetch();
  };

  const assignArm = async () => {
    if (!selectedTeacher || !selectedArmForAssignment) return;
    
    const { error } = await supabase
      .from('teachers')
      .update({ arm_id: selectedArmForAssignment })
      .eq('teacher_id', selectedTeacher.teacher_id);

    if (error) {
      alert('Failed to assign class');
      return;
    }
    
    closeClassModal();
    refetch();
  };

  const deleteTeacherSubject = async (subjectId) => {
    if (!window.confirm('Remove this subject from teacher?')) return;
    
    const { error } = await supabase
      .from('teacher_subjects')
      .delete()
      .eq('teacher_id', selectedTeacher.teacher_id)
      .eq('subject_id', subjectId);

    if (error) {
      alert('Failed to remove subject');
      return;
    }
    
    refetch();
  };

  const fetchArms = useCallback(async (classId) => {
    if (!classId || !userSchools?.[0]?.id) return;
    
    const { data, error } = await supabase
      .from('arms')
      .select('arm_id, arm_name')
      .eq('class_id', classId)
      .eq('school_id', userSchools[0].id);

    if (error) {
      console.error('Failed to fetch arms:', error);
      return;
    }
    setArms(data || []);
  }, [userSchools]);

  const openSubjectModal = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setActiveModal('subject');
  }, []);

  const openClassModal = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setActiveModal('class');
    setSelectedClassForAssignment('');
    setSelectedArmForAssignment('');
    setArms([]);
  }, []);

  const openTeacherModal = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setActiveModal('teacher');
  }, []);

  const closeClassModal = useCallback(() => {
    setActiveModal(null);
    setSelectedClassForAssignment('');
    setSelectedArmForAssignment('');
    setArms([]);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedClass('');
    setSelectedSchool('');
    setSelectedSubject('');
    setPage(1);
  }, []);

  const activeFiltersCount = [selectedClass, selectedSchool, selectedSubject].filter(Boolean).length;

  const stats = useMemo(() => ({
    total: total,
    withClass: teachers.filter(t => t.arm_id).length,
    withSubject: teachers.filter(t => t.teacher_subjects?.length > 0).length
  }), [teachers, total]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load teachers</p>
          <button 
            onClick={refetch}
            className="text-blue-500 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Teachers
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your teaching staff and their assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Teachers" value={stats.total} icon={User} color="bg-blue-500" />
        <StatCard label="With Class Assigned" value={stats.withClass} icon={School} color="bg-green-500" />
        <StatCard label="With Subjects" value={stats.withSubject} icon={BookOpen} color="bg-purple-500" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search teachers by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            }`}
          >
            <ListFilterIcon size={20} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.subject_name}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Classes</option>
                <option value="null">No Class Assigned</option>
                {classes?.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                School
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Schools</option>
                {userSchools.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeFiltersCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            <FilterBadge 
              label="Subject" 
              value={selectedSubject} 
              onClear={() => setSelectedSubject('')} 
            />
            <FilterBadge 
              label="Class" 
              value={selectedClass === 'null' ? 'No Class' : classes?.find(c => c.class_id == selectedClass)?.class_name} 
              onClear={() => setSelectedClass('')} 
            />
            <FilterBadge 
              label="School" 
              value={selectedSchool} 
              onClear={() => setSelectedSchool('')} 
            />
            <button 
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 ml-auto"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading teachers...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && teachers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No teachers found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery || activeFiltersCount > 0 
              ? "Try adjusting your search or filters" 
              : "Get started by adding your first teacher"}
          </p>
          {(searchQuery || activeFiltersCount > 0) && (
            <button 
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Teachers Table */}
      {!isLoading && teachers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Class & Arm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {teachers.map((teacher) => (
                  <tr 
                    key={teacher.teacher_id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openTeacherModal(teacher)}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {teacher.teacher_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {teacher.teacher_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {teacher.teacher_id}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {teacher.schools?.name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {teacher.arms ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {teacher.arms.class?.class_name} ({teacher.arms.arm_name})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {teacher.teacher_subjects?.length > 0 ? (
                          teacher.teacher_subjects.map((ts, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            >
                              {ts.subjects?.subject_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No subjects</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openSubjectModal(teacher)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
                          title="Assign Subject"
                        >
                          <BookOpen size={18} />
                        </button>
                        <button
                          onClick={() => openClassModal(teacher)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:bg-green-900/30"
                          title="Assign Class"
                        >
                          <School size={18} />
                        </button>
                        <button
                          onClick={() => deleteTeacher(teacher.teacher_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-900/30"
                          title="Remove Teacher"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="font-medium">{total}</span> teachers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-400">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'class' && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Assign Class & Arm
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                to {selectedTeacher.teacher_name}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class
                </label>
                <select
                  value={selectedClassForAssignment}
                  onChange={(e) => {
                    const classId = e.target.value;
                    setSelectedClassForAssignment(classId);
                    setSelectedArmForAssignment('');
                    if (classId) fetchArms(classId);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select a class</option>
                  {classes.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arm
                </label>
                <select
                  value={selectedArmForAssignment}
                  onChange={(e) => setSelectedArmForAssignment(e.target.value)}
                  disabled={!selectedClassForAssignment || arms.length === 0}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">
                    {!selectedClassForAssignment 
                      ? 'Select a class first' 
                      : arms.length === 0 
                        ? 'No arms available' 
                        : 'Select an arm'}
                  </option>
                  {arms.map(a => (
                    <option key={a.arm_id} value={a.arm_id}>
                      {a.arm_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={closeClassModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={assignArm}
                disabled={!selectedArmForAssignment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Assign Class
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'subject' && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Assign Subject
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                to {selectedTeacher.teacher_name}
              </p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={assignSubject}
                disabled={!selectedSubject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Assign Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'teacher' && selectedTeacher && (
        <TeacherInfoModal 
          teacher={selectedTeacher}
          onClose={() => setActiveModal(null)}
          onDeleteSubject={deleteTeacherSubject}
        />
      )}
    </div>
  );
};

export default TeacherList;