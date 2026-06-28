import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { readDb, writeDb } from "./src/lib/db.js";
import { runScannerAgent } from "./src/agents/scannerAgent.js";
import { runDispatcherAgent } from "./src/agents/dispatcherAgent.js";
import { runResolverAgent } from "./src/agents/resolverAgent.js";
import { runModeratorAgent } from "./src/agents/moderatorAgent.js";
import { haversineDistance, simulateReverseGeocode } from "./src/lib/geo.js";
import { generateReward } from "./src/lib/rewards.js";
import { calculateNewTrust } from "./src/lib/trust.js";
import { getRankInfo } from "./src/lib/xp.js";
import { SEED_CASES, INITIAL_USER, INITIAL_HOOD } from "./src/lib/constants.js";

// Load environment variables
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  
  // Enable Cross-Origin Resource Sharing (CORS)
  app.use(cors());

  // Header and MIME Type Sanitizer Middleware (resolves Cache-Control conflicts, Pragma, and TS/CSS Content-Type issues)
  app.use((req, res, next) => {
    // Remove deprecated Pragma header
    res.removeHeader("Pragma");

    // Correct MIME types for CSS and TypeScript files
    const ext = path.extname(req.path).toLowerCase();
    if (ext === ".css") {
      res.setHeader("Content-Type", "text/css; charset=utf-8");
    } else if (ext === ".ts" || ext === ".tsx") {
      res.setHeader("Content-Type", "text/x-typescript; charset=utf-8");
    }

    // Intercept headers to resolve Cache-Control directives and remove deprecated request/response headers
    const originalWriteHead = res.writeHead;
    res.writeHead = function (statusCode, ...args) {
      res.removeHeader("Pragma");
      
      let cacheControl = res.getHeader("Cache-Control");
      if (cacheControl && typeof cacheControl === "string") {
        if (cacheControl.includes("no-cache") || cacheControl.includes("no-store")) {
          // Keep only pure no-cache, no-store directives, omitting max-age / s-maxage conflicts
          res.setHeader("Cache-Control", "no-cache, no-store");
        }
      } else if (!cacheControl) {
        if (req.url.startsWith("/api")) {
          res.setHeader("Cache-Control", "no-cache, no-store");
        } else {
          // Safe cache policy for static files
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      }
      return originalWriteHead.apply(this, [statusCode, ...args]);
    };

    next();
  });
  
  // Configure body parser with high limit for base64 image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- API ROUTES ---

  function getDepartmentsForCity(city: string) {
    const isTelangana = city.toLowerCase().includes("secunderabad") || 
                        city.toLowerCase().includes("hyderabad") || 
                        city.toLowerCase().includes("telangana");
    
    if (isTelangana) {
      return {
        pothole: "GHMC - Road Infrastructure Wing",
        crack: "GHMC - Engineering & Public Works",
        water_leak: "Hyderabad Metropolitan Water Supply and Sewerage Board (HMWSSB)",
        broken_streetlight: "GHMC - Electrical & Street Lighting",
        garbage_dump: "GHMC - Solid Waste Management",
        waterlogging: "GHMC - Town Planning & Drainage",
        broken_infrastructure: "GHMC - Urban Forestry",
        other: "GHMC - General Administration"
      };
    }
    
    return {
      pothole: "BBMP - Road Infrastructure",
      crack: "BBMP - Public Works Department",
      water_leak: "Bangalore Water Supply and Sewerage Board (BWSSB)",
      broken_streetlight: "BBMP - Electrical Division",
      garbage_dump: "BBMP - Solid Waste Management",
      waterlogging: "BBMP - Storm Water Drains Division",
      broken_infrastructure: "BBMP - Urban Forestry & Infrastructure",
      other: "BBMP - General Division"
    };
  }

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // Get user profile
  app.get("/api/user", (req, res) => {
    try {
      const db = readDb();
      res.json(db.user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset user and case state to original seed data (developer luxury feature)
  app.post("/api/user/reset", (req, res) => {
    try {
      const db = readDb();
      db.user = { ...INITIAL_USER };
      db.cases = [...SEED_CASES];
      db.hood = { ...INITIAL_HOOD };
      db.activities = db.activities.slice(0, 2); // Keep initial two
      writeDb(db);
      res.json({ success: true, user: db.user, cases: db.cases });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get hood stats and leaderboards
  app.get("/api/hoods", (req, res) => {
    try {
      const db = readDb();
      res.json({
        hood: db.hood,
        leaderboard: [
          { rank: 1, name: "Ramesh Kumar", count: 42, points: "8.4k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDg8LEre9Cnohej9SQextQ1pI9lzyj_AdiGmtpMXJIMZNFRpBjqbI7OKXfmn0ykmpQVR7jax4-N-_C9Er2_PEy2yT9-m_OTNN3vbG206DEC0ilmzhTVkeC5cpAxTpTibKNeero_wHRQSDrL7YqIAL7tMx3_U3E2pJXsoDo4yVq7e9ikJoora7lnjW4SnR0Ci9bkFzbXE-0lK_FxJURmwD-7Y7qQOf3e35_kbvarxxx8RjhNgaaUv5Q1xhnNWbmS0T_oyKhsG9MbD7BQ" },
          { rank: 2, name: "Sana Mirza", count: 38, points: "7.9k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAW6N1KFKew9bCGMJNAsY_6O9qpXBfn_M2Q3iXOXDBPS0BQsHOCdLip8iJj19ZQl1gPrasto0jTwyGC7zcNHrJ-NtufK0vd5JEvCikDgaL_1VO9R3oIR-IT0GnBuYguoiswkFtL_QI6YDhj-zzxwYhiJDrLvF42z_fx94BxQEDgzrd_PJy5C38qssIwShKxGcMOKr1gp7f_3xjuWG77mzA7z6isWgC3LzvOdyLDWBUAvjuey6wfto9X9OdiwNI5IyYtu2DTPBvokPG5" },
          { rank: 3, name: "Vikram Singh", count: 35, points: "7.2k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3pQo8RrDUtUF8Vb9W8oVBI7_fh8BQedYcH8HPF55h1i9MY4zSJA7nlrPaX7K2NWRML_Q1Gcq26OuQbOslY5WkyITOq4A9cWgKmpp6bXxODFRabP1goTQXdpMrpHD76WcvKxghuVZcVniK--0XjnPgTsgVUYhPxVbw_hMD57uV5Hml2LG5fX_LQD7DDGERFoAuqgkKXQhIRwPc1gvJQs8gn7jShgcDk1q2DJo9c8IAE-xYQV6Tkmk3qvl8q9iCAHsJgKWgTuXyjsuv" },
          { rank: 4, name: db.user.displayName, count: db.user.totalReports, points: `${(db.user.xp / 1000).toFixed(1)}k`, avatar: db.user.photoURL }
        ],
        liveActivities: db.activities
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create manual or raw list report cases
  app.get("/api/reports", (req, res) => {
    try {
      const db = readDb();
      res.json(db.cases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active cases as hazards
  app.get("/api/cases", (req, res) => {
    try {
      const db = readDb();
      res.json(db.cases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Removed /api/recenter endpoint

  // Update case details (for user manual corrections)
  app.put("/api/cases/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { damageType, severity, description, latitude, longitude } = req.body;
      const db = readDb();
      const caseItem = db.cases.find(c => c.id === id);
      
      if (!caseItem) {
        return res.status(404).json({ error: "Case not found" });
      }

      if (damageType !== undefined) {
        caseItem.damageType = damageType;
      }
      if (severity !== undefined) {
        caseItem.severity = Number(severity);
      }
      if (description !== undefined) {
        caseItem.description = description;
      }
      if (latitude !== undefined) {
        caseItem.latitude = Number(latitude);
      }
      if (longitude !== undefined) {
        caseItem.longitude = Number(longitude);
      }

      caseItem.updatedAt = new Date().toISOString();
      
      // Update associated activity message
      db.activities = db.activities.map(act => {
        if (act.type === "report" && act.message.includes(id)) {
          return {
            ...act,
            message: `Scanned new ${damageType || caseItem.damageType} at ${caseItem.address}`
          };
        }
        return act;
      });

      writeDb(db);
      res.json({ success: true, case: caseItem });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Discard / Delete a case
  app.delete("/api/cases/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      const caseIndex = db.cases.findIndex(c => c.id === id);
      
      if (caseIndex !== -1) {
        const removedCase = db.cases[caseIndex];
        db.cases.splice(caseIndex, 1);
        
        // Revert user stats
        if (db.user.totalReports > 0) db.user.totalReports -= 1;
        db.user.xp = Math.max(0, db.user.xp - 50); // Revert base XP
        
        // Revert hood stats
        if (db.hood.totalCases > 0) db.hood.totalCases -= 1;
        
        // Filter out report activity
        db.activities = db.activities.filter(act => {
          const isMatch = act.type === "report" && act.message.includes(removedCase.address);
          return !isMatch;
        });

        writeDb(db);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify another citizen's report
  app.post("/api/verify", (req, res) => {
    try {
      const { caseId, userId, vote = "yes", imageBase64 } = req.body;
      const db = readDb();
      const caseItem = db.cases.find(c => c.id === caseId);
      
      if (!caseItem) {
        return res.status(404).json({ error: "Case not found" });
      }

      if (vote === "undo") {
        const hasVerified = caseItem.verifiedBy.includes(userId);
        const hasRejected = (caseItem.rejectedBy || []).includes(userId);
        if (!hasVerified && !hasRejected) {
          return res.status(400).json({ error: "You have not verified this case" });
        }

        if (hasVerified) {
          caseItem.verifications = Math.max(0, caseItem.verifications - 1);
          caseItem.verifiedBy = caseItem.verifiedBy.filter(id => id !== userId);
        } else if (hasRejected) {
          caseItem.rejectedBy = (caseItem.rejectedBy || []).filter(id => id !== userId);
          // If they undo their rejection, we don't necessarily delete the image unless we want to, 
          // but let's just keep it simple.
        }

        db.user.xp = Math.max(0, db.user.xp - 15);
        db.user.totalVerifications = Math.max(0, db.user.totalVerifications - 1);
        
        db.activities.unshift({
          id: "act_" + Date.now(),
          userDisplayName: db.user.displayName,
          userPhotoURL: db.user.photoURL,
          type: "verify",
          message: `Undid verification for report #${caseItem.id.substring(caseItem.id.length - 4)}`,
          timestamp: new Date().toISOString(),
          badge: "UNDO"
        });
      } else if (vote === "proof") {
        const hasRejected = (caseItem.rejectedBy || []).includes(userId);
        if (!hasRejected) {
          return res.status(400).json({ error: "You must reject the case before providing proof" });
        }
        if (imageBase64) {
          caseItem.rejectionImageUrl = imageBase64;
          caseItem.updatedAt = new Date().toISOString();
        }
      } else {
        const hasVerified = caseItem.verifiedBy.includes(userId);
        const hasRejected = (caseItem.rejectedBy || []).includes(userId);
        if (hasVerified || hasRejected) {
          return res.status(400).json({ error: "You have already verified this case" });
        }

        if (vote === "yes") {
          caseItem.verifications += 1;
          caseItem.verifiedBy.push(userId);
        } else if (vote === "no") {
          caseItem.rejectedBy = caseItem.rejectedBy || [];
          caseItem.rejectedBy.push(userId);
          if (imageBase64) {
            caseItem.rejectionImageUrl = imageBase64;
          }
        }

        caseItem.updatedAt = new Date().toISOString();

        if (caseItem.verifications >= 3 && !caseItem.complaintGenerated) {
          caseItem.status = "confirmed";
        }

        db.user.xp += 15;
        db.user.totalVerifications += 1;
        db.user.trustScore = calculateNewTrust(db.user.trustScore, "correct_verification");
        
        const rankInfo = getRankInfo(db.user.xp, db.user.trustScore);
        db.user.rank = rankInfo.currentRank;

        db.activities.unshift({
          id: "act_" + Date.now(),
          userDisplayName: db.user.displayName,
          userPhotoURL: db.user.photoURL,
          type: "verify",
          message: `${vote === 'yes' ? 'Verified' : 'Rejected'} report #${caseItem.id.substring(caseItem.id.length - 4)} (${caseItem.damageType}) at ${caseItem.address}`,
          timestamp: new Date().toISOString(),
          badge: vote === 'yes' ? "VERIFIED" : "REJECTED"
        });
      }

      if (db.activities.length > 25) {
        db.activities.pop();
      }

      writeDb(db);
      res.json({ success: true, case: caseItem, user: db.user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Real Reverse Geocoding using Geoapify API
  async function realReverseGeocode(lat: number, lng: number): Promise<{ address: string; landmark: string }> {
    try {
      const apiKey = process.env.VITE_GEOAPIFY_API_KEY || "caecb90e637a43f49ca3f9829399eb2a";
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          return {
            address: props.formatted || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            landmark: props.name || props.suburb || props.district || "Near current coordinates"
          };
        }
      }
    } catch (e) {
      console.warn("Real reverse geocoding failed on backend, falling back:", e);
    }
    return simulateReverseGeocode(lat, lng);
  }

  // Scanner Agent API: analyzes an uploaded base64 image
  app.post("/api/agents/scanner", async (req, res) => {
    try {
      const { imageBase64, latitude, longitude, userId, selectedModel } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ success: false, reason: "No image provided" });
      }

      // Run Scanner Agent
      const analysis = await runScannerAgent(imageBase64, "image/jpeg", selectedModel);

      if (!analysis.isValidReport || analysis.fraudScore > 75) {
        return res.json({
          success: false,
          reason: "rejection",
          rejectionReason: analysis.rejectionReason || "Image flagged as potentially non-infrastructure or fraud."
        });
      }

      const db = readDb();

      // Geo-deduplication check within 15 meters
      const duplicate = db.cases.find(c => {
        if (c.status === "resolved") return false;
        const dist = haversineDistance(latitude, longitude, c.latitude, c.longitude);
        return dist < 15 && c.damageType === analysis.damageType;
      });

      if (duplicate) {
        return res.json({
          success: false,
          reason: "duplicate",
          existingCase: duplicate
        });
      }

      // Geocode to get rich address details
      const geocode = await realReverseGeocode(Number(latitude), Number(longitude));

      // Create case
      const newCase: any = {
        id: "case_" + Date.now(),
        damageType: analysis.damageType,
        severity: analysis.severity,
        description: analysis.description,
        fraudScore: analysis.fraudScore,
        latitude,
        longitude,
        address: geocode.address,
        landmark: geocode.landmark,
        imageUrl: `data:image/jpeg;base64,${imageBase64}`,
        status: "reported",
        verifications: 0,
        verifiedBy: [],
        complaintGenerated: false,
        isFallback: analysis.isFallback || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.cases.push(newCase);

      // User submits report
      db.user.totalReports += 1;
      db.user.xp += 50; // Base XP for scan
      db.user.trustScore = calculateNewTrust(db.user.trustScore, "verified_report");
      const rankInfo = getRankInfo(db.user.xp, db.user.trustScore);
      db.user.rank = rankInfo.currentRank;

      // Add to live activity
      db.activities.unshift({
        id: "act_" + Date.now(),
        userDisplayName: db.user.displayName,
        userPhotoURL: db.user.photoURL,
        type: "report",
        message: `Scanned new ${analysis.damageType} at ${newCase.address}`,
        timestamp: new Date().toISOString(),
        badge: "NEW REPORT"
      });

      // Update Hood Stats
      db.hood.totalCases += 1;

      writeDb(db);

      res.json({
        success: true,
        case: newCase,
        user: db.user,
        isFallback: analysis.isFallback || false
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dispatcher Agent API: generates government complaint letters for verified issues
  app.post("/api/agents/dispatcher", async (req, res) => {
    try {
      const { caseId, selectedModel } = req.body;
      const db = readDb();
      const caseItem = db.cases.find(c => c.id === caseId);

      if (!caseItem) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Build memory of previous letters for consistency
      const previousLettersContext = db.cases
        .filter(c => c.complaintGenerated && c.complaintText)
        .slice(0, 3)
        .map(c => `[Previously Dispatched Letter]\nIssue: ${c.damageType}\nLocation: ${c.address}\nLetter Context:\n${c.complaintText}\n---`)
        .join("\n\n");

      // Run Dispatcher Agent with memory/context
      const dispatchData = await runDispatcherAgent(caseItem, selectedModel, previousLettersContext);

      caseItem.status = "dispatched";
      caseItem.complaintGenerated = true;
      caseItem.complaintText = dispatchData.complaintLetter;
      caseItem.updatedAt = new Date().toISOString();

      // Activity
      db.activities.unshift({
        id: "act_" + Date.now(),
        userDisplayName: "City Dispatcher",
        userPhotoURL: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5nxvCSa6--TLEL5jgrPtDCRJBXyUfzT51WdXxZr1VYfzOo7EUmU7Lp1qNQg465eyrdSz71wuwprK2FLDoMuHbcJhC_sOAo4BweYqP4MzFENU7c94zQ0FlnJsB2vpHdGeYFANbtk4RDd1-ULekhIpCUX4WLpxnIbChaWrIrgckgjUd9_lmEUt2wq-oMmDay6PbXrz0YajFnJq8vOtzBqyMtzmE478L_vFvNYRvG-3OTWOELlSXptMFvrW9ggTE0Y7zFhUy9b7N0Mo2",
        type: "verify",
        message: `Dispatched formal complaint letter for ${caseItem.damageType} in ${caseItem.address}`,
        timestamp: new Date().toISOString(),
        badge: "DISPATCHED"
      });

      writeDb(db);
      res.json({ success: true, case: caseItem, dispatchData });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Resolver Agent API: compares before / after photos to confirm citizen-verified repairs
  app.post("/api/agents/resolver", async (req, res) => {
    try {
      const { caseId, afterImageBase64, userId, selectedModel } = req.body;
      const db = readDb();
      const caseItem = db.cases.find(c => c.id === caseId);

      if (!caseItem) {
        return res.status(404).json({ error: "Case not found" });
      }

      if (!caseItem.imageUrl) {
        return res.status(400).json({ error: "Original case image not available" });
      }

      // Extract original base64 out of data URL format
      const beforeBase64 = caseItem.imageUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      
      // Run Resolver Agent
      const resolution = await runResolverAgent(beforeBase64, afterImageBase64, selectedModel);

      if (resolution.resolutionStatus === "fully_resolved" || resolution.resolutionStatus === "partially_resolved") {
        caseItem.status = "resolved";
        caseItem.resolvedBy = userId;
        caseItem.resolvedImageUrl = `data:image/jpeg;base64,${afterImageBase64}`;
        caseItem.resolutionStatus = resolution.resolutionStatus;
        caseItem.explanation = resolution.explanation;
        caseItem.updatedAt = new Date().toISOString();

        // Increment resolver stats
        db.user.totalResolves += 1;
        db.user.xp += 150; // Big bonus for resolve
        db.user.trustScore = calculateNewTrust(db.user.trustScore, "community_verified");
        const rankInfo = getRankInfo(db.user.xp, db.user.trustScore);
        db.user.rank = rankInfo.currentRank;

        // Activity
        db.activities.unshift({
          id: "act_" + Date.now(),
          userDisplayName: db.user.displayName,
          userPhotoURL: db.user.photoURL,
          type: "resolve",
          message: `Successfully resolved ${caseItem.damageType} at ${caseItem.address}!`,
          timestamp: new Date().toISOString(),
          badge: "RESOLVED"
        });

        // Update Hood stats
        db.hood.resolvedCases += 1;
        // Recalculate health score (resolved / total ratio * 100)
        db.hood.healthScore = Math.min(100, Math.floor((db.hood.resolvedCases / db.hood.totalCases) * 100));

        writeDb(db);

        res.json({
          success: true,
          resolved: true,
          case: caseItem,
          user: db.user,
          analysis: resolution
        });
      } else {
        res.json({
          success: true,
          resolved: false,
          explanation: resolution.explanation,
          analysis: resolution
        });
      }
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Generate customized rewards
  app.post("/api/rewards", (req, res) => {
    try {
      const { comboMultiplier } = req.body;
      const reward = generateReward(comboMultiplier || 1);
      
      const db = readDb();
      db.user.xp += reward.xpEarned;
      db.user.trustScore = Math.min(100, db.user.trustScore + reward.trustBoost);
      
      // Update rank
      const rankInfo = getRankInfo(db.user.xp, db.user.trustScore);
      db.user.rank = rankInfo.currentRank;

      writeDb(db);
      res.json({ success: true, reward, user: db.user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Moderator Agent API
  app.post("/api/agents/moderator", async (req, res) => {
    try {
      const { messageText, selectedModel, chatHistory, userWarnings } = req.body;
      if (!messageText) {
        return res.status(400).json({ error: "Missing message text" });
      }
      const moderationResult = await runModeratorAgent(messageText, selectedModel, chatHistory, userWarnings);
      res.json(moderationResult);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CIVIC SUCCEDENT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
