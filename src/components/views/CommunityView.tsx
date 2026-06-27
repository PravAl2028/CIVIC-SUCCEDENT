import React, { useEffect, useState } from "react";
import { Users, Trophy, ShieldAlert, Eye, CheckCircle2, MessageSquare, Send, Map, Search, ChevronDown, X, Plus, Info } from "lucide-react";
import { Hood } from "../../lib/constants";
import { auth, db } from "../../firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';

interface CommunityViewProps {
  hood: Hood;
  leaderboard?: any;
  liveActivities?: any;
  user: any;
  moderatorModel?: string;
  initialLeaderboardOpen?: boolean;
  onViewCaseOnMap?: (caseId: string, lat: number, lng: number) => void;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export default function CommunityView({ hood, user, moderatorModel, initialLeaderboardOpen, onViewCaseOnMap }: CommunityViewProps) {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { username: string; avatarUrl?: string; isAdmin?: boolean; rank?: string; area?: string }>>({});
  const [selectedArea, setSelectedArea] = useState<string>("All Areas");
  const [areas, setAreas] = useState<string[]>(["All Areas"]);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Redesign state
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(initialLeaderboardOpen || false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  // Private AI Moderation Warning State
  const [moderationWarning, setModerationWarning] = useState<{
    show: boolean;
    warningCount: number;
    reason: string;
    blocked: boolean;
  } | null>(null);

  useEffect(() => {
    if (!auth.currentUser || !hood?.id) return;

    // Fetch Leaderboard for the community
    const usersQ = query(
      collection(db, 'users'),
      limit(100) // Fetch larger set to build map and leaderboard
    );

    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const allDocs = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          uid: d.userId || d.uid || docSnap.id,
          username: d.username || "Scout",
          avatarUrl: d.avatarUrl,
          xp: d.xp || 0,
          totalVerifications: d.totalVerifications || 0,
          trustScore: d.trustScore !== undefined ? d.trustScore : 50,
          area: d.area,
          isAdmin: d.isAdmin || false,
          communityId: d.communityId
        };
      }).filter(d => d.communityId === hood.id && !d.isAdmin);

      allDocs.sort((a, b) => b.xp - a.xp);
      
      const usersList = allDocs.map((d, idx) => {
        return {
          rank: idx + 1,
          uid: d.uid,
          name: d.username,
          count: d.totalVerifications || 0,
          points: (d.xp || 0).toLocaleString(),
          trustScore: d.trustScore,
          avatar: d.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${d.username}`,
          area: d.area
        };
      });
      setLeaderboardData(usersList);

      // Build real-time users mapping with additional metadata
      const uMap: Record<string, { username: string; avatarUrl?: string; isAdmin?: boolean; rank?: string; area?: string }> = {};
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const uid = d.uid || d.userId || docSnap.id;
        if (uid) {
          uMap[uid] = {
            username: d.username || "Scout",
            avatarUrl: d.avatarUrl,
            isAdmin: d.isAdmin || false,
            rank: d.rank || "Scout",
            area: d.area
          };
        }
      });
      setUsersMap(uMap);

      // Extract unique areas from community members
      const uniqueAreas = new Set<string>();
      uniqueAreas.add("All Areas");
      allDocs.forEach(d => {
        if (d.area) uniqueAreas.add(d.area);
      });
      setAreas(Array.from(uniqueAreas));
    });

    // Fetch Chat messages
    const messagesQ = query(
      collection(db, `communities/${hood.id}/messages`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubMessages = onSnapshot(messagesQ, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubMessages();
    };
  }, [hood?.id]);

  useEffect(() => {
    if (initialLeaderboardOpen !== undefined) {
      setIsLeaderboardOpen(initialLeaderboardOpen);
    }
  }, [initialLeaderboardOpen]);

  // Simple time-ago formatter
  const timeAgo = (dateStr: string) => {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const getSenderRoleInfo = (msg: any, senderInfo: any) => {
    if (msg.senderId === "system_ai") {
      return { role: "AI Agent", emoji: "🤖", colorClass: "bg-teal-500/10 text-teal-700 border-teal-500/20" };
    }
    if (senderInfo?.isAdmin) {
      return { role: "Admin", emoji: "👑", colorClass: "bg-red-500/10 text-red-700 border-red-500/20" };
    }
    if (senderInfo?.rank) {
      return { role: senderInfo.rank, emoji: "🛡️", colorClass: "bg-yellow-500/10 text-[#775a00] border-yellow-500/20" };
    }
    return { role: "Citizen", emoji: "👤", colorClass: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20" };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !hood?.id || user.isBlocked) return;

    setChatLoading(true);
    const msgText = newMessage;
    setNewMessage("");

    try {
      // Client-side call to our proxy API with conversational history & current warnings memory
      const chatHistory = messages.slice(-10).map(m => ({
        senderName: m.senderName || "User",
        text: m.text || "",
        type: m.type || "user"
      }));
      const userWarnings = user.warningsCount || 0;

      const res = await fetch(`${API_BASE}/api/agents/moderator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messageText: msgText, 
          selectedModel: moderatorModel,
          chatHistory,
          userWarnings
        })
      });
      const data = await res.json();

