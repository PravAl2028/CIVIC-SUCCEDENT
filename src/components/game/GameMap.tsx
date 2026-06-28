import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Compass, Locate, MapPin, AlertTriangle, CheckCircle2, Droplets, Lightbulb, Trash2 } from "lucide-react";
import { Case } from "../../lib/constants";
import { haversineDistance } from "../../lib/geo";

// Get corresponding icon background color
export const getMarkerBg = (type: string, status: string) => {
  if (status === "resolved") return "bg-emerald-500 ring-emerald-500/30";
  if (status === "dispatched") return "bg-indigo-500 ring-indigo-500/30";

  switch (type) {
    case "pothole":
    case "crack":
      return "bg-amber-500 ring-amber-500/30";
    case "water_leak":
    case "waterlogging":
      return "bg-teal-500 ring-teal-500/30";
    case "broken_streetlight":
      return "bg-orange-500 ring-orange-500/30";
    case "garbage_dump":
      return "bg-zinc-600 ring-zinc-500/30";
    default:
      return "bg-red-500 ring-red-500/30";
  }
};

// Get the raw SVG for the marker
const getMarkerIconSvg = (type: string, status: string) => {
  if (status === "resolved") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
  }

  switch (type) {
    case "pothole":
    case "crack":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case "water_leak":
    case "waterlogging":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M17 18.5c1.37 0 2.5-1.14 2.5-2.5 0-.7-.35-1.4-1.07-1.97-.7-.57-1.42-1.34-1.6-2.24-.18.9-.7 1.67-1.42 2.24-.72.57-1.07 1.27-1.07 1.97 0 1.36 1.13 2.5 2.5 2.5z"/></svg>`;
    case "broken_streetlight":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white" style="fill: currentColor;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
    case "garbage_dump":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  }
};

