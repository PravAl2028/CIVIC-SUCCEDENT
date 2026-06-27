async function fetchWithRetry(url: string, options: RequestInit, retries: number = 3, delay: number = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, delay * (i + 1))); // Exponential backoff
          continue;
        }
      }
      return res;
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries reached");
}

export async function fetchOSRMRoute(startLng: number, startLat: number, endLng: number, endLat: number, signal: AbortSignal) {
  const profile = "routed-car";
  const mode = "driving";
  const url = `https://routing.openstreetmap.de/${profile}/route/v1/${mode}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetchWithRetry(url, { signal });
  if (!res.ok) throw new Error("OSRM API failed");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes) throw new Error("No route found");
  return data.routes;
}

export async function fetchOSRMRouteWithWaypoint(startLng: number, startLat: number, wpLng: number, wpLat: number, endLng: number, endLat: number, signal: AbortSignal) {
  const profile = "routed-car";
  const mode = "driving";
  const url = `https://routing.openstreetmap.de/${profile}/route/v1/${mode}/${startLng},${startLat};${wpLng},${wpLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetchWithRetry(url, { signal });
  if (!res.ok) throw new Error("OSRM API failed");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes) throw new Error("No route found");
  return data.routes;
}
