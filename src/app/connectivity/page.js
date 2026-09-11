"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Route,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Home,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { NER_HIGHWAYS, VULNERABLE_VILLAGES } from "@/data/nerData";
import { getHighwayBypassRoute } from "@/services/routingService";
import styles from "./connectivity.module.css";

export default function ConnectivityPage() {
  const [activeBypass, setActiveBypass] = useState(null);
  const [loadingBypassId, setLoadingBypassId] = useState(null);

  // Compute stats
  const totalHighways = NER_HIGHWAYS.length;
  const blockedHighways = NER_HIGHWAYS.filter((h) => h.status === "BLOCKED").length;
  const warningHighways = NER_HIGHWAYS.filter((h) => h.status === "WARNING").length;
  const openHighways = NER_HIGHWAYS.filter((h) => h.status === "OPEN").length;

  // Filter villages with cutoff risk
  const cutoffVillages = VULNERABLE_VILLAGES.filter(
    (v) => v.vulnerabilityLevel === "CRITICAL"
  );

  const handleComputeBypass = async (highway) => {
    setLoadingBypassId(highway.id);
    try {
      const bypass = await getHighwayBypassRoute(highway);
      setActiveBypass({ highway, bypass });
    } catch (e) {
      console.warn("Bypass calculation error", e);
    }
    setLoadingBypassId(null);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>
            <Route size={26} color="#2dd4bf" />
            <span>Strategic Highway Connectivity & Cutoff Monitor</span>
          </h1>
          <p>
            Real-time status of critical mountain corridors across North-East India
            • OSRM Emergency Bypass Engine & Cutoff Village Tracking
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(45, 212, 191, 0.15)",
            color: "#2dd4bf",
            border: "1px solid rgba(45, 212, 191, 0.3)",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <Navigation size={14} />
          <span>View Corridors on 3D GIS Map</span>
        </Link>
      </div>

      {/* KPI Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(45, 212, 191, 0.15)", color: "#2dd4bf" }}
          >
            <Route size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{totalHighways}</div>
            <div className={styles.kpiLabel}>Strategic Hill Corridors</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
          >
            <AlertOctagon size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{blockedHighways}</div>
            <div className={styles.kpiLabel}>Critical Blockages / Slips</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(249, 115, 22, 0.15)", color: "#f97316" }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{warningHighways}</div>
            <div className={styles.kpiLabel}>Single-Lane Advisories</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{openHighways}</div>
            <div className={styles.kpiLabel}>Fully Open Arteries</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Highways on Left, Cutoff Settlements on Right */}
      <div className={styles.layoutGrid}>
        {/* Left: Strategic Highway Cards */}
        <div className={styles.highwayList}>
          {NER_HIGHWAYS.map((hw) => {
            const badgeClass =
              hw.status === "BLOCKED"
                ? styles.badgeBlocked
                : hw.status === "WARNING"
                ? styles.badgeWarning
                : styles.badgeOpen;

            return (
              <div key={hw.id} className={styles.highwayCard}>
                <div className={styles.highwayCardHeader}>
                  <div className={styles.hwTitleGroup}>
                    <span className={styles.hwName}>{hw.name}</span>
                    <span className={`${styles.hwBadge} ${badgeClass}`}>
                      {hw.status}
                    </span>
                  </div>

                  <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                    {hw.lengthKm} km &bull; {hw.type}
                  </span>
                </div>

                <div className={styles.hwDetails}>{hw.description}</div>

                <div className={styles.hwMetricsRow}>
                  <div>
                    <strong>Critical Passes:</strong> {hw.criticalPasses}
                  </div>
                  <div>
                    <strong>Jurisdiction:</strong> {hw.state} (BRO / NHIDCL)
                  </div>
                  <div>
                    <strong>Est. Daily Traffic:</strong> {hw.dailyTraffic?.toLocaleString() || "4,500"} vehicles
                  </div>

                  {hw.status !== "OPEN" && (
                    <button
                      className={styles.bypassActionBtn}
                      onClick={() => handleComputeBypass(hw)}
                    >
                      <Navigation size={12} />
                      <span>
                        {loadingBypassId === hw.id
                          ? "Routing OSRM..."
                          : "Compute OSRM Bypass Corridor"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Inline OSRM Bypass Readout */}
                {activeBypass?.highway?.id === hw.id && (
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      border: "1px dashed rgba(45, 212, 191, 0.4)",
                      marginTop: "6px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#2dd4bf",
                        fontSize: "12.5px",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Navigation size={14} />
                        <span>Calculated Emergency Bypass Corridor</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        OSRM Live Engine
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      {activeBypass.bypass.summary}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "11.5px",
                        color: "#94a3b8",
                      }}
                    >
                      <span>
                        Distance:{" "}
                        <strong style={{ color: "#f8fafc" }}>
                          {activeBypass.bypass.distanceKm} km
                        </strong>
                      </span>
                      <span>
                        Transit Time:{" "}
                        <strong style={{ color: "#f8fafc" }}>
                          {activeBypass.bypass.durationMin} min
                        </strong>
                      </span>
                      <span style={{ color: "#4ade80", fontWeight: 600 }}>
                        Clearance: 4x4 / Light Emergency Vehicles Only
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Cutoff Vulnerable Settlements */}
        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>
              <Home size={16} color="#ef4444" />
              <span>Isolated Settlements at Cutoff Risk</span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "12px",
                lineHeight: 1.4,
              }}
            >
              Hill settlements with single-point-of-failure mountain road access.
              Prioritized for aerial supply drops and emergency SDRF dispatch.
            </p>

            <div className={styles.cutoffList}>
              {cutoffVillages.map((v) => (
                <div key={v.id} className={styles.cutoffItem}>
                  <div className={styles.cutoffHead}>
                    <span>{v.name}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#ef4444",
                        background: "rgba(239, 68, 68, 0.15)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      CRITICAL
                    </span>
                  </div>

                  <div className={styles.cutoffSub}>
                    District: {v.district} &bull; Pop: {v.population.toLocaleString()} &bull; Slope: {v.slope}&deg;
                  </div>

                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "#cbd5e1",
                      marginTop: "2px",
                    }}
                  >
                    Threat: {v.cutoffRisk}
                  </div>

                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "#2dd4bf",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>Relief Shelter: {v.shelter}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
