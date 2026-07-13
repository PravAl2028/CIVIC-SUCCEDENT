import * as turf from "@turf/turf";
import { findRoute } from "./hazardRouting.js";

export const OFF_ROUTE_METERS = 40;
export const CONFIRM_DEVIATION_MS = 4000;
export const REROUTE_COOLDOWN_MS = 8000;
export const PROGRESS_THROTTLE_MS = 1000;

export function computeProgress(position, route) {
  const here = [position.lng, position.lat];
  const distanceToRoute = turf.pointToLineDistance(here, route.line, { units: "meters" });
  const snapped = turf.nearestPointOnLine(route.line, turf.point(here), { units: "meters" });
  const remainingMeters = turf.length(route.line, { units: "meters" }) - (snapped.properties.location ?? 0);
  return { distanceToRoute, remainingMeters };
}

/**
 * @param {object} params
 * @param {[number, number]} params.destination
 * @param {any[]} [params.hazards]
 * @param {string} [params.mode]
 * @param {Function} [params.routeFetcher]
 * @param {Function} [params.onProgress]
 * @param {Function} [params.onRerouted]
 * @param {Function} [params.onError]
 * @param {any} [params.initialRoute]
 */
export function createNavigationSession({
  destination = null,
  hazards = [],
  mode = "fastest",
  routeFetcher = findRoute,
  onProgress = null,
  onRerouted = null,
  onError = null,
  initialRoute = null,
} = {}) {
  let route = initialRoute;
  let lastProcessedAt = -Infinity;
  let deviatedSinceMs = null;
  let lastRerouteAt = -Infinity;
  let rerouting = false;

  async function setInitialRoute(start) {
    const result = await routeFetcher(start, destination, hazards, mode);
    route = result;
    onRerouted?.(result);
    return result;
  }

  async function onPositionUpdate(position) {
    const t = position.timestamp ?? Date.now();
    if (t - lastProcessedAt < PROGRESS_THROTTLE_MS) return false; // collapse duplicate/rapid-fire ticks
    lastProcessedAt = t;

    if (!route) return false;

    const { distanceToRoute, remainingMeters } = computeProgress(position, route);

    if (distanceToRoute <= OFF_ROUTE_METERS) {
      deviatedSinceMs = null;
      onProgress?.({ distanceToRoute, remainingMeters, onRoute: true });
      return false;
    }

    if (deviatedSinceMs == null) deviatedSinceMs = t;
    onProgress?.({ distanceToRoute, remainingMeters, onRoute: false });

    const sustained = t - deviatedSinceMs >= CONFIRM_DEVIATION_MS;
    const cooledDown = t - lastRerouteAt >= REROUTE_COOLDOWN_MS;

    if (sustained && cooledDown && !rerouting) {
      rerouting = true;
      try {
        const result = await routeFetcher([position.lng, position.lat], destination, hazards, mode);
        route = result;
        lastRerouteAt = t;
        deviatedSinceMs = null;
        onRerouted?.(result);
        return true;
      } catch (e) {
        onError?.(e);
        return false;
      } finally {
        rerouting = false;
      }
    }
    return false;
  }

  return { setInitialRoute, onPositionUpdate, getRoute: () => route };
}
