import fs from "fs";
import path from "path";
import { Case, INITIAL_USER, INITIAL_HOOD, SEED_CASES, UserProfile, Hood } from "./constants.js";

const DB_DIR = path.join(process.cwd(), "src", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

interface DatabaseSchema {
  user: UserProfile;
  hood: Hood;
  cases: Case[];
  activities: {
    id: string;
    userDisplayName: string;
    userPhotoURL: string;
    type: "report" | "verify" | "resolve";
    message: string;
    timestamp: string;
    badge?: string;
  }[];
}

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      user: INITIAL_USER,
      hood: INITIAL_HOOD,
      cases: SEED_CASES,
      activities: [
        {
          id: "act_1",
          userDisplayName: "Arjun",
          userPhotoURL: "https://lh3.googleusercontent.com/aida-public/AB6AXuDXgsl00smvzqecXQ2NJ3h0dntpPGMFwjFjZpom_9dOgiVNv6BN0TUo4KkglCRHlAJ-sd1z0C4XQptFDKTgv3yzRzSC59UG6J9zuzVBjgPFSLbBwn0FhwDf0lE1drJoUZohuMzpHPUsaXapPH3NK8dShjY_F1hqYItmMC_hVVU5hwQR3zhp_Heor4Zlb4-4SQX2WsRw9JBSv7P40X4N_H9VxguJWGEon737EZpZwoVCfTGUc7MmEUhJDPElV3iGhay7H-dOkCGr0yns",
          type: "verify",
          message: "Confirmed 'Water Leak' at 17th Main Rd near Blue Tokai.",
          timestamp: new Date(Date.now() - 120000).toISOString(),
          badge: "NEARBY"
        },
        {
          id: "act_2",
          userDisplayName: "City Crew",
          userPhotoURL: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5nxvCSa6--TLEL5jgrPtDCRJBXyUfzT51WdXxZr1VYfzOo7EUmU7Lp1qNQg465eyrdSz71wuwprK2FLDoMuHbcJhC_sOAo4BweYqP4MzFENU7c94zQ0FlnJsB2vpHdGeYFANbtk4RDd1-ULekhIpCUX4WLpxnIbChaWrIrgckgjUd9_lmEUt2wq-oMmDay6PbXrz0YajFnJq8vOtzBqyMtzmE478L_vFvNYRvG-3OTWOELlSXptMFvrW9ggTE0Y7zFhUy9b7N0Mo2",
          type: "resolve",
          message: "Resolved report #8821 in 4th block. Pavement restored.",
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          badge: "RESOLVED"
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(raw);
}

export function writeDb(data: DatabaseSchema) {
  ensureDbExists();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}
