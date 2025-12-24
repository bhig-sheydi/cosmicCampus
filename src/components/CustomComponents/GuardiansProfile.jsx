import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '../Contexts/userContext';
import { supabase } from '../../supabaseClient';
import Logo from '../../assets/cosmic.png';

const PAGE_SIZE = 6;

const GuardiansProfile = () => {
  const { guardianStudents, setFetchFlags } = useUser();

  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, guardianStudents: true }));
    fetchRequests();

    // ================= REAL-TIME SUBSCRIPTION =================
    const subscription = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          // update requests array based on event
          setRequests((prev) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...prev, payload.new];
              case 'UPDATE':
                return prev.map(r =>
                  r.student_id === payload.new.student_id ? payload.new : r
                );
              case 'DELETE':
                return prev.filter(r => r.student_id !== payload.old.student_id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('student_id, school_id, status');

    if (error) {
      setRequests([]);
    } else {
      setRequests(data || []);
    }
    setRequestsLoaded(true);
  };

  /* ================= REQUEST MAP ================= */
  const requestMap = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      if (r.student_id) map[String(r.student_id)] = r;
    });
    return map;
  }, [requests]);

  /* ================= SINGLE SOURCE OF TRUTH ================= */
  const getStudentState = (student) => {
    if (!requestsLoaded) return 'loading';

    if (student.school_id) return 'enrolled';

    const req = requestMap[String(student.id)];
    if (req) {
      if (req.status === 'pending') return 'pending';
      if (req.status === 'accepted') return 'enrolled';
    }

    return 'none';
  };

  /* ================= FETCH SCHOOLS ================= */
  useEffect(() => {
    if (!selectedStudent) return;

    const fetchSchools = async () => {
      setLoading(true);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('schools')
        .select('id, name, logo_url, school_owner')
        .eq('is_deleted', false)
        .range(from, to);

      if (search) query = query.ilike('name', `%${search}%`);

      const { data, error } = await query;
      if (error) {
        setSchools([]);
      } else {
        setSchools(data || []);
      }
      setLoading(false);
    };

    fetchSchools();
  }, [selectedStudent, search, page]);

  /* ================= SEND REQUEST ================= */
  const sendEnrollmentRequest = async (student, school) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .insert({
          student_id: student.id,
          school_id: school.id,
          owner_id: school.school_owner,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => [...prev, data]);
      setSelectedStudent(null);
    } catch (err) {
      alert('Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  /* ================= WITHDRAW (PENDING OR ENROLLED) ================= */
  const withdrawStudent = async (studentId) => {
    setActionLoading(true);
    try {
      await supabase.from('requests').delete().eq('student_id', studentId);

      await supabase
        .from('students')
        .update({ school_id: null, proprietor: null })
        .eq('id', studentId);

      setRequests(prev => prev.filter(r => String(r.student_id) !== String(studentId)));
      setFetchFlags(prev => ({ ...prev, guardianStudents: true }));
    } catch (err) {
      alert('Failed to withdraw student');
    } finally {
      setActionLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-10">Guardian Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {guardianStudents.map(({ students }) => {
          const state = getStudentState(students);

          return (
            <div
              key={students.id}
              className="bg-white rounded-xl shadow border p-6 flex flex-col items-center"
            >
              <img
                src={students.student_picture || Logo}
                alt={students.student_name}
                className="w-24 h-24 rounded-full object-cover border"
              />

              <h2 className="text-lg font-semibold mt-4">{students.student_name}</h2>
              <p className="text-sm text-gray-600">Age: {students.age}</p>

              {state === 'pending' && (
                <span className="mt-2 text-sm font-medium text-yellow-600">
                  ⏳ Enrollment Pending
                </span>
              )}

              {state === 'loading' ? (
                <div className="mt-4 w-full h-10 bg-gray-200 rounded animate-pulse" />
              ) : state === 'enrolled' || state === 'pending' ? (
                <button
                  onClick={() => withdrawStudent(students.id)}
                  disabled={actionLoading}
                  className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
                >
                  Withdraw Student
                </button>
              ) : (
                <button
                  onClick={() => setSelectedStudent(students)}
                  className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
                >
                  Enroll In School
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= SCHOOL MODAL ================= */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">
              Select School for {selectedStudent.student_name}
            </h2>

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search schools..."
              className="border p-2 rounded mb-4 w-full"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {schools.map((school) => (
                <div
                  key={school.id}
                  onClick={() => sendEnrollmentRequest(selectedStudent, school)}
                  className="border rounded p-4 cursor-pointer hover:shadow"
                >
                  <img
                    src={school.logo_url || Logo}
                    alt={school.name}
                    className="h-24 w-full object-cover mb-2"
                  />
                  <p className="font-semibold text-center">{school.name}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="mt-4 w-full bg-gray-300 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardiansProfile;

