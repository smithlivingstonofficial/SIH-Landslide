"use client";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { NER_DISTRICTS, RISK_LEVELS, getRiskColor, NER_STATES } from "@/data/nerData";
import styles from "./DashboardMap.module.css";

// NER center coordinates and zoom
const NER_CENTER = [25.8, 92.5];
const NER_ZOOM = 7;

// Custom map bounds for NER
const NER_BOUNDS = [
  [22.0, 88.0], // Southwest
  [29.5, 97.5], // Northeast
];

function getMarkerRadius(riskScore) {
  return 6 + riskScore * 12; // 6–18px based on risk
}

function getMarkerOpacity(riskLevel) {
  const map = {
    VERY_HIGH: 0.95,
    HIGH: 0.85,
    MEDIUM: 0.7,
    LOW: 0.55,
    VERY_LOW: 0.4,
  };
  return map[riskLevel] || 0.5;
}

function PopupContent({ district }) {
  const riskColor = getRiskColor(district.riskLevel);
  const riskLabel = RISK_LEVELS[district.riskLevel]?.label || district.riskLevel;

  return (
    <div className={styles.popup}>
      <div className={styles.popupHeader}>
        <div>
          <h3 className={styles.popupTitle}>{district.district}</h3>
          <p className={styles.popupState}>{district.state}</p>
        </div>
        <span
          className={styles.popupBadge}
          style={{
            background: `${riskColor}22`,
            color: riskColor,
            borderColor: `${riskColor}44`,
          }}
        >
          {riskLabel}
        </span>
      </div>

      <div className={styles.popupStats}>
        <div className={styles.popupStat}>
          <span className={styles.popupLabel}>Risk Score</span>
          <span className={styles.popupValue} style={{ color: riskColor }}>
            {Math.round(district.riskScore * 100)}%
          </span>
        </div>
        <div className={styles.popupStat}>
          <span className={styles.popupLabel}>Rainfall (24h)</span>
          <span className={styles.popupValue}>{district.rainfall24h} mm</span>
        </div>
        <div className={styles.popupStat}>
          <span className={styles.popupLabel}>Slope</span>
          <span className={styles.popupValue}>{district.slope}°</span>
        </div>
        <div className={styles.popupStat}>
          <span className={styles.popupLabel}>Elevation</span>
          <span className={styles.popupValue}>{district.elevation}m</span>
        </div>
      </div>

      {/* Factor Bars */}
      <div className={styles.popupFactors}>
        <span className={styles.popupLabel}>Key Factors</span>
        {Object.entries(district.factors).map(([key, val]) => (
          <div key={key} className={styles.factorRow}>
            <span className={styles.factorName}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
            <div className={styles.factorBar}>
              <div
                className={styles.factorFill}
                style={{
                  width: `${val * 100}%`,
                  background:
                    val > 0.7
                      ? "#ef4444"
                      : val > 0.5
                      ? "#f59e0b"
                      : "#22c55e",
                }}
              />
            </div>
            <span className={styles.factorVal}>{Math.round(val * 100)}%</span>
          </div>
        ))}
      </div>

      <p className={styles.popupDesc}>{district.description}</p>
    </div>
  );
}

// Component to add state label markers
function StateLabels() {
  const map = useMap();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");

    NER_STATES.forEach((state) => {
      const label = L.divIcon({
        className: styles.stateLabel,
        html: `<span>${state.name}</span>`,
        iconSize: [120, 20],
        iconAnchor: [60, 10],
      });
      L.marker([state.lat, state.lng], { icon: label, interactive: false }).addTo(map);
    });
  }, [map]);

  return null;
}

export default function DashboardMap() {
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  return (
    <MapContainer
      center={NER_CENTER}
      zoom={NER_ZOOM}
      style={{ height: "100%", width: "100%", minHeight: "450px" }}
      maxBounds={NER_BOUNDS}
      maxBoundsViscosity={0.8}
      minZoom={6}
      maxZoom={13}
      zoomControl={true}
      attributionControl={true}
    >
      {/* Dark-themed OpenStreetMap tiles */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
      />

      {/* State Labels */}
      <StateLabels />

      {/* District Risk Markers */}
      {NER_DISTRICTS.map((district) => (
        <CircleMarker
          key={district.id}
          center={[district.lat, district.lng]}
          radius={getMarkerRadius(district.riskScore)}
          fillColor={getRiskColor(district.riskLevel)}
          fillOpacity={getMarkerOpacity(district.riskLevel)}
          color={getRiskColor(district.riskLevel)}
          weight={2}
          opacity={0.8}
          eventHandlers={{
            click: () => setSelectedDistrict(district),
          }}
        >
          <Popup maxWidth={320} minWidth={280}>
            <PopupContent district={district} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
