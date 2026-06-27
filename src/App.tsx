import React, { useEffect, useState, useRef } from "react";
import { Compass, Users, User, ArrowLeft, RefreshCw, Sparkles, MessageSquare, ExternalLink, Map, Shield, Trophy, Award } from "lucide-react";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

import LoginView from "./components/views/LoginView";
import SignupView from "./components/views/SignupView";
import OnboardingView from "./components/views/OnboardingView";

import LandingView from "./components/views/LandingView";
import GameView from "./components/views/GameView";
import ProfileView from "./components/views/ProfileView";
import CommunityView from "./components/views/CommunityView";
import ScanResultView from "./components/views/ScanResultView";
import RoutePlannerView from "./components/views/RoutePlannerView";
import AdminView from "./components/views/AdminView";
import CameraCapture from "./components/camera/CameraCapture";
import ScratchCard from "./components/rewards/ScratchCard";
import { Case, UserProfile, Hood } from "./lib/constants";

type ViewState = "login" | "signup" | "onboarding" | "landing" | "game" | "profile" | "community" | "scanner_result" | "route_planner" | "admin";

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

const LEVEL_UP_REWARDS_MAP: Record<number, {
  rank: string;
  coinsBonus: number;
  trustBonus: number;
  couponName: string;
  couponCode: string;
  tier: string;
}> = {
  2: {
    rank: "Scout Elite",
    coinsBonus: 100,
    trustBonus: 5,
    couponName: "₹20 Chai Point Voucher",
    couponCode: "CIVIC-CHAI20",
    tier: "Silver"
  },
  3: {
    rank: "Patrol Ranger",
    coinsBonus: 200,
    trustBonus: 5,
    couponName: "10% Off Clean-Green Store",
    couponCode: "CIVIC-ECO10",
    tier: "Gold"
  },
  4: {
    rank: "Ranger Captain",
    coinsBonus: 300,
    trustBonus: 5,
    couponName: "₹50 Local Cafe Discount",
    couponCode: "CIVIC-CAFE50",
    tier: "Platinum"
  },
  5: {
    rank: "City Guardian",
    coinsBonus: 500,
    trustBonus: 10,
    couponName: "1 Month Free Eco-Transit Pass",
    couponCode: "CIVIC-TRANSIT",
    tier: "Diamond"
  },
  6: {
    rank: "Guardian Commander",
    coinsBonus: 750,
    trustBonus: 10,
    couponName: "₹200 Amazon Gift Voucher",
    couponCode: "CIVIC-AMZN200",
    tier: "Diamond"
  },
  7: {
    rank: "Champion",
    coinsBonus: 1000,
    trustBonus: 10,
    couponName: "₹500 BookMyShow Voucher",
    couponCode: "CIVIC-SHOW500",
    tier: "Diamond"
  },
  8: {
    rank: "Legend",
    coinsBonus: 2000,
    trustBonus: 20,
    couponName: "₹1000 Department Store Gift Card",
    couponCode: "CIVIC-LEGEND",
    tier: "Diamond"
  }
};

