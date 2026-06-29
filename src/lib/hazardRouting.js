/**
 * Hazard-aware routing for public OSRM — v2
 * npm install @turf/turf
 *
 * Data source: local Express server (server.ts) backed by /src/data/db.json.
 *
 * Usage:
 *   import { fetchHazards, findRoute } from "./hazardRouting";
 *   const hazards = await fetchHazards(["pothole", "water_leak"]);
 *   const result = await findRoute([startLng, startLat], [destLng, destLat], hazards, "safest");
 *   // result = { line, distanceMeters, durationSeconds, intersections, safetyIndex, bypassed, noAlternative }
 */

import * as turf from "@turf/turf";

/* ─────────────────────────────── 1. Constants ──────────────────────────── */

// Severity weight per hazard type — used for the Safety Index penalty.
export const HAZARD_SEVERITY = {
  pothole: 8,
  water_leak: 10,
  broken_streetlight: 5,
  waterlogging: 12,
  garbage_dump: 4,
};

// Fallback avoidance radius (meters) when a case record has no radius field.
export const AVOIDANCE_RADIUS = {
  pothole: 8,
  water_leak: 15,
  broken_streetlight: 35,
  waterlogging: 30,
  garbage_dump: 12,
};

/* ─────────────────────────────── 2. Hazard zones ──────────────────────── */

export function buildHazardZone(hazard) {
  const circle = turf.circle([hazard.lng, hazard.lat], hazard.radius, {
    steps: 64,
    units: "meters",
  });
  circle.properties = { ...hazard };
  return circle;
}

/* ─────────────────────────── 3. Line-vs-polygon overlap ───────────────── */

// Returns precise overlap length (meters) of routeLine inside hazardPolygon.
export function computeOverlapLength(routeLine, hazardPolygon) {
  const boundary = turf.polygonToLine(hazardPolygon);
  const hits = turf.lineIntersect(routeLine, boundary);

  const startInside = turf.booleanPointInPolygon(
    turf.point(routeLine.geometry.coordinates[0]),
    hazardPolygon
  );

  if (hits.features.length === 0) {
    return startInside ? turf.length(routeLine, { units: "meters" }) : 0;
  }

  // Sort crossing points by position along the route.
  const located = hits.features.map((f) => {
    const np = turf.nearestPointOnLine(routeLine, f, { units: "meters" });
    return { coord: f.geometry.coordinates, location: np.properties.location }; // FIX: was np.location
  });
  located.sort((a, b) => a.location - b.location);

  let inside = startInside;
  let overlap = 0;
  let prev = routeLine.geometry.coordinates[0];

  for (const pt of located) {
    if (inside) {
      const seg = turf.lineSlice(turf.point(prev), turf.point(pt.coord), routeLine);
      overlap += turf.length(seg, { units: "meters" });
    }
    inside = !inside;
    prev = pt.coord;
  }

  // Tail segment if the route ends inside the polygon.
  if (inside) {
    const tail = routeLine.geometry.coordinates.at(-1);
    const seg = turf.lineSlice(turf.point(prev), turf.point(tail), routeLine);
    overlap += turf.length(seg, { units: "meters" });
  }

  return overlap;
}

// Tests a route against every hazard; returns only the ones that intersect,
// sorted by position along the route (earliest-encountered first).
export function checkHazardIntersections(routeLine, hazards) {
  return hazards
    .map((hazard) => {
      const zone = buildHazardZone(hazard);
      if (!turf.booleanIntersects(routeLine, zone)) {
        return { hazard, intersects: false, overlapMeters: 0, entryLocation: Infinity };
      }
      const overlapMeters = computeOverlapLength(routeLine, zone);
      const np = turf.nearestPointOnLine(
        routeLine,
        turf.point([hazard.lng, hazard.lat]),
        { units: "meters" }
      );
      return {
        hazard,
        intersects: true,
        overlapMeters,
        entryLocation: np.properties.location, // FIX: was np.location (always undefined → broken sort)
      };
    })
    .filter((r) => r.intersects)
    .sort((a, b) => a.entryLocation - b.entryLocation);
}

/* ─────────────────────────────── 4. Safety Index ──────────────────────── */