      if (data.isEthical) {
        // Send actual message
        await addDoc(collection(db, `communities/${hood.id}/messages`), {
          senderId: user.userId,
          senderName: user.displayName,
          senderAvatar: user.photoURL,
          text: msgText,
          type: "user",
          createdAt: serverTimestamp()
        });
      } else {
        // Unethical message handling
        const currentWarnings = user.warningsCount || 0;
        const newWarningsCount = currentWarnings + 1;
        const isNowBlocked = newWarningsCount >= 3;
        
        const userRef = doc(db, 'users', user.userId);
        
        if (isNowBlocked) {
          await updateDoc(userRef, { 
            warningsCount: newWarningsCount, 
            isBlocked: true 
          });
        } else {
          await updateDoc(userRef, { 
            warningsCount: newWarningsCount 
          });
        }
        
        // Save the log of the event to the moderation_reports collection for the Admin Panel
        await addDoc(collection(db, 'moderation_reports'), {
          userId: user.userId,
          username: user.displayName,
          flaggedMessage: msgText,
          reason: data.reason,
          actionTaken: isNowBlocked ? "block" : "warning",
          createdAt: serverTimestamp()
        });

        // Set private warning state directly in the UI of the user who typed it
        setModerationWarning({
          show: true,
          warningCount: newWarningsCount,
          reason: data.reason,
          blocked: isNowBlocked
        });
      }
    } catch (err) {
      console.error("Moderation error:", err);
      // Fallback: If moderation fails, send anyway
      await addDoc(collection(db, `communities/${hood.id}/messages`), {
        senderId: user.userId,
        senderName: user.displayName,
        senderAvatar: user.photoURL,
        text: msgText,
        type: "user",
        createdAt: serverTimestamp()
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleCaseMessageClick = async (caseId: string) => {
    if (!caseId || !onViewCaseOnMap) return;
    try {
      const caseSnap = await getDoc(doc(db, 'cases', caseId));
      if (caseSnap.exists()) {
        const caseData = caseSnap.data();
        if (caseData.latitude && caseData.longitude) {
          onViewCaseOnMap(caseId, caseData.latitude, caseData.longitude);
        }
      }
    } catch (err) {
      console.error("Error fetching case for chat redirection:", err);
    }
  };

  const filteredLeaderboard = selectedArea === "All Areas" 
    ? leaderboardData 
    : leaderboardData.filter(h => h.area === selectedArea);

  const top5 = filteredLeaderboard.slice(0, 5);
  const userInTop5Index = top5.findIndex(h => h.uid === user?.userId);
  const userIsInTop5 = userInTop5Index !== -1;
  const userRecord = filteredLeaderboard.find(h => h.uid === user?.userId);

  // Chat filtering logic
  const filteredMessages = messages.filter((msg) => {
    if (msg.type !== "user" && msg.type !== "auto_post") return false;

    // Search query filter (matches message text and sender's current/historical username)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const textMatch = msg.text ? msg.text.toLowerCase().includes(q) : false;
      const senderInfo = usersMap[msg.senderId];
      const liveName = senderInfo?.username || msg.senderName || "Scout";
      const nameMatch = liveName.toLowerCase().includes(q);
      if (!textMatch && !nameMatch) return false;
    }

    // Area dropdown filter
    if (selectedArea === "All Areas") return true;

    // If standard user post, check if the sender is from that area
    const senderInfo = usersMap[msg.senderId];
    if (senderInfo && senderInfo.area === selectedArea) return true;

    // If system/auto post, check if the text mentions the area
    if (msg.text && msg.text.toLowerCase().includes(selectedArea.toLowerCase())) return true;

    return false;
  });

  return (
    <div className="bg-[#F5F0E8] text-[#191c22] font-sans h-[100dvh] flex flex-col max-w-lg mx-auto relative overflow-hidden pt-20 pb-[72px] px-6">
      <header className="bg-white border-b border-zinc-200 py-3.5 px-4 flex flex-col gap-2.5 shadow-sm -mx-6 -mt-20 mb-2 shrink-0 relative z-30 animate-in fade-in duration-200">
        {/* Row 1: Title and Icon Actions */}
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="font-display font-black text-sm uppercase text-[#006a65] truncate tracking-tight flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#006a65] flex-shrink-0" />
              <span className="truncate">{hood.name}</span>
            </h2>
            <p className="text-[9px] font-bold text-zinc-400 truncate mt-0.5 uppercase tracking-wide">
              {hood.city} • Active Community
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Leaderboard Toggle Icon */}
            <button
              onClick={() => setIsLeaderboardOpen(true)}
              className="p-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
              title="Trophy Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5" />
            </button>

            {/* Info Toggle Icon */}
            <button
              onClick={() => setIsInfoOpen(true)}
              className="p-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
              title="Community Info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Location selector (Dropdown) and Search Box side-by-side */}
        <div className="flex items-center gap-2 w-full bg-zinc-50 border border-zinc-150 rounded-xl p-1.5 shrink-0">
          <div className="relative shrink-0">
            <select 
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-700 text-[10px] font-extrabold uppercase rounded-lg pl-2 pr-6 py-1 outline-none cursor-pointer focus:border-[#006a65] appearance-none"
            >
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="w-[1px] h-4 bg-zinc-200 shrink-0" />

          <div className="flex-grow flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2 py-0.5 min-w-0">
            <Search className="w-3 h-3 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat..."
              className="w-full bg-transparent text-[10px] font-semibold outline-none text-zinc-800 placeholder-zinc-400 border-none p-0 focus:ring-0 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>


      {/* 3. PRIMARY SCREEN: TELEGRAM/WHATSAPP INSPIRED ANNOUNCEMENT CHAT */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 flex flex-col-reverse -mx-2 px-2 pb-4">
        {filteredMessages.map((msg) => {
          const senderInfo = usersMap[msg.senderId];
          const isCurrentUser = msg.senderId === user.userId;
          
          const liveAvatar = isCurrentUser 
            ? user.photoURL 
            : (senderInfo?.avatarUrl || msg.senderAvatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${msg.senderId || 'cs'}`);
          
          const liveName = senderInfo?.username || msg.senderName || "Scout";
          const isClickableCase = msg.type === "auto_post" && msg.caseId;
          const roleInfo = getSenderRoleInfo(msg, senderInfo);

          return (
            <div 
              key={msg.id} 
              onClick={() => {
                if (isClickableCase && msg.caseId) {
                  handleCaseMessageClick(msg.caseId);
                }
              }}
              className={`flex gap-3 items-start p-3.5 rounded-2xl border transition-all text-xs shadow-sm bg-white hover:shadow-md pointer-events-auto ${
                isClickableCase 
                  ? 'border-[#006a65]/20 hover:border-[#006a65]/35 bg-teal-50/20 cursor-pointer active:scale-[0.995]'
                  : 'border-zinc-200/75'
              }`}
            >
              <img
                src={liveAvatar}
                alt={liveName}
                referrerPolicy="no-referrer"
                className={`w-9 h-9 rounded-full border border-zinc-200 object-cover flex-shrink-0 mt-0.5 ${
                  isClickableCase ? 'border-[#006a65]/30' : ''
                }`}
              />
              <div className="flex-grow min-w-0">
                {/* Message Header Layout */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="font-extrabold text-zinc-900 truncate max-w-[120px]">
                      {liveName}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border leading-none ${roleInfo.colorClass}`}>
                      {roleInfo.emoji} {roleInfo.role}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-zinc-400 whitespace-nowrap">
                    {senderInfo?.area || "Hyderabad"} • {msg.createdAt?.toDate ? timeAgo(msg.createdAt.toDate().toISOString()) : "Just now"}
                  </span>
                </div>

                {/* Message Content */}
                <p className="mt-1.5 text-[11px] text-zinc-700 leading-relaxed font-medium">
                  {msg.text}
                </p>

                {/* Patrol/Announcement Action Callout */}
                {isClickableCase && (
                  <span className="inline-flex items-center gap-1.5 mt-2.5 text-[9px] text-[#006a65] font-black uppercase tracking-wider bg-[#006a65]/5 px-2.5 py-1 rounded-xl border border-[#006a65]/15 transition-all">
                    <Map className="w-3 h-3 text-[#006a65]" />
                    Tap to view on map
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {filteredMessages.length === 0 && (
          <div className="text-center text-zinc-400 text-xs py-10 font-bold bg-white/50 border border-zinc-200/50 rounded-2xl p-4">
            No updates found. Tweak filters or search query!
          </div>
        )}
      </div>

      {/* 4. CHAT INPUT SECTION */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-zinc-200 py-3.5 px-4 -mx-6 relative z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] shrink-0">
        {(user?.isBlocked || moderationWarning?.blocked) ? (
          <div className="w-full bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl text-center border border-red-200">
            🚫 Account suspended for violating community safety guidelines.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Post community update..."
              disabled={chatLoading}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#006a65] focus:bg-white transition-all disabled:opacity-50 text-zinc-800 placeholder-zinc-400"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || chatLoading}
              className="bg-[#006a65] text-white p-2.5 rounded-xl hover:bg-[#005e55] transition-all disabled:opacity-50 flex items-center justify-center min-w-[44px] cursor-pointer"
            >
              {chatLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </form>

      {/* 5. DYNAMIC FLOATING ACTIONS CLUSTER (FAB) */}
      <div className="fixed bottom-[130px] right-6 z-30 flex flex-col items-end gap-2.5 pointer-events-none">
        {isFabExpanded && (
          <div className="flex flex-col gap-2 items-end animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
            {/* Report Issue Action */}
            <button
              onClick={() => {
                if (onViewCaseOnMap) onViewCaseOnMap("", 0, 0);
                setIsFabExpanded(false);
              }}
              className="flex items-center gap-2 bg-[#006a65] text-white px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg hover:bg-[#005e55] transition-all cursor-pointer border border-[#006a65]/20"
            >
              <span>🚨 Report Issue</span>
            </button>

            {/* Leaderboard Action */}
            <button
              onClick={() => {
                setIsLeaderboardOpen(true);
                setIsFabExpanded(false);
              }}
              className="flex items-center gap-2 bg-white text-zinc-855 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg hover:bg-zinc-50 transition-all cursor-pointer border border-zinc-200"
            >
              <span>🏆 Leaderboard</span>
            </button>

            {/* Community Details Action */}
            <button
              onClick={() => {
                setIsInfoOpen(true);
                setIsFabExpanded(false);
              }}
              className="flex items-center gap-2 bg-white text-zinc-855 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg hover:bg-zinc-50 transition-all cursor-pointer border border-zinc-200"
            >
              <span>ℹ️ Community Info</span>
            </button>
          </div>
        )}

        {/* Master FAB Trigger Button */}
        <button
          onClick={() => setIsFabExpanded(!isFabExpanded)}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer pointer-events-auto border ${
            isFabExpanded 
              ? 'bg-zinc-800 text-white border-zinc-700 rotate-45' 
              : 'bg-[#006a65] text-white border-[#006a65]/20 hover:bg-[#005e55]'
          }`}
          title="Community Actions"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 6. LEADERBOARD BOTTOM SHEET */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center pointer-events-auto" onClick={() => setIsLeaderboardOpen(false)}>
          <div 
            className="bg-white rounded-t-[32px] w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" style={{ fill: "currentColor" }} />
                <h3 className="font-display font-black text-sm uppercase tracking-tight text-zinc-900">Active Hero Leaderboard</h3>
              </div>
              <button 
                onClick={() => setIsLeaderboardOpen(false)} 
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-3.5 pt-1">
              {top5.map((hero, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-150 relative overflow-hidden"
                >
                  <div className="w-6 text-center font-bold font-mono text-zinc-400 text-sm">
                    #{hero.rank}
                  </div>
                  <div className="relative">
                    <img
                      src={hero.avatar}
                      alt={hero.name}
                      className="w-10 h-10 rounded-full border-2 border-white shadow object-cover"
                    />
                    {hero.rank === 1 && (
                      <span className="absolute -top-1.5 -right-1.5 text-xs text-yellow-500 animate-bounce">👑</span>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-zinc-800 truncate">{hero.name}</h4>
                      <span className="text-[9px] bg-teal-50 text-[#006a65] border border-[#006a65]/20 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                        ⭐ {hero.trustScore}%
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase">{hero.count} verifications</p>
                  </div>
                  <div className="bg-zinc-200 px-3 py-1 rounded-xl text-xs font-black text-[#775a00] font-mono whitespace-nowrap">
                    {hero.points} XP
                  </div>
                </div>
              ))}

              {top5.length === 0 && (
                <p className="text-center text-zinc-400 text-xs py-4">No active heroes in this area yet.</p>
              )}

              {/* Logged-in User standing row at the bottom if NOT in Top 5 */}
              {!userIsInTop5 && userRecord && (
                <div className="border-t border-dashed border-zinc-200 pt-3.5 mt-2">
                  <div className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-2 text-center">
                    Your Standing
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#fbfaf7] border border-[#006a65]/20 relative overflow-hidden">
                    <div className="w-6 text-center font-bold font-mono text-[#006a65] text-sm">
                      #{userRecord.rank}
                    </div>
                    <div className="relative">
                      <img
                        src={userRecord.avatar}
                        alt={userRecord.name}
                        className="w-10 h-10 rounded-full border-2 border-primary shadow object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs text-zinc-800 truncate">{userRecord.name} (You)</h4>
                        <span className="text-[9px] bg-teal-50 text-[#006a65] border border-[#006a65]/20 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                          ⭐ {userRecord.trustScore}%
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase">{userRecord.count} verifications</p>
                    </div>
                    <div className="bg-[#006a65]/10 px-3 py-1 rounded-xl text-xs font-black text-[#006a65] font-mono whitespace-nowrap">
                      {userRecord.points} XP
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. COMMUNITY DETAILS INFO BOTTOM SHEET */}
      {isInfoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center pointer-events-auto" onClick={() => setIsInfoOpen(false)}>
          <div 
            className="bg-white rounded-t-[32px] w-full max-w-lg shadow-2xl p-6 space-y-6 animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#d2c5ae]/20 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#006a65]" />
                <h3 className="font-display font-black text-sm uppercase tracking-tight text-zinc-900">Community Information</h3>
              </div>
              <button 
                onClick={() => setIsInfoOpen(false)} 
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Dashboard (Moved from main stream cards) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4.5 text-center shadow-inner">
                <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider block">Active Heroes</span>
                <span className="text-2xl font-black font-mono text-[#006a65] block mt-1">{hood.activeHeroes || 0}</span>
                <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wide">Patrolling Sector</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4.5 text-center shadow-inner">
                <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider block">Total Cases</span>
                <span className="text-2xl font-black font-mono text-zinc-800 block mt-1">{hood.totalCases || 0}</span>
                <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wide">Reported Issues</span>
              </div>
            </div>

            {/* Guidelines */}
            <div className="space-y-3 text-xs leading-relaxed text-zinc-600">
              <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                <h4 className="font-extrabold text-[9px] uppercase text-zinc-400 tracking-widest mb-1">Our Civic Mission</h4>
                <p className="text-[11px] text-zinc-500">
                  Join forces with fellow citizens to scout defects, verify repairs, and restore community pride. Maintain high consensus ratings to earn the trust of your neighborhood.
                </p>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                <h4 className="font-extrabold text-[9px] uppercase text-zinc-400 tracking-widest mb-1.5">Sectors Served</h4>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map(a => (
                    <span key={a} className="text-[9px] bg-zinc-200 text-zinc-700 font-bold px-2 py-0.5 rounded-full border border-zinc-300/30">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. PRIVATE AI MODERATION WARNING OVERLAY MODAL */}
      {moderationWarning && moderationWarning.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6 pointer-events-auto">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center border border-red-200 text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="font-display text-xl font-black text-red-600 uppercase tracking-tight">
              {moderationWarning.blocked ? "Account Blocked" : "Chat Policy Warning"}
            </h3>

            <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
              {moderationWarning.blocked ? (
                <span>
                  ⚠️ CS AI Warning: Your account has been permanently suspended for unethical behavior. You can no longer participate in chat.
                </span>
              ) : (
                <span>
                  ⚠️ CS AI Warning: Please keep chat ethical. Warning <strong>{moderationWarning.warningCount}/3</strong>. Your message was blocked.
                </span>
              )}
            </p>

            <div className="w-full bg-red-50/50 border border-red-100 rounded-xl p-3 my-4 text-left">
              <span className="text-[9px] text-red-700 font-extrabold uppercase tracking-wider block">AI Moderation Analysis</span>
              <span className="text-xs text-red-950 font-medium block mt-1 leading-normal">{moderationWarning.reason}</span>
            </div>

            <button
              type="button"
              onClick={() => setModerationWarning(null)}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
            >
              Understand & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