export default function App() {
  const [view, setView] = useState<ViewState>("landing");
  const [initialLeaderboardOpen, setInitialLeaderboardOpen] = useState(false);

  const [levelUpData, setLevelUpData] = useState<{
    level: number;
    rank: string;
    coinsBonus: number;
    trustBonus: number;
    couponName: string;
    couponCode: string;
    tier: string;
  } | null>(null);

  
  // Patrol Coordinate state - Koramangala Bangalore
  const [playerPos, setPlayerPos] = useState({ lat: 20.5937, lng: 78.9629 });

  // Core full-stack state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [hood, setHood] = useState<Hood | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const [selectedCaseIdFromChat, setSelectedCaseIdFromChat] = useState<string | null>(null);
  
  // Loading transitions
  const [initialLoading, setInitialLoading] = useState(true);
  const [scanResultLoading, setScanResultLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Active overlays / flow state
  const [activeCameraOpen, setActiveCameraOpen] = useState(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState("");
  const [scannerResult, setScannerResult] = useState<any>(null);
  const [scratchReward, setScratchReward] = useState<any>(null);
  const [returnView, setReturnView] = useState<ViewState | null>(null);
  const [agentModels, setAgentModels] = useState<{
    scanner: string;
    dispatcher: string;
    resolver: string;
    moderator: string;
  }>(() => {
    try {
      const saved = localStorage.getItem("civic_succedent_agent_models_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const legacyModel = localStorage.getItem("civic_succedent_selected_model") || "gemini-3.1-flash-lite";
    const defaultModel = legacyModel === "gemini-2.5-flash" ? "gemini-3.1-flash-lite" : legacyModel;
    return {
      scanner: defaultModel,
      dispatcher: defaultModel,
      resolver: defaultModel,
      moderator: defaultModel
    };
  });

  // Resolution comparison flow states
  const [isResolveFlow, setIsResolveFlow] = useState(false);
  const [isRejectionFlow, setIsRejectionFlow] = useState(false);
  const [activeResolveCaseId, setActiveResolveCaseId] = useState<string | null>(null);

  // Active dispatcher overlay
  const [activeDispatchCase, setActiveDispatchCase] = useState<Case | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchLetter, setDispatchLetter] = useState<any>(null);

  const [authUser, setAuthUser] = useState<any>(null);

  // Listen to hash changes for all pages
  useEffect(() => {
    const handleHashChange = () => {
      if (initialLoading) return;

      const hash = window.location.hash.replace("#", "").replace("/", "");
      
      let targetView: ViewState = "landing";
      if (hash === "login") targetView = "login";
      else if (hash === "signup") targetView = "signup";
      else if (hash === "onboarding") targetView = "onboarding";
      else if (hash === "patrol" || hash === "game") targetView = "game";
      else if (hash === "maps" || hash === "route_planner") targetView = "route_planner";
      else if (hash === "community") targetView = "community";
      else if (hash === "profile") targetView = "profile";
      else if (hash === "admin") targetView = "admin";
      else if (hash === "scanner_result") targetView = "scanner_result";

      // Auth validation redirect logic
      if (!auth.currentUser) {
        if (targetView !== "login" && targetView !== "signup" && targetView !== "landing") {
          window.location.replace("#");
          setView("landing");
          return;
        }
      } else {
        if (targetView === "login" || targetView === "signup") {
          window.location.replace("#patrol");
          setView("game");
          return;
        }
        if (targetView === "admin" && !user?.isAdmin) {
          window.location.replace("#patrol");
          setView("game");
          return;
        }
      }

      setView(targetView);
    };

    window.addEventListener("hashchange", handleHashChange);
    
    // Initial parse
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [initialLoading, authUser, user]);

  // Handle map resizing layout fixes when active view changes
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
    return () => clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setAuthUser(null);
        const hash = window.location.hash.replace("#", "").replace("/", "");
        if (hash !== "login" && hash !== "signup") {
          window.location.replace("#");
          setView("landing");
        }
        setInitialLoading(false);
      } else {
        setAuthUser(authUser);
        const hash = window.location.hash.replace("#", "").replace("/", "");
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (!userDoc.exists()) {
          window.location.replace("#onboarding");
          setView("onboarding");
          setInitialLoading(false);
        } else {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                setPlayerPos({ lat: latitude, lng: longitude });
              },
              (geoErr) => console.log("Startup geolocation check skipped or denied:", geoErr.message),
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
          }
          
          let targetView: ViewState = "game";
          if (hash === "maps" || hash === "route_planner") targetView = "route_planner";
          else if (hash === "community") targetView = "community";
          else if (hash === "profile") targetView = "profile";
          else if (hash === "admin") targetView = "admin";
          
          const targetHash = targetView === "game" ? "patrol" : (targetView === "route_planner" ? "maps" : targetView);
          window.location.replace(`#${targetHash}`);
          setView(targetView);
        }
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      setAuthUser(null);
      window.location.replace("#");
      setView("landing");
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore for user data
  useEffect(() => {
    if (!authUser) return;
    let unsubHood: (() => void) | null = null;
    
    const unsubscribe = onSnapshot(doc(db, 'users', authUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUser({
          userId: data.uid,
          displayName: data.username,
          rank: computeRank(data.xp, data.trustScore).label,
          xp: data.xp || 0,
          coins: data.coins || 0,
          level: data.level || 1,
          homeLatitude: data.homeLatitude,
          homeLongitude: data.homeLongitude,
          homePinned: data.homePinned || false,
          empireValuation: data.empireValuation || 0,
          photoURL: data.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + data.username,
          trustScore: data.trustScore || 50,
          activePatrols: 1,
          reportsFiled: data.totalReports || 0,
          resolvedRepairs: data.totalResolved || 0,
          totalReports: data.totalReports || 0,
          totalResolves: data.totalResolved || 0,
          totalResolved: data.totalResolved || 0,
          warningsCount: data.warningsCount || 0,
          badges: data.badges || [],
          isAdmin: data.isAdmin || false,
          isBlocked: data.isBlocked || false
        });

        // Clean up previous community listener if communityId changes
        if (unsubHood) {
          unsubHood();
          unsubHood = null;
        }

        // Subscribing to the community document in real-time
        if (data.communityId) {
          const hoodRef = doc(db, 'communities', data.communityId);
          unsubHood = onSnapshot(hoodRef, (hoodSnap) => {
            if (hoodSnap.exists()) {
              const hData = hoodSnap.data();
              setHood({
                id: hData.communityId,
                name: hData.name,
                city: hData.city,
                healthScore: hData.healthScore || 100,
                totalCases: hData.totalCases || 0,
                resolvedCases: hData.resolvedCases || 0,
                activeHeroes: hData.memberCount || 1
              });
            } else {
              setHood({
                id: data.communityId,
                name: "Local Community",
                city: "Unknown",
                healthScore: 100,
                totalCases: 0,
                resolvedCases: 0,
                activeHeroes: 1
              });
            }
          });
        } else {
          // Fallback if user doesn't have communityId
          setHood({
            id: "default_hood",
            name: "Global Community",
            city: "Global",
            healthScore: 100,
            totalCases: 0,
            resolvedCases: 0,
            activeHeroes: 1
          });
        }
      }
    });
    return () => {
      unsubscribe();
      if (unsubHood) unsubHood();
    };
  }, [authUser]);

  // We need computeRank helper inside App
  function computeRank(xp: number, trustScore: number) {
    if (xp >= 10000) return { rank: 'legend', label: 'LEGEND' };
    if (xp >= 7000) return { rank: 'champion', label: 'CHAMPION' };
    if (xp >= 5000) return { rank: 'guardian_commander', label: 'GUARDIAN COMMANDER' };
    if (xp >= 3500) return { rank: 'city_guardian', label: 'CITY GUARDIAN' };
    if (xp >= 2200) return { rank: 'ranger_captain', label: 'RANGER CAPTAIN' };
    if (xp >= 1200) return { rank: 'patrol_ranger', label: 'PATROL RANGER' };
    if (xp >= 500) return { rank: 'scout_elite', label: 'SCOUT ELITE' };
    return { rank: 'scout', label: 'SCOUT' };
  }

  const checkLevelUp = async (uid: string, userData: any, newXp: number, currentLevel: number) => {
    let newLevel = 1;
    if (newXp >= 10000) newLevel = 8;
    else if (newXp >= 7000) newLevel = 7;
    else if (newXp >= 5000) newLevel = 6;
    else if (newXp >= 3500) newLevel = 5;
    else if (newXp >= 2200) newLevel = 4;
    else if (newXp >= 1200) newLevel = 3;
    else if (newXp >= 500) newLevel = 2;

    if (newLevel > currentLevel) {
      const levelUpRewards = LEVEL_UP_REWARDS_MAP[newLevel];
      if (!levelUpRewards) return;

      try {
        const { doc, updateDoc, increment, setDoc } = await import('firebase/firestore');

        // 1. Award coins and trust score bonuses directly to the user document
        await updateDoc(doc(db, 'users', uid), {
          coins: increment(levelUpRewards.coinsBonus),
          trustScore: increment(levelUpRewards.trustBonus),
          level: newLevel
        });

        // 2. Add the corresponding Commercial Coupon to subcollection users/{uid}/rewards
        const couponRewardObj = {
          id: "lvl_coupon_" + newLevel + "_" + Date.now(),
          tier: levelUpRewards.tier,
          coupon: levelUpRewards.couponName,
          couponCode: levelUpRewards.couponCode,
          scratched: true, // Unlocked directly
          couponRedeemed: false,
          message: `Level ${newLevel} (${levelUpRewards.rank}) Reward!`,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', uid, 'rewards', couponRewardObj.id), couponRewardObj);

        // 3. Set levelUpData to show the Level Up overlay
        setLevelUpData({
          level: newLevel,
          rank: levelUpRewards.rank,
          coinsBonus: levelUpRewards.coinsBonus,
          trustBonus: levelUpRewards.trustBonus,
          couponName: levelUpRewards.couponName,
          couponCode: levelUpRewards.couponCode,
          tier: levelUpRewards.tier
        });
      } catch (err) {
        console.error("Error during level up processing:", err);
      }
    }
  };

  const lastRankRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.rank) {
      if (lastRankRef.current && lastRankRef.current !== user.rank) {
        // User ranked up! Let's post to the community chat.
        const postRankUp = async () => {
          try {
            const userSnap = await getDoc(doc(db, 'users', user.userId));
            const userData = userSnap.data();
            if (userData?.communityId) {
              await addDoc(collection(db, `communities/${userData.communityId}/messages`), {
                senderId: "system_ai",
                senderName: "CS AI-agent",
                senderAvatar: "https://api.dicebear.com/9.x/bottts/svg?seed=cs_ai",
                text: `🏆 Level Up Alert! Congratulations to @${user.displayName} on ranking up to ${user.rank}! Keep making your neighborhood safer!`,
                type: "auto_post",
                createdAt: serverTimestamp()
              });
            }
          } catch (e) {
            console.error("Failed to post rank up message:", e);
          }
        };
        postRankUp();
      }
      lastRankRef.current = user.rank;
    }
  }, [user?.rank]);

  // Listen to cases
  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbCases = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setCases(fbCases);
      setInitialLoading(false); // we can stop loading once cases load
    });
    return () => unsubscribe();
  }, [authUser]);

  // Listen to user's empire buildings
  const [empire, setEmpire] = useState<any[]>([]);
  useEffect(() => {
    if (!authUser) {
      setEmpire([]);
      return;
    }
    const q = collection(db, `users/${authUser.uid}/empire`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const buildings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmpire(buildings);
    });
    return () => unsubscribe();
  }, [authUser]);

  const handleEstablishHQ = async (lat: number, lng: number) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      const { doc, updateDoc, setDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', uid), {
        homeLatitude: lat,
        homeLongitude: lng,
        homePinned: true,
        coins: 200,
        empireValuation: 200
      });
      // Create initial Scout House Level 1
      const scoutHouseId = "scout_house_hq";
      await setDoc(doc(db, `users/${uid}/empire`, scoutHouseId), {
        id: scoutHouseId,
        type: "scout_house",
        level: 1,
        latitude: lat,
        longitude: lng,
        incomePerHr: 5,
        builtAt: new Date().toISOString(),
        lastClaimedAt: new Date().toISOString()
      });
      triggerToast("Welcome Commander! Your Civic Headquarters has been established.", "success");
    } catch (err) {
      console.error("Failed to establish HQ:", err);
      triggerToast("Could not save headquarters position.", "info");
    }
  };

  const handleCollectIncome = async (buildingId: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      const { doc, getDoc, updateDoc, increment } = await import('firebase/firestore');
      const bRef = doc(db, `users/${uid}/empire`, buildingId);
      const bSnap = await getDoc(bRef);
      if (!bSnap.exists()) return;
      const bData = bSnap.data();
      
      const lastClaimed = new Date(bData.lastClaimedAt || bData.builtAt);
      const now = new Date();
      const hoursElapsed = Math.max(0, (now.getTime() - lastClaimed.getTime()) / 3600000);
      const accumulatedCoins = Math.floor(hoursElapsed * (bData.incomePerHr || 5));
      
      if (accumulatedCoins <= 0) {
        triggerToast("No passive coins accumulated yet! Try again in a bit.", "info");
        return;
      }
      
      // Update user coins and lastClaimedAt
      await updateDoc(doc(db, 'users', uid), {
        coins: increment(accumulatedCoins)
      });
      await updateDoc(bRef, {
        lastClaimedAt: now.toISOString()
      });
      
      triggerToast(`Collected +${accumulatedCoins} Coins from ${bData.type.replace("_", " ")}!`, "success");
    } catch (err) {
      console.error("Collect income failed:", err);
      triggerToast("Failed to collect income.", "info");
    }
  };

  const handleUpgradeScoutHouse = async (buildingId: string) => {
    if (!auth.currentUser || !user) return;
    const uid = auth.currentUser.uid;
    try {
      const { doc, getDoc, updateDoc, increment } = await import('firebase/firestore');
      const bRef = doc(db, `users/${uid}/empire`, buildingId);
      const bSnap = await getDoc(bRef);
      if (!bSnap.exists()) return;
      const bData = bSnap.data();
      
      const currentLevel = bData.level || 1;
      if (currentLevel >= 3) {
        triggerToast("Scout House is already at maximum level!", "info");
        return;
      }
      
      const cost = currentLevel === 1 ? 200 : 500;
      const nextIncome = currentLevel === 1 ? 15 : 40;
      
      if ((user.coins || 0) < cost) {
        triggerToast(`Insufficient Coins! Upgrade costs ${cost} Coins.`, "info");
        return;
      }
      
      // Deduct coins and update level/income/valuation
      await updateDoc(doc(db, 'users', uid), {
        coins: increment(-cost),
        empireValuation: increment(cost)
      });
      await updateDoc(bRef, {
        level: currentLevel + 1,
        incomePerHr: nextIncome,
        lastClaimedAt: new Date().toISOString() // Reset last claim date
      });
      
      triggerToast(`Upgraded Scout House to Level ${currentLevel + 1}! Income boosted to +${nextIncome} Coins/hr.`, "success");
    } catch (err) {
      console.error("Upgrade failed:", err);
      triggerToast("Failed to upgrade building.", "info");
    }
  };

  const handleBuyBuilding = async (type: string, lat: number, lng: number) => {
    if (!auth.currentUser || !user) return;
    const uid = auth.currentUser.uid;
    
    let cost = 150;
    let income = 10;
    if (type === "solar_grid") { cost = 150; income = 10; }
    else if (type === "repair_depot") { cost = 300; income = 25; }
    else if (type === "tech_lab") { cost = 800; income = 75; }
    
    if ((user.coins || 0) < cost) {
      triggerToast(`Insufficient Coins! Building costs ${cost} Coins.`, "info");
      return;
    }
    
    try {
      const { doc, collection, addDoc, updateDoc, increment } = await import('firebase/firestore');
      
      // Create the building in empire subcollection
      await addDoc(collection(db, `users/${uid}/empire`), {
        type,
        level: 1,
        latitude: lat,
        longitude: lng,
        incomePerHr: income,
        builtAt: new Date().toISOString(),
        lastClaimedAt: new Date().toISOString()
      });
      
      // Deduct coins and add valuation
      await updateDoc(doc(db, 'users', uid), {
        coins: increment(-cost),
        empireValuation: increment(cost)
      });
      
      triggerToast(`Constructed ${type.replace("_", " ").toUpperCase()} successfully!`, "success");
    } catch (err) {
      console.error("Failed to construct building:", err);
      triggerToast("Error placing building.", "info");
    }
  };

  // Helper to show temporary toasts
  const triggerToast = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Verify Case action
  const handleVerifyCase = async (caseId: string, vote: "yes" | "no" | "undo" | "proof" = "yes") => {
    if (!user) return;
    
    if (vote === "proof") {
      setReturnView(view);
      setIsResolveFlow(false);
      setIsRejectionFlow(true);
      setActiveResolveCaseId(caseId);
      setActiveCameraOpen(true);
      return;
    }

    try {
      const { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } = await import('firebase/firestore');
      const caseRef = doc(db, 'cases', caseId);
      const caseSnap = await getDoc(caseRef);
      if (!caseSnap.exists()) return;
      const caseData = caseSnap.data();

      if (vote === "undo") {
        await updateDoc(caseRef, {
          verifications: increment(-1),
          verifiedBy: arrayRemove(user.userId),
          rejectedBy: arrayRemove(user.userId)
        });
        await updateDoc(doc(db, 'users', user.userId), {
          xp: increment(-30),
          coins: increment(-50),
          totalVerifications: increment(-1)
        });
        triggerToast("Verification undone.", "success");
      } else {
        if (vote === "yes") {
          const newVerifications = (caseData.verifications || 0) + 1;
          await updateDoc(caseRef, {
            verifications: increment(1),
            verifiedBy: arrayUnion(user.userId),
            status: newVerifications >= 2 && !caseData.complaintGenerated ? "confirmed" : caseData.status
          });

          // Auto-post verification activity
          try {
            const userSnap = await getDoc(doc(db, "users", user.userId));
            const userData = userSnap.data();
            if (userData?.communityId) {
              await addDoc(collection(db, `communities/${userData.communityId}/messages`), {
                senderId: user.userId,
                senderName: userData.username || "Scout",
                senderAvatar: userData.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userData.username || 'Scout'}`,
                text: `🔍 I have verified the damage report near ${caseData.address || "the area"}!`,
                type: "auto_post",
                caseId: caseId,
                createdAt: serverTimestamp()
              });
            }
          } catch (err) {
            console.error("Auto post verification chat error:", err);
          }
        } else if (vote === "no") {
          await updateDoc(caseRef, {
            rejectedBy: arrayUnion(user.userId)
          });

          // Auto-post dispute activity
          try {
            const userSnap = await getDoc(doc(db, "users", user.userId));
            const userData = userSnap.data();
            if (userData?.communityId) {
              await addDoc(collection(db, `communities/${userData.communityId}/messages`), {
                senderId: "system_ai",
                senderName: "CS AI-agent",
                senderAvatar: "https://api.dicebear.com/9.x/bottts/svg?seed=cs_ai",
                text: `⚠️ Defect disputed: @${userData.username || "Scout"} voted 'No' on the ${(caseData.damageType || "").replace("_", " ")} at ${caseData.address || "the area"} (it may not exist or is already fixed).`,
                type: "auto_post",
                createdAt: serverTimestamp()
              });
            }
          } catch (err) {
            console.error("Auto post verification dispute error:", err);
          }
        }

        const userRef = doc(db, 'users', user.userId);
        const userSnap = await getDoc(userRef);
        let currentLevel = 1;
        let currentXp = 0;
        if (userSnap.exists()) {
          const uData = userSnap.data();
          currentLevel = uData.level || 1;
          currentXp = uData.xp || 0;
        }

        await updateDoc(userRef, {
          xp: increment(30),
          coins: increment(50),
          totalVerifications: increment(1)
        });

        await checkLevelUp(user.userId, { level: currentLevel, xp: currentXp }, currentXp + 30, currentLevel);

        if (vote === "no") {
          triggerToast("Negative verification recorded.", "success");
        } else {
          triggerToast("Scouting Consensus recorded! XP and trust score boosted.", "success");
        }

        const freshCaseSnap = await getDoc(caseRef);
        const updatedCase = freshCaseSnap.data();
        if (updatedCase && updatedCase.verifications >= 2 && !updatedCase.complaintGenerated) {
          triggerToast("2+ citizen consensus reached! Dispatching government letter.", "info");
          handleTriggerDispatcher(caseId);

          // Auto-post case confirmation
          try {
            const userSnap = await getDoc(doc(db, "users", user.userId));
            const userData = userSnap.data();
            if (userData?.communityId) {
              await addDoc(collection(db, `communities/${userData.communityId}/messages`), {
                senderId: "system_ai",
                senderName: "CS AI-agent",
                senderAvatar: "https://api.dicebear.com/9.x/bottts/svg?seed=cs_ai",
                text: `✅ Consensus reached: The ${(updatedCase.damageType || "").replace("_", " ")} reported at ${updatedCase.address || "the area"} has been verified by the community and is now CONFIRMED! 🏛️ Dispatch letter sent to municipality.`,
                type: "auto_post",
                createdAt: serverTimestamp()
              });
            }
          } catch (msgErr) {
            console.error("Failed to post confirmation message:", msgErr);
          }
        }
      }
    } catch (err) {
      console.error("Verify request failed:", err);
      triggerToast("Verification failed.", "info");
    }
  };

  // Trigger Scanner Camera Capture
  const handleTriggerScan = () => {
    setReturnView(view);
    setIsResolveFlow(false);
    setIsRejectionFlow(false);
    setActiveResolveCaseId(null);
    setActiveCameraOpen(true);
  };

  // Trigger Resolver Camera Capture (Proof repair)
  const handleResolveCase = (caseId: string) => {
    setReturnView(view);
    setIsResolveFlow(true);
    setIsRejectionFlow(false);
    setActiveResolveCaseId(caseId);
    setActiveCameraOpen(true);
  };

  // Receive Captured Base64 Photo
  const handleCaptureComplete = async (base64: string) => {
    setCapturedImageBase64(base64);
    setActiveCameraOpen(false);

    if (isRejectionFlow && activeResolveCaseId) {
      try {
        const res = await fetch(`${API_BASE}/api/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: activeResolveCaseId,
            userId: user?.userId,
            vote: "proof",
            imageBase64: base64
          })
        });
        if (!res.ok) {
          let errorMsg = `Verification request failed with status ${res.status}`;
          try {
            const errText = await res.text();
            if (errText.includes("<!doctype") || errText.includes("<html")) {
              errorMsg = "Server returned HTML error page. The backend server might be offline.";
            } else {
              errorMsg = errText.slice(0, 100);
            }
          } catch (_) {}
          throw new Error(errorMsg);
        }
        const result = await res.json();
        if (result.success) {
          triggerToast("Proof of invalid report added.", "success");
        } else {
          triggerToast(result.error || "Failed to add proof.", "info");
        }
      } catch (e: any) {
        console.error(e);
        triggerToast(e.message || "Failed to submit verification.", "info");
      }
      setView(returnView || "game");
      setReturnView(null);
      setScannerResult(null);
      setScanResultLoading(false);
      setCapturedImageBase64("");
      return;
    }

    setView("scanner_result");
    setScanResultLoading(true);
    setScannerResult(null);

    try {
      // Compress the image before uploading to keep payload small and avoid server processing bottlenecks
      const compressedBase64 = await compressImageHelper(base64);
      setCapturedImageBase64(compressedBase64);

      let data: any;
      if (isResolveFlow && activeResolveCaseId) {
        // Run Resolver Agent comparing previous damage image with this new photo
        const res = await fetch(`${API_BASE}/api/agents/resolver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: activeResolveCaseId,
            afterImageBase64: compressedBase64,
            userId: user?.userId,
            selectedModel: agentModels.resolver
          })
        });

        if (!res.ok) {
          let errorMsg = `Resolver request failed with status ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } catch (_) {
            try {
              const text = await res.text();
              if (text.includes("<!doctype") || text.includes("<html")) {
                errorMsg = "Server returned an HTML error page. The backend server might be restarting or offline.";
              } else {
                errorMsg = text.slice(0, 100) || errorMsg;
              }
            } catch (_) {}
          }
          throw new Error(errorMsg);
        }

        data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setScannerResult(data.analysis || data);
      } else {
        // Run Scanner Agent analyzing new defect photo
        const res = await fetch(`${API_BASE}/api/agents/scanner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: compressedBase64,
            latitude: playerPos.lat,
            longitude: playerPos.lng,
            userId: user?.userId,
            selectedModel: agentModels.scanner
          })
        });

        if (!res.ok) {
          let errorMsg = `Scanner request failed with status ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } catch (_) {
            try {
              const text = await res.text();
              if (text.includes("<!doctype") || text.includes("<html")) {
                errorMsg = "Server returned an HTML error page. The backend server might be restarting or offline.";
              } else {
                errorMsg = text.slice(0, 100) || errorMsg;
              }
            } catch (_) {}
          }
          throw new Error(errorMsg);
        }

        data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setScannerResult(data);
      }
      setScanResultLoading(false);
    } catch (err: any) {
      console.error("AI agent processing error:", err);
      setScanResultLoading(false);
      triggerToast("Gemini Agent timeout or failure. Please try again.", "info");
      setView("game");
    }
  };

  // Confirm and log report to database
  const handleConfirmScanResult = async (editedData?: {
    damageType: string;
    severity: number;
    description: string;
  }) => {
    if (!scannerResult || !auth.currentUser) return;

    const uid = auth.currentUser.uid;

    if (isResolveFlow) {
      // In repair flow: generate Scratch card reward!
      try {
        const { generateScratchCard } = await import('./lib/rewards');
        const rwd = generateScratchCard();

        const rewardObj = {
          id: "rwd_" + Date.now(),
          tier: rwd.tier,
          xpEarned: rwd.xpEarned,
          trustBoost: rwd.trustBoost,
          coinsEarned: rwd.coinsEarned,
          scratched: false,
          couponRedeemed: false,
          message: rwd.message,
          createdAt: new Date().toISOString()
        };

        const { doc, setDoc, updateDoc, increment } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', uid, 'rewards', rewardObj.id), rewardObj);

        // Update resolver's totalResolved count
        await updateDoc(doc(db, 'users', uid), {
          totalResolved: increment(1)
        });

        // Also update the case
        if (activeResolveCaseId) {
          const { updateDoc, getDoc, doc, increment } = await import('firebase/firestore');
          const caseRef = doc(db, 'cases', activeResolveCaseId);
          await updateDoc(caseRef, {
            status: "resolved",
            resolvedBy: uid,
            updatedAt: new Date().toISOString()
          });

          // Auto-post repair resolved
          try {
            const caseSnap = await getDoc(caseRef);
            const caseData = caseSnap.data();
            const userSnap = await getDoc(doc(db, "users", uid));
            const userData = userSnap.data();
            if (userData?.communityId && caseData) {
              await addDoc(collection(db, `communities/${userData.communityId}/messages`), {
                senderId: uid,
                senderName: userData.username || "Scout",
                senderAvatar: userData.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userData.username || 'Scout'}`,
                text: `🔧 I have provided proof of repair for the damage near ${caseData.address || "the area"}!`,
                type: "auto_post",
                caseId: activeResolveCaseId,
                createdAt: serverTimestamp()
              });

              // Update community stats in Firestore for resolved cases
              const communityRef = doc(db, 'communities', userData.communityId);
              const communitySnap = await getDoc(communityRef);
              if (communitySnap.exists()) {
                const hData = communitySnap.data();
                const currentTotal = hData.totalCases || 0;
                const currentResolved = (hData.resolvedCases || 0) + 1;
                const newHealth = currentTotal > 0 ? Math.min(100, Math.floor((currentResolved / currentTotal) * 100)) : 100;
                await updateDoc(communityRef, {
                  resolvedCases: increment(1),
                  healthScore: newHealth
                });
              }
            }
          } catch (msgErr) {
            console.error("Failed to post resolution message or update community stats:", msgErr);
          }
        }
        
        setScratchReward(rewardObj);
        triggerToast("Repair confirmed by AI! Scratch reward card unlocked.", "success");
      } catch (err) {
        console.error("Error creating reward:", err);
        setView(returnView || "game");
        setReturnView(null);
      }
    } else if (scannerResult.success === false && scannerResult.reason === "duplicate") {
      // Duplicate path: upvote recorded, just reward small consensus XP
      triggerToast("Scout upvote recorded on nearby duplicates! +15 XP", "success");
      setView(returnView || "game");
      setReturnView(null);
    } else {
      // New scan success path: first update case details in DB if edited
      const cItem = scannerResult.case || scannerResult;
      
      const newCase = {
        ...cItem,
        ...(editedData || {}),
        reportedBy: uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const { setDoc, getDoc, doc } = await import('firebase/firestore');
        
        let finalImageUrl = newCase.imageUrl;
        if (capturedImageBase64) {
          finalImageUrl = capturedImageBase64.startsWith('data:image') 
            ? capturedImageBase64 
            : `data:image/jpeg;base64,${capturedImageBase64}`;
        }
        newCase.imageUrl = finalImageUrl;

        // Fetch user data to retrieve communityId
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.data();
        if (userData?.communityId) {
          newCase.communityId = userData.communityId;
        } else {
          newCase.communityId = 'default_hood';
        }

        // Save case to Firestore
        await setDoc(doc(db, 'cases', newCase.id), newCase);

        // Auto-post new defect report and update community statistics
        if (userData?.communityId) {
          try {
            await addDoc(collection(db, `communities/${userData.communityId}/messages`), {
              senderId: uid,
              senderName: userData.username || "Scout",
              senderAvatar: userData.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userData.username || 'Scout'}`,
              text: `🚨 I have uploaded a new damage report near ${newCase.address || "the area"}!`,
              type: "auto_post",
              caseId: newCase.id,
              createdAt: serverTimestamp()
            });

            // Update community stats in Firestore
            const { updateDoc, increment } = await import('firebase/firestore');
            const communityRef = doc(db, 'communities', userData.communityId);
            const communitySnap = await getDoc(communityRef);
            if (communitySnap.exists()) {
              const hData = communitySnap.data();
              const currentTotal = (hData.totalCases || 0) + 1;
              const currentResolved = hData.resolvedCases || 0;
              const newHealth = currentTotal > 0 ? Math.min(100, Math.floor((currentResolved / currentTotal) * 100)) : 100;
              await updateDoc(communityRef, {
                totalCases: increment(1),
                healthScore: newHealth
              });
            }
          } catch (msgErr) {
            console.error("Failed to post scan chat message or update community stats:", msgErr);
          }
        }

        // User stats update
        if (user) {
          const { updateDoc, increment } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', uid), {
            totalReports: increment(1)
          });
        }

        const { generateScratchCard } = await import('./lib/rewards');
        const rwd = generateScratchCard();

        const rewardObj = {
          id: "rwd_" + Date.now(),
          tier: rwd.tier,
          xpEarned: rwd.xpEarned,
          trustBoost: rwd.trustBoost,
          coinsEarned: rwd.coinsEarned,
          scratched: false,
          couponRedeemed: false,
          message: rwd.message,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', uid, 'rewards', rewardObj.id), rewardObj);
        setScratchReward(rewardObj);
        triggerToast("Issue logged on neighborhood grid! Scratch card unlocked.", "success");
      } catch (err) {
        console.error("Error creating case/reward:", err);
        setView(returnView || "game");
        setReturnView(null);
      }
    }
  };

  // Scratch card revealed & claimed
  const handleClaimScratchReward = async () => {
    if (scratchReward && auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        const { doc, updateDoc, increment, getDoc } = await import('firebase/firestore');
        
        // 1. Mark Scratch Card as scratched in Firestore subcollection
        await updateDoc(doc(db, 'users', uid, 'rewards', scratchReward.id), {
          scratched: true
        });

        // 2. Fetch current user document to know current level & XP before updating
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const oldXp = userData.xp || 0;
          const currentLevel = userData.level || 1;
          
          const xpToAdd = scratchReward.xpEarned || 0;
          const trustToAdd = scratchReward.trustBoost || 0;
          const coinsToAdd = scratchReward.coinsEarned || 0;

          const newXp = oldXp + xpToAdd;

          // 3. Update stats
          await updateDoc(userRef, {
            xp: increment(xpToAdd),
            trustScore: increment(trustToAdd),
            coins: increment(coinsToAdd)
          });

          // 4. Check for level up!
          await checkLevelUp(uid, userData, newXp, currentLevel);
        }
      } catch (err) {
        console.error("Failed to update user profile with scratch card rewards:", err);
      }
    }
    setScratchReward(null);
    setScannerResult(null);
    setCapturedImageBase64("");
    setView(returnView || "game");
    setReturnView(null);
  };

  // Reset progress data hook (Dev luxury)
  const handleResetApp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/reset`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        triggerToast("Full municipal database reset successfully! State reloaded.", "success");
        setView("landing");
      }
    } catch (err) {
      console.error("Reset app error:", err);
    }
  };

  // Run Dispatcher Agent on specific case (creates formal government complaint letters)
  const handleTriggerDispatcher = async (caseId: string) => {
    const caseObj = cases.find(c => c.id === caseId);
    if (!caseObj) return;

    setActiveDispatchCase(caseObj);
    setDispatchLoading(true);
    setDispatchLetter(null);

    try {
      const res = await fetch(`${API_BASE}/api/agents/dispatcher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, selectedModel: agentModels.dispatcher })
      });
      const data = await res.json();
      if (data.success) {
        setDispatchLetter(data.dispatchData);
        
        // Persist dispatch letter into Firestore cases collection
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const caseRef = doc(db, 'cases', caseId);
          await updateDoc(caseRef, {
            status: "dispatched",
            complaintGenerated: true,
            complaintLetter: data.dispatchData.complaintLetter,
            subject: data.dispatchData.subject,
            escalationPath: data.dispatchData.escalationPath,
            rtiQuery: data.dispatchData.rtiQuery
          });
        } catch (dbErr) {
          console.error("Failed to save dispatch letter to firestore:", dbErr);
        }

        triggerToast("Formal municipal directive compiled and dispatched!", "success");
      } else {
        triggerToast("Failed to compile government directive.", "info");
        setActiveDispatchCase(null);
      }
      setDispatchLoading(false);
    } catch (err) {
      console.error("Dispatcher API failed:", err);
      setDispatchLoading(false);
      setActiveDispatchCase(null);
    }
  };

  // Render loading screen on app initialize
  const isAuthView = view === "login" || view === "signup" || view === "onboarding";
  const isUnauthLanding = view === "landing" && !authUser;
  if (initialLoading || (!isAuthView && !isUnauthLanding && (!user || !hood))) {
    return (
      <div className="bg-[#F5F0E8] min-h-screen font-sans flex flex-col justify-center items-center text-[#191c22]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#006a65] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="font-display text-xl font-black uppercase tracking-widest text-[#775a00]">
            CIVIC SUCCEDENT GRID
          </h2>
          <p className="text-xs text-zinc-500 font-bold">Synchronizing municipal telemetry logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F0E8] min-h-screen text-[#191c22] font-sans overflow-x-hidden">
      
      {/* Toast Notification Box */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] max-w-sm w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
            notification.type === "success" 
              ? "bg-[#e1fbf2] text-[#006f47] border-[#00af6c]/20" 
              : "bg-[#eef3fc] text-[#1b51b7] border-[#2f6ce5]/20"
          }`}>
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs font-bold leading-relaxed">{notification.message}</div>
          </div>
        </div>
      )}

      <div style={{ display: view === "login" ? "block" : "none" }}>
        <LoginView onSwitchToSignup={() => { window.location.replace("#signup"); }} onGoHome={() => { window.location.hash = ""; }} />
      </div>

      <div style={{ display: view === "signup" ? "block" : "none" }}>
        <SignupView onSwitchToLogin={() => { window.location.replace("#login"); }} onGoHome={() => { window.location.hash = ""; }} />
      </div>

      <div style={{ display: view === "onboarding" ? "block" : "none" }}>
        <OnboardingView onComplete={() => { window.location.hash = "patrol"; }} />
      </div>

      {/* Main Content Area */}
      <div style={{ display: view === "landing" ? "block" : "none" }}>
        <LandingView
          user={user}
          isAuthenticated={!!authUser}
          onLogin={() => { window.location.hash = "login"; }}
          onSignup={() => { window.location.hash = "signup"; }}
          onStartMission={() => { window.location.hash = "patrol"; }}
          onViewLeaderboard={() => {
            setInitialLeaderboardOpen(true);
            window.location.hash = "community";
          }}
        />
      </div>

      {user && hood && (
        <div style={{ display: view === "game" ? "block" : "none" }}>
          <GameView
            cases={cases}
            user={user}
            hood={hood}
            playerPos={playerPos}
            setPlayerPos={setPlayerPos}
            onVerifyCase={handleVerifyCase}
            onResolveCase={handleResolveCase}
            onTriggerScan={handleTriggerScan}
            empireBuildings={empire}
            onCollectIncome={handleCollectIncome}
            onUpgradeScoutHouse={handleUpgradeScoutHouse}
            onBuyBuilding={handleBuyBuilding}
            selectedCaseIdFromChat={selectedCaseIdFromChat}
            setSelectedCaseIdFromChat={setSelectedCaseIdFromChat}
            onPinHQ={handleEstablishHQ}
          />
        </div>
      )}

      {user && (
        <div style={{ display: view === "profile" ? "block" : "none" }}>
          <ProfileView
            user={user}
            cases={cases}
            onReset={handleResetApp}
            onScratchSavedCard={(reward) => {
              setScratchReward(reward);
              setReturnView("profile");
            }}
          />
        </div>
      )}

      {user && hood && (
        <div style={{ display: view === "community" ? "block" : "none" }}>
          <CommunityView
            hood={hood}
            leaderboard={leaderboard}
            liveActivities={liveActivities}
            user={user}
            moderatorModel={agentModels.moderator}
            initialLeaderboardOpen={initialLeaderboardOpen}
            onViewCaseOnMap={(caseId, lat, lng) => {
              setPlayerPos({ lat, lng });
              setSelectedCaseIdFromChat(caseId);
              window.location.hash = "patrol";
            }}
          />
        </div>
      )}

      {user?.isAdmin && (
        <div style={{ display: view === "admin" ? "block" : "none" }}>
          <AdminView
            user={user}
            agentModels={agentModels}
            onAgentModelChange={(agent, model) => {
              const updated = { ...agentModels, [agent]: model };
              setAgentModels(updated);
              localStorage.setItem("civic_succedent_agent_models_v2", JSON.stringify(updated));
              triggerToast(`Model for ${agent.toUpperCase()} Agent set to ${model}!`, "success");
            }}
          />
        </div>
      )}

      {user && (
        <div style={{ display: view === "route_planner" ? "block" : "none" }}>
          <RoutePlannerView
            cases={cases}
            playerPos={playerPos}
            setPlayerPos={setPlayerPos}
            onTriggerScan={handleTriggerScan}
          />
        </div>
      )}

      {view === "scanner_result" && (
        <ScanResultView
          loading={scanResultLoading}
          capturedImage={capturedImageBase64}
          isResolveFlow={isResolveFlow}
          beforeImage={cases.find(c => c.id === activeResolveCaseId)?.imageUrl}
          analysisResult={scannerResult}
          onConfirm={handleConfirmScanResult}
          selectedModel={isResolveFlow ? agentModels.resolver : agentModels.scanner}
          onCancel={async () => {
            const cItem = scannerResult?.case || scannerResult;
            const caseId = cItem?.id;
            if (caseId && !isResolveFlow && scannerResult?.success !== false) {
              try {
                await fetch(`${API_BASE}/api/cases/${caseId}`, { method: "DELETE" });
              } catch (e) {
                console.error("Failed to discard case:", e);
              }
            }
            setView(returnView || "game");
            setReturnView(null);
            setCapturedImageBase64("");
            setScannerResult(null);
          }}
        />
      )}

      {/* CAMERA OVERLAY STREAM */}
      {activeCameraOpen && (
        <CameraCapture
          onCapture={handleCaptureComplete}
          onClose={() => {
            setActiveCameraOpen(false);
            setIsResolveFlow(false);
            if (returnView) setView(returnView);
            setReturnView(null);
          }}
        />
      )}

      {/* SCRATCH CARD REWARD POPUP OVERLAY */}
      {scratchReward && (
        <ScratchCard
          reward={scratchReward}
          onClaim={handleClaimScratchReward}
        />
      )}

      {/* LEVEL UP POPUP OVERLAY */}
      {levelUpData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-6 font-sans animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center border border-yellow-400/30 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Ambient Sparkle and Accent Glow */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-400/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl animate-pulse" />

            <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white shadow-lg mb-4 animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>

            <span className="text-[10px] bg-yellow-100 text-yellow-850 border border-yellow-200 px-3.5 py-1 rounded-full font-black uppercase tracking-wider">
              LEVEL UP UNLOCKED!
            </span>

            <h3 className="font-display text-3xl font-black text-zinc-900 mt-3 uppercase tracking-tight">
              Level {levelUpData.level}
            </h3>
            <p className="text-[#006a65] font-black text-sm uppercase tracking-wide">
              {levelUpData.rank}
            </p>

            <div className="w-full bg-zinc-50 border border-zinc-150 rounded-2xl p-4 my-5 space-y-3">
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block border-b pb-1">
                Progression Upgrade Rewards
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-zinc-200/60 p-2.5 rounded-xl text-center">
                  <span className="block text-lg font-black text-amber-500 leading-none">+{levelUpData.coinsBonus}</span>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Coins</span>
                </div>
                <div className="bg-white border border-zinc-200/60 p-2.5 rounded-xl text-center">
                  <span className="block text-lg font-black text-teal-600 leading-none">+{levelUpData.trustBonus}%</span>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Trust Score</span>
                </div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl text-center space-y-1">
                <span className="text-[9px] text-indigo-500 font-black uppercase tracking-wider block">Commercial Coupon Unlocked</span>
                <span className="font-bold text-xs text-zinc-800 block">{levelUpData.couponName}</span>
                <span className="font-mono text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md inline-block uppercase select-all border border-indigo-200/50">
                  {levelUpData.couponCode}
                </span>
              </div>
            </div>

            <button
              onClick={() => setLevelUpData(null)}
              className="w-full bg-yellow-400 text-black py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-yellow-350 active:scale-95 transition-all cursor-pointer flex justify-center items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Continue Protecting the City</span>
            </button>
          </div>
        </div>
      )}

      {/* MUNICIPAL DISPATCHER DIRECTIVE DETAILS MODAL */}
      {activeDispatchCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-150 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                  MUNICIPAL COMPLAINT SYSTEM
                </span>
                <h3 className="font-display text-lg font-black uppercase mt-1">Complaint Directive</h3>
              </div>
              <button
                onClick={() => setActiveDispatchCase(null)}
                className="text-zinc-400 hover:text-zinc-600 font-bold"
              >
                [Close]
              </button>
            </div>

            {dispatchLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#006a65] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-zinc-500 font-bold">Compiling formal complaint directive via Gemini...</p>
              </div>
            ) : dispatchLetter ? (
              <div className="space-y-4">
                <div className="bg-[#fff9eb] border border-[#f0c040]/30 p-3.5 rounded-2xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">SUBJECT DIRECTIVE</span>
                  <p className="text-xs font-black text-[#775a00] mt-0.5">{dispatchLetter.subject}</p>
                </div>

                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-150 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-line text-zinc-700 leading-relaxed shadow-inner">
                  {dispatchLetter.complaintLetter}
                </div>

                <div className="bg-[#f2f4fa] border border-indigo-100 p-3.5 rounded-2xl text-[11px] text-zinc-650 leading-relaxed space-y-1.5">
                  <p><strong>Escalation Plan (30 days):</strong> {dispatchLetter.escalationPath}</p>
                  <p><strong>Proposed RTI Query:</strong> {dispatchLetter.rtiQuery}</p>
                </div>

                <button
                  onClick={() => setActiveDispatchCase(null)}
                  className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-teal-700 transition-colors"
                >
                  Confirm and Log Dispatch
                </button>
              </div>
            ) : (
              <p className="text-xs text-rose-500">Failed to compile directive. Please close and retry.</p>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Bottom Tab Bar Navigation */}
      {view !== "landing" && view !== "login" && view !== "signup" && view !== "onboarding" && view !== "scanner_result" && !activeCameraOpen && (
        <nav className="fixed bottom-0 left-0 w-full z-40 bg-white/95 border-t border-[#d2c5ae]/30 shadow-lg backdrop-blur-md px-2 py-3 flex justify-around items-center gap-1">
          
          {/* Tab 1: Map/Patrol Grid */}
          <button
            onClick={() => {
              setInitialLeaderboardOpen(false);
              window.location.hash = "patrol";
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors flex-1 min-w-0 text-center ${
              view === "game" ? "text-[#775a00]" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Compass className="w-5 h-5 flex-shrink-0" style={view === "game" ? { fill: "rgba(119,90,0,0.15)" } : {}} />
            <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">Patrol</span>
          </button>

          {/* Tab 1.5: Safe Maps Route Planner */}
          <button
            onClick={() => {
              setInitialLeaderboardOpen(false);
              window.location.hash = "maps";
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors flex-1 min-w-0 text-center ${
              view === "route_planner" ? "text-[#775a00]" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Map className="w-5 h-5 flex-shrink-0" style={view === "route_planner" ? { fill: "rgba(119,90,0,0.15)" } : {}} />
            <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">Maps</span>
          </button>

          {/* Tab 2: Community Portal */}
          <button
            onClick={() => {
              setInitialLeaderboardOpen(false);
              window.location.hash = "community";
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors flex-1 min-w-0 text-center ${
              view === "community" ? "text-[#775a00]" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" style={view === "community" ? { fill: "rgba(119,90,0,0.15)" } : {}} />
            <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">Community</span>
          </button>

          {/* Tab 3: Scout Profile */}
          <button
            onClick={() => {
              setInitialLeaderboardOpen(false);
              window.location.hash = "profile";
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors flex-1 min-w-0 text-center ${
              view === "profile" ? "text-[#775a00]" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <User className="w-5 h-5 flex-shrink-0" style={view === "profile" ? { fill: "rgba(119,90,0,0.15)" } : {}} />
            <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">Profile</span>
          </button>

          {user?.isAdmin && (
            <button
              onClick={() => {
                setInitialLeaderboardOpen(false);
                window.location.hash = "admin";
              }}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors flex-1 min-w-0 text-center ${
                view === "admin" ? "text-[#775a00]" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <Shield className="w-5 h-5 flex-shrink-0" style={view === "admin" ? { fill: "rgba(119,90,0,0.15)" } : {}} />
              <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">Admin</span>
            </button>
          )}

          {/* Tab 4: Back to landing */}
          <button
            onClick={() => {
              setInitialLeaderboardOpen(false);
              window.location.hash = "";
            }}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-zinc-600 cursor-pointer flex-1 min-w-0 text-center"
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            <span className="text-[8px] font-black uppercase tracking-tight font-sans truncate w-full">Exit</span>
          </button>
        </nav>
      )}
    </div>
  );
}

const compressImageHelper = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      resolve(dataUrl.substring(dataUrl.indexOf(";base64,") + 8));
    };
    img.onerror = () => {
      resolve(base64Str.replace(/^data:image\/[a-z]+;base64,/, ""));
    };
    img.src = base64Str.startsWith('data:image') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
  });
};
