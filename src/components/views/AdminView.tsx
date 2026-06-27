import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Shield, AlertTriangle, UserX, CheckCircle, RefreshCcw, Users, Brain, ChevronRight, X } from "lucide-react";

const BASELINE_CITY_DATA: Record<string, string[]> = {
  "Hyderabad": ["Tirumalagiri", "Secunderabad", "Ameerpet", "Kukatpally", "Gachibowli", "Madhapur", "Begumpet", "Banjara Hills", "Jubilee Hills", "Malkajgiri", "LB Nagar", "Dilsukhnagar", "Uppal", "Miyapur", "Kompally", "Mehdipatnam", "Tarnaka", "Habsiguda"],
  "Bangalore": ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "JP Nagar", "BTM Layout", "Marathahalli", "Electronic City", "Jayanagar", "Malleshwaram", "Rajajinagar", "Yelahanka", "Hebbal", "Banashankari"],
  "Mumbai": ["Andheri", "Bandra", "Borivali", "Dadar", "Goregaon", "Juhu", "Kandivali", "Malad", "Powai", "Thane", "Vashi", "Worli", "Colaba", "Kurla", "Vikhroli"],
  "Delhi": ["Connaught Place", "Karol Bagh", "Lajpat Nagar", "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Saket", "Vasant Kunj", "Hauz Khas", "Greater Kailash", "Nehru Place", "Rajouri Garden"],
  "Chennai": ["T Nagar", "Adyar", "Anna Nagar", "Velachery", "Tambaram", "Porur", "Guindy", "Mylapore", "Nungambakkam", "Chromepet", "Perambur", "Thiruvanmiyur"]
};

interface AdminViewProps {
  user: any;
  agentModels?: {
    scanner: string;
    dispatcher: string;
    resolver: string;
    moderator: string;
  };
  onAgentModelChange?: (agent: "scanner" | "dispatcher" | "resolver" | "moderator", model: string) => void;
}

