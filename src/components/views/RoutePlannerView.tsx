import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { 
  Compass, MapPin, AlertTriangle, CheckCircle2, Droplets, Lightbulb, Trash2, 
  Navigation, Map, Settings, Check, Search, ArrowRight, ChevronRight, 
  ShieldAlert, Sparkles, Clock, ArrowLeftRight, AlertCircle, RefreshCw, Layers,
  Volume2, VolumeX, Play, Square, Trophy, Milestone, Zap, Smartphone, Gamepad2, Plus, Minus,
  X, Mic, CornerUpLeft, CornerUpRight, MoveUp, ShieldCheck, Camera
} from "lucide-react";
import { Case, DamageType } from "../../lib/constants";
import { haversineDistance } from "../../lib/geo";
import { computeFastestRoute, computeSafestRoute } from "../../lib/routing/bypassPlanner";
import { calculateSafetyScore, computeSafetyIndex } from "../../lib/routing/safetyScore";
import { getHazardRadius, getIntersectingHazards, checkHazardIntersections } from "../../lib/routing/hazardAnalyzer";
import * as turf from '@turf/turf';
import { createNavigationSession } from "../../lib/navigationEngine";

// Custom Map Interaction hook to capture map click points
function RouteMapEvents({ 
  clickMode, 
  onSetLocation 
}: { 
  clickMode: "start" | "end" | null; 
  onSetLocation: (latlng: L.LatLng, mode: "start" | "end") => void; 
}) {
  useMapEvents({
    click(e) {
      if (clickMode) {
        onSetLocation(e.latlng, clickMode);
      } else {
        onSetLocation(e.latlng, "end");
      }
    }
  });
  return null;
}

