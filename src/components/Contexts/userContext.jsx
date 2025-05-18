// src/contexts/UserContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
 import { useRef } from 'react';

// Create the UserContext
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {

 const hasFetchedRoles = useRef(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // User profile data
  const [session, setSession] = useState(null);
  const [showNav, setShowNav] = useState(0);
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]); // School data
  const [students, setStudents] = useState([]); // Student data
  const [oneStudent, set1Student] = useState([]); // 1Student data
  const [requests, setRequests] = useState(0); // Request count
  const [classes, setClasses] = useState(0); // Request count
  const [userSchools, setUserSchools] = useState([]);
  const [attendace, setattenndance] = useState([]);
  const [teachers, setTeachers] = useState([]); // Teachers data
 // const [teacherMetaData, setTeacherMetaDatA] = useState([]); // single teacher meta data
  const [subjects, setSubjects] = useState([]); // Subjects data
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherSubjectsFull, setTeacherSubjectsFull] = useState([]); // get teacher subjects when teacher is selected
  const [teacher, setTeacher] = useState([]); // fetch a single teacher id 
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null); // New state for selected student
  // const [teacherAttendance, setTeacherAttendance] = useState([]);
  const [classSubject, setClassSubject] = useState(null); // New state for selected 
  const [guardianStudents , setGuardianStudents] = useState([])
  const [allStudents, setAllStudents] = useState([]); // getting all the students with out classification 
  const [teacherDashboardSubjects, setTeacherDashboardSubjects] = useState([]); // getting all the subjects  the teacher is teaching for the teacher dashboard
const [fetchFlags, setFetchFlags] = useState({ 
  students: false,
  teachers: false,
  schools: false,
  subjects: false,
  oneStudent: false,
  attendance: false,
  teacherDashboardSubjects: false,
  // teacherAttendance: false,
  teacherSubjects: false,
  teacherSubjectsFull: false,
  roles: false,
  requests: false,
   classes: false,
  classSubject: false,
  userSchools: false,
  teacher: false,
  allStudents: false,
  teacherMetaData: false,
  userData: false,
  guardianStudents: false,

});



  useEffect(() => { 
  if (fetchFlags.subjects === true) {
    console.log("fetchFlags is holding subjects");

    const fetchSubjects = async () => {
      console.log('Fetching subjects...');
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) {
        console.error('Error fetching subjects:', error);
      } else {
        console.log('Subjects fetched:', data);
        setSubjects(data);
      }
    };

    fetchSubjects();
  }
}, [fetchFlags.subjects]); // ✅ This is the fix


  // const fetchTeacherAttendance = async () => {
  //   try {
  //     setLoading(true);
  //     const { data, error } = await supabase
  //       .from("teacher_attendance")
  //       .select("*")
  //       .match({'owner_id' : teacher?.teacher_proprietor,  "teacher_id" : userData?.user_id});

  //     if (error) throw error;
  //     setTeacherAttendance(data || []);
  //   } catch (error) {
  //     console.error("Error fetching teacher attendance:", error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // useEffect(() => {
  //   fetchTeacherAttendance();
  // }, []);

