import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, updateDoc, increment, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Case, UserProfile, Hood } from "../lib/constants";

interface AuthContextType {
  authUser: any;
  user: UserProfile | null;
  cases: Case[];
  hood: Hood | null;
  playerPos: { lat: number; lng: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  leaderboard: any[];
  liveActivities: any[];
  initialLoading: boolean;
  notification: { message: string; type: "success" | "info" } | null;
  triggerToast: (message: string, type?: "success" | "info") => void;
  agentModels: { scanner: string; dispatcher: string; resolver: string; moderator: string };
  setAgentModels: React.Dispatch<React.SetStateAction<{ scanner: string; dispatcher: string; resolver: string; moderator: string }>>;
  selectedCaseIdFromChat: string | null;
  setSelectedCaseIdFromChat: (id: string | null) => void;
  activeCameraOpen: boolean;
  setActiveCameraOpen: (open: boolean) => void;
  capturedImageBase64: string;
  setCapturedImageBase64: (img: string) => void;
  scannerResult: any;
  setScannerResult: (result: any) => void;
  scanResultLoading: boolean;
  setScanResultLoading: (loading: boolean) => void;
  isResolveFlow: boolean;
  setIsResolveFlow: (flow: boolean) => void;
  isRejectionFlow: boolean;
  setIsRejectionFlow: (flow: boolean) => void;
  activeResolveCaseId: string | null;
  setActiveResolveCaseId: (id: string | null) => void;
  activeDispatchCase: Case | null;
  setActiveDispatchCase: (c: Case | null) => void;
  dispatchLoading: boolean;
  setDispatchLoading: (loading: boolean) => void;
  dispatchLetter: any;
  setDispatchLetter: (letter: any) => void;
  handleVerifyCase: (caseId: string, vote?: "yes" | "no" | "undo" | "proof") => Promise<void>;
  handleTriggerScan: () => void;
  handleResolveCase: (caseId: string) => void;
  handleCaptureComplete: (base64: string, lat?: number, lng?: number) => Promise<void>;
  handleConfirmScanResult: (editedData?: { damageType: string; severity: number; description: string }) => Promise<void>;
  handleTriggerDispatcher: (caseId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

function computeRank(xp: number) {
  if (xp >= 10000) return { rank: "legend", label: "LEGEND" };
  if (xp >= 7000) return { rank: "champion", label: "CHAMPION" };
  if (xp >= 5000) return { rank: "guardian_commander", label: "GUARDIAN COMMANDER" };
  if (xp >= 3500) return { rank: "city_guardian", label: "CITY GUARDIAN" };
  if (xp >= 2200) return { rank: "ranger_captain", label: "RANGER CAPTAIN" };
  if (xp >= 1200) return { rank: "patrol_ranger", label: "PATROL RANGER" };
  if (xp >= 500) return { rank: "scout_elite", label: "SCOUT ELITE" };
  return { rank: "scout", label: "SCOUT" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [hood, setHood] = useState<Hood | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const [playerPos, setPlayerPos] = useState({ lat: 20.5937, lng: 78.9629 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [selectedCaseIdFromChat, setSelectedCaseIdFromChat] = useState<string | null>(null);
  const [activeCameraOpen, setActiveCameraOpen] = useState(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState("");
  const [scannerResult, setScannerResult] = useState<any>(null);
  const [scanResultLoading, setScanResultLoading] = useState(false);
  const [isResolveFlow, setIsResolveFlow] = useState(false);
  const [isRejectionFlow, setIsRejectionFlow] = useState(false);
  const [activeResolveCaseId, setActiveResolveCaseId] = useState<string | null>(null);
  const [activeDispatchCase, setActiveDispatchCase] = useState<Case | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchLetter, setDispatchLetter] = useState<any>(null);
  const [agentModels, setAgentModels] = useState<{ scanner: string; dispatcher: string; resolver: string; moderator: string }>(() => {
    try {
      const saved = localStorage.getItem("nagarika_agent_models_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { scanner: "gemini-3.1-flash-lite", dispatcher: "gemini-3.1-flash-lite", resolver: "gemini-3.1-flash-lite", moderator: "gemini-3.1-flash-lite" };
  });

  const returnViewRef = useRef<string | null>(null);

  const triggerToast = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setAuthUser(null);
        setUser(null);
        setHood(null);
        setInitialLoading(false);
      } else {
        setAuthUser(fbUser);
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (!userDoc.exists()) {
          setInitialLoading(false);
          return;
        }
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setPlayerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // User data listener
  useEffect(() => {
    if (!authUser) return;
    let unsubHood: (() => void) | null = null;
    const unsubscribe = onSnapshot(doc(db, "users", authUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUser({
          userId: data.uid,
          displayName: data.username,
          email: data.email || "",
          rank: computeRank(data.xp).label,
          xp: data.xp || 0,
          level: data.level || 1,
          homeLatitude: data.homeLatitude,
          homeLongitude: data.homeLongitude,
          homePinned: data.homePinned || false,
          photoURL: data.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + data.username,
          trustScore: data.trustScore || 50,
          city: data.city || "Hyderabad",
          area: data.area || "",
          totalReports: data.totalReports || 0,
          totalVerifications: data.totalVerifications || 0,
          totalResolves: data.totalResolved || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : "",
          warningsCount: data.warningsCount || 0,
          badges: data.badges || [],
          isAdmin: data.isAdmin || false,
          isBlocked: data.isBlocked || false
        });
        if (unsubHood) { unsubHood(); unsubHood = null; }
        if (data.communityId) {
          unsubHood = onSnapshot(doc(db, "communities", data.communityId), (hoodSnap) => {
            if (hoodSnap.exists()) {
              const h = hoodSnap.data();
              setHood({ id: h.communityId, name: h.name, city: h.city, healthScore: h.healthScore || 100, totalCases: h.totalCases || 0, resolvedCases: h.resolvedCases || 0, activeHeroes: h.memberCount || 1 });
            } else {
              setHood({ id: data.communityId, name: "Local Community", city: "Unknown", healthScore: 100, totalCases: 0, resolvedCases: 0, activeHeroes: 1 });
            }
          });
        } else {
          setHood({ id: "default_hood", name: "Global Community", city: "Global", healthScore: 100, totalCases: 0, resolvedCases: 0, activeHeroes: 1 });
        }
        setInitialLoading(false);
      }
    });
    return () => { unsubscribe(); if (unsubHood) unsubHood(); };
  }, [authUser]);

  // Cases listener
  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, "cases"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Case)));
      setInitialLoading(false);
    });
  }, [authUser]);

