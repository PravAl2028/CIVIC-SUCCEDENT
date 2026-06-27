import React, { useState, useEffect, useRef } from "react";
import { User, ShieldCheck, Award, Zap, CheckCircle2, AlertTriangle, ChevronRight, RefreshCw, Brain, Cpu, Sparkles, Camera } from "lucide-react";
import { UserProfile, Case } from "../../lib/constants";
import { getRankInfo } from "../../lib/xp";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface PresetAvatar {
  url: string;
  category: "kids" | "teens" | "adults";
  gender: "girl" | "boy";
  name: string;
}

const PRESET_AVATARS: PresetAvatar[] = [
  // Kids - Girls
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Lily&mouth=smile&top=longHair&hairColor=blonde",
    category: "kids",
    gender: "girl",
    name: "Lily"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe&mouth=twinkle&top=buns&hairColor=auburn",
    category: "kids",
    gender: "girl",
    name: "Chloe"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Zoe&mouth=smile&top=bob&hairColor=black",
    category: "kids",
    gender: "girl",
    name: "Zoe"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophie&mouth=smile&top=ponytail&hairColor=brown",
    category: "kids",
    gender: "girl",
    name: "Sophie"
  },

  // Kids - Boys
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Toby&mouth=smile&top=shortHair&hairColor=brown",
    category: "kids",
    gender: "boy",
    name: "Toby"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Leo&mouth=tongueOut&top=frizzle&hairColor=black",
    category: "kids",
    gender: "boy",
    name: "Leo"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Milo&mouth=smile&top=shaggy&hairColor=blonde",
    category: "kids",
    gender: "boy",
    name: "Milo"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Oliver&mouth=smile&top=shortFlat&hairColor=auburn",
    category: "kids",
    gender: "boy",
    name: "Oliver"
  },

  // Teens - Girls
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maya&top=straight02&facialHairProbability=0",
    category: "teens",
    gender: "girl",
    name: "Maya"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aria&top=curly&facialHairProbability=0",
    category: "teens",
    gender: "girl",
    name: "Aria"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Mia&top=sides&facialHairProbability=0",
    category: "teens",
    gender: "girl",
    name: "Mia"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Bella&top=longHairCurly&accessories=round&facialHairProbability=0",
    category: "teens",
    gender: "girl",
    name: "Bella"
  },

  // Teens - Boys
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jack&top=shortFlat&facialHairProbability=0",
    category: "teens",
    gender: "boy",
    name: "Jack"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sam&top=curly&facialHairProbability=0",
    category: "teens",
    gender: "boy",
    name: "Sam"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ryan&top=shaggy&facialHairProbability=0",
    category: "teens",
    gender: "boy",
    name: "Ryan"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Tyler&top=shortWaved&facialHairProbability=0",
    category: "teens",
    gender: "boy",
    name: "Tyler"
  },

  // Adults - Women
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Emma&top=bigHair&accessories=round",
    category: "adults",
    gender: "girl",
    name: "Emma"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophia&top=longHairCurly&accessories=prescription02",
    category: "adults",
    gender: "girl",
    name: "Sophia"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Olivia&top=hijab",
    category: "adults",
    gender: "girl",
    name: "Olivia"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Harper&top=bob&accessories=prescription01",
    category: "adults",
    gender: "girl",
    name: "Harper"
  },

  // Adults - Men
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Alex&top=shortCurly&facialHair=beardLight",
    category: "adults",
    gender: "boy",
    name: "Alex"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=David&top=dreads&facialHair=beardMajestic",
    category: "adults",
    gender: "boy",
    name: "David"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=James&top=shortWaved&facialHair=moustaches&accessories=prescription01",
    category: "adults",
    gender: "boy",
    name: "James"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Marcus&top=noHair&facialHair=beardLight",
    category: "adults",
    gender: "boy",
    name: "Marcus"
  }
];

