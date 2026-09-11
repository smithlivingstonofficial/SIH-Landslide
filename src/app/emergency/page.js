"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Shield,
  Truck,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
  Flame,
} from "lucide-react";
import styles from "./emergency.module.css";

const INITIAL_TRIAGE = [
  {
    rank: 1,
    district: "Mangan",
    state: "Sikkim",
    eps: 94.2,
    cutoffSeverity: "CRITICAL_ISOLATION",
    isolatedVillages: 5,
    vulnerablePop: 43709,
    assignedTeam: "NDRF 12th Bn + Indian Army Trishakti",
    status: "MOBILIZED",
  },
  {
    rank: 2,
    district: "Dima Hasao",
    state: "Assam",
    eps: 88.5,
    cutoffSeverity: "CRITICAL_ISOLATION",
    isolatedVillages: 4,
    vulnerablePop: 78000,
    assignedTeam: "SDRF Assam + BRO Project Pushpak",
    status: "ON_SITE",
  },
  {
    rank: 3,
    district: "East Khasi Hills",
    state: "Meghalaya",
    eps: 76.8,
    cutoffSeverity: "SINGLE_LANE_ONLY",
    isolatedVillages: 3,
    vulnerablePop: 62000,
    assignedTeam: "SDRF Meghalaya Squad B",
    status: "STANDBY",
  },
  {
    rank: 4,
    district: "Kohima",
    state: "Nagaland",
    eps: 72.1,
    cutoffSeverity: "SINGLE_LANE_ONLY",
    isolatedVillages: 2,
    vulnerablePop: 51000,
    assignedTeam: "Nagaland Disaster Response (NDRF 1st Bn)",
    status: "MOBILIZED",
  },
  {
    rank: 5,
    district: "Champhai",
    state: "Mizoram",
    eps: 68.4,
    cutoffSeverity: "SINGLE_LANE_ONLY",
    isolatedVillages: 2,
    vulnerablePop: 34000,
    assignedTeam: "Mizoram SDRF Rapid Unit",
    status: "STANDBY",
  },
  {
    rank: 6,
    district: "Papum Pare",
    state: "Arunachal Pradesh",
    eps: 63.9,
    cutoffSeverity: "NORMAL",
    isolatedVillages: 1,
    vulnerablePop: 41000,
    assignedTeam: "BRO Project Vartak Heavy Dozers",
    status: "ON_SITE",
  },
];

const RELIEF_SHELTERS = [
  { name: "Mangan Higher Secondary Relief Camp", capacity: 850, occupied: 412, district: "Sikkim", rations: "4 Days Left", power: "Solar/DG Backup" },
  { name: "Haflong Government College Shelter", capacity: 1200, occupied: 680, district: "Assam", rations: "6 Days Left", power: "DG Backup" },
  { name: "Sohra Community Hall Emergency Base", capacity: 500, occupied: 140, district: "Meghalaya", rations: "7 Days Left", power: "Grid Stable" },
  { name: "Kohima Indoor Stadium Evacuation Hub", capacity: 1500, occupied: 320, district: "Nagaland", rations: "5 Days Left", power: "DG Backup" },
];

export default function EmergencyPage() {
  const [triageList, setTriageList] = useState(INITIAL_TRIAGE);

  const handleDeploy = (rank) => {
    setTriageList((prev) =>
      prev.map((item) =>
        item.rank === rank ? { ...item, status: "DISPATCHED" } : item
      )
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>
            <Activity size={26} color="#ef4444" />
            <span>Emergency Response Prioritization & Disaster Triage</span>
          </h1>
          <p>
            Algorithmic Emergency Priority Score (EPS) ranking districts for NDRF,
            SDRF & Indian Army relief deployment across North-East India
          </p>
        </div>

        <Link
          href="/alerts"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <Radio size={14} />
          <span>Broadcast Warning</span>
        </Link>
      </div>

      {/* KPI Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
          >
            <Flame size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>Rank 1: Mangan</div>
            <div className={styles.kpiLabel}>Highest Triage Urgency (EPS 94.2)</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(45, 212, 191, 0.15)", color: "#2dd4bf" }}
          >
            <Truck size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>14 Units</div>
            <div className={styles.kpiLabel}>Active NDRF / SDRF Battalions</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>4,050</div>
            <div className={styles.kpiLabel}>Total Shelter Capacity Ready</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}
          >
            <Users size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>1,552</div>
            <div className={styles.kpiLabel}>Evacuated Citizens Sheltered</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Triage Table on Left, Shelters on Right */}
      <div className={styles.layoutGrid}>
        {/* Triage Table */}
        <div className={styles.triageCard}>
          <div className={styles.sectionTitle}>
            <Shield size={18} color="#ef4444" />
            <span>Automated District Disaster Triage Ranking</span>
          </div>
          <p className={styles.sectionSub}>
            Formula: EPS = (Dynamic Risk × 40) + (Cutoff Severity × 30) + (Vulnerable Pop × 20) + (Hospital Access × 10)
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>District</th>
                <th>State</th>
                <th>Priority Score</th>
                <th>Cutoff Status</th>
                <th>Isolated Hamlets</th>
                <th>Assigned Task Force</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {triageList.map((item) => (
                <tr key={item.rank}>
                  <td>
                    <div className={styles.rankBadge}>{item.rank}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: "#0f172a" }}>
                    {item.district}
                  </td>
                  <td>{item.state}</td>
                  <td>
                    <strong style={{ color: item.eps > 80 ? "#dc2626" : "#ea580c" }}>
                      {item.eps} / 100
                    </strong>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background:
                          item.cutoffSeverity === "CRITICAL_ISOLATION"
                            ? "#fee2e2"
                            : "#fef3c7",
                        color:
                          item.cutoffSeverity === "CRITICAL_ISOLATION"
                            ? "#dc2626"
                            : "#d97706",
                        border: `1px solid ${
                          item.cutoffSeverity === "CRITICAL_ISOLATION"
                            ? "#fca5a5"
                            : "#fde68a"
                        }`,
                      }}
                    >
                      {item.cutoffSeverity.replace("_", " ")}
                    </span>
                  </td>
                  <td>{item.isolatedVillages} Hamlets</td>
                  <td style={{ fontSize: "11.5px" }}>{item.assignedTeam}</td>
                  <td>
                    {item.status === "DISPATCHED" ? (
                      <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "11px" }}>
                        ✓ DISPATCHED
                      </span>
                    ) : (
                      <button
                        className={styles.deployBtn}
                        onClick={() => handleDeploy(item.rank)}
                      >
                        Deploy Task Force
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar: Relief Shelters Status */}
        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>
              <Building2 size={16} color="#0f766e" />
              <span>Evacuation Relief Shelters Status</span>
            </div>

            <div className={styles.teamList}>
              {RELIEF_SHELTERS.map((s) => (
                <div key={s.name} className={styles.teamItem}>
                  <div className={styles.teamHead}>
                    <span>{s.name}</span>
                    <span style={{ color: "#0f766e", fontSize: "11px", fontWeight: 700 }}>
                      {s.district}
                    </span>
                  </div>

                  <div className={styles.teamSub}>
                    Capacity: {s.occupied} / {s.capacity} ({Math.round((s.occupied / s.capacity) * 100)}% Occupancy)
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10.5px",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    <span>Rations: <strong style={{ color: "#0f172a" }}>{s.rations}</strong></span>
                    <span>Power: <strong style={{ color: "#059669" }}>{s.power}</strong></span>
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