useEffect(() => {
  if (!fetchFlags.teacherSubjects) return;

  const fetchTeacherSubjects = async () => {
    if (!userData?.user_id || !selectedTeacher?.teacher_id) {
      console.warn('User data or selected teacher not available. Skipping fetchTeacherSubjects.');
      return;
    }

    console.log('Fetching teacher-subject assignments...');
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select(`
        *,
        teachers (teacher_name),
        subjects (subject_name)
      `)
      .match({
        owner_id: userData.user_id,
        teacher_id: selectedTeacher.teacher_id,
      });

    if (error) {
      console.error('Error fetching teacher-subject assignments:', error);
    } else {
      console.log('Teacher-subject assignments fetched:', data);
      setTeacherSubjects(data);
      setFetchFlags(prev => ({ ...prev, teacherSubjects: false })); // ✅ Reset the flag here
    }
  };

  fetchTeacherSubjects();
}, [fetchFlags.teacherSubjects, userData?.user_id, selectedTeacher?.teacher_id]); // ✅ Use stable primitives

  

 useEffect(() => {
  if (fetchFlags.teacherSubjectsFull === true) {
    const fetchTeacherSubjectsFull = async () => {
      if (!userData?.user_id) {
        console.warn('User data not available. Skipping fetchTeacherSubjects.');
        return;
      }

      console.log('Fetching teacher-subject assignments2...');
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          *,
          teachers (teacher_name),
          subjects (subject_name)
        `)
        .match({ 'owner_id': userData?.user_id });

      if (error) {
        console.error('Error fetching teacher-subject assignments:', error);
      } else {
        console.log('Teacher-subject assignments fetched:', data);
        setTeacherSubjectsFull(data);
      }
    };

    fetchTeacherSubjectsFull();
  }
}, [fetchFlags.teacherSubjectsFull, userData]);



useEffect(() => { 
  if (!fetchFlags.teacherDashboardSubjects || !userData?.user_id) return;

  const fetchTeacherSubjects = async () => {
    console.log('Fetching teacher dashboard subjects...');

    const { data, error } = await supabase
      .from('teacher_subjects')
      .select(`
        *,
        subjects (
          id,
          subject_name,
          level,
          track
        )
      `)
      .eq('teacher_id', userData.user_id);

    if (error) {
      console.error('Error fetching teacher dashboard subjects:', error);
    } else {
      console.log('Fetched teacher dashboard subjects:', data);
      setTeacherDashboardSubjects(data);
    }

    // ✅ Always reset the flag
    setFetchFlags(prev => ({ ...prev, teacherDashboardSubjects: false }));
  };

  fetchTeacherSubjects();
}, [fetchFlags.teacherDashboardSubjects, userData?.user_id]);

useEffect(() => {
  if (fetchFlags.attendace === true && userData?.user_id) {
    const fetchAttendance = async () => {
      console.log('Fetching proprietor-attendance...');
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select(`
          *,
          teachers (teacher_name),
          class (class_name),
          schools (name)
        `)
        .match({ owner_id: userData.user_id });

      if (error) {
        console.error('Error Fetching Proprietor Attendance:', error);
      } else {
        console.log('Proprietor Attendance Fetched:', data);
        setattenndance(data);
      }
    };

    fetchAttendance();
  }
}, [fetchFlags.attendacee, userData]);


  // Fetch roles from the 'roles' table
useEffect(() => {
  if (hasFetchedRoles.current) return;

  hasFetchedRoles.current = true; // 🛠️ Set this immediately to prevent re-trigger

  const fetchRoles = async () => {
    console.log('Fetching roles...');
    const { data, error } = await supabase.from('roles').select('*');

    if (error) {
      console.error('Error fetching roles:', error);
    } else {
      console.log('Roles fetched:', data);
      setRoles(data);
    }
  };

  fetchRoles();
}, []);

  // Fetch schools from the 'schools' table
useEffect(() => {
  if (fetchFlags.schools === true) {
    const fetchSchools = async () => {
      console.log('Fetching schools...');
      const { data, error } = await supabase.from('schools').select('*');
      if (error) {
        console.error('Error fetching schools:', error);
      } else {
        console.log('Schools fetched:', data);
        setSchools(data);
      }
    };

    fetchSchools();
  }
}, [fetchFlags.schools]);



useEffect(() => {
  if (fetchFlags.guardianStudents === true && userData?.user_id) {
    const fetchGuardianStudents = async () => {
      console.log('Fetching guardian students...');
      const { data, error } = await supabase
        .from('guardian_children')
        .select(
          `
          *,
          students (
            *
          )
          `
        )
        .eq('guardian_name', userData.user_id);

      if (error) {
        console.error('Error fetching guardian students:', error);
      } else {
        console.log('Guardian students fetched:', data);
        setGuardianStudents(data);
      }
    };

    fetchGuardianStudents();
  }
}, [fetchFlags.guardianStudents, userData]);




  // Fetch teachers from the 'teachers' table
useEffect(() => {
  if (fetchFlags.teachers === true && userData?.user_id) {
    const fetchTeachers = async () => {
      console.log('Fetching teachers...');
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          schools (
            name
          ),
          class (
            class_name
          )
        `)
        .eq('teacher_proprietor', userData.user_id);

      if (error) {
        console.error('Error fetching teachers:', error);
      } else {
        console.log('Teachers fetched:', data);
        setTeachers(data);
      }
    };

    fetchTeachers();
  }
}, [fetchFlags.teachers, userData]);

  

 useEffect(() => {
  if (fetchFlags.classSubject === true) {
    const fetchClassSubs = async () => {
      if (!userData?.user_id || !selectedStudent?.class_id) {
        console.warn('Missing userData or selectedStudent, skipping fetch.');
        return;
      }

      console.log('Fetching class subjects...');
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          *,
          subjects (
            subject_name
          ),
          profiles (
            user_id
          )
        `)
        .match({
          proprietor_id: userData.user_id,
          class_id: selectedStudent.class_id,
        });

      if (error) {
        console.error('Error fetching class subjects:', error);
      } else {
        console.log('Class subjects fetched:', data);
        setClassSubject(data);
      }
    };

    fetchClassSubs();
  }
}, [fetchFlags.classSubject, userData, selectedStudent]);

  


useEffect(() => {
  if (!fetchFlags.teacher || !userData?.user_id) return;

  const fetchTeacher = async () => {
    console.log('Fetching teachers...');
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('teacher_id', userData.user_id);

    if (error) {
      console.error('Error fetching teacher:', error);
    } else {
      console.log('Teacher fetched:', data);
      setTeacher(data);
      setFetchFlags(prev => ({ ...prev, teacher: false })); // reset flag
    }
  };

  fetchTeacher();
}, [fetchFlags.teacher, userData?.user_id]);


// fetchies the 
useEffect(() => {
  if (fetchFlags.guardianStudents === true && userData?.user_id) {
    const fetchGuardianStudents = async () => {
      console.log('Fetching guardian students...'); 
     const { data, error } = await supabase
.from('guardian_children')
.select(`
  guardian_name,
  guardians (
    guardianname,
    guardian_picture
  ),
  students (
    id,
    student_name,
    student_picture,
    age,
    class_id,
    class (
      class_name
    )
  )
`)

  .eq('guardian_name', userData.user_id);
      if (error) {
        console.error('Error fetching teacher:', error);
      } else {
        console.log('Teacher fetched:', data);
         setGuardianStudents(data);
      }
    };

    fetchGuardianStudents();
  }
}, [fetchFlags.teacher, userData]);


useEffect(() => {
  if (fetchFlags.userSchools === true && userData?.user_id) {
    const fetchUserSchools = async () => {
      console.log('Fetching user schools...');
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('school_owner', userData.user_id);

      if (error) {
        console.error('Error fetching user schools:', error);
      } else {
        console.log('User Schools fetched:', data);
        setUserSchools(data);
      }
    };

    fetchUserSchools();
  }
}, [fetchFlags.userSchools , userData]);


  // Fetch students with a join on the 'schools' table to get school names
useEffect(() => {
  if (fetchFlags.students === true && userData?.user_id) {
    const fetchStudents = async () => {
      console.log('Fetching students with school names...');
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          schools (
            name
          ),
          class (
            class_name
          )
        `)
        .eq('proprietor', userData.user_id);

      if (error) {
        console.error('Error fetching students:', error);
      } else {
        console.log('Students fetched:', data);
        setStudents(data);
      }
    };

    fetchStudents();
  }
}, [fetchFlags.students, userData]);




   // Fetch student with a join on the 'schools' table to get school names