function compressImage(file: File, maxWidth = 300, maxHeight = 300, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } else {
          reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

interface ProfileViewProps {
  user: UserProfile;
  cases: Case[];
  onReset: () => void;
  onScratchSavedCard?: (reward: any) => void;
}

export default function ProfileView({ 
  user, 
  cases: propCases, 
  onReset,
  onScratchSavedCard
}: ProfileViewProps) {
  const [resetting, setResetting] = useState(false);
  const [memberSince, setMemberSince] = useState('');
  const [userCases, setUserCases] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [rewardTab, setRewardTab] = useState<'unscratched' | 'active' | 'history'>('unscratched');
  
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAgeCategory, setSelectedAgeCategory] = useState<'kids' | 'teens' | 'adults'>('teens');
  const [showLevelsPopup, setShowLevelsPopup] = useState(false);

  const handleSelectPreset = async (url: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        avatarUrl: url
      });
      setShowAvatarSelector(false);
    } catch (e) {
      console.error("Failed to update preset avatar:", e);
    }
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploadingAvatar(true);
    try {
      const compressedBase64 = await compressImage(file, 250, 250, 0.6);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        avatarUrl: compressedBase64
      });
      setShowAvatarSelector(false);
    } catch (err) {
      console.error("Failed custom image upload:", err);
      alert("Compression or upload failed. Please try a different image.");
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  const rankInfo = getRankInfo(user.xp, user.trustScore);

  const rankThresholds = [
    { rank: "Scout", minXp: 0 },
    { rank: "Scout Elite", minXp: 500 },
    { rank: "Patrol Ranger", minXp: 1200 },
    { rank: "Ranger Captain", minXp: 2200 },
    { rank: "City Guardian", minXp: 3500 },
    { rank: "Guardian Commander", minXp: 5000 },
    { rank: "Champion", minXp: 7000 },
    { rank: "Legend", minXp: 10000 }
  ];
  const currentIndex = rankThresholds.findIndex(r => r.rank === rankInfo.currentRank);
  const next1 = currentIndex !== -1 && currentIndex + 1 < rankThresholds.length ? rankThresholds[currentIndex + 1] : null;
  const next2 = currentIndex !== -1 && currentIndex + 2 < rankThresholds.length ? rankThresholds[currentIndex + 2] : null;

  
  const getLevelFromXp = (xp: number): number => {
    if (xp >= 10000) return 8;
    if (xp >= 7000) return 7;
    if (xp >= 5000) return 6;
    if (xp >= 3500) return 5;
    if (xp >= 2200) return 4;
    if (xp >= 1200) return 3;
    if (xp >= 500) return 2;
    return 1;
  };
  const level = getLevelFromXp(user.xp);

  const getLevelProgress = (xp: number) => {
    if (xp >= 10000) return 100;
    if (xp >= 7000) return ((xp - 7000) / 3000) * 100;
    if (xp >= 5000) return ((xp - 5000) / 2000) * 100;
    if (xp >= 3500) return ((xp - 3500) / 1500) * 100;
    if (xp >= 2200) return ((xp - 2200) / 1300) * 100;
    if (xp >= 1200) return ((xp - 1200) / 1000) * 100;
    if (xp >= 500) return ((xp - 500) / 700) * 100;
    return (xp / 500) * 100;
  };
  const progressPercent = getLevelProgress(user.xp);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const fetchUserCreatedAt = async () => {
      const uDoc = await getDoc(doc(db, 'users', uid));
      if (uDoc.exists() && uDoc.data().createdAt) {
        const date = uDoc.data().createdAt.toDate();
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setMemberSince(monthYear);
      }
    };
    fetchUserCreatedAt();

    const reportsQuery = query(
      collection(db, 'cases'),
      where('reportedBy', '==', uid)
    );

    const unsubCases = onSnapshot(reportsQuery, (snapshot) => {
      let rpts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Sort locally to avoid composite index requirement
      rpts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
      setUserCases(rpts.slice(0, 10));
    });

    const rewardsQuery = query(
      collection(db, 'users', uid, 'rewards'),
      orderBy('createdAt', 'desc')
    );

    const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
      const rwds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRewards(rwds);
    });

    return () => {
      unsubCases();
      unsubRewards();
    };
  }, []);

  const handleReset = async () => {
    setResetting(true);
    await onReset();
    setResetting(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "dispatched":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "confirmed":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const handleMarkUsed = async (rewardId: string) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'users', auth.currentUser.uid, 'rewards', rewardId), {
      couponRedeemed: true
    });
  };

  const handleScratch = async (rewardId: string) => {
    const targetReward = rewards.find(r => r.id === rewardId);
    if (targetReward && onScratchSavedCard) {
      onScratchSavedCard(targetReward);
    } else {
      if (!auth.currentUser) return;
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'rewards', rewardId), {
        scratched: true
      });
    }
  };

  const unscratched = rewards.filter(r => !r.scratched);
  const activeCoupons = rewards.filter(r => r.scratched && r.coupon && !r.couponRedeemed);
  const history = rewards.filter(r => r.scratched && (r.couponRedeemed || !r.coupon));

  return (
    <div className="bg-[#F5F0E8] min-h-[100dvh] text-[#191c22] font-sans pt-20 pb-36 px-6 max-w-lg mx-auto space-y-6">
      
      {/* Profile Header Block */}
      <section className="flex flex-col items-center text-center bg-white p-6 rounded-3xl border border-[#d2c5ae]/30 shadow-sm relative overflow-hidden">
        <div className="relative group cursor-pointer" onClick={() => setShowAvatarSelector(!showAvatarSelector)}>
          <div className="absolute -inset-1 bg-gradient-to-tr from-yellow-400 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-40 transition" />
          <img
            src={user.photoURL}
            alt="User avatar"
            referrerPolicy="no-referrer"
            className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md object-cover animate-in zoom-in-75 duration-350"
          />
          <div className="absolute bottom-0 right-0 bg-[#006a65] text-white p-1.5 rounded-full border-2 border-white shadow-md">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-black mt-4 text-zinc-900 tracking-tight leading-snug uppercase flex flex-col items-center gap-2 justify-center w-full px-2">
          <span className="break-all max-w-full text-center">{user.displayName}</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
            {user.isAdmin && (
              <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                ADMIN
              </span>
            )}
            <span className="text-xs bg-[#006a65]/10 text-[#006a65] border border-[#006a65]/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {user.rank}
            </span>
          </div>
        </h2>
        <p className="text-xs text-zinc-400 font-medium mt-1">Member since {memberSince}</p>

        <div 
          onClick={() => setShowLevelsPopup(!showLevelsPopup)}
          className="mt-4 flex flex-col items-center gap-1.5 bg-[#F5F0E8] px-4 py-2.5 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-200/50 active:scale-[0.99] transition-all w-full max-w-[240px]"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#775a00] font-mono">LVL {level}</span>
            <div className="w-24 h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#f0c040] rounded-full" style={{ width: `${Math.min(100, progressPercent)}%` }} />
            </div>
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
            {rankInfo.xpNeeded.toLocaleString()} XP to reach {rankInfo.nextRank || "Legend"}
          </div>
        </div>

        {showLevelsPopup && (
          <div className="mt-3.5 p-3.5 bg-[#F5F0E8] border border-zinc-200 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 w-full text-left">
            <div className="font-extrabold text-[#775a00] uppercase text-[8px] tracking-wider mb-1">
              Upcoming Scout Ranks
            </div>
            {next1 && (
              <div className="flex justify-between items-center text-zinc-750 font-bold text-xs">
                <span className="flex items-center gap-1.5">🎯 {next1.rank}</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-zinc-200">{next1.minXp} XP</span>
              </div>
            )}
            {next2 ? (
              <div className="flex justify-between items-center text-zinc-400 font-semibold text-xs border-t border-zinc-200 pt-2 mt-2">
                <span className="flex items-center gap-1.5">🔒 {next2.rank}</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-zinc-200">🔒 {next2.minXp} XP</span>
              </div>
            ) : (
              <div className="text-[9px] text-zinc-400 italic">No further ranks after this.</div>
            )}
          </div>
        )}


        {showAvatarSelector && (
          <div className="mt-6 p-4 bg-[#F5F0E8] rounded-2xl border border-zinc-150 w-full text-left space-y-4 animate-in slide-in-from-top-4 duration-250">
            <p className="text-xs font-black text-[#006a65] uppercase tracking-wider">Choose a Preset Avatar</p>
            
            {/* Age Category Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Age Group</span>
              <div className="grid grid-cols-3 gap-1 bg-zinc-200/50 p-1 rounded-xl">
                {(["kids", "teens", "adults"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedAgeCategory(cat);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      selectedAgeCategory === cat
                        ? "bg-[#006a65] text-white shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/50"
                    }`}
                  >
                    {cat === "kids" ? "👶 Kids" : cat === "teens" ? "🧑 Teens" : "👨 Adults"}
                  </button>
                ))}
              </div>
            </div>

            {/* Categorized Avatars Panel: Female vs Male for the selected Age Group */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {/* Girls / Women Section */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">
                  {selectedAgeCategory === "adults" ? "👩 Women" : "👧 Girls"}
                </span>
                <div className="grid grid-cols-4 gap-2.5 p-2 bg-white/40 rounded-xl border border-zinc-200/40">
                  {PRESET_AVATARS.filter(av => av.category === selectedAgeCategory && av.gender === "girl").map((av, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(av.url)}
                      className="aspect-square rounded-full border-2 border-white overflow-hidden hover:border-[#006a65] hover:scale-105 active:scale-95 transition-all shadow-sm bg-white cursor-pointer relative group/item"
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
                        {av.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Boys / Men Section */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">
                  {selectedAgeCategory === "adults" ? "👨 Men" : "👦 Boys"}
                </span>
                <div className="grid grid-cols-4 gap-2.5 p-2 bg-white/40 rounded-xl border border-zinc-200/40">
                  {PRESET_AVATARS.filter(av => av.category === selectedAgeCategory && av.gender === "boy").map((av, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(av.url)}
                      className="aspect-square rounded-full border-2 border-white overflow-hidden hover:border-[#006a65] hover:scale-105 active:scale-95 transition-all shadow-sm bg-white cursor-pointer relative group/item"
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
                        {av.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink-0 mx-2 text-zinc-400 text-[10px] font-bold uppercase">Or</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCustomUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                {uploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-[#006a65]/30 border-t-[#006a65] rounded-full animate-spin" />
                ) : (
                  <>📷 Choose from Gallery</>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-2 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-[#775a00] flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total XP</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.xp.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">POINTS</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-[#006a65] flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Civic Trust</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.trustScore}%</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">CONFIDENCE SCORE</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-amber-500 flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Reports filed</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.totalReports || 0}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">SUBMISSIONS</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-emerald-500 flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Resolves</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.totalResolves || 0}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">CONFIRMED REPAIRS</p>
          </div>
        </div>
      </section>


      {/* My Rewards & Coupons */}
      <section className="bg-white p-6 rounded-3xl border border-[#d2c5ae]/30 shadow-sm space-y-4">
        <h3 className="font-display text-lg font-bold text-zinc-900 border-b pb-2 uppercase">
          MY REWARDS & COUPONS
        </h3>
        
        <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2">
          <button 
            onClick={() => setRewardTab('unscratched')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${rewardTab === 'unscratched' ? 'bg-[#006a65] text-white' : 'bg-zinc-100 text-zinc-500'}`}
          >
            Unscratched ({unscratched.length})
          </button>
          <button 
            onClick={() => setRewardTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${rewardTab === 'active' ? 'bg-[#f0c040] text-[#775a00]' : 'bg-zinc-100 text-zinc-500'}`}
          >
            Active Coupons ({activeCoupons.length})
          </button>
          <button 
            onClick={() => setRewardTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${rewardTab === 'history' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500'}`}
          >
            History ({history.length})
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {rewardTab === 'unscratched' && (
            unscratched.length > 0 ? unscratched.map(r => (
              <div key={r.id} onClick={() => handleScratch(r.id)} className="cursor-pointer bg-gradient-to-r from-zinc-800 to-zinc-900 p-4 rounded-2xl flex justify-between items-center border border-zinc-700 text-white shadow-sm hover:scale-[1.02] transition-transform">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider">{r.tier} REWARD</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Tap to scratch and reveal</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex justify-center items-center">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            )) : <p className="text-xs text-zinc-400 text-center py-4">No unscratched cards.</p>
          )}

          {rewardTab === 'active' && (
            activeCoupons.length > 0 ? activeCoupons.map(r => (
              <div key={r.id} className="bg-yellow-50 p-4 rounded-2xl flex flex-col gap-3 border border-yellow-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-[#775a00]">{r.coupon}</p>
                    <p className="text-[10px] font-bold text-yellow-600 mt-1 uppercase">CODE: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-yellow-200">{r.couponCode}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(r.couponCode)} className="flex-1 bg-white border border-yellow-200 text-[#775a00] text-[10px] font-bold py-2 rounded-lg hover:bg-yellow-100">
                    Copy Code
                  </button>
                  <button onClick={() => handleMarkUsed(r.id)} className="flex-1 bg-[#f0c040] text-[#775a00] text-[10px] font-bold py-2 rounded-lg hover:bg-yellow-400">
                    Mark as Used
                  </button>
                </div>
              </div>
            )) : <p className="text-xs text-zinc-400 text-center py-4">No active coupons.</p>
          )}

          {rewardTab === 'history' && (
            history.length > 0 ? history.map(r => (
              <div key={r.id} className="bg-zinc-50 p-4 rounded-2xl flex justify-between items-center border border-zinc-150">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {r.couponRedeemed ? "REDEEMED COUPON" : "XP REWARD"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">{r.coupon ? r.coupon : `+${r.xpEarned} XP`}</p>
                </div>
                {r.couponRedeemed && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
            )) : <p className="text-xs text-zinc-400 text-center py-4">No history yet.</p>
          )}
        </div>
      </section>

      {/* Recent Case Logs */}
      <section className="bg-white p-6 rounded-3xl border border-[#d2c5ae]/30 shadow-sm space-y-4">
        <h3 className="font-display text-lg font-bold text-zinc-900 border-b pb-2 uppercase">
          RECENT SCRAPPING HISTORY
        </h3>
        <div className="space-y-3">
          {userCases.length > 0 ? userCases.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-150 hover:translate-x-1 transition-all"
            >
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt={c.damageType}
                  className="w-12 h-12 rounded-xl object-cover border border-zinc-200"
                />
              )}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-800 capitalize truncate">{(c.damageType || "").replace("_", " ")}</h4>
                  <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-450 truncate mt-0.5">{c.address}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            </div>
          )) : (
            <p className="text-xs text-zinc-400 text-center py-2">No reports submitted yet.</p>
          )}
        </div>
      </section>

      {/* Developer Reset Section */}
      <section className="flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-12 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          LOGOUT
        </button>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full bg-[#ae2f34] hover:bg-red-750 text-white font-bold text-xs h-12 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-2"
        >
          <RefreshCw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
          {resetting ? "Resetting state..." : "RESET PROFILE & RELOAD SEEDS"}
        </button>
        <p className="text-[9px] text-zinc-450 text-center font-medium">
          Note: This triggers a hard data purge, restoring original Koramangala seed cases and level 12 stats for demo loop.
        </p>
      </section>
    </div>
  );
}
