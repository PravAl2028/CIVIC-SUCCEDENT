export type Rank = "Scout" | "Scout Elite" | "Patrol Ranger" | "Ranger Captain" | "City Guardian" | "Guardian Commander" | "Champion" | "Legend";

export interface RankInfo {
  currentRank: Rank;
  nextRank: Rank | null;
  xpNeeded: number;
  progressPercent: number;
}

export function getRankInfo(xp: number, trustScore: number): RankInfo {
  let currentRank: Rank = "Scout";
  let nextRank: Rank | null = "Scout Elite";
  let minXPForNext = 500;
  let minXPForCurrent = 0;

  if (xp >= 10000) {
    currentRank = "Legend";
    nextRank = null;
    minXPForCurrent = 10000;
    minXPForNext = 10000;
  } else if (xp >= 7000) {
    currentRank = "Champion";
    nextRank = "Legend";
    minXPForCurrent = 7000;
    minXPForNext = 10000;
  } else if (xp >= 5000) {
    currentRank = "Guardian Commander";
    nextRank = "Champion";
    minXPForCurrent = 5000;
    minXPForNext = 7000;
  } else if (xp >= 3500) {
    currentRank = "City Guardian";
    nextRank = "Guardian Commander";
    minXPForCurrent = 3500;
    minXPForNext = 5000;
  } else if (xp >= 2200) {
    currentRank = "Ranger Captain";
    nextRank = "City Guardian";
    minXPForCurrent = 2200;
    minXPForNext = 3500;
  } else if (xp >= 1200) {
    currentRank = "Patrol Ranger";
    nextRank = "Ranger Captain";
    minXPForCurrent = 1200;
    minXPForNext = 2200;
  } else if (xp >= 500) {
    currentRank = "Scout Elite";
    nextRank = "Patrol Ranger";
    minXPForCurrent = 500;
    minXPForNext = 1200;
  } else {
    currentRank = "Scout";
    nextRank = "Scout Elite";
    minXPForCurrent = 0;
    minXPForNext = 500;
  }

  const range = minXPForNext - minXPForCurrent;
  const earnedInRange = xp - minXPForCurrent;
  const progressPercent = nextRank ? Math.min(100, Math.max(0, (earnedInRange / range) * 100)) : 100;
  const xpNeeded = Math.max(0, minXPForNext - xp);

  return {
    currentRank,
    nextRank,
    xpNeeded,
    progressPercent
  };
}
