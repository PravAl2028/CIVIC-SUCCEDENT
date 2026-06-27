import React, { useState, useEffect } from "react";
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

// Custom component to handle map centering programmatically without constant jitter
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useMapEvents({
    popupopen() {
      setIsPopupOpen(true);
    },
    popupclose() {
      setIsPopupOpen(false);
    }
  });

  useEffect(() => {
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

    const currentMapCenter = map.getCenter();
    const latDiff = Math.abs(center[0] - currentMapCenter.lat);
    const lngDiff = Math.abs(center[1] - currentMapCenter.lng);

    if (latDiff > 0.05 || lngDiff > 0.05) {
      // Huge jump (e.g., recentering to a new city): jump immediately without animation
      map.setView(center, map.getZoom(), { animate: false });
    } else if (latDiff > 0.0005 || lngDiff > 0.0005) {
      // Medium movement (beyond ~50m threshold): pan smoothly to catch up
      map.panTo(center, { animate: true, duration: 0.6 });
    }
  }, [center, map, isFirstLoad, isPopupOpen]);

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
  onSelectCase
}: GameMapProps) {
  const [placedMarker, setPlacedMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleMapClick = (latlng: L.LatLng) => {
    if (patrolMode === "sim" && placingBuildingType && onMapClickForPlacement && homeLatitude && homeLongitude) {
      const dist = haversineDistance(latlng.lat, latlng.lng, homeLatitude, homeLongitude);
      if (dist > 150) {
        alert(`Too far! Placements must be within 150 meters of your Home Base HQ. Selected point is ${Math.round(dist)}m away.`);
      } else {
        onMapClickForPlacement(latlng.lat, latlng.lng);
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
        <ChangeMapView center={centerCoords} />
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
            {/* HQ Base Pin */}
            {homeLatitude && homeLongitude && (
              <Marker position={[homeLatitude, homeLongitude]} icon={hqBaseIcon}>
                <Popup>
                  <div className="p-2 text-center text-zinc-950 font-sans">
                    <h4 className="font-bold text-sm">👑 Civic Headquarters</h4>
                    <p className="text-[10px] text-zinc-500">Your permanent central operations node.</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Empire Buildings */}
            {empireBuildings.map((b) => (
              <Marker
                key={b.id}
                position={[b.latitude, b.longitude]}
                icon={getBuildingIcon(b.type, b.level)}
                eventHandlers={{
                  click: () => {
                    if (onSelectBuilding) {
                      onSelectBuilding(b);
                    }
                  }
                }}
              />
            ))}
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

      {/* Floating Map HUD Control Elements */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className="bg-zinc-900/90 hover:bg-zinc-800 text-yellow-400 p-3 rounded-full border border-zinc-800 shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Track Live GPS Location"
        >
          <Locate className={`w-5 h-5 ${isLocating ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>


    </div>
  );
}
