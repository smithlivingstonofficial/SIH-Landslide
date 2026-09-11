"use client";
import dynamic from "next/dynamic";

// Dynamically import LiveGISMap (SSR false for Leaflet & Window APIs)
const LiveGISMap = dynamic(() => import("@/components/LiveGISMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0f1d",
        color: "#f8fafc",
        fontFamily: "var(--font-sans)",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          border: "3px solid rgba(45, 212, 191, 0.2)",
          borderTopColor: "#2dd4bf",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: "16px", fontWeight: 700, color: "#2dd4bf" }}>
        LandslideGuard AI
      </div>
      <div style={{ fontSize: "13px", color: "#94a3b8" }}>
        Connecting to OpenStreetMap GIS, Open-Meteo & RainViewer APIs...
      </div>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <LiveGISMap />
    </main>
  );
}
