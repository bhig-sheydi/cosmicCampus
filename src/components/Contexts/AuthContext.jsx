// src/components/Contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../../supabaseClient'; // Import your Supabase client

// Create the context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [login, setLogin] = useState(false);
  const [session, setSession] = useState(null);
  const [userData, setUserData] = useState(null); // State to store user profile data

  useEffect(() => {
    const fetchSession = async () => {
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLogin(!!session); // Set login to true if session exists

      if (session) {
        // Fetch user data from profiles table if the session exists
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error.message);
        } else {
          setUserData(profileData); // Set user profile data in state
        }
      }
    };

    fetchSession();

    // Handle auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setLogin(!!session); // Update login state based on session

      if (session) {
        // Fetch profile data again on auth state change
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profileData, error }) => {
            if (error) {
              console.error("Error fetching user profile:", error.message);
            } else {
              setUserData(profileData); // Update profile data
            }
          });
      }
    });

    // Clean up subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ login, session, userData }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the context
export const useAuth = () => {
  return useContext(AuthContext);
};
