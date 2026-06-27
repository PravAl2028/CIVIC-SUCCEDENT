import * as turf from '@turf/turf';
import { getHazardRadius } from './hazardAnalyzer';

export function generateBypassWaypoints(hazard: any, distances: number[] = [40, 80], bearings: number[] = [0, 45, 90, 135, 180, 225, 270, 315]): Array<[number, number]> {
  const lng = hazard.longitude ?? hazard.lng;
  const lat = hazard.latitude ?? hazard.lat;
  const type = hazard.damageType ?? hazard.type;
  const center = [lng, lat];
  const points: Array<[number, number]> = [];
  const radius = hazard.radius ?? getHazardRadius(type);
  for (const dist of distances) {
    const totalDist = radius + dist;
    for (const bearing of bearings) {
      const pt = turf.destination(center, totalDist, bearing, { units: "meters" });
      points.push([pt.geometry.coordinates[1], pt.geometry.coordinates[0]]); // [lat, lng]
    }
  }
  return points;
}