function MapReferenceTracker({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

// Center the map view programmatically
function SetMapBounds({ 
  start, 
  end,
  navActive,
  navCurrentPos
}: { 
  start: { lat: number; lng: number } | null; 
  end: { lat: number; lng: number } | null; 
  navActive: boolean;
  navCurrentPos: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    // Call invalidateSize multiple times to catch any layout/transition completion
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);
    const timer3 = setTimeout(() => map.invalidateSize(), 500);

    if (navActive && navCurrentPos) {
      map.setView(navCurrentPos, 17, { animate: true });
    } else if (start && end) {
      const bounds = L.latLngBounds([
        [start.lat, start.lng],
        [end.lat, end.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true, duration: 1 });
    } else if (start) {
      map.setView([start.lat, start.lng], 16, { animate: true });
    } else if (end) {
      map.setView([end.lat, end.lng], 16, { animate: true });
    }
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [start, end, navActive, navCurrentPos, map]);
  return null;
}

// Custom Map Zoom Controls Component
function MapZoomControls() {
  const map = useMap();
  return (
    <div className="absolute right-4 top-[55%] md:bottom-24 md:top-auto -translate-y-1/2 md:translate-y-0 z-[400] flex flex-col gap-2">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-10 h-10 md:w-10 md:h-10 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-[#006a65]/40 text-zinc-850 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer transition-all active:scale-95 group"
        title="Zoom In"
      >
        <Plus className="w-5 h-5 text-zinc-600 group-hover:text-[#006a65] group-hover:scale-110 transition-transform" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-10 h-10 md:w-10 md:h-10 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-[#006a65]/40 text-zinc-850 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer transition-all active:scale-95 group"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5 text-zinc-600 group-hover:text-[#006a65] group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
}

// Marker Icon Generators
const createTeardropIcon = (color: string) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <svg width="34" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="#ffffff" stroke-width="1.2" />
        </svg>
      </div>
    `,
    className: "custom-route-pin",
    iconSize: [34, 42],
    iconAnchor: [17, 42]
  });
};

const startIcon = createTeardropIcon("#10b981"); // Green for Start
const endIcon = createTeardropIcon("#ea4335"); // Google Red for Destination


interface RoutePlannerViewProps {
  cases: Case[];
  playerPos: { lat: number; lng: number };
  setPlayerPos?: (pos: { lat: number; lng: number }) => void;
  onTriggerScan?: () => void;
}

function RoutePlannerView({ cases, playerPos, setPlayerPos, onTriggerScan }: RoutePlannerViewProps) {
  // Inputs & Selections
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  
  const [startInput, setStartInput] = useState<string>("");
  const [endInput, setEndInput] = useState<string>("");
  const [originalStartPoint, setOriginalStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [originalStartInput, setOriginalStartInput] = useState<string>("");

  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean | null>(null);
  const [hasCheckedLocation, setHasCheckedLocation] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(0);
  
  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
  
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);

  const [clickMode, setClickMode] = useState<"start" | "end" | null>(null);
  const [isMapSelectionActive, setIsMapSelectionActive] = useState<boolean>(false);
  const [avoidanceEnabled, setAvoidanceEnabled] = useState<boolean>(true);
  const [mapTheme, setMapTheme] = useState<"dark" | "light">("light");
  const isDark = mapTheme === "dark";

  // Routing preferences (Fastest vs Shortest)
  const [routingPreference, setRoutingPreference] = useState<"fastest" | "safest">("fastest");

  // OSRM Real Road Route Storage
  const [roadRoute, setRoadRoute] = useState<Array<[number, number]>>([]);
  const [safeRoadRoute, setSafeRoadRoute] = useState<Array<[number, number]>>([]);
  const [roadRouteStats, setRoadRouteStats] = useState<{distance: number, duration: number} | null>(null);
  const [safeRoadRouteStats, setSafeRoadRouteStats] = useState<{distance: number, duration: number} | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [forceFetchToggle, setForceFetchToggle] = useState<number>(0);

  // Refs for request management and caching
  const debounceTimeoutStartRef = useRef<any>(null);
  const debounceTimeoutEndRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const routeCacheRef = useRef<Record<string, { roadRoute: Array<[number, number]>; safeRoadRoute: Array<[number, number]> }>>({});
  const lastFetchedParamsRef = useRef<{
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    avoidTypesStr: string;
    preference: string;
    toggle: number;
  } | null>(null);

  const mapRef = useRef<L.Map | null>(null);

  // Active Navigation Mode State
  const [isRiding, setIsRiding] = useState<boolean>(false);
  const [navIndex, setNavIndex] = useState<number>(0);
  const [navCurrentPos, setNavCurrentPos] = useState<[number, number] | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [rideXP, setRideXP] = useState<number>(0);
  const [rideSP, setRideSP] = useState<number>(0);
  const [rideCompleted, setRideCompleted] = useState<boolean>(false);

  // Preset destinations
  const getPresets = () => {
    const isTelangana = playerPos.lat >= 16.5 && playerPos.lat <= 18.5 && playerPos.lng >= 77.5 && playerPos.lng <= 79.5;
    if (isTelangana) {
      return [
        { name: "Tirumalagiri Playground", lat: 17.4745, lng: 78.5085 },
        { name: "Surya Temple Area", lat: 17.4821, lng: 78.5024 },
        { name: "St. Joseph's School Lane", lat: 17.4788, lng: 78.5062 },
        { name: "Football Ground", lat: 17.4868, lng: 78.5091 }
      ];
    } else {
      return [
        { name: "Koramangala Club", lat: 12.9362, lng: 77.6258 },
        { name: "Blue Tokai Coffee", lat: 12.9352, lng: 77.6245 },
        { name: "Maharaja Restaurant", lat: 12.9325, lng: 77.6225 },
        { name: "Post Office 3rd Block", lat: 12.9312, lng: 77.6210 }
      ];
    }
  };

  // Calculate direction of travel (bearing angle) in degrees
  const getBearing = (): number => {
    if (!navCurrentPos || currentPath.length === 0) return 0;
    
    const nextNode = currentPath[navIndex + 1] || currentPath[navIndex] || endPoint;
    if (!nextNode) return 0;
    
    const lat1 = navCurrentPos[0];
    const lng1 = navCurrentPos[1];
    let lat2: number;
    let lng2: number;

    if (Array.isArray(nextNode)) {
      lat2 = nextNode[0];
      lng2 = nextNode[1];
    } else {
      lat2 = nextNode.lat;
      lng2 = nextNode.lng;
    }
    
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const rLat1 = lat1 * Math.PI / 180;
    const rLat2 = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(rLat2);
    const x = Math.cos(rLat1) * Math.sin(rLat2) -
              Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng);
              
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  };

  // Real Reverse Geocoding using Geoapify Reverse Geocoding API for accurate nationwide location resolution in India
  const fetchReverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const apiKey = (import.meta as any).env.VITE_GEOAPIFY_API_KEY || "caecb90e637a43f49ca3f9829399eb2a";
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return data.features[0].properties.formatted || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
      }
    } catch (e) {
      console.warn("Geoapify reverse geocoding failed, using coordinates:", e);
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Sync starting location when GPS position initializes on startup
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    const checkAndInitLocation = () => {
      const isPlayerPosCustom = !(playerPos.lat === 20.5937 && playerPos.lng === 78.9629);

      if (isPlayerPosCustom) {
        console.log("Initializing safe maps starting point with active player position:", playerPos);
        setIsLocationEnabled(true);
        setHasCheckedLocation(true);
        setStartPoint({ lat: playerPos.lat, lng: playerPos.lng });
        
        fetchReverseGeocode(playerPos.lat, playerPos.lng).then(address => {
          const isVirtual = localStorage.getItem("patrol_grid_patrol_mode") === "virtual";
          setStartInput(address || (isVirtual ? "Simulated Start Location" : "My Current Location"));
        });
        
        setEndPoint(null);
        setEndInput("");
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("Startup Geolocation enabled successfully");
            setIsLocationEnabled(true);
            setHasCheckedLocation(true);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setStartPoint({ lat, lng });
            
            fetchReverseGeocode(lat, lng).then(address => {
              setStartInput(address || "My Current Location");
            });
            
            // Only fill start location! End location remains empty as per user instruction.
            setEndPoint(null);
            setEndInput("");
          },
          (err) => {
            console.warn("Startup Geolocation check denied or failed:", err);
            setIsLocationEnabled(false);
            setHasCheckedLocation(true);
            setStartPoint(null);
            setStartInput("");
            setEndPoint(null);
            setEndInput("");
          }
        );
      } else {
        console.warn("Geolocation not supported by this browser.");
        setIsLocationEnabled(false);
        setHasCheckedLocation(true);
        setStartPoint(null);
        setStartInput("");
        setEndPoint(null);
        setEndInput("");
      }
    };

    checkAndInitLocation();
    hasInitializedRef.current = true;
  }, [playerPos]);

  // Avoidance selections
  const [avoidTypes, setAvoidTypes] = useState<Record<DamageType, boolean>>({
    [DamageType.POTHOLE]: true,
    [DamageType.CRACK]: false,
    [DamageType.WATER_LEAK]: true,
    [DamageType.BROKEN_STREETLIGHT]: false,
    [DamageType.GARBAGE_DUMP]: false,
    [DamageType.WATERLOGGING]: true,
    [DamageType.BROKEN_INFRASTRUCTURE]: false,
    [DamageType.OTHER]: false,
  });

  const lastSpokenRef = useRef<string>("");

  // Speech Helper
  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    if (lastSpokenRef.current === text) return;
    lastSpokenRef.current = text;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Geocoding Search using Geoapify Geocoding Autocomplete API for nationwide accuracy in India
  const handleSearchAddress = async (query: string, type: "start" | "end") => {
    if (!query || query.length < 3) {
      if (type === "start") setStartSuggestions([]);
      else setEndSuggestions([]);
      return;
    }
    
    if (type === "start") {
      setIsSearchingStart(true);
    } else {
      setIsSearchingEnd(true);
    }

    try {
      const apiKey = (import.meta as any).env.VITE_GEOAPIFY_API_KEY || "caecb90e637a43f49ca3f9829399eb2a";
      
      // Query Geoapify with filter=countrycode:in to restrict search strictly to India
      // We also optionally apply a proximity bias near the playerPos if available, without restricting the nationwide scope
      let biasParam = "";
      if (playerPos && playerPos.lat && playerPos.lng) {
        biasParam = `&bias=proximity:${playerPos.lng},${playerPos.lat}`;
      }
      
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:in${biasParam}&limit=10&apiKey=${apiKey}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Geoapify responded with status: ${res.status}`);
      }
      
      const data = await res.json();
      
      const suggestions: any[] = [];
      if (data.features && Array.isArray(data.features)) {
        data.features.forEach((feature: any) => {
          const props = feature.properties;
          if (props && props.formatted && props.lat && props.lon) {
            suggestions.push({
              display_name: props.formatted,
              lat: props.lat,
              lon: props.lon
            });
          }
        });
      }

      if (type === "start") {
        setStartSuggestions(suggestions);
      } else {
        setEndSuggestions(suggestions);
      }
    } catch (e) {
      console.error("Geoapify geocoding failed:", e);
    } finally {
      setIsSearchingStart(false);
      setIsSearchingEnd(false);
    }
  };

  const handleSearchAddressDebounced = (query: string, type: "start" | "end") => {
    const ref = type === "start" ? debounceTimeoutStartRef : debounceTimeoutEndRef;
    if (ref.current) {
      clearTimeout(ref.current);
    }
    ref.current = setTimeout(() => {
      handleSearchAddress(query, type);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutStartRef.current) clearTimeout(debounceTimeoutStartRef.current);
      if (debounceTimeoutEndRef.current) clearTimeout(debounceTimeoutEndRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const selectSuggestion = (item: any, type: "start" | "end") => {
    const coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    if (type === "start") {
      setStartPoint(coords);
      setStartInput(item.display_name);
      setStartSuggestions([]);
    } else {
      setEndPoint(coords);
      setEndInput(item.display_name);
      setEndSuggestions([]);
    }
  };

  const handleSelectPreset = (preset: { name: string; lat: number; lng: number }) => {
    setEndPoint({ lat: preset.lat, lng: preset.lng });
    setEndInput(preset.name);
    setClickMode(null);
  };

  const handleSetLocation = async (latlng: L.LatLng, mode: "start" | "end") => {
    if (!latlng) {
      if (mode === "start") {
        setStartPoint(null);
        setStartInput("");
      } else {
        setEndPoint(null);
        setEndInput("");
      }
      setClickMode(null);
      setIsMapSelectionActive(false);
      return;
    }
    
    // Instantly exit selection mode and hide the fixed center pin overlay
    setClickMode(null);
    setIsMapSelectionActive(false);
    
    if (mode === "start") {
      setStartPoint({ lat: latlng.lat, lng: latlng.lng });
      setStartInput("Resolving address...");
      const address = await fetchReverseGeocode(latlng.lat, latlng.lng);
      setStartInput(address);
    } else {
      setEndPoint({ lat: latlng.lat, lng: latlng.lng });
      setEndInput("Resolving address...");
      const address = await fetchReverseGeocode(latlng.lat, latlng.lng);
      setEndInput(address);
    }
  };

  const toggleAvoidType = (type: DamageType) => {
    setAvoidTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const lastFetchTimeRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number>(0);

  // -------------------------------------------------------------
  // ROAD ROUTING ENGINE (PRODUCTION-READY DEBUNCED OSRM API WITH EXPO BACKOFF & CACHING)
  // -------------------------------------------------------------

  useEffect(() => {
    if (!startPoint || !endPoint) {
      setRoadRoute([]);
      setSafeRoadRoute([]);
      setRoutingError(null);
      return;
    }

    const currentParams = {
      startLat: startPoint.lat,
      startLng: startPoint.lng,
      endLat: endPoint.lat,
      endLng: endPoint.lng,
      avoidTypesStr: JSON.stringify(avoidTypes),
      preference: routingPreference,
      toggle: forceFetchToggle
    };

    // If coordinates or filter parameters haven't changed, skip network call
    if (
      lastFetchedParamsRef.current &&
      Math.abs(lastFetchedParamsRef.current.startLat - currentParams.startLat) < 0.00001 &&
      Math.abs(lastFetchedParamsRef.current.startLng - currentParams.startLng) < 0.00001 &&
      Math.abs(lastFetchedParamsRef.current.endLat - currentParams.endLat) < 0.00001 &&
      Math.abs(lastFetchedParamsRef.current.endLng - currentParams.endLng) < 0.00001 &&
      lastFetchedParamsRef.current.avoidTypesStr === currentParams.avoidTypesStr &&
      lastFetchedParamsRef.current.preference === currentParams.preference &&
      lastFetchedParamsRef.current.toggle === currentParams.toggle
    ) {
      return;
    }

    const fetchOSRMRoute = async () => {
      // Cooldown during navigation: max once per 20 seconds to respect API rate limits
      if (isRiding) {
        return;
      }
      
      const now = Date.now();
      lastFetchTimeRef.current = now;

      setLoadingRoute(true);
      setRoutingError(null);

      // Cache lookup
      const cacheKey = `${startPoint.lat.toFixed(5)},${startPoint.lng.toFixed(5)}|${endPoint.lat.toFixed(5)},${endPoint.lng.toFixed(5)}|${JSON.stringify(avoidTypes)}|${routingPreference}`;
      if (routeCacheRef.current[cacheKey]) {
        const cached = routeCacheRef.current[cacheKey];
        setRoadRoute(cached.roadRoute);
        setSafeRoadRoute(cached.safeRoadRoute);
        if (cached.roadRouteStats) setRoadRouteStats(cached.roadRouteStats);
        if (cached.safeRoadRouteStats) setSafeRoadRouteStats(cached.safeRoadRouteStats);
        setLoadingRoute(false);
        lastFetchedParamsRef.current = currentParams;
        return;
      }

      // Cancel previous pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const currentActiveHazards = cases.filter(c => 
          c.status !== "resolved" && avoidTypes[c.damageType]
        );

        // Compute Fastest Route
        const fastestPromise = computeFastestRoute(
          startPoint.lng, startPoint.lat,
          endPoint.lng, endPoint.lat,
          currentActiveHazards,
          signal
        );

        // Compute Safest Route
        const safestPromise = computeSafestRoute(
          startPoint.lng, startPoint.lat,
          endPoint.lng, endPoint.lat,
          currentActiveHazards,
          signal
        );

        const [fastestEvaluated, safestEvaluated] = await Promise.all([fastestPromise, safestPromise]);

        if (signal.aborted) return;

        if (fastestEvaluated && safestEvaluated) {
          const bestStandardCoords = fastestEvaluated.coords;
          const bestSafeCoords = safestEvaluated.coords;
          
          setRoadRouteStats({ distance: fastestEvaluated.distance, duration: fastestEvaluated.duration });
          setRoadRoute(bestStandardCoords);

          setSafeRoadRouteStats({ distance: safestEvaluated.distance, duration: safestEvaluated.duration });
          setSafeRoadRoute(bestSafeCoords);

          // Cache successfully loaded routes
          routeCacheRef.current[cacheKey] = {
            roadRoute: bestStandardCoords,
            safeRoadRoute: bestSafeCoords,
            roadRouteStats: { distance: fastestEvaluated.distance, duration: fastestEvaluated.duration },
            safeRoadRouteStats: { distance: safestEvaluated.distance, duration: safestEvaluated.duration }
          };

          lastFetchedParamsRef.current = currentParams;
        } else {
          setRoadRoute([]);
          setSafeRoadRoute([]);
          setRoutingError("Routing service temporarily unavailable. No valid path could be found between these coordinates.");
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          return;
        }
        console.error("OSRM routing offline/failed:", e);
        setRoadRoute([]);
        setSafeRoadRoute([]);
        setRoutingError("Routing service temporarily unavailable. Please verify your connection and try again.");
      } finally {
        setLoadingRoute(false);
      }
    };

    // Debounce the fetch by 400ms to group rapid drag/tap inputs
    const delayTimer = setTimeout(() => {
      fetchOSRMRoute();
    }, 400);

    return () => {
      clearTimeout(delayTimer);
    };
  }, [startPoint, endPoint, avoidTypes, routingPreference, forceFetchToggle]);

  const activeHazards = cases.filter(c => 
    c.status !== "resolved" && avoidTypes[c.damageType]
  );

  // Get active selected path
  const currentPath = (avoidanceEnabled && routingPreference === "safest" && activeHazards.length > 0) ? safeRoadRoute : roadRoute;

  // Intersected hazards by the chosen route
  const getEncounteredHazards = () => {
    if (currentPath.length < 2) return [];
    const line = turf.lineString(currentPath.map(coord => [coord[1], coord[0]]));
    return checkHazardIntersections(line, activeHazards);
  };

  const encounteredHazardsIntersections = getEncounteredHazards();
  const encounteredHazards = encounteredHazardsIntersections.map(h => h.hazard);

  // Intersected hazards by the fastest route (for comparison)
  const getOriginalHazards = () => {
    if (roadRoute.length < 2) return [];
    const line = turf.lineString(roadRoute.map(coord => [coord[1], coord[0]]));
    return checkHazardIntersections(line, activeHazards);
  };
  
  const originalHazardsIntersections = getOriginalHazards();
  const originalHazards = originalHazardsIntersections.map(h => h.hazard);

  // Route statistics
  const getStats = () => {
    if (currentPath.length < 2) return { distance: 0, time: 0, safetyIndex: 100 };
    
    let baseDist = 0;
    for (let i = 0; i < currentPath.length - 1; i++) {
      baseDist += haversineDistance(
        currentPath[i][0], currentPath[i][1],
        currentPath[i+1][0], currentPath[i+1][1]
      );
    }

    let safetyIndex = computeSafetyIndex(encounteredHazardsIntersections);
    
    // We already have duration and distance from OSRM
    let osrmStats = null;
    if (routingPreference === "safest" && avoidanceEnabled) {
      osrmStats = safeRoadRouteStats;
    } else {
      osrmStats = roadRouteStats;
    }
    
    const timeInMinutes = osrmStats ? Math.ceil(osrmStats.duration / 60) : Math.max(2, Math.ceil((baseDist / 1000) * 1.5));
    const dist = osrmStats ? osrmStats.distance : baseDist;

    return {
      distance: dist,
      time: timeInMinutes,
      safetyIndex
    };
  };

  const stats = getStats();

  // Keep navIndex synchronized with the closest path node when currentPath updates
  useEffect(() => {
    if (isRiding && navCurrentPos && currentPath.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < currentPath.length; i++) {
        const dist = haversineDistance(navCurrentPos[0], navCurrentPos[1], currentPath[i][0], currentPath[i][1]);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }
      setNavIndex(closestIdx);
    }
  }, [navCurrentPos, currentPath, isRiding]);

  useEffect(() => {
    if (navCurrentPos && setPlayerPos) {
      setPlayerPos({ lat: navCurrentPos[0], lng: navCurrentPos[1] });
    }
  }, [navCurrentPos, setPlayerPos]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const lastSpokenInstructionRef = useRef<string>("");
  useEffect(() => {
    if (isRiding) {
      const inst = getActiveTurnInstruction();
      if (inst && inst !== lastSpokenInstructionRef.current) {
        // Speak only when it's an action direction (Turn, Detour, Arrival)
        if (inst.includes("Turn") || inst.includes("detour") || inst.includes("Arriving") || inst.includes("destination")) {
          speakText(inst);
          lastSpokenInstructionRef.current = inst;
        }
      }
    } else {
      lastSpokenInstructionRef.current = "";
    }
  }, [navIndex, isRiding]);

  // -------------------------------------------------------------
  // ACTIVE RIDE SIMULATOR ENGINE (FOR SECURITY AND RIDER HUD)
  // -------------------------------------------------------------

  const watchIdRef = useRef<number | null>(null);

  // GPS watch tracking effect
  useEffect(() => {
    if (!isRiding || !endPoint) return;

    speakText("Live GPS tracking navigation activated. We will speak directions as you move physically.");

    const mappedHazards = activeHazards.map(h => ({
      lat: h.latitude,
      lng: h.longitude,
      type: h.damageType,
      radius: 15
    }));

    const initialRouteObject = currentPath.length >= 2 ? {
      line: turf.lineString(currentPath.map(coord => [coord[1], coord[0]])),
      distanceMeters: stats.distance,
      durationSeconds: stats.time * 60
    } : undefined;

    const session = createNavigationSession({ 
      destination: [endPoint.lng, endPoint.lat], 
      hazards: mappedHazards, 
      mode: routingPreference,
      initialRoute: initialRouteObject,
      onProgress: (prog: any) => {
        // Here we could update distance to route if needed
      },
      onRerouted: (newRoute: any) => {
        if (newRoute && newRoute.line) {
          speakText("Route recalculated.");
          const coords = newRoute.line.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          if (routingPreference === "safest") {
            setSafeRoadRoute(coords);
            setSafeRoadRouteStats({ distance: newRoute.distanceMeters, duration: newRoute.durationSeconds });
          } else {
            setRoadRoute(coords);
            setRoadRouteStats({ distance: newRoute.distanceMeters, duration: newRoute.durationSeconds });
          }
        }
      },
      onError: (err: any) => {
        console.error("Navigation Session Error:", err);
      }
    });

    let watchId: number | null = null;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          const { latitude, longitude, speed: gpsSpeed } = p.coords;
          console.log("Live GPS Navigation Update:", latitude, longitude);
          setNavCurrentPos([latitude, longitude]);
          if (gpsSpeed !== null && gpsSpeed !== undefined) {
            setSpeed(Math.round(gpsSpeed * 3.6)); // m/s to km/h
          }

          // Calculate distance to end destination
          const distToEnd = haversineDistance(latitude, longitude, endPoint.lat, endPoint.lng);
          if (distToEnd < 20) { // arrived within 20 meters!
            setIsRiding(false);
            setRideCompleted(true);
            const earnedPoints = 150 + encounteredHazards.length * 50;
            setRideXP(earnedPoints);
            setRideSP(earnedPoints);
            speakText("Congratulations! You have arrived at your destination safely. Safe rider bonus issued.");
          }

          // Proximity alerts for active hazards on the map
          activeHazards.forEach(h => {
            const dist = haversineDistance(latitude, longitude, h.latitude, h.longitude);
            if (dist < 80) {
              const typeLabel = h.damageType.replace("_", " ");
              // simple throttle missing here, but retaining original logic
              // speakText(`Warning! Approaching active municipal ${typeLabel} within eighty meters.`);
            }
          });

          session.onPositionUpdate({
            lat: latitude,
            lng: longitude,
            timestamp: p.timestamp,
          });
        },
        (err) => {
          console.error("GPS Watch Position Error:", err);
          speakText("GPS tracking signal lost. Please check your device location settings.");
        },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    } else {
      speakText("Geolocation tracking is not supported by your browser.");
    }

    return () => { 
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId); 
      }
    };
  }, [isRiding, endPoint]);

  const getScoutPointsReward = () => {
    // Count of avoided hazards
    const avoidedCount = encounteredHazards.length;
    // Count of damage types selected to avoid
    const selectedAvoidTypesCount = Object.values(avoidTypes).filter(Boolean).length;
    
    // Production-grade formula: Base 15 SP + 45 SP per avoided hazard + 8 SP per selected defense
    let points = 15 + (avoidedCount * 45) + (selectedAvoidTypesCount * 8);
    
    if (avoidedCount === 0) {
      points = 10 + (selectedAvoidTypesCount * 5);
    }
    
    // Clamp reward strictly between 5 SP and 200 SP as requested
    return Math.min(200, Math.max(5, Math.round(points)));
  };

  const handleStartRide = () => {
    if (!endPoint) {
      speakText("Please set a destination before starting navigation.");
      return;
    }
    
    // Save original start point
    setOriginalStartPoint(startPoint);
    setOriginalStartInput(startInput);

    setNavIndex(0);
    setRideCompleted(false);
    setRideXP(0);
    setRideSP(0);
    
    // Initialize navigation position at current start position
    setNavCurrentPos([playerPos.lat, playerPos.lng]);
    
    speakText("GPS Navigation mode started. Move in the real world to track your progress.");
    setIsRiding(true);
  };

  const handleStopRide = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsRiding(false);
    setNavCurrentPos(null);
    if (originalStartPoint) {
      setStartPoint(originalStartPoint);
      setStartInput(originalStartInput);
    }
    // Clear last fetched params reference and increment toggle to force a clean recalculation from the selected startPoint to endPoint
    lastFetchedParamsRef.current = null;
    setForceFetchToggle(prev => prev + 1);
    speakText("Navigation ride stopped.");
  };

  const handleClaimSPReward = () => {
    speakText(`Congratulations! You have claimed ${rideSP} Scout Points.`);
    setRideCompleted(false);
    setRideXP(0);
    setRideSP(0);
    
    if (originalStartPoint) {
      setStartPoint(originalStartPoint);
      setStartInput(originalStartInput);
    } else {
      setStartPoint(null);
      setStartInput("");
    }
    
    // Destination is always emptied out upon completion of the ride as requested
    setEndPoint(null);
    setEndInput("");
    setRoadRoute([]);
    setSafeRoadRoute([]);
    // Clear last fetched params reference to ensure fresh state
    lastFetchedParamsRef.current = null;
    setIsRiding(false);
    setNavCurrentPos(null);
    setNavIndex(0);
  };

  const getActiveTurnInstruction = () => {
    if (!isRiding || currentPath.length === 0) return "Proceed along route";
    if (navIndex === currentPath.length - 1) return "Arriving at destination point";

    // Scan ahead for detours
    const nextNode = currentPath[navIndex + 1];
    const originalNode = roadRoute[navIndex + 1];

    if (avoidanceEnabled && originalNode && (Math.abs(nextNode[0] - originalNode[0]) > 0.0001)) {
      return "Executing safe hazard detour maneuver";
    }

    // Determine heading angle changes to generate turns
    if (navIndex > 0) {
      const prev = currentPath[navIndex - 1];
      const curr = currentPath[navIndex];
      const next = currentPath[navIndex + 1];

      const angle1 = Math.atan2(curr[0] - prev[0], curr[1] - prev[1]);
      const angle2 = Math.atan2(next[0] - curr[0], next[1] - curr[1]);
      let diff = angle2 - angle1;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;

      if (diff > 0.25) return "Turn right onto municipal road";
      if (diff < -0.25) return "Turn left onto connector road";
    }

    return "Continue straight on local roadway";
  };

  const generateDirectionsSteps = () => {
    if (currentPath.length === 0 || !startPoint || !endPoint) return [];

    const steps = [];
    
    // Initial step
    steps.push({
      instruction: `Depart from starting location: ${startInput.split(",")[0] || "Origin"}`,
      type: "start",
      distance: "0 m"
    });

    // Detect turn maneuvers along path points
    let currentSegmentDist = 0;
    for (let i = 1; i < currentPath.length - 1; i++) {
      const prev = currentPath[i - 1];
      const curr = currentPath[i];
      const next = currentPath[i + 1];

      const segmentDist = haversineDistance(prev[0], prev[1], curr[0], curr[1]);
      currentSegmentDist += segmentDist;

      // Check if angle is a noticeable turn (over ~15 degrees)
      const angle1 = Math.atan2(curr[0] - prev[0], curr[1] - prev[1]);
      const angle2 = Math.atan2(next[0] - curr[0], next[1] - curr[1]);
      let diff = angle2 - angle1;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;

      // Scan if there's any active bypassed hazard near this turn
      const nearHazard = activeHazards.find(h => 
        haversineDistance(curr[0], curr[1], h.latitude, h.longitude) < 80
      );

      if (nearHazard && avoidanceEnabled) {
        steps.push({
          instruction: `Bypass detour active: Steer clear of ${nearHazard.damageType.replace("_", " ")} hazard`,
          type: "detour",
          distance: `${Math.round(currentSegmentDist)} m`
        });
        currentSegmentDist = 0;
      } else if (Math.abs(diff) > 0.3) {
        const turnDir = diff > 0 ? "right" : "left";
        steps.push({
          instruction: `Turn ${turnDir} onto the next connecting street`,
          type: "turn",
          distance: `${Math.round(currentSegmentDist)} m`
        });
        currentSegmentDist = 0;
      }
    }

    // Final arrival step
    steps.push({
      instruction: `Arrive at destination: ${endInput.split(",")[0] || "Destination point"}`,
      type: "end",
      distance: `${Math.round(haversineDistance(currentPath[currentPath.length - 2]?.[0] || startPoint.lat, currentPath[currentPath.length - 2]?.[1] || startPoint.lng, endPoint.lat, endPoint.lng))} m`
    });

    return steps;
  };

  const getManeuverIcon = () => {
    const instruction = getActiveTurnInstruction().toLowerCase();
    if (instruction.includes("left")) {
      return <CornerUpLeft className="w-8 h-8 text-white stroke-[2.5]" />;
    }
    if (instruction.includes("right")) {
      return <CornerUpRight className="w-8 h-8 text-white stroke-[2.5]" />;
    }
    if (instruction.includes("arrive") || instruction.includes("destination")) {
      return <MapPin className="w-8 h-8 text-yellow-400 stroke-[2.5]" />;
    }
    return <MoveUp className="w-8 h-8 text-white stroke-[2.5]" />;
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-screen w-full overflow-hidden bg-[#F5F0E8] font-sans relative custom-scrollbar pb-[72px] md:pb-0">
      
      {/* CONTROL & NAVIGATION DASHBOARD */}
      {!isRiding && (
        <div className="absolute inset-0 z-20 pointer-events-none md:pointer-events-auto md:relative md:flex md:w-[390px] md:bg-white md:border-r border-[#d2c5ae]/30 md:shadow-xl md:flex-col md:h-full md:overflow-y-auto md:custom-scrollbar">
        
        {/* Search Input Box with Real autocomplete */}
        <div className={`pointer-events-auto p-4 md:p-5 rounded-3xl md:rounded-none space-y-3.5 shadow-xl flex-shrink-0 absolute md:relative top-3 left-3 right-3 md:top-0 md:left-0 md:right-0 z-20 w-auto transition-all duration-300 border ${
          isDark 
            ? "bg-black/5 backdrop-blur-2xl text-white border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.25)]" 
            : "bg-white/10 backdrop-blur-xl text-zinc-900 border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className={`w-5 h-5 animate-pulse ${isDark ? "text-yellow-400" : "text-[#006a65]"}`} />
              <h2 className={`font-display text-xs font-black uppercase tracking-wider ${isDark ? "text-yellow-400" : "text-[#006a65]"}`}>
                Safe Navigation Maps
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Voice guidance */}
              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  speakText(voiceEnabled ? "" : "Voice guidance activated");
                }}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  voiceEnabled 
                    ? isDark 
                      ? "bg-yellow-400/10 border-yellow-400/40 text-yellow-400" 
                      : "bg-[#006a65]/10 border-[#006a65]/40 text-[#006a65]"
                    : isDark 
                      ? "bg-zinc-850 border-zinc-700 text-zinc-400" 
                      : "bg-zinc-100 border-zinc-200 text-zinc-500"
                }`}
                title="Toggle Voice Guidance"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button 
                onClick={() => setMapTheme(prev => prev === "dark" ? "light" : "dark")}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark 
                    ? "bg-zinc-850 border-zinc-700 text-zinc-300 hover:text-white" 
                    : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
                }`}
                title="Toggle Map style"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3.5 relative">
            {/* Start Location Input */}
            <div className="space-y-1 relative">
              <span className={`text-[9px] uppercase font-bold tracking-wider block ml-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Start Location</span>
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-all ${
                clickMode === "start" 
                  ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                  : isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-zinc-50/90 border-zinc-200 shadow-sm"
              }`}>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={clickMode === "start" ? "🟢 Tap on map to set start..." : "Type start location..."}
                  className={`bg-transparent text-xs font-bold focus:outline-none flex-1 truncate ${
                    isDark ? "text-white placeholder-zinc-500" : "text-zinc-800 placeholder-zinc-400"
                  }`}
                  value={startInput}
                  onChange={(e) => {
                    setStartInput(e.target.value);
                    handleSearchAddressDebounced(e.target.value, "start");
                  }}
                  onFocus={() => setClickMode(null)}
                />
                <button
                  onClick={() => {
                    setStartPoint({ lat: playerPos.lat, lng: playerPos.lng });
                    fetchReverseGeocode(playerPos.lat, playerPos.lng).then(address => {
                      const isVirtual = localStorage.getItem("patrol_grid_patrol_mode") === "virtual";
                      setStartInput(address || (isVirtual ? "Simulated Position" : "My Current Location"));
                    });
                  }}
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md transition-all mr-1 cursor-pointer ${
                    isDark ? "bg-zinc-800 text-yellow-400 hover:bg-zinc-750" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  }`}
                  title="Use Current Location"
                >
                  {localStorage.getItem("patrol_grid_patrol_mode") === "virtual" ? "SIM" : "GPS"}
                </button>
                {isSearchingStart ? (
                  <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                ) : (
                  <button 
                    onClick={() => {
                      const newMode = clickMode === "start" ? null : "start";
                      setClickMode(newMode);
                      setIsMapSelectionActive(false);
                    }}
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      clickMode === "start" 
                        ? "bg-emerald-500 text-white animate-pulse" 
                        : isDark ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-750" : "bg-zinc-200 text-zinc-650 hover:bg-zinc-300"
                    }`}
                  >
                    PIN
                  </button>
                )}
              </div>
              
              {/* Start Suggestions Dropdown */}
              {startSuggestions.length > 0 && (
                <div className={`absolute left-0 right-0 top-[56px] z-30 border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar ${
                  isDark ? "bg-zinc-900 border-zinc-850" : "bg-white border-zinc-250 shadow-lg text-zinc-800"
                }`}>
                  {startSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSuggestion(item, "start")}
                      className={`w-full text-left p-2.5 text-xs transition-colors flex items-start gap-2 border-b cursor-pointer ${
                        isDark 
                          ? "text-zinc-300 hover:bg-zinc-850 hover:text-white border-zinc-850" 
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border-zinc-100"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* End Destination Input */}
            <div className="space-y-1 relative">
              <span className={`text-[9px] uppercase font-bold tracking-wider block ml-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Destination</span>
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-all ${
                clickMode === "end" 
                  ? "border-red-500 ring-2 ring-red-500/20" 
                  : isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-zinc-50/90 border-zinc-200 shadow-sm"
              }`}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={clickMode === "end" ? "🔴 Tap on map to set destination..." : "Type destination..."}
                  className={`bg-transparent text-xs font-bold focus:outline-none flex-1 truncate ${
                    isDark ? "text-white placeholder-zinc-500" : "text-zinc-800 placeholder-zinc-400"
                  }`}
                  value={endInput}
                  onChange={(e) => {
                    setEndInput(e.target.value);
                    handleSearchAddressDebounced(e.target.value, "end");
                  }}
                  onFocus={() => setClickMode(null)}
                />
                {isSearchingEnd ? (
                  <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                ) : (
                  <button 
                    onClick={() => {
                      const newMode = clickMode === "end" ? null : "end";
                      setClickMode(newMode);
                      setIsMapSelectionActive(false);
                    }}
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      clickMode === "end" 
                        ? "bg-red-500 text-white animate-pulse" 
                        : isDark ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-750" : "bg-zinc-200 text-zinc-650 hover:bg-zinc-300"
                    }`}
                  >
                    PIN
                  </button>
                )}
              </div>

              {/* End Suggestions Dropdown */}
              {endSuggestions.length > 0 && (
                <div className={`absolute left-0 right-0 top-[56px] z-30 border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar ${
                  isDark ? "bg-zinc-900 border-zinc-850" : "bg-white border-zinc-250 shadow-lg text-zinc-800"
                }`}>
                  {endSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSuggestion(item, "end")}
                      className={`w-full text-left p-2.5 text-xs transition-colors flex items-start gap-2 border-b cursor-pointer ${
                        isDark 
                          ? "text-zinc-300 hover:bg-zinc-850 hover:text-white border-zinc-850" 
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border-zinc-100"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!clickMode && (
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={0.2}
            className="pointer-events-auto absolute md:relative bottom-[72px] md:bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-none md:flex-1 flex flex-col md:h-full w-full md:w-auto flex-shrink-0 touch-none md:touch-pan-x"
          >
              {/* Drag Handle purely visual on mobile to indicate it overlaps */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 w-full flex justify-center pt-3 pb-2 md:hidden flex-shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
              </div>
              
              {/* Inner Content scrollable */}
              <div className="overflow-y-auto custom-scrollbar flex-1 pb-4 md:pb-0 max-h-[60vh] md:max-h-none touch-none md:touch-auto">

              {/* Avoidance Checklist */}
            <div className="p-4 bg-zinc-50 border-b border-[#d2c5ae]/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">
                  🛡️ Avoidance Controls
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={avoidanceEnabled} 
                    onChange={() => setAvoidanceEnabled(!avoidanceEnabled)} 
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4.5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#006a65]"></div>
                  <span className="ml-2 text-[10px] font-bold text-zinc-650">Bypass Route</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.keys(avoidTypes).map((typeKey) => {
                  const type = typeKey as DamageType;
                  if (type === DamageType.OTHER || type === DamageType.CRACK || type === DamageType.BROKEN_INFRASTRUCTURE) return null;
                  
                  const isSelected = avoidTypes[type];
                  const label = type.replace("_", " ");
                  const activeCount = cases.filter(c => c.status !== "resolved" && c.damageType === type).length;

                  return (
                    <button
                      key={type}
                      onClick={() => toggleAvoidType(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border cursor-pointer ${
                        isSelected 
                          ? "bg-[#006a65] text-white border-transparent shadow-sm" 
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      {getDamageIcon(typeKey as DamageType)}
                      <span className="capitalize">{label}</span>
                      <span className={`text-[8px] px-1 rounded-md ${
                        isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-400"
                      }`}>
                        {activeCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ride Completed Success Reward Card */}
            {rideCompleted && (
              <div className="m-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2.5">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Trophy className="w-6 h-6 text-white animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950">Scratch Card Reward Issued!</h3>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    Please scratch and claim your Scout Points (SP) to continue.
                  </p>
                </div>
              </div>
            )}

            {/* Active Directions & Start Ride controls */}
            {startPoint && endPoint ? (
              <div className="p-4 flex-1 space-y-4">
                {loadingRoute ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#006a65] animate-spin" />
                    <p className="text-xs text-zinc-700 font-bold">Calculating optimal safe route...</p>
                    <p className="text-[10px] text-zinc-500">Querying real-road Indian OSRM network...</p>
                  </div>
                ) : routingError ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center space-y-3 shadow-sm">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-red-950 uppercase tracking-wider">Routing Unavailable</h4>
                      <p className="text-[11px] text-red-700 font-semibold mt-1">
                        {routingError}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRoutingError(null);
                        setRoadRoute([]);
                        setSafeRoadRoute([]);
                        setForceFetchToggle(prev => prev + 1);
                      }}
                      className="px-4 py-2 bg-[#006a65] hover:bg-[#00524e] text-white text-xs font-black rounded-xl shadow-md transition-colors uppercase inline-block cursor-pointer"
                    >
                      Retry Routing
                    </button>
                  </div>
                ) : currentPath.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
                    <p className="text-xs text-zinc-700 font-bold">No road-legal path found</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      We couldn't connect your starting location and destination. Try picking adjacent on-road nodes or manual points!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Stats Card */}
                    <div className="bg-[#fffbeb] border border-[#f0c040]/30 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f0c040]/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-[#775a00]" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-[#775a00] uppercase tracking-wider">
                            {(avoidanceEnabled && routingPreference === "safest" && originalHazards.length > 0) ? "Smart Bypass Path" : "Standard Route"}
                          </h4>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-black leading-none">{stats.time}</span>
                            <span className="text-[10px] font-bold text-zinc-500">mins</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Distance</span>
                        <span className="text-xs font-black text-zinc-700">
                          {(stats.distance / 1000).toFixed(2)} km
                        </span>
                      </div>

                      <div className="text-right border-l pl-3 border-zinc-200">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Safety Index</span>
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                          stats.safetyIndex >= 80 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                        }`}>
                          {stats.safetyIndex}%
                        </span>
                      </div>
                    </div>

                    {/* Road Detour info feedback */}
                    {routingPreference === "safest" && avoidanceEnabled && (
                      <>
                        {encounteredHazards.length > 0 ? (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">No completely safe route found.</p>
                              <p className="text-[10px] text-amber-600/90 mt-0.5">
                                The safest available route still passes near {encounteredHazards.length} hazard{encounteredHazards.length !== 1 ? 's' : ''}.
                              </p>
                            </div>
                          </div>
                        ) : originalHazards.length > 0 ? (
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Avoided {originalHazards.length} Hazard Zone{originalHazards.length !== 1 ? 's' : ''}</p>
                              <p className="text-[10px] text-emerald-600/90 mt-0.5">
                                Road-legal dynamic routing bypassed high-risk potholes and street damages!
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* ROUTING PREFERENCE SELECTOR */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block">
                        Routing Preference
                      </span>
                      <div className="bg-zinc-100 border border-zinc-200 p-1 rounded-2xl flex gap-1">
                        <button
                          type="button"
                          onClick={() => setRoutingPreference("fastest")}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            routingPreference === "fastest" 
                              ? "bg-[#006a65] text-white shadow-sm" 
                              : "text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Fastest Route
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoutingPreference("safest")}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            routingPreference === "safest" 
                              ? "bg-[#006a65] text-white shadow-sm" 
                              : "text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Safest Route
                        </button>
                      </div>
                    </div>

                    {/* START RIDE FOR ON-ROAD GUIDANCE */}
                    <div className="space-y-2">
                      <button
                        onClick={handleStartRide}
                        className="w-full bg-[#f0c040] hover:bg-[#e0b030] text-[#251a00] font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-[#775a00]/10 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current text-[#251a00]" />
                        START NAVIGATING
                      </button>
                      <p className="text-[10px] text-center text-zinc-400 font-medium">Navigation will start from your current GPS location only.</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                  <Search className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-bold text-xs text-zinc-700">No active route selected</p>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Set a route by choosing start and destination points. Type in address fields to search, or tap on the map to pinpoint locations manually!
                  </p>
                </div>
              </div>
            )}
            </div>
        </motion.div>
        )}
      </div>
    )}

      {/* FULL WIDTH ROAD-LEGAL INTERACTIVE MAP */}
      <div className={`absolute inset-0 z-0 md:relative md:order-none ${isRiding ? "md:h-full md:flex-1" : "md:flex-1 w-full md:w-auto border-zinc-200"}`}>
        
        {/* Map selection hint banner */}
        {clickMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-950/95 border border-zinc-800 backdrop-blur-md px-4 py-2.5 rounded-full text-white text-[11px] font-bold flex items-center gap-2 shadow-2xl whitespace-nowrap animate-bounce">
            <span className="w-2 h-2 rounded-full bg-[#ea4335] animate-ping" />
            <span>Tapping map or clicking "Drop Pin" will set location</span>
          </div>
        )}

        {/* Fixed Center Pin for Selection Mode */}
        {clickMode && (
          <div 
            className="absolute top-1/2 left-1/2 z-[1000] pointer-events-none flex flex-col items-center"
            style={{ transform: "translate(-50%, -100%)" }}
          >
            <svg width="38" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.35))" }}>
              <path 
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                fill={clickMode === "start" ? "#10b981" : "#ea4335"} 
                stroke="#ffffff" 
                strokeWidth="1.2" 
              />
            </svg>
            {/* Small shadow dot under the pin tip */}
            <div className="w-2 h-1 bg-black/40 rounded-full blur-[1px] mt-0.5" />
          </div>
        )}

        {/* Independent Floating Selection Mode Action Bar */}
        {clickMode && (
          <div className="absolute bottom-[88px] left-4 right-4 md:left-4 md:right-auto md:w-[358px] z-[1000] bg-zinc-950/95 border border-zinc-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl backdrop-blur-md pointer-events-auto transition-all duration-300">
            <div className="flex flex-col min-w-0 flex-1 mr-3">
              <span className="text-[8px] uppercase font-black text-zinc-400 tracking-wider">
                Pin Selection Mode
              </span>
              <span className="text-xs font-bold truncate mt-0.5 flex items-center gap-1.5">
                {clickMode === "start" ? "📍 Selecting Start Location" : "🚩 Selecting Destination"}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (mapRef.current) {
                    const center = mapRef.current.getCenter();
                    handleSetLocation(center, clickMode);
                  }
                }}
                className="bg-[#ea4335] hover:bg-[#d93025] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Drop Pin
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setClickMode(null);
                  setIsMapSelectionActive(false);
                }}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-750 flex items-center justify-center text-zinc-300 transition-colors cursor-pointer border border-zinc-750"
                title="Cancel Selection"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Location access prompt */}
        {isLocationEnabled === false && !startPoint && !endPoint && !clickMode && !isRiding && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md text-center max-w-[280px] w-full">
            <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Location Access Required</h3>
            <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">
              We couldn't automatically track your location. Please grant location access in your browser or manually set a starting point on the map.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                   if (navigator.geolocation) {
                     navigator.geolocation.getCurrentPosition(
                       (position) => {
                         setIsLocationEnabled(true);
                         const lat = position.coords.latitude;
                         const lng = position.coords.longitude;
                         setStartPoint({ lat, lng });
                         fetchReverseGeocode(lat, lng).then(address => {
                           setStartInput(address || "My Current Location");
                         });
                       },
                       () => {}
                     );
                   }
                }}
                className="w-full bg-[#006a65] hover:bg-teal-600 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
              >
                Retry GPS Access
              </button>
            </div>
          </div>
        )}

        <MapContainer
          center={isLocationEnabled === false || (playerPos.lat === 20.5937 && playerPos.lng === 78.9629) ? [20.5937, 78.9629] : [playerPos.lat, playerPos.lng]}
          zoom={isLocationEnabled === false || (playerPos.lat === 20.5937 && playerPos.lng === 78.9629) ? 5 : 16}
          zoomControl={false}
          className="w-full h-full"
        >
          <SetMapBounds 
            start={startPoint} 
            end={endPoint} 
            navActive={isRiding} 
            navCurrentPos={navCurrentPos} 
          />
          
          <MapReferenceTracker mapRef={mapRef} />
          
          <RouteMapEvents clickMode={clickMode} onSetLocation={handleSetLocation} />

          {mapTheme === "dark" ? (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          )}

          {/* Active Potholes & Hazards */}
          {activeHazards.map((c) => {
            const isAvoided = avoidTypes[c.damageType];
            const color = c.damageType === DamageType.POTHOLE ? "#f59e0b" : c.damageType === DamageType.WATERLOGGING ? "#06b6d4" : "#ec4899";
            
            return (
              <React.Fragment key={c.id}>
                {isAvoided && (
                  <Circle
                    center={[c.latitude, c.longitude]}
                    radius={getHazardRadius(c.damageType)}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.14,
                      weight: 1.5,
                      dashArray: "4 4"
                    }}
                  />
                )}
                
                <Marker 
                  position={[c.latitude, c.longitude]}
                  icon={L.divIcon({
                    html: `
                      <div class="relative flex items-center justify-center w-6 h-6">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[9px] shadow-lg border border-white" style="background-color: ${color};">
                          ⚠️
                        </div>
                      </div>
                    `,
                    className: "custom-hazard-pin",
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                >
                  <Popup>
                    <div className="font-sans text-xs p-1 space-y-1 w-48">
                      {c.imageUrl && (
                        <div className="w-full h-24 mb-2 rounded overflow-hidden">
                          <img src={c.imageUrl} alt={c.damageType} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="capitalize">{c.damageType.replace("_", " ")}</span>
                        <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800">
                          Severity: {c.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium">{c.description}</p>
                      <p className="text-[9px] text-zinc-400 font-mono mt-1">{c.address}</p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Start Point */}
          {startPoint && (
            <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
              <Popup>
                <div className="text-xs font-sans font-bold">Start Origin (A)</div>
              </Popup>
            </Marker>
          )}

          {/* Destination Point */}
          {endPoint && (
            <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
              <Popup>
                <div className="text-xs font-sans font-bold">End Destination (B)</div>
              </Popup>
            </Marker>
          )}

          {/* UNAVOIDED PATH POLYLINE */}
          {startPoint && endPoint && originalHazards.length > 0 && routingPreference === "safest" && roadRoute.length > 0 && (
            <Polyline
              positions={isRiding ? roadRoute.slice(navIndex) : roadRoute}
              pathOptions={{
                color: "#ef4444",
                weight: 3.5,
                opacity: 0.45,
                dashArray: "6, 10"
              }}
            />
          )}

          {/* ROAD-LEGAL ROUTED POLYLINE */}
          {startPoint && endPoint && currentPath.length > 0 && (
            <Polyline
              positions={isRiding ? currentPath.slice(navIndex) : currentPath}
              pathOptions={{
                color: routingPreference === "safest" ? "#10b981" : "#3b82f6",
                weight: 5.5,
                opacity: 0.9
              }}
            />
          )}

          {/* Active simulated ride position marker */}
          {isRiding && navCurrentPos && (
            <Marker
              position={navCurrentPos}
              icon={L.divIcon({
                html: `
                  <div class="relative flex items-center justify-center w-10 h-10">
                    <div class="absolute w-10 h-10 bg-[#006a65]/20 rounded-full animate-ping pointer-events-none"></div>
                    <div class="w-8 h-8 rounded-full bg-[#006a65] border-2 border-white shadow-2xl flex items-center justify-center z-10" style="transform: rotate(${getBearing()}deg); transition: transform 0.3s ease-out;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
                        <polygon points="12,2 22,22 12,17 2,22" />
                      </svg>
                    </div>
                  </div>
                `,
                className: "custom-nav-arrow",
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              })}
            >
              <Popup>
                <div className="text-xs font-sans font-bold">My Live Navigation</div>
              </Popup>
            </Marker>
          )}

          {/* Pulsing blue dot for player location */}
          {!isRiding && !(playerPos.lat === 20.5937 && playerPos.lng === 78.9629) && (
            <Marker
              position={[playerPos.lat, playerPos.lng]}
              icon={L.divIcon({
                html: `
                  <div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute w-8 h-8 bg-blue-400/30 rounded-full animate-ping pointer-events-none"></div>
                    <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xl z-10"></div>
                  </div>
                `,
                className: "custom-player-pulse",
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup>
                <div className="text-xs font-sans font-bold">Current Scout Position</div>
              </Popup>
            </Marker>
          )}

          {/* Custom Map Zoom Buttons */}
          <MapZoomControls />

        </MapContainer>

        {/* Dynamic Interactive Navigation Overlays (Google Maps Immersive HUD style) */}
        {isRiding && (
          <>
            {/* 1. TOP GREEN-TEAL HEADER DIRECTIONS HUD */}
            <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md lg:max-w-lg z-[1000] bg-[#005e55] text-white shadow-2xl rounded-3xl p-4 flex items-center gap-4 border border-[#004d46] transition-all animate-in slide-in-from-top duration-300">
              <div className="w-12 h-12 rounded-full bg-[#004d41] flex items-center justify-center flex-shrink-0 shadow-inner">
                {getManeuverIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-teal-200 tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live GPS Route Guidance
                </span>
                <p className="text-sm font-black tracking-tight leading-snug truncate mt-0.5">
                  {getActiveTurnInstruction()}
                </p>
                <p className="text-[10px] text-teal-100 font-medium truncate mt-0.5">
                  towards {endInput.split(",")[0] || "Destination"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEnabled(!voiceEnabled);
                    speakText(voiceEnabled ? "" : "Voice guidance activated");
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    voiceEnabled ? "bg-white/20 text-white" : "bg-black/20 text-zinc-400"
                  }`}
                  title={voiceEnabled ? "Mute Voice" : "Unmute Voice"}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. FLOATING SPEEDOMETER (BOTTOM LEFT OVERLAY) */}
            <div className="absolute bottom-[164px] left-4 z-[1000] flex flex-col gap-1.5 items-center">
              <div className="w-16 h-16 bg-white/95 backdrop-blur border border-zinc-200 shadow-2xl rounded-full flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105">
                <span className="text-xl font-black text-zinc-800 leading-none">{speed}</span>
                <span className="text-[8px] font-bold text-zinc-400 tracking-widest uppercase mt-0.5">km/h</span>
              </div>
              <span className="text-[9px] font-black text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                SPEED
              </span>
            </div>

            {/* 4. RIGHT SIDE ACTION OVERLAYS (VERTICAL PANEL) */}
            <div className="absolute right-4 top-28 z-[1000] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (onTriggerScan) {
                    onTriggerScan();
                  }
                }}
                className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-350 active:scale-95 text-black border border-zinc-900 shadow-lg flex items-center justify-center transition-all hover:scale-105 cursor-pointer relative"
                title="Report Road Hazard"
              >
                <Camera className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
              </button>
            </div>

            {/* 5. BOTTOM NAVIGATION TRAVEL STATUS CARD */}
            <div className="absolute bottom-[80px] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md lg:max-w-lg z-[1000] bg-white text-zinc-900 shadow-2xl rounded-3xl p-4 flex items-center justify-between border border-zinc-100 transition-all animate-in slide-in-from-bottom duration-300">
              <button
                type="button"
                onClick={handleStopRide}
                className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center text-white transition-all shadow-md cursor-pointer border border-red-500"
                title="Stop Navigation"
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="text-center">
                <div className="text-2xl font-black text-rose-600 tracking-tight leading-none animate-pulse">
                  {Math.max(1, Math.round(stats.time * (1 - (navIndex / Math.max(1, currentPath.length)))))} min
                </div>
                <div className="text-xs font-semibold text-zinc-500 mt-1.5 flex items-center justify-center gap-1.5">
                  <span>{((stats.distance * (1 - (navIndex / Math.max(1, currentPath.length)))) / 1000).toFixed(1)} km</span>
                  <span className="text-zinc-300">•</span>
                  <span>ETA {(() => {
                    const minsRemaining = Math.max(1, Math.round(stats.time * (1 - (navIndex / Math.max(1, currentPath.length)))));
                    const etaTime = new Date();
                    etaTime.setMinutes(etaTime.getMinutes() + minsRemaining);
                    return etaTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
                  })()}</span>
                </div>
              </div>

              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Navigation className="w-5 h-5 animate-bounce" />
              </div>
            </div>
          </>
        )}

      </div>

      {rideCompleted && (
        <SafeRideScratchCard 
          spEarned={rideSP} 
          onClaim={handleClaimSPReward} 
        />
      )}
    </div>
  );
}

// Helper to render icons for each damage type
const getDamageIcon = (type: DamageType) => {
  switch (type) {
    case DamageType.POTHOLE:
    case DamageType.CRACK:
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case DamageType.WATER_LEAK:
    case DamageType.WATERLOGGING:
      return <Droplets className="w-4 h-4 text-teal-500" />;
    case DamageType.BROKEN_STREETLIGHT:
      return <Lightbulb className="w-4 h-4 text-orange-500" />;
    case DamageType.GARBAGE_DUMP:
      return <Trash2 className="w-4 h-4 text-zinc-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-red-500" />;
  }
};

class RoutePlannerErrorBoundary extends React.Component<any, any> {
  state: { hasError: boolean; error: any } = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("RoutePlanner ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4 bg-[#F5F0E8] font-sans w-full h-full">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-md">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-base font-black text-red-950 uppercase tracking-wider">Something went wrong</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              The route planner encountered an unexpected visual rendering or state calculation error.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-red-700 bg-red-50 p-3 rounded-lg overflow-x-auto text-left font-mono max-w-full">
                {String(this.state.error.message || this.state.error)}
              </pre>
            )}
          </div>
          <button
            onClick={() => (this as any).setState({ hasError: false, error: null })}
            className="px-5 py-2.5 bg-[#006a65] hover:bg-[#00524e] text-white text-xs font-black rounded-xl shadow-md transition-all uppercase cursor-pointer"
          >
            Reload Route Planner
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function RoutePlannerErrorBoundaryWrapper(props: RoutePlannerViewProps) {
  return (
    <RoutePlannerErrorBoundary>
      <RoutePlannerView {...props} />
    </RoutePlannerErrorBoundary>
  );
}

interface SafeRideScratchCardProps {
  spEarned: number;
  onClaim: () => void;
}

function SafeRideScratchCard({ spEarned, onClaim }: SafeRideScratchCardProps) {
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

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw background coating
    ctx.clearRect(0, 0, width, height);
    
    // Create high-tech metallic silver gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#cbd5e1");
    gradient.addColorStop(0.3, "#f1f5f9");
    gradient.addColorStop(0.7, "#94a3b8");
    gradient.addColorStop(1, "#64748b");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw some stylized holographic/shimmer patterns
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, 0);
      ctx.lineTo(Math.random() * width, height);
      ctx.stroke();
    }

    // Border pattern
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // Stamp pattern
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 13px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("MUNICIPAL REWARD", width / 2, height / 2 - 25);
    
    ctx.fillStyle = "#006a65";
    ctx.font = "900 16px 'Space Grotesk', sans-serif";
    ctx.fillText("★ SCRATCH TO REVEAL ★", width / 2, height / 2);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 11px 'Inter', sans-serif";
    ctx.fillText("USE CURSOR OR FINGER", width / 2, height / 2 + 25);
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
    ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2);
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

    // Fast-sample pixel alpha channel to determine scratch percentage
    for (let i = 3; i < pixels.length; i += 4 * 16) {
      if (pixels[i] === 0) {
        transparent++;
      }
    }

    const totalSampled = pixels.length / (4 * 16);
    const percent = Math.floor((transparent / totalSampled) * 100);
    setScratchPercent(percent);

    if (percent > 40) {
      setScratched(true);
      // Erase fully
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(0, 0, width, height);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center border border-zinc-100 text-center relative overflow-hidden font-sans">
        
        {/* Confetti/Sparkles background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#006a65]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Heading */}
        <div className="mb-5">
          <div className="w-12 h-12 rounded-full bg-yellow-100/80 flex items-center justify-center text-yellow-600 mx-auto mb-3 animate-pulse">
            <Trophy className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase font-black text-[#006a65] tracking-widest bg-[#006a65]/10 px-3 py-1 rounded-full">
            Active Scout Bonus
          </span>
          <h3 className="text-xl font-black text-zinc-900 mt-2.5">
            Safe Ride Completed!
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Scratch below to claim your safe-travel reward.
          </p>
        </div>

        {/* Scratchable Stage */}
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-inner border-2 border-zinc-100 bg-[#FAF7F2] flex flex-col justify-between p-5 items-center">
          
          {/* Underlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-5 items-center text-center">
            <div className="flex flex-col items-center justify-center flex-1 space-y-3">
              <div className="w-16 h-16 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                <Sparkles className="w-9 h-9" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">REVEALED REWARD</p>
                <div className="text-[34px] font-black text-emerald-600 tracking-tight leading-none mt-1">
                  +{spEarned} SP
                </div>
                <p className="text-[10px] font-semibold text-zinc-500 mt-1">Scout Points / Safety Points</p>
              </div>
            </div>

            <button
              onClick={onClaim}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                scratched 
                  ? "bg-[#006a65] text-white hover:bg-[#00524e] active:scale-98" 
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
              disabled={!scratched}
            >
              <Check className="w-4 h-4" />
              Claim Scout Points
            </button>
          </div>

          {/* Canvas Overlay Coating */}
          <canvas
            ref={canvasRef}
            width={256}
            height={256}
            onMouseDown={startScratching}
            onMouseMove={scratch}
            onMouseUp={stopScratching}
            onMouseLeave={stopScratching}
            onTouchStart={startScratching}
            onTouchMove={scratch}
            onTouchEnd={stopScratching}
            className={`absolute top-0 left-0 cursor-crosshair transition-opacity duration-300 z-10 ${
              scratched ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          />
        </div>

        {/* Status indicator */}
        <div className="mt-4 w-full text-xs">
          {!scratched ? (
            <div className="flex justify-between items-center text-zinc-400 font-medium px-1">
              <span>Scratched area:</span>
              <span className="font-mono">{scratchPercent}%</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-black tracking-wider uppercase animate-pulse">
              <Check className="w-4 h-4" />
              Reward Unlocked!
            </div>
          )}
        </div>

        {/* Fallback option */}
        {!scratched && (
          <button
            type="button"
            onClick={() => {
              setScratched(true);
              setScratchPercent(100);
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.globalCompositeOperation = "destination-out";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
              }
            }}
            className="mt-3 text-[10px] text-zinc-400 hover:text-[#006a65] underline font-medium cursor-pointer animate-pulse"
          >
            Can't scratch? Click to auto-reveal
          </button>
        )}
      </div>
    </div>
  );
}
