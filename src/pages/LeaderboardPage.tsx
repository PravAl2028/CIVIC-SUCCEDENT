import React from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedRank } from "../lib/i18nHelpers";
import { Trophy, Star, Shield, Award } from "lucide-react";
import { db } from "../firebase";
import { collection, query, limit, onSnapshot, where } from "firebase/firestore";

const RANK_ICONS: Record<string, string> = {
  "LEGEND": "🏆",
  "CHAMPION": "🥇",
  "GUARDIAN COMMANDER": "🛡️",
  "CITY GUARDIAN": "⭐",
  "RANGER CAPTAIN": "🎖️",
  "PATROL RANGER": "🎖️",
  "SCOUT ELITE": "🌟",
  "SCOUT": "🔰"
};

export default function LeaderboardPage() {
  const { user, hood } = useAuth();
  const { t } = useLanguage();
  const [board, setBoard] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!hood?.id) return;
    const q = query(collection(db, "users"), where("communityId", "==", hood.id), limit(50));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        const xp = data.xp || 0;
        let rank = "SCOUT";
        if (xp >= 10000) rank = "LEGEND";
        else if (xp >= 7000) rank = "CHAMPION";
        else if (xp >= 5000) rank = "GUARDIAN COMMANDER";
        else if (xp >= 3500) rank = "CITY GUARDIAN";
        else if (xp >= 2200) rank = "RANGER CAPTAIN";
        else if (xp >= 1200) rank = "PATROL RANGER";
        else if (xp >= 500) rank = "SCOUT ELITE";
        return {
          uid: d.id,
          name: data.username || data.displayName || "Citizen",
          xp,
          trustScore: data.trustScore || 50,
          totalReports: data.totalReports || 0,
          totalVerifications: data.totalVerifications || 0,
          totalResolved: data.totalResolved || 0,
          rank,
          avatarUrl: data.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.username}`
        };
      }).filter(u => !u.uid?.startsWith("admin")).sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rankPosition: i + 1 }));
      setBoard(list);
    });
  }, [hood?.id]);

  const top3 = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <div className="bg-[#F5F0E8] min-h-[100dvh] text-[#191c22] font-sans pt-20 pb-24 px-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" style={{ fill: "currentColor" }} />
        <h1 className="font-display text-2xl font-black uppercase text-[#006a65]">{t.leaderboard.title}</h1>
        <p className="text-xs text-zinc-400 mt-1">{hood?.name || "Community"} {t.leaderboard.topContributors}</p>
      </div>

      {user && (
        <div className="bg-gradient-to-r from-[#006a65] to-[#008f87] rounded-2xl p-4 text-white mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-white/30" />
              <div>
                <p className="text-xs font-bold">{user.displayName}</p>
                <p className="text-[10px] text-white/70">{RANK_ICONS[user.rank] || "🔰"} {getTranslatedRank(user.rank, t)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black">{user.xp.toLocaleString()}</p>
              <p className="text-[9px] text-white/70 uppercase">{t.leaderboard.civicPoints}</p>
            </div>
          </div>
        </div>
      )}

      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {[top3[1], top3[0], top3[2]].map((u, i) => {
            const heights = ["h-20", "h-28", "h-16"];
            const delays = ["animate-[bounceIn_0.6s_ease-out_0.2s_both]", "animate-[bounceIn_0.6s_ease-out_0s_both]", "animate-[bounceIn_0.6s_ease-out_0.4s_both]"];
            const podium = [1, 0, 2];
            const actualRank = podium[i];
            return (
              <div key={u.uid} className={`flex flex-col items-center gap-1 ${delays[i]}`}>
                <img src={u.avatarUrl} alt={u.name} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover animate-[fadeInUp_0.5s_ease-out_0.3s_both]" />
                <span className="text-[10px] font-bold truncate max-w-[80px]">{u.name}</span>
                <span className="text-[9px] font-mono text-[#006a65]">{u.xp.toLocaleString()} pts</span>
                <div className={`w-20 ${heights[i]} rounded-t-xl flex items-center justify-center font-black text-white text-sm transition-all duration-500 ${actualRank === 0 ? "bg-yellow-400 shadow-lg shadow-yellow-400/30" : actualRank === 1 ? "bg-zinc-400" : "bg-amber-600"}`}>
                  {actualRank + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {rest.map(u => (
          <div key={u.uid} className={`bg-white p-3 rounded-xl border flex items-center gap-3 ${u.uid === user?.userId ? "border-[#006a65] ring-1 ring-[#006a65]/20" : "border-zinc-200"}`}>
            <span className="w-6 text-center font-mono text-sm text-zinc-400">#{u.rankPosition}</span>
            <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full border border-zinc-200 object-cover" />
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-800 truncate">{u.name}</span>
                {u.uid === user?.userId && <span className="text-[8px] bg-[#006a65] text-white px-1 py-0.5 rounded font-bold">{t.leaderboard.you}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-zinc-400">{RANK_ICONS[u.rank] || "🔰"} {u.rank.replace(/_/g, " ")}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-[#006a65]">{u.xp.toLocaleString()}</p>
              <p className="text-[8px] text-zinc-400 uppercase">{t.leaderboard.pointsLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
