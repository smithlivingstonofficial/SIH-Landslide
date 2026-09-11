# SIH-Landslide

# 🏔️ LandslideGuard AI — Early Warning & Real-Time Monitoring Platform

> **AI-Powered Landslide Risk Monitoring & Early Warning Platform for the North Eastern Region (NER)**  
> Department: MDoNER | Category: Software | Smart India Hackathon (SIH) 2026

---

## 📌 Problem Statement Overview

The North Eastern Region (NER) of India is characterized by fragile Himalayan geology, steep slopes, high seismic vulnerability, and intense monsoon precipitation. This project develops an AI-powered early warning and monitoring platform capable of predicting and tracking landslide-prone areas in real time.

### Key Capabilities:
- **Multi-Source Data Fusion**: Ingests rainfall patterns (Open-Meteo & IMD), volumetric soil moisture (ECMWF ERA5 / NASA SMAP), NRT RainViewer precipitation radar, SRTM 30m digital elevation model (slope/aspect), and historical landslide inventories (GSI Bhukosh / ISRO Bhuvan).
- **AI/ML Susceptibility & Dynamic Nowcasting**: Integrates static terrain susceptibility with dynamic meteorological parameters and explainable AI (SHAP) feature attribution.
- **Real-Time Multi-Channel Alerts**: Supabase-powered real-time alert engine broadcasting emergency directives via In-App alerts, SMS (DLT/MSG91), WhatsApp Business, and CAP (Common Alerting Protocol).
- **Interactive GIS Mapping**: High-performance Leaflet GIS surveillance visualizing 42+ high-risk hill villages, strategic highway corridors (NH10, NH29, NH37, NH53), and critical infrastructure.
- **Crowdsourced Field Reporting**: Citizen and field official portal for reporting cracks, slope movements, and road blockages with GPS auto-tagging, AI image classification, and offline IndexedDB sync queue for low-network remote hill regions.
- **Road Connectivity & Cutoff Analytics**: Real-time highway status tracking, isolated settlement risk detection, and automated emergency bypass route calculation via Open Source Routing Machine (OSRM).
- **Disaster Response Prioritization**: Automated triage matrix ranking district risk for NDRF/SDRF emergency deployment.

---

## 🏗️ Project Structure

```
SIH-Landslide/
├── README.md
├── .gitignore
├── package.json
├── next.config.mjs
├── public/                # Static assets & icons
└── src/
    ├── app/               # App Router pages (GIS Map, Dashboard, Alerts)
    ├── components/        # Leaflet GIS Map, Command Toolbar, Telemetry Panels
    ├── data/              # 128 NER Districts, High-Risk Villages, Highways, Landslide Atlas
    └── services/          # Open-Meteo Weather API, OSRM Mountain Routing Engine
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (Node 20 recommended)
- npm or yarn

### 2. Installation
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Tech Stack
- **Frontend**: Next.js 16, React 19, Vanilla CSS Design System, Lucide Icons, Recharts
- **GIS & Mapping**: React-Leaflet, OpenStreetMap, ESRI World Topo / Imagery, RainViewer NRT Radar
- **Routing & Evacuation**: Open Source Routing Machine (OSRM)
- **Database & Realtime Alerts**: Supabase PostgreSQL + PostGIS, Supabase Realtime
- **Meteorology**: Open-Meteo API, ECMWF Soil Moisture