  const handleVerifyCase = async (caseId: string, vote: "yes" | "no" | "undo" | "proof" = "yes") => {
    if (!user) return;
    if (vote === "proof") {
      setIsResolveFlow(false);
      setIsRejectionFlow(true);
      setActiveResolveCaseId(caseId);
      return;
    }
    try {
      const caseRef = doc(db, "cases", caseId);
      const caseSnap = await getDoc(caseRef);
      if (!caseSnap.exists()) return;
      const caseData = caseSnap.data();
      if (vote === "undo") {
        await updateDoc(caseRef, { verifications: increment(-1), verifiedBy: arrayRemove(user.userId), rejectedBy: arrayRemove(user.userId) });
        await updateDoc(doc(db, "users", user.userId), { xp: increment(-2), totalVerifications: increment(-1) });
        triggerToast("Verification undone.", "success");
      } else {
        if (vote === "yes") {
          const newVerifications = (caseData.verifications || 0) + 1;
          await updateDoc(caseRef, { verifications: increment(1), verifiedBy: arrayUnion(user.userId), status: newVerifications >= 2 && !caseData.complaintGenerated ? "confirmed" : caseData.status });
          try {
            const userSnap = await getDoc(doc(db, "users", user.userId));
            const ud = userSnap.data();
            if (ud?.communityId) {
              await addDoc(collection(db, `communities/${ud.communityId}/messages`), { senderId: user.userId, senderName: ud.username || "Citizen", senderAvatar: ud.avatarUrl || "", text: `I have verified the damage report near ${caseData.address || "the area"}!`, type: "auto_post", caseId, createdAt: serverTimestamp() });
            }
          } catch (_) {}
        } else if (vote === "no") {
          await updateDoc(caseRef, { rejectedBy: arrayUnion(user.userId) });
        }
        await updateDoc(doc(db, "users", user.userId), { xp: increment(2), totalVerifications: increment(1) });
        triggerToast(vote === "no" ? "Negative verification recorded." : "Citizen consensus recorded!", "success");
        const freshSnap = await getDoc(caseRef);
        const updated = freshSnap.data();
        if (updated && updated.verifications >= 2 && !updated.complaintGenerated) {
          triggerToast("2+ citizen consensus reached! Dispatching AI guidance.", "info");
          handleTriggerDispatcher(caseId);
        }
      }
    } catch (err) {
      console.error("Verify failed:", err);
      triggerToast("Verification failed.", "info");
    }
  };

