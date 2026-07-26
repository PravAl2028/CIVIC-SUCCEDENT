export interface GovernmentScheme {
  id: string;
  name: string;
  abbreviation: string;
  ministry: string;
  description: string;
  eligibility: string;
  benefits: string;
  applicationProcess: string;
  officialPortal: string;
  relevantDamageTypes: string[];
}

export const GOVERNMENT_SCHEMES: GovernmentScheme[] = [
  {
    id: "pmgsy",
    name: "Pradhan Mantri Gram Sadak Yojana",
    abbreviation: "PMGSY",
    ministry: "Ministry of Rural Development",
    description: "A flagship program to provide all-weather road connectivity to unconnected rural habitations. Targets road construction, upgrading, and maintenance in rural areas.",
    eligibility: "Rural habitations with population 250+ (plain areas) or 100+ (hill/tribal/desert areas) that lack all-weather road connectivity.",
    benefits: "Construction of new rural roads, upgrading existing roads to all-weather standards, bridge construction, and maintenance funds.",
    applicationProcess: "Report through Gram Panchayat → District Rural Roads Agency (DRRA) → State-level High Power Monitoring Board (HPMB).",
    officialPortal: "https://pmgsy.nic.in",
    relevantDamageTypes: ["pothole", "crack", "waterlogging"]
  },
  {
    id: "sbm",
    name: "Swachh Bharat Mission",
    abbreviation: "SBM",
    ministry: "Ministry of Housing and Urban Affairs / Ministry of Jal Shakti",
    description: "India's flagship sanitation program aimed at eliminating open defecation, improving solid waste management, and creating clean cities and villages.",
    eligibility: "All urban and rural households. Individual households, ULBs, and community organizations can apply for infrastructure support.",
    benefits: "Construction of individual and community toilets, solid waste management infrastructure, IEC (Information, Education, Communication) activities, and ODF (Open Defecation Free) certification.",
    applicationProcess: "Report through local ULB/Ward office → Swachh Bharat Mission portal → District-level implementation.",
    officialPortal: "https://swachhbharat.gov.in",
    relevantDamageTypes: ["garbage_dump", "broken_infrastructure"]
  },
  {
    id: "jjm",
    name: "Jal Jeevan Mission",
    abbreviation: "JJM",
    ministry: "Ministry of Jal Shakti",
    description: "Aims to provide functional household tap connections (FHTC) to every rural household by 2024, ensuring safe and adequate water supply through piped water connections.",
    eligibility: "All rural households, especially in water-scarce areas, aspirational districts, and SC/ST majority villages.",
    benefits: "Piped water supply to every household, water quality testing labs, greywater management, and community water purification plants.",
    applicationProcess: "Report through Gram Panchayat → Village Water and Sanitation Committee (VWSC) → State-level programme management unit.",
    officialPortal: "https://jaljeevanmission.gov.in",
    relevantDamageTypes: ["water_leak", "waterlogging", "broken_infrastructure"]
  },
  {
    id: "smart_cities",
    name: "Smart Cities Mission",
    abbreviation: "SCM",
    ministry: "Ministry of Housing and Urban Affairs",
    description: "Aims to develop smart cities with modern infrastructure, sustainable practices, and technology-driven solutions for urban development and civic services.",
    eligibility: "100 cities selected through competition-based process. Infrastructure projects must align with smart city proposals (Area-Based Development or Pan-City initiatives).",
    benefits: "Integrated command and control centers, smart road infrastructure, intelligent lighting, waste management systems, and urban mobility solutions.",
    applicationProcess: "Report through Smart City SPV → Municipal Corporation → Central government review.",
    officialPortal: "https://smartcities.gov.in",
    relevantDamageTypes: ["pothole", "broken_streetlight", "waterlogging", "crack"]
  },
  {
    id: "amrut",
    name: "Atal Mission for Rejuvenation and Urban Transformation",
    abbreviation: "AMRUT",
    ministry: "Ministry of Housing and Urban Affairs",
    description: "Focuses on providing basic civic amenities (water supply, sewerage, urban transport, green spaces) to improve quality of life in 500 cities.",
    eligibility: "Cities with population 100,000+ (as per Census 2011). Priority to cities without water supply or with intermittent supply.",
    benefits: "Water supply augmentation, sewerage network development, urban green spaces, non-motorized transport infrastructure, and storm water drainage.",
    applicationProcess: "Report through ULB → State-level AMRUT Directorate → Ministry review.",
    officialPortal: "https://amrut.gov.in",
    relevantDamageTypes: ["water_leak", "waterlogging", "pothole"]
  },
  {
    id: "nmba",
    name: "National Mission for Clean Ganga",
    abbreviation: "NMCG",
    ministry: "Ministry of Jal Shakti",
    description: "Aims to reduce pollution load in the Ganga River through abatement of industrial and domestic pollution, river surface cleaning, and biodiversity conservation.",
    eligibility: "Towns and cities along the Ganga and its tributaries. Sewerage infrastructure projects, STP construction, and riverfront development.",
    benefits: "Sewage treatment plants, riverfront development, biodiversity conservation, and industrial effluent treatment.",
    applicationProcess: "Report through State-level NMCG committee → District administration → NMCG review.",
    officialPortal: "https://nmcg.nic.in",
    relevantDamageTypes: ["water_leak", "garbage_dump", "broken_infrastructure"]
  }
];

export function getSchemeForDamageType(damageType: string): GovernmentScheme[] {
  return GOVERNMENT_SCHEMES.filter(s => s.relevantDamageTypes.includes(damageType));
}

export function getSchemeById(id: string): GovernmentScheme | undefined {
  return GOVERNMENT_SCHEMES.find(s => s.id === id);
}