export function computeSafetyIndex(intersections) {
  if (!intersections.length) return 100;
  let penalty = 0;
  for (const { hazard, overlapMeters } of intersections) {
    const severity = HAZARD_SEVERITY[hazard.type] ?? 6;
    const diameter = hazard.radius * 2;
    const exposure = Math.min(1, overlapMeters / diameter);
    // Even a graze (exposure ≈ 0) costs at least half the severity weight.
    penalty += severity * (0.5 + 0.5 * exposure);
  }
  return Math.max(0, Math.round(100 - penalty));
}

/* ────────────────────── 5. Perpendicular waypoint generation ──────────── */

/**
 * Generates bypass waypoint candidates that are PERPENDICULAR to the route
 * at the hazard location.  This biases OSRM toward taking a parallel street
 * rather than re-routing back onto the same road.
 */
export function generateBypassWaypoints(
  hazard,
  routeLine,
  { distances = [80, 150, 220] } = {}
) {
  let bearings;

  try {
    // Find where the route is closest to the hazard.
    const np = turf.nearestPointOnLine(
      routeLine,
      turf.point([hazard.lng, hazard.lat]),
      { units: "meters" }
    );
    const loc = np.properties.location;
    const totalLen = turf.length(routeLine, { units: "meters" });
    const step = Math.min(20, totalLen * 0.05);

    // Compute the route bearing at the hazard point.
    const ptBefore = turf.along(routeLine, Math.max(0, loc - step), { units: "meters" });
    const ptAfter = turf.along(routeLine, Math.min(totalLen, loc + step), { units: "meters" });
    const rb = turf.bearing(ptBefore, ptAfter);

    // Perpendicular directions ± diagonal variants.
    // These steer OSRM left/right of the route, forcing a parallel-road detour.
    bearings = [-90, -75, -60, 60, 75, 90].map((o) => ((rb + o) % 360 + 360) % 360);
  } catch {
    // Fallback: omnidirectional (v1 behaviour)
    bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  }

  return distances.flatMap((dist) => {
    const totalDist = hazard.radius + dist;
    return bearings.map((bearing) => {
      const pt = turf.destination([hazard.lng, hazard.lat], totalDist, bearing, { units: "meters" });
      return {
        lng: pt.geometry.coordinates[0],
        lat: pt.geometry.coordinates[1],
        bearing,
        distance: totalDist,
      };
    });
  });
}

/* ─────────────────────────── 6. Data source ───────────────────────────── */

const CASES_ENDPOINT = "/api/cases";

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
  const hazards = cases
    .map(mapCaseToHazard)
    .filter((h) => h.lat != null && h.lng != null);
  if (!selectedTypes?.length) return hazards;
  return hazards.filter((h) => selectedTypes.includes(h.type));
}

/* ─────────────────────── 7. OSRM with retry + batching ────────────────── */

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const OSRM_CONCURRENCY = 4; // stay polite on the public demo server

export async function getOSRMRoute(coords, retries = 2) {
  const path = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  const url = `${OSRM_BASE}/${path}?overview=full&geometries=geojson&alternatives=false`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.length) return null;
      const r = data.routes[0];
      return {
        line: turf.lineString(r.geometry.coordinates),
        distanceMeters: r.distance,
        durationSeconds: r.duration,
      };
    } catch {
      if (attempt < retries) {
        // Exponential back-off: 400 ms, 800 ms, …
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  return null;
}

// Sends coordSets in batches of `concurrency` with a short pause between
// batches to avoid overwhelming the public OSRM rate limiter.
async function runBatched(coordSets, concurrency = OSRM_CONCURRENCY) {
  const results = [];
  for (let i = 0; i < coordSets.length; i += concurrency) {
    const batch = coordSets.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map((c) => getOSRMRoute(c)))));
    if (i + concurrency < coordSets.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  return results;
}

/* ─────────────────────────── 8. Route deduplication ───────────────────── */

