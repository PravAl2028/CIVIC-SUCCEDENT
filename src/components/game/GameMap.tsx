import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Case } from "../../lib/constants";

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

    if (isPopupOpen) return;

    if (isFirstLoad) {
      map.setView(center, map.getZoom(), { animate: false });
      setIsFirstLoad(false);
      return;
    }

    if (!isAutoCentering) return;

    const currentMapCenter = map.getCenter();
    const latDiff = Math.abs(center[0] - currentMapCenter.lat);
    const lngDiff = Math.abs(center[1] - currentMapCenter.lng);

    if (autoCenteringJustEnabled) {
      map.setView(center, 19, { animate: true });
    } else if (latDiff > 0.05 || lngDiff > 0.05) {
      map.setView(center, map.getZoom(), { animate: false });
    } else if (latDiff > 0.0005 || lngDiff > 0.0005) {
      map.panTo(center, { animate: true, duration: 0.6 });
    }
  }, [center, map, isFirstLoad, isPopupOpen, isAutoCentering]);

  return null;
}

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
  zoom?: number;
  onVerifyCase: (caseId: string, vote?: "yes" | "no" | "undo" | "proof") => void;
  onResolveCase: (caseId: string) => void;
  userId: string;
  setPlayerPos?: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  mapTheme?: "dark" | "light";
  patrolMode?: "patrol" | "issues";
  onSelectCase?: (c: Case) => void;
  isAutoCentering?: boolean;
  setIsAutoCentering?: (val: boolean) => void;
}

export default function GameMap({
  cases,
  playerPos,
  zoom = 17,
  onVerifyCase,
  onResolveCase,
  userId,
  setPlayerPos,
  mapTheme = "light",
  patrolMode = "patrol",
  onSelectCase,
  isAutoCentering: propIsAutoCentering,
  setIsAutoCentering: propSetIsAutoCentering
}: GameMapProps) {
  const [localIsAutoCentering, localSetIsAutoCentering] = useState(true);
  const isAutoCentering = propIsAutoCentering !== undefined ? propIsAutoCentering : localIsAutoCentering;
  const setIsAutoCentering = propSetIsAutoCentering !== undefined ? propSetIsAutoCentering : localSetIsAutoCentering;
  const [isLocating, setIsLocating] = useState(false);

  const isIssuesMode = patrolMode === "issues";
  const isPatrolMode = !isIssuesMode;

  const showPlayerMarker = isPatrolMode && !(playerPos.lat === 20.5937 && playerPos.lng === 78.9629);

  const centerCoords: [number, number] =
    playerPos.lat === 20.5937 && playerPos.lng === 78.9629
      ? [20.5937, 78.9629]
      : [playerPos.lat, playerPos.lng];

  const mapZoom =
    isIssuesMode ? 15 : (playerPos.lat === 20.5937 && playerPos.lng === 78.9629 ? 5 : zoom);

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

  const playerIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10">
        <div class="absolute w-44 h-44 bg-yellow-400/10 border-2 border-yellow-400/30 rounded-full animate-pulse pointer-events-none" style="min-width: 176px; min-height: 176px; transform: scale(1);"></div>
        <div class="relative w-10 h-10 rounded-full bg-zinc-900 border-2 border-yellow-400 flex items-center justify-center shadow-lg z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-yellow-400" style="transform: rotate(45deg); transition: transform 0.15s ease-out;">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      </div>
    `,
    className: "custom-player-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={centerCoords}
        zoom={mapZoom}
        zoomControl={false}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        touchZoom={true}
        className="w-full h-full z-0"
      >
        <ZoomHandler zoom={mapZoom} />
        {isPatrolMode && (
          <ChangeMapView
            center={centerCoords}
            isAutoCentering={isAutoCentering}
            setIsAutoCentering={setIsAutoCentering}
          />
        )}

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

        {showPlayerMarker && (
          <Marker position={[playerPos.lat, playerPos.lng]} icon={playerIcon} />
        )}

        {cases.map((c) => (
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
        ))}
      </MapContainer>
    </div>
  );
}