useEffect(() => {
  if (fetchFlags.oneStudent === true && userData) {
    const fetchStudent = async () => {
      console.log('Fetching students with school names...');
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          schools (
            name
          ),
          class (
            class_name
          )
        `)
        .eq('id', userData?.user_id);

      if (error) {
        console.error('Error fetching student:', error);
      } else {
        console.log('Student fetched:', data);
        set1Student(data);
      }
    };

    fetchStudent();
  }
}, [fetchFlags.oneStudent, userData]);


  // Fetch requests based on userData availability
useEffect(() => { 
  if (fetchFlags.requests === true) {
    const fetchRequests = async () => {
      if (!userData) return;
      console.log('Fetching requests...');
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .match({ 'owner_id': userData.user_id, status: 'pending' });
      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        console.log('Requests fetched:', data);
        setRequests(data ? data.length : 0);
      }
    };
    fetchRequests();
  }
}, [fetchFlags.requests, userData]);


  // Fetch classes from the 'class' table
useEffect(() => {
  if (fetchFlags.classes === true) {
    const fetchClasses = async () => {
      console.log('Fetching classes...');
      const { data, error } = await supabase
        .from('class')
        .select('*');
      if (error) {
        console.error('Error fetching classes:', error);
      } else {
        console.log('Classes fetched:', data);
        setClasses(data);
      }
    };

    fetchClasses();
  }
}, [fetchFlags.classes]);



    // Fetch all students from the 'students' table
 useEffect(() => {
  if (fetchFlags.allStudents === true) {
    const fetchAllStudents = async () => {
      console.log('Fetching all students ...');
      const { data, error } = await supabase
        .from('students')
        .select('*');
      if (error) {
        console.error('Error fetching all students :', error);
      } else {
        console.log('All students fetched:', data);
        setAllStudents(data);
      }
    };
    fetchAllStudents();
  }
}, [fetchFlags.allStudents]);

  

  // Function to fetch authenticated user and profile data
  const fetchAuthenticatedUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      setSession(session);
      setUser(session?.user || null);
      if (session) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (profileError) throw profileError;
        setUserData(profileData);
      }
    } catch (error) {
      console.error('Error fetching user or profile data:', error.message);
      setUser(null);
      setUserData(null);
    }
  };

  // Function to log out the user
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      setUser(null);
      setUserData(null);
      setSession(null);
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    fetchAuthenticatedUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session) {
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.error('Error fetching profile data on auth state change:', profileError.message);
            } else {
              setUserData(profileData);
            }
          });
      } else {
        setUserData(null);
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        setFetchFlags,
        fetchFlags,
        user,
        userData,
        session,
        logout,
        showNav,
        setShowNav,
        roles,
        setRoles,
        setSchools,
        students,
        guardianStudents, 
        setGuardianStudents,
        setStudents,
        requests,
        setRequests,
        classes,
        setClasses,
        userSchools,
        teachers ,// Expose teachers through context
        subjects
        , teacherSubjects,
        teacherDashboardSubjects
        , setTeacher,
        schools, 
        selectedTeacher,
        setSelectedTeacher,
        teacher,
        teacherSubjectsFull,
        setTeacherSubjectsFull,
        oneStudent,
        set1Student,
        selectedStudent,
        setSelectedStudent, 
        classSubject,
        setClassSubject,
        // teacherAttendance,
        attendace,
        setTeachers,
        allStudents,
        setAllStudents,

      
        

      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
