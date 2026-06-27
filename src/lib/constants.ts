export enum DamageType {
  POTHOLE = "pothole",
  CRACK = "crack",
  WATER_LEAK = "water_leak",
  BROKEN_STREETLIGHT = "broken_streetlight",
  GARBAGE_DUMP = "garbage_dump",
  WATERLOGGING = "waterlogging",
  BROKEN_INFRASTRUCTURE = "broken_infrastructure",
  OTHER = "other"
}

export interface Case {
  id: string;
  damageType: DamageType;
  severity: number;
  description: string;
  fraudScore: number;
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
  status: "reported" | "confirmed" | "dispatched" | "resolved";
  reportedBy: string;
  verifications: number;
  verifiedBy: string[];
  rejectedBy?: string[];
  complaintGenerated: boolean;
  complaintText?: string;
  resolvedBy?: string | null;
  resolvedImageUrl?: string | null;
  rejectionImageUrl?: string | null;
  resolutionStatus?: string | null;
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  xp: number;
  trustScore: number;
  coins: number;
  homeLatitude?: number;
  homeLongitude?: number;
  homePinned?: boolean;
  empireValuation?: number;
  rank: "Scout" | "Scout Elite" | "Patrol Ranger" | "Ranger Captain" | "City Guardian" | "Guardian Commander" | "Champion" | "Legend" | string;
  level?: number;
  totalReports: number;
  totalVerifications: number;
  totalResolves: number;
  badges?: string[];
  createdAt: string;
  avatarUrl?: string;
  warningsCount?: number;
  isBlocked?: boolean;
  isAdmin?: boolean;
}

export interface Hood {
  id: string;
  name: string;
  city: string;
  healthScore: number;
  totalCases: number;
  resolvedCases: number;
  activeHeroes: number;
}

export const INITIAL_USER: UserProfile = {
  userId: "user_alex",
  displayName: "Alex Rivera",
  email: "alex.rivera@example.com",
  photoURL: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzrBenYNUT47en63o1y_TfD_aF_Mnm9eDpaA3M2TBWpjTExdrOWPw3rm54pLC2k-Its-f7jA1rz9du6QIxc0HzUCbMm51KUkI6epLuyJMiWEmIRKksC8Se05ch_wdrz_9MaMdIMV6Q47qMPBFvQvEf5IMN2UbcGpaaFNB1BWN4Yc4_7bnZ5tw_CLYazpxWmpLh9nPlhVLk_kc72BAFm_MnX2eK7F5omE2EC2sPzF1opuzdtyDeAj4KGK0V_A_ESjq4ckFM5QOKa1Cd",
  xp: 1250,
  trustScore: 88,
  coins: 200,
  homeLatitude: 12.9348,
  homeLongitude: 77.6240,
  homePinned: true,
  empireValuation: 200,
  rank: "Ranger",
  totalReports: 42,
  totalVerifications: 28,
  totalResolves: 15,
  createdAt: "2023-10-15T00:00:00.000Z"
};

export const INITIAL_HOOD: Hood = {
  id: "koramangala",
  name: "Koramangala 5th Block",
  city: "Bangalore",
  healthScore: 78,
  totalCases: 150,
  resolvedCases: 117,
  activeHeroes: 23
};

export const SEED_CASES: Case[] = [
  {
    id: "case_001",
    damageType: DamageType.POTHOLE,
    severity: 7,
    description: "Large pothole in the middle of the road near the junction, causing traffic hazard",
    fraudScore: 8,
    latitude: 12.9348,
    longitude: 77.6235,
    address: "5th Cross, Koramangala 5th Block, Bangalore",
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop",
    status: "reported",
    reportedBy: "user_alex",
    verifications: 3,
    verifiedBy: ["user_sana", "user_vikram", "user_arjun"],
    complaintGenerated: false,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 3600000).toISOString()
  },
  {
    id: "case_002",
    damageType: DamageType.BROKEN_STREETLIGHT,
    severity: 5,
    description: "Flickering and mostly broken streetlight on ST-442 main lane. Complete blackout at night.",
    fraudScore: 12,
    latitude: 12.9360,
    longitude: 77.6250,
    address: "17th Main Rd, Koramangala 5th Block, Bangalore",
    imageUrl: "https://images.unsplash.com/photo-1509024644558-2f56ce76c090?q=80&w=600&auto=format&fit=crop",
    status: "dispatched",
    reportedBy: "user_sana",
    verifications: 2,
    verifiedBy: ["user_alex", "user_arjun"],
    complaintGenerated: true,
    complaintText: "FORMAL GOVERNMENT COMPLAINT LETTER\n\nTo the Electrical Division Superintendent,\nSubject: Complaint regarding Broken Streetlight ST-442\nLocation: 17th Main Rd, Koramangala, Bangalore\n\nSir/Madam,\nThis is to formally report a dark, hazardous environment due to a non-functional streetlight at 17th Main Rd, Koramangala. Immediate action is requested.\n\nReference: case_002",
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString()
  },
  {
    id: "case_003",
    damageType: DamageType.WATER_LEAK,
    severity: 8,
    description: "Sidewalk flooding from broken underground pipe near commercial shops",
    fraudScore: 5,
    latitude: 12.9335,
    longitude: 77.6220,
    address: "4th Block, Koramangala, Bangalore",
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e5742383?q=80&w=600&auto=format&fit=crop",
    status: "confirmed",
    reportedBy: "user_vikram",
    verifications: 4,
    verifiedBy: ["user_alex", "user_sana", "user_arjun", "user_ramesh"],
    complaintGenerated: false,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: "case_004",
    damageType: DamageType.GARBAGE_DUMP,
    severity: 4,
    description: "Uncontrolled commercial garbage dumping in empty site corner",
    fraudScore: 3,
    latitude: 12.9355,
    longitude: 77.6210,
    address: "8th Cross, Koramangala, Bangalore",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop",
    status: "resolved",
    reportedBy: "user_arjun",
    verifications: 5,
    verifiedBy: ["user_alex", "user_sana", "user_vikram", "user_ramesh", "user_prakash"],
    complaintGenerated: true,
    complaintText: "COMPLAINT RESOLVED",
    resolvedBy: "user_alex",
    resolvedImageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600&auto=format&fit=crop",
    resolutionStatus: "fully_resolved",
    explanation: "Excellent repair by citizens and public works. Site is clean.",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

export const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d44" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#3d3d5c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3d5c" }] },
  { featureType: "water", stylers: [{ color: "#0f0f23" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] }
];
