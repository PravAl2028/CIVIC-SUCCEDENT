import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import LandingView from "./components/views/LandingView";
import LoginView from "./components/views/LoginView";
import SignupView from "./components/views/SignupView";
import GameView from "./components/views/GameView";
import RoutePlannerView from "./components/views/RoutePlannerView";
import CommunityView from "./components/views/CommunityView";
import AdminView from "./components/views/AdminView";
import ProfilePage from "./pages/ProfilePage";
import ScanResultPage from "./pages/ScanResultPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import { Compass, Map, Users, User, Shield } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authUser, initialLoading } = useAuth();
  if (initialLoading) return <LoadingScreen />;
  if (!authUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="bg-[#F5F0E8] min-h-[100dvh] font-sans flex flex-col justify-center items-center text-[#191c22]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#006a65] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="font-display text-xl font-black uppercase tracking-widest text-[#006a65]">{t.app.name}</h2>
        <p className="text-xs text-zinc-500 font-bold">{t.common.loading}</p>
      </div>
    </div>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const hideNav = ["/login", "/signup", "/"].includes(location.pathname) || location.pathname === "/scan-result";

  return (
    <div className="bg-[#F5F0E8] min-h-[100dvh] text-[#191c22] font-sans overflow-x-hidden">
      {children}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 w-full z-40 bg-white/95 border-t border-[#d2c5ae]/30 shadow-lg backdrop-blur-md px-2 py-3 flex justify-around items-center gap-1">
          <NavLink to="/patrol" icon={Compass} label={t.nav.patrol} />
          <NavLink to="/maps" icon={Map} label={t.nav.maps} />
          <NavLink to="/community" icon={Users} label={t.nav.lounge} />
          <NavLink to="/profile" icon={User} label={t.nav.profile} />
          {user?.isAdmin && <NavLink to="/admin" icon={Shield} label="Admin" />}
        </nav>
      )}
      <Overlays />
    </div>
  );
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors flex-1 min-w-0 text-center ${isActive ? "text-[#006a65]" : "text-zinc-400 hover:text-zinc-600"}`}>
      <Icon className="w-5 h-5 flex-shrink-0" style={isActive ? { fill: "rgba(0,106,101,0.15)" } : {}} />
      <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">{label}</span>
    </Link>
  );
}

function Overlays() {
  const { notification, activeDispatchCase, setActiveDispatchCase, dispatchLoading, dispatchLetter } = useAuth();
  const { t } = useLanguage();

  return (
    <>
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] max-w-sm w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${notification.type === "success" ? "bg-[#e1fbf2] text-[#006f47] border-[#00af6c]/20" : "bg-[#eef3fc] text-[#1b51b7] border-[#2f6ce5]/20"}`}>
            <div className="text-xs font-bold leading-relaxed">{notification.message}</div>
          </div>
        </div>
      )}

      {activeDispatchCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-150 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">{t.dispatch.aiSystem}</span>
                <h3 className="font-display text-lg font-black uppercase mt-1">{t.dispatch.draft}</h3>
              </div>
              <button onClick={() => setActiveDispatchCase(null)} className="text-zinc-400 hover:text-zinc-600 font-bold">{t.dispatch.close}</button>
            </div>
            {dispatchLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#006a65] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-zinc-500 font-bold">{t.dispatch.generating}</p>
              </div>
            ) : dispatchLetter ? (
              <div className="space-y-4">
                <div className="bg-[#fff9eb] border border-[#f0c040]/30 p-3.5 rounded-2xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">{t.dispatch.subject}</span>
                  <p className="text-xs font-black text-[#775a00] mt-0.5">{dispatchLetter.subject}</p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-150 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-line text-zinc-700 leading-relaxed">{dispatchLetter.complaintLetter}</div>
                <button onClick={() => setActiveDispatchCase(null)} className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-xs uppercase">{t.dispatch.confirm}</button>
              </div>
            ) : <p className="text-xs text-rose-500">{t.dispatch.failed}</p>}
          </div>
        </div>
      )}
    </>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { authUser, initialLoading } = useAuth();
  if (initialLoading) return <LoadingScreen />;
  if (authUser) return <Navigate to="/patrol" replace />;
  return <>{children}</>;
}

