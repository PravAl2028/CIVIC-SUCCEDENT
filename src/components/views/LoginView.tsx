import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';

export default function LoginView({ onSwitchToSignup, onGoHome }: { onSwitchToSignup: () => void, onGoHome: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      // Treat as username fallback
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', loginEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          if (userDoc.email) {
            loginEmail = userDoc.email;
          } else {
            setError(t.auth.errors.noRegisteredEmail);
            return;
          }
        } else {
          setError(t.auth.errors.usernameNotFound);
          return;
        }
      } catch (dbErr) {
        console.error("Firestore username lookup error:", dbErr);
        setError(t.auth.errors.errorCheckingUsername);
        return;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      // App.tsx auth state listener will handle the rest
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t.auth.errors.invalidCredentials);
      } else if (err.code === 'auth/invalid-email') {
        setError(t.auth.errors.invalidEmailFormat);
      } else if (err.code === 'auth/too-many-requests') {
        setError(t.auth.errors.tooManyRequests);
      } else {
        setError(err.message?.replace('Firebase: ', '') || t.auth.errors.loginFailed);
      }
    }
  };

  return (
    <div className="bg-[#F5F0E8] min-h-screen font-sans flex flex-col justify-center items-center text-[#191c22] p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-150">
        <div className="text-center mb-8">
          <h1 
            onClick={onGoHome}
            className="font-display text-2xl font-black uppercase tracking-widest text-[#006a65] cursor-pointer hover:opacity-80 transition-opacity"
          >
            NAGARIKA
          </h1>
          <p className="text-sm text-zinc-500 font-bold mt-2">{t.auth.welcomeBack}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-zinc-600 mb-1">{t.auth.emailOrUsername}</label>
            <input
              id="login-email"
              name="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
              placeholder="your@email.com or username"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-zinc-600 mb-1">{t.auth.passwordLabel}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            {t.auth.login.toUpperCase()}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToSignup}
            className="text-xs font-bold text-zinc-500 hover:text-[#006a65]"
          >
            {t.auth.noAccountSignup}
          </button>
        </div>
      </div>
    </div>
  );
}
