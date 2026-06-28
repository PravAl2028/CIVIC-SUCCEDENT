import React, { useEffect, useState, useRef } from "react";
import { 
  Navigation, Camera, AlertOctagon, AlertTriangle, HelpCircle, ShieldCheck, Zap, Sun, Moon, 
  Coins, Landmark, ChevronUp, ChevronDown, CheckCircle2, Hammer, ArrowRight, X, Sparkles,
  Locate, Layers, Compass, Trophy
} from "lucide-react";
import GameMap, { getMarkerBg } from "../game/GameMap";
import { Case, UserProfile, Hood } from "../../lib/constants";
import { db } from "../../firebase";
import HomePinningModal from "../game/HomePinningModal";

interface GameViewProps {
  key?: string;
  cases: Case[];
  user: UserProfile;
  hood: Hood | null;
  playerPos: { lat: number; lng: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  onVerifyCase: (caseId: string, vote?: "yes" | "no" | "undo" | "proof") => void;
  onResolveCase: (caseId: string) => void;
  onTriggerScan: () => void;
  
  // Empire-related props
  empireBuildings: any[];
  onCollectIncome: (buildingId: string) => void;
  onUpgradeScoutHouse: (buildingId: string) => void;
  onBuyBuilding: (type: string, lat: number, lng: number) => void;
  onUpgradeHQ?: (field: string, cost: number) => void;
  publicBases?: any[];

  selectedCaseIdFromChat?: string | null;
  setSelectedCaseIdFromChat?: (caseId: string | null) => void;
  onPinHQ: (lat: number, lng: number) => Promise<void>;
}

export default function GameView({
  cases,
  user,
  hood,
  playerPos,
  setPlayerPos,
  onVerifyCase,
  onResolveCase,
  onTriggerScan,
  empireBuildings,
  onCollectIncome,
  onUpgradeScoutHouse,
  onBuyBuilding,
  onUpgradeHQ,
  publicBases = [],
  selectedCaseIdFromChat,
  setSelectedCaseIdFromChat,
  onPinHQ
}: GameViewProps) {
  // Filter out admin estates for non-admin users in sim mode
  const visibleBases = (user?.isAdmin ? publicBases : publicBases.filter((b: any) => !b.isAdmin));
  const [patrolMode, setPatrolMode] = useState<"patrol" | "sim">("patrol");
  const [mapTheme, setMapTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("patrol_grid_map_theme") as "dark" | "light") || "light";
  });
  const [zoom, setZoom] = useState(17);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const hasSetInitialGps = useRef(false);
  const [isAutoCentering, setIsAutoCentering] = useState(true);

  // Sim mode sector states
  const [simSectorMode, setSimSectorMode] = useState<"hq" | "public">("hq");
  const [simSectorToast, setSimSectorToast] = useState<string | null>(null);
  const [controlPanelTab, setControlPanelTab] = useState<"base" | "utilities" | "prestige">("base");
  const [showEstateLeaderboard, setShowEstateLeaderboard] = useState(false);
  const [estateFilter, setEstateFilter] = useState<"all" | "city" | "area">("all");
  const [placingNewHome, setPlacingNewHome] = useState(false);

  // Empire state managers
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showFullModal, setShowFullModal] = useState(false);
  const [placingBuildingType, setPlacingBuildingType] = useState<string | null>(null);
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const [liveAccumulated, setLiveAccumulated] = useState<number>(0);

  const [reporterName, setReporterName] = useState<string>("Loading...");
  const [verifiersNames, setVerifiersNames] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedCase) {
      setReporterName("Loading...");
      setVerifiersNames([]);
      return;
    }

    const fetchUserNames = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase');
        
        // Fetch reporter
        const reporterSnap = await getDoc(doc(db, "users", selectedCase.reportedBy));
        if (reporterSnap.exists()) {
          setReporterName(reporterSnap.data()?.username || reporterSnap.data()?.displayName || "Scout");
        } else {
          setReporterName("Unknown Scout");
        }

        // Fetch verifiers
        if (selectedCase.verifiedBy && selectedCase.verifiedBy.length > 0) {
          const names: string[] = [];
          for (const vid of selectedCase.verifiedBy) {
            const vSnap = await getDoc(doc(db, "users", vid));
            if (vSnap.exists()) {
              names.push(vSnap.data()?.username || vSnap.data()?.displayName || "Scout");
            }
          }
          setVerifiersNames(names);
        } else {
          setVerifiersNames([]);
        }
      } catch (err) {
        console.error("Error fetching usernames for case:", err);
        setReporterName("Scout");
        setVerifiersNames([]);
      }
    };

    fetchUserNames();
  }, [selectedCase]);

  // Listen for case selection from chat redirection
  useEffect(() => {
    if (selectedCaseIdFromChat) {
      const found = cases.find(c => c.id === selectedCaseIdFromChat);
      if (found) {
        setSelectedCase(found);
        setShowFullModal(true);
        setPatrolMode("patrol");
        if (setSelectedCaseIdFromChat) {
          setSelectedCaseIdFromChat(null);
        }
      }
    }
  }, [selectedCaseIdFromChat, cases, setSelectedCaseIdFromChat]);

  // Live roll-up calculator for selected building's passive income
  useEffect(() => {
    if (!selectedBuilding) {
      setLiveAccumulated(0);
      return;
    }

    const calculateAccumulated = () => {
      // Find building's latest data from list
      const latestB = empireBuildings.find(b => b.id === selectedBuilding.id || b.id === "hq_details" || b.id === "scout_house_hq" || b.type === "hq_base") || selectedBuilding;
      const lastClaimed = new Date(latestB.lastClaimedAt || latestB.builtAt || new Date().toISOString());
      const now = new Date();
      const hoursElapsed = Math.max(0, (now.getTime() - lastClaimed.getTime()) / 3600000);
      
      let totalRate = 5;
      if (latestB.id === "hq_details" || latestB.type === "hq_base") {
        const baseLvl = latestB.baseLevel || 1;
        const solarLvl = latestB.solarGridLevel || 0;
        const repairLvl = latestB.repairDepotLevel || 0;
        const techLvl = latestB.techLabLevel || 0;

        const baseRate = baseLvl === 1 ? 5 : baseLvl === 2 ? 15 : 40;
        const solarRate = solarLvl === 1 ? 10 : solarLvl === 2 ? 25 : solarLvl === 3 ? 50 : 0;
        const repairRate = repairLvl === 1 ? 25 : repairLvl === 2 ? 60 : repairLvl === 3 ? 120 : 0;
        const techRate = techLvl === 1 ? 75 : techLvl === 2 ? 180 : techLvl === 3 ? 350 : 0;

        totalRate = baseRate + solarRate + repairRate + techRate;
      } else {
        totalRate = latestB.incomePerHr || 5;
      }

      const coins = Math.floor(hoursElapsed * totalRate);
      setLiveAccumulated(coins);
    };

    calculateAccumulated();
    const interval = setInterval(calculateAccumulated, 1000);
    return () => clearInterval(interval);
  }, [selectedBuilding, empireBuildings]);

  // Geolocation Real-Time GPS Tracking Engine (Only active in patrol view)
  useEffect(() => {
    if (patrolMode !== "patrol") {
      setGpsError(null);
      return;
    }

    hasSetInitialGps.current = false;
    let watchId: number | null = null;

    if (navigator.geolocation) {
      setGpsError(null);
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPlayerPos({ lat: latitude, lng: longitude });
          
          if (!hasSetInitialGps.current) {
            setZoom(17);
            hasSetInitialGps.current = true;
          }
        },
        (error) => {
          console.error("GPS Tracking system error:", error);
          let errMsg = "GPS signal unavailable.";
          if (error.code === error.PERMISSION_DENIED) {
            errMsg = "Location tracking permission was denied by the browser.";
          }
          setGpsError(errMsg);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000
        }
      );
    } else {
      setGpsError("HTML5 Geolocation is not supported by your browser.");
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [patrolMode, setPlayerPos]);

  // Handle building purchase placement click
  const handleMapClickForPlacement = async (lat: number, lng: number) => {
    if (placingNewHome) {
      if (simSectorMode !== "public") {
        setSimSectorMode("public");
        setSimSectorToast("Switched to Public Sector — tap a free spot to place your new home!");
        setTimeout(() => setSimSectorToast(null), 4000);
        return;
      }
      
      // Calculate distance from all other public bases to prevent overlap (must be >= 50m)
      const tooClose = publicBases.some(b => {
        if (b.uid === user.userId) return false;
        if (!b.homeLatitude || !b.homeLongitude) return false;
        const R = 6371e3; // metres
        const lat1 = lat * Math.PI / 180;
        const lat2 = b.homeLatitude * Math.PI / 180;
        const deltaLat = (b.homeLatitude - lat) * Math.PI / 180;
        const deltaLng = (b.homeLongitude - lng) * Math.PI / 180;
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance < 50;
      });

      if (tooClose) {
        alert("Too close! The location intersects with another player's property. Please choose a spot at least 50 meters away.");
        return;
      }

      if ((user.coins || 0) < 500) {
        alert("Insufficient Coins! Relocating your base costs 500 Coins.");
        setPlacingNewHome(false);
        return;
      }

      try {
        const { doc, updateDoc, increment } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.userId);
        const hqRef = doc(db, `users/${user.userId}/empire`, "hq_details");

        await updateDoc(userRef, {
          homeLatitude: lat,
          homeLongitude: lng,
          coins: increment(-500)
        });

        await updateDoc(hqRef, {
          latitude: lat,
          longitude: lng
        });

        alert("Congratulations! Your main headquarters has been successfully relocated to the new coordinates.");
      } catch (err) {
        console.error("Relocation failed:", err);
        alert("Failed to relocate base. Please try again.");
      }

      setPlacingNewHome(false);
    } else if (placingBuildingType) {
      onBuyBuilding(placingBuildingType, lat, lng);
      setPlacingBuildingType(null);
    }
  };

  // Close building modal and reset selection
  const handleCloseBuildingModal = () => {
    setSelectedBuilding(null);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Sim Sector Mode Toast Notification */}
      {simSectorToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-zinc-950/95 border border-cyan-400/40 text-cyan-400 px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest shadow-2xl backdrop-blur-md animate-bounce">
          📡 {simSectorToast}
        </div>
      )}

      {/* Background Live Map Grid */}
      <div className="absolute inset-0 w-full h-full">
        <GameMap
          cases={cases}
          playerPos={playerPos}
          zoom={zoom}
          onVerifyCase={onVerifyCase}
          onResolveCase={onResolveCase}
          userId={user.userId}
          setPlayerPos={setPlayerPos}
          mapTheme={mapTheme}
          patrolMode={patrolMode}
          homeLatitude={user.homeLatitude}
          homeLongitude={user.homeLongitude}
          empireBuildings={empireBuildings}
          onSelectBuilding={(b) => setSelectedBuilding(b)}
          onMapClickForPlacement={handleMapClickForPlacement}
          placingBuildingType={placingBuildingType}
          onSelectCase={(c) => {
            setSelectedCase(c);
            setShowFullModal(true);
          }}
          isAutoCentering={isAutoCentering}
          setIsAutoCentering={setIsAutoCentering}
          simSectorMode={simSectorMode}
          publicBases={visibleBases}
          placingNewHome={placingNewHome}
        />
      </div>

      {/* Top Floating Heads-Up Display (HUD) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Patrol Mode Layout (Unified, responsive, exactly as original) or Desktop Layout */}
        {(patrolMode === "patrol") ? (
          <div className="flex justify-between items-center w-full gap-2 pointer-events-auto">
            {/* HUD Left: Compact Profile Stats */}
            <div className="flex items-center gap-2 min-w-0">
              <div 
                onClick={() => { window.location.hash = "profile"; }}
                className="bg-zinc-950/90 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 md:gap-2.5 min-w-0 max-w-[45vw] md:max-w-none cursor-pointer hover:bg-zinc-900/90 transition-colors"
              >
                <img
                  src={user.photoURL}
                  alt="user avatar"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border-2 border-yellow-400 object-cover flex-shrink-0"
                />
                <div className="leading-tight min-w-0">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <span className="font-extrabold text-xs text-white truncate max-w-[55px] md:max-w-[85px]">{user.displayName}</span>
                    <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-black uppercase py-0.5 leading-none flex-shrink-0">
                      {user.rank}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-yellow-400 font-mono block -mt-0.5">{user.xp} XP</span>
                </div>
              </div>
            </div>

            {/* HUD Right: Mode Toggles & Theme */}
            <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
              <div className="bg-zinc-950/95 backdrop-blur-md p-0.5 md:p-1 rounded-2xl border border-zinc-800 shadow-2xl flex items-center gap-1">
                <button
                  onClick={() => {
                    setPatrolMode("patrol");
                    setPlacingBuildingType(null);
                  }}
                      className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                        true
                          ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      📡 PATROL
                    </button>
                    <button
                      onClick={() => setPatrolMode("sim")}
                      className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                        false
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-500/15"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  🕹️ SIM MODE
                </button>
              </div>

              <button
                onClick={() => {
                  const nextTheme = mapTheme === "dark" ? "light" : "dark";
                  setMapTheme(nextTheme);
                  localStorage.setItem("patrol_grid_map_theme", nextTheme);
                }}
                className="p-1.5 md:p-2.5 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xl"
                title="Toggle Map Style"
              >
                {mapTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop SIM Mode HUD Layout (Hidden on Mobile) */}
            <div className="hidden md:flex justify-between items-center w-full flex-nowrap gap-2 pointer-events-none">
              {/* HUD Left: Compact Profile Stats & Economy */}
              <div className="flex items-center gap-2 pointer-events-none">
                <div
                  onClick={() => { window.location.hash = "profile"; }}
                  className="bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-2.5 pointer-events-auto cursor-pointer hover:bg-zinc-900/90 transition-colors"
                >
                  <img
                    src={user.photoURL}
                    alt="user avatar"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border-2 border-yellow-400 object-cover"
                  />
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-white truncate max-w-[85px]">{user.displayName}</span>
                      <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-black uppercase py-0.5 leading-none">
                        {user.rank}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-yellow-400 font-mono block -mt-0.5">{user.xp} XP</span>
                  </div>
                </div>

                {/* Coins Balance Indicator */}
                <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 pointer-events-auto">
                  <Coins className="w-4 h-4 text-yellow-400 animate-bounce" />
                  <div className="leading-none">
                    <span className="text-[10px] font-black text-white font-mono block">{user.coins || 0}</span>
                    <span className="text-[6px] font-bold text-zinc-400 uppercase tracking-widest">COINS</span>
                  </div>
                </div>

                {/* Empire Valuation Stats */}
                {user.homePinned && (
                  <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 hidden sm:flex pointer-events-auto">
                    <Landmark className="w-4 h-4 text-teal-400" />
                    <div className="leading-none">
                      <span className="text-[10px] font-black text-teal-400 font-mono block">{user.empireValuation || 200}</span>
                      <span className="text-[6px] font-bold text-zinc-400 uppercase tracking-widest">VALUATION</span>
                    </div>
                  </div>
                )}
              </div>

              {/* HUD Right: Mode Toggle Selector */}
              <div className="flex items-center gap-1.5 pointer-events-none">
                <div className="bg-zinc-950/95 backdrop-blur-md p-1 rounded-2xl border border-zinc-800 shadow-2xl flex items-center gap-1 pointer-events-auto">
                  <button
                    onClick={() => {
                      setPatrolMode("patrol");
                      setPlacingBuildingType(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      false
                        ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    📡 PATROL
                  </button>
                  <button
                    onClick={() => setPatrolMode("sim")}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      true
                        ? "bg-teal-600 text-white shadow-lg shadow-teal-500/15"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🕹️ SIM MODE
                  </button>
                </div>

                {/* Theme Selector */}
                <button
                  onClick={() => {
                    const nextTheme = mapTheme === "dark" ? "light" : "dark";
                    setMapTheme(nextTheme);
                    localStorage.setItem("patrol_grid_map_theme", nextTheme);
                  }}
                  className="p-2.5 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xl pointer-events-auto"
                  title="Toggle Map Style"
                >
                  {mapTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
                </button>
              </div>
            </div>

            {/* Mobile/Phone SIM Mode Layout (Unified structure, Coins & Valuation both beside one another below user div block) */}
            <div className="flex justify-between items-start w-full pointer-events-none gap-2 md:hidden">
              {/* Left Column: Profile Info (strictly < 45vw) & Stats below it */}
              <div className="flex flex-col gap-1.5 items-start pointer-events-none">
                {/* Profile Info Card (Exact match to Patrol mode style, with max-width restriction) */}
                <div
                  onClick={() => { window.location.hash = "profile"; }}
                  className="bg-zinc-950/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 pointer-events-auto min-w-0 max-w-[45vw] cursor-pointer hover:bg-zinc-900/90 transition-colors"
                >
                  <img
                    src={user.photoURL}
                    alt="user avatar"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border-2 border-yellow-400 object-cover flex-shrink-0"
                  />
                  <div className="leading-tight min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs text-white truncate max-w-[55px]">{user.displayName}</span>
                      <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-black uppercase py-0.5 leading-none flex-shrink-0">
                        {user.rank}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-yellow-400 font-mono block -mt-0.5">{user.xp} XP</span>
                  </div>
                </div>

                {/* Coins & Valuation Row directly below User Info Card */}
                <div className="flex items-center gap-1.5 pointer-events-none">
                  {/* Coins Block (Replicated style of patrol/desktop stats) */}
                  <div className="bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 pointer-events-auto">
                    <Coins className="w-3.5 h-3.5 text-yellow-400 animate-bounce flex-shrink-0" />
                    <div className="leading-none">
                      <span className="text-[9px] font-black text-white font-mono block">{user.coins || 0}</span>
                      <span className="text-[5px] font-bold text-zinc-400 uppercase tracking-widest">COINS</span>
                    </div>
                  </div>

                  {/* Valuation Block (Replicated style of patrol/desktop stats) */}
                  {user.homePinned && (
                    <div className="bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 pointer-events-auto">
                      <Landmark className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                      <div className="leading-none">
                        <span className="text-[9px] font-black text-teal-400 font-mono block">{user.empireValuation || 200}</span>
                        <span className="text-[5px] font-bold text-zinc-400 uppercase tracking-widest">VALUATION</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Mode Toggles and Theme Toggles side-by-side, matching Patrol Mode Layout */}
              <div className="flex items-center gap-1 pointer-events-none flex-shrink-0">
                {/* Mode Selector (Exactly matched sizing & classes of Patrol) */}
                <div className="bg-zinc-950/95 backdrop-blur-md p-0.5 rounded-2xl border border-zinc-800 shadow-2xl flex items-center gap-1 pointer-events-auto">
                  <button
                    onClick={() => {
                      setPatrolMode("patrol");
                      setPlacingBuildingType(null);
                    }}
                    className={`px-2 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      false
                        ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    📡 PATROL
                  </button>
                  <button
                    onClick={() => setPatrolMode("sim")}
                    className={`px-2 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      true
                        ? "bg-teal-600 text-white shadow-lg shadow-teal-500/15"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🕹️ SIM MODE
                  </button>
                </div>

                {/* Theme Selector (Exactly matched sizing & classes of Patrol) */}
                <button
                  onClick={() => {
                    const nextTheme = mapTheme === "dark" ? "light" : "dark";
                    setMapTheme(nextTheme);
                    localStorage.setItem("patrol_grid_map_theme", nextTheme);
                  }}
                  className="p-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xl pointer-events-auto"
                  title="Toggle Map Style"
                >
                  {mapTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
                </button>

              </div>
            </div>
          </>
        )}

        {/* Building Placement Instruction Banner */}
        {placingBuildingType && (
          <div className="w-full bg-yellow-400 text-black p-3 rounded-2xl shadow-2xl pointer-events-auto border border-yellow-500 font-extrabold text-xs flex justify-between items-center max-w-md mx-auto animate-bounce mt-1">
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4 animate-spin-slow" />
              <span>TAP THE MAP within 150m of your Headquarters to place structure!</span>
            </div>
            <button 
              onClick={() => setPlacingBuildingType(null)}
              className="text-black bg-white/20 hover:bg-white/40 p-1.5 rounded-lg text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* New Home Relocation Instruction Banner */}
        {placingNewHome && (
          <div className="w-full bg-[#7f00ff] text-white p-3 rounded-2xl shadow-2xl pointer-events-auto border border-[#7f00ff]/50 font-extrabold text-[10px] flex justify-between items-center max-w-md mx-auto animate-bounce mt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
              <span>TAP THE MAP in Public Sector mode to build your new home base (costs 500 Coins, must be 50m away from others)!</span>
            </div>
            <button 
              onClick={() => setPlacingNewHome(false)}
              className="text-white bg-white/20 hover:bg-white/40 p-1.5 rounded-lg text-xs flex-shrink-0 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected Case Quick Preview Banner at the Top */}
        {selectedCase && !showFullModal && (
          <div 
            onClick={() => setShowFullModal(true)}
            className="w-full bg-zinc-950/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center justify-between gap-3 max-w-md mx-auto pointer-events-auto cursor-pointer hover:bg-zinc-900/95 transition-all text-left animate-in slide-in-from-top-4 duration-200 mt-1"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getMarkerBg(selectedCase.damageType, selectedCase.status)}`} />
              <div className="min-w-0 leading-tight">
                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">
                  {(selectedCase.damageType || "").replace("_", " ")}
                </span>
                <p className="text-xs font-semibold text-white truncate">
                  {selectedCase.description || "No description provided."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[8px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                Tap to view
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCase(null);
                }}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Geolocation Warning Banner */}
      {gpsError && patrolMode === "patrol" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md text-center max-w-[280px] w-full">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2 animate-pulse" />
          <h3 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Location Access Required</h3>
          <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">{gpsError}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setGpsError(null);
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setPlayerPos({ lat: position.coords.latitude, lng: position.coords.longitude });
                    },
                    (err) => {
                      console.error("GPS retry error:", err);
                      let errMsg = "GPS signal unavailable.";
                      if (err.code === err.PERMISSION_DENIED) {
                        errMsg = "Location tracking permission was denied by the browser.";
                      }
                      setGpsError(errMsg);
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                  );
                }
              }}
              className="w-full bg-[#006a65] text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-teal-700 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Retry GPS Access
            </button>
          </div>
        </div>
      )}

      {/* Map Center Coordinates HUD Banner (Only in Patrol mode) */}
      {patrolMode === "patrol" && (
        <div className="absolute bottom-[96px] left-3 z-10 bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 shadow-xl flex items-center gap-2.5">
          <Navigation className="w-3.5 h-3.5 text-yellow-400 rotate-45" style={{ fill: "currentColor" }} />
          <span className="text-[9px] font-mono font-bold text-white leading-none">
            LAT: <span className="text-yellow-400">{playerPos.lat.toFixed(5)}</span> | LNG: <span className="text-yellow-400">{playerPos.lng.toFixed(5)}</span>
          </span>
        </div>
      )}



      {/* Bottom Floating Control: Big Radar SCAN Button (Only in Patrol View) */}
      {patrolMode === "patrol" && (
        <div className="absolute bottom-[96px] right-3 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3 select-none pointer-events-auto">
            {/* Recenter to GPS Button - Placed above the Scan button, stable and perfectly aligned */}
            <button
              type="button"
              onClick={() => {
                setIsAutoCentering(true);
                setZoom(19);
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center border shadow-xl cursor-pointer transition-all duration-300 active:scale-95 group hover:scale-105 bg-white ${
                isAutoCentering
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-zinc-200 text-zinc-600 hover:border-emerald-500/50"
              }`}
              title="Recenter to GPS"
              id="btn-recenter-patrol-gps"
            >
              <Locate className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>

            {/* Scan Button & Label */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onTriggerScan}
                className="w-14 h-14 bg-yellow-400 hover:bg-yellow-350 active:scale-90 rounded-full flex flex-col justify-center items-center text-black border-2 border-zinc-950 shadow-2xl hover:scale-105 transition-all cursor-pointer relative"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">SCAN</span>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
              </button>
              <span className="bg-zinc-950/90 backdrop-blur-sm text-[7px] text-zinc-300 font-extrabold px-2 py-0.5 rounded-full border border-zinc-800/80 uppercase tracking-widest leading-none">
                DEFECT DETECTOR
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Sim Mode Floating Buttons: Layer and Leaderboard */}
      {patrolMode === "sim" && (
        <div className="absolute bottom-[96px] right-3 z-10 flex flex-col gap-3 pointer-events-auto select-none">
          {/* Layer button */}
          <button
            onClick={() => {
              const nextSector = simSectorMode === "hq" ? "public" : "hq";
              setSimSectorMode(nextSector);
              setSimSectorToast(nextSector === "hq" ? "HQ Sector Mode" : "Public Sector Mode");
              setTimeout(() => setSimSectorToast(null), 3000);
            }}
            className="w-16 h-16 bg-zinc-950/95 border border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-1 shadow-2xl transition-all active:scale-95 hover:scale-105 cursor-pointer text-zinc-300 hover:text-white"
          >
            <div className={`p-1.5 rounded-full ${simSectorMode === "public" ? "bg-cyan-500/20 text-[#00f2fe]" : "bg-purple-500/20 text-[#7f00ff]"}`}>
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[7.5px] font-black uppercase tracking-widest block">LAYER</span>
          </button>

          {/* Leaderboard button */}
          <button
            onClick={() => {
              setShowEstateLeaderboard(true);
            }}
            className="w-16 h-16 bg-zinc-950/95 border border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-1 shadow-2xl transition-all active:scale-95 hover:scale-105 cursor-pointer text-zinc-300 hover:text-white"
          >
            <div className="p-1.5 rounded-full bg-amber-500/20 text-yellow-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[7.5px] font-black uppercase tracking-widest block">LEADER</span>
          </button>
        </div>
      )}





      {/* INTERACTIVE BUILDING DETAILS / UPGRADE MODAL */}
      {selectedBuilding && (() => {
        const hqData = empireBuildings.find(b => b.id === "hq_details" || b.id === "scout_house_hq" || b.type === "hq_base") || selectedBuilding;
        const baseLvl = hqData?.baseLevel || 1;
        const solarLvl = hqData?.solarGridLevel || 0;
        const repairLvl = hqData?.repairDepotLevel || 0;
        const techLvl = hqData?.techLabLevel || 0;
        const cruiserLvl = hqData?.ecoCruiserLevel || 0;
        const statueLvl = hqData?.heroStatueLevel || 0;
        const valuation = hqData?.valuation || 200;

        const baseRate = baseLvl === 1 ? 5 : baseLvl === 2 ? 15 : 40;
        const solarRate = solarLvl === 1 ? 10 : solarLvl === 2 ? 25 : solarLvl === 3 ? 50 : 0;
        const repairRate = repairLvl === 1 ? 25 : repairLvl === 2 ? 60 : repairLvl === 3 ? 120 : 0;
        const techRate = techLvl === 1 ? 75 : techLvl === 2 ? 180 : techLvl === 3 ? 350 : 0;

        const totalRate = baseRate + solarRate + repairRate + techRate;

        // Upgrade costs
        const baseUpgradeCost = baseLvl === 1 ? 300 : baseLvl === 2 ? 1000 : 0;
        const solarUpgradeCost = solarLvl === 0 ? 150 : solarLvl === 1 ? 300 : solarLvl === 2 ? 600 : 0;
        const repairUpgradeCost = repairLvl === 0 ? 300 : repairLvl === 1 ? 600 : repairLvl === 2 ? 1200 : 0;
        const techUpgradeCost = techLvl === 0 ? 800 : techLvl === 1 ? 1600 : techLvl === 2 ? 3200 : 0;
        const cruiserUpgradeCost = cruiserLvl === 0 ? 500 : cruiserLvl === 1 ? 1000 : cruiserLvl === 2 ? 2000 : 0;
        const statueUpgradeCost = statueLvl === 0 ? 1500 : statueLvl === 1 ? 3000 : statueLvl === 2 ? 6000 : 0;

        return (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div 
              className="rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl flex flex-col max-h-[88vh] border border-white/10 text-white animate-in zoom-in-95 duration-150"
              style={{
                backdropFilter: "blur(16px)",
                background: "rgba(16, 16, 24, 0.8)",
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800/80 bg-gradient-to-r from-teal-500/10 to-transparent flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  <div>
                    <h4 className="font-display font-black text-xs uppercase tracking-widest text-[#00f2fe]">
                      HQ Control Panel
                    </h4>
                    <p className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-wider font-mono">
                      Valuation: <span className="text-teal-400 font-mono">{valuation} 🪙</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseBuildingModal}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Passive Income Claim Area */}
              <div className="p-4 bg-zinc-950/45 border-b border-zinc-850 flex items-center justify-between gap-3">
                <div className="leading-tight">
                  <span className="text-[7px] font-black text-[#00f2fe] uppercase tracking-widest block mb-0.5">Telemetry Coin Flow</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                    <span className="text-lg font-black font-mono leading-none">{liveAccumulated}</span>
                  </div>
                  <span className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider">Rate: +{totalRate}/hr</span>
                </div>
                <button
                  onClick={() => {
                    onCollectIncome(hqData.id);
                    handleCloseBuildingModal();
                  }}
                  disabled={liveAccumulated <= 0}
                  className={`py-2 px-3.5 rounded-xl font-black text-[9px] uppercase tracking-wider shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                    liveAccumulated > 0 
                      ? "bg-gradient-to-r from-[#00f2fe] to-[#7f00ff] text-white cursor-pointer" 
                      : "bg-zinc-850 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Collect
                </button>
              </div>

              {/* Tabs Selector */}
              <div className="flex border-b border-zinc-850 bg-zinc-950/20 p-1">
                {(["base", "utilities", "prestige"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setControlPanelTab(tab)}
                    className={`flex-1 py-2 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      controlPanelTab === tab
                        ? "bg-[#7f00ff]/20 text-[#00f2fe] border border-[#00f2fe]/20 shadow-inner"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab === "base" ? "🏰 Base" : tab === "utilities" ? "🛠️ Utilities" : "🏆 Prestige"}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1 max-h-[50vh]">
                
                {/* 1. Base Upgrade Tab */}
                {controlPanelTab === "base" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl">
                      <h5 className="font-extrabold text-xs text-white mb-1.5 uppercase">HQ Base Structure</h5>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Your base represents your municipal authority. Upgrading unlocks new designs and boosts passive coin generation.
                      </p>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950 p-3.5 rounded-2xl border border-zinc-850">
                      <div className="leading-tight">
                        <span className="text-[8px] text-zinc-500 uppercase block">Current Base</span>
                        <span className="text-xs font-black text-yellow-400">
                          {baseLvl === 1 ? "Lvl 1 (Stone Cabin)" : baseLvl === 2 ? "Lvl 2 (Modern Villa)" : "Lvl 3 (Municipal Tower)"}
                        </span>
                        <span className="text-[8px] text-teal-400 block mt-0.5">Passive: +{baseRate} Coins/hr</span>
                      </div>
                      <span className="text-2xl">{baseLvl === 3 ? "🏰" : baseLvl === 2 ? "🏡" : "🏠"}</span>
                    </div>

                    {baseLvl >= 3 ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                          👑 MAXIMUM LEVEL REACHED
                        </div>
                        <div className="border-t border-zinc-850 pt-4">
                          <button
                            onClick={() => {
                              setPlacingNewHome(true);
                              handleCloseBuildingModal();
                            }}
                            disabled={user.coins < 500}
                            className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                              user.coins >= 500
                                ? "bg-gradient-to-r from-[#00f2fe] to-[#7f00ff] text-white hover:opacity-90 shadow-md shadow-[#7f00ff]/10"
                                : "bg-zinc-800 text-zinc-500 border border-zinc-750 cursor-not-allowed"
                            }`}
                          >
                            🏠 Build New Home Location (500 Coins)
                          </button>
                          <p className="text-[8px] text-zinc-500 text-center mt-1.5 leading-relaxed">
                            Relocate your operations base to any non-intersecting spot in Public Sector mode.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (onUpgradeHQ) {
                            onUpgradeHQ("baseLevel", baseUpgradeCost);
                            handleCloseBuildingModal();
                          }
                        }}
                        disabled={user.coins < baseUpgradeCost}
                        className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer ${
                          user.coins >= baseUpgradeCost
                            ? "bg-yellow-400 text-black hover:bg-yellow-350 shadow-md shadow-yellow-400/10"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-750 cursor-not-allowed"
                        }`}
                      >
                        Upgrade Base to Lvl {baseLvl + 1} ({baseUpgradeCost} Coins)
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Utilities Tab */}
                {controlPanelTab === "utilities" && (
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    {/* Solar Grid */}
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-3">
                      <div className="leading-tight">
                        <h5 className="font-extrabold text-[11px] text-white">☀️ Solar Grid (Lvl {solarLvl}/3)</h5>
                        <p className="text-[8px] text-zinc-400 mt-0.5 leading-relaxed">Roof solar grid generates green power.</p>
                        <span className="text-[8px] text-teal-400 font-extrabold block mt-1">Income: +{solarRate}c/hr</span>
                      </div>
                      {solarLvl >= 3 ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-black uppercase">MAX</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onUpgradeHQ) {
                              onUpgradeHQ("solarGridLevel", solarUpgradeCost);
                              handleCloseBuildingModal();
                            }
                          }}
                          disabled={user.coins < solarUpgradeCost}
                          className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all ${
                            user.coins >= solarUpgradeCost
                              ? "bg-yellow-400 text-black hover:bg-yellow-350"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          {solarLvl === 0 ? "Build" : "Upgrade"} (${solarUpgradeCost})
                        </button>
                      )}
                    </div>

                    {/* Repair Depot */}
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-3">
                      <div className="leading-tight">
                        <h5 className="font-extrabold text-[11px] text-white">🛠️ Repair Depot (Lvl {repairLvl}/3)</h5>
                        <p className="text-[8px] text-zinc-400 mt-0.5 leading-relaxed">Annex that facilitates municipal repairs.</p>
                        <span className="text-[8px] text-teal-400 font-extrabold block mt-1">Income: +{repairRate}c/hr</span>
                      </div>
                      {repairLvl >= 3 ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-black uppercase">MAX</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onUpgradeHQ) {
                              onUpgradeHQ("repairDepotLevel", repairUpgradeCost);
                              handleCloseBuildingModal();
                            }
                          }}
                          disabled={user.coins < repairUpgradeCost}
                          className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all ${
                            user.coins >= repairUpgradeCost
                              ? "bg-yellow-400 text-black hover:bg-yellow-350"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          {repairLvl === 0 ? "Build" : "Upgrade"} (${repairUpgradeCost})
                        </button>
                      )}
                    </div>

                    {/* Tech Lab */}
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-3">
                      <div className="leading-tight">
                        <h5 className="font-extrabold text-[11px] text-white">🧪 Tech Lab (Lvl {techLvl}/3)</h5>
                        <p className="text-[8px] text-zinc-400 mt-0.5 leading-relaxed">Researches advanced smart infrastructure.</p>
                        <span className="text-[8px] text-teal-400 font-extrabold block mt-1">Income: +{techRate}c/hr</span>
                      </div>
                      {techLvl >= 3 ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-black uppercase">MAX</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onUpgradeHQ) {
                              onUpgradeHQ("techLabLevel", techUpgradeCost);
                              handleCloseBuildingModal();
                            }
                          }}
                          disabled={user.coins < techUpgradeCost}
                          className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all ${
                            user.coins >= techUpgradeCost
                              ? "bg-yellow-400 text-black hover:bg-yellow-350"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          {techLvl === 0 ? "Build" : "Upgrade"} (${techUpgradeCost})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Prestige Tab */}
                {controlPanelTab === "prestige" && (
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    {/* Eco Cruiser */}
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-3">
                      <div className="leading-tight">
                        <h5 className="font-extrabold text-[11px] text-white">🛸 Eco Cruiser (Lvl {cruiserLvl}/3)</h5>
                        <p className="text-[8px] text-zinc-400 mt-0.5 leading-relaxed">Park a high-tech cruiser in your driveway.</p>
                        <span className="text-[8px] text-[#00f2fe] font-extrabold block mt-1">Prestige Level Accessory</span>
                      </div>
                      {cruiserLvl >= 3 ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-black uppercase">MAX</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onUpgradeHQ) {
                              onUpgradeHQ("ecoCruiserLevel", cruiserUpgradeCost);
                              handleCloseBuildingModal();
                            }
                          }}
                          disabled={user.coins < cruiserUpgradeCost}
                          className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all ${
                            user.coins >= cruiserUpgradeCost
                              ? "bg-yellow-400 text-black hover:bg-yellow-350"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          {cruiserLvl === 0 ? "Buy" : "Upgrade"} (${cruiserUpgradeCost})
                        </button>
                      )}
                    </div>

                    {/* Hero Statue */}
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-3">
                      <div className="leading-tight">
                        <h5 className="font-extrabold text-[11px] text-white">🏆 Hero Statue (Lvl {statueLvl}/3)</h5>
                        <p className="text-[8px] text-zinc-400 mt-0.5 leading-relaxed">Install a glorious gold statue in your garden.</p>
                        <span className="text-[8px] text-[#00f2fe] font-extrabold block mt-1">Prestige Level Monument</span>
                      </div>
                      {statueLvl >= 3 ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-black uppercase">MAX</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onUpgradeHQ) {
                              onUpgradeHQ("heroStatueLevel", statueUpgradeCost);
                              handleCloseBuildingModal();
                            }
                          }}
                          disabled={user.coins < statueUpgradeCost}
                          className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all ${
                            user.coins >= statueUpgradeCost
                              ? "bg-yellow-400 text-black hover:bg-yellow-350"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          {statueLvl === 0 ? "Buy" : "Upgrade"} (${statueUpgradeCost})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* INTERACTIVE DAMAGE DETAIL / VERIFICATION MODAL */}
      {selectedCase && showFullModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150 relative">
            
            {/* Close Button - 44px touch target, highly visible, crisp tracking */}
            <button
              onClick={() => setSelectedCase(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-950/80 hover:bg-zinc-800 p-2.5 rounded-full border border-zinc-800 transition-all cursor-pointer z-10 flex items-center justify-center shadow-lg"
              aria-label="Close panel"
              style={{ minWidth: "44px", minHeight: "44px" }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={3} />
            </button>

            {/* Banner Image */}
            {selectedCase.imageUrl ? (
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden shrink-0">
                <img 
                  src={selectedCase.imageUrl} 
                  alt="Damage photo" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
              </div>
            ) : (
              <div className="h-16 bg-gradient-to-b from-zinc-950 to-zinc-900 border-b border-zinc-800/50 shrink-0" />
            )}

            {/* Content Details */}
            <div className="p-5 space-y-4 flex-1">
              {/* Title & Status */}
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getMarkerBg(selectedCase.damageType, selectedCase.status)}`} />
                <h4 className="font-display font-black text-xs uppercase tracking-widest text-white">
                  {(selectedCase.damageType || "").replace("_", " ")}
                </h4>
                {selectedCase.reportedBy === user.userId && (
                  <span className="text-[8px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ml-1">
                    Your Report
                  </span>
                )}
                <span className="text-[8px] bg-zinc-850 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded-full font-extrabold ml-auto uppercase tracking-wider">
                  {selectedCase.status}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {selectedCase.description || "No description provided."}
                </p>
                <div className="text-[8px] text-zinc-505 font-mono tracking-wide text-zinc-500">
                  GPS: {selectedCase.latitude ? selectedCase.latitude.toFixed(6) : "0.000000"}, {selectedCase.longitude ? selectedCase.longitude.toFixed(6) : "0.000000"}
                </div>
              </div>

              {/* Reporter & Verifiers Info */}
              <div className="text-[9px] text-zinc-400 font-mono space-y-1 bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl">
                <div>
                  <span className="font-bold text-zinc-500 uppercase">Reporter: </span>
                  <span className="text-zinc-300 font-bold">{reporterName}</span>{" "}
                  <span className="text-yellow-500 font-black font-sans">(+50-500 XP, +50-500 Coins)</span>
                </div>
                {verifiersNames.length > 0 && (
                  <div>
                    <span className="font-bold text-zinc-500 uppercase">Verifiers: </span>
                    <span className="text-zinc-300 font-bold">{verifiersNames.join(", ")}</span>{" "}
                    <span className="text-teal-400 font-black font-sans">(+30 XP, +50 Coins)</span>
                  </div>
                )}
              </div>

              {/* Severity & Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl">
                <div className="leading-tight">
                  <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">SEVERITY LEVEL</span>
                  <span className="text-[11px] font-black text-yellow-400 font-mono">{selectedCase.severity || 1} / 10</span>
                </div>
                <div className="leading-tight">
                  <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">CITIZEN VOTES</span>
                  <span className="text-[11px] font-black text-teal-400 font-mono">{selectedCase.verifications || 0} Votes</span>
                </div>
              </div>

              {/* Interactive Actions (Verify/Resolve/Add Proof) */}
              {selectedCase.status !== "resolved" && (
                <div className="flex gap-2 pt-2 border-t border-zinc-850/80">
                  {selectedCase.status === "reported" && selectedCase.reportedBy !== user.userId && !selectedCase.verifiedBy.includes(user.userId) && !(selectedCase.rejectedBy || []).includes(user.userId) && (
                    <>
                      <button
                        onClick={() => {
                          onVerifyCase(selectedCase.id, "yes");
                          setSelectedCase(null);
                        }}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-350 text-black py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all uppercase tracking-wider text-center"
                      >
                        Verify (Yes)
                      </button>
                      <button
                        onClick={() => {
                          onVerifyCase(selectedCase.id, "no");
                          setSelectedCase(null);
                        }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all border border-zinc-750 uppercase tracking-wider text-center"
                      >
                        Verify (No)
                      </button>
                    </>
                  )}
                  {selectedCase.status === "reported" && selectedCase.reportedBy !== user.userId && (selectedCase.verifiedBy.includes(user.userId) || (selectedCase.rejectedBy || []).includes(user.userId)) && (
                    <button
                      onClick={() => {
                        onVerifyCase(selectedCase.id, "undo");
                        setSelectedCase(null);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all uppercase tracking-wider text-center"
                    >
                      Undo Verification
                    </button>
                  )}
                  {selectedCase.status === "reported" && selectedCase.reportedBy !== user.userId && (selectedCase.rejectedBy || []).includes(user.userId) && (
                    <button
                      onClick={() => {
                        onVerifyCase(selectedCase.id, "proof");
                        setSelectedCase(null);
                      }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all border border-zinc-750 uppercase tracking-wider text-center"
                    >
                      Add Proof
                    </button>
                  )}
                  {(selectedCase.status as string) !== "resolved" && (
                    <button
                      onClick={() => {
                        onResolveCase(selectedCase.id);
                        setSelectedCase(null);
                      }}
                      className="flex-1 bg-teal-600 hover:bg-teal-550 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all uppercase tracking-wider text-center"
                    >
                      Proof of Repair 
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ESTATE LEADERBOARD BOTTOM SHEET */}
      {showEstateLeaderboard && (() => {
        const userCityKey = (user.city || "").toLowerCase();
        const userAreaKey = (user.area || "").split(" ")[0].toLowerCase();

        // Merge current user's profile to leaderboard data if not already present
        const allLeaderboardBases = [...visibleBases];
        if (!allLeaderboardBases.some(b => b.uid === user.userId)) {
          const hqObj = empireBuildings.find(b => b.id === "hq_details" || b.id === "scout_house_hq" || b.type === "hq_base");
          allLeaderboardBases.push({
            uid: user.userId,
            username: user.displayName || "admin_civic",
            empireValuation: user.empireValuation || 200,
            baseLevel: hqObj?.baseLevel || 1,
            solarGridLevel: hqObj?.solarGridLevel || 0,
            repairDepotLevel: hqObj?.repairDepotLevel || 0,
            techLabLevel: hqObj?.techLabLevel || 0,
            ecoCruiserLevel: hqObj?.ecoCruiserLevel || 0,
            heroStatueLevel: hqObj?.heroStatueLevel || 0,
            city: user.city || "Hyderabad",
            area: user.area || "",
            avatarUrl: user.photoURL
          });
        }

        const filteredBases = allLeaderboardBases.filter(b => {
          if (estateFilter === "city") {
            return (b.city || "").toLowerCase() === userCityKey;
          }
          if (estateFilter === "area") {
            const bArea = (b.area || "").split(" ")[0].toLowerCase();
            return bArea === userAreaKey;
          }
          return true;
        });

        // Sort by valuation descending
        filteredBases.sort((a, b) => b.empireValuation - a.empireValuation);

        const estateRankings = filteredBases.map((b, idx) => ({
          rank: idx + 1,
          ...b
        }));

        const top5Estates = estateRankings.slice(0, 5);
        const userEstateRecord = estateRankings.find(b => b.uid === user.userId);
        const userEstateInTop5 = top5Estates.some(b => b.uid === user.userId);

        const renderRankBadge = (rank: number) => {
          if (rank === 1) {
            return (
              <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-zinc-950 flex items-center justify-center text-xs shadow-lg shadow-yellow-500/10 flex-shrink-0">
                👑
              </div>
            );
          }
          return (
            <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center font-black font-mono text-[10px] text-zinc-400 flex-shrink-0">
              #{rank}
            </div>
          );
        };

        const renderEstateCard = (b: any) => {
          const isCurrentUser = b.uid === user.userId;
          return (
            <div
              key={b.uid}
              className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${
                isCurrentUser 
                  ? "border-[#7f00ff] bg-zinc-950/60 shadow-lg shadow-[#7f00ff]/10" 
                  : "border-zinc-800 bg-zinc-950/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {renderRankBadge(b.rank)}
                <div className="relative flex-shrink-0">
                  <img
                    src={b.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${b.username}`}
                    alt={b.username}
                    className="w-9 h-9 rounded-full border-2 border-zinc-800 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-[11px] text-white truncate max-w-[125px]">{b.username}</span>
                    {isCurrentUser && (
                      <span className="bg-[#7f00ff] text-white text-[7px] font-black uppercase px-1 py-0.5 rounded-md leading-none tracking-wider">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 w-fit">
                    <span className="text-[7.5px] text-zinc-400 font-extrabold uppercase font-mono block">
                      HQ LVL {b.baseLevel}
                    </span>
                    <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-yellow-400 text-[6px] font-black text-black">
                      🪙
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">ESTATE VAL</span>
                <span className="text-xs font-black text-[#00f2fe] font-mono">{b.empireValuation} Coins</span>
              </div>
            </div>
          );
        };

        return (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-end justify-center pointer-events-auto" onClick={() => setShowEstateLeaderboard(false)}>
            <div 
              className="rounded-t-[32px] w-full max-w-md shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[82vh] overflow-y-auto border-t border-white/10"
              style={{
                background: "#07070a",
                color: "#ffffff"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7f00ff]/20 border border-[#7f00ff]/30 flex items-center justify-center text-[#00f2fe]">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm uppercase tracking-tight text-white">Estate Leaderboard</h3>
                    <p className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-wider mt-0.5">Property Valuation Rankings</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEstateLeaderboard(false)} 
                  className="p-1.5 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Toggles */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setEstateFilter("all")}
                  className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-wider border transition-all cursor-pointer text-center ${
                    estateFilter === "all"
                      ? "border-[#7f00ff] bg-[#7f00ff]/15 text-[#00f2fe]"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"
                  }`}
                >
                  All Cities
                </button>
                <button
                  onClick={() => setEstateFilter("city")}
                  className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-wider border transition-all cursor-pointer text-center truncate ${
                    estateFilter === "city"
                      ? "border-[#7f00ff] bg-[#7f00ff]/15 text-[#00f2fe]"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"
                  }`}
                >
                  City: {user.city ? user.city.toUpperCase() : "MY CITY"}
                </button>
                <button
                  onClick={() => setEstateFilter("area")}
                  className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-wider border transition-all cursor-pointer text-center truncate ${
                    estateFilter === "area"
                      ? "border-[#7f00ff] bg-[#7f00ff]/15 text-[#00f2fe]"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"
                  }`}
                >
                  Area: {user.area ? user.area.split(" ")[0].toUpperCase() : "TIRUMALAGIRI"}
                </button>
              </div>

              {/* Leaderboard List */}
              <div className="space-y-3 pt-1">
                {top5Estates.map((b) => renderEstateCard(b))}

                {top5Estates.length === 0 && (
                  <p className="text-center text-zinc-500 text-[10px] py-6 font-bold uppercase tracking-wider">No estates found in this filter.</p>
                )}

                {/* User standing row if not in top 5 */}
                {!userEstateInTop5 && userEstateRecord && (
                  <>
                    <div className="border-t border-dashed border-zinc-800 my-4"></div>
                    {renderEstateCard(userEstateRecord)}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {user && !user.homePinned && patrolMode === "sim" && (
        <HomePinningModal
          onPin={onPinHQ}
          initialPos={playerPos.lat !== 20.5937 ? playerPos : { lat: 17.485, lng: 78.505 }}
        />
      )}

    </div>
  );
}