// Generate Leaflet divIcon for a reported case
const getLeafletMarkerIcon = (c: Case) => {
  const bgClass = getMarkerBg(c.damageType, c.status);
  const iconSvg = getMarkerIconSvg(c.damageType, c.status);
  const typeLabel = (c.damageType || "").replace("_", " ");

  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-4 ${bgClass} transition-transform duration-150 hover:scale-115">
          ${iconSvg}
        </div>
        <div class="absolute -bottom-6 bg-zinc-900/90 border border-zinc-800 text-[10px] font-bold text-white px-2 py-0.5 rounded-md whitespace-nowrap shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          ${typeLabel}
        </div>
      </div>
    `,
    className: "custom-case-marker-wrapper",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const getCompoundHqSvg = (hq: {
  baseLevel: number;
  solarGridLevel: number;
  repairDepotLevel: number;
  techLabLevel: number;
  ecoCruiserLevel: number;
  heroStatueLevel: number;
}, isOtherUser: boolean = false, tintHue: number = 0) => {
  const baseLvl = hq.baseLevel || 1;
  const solarLvl = hq.solarGridLevel || 0;
  const repairLvl = hq.repairDepotLevel || 0;
  const techLvl = hq.techLabLevel || 0;
  const cruiserLvl = hq.ecoCruiserLevel || 0;
  const statueLvl = hq.heroStatueLevel || 0;

  const filterStyle = isOtherUser ? `filter="hue-rotate(${tintHue}deg)"` : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" ${filterStyle}>
      <defs>
        <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0d14" />
          <stop offset="100%" stop-color="#040406" />
        </linearGradient>
        <linearGradient id="cyberBorder" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00f2fe" />
          <stop offset="50%" stop-color="#7f00ff" />
          <stop offset="100%" stop-color="#00f2fe" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f9d423" />
          <stop offset="100%" stop-color="#ff4e50" />
        </linearGradient>
      </defs>

      <style>
        @keyframes pulseBeam {
          0%, 100% { opacity: 0.3; r: 3px; }
          50% { opacity: 0.9; r: 6px; }
        }
        @keyframes floatCruiser {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes rotatingDish {
          0% { transform: rotate(0deg) translate(-2px, -2px); }
          100% { transform: rotate(360deg) translate(-2px, -2px); }
        }
        @keyframes blinkLight {
          0%, 100% { fill: #ff0055; opacity: 1; }
          50% { fill: #ff0055; opacity: 0.1; }
        }
        @keyframes energyPulse {
          0%, 100% { opacity: 0.2; stroke-width: 1; }
          50% { opacity: 0.8; stroke-width: 2.5; }
        }
        .pulse-light { animation: blinkLight 1s infinite; }
        .energy-beam { animation: energyPulse 1.5s infinite; }
        .heliostat { animation: pulseBeam 2s infinite; }
        .hovercar { animation: floatCruiser 3s infinite ease-in-out; }
        .dish-rot { animation: rotatingDish 6s infinite linear; transform-origin: 35px 35px; }
      </style>

      <!-- Compound Base/Floor Plate -->
      <polygon points="60,105 112,74 60,43 8,74" fill="url(#groundGrad)" stroke="url(#cyberBorder)" stroke-width="2" />
      <line x1="34" y1="59" x2="86" y2="90" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <line x1="86" y1="59" x2="34" y2="90" stroke="rgba(255,255,255,0.05)" stroke-width="1" />

      <!-- TECH LAB (Back Left) -->
      ${techLvl === 1 ? `
        <line x1="35" y1="55" x2="35" y2="35" stroke="#888899" stroke-width="2" />
        <circle cx="35" cy="35" r="2.5" class="pulse-light" />
      ` : ""}
      ${techLvl === 2 ? `
        <line x1="35" y1="55" x2="35" y2="32" stroke="#a0a0b0" stroke-width="2.5" />
        <polygon points="31,55 35,32 39,55" fill="none" stroke="#7f00ff" stroke-width="1" />
        <path d="M 31,28 Q 35,34 39,28" fill="none" stroke="#00f2fe" stroke-width="2" class="dish-rot" />
      ` : ""}
      ${techLvl === 3 ? `
        <polygon points="31,55 34,26 36,26 39,55" fill="#181824" stroke="#7f00ff" stroke-width="1" />
        <line x1="35" y1="55" x2="35" y2="26" stroke="#00f2fe" stroke-width="1.5" />
        <ellipse cx="35" cy="38" rx="7" ry="2.5" fill="none" stroke="#7f00ff" stroke-width="1.5" />
        <ellipse cx="35" cy="32" rx="5" ry="2" fill="none" stroke="#00f2fe" stroke-width="1.5" />
        <circle cx="35" cy="22" r="4.5" fill="url(#goldGrad)" stroke="#fff" stroke-width="0.5" />
        <circle cx="35" cy="22" r="9" fill="none" stroke="#00f2fe" class="energy-beam" />
      ` : ""}

      <!-- SOLAR GRID (Back Right) -->
      ${solarLvl === 1 ? `
        <polygon points="76,50 88,43 92,47 80,54" fill="#0055ff" stroke="#00f2fe" stroke-width="0.75" />
      ` : ""}
      ${solarLvl === 2 ? `
        <polygon points="74,51 84,45 87,48 77,54" fill="#0055ff" stroke="#00f2fe" stroke-width="0.75" />
        <polygon points="80,48 90,42 93,45 83,51" fill="#0055ff" stroke="#00f2fe" stroke-width="0.75" />
        <polygon points="86,45 96,39 99,42 89,48" fill="#0055ff" stroke="#00f2fe" stroke-width="0.75" />
      ` : ""}
      ${solarLvl === 3 ? `
        <line x1="88" y1="53" x2="88" y2="39" stroke="#555566" stroke-width="2.5" />
        <circle cx="88" cy="38" r="4" fill="#f9d423" stroke="#ff4e50" stroke-width="1" />
        <circle cx="88" cy="38" r="8" fill="rgba(249,212,35,0.2)" class="heliostat" />
        <polygon points="88,38 72,56 78,56" fill="rgba(249,212,35,0.15)" />
      ` : ""}

      <!-- REPAIR DEPOT (Right Annex) -->
      ${repairLvl === 1 ? `
        <polygon points="74,80 84,74 84,65 74,71" fill="#7d5c3d" stroke="#5a3d28" stroke-width="0.75" />
        <polygon points="84,74 91,70 91,61 84,65" fill="#60442c" stroke="#5a3d28" stroke-width="0.75" />
        <polygon points="74,71 84,65 91,61 81,67" fill="#a0522d" />
      ` : ""}
      ${repairLvl === 2 ? `
        <polygon points="75,81 88,73 88,61 75,69" fill="#778899" stroke="#475569" stroke-width="1" />
        <polygon points="88,73 98,67 98,55 88,61" fill="#64748b" stroke="#475569" stroke-width="1" />
        <polygon points="75,69 88,61 98,55 85,63" fill="#334155" />
        <line x1="79" y1="78" x2="79" y2="72" stroke="#cbd5e1" stroke-width="2" />
        <line x1="83" y1="76" x2="83" y2="70" stroke="#cbd5e1" stroke-width="2" />
      ` : ""}
      ${repairLvl === 3 ? `
        <polygon points="75,82 92,72 92,57 75,67" fill="#1e293b" stroke="#00ff87" stroke-width="1" />
        <polygon points="92,72 102,66 102,51 92,57" fill="#0f172a" stroke="#00ff87" stroke-width="1" />
        <polygon points="75,67 92,57 102,51 85,61" fill="#00ff87" opacity="0.35" />
        <line x1="80" y1="78" x2="88" y2="73" stroke="#00ff87" stroke-width="1.5" />
        <circle cx="97" cy="58" r="2.5" fill="#00ff87" class="pulse-light" />
      ` : ""}

      <!-- MAIN HQ BUILDING (Center) -->
      ${baseLvl === 1 ? `
        <polygon points="60,82 45,73 45,58 60,67" fill="#5b616a" stroke="#3b3f46" stroke-width="0.75" />
        <polygon points="60,82 75,73 75,58 60,67" fill="#4d515a" stroke="#3b3f46" stroke-width="0.75" />
        <polygon points="45,58 60,45 60,67 45,58" fill="#8c6d58" stroke="#3b3f46" stroke-width="0.75" />
        <polygon points="75,58 60,45 60,67 75,58" fill="#735641" stroke="#3b3f46" stroke-width="0.75" />
        <polygon points="56,80 56,72 60,69 60,77" fill="#4a3b32" />
      ` : ""}

      ${baseLvl === 2 ? `
        <polygon points="60,87 40,75 40,55 60,67" fill="#cbd5e1" stroke="#475569" stroke-width="1" />
        <polygon points="60,87 80,75 80,55 60,67" fill="#94a3b8" stroke="#475569" stroke-width="1" />
        <polygon points="45,71 55,65 55,59 45,65" fill="#00f2fe" opacity="0.8" />
        <polygon points="65,65 75,71 75,65 65,59" fill="#00f2fe" opacity="0.8" />
        <polygon points="40,55 60,43 80,55 60,67" fill="#7f00ff" stroke="#00f2fe" stroke-width="1" />
        <polygon points="58,61 44,53 44,38 58,46" fill="#f8fafc" stroke="#475569" stroke-width="1" />
        <polygon points="58,61 72,53 72,38 58,46" fill="#e2e8f0" stroke="#475569" stroke-width="1" />
        <polygon points="44,38 58,30 72,38 58,46" fill="#1e293b" />
        <polygon points="48,49 54,45 54,42 48,46" fill="#00f2fe" opacity="0.9" />
      ` : ""}

      ${baseLvl === 3 ? `
        <polygon points="60,92 38,79 38,32 60,45" fill="#090a10" stroke="#7f00ff" stroke-width="1.5" />
        <polygon points="60,92 82,79 82,32 60,45" fill="#131520" stroke="#7f00ff" stroke-width="1.5" />
        <polygon points="44,71 47,69 47,40 44,42" fill="#00f2fe" opacity="0.75" />
        <polygon points="53,66 56,64 56,35 53,37" fill="#00f2fe" opacity="0.75" />
        <polygon points="64,35 67,37 67,64 64,66" fill="#00f2fe" opacity="0.75" />
        <polygon points="73,40 76,42 76,71 73,69" fill="#00f2fe" opacity="0.75" />
        <polygon points="38,32 60,19 82,32 60,45" fill="#3b0764" stroke="#7f00ff" stroke-width="1.5" />
        <ellipse cx="60" cy="24" rx="16" ry="6.5" fill="none" stroke="#f9d423" stroke-width="2" />
        <ellipse cx="60" cy="24" rx="20" ry="8" fill="none" stroke="#00f2fe" stroke-width="1.5" class="energy-beam" />
        <polygon points="60,24 40,0 80,0" fill="rgba(0,242,254,0.12)" />
      ` : ""}

      <!-- HERO STATUE (Front Left Garden) -->
      ${statueLvl === 1 ? `
        <line x1="28" y1="80" x2="28" y2="70" stroke="#8b5a2b" stroke-width="2" />
        <polygon points="25,70 28,66 31,70" fill="#cd853f" />
      ` : ""}
      ${statueLvl === 2 ? `
        <line x1="28" y1="82" x2="28" y2="73" stroke="#a0a0a0" stroke-width="2" />
        <polygon points="24,71 28,64 32,71 28,76" fill="#cd7f32" stroke="#ff8c00" stroke-width="0.75" />
      ` : ""}
      ${statueLvl === 3 ? `
        <polygon points="24,84 32,80 34,83 26,87" fill="#1e293b" stroke="#f9d423" stroke-width="1" />
        <polygon points="26,80 30,77 30,73 26,76" fill="#334155" stroke="#f9d423" stroke-width="0.5" />
        <line x1="28" y1="73" x2="28" y2="61" stroke="#f9d423" stroke-width="3" stroke-linecap="round" />
        <circle cx="28" cy="59" r="2.5" fill="#f9d423" />
        <ellipse cx="28" cy="67" rx="5" ry="1.5" fill="none" stroke="#00f2fe" stroke-width="1.25" class="energy-beam" />
      ` : ""}

      <!-- ECO CRUISER (Front Right Driveway) -->
      ${cruiserLvl === 1 ? `
        <g>
          <polygon points="62,94 72,88 77,91 67,97" fill="#ef4444" stroke="#7f1d1d" stroke-width="0.5" />
          <polygon points="65,91 71,87 73,88 67,92" fill="#991b1b" />
        </g>
      ` : ""}
      ${cruiserLvl === 2 ? `
        <g>
          <polygon points="62,96 75,88 80,91 67,99" fill="#475569" stroke="#1e293b" stroke-width="0.75" />
          <polygon points="62,91 75,83 75,88 62,96" fill="#334155" stroke="#1e293b" stroke-width="0.5" />
          <polygon points="67,99 75,88 75,83 67,91" fill="#1e293b" />
        </g>
      ` : ""}
      ${cruiserLvl === 3 ? `
        <g class="hovercar">
          <ellipse cx="71" cy="98" rx="8" ry="3.5" fill="rgba(0,242,254,0.3)" filter="blur(2px)" />
          <polygon points="63,94 76,86 81,89 68,97" fill="#0f172a" stroke="#00f2fe" stroke-width="1" />
          <polygon points="68,97 76,86 78,87 70,98" fill="#00f2fe" opacity="0.8" />
          <polygon points="63,94 68,97 70,98 65,95" fill="#7f00ff" />
          <ellipse cx="72" cy="89" rx="3" ry="1.5" fill="#f9d423" />
        </g>
      ` : ""}

    </svg>
  `;
};

