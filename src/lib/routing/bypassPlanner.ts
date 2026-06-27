import { fetchOSRMRoute, fetchOSRMRouteWithWaypoint } from './routeService';
import { checkHazardIntersections, buildHazardZone } from './hazardAnalyzer';
import { computeSafetyIndex } from './safetyScore';
import { generateBypassWaypoints } from './waypointGenerator';
import * as turf from '@turf/turf';

export interface EvaluatedRoute {
  route: any;
  coords: Array<[number, number]>;
  intersecting: any[];
  score: number;
  duration: number;
  distance: number;
}

function evaluateRoute(r: any, hazards: any[]): EvaluatedRoute {
  const coords: Array<[number, number]> = r.geometry.coordinates.map(
    (coord: [number, number]) => [coord[1], coord[0]] // [lat, lng]
  );
  
  const line = turf.lineString(r.geometry.coordinates);
  const intersecting = checkHazardIntersections(line, hazards);
  const score = computeSafetyIndex(intersecting);
  
  return {
    route: r,
    coords,
    intersecting,
    score,
    duration: r.duration,
    distance: r.distance
  };
}

export async function computeSafestRoute(
  startLng: number, startLat: number,
  endLng: number, endLat: number,
  hazards: any[],
  signal: AbortSignal
): Promise<EvaluatedRoute | null> {
  let routes = await fetchOSRMRoute(startLng, startLat, endLng, endLat, signal);
  let evaluated = routes.map((r: any) => evaluateRoute(r, hazards));
  
  // Sort by fewest hazards, then highest score, then duration, then distance
  evaluated.sort((a, b) => {
    if (a.intersecting.length !== b.intersecting.length) return a.intersecting.length - b.intersecting.length;
    if (a.score !== b.score) return b.score - a.score;
    if (a.duration !== b.duration) return a.duration - b.duration;
    return a.distance - b.distance;
  });
  
  let bestRoute = evaluated[0];
  
  // If no completely safe route found, try waypoint bypass algorithm
  let iteration = 0;
  const MAX_ITERATIONS = 3;
  
  while (bestRoute.intersecting.length > 0 && iteration < MAX_ITERATIONS) {
    if (signal.aborted) break;
    const targetHazard = bestRoute.intersecting[0].hazard;
    const waypoints = generateBypassWaypoints(targetHazard, [40, 80]);
    
    let candidates: EvaluatedRoute[] = [];
    for (const wp of waypoints) {
      if (signal.aborted) break;
      try {
        const wpRoutes = await fetchOSRMRouteWithWaypoint(startLng, startLat, wp[1], wp[0], endLng, endLat, signal);
        candidates.push(...wpRoutes.map((r: any) => evaluateRoute(r, hazards)));
      } catch (e) {
        console.warn("Bypass route fetch failed", e);
      }
    }
    
    candidates = candidates.filter(Boolean);
    if (candidates.length === 0) break;
    
    candidates.sort((a, b) => {
      if (a.intersecting.length !== b.intersecting.length) return a.intersecting.length - b.intersecting.length;
      if (a.score !== b.score) return b.score - a.score;
      if (a.duration !== b.duration) return a.duration - b.duration;
      return a.distance - b.distance;
    });
    
    if (
      candidates[0].intersecting.length < bestRoute.intersecting.length ||
      (candidates[0].intersecting.length === bestRoute.intersecting.length && candidates[0].score > bestRoute.score)
    ) {
      bestRoute = candidates[0];
    } else {
      break; // No improvement
    }
    iteration++;
  }
  
  return bestRoute;
}

export async function computeFastestRoute(
  startLng: number, startLat: number,
  endLng: number, endLat: number,
  hazards: any[],
  signal: AbortSignal
): Promise<EvaluatedRoute | null> {
  let routes = await fetchOSRMRoute(startLng, startLat, endLng, endLat, signal);
  let evaluated = routes.map((r: any) => evaluateRoute(r, hazards));
  
  // Sort by duration, if similar (within 10%), choose safer
  evaluated.sort((a, b) => {
    const durDiff = a.duration - b.duration;
    if (Math.abs(durDiff) < Math.max(a.duration, b.duration) * 0.1) {
      if (a.intersecting.length !== b.intersecting.length) return a.intersecting.length - b.intersecting.length;
      if (a.score !== b.score) return b.score - a.score;
    }
    return a.duration - b.duration;
  });
  
  return evaluated[0];
}
