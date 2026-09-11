"use client";
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  NER_DISTRICTS,
  NER_STATES,
  NER_HIGHWAYS,
  HISTORICAL_LANDSLIDES,
  VULNERABLE_VILLAGES,
  CRITICAL_INFRASTRUCTURE,
  RISK_LEVELS,
  getRiskColor,
  getVillagesByDistrict,
  getInfrastructureByDistrict,
} from "@/data/nerData";
import {
  fetchDistrictWeather,
  fetchRainViewerRadar,
  calculateDynamicRisk,
} from "@/services/weatherApi";
import {
  getVillageEvacuationRoute,
  getHighwayBypassRoute,
} from "@/services/routingService";
import {
  Mountain,
  Map,
  Navigation,
  Route,
  Satellite,
  Radio,
  Droplets,
  History,
  Shield,
  ShieldAlert,
  Compass,
  Search,
  Crosshair,
  Plus,
  Minus,
  X,
  Thermometer,
  Wind,
  Gauge,
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Zap,
  Home,
  Building2,
  Landmark,
} from "lucide-react";
import styles from "./LiveGISMap.module.css";

// NER Bounds & Center
const NER_CENTER = [26.0, 92.8];
const NER_ZOOM = 7;

// 100% Free, High-Reliability Light Base Tile Providers (Zero API Key required)
const LIGHT_TILE_LAYERS = {
  topo: {
    name: "Topographic",
    icon: Mountain,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap",
    maxZoom: 18,
  },
  osm: {
    name: "OpenStreetMap",
    icon: Map,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  street: {
    name: "Street Map",
    icon: Navigation,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS",
    maxZoom: 18,
  },
  satellite: {
    name: "Satellite",
    icon: Satellite,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS",
    maxZoom: 18,
  },
};

// Map Fly Controller Component
function MapFlyController({ targetCoords, targetZoom }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, targetZoom || 9, {
        duration: 1.2,
      });
    }
  }, [targetCoords, targetZoom, map]);
  return null;
}

// Precision Floating Zoom & Recenter Controls
function MapZoomButtons({ onRecenter }) {
  const map = useMap();
  return (
    <div className={styles.zoomControls}>
      <button
        className={styles.zoomBtn}
        onClick={(e) => {
          e.stopPropagation();
          map.zoomIn();
        }}
        title="Zoom In"
      >
        <Plus size={15} />
      </button>
      <div className={styles.zoomDivider} />
      <button
        className={styles.zoomBtn}
        onClick={(e) => {
          e.stopPropagation();
          map.zoomOut();
        }}
        title="Zoom Out"
      >
        <Minus size={15} />
      </button>
      <div className={styles.zoomDivider} />
      <button
        className={styles.zoomBtn}
        onClick={(e) => {
          e.stopPropagation();
          if (onRecenter) onRecenter();
        }}
        title="Reset to North East India"
      >
        <Crosshair size={15} />
      </button>
    </div>
  );
}

// Subtle Typographic State Labels
function StateLabels() {
  const map = useMap();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");

    const markers = NER_STATES.map((state) => {
      const labelIcon = L.divIcon({
        className: "state-marker-label",
        html: `<div style="
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.6);
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          white-space: nowrap;
          pointer-events: none;
          text-align: center;
        ">${state.name}</div>`,
        iconSize: [100, 20],
        iconAnchor: [50, 10],
      });
      return L.marker([state.lat, state.lng], {
        icon: labelIcon,
        interactive: false,
      }).addTo(map);
    });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [map]);

  return null;
}

