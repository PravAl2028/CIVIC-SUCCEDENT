import React, { useState, useEffect, useRef } from "react";
import { User, ShieldCheck, Award, Zap, AlertTriangle, ChevronRight, RefreshCw, Brain, Cpu, Camera } from "lucide-react";
import { UserProfile, Case } from "../../lib/constants";
import { getRankInfo } from "../../lib/xp";
import { auth, db } from "../../firebase";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslatedRank, getTranslatedStatus, getTranslatedDamageType } from "../../lib/i18nHelpers";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
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
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Lily&top=bob",
    category: "kids",
    gender: "girl",
    name: "Lily"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe&top=curly",
    category: "kids",
    gender: "girl",
    name: "Chloe"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Zoe&top=bob",
    category: "kids",
    gender: "girl",
    name: "Zoe"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophie&top=curvy",
    category: "kids",
    gender: "girl",
    name: "Sophie"
  },

  // Kids - Boys
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Toby&top=shortRound",
    category: "kids",
    gender: "boy",
    name: "Toby"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Leo&top=shortCurly",
    category: "kids",
    gender: "boy",
    name: "Leo"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Milo&top=shaggy",
    category: "kids",
    gender: "boy",
    name: "Milo"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Oliver&top=shortFlat",
    category: "kids",
    gender: "boy",
    name: "Oliver"
  },

  // Teens - Girls
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maya&top=straight02",
    category: "teens",
    gender: "girl",
    name: "Maya"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aria&top=curly",
    category: "teens",
    gender: "girl",
    name: "Aria"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Mia&top=sides",
    category: "teens",
    gender: "girl",
    name: "Mia"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Bella&top=bigHair&accessories=round",
    category: "teens",
    gender: "girl",
    name: "Bella"
  },

  // Teens - Boys
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jack&top=shortFlat",
    category: "teens",
    gender: "boy",
    name: "Jack"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sam&top=curly",
    category: "teens",
    gender: "boy",
    name: "Sam"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ryan&top=shaggy",
    category: "teens",
    gender: "boy",
    name: "Ryan"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Tyler&top=shortWaved",
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
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophia&top=curly&accessories=prescription02",
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
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Harper&top=bob&accessories=round",
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
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=James&top=shortWaved&facialHair=moustacheMagnum",
    category: "adults",
    gender: "boy",
    name: "James"
  },
  {
    url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Marcus&top=shavedSides&facialHair=beardLight",
    category: "adults",
    gender: "boy",
    name: "Marcus"
  }
];