// Signature using 5 evenly-spaced coordinate samples (≈ 11 m grid at 4 d.p.).
// OSRM snaps nearby waypoints to the same node — dedup skips identical routes.
function routeSig(route) {
  const coords = route.line.geometry.coordinates;
  return [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const c = coords[Math.floor(f * (coords.length - 1))];
      return `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
    })
    .join("|");
}

function deduplicate(routes) {
  const seen = new Set();
  return routes.filter((r) => {
    const sig = routeSig(r);
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

/* ─────────────────────────── 9. Candidate scoring ─────────────────────── */

// Attaches hazard analysis and sorts: fewer hits > better safety index >
// shorter duration > shorter distance.
function scoreAndRank(rawRoutes, allHazards) {
  return rawRoutes
    .map((route) => {
      const hits = checkHazardIntersections(route.line, allHazards);
      return { ...route, intersections: hits, safetyIndex: computeSafetyIndex(hits) };
    })
    .sort(
      (a, b) =>
        a.intersections.length - b.intersections.length ||
        b.safetyIndex - a.safetyIndex ||
        a.durationSeconds - b.durationSeconds ||
        a.distanceMeters - b.distanceMeters
    );
}

/* ───────────────── 10. Orchestrator (completely rewritten) ─────────────── */

export async function findRoute(start, end, hazards, mode = "fastest") {
  /* Step 1 — direct route */
  const direct = await getOSRMRoute([start, end]);
  if (!direct) throw new Error("OSRM could not compute a route");

  const directHits = checkHazardIntersections(direct.line, hazards);
  const directScore = computeSafetyIndex(directHits);

  // Fast-path: no hazards or user wants fastest (ignore hazards).
  if (mode === "fastest" || directHits.length === 0) {
    return { ...direct, intersections: directHits, safetyIndex: directScore, bypassed: false };
  }

  /* Step 2 — iterative safest-route search */
  let best = {
    ...direct,
    intersections: directHits,
    safetyIndex: directScore,
    bypassed: false,
    noAlternative: true,
  };

  // Up to 3 passes; each pass tries to reduce the remaining hazard count.
  for (let iter = 0; iter < 3; iter++) {
    if (best.intersections.length === 0) break;
    let improved = false;

    /* Strategy A — single bypass waypoint per remaining hazard.
       Tries each remaining hazard independently so all of them get a shot,
       not just the first one (v1 bug). */
    for (const { hazard } of best.intersections) {
      const wps = generateBypassWaypoints(hazard, best.line);
      const coordSets = wps.map((wp) => [start, [wp.lng, wp.lat], end]);
      const raw = await runBatched(coordSets);
      const ranked = scoreAndRank(deduplicate(raw.filter(Boolean)), hazards);

      if (ranked[0] && ranked[0].intersections.length < best.intersections.length) {
        const top = ranked[0];
        best = { ...top, bypassed: true, noAlternative: top.intersections.length > 0 };
        improved = true;
        break; // restart outer loop with the new best route
      }
    }

    if (improved) continue;

    /* Strategy B — two simultaneous bypass waypoints for the first two
       remaining hazards.  Used when Strategy A cannot reduce the count
       (e.g. two hazards sit on the same segment and a single detour only
       avoids one of them). */
    if (best.intersections.length >= 2) {
      const [h1, h2] = best.intersections.map((r) => r.hazard);

      // Use fewer directions and medium distances for the pair — keeps the
      // request count manageable (≤ 25 pairs).
      const wpsA = generateBypassWaypoints(h1, best.line, { distances: [100, 180] }).slice(0, 5);
      const wpsB = generateBypassWaypoints(h2, best.line, { distances: [100, 180] }).slice(0, 5);

      const pairs = [];
      for (const a of wpsA) {
        for (const b of wpsB) {
          // Try both orderings — sometimes OSRM prefers B before A.
          pairs.push([start, [a.lng, a.lat], [b.lng, b.lat], end]);
          pairs.push([start, [b.lng, b.lat], [a.lng, a.lat], end]);
          if (pairs.length >= 24) break;
        }
        if (pairs.length >= 24) break;
      }

      const raw = await runBatched(pairs);
      const ranked = scoreAndRank(deduplicate(raw.filter(Boolean)), hazards);

      if (ranked[0] && ranked[0].intersections.length < best.intersections.length) {
        const top = ranked[0];
        best = { ...top, bypassed: true, noAlternative: top.intersections.length > 0 };
        improved = true;
      }
    }

    // Neither strategy helped in this pass — no further improvement possible.
    if (!improved) break;
  }

  return best;
}
