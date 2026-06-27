import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Shield, MapPin, Locate, Sparkles } from "lucide-react";

interface HomePinningModalProps {
  onPin: (lat: number, lng: number) => void;
  initialPos: { lat: number; lng: number };
}

// Map Event Component to capture and place pin on click
function PinMapEvents({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

// Simple helper to pan the map
function PanMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 17);
  }, [center, map]);
  return null;
}

export default function HomePinningModal({ onPin, initialPos }: HomePinningModalProps) {
  const [pinPos, setPinPos] = useState<{ lat: number; lng: number }>(initialPos);
  const [isLocating, setIsLocating] = useState(false);

  // Set default marker icon for the HQ Pin
  const hqIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 bg-yellow-500/20 border border-yellow-400 rounded-full animate-ping pointer-events-none"></div>
        <div class="w-10 h-10 rounded-full bg-zinc-950 border-2 border-yellow-400 flex items-center justify-center shadow-lg z-10">
          <span class="text-xl">🏰</span>
        </div>
      </div>
    `,
    className: "hq-pin-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPinPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col h-[90vh] md:h-[80vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-gradient-to-r from-yellow-500/10 to-transparent flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-400/30 rounded-xl flex items-center justify-center text-yellow-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-black text-white uppercase tracking-wider">Establish Your Headquarters</h3>
            <p className="text-[10px] text-zinc-400 font-medium">Select a central location for your Civic Empire building zone.</p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-zinc-950">
          <MapContainer
            center={[pinPos.lat, pinPos.lng]}
            zoom={16}
            zoomControl={false}
            className="w-full h-full"
          >
            <PanMap center={[pinPos.lat, pinPos.lng]} />
            <PinMapEvents onMapClick={(latlng) => setPinPos({ lat: latlng.lat, lng: latlng.lng })} />
            
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            <Marker position={[pinPos.lat, pinPos.lng]} icon={hqIcon} />
          </MapContainer>

          {/* Quick instructions floating */}
          <div className="absolute top-3 left-3 right-3 bg-zinc-950/90 border border-zinc-800 p-2 rounded-xl backdrop-blur-md pointer-events-none text-center text-[10px] text-zinc-300 font-bold">
            📍 Click anywhere on the map or use the GPS button to position your HQ.
          </div>

          {/* GPS Quick Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="absolute bottom-4 right-4 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 p-3 rounded-full border border-zinc-800 shadow-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 z-[400]"
          >
            <Locate className={`w-5 h-5 ${isLocating ? "animate-spin text-teal-400" : ""}`} />
          </button>
        </div>

        {/* Action Controls Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-col gap-3">
          <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-3 flex justify-between items-center text-[10px]">
            <div className="font-mono text-zinc-400">
              <span className="block font-black text-yellow-400 uppercase tracking-widest text-[8px] mb-0.5">HEADQUARTERS COORDS</span>
              LAT: {pinPos.lat.toFixed(6)} | LNG: {pinPos.lng.toFixed(6)}
            </div>
            <div className="text-right text-teal-400 font-bold">
              <span className="block text-[8px] text-zinc-400 uppercase tracking-widest mb-0.5">STARTER REWARDS</span>
              +200 Coins & Scout House
            </div>
          </div>

          <button
            onClick={() => onPin(pinPos.lat, pinPos.lng)}
            className="w-full bg-yellow-400 hover:bg-yellow-350 text-black py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            Pin Headquarters & Start Building
          </button>
        </div>

      </div>
    </div>
  );
}
