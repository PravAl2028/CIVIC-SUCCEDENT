import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';

export default function SignupView({ onSwitchToLogin, onGoHome }: { onSwitchToLogin: () => void, onGoHome: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) return setError('Username must be at least 3 characters');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      // Phone is passed via state/context, but for now we'll store it in localStorage 
      // or we can pass it during the onboarding step somehow since auth changes trigger App.tsx update.
      localStorage.setItem('temp_signup_phone', phone);
      // App.tsx auth state listener handles redirect to onboarding
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('Email is already registered');
      else if (err.code === 'auth/invalid-email') setError('Invalid email format');
      else setError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="bg-[#F5F0E8] min-h-screen font-sans flex flex-col justify-center items-center text-[#191c22] p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-150">
        <div className="text-center mb-6">
          <h1 
            onClick={onGoHome}
            className="font-display text-2xl font-black uppercase tracking-widest text-[#775a00] cursor-pointer hover:opacity-80 transition-opacity"
          >
            CIVIC SUCCEDENT
          </h1>
          <p className="text-sm text-zinc-500 font-bold mt-2">Join your city's heroes</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="Enter display name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Phone Number (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="+91 9876543210"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-teal-700 transition-colors mt-4"
          >
            CREATE ACCOUNT
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-xs font-bold text-zinc-500 hover:text-[#006a65]"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}