function AvatarImage({ src, name, className }: { src: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const colors = ['bg-rose-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400', 'bg-violet-400', 'bg-teal-400', 'bg-pink-400', 'bg-indigo-400'];
  const color = colors[name.charCodeAt(0) % colors.length];

  if (failed) {
    return (
      <div className={`${className || ''} flex items-center justify-center ${color} text-white font-black text-lg`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={className || ''}
      onError={() => setFailed(true)}
    />
  );
}

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
  key?: string;
  user: UserProfile;
  cases: Case[];
  onReset: () => void;
}

export default function ProfileView({ 
  user, 
  cases: propCases, 
  onReset
}: ProfileViewProps) {
  const { t } = useLanguage();
  const [resetting, setResetting] = useState(false);
  const [memberSince, setMemberSince] = useState('');
  const [userCases, setUserCases] = useState<any[]>([]);
  
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

    return () => {
      unsubCases();
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

  return (
    <div className="space-y-3 w-full">
      
      {/* Profile Header Block */}
      <section className="flex flex-col items-center text-center bg-white p-6 rounded-3xl border border-[#d2c5ae]/30 shadow-sm relative overflow-hidden">
        <div className="relative group cursor-pointer" onClick={() => setShowAvatarSelector(!showAvatarSelector)}>
          <div className="absolute -inset-1 bg-gradient-to-tr from-yellow-400 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-40 transition" />
          <AvatarImage
            src={user.photoURL}
            name={user.displayName || "User"}
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
                {t.profile.adminBadge}
              </span>
            )}
            <span className="text-xs bg-[#006a65]/10 text-[#006a65] border border-[#006a65]/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {getTranslatedRank(user.rank, t)}
            </span>
          </div>
        </h2>
        <p className="text-xs text-zinc-400 font-medium mt-1">{t.profile.memberSince.replace("{date}", memberSince)}</p>

        <div 
          onClick={() => setShowLevelsPopup(!showLevelsPopup)}
          className="mt-4 flex flex-col items-center gap-1.5 bg-[#F5F0E8] px-4 py-2.5 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-200/50 active:scale-[0.99] transition-all w-full max-w-[240px]"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#775a00] font-mono">{t.profile.level.replace("{level}", String(level))}</span>
            <div className="w-24 h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#f0c040] rounded-full" style={{ width: `${Math.min(100, progressPercent)}%` }} />
            </div>
          </div>
          <div className="text-[10px] font-black text-[#006a65] font-mono flex items-center gap-1 select-none">
            <span>{t.profile.civicTrust}</span>
            <span>{Math.min(100, user.trustScore)}%</span>
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
            {t.profile.xpToNext.replace("{xp}", rankInfo.xpNeeded.toLocaleString()).replace("{rank}", getTranslatedRank(rankInfo.nextRank || "Legend", t))}
          </div>
        </div>

        {showLevelsPopup && (
          <div className="mt-3.5 p-3.5 bg-[#F5F0E8] border border-zinc-200 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 w-full text-left">
            <div className="font-extrabold text-[#775a00] uppercase text-[8px] tracking-wider mb-1">
              {t.profile.upcomingRanks}
            </div>
            {next1 && (
              <div className="flex justify-between items-center text-zinc-750 font-bold text-xs">
                <span className="flex items-center gap-1.5">🎯 {getTranslatedRank(next1.rank, t)}</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-zinc-200">{next1.minXp} XP</span>
              </div>
            )}
            {next2 ? (
              <div className="flex justify-between items-center text-zinc-400 font-semibold text-xs border-t border-zinc-200 pt-2 mt-2">
                <span className="flex items-center gap-1.5">🔒 {getTranslatedRank(next2.rank, t)}</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-zinc-200">🔒 {next2.minXp} XP</span>
              </div>
            ) : (
              <div className="text-[9px] text-zinc-400 italic">{t.profile.noFurtherRanks}</div>
            )}
          </div>
        )}


        {showAvatarSelector && (
          <div className="mt-6 p-4 bg-[#F5F0E8] rounded-2xl border border-zinc-150 w-full text-left space-y-4 animate-in slide-in-from-top-4 duration-250">
            <p className="text-xs font-black text-[#006a65] uppercase tracking-wider">{t.avatar.choosePreset}</p>
            
            {/* Age Category Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{t.avatar.ageGroup}</span>
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
                    {cat === "kids" ? t.avatar.kids : cat === "teens" ? t.avatar.teens : t.avatar.adults}
                  </button>
                ))}
              </div>
            </div>

            {/* Categorized Avatars Panel: Female vs Male for the selected Age Group */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {/* Girls / Women Section */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">
                  {selectedAgeCategory === "adults" ? t.avatar.women : t.avatar.girls}
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
                      <AvatarImage src={av.url} name={av.name} className="w-full h-full object-cover" />
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
                  {selectedAgeCategory === "adults" ? t.avatar.men : t.avatar.boys}
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
                      <AvatarImage src={av.url} name={av.name} className="w-full h-full object-cover" />
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
              <span className="flex-shrink-0 mx-2 text-zinc-400 text-[10px] font-bold uppercase">{t.common.or}</span>
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
                  <>{t.avatar.chooseFromGallery}</>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-2 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-[#775a00] flex flex-col justify-between min-h-[110px] col-span-2">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t.profile.totalXp}</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.xp.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{t.profile.points}</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-amber-500 flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t.profile.reportsFiled}</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.totalReports || 0}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{t.profile.submissions}</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 rounded-3xl border border-[#d2c5ae]/30 shadow-sm border-l-4 border-emerald-500 flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t.profile.resolvesCount}</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{user.totalResolves || 0}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{t.profile.confirmedRepairs}</p>
          </div>
        </div>
      </section>


      {/* Recent Case Logs */}
      <section className="bg-white p-6 rounded-3xl border border-[#d2c5ae]/30 shadow-sm space-y-4">
        <h3 className="font-display text-lg font-bold text-zinc-900 border-b pb-2 uppercase">
          {t.profile.recentHistory}
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
                  <h4 className="font-bold text-xs text-zinc-800 capitalize truncate">{getTranslatedDamageType(c.damageType, t)}</h4>
                  <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                    {getTranslatedStatus(c.status, t)}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-450 truncate mt-0.5">{c.address}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            </div>
          )) : (
            <p className="text-xs text-zinc-400 text-center py-2">{t.profile.noReportsYet}</p>
          )}
        </div>
      </section>

      {/* Developer Reset Section */}
      <section className="flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-12 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {t.profile.logout}
        </button>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full bg-[#ae2f34] hover:bg-red-750 text-white font-bold text-xs h-12 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-2"
        >
          <RefreshCw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
          {resetting ? t.profile.resettingState : t.profile.resetProfile}
        </button>
        <p className="text-[9px] text-zinc-450 text-center font-medium">
          {t.profile.resetNote}
        </p>
      </section>
    </div>
  );
}
