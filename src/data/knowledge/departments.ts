export interface DepartmentEntry {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  state: string;
  handles: string[];
  contactEmail?: string;
  contactPhone?: string;
  escalationPath: string[];
  rtiTemplate: string;
  responseTimeDays: number;
  legalBasis: string;
}

export const DEPARTMENTS: DepartmentEntry[] = [
  {
    id: "ghmc_road",
    name: "Greater Hyderabad Municipal Corporation - Road Infrastructure Wing",
    abbreviation: "GHMC-RIW",
    city: "Hyderabad",
    state: "Telangana",
    handles: ["pothole", "crack", "waterlogging"],
    contactEmail: " commissioner@ghmc.gov.in",
    contactPhone: "040-21111111",
    escalationPath: ["Zonal Commissioner", "Municipal Commissioner", "Chief Secretary Telangana", "National Green Tribunal"],
    rtiTemplate: "Under Section 6(1) of the Right to Information Act, 2005, I request the status of repair work for {issue_type} reported at {address} on {date}. Case Reference: {case_id}. Please provide the expected timeline for resolution and the name of the responsible officer.",
    responseTimeDays: 30,
    legalBasis: "Telangana Municipal Corporations Act, 2009; Indian Road Congress guidelines"
  },
  {
    id: "ghmc_electrical",
    name: "GHMC - Electrical & Street Lighting Division",
    abbreviation: "GHMC-ESL",
    city: "Hyderabad",
    state: "Telangana",
    handles: ["broken_streetlight"],
    contactEmail: " electrical@ghmc.gov.in",
    escalationPath: ["Electrical Engineer (Zone)", "Superintending Engineer", "Chief Engineer"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I seek information regarding the non-functional streetlight at {address}. Please provide: (1) Date of last maintenance, (2) Expected repair date, (3) Name of the nodal officer responsible.",
    responseTimeDays: 15,
    legalBasis: "Indian Electricity Act, 2003; GHMC Street Lighting Policy"
  },
  {
    id: "hmwssb",
    name: "Hyderabad Metropolitan Water Supply and Sewerage Board",
    abbreviation: "HMWSSB",
    city: "Hyderabad",
    state: "Telangana",
    handles: ["water_leak"],
    contactEmail: " complaint@hmwssb.com",
    contactPhone: "155313",
    escalationPath: ["Executive Engineer (Circle)", "Chief Engineer (Distribution)", "Managing Director HMWSSB"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I request information about the water pipeline leak reported at {address}. Please provide the repair schedule and the responsible maintenance team details.",
    responseTimeDays: 7,
    legalBasis: "HMWSSB Act, 1989; AP Right to Water Act"
  },
  {
    id: "ghmc_swm",
    name: "GHMC - Solid Waste Management",
    abbreviation: "GHMC-SWM",
    city: "Hyderabad",
    state: "Telangana",
    handles: ["garbage_dump"],
    contactEmail: " swm@ghmc.gov.in",
    escalationPath: ["Sanitary Inspector", "Zonal Commissioner", "Commissioner GHMC"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I seek details about illegal garbage dumping at {address}. Please provide: (1) Action taken report, (2) Name of the sanitation contractor for this ward, (3) Schedule for clearance.",
    responseTimeDays: 3,
    legalBasis: "Solid Waste Management Rules, 2016; Swachh Bharat Mission guidelines"
  },
  {
    id: "ghmc_engineering",
    name: "GHMC - Engineering & Public Works",
    abbreviation: "GHMC-EPW",
    city: "Hyderabad",
    state: "Telangana",
    handles: ["broken_infrastructure"],
    contactEmail: " engineering@ghmc.gov.in",
    escalationPath: ["Assistant Engineer", "Executive Engineer", "Chief Engineer"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I request the maintenance status for damaged infrastructure at {address}. Please provide the repair timeline and responsible officer details.",
    responseTimeDays: 30,
    legalBasis: "Indian Contract Act; GHMC Engineering Division Manual"
  },
  {
    id: "bbmp_road",
    name: "Bruhat Bengaluru Mahanagara Palike - Road Infrastructure",
    abbreviation: "BBMP-RI",
    city: "Bangalore",
    state: "Karnataka",
    handles: ["pothole", "crack", "waterlogging"],
    contactEmail: " commissioner@bbmp.gov.in",
    contactPhone: "080-22660000",
    escalationPath: ["Joint Commissioner (Zone)", "Commissioner BBMP", "Chief Secretary Karnataka"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I request the status of road repair at {address}. Please provide the action taken, timeline, and responsible officer.",
    responseTimeDays: 30,
    legalBasis: "Karnataka Municipal Corporations Act, 1976"
  },
  {
    id: "bwssb",
    name: "Bangalore Water Supply and Sewerage Board",
    abbreviation: "BWSSB",
    city: "Bangalore",
    state: "Karnataka",
    handles: ["water_leak"],
    contactEmail: " complaint@bwssb.gov.in",
    contactPhone: "1916",
    escalationPath: ["Executive Engineer", "Chief Engineer BWSSB", "Commissioner BWSSB"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I seek information about the water leak at {address}. Please provide repair timeline and responsible team.",
    responseTimeDays: 7,
    legalBasis: "BWSSB Act, 1964"
  },
  {
    id: "bbmp_swm",
    name: "BBMP - Solid Waste Management",
    abbreviation: "BBMP-SWM",
    city: "Bangalore",
    state: "Karnataka",
    handles: ["garbage_dump"],
    contactEmail: " swm@bbmp.gov.in",
    escalationPath: ["Health Inspector", "Joint Commissioner", "Commissioner BBMP"],
    rtiTemplate: "Under Section 6(1) of the RTI Act, 2005, I request information on garbage clearance at {address}. Please provide action taken and contractor details.",
    responseTimeDays: 3,
    legalBasis: "Solid Waste Management Rules, 2016"
  }
];

export function getDepartmentForIssue(damageType: string, city: string): DepartmentEntry | null {
  const cityLower = city.toLowerCase();
  const matching = DEPARTMENTS.filter(d => 
    d.handles.includes(damageType) && 
    (d.city.toLowerCase() === cityLower || cityLower.includes(d.city.toLowerCase()))
  );
  return matching[0] || DEPARTMENTS.find(d => d.handles.includes(damageType)) || null;
}
