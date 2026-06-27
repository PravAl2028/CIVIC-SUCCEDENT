import React, { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, Circle } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64Data: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

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
          className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Main Video Viewport */}
      <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-zinc-400">Booting scanning lenses...</p>
          </div>
        )}

        {error ? (
          <div className="p-8 text-center max-w-sm absolute z-20 bg-zinc-900/95 border border-zinc-800 rounded-3xl flex flex-col items-center gap-5 shadow-2xl backdrop-blur-md mx-4">
            <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center border border-red-500/20 shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-white">
                Camera Access Blocked
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#006a65] text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-2xl hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
            >
              Cancel Patrol
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-100"
          />
        )}

        {/* Framing Reticle */}
        <div className="absolute pointer-events-none w-64 h-64 border-2 border-white/20 rounded-[32px] flex items-center justify-center">
          <div className="w-5 h-5 border-t-4 border-l-4 border-yellow-400 absolute top-0 left-0 rounded-tl-xl" />
          <div className="w-5 h-5 border-t-4 border-r-4 border-yellow-400 absolute top-0 right-0 rounded-tr-xl" />
          <div className="w-5 h-5 border-b-4 border-l-4 border-yellow-400 absolute bottom-0 left-0 rounded-bl-xl" />
          <div className="w-5 h-5 border-b-4 border-r-4 border-yellow-400 absolute bottom-0 right-0 rounded-br-xl" />
          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
        </div>
      </div>

      {/* Bottom Capture Panel */}
      <div className="w-full pb-10 pt-6 px-6 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 z-10 flex flex-col items-center gap-4">
        {!error && (
          <p className="text-xs text-zinc-400 font-medium text-center max-w-xs">
            Center the infrastructure damage (pothole, streetlight, water leak, etc.) inside the yellow guide frames.
          </p>
        )}
        <div className="flex justify-center items-center w-full relative">
          {!error && (
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
