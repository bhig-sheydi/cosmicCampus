// src/components/Auth.js
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage('Check your email for a confirmation link!');
  };

  const handleLogin = async () => {
    setLoading(true);
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage('Logged in successfully!');
  };

  return (
    <div className='pt-[500px]'>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignUp} disabled={loading}>
        Sign Up
      </button>
      <button onClick={handleLogin} disabled={loading}>
        Log In
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
