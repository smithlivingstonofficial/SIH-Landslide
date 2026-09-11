/**
 * 🏔️ LandslideGuard AI — Supabase Database & Realtime Client
 * Provides dual-mode operation:
 * 1. Cloud Mode: Connects to real Supabase PostgreSQL when credentials are set in .env.local
 * 2. Resilient Local/Demo Mode: Smooth fallback when credentials are not configured or offline,
 *    ensuring the hackathon presentation and local testing work without interruptions.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are valid (not empty and not placeholders)
export const isConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project-id")
);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

/**
 * Check if the app is communicating with Supabase Cloud
 */
export function isCloudConnected() {
  return isConfigured;
}

// ==============================================================================
// SEED DATA FOR DEMO / LOCAL FALLBACK MODE
// ==============================================================================

const INITIAL_ALERTS = [
  {
    id: "alert-sk-001",
    district_id: "SK-001",
    district_name: "Mangan",
    state: "Sikkim",
    state_code: "SK",
    severity: "CRITICAL",
    hazard_type: "LANDSLIDE",
    title: "CRITICAL RED ALERT: Massive Slope Failure Hazard along Chungthang–Lachen Axis",
    description:
      "Precipitation gauge recorded 145mm rainfall in 24 hours. ECMWF soil saturation exceeds 85%. Active fissuring observed along NH10 corridor.",
    action_directive:
      "IMMEDIATE ACTION: Evacuate riverside wards and fragile slope hamlets to Mangan Higher Secondary Relief Shelter. Suspend all vehicular transit past Dikchu bridge.",
    affected_population: 43709,
    affected_villages: ["Lachen", "Lachung", "Chungthang", "Naga", "Singhik"],
    channels: ["IN_APP", "SMS", "WHATSAPP", "CAP"],
    latitude: 27.509,
    longitude: 88.532,
    multilingual_translations: {
      as: "জৰুৰী সতৰ্কবাৰ্তা: মংগান জিলাত প্ৰচণ্ড ভূমিস্খলনৰ সম্ভাৱনা। নিৰাপদ আশ্ৰয়লৈ স্থানান্তৰ হওক।",
      hi: "आपातकालीन चेतावनी: मंगन जिले में भारी भूस्खलन का खतरा। कृपया तुरंत सुरक्षित आश्रयों में जाएं।",
      bn: "জরুরি সতর্কতা: মঙ্গন জেলায় মারাত্মক ভূমিধসের ঝুঁকি। অবিলম্বে নিরাপদ স্থানে সরে যান।",
      kha: "Ka jingma ba jur: Ka jingtwa khyndew ha Mangan. Phet sha ki jaka ba shngain.",
      mni: "অককপবা পাউ: মঙ্গন জিলাদা অচৌবা চীং য়ৈথবা য়াবা ফিভম লৈরে।",
      lus: "Hriattirna hlauhawm: Mangan bialah leimin a hlauhawm hle. Hmun him lam pan nghal rawh u.",
    },
    status: "ACTIVE",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "alert-as-005",
    district_id: "AS-005",
    district_name: "Dima Hasao",
    state: "Assam",
    state_code: "AS",
    severity: "HIGH",
    hazard_type: "DEBRIS_FLOW",
    title: "HIGH ALERT: Jatinga Valley & Haflong Hill Cutoff Risk",
    description:
      "Cumulative 7-day rainfall reached 310mm. Debris flow detected along Lumding–Badarpur hill railway line and NH27 Mahur bypass.",
    action_directive:
      "HIGH ADVISORY: BRO and SDRF teams mobilized for clearance. Restrict night travel across Jatinga gorge.",
    affected_population: 214102,
    affected_villages: ["Jatinga", "Mahur", "Harangajao", "Maibang"],
    channels: ["IN_APP", "SMS", "WHATSAPP"],
    latitude: 25.183,
    longitude: 93.017,
    multilingual_translations: {
      as: "উচ্চ সতৰ্কবাৰ্তা: ডিমা হাছাওত ভূমিস্খলনৰ ফলত পথ বন্ধ হোৱাৰ সম্ভাৱনা।",
      hi: "उच्च चेतावनी: दीमा हसाओ में भारी बारिश के कारण मलबा गिरने का खतरा।",
    },
    status: "ACTIVE",
    created_at: new Date(Date.now() - 75 * 60000).toISOString(),
  },
  {
    id: "alert-ml-001",
    district_id: "ML-001",
    district_name: "East Khasi Hills",
    state: "Meghalaya",
    state_code: "ML",
    severity: "MODERATE",
    hazard_type: "MUDSLIDE",
    title: "MODERATE ADVISORY: Sohra (Cherrapunji) Escarpment Saturation",
    description:
      "Continuous precipitation with soil moisture saturation at 74%. Moderate road subsidence near Wahkhen and Mawlynnong ridge.",
    action_directive:
      "ADVISORY: Tourists advised against canyon hikes. District police maintaining one-way traffic on Shillong–Dawki highway.",
    affected_population: 825922,
    affected_villages: ["Wahkhen", "Khatarshnong", "Mawkdok"],
    channels: ["IN_APP", "SMS"],
    latitude: 25.5788,
    longitude: 91.8933,
    multilingual_translations: {
      kha: "Ka jingmahar: Ki lynti Sohra ki lah ban jia jingtwa khyndew. Sumar ha ka leit ka wan.",
      en: "MODERATE ADVISORY: Rain-induced slope instability on Sohra canyon roads.",
    },
    status: "ACTIVE",
    created_at: new Date(Date.now() - 180 * 60000).toISOString(),
  },
];

