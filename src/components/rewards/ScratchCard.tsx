import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Trophy, Award, Gift, Zap } from "lucide-react";
import { Reward } from "../../lib/rewards";

interface ScratchCardProps {
  reward: Reward;
  onClaim: () => void;
}

export default function ScratchCard({ reward, onClaim }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [scratched, setScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);

  useEffect(() => {
    initCanvas();
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get exact pixel size
    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw background coating
    ctx.clearRect(0, 0, width, height);
    
    // Create metallic silver gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#c0c0c0");
    gradient.addColorStop(0.3, "#e0e0e0");
    gradient.addColorStop(0.7, "#a0a0a0");
    gradient.addColorStop(1, "#808080");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw some subtle visual lines/dust on coating
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, 0);
      ctx.lineTo(Math.random() * width, height);
      ctx.stroke();
    }

    // Add a stylish stamp or instruction text
    ctx.fillStyle = "#16213e";
    ctx.font = "bold 16px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH WITH FINGER", width / 2, height / 2 - 10);
    ctx.fillText("TO REVEAL REWARD", width / 2, height / 2 + 15);
  };

  const getPosition = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startScratching = (e: any) => {
    isDrawingRef.current = true;
    scratch(e);
  };

  const stopScratching = () => {
    isDrawingRef.current = false;
    calculateScratchPercentage();
  };

  const scratch = (e: any) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPosition(e);

    // Set composite operation to erase
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
    ctx.fill();
  };

  const calculateScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas || scratched) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    let transparent = 0;

    // Check transparency in alpha channel (every 4th byte)
    for (let i = 3; i < pixels.length; i += 4 * 16) { // step by 16 for speed
      if (pixels[i] === 0) {
        transparent++;
      }
    }

    const totalSampled = pixels.length / (4 * 16);
    const percent = Math.floor((transparent / totalSampled) * 100);
    setScratchPercent(percent);

    if (percent > 45) {
      setScratched(true);
      // Erase everything completely
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(0, 0, width, height);
    }
  };

  // Color theme selectors based on tier
  const getTierColors = () => {
    switch (reward.tier) {
      case "Common":
      case "Bronze":
        return {
          border: "border-amber-700/30",
          accent: "bg-amber-700/10 text-amber-800",
          badge: "from-amber-600 to-amber-800"
        };
      case "Rare":
      case "Silver":
        return {
          border: "border-slate-450/30",
          accent: "bg-slate-400/10 text-slate-800",
          badge: "from-slate-400 to-slate-600"
        };
      case "Epic":
      case "Gold":
        return {
          border: "border-yellow-400/30",
          accent: "bg-yellow-400/10 text-yellow-700",
          badge: "from-yellow-400 to-yellow-600"
        };
      case "Platinum":
        return {
          border: "border-teal-400/30",
          accent: "bg-teal-400/10 text-teal-800",
          badge: "from-teal-400 to-teal-600"
        };
      case "Legendary":
      case "Diamond":
        return {
          border: "border-indigo-400/30",
          accent: "bg-indigo-400/10 text-indigo-800",
          badge: "from-indigo-500 to-indigo-700 animate-pulse"
        };
      default:
        return {
          border: "border-zinc-300/30",
          accent: "bg-zinc-100 text-zinc-700",
          badge: "from-zinc-500 to-zinc-700"
        };
    }
  };

  const colors = getTierColors();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center border border-zinc-150 animate-in zoom-in-95 duration-200">
        
        {/* Card Header */}
        <div className="text-center mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-gradient-to-r ${colors.badge} text-white shadow-sm mb-2`}>
            {reward.tier} TIER PRIZE
          </span>
          <h3 className="font-display text-2xl font-bold text-zinc-900 mt-1">Civic Scratch Card</h3>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Scratch away the coating to reveal your reward!</p>
        </div>

        {/* Scratchable Container */}
        <div className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center">
          
          {/* Underlay Revealed Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 items-center text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center text-yellow-500 mb-3 animate-bounce">
                {reward.coupon ? (
                  <Gift className="w-9 h-9" />
                ) : (
                  <Zap className="w-9 h-9" style={{ fill: "currentColor" }} />
                )}
              </div>
              <p className="text-sm font-semibold text-zinc-800">{reward.message}</p>
            </div>

            <div className="my-2 bg-zinc-50 border border-zinc-150 rounded-xl px-6 py-4 w-full">
              <div className="flex justify-around items-center gap-1">
                <div className="text-center">
                  <span className="block text-[22px] font-bold text-yellow-500 leading-none">+{reward.xpEarned}</span>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">XP</span>
                </div>
                <div className="h-6 w-[1px] bg-zinc-200" />
                <div className="text-center">
                  <span className="block text-[22px] font-bold text-teal-600 leading-none">+{reward.trustBoost}%</span>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Trust</span>
                </div>
                {reward.coinsEarned && (
                  <>
                    <div className="h-6 w-[1px] bg-zinc-200" />
                    <div className="text-center">
                      <span className="block text-[22px] font-bold text-amber-500 leading-none">+{reward.coinsEarned}</span>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Coins</span>
                    </div>
                  </>
                )}
              </div>
              {reward.coupon && (
                <div className="mt-3 pt-2.5 border-t border-zinc-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider mb-0.5">DISCOUNT CODE</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded block select-all">
                    {reward.coupon}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onClaim}
              className="w-full bg-yellow-400 text-black py-3 rounded-xl font-bold text-sm shadow-md hover:bg-yellow-350 active:scale-95 transition-all cursor-pointer"
            >
              Claim Reward & Continue
            </button>
          </div>

          {/* Canvas Overlay Coating */}
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            onMouseDown={startScratching}
            onMouseMove={scratch}
            onMouseUp={stopScratching}
            onMouseLeave={stopScratching}
            onTouchStart={startScratching}
            onTouchMove={scratch}
            onTouchEnd={stopScratching}
            className={`absolute top-0 left-0 cursor-crosshair transition-opacity duration-300 ${scratched ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          />
        </div>

        {/* Bottom Status */}
        <div className="mt-4 w-full">
          {!scratched && (
            <div className="flex items-center justify-between px-2 text-xs font-medium text-zinc-400">
              <span>Scratching progress:</span>
              <span>{scratchPercent}%</span>
            </div>
          )}
          {scratched && (
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-teal-600 uppercase tracking-widest animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>Reward Unlocked!</span>
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
