// src/contexts/UserContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

// Create the UserContext
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
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
  const [subjects, setSubjects] = useState([]); // Subjects data
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherSubjectsFull, setTeacherSubjectsFull] = useState([]);
  const [teacher, setTeacher] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null); // New state for selected student
  
  const [classSubject, setClassSubject] = useState(null); // New state for selected student

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!userData?.user_id || !selectedTeacher?.teacher_id) {
        console.warn('User data not available. Skipping fetchTeacherSubjects.');
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
        .match({'owner_id' : userData.user_id,  "teacher_id" : selectedTeacher?.teacher_id});
  
      if (error) {
        console.error('Error fetching teacher-subject assignments:', error);
      } else {
        console.log('Teacher-subject assignments fetched:', data);
        setTeacherSubjects(data);
      }
    };
  
    fetchTeacherSubjects();
  }, [userData , selectedTeacher]); // Ensure userData is a dependency
  

  useEffect(() => {
    const fetchTeacherSubjectsFull = async () => {
      if (!userData?.user_id ) {
        console.warn('User data not available. Skipping fetchTeacherSubjects.');
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
        .match({'owner_id' : userData?.user_id});
  
      if (error) {
        console.error('Error fetching teacher-subject assignments:', error);
      } else {
        console.log('Teacher-subject assignments fetched:', data);
        setTeacherSubjectsFull(data);
      }
    };
  
    fetchTeacherSubjectsFull();
  }, [userData]); // Ensure userData is a dependency


  useEffect(() => {
    const fetchAttendace = async () => {
      if (!userData?.user_id ) {
        console.warn('User data not available. Skipping fetchTeacherSubjects.');
        return;
      }
  
      console.log('Fetching teacher-attendance...');
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select(`
          *,
          teachers (teacher_name),
          class (class_name),
          schools (name)
        `)
        .match({'owner_id' : userData?.user_id});
  
      if (error) {
        console.error('Error fetching teacher-subject assignments:', error);
      } else {
        console.log('Teacher-subject assignments fetched:', data);
        setattenndance(data);
      }
    };
  
    fetchAttendace();
  }, [userData]); // Ensure userData is a dependency

  // Fetch roles from the 'roles' table
  useEffect(() => {
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
  }, []);

  // Fetch teachers from the 'teachers' table
  useEffect(() => {
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
        .eq('teacher_proprietor', userData?.user_id);
  
      if (error) {
        console.error('Error fetching teachers:', error);
      } else {
        console.log('Teachers fetched:', data); // Log the data here
        setTeachers(data);
      }
    };
    fetchTeachers();
  }, [userData]);
  

  useEffect(() => {
    const fetchClsssSubs = async () => {
      console.log('Fetching class subjects ...');
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
        .eq('proprietor_id', userData?.user_id , "class_id", selectedStudent?.class_id);
  
      if (error) {
        console.error('Error fetching , class subjects:', error );
      } else {
        console.log('class subjects for students :', data, selectedStudent?.class_id); // Log the data here
        setClassSubject(data);
      }
    };
    fetchClsssSubs();
  }, [userData, selectedStudent]);
  


  useEffect(() => {
    const fetchTeacher = async () => {
      console.log('Fetching teachers...');
      const { data, error } = await supabase
      .from('teachers')
      .select("*")
      .eq("teacher_id", userData?.user_id)

      if (error) {
        console.error('Error fetching teacher:', error);
      } else {
        console.log('Teacher fetched:', data);
        setTeacher(data);
      }
    };
    fetchTeacher();
  }, [userData]);

  useEffect(() => {
    const fetchUserSchools = async () => {
      console.log('Fetching user schools...');
      const { data, error } = await supabase.from('schools')
      .select('*')
      .eq("school_owner", userData?.user_id);
      if (error) {
        console.error('Error fetching user schools:', error);
      } else {
        console.log('User Schools fetched:', data);
        setUserSchools(data);
      }
    };
    fetchUserSchools();
  }, [userData]);

  // Fetch students with a join on the 'schools' table to get school names
  useEffect(() => {
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
        .eq('proprietor', userData?.user_id); // Adjusted based on the proprietor reference

      if (error) {
        console.error('Error fetching students:', error);
      } else {
        console.log('Students fetched:', data);
        setStudents(data);
      }
    };
    fetchStudents();
  }, [userData]);



   // Fetch student with a join on the 'schools' table to get school names
   useEffect(() => {
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
        .eq('id', userData?.user_id); // Adjusted based on the student reference

      if (error) {
        console.error('Error fetching student:', error);
      } else {
        console.log('Student fetched:', data);
        set1Student(data);
      }
    };
    fetchStudent();
  }, [userData]);

  // Fetch requests based on userData availability
  useEffect(() => {
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
  }, [userData]);

  // Fetch classes from the 'class' table
  useEffect(() => {
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
  }, []);

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
        user,
        userData,
        session,
        logout,
        showNav,
        setShowNav,
        roles,
        setRoles,
        schools,
        setSchools,
        students,
        setStudents,
        requests,
        setRequests,
        classes,
        setClasses,
        userSchools,
        teachers ,// Expose teachers through context
        subjects
        , teacherSubjects
        , setTeacher,
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
        setClassSubject
        

      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
