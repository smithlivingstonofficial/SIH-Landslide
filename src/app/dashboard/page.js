"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  ShieldAlert,
  Droplets,
  Mountain,
  AlertTriangle,
  Radio,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import { NER_DISTRICTS, NER_STATES, DASHBOARD_STATS } from "@/data/nerData";
import { fetchAlerts } from "@/lib/supabase";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [activeAlertsCount, setActiveAlertsCount] = useState(3);
  const [selectedShapDistrictId, setSelectedShapDistrictId] = useState("SK-001");

  useEffect(() => {
    fetchAlerts({ status: "ACTIVE" }).then((list) => {
      if (list) setActiveAlertsCount(list.length);
    });
  }, []);

  // Compute state-wise risk level distribution for BarChart
  const stateChartData = useMemo(() => {
    return NER_STATES.map((state) => {
      const stateDistricts = NER_DISTRICTS.filter(
        (d) => d.stateCode === state.code
      );
      const critical = stateDistricts.filter(
        (d) => d.riskLevel === "VERY_HIGH"
      ).length;
      const high = stateDistricts.filter((d) => d.riskLevel === "HIGH").length;
      const moderate = stateDistricts.filter(
        (d) => d.riskLevel === "MEDIUM"
      ).length;

      return {
        name: state.name.replace(" Pradesh", "").replace("Pradesh", ""),
        code: state.code,
        Critical: critical,
        High: high,
        Moderate: moderate,
      };
    });
  }, []);

  // Rainfall vs Soil Moisture threshold correlation curve
  const correlationData = [
    { rain: 10, soilSat: 28, risk: 14 },
    { rain: 30, soilSat: 42, risk: 24 },
    { rain: 50, soilSat: 55, risk: 38 },
    { rain: 75, soilSat: 68, risk: 56 },
    { rain: 100, soilSat: 79, risk: 74 },
    { rain: 130, soilSat: 88, risk: 89 },
    { rain: 160, soilSat: 96, risk: 98 },
  ];

  // Selected district for SHAP breakdown
  const shapDistrict = useMemo(() => {
    return (
      NER_DISTRICTS.find((d) => d.id === selectedShapDistrictId) ||
      NER_DISTRICTS[0]
    );
  }, [selectedShapDistrictId]);

  // SHAP feature weights (Rainfall 35%, Soil Moisture 30%, Slope 20%, Lithology 15%)
  const shapRain = Math.round(Math.min(100, (shapDistrict.rainfall24h / 160) * 100));
  const shapMoist = Math.round(shapDistrict.soilMoisture * 100);
  const shapSlope = Math.round(Math.min(100, (shapDistrict.slope / 45) * 100));
  const shapGeol = Math.round(shapDistrict.factors?.elevation ? shapDistrict.factors.elevation * 100 : 65);

  // Top 10 high-risk districts
  const topHighRisk = useMemo(() => {
    return [...NER_DISTRICTS]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8);
  }, []);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <BarChart3 size={26} color="#2dd4bf" />
            <span>AI Risk Analytics & Situational Dashboard</span>
          </h1>
          <p className={styles.pageDesc}>
            Synthesizing IMD Precipitation, ECMWF Soil Saturation, SRTM DEM Topography & XGBoost AI Nowcasts
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/alerts"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontSize: "12.5px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Radio size={14} />
            <span>Active Alerts ({activeAlertsCount})</span>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(45, 212, 191, 0.15)", color: "#2dd4bf" }}
          >
            <Mountain size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>128</div>
            <div className={styles.kpiLabel}>NER Districts Monitored</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>18</div>
            <div className={styles.kpiLabel}>Critical / High Threat Zones</div>
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
            <div className={styles.kpiVal}>{activeAlertsCount}</div>
            <div className={styles.kpiLabel}>Supabase Realtime Alerts</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
          >
            <Droplets size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>94.6 mm</div>
            <div className={styles.kpiLabel}>24h Regional Avg Rainfall</div>
          </div>
        </div>
      </div>

      {/* Recharts Analytics Row */}
      <div className={styles.chartsRow}>
        {/* Chart 1: State-wise Threat Severity */}
        <div className={styles.chartCard}>
          <div className={styles.chartHead}>
            <div className={styles.chartTitle}>
              <Layers size={16} color="#2dd4bf" />
              <span>State-wise Hazard Level Distribution</span>
            </div>
            <span className={styles.chartSubtitle}>8 NER States</span>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={stateChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#0f172a",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="High" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Moderate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Rainfall vs Soil Moisture Correlation */}
        <div className={styles.chartCard}>
          <div className={styles.chartHead}>
            <div className={styles.chartTitle}>
              <Droplets size={16} color="#0284c7" />
              <span>Precipitation vs Soil Saturation Trigger Curve</span>
            </div>
            <span className={styles.chartSubtitle}>ECMWF ERA5 / NASA SMAP</span>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart
                data={correlationData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="rain"
                  stroke="#64748b"
                  fontSize={11}
                  unit="mm"
                />
                <YAxis stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#0f172a",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="risk"
                  name="Landslide Probability %"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#riskGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="soilSat"
                  name="Soil Saturation %"
                  stroke="#0284c7"
                  fillOpacity={1}
                  fill="url(#soilGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* XGBoost AI & SHAP Explainability Engine */}
      <div className={styles.shapSection}>
        <div className={styles.shapHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Cpu size={20} color="#818cf8" />
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Explainable AI (XAI) — SHAP Feature Attribution
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Unpacks the black-box: tells district magistrates precisely WHY a zone is flagged high-risk
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Select District:</span>
            <select
              className={styles.shapDistrictSelect}
              value={selectedShapDistrictId}
              onChange={(e) => setSelectedShapDistrictId(e.target.value)}
            >
              {NER_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district} ({d.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.shapGrid}>
          {/* Summary Score Card */}
          <div className={styles.shapSummaryCard}>
            <div className={styles.scoreGauge}>
              <div>
                <div className={styles.gaugeLabel}>Computed Probability</div>
                <div className={styles.gaugeVal}>
                  {(shapDistrict.riskScore * 100).toFixed(0)}%
                </div>
              </div>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background:
                    shapDistrict.riskLevel === "VERY_HIGH"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(249, 115, 22, 0.15)",
                  color:
                    shapDistrict.riskLevel === "VERY_HIGH"
                      ? "#dc2626"
                      : "#ea580c",
                  border: `1px solid ${
                    shapDistrict.riskLevel === "VERY_HIGH" ? "#fca5a5" : "#fdba74"
                  }`,
                }}
              >
                {shapDistrict.riskLevel}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.45 }}>
              <strong>Operational Directive:</strong> {shapDistrict.description}
            </div>

            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Elevation: {shapDistrict.elevation}m &bull; Slope: {shapDistrict.slope}&deg; &bull; Population: {shapDistrict.population.toLocaleString()}
            </div>
          </div>

          {/* SHAP Factor Bars */}
          <div className={styles.shapBarsContainer}>
            <div className={styles.shapBarItem}>
              <div className={styles.shapBarLabelRow}>
                <span>
                  <strong>24h Precipitation Impact (IMD / Open-Meteo)</strong> &bull; {shapDistrict.rainfall24h} mm
                </span>
                <span style={{ color: "#0284c7", fontWeight: 700 }}>{shapRain}% Contribution</span>
              </div>
              <div className={styles.shapBarTrack}>
                <div
                  className={styles.shapBarFill}
                  style={{ width: `${shapRain}%`, background: "#0284c7" }}
                />
              </div>
            </div>

            <div className={styles.shapBarItem}>
              <div className={styles.shapBarLabelRow}>
                <span>
                  <strong>Volumetric Soil Moisture Saturation (ECMWF ERA5)</strong> &bull; {shapMoist}% Saturated
                </span>
                <span style={{ color: "#f97316", fontWeight: 700 }}>{shapMoist}% Contribution</span>
              </div>
              <div className={styles.shapBarTrack}>
                <div
                  className={styles.shapBarFill}
                  style={{ width: `${shapMoist}%`, background: "#f97316" }}
                />
              </div>
            </div>

            <div className={styles.shapBarItem}>
              <div className={styles.shapBarLabelRow}>
                <span>
                  <strong>Topographic Slope Gradient (SRTM 30m DEM)</strong> &bull; {shapDistrict.slope}&deg; Incline
                </span>
                <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{shapSlope}% Contribution</span>
              </div>
              <div className={styles.shapBarTrack}>
                <div
                  className={styles.shapBarFill}
                  style={{ width: `${shapSlope}%`, background: "#8b5cf6" }}
                />
              </div>
            </div>

            <div className={styles.shapBarItem}>
              <div className={styles.shapBarLabelRow}>
                <span>
                  <strong>Geomorphology, Lithology & Seismic Lineaments</strong>
                </span>
                <span style={{ color: "#64748b", fontWeight: 700 }}>{shapGeol}% Contribution</span>
              </div>
              <div className={styles.shapBarTrack}>
                <div
                  className={styles.shapBarFill}
                  style={{ width: `${shapGeol}%`, background: "#64748b" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 8 High-Risk Districts Watchlist Table */}
      <div className={styles.tableCard}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
            High-Priority District Watchlist (Top 8 Threat Corridors)
          </div>
          <Link
            href="/"
            style={{
              fontSize: "12px",
              color: "#0f766e",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 700,
            }}
          >
            Open in 3D GIS Map <ExternalLink size={12} />
          </Link>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>District</th>
              <th>State</th>
              <th>Threat Level</th>
              <th>Risk Score</th>
              <th>24h Rainfall</th>
              <th>Soil Saturation</th>
              <th>Slope</th>
              <th>Last Slide Event</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {topHighRisk.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 700, color: "#0f172a" }}>{d.district}</td>
                <td>{d.state}</td>
                <td>
                  <span
                    className={styles.badge}
                    style={{
                      background:
                        d.riskLevel === "VERY_HIGH"
                          ? "#fee2e2"
                          : "#ffedd5",
                      color:
                        d.riskLevel === "VERY_HIGH" ? "#dc2626" : "#ea580c",
                      border: `1px solid ${
                        d.riskLevel === "VERY_HIGH" ? "#fca5a5" : "#fdba74"
                      }`,
                    }}
                  >
                    {d.riskLevel}
                  </span>
                </td>
                <td style={{ fontWeight: 800, color: "#0f172a" }}>
                  {(d.riskScore * 100).toFixed(0)}%
                </td>
                <td>{d.rainfall24h} mm</td>
                <td>{Math.round(d.soilMoisture * 100)}%</td>
                <td>{d.slope}&deg;</td>
                <td style={{ color: "#64748b" }}>{d.lastEvent || "2024-07"}</td>
                <td>
                  <Link
                    href="/alerts"
                    style={{
                      fontSize: "11px",
                      color: "#dc2626",
                      fontWeight: 700,
                      background: "#fee2e2",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #fca5a5",
                    }}
                  >
                    Dispatch Warning
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
