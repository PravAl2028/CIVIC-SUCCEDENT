import React from "react";
import { Rocket, Trophy, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight, Eye, Camera, Brain, Gift } from "lucide-react";
import { UserProfile } from "../../lib/constants";

interface LandingViewProps {
  user: UserProfile | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSignup: () => void;
  onStartMission: () => void;
  onViewLeaderboard: () => void;
}

export default function LandingView({ user, isAuthenticated, onLogin, onSignup, onStartMission, onViewLeaderboard }: LandingViewProps) {
  return (
    <div className="bg-[#F5F0E8] min-h-screen text-[#191c22] font-sans pb-24">
      {/* Top Banner Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white border-b border-[#d2c5ae]/30 shadow-sm">
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-2xl font-black text-[#775a00] tracking-tighter cursor-pointer"
        >
          CIVIC SUCCEDENT
        </div>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 bg-[#ecedf6] px-4 py-1.5 rounded-full border border-[#d2c5ae]/20 shadow-sm">
            <span className="text-xs font-black text-[#775a00] font-mono">{user.xp.toLocaleString()} XP</span>
            <img
              src={user.photoURL}
              alt="user avatar"
              className="w-6 h-6 rounded-full border-2 border-white object-cover"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-xs font-bold text-[#006a65] hover:text-teal-700 transition-colors uppercase tracking-widest"
            >
              Login
            </button>
            <button
              onClick={onSignup}
              className="text-xs font-bold bg-[#006a65] text-white px-4 py-2 rounded-full hover:bg-teal-700 transition-colors shadow-sm uppercase tracking-widest"
            >
              Sign Up
            </button>
          </div>
        )}
      </header>

      {/* Hero Body */}
      <main className="pt-24 px-6 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-[#79f3ea]/20 text-[#006f69] text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
          ⚡ MUNICIPAL REFORM SYSTEM LIVE
        </div>
        
        <h1 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-5xl md:text-7xl font-black text-zinc-900 tracking-tight leading-none uppercase cursor-pointer"
        >
          CIVIC SUCCEDENT
        </h1>
        
        <p className="mt-6 text-base md:text-xl text-[#4e4635] max-w-xl mx-auto leading-relaxed">
          Turn your daily walk into a civic mission. Scan, report, and autonomously dispatch government action for city infrastructure while earning real local rewards.
        </p>

        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center max-w-md px-4 sm:px-0">
            <button
              onClick={onStartMission}
              className="w-full sm:w-auto sm:flex-1 bg-[#f0c040] hover:bg-yellow-350 text-[#251a00] font-bold text-sm h-14 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#775a00]/10 hover:scale-103 active:scale-97 transition-all cursor-pointer"
            >
              Start Mission
              <Rocket className="w-4 h-4 text-black" style={{ fill: "currentColor" }} />
            </button>
            <button
              onClick={onViewLeaderboard}
              className="w-full sm:w-auto sm:flex-1 border-2 border-[#006a65] hover:bg-[#006a65]/5 text-[#006a65] font-bold text-sm h-14 rounded-2xl flex items-center justify-center gap-2 hover:scale-103 active:scale-97 transition-all cursor-pointer"
            >
              View Leaderboard
              <Trophy className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center max-w-md px-4 sm:px-0">
            <button
              onClick={onLogin}
              className="w-full sm:w-auto sm:flex-1 bg-[#006a65] hover:bg-teal-700 text-white font-black text-sm h-14 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:scale-103 active:scale-97 transition-all cursor-pointer uppercase tracking-widest"
            >
              Login
            </button>
            <button
              onClick={onSignup}
              className="w-full sm:w-auto sm:flex-1 border-2 border-[#006a65] bg-white text-[#006a65] hover:bg-zinc-50 font-black text-sm h-14 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:scale-103 active:scale-97 transition-all cursor-pointer uppercase tracking-widest"
            >
              Sign Up
            </button>
          </div>
        )}



        {/* Feature Bento Section */}
        <section className="w-full mt-16 text-left space-y-6">
          <h2 className="font-display text-2xl font-black uppercase text-zinc-900 border-b-2 border-zinc-200 pb-2">
            HOW IT WORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Block 1: Precision */}
            <div className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/30 shadow-sm flex flex-col justify-between md:col-span-2 relative overflow-hidden min-h-[220px]">
              <div>
                <span className="bg-amber-100 text-[#775a00] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  CITIZEN FIRST
                </span>
                <h3 className="font-display text-xl font-bold mt-4 text-zinc-900">Scan Road Damage</h3>
                <p className="text-sm text-[#4e4635] mt-2 max-w-md">
                  Point your mobile lens at any civic defect. Our server-side Gemini Scanner Agent automatically calculates severity, estimated repairs, and prevents fraud.
                </p>
              </div>
              <div className="mt-4">
                <span className="text-xs font-bold text-[#006a65] inline-flex items-center gap-1 hover:underline cursor-pointer">
                  Learn about AR tools <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Bento Block 2: Stats */}
            <div className="bg-[#ffdf97] rounded-3xl p-6 border border-[#d2c5ae]/30 shadow-sm flex flex-col justify-center items-center text-center text-[#251a00] min-h-[220px]">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#775a00] shadow-sm mb-4">
                <ShieldCheck className="w-6 h-6" style={{ fill: "currentColor" }} />
              </div>
              <h3 className="font-display text-4xl font-black">14.2k</h3>
              <p className="text-[10px] uppercase font-black tracking-wider opacity-80 mt-1">ISSUES FIXED</p>
              <div className="w-full bg-[#775a00]/15 h-2 rounded-full overflow-hidden mt-4">
                <div className="bg-[#775a00] h-full w-[85%]" />
              </div>
              <p className="text-[10px] italic opacity-75 mt-2">Weekly community goal: 85% reached</p>
            </div>

            {/* Bento Block 3: Scan */}
            <div className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/30 border-l-4 border-[#f0c040] shadow-sm flex flex-col gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#775a00]">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">1. Capture Evidence</h3>
                <p className="text-xs text-[#4e4635] mt-1">
                  Spot potholes, water leaks, or flickering streetlights. Snap a real-time photo to file.
                </p>
              </div>
            </div>

            {/* Bento Block 4: Verify */}
            <div className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/30 border-l-4 border-teal-500 shadow-sm flex flex-col gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#006a65]">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">2. AI Verifies & Dispatch</h3>
                <p className="text-xs text-[#4e4635] mt-1">
                  Gemini analyzes and cross-references. At 3+ community approvals, the Dispatcher Agent builds and logs formal letters.
                </p>
              </div>
            </div>

            {/* Bento Block 5: Rewards */}
            <div className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/30 border-l-4 border-red-500 shadow-sm flex flex-col gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-red-500">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">3. Scratch and Claim</h3>
                <p className="text-xs text-[#4e4635] mt-1">
                  Once issues are verified or fixed, scratch off dynamic coupons for local cafes or municipal tax credits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Mission Suite Section */}
        <section className="w-full mt-16 text-left space-y-6">
          <h2 className="font-display text-2xl font-black uppercase text-zinc-900 border-b-2 border-zinc-200 pb-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#006a65] rounded-full" />
            ADVANCED MISSION SUITE
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Safe Navigation Maps Block */}
            <div className="bg-[#e6f4f2] rounded-3xl p-6 border border-[#006a65]/20 shadow-sm flex flex-col justify-between min-h-[220px] transition-all hover:shadow-md group cursor-pointer hover:border-[#006a65]/40" onClick={isAuthenticated ? onStartMission : onSignup}>
              <div>
                <span className="bg-[#006a65] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Live Navigation
                </span>
                <h3 className="font-display text-xl font-bold mt-4 text-zinc-900 flex items-center gap-2">
                  Safe Navigation Maps
                  <ArrowRight className="w-4 h-4 text-[#006a65] transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="text-xs text-[#4e4635] mt-2 leading-relaxed">
                  Plan bypass routes dynamically. Our system uses real-time OSRM calculations to design routes that automatically steer you away from active potholes, waterlogging, and dark zones with full audio guidance.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-[#006a65] uppercase tracking-wider font-mono">
                <span>⚡ Active Detour Engine</span>
              </div>
            </div>

            {/* Community & Leaderboard Block */}
            <div className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/30 shadow-sm flex flex-col justify-between min-h-[220px] transition-all hover:shadow-md group cursor-pointer" onClick={isAuthenticated ? onViewLeaderboard : onSignup}>
              <div>
                <span className="bg-[#775a00]/10 text-[#775a00] text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Social Hub
                </span>
                <h3 className="font-display text-xl font-bold mt-4 text-zinc-900 flex items-center gap-2">
                  Scout Community & Leaderboard
                  <ArrowRight className="w-4 h-4 text-[#775a00] transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="text-xs text-[#4e4635] mt-2 leading-relaxed">
                  Join the local neighborhood chat monitored by our AI Moderator Agent. View the real-time leaderboard of municipal scouts, compete for top ranks, and claim victory cards.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-[#775a00] uppercase tracking-wider font-mono">
                <span>🏆 RANK & CONNECT</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="w-full mt-16 bg-zinc-900 text-white rounded-3xl p-8 relative overflow-hidden text-center flex flex-col items-center justify-center">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <Trophy className="w-64 h-64" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
            CLAIM YOUR TERRITORY
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 max-w-sm mt-2 leading-relaxed">
            Join thousands of active citizens mapping the future of our urban environment. Your neighborhood is waiting.
          </p>
          {isAuthenticated ? (
            <button
              onClick={onStartMission}
              className="mt-6 bg-[#f0c040] text-black font-bold text-xs px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              Start Mission
            </button>
          ) : (
            <button
              onClick={onSignup}
              className="mt-6 bg-[#f0c040] text-black font-bold text-xs px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              Join the Movement
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