const INITIAL_REPORTS = [
  {
    id: "rep-001",
    reporter_name: "Tenzing Lepcha",
    reporter_role: "FIELD_OFFICER",
    phone_number: "+919876543210",
    location_name: "Dikchu-Mangan Road, Km 14",
    district_id: "SK-001",
    state: "Sikkim",
    latitude: 27.42,
    longitude: 88.515,
    hazard_type: "TENSION_CRACK",
    severity_observed: "CRITICAL",
    photo_urls: [
      "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop",
    ],
    description:
      "Ground tension crack propagating longitudinally across road surface. Width approx 18cm and expanding rapidly under heavy rainfall.",
    ai_classification: {
      detected_label: "Tension Crack in Slope",
      confidence: 0.94,
      risk_score: 0.88,
    },
    status: "VERIFIED",
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    id: "rep-002",
    reporter_name: "Rajib Gogoi",
    reporter_role: "BRO_ENGINEER",
    phone_number: "+919435012345",
    location_name: "NH27 Mahur Pass, Dima Hasao",
    district_id: "AS-005",
    state: "Assam",
    latitude: 25.175,
    longitude: 93.115,
    hazard_type: "BLOCKED_ROAD",
    severity_observed: "HIGH",
    photo_urls: [
      "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=800&auto=format&fit=crop",
    ],
    description:
      "Massive mud and boulder accumulation blocking both lanes. Excavator mobilized; single lane clearance estimated in 2 hours.",
    ai_classification: {
      detected_label: "Highway Blockage / Rockfall",
      confidence: 0.96,
      risk_score: 0.82,
    },
    status: "DISPATCHED",
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

const INITIAL_SUBSCRIBERS = [
  { id: "sub-1", name: "District Commissioner Mangan", phone_number: "+919876543001", district_id: "SK-001", state: "Sikkim", channel: "SMS", language_pref: "en" },
  { id: "sub-2", name: "Haflong Town Council", phone_number: "+919876543002", district_id: "AS-005", state: "Assam", channel: "WHATSAPP", language_pref: "as" },
  { id: "sub-3", name: "Sohra Community Youth Club", phone_number: "+919876543003", district_id: "ML-001", state: "Meghalaya", channel: "SMS", language_pref: "kha" },
];

// In-Memory / Local Storage Store Helper
function getLocalStore(key, defaultData) {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(`lndgrd_${key}`);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

function setLocalStore(key, data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`lndgrd_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn("Local storage error:", e);
  }
}

// In-memory listeners for demo mode
const alertListeners = new Set();
const reportListeners = new Set();

// ==============================================================================
// PUBLIC SUPABASE API FUNCTIONS
// ==============================================================================

/**
 * Fetch all alerts with optional severity/status filters.
 */
export async function fetchAlerts(options = {}) {
  if (isConfigured) {
    try {
      let query = supabase.from("alerts").select("*").order("created_at", { ascending: false });
      if (options.status) query = query.eq("status", options.status);
      if (options.severity && options.severity !== "ALL") query = query.eq("severity", options.severity);
      const { data, error } = await query;
      if (!error && data) return data;
      console.warn("Supabase fetchAlerts fallback:", error?.message);
    } catch (err) {
      console.warn("Supabase connection error:", err);
    }
  }

  // Local fallback
  const list = getLocalStore("alerts", INITIAL_ALERTS);
  return list.filter((a) => {
    if (options.status && a.status !== options.status) return false;
    if (options.severity && options.severity !== "ALL" && a.severity !== options.severity) return false;
    return true;
  });
}

/**
 * Broadcast a new emergency alert to Supabase and Realtime subscribers.
 */
export async function broadcastAlert(alertData) {
  const newAlert = {
    ...alertData,
    id: alertData.id || `alert-${Date.now()}`,
    status: alertData.status || "ACTIVE",
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await supabase.from("alerts").insert([newAlert]).select().single();
      if (!error && data) {
        return { success: true, data };
      }
      console.warn("Supabase insert error, saving to local store:", error?.message);
    } catch (err) {
      console.warn("Supabase broadcast error:", err);
    }
  }

  // Fallback local store
  const list = getLocalStore("alerts", INITIAL_ALERTS);
  const updated = [newAlert, ...list];
  setLocalStore("alerts", updated);

  // Trigger local demo listeners
  alertListeners.forEach((listener) => {
    try {
      listener(newAlert);
    } catch (e) {
      console.error(e);
    }
  });

  return { success: true, data: newAlert };
}

/**
 * Mark an alert as CONTAINED or RESOLVED.
 */
export async function updateAlertStatus(alertId, newStatus) {
  if (isConfigured) {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ status: newStatus, resolved_at: newStatus === "RESOLVED" ? new Date().toISOString() : null })
        .eq("id", alertId);
      if (!error) return { success: true };
    } catch (err) {
      console.warn("Supabase update error:", err);
    }
  }

  const list = getLocalStore("alerts", INITIAL_ALERTS);
  const updated = list.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a));
  setLocalStore("alerts", updated);
  return { success: true };
}

/**
 * Subscribe to real-time alerts.
 */
export function subscribeToAlerts(callback) {
  if (isConfigured) {
    const channel = supabase
      .channel("public:alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, (payload) => {
        callback(payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "alerts" }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Demo mode: subscribe to in-memory event bus
  alertListeners.add(callback);
  return () => {
    alertListeners.delete(callback);
  };
}

/**
 * Fetch all crowd field reports.
 */
export async function fetchFieldReports() {
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from("field_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    } catch (err) {
      console.warn("Supabase fetchFieldReports fallback:", err);
    }
  }

  return getLocalStore("field_reports", INITIAL_REPORTS);
}

/**
 * Submit a crowd-sourced field hazard report.
 */
export async function submitFieldReport(reportData) {
  const newReport = {
    ...reportData,
    id: reportData.id || `rep-${Date.now()}`,
    status: reportData.status || "SUBMITTED",
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await supabase.from("field_reports").insert([newReport]).select().single();
      if (!error && data) return { success: true, data };
    } catch (err) {
      console.warn("Supabase submitFieldReport error:", err);
    }
  }

  const list = getLocalStore("field_reports", INITIAL_REPORTS);
  const updated = [newReport, ...list];
  setLocalStore("field_reports", updated);

  reportListeners.forEach((listener) => {
    try {
      listener(newReport);
    } catch {}
  });

  return { success: true, data: newReport };
}

/**
 * Subscribe to real-time field reports.
 */
export function subscribeToFieldReports(callback) {
  if (isConfigured) {
    const channel = supabase
      .channel("public:field_reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "field_reports" }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  reportListeners.add(callback);
  return () => {
    reportListeners.delete(callback);
  };
}

/**
 * Fetch subscribers for community early warning.
 */
export async function fetchSubscribers() {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.from("subscribers").select("*");
      if (!error && data) return data;
    } catch {}
  }
  return getLocalStore("subscribers", INITIAL_SUBSCRIBERS);
}

/**
 * Register a citizen / official subscriber for SMS or WhatsApp warnings.
 */
export async function addSubscriber(subData) {
  const newSub = {
    ...subData,
    id: `sub-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await supabase.from("subscribers").insert([newSub]).select().single();
      if (!error && data) return { success: true, data };
    } catch {}
  }

  const list = getLocalStore("subscribers", INITIAL_SUBSCRIBERS);
  const updated = [newSub, ...list];
  setLocalStore("subscribers", updated);
  return { success: true, data: newSub };
}
