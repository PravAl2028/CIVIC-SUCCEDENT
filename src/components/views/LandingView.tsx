import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, Trophy, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight, Eye, Camera, Brain, Gift,
  Coins, Hammer, Compass, Sparkles, Users, Wrench, CheckCircle2, BookOpen, Map, Shield, Landmark, Play, Check, Info,
  MessageSquare, Send, Award, Cpu, ShieldAlert, Heart, X
} from "lucide-react";
import { UserProfile } from "../../lib/constants";
import mapBg from "../../assets/map_bg.jpg";

interface LandingViewProps {
  user: UserProfile | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSignup: () => void;
  onStartMission: () => void;
  onViewProfile: () => void;
  onViewLeaderboard: () => void;
  onViewMaps: () => void;
}

export default function LandingView({ 
  user, 
  isAuthenticated, 
  onLogin, 
  onSignup, 
  onStartMission, 
  onViewProfile, 
  onViewLeaderboard, 
  onViewMaps 
}: LandingViewProps) {
  // Game Playbook state
  const [activeTab, setActiveTab] = React.useState<"patrol" | "appraisal" | "safemaps" | "empire" | "community" | "scratch">("patrol");
  
  // Scratch Card state simulator
  const [scratched, setScratched] = React.useState(false);
  const [currentScratchPrize, setCurrentScratchPrize] = React.useState("Simulated Cafe Coffee (In-Game Reward)");
  const scratchPrizes = [
    "Simulated Cafe Coffee (In-Game Reward)", 
    "Virtual Transit Pass (In-Game Only)", 
    "15% Off Mock Transit Coupon (Game Fun Only)", 
    "Gold Municipal Scout Avatar Frame"
  ];

  // HQ Compound Simulator state
  const [hqBaseLevel, setHqBaseLevel] = React.useState(1);
  const [hqSolarLevel, setHqSolarLevel] = React.useState(0);
  const [hqDepotLevel, setHqDepotLevel] = React.useState(0);

  const handleScratch = () => {
    setScratched(true);
  };

  const resetScratch = () => {
    setScratched(false);
    const nextPrize = scratchPrizes[Math.floor(Math.random() * scratchPrizes.length)];
    setCurrentScratchPrize(nextPrize);
  };

  const tabData = {
    patrol: {
      title: "Patrol & Detect",
      subtitle: "Discovery Mode",
      icon: Compass,
      color: "bg-teal-50 text-teal-800 border-teal-200",
      accent: "#006a65",
      badge: "STAGE 1: SCOUTING",
      description: "Explore your neighborhood. Spot street hazards like potholes, leaks, or broken lights, and snap a photo to log them.",
      mechanics: [
        { label: "Audit Scan Radius", value: "30-meter proximity lock" },
        { label: "Scout XP Reward", value: "+50 Base XP per report" }
      ],
      proTip: "Keep Patrol Mode active during walks to receive alert sweeps for nearby unverified issues."
    },
    appraisal: {
      title: "AI Appraisal",
      subtitle: "Gemini Validation",
      icon: Brain,
      color: "bg-purple-50 text-purple-800 border-purple-200",
      accent: "#7c3aed",
      badge: "STAGE 2: AI REVIEW",
      description: "Our server-side Gemini AI instantly audits your photo, verifies authenticity, scores severity from 1 to 10, and flags duplicates.",
      mechanics: [
        { label: "Severity Scoring", value: "Real-time 1 to 10 scale" },
        { label: "Consensus Required", value: "3 neighborhood approval votes" }
      ],
      proTip: "Clear daylight snapshots help the AI process severity ratings faster."
    },
    safemaps: {
      title: "Safe Maps",
      subtitle: "Bypass Routing",
      icon: Map,
      color: "bg-cyan-50 text-cyan-800 border-cyan-200",
      accent: "#0891b2",
      badge: "STAGE 3: LIVE NAVIGATION",
      description: "View approved safety maps. The OSRM engine plans walking routes that bypass waterlogged pathways, dark zones, and open potholes.",
      mechanics: [
        { label: "Routing Engine", value: "Live OSRM transit system" },
        { label: "Avoidance Zones", value: "Auto-routes around active defects" }
      ],
      proTip: "Toggling detour mode helps ensure a safe, smooth walk for kids and seniors."
    },
    empire: {
      title: "HQ Compound",
      subtitle: "Passive Earnings",
      icon: Landmark,
      color: "bg-amber-50 text-amber-800 border-amber-200",
      accent: "#d97706",
      badge: "STAGE 4: EMPIRE BUILDING",
      description: "Build and upgrade your Scout Headquarters. Each level of your Base Cabin, Solar Grid, and Repair Depot increases passive coin earnings over time.",
      mechanics: [
        { label: "Base Yield Formula", value: "Level-based coins per hour" },
        { label: "Upgrade Cost Pool", value: "Simulated sandbox (no real cost)" }
      ],
      proTip: "Higher depot levels unlock bigger passive yields — upgrade strategically to maximize your hourly income."
    },
    community: {
      title: "Community Lounge",
      subtitle: "Moderated Chat & Heroes",
      icon: Users,
      color: "bg-indigo-50 text-indigo-800 border-indigo-200",
      accent: "#4f46e5",
      badge: "STAGE 5: COLLABORATION",
      description: "Connect with nearby scouts inside our AI-moderated Community Chat. Share real-time hazard updates, broadcast automated verification logs to the lounge, and climb the Hero Leaderboard.",
      mechanics: [
        { label: "AI Moderation Guard", value: "Real-time ethical filter (3-strike limit)" },
        { label: "Consensus Threshold", value: "2+ verifications triggers complaint letter dispatch" }
      ],
      proTip: "Verifying reported hazards on the map automatically broadcasts activity updates to the lounge and earns you XP and Coins!"
    },
    scratch: {
      title: "Scratch Cards",
      subtitle: "Simulated Rewards",
      icon: Sparkles,
      color: "bg-rose-50 text-rose-800 border-rose-200",
      accent: "#e11d48",
      badge: "STAGE 6: GAME REWARDS",
      description: "Spend your earned Civic Coins on digital scratch cards. Rub off the virtual foil to reveal mock coupons, discount codes, and decorative badges.",
      mechanics: [
        { label: "Scratch Ticket Cost", value: "50 Civic Coins per draw" },
        { label: "Rewards Nature", value: "100% simulated, in-game fun only" }
      ],
      proTip: "Headquarters passive coin earnings collect offline to fund weekly ticket draws."
    }
  };

  return (
    <div className="bg-[#F5F0E8] min-h-screen text-[#191c22] font-sans pb-24 relative overflow-hidden">
      {/* Decorative Warm Accent Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#f0c040]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#006a65]/5 blur-[150px] pointer-events-none" />

      {/* Top Banner Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 sm:px-6 h-16 bg-white/85 backdrop-blur-md border-b border-[#d2c5ae]/30 shadow-sm">
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-[13px] xs:text-base sm:text-2xl font-black text-[#775a00] tracking-tighter cursor-pointer whitespace-nowrap flex-shrink-0 mr-2 sm:mr-4 flex items-center gap-1.5 sm:gap-2"
        >
          <div className="w-5.5 h-5.5 xs:w-8 xs:h-8 rounded-lg bg-[#f0c040] flex items-center justify-center text-zinc-950 font-black text-[11px] xs:text-lg shadow-sm">
            C
          </div>
          <span>CIVIC SUCCEDENT</span>
        </div>
        {isAuthenticated && user ? (
          <button
            onClick={onViewProfile}
            className="flex items-center gap-1.5 sm:gap-3 bg-[#ecedf6] px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full border border-[#d2c5ae]/20 shadow-sm transition-all duration-75 min-w-0 cursor-pointer hover:scale-105 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex flex-col items-end leading-none min-w-0">
              <span className="text-[10px] sm:text-xs font-extrabold text-zinc-900 tracking-tight block truncate max-w-[60px] sm:max-w-[150px]">
                {user.displayName || (user as any).username || "Scout"}
              </span>
              <span className="text-[8px] sm:text-[9px] font-black text-[#775a00] font-mono mt-0.5 whitespace-nowrap">
                {user.xp.toLocaleString()} XP
              </span>
            </div>
            <img
              src={user.photoURL}
              alt="user avatar"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white object-cover shadow-inner flex-shrink-0"
            />
          </button>
        ) : (
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onLogin}
              className="text-[10px] sm:text-xs font-bold text-[#006a65] cursor-pointer uppercase tracking-widest transition-all duration-75 hover:scale-110 hover:text-[#004d49] active:scale-95 px-2 py-1"
            >
              Login
            </button>
            <button
              onClick={onSignup}
              className="text-[10px] sm:text-xs font-bold bg-[#006a65] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full cursor-pointer shadow-sm uppercase tracking-widest transition-all duration-75 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md hover:bg-[#005551] active:scale-95"
            >
              Sign Up
            </button>
          </div>
        )}
      </header>

      {/* Hero Section with Map Background (Image Part - NOT touched!) */}
      <section 
        className="relative w-full pt-32 pb-20 px-6 bg-cover bg-center border-b border-[#d2c5ae]/30 overflow-hidden flex justify-center"
        style={{ backgroundImage: `url(${mapBg})` }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px]" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block px-3 py-1 rounded-full bg-[#79f3ea]/20 text-[#006f69] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-5 animate-pulse"
          >
            ⚡ MUNICIPAL REFORM SYSTEM LIVE
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="font-display text-3xl xs:text-5xl sm:text-6xl md:text-8xl font-black text-zinc-900 tracking-tighter leading-none uppercase cursor-pointer"
          >
            CIVIC SUCCEDENT
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-[#4e4635] max-w-2xl mx-auto leading-relaxed font-black"
          >
            Turn your daily walk into a civic mission. Scan, report, and autonomously dispatch government action for city infrastructure while earning real local rewards.
          </motion.p>

          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 w-full justify-center max-w-md px-2 sm:px-0">
              <button
                onClick={onStartMission}
                className="w-full sm:w-auto sm:flex-1 bg-[#f0c040] text-[#251a00] font-black text-xs uppercase tracking-widest h-12 sm:h-14 rounded-3xl flex items-center justify-center gap-2 shadow-md cursor-pointer border border-[#f0c040] transition-all duration-75 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-105 active:scale-95 active:translate-y-0"
              >
                <span>Start Mission</span>
                <Rocket className="w-4 h-4 text-black" style={{ fill: "currentColor" }} />
              </button>
              
              <button
                onClick={onViewLeaderboard}
                className="w-full sm:w-auto sm:flex-1 border-2 border-[#006a65] bg-white text-[#006a65] font-black text-xs uppercase tracking-widest h-12 sm:h-14 rounded-3xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all duration-75 hover:scale-105 hover:-translate-y-0.5 hover:bg-[#006a65]/10 hover:border-[#005551] hover:shadow-md active:scale-95 active:translate-y-0"
              >
                <span>View Leaderboard</span>
                <Trophy className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 w-full justify-center max-w-md px-2 sm:px-0">
              <button
                onClick={onLogin}
                className="w-full sm:w-auto sm:flex-1 bg-[#006a65] text-white font-black text-xs uppercase tracking-widest h-12 sm:h-14 rounded-3xl flex items-center justify-center gap-2 shadow-md cursor-pointer border border-teal-800 transition-all duration-75 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#005551] active:scale-95 active:translate-y-0"
              >
                Login
              </button>
              <button
                onClick={onSignup}
                className="w-full sm:w-auto sm:flex-1 border-2 border-[#006a65] bg-white text-[#006a65] font-black text-xs uppercase tracking-widest h-12 sm:h-14 rounded-3xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all duration-75 hover:scale-105 hover:-translate-y-0.5 hover:bg-[#006a65]/5 hover:border-[#005551] hover:shadow-md active:scale-95 active:translate-y-0"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Body */}
      <main className="px-4 sm:px-6 max-w-5xl mx-auto flex flex-col items-center justify-center text-center mt-12">
        {/* Feature Bento Section */}
        <section className="w-full mt-12 text-left space-y-4 sm:space-y-6">
          <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-zinc-900 border-b-2 border-zinc-200 pb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#006a65]" />
            CORE APPLICATION FEATURES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Bento Block 1: Precision */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d2c5ae]/30 shadow-sm flex flex-col justify-between md:col-span-2 relative overflow-hidden min-h-[160px] sm:min-h-[200px] transition-all duration-75 hover:scale-[1.01] hover:shadow-lg"
            >
              <div>
                <span className="bg-teal-50 text-[#006a65] border border-teal-200 text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider">
                  CITIZEN FIRST CAPABILITIES
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold mt-3 sm:mt-4 text-zinc-900">Gemini Camera Inspector</h3>
                <p className="text-xs sm:text-sm text-[#4e4635] mt-1.5 sm:mt-2 max-w-md leading-relaxed">
                  Snap photos of street hazards inside our scanner. Our server-side Gemini AI instantly processes the image, verifies authenticity, and scores defect severity.
                </p>
              </div>
            </div>

            {/* Bento Block 2: Stats */}
            <div className="bg-[#ffdf97] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d2c5ae]/30 shadow-sm flex flex-col justify-center items-center text-center text-[#251a00] min-h-[160px] sm:min-h-[200px] transition-all duration-75 hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center text-[#775a00] shadow-sm mb-3 sm:mb-4">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" style={{ fill: "currentColor" }} />
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-black">14,295</h3>
              <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider opacity-80 mt-0.5">ISSUES DISPATCHED</p>
              <div className="w-full bg-[#775a00]/15 h-1.5 sm:h-2 rounded-full overflow-hidden mt-3 sm:mt-4">
                <div className="bg-[#775a00] h-full w-[85%]" />
              </div>
              <p className="text-[9px] sm:text-[10px] italic opacity-75 mt-1.5 sm:mt-2">Weekly community cleanup goals: 85% reached</p>
            </div>

            {/* Bento Block 3: Scan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d2c5ae]/30 border-l-4 border-[#f0c040] shadow-sm flex flex-col gap-3 sm:gap-4 transition-all duration-75 hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#775a00]">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900">1. Spot and Snapshot</h3>
                <p className="text-xs text-[#4e4635] mt-1 leading-relaxed">
                  Spot a pothole, leak, or broken streetlight? Take a quick picture using our scan module.
                </p>
              </div>
            </div>

            {/* Bento Block 4: Verify */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d2c5ae]/30 border-l-4 border-teal-500 shadow-sm flex flex-col gap-3 sm:gap-4 transition-all duration-75 hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#006a65]">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900">2. AI Appraisal & Severity</h3>
                <p className="text-xs text-[#4e4635] mt-1 leading-relaxed">
                  Gemini AI instantly scores defect severity. Community votes publish it onto public safety maps.
                </p>
              </div>
            </div>

            {/* Bento Block 5: Rewards */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d2c5ae]/30 border-l-4 border-rose-500 shadow-sm flex flex-col gap-3 sm:gap-4 transition-all duration-75 hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#fff1f2] rounded-xl flex items-center justify-center text-rose-500">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900">3. Scratch Card Vouchers</h3>
                <p className="text-xs text-[#4e4635] mt-1 leading-relaxed">
                  Spend your Civic Coins on simulated scratch cards to uncover in-game coupons and profile badges.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE GAMEPLAY GUIDE (CIVIC PLAYBOOK) */}
        <section className="w-full mt-16 text-left space-y-4 sm:space-y-6 text-[#191c22]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-zinc-200 pb-2 gap-3 sm:gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-zinc-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#006a65]" />
                THE SCOUT'S GAMEPLAY PLAYBOOK
              </h2>
              <p className="text-xs text-[#4e4635] mt-1 leading-none">
                Interactive walkthrough of core game loop, passive earnings, and scratchcard simulators.
              </p>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-black text-white bg-zinc-900 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm self-start md:self-auto">
              🎮 CIVIC INSTRUCTIONS
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start w-full">
            {/* Playbook Navigation Tabs */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2.5 overflow-x-auto pb-3 lg:pb-0 scrollbar-none snap-x snap-mandatory px-4 -mx-4 lg:px-0 lg:mx-0 justify-start sm:justify-center lg:justify-start">
              {(Object.keys(tabData) as Array<keyof typeof tabData>).map((key) => {
                const item = tabData[key];
                const IconComponent = item.icon;
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={(e) => {
                      setActiveTab(key);
                      const container = e.currentTarget.parentElement;
                      if (container) {
                        const element = e.currentTarget;
                        const containerWidth = container.clientWidth;
                        const scrollLeft = element.offsetLeft - (containerWidth / 2) + (element.clientWidth / 2);
                        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
                      }
                    }}
                    className={`flex-shrink-0 snap-center flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-75 cursor-pointer w-[155px] sm:w-48 lg:w-full hover:scale-[1.02] active:scale-[0.98] ${
                      isActive 
                        ? "bg-white border-[#006a65] shadow-md text-zinc-900 ring-2 ring-[#006a65]/5" 
                        : "bg-[#F0E9DC]/60 border-[#d2c5ae]/40 text-zinc-700 hover:bg-[#F0E9DC]"
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? "bg-[#006a65] text-white" : "bg-zinc-200 text-zinc-600"
                    }`}>
                      <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="leading-tight min-w-0">
                      <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-tight block truncate">
                        {item.title}
                      </h4>
                      <span className="text-[8px] sm:text-[9px] text-[#4e4635]/80 font-mono block truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Playbook Content Display Area */}
            <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-[#d2c5ae]/30 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[320px] sm:min-h-[360px] w-full">
              {/* Detailed Explanation Column */}
              <div className="p-4 sm:p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <span className={`inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border mb-2.5 ${tabData[activeTab].color}`}>
                    {tabData[activeTab].badge}
                  </span>
                  
                  <h3 className="font-display text-xl sm:text-2xl font-black text-zinc-900 tracking-tight leading-none uppercase">
                    {tabData[activeTab].title}
                  </h3>
                  <span className="text-[10px] sm:text-xs text-[#006a65] font-black uppercase tracking-widest font-mono block mt-1">
                    {tabData[activeTab].subtitle}
                  </span>
                  
                  <p className="text-xs text-[#4e4635] mt-3 sm:mt-4 leading-relaxed">
                    {tabData[activeTab].description}
                  </p>

                  {/* Core Mechanics Stats */}
                  <div className="mt-4 sm:mt-5 space-y-2">
                    <h5 className="text-[9px] sm:text-[10px] font-black text-zinc-800 uppercase tracking-wider font-mono">
                      ⚙️ CORE MECHANICS:
                    </h5>
                    <div className="grid grid-cols-1 gap-2">
                      {tabData[activeTab].mechanics.map((m, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] bg-[#F5F0E8]/50 p-2 sm:p-2.5 rounded-xl border border-[#d2c5ae]/15 gap-1.5">
                          <span className="text-[#4e4635] font-bold text-xs sm:text-[11px]">{m.label}</span>
                          <span className="text-zinc-900 font-black font-mono bg-white px-2 py-1 sm:py-0.5 rounded border border-[#d2c5ae]/20 text-xs sm:text-[11px] break-words text-left sm:text-right w-full sm:w-auto">
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pro Tip Box */}
                <div className="mt-5 sm:mt-6 bg-[#ffdf97]/20 border border-[#ffdf97]/50 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 flex gap-2 sm:gap-2.5 items-start">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] sm:text-[10px] text-amber-900 leading-normal">
                    <strong className="font-bold uppercase tracking-wider">SCOUT TIP:</strong> {tabData[activeTab].proTip}
                  </p>
                </div>
              </div>

              {/* Dynamic Game Mockup Simulator Column */}
              <div className="w-full md:w-80 bg-zinc-50 border-t md:border-t-0 md:border-l border-[#d2c5ae]/30 p-6 flex flex-col justify-center items-center relative overflow-hidden shrink-0">
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-900/5 text-zinc-600 px-2 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SIMULATOR PREVIEW
                </div>

                {/* Tab specific game simulation views */}
                {activeTab === "patrol" && (
                  <div className="relative w-full h-48 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-center overflow-hidden shadow-md">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,106,101,0.15)_0%,transparent_70%)] animate-pulse" />
                    <div className="absolute w-36 h-36 border border-[#006a65]/30 rounded-full flex items-center justify-center">
                      <div className="absolute w-24 h-24 border border-[#006a65]/40 rounded-full flex items-center justify-center">
                        <div className="absolute w-12 h-12 border border-[#006a65]/50 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-[#006a65] rounded-full animate-ping" />
                        </div>
                      </div>
                      <motion.div 
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute top-6 left-12 flex flex-col items-center gap-0.5"
                      >
                        <div className="w-2.5 h-2.5 bg-[#f0c040] rounded-full shadow-lg shadow-[#f0c040]/50" />
                        <span className="text-[7px] font-mono text-[#f0c040] bg-black/80 px-1 rounded">POTHOLE (20m)</span>
                      </motion.div>
                      <motion.div 
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                        className="absolute bottom-4 right-10 flex flex-col items-center gap-0.5"
                      >
                        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                        <span className="text-[7px] font-mono text-cyan-400 bg-black/80 px-1 rounded">LEAK (45m)</span>
                      </motion.div>
                    </div>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
                      className="absolute w-full h-0.5 bg-gradient-to-r from-[#006a65] to-transparent origin-center"
                    />
                    <span className="absolute bottom-2 left-3 text-[9px] font-mono text-[#006a65] flex items-center gap-1">
                      <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} /> RADAR ACTIVE
                    </span>
                  </div>
                )}

                {activeTab === "appraisal" && (
                  <div className="w-full bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-left font-mono text-[10px] leading-relaxed shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
                      <span className="text-purple-400 font-bold flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5 animate-bounce" /> GEMINI DISPATCH
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider animate-pulse">
                        AUDIT COMPLETED
                      </span>
                    </div>
                    <div className="space-y-2 text-zinc-300">
                      <div><span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Reported Defect:</span> <span className="text-white font-bold block text-xs">Pothole (Class-A Heavy)</span></div>
                      <div><span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Coordinates:</span> <span className="text-zinc-400 block font-mono text-xs">37.7749° N, 122.4194° W</span></div>
                      
                      <div className="pt-2 border-t border-zinc-800/80">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block mb-1">Severity Assessment:</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500 text-white px-2 py-0.5 rounded font-black text-xs font-mono">
                            8.5 / 10
                          </span>
                          <span className="text-[9px] text-zinc-400 italic">Highly hazardous road surface</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "safemaps" && (
                  <div className="relative w-full h-48 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col justify-between p-3 overflow-hidden shadow-md">
                    <div className="flex justify-between items-center border-b border-zinc-850 pb-1 text-[9px] font-mono">
                      <span className="text-cyan-400 font-bold flex items-center gap-1"><Map className="w-3 h-3" /> BYPASS PATH</span>
                      <span className="text-zinc-500">OSRM ROUTE ACTIVE</span>
                    </div>
                    <div className="flex-1 relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px]" />
                      
                      <svg className="w-full h-24 absolute inset-0 text-cyan-400 stroke-current fill-none" strokeWidth="2" strokeDasharray="3 3">
                        <path d="M 10 50 Q 80 15 130 50 T 250 30" className="animate-pulse" />
                      </svg>
                      
                      <div className="absolute left-[110px] top-[40px] flex flex-col items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center animate-ping absolute" />
                        <div className="w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-lg">!</div>
                        <span className="text-[7px] font-mono text-red-400 mt-1 bg-black/80 px-1 rounded whitespace-nowrap">POTHOLE AVOIDED</span>
                      </div>

                      <div className="absolute left-[30px] top-[30px]">
                        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                      </div>
                    </div>
                    <div className="text-[8px] font-mono text-zinc-500 text-center uppercase tracking-wider">
                      🗺️ Detour calculated around 1 danger zone
                    </div>
                  </div>
                )}

                {activeTab === "empire" && (
                  <div className="w-full bg-zinc-950 rounded-2xl p-3 border border-zinc-800 text-left relative overflow-hidden shadow-lg text-[9px] font-sans flex flex-col gap-2">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5 shrink-0">
                      <span className="text-amber-400 font-black font-mono flex items-center gap-1 uppercase tracking-wider"><Landmark className="w-3 h-3" /> HQ Compound Simulator</span>
                      <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-mono text-[7px] uppercase tracking-wider animate-pulse">Live Yield calculator</span>
                    </div>

                    {/* Passive Earnings HUD */}
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 flex items-center justify-between">
                      <div>
                        <span className="text-zinc-500 text-[7px] uppercase font-mono block leading-none mb-1">Simulated Base Yield</span>
                        <span className="text-xs sm:text-sm font-black text-white font-mono flex items-center gap-1 leading-none">
                          +{(hqBaseLevel === 1 ? 5 : hqBaseLevel === 2 ? 20 : 75) + 
                            (hqSolarLevel === 1 ? 10 : hqSolarLevel === 2 ? 25 : hqSolarLevel === 3 ? 60 : 0) + 
                            (hqDepotLevel === 1 ? 25 : hqDepotLevel === 2 ? 65 : hqDepotLevel === 3 ? 150 : 0)}
                          <span className="text-amber-400 text-[8px] sm:text-[9px] font-black uppercase">Coins / hr</span>
                        </span>
                      </div>
                      <div className="text-right leading-none">
                        <span className="text-zinc-500 text-[7px] uppercase font-mono block mb-1">Upgrade Cost Pool</span>
                        <span className="text-[9px] font-black text-[#f0c040]">Simulated Sandbox</span>
                      </div>
                    </div>

                    {/* Interactive Upgrade Buttons */}
                    <div className="space-y-1.5">
                      {/* 1. Core Base Cabin */}
                      <div className="flex items-center justify-between bg-zinc-900/30 p-1.5 rounded-lg border border-zinc-800/40">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-amber-500/10 rounded flex items-center justify-center text-amber-500">
                            <Landmark className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="text-zinc-300 font-bold block leading-none">Central Base Cabin</span>
                            <span className="text-[7px] text-zinc-500 font-mono">Level {hqBaseLevel} / 3</span>
                          </div>
                        </div>
                        {hqBaseLevel < 3 ? (
                          <button 
                            onClick={() => setHqBaseLevel(prev => prev + 1)}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-black px-2 py-1 rounded text-[7px] uppercase tracking-wider cursor-pointer border-none"
                          >
                            Upgrade
                          </button>
                        ) : (
                          <span className="text-[7px] font-mono text-amber-400 font-black uppercase bg-amber-500/10 px-1 rounded">MAX</span>
                        )}
                      </div>

                      {/* 2. Solar Grid Annex */}
                      <div className="flex items-center justify-between bg-zinc-900/30 p-1.5 rounded-lg border border-zinc-800/40">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-orange-500/10 rounded flex items-center justify-center text-orange-400">
                            <Cpu className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="text-zinc-300 font-bold block leading-none">Solar Grid Array</span>
                            <span className="text-[7px] text-zinc-500 font-mono">Level {hqSolarLevel} / 3</span>
                          </div>
                        </div>
                        {hqSolarLevel < 3 ? (
                          <button 
                            onClick={() => setHqSolarLevel(prev => prev + 1)}
                            className="bg-orange-500 hover:bg-orange-400 text-black font-black px-2 py-1 rounded text-[7px] uppercase tracking-wider cursor-pointer border-none"
                          >
                            Build
                          </button>
                        ) : (
                          <span className="text-[7px] font-mono text-orange-400 font-black uppercase bg-orange-500/10 px-1 rounded">MAX</span>
                        )}
                      </div>

                      {/* 3. Repair Depot Annex */}
                      <div className="flex items-center justify-between bg-zinc-900/30 p-1.5 rounded-lg border border-zinc-800/40">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-400">
                            <Wrench className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="text-zinc-300 font-bold block leading-none">Repair Depot Wing</span>
                            <span className="text-[7px] text-zinc-500 font-mono">Level {hqDepotLevel} / 3</span>
                          </div>
                        </div>
                        {hqDepotLevel < 3 ? (
                          <button 
                            onClick={() => setHqDepotLevel(prev => prev + 1)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-2 py-1 rounded text-[7px] uppercase tracking-wider cursor-pointer border-none"
                          >
                            Build
                          </button>
                        ) : (
                          <span className="text-[7px] font-mono text-emerald-400 font-black uppercase bg-emerald-500/10 px-1 rounded">MAX</span>
                        )}
                      </div>
                    </div>

                    {/* Reset Simulation button */}
                    <div className="border-t border-zinc-900 pt-1.5 mt-0.5 flex items-center justify-between text-[7.5px] font-mono text-zinc-500 uppercase">
                      <span>🕹️ click buttons to test yield compounding</span>
                      <button 
                        onClick={() => {
                          setHqBaseLevel(1);
                          setHqSolarLevel(0);
                          setHqDepotLevel(0);
                        }}
                        className="text-zinc-400 hover:text-white font-bold tracking-wider underline bg-transparent border-none cursor-pointer text-[7px]"
                      >
                        Reset Demo
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "community" && (
                  <div className="w-full bg-zinc-950 rounded-2xl p-3 border border-zinc-800 text-left relative overflow-hidden shadow-lg text-[9px] font-sans flex flex-col gap-2.5">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5 shrink-0">
                      <span className="text-indigo-400 font-black font-mono flex items-center gap-1 uppercase tracking-wider"><Users className="w-3 h-3" /> Scout Lounge</span>
                      <span className="bg-indigo-500/10 text-indigo-400 px-1 rounded font-mono text-[7px]">3 ONLINE</span>
                    </div>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-0.5">
                      <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/50">
                        <div className="flex justify-between font-bold text-zinc-300">
                          <span className="text-zinc-200">Scout_Sarah</span>
                          <span className="text-zinc-500 font-mono text-[7px]">10:45 AM</span>
                        </div>
                        <p className="text-zinc-400 mt-0.5 leading-tight">Found a deep water pipe leak near Main Road. Be careful, the road is slipping!</p>
                      </div>

                      <div className="bg-teal-950/20 p-2 rounded border border-teal-900/30">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-teal-400">Scout_David</span>
                          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.2 rounded font-black text-[6px] uppercase tracking-wider">🔍 Citizen</span>
                        </div>
                        <p className="text-zinc-300 mt-1 font-medium leading-tight">🔍 I have verified the damage report near Main Road!</p>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[7px] text-teal-400 font-black uppercase tracking-wider bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                          🗺️ Tap to view on map
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-1.5 mt-0.5 shrink-0 flex items-center justify-between text-[8px] font-mono text-zinc-500 uppercase">
                      <span>🏆 LEADERBOARD POSITION: #4</span>
                      <span className="text-[#f0c040] font-black">1,420 XP</span>
                    </div>
                  </div>
                )}

                {activeTab === "scratch" && (
                  <div className="w-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-2xl p-4 border border-[#d2c5ae]/30 flex flex-col items-center justify-center min-h-[180px] text-center relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {!scratched ? (
                        <motion.div 
                          key="foil"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="w-full h-full flex flex-col items-center justify-center p-1"
                        >
                          <div className="w-10 h-10 bg-zinc-950 text-[#f0c040] rounded-full flex items-center justify-center shadow-lg border border-[#f0c040]/30 mb-2 animate-bounce">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest leading-none">GAME SCRATCH CARD</h4>
                          <p className="text-[8px] text-[#4e4635] mt-1 max-w-[200px] leading-tight font-sans">
                            Simulate scratching the card below to reveal your exciting mock coupon!
                          </p>
                          
                          <motion.div
                            whileHover={{ scale: 1.04, rotate: [0, -1, 1, 0] }}
                            transition={{ duration: 0.2 }}
                            onClick={handleScratch}
                            className="w-full mt-3 bg-gradient-to-r from-zinc-400 via-zinc-300 to-zinc-400 h-12 rounded-xl border-2 border-zinc-500 shadow-inner flex items-center justify-center cursor-pointer relative overflow-hidden select-none"
                          >
                            <span className="text-[8px] font-black text-zinc-800 tracking-widest uppercase flex items-center gap-1">
                              👉 TAP TO SCRATCH
                            </span>
                            <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                          </motion.div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="reveal"
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="w-full h-full flex flex-col items-center justify-center p-1"
                        >
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1.5 animate-pulse">
                            <Gift className="w-5 h-5" />
                          </div>
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">COUPON REVEALED</span>
                          <h4 className="text-[11px] font-black text-zinc-900 tracking-tight leading-none mt-1.5 max-w-[180px]">
                            {currentScratchPrize}
                          </h4>
                          <p className="text-[8px] text-zinc-500 font-mono mt-1.5 uppercase bg-zinc-200 px-1.5 py-0.5 rounded">MOCKUP CODE: CIVIC-PLAY-77</p>
                          <span className="text-[7px] text-zinc-400 italic block mt-1">(Not Valid in Real Life)</span>
                          
                          <button
                            onClick={resetScratch}
                            className="mt-3.5 border-2 border-[#006a65] text-[#006a65] hover:bg-[#006a65]/5 font-bold text-[8px] px-3 py-1 rounded-full transition-all duration-75 flex items-center gap-1 uppercase tracking-widest cursor-pointer"
                          >
                            Reset Card
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SERVER-SIDE AI SCOUT SQUAD (AGENTS DETAILS) */}
        <section className="w-full mt-16 sm:mt-24 text-left space-y-4 sm:space-y-6">
          <div className="border-b-2 border-zinc-200 pb-2">
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-zinc-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              THE AI AGENT CORPS: SERVER-SIDE SCOUTS
            </h2>
            <p className="text-xs text-[#4e4635] mt-1 leading-normal">
              Meet our backend squad of specialized AI agents working continuously to safeguard, dispatch, and moderate your community reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Scanner Agent */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#d2c5ae]/30 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:scale-[1.01] hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-900">Scanner Agent</h4>
                  <span className="text-[8px] font-mono font-bold text-purple-600 uppercase">Visual Inspector</span>
                </div>
                <p className="text-[10px] text-[#4e4635] leading-relaxed">
                  Evaluates citizen photos server-side. It validates public outdoor damage, flags fraudulent uploads, and rates severity from 1 to 10.
                </p>
              </div>
              <div className="pt-2.5 border-t border-zinc-100 mt-2.5">
                <span className="text-[8px] font-mono text-zinc-400 block">AI BACKEND ENGINE:</span>
                <span className="text-[8px] font-bold text-zinc-700 uppercase">Gemini Pro Vision</span>
              </div>
            </div>

            {/* 2. Moderator Agent */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#d2c5ae]/30 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:scale-[1.01] hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-900">Moderator Agent</h4>
                  <span className="text-[8px] font-mono font-bold text-blue-600 uppercase">Quality Guardian</span>
                </div>
                <p className="text-[10px] text-[#4e4635] leading-relaxed">
                  Checks description logs, flags duplication, rejects offensive/ethical content, and tracks validation voting thresholds automatically.
                </p>
              </div>
              <div className="pt-2.5 border-t border-zinc-100 mt-2.5">
                <span className="text-[8px] font-mono text-zinc-400 block">AI BACKEND ENGINE:</span>
                <span className="text-[8px] font-bold text-zinc-700 uppercase">Gemini Flash Core</span>
              </div>
            </div>

            {/* 3. Dispatcher Agent */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#d2c5ae]/30 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:scale-[1.01] hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-900">Dispatcher Agent</h4>
                  <span className="text-[8px] font-mono font-bold text-emerald-600 uppercase">Alert Architect</span>
                </div>
                <p className="text-[10px] text-[#4e4635] leading-relaxed">
                  Triggers real-time alerts in community lounge, updates local safety index, and automatically dispatches complaint files to public dashboards.
                </p>
              </div>
              <div className="pt-2.5 border-t border-zinc-100 mt-2.5">
                <span className="text-[8px] font-mono text-zinc-400 block">AI BACKEND ENGINE:</span>
                <span className="text-[8px] font-bold text-zinc-700 uppercase">Geoapify &amp; NodeMailer</span>
              </div>
            </div>

            {/* 4. Reward Dispatcher */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#d2c5ae]/30 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:scale-[1.01] hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-900">Reward Agent</h4>
                  <span className="text-[8px] font-mono font-bold text-rose-600 uppercase">Valuation Ledger</span>
                </div>
                <p className="text-[10px] text-[#4e4635] leading-relaxed">
                  Processes Level-Up milestones, rewards XP/Civic Coins for active scouts, calculates passive empire coin yields, and validates ticket coupon draws.
                </p>
              </div>
              <div className="pt-2.5 border-t border-zinc-100 mt-2.5">
                <span className="text-[8px] font-mono text-zinc-400 block">AI BACKEND ENGINE:</span>
                <span className="text-[8px] font-bold text-zinc-700 uppercase">Firestore Functions</span>
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
            YOUR CITY AWAITS, SCOUT
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 max-w-sm mt-2 leading-relaxed">
            The streets are counting on you. Every scan, every report, every patrol brings us closer to a safer, smarter city.
          </p>
          {isAuthenticated ? (
            <button
              onClick={onStartMission}
              className="mt-6 bg-[#f0c040] text-black font-bold text-xs px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all duration-75 cursor-pointer uppercase tracking-wider"
            >
              Start Mission
            </button>
          ) : (
            <button
              onClick={onSignup}
              className="mt-6 bg-[#f0c040] text-black font-bold text-xs px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all duration-75 cursor-pointer uppercase tracking-wider"
            >
              Join the Movement
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
