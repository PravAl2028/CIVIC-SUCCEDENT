export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function simulateReverseGeocode(lat: number, lng: number): { address: string; landmark: string } {
  // Check if we are in Telangana/Hyderabad/Secunderabad area (approx 17.x lat, 78.x lng)
  const isTelangana = lat >= 16.5 && lat <= 18.5 && lng >= 77.5 && lng <= 79.5;
  
  if (isTelangana) {
    if (lat > 17.485 && lng > 78.505) {
      return {
        address: "Tirumalagiri Road, Secunderabad, Telangana",
        landmark: "Near Tirumalagiri Football Ground"
      };
    } else if (lat > 17.48) {
      return {
        address: "Siddharth Colony, Secunderabad, Telangana",
        landmark: "Near Surya Devalayam Temple"
      };
    } else if (lng > 78.50) {
      return {
        address: "Empress Road, Secunderabad, Telangana",
        landmark: "Near St. Joseph's High School"
      };
    } else {
      return {
        address: "Colony Rd, Tirumalagiri, Secunderabad",
        landmark: "Near Tirumalagiri Playground"
      };
    }
  }

  // Simulates reverse geocoding for Koramangala, Bangalore
  const koramangalaLat = 12.9352;
  const koramangalaLng = 77.6245;

  const d = haversineDistance(lat, lng, koramangalaLat, koramangalaLng);
  
  if (d < 100) {
    return {
      address: "17th Main Rd, Koramangala 5th Block",
      landmark: "Near Blue Tokai Coffee"
    };
  } else if (lat > koramangalaLat && lng > koramangalaLng) {
    return {
      address: "5th Cross, Koramangala 5th Block",
      landmark: "Near Koramangala Club"
    };
  } else if (lat < koramangalaLat && lng > koramangalaLng) {
    return {
      address: "1st Main Rd, Koramangala 4th Block",
      landmark: "Near Maharaja Restaurant"
    };
  } else {
    return {
      address: "8th Cross, Koramangala 3rd Block",
      landmark: "Near Koramangala Post Office"
    };
  }
}