export default function AdminView({ user, agentModels, onAgentModelChange }: AdminViewProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [selectedArea, setSelectedArea] = useState<string>("All");

  const [userSortField, setUserSortField] = useState<"user" | "location" | "warnings" | "blocked">("user");
  const [userSortDirection, setUserSortDirection] = useState<"asc" | "desc">("asc");

  const [selectedChatUser, setSelectedChatUser] = useState<any | null>(null);
  const [selectedLetterCase, setSelectedLetterCase] = useState<any | null>(null);
  const [userChatMessages, setUserChatMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedChatUser) {
      setUserChatMessages([]);
      return;
    }

    const citySlug = selectedChatUser.city?.toLowerCase().replace(/\s+/g, '_') || "hyderabad";
    const communityId = selectedChatUser.communityId || citySlug;

    // Listen to community chat messages
    const messagesQ = query(
      collection(db, `communities/${communityId}/messages`),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(messagesQ, (snap) => {
      const allMsgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for messages sent by the user, or warning/block messages targeting the user
      const filtered = allMsgs.filter((m: any) => {
        const isFromUser = m.senderId === selectedChatUser.id || m.senderId === selectedChatUser.userId || m.senderId === selectedChatUser.uid;
        const isAiWarningForUser = m.type === "ai_warning" && m.targetUserId === selectedChatUser.id;
        return isFromUser || isAiWarningForUser;
      });
      setUserChatMessages(filtered.reverse()); // oldest first
    });

    return () => unsub();
  }, [selectedChatUser]);

  useEffect(() => {
    // Listen to moderation reports
    const reportsQ = query(collection(db, "moderation_reports"), orderBy("createdAt", "desc"));
    const unsubReports = onSnapshot(reportsQ, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to all users in real-time
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to all cases in real-time
    const unsubCases = onSnapshot(collection(db, "cases"), (snap) => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubReports();
      unsubUsers();
      unsubCases();
    };
  }, []);

  const handleAction = async (userId: string, action: string) => {
    const userRef = doc(db, "users", userId);
    const u = usersList.find(usr => usr.id === userId);
    if (!u) return;

    try {
      if (action === "block") await updateDoc(userRef, { isBlocked: true });
      if (action === "unblock") await updateDoc(userRef, { isBlocked: false });
      if (action === "reset") await updateDoc(userRef, { warningsCount: 0 });
      if (action === "makeAdmin") await updateDoc(userRef, { isAdmin: true });
      if (action === "removeAdmin") await updateDoc(userRef, { isAdmin: false });
      if (action === "warn") {
        const currentWarn = u.warningsCount || 0;
        const newWarn = currentWarn + 1;
        await updateDoc(userRef, {
          warningsCount: newWarn,
          isBlocked: newWarn >= 3 ? true : (u.isBlocked || false)
        });
      }
    } catch (e) {
      console.error("Action failed:", e);
      alert("Action failed. See console.");
    }
  };

  // Combine baseline static data with dynamic cities & areas in the database (from users/cases)
  const getDynamicCityData = () => {
    const data: Record<string, Set<string>> = {};
    
    // 1. Load baseline static data
    Object.entries(BASELINE_CITY_DATA).forEach(([city, areas]) => {
      data[city] = new Set(areas);
    });

    // 2. Scan users in db to find custom cities/areas
    usersList.forEach(u => {
      if (u.city) {
        if (!data[u.city]) {
          data[u.city] = new Set();
        }
        if (u.area) {
          data[u.city].add(u.area);
        }
      }
    });

    // 3. Scan cases in db to find custom cities/areas
    cases.forEach(c => {
      // Find the reporter's user object to check their city/area
      const reporter = usersList.find(u => u.id === c.reportedBy || u.userId === c.reportedBy || u.uid === c.reportedBy);
      if (reporter && reporter.city) {
        if (!data[reporter.city]) {
          data[reporter.city] = new Set();
        }
        if (reporter.area) {
          data[reporter.city].add(reporter.area);
        }
      }
    });

    // Convert sets back to arrays and sort them
    const finalData: Record<string, string[]> = {};
    Object.entries(data).forEach(([city, areaSet]) => {
      finalData[city] = Array.from(areaSet).sort();
    });

    return finalData;
  };

  const dynamicCityData = getDynamicCityData();

  const getCaseLocation = (reportedByUid: string, address: string) => {
    const reporter = usersList.find(u => u.id === reportedByUid || u.userId === reportedByUid || u.uid === reportedByUid);
    if (reporter) {
      return { city: reporter.city || "All", area: reporter.area || "All" };
    }
    // Fallback search of address string
    let foundCity = "All";
    let foundArea = "All";
    for (const city of Object.keys(dynamicCityData)) {
      if (address?.toLowerCase().includes(city.toLowerCase())) {
        foundCity = city;
        for (const area of dynamicCityData[city]) {
          if (address?.toLowerCase().includes(area.toLowerCase())) {
            foundArea = area;
            break;
          }
        }
        break;
      }
    }
    return { city: foundCity, area: foundArea };
  };

  // Filter Data Arrays by Selected City & Area
  const filteredUsers = usersList.filter(u => {
    if (selectedCity !== "All" && u.city !== selectedCity) return false;
    if (selectedArea !== "All" && u.area !== selectedArea) return false;
    return true;
  });

  const finalFilteredUsers = filteredUsers.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...finalFilteredUsers].sort((a, b) => {
    let valA: any = "";
    let valB: any = "";

    if (userSortField === "warnings") {
      valA = a.warningsCount || 0;
      valB = b.warningsCount || 0;
    } else if (userSortField === "blocked") {
      valA = a.isBlocked ? 1 : 0;
      valB = b.isBlocked ? 1 : 0;
    } else if (userSortField === "location") {
      valA = `${a.city || ""} - ${a.area || ""}`.toLowerCase();
      valB = `${b.city || ""} - ${b.area || ""}`.toLowerCase();
    } else {
      valA = (a.username || "").toLowerCase();
      valB = (b.username || "").toLowerCase();
    }

    if (valA < valB) return userSortDirection === "asc" ? -1 : 1;
    if (valA > valB) return userSortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: "user" | "location" | "warnings" | "blocked") => {
    if (userSortField === field) {
      setUserSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setUserSortField(field);
      setUserSortDirection("asc");
    }
  };

  const filteredCases = cases.filter(c => {
    const loc = getCaseLocation(c.reportedBy, c.address);
    if (selectedCity !== "All" && loc.city !== selectedCity) return false;
    if (selectedArea !== "All" && loc.area !== selectedArea) return false;
    return true;
  });

  const filteredReports = reports.filter(r => {
    const targetUser = usersList.find(u => u.id === r.userId || u.username === r.username);
    if (!targetUser) return selectedCity === "All";
    if (selectedCity !== "All" && targetUser.city !== selectedCity) return false;
    if (selectedArea !== "All" && targetUser.area !== selectedArea) return false;
    return true;
  });

  const blockedUsers = usersList.filter(u => u.isBlocked && (u.warningsCount || 0) >= 3);

  return (
    <div className="p-6 bg-[#F5F0E8] min-h-[100dvh] font-sans pb-32 max-w-4xl mx-auto space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#006a65]" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#775a00]">Admin Dashboard</h1>
        </div>

        {/* Filter (ALL, City -> area) Dropdown Selector */}
        <div className="bg-white/80 backdrop-blur p-2.5 rounded-2xl border border-zinc-150 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider pl-1.5 whitespace-nowrap">🗺️ Location:</span>
          
          <div className="flex gap-2 items-center w-full sm:w-auto flex-grow sm:flex-grow-0">
            {/* City Selector */}
            <div className="relative min-w-0 flex-1 sm:min-w-[120px] sm:flex-grow-0">
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedArea("All");
                }}
                className="w-full bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#006a65] appearance-none cursor-pointer pr-7"
              >
                <option value="All">All Cities</option>
                {Object.keys(dynamicCityData).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronRight className="w-3.5 h-3.5 transform rotate-90" />
              </div>
            </div>

            {/* Area Selector */}
            <div className="relative min-w-0 flex-1 sm:min-w-[120px] sm:flex-grow-0">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                disabled={selectedCity === "All"}
                className="w-full bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#006a65] disabled:opacity-50 appearance-none cursor-pointer pr-7"
              >
                <option value="All">All Areas</option>
                {selectedCity !== "All" && dynamicCityData[selectedCity]?.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronRight className="w-3.5 h-3.5 transform rotate-90" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Admin Alerts for Blocked Users */}
      {blockedUsers.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-3xl shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
            <h4 className="font-bold text-sm text-red-800">Critical: Blocked Users Requiring Administrative Review</h4>
          </div>
          <div className="space-y-2">
            {blockedUsers.map(bu => (
              <div key={bu.id} className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-red-100 text-xs">
                <div>
                  <span className="font-bold text-zinc-800">@{bu.username}</span> ({bu.email}) has been <strong className="text-red-600">blocked</strong> after 3 community guidelines violations.
                </div>
                <button
                  onClick={() => setSelectedChatUser(bu)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Inspect AI Chat Audit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards Row (Filtered) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-150">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Scouts</div>
          <div className="text-2xl font-black text-zinc-800 mt-1">{filteredUsers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-150">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cases Reported</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{filteredCases.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-150">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Resolved Cases</div>
          <div className="text-2xl font-black text-[#006a65] mt-1">
            {filteredCases.filter(c => c.status === "resolved").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-150">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">System Warnings</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {filteredUsers.reduce((acc, u) => acc + (u.warningsCount || 0), 0)}
          </div>
        </div>
      </div>

      {/* AI AGENT ENGINE CONFIG (ADMIN ONLY) */}
      {agentModels && onAgentModelChange && (
        <section className="bg-white p-6 rounded-3xl border border-zinc-150 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Brain className="w-5 h-5 text-[#006a65]" />
            <h3 className="font-display text-lg font-bold text-[#775a00] uppercase">
              AI Agent Engine Config (Admin Only)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Scanner Agent */}
            <div className="space-y-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Agent 01</span>
                <h4 className="font-bold text-sm text-zinc-800">📸 Scanner Agent</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Analyzes citizen-uploaded photograph metadata to validate infrastructure damage and filter fraud reports.
                </p>
              </div>
              <div className="relative mt-4">
                <select
                  value={agentModels.scanner}
                  onChange={(e) => onAgentModelChange("scanner", e.target.value)}
                  className="w-full bg-white text-zinc-800 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#006a65] appearance-none cursor-pointer pr-10"
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemma-4-26b-a4b-it">Gemma 4 26B</option>
                  <option value="gemma-4-31b-it">Gemma 4 31B</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* 2. Dispatcher Agent */}
            <div className="space-y-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Agent 02</span>
                <h4 className="font-bold text-sm text-zinc-800">✉️ Dispatcher Agent</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Compiles formal petitions and official complaint letters to municipal government departments.
                </p>
              </div>
              <div className="relative mt-4">
                <select
                  value={agentModels.dispatcher}
                  onChange={(e) => onAgentModelChange("dispatcher", e.target.value)}
                  className="w-full bg-white text-zinc-800 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#006a65] appearance-none cursor-pointer pr-10"
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemma-4-26b-a4b-it">Gemma 4 26B</option>
                  <option value="gemma-4-31b-it">Gemma 4 31B</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* 3. Resolver Agent */}
            <div className="space-y-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Agent 03</span>
                <h4 className="font-bold text-sm text-zinc-800">✅ Resolver Agent</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Compares original defect photos with citizen-submitted resolution photos to verify successful repairs.
                </p>
              </div>
              <div className="relative mt-4">
                <select
                  value={agentModels.resolver}
                  onChange={(e) => onAgentModelChange("resolver", e.target.value)}
                  className="w-full bg-white text-zinc-800 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#006a65] appearance-none cursor-pointer pr-10"
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemma-4-26b-a4b-it">Gemma 4 26B</option>
                  <option value="gemma-4-31b-it">Gemma 4 31B</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* 4. Moderator Agent */}
            <div className="space-y-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Agent 04</span>
                <h4 className="font-bold text-sm text-zinc-800">💬 Moderator Agent</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Actively monitors the community group chat, automatically scanning and flagging toxic or unethical posts.
                </p>
              </div>
              <div className="relative mt-4">
                <select
                  value={agentModels.moderator}
                  onChange={(e) => onAgentModelChange("moderator", e.target.value)}
                  className="w-full bg-white text-zinc-800 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#006a65] appearance-none cursor-pointer pr-10"
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemma-4-26b-a4b-it">Gemma 4 26B</option>
                  <option value="gemma-4-31b-it">Gemma 4 31B</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Alert Feed */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-150">
        <h2 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2 border-b pb-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Live Alert Feed
        </h2>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {filteredReports.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No moderation reports matching location filters.</p>
          ) : (
            filteredReports.map((r, i) => (
              <div key={i} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-zinc-800">@{r.username}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.actionTaken === 'block' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.actionTaken.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 italic">"{r.flaggedMessage}"</p>
                <p className="text-xs text-zinc-500"><strong>Reason:</strong> {r.reason}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-150">
        <h2 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2 border-b pb-2">
          <Users className="w-5 h-5 text-[#006a65]" /> User Management
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input 
            type="text" 
            placeholder="Search by username..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#006a65]/50 focus:bg-white transition-all"
          />
          <div className="flex gap-2">
            <select
              value={userSortField}
              onChange={(e: any) => setUserSortField(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-[#006a65]/50 focus:bg-white cursor-pointer"
            >
              <option value="user">Sort by: User</option>
              <option value="location">Sort by: Location</option>
              <option value="warnings">Sort by: Warnings</option>
              <option value="blocked">Sort by: Blocked</option>
            </select>
            <button
              type="button"
              onClick={() => setUserSortDirection(prev => prev === "asc" ? "desc" : "asc")}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 flex items-center gap-1 cursor-pointer select-none"
            >
              {userSortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {sortedUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">No scouts found matching filters.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200 select-none">
                <tr>
                  <th className="px-4 py-3 cursor-pointer hover:text-[#006a65] transition-colors" onClick={() => handleSort("user")}>
                    <div className="flex items-center gap-1">
                      User {userSortField === "user" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-[#006a65] transition-colors" onClick={() => handleSort("location")}>
                    <div className="flex items-center gap-1">
                      Location {userSortField === "location" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-[#006a65] transition-colors" onClick={() => handleSort("warnings")}>
                    <div className="flex items-center gap-1">
                      Warnings {userSortField === "warnings" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-[#006a65] transition-colors" onClick={() => handleSort("blocked")}>
                    <div className="flex items-center gap-1">
                      Status {userSortField === "blocked" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={u.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + u.username} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-zinc-200 object-cover" />
                        <div>
                          <div className="font-bold text-zinc-800 flex items-center gap-1">
                            {u.username} {u.isAdmin && <Shield className="w-3 h-3 text-[#006a65]" />}
                          </div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 font-medium">
                      <div>{u.city || "N/A"}</div>
                      <div className="text-[10px] text-zinc-400">{u.area || "N/A"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {u.isBlocked ? (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1"><UserX className="w-3 h-3"/> Blocked</span>
                        ) : (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Active</span>
                        )}
                        <span className="text-[10px] text-zinc-500">{u.warningsCount || 0}/3 Warnings</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedChatUser(u)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100"
                      >
                        💬 View Chat
                      </button>
                      {!u.isBlocked && (u.warningsCount || 0) < 3 && (
                        <button onClick={() => handleAction(u.id, "warn")} className="px-3 py-1 bg-amber-500/10 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-500/20">Issue Warning</button>
                      )}
                      {u.isBlocked ? (
                        <button onClick={() => handleAction(u.id, "unblock")} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">Unblock</button>
                      ) : (
                        <button onClick={() => handleAction(u.id, "block")} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Block</button>
                      )}
                      {(u.warningsCount || 0) > 0 && (
                        <button onClick={() => handleAction(u.id, "reset")} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200"><RefreshCcw className="w-3 h-3 inline mr-1"/>Reset</button>
                      )}
                      {u.isAdmin ? (
                        <button onClick={() => handleAction(u.id, "removeAdmin")} className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-300">Remove Admin</button>
                      ) : (
                        <button onClick={() => handleAction(u.id, "makeAdmin")} className="px-3 py-1 bg-[#006a65]/10 text-[#006a65] rounded-lg text-xs font-bold hover:bg-[#006a65]/20">Make Admin</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dispatched Municipal Letters Panel */}
      <div id="dispatched-letters-panel" className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-150">
        <h2 className="text-lg font-bold text-zinc-800 mb-2 flex items-center gap-2 border-b pb-2">
          <span className="text-xl">🏛️</span> Dispatched Municipal Letters
        </h2>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Below are formal citizen-initiated letters compiled by the **Dispatcher Agent** and sent to authorities. Click on any letter to read the formal petition text, escalation routes, and RTI queries.
        </p>

        <div className="space-y-3">
          {cases.filter(c => c.complaintGenerated || c.status === "dispatched" || c.complaintLetter).filter(c => {
            const city = c.city || "Unknown";
            const area = c.area || "Unknown";
            if (selectedCity !== "All" && city !== selectedCity) return false;
            if (selectedArea !== "All" && area !== selectedArea) return false;
            return true;
          }).length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">No dispatched municipal letters compiled for the selected region.</p>
          ) : (
            cases.filter(c => c.complaintGenerated || c.status === "dispatched" || c.complaintLetter).filter(c => {
              const city = c.city || "Unknown";
              const area = c.area || "Unknown";
              if (selectedCity !== "All" && city !== selectedCity) return false;
              if (selectedArea !== "All" && area !== selectedArea) return false;
              return true;
            }).map((c) => {
              const displayCity = c.city || "Unknown";
              const displayArea = c.area || "Unknown";
              const latStr = c.lat !== undefined ? Number(c.lat).toFixed(4) : (c.latitude !== undefined ? Number(c.latitude).toFixed(4) : "0.0000");
              const lngStr = c.lng !== undefined ? Number(c.lng).toFixed(4) : (c.longitude !== undefined ? Number(c.longitude).toFixed(4) : "0.0000");
              const displayDamage = (c.damageType || "Infrastructure Issue").replace("_", " ").toUpperCase();
              
              return (
                <div
                  key={c.id}
                  id={`letter-case-${c.id}`}
                  onClick={() => setSelectedLetterCase(c)}
                  className="p-4 bg-[#FAF8F5] border border-zinc-200 hover:border-[#006a65]/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-white hover:shadow-md transition-all group"
                >
                  {/* Left Side: Damage Mentioned */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#006a65]" />
                      <span className="font-extrabold text-sm text-zinc-800 uppercase tracking-wide group-hover:text-[#006a65] transition-colors">
                        {displayDamage}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 font-medium pl-4 line-clamp-1 italic">
                      "{c.description || "No description provided."}"
                    </p>
                  </div>

                  {/* Right Side: Location with City, Area & Coordinates */}
                  <div className="text-xs text-zinc-500 font-mono text-right flex flex-col items-end whitespace-nowrap self-stretch sm:self-auto justify-center">
                    <span className="font-sans font-bold text-zinc-700">
                      {displayCity}, {displayArea}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase mt-0.5">
                      📍 ({latStr}, {lngStr})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User-Agent Chat Modal */}
      {selectedChatUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col h-[550px] overflow-hidden border border-zinc-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div className="flex items-center gap-2">
                <img
                  src={selectedChatUser.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + selectedChatUser.username}
                  alt=""
                  className="w-10 h-10 rounded-full border border-zinc-200"
                />
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    Chat Audit: @{selectedChatUser.username}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {selectedChatUser.warningsCount || 0}/3 Warnings • {selectedChatUser.city || "No City"} ({selectedChatUser.area || "No Area"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChatUser(null)}
                className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Message list */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#FDFBF7] space-y-4">
              {userChatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs text-center gap-1">
                  <span>💬 No direct chat history found for this scout.</span>
                  <span>When they send messages, flagged logs will appear here.</span>
                </div>
              ) : (
                userChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 p-3.5 rounded-2xl border text-xs max-w-[85%] ${
                      msg.type === "ai_warning"
                        ? "bg-red-50 border-red-100 text-red-900 mr-auto align-left"
                        : msg.type === "unethical"
                        ? "bg-amber-50 border-amber-200 text-amber-950 ml-auto align-right ring-1 ring-amber-300 border-dashed"
                        : "bg-white border-zinc-200 text-zinc-800 ml-auto align-right"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-4 text-[10px] font-bold text-zinc-400">
                      <span className={msg.type === "ai_warning" ? "text-red-700" : msg.type === "unethical" ? "text-amber-700" : "text-zinc-600"}>
                        {msg.type === "ai_warning" 
                          ? "🛡️ CS AI-agent" 
                          : msg.type === "unethical"
                          ? `⚠️ FLAGGED CHAT`
                          : `@${selectedChatUser.username}`}
                      </span>
                      <span>
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                    <p className={`mt-1 font-medium leading-relaxed ${msg.type === "unethical" ? "text-amber-900 line-through decoration-amber-400/50 decoration-2" : ""}`}>
                      {msg.text}
                    </p>
                    {msg.type === "unethical" && (
                      <span className="text-[9px] text-amber-800 font-extrabold mt-1 uppercase tracking-wider block">
                        🚫 Blocked from public stream
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
              <div className="text-xs">
                {selectedChatUser.isBlocked ? (
                  <span className="text-red-600 font-bold flex items-center gap-1">
                    <UserX className="w-3.5 h-3.5" /> Temporarily Blocked
                  </span>
                ) : (
                  <span className="text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Account Active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {selectedChatUser.isBlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleAction(selectedChatUser.id, "unblock");
                      setSelectedChatUser(prev => prev ? { ...prev, isBlocked: false } : null);
                    }}
                    className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Unblock Scout
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleAction(selectedChatUser.id, "block");
                      setSelectedChatUser(prev => prev ? { ...prev, isBlocked: true } : null);
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Block Scout
                  </button>
                )}
                {(selectedChatUser.warningsCount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAction(selectedChatUser.id, "reset");
                      setSelectedChatUser(prev => prev ? { ...prev, warningsCount: 0 } : null);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCcw className="w-3 h-3" /> Reset Warnings
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formal Petition Letter Viewer Modal */}
      {selectedLetterCase && (
        <div id="selected-letter-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-zinc-150">
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">
                    Formal Municipal Petition
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    Official complaint directive compiled via Gemini Dispatcher
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLetterCase(null)}
                className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Letter Content Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FCFBF9] space-y-5">
              {/* Subject Banner */}
              <div className="bg-[#fff9eb] border border-[#f0c040]/30 p-4 rounded-2xl">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">SUBJECT REGISTRATION</span>
                <p className="text-xs font-black text-[#775a00] mt-1 leading-relaxed">
                  {selectedLetterCase.subject || `Formal Request for Civic Maintenance: ${selectedLetterCase.damageType}`}
                </p>
              </div>

              {/* The Official Letter */}
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-inner font-mono text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                {selectedLetterCase.complaintLetter || selectedLetterCase.complaintText || "No compiled petition text available."}
              </div>

              {/* Escalation Path & RTI Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#f0f4f8] border border-blue-100 p-4 rounded-2xl text-[11px] leading-relaxed">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider mb-1">30-DAY ESCALATION PROTOCOL</span>
                  <p className="text-zinc-700 font-medium">
                    {selectedLetterCase.escalationPath || "Ward-level administrative escalation via State Grievance Portal."}
                  </p>
                </div>
                <div className="bg-[#f2fcf5] border border-green-100 p-4 rounded-2xl text-[11px] leading-relaxed">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider mb-1">RTI TRANSPARENCY QUERY</span>
                  <p className="text-zinc-700 font-medium italic">
                    "{selectedLetterCase.rtiQuery || "Under Section 6(1) of the RTI Act, request designation details of civil engineers assigned to this ward."}"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLetterCase(null)}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Petition
              </button>
              <button
                type="button"
                id="btn-copy-petition"
                onClick={() => {
                  const txt = selectedLetterCase.complaintLetter || selectedLetterCase.complaintText || "";
                  navigator.clipboard.writeText(txt);
                  alert("Petition letter copied to clipboard!");
                }}
                className="px-4 py-2 bg-[#006a65] hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Copy Full Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
