import React, { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, Circle, AlertTriangle } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64Data: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGps();
  }, []);

  useEffect(() => {
    if (!gpsError) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, gpsError]);

  const checkGps = () => {
    if (!navigator.geolocation) {
      setGpsError("HTML5 Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGpsError(null);
      },
      (err) => {
        console.error("Camera Geolocation check failed:", err);
        let errMsg = "GPS signal unavailable. Location must be enabled to upload photos.";
        if (err.code === err.PERMISSION_DENIED) {
          errMsg = "Location tracking permission was denied by the browser. Location must be enabled to upload photos and report defects.";
        }
        setGpsError(errMsg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported or is blocked in this browser sandbox environment.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Camera access error:", err);
      const isPermissionDenied = 
        err?.name === "NotAllowedError" || 
        err?.message?.includes("Permission denied") || 
        err?.name === "PermissionDeniedError";
        
      setError(
        isPermissionDenied
          ? "Camera permission is denied by the browser. A live camera feed is required to report or verify defects to prevent AI-generated or uploaded image submissions."
          : "Camera is unavailable. A live camera feed is required to report or verify defects to prevent AI-generated or uploaded image submissions."
      );
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 jpeg
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      
      onCapture(base64Data);
    }
  };

  const hasError = !!(gpsError || error);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between items-center text-white font-sans overflow-hidden">
      {/* Top Header Controls */}
      <div className="w-full flex justify-between items-center p-6 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 z-10">
        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-white/10 backdrop-blur-sm">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">LIVE AR SCOUTING</span>
        </div>
        <button
          onClick={toggleFacingMode}
          disabled={hasError}
          className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all disabled:opacity-40"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Main Video Viewport */}
      <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
        {loading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-zinc-400">Booting scanning lenses...</p>
          </div>
        )}

        {gpsError ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md text-center max-w-[280px] w-full">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2 animate-pulse" />
            <h3 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Location Access Required</h3>
            <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">{gpsError}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setGpsError(null);
                  checkGps();
                }}
                className="w-full bg-[#006a65] text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-teal-700 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Retry GPS Access
              </button>
              <button
                onClick={onClose}
                className="w-full bg-zinc-800 text-zinc-300 font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md text-center max-w-[280px] w-full">
            <Camera className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Camera Access Required</h3>
            <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  startCamera();
                }}
                className="w-full bg-[#006a65] text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-teal-700 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Retry Camera Access
              </button>
              <button
                onClick={onClose}
                className="w-full bg-zinc-800 text-zinc-300 font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-100"
            />
            {/* Framing Reticle */}
            <div className="absolute pointer-events-none w-64 h-64 border-2 border-white/20 rounded-[32px] flex items-center justify-center">
              <div className="w-5 h-5 border-t-4 border-l-4 border-yellow-400 absolute top-0 left-0 rounded-tl-xl" />
              <div className="w-5 h-5 border-t-4 border-r-4 border-yellow-400 absolute top-0 right-0 rounded-tr-xl" />
              <div className="w-5 h-5 border-b-4 border-l-4 border-yellow-400 absolute bottom-0 left-0 rounded-bl-xl" />
              <div className="w-5 h-5 border-b-4 border-r-4 border-yellow-400 absolute bottom-0 right-0 rounded-br-xl" />
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
            </div>
          </>
        )}
      </div>

      {/* Bottom Capture Panel */}
      <div className="w-full pb-10 pt-6 px-6 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 z-10 flex flex-col items-center gap-4">
        {!hasError && (
          <p className="text-xs text-zinc-400 font-medium text-center max-w-xs">
            Center the infrastructure damage (pothole, streetlight, water leak, etc.) inside the yellow guide frames.
          </p>
        )}
        <div className="flex justify-center items-center w-full relative">
          {!hasError && (
            <button
              onClick={handleCapture}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-90 transition-transform cursor-pointer border-4 border-yellow-400"
            >
              <Camera className="w-8 h-8 text-black" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
