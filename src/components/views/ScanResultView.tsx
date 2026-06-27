import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, CheckCircle2, XCircle, RefreshCw, Zap, Brain, ArrowRight, Eye, Edit3, Check, X } from "lucide-react";
import { DamageType } from "../../lib/constants";

interface ScanResultViewProps {
  loading: boolean;
  capturedImage: string; // base64 string
  isResolveFlow: boolean;
  beforeImage?: string; // original image for resolver flow
  analysisResult: any; // Scanner response or Resolver response
  onConfirm: (editedData?: {
    damageType: string;
    severity: number;
    description: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  onCancel: () => void;
  selectedModel?: string;
}

export default function ScanResultView({
  loading,
  capturedImage,
  isResolveFlow,
  beforeImage,
  analysisResult,
  onConfirm,
  onCancel,
  selectedModel = "gemini-2.5-flash"
}: ScanResultViewProps) {
  
  const c = analysisResult?.case || analysisResult || {};
  
  // State for manual adjustments / corrections
  const [isEditing, setIsEditing] = useState(false);
  const [damageType, setDamageType] = useState("pothole");
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");

  // Sync state when analysis result is loaded
  useEffect(() => {
    if (analysisResult) {
      const activeCase = analysisResult.case || analysisResult || {};
      setDamageType(activeCase.damageType || "pothole");
      setSeverity(activeCase.severity || 5);
      setDescription(activeCase.description || "");
      setLatitude(activeCase.latitude || "");
      setLongitude(activeCase.longitude || "");
    }
  }, [analysisResult]);

  const damageTypeOptions = [
    { value: "pothole", label: "Pothole" },
    { value: "crack", label: "Pavement / Footpath Crack" },
    { value: "water_leak", label: "Water Leak / Pipe Burst" },
    { value: "broken_streetlight", label: "Broken Streetlight" },
    { value: "garbage_dump", label: "Illegal Garbage Dump" },
    { value: "waterlogging", label: "Waterlogging / Flooded Road" },
    { value: "broken_infrastructure", label: "Broken Municipal Railing / Bollard" },
    { value: "other", label: "Other Civic Safety Defect" }
  ];

  if (loading) {
    return (
      <div className="bg-[#111216] min-h-screen text-white font-sans flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-xs space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute w-24 h-24 border-4 border-yellow-400/20 rounded-full animate-ping" />
            <div className="w-16 h-16 bg-zinc-900 border-2 border-yellow-400 rounded-full flex items-center justify-center text-yellow-400">
              <Brain className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl font-black uppercase tracking-tight">
              {isResolveFlow ? "ANALYZING REPAIR WORK" : "RUNNING CITIZEN SCANNER"}
            </h3>
            <p className="text-xs text-zinc-400 mt-2 font-medium">
              {isResolveFlow
                ? "Gemini Resolver Agent is cross-referencing Before/After frames..."
                : "Gemini Scanner Agent is validating defect type, severity, and assessing trust score..."}
            </p>
          </div>
          
          {/* Mock loading status steps */}
          <div className="text-[10px] uppercase font-mono text-zinc-500 space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-850">
            <p className="text-yellow-400">● Accessing cloud Run VM...</p>
            <p className="text-teal-400">● De-noising optical vectors...</p>
            <p className="animate-pulse">● Executing {selectedModel}...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING ACTUAL RESULTS ---

  // Handle No result/failure
  // Handle No result/failure or explicit error response
  if (!analysisResult || analysisResult.error || (analysisResult.success === false && !analysisResult.reason)) {
    const errorMsg = analysisResult?.error || analysisResult?.rejectionReason || "An unexpected error occurred during AI analysis. Please check your internet connection or try again.";
    return (
      <div className="bg-[#111216] min-h-screen text-white font-sans flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-xs space-y-4">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="font-bold text-lg">Scan Failed</h3>
          <p className="text-xs text-zinc-400">{errorMsg}</p>
          <button onClick={onCancel} className="bg-zinc-800 px-6 py-2 rounded-xl text-xs font-bold">Back to Patrol</button>
        </div>
      </div>
    );
  }

  // RESOLVER FLOW CONFIRMATION RENDER
  if (isResolveFlow) {
    const success = analysisResult.resolutionStatus === "fully_resolved" || analysisResult.resolutionStatus === "partially_resolved";

    return (
      <div className="bg-[#191c22] min-h-screen text-zinc-100 font-sans pt-12 pb-24 px-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            {success ? (
              <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full mb-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
            )}
            <h2 className="font-display text-2xl font-black uppercase">
              {success ? "REPAIR VERIFIED BY AI!" : "REPAIR DISPROVED BY AI"}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Comparison status evaluated by Gemini Resolver Agent</p>
          </div>

          {analysisResult.isFallback && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>RESOLVER SIMULATION ACTIVE</span>
              </div>
              <p className="text-zinc-400 leading-relaxed font-medium">
                The Gemini API is under high demand. A robust comparison simulation has been safely processed to keep your gameplay/testing completely uninterrupted.
              </p>
            </div>
          )}

          {/* Dual Frame Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-center">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Frame A: Before</span>
              <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <img src={beforeImage} alt="Before" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-1.5 text-center">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Frame B: After</span>
              <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-850 bg-zinc-900">
                <img src={`data:image/jpeg;base64,${capturedImage}`} alt="After" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Resolution stats */}
          <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-850 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="text-xs text-zinc-400 font-bold">RESOLUTION STATUS</span>
              <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${success ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                {(analysisResult.resolutionStatus || "").replace("_", " ")}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="text-xs text-zinc-400 font-bold">CONFIDENCE ACCURACY</span>
              <span className="text-xs font-mono font-black text-yellow-400">{analysisResult.confidence}%</span>
            </div>

            {success && analysisResult.repairQuality && (
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="text-xs text-zinc-400 font-bold">MUNICIPAL REPAIR QUALITY</span>
                <span className="text-xs font-mono font-black text-emerald-400">{analysisResult.repairQuality}/10</span>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">AI VISUAL ANALYSIS</span>
              <p className="text-xs text-zinc-350 leading-relaxed font-medium">{analysisResult.explanation}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            {success ? (
              <button
                onClick={onConfirm}
                className="flex-1 bg-yellow-400 text-black py-4 rounded-2xl font-bold text-sm hover:bg-yellow-350 active:scale-97 cursor-pointer text-center flex items-center justify-center gap-1.5 shadow"
              >
                Scratch Reward Card
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold text-sm hover:bg-zinc-750 active:scale-97 cursor-pointer text-center"
              >
                Back to Patrol
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- SCANNER DAMAGE LOG PATHS (REJECTION OR DUPLICATE OR NEW ISSUE) ---

  // Path A: Fraud/Rejection Path
  if (analysisResult.success === false && analysisResult.reason === "rejection") {
    return (
      <div className="bg-[#191c22] min-h-screen text-zinc-100 font-sans flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-sm space-y-6 bg-zinc-900 border border-zinc-850 rounded-3xl p-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-display text-2xl font-black uppercase">FLAGGED BY AI FILTER</h3>
            <p className="text-xs text-zinc-400 font-medium">Municipal filter rejected your submitted proof</p>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-left space-y-2">
            <span className="text-[10px] font-black text-red-400 uppercase block tracking-wider">FILTER CAUSE:</span>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">{analysisResult.rejectionReason}</p>
          </div>

          <button
            onClick={onCancel}
            className="w-full bg-zinc-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-zinc-750 cursor-pointer"
          >
            Retry Scan / Back
          </button>
        </div>
      </div>
    );
  }

  // Path B: Duplicate Detected Path
  if (analysisResult.success === false && analysisResult.reason === "duplicate") {
    const dup = analysisResult.existingCase;
    return (
      <div className="bg-[#191c22] min-h-screen text-zinc-100 font-sans flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-sm space-y-6 bg-zinc-900 border border-zinc-850 rounded-3xl p-6 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-xl font-black uppercase">DUPLICATE DETECTED</h3>
            <p className="text-xs text-zinc-400 font-medium">Another citizen already reported this issue nearby!</p>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-left text-xs space-y-2">
            <p className="font-bold text-zinc-200 capitalize">Existing defect: {(dup.damageType || "").replace("_", " ")}</p>
            <p className="text-zinc-400 font-medium">{dup.description}</p>
            <p className="text-[10px] text-zinc-500">Coordinate distance: ~4 meters away</p>
          </div>

          <p className="text-xs text-zinc-400 italic">
            To reward your scouting efforts, we have logged your coordinate upvote to accelerate repair priority! You still earn <strong className="text-yellow-400">+15 XP</strong>.
          </p>

          <button
            onClick={onConfirm} // Confirm triggers small upvote completion and exits
            className="w-full bg-yellow-400 text-black py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-yellow-350 cursor-pointer"
          >
            Claim Consensus XP
          </button>
        </div>
      </div>
    );
  }

  // Path C: Perfect New Scan Result Render!
  const isFraudWarn = c.fraudScore > 35;

  const handleConfirmReport = () => {
    if (!isResolveFlow && analysisResult?.success !== false) {
      onConfirm({
        damageType,
        severity,
        description,
        latitude: latitude === "" ? undefined : latitude,
        longitude: longitude === "" ? undefined : longitude
      });
    } else {
      onConfirm();
    }
  };

  return (
    <div className="bg-[#191c22] min-h-screen text-zinc-100 font-sans pt-12 pb-24 px-6 overflow-y-auto">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-full mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-black uppercase">DEFECT SCAN DETECTED</h2>
          <p className="text-xs text-zinc-400 mt-1">Validated by server-side Gemini intelligence</p>
        </div>

        {/* Fallback/Demo Mode Banner */}
        {(analysisResult.isFallback || c.isFallback) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>CIVIC SIMULATION FALLBACK ACTIVE</span>
            </div>
            <p className="text-zinc-400 leading-relaxed font-medium text-[11px]">
              The Gemini API is currently experiencing extremely high demand. To keep your citizen testing uninterrupted, our municipal simulation engine was triggered to generate high-fidelity mock data.
            </p>
            <p className="text-yellow-400 font-bold text-[11px]">
              💡 You can use the button below to manually correct the classification and details!
            </p>
          </div>
        )}

        {/* Uploaded image frame */}
        <div className="aspect-video w-full rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-lg relative">
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Scanned defect"
            className="w-full h-full object-cover"
          />
          {isFraudWarn && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> High Ambiguity Warn ({c.fraudScore}%)
            </div>
          )}
        </div>

        {/* Toggle Manual Edit Mode */}
        {!isResolveFlow && analysisResult?.success !== false && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1.5 rounded-full font-bold hover:bg-yellow-400/20 active:scale-95 cursor-pointer transition-all shadow"
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lock Manual Edits</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Correct Classification / Edit Details</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Structured properties cards */}
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-850 space-y-4 shadow-lg">
          
          {isEditing ? (
            // Edit Mode Form
            <>
              <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
                <span className="text-xs text-zinc-400 font-bold">DAMAGE CLASSIFICATION</span>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-yellow-400"
                >
                  {damageTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 font-bold">MUNICIPAL SEVERITY RATING</span>
                  <span className="text-xs font-mono font-black text-rose-400">{severity}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full accent-rose-500 bg-zinc-950 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold">
                  <span>1 (Minor cosmetic)</span>
                  <span>10 (Life-threatening)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">COORDINATES (LATITUDE & LONGITUDE)</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="Latitude"
                    className="w-1/2 bg-zinc-950 text-white border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="Longitude"
                    className="w-1/2 bg-zinc-950 text-white border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">DESCRIPTION / SUMMARY</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the defect and its exact location or safety impact..."
                  className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-xl p-3 text-xs leading-relaxed font-medium focus:outline-none focus:border-yellow-400 min-h-[60px]"
                />
              </div>
            </>
          ) : (
            // View Mode Form
            <>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="text-xs text-zinc-400 font-bold">DAMAGE CLASSIFICATION</span>
                <span className="text-xs font-black uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded">
                  {(damageType || "").replace("_", " ")}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="text-xs text-zinc-400 font-bold">MUNICIPAL SEVERITY RATING</span>
                <span className="text-xs font-mono font-black text-rose-400">{severity}/10</span>
              </div>

              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="text-xs text-zinc-400 font-bold">COORDINATES</span>
                <span className="text-xs font-mono font-black text-zinc-300">
                  {latitude}, {longitude}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">CASE FILE SUMMARY</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">{description}</p>
              </div>
            </>
          )}

        </div>

        {/* Consensus Reward Alert */}
        <div className="bg-[#fff9eb]/5 border border-[#f0c040]/10 p-4 rounded-2xl flex gap-3 items-start">
          <div className="w-8 h-8 bg-yellow-400/10 rounded-full flex items-center justify-center text-yellow-500 flex-shrink-0">
            <Zap className="w-4 h-4" style={{ fill: "currentColor" }} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-200">Consensus Submission Rewards</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Confirming this file logs it on the Koramangala active radar. You earn <strong className="text-yellow-400">+50 XP</strong> immediately. 3 community upvotes dispatch a government action letter!
            </p>
          </div>
        </div>

        {/* Action Panel buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-zinc-750 text-zinc-400 hover:text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 cursor-pointer text-center"
          >
            Discard
          </button>
          <button
            onClick={handleConfirmReport}
            className="flex-1 bg-yellow-400 text-black py-4 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-yellow-350 cursor-pointer text-center shadow"
          >
            Confirm & Log Report
          </button>
        </div>
      </div>
    </div>
  );
}
