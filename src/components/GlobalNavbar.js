"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Map,
  BarChart3,
  BellRing,
  Camera,
  Route,
  Activity,
  AlertTriangle,
  Radio,
  ExternalLink,
} from "lucide-react";
import {
  isCloudConnected,
  fetchAlerts,
  subscribeToAlerts,
} from "@/lib/supabase";
import styles from "./GlobalNavbar.module.css";

// Web Audio API emergency chime
function playAlertChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35); // A4

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context may be blocked by autoplay policies until user interaction
  }
}

export default function GlobalNavbar() {
  const pathname = usePathname();
  const [cloudActive, setCloudActive] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(3);
  const [liveToast, setLiveToast] = useState(null);

  useEffect(() => {
    setCloudActive(isCloudConnected());

    // Fetch initial active alerts count
    fetchAlerts({ status: "ACTIVE" }).then((alerts) => {
      if (alerts) {
        setActiveAlertCount(alerts.length);
      }
    });

    // Subscribe to real-time Supabase alerts
    const unsubscribe = subscribeToAlerts((newAlert) => {
      if (newAlert && newAlert.status === "ACTIVE") {
        setActiveAlertCount((prev) => prev + 1);
        playAlertChime();
        setLiveToast(newAlert);
        setTimeout(() => setLiveToast(null), 7000);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const navItems = [
    { href: "/", label: "Live GIS Map", icon: Map },
    { href: "/dashboard", label: "AI Dashboard", icon: BarChart3 },
    {
      href: "/alerts",
      label: "Alert Center",
      icon: BellRing,
      badge: activeAlertCount,
    },
    { href: "/field-reports", label: "Field Reports", icon: Camera },
    { href: "/connectivity", label: "Road Corridors", icon: Route },
    { href: "/emergency", label: "Emergency Triage", icon: Activity },
  ];

  return (
    <>
      <header className={styles.navbar}>
        {/* Left: Brand Identity */}
        <div className={styles.leftSection}>
          <Link href="/" className={styles.brandLink}>
            <div className={styles.logoWrap}>
              <ShieldAlert size={20} />
            </div>
            <div className={styles.brandText}>
              <div className={styles.brandTitle}>
                <span>LandslideGuard AI</span>
                <span className={styles.brandBadge}>MDoNER</span>
              </div>
              <div className={styles.brandSub}>North Eastern Region LEWS</div>
            </div>
          </Link>

          {/* Telemetry & Supabase Badges */}
          <div className={styles.statusGroup}>
            <div className={styles.telemetryPill} title="Ingesting Open-Meteo, RainViewer & OSRM streams">
              <span className={styles.pulseDot} />
              <span>NRT Active</span>
            </div>

            <div
              className={styles.supabasePill}
              title={
                cloudActive
                  ? "Connected to Supabase Cloud PostgreSQL & WebSockets"
                  : "Running in Resilient Local Demo Mode (Configure .env.local to sync with Supabase Cloud)"
              }
            >
              <span
                className={
                  cloudActive ? styles.supabaseCloudDot : styles.supabaseDemoDot
                }
              />
              <span>{cloudActive ? "Supabase Cloud" : "Supabase Local"}</span>
            </div>
          </div>
        </div>

        {/* Center: Module Navigation Links */}
        <nav className={styles.navLinks}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/map"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${
                  isActive ? styles.navItemActive : ""
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className={styles.alertCountPill}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Quick Action Button */}
        <div className={styles.rightSection}>
          <Link href="/alerts" className={styles.quickBroadcastBtn}>
            <Radio size={13} />
            <span>Broadcast Alert</span>
          </Link>
        </div>
      </header>

      {/* Floating Global Toast for Real-Time Incoming Alerts */}
      {liveToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 10000,
            background: "#ffffff",
            border: "1px solid #ef4444",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
            borderRadius: "12px",
            padding: "16px 20px",
            maxWidth: "420px",
            color: "#0f172a",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            animation: "slideIn 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              <AlertTriangle size={16} />
              <span>LIVE SUPABASE ALERT DISPATCHED</span>
            </div>
            <button
              onClick={() => setLiveToast(null)}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
            {liveToast.title}
          </div>
          <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
            {liveToast.action_directive || liveToast.description}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Target: {liveToast.district_name}, {liveToast.state}
            </span>
            <Link
              href="/alerts"
              onClick={() => setLiveToast(null)}
              style={{
                fontSize: "11px",
                color: "#0f766e",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 700,
              }}
            >
              View in Alert Center <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
