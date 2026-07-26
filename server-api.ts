import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runScannerAgent } from "./src/agents/scannerAgent.js";
import { runDispatcherAgent } from "./src/agents/dispatcherAgent.js";
import { runResolverAgent } from "./src/agents/resolverAgent.js";
import { runModeratorAgent } from "./src/agents/moderatorAgent.js";
import { haversineDistance, simulateReverseGeocode } from "./src/lib/geo.js";

dotenv.config();

const app = express();
app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (_req, res) => {
  res.json({ name: "Nagarika API", status: "running", version: "1.0.0" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date() });
});

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
    console.warn("Real reverse geocoding failed, falling back:", e);
  }
  return simulateReverseGeocode(lat, lng);
}

app.post("/api/agents/scanner", async (req, res) => {
  try {
    const { imageBase64, latitude, longitude, userId, selectedModel, existingCases } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, reason: "No image provided" });

    const analysis = await runScannerAgent(imageBase64, "image/jpeg", selectedModel);
    if (!analysis.isValidReport || analysis.fraudScore > 75) {
      return res.json({ success: false, reason: "rejection", rejectionReason: analysis.rejectionReason || "Image flagged as potentially non-infrastructure or fraud." });
    }

    if (Array.isArray(existingCases)) {
      const duplicate = existingCases.find((c: any) => {
        if (c.status === "resolved") return false;
        const dist = haversineDistance(latitude, longitude, c.latitude, c.longitude);
        return dist < 15 && c.damageType === analysis.damageType;
      });
      if (duplicate) {
        return res.json({ success: false, reason: "duplicate", existingCase: duplicate });
      }
    }

    const geocode = await realReverseGeocode(Number(latitude), Number(longitude));
    const caseId = "case_" + Date.now();
    const newCase: any = {
      id: caseId,
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
      reportedBy: userId || "anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({ success: true, case: newCase, isFallback: analysis.isFallback || false });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/agents/dispatcher", async (req, res) => {
  try {
    const { caseData, previousLettersContext, selectedModel } = req.body;
    if (!caseData) return res.status(400).json({ error: "Missing caseData" });

    const dispatchData = await runDispatcherAgent(caseData, selectedModel, previousLettersContext || "");
    res.json({ success: true, dispatchData });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agents/resolver", async (req, res) => {
  try {
    const { beforeImageBase64, afterImageBase64, selectedModel } = req.body;
    if (!beforeImageBase64 || !afterImageBase64) return res.status(400).json({ error: "Missing images" });

    const resolution = await runResolverAgent(beforeImageBase64, afterImageBase64, selectedModel);
    res.json({ success: true, analysis: resolution });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agents/moderator", async (req, res) => {
  try {
    const { messageText, selectedModel, chatHistory, userWarnings } = req.body;
    if (!messageText) return res.status(400).json({ error: "Missing message text" });
    const moderationResult = await runModeratorAgent(messageText, selectedModel, chatHistory, userWarnings);
    res.json(moderationResult);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nagarika API Server running on http://0.0.0.0:${PORT}`);
});