function LandingRoute() {
  const { user, authUser } = useAuth();
  const navigate = useNavigate();
  return (
    <LandingView
      user={user}
      isAuthenticated={!!authUser}
      onLogin={() => navigate("/login")}
      onSignup={() => navigate("/signup")}
      onStartMission={() => navigate("/patrol")}
      onViewProfile={() => navigate("/profile")}
      onViewLeaderboard={() => navigate("/leaderboard")}
      onViewMaps={() => navigate("/maps")}
    />
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  return <LoginView onSwitchToSignup={() => navigate("/signup")} onGoHome={() => navigate("/")} />;
}

function SignupRoute() {
  const navigate = useNavigate();
  return <SignupView onSwitchToLogin={() => navigate("/login")} onGoHome={() => navigate("/")} />;
}

function PatrolRoute() {
  const { user, cases, hood, playerPos, setPlayerPos, handleVerifyCase, handleResolveCase, handleTriggerScan, handleTriggerDispatcher, selectedCaseIdFromChat, setSelectedCaseIdFromChat } = useAuth();
  if (!user) return null;
  return (
    <GameView
      cases={cases}
      user={user}
      hood={hood}
      playerPos={playerPos}
      setPlayerPos={setPlayerPos}
      onVerifyCase={handleVerifyCase}
      onResolveCase={handleResolveCase}
      onTriggerScan={handleTriggerScan}
      onTriggerDispatcher={handleTriggerDispatcher}
      selectedCaseIdFromChat={selectedCaseIdFromChat}
      setSelectedCaseIdFromChat={setSelectedCaseIdFromChat}
    />
  );
}

function MapsRoute() {
  const { user, cases, playerPos, setPlayerPos, handleTriggerScan } = useAuth();
  if (!user) return null;
  return (
    <RoutePlannerView
      key={`route-${user.userId}`}
      cases={cases}
      playerPos={playerPos}
      setPlayerPos={setPlayerPos}
      onTriggerScan={handleTriggerScan}
    />
  );
}

function CommunityRoute() {
  const { user, hood, leaderboard, liveActivities, agentModels } = useAuth();
  const navigate = useNavigate();
  if (!user || !hood) return null;
  return (
    <CommunityView
      key={`community-${user.userId}-${hood.id}`}
      hood={hood}
      leaderboard={leaderboard}
      liveActivities={liveActivities}
      user={user}
      moderatorModel={agentModels.moderator}
      onViewCaseOnMap={() => navigate("/patrol")}
    />
  );
}

function AdminRoute() {
  const { user, agentModels, setAgentModels, triggerToast } = useAuth();
  if (!user?.isAdmin) return null;
  return (
    <AdminView
      key={`admin-${user.userId}`}
      user={user}
      agentModels={agentModels}
      onAgentModelChange={(agent, model) => {
        const updated = { ...agentModels, [agent]: model };
        setAgentModels(updated);
        localStorage.setItem("nagarika_agent_models_v2", JSON.stringify(updated));
        triggerToast(`Model for ${agent.toUpperCase()} Agent set to ${model}!`, "success");
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <ShellLayout>
          <Routes>
            <Route path="/" element={<PublicRoute><LandingRoute /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><LoginRoute /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignupRoute /></PublicRoute>} />
            <Route path="/patrol" element={<ProtectedRoute><PatrolRoute /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportIssuePage /></ProtectedRoute>} />
            <Route path="/issues/:id" element={<ProtectedRoute><IssueDetailPage /></ProtectedRoute>} />
            <Route path="/maps" element={<ProtectedRoute><MapsRoute /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityRoute /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute /></ProtectedRoute>} />
            <Route path="/scan-result" element={<ProtectedRoute><ScanResultPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ShellLayout>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
