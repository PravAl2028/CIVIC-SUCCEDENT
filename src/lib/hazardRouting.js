import * as turf from "@turf/turf";

/* ---------- 1. Hazard zones ---------- */

// Severity weight per hazard type — used for the Safety Index penalty.
// Independent from avoidance radius (radius = spatial buffer, severity = how much it should hurt the score).
export const HAZARD_SEVERITY = {
  pothole: 8,
  water_leak: 10,
  broken_streetlight: 5,
  waterlogging: 12,
  garbage_dump: 4,
};

// Build a true circular polygon around a hazard (NOT a point — a polygon you can test a line against).
// Supports both c.lng/c.lat and c.longitude/c.latitude formats.
export function buildHazardZone(hazard) {
  const lng = hazard.lng ?? hazard.longitude;
  const lat = hazard.lat ?? hazard.latitude;
  const type = hazard.type ?? hazard.damageType;
  const radius = hazard.radius ?? AVOIDANCE_RADIUS[type] ?? 10;
  const center = [lng, lat];
  const circle = turf.circle(center, radius, { steps: 64, units: "meters" });
  circle.properties = { ...hazard, radius, lng, lat, type };
  return circle;
}

/* ---------- 2. Proper line-vs-polygon intersection (the actual fix) ---------- */

// Returns precise overlap length (meters) of routeLine inside hazardPolygon.
// Handles 0, 2, or N intersection points (route weaving in/out multiple times).
export function computeOverlapLength(routeLine, hazardPolygon) {
  const boundary = turf.polygonToLine(hazardPolygon);
  const hits = turf.lineIntersect(routeLine, boundary);

  const startInside = turf.booleanPointInPolygon(
    turf.point(routeLine.geometry.coordinates[0]),
    hazardPolygon
  );

  if (hits.features.length === 0) {
    if (startInside) return turf.length(routeLine, { units: "meters" }); // fully inside, never exits
    return 0; // fully outside
  }

  // Sort crossing points by how far along the route they occur.
  const located = hits.features.map((f) => {
    const np = turf.nearestPointOnLine(routeLine, f, { units: "meters" });
    return { coord: f.geometry.coordinates, location: np.properties.location ?? 0 };
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
  // tail after the last crossing, if we ended up inside
  if (inside) {
    const segment = turf.lineSlice(turf.point(prev), turf.point(routeLine.geometry.coordinates.at(-1)), routeLine);
    overlap += turf.length(segment, { units: "meters" });
  }
  return overlap;
}

// Checks a route against every hazard. This is the replacement for "check a few vertices".
export function checkHazardIntersections(routeLine, hazards) {
  return hazards
    .map((hazard) => {
      const zone = buildHazardZone(hazard);
      const intersects = turf.booleanIntersects(routeLine, zone);
      if (!intersects) return { hazard, intersects: false, overlapMeters: 0, entryLocation: Infinity };

      const overlapMeters = computeOverlapLength(routeLine, zone);
      const lng = hazard.lng ?? hazard.longitude;
      const lat = hazard.lat ?? hazard.latitude;
      const np = turf.nearestPointOnLine(routeLine, turf.point([lng, lat]), { units: "meters" });
      return { hazard, intersects: true, overlapMeters, entryLocation: np.properties.location ?? 0 };
    })
    .filter((r) => r.intersects)
    .sort((a, b) => a.entryLocation - b.entryLocation); // earliest hazard along the route first
}

/* ---------- 3. Safety Index (never hardcoded) ---------- */

export function computeSafetyIndex(intersections) {
  if (intersections.length === 0) return 100;

  let penalty = 0;
  for (const { hazard, overlapMeters } of intersections) {
    const type = hazard.type ?? hazard.damageType;
    const severity = HAZARD_SEVERITY[type] ?? 6;
    const radius = hazard.radius ?? AVOIDANCE_RADIUS[type] ?? 10;
    const diameter = radius * 2;
    // how much of the hazard's full width the route actually cuts through, 0..1
    const exposure = Math.min(1, overlapMeters / diameter);
    penalty += severity * (0.5 + 0.5 * exposure); // even a graze costs at least half the severity weight
  }
  return Math.max(0, Math.round(100 - penalty));
}

/* ---------- 4. Bypass waypoint generation ---------- */

export function generateBypassWaypoints(hazard, { distances = [60], bearings } = {}) {
  const bearingList = bearings ?? [0, 45, 90, 135, 180, 225, 270, 315];
  const lng = hazard.lng ?? hazard.longitude;
  const lat = hazard.lat ?? hazard.latitude;
  const type = hazard.type ?? hazard.damageType;
  const radius = hazard.radius ?? AVOIDANCE_RADIUS[type] ?? 10;
  const center = [lng, lat];
  const points = [];
  for (const dist of distances) {
    const totalDist = radius + dist;
    for (const bearing of bearingList) {
      const pt = turf.destination(center, totalDist, bearing, { units: "meters" });
      points.push({ lng: pt.geometry.coordinates[0], lat: pt.geometry.coordinates[1], bearing, distance: totalDist });
    }
  }
  return points;
}

/* ---------- 5. Local Express + db.json data source ---------- */

// Your data lives in /src/data/db.json, served through server.ts (not Supabase).
// Adjust the endpoint path below if your route is named differently.
const CASES_ENDPOINT = "/api/cases";

// Fallback avoidance radius per type — used only if a case record has no radius field of its own.
export const AVOIDANCE_RADIUS = {
  pothole: 8,
  water_leak: 15,
  broken_streetlight: 35,
  waterlogging: 30,
  garbage_dump: 12,
};

// Maps a raw case record from db.json into the {lat, lng, type, radius} shape this module needs.
// Tolerant of either naming style (lat/lng vs latitude/longitude, type vs damageType).
function mapCaseToHazard(c) {
  const type = c.type ?? c.damageType;
  return {
    type,
    lat: c.lat ?? c.latitude,
    lng: c.lng ?? c.longitude,
    radius: c.radius ?? AVOIDANCE_RADIUS[type] ?? 10,
  };
}

export async function fetchHazards(selectedTypes) {
  const res = await fetch(CASES_ENDPOINT);
  const cases = await res.json();
  const hazards = cases.map(mapCaseToHazard).filter((h) => h.lat != null && h.lng != null);
  if (!selectedTypes?.length) return hazards;
  return hazards.filter((h) => selectedTypes.includes(h.type));
}

/* ---------- 6. OSRM (public demo server) ---------- */

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export async function getOSRMRoute(coords) {
  // coords = [[lng,lat], [lng,lat], ...]  (start, [...waypoints], destination)
  const path = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  const url = `${OSRM_BASE}/${path}?overview=full&geometries=geojson&alternatives=false`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) return null;
  const r = data.routes[0];
  return {
    line: turf.lineString(r.geometry.coordinates),
    distanceMeters: r.distance,
    durationSeconds: r.duration,
  };
}

/* ---------- 7. Orchestrator ---------- */

export async function findRoute(start, end, hazards, mode = "fastest") {
  const direct = await getOSRMRoute([start, end]);
  if (!direct) throw new Error("OSRM could not compute a route");

  const directHits = checkHazardIntersections(direct.line, hazards);
  const directScore = computeSafetyIndex(directHits);

  if (mode === "fastest" || directHits.length === 0) {
    return { ...direct, intersections: directHits, safetyIndex: directScore, bypassed: false };
  }

  // mode === 'safest' and the direct route is unsafe → try to bypass the first hazard it hits
  const targetHazard = directHits[0].hazard;
  const waypoints = generateBypassWaypoints(targetHazard, { distances: [40, 80] });

  const candidates = await Promise.all(
    waypoints.map(async (wp) => {
      const route = await getOSRMRoute([start, [wp.lng, wp.lat], end]);
      if (!route) return null;
      const hits = checkHazardIntersections(route.line, hazards);
      return { ...route, intersections: hits, safetyIndex: computeSafetyIndex(hits) };
    })
  );

  const valid = candidates.filter(Boolean);
  valid.sort((a, b) =>
    a.intersections.length - b.intersections.length ||
    a.durationSeconds - b.durationSeconds ||
    a.distanceMeters - b.distanceMeters
  );

  const best = valid[0];
  if (!best) {
    return { ...direct, intersections: directHits, safetyIndex: directScore, bypassed: false, noAlternative: true };
  }
  return { ...best, bypassed: best.intersections.length < directHits.length, noAlternative: best.intersections.length > 0 };
}