const baseGlowColor = (level: number) => {
  if (level === 3) return "rgba(0,242,254,0.4)";
  if (level === 2) return "rgba(127,0,255,0.3)";
  return "rgba(249,212,35,0.2)";
};

const getCompoundMarkerIcon = (hq: {
  baseLevel: number;
  solarGridLevel: number;
  repairDepotLevel: number;
  techLabLevel: number;
  ecoCruiserLevel: number;
  heroStatueLevel: number;
}, isOtherUser: boolean = false, username: string = "") => {
  let tintHue = 0;
  if (isOtherUser && username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    tintHue = Math.abs(hash) % 360;
  }

  const svgHtml = getCompoundHqSvg(hq, isOtherUser, tintHue);
  const glowColor = baseGlowColor(hq.baseLevel || 1);

  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center">
        <div class="relative w-[120px] h-[120px] drop-shadow-[0_8px_16px_${glowColor}]">
          ${svgHtml}
        </div>
        ${isOtherUser ? `
          <div class="absolute -top-4 bg-zinc-950/90 border border-[#00f2fe]/40 text-[9px] font-black text-[#00f2fe] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg backdrop-blur-md">
            👤 ${username}
          </div>
        ` : `
          <div class="absolute -top-4 bg-zinc-950/90 border border-yellow-400/40 text-[9px] font-black text-yellow-400 px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg backdrop-blur-md">
            👑 YOUR HQ
          </div>
        `}
      </div>
    `,
    className: "custom-compound-hq-marker",
    iconSize: [120, 120],
    iconAnchor: [60, 95]
  });
};

// Custom component to handle map centering programmatically without constant jitter
function ChangeMapView({
  center,
  isAutoCentering,
  setIsAutoCentering
}: {
  center: [number, number];
  isAutoCentering: boolean;
  setIsAutoCentering: (val: boolean) => void;
}) {
  const map = useMap();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const prevAutoCentering = useRef(isAutoCentering);

  useMapEvents({
    popupopen() {
      setIsPopupOpen(true);
    },
    popupclose() {
      setIsPopupOpen(false);
    },
    dragstart() {
      setIsAutoCentering(false);
    },
    zoomstart() {
      setIsAutoCentering(false);
    }
  });

  useEffect(() => {
    const autoCenteringJustEnabled = isAutoCentering && !prevAutoCentering.current;
    prevAutoCentering.current = isAutoCentering;

    if (isPopupOpen) {
      // Suspend auto-centering if popup is open to avoid flickering and fighting Leaflet's autoPan
      return;
    }

    if (isFirstLoad) {
      // First load: set view immediately
      map.setView(center, map.getZoom(), { animate: false });
      setIsFirstLoad(false);
      return;
    }

    if (!isAutoCentering) {
      return;
    }

    const currentMapCenter = map.getCenter();
    const latDiff = Math.abs(center[0] - currentMapCenter.lat);
    const lngDiff = Math.abs(center[1] - currentMapCenter.lng);

    if (autoCenteringJustEnabled) {
      // User manually requested recenter: center smoothly right away and zoom in very close
      map.setView(center, 19, { animate: true });
    } else if (latDiff > 0.05 || lngDiff > 0.05) {
      // Huge jump (e.g., recentering to a new city): jump immediately without animation
      map.setView(center, map.getZoom(), { animate: false });
    } else if (latDiff > 0.0005 || lngDiff > 0.0005) {
      // Medium movement (beyond ~50m threshold): pan smoothly to catch up
      map.panTo(center, { animate: true, duration: 0.6 });
    }
  }, [center, map, isFirstLoad, isPopupOpen, isAutoCentering]);

  return null;
}

// Custom component to capture click events on the map
function MapEvents({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

// Custom component to programmatically update zoom level
function ZoomHandler({ zoom }: { zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setZoom(zoom);
  }, [zoom, map]);
  return null;
}

interface GameMapProps {
  cases: Case[];
  playerPos: { lat: number; lng: number };
  bearing?: number;
  zoom?: number;
  onVerifyCase: (caseId: string, vote?: "yes" | "no" | "undo" | "proof") => void;
  onResolveCase: (caseId: string) => void;
  userId: string;
  setPlayerPos?: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  mapTheme?: "dark" | "light";
  patrolMode?: "patrol" | "sim";
  homeLatitude?: number;
  homeLongitude?: number;
  empireBuildings?: any[];
  onSelectBuilding?: (building: any) => void;
  onMapClickForPlacement?: (lat: number, lng: number) => void;
  placingBuildingType?: string | null;
  onSelectCase?: (c: Case) => void;
  isAutoCentering?: boolean;
  setIsAutoCentering?: (val: boolean) => void;
  publicBases?: any[];
  simSectorMode?: "hq" | "public";
  placingNewHome?: boolean;
}

export default function GameMap({
  cases,
  playerPos,
  bearing = 45,
  zoom = 17,
  onVerifyCase,
  onResolveCase,
  userId,
  setPlayerPos,
  mapTheme = "light",
  patrolMode = "patrol",
  homeLatitude,
  homeLongitude,
  empireBuildings = [],
  onSelectBuilding,
  onMapClickForPlacement,
  placingBuildingType = null,
  onSelectCase,
  isAutoCentering: propIsAutoCentering,
  setIsAutoCentering: propSetIsAutoCentering,
  publicBases = [],
  simSectorMode = "hq",
  placingNewHome = false
}: GameMapProps) {
  const [localIsAutoCentering, localSetIsAutoCentering] = useState(true);
  const isAutoCentering = propIsAutoCentering !== undefined ? propIsAutoCentering : localIsAutoCentering;
  const setIsAutoCentering = propSetIsAutoCentering !== undefined ? propSetIsAutoCentering : localSetIsAutoCentering;
  const [placedMarker, setPlacedMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleMapClick = (latlng: L.LatLng) => {
    if (patrolMode === "sim") {
      if (placingNewHome) {
        if (onMapClickForPlacement) {
          onMapClickForPlacement(latlng.lat, latlng.lng);
        }
      } else if (placingBuildingType && homeLatitude && homeLongitude) {
        const dist = haversineDistance(latlng.lat, latlng.lng, homeLatitude, homeLongitude);
        if (dist > 150) {
          alert(`Too far! Placements must be within 150 meters of your Home Base HQ. Selected point is ${Math.round(dist)}m away.`);
        } else {
          if (onMapClickForPlacement) {
            onMapClickForPlacement(latlng.lat, latlng.lng);
          }
        }
      }
    }
  };

  // Trigger Live Browser Geolocation to locate & center
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        if (setPlayerPos) {
          setPlayerPos(coords);
        }
        setPlacedMarker(coords);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert(`Could not retrieve location: ${error.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Custom player marker divIcon
  const playerIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10">
        <!-- Pulsing Scanning Radar Limit Circle -->
        <div class="absolute w-44 h-44 bg-yellow-400/10 border-2 border-yellow-400/30 rounded-full animate-pulse pointer-events-none" style="min-width: 176px; min-height: 176px; transform: scale(1);"></div>
        
        <!-- Inner Avatar Ring -->
        <div class="relative w-10 h-10 rounded-full bg-zinc-900 border-2 border-yellow-400 flex items-center justify-center shadow-lg z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-yellow-400" style="transform: rotate(${bearing}deg); transition: transform 0.15s ease-out;">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      </div>
    `,
    className: "custom-player-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // HQ Base Gold Crown Icon
  const hqBaseIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-14 h-14 bg-yellow-400/15 border border-yellow-400/35 rounded-full animate-pulse pointer-events-none" style="min-width: 56px; min-height: 56px;"></div>
        <div class="w-10 h-10 rounded-full bg-zinc-950 border-2 border-yellow-400 flex items-center justify-center shadow-2xl z-10">
          <span class="text-xl">👑</span>
        </div>
      </div>
    `,
    className: "custom-hq-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // Building Custom Icons
  const getBuildingIcon = (type: string, level: number = 1) => {
    let emoji = "🏠";
    let colorClass = "bg-amber-500 ring-amber-500/20";
    if (type === "scout_house") {
      emoji = level === 3 ? "🏰" : level === 2 ? "🏡" : "🏠";
      colorClass = "bg-yellow-500 ring-yellow-500/20";
    } else if (type === "solar_grid") {
      emoji = "☀️";
      colorClass = "bg-orange-500 ring-orange-500/20";
    } else if (type === "repair_depot") {
      emoji = "🛠️";
      colorClass = "bg-teal-500 ring-teal-500/20";
    } else if (type === "tech_lab") {
      emoji = "🧪";
      colorClass = "bg-indigo-500 ring-indigo-500/20";
    }
    return L.divIcon({
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-4 ${colorClass} transition-transform duration-150 hover:scale-115">
            <span class="text-xl">${emoji}</span>
          </div>
        </div>
      `,
      className: "custom-building-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  const centerCoords: [number, number] = patrolMode === "sim" && homeLatitude && homeLongitude 
    ? [homeLatitude, homeLongitude] 
    : playerPos.lat === 20.5937 && playerPos.lng === 78.9629 ? [20.5937, 78.9629] : [playerPos.lat, playerPos.lng];

  const mapZoom = patrolMode === "sim" ? 18 : (playerPos.lat === 20.5937 && playerPos.lng === 78.9629 ? 5 : zoom);

  return (
    <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-zinc-200 shadow-lg">
      <MapContainer
        center={centerCoords}
        zoom={mapZoom}
        zoomControl={false}
        dragging={patrolMode !== "sim"}
        scrollWheelZoom={patrolMode !== "sim"}
        doubleClickZoom={patrolMode !== "sim"}
        boxZoom={patrolMode !== "sim"}
        touchZoom={patrolMode !== "sim"}
        className="w-full h-full z-0"
      >
        <ZoomHandler zoom={mapZoom} />
        <ChangeMapView center={centerCoords} isAutoCentering={isAutoCentering} setIsAutoCentering={setIsAutoCentering} />
        {patrolMode === "sim" && <MapEvents onClick={handleMapClick} />}

        {mapTheme === "light" ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        )}

        {/* SIM Mode Rendering */}
        {patrolMode === "sim" && (
          <>
            {/* Player HQ Base Pin */}
            {homeLatitude && homeLongitude && (() => {
              const hqDetails = empireBuildings.find(b => b.id === "hq_details" || b.id === "scout_house_hq" || b.type === "scout_house") || {
                id: "hq_details",
                baseLevel: 1,
                solarGridLevel: 0,
                repairDepotLevel: 0,
                techLabLevel: 0,
                ecoCruiserLevel: 0,
                heroStatueLevel: 0
              };
              const selfIcon = getCompoundMarkerIcon(hqDetails, false);
              return (
                <Marker 
                  position={[homeLatitude, homeLongitude]} 
                  icon={selfIcon}
                  eventHandlers={{
                    click: () => {
                      if (onSelectBuilding) {
                        onSelectBuilding(hqDetails);
                      }
                    }
                  }}
                />
              );
            })()}

            {/* Public Sector Mode: Other Pinned Bases */}
            {simSectorMode === "public" && publicBases.filter(b => b.uid !== userId && b.homeLatitude && b.homeLongitude).map((b) => {
              const otherIcon = getCompoundMarkerIcon(b, true, b.username);
              return (
                <Marker
                  key={b.uid}
                  position={[b.homeLatitude, b.homeLongitude]}
                  icon={otherIcon}
                >
                  <Popup>
                    <div className="p-2 text-center text-zinc-950 font-sans leading-relaxed min-w-[140px]">
                      <h4 className="font-extrabold text-xs text-[#7f00ff]">👤 {b.username}'s Estate</h4>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Level {b.baseLevel} Base</div>
                      <div className="text-[10px] text-teal-600 font-extrabold mt-0.5">Valuation: {b.empireValuation} 🪙</div>
                      <div className="text-[8px] text-zinc-400 mt-1 border-t pt-1 font-semibold uppercase">{b.area}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}

        {/* Patrol Mode Rendering */}
        {patrolMode !== "sim" && (
          <>
            {/* Active Player Position Marker */}
            {!(playerPos.lat === 20.5937 && playerPos.lng === 78.9629) && (
              <Marker position={[playerPos.lat, playerPos.lng]} icon={playerIcon} />
            )}

            {/* Damage Cases Markers */}
            {cases.map((c) => {
              return (
                <Marker
                  key={c.id}
                  position={[c.latitude, c.longitude]}
                  icon={getLeafletMarkerIcon(c)}
                  eventHandlers={{
                    click: () => {
                      if (onSelectCase) {
                        onSelectCase(c);
                      }
                    }
                  }}
                />
              );
            })}
          </>
        )}
      </MapContainer>

      {/* Floating Recenter Map Button removed as it is now in GameView.tsx directly above the Scan button */}


    </div>
  );
}