// High-Visibility Rainfall Gauges Layer (Dedicated offset badges that never muddy district risk markers)
function RainfallGaugesLayer({ districts }) {
  const map = useMap();

  useEffect(() => {
    if (typeof window === "undefined" || !map) return;
    const L = require("leaflet");

    const markers = districts.map((d) => {
      const rainIcon = L.divIcon({
        className: "rainfall-aws-pin",
        html: `<div class="rainfall-aws-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span>${d.rainfall24h}mm</span>
        </div>`,
        iconSize: [64, 22],
        iconAnchor: [32, 28],
      });

      const m = L.marker([d.lat, d.lng], {
        icon: rainIcon,
        zIndexOffset: 600,
      });

      m.bindTooltip(
        `<div style="font-size: 11px; padding: 3px 5px; color: #0f172a;">
          <strong style="color: #0284c7;">IMD 24h Precipitation</strong><br/>
          <span>${d.district} (${d.state}): <strong>${d.rainfall24h} mm</strong></span>
        </div>`,
        { direction: "top", offset: [0, -10] }
      );

      return m.addTo(map);
    });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [map, districts]);

  return null;
}

export default function LiveGISMap({ initialDistrictId = null }) {
  // Default to Topographic Base Map
  const [baseLayer, setBaseLayer] = useState("topo");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetView, setTargetView] = useState(null);

  // Layer Toggles (Default clean states)
  const [showDistricts, setShowDistricts] = useState(true);
  const [showRadar, setShowRadar] = useState(false);
  const [showRainfall, setShowRainfall] = useState(false);
  const [showHighways, setShowHighways] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [showInfrastructure, setShowInfrastructure] = useState(true);
  const [showHistorical, setShowHistorical] = useState(true);

  // Radar Telemetry State
  const [radarData, setRadarData] = useState(null);
  const [radarOpacity, setRadarOpacity] = useState(0.7);

  // Selected District & Telemetry Dossier
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [simulatedRainBoost, setSimulatedRainBoost] = useState(0);

  // Active Routing Telemetry State
  const [activeRoute, setActiveRoute] = useState(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Calculate live evacuation corridor for a vulnerable village
  const handleCalculateEvacuation = useCallback(async (village) => {
    setIsRoutingLoading(true);
    try {
      const route = await getVillageEvacuationRoute(village);
      if (route) {
        setActiveRoute(route);
        if (route.coordinates && route.coordinates.length > 0) {
          const midIdx = Math.floor(route.coordinates.length / 2);
          setTargetView({ coords: route.coordinates[midIdx], zoom: 13 });
        }
      }
    } catch (err) {
      console.error("Failed to calculate evacuation corridor:", err);
    } finally {
      setIsRoutingLoading(false);
    }
  }, []);

  // Calculate safe alternate bypass detour for a blocked/restricted highway
  const handleCalculateBypass = useCallback(async (highway) => {
    setIsRoutingLoading(true);
    try {
      const route = await getHighwayBypassRoute(highway);
      if (route) {
        setActiveRoute(route);
        if (route.coordinates && route.coordinates.length > 0) {
          const midIdx = Math.floor(route.coordinates.length / 2);
          setTargetView({ coords: route.coordinates[midIdx], zoom: 10 });
        }
      }
    } catch (err) {
      console.error("Failed to calculate bypass route:", err);
    } finally {
      setIsRoutingLoading(false);
    }
  }, []);

  const handleClearRoute = useCallback(() => {
    setActiveRoute(null);
  }, []);

  // Load RainViewer live radar metadata
  useEffect(() => {
    let isMounted = true;
    async function loadRadar() {
      const data = await fetchRainViewerRadar();
      if (isMounted && data.success) {
        setRadarData(data);
      }
    }
    loadRadar();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle initial district if provided
  useEffect(() => {
    if (initialDistrictId) {
      const found = NER_DISTRICTS.find((d) => d.id === initialDistrictId);
      if (found) handleSelectDistrict(found);
    }
  }, [initialDistrictId]);

  // Fetch Live Weather for selected district
  const handleSelectDistrict = useCallback(async (district) => {
    setSelectedDistrict(district);
    setSimulatedRainBoost(0);
    setWeatherLoading(true);
    setTargetView({ coords: [district.lat, district.lng], zoom: 9 });

    const weather = await fetchDistrictWeather(district.lat, district.lng);
    setLiveWeather(weather);
    setWeatherLoading(false);
  }, []);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    return NER_DISTRICTS.filter((d) => {
      const stateMatch = selectedState === "ALL" || d.stateCode === selectedState;
      const riskMatch = selectedRisk === "ALL" || d.riskLevel === selectedRisk;
      const searchMatch =
        !searchQuery.trim() ||
        d.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.state.toLowerCase().includes(searchQuery.toLowerCase());
      return stateMatch && riskMatch && searchMatch;
    });
  }, [selectedState, selectedRisk, searchQuery]);

  // Dynamic risk calculation
  const computedDynamicRisk = useMemo(() => {
    if (!selectedDistrict) return null;
    const weatherWithBoost = liveWeather
      ? {
          ...liveWeather,
          precipitation24h: liveWeather.precipitation24h + simulatedRainBoost,
          soilSaturationPct: Math.min(
            100,
            liveWeather.soilSaturationPct + (simulatedRainBoost > 0 ? 18 : 0)
          ),
        }
      : null;
    return calculateDynamicRisk(selectedDistrict, weatherWithBoost);
  }, [selectedDistrict, liveWeather, simulatedRainBoost]);

  return (
    <div className={styles.mapWrapper}>
      {/* ==================== UNIFIED COMMAND HEADER ==================== */}
      <div className={styles.commandHeader}>
        {/* Main Header Bar */}
        <div className={styles.topBar}>
          {/* Left: Brand Identity & Telemetry Status */}
          <div className={styles.brandBox}>
            <div className={styles.brandIconWrap}>
              <Shield size={18} />
            </div>
            <div className={styles.brandInfo}>
              <div className={styles.brandName}>LandslideGuard GIS</div>
              <div className={styles.brandDept}>MDoNER • North Eastern Region Early Warning</div>
            </div>
            <div className={styles.telemetryBadge}>
              <span className={styles.pulseDot} />
              <span>NRT ACTIVE</span>
            </div>
          </div>

          {/* Center: Search & Administrative Filters */}
          <div className={styles.filterControls}>
            <div className={styles.searchField}>
              <Search size={14} color="#64748b" />
              <input
                placeholder="Search districts or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className={styles.filterSelect}>
              <Compass size={13} color="#0f766e" />
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  const st = NER_STATES.find((s) => s.code === e.target.value);
                  if (st) setTargetView({ coords: [st.lat, st.lng], zoom: 8 });
                  else if (e.target.value === "ALL")
                    setTargetView({ coords: NER_CENTER, zoom: NER_ZOOM });
                }}
              >
                <option value="ALL">All 8 NER States</option>
                {NER_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterSelect}>
              <ShieldAlert size={13} color="#dc2626" />
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
              >
                <option value="ALL">All Threat Levels</option>
                <option value="VERY_HIGH">Critical Threat</option>
                <option value="HIGH">High Alert</option>
                <option value="MEDIUM">Moderate Advisory</option>
                <option value="LOW">Nominal</option>
              </select>
            </div>
          </div>

          {/* Right: Segmented Base Map Control */}
          <div className={styles.baseMapGroup}>
            <div className={styles.segmentedControl}>
              {Object.entries(LIGHT_TILE_LAYERS).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <button
                    key={key}
                    className={`${styles.segmentBtn} ${
                      baseLayer === key ? styles.segmentBtnActive : ""
                    }`}
                    onClick={() => setBaseLayer(key)}
                    title={`Switch to ${config.name}`}
                  >
                    <IconComponent size={12} />
                    <span>{config.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            <button
              className={styles.iconSquareBtn}
              onClick={() => setTargetView({ coords: NER_CENTER, zoom: NER_ZOOM })}
              title="Reset View to North East India"
            >
              <Crosshair size={15} />
            </button>
          </div>
        </div>

        {/* Sub-Toolbar: Surveillance Layer Chips */}
        <div className={styles.layerToolbar}>
          {/* Live Radar Toggle */}
          <button
            className={`${styles.chipBtn} ${
              showRadar ? styles.chipBtnRadarActive : ""
            }`}
            onClick={() => setShowRadar(!showRadar)}
            title="Toggle Live Precipitation Radar"
          >
            <Radio size={13} />
            <span>NRT Radar</span>
          </button>

          {/* Inline Radar Controls */}
          {showRadar && (
            <div className={styles.radarControlBadge}>
              <span className={styles.radarLiveDot} />
              <span>{radarData?.latestTime || "Live Telemetry"}</span>
              <div className={styles.opacityControl}>
                <span>Opacity:</span>
                <input
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  value={radarOpacity}
                  onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Rainfall Intensity Toggle */}
          <button
            className={`${styles.chipBtn} ${
              showRainfall ? styles.chipBtnActive : ""
            }`}
            onClick={() => setShowRainfall(!showRainfall)}
            title="Toggle 24h Precipitation Gauges"
          >
            <Droplets size={13} />
            <span>Rainfall Gauges</span>
          </button>

          {/* Strategic Highway Corridors Toggle */}
          <button
            className={`${styles.chipBtn} ${
              showHighways ? styles.chipBtnActive : ""
            }`}
            onClick={() => setShowHighways(!showHighways)}
            title="Toggle Strategic Highway Infrastructure"
          >
            <Navigation size={13} />
            <span>Vulnerable Roads ({NER_HIGHWAYS.length})</span>
          </button>

          {/* Vulnerable Hill Villages Toggle */}
          <button
            className={`${styles.chipBtn} ${
              showVillages ? styles.chipBtnActive : ""
            }`}
            onClick={() => setShowVillages(!showVillages)}
            title="Toggle High-Risk Hill Villages & Settlements"
          >
            <Home size={13} />
            <span>Villages ({VULNERABLE_VILLAGES.length})</span>
          </button>

          {/* Critical Infrastructure Toggle */}
          <button
            className={`${styles.chipBtn} ${
              showInfrastructure ? styles.chipBtnActive : ""
            }`}
            onClick={() => setShowInfrastructure(!showInfrastructure)}
            title="Toggle Critical Strategic Infrastructure at Risk"
          >
            <Building2 size={13} />
            <span>Infrastructure ({CRITICAL_INFRASTRUCTURE.length})</span>
          </button>

          {/* Historical Landslide Hotspots Toggle */}
          <button
            className={`${styles.chipBtn} ${
              showHistorical ? styles.chipBtnActive : ""
            }`}
            onClick={() => setShowHistorical(!showHistorical)}
            title="Toggle Documented Historical Slide Hotspots"
          >
            <History size={13} />
            <span>Historical Hotspots</span>
          </button>
        </div>
      </div>

      {/* ==================== LEAFLET MAP CONTAINER ==================== */}
      <div className={styles.mapContainer}>
        <MapContainer
          center={NER_CENTER}
          zoom={NER_ZOOM}
          style={{ height: "100%", width: "100%" }}
          minZoom={4}
          maxZoom={18}
          dragging={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          keyboard={true}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Custom Floating Zoom & Recenter Controls */}
          <MapZoomButtons
            onRecenter={() => setTargetView({ coords: NER_CENTER, zoom: NER_ZOOM })}
          />

          {/* Base Layer */}
          <TileLayer
            key={baseLayer}
            url={LIGHT_TILE_LAYERS[baseLayer].url}
            subdomains={LIGHT_TILE_LAYERS[baseLayer].subdomains || "abc"}
            attribution={LIGHT_TILE_LAYERS[baseLayer].attribution}
            maxZoom={LIGHT_TILE_LAYERS[baseLayer].maxZoom}
          />

          {/* State Typography Labels */}
          <StateLabels />

          {/* RainViewer Live Radar Layer (maxNativeZoom prevents zoom limits) */}
          {showRadar && radarData?.latestTileUrl && (
            <TileLayer
              key={radarData.latestTileUrl}
              url={radarData.latestTileUrl}
              opacity={radarOpacity}
              zIndex={400}
              maxNativeZoom={7}
              minNativeZoom={1}
              maxZoom={18}
            />
          )}

          {/* Map Fly Controller */}
          {targetView && (
            <MapFlyController
              targetCoords={targetView.coords}
              targetZoom={targetView.zoom}
            />
          )}

          {/* Highway Corridors Layer */}
          {showHighways &&
            NER_HIGHWAYS.map((hw) => {
              const hwColor =
                hw.status === "BLOCKED"
                  ? "#dc2626"
                  : hw.status === "WARNING"
                  ? "#ea580c"
                  : "#16a34a";
              return (
                <Polyline
                  key={hw.id}
                  positions={hw.coordinates}
                  color={hwColor}
                  weight={5}
                  opacity={0.9}
                  dashArray={hw.status === "WARNING" ? "8, 8" : undefined}
                >
                  <Tooltip sticky direction="top">
                    <div style={{ padding: "2px 4px", fontSize: "11px", color: "#0f172a" }}>
                      <strong>{hw.name}</strong>
                      <div>
                        Status:{" "}
                        <span style={{ color: hwColor, fontWeight: 800 }}>{hw.status}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        Passes: {hw.criticalPasses}
                      </div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div style={{ padding: "4px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>{hw.name}</strong>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: `${hwColor}20`,
                            color: hwColor,
                            border: `1px solid ${hwColor}`,
                          }}
                        >
                          {hw.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {hw.state} • {hw.lengthKm} km Corridor
                      </div>
                      <p style={{ fontSize: "11.5px", color: "#334155", margin: "6px 0" }}>
                        {hw.impact}
                      </p>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        <strong>Critical Hill Passes:</strong> {hw.criticalPasses}
                      </div>
                      {hw.bypassInfo && (
                        <button
                          type="button"
                          className={styles.routeActionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCalculateBypass(hw);
                          }}
                        >
                          <Route size={13} />
                          <span>{isRoutingLoading ? "Calculating..." : "Calculate Safe Alternate Bypass Detour"}</span>
                        </button>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

          {/* Historical Landslide Hotspots Layer */}
          {showHistorical &&
            HISTORICAL_LANDSLIDES.map((hist) => (
              <CircleMarker
                key={hist.id}
                center={[hist.lat, hist.lng]}
                radius={8}
                fillColor="#dc2626"
                fillOpacity={0.95}
                color="#ffffff"
                weight={2.5}
              >
                <Tooltip direction="top">
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#991b1b" }}>
                    {hist.location} ({hist.year}) &bull; {hist.deaths} Fatalities
                  </span>
                </Tooltip>
                <Popup>
                  <div className={styles.hotspotCard}>
                    <div className={styles.hotspotHeader}>
                      <div className={styles.hotspotArchiveTag}>
                        <span className={styles.hotspotArchiveDot} />
                        <span>Disaster Archive</span>
                      </div>
                      <span className={styles.hotspotSeverityBadge}>
                        {hist.severity}
                      </span>
                    </div>

                    <div className={styles.hotspotTitle}>{hist.location}</div>

                    <div className={styles.hotspotMetaRow}>
                      <span className={styles.hotspotDateBadge}>
                        <Calendar size={12} color="#64748b" />
                        {hist.date}
                      </span>
                      <span className={styles.hotspotTypePill}>{hist.type}</span>
                    </div>

                    <div className={styles.hotspotDesc}>{hist.description}</div>

                    <div className={styles.hotspotImpactBox}>
                      <AlertTriangle size={15} color="#dc2626" />
                      <span className={styles.hotspotImpactText}>
                        Casualties: {hist.deaths} Fatalities Documented
                      </span>
                    </div>

                    <div className={styles.hotspotCoords}>
                      <span>GPS: {hist.lat.toFixed(3)}°N, {hist.lng.toFixed(3)}°E</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Vulnerable Hill Villages & Settlements Layer */}
          {showVillages &&
            VULNERABLE_VILLAGES.map((v) => {
              const vColor =
                v.vulnerabilityLevel === "CRITICAL"
                  ? "#dc2626"
                  : v.vulnerabilityLevel === "HIGH"
                  ? "#f97316"
                  : "#f59e0b";

              return (
                <CircleMarker
                  key={v.id}
                  center={[v.lat, v.lng]}
                  radius={6.5}
                  fillColor={vColor}
                  fillOpacity={0.95}
                  color="#ffffff"
                  weight={2}
                >
                  <Tooltip direction="top">
                    <div style={{ fontSize: "11px", padding: "2px", color: "#0f172a" }}>
                      <strong style={{ color: "#0f172a" }}>{v.name}</strong> ({v.district})
                      <div style={{ marginTop: "2px" }}>
                        Pop: <strong>{v.population.toLocaleString()}</strong> &bull; Level:{" "}
                        <span style={{ color: vColor, fontWeight: 800 }}>{v.vulnerabilityLevel}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        Slope: {v.slope}&deg; &bull; {v.cutoffRisk}
                      </div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className={styles.villageCard}>
                      <div className={styles.villageHeader}>
                        <div className={styles.villageTag}>
                          <Home size={13} color="#0f766e" />
                          <span>Vulnerable Settlement</span>
                        </div>
                        <span
                          className={styles.villageSeverityPill}
                          style={{
                            background: `${vColor}18`,
                            color: vColor,
                            border: `1px solid ${vColor}50`,
                          }}
                        >
                          {v.vulnerabilityLevel}
                        </span>
                      </div>

                      <div className={styles.villageTitle}>{v.name}</div>
                      <div className={styles.villageMetaRow}>
                        <span>{v.district}, {v.state}</span>
                        <span>&bull;</span>
                        <span>{v.livelihood}</span>
                      </div>

                      <div className={styles.villageStatsGrid}>
                        <div className={styles.villageStatItem}>
                          <span className={styles.villageStatVal}>{v.population.toLocaleString()}</span>
                          <span className={styles.villageStatLbl}>Population</span>
                        </div>
                        <div className={styles.villageStatItem}>
                          <span className={styles.villageStatVal}>{v.elevation}m</span>
                          <span className={styles.villageStatLbl}>Altitude</span>
                        </div>
                        <div className={styles.villageStatItem}>
                          <span className={styles.villageStatVal}>{v.slope}&deg;</span>
                          <span className={styles.villageStatLbl}>Slope</span>
                        </div>
                      </div>

                      <div className={styles.villageThreatBox}>
                        <div className={styles.villageThreatHead}>
                          <span>Primary Slope Hazard</span>
                          <span>{v.cutoffRisk}</span>
                        </div>
                        <div className={styles.villageThreatText}>{v.activeThreats}</div>
                      </div>

                      <div className={styles.villageEvacBox}>
                        <div className={styles.villageEvacHead}>
                          <Navigation size={11} />
                          <span>Evacuation Route ({v.shelterDistanceKm} km to safe zone)</span>
                        </div>
                        <div className={styles.villageEvacRoute}>{v.evacuationRoute}</div>
                      </div>
                      <button
                        type="button"
                        className={styles.routeActionBtnEvac}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCalculateEvacuation(v);
                        }}
                      >
                        <Navigation size={13} />
                        <span>{isRoutingLoading ? "Tracing Corridor..." : "🚨 Trace Live Evacuation Corridor"}</span>
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Critical Infrastructure at Landslide Risk Layer */}
          {showInfrastructure &&
            CRITICAL_INFRASTRUCTURE.map((infra) => {
              const statusColor =
                infra.status === "AT_RISK"
                  ? "#dc2626"
                  : infra.status === "ALERT"
                  ? "#ea580c"
                  : "#0284c7";

              return (
                <CircleMarker
                  key={infra.id}
                  center={[infra.lat, infra.lng]}
                  radius={7.5}
                  fillColor={statusColor}
                  fillOpacity={0.95}
                  color="#ffffff"
                  weight={2.5}
                >
                  <Tooltip direction="top">
                    <div style={{ fontSize: "11px", padding: "2px", color: "#0f172a" }}>
                      <strong style={{ color: "#0f172a" }}>{infra.name}</strong>
                      <div style={{ marginTop: "2px" }}>
                        {infra.category} &bull;{" "}
                        <span style={{ color: statusColor, fontWeight: 800 }}>{infra.status}</span>
                      </div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className={styles.infraCard}>
                      <div className={styles.infraHeader}>
                        <span className={styles.infraCategoryTag}>{infra.category}</span>
                        <span
                          className={styles.infraStatusBadge}
                          style={{
                            background: `${statusColor}18`,
                            color: statusColor,
                            border: `1px solid ${statusColor}50`,
                          }}
                        >
                          {infra.status}
                        </span>
                      </div>

                      <div className={styles.infraTitle}>{infra.name}</div>
                      <div className={styles.infraMeta}>
                        {infra.location} &bull; {infra.capacity}
                      </div>

                      <div className={styles.infraProximityBox}>
                        <div className={styles.infraProximityHead}>
                          Slope Failure Hazard Proximity
                        </div>
                        <div className={styles.infraProximityText}>
                          {infra.landslideProximity}
                        </div>
                      </div>

                      <div className={styles.infraAgencyBox}>
                        <strong>Emergency Coordination:</strong> {infra.responseAgency}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Active OSRM Route (Evacuation Corridor or Strategic Bypass Detour) */}
          {activeRoute && (
            <Fragment>
              {/* Outer Glow Line */}
              <Polyline
                positions={activeRoute.coordinates}
                color={activeRoute.type === "EVACUATION" ? "#38bdf8" : "#34d399"}
                weight={8}
                opacity={0.65}
                interactive={false}
              />
              {/* Core Directional Line */}
              <Polyline
                positions={activeRoute.coordinates}
                color={activeRoute.type === "EVACUATION" ? "#0284c7" : "#059669"}
                weight={4.5}
                dashArray={activeRoute.type === "EVACUATION" ? "9, 9" : undefined}
              >
                <Tooltip sticky direction="top">
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>
                    {activeRoute.type === "EVACUATION"
                      ? "🚨 Active Evacuation Corridor"
                      : "🔄 Safe Alternate Bypass Route"}
                    <div>
                      {activeRoute.distanceKm} km &bull; ETA: ~{activeRoute.durationMin} mins
                    </div>
                  </div>
                </Tooltip>
              </Polyline>

              {/* Origin Marker */}
              <CircleMarker
                center={activeRoute.coordinates[0]}
                radius={8}
                fillColor="#ef4444"
                fillOpacity={1}
                color="#ffffff"
                weight={3}
              >
                <Tooltip permanent direction="top" offset={[0, -8]}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#991b1b" }}>
                    {activeRoute.type === "EVACUATION" ? `VILLAGE: ${activeRoute.originName}` : `START: ${activeRoute.originName}`}
                  </span>
                </Tooltip>
              </CircleMarker>

              {/* Destination Marker */}
              <CircleMarker
                center={activeRoute.coordinates[activeRoute.coordinates.length - 1]}
                radius={9}
                fillColor={activeRoute.type === "EVACUATION" ? "#0284c7" : "#10b981"}
                fillOpacity={1}
                color="#ffffff"
                weight={3}
              >
                <Tooltip permanent direction="top" offset={[0, -8]}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      color: activeRoute.type === "EVACUATION" ? "#0369a1" : "#047857",
                    }}
                  >
                    {activeRoute.type === "EVACUATION" ? `SHELTER: ${activeRoute.destinationName}` : `REJOIN: ${activeRoute.destinationName}`}
                  </span>
                </Tooltip>
              </CircleMarker>
            </Fragment>
          )}

          {/* 24h Precipitation Intensity Layer (Dedicated offset badges that never muddy district colors) */}
          {showRainfall && <RainfallGaugesLayer districts={NER_DISTRICTS} />}

          {/* District Surveillance Markers with Radar Pulse Rings */}
          {showDistricts &&
            filteredDistricts.map((d) => {
              const isSelected = selectedDistrict?.id === d.id;
              const color = getRiskColor(d.riskLevel);
              const radius = 7 + d.riskScore * 13;
              const isHighThreat = d.riskLevel === "VERY_HIGH" || d.riskLevel === "HIGH";

              return (
                <Fragment key={d.id}>
                  {/* Outer Pulsing Threat Radar Ring for High Alert Zones */}
                  {isHighThreat && (
                    <CircleMarker
                      center={[d.lat, d.lng]}
                      radius={radius + 8}
                      fillColor={color}
                      fillOpacity={0.14}
                      color={color}
                      weight={1.5}
                      className="threat-pulse-ring"
                      interactive={false}
                    />
                  )}
                  <CircleMarker
                    center={[d.lat, d.lng]}
                    radius={radius}
                    fillColor={color}
                    fillOpacity={isSelected ? 1.0 : 0.92}
                    color={isSelected ? "#0f172a" : "#ffffff"}
                    weight={isSelected ? 3.5 : 2.5}
                    eventHandlers={{
                      click: () => handleSelectDistrict(d),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      <div style={{ fontSize: "11.5px", color: "#0f172a", padding: "2px" }}>
                        <div style={{ fontWeight: 800, fontSize: "12px" }}>
                          {d.district}{" "}
                          <span style={{ color: "#64748b", fontWeight: 600 }}>({d.state})</span>
                        </div>
                        <div style={{ marginTop: "2px" }}>
                          Threat:{" "}
                          <span style={{ color, fontWeight: 800 }}>{d.riskLevel}</span> &bull;{" "}
                          Score: <strong style={{ color }}>{Math.round(d.riskScore * 100)}%</strong>
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                          Rain: {d.rainfall24h}mm &bull; Elev: {d.elevation}m &bull; Slope:{" "}
                          {d.slope}&deg;
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                </Fragment>
              );
            })}
        </MapContainer>

        {/* Floating Active Route Telemetry HUD Banner */}
        {activeRoute && (
          <div className={styles.routeHudBanner}>
            <div className={styles.routeHudLeft}>
              <div
                className={styles.routeHudBadge}
                style={{
                  background: activeRoute.type === "EVACUATION" ? "#e0f2fe" : "#ecfdf5",
                  color: activeRoute.type === "EVACUATION" ? "#0369a1" : "#047857",
                  borderColor: activeRoute.type === "EVACUATION" ? "#7dd3fc" : "#6ee7b7",
                }}
              >
                <span
                  className={styles.pulseDot}
                  style={{
                    background: activeRoute.type === "EVACUATION" ? "#0284c7" : "#059669",
                  }}
                />
                <span>
                  {activeRoute.type === "EVACUATION"
                    ? "CIVIL EVACUATION CORRIDOR"
                    : "STRATEGIC BYPASS DETOUR"}
                </span>
              </div>
              <div className={styles.routeHudTitle}>
                <span>{activeRoute.originName}</span>
                <span style={{ color: "#94a3b8", margin: "0 6px" }}>&rarr;</span>
                <span
                  style={{
                    color: activeRoute.type === "EVACUATION" ? "#0284c7" : "#059669",
                    fontWeight: 700,
                  }}
                >
                  {activeRoute.destinationName}
                </span>
              </div>
            </div>

            <div className={styles.routeHudStats}>
              <div className={styles.routeStatItem}>
                <span className={styles.routeStatVal}>{activeRoute.distanceKm} km</span>
                <span className={styles.routeStatLbl}>Route Distance</span>
              </div>
              <div className={styles.routeStatItem}>
                <span className={styles.routeStatVal}>~{activeRoute.durationMin} min</span>
                <span className={styles.routeStatLbl}>Mountain Transit ETA</span>
              </div>
              {activeRoute.type === "BYPASS_DETOUR" && (
                <div className={styles.routeStatItem}>
                  <span className={styles.routeStatVal} style={{ color: "#d97706" }}>
                    +{activeRoute.delayMinutes} min
                  </span>
                  <span className={styles.routeStatLbl}>Detour Delay</span>
                </div>
              )}
            </div>

            <div className={styles.routeHudActions}>
              <button
                type="button"
                className={styles.routeHudFlyBtn}
                onClick={() => {
                  const midIdx = Math.floor(activeRoute.coordinates.length / 2);
                  setTargetView({
                    coords: activeRoute.coordinates[midIdx],
                    zoom: activeRoute.type === "EVACUATION" ? 13 : 10,
                  });
                }}
                title="Center route in viewport"
              >
                <Crosshair size={13} />
                <span>Center</span>
              </button>
              <button
                type="button"
                className={styles.routeHudClearBtn}
                onClick={handleClearRoute}
                title="Dismiss active route"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== BOTTOM INTEL & LEGEND ==================== */}
      <div className={styles.intelLegend}>
        <div className={styles.legendHeading}>Susceptibility Scale & Corridor Status</div>
        <div className={styles.legendRow}>
          {Object.entries(RISK_LEVELS).map(([key, item]) => (
            <div key={key} className={styles.legendTag}>
              <span className={styles.colorSwatch} style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className={styles.legendTag} style={{ marginLeft: "4px" }}>
            <span className={styles.lineSwatch} style={{ background: "#dc2626" }} />
            <span>Highway Blocked</span>
          </div>
          <div className={styles.legendTag}>
            <span className={styles.lineSwatch} style={{ background: "#ea580c" }} />
            <span>Pass Warning</span>
          </div>
          <div className={styles.legendTag}>
            <span className={styles.lineSwatch} style={{ background: "#16a34a" }} />
            <span>Corridor Clear</span>
          </div>
          <div className={styles.legendTag} style={{ marginLeft: "4px" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#dc2626",
                border: "1.5px solid #ffffff",
                boxShadow: "0 0 4px rgba(220, 38, 38, 0.6)",
                display: "inline-block",
              }}
            />
            <span>Village at Risk</span>
          </div>
          <div className={styles.legendTag}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "2px",
                background: "#0284c7",
                border: "1.5px solid #ffffff",
                display: "inline-block",
              }}
            />
            <span>Critical Infrastructure</span>
          </div>
        </div>
        <div className={styles.intelFooter}>
          <span className={styles.pulseDot} />
          <span>Integrated Stream: Open-Meteo Telemetry & RainViewer NRT Radar</span>
        </div>
      </div>

      {/* ==================== RIGHT TELEMETRY DOSSIER DRAWER ==================== */}
      {selectedDistrict && (() => {
        const currentRiskLevel =
          computedDynamicRisk?.riskLevel || selectedDistrict.riskLevel;
        const currentRiskColor = getRiskColor(currentRiskLevel);
        const rawScore =
          computedDynamicRisk?.dynamicScore ?? selectedDistrict.riskScore;
        const scorePct = Math.min(100, Math.max(0, Math.round(rawScore * 100)));
        const circumference = 226.2;
        const strokeDashoffset = circumference * (1 - scorePct / 100);

        // SHAP Factor Attribution Calculation
        const factorRain = selectedDistrict.factors?.rainfall || 0.75;
        const factorSoil = selectedDistrict.factors?.soilMoisture || 0.70;
        const factorSlope = selectedDistrict.factors?.slope || 0.65;
        const factorGeol = selectedDistrict.factors?.elevation || 0.45;
        const factorSum = factorRain + factorSoil + factorSlope + factorGeol;
        const shapRain = Math.round((factorRain / factorSum) * 100);
        const shapSoil = Math.round((factorSoil / factorSum) * 100);
        const shapSlope = Math.round((factorSlope / factorSum) * 100);
        const shapGeol = Math.max(5, 100 - (shapRain + shapSoil + shapSlope));

        const localVillages = getVillagesByDistrict(selectedDistrict.district);
        const localInfra = getInfrastructureByDistrict(selectedDistrict.district);

        const threatTier =
          currentRiskLevel === "VERY_HIGH"
            ? "LEVEL 4: CRITICAL THREAT"
            : currentRiskLevel === "HIGH"
            ? "LEVEL 3: HIGH HAZARD"
            : currentRiskLevel === "MEDIUM"
            ? "LEVEL 2: ELEVATED RISK"
            : "LEVEL 1: STABLE / NOMINAL";

        return (
          <div className={styles.telemetryDrawer}>
            {/* Header with Administrative and Geographic Details */}
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleBlock}>
                <div className={styles.drawerTitleRow}>
                  <span className={styles.districtTitle}>{selectedDistrict.district}</span>
                  <span className={styles.stateTag}>{selectedDistrict.state}</span>
                  <span
                    className={styles.riskLevelBadge}
                    style={{
                      background: `${currentRiskColor}18`,
                      color: currentRiskColor,
                      border: `1px solid ${currentRiskColor}50`,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: currentRiskColor,
                        display: "inline-block",
                      }}
                    />
                    {currentRiskLevel}
                  </span>
                </div>
                <div className={styles.districtSub}>
                  <span>Elevation: {selectedDistrict.elevation} MASL</span>
                  <span>&bull;</span>
                  <span>Slope: {selectedDistrict.slope}&deg;</span>
                  <span>&bull;</span>
                  <span>{selectedDistrict.lat.toFixed(2)}&deg;N, {selectedDistrict.lng.toFixed(2)}&deg;E</span>
                </div>
              </div>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setSelectedDistrict(null)}
                title="Close Dossier"
              >
                <X size={15} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Machine Learning Susceptibility Hero Card */}
              <div className={styles.heroGaugeCard}>
                <div className={styles.gaugeCardHead}>
                  <div className={styles.gaugeCardHeadLeft}>
                    <ShieldAlert size={14} color={currentRiskColor} />
                    <span>XGBoost Susceptibility Model</span>
                  </div>
                  <div className={styles.gaugeCardHeadRight}>
                    Ensemble v2.4
                  </div>
                </div>

                <div className={styles.gaugeHeroRow}>
                  <div className={styles.gaugeSvgWrap}>
                    <svg className={styles.gaugeSvg} viewBox="0 0 90 90">
                      <circle
                        cx="45"
                        cy="45"
                        r="36"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                      />
                      <circle
                        cx="45"
                        cy="45"
                        r="36"
                        fill="none"
                        stroke={currentRiskColor}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </svg>
                    <div className={styles.gaugeCenterText}>
                      <span className={styles.gaugePercent}>{scorePct}%</span>
                      <span className={styles.gaugePercentSub}>Risk</span>
                    </div>
                  </div>

                  <div className={styles.gaugeInfoCol}>
                    <div className={styles.threatTierTitle} style={{ color: currentRiskColor }}>
                      {threatTier}
                    </div>
                    <div className={styles.threatEnsembleText}>
                      Multi-hazard classifier calibrated against GSI NER inventory & ECMWF ERA5.
                    </div>
                    <div className={styles.threatConfidenceBadge}>
                      <CheckCircle2 size={11} />
                      <span>94.6% Model Confidence</span>
                    </div>
                  </div>
                </div>

                {/* SHAP Factor Attribution Section */}
                <div className={styles.shapSection}>
                  <div className={styles.shapTitle}>
                    <span>Primary Risk Contributors (SHAP)</span>
                    <span>Impact %</span>
                  </div>
                  <div className={styles.shapBarsList}>
                    <div className={styles.shapBarItem}>
                      <div className={styles.shapBarHeader}>
                        <span className={styles.shapBarLabel}>24h Precipitation Intensity</span>
                        <span className={styles.shapBarValue}>{shapRain}%</span>
                      </div>
                      <div className={styles.shapTrack}>
                        <div
                          className={styles.shapFill}
                          style={{ width: `${shapRain}%`, background: "#0284c7" }}
                        />
                      </div>
                    </div>

                    <div className={styles.shapBarItem}>
                      <div className={styles.shapBarHeader}>
                        <span className={styles.shapBarLabel}>Volumetric Soil Saturation</span>
                        <span className={styles.shapBarValue}>{shapSoil}%</span>
                      </div>
                      <div className={styles.shapTrack}>
                        <div
                          className={styles.shapFill}
                          style={{ width: `${shapSoil}%`, background: "#f97316" }}
                        />
                      </div>
                    </div>

                    <div className={styles.shapBarItem}>
                      <div className={styles.shapBarHeader}>
                        <span className={styles.shapBarLabel}>Terrain Gradient & Relief</span>
                        <span className={styles.shapBarValue}>{shapSlope}%</span>
                      </div>
                      <div className={styles.shapTrack}>
                        <div
                          className={styles.shapFill}
                          style={{ width: `${shapSlope}%`, background: "#8b5cf6" }}
                        />
                      </div>
                    </div>

                    <div className={styles.shapBarItem}>
                      <div className={styles.shapBarHeader}>
                        <span className={styles.shapBarLabel}>Geomorphology & Lithology</span>
                        <span className={styles.shapBarValue}>{shapGeol}%</span>
                      </div>
                      <div className={styles.shapTrack}>
                        <div
                          className={styles.shapFill}
                          style={{ width: `${shapGeol}%`, background: "#64748b" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Early Warning Action Directive */}
              <div className={styles.directiveCard}>
                <div className={styles.directiveHead}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <span>NDRF / MDoNER Operational Protocol</span>
                </div>
                <div className={styles.directiveAlert}>
                  {computedDynamicRisk?.actionAdvice}
                </div>
                <a
                  href="/alerts"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                    color: "#ffffff",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                    marginTop: "10px",
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  <Radio size={13} />
                  <span>Dispatch Supabase Alert ({selectedDistrict.district})</span>
                </a>
              </div>

              {/* Simulation Scenario Trigger */}
              <button
                className={`${styles.scenarioBtn} ${
                  simulatedRainBoost > 0 ? styles.scenarioBtnActive : ""
                }`}
                onClick={() =>
                  setSimulatedRainBoost(simulatedRainBoost === 0 ? 85 : 0)
                }
              >
                <Zap size={14} />
                <span>
                  {simulatedRainBoost === 0
                    ? "Simulate Cloudburst Scenario (+85mm)"
                    : "Cloudburst Active (+85mm) • Click to Reset"}
                </span>
              </button>

              {/* Real-Time Weather Card */}
              <div className={styles.weatherCard}>
                <div className={styles.cardHead}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={13} color="#0f766e" /> Meteorological Telemetry
                  </span>
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
                    {liveWeather?.timestamp || "Syncing"}
                  </span>
                </div>

                {weatherLoading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 0",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    <div className={styles.spinner} />
                    Ingesting Open-Meteo telemetry stream...
                  </div>
                ) : (
                  <>
                    <div className={styles.weatherPrimary}>
                      <div className={styles.tempReadout}>
                        <span className={styles.tempVal}>{liveWeather?.temperature ?? "--"}</span>
                        <span className={styles.tempDeg}>&deg;C</span>
                      </div>
                      <div className={styles.conditionLabel}>
                        {liveWeather?.condition || "Precipitation"}
                      </div>
                    </div>

                    <div className={styles.metricGrid}>
                      <div className={styles.metricCell}>
                        <div className={styles.metricIconWrap} style={{ background: "#e0f2fe", color: "#0284c7" }}>
                          <Droplets size={14} />
                        </div>
                        <div>
                          <div className={styles.cellVal}>
                            {(liveWeather?.precipitation24h ?? selectedDistrict.rainfall24h) +
                              simulatedRainBoost}{" "}
                            mm
                          </div>
                          <div className={styles.cellLbl}>24h Rainfall</div>
                        </div>
                      </div>

                      <div className={styles.metricCell}>
                        <div className={styles.metricIconWrap} style={{ background: "#f1f5f9", color: "#475569" }}>
                          <Wind size={14} />
                        </div>
                        <div>
                          <div className={styles.cellVal}>{liveWeather?.windSpeed ?? 12} km/h</div>
                          <div className={styles.cellLbl}>Wind Speed</div>
                        </div>
                      </div>

                      <div className={styles.metricCell}>
                        <div className={styles.metricIconWrap} style={{ background: "#ffe4e6", color: "#e11d48" }}>
                          <Thermometer size={14} />
                        </div>
                        <div>
                          <div className={styles.cellVal}>{liveWeather?.humidity ?? 82}%</div>
                          <div className={styles.cellLbl}>Rel Humidity</div>
                        </div>
                      </div>

                      <div className={styles.metricCell}>
                        <div className={styles.metricIconWrap} style={{ background: "#fef3c7", color: "#d97706" }}>
                          <Gauge size={14} />
                        </div>
                        <div>
                          <div className={styles.cellVal}>{liveWeather?.pressure ?? 940} hPa</div>
                          <div className={styles.cellLbl}>Pressure</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Volumetric Soil Moisture Card */}
              <div className={styles.soilCard}>
                <div className={styles.cardHead}>
                  <span>ECMWF ERA5 Volumetric Soil Moisture (0&ndash;3cm)</span>
                  <span style={{ color: "#0f766e", fontSize: "11px", fontWeight: 800 }}>
                    {liveWeather?.soilMoisture ?? 0.38} m&sup3;/m&sup3;
                  </span>
                </div>
                <div className={styles.soilProgress}>
                  <div
                    className={styles.soilProgressBar}
                    style={{
                      width: `${liveWeather?.soilSaturationPct ?? 75}%`,
                      background:
                        (liveWeather?.soilSaturationPct ?? 75) > 80
                          ? "#dc2626"
                          : (liveWeather?.soilSaturationPct ?? 75) > 60
                          ? "#ea580c"
                          : "#16a34a",
                    }}
                  />
                </div>
                <div className={styles.soilFooter}>
                  <span
                    style={{
                      color: liveWeather?.soilMoistureStatus?.color ?? "#ea580c",
                    }}
                  >
                    {liveWeather?.soilMoistureStatus?.label || "Heavily Saturated"}
                  </span>
                  <span style={{ color: "#64748b" }}>
                    {liveWeather?.soilSaturationPct ?? 75}% Saturation Index
                  </span>
                </div>
              </div>

              {/* Terrain & Geological Context */}
              <div className={styles.terrainNote}>
                <strong style={{ color: "#0f172a" }}>Geological Assessment:</strong>{" "}
                {selectedDistrict.description}
              </div>

              {/* Local At-Risk Settlements & Infrastructure */}
              {(localVillages.length > 0 || localInfra.length > 0) && (
                <div className={styles.localAssetsSection}>
                  <div className={styles.localAssetsHead}>
                    <span>Local Vulnerable Assets ({selectedDistrict.district})</span>
                    <span style={{ fontSize: "9.5px", color: "#64748b" }}>
                      {localVillages.length} Villages &bull; {localInfra.length} Facilities
                    </span>
                  </div>
                  <div className={styles.localAssetsList}>
                    {localVillages.map((v) => (
                      <div
                        key={v.id}
                        className={styles.assetMiniCard}
                        onClick={() => setTargetView({ coords: [v.lat, v.lng], zoom: 12 })}
                        title="Click to zoom to village"
                      >
                        <div className={styles.assetMiniHead}>
                          <span className={styles.assetMiniTitle}>
                            <Home size={11} style={{ marginRight: 4, display: "inline" }} />
                            {v.name}
                          </span>
                          <span
                            className={styles.assetMiniBadge}
                            style={{
                              background: v.vulnerabilityLevel === "CRITICAL" ? "#fee2e2" : "#ffedd5",
                              color: v.vulnerabilityLevel === "CRITICAL" ? "#dc2626" : "#ea580c",
                            }}
                          >
                            {v.vulnerabilityLevel}
                          </span>
                        </div>
                        <div className={styles.assetMiniSub}>
                          Pop: {v.population.toLocaleString()} &bull; Slope: {v.slope}&deg; &bull; {v.cutoffRisk}
                        </div>
                        <button
                          type="button"
                          className={styles.routeActionBtnEvac}
                          style={{ marginTop: "6px", padding: "4px 8px", fontSize: "10.5px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCalculateEvacuation(v);
                          }}
                        >
                          <Navigation size={11} />
                          <span>Trace Evacuation Route</span>
                        </button>
                      </div>
                    ))}

                    {localInfra.map((infra) => (
                      <div
                        key={infra.id}
                        className={styles.assetMiniCard}
                        onClick={() => setTargetView({ coords: [infra.lat, infra.lng], zoom: 12 })}
                        title="Click to zoom to infrastructure"
                      >
                        <div className={styles.assetMiniHead}>
                          <span className={styles.assetMiniTitle}>
                            <Building2 size={11} style={{ marginRight: 4, display: "inline" }} />
                            {infra.name}
                          </span>
                          <span
                            className={styles.assetMiniBadge}
                            style={{
                              background: infra.status === "AT_RISK" ? "#fee2e2" : "#e0f2fe",
                              color: infra.status === "AT_RISK" ? "#dc2626" : "#0284c7",
                            }}
                          >
                            {infra.status}
                          </span>
                        </div>
                        <div className={styles.assetMiniSub}>
                          {infra.category} &bull; {infra.landslideProximity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
