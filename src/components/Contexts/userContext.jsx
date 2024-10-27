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
  const [requests, setRequests] = useState(0); // Request count

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

  // Fetch students from the 'students' table
  useEffect(() => {
    const fetchStudents = async () => {
      console.log('Fetching students...');

      const { data, error } = await supabase
        .from('students')
        .select(`
          id, student_name, is_paid, class_id,
          schools (name)  -- Join with schools to get the name
        `)
        .eq('proprietor', userData?.user_id)
      if (error) {
        console.error('Error fetching students:', error);
      } else {
        console.log('Students fetched:', data);
        setStudents(data);
      }
    };
    fetchStudents();
  }, [userData]);

  // Fetch requests based on userData availability
  useEffect(() => {
    const fetchRequests = async () => {
      if (!userData) return;
      console.log('Fetching requests...');
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .match({'owner_id': userData.user_id, status: 'pending'});
      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        console.log('Requests fetched:', data);
        setRequests(data ? data.length : 0);
      }
    };
    fetchRequests();
  }, [userData]);

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
        students, // Expose students through context
        setStudents,
        requests,
        setRequests,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
