import React, { useEffect, useState, useRef } from "react";
import { 
  Navigation, Camera, AlertOctagon, HelpCircle, ShieldCheck, Zap, Sun, Moon, 
  Coins, Landmark, ChevronUp, ChevronDown, CheckCircle2, Hammer, ArrowRight, X, Sparkles
} from "lucide-react";
import GameMap, { getMarkerBg } from "../game/GameMap";
import { Case, UserProfile, Hood } from "../../lib/constants";
import HomePinningModal from "../game/HomePinningModal";

interface GameViewProps {
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
  selectedCaseIdFromChat,
  setSelectedCaseIdFromChat,
  onPinHQ
}: GameViewProps) {
  const [patrolMode, setPatrolMode] = useState<"patrol" | "sim">("patrol");
  const [mapTheme, setMapTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("patrol_grid_map_theme") as "dark" | "light") || "light";
  });
  const [zoom, setZoom] = useState(17);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const hasSetInitialGps = useRef(false);

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
      const latestB = empireBuildings.find(b => b.id === selectedBuilding.id) || selectedBuilding;
      const lastClaimed = new Date(latestB.lastClaimedAt || latestB.builtAt);
      const now = new Date();
      const hoursElapsed = Math.max(0, (now.getTime() - lastClaimed.getTime()) / 3600000);
      const coins = Math.floor(hoursElapsed * (latestB.incomePerHr || 5));
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
  const handleMapClickForPlacement = (lat: number, lng: number) => {
    if (placingBuildingType) {
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
                    patrolMode === "patrol"
                      ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  📡 PATROL
                </button>
                <button
                  onClick={() => setPatrolMode("sim")}
                  className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                    patrolMode === "sim"
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
                <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-2.5 pointer-events-auto">
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
                      patrolMode === "patrol"
                        ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    📡 PATROL
                  </button>
                  <button
                    onClick={() => setPatrolMode("sim")}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      patrolMode === "sim"
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
                <div className="bg-zinc-950/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 pointer-events-auto min-w-0 max-w-[45vw]">
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
                      patrolMode === "patrol"
                        ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    📡 PATROL
                  </button>
                  <button
                    onClick={() => setPatrolMode("sim")}
                    className={`px-2 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      patrolMode === "sim"
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
        <div className="absolute top-28 left-3 right-3 z-30 bg-red-950/95 border border-red-500/30 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-red-200 text-[10px] max-w-sm mx-auto">
          <div className="flex justify-between items-start mb-1">
            <span className="font-extrabold text-xs text-red-400 flex items-center gap-1.5">
              ⚠️ Geolocation Unavailable
            </span>
            <button 
              onClick={() => setGpsError(null)}
              className="text-red-400 hover:text-white font-bold text-xs cursor-pointer"
            >
              [Dismiss]
            </button>
          </div>
          <p className="leading-relaxed opacity-90">{gpsError}</p>
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
          <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
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
      )}

      {/* CONSTRUCTION SHOP PANEL (Only in Sim Mode) */}
      {patrolMode === "sim" && (
        <>
          {/* Desktop/Tablet Panel (Hidden on Mobile) */}
          <div className="absolute right-3 top-20 bottom-[96px] w-72 bg-zinc-950/90 backdrop-blur-md rounded-3xl border border-zinc-800 shadow-2xl p-5 flex flex-col z-10 hidden md:flex animate-in slide-in-from-right duration-300 pointer-events-auto">
            <h4 className="font-display font-black text-sm uppercase tracking-widest text-teal-400 flex items-center gap-2 mb-3">
              <Hammer className="w-4 h-4" /> CONSTRUCTION LIST
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {/* Solar Grid */}
              <div className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 p-3.5 rounded-2xl flex flex-col gap-2 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-extrabold text-xs text-white">Solar Grid</h5>
                    <p className="text-[9px] text-zinc-400 leading-tight">Generates clean energy and passive income (+1% Hood Health multiplier).</p>
                  </div>
                  <span className="bg-orange-500/10 text-orange-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">☀️ ENERGY</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="leading-none">
                    <span className="text-[8px] text-zinc-500 block">INCOME</span>
                    <span className="text-xs font-black text-teal-400">+10 Coins/hr</span>
                  </div>
                  <button
                    onClick={() => setPlacingBuildingType("solar_grid")}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Build (150)
                  </button>
                </div>
              </div>

              {/* Repair Depot */}
              <div className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 p-3.5 rounded-2xl flex flex-col gap-2 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-extrabold text-xs text-white">Repair Depot</h5>
                    <p className="text-[9px] text-zinc-400 leading-tight">Coordinates municipal repairs (+25 Coins/hr, -5% repair cost).</p>
                  </div>
                  <span className="bg-teal-500/10 text-teal-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">🛠️ REPAIR</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="leading-none">
                    <span className="text-[8px] text-zinc-500 block">INCOME</span>
                    <span className="text-xs font-black text-teal-400">+25 Coins/hr</span>
                  </div>
                  <button
                    onClick={() => setPlacingBuildingType("repair_depot")}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Build (300)
                  </button>
                </div>
              </div>

              {/* Tech Lab */}
              <div className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 p-3.5 rounded-2xl flex flex-col gap-2 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-extrabold text-xs text-white">Tech Lab</h5>
                    <p className="text-[9px] text-zinc-400 leading-tight">Researches smart infrastructure tools (+75 Coins/hr, unlocks advanced radar scan).</p>
                  </div>
                  <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">🧪 R&D</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="leading-none">
                    <span className="text-[8px] text-zinc-500 block">INCOME</span>
                    <span className="text-xs font-black text-teal-400">+75 Coins/hr</span>
                  </div>
                  <button
                    onClick={() => setPlacingBuildingType("tech_lab")}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Build (800)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Shop Sheet Drawer (Only visible on Mobile) */}
          <div className="absolute left-3 right-3 bottom-[96px] bg-zinc-950/95 backdrop-blur-md rounded-3xl border border-zinc-800 shadow-2xl z-20 md:hidden pointer-events-auto transition-all overflow-hidden flex flex-col">
            <button
              onClick={() => setIsShopExpanded(!isShopExpanded)}
              className="w-full py-2.5 flex items-center justify-center text-zinc-400 hover:text-white border-b border-zinc-900 cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                <Hammer className="w-3.5 h-3.5" />
                <span>Construction Shop</span>
                {isShopExpanded ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronUp className="w-4 h-4 ml-1" />}
              </div>
            </button>

            {isShopExpanded && (
              <div className="p-4 space-y-3.5 max-h-60 overflow-y-auto animate-in slide-in-from-bottom duration-250">
                {/* Solar Grid */}
                <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-2">
                  <div className="leading-tight">
                    <h5 className="font-extrabold text-xs text-white">Solar Grid</h5>
                    <span className="text-[9px] font-extrabold text-teal-400 block">+10 Coins/hr</span>
                  </div>
                  <button
                    onClick={() => {
                      setPlacingBuildingType("solar_grid");
                      setIsShopExpanded(false);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Build (150)
                  </button>
                </div>

                {/* Repair Depot */}
                <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-2">
                  <div className="leading-tight">
                    <h5 className="font-extrabold text-xs text-white">Repair Depot</h5>
                    <span className="text-[9px] font-extrabold text-teal-400 block">+25 Coins/hr</span>
                  </div>
                  <button
                    onClick={() => {
                      setPlacingBuildingType("repair_depot");
                      setIsShopExpanded(false);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Build (300)
                  </button>
                </div>

                {/* Tech Lab */}
                <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center gap-2">
                  <div className="leading-tight">
                    <h5 className="font-extrabold text-xs text-white">Tech Lab</h5>
                    <span className="text-[9px] font-extrabold text-teal-400 block">+75 Coins/hr</span>
                  </div>
                  <button
                    onClick={() => {
                      setPlacingBuildingType("tech_lab");
                      setIsShopExpanded(false);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Build (800)
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* INTERACTIVE BUILDING DETAILS / UPGRADE MODAL */}
      {selectedBuilding && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800/80 bg-gradient-to-r from-teal-500/10 to-transparent flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">
                  {selectedBuilding.type === "scout_house" 
                    ? (selectedBuilding.level === 3 ? "🏰" : selectedBuilding.level === 2 ? "🏡" : "🏠") 
                    : (selectedBuilding.type === "solar_grid" ? "☀️" : selectedBuilding.type === "repair_depot" ? "🛠️" : "🧪")}
                </span>
                <div>
                  <h4 className="font-display font-black text-sm uppercase tracking-widest text-white leading-none mb-1">
                    {selectedBuilding.type.replace("_", " ")}
                  </h4>
                  <p className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-wider font-mono">
                    ID: {selectedBuilding.id.substring(0, 14)}...
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseBuildingModal}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-4">
              
              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl text-center leading-none">
                  <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">CURRENT LEVEL</span>
                  <span className="text-sm font-black text-white">Lvl {selectedBuilding.level || 1}</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl text-center leading-none">
                  <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">HOURLY RATE</span>
                  <span className="text-sm font-black text-teal-400 font-mono">+{selectedBuilding.incomePerHr || 5} / hr</span>
                </div>
              </div>

              {/* Live Passive Income claim widget */}
              <div className="bg-zinc-950 border border-teal-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5">
                <div className="text-center">
                  <span className="text-[7px] font-bold text-teal-400 uppercase tracking-widest block mb-1.5">Accumulated Passive Coins</span>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Coins className="w-5 h-5 text-yellow-400 animate-spin-slow" />
                    <span className="text-2xl font-black text-white font-mono leading-none">{liveAccumulated}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onCollectIncome(selectedBuilding.id);
                    handleCloseBuildingModal();
                  }}
                  disabled={liveAccumulated <= 0}
                  className={`w-full py-2 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider shadow flex items-center justify-center gap-1.5 transition-all ${
                    liveAccumulated > 0 
                      ? "bg-teal-500 hover:bg-teal-450 text-white cursor-pointer" 
                      : "bg-zinc-850 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Collect passive coins
                </button>
              </div>

              {/* Scout House Upgrades Section */}
              {selectedBuilding.type === "scout_house" && (
                <div className="border-t border-zinc-850 pt-3.5">
                  <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest block mb-2">HEADQUARTERS UPGRADES</span>
                  {selectedBuilding.level >= 3 ? (
                    <div className="bg-yellow-400/10 border border-yellow-400/20 p-3 rounded-2xl text-center text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center justify-center gap-2">
                      👑 MAX HEADQUARTERS LEVEL REACHED
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onUpgradeScoutHouse(selectedBuilding.id);
                        handleCloseBuildingModal();
                      }}
                      className="w-full bg-yellow-400 hover:bg-yellow-350 text-black py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Upgrade Scout House to Lvl {selectedBuilding.level + 1} ({selectedBuilding.level === 1 ? 200 : 500} Coins)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <p className="text-[11px] text-zinc-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                {selectedCase.description || "No description provided."}
              </p>

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

              {/* Address / Location Text */}
              <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl leading-tight">
                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-1">LOCATION ADDRESS</span>
                <p className="text-[9px] text-zinc-300 truncate font-mono">{selectedCase.address || "Unknown coordinates"}</p>
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
                  {selectedCase.status !== "resolved" && (
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

      {user && !user.homePinned && patrolMode === "sim" && (
        <HomePinningModal
          onPin={onPinHQ}
          initialPos={playerPos.lat !== 20.5937 ? playerPos : { lat: 17.485, lng: 78.505 }}
        />
      )}

    </div>
  );
}
