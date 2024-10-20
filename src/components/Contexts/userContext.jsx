// src/contexts/UserContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

// Create the UserContext
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // State to store user profile data
  const [session, setSession] = useState(null);
  const [showNav, setShowNav] = useState(0);
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]); // State to store school da

  // Fetch roles from the 'roles' table
  useEffect(() => {
    const fetchRoles = async () => {
      console.log('Fetching roles...'); // Log to ensure fetchRoles is being called
      const { data, error } = await supabase.from('roles').select('*');

      if (error) {
        console.error('Error fetching roles', error);
      } else {
        console.log('Roles fetched:', data); // Log the fetched roles
        setRoles(data);
      }
    };

    fetchRoles();
  }, []);

  // Fetch schools from the 'schools' table
  useEffect(() => {
    const fetchSchools = async () => {
      console.log('Fetching schools...'); // Log to ensure fetchSchools is being called
      const { data, error } = await supabase.from('schools').select('*');
      

      if (error) {
        console.error('Error fetching schools', error);
      } else {
        console.log('Schools fetched:', data); // Log the fetched schools
        setSchools(data);
      }
    };

    fetchSchools();
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

        setUserData(profileData); // Set user profile data
      }
    } catch (error) {
      console.error('Error fetching user or profile data:', error.message);
      setUser(null);
      setUserData(null);
    }
  };


  const updateSchoolData = async (id, updatedData) => {
    const { data, error } = await supabase
      .from('schools')
      .update(updatedData)
      .eq('id', id);
  
    if (error) throw error;
    return data;
  };
  
  // Function to log out the user
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      setUser(null);
      setUserData(null); // Clear user profile data on logout
      setSession(null); // Clear session data
    }
  };

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
        setUserData(null); // Clear user profile data if session is null
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
        schools, // Expose schools through context
        setSchools,
        updateSchoolData
        
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
