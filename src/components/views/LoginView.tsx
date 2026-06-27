import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

export default function LoginView({ onSwitchToSignup, onGoHome }: { onSwitchToSignup: () => void, onGoHome: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.tsx auth state listener will handle the rest
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('No account with this email');
      else if (err.code === 'auth/wrong-password') setError('Incorrect password');
      else if (err.code === 'auth/invalid-email') setError('Invalid email format');
      else setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="bg-[#F5F0E8] min-h-screen font-sans flex flex-col justify-center items-center text-[#191c22] p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-150">
        <div className="text-center mb-8">
          <h1 
            onClick={onGoHome}
            className="font-display text-2xl font-black uppercase tracking-widest text-[#775a00] cursor-pointer hover:opacity-80 transition-opacity"
          >
            CIVIC SUCCEDENT
          </h1>
          <p className="text-sm text-zinc-500 font-bold mt-2">Welcome back, hero</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-teal-700 transition-colors mt-2"
          >
            LOGIN
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToSignup}
            className="text-xs font-bold text-zinc-500 hover:text-[#006a65]"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
