export interface Reward {
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Common" | "Rare" | "Epic" | "Legendary";
  xpEarned: number;
  trustBoost: number;
  coupon?: string;
  couponCode?: string;
  message: string;
  coinsEarned?: number;
}

export function generateScratchCard(): Reward {
  const rand = Math.random() * 100;
  if (rand < 65) {
    // Common Card (65% chance)
    return {
      tier: "Common",
      xpEarned: 50,
      coinsEarned: 50,
      trustBoost: 1,
      message: "Common Reward! Good job reporting damage."
    };
  } else if (rand < 90) {
    // Rare Card (25% chance)
    return {
      tier: "Rare",
      xpEarned: 100,
      coinsEarned: 100,
      trustBoost: 2,
      message: "Rare Reward! Outstanding scouting effort."
    };
  } else if (rand < 98) {
    // Epic Card (8% chance)
    return {
      tier: "Epic",
      xpEarned: 250,
      coinsEarned: 250,
      trustBoost: 5,
      message: "EPIC REWARD! Exceptional dedication to civic pride!"
    };
  } else {
    // Legendary Card (2% chance)
    return {
      tier: "Legendary",
      xpEarned: 500,
      coinsEarned: 500,
      trustBoost: 10,
      message: "LEGENDARY REWARD! You are an absolute civic hero!"
    };
  }
}

export function generateReward(comboMultiplier: number = 1): Reward {
  const rand = Math.random() * 100;

  if (rand < 60) {
    // Common (60%): 50-100 XP
    const baseXP = Math.floor(Math.random() * 51) + 50;
    return {
      tier: "Bronze",
      xpEarned: Math.floor(baseXP * comboMultiplier),
      trustBoost: 1,
      coinsEarned: 100,
      message: "Common Reward! Keep protecting your neighborhood."
    };
  } else if (rand < 85) {
    // Uncommon (25%): 150-300 XP + Trust boost
    const baseXP = Math.floor(Math.random() * 151) + 150;
    return {
      tier: "Silver",
      xpEarned: Math.floor(baseXP * comboMultiplier),
      trustBoost: 3,
      coinsEarned: 100,
      message: "Uncommon Reward! You are a rising protector."
    };
  } else if (rand < 95) {
    // Rare (10%): 500 XP + coupon placeholder
    return {
      tier: "Gold",
      xpEarned: Math.floor(500 * comboMultiplier),
      trustBoost: 5,
      coinsEarned: 500,
      coupon: "SUCC-LOCAL-10 (10% off at Local Bakeries)",
      message: "Rare Reward! Claim your 10% discount coupon."
    };
  } else if (rand < 99) {
    // Epic (4%): 1000 XP + better coupon
    return {
      tier: "Platinum",
      xpEarned: Math.floor(1000 * comboMultiplier),
      trustBoost: 8,
      coinsEarned: 500,
      coupon: "SUCC-COFFEE-FREE (Free Coffee at Blue Tokai)",
      message: "Epic Reward! Claim your Free Coffee voucher."
    };
  } else {
    // Legendary (1%): 2500 XP + premium reward
    return {
      tier: "Diamond",
      xpEarned: Math.floor(2500 * comboMultiplier),
      trustBoost: 12,
      coinsEarned: 2000,
      coupon: "SUCC-CIVIC-HERO (Rs. 1000 Tax Credit Voucher)",
      message: "LEGENDARY REWARD! You are a true Civic Champion!"
    };
  }
}
