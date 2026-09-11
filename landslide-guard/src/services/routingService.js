/**
 * LandslideGuard AI - Open Source Routing Machine (OSRM) Service
 * Free, open-source routing engine based on OpenStreetMap (OSM) vectors.
 * Generates true mountain road curvature, emergency evacuation paths, and landslide bypass corridors.
 */

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

// In-memory route cache to eliminate redundant network roundtrips
const routeCache = new Map();

/**
 * Subsamples an array of coordinates if it exceeds maxPoints, ensuring smooth Leaflet rendering.
 */
function subsampleCoordinates(coords, maxPoints = 1200) {
  if (!coords || coords.length <= maxPoints) return coords;
  const step = Math.ceil(coords.length / maxPoints);
  const result = [];
  for (let i = 0; i < coords.length; i += step) {
    result.push(coords[i]);
  }
  // Ensure the destination is preserved
  if (result[result.length - 1] !== coords[coords.length - 1]) {
    result.push(coords[coords.length - 1]);
  }
  return result;
}

/**
 * Fetches a driving route from OSRM using given waypoints [[lat, lng], ...].
 * @param {Array<[number, number]>} waypoints - Array of [lat, lng] coordinates
 * @param {Object} options - { overview: 'full', simplify: true }
 * @returns {Promise<{ success: boolean, coordinates: Array<[number, number]>, distanceKm: number, durationMin: number, summary: string, isFallback?: boolean }>}
 */
export async function fetchOSRMRoute(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error("Routing requires at least two waypoints [start, end].");
  }

  // Create a cache key from waypoints
  const cacheKey = waypoints.map(pt => `${pt[0].toFixed(4)},${pt[1].toFixed(4)}`).join(";");
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // OSRM expects coordinates formatted as "{longitude},{latitude};{longitude},{latitude}"
  const coordString = waypoints.map(pt => `${pt[1]},${pt[0]}`).join(";");
  const url = `${OSRM_BASE_URL}/${coordString}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM HTTP error: ${res.status}`);
    }

    const data = await res.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM routing failed with code: ${data.code}`);
    }

    const primaryRoute = data.routes[0];
    const rawCoords = primaryRoute.geometry.coordinates; // [[lon, lat], ...]

    // Convert GeoJSON [lon, lat] -> Leaflet [lat, lon]
    let leafCoords = rawCoords.map(coord => [coord[1], coord[0]]);

    // Subsample if too dense to ensure 60fps pan/zoom
    leafCoords = subsampleCoordinates(leafCoords, 1500);

    const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
    // In mountain terrain, driving time from standard flat algorithms is typically ~1.4x higher due to ghat roads
    const mountainFactor = 1.35;
    const durationMin = Math.round((primaryRoute.duration / 60) * mountainFactor);

    const result = {
      success: true,
      coordinates: leafCoords,
      distanceKm,
      durationMin,
      summary: primaryRoute.legs?.[0]?.summary || "Strategic Mountain Corridor",
      isFallback: false,
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("[RoutingService] OSRM fetch failed, using fallback route:", err.message);
    return generateFallbackRoute(waypoints);
  }
}

/**
 * Generates an interpolated fallback route between waypoints if network or OSRM is unreachable.
 */
function generateFallbackRoute(waypoints) {
  const resultCoords = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // Linear interpolation
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      resultCoords.push([lat, lng]);
    }
  }

  // Calculate approximate distance
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dLat = (waypoints[i + 1][0] - waypoints[i][0]) * 111;
    const dLng = (waypoints[i + 1][1] - waypoints[i][1]) * 100;
    totalKm += Math.sqrt(dLat * dLat + dLng * dLng);
  }

  return {
    success: true,
    coordinates: resultCoords,
    distanceKm: Number(totalKm.toFixed(1)),
    durationMin: Math.round(totalKm * 2.8), // ~25 km/h average mountain transit speed
    summary: "Simulated Mountain Transit Line (Offline)",
    isFallback: true,
  };
}

/**
 * Calculates a live evacuation corridor from a vulnerable village to its designated safe shelter.
 * @param {Object} village - Village data item from VULNERABLE_VILLAGES
 */
export async function getVillageEvacuationRoute(village) {
  if (!village) return null;

  const startCoord = [village.lat, village.lng];
  const shelterCoord = village.shelterCoordinates || [village.lat + 0.015, village.lng + 0.012];

  const route = await fetchOSRMRoute([startCoord, shelterCoord]);

  return {
    ...route,
    id: `EVAC-${village.id}`,
    type: "EVACUATION",
    originName: village.name,
    destinationName: village.shelterName || "Designated Disaster Relief Center",
    shelterType: village.shelterType || "Emergency Shelter",
    cutoffRisk: village.cutoffRisk,
    vulnerabilityLevel: village.vulnerabilityLevel,
    evacuationInstruction: village.evacuationRoute,
  };
}

/**
 * Calculates an alternate bypass detour route around a blocked national highway section.
 * @param {Object} highway - Highway data item from NER_HIGHWAYS
 */
export async function getHighwayBypassRoute(highway) {
  if (!highway) return null;

  const bypassWaypoints = highway.bypassInfo?.coordinates || highway.coordinates;

  const route = await fetchOSRMRoute(bypassWaypoints);

  return {
    ...route,
    id: `BYPASS-${highway.id}`,
    type: "BYPASS_DETOUR",
    originName: highway.name,
    destinationName: highway.bypassInfo?.name || `${highway.name} Safe Detour Bypass`,
    criticalPasses: highway.criticalPasses,
    impact: highway.impact,
    detourKm: highway.bypassInfo?.detourKm || Math.max(12, Math.round(route.distanceKm * 0.25)),
    delayMinutes: highway.bypassInfo?.delayMinutes || Math.round(route.durationMin * 0.4),
  };
}
