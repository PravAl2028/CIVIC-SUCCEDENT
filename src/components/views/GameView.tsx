import React, { useEffect, useState, useRef } from "react";
import {
  Navigation, Camera, AlertTriangle, X, Locate, Sun, Moon, Compass, List, Mail, Send, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameMap, { getMarkerBg } from "../game/GameMap";
import { Case, UserProfile, Hood } from "../../lib/constants";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { getTranslatedRank, getTranslatedDamageType, getTranslatedStatus } from "../../lib/i18nHelpers";
import { getDepartmentForIssue } from "../../data/knowledge/departments";

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
  onTriggerDispatcher?: (caseId: string) => void;
  selectedCaseIdFromChat?: string | null;
  setSelectedCaseIdFromChat?: (caseId: string | null) => void;
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
  onTriggerDispatcher,
  selectedCaseIdFromChat,
  setSelectedCaseIdFromChat,
}: GameViewProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { dispatchLoading, activeDispatchCase } = useAuth();
  const [patrolMode, setPatrolMode] = useState<"patrol" | "issues">("patrol");
  const [mapTheme, setMapTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("patrol_grid_map_theme") as "dark" | "light") || "light";
  });
  const [zoom, setZoom] = useState(17);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const hasSetInitialGps = useRef(false);
  const [isAutoCentering, setIsAutoCentering] = useState(true);

  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showFullModal, setShowFullModal] = useState(false);
  const [showDraftLetter, setShowDraftLetter] = useState(false);

  const [reporterName, setReporterName] = useState<string>("Loading...");
  const [verifiersNames, setVerifiersNames] = useState<string[]>([]);

  // Issues mode filter state
  const [issueFilter, setIssueFilter] = useState<"all" | "pothole" | "water" | "streetlight" | "garbage" | "other">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");

  useEffect(() => {
    if (!selectedCase) {
      setReporterName("Loading...");
      setVerifiersNames([]);
      setShowDraftLetter(false);
      return;
    }

    const fetchUserNames = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase');

        const reporterSnap = await getDoc(doc(db, "users", selectedCase.reportedBy));
        if (reporterSnap.exists()) {
          setReporterName(reporterSnap.data()?.username || reporterSnap.data()?.displayName || "Scout");
        } else {
          setReporterName("Unknown Scout");
        }

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

  // Geolocation Real-Time GPS Tracking Engine
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

  // Filtered cases for issues mode
  const filteredCases = cases.filter((c) => {
    if (issueFilter !== "all") {
      const type = (c.damageType || "").toLowerCase().replace("_", " ");
      const filterMap: Record<string, string[]> = {
        pothole: ["pothole"],
        water: ["water", "leak", "pipe", "drainage"],
        streetlight: ["streetlight", "light", "lamp"],
        garbage: ["garbage", "waste", "trash", "litter"],
        other: [],
      };
      const keywords = filterMap[issueFilter];
      if (issueFilter === "other") {
        const allKeywords = ["pothole", "water", "leak", "pipe", "drainage", "streetlight", "light", "lamp", "garbage", "waste", "trash", "litter"];
        if (allKeywords.some((kw) => type.includes(kw))) return false;
      } else {
        if (!keywords.some((kw) => type.includes(kw))) return false;
      }
    }
    if (statusFilter === "active") {
      return c.status !== "resolved";
    }
    if (statusFilter === "resolved") {
      return c.status === "resolved";
    }
    return true;
  });

  const filterLabels: Record<string, string> = { all: t.patrol.all, pothole: t.patrol.pothole, water: t.patrol.water, streetlight: t.patrol.streetlight, garbage: t.patrol.garbage, other: t.patrol.other };
  const statusLabels: Record<string, string> = { all: t.patrol.all, active: t.patrol.active, resolved: t.patrol.resolved };

  const mailProviders = [
    { id: "gmail", label: "Gmail", url: "https://mail.google.com/mail/?view=cm&fs=1" },
    { id: "outlook", label: "Outlook", url: "https://outlook.live.com/mail/0/deeplink/compose" },
    { id: "yahoo", label: "Yahoo Mail", url: "https://mail.yahoo.com/d/compose" },
    { id: "default", label: "Default Mail App", url: "" }
  ];

  const handleEmailEscalation = (providerId: string, caseData: Case) => {
    const dept = getDepartmentForIssue(caseData.damageType || "other", user.city || "Hyderabad");
    const deptEmail = dept?.contactEmail?.trim() || "";
    const deptName = dept?.name || "Municipal Corporation";
    const issueType = (caseData.damageType || "").replace("_", " ");
    const caseId = caseData.id || "N/A";
    const address = caseData.address || "Location pending GPS lock";

    const subject = `Urgent: ${issueType} at ${address} - Case ${caseId}`;
    const body = `To: ${deptName}\nSubject: Request for Immediate Action - ${issueType}\n\nDear Sir/Madam,\n\nI am writing to bring to your attention a ${issueType} at the following location:\n\nAddress: ${address}\nSeverity: ${caseData.severity || 1}/10\nCase Reference: ${caseId}\nDate Reported: ${caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}\n\n${caseData.description ? `Description: ${caseData.description}` : ""}\n\n${dept ? `As per ${dept.legalBasis}, this falls under your jurisdiction.` : ""}\n\nI kindly request your department to:\n1. Acknowledge receipt of this complaint\n2. Initiate repair/remediation within ${dept ? dept.responseTimeDays : 30} days\n3. Share the name of the responsible officer\n\n${dept ? `If no response is received within ${dept.responseTimeDays} days, I will be filing an application under the Right to Information Act, 2005.` : "If no response is received within 30 days, I will file an RTI application."}\n\nThank you for your attention to this matter.\n\nSincerely,\n${user.displayName || "Concerned Citizen"}\nNagarika Civic Reporting Platform\nCase ID: ${caseId}`;

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    if (providerId === "default") {
      window.open(`mailto:${deptEmail}?subject=${encodedSubject}&body=${encodedBody}`, "_blank");
    } else {
      const provider = mailProviders.find(p => p.id === providerId);
      if (provider) {
        window.open(`${provider.url}&to=${encodeURIComponent(deptEmail)}&su=${encodedSubject}&body=${encodedBody}`, "_blank");
      }
    }
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
          onSelectCase={(c) => {
            setSelectedCase(c);
            setShowFullModal(true);
          }}
          isAutoCentering={isAutoCentering}
          setIsAutoCentering={setIsAutoCentering}
        />
      </div>

      {/* Top Floating Heads-Up Display (HUD) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {patrolMode === "patrol" ? (
          <div className="flex justify-between items-center w-full gap-2 pointer-events-auto">
            {/* HUD Left: Compact Profile Stats */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                onClick={() => navigate("/profile")}
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
                      {getTranslatedRank(user.rank, t)}
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
                  onClick={() => setPatrolMode("patrol")}
                  className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                    true
                      ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.patrol.patrolMode}
                </button>
                <button
                  onClick={() => setPatrolMode("issues")}
                  className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                    false
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-500/15"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.patrol.issuesMode}
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
          /* ISSUES MODE HUD */
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* Top row: profile + mode toggle + theme */}
            <div className="flex justify-between items-center w-full gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  onClick={() => navigate("/profile")}
                  className="bg-zinc-950/90 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-2xl border border-zinc-800/80 shadow-2xl flex items-center gap-1.5 md:gap-2.5 min-w-0 max-w-[45vw] md:max-w-none cursor-pointer hover:bg-zinc-900/90 transition-colors"
                >
                  <img
                    src={user.photoURL}
                    alt="user avatar"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border-2 border-teal-500 object-cover flex-shrink-0"
                  />
                  <div className="leading-tight min-w-0">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <span className="font-extrabold text-xs text-white truncate max-w-[55px] md:max-w-[85px]">{user.displayName}</span>
                      <span className="text-[8px] bg-teal-600 text-white px-1 rounded font-black uppercase py-0.5 leading-none flex-shrink-0">
                        {getTranslatedRank(user.rank, t)}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-teal-400 font-mono block -mt-0.5">{user.xp} XP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
                <div className="bg-zinc-950/95 backdrop-blur-md p-0.5 md:p-1 rounded-2xl border border-zinc-800 shadow-2xl flex items-center gap-1">
                  <button
                    onClick={() => setPatrolMode("patrol")}
                    className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                      false
                        ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t.patrol.patrolMode}
                  </button>
                  <button
                    onClick={() => setPatrolMode("issues")}
                    className={`px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 ${
                      true
                        ? "bg-teal-600 text-white shadow-lg shadow-teal-500/15"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t.patrol.issuesMode}
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

            {/* Issues list panel */}
            <div className="bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[55vh] md:max-h-[60vh]">
              {/* Category filter chips */}
              <div className="flex gap-1.5 px-3 pt-3 pb-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
                {(["all", "pothole", "water", "streetlight", "garbage", "other"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setIssueFilter(f)}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap border transition-all cursor-pointer flex-shrink-0 ${
                      issueFilter === f
                        ? "bg-[#006a65] border-[#006a65] text-white"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
                    }`}
                  >
                    {filterLabels[f]}
                  </button>
                ))}
              </div>

              {/* Status filter chips */}
              <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
                {(["all", "active", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap border transition-all cursor-pointer flex-shrink-0 ${
                      statusFilter === s
                        ? "bg-[#006a65] border-[#006a65] text-white"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>

              {/* Case count */}
              <div className="px-3 pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <List className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    {t.patrol.issuesCount.replace("{count}", String(filteredCases.length))}
                  </span>
                </div>
              </div>

              {/* Scrollable issues list */}
              <div className="overflow-y-auto px-3 pb-3 space-y-1.5 flex-1" style={{ scrollbarWidth: "thin" }}>
                {filteredCases.length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t.patrol.noIssuesFound}</span>
                  </div>
                )}
                {filteredCases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCase(c);
                      setShowFullModal(true);
                      setIsAutoCentering(false);
                    }}
                    className="w-full text-left bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800/60 rounded-xl p-3 transition-all cursor-pointer min-h-[44px] flex items-center gap-2.5 active:scale-[0.98]"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getMarkerBg(c.damageType, c.status)}`} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8px] font-black text-zinc-300 uppercase tracking-wider">
                          {(c.damageType || t.common.loading).replace("_", " ")}
                        </span>
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                          c.status === "resolved"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{c.description || t.common.noDescription}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[8px] font-black text-zinc-500 uppercase block">Sev</span>
                      <span className="text-[11px] font-black text-yellow-400 font-mono">{c.severity || 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected Case Quick Preview Banner at the Top (patrol mode only) */}
        {patrolMode === "patrol" && selectedCase && !showFullModal && (
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
                  {selectedCase.description || t.issue.noDescription}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[8px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                {t.patrol.tapToView}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCase(null);
                }}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={t.patrol.dismiss}
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
          <h3 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">{t.patrol.locationRequired}</h3>
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
              {t.patrol.retryGps}
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
              title={t.patrol.recenterGps}
              id="btn-recenter-patrol-gps"
            >
              <Locate className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => { onTriggerScan(); navigate("/scan-result"); }}
                className="w-14 h-14 bg-yellow-400 hover:bg-yellow-350 active:scale-90 rounded-full flex flex-col justify-center items-center text-black border-2 border-zinc-950 shadow-2xl hover:scale-105 transition-all cursor-pointer relative"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">{t.patrol.scan}</span>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
              </button>
              <span className="bg-zinc-950/90 backdrop-blur-sm text-[7px] text-zinc-300 font-extrabold px-2 py-0.5 rounded-full border border-zinc-800/80 uppercase tracking-widest leading-none">
                {t.patrol.defectDetector}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE DAMAGE DETAIL / VERIFICATION MODAL */}
      {selectedCase && showFullModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150 relative">

            <button
              onClick={() => { setSelectedCase(null); setShowFullModal(false); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-950/80 hover:bg-zinc-800 p-2.5 rounded-full border border-zinc-800 transition-all cursor-pointer z-10 flex items-center justify-center shadow-lg"
              aria-label="Close panel"
              style={{ minWidth: "44px", minHeight: "44px" }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={3} />
            </button>

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

            <div className="p-5 space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getMarkerBg(selectedCase.damageType, selectedCase.status)}`} />
                <h4 className="font-display font-black text-xs uppercase tracking-widest text-white">
                  {getTranslatedDamageType(selectedCase.damageType, t)}
                </h4>
                {selectedCase.reportedBy === user.userId && (
                  <span className="text-[8px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ml-1">
                    {t.caseDetail.yourReport}
                  </span>
                )}
                <span className="text-[8px] bg-zinc-850 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded-full font-extrabold ml-auto uppercase tracking-wider">
                  {getTranslatedStatus(selectedCase.status, t)}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {selectedCase.description || t.issue.noDescription}
                </p>
                <div className="text-[8px] text-zinc-500 font-mono tracking-wide">
                  GPS: {selectedCase.latitude ? selectedCase.latitude.toFixed(6) : "0.000000"}, {selectedCase.longitude ? selectedCase.longitude.toFixed(6) : "0.000000"}
                </div>
              </div>

              <div className="text-[9px] text-zinc-400 font-mono space-y-1 bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl">
                <div>
                  <span className="font-bold text-zinc-500 uppercase">{t.caseDetail.reporter} </span>
                  <span className="text-zinc-300 font-bold">{reporterName}</span>{" "}
                  <span className="text-yellow-500 font-black font-sans">(+50-500 XP)</span>
                </div>
                {verifiersNames.length > 0 && (
                  <div>
                    <span className="font-bold text-zinc-500 uppercase">{t.caseDetail.verifiers} </span>
                    <span className="text-zinc-300 font-bold">{verifiersNames.join(", ")}</span>{" "}
                    <span className="text-teal-400 font-black font-sans">(+30 XP)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl">
                <div className="leading-tight">
                  <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">{t.caseDetail.severityLevel}</span>
                  <span className="text-[11px] font-black text-yellow-400 font-mono">{selectedCase.severity || 1} / 10</span>
                </div>
                <div className="leading-tight">
                  <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">{t.caseDetail.citizenVotes}</span>
                  <span className="text-[11px] font-black text-teal-400 font-mono">{selectedCase.verifications || 0} {t.caseDetail.votes}</span>
                </div>
              </div>

              {/* AI Draft Letter Section */}
              {selectedCase.complaintLetter && (
                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowDraftLetter(!showDraftLetter)}
                    className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">{t.issue.aiLetter}</span>
                    </div>
                    <span className={`text-[9px] font-bold text-zinc-500 transition-transform ${showDraftLetter ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {showDraftLetter && (
                    <div className="px-3 pb-3 space-y-2 border-t border-zinc-850">
                      {selectedCase.subject && (
                        <div className="pt-2">
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block mb-0.5">{t.dispatch.subject}</span>
                          <p className="text-[10px] font-bold text-yellow-400">{selectedCase.subject}</p>
                        </div>
                      )}
                      <div>
                        <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto pr-1">{selectedCase.complaintLetter}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Escalation & RTI — shown only after letter is drafted */}
              {selectedCase.complaintLetter && (
                <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl space-y-2">
                  {selectedCase.escalationPath && (
                    <div>
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">{t.issue.escalationLabel}</span>
                      <span className="text-[10px] text-zinc-300 font-bold">{selectedCase.escalationPath}</span>
                    </div>
                  )}
                  {selectedCase.rtiQuery && (
                    <div className="pt-2 border-t border-zinc-850">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase block mb-0.5">{t.issue.rtiQuery}</span>
                      <p className="text-[10px] text-zinc-400">{selectedCase.rtiQuery}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Email Escalation — only after letter is drafted */}
              {selectedCase.complaintLetter && selectedCase.status !== "resolved" && (
                <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">{t.scan.emailEscalation}</span>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-medium">{t.scan.emailEscalationDesc}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {mailProviders.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmailEscalation(provider.id, selectedCase);
                        }}
                        className="flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-yellow-400/50 hover:text-yellow-400"
                      >
                        <Send className="w-2.5 h-2.5" />
                        {provider.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate AI Complaint Button — only if no letter yet */}
              {!selectedCase.complaintLetter && selectedCase.status !== "resolved" && onTriggerDispatcher && (
                <button
                  onClick={() => onTriggerDispatcher(selectedCase.id)}
                  disabled={dispatchLoading && activeDispatchCase?.id === selectedCase.id}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer bg-teal-600/10 text-teal-400 border-teal-500/20 hover:bg-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dispatchLoading && activeDispatchCase?.id === selectedCase.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                      {t.dispatch.generating}
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      {t.issue.aiComplaint}
                    </>
                  )}
                </button>
              )}

              {selectedCase.status !== "resolved" && (
                <div className="flex gap-2 pt-2 border-t border-zinc-850/80">
                  {selectedCase.status === "reported" && selectedCase.reportedBy !== user.userId && !selectedCase.verifiedBy.includes(user.userId) && !(selectedCase.rejectedBy || []).includes(user.userId) && (
                    <>
                      <button
                        onClick={() => {
                          onVerifyCase(selectedCase.id, "yes");
                          setSelectedCase(null);
                          setShowFullModal(false);
                        }}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-350 text-black py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all uppercase tracking-wider text-center"
                      >
                        {t.caseDetail.verifyYes}
                      </button>
                      <button
                        onClick={() => {
                          onVerifyCase(selectedCase.id, "no");
                          setSelectedCase(null);
                          setShowFullModal(false);
                        }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all border border-zinc-750 uppercase tracking-wider text-center"
                      >
                        {t.caseDetail.verifyNo}
                      </button>
                    </>
                  )}
                  {selectedCase.status === "reported" && selectedCase.reportedBy !== user.userId && (selectedCase.verifiedBy.includes(user.userId) || (selectedCase.rejectedBy || []).includes(user.userId)) && (
                    <button
                      onClick={() => {
                        onVerifyCase(selectedCase.id, "undo");
                        setSelectedCase(null);
                        setShowFullModal(false);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all uppercase tracking-wider text-center"
                    >
                      {t.caseDetail.undoVerification}
                    </button>
                  )}
                  {selectedCase.status === "reported" && selectedCase.reportedBy !== user.userId && (selectedCase.rejectedBy || []).includes(user.userId) && (
                    <button
                      onClick={() => {
                        onVerifyCase(selectedCase.id, "proof");
                        setSelectedCase(null);
                        setShowFullModal(false);
                      }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all border border-zinc-750 uppercase tracking-wider text-center"
                    >
                      {t.caseDetail.addProof}
                    </button>
                  )}
                  {(selectedCase.status as string) !== "resolved" && (
                    <button
                      onClick={() => {
                        onResolveCase(selectedCase.id);
                        setSelectedCase(null);
                        setShowFullModal(false);
                        navigate("/scan-result");
                      }}
                      className="flex-1 bg-teal-600 hover:bg-teal-550 text-white py-2 rounded-xl text-[10px] font-black cursor-pointer shadow transition-all uppercase tracking-wider text-center"
                    >
                      {t.caseDetail.proofOfRepair}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