  const handleTriggerScan = () => {
    setIsResolveFlow(false);
    setIsRejectionFlow(false);
    setActiveResolveCaseId(null);
  };

  const handleResolveCase = (caseId: string) => {
    setIsResolveFlow(true);
    setIsRejectionFlow(false);
    setActiveResolveCaseId(caseId);
  };

  const handleCaptureComplete = async (base64: string, capturedLat?: number, capturedLng?: number) => {
    setCapturedImageBase64(base64);
    setActiveCameraOpen(false);
    const finalLat = capturedLat ?? playerPos.lat;
    const finalLng = capturedLng ?? playerPos.lng;

    if (isRejectionFlow && activeResolveCaseId) {
      try {
        const res = await fetch(`${API_BASE}/api/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: activeResolveCaseId, userId: user?.userId, vote: "proof", imageBase64: base64, latitude: finalLat, longitude: finalLng }) });
        if (res.ok) triggerToast("Proof added.", "success");
      } catch (e) { console.error(e); }
      setScannerResult(null);
      return;
    }
    setScanResultLoading(true);
    setScannerResult(null);
    try {
      const compressedBase64 = await compressImageHelper(base64);
      setCapturedImageBase64(compressedBase64);
      let data: any;
      if (isResolveFlow && activeResolveCaseId) {
        const resolveCase = cases.find(c => c.id === activeResolveCaseId);
        const beforeImage = resolveCase?.imageUrl?.replace(/^data:image\/[a-z]+;base64,/, "") || "";
        const res = await fetch(`${API_BASE}/api/agents/resolver`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beforeImageBase64: beforeImage, afterImageBase64: compressedBase64, selectedModel: agentModels.resolver }) });
        data = await res.json();
        setScannerResult(data.analysis || data);
      } else {
        const simplifiedCases = cases.map(c => ({ id: c.id, damageType: c.damageType, latitude: c.latitude, longitude: c.longitude, status: c.status }));
        const res = await fetch(`${API_BASE}/api/agents/scanner`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: compressedBase64, latitude: finalLat, longitude: finalLng, userId: user?.userId, selectedModel: agentModels.scanner, existingCases: simplifiedCases }) });
        data = await res.json();
        setScannerResult(data);
      }
      setScanResultLoading(false);
    } catch (err) {
      console.error("Agent error:", err);
      setScanResultLoading(false);
      triggerToast("AI agent timeout or failure.", "info");
    }
  };

  const handleConfirmScanResult = async (editedData?: { damageType: string; severity: number; description: string }) => {
    if (!scannerResult || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    if (isResolveFlow) {
      try {
        if (activeResolveCaseId) {
          await updateDoc(doc(db, "cases", activeResolveCaseId), { status: "resolved", resolvedBy: uid, updatedAt: new Date().toISOString() });
        }
        await updateDoc(doc(db, "users", uid), { totalResolved: increment(1), xp: increment(25) });
        triggerToast("Repair confirmed! +25 Civic Points awarded.", "success");
      } catch (err) { console.error(err); }
    } else if (scannerResult.success === false && scannerResult.reason === "duplicate") {
      triggerToast("Upvote recorded on nearby duplicate!", "success");
    } else {
      const cItem = scannerResult.case || scannerResult;
      const newCase = { ...cItem, ...(editedData || {}), reportedBy: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      try {
        let finalImageUrl = newCase.imageUrl;
        if (capturedImageBase64) {
          finalImageUrl = capturedImageBase64.startsWith("data:image") ? capturedImageBase64 : `data:image/jpeg;base64,${capturedImageBase64}`;
        }
        newCase.imageUrl = finalImageUrl;
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.data();
        newCase.communityId = userData?.communityId || "default_hood";
        await setDoc(doc(db, "cases", newCase.id), newCase);
        await updateDoc(doc(db, "users", uid), { totalReports: increment(1), xp: increment(10) });
        triggerToast("Issue logged! +10 Civic Points awarded.", "success");
      } catch (err) { console.error(err); }
    }
  };

  const handleTriggerDispatcher = async (caseId: string) => {
    const caseObj = cases.find(c => c.id === caseId);
    if (!caseObj) return;
    setActiveDispatchCase(caseObj);
    setDispatchLoading(true);
    setDispatchLetter(null);
    try {
      const prevCases = cases.filter(c => c.complaintGenerated && c.complaintText).slice(0, 3);
      const previousLettersContext = prevCases.map(c => `[Previously Dispatched Letter]\nIssue: ${c.damageType}\nLocation: ${c.address}\nLetter:\n${c.complaintText || ""}\n---`).join("\n\n");
      const res = await fetch(`${API_BASE}/api/agents/dispatcher`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseData: { id: caseObj.id, damageType: caseObj.damageType, severity: caseObj.severity, description: caseObj.description, address: caseObj.address, city: user?.city || "Hyderabad", area: user?.area || "", lat: caseObj.latitude, lng: caseObj.longitude, verifications: caseObj.verifications, createdAt: caseObj.createdAt }, previousLettersContext, selectedModel: agentModels.dispatcher }) });
      const data = await res.json();
      if (data.success) {
        setDispatchLetter(data.dispatchData);
        const updateFields = { status: "dispatched" as const, complaintGenerated: true, complaintLetter: data.dispatchData.complaintLetter, subject: data.dispatchData.subject, escalationPath: data.dispatchData.escalationPath, rtiQuery: data.dispatchData.rtiQuery };
        await updateDoc(doc(db, "cases", caseId), updateFields);
        setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updateFields } : c));
        triggerToast("Formal complaint letter compiled!", "success");
      }
      setDispatchLoading(false);
    } catch (err) {
      console.error(err);
      setDispatchLoading(false);
      setActiveDispatchCase(null);
    }
  };

  const value: AuthContextType = {
    authUser, user, cases, hood, playerPos, setPlayerPos, leaderboard, liveActivities,
    initialLoading, notification, triggerToast, agentModels, setAgentModels,
    selectedCaseIdFromChat, setSelectedCaseIdFromChat,
    activeCameraOpen, setActiveCameraOpen, capturedImageBase64, setCapturedImageBase64,
    scannerResult, setScannerResult, scanResultLoading, setScanResultLoading,
    isResolveFlow, setIsResolveFlow, isRejectionFlow, setIsRejectionFlow,
    activeResolveCaseId, setActiveResolveCaseId,
    activeDispatchCase, setActiveDispatchCase, dispatchLoading, setDispatchLoading,
    dispatchLetter, setDispatchLetter,
    handleVerifyCase, handleTriggerScan, handleResolveCase, handleCaptureComplete,
    handleConfirmScanResult, handleTriggerDispatcher
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function compressImageHelper(base64Str: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > h && w > MAX) { h *= MAX / w; w = MAX; }
      else if (h > MAX) { w *= MAX / h; h = MAX; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.6).split(";base64,")[1]);
    };
    img.onerror = () => resolve(base64Str.replace(/^data:image\/[a-z]+;base64,/, ""));
    img.src = base64Str.startsWith("data:image") ? base64Str : `data:image/jpeg;base64,${base64Str}`;
  });
}
