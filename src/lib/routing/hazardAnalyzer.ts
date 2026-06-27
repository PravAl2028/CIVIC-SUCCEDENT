import * as turf from '@turf/turf';
import { DamageType } from '../constants';

export const HAZARD_SEVERITY: Record<string, number> = {
  [DamageType.POTHOLE]: 8,
  [DamageType.WATER_LEAK]: 10,
  [DamageType.BROKEN_STREETLIGHT]: 5,
  [DamageType.WATERLOGGING]: 12,
  [DamageType.GARBAGE_DUMP]: 4,
};

export function getHazardRadius(type: string): number {
  switch (type) {
    case DamageType.POTHOLE: return 8;
    case DamageType.WATER_LEAK: return 15;
    case DamageType.BROKEN_STREETLIGHT: return 35;
    case DamageType.WATERLOGGING: return 30;
    case DamageType.GARBAGE_DUMP: return 12;
    default: return 15;
  }
}

export function buildHazardZone(hazard: any) {
  const lng = hazard.longitude ?? hazard.lng;
  const lat = hazard.latitude ?? hazard.lat;
  const type = hazard.damageType ?? hazard.type;
  const radius = hazard.radius ?? getHazardRadius(type);
  const center = [lng, lat];
  const circle = turf.circle(center, radius, { steps: 64, units: "meters" });
  circle.properties = { ...hazard, radius, longitude: lng, latitude: lat, damageType: type };
  return circle;
}

export function computeOverlapLength(routeLine: any, hazardPolygon: any): number {
  const boundary = turf.polygonToLine(hazardPolygon);
  if (!boundary || boundary.type !== 'Feature') return 0;
  
  const hits = turf.lineIntersect(routeLine, boundary);

  const startInside = turf.booleanPointInPolygon(
    turf.point(routeLine.geometry.coordinates[0]),
    hazardPolygon
  );

  if (hits.features.length === 0) {
    if (startInside) return turf.length(routeLine, { units: "meters" }); 
    return 0; 
  }

  const located = hits.features.map((f) => {
    const np = turf.nearestPointOnLine(routeLine, f, { units: "meters" });
    return { coord: f.geometry.coordinates, location: (np.properties.location ?? 0) as number };
  });
  located.sort((a, b) => a.location - b.location);

  let inside = startInside;
  let overlap = 0;
  let prev = routeLine.geometry.coordinates[0];

  for (const pt of located) {
    if (inside) {
      const segment = turf.lineSlice(turf.point(prev), turf.point(pt.coord), routeLine);
      overlap += turf.length(segment, { units: "meters" });
    }
    inside = !inside;
    prev = pt.coord;
  }
  if (inside) {
    const segment = turf.lineSlice(turf.point(prev), turf.point(routeLine.geometry.coordinates.at(-1)!), routeLine);
    overlap += turf.length(segment, { units: "meters" });
  }
  return overlap;
}

export function checkHazardIntersections(routeLine: any, hazards: any[]) {
  return hazards
    .map((hazard) => {
      const zone = buildHazardZone(hazard);
      const intersects = turf.booleanIntersects(routeLine, zone);
      if (!intersects) return { hazard, intersects: false, overlapMeters: 0, entryLocation: Infinity };

      const overlapMeters = computeOverlapLength(routeLine, zone);
      const hLng = hazard.longitude ?? hazard.lng;
      const hLat = hazard.latitude ?? hazard.lat;
      const np = turf.nearestPointOnLine(routeLine, turf.point([hLng, hLat]), { units: "meters" });
      return { hazard, intersects: true, overlapMeters, entryLocation: (np.properties.location ?? 0) as number };
    })
    .filter((r) => r.intersects)
    .sort((a, b) => a.entryLocation - b.entryLocation);
}

// Keep this for backwards compatibility where just the hazards are needed
export function getIntersectingHazards(routeCoords: Array<[number, number]>, hazards: any[]) {
  if (routeCoords.length < 2) return [];
  const line = turf.lineString(routeCoords.map(coord => [coord[1], coord[0]]));
  return checkHazardIntersections(line, hazards).map(h => h.hazard);
}
