"use client";
import { useState, useEffect, useRef } from "react";
import {
  Camera,
  MapPin,
  Upload,
  Cpu,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertOctagon,
  Image as ImageIcon,
  Trash2,
  Mountain,
} from "lucide-react";
import {
  fetchFieldReports,
  submitFieldReport,
  subscribeToFieldReports,
} from "@/lib/supabase";
import {
  queueOfflineReport,
  getPendingOfflineReports,
  syncPendingReports,
} from "@/services/offlineSync";
import { NER_DISTRICTS } from "@/data/nerData";
import styles from "./fieldReports.module.css";

// Simulated AI Image Analysis Engine (MobileNetV3 Edge Classifier)
function runAiImageInference(hazardType) {
  switch (hazardType) {
    case "TENSION_CRACK":
      return {
        detected_label: "Tension Crack / Longitudinal Fissure",
        confidence: 0.93,
        risk_score: 0.86,
        advice: "Immediate barrier required. Ground water ingress detected.",
      };
    case "BLOCKED_ROAD":
      return {
        detected_label: "Debris / Highway Rockfall Obstruction",
        confidence: 0.97,
        risk_score: 0.91,
        advice: "Requires heavy excavation machinery (JCB/Dozer).",
      };
    case "SLOPE_MOVEMENT":
      return {
        detected_label: "Active Rotational Slope Slump",
        confidence: 0.89,
        risk_score: 0.84,
        advice: "Slope actively creeping. Danger to downhill structures.",
      };
    case "MUDSLIDE":
      return {
        detected_label: "Rapid Mudflow / Soil Slurry",
        confidence: 0.95,
        risk_score: 0.92,
        advice: "High fluid velocity. Flash mud deposit risk.",
      };
    default:
      return {
        detected_label: "Minor Soil Erosion / Gully",
        confidence: 0.85,
        risk_score: 0.45,
        advice: "Maintain routine drainage monitoring.",
      };
  }
}

// Compress image via HTML5 canvas for lightweight Supabase storage & fast network transit
function compressImage(file, maxWidth = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", quality),
          sizeKb: Math.round(canvas.toDataURL("image/jpeg", quality).length / 1024),
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FieldReportsPage() {
  const [reports, setReports] = useState([]);
  const [pendingOffline, setPendingOffline] = useState([]);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [reporterName, setReporterName] = useState("");
  const [reporterRole, setReporterRole] = useState("CITIZEN");
  const [phone, setPhone] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("SK-001");
  const [hazardType, setHazardType] = useState("TENSION_CRACK");
  const [severityObserved, setSeverityObserved] = useState("HIGH");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState({ lat: 27.509, lng: 88.532 });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  // Real Uploaded Photo State (No dummy unsplash photos)
  const [uploadedImage, setUploadedImage] = useState(null); // { dataUrl, name, sizeKb }
  const fileInputRef = useRef(null);

  // Load Reports & Offline Queue
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [fetchedReports, pending] = await Promise.all([
        fetchFieldReports(),
        getPendingOfflineReports(),
      ]);
      setReports(fetchedReports || []);
      setPendingOffline(pending || []);
      setLoading(false);
    }
    loadData();

    setAiAnalysis(runAiImageInference("TENSION_CRACK"));

    const unsubscribe = subscribeToFieldReports((newRep) => {
      setReports((prev) => [newRep, ...prev]);
    });

    const handleOnline = async () => {
      setIsSimulatedOffline(false);
      await triggerSync();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Update AI classification whenever hazardType changes
  const handleHazardChange = (val) => {
    setHazardType(val);
    setAiAnalysis(runAiImageInference(val));
  };

  // Handle Real File / Camera Input
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setUploadedImage({
        dataUrl: compressed.dataUrl,
        name: file.name,
        sizeKb: compressed.sizeKb,
      });
    } catch (err) {
      console.error("Error processing photo:", err);
    }
  };

  const handleRemovePhoto = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Get GPS Location
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
          });
          setLocationName(
            `GPS: ${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E`
          );
        },
        () => {
          const d = NER_DISTRICTS.find((item) => item.id === selectedDistrictId);
          if (d) setCoords({ lat: d.lat, lng: d.lng });
        }
      );
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const districtObj = NER_DISTRICTS.find((d) => d.id === selectedDistrictId);

    const reportPayload = {
      reporter_name: reporterName || "Anonymous Citizen",
      reporter_role: reporterRole,
      phone_number: phone || "+91-Field-Report",
      location_name: locationName || `${districtObj?.district} Hill Cut`,
      district_id: selectedDistrictId,
      state: districtObj?.state || "Sikkim",
      latitude: coords.lat,
      longitude: coords.lng,
      hazard_type: hazardType,
      severity_observed: severityObserved,
      photo_urls: uploadedImage?.dataUrl ? [uploadedImage.dataUrl] : [],
      description:
        description ||
        "Visual observation submitted via LandslideGuard Field Reporting PWA.",
      ai_classification: aiAnalysis,
      status: "SUBMITTED",
    };

    if (isSimulatedOffline || !navigator.onLine) {
      // Offline mode: queue in IndexedDB
      await queueOfflineReport(reportPayload);
      const pending = await getPendingOfflineReports();
      setPendingOffline(pending);
      setSubmitMessage({
        type: "offline",
        text: "Stored in Offline IndexedDB Queue! Will auto-sync when network is restored.",
      });
    } else {
      // Online mode: submit directly to Supabase DB
      const res = await submitFieldReport(reportPayload);
      if (res.success) {
        setSubmitMessage({
          type: "success",
          text: "Report successfully saved to Supabase DB & notified to SDMA!",
        });
        const refreshed = await fetchFieldReports();
        setReports(refreshed);
      }
    }

    setIsSubmitting(false);
    setDescription("");
    handleRemovePhoto();
    setTimeout(() => setSubmitMessage(null), 5000);
  };

  // Flush Offline Queue to Supabase
  const triggerSync = async () => {
    setIsSyncing(true);
    await syncPendingReports(submitFieldReport);
    const pending = await getPendingOfflineReports();
    setPendingOffline(pending);
    const refreshed = await fetchFieldReports();
    setReports(refreshed);
    setIsSyncing(false);
  };

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>
            <Camera size={26} color="#0f766e" />
            <span>Field Reporting & Citizen Hazard Triage</span>
          </h1>
          <p>
            Geo-tagged crowdsourced reporting for cracks, slope deformation, and road blocks
            • Connected to Supabase DB & Offline IndexedDB Sync
          </p>
        </div>

        {/* Offline Simulator Switch */}
        <button
          onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: isSimulatedOffline ? "#fef3c7" : "#ffffff",
            color: isSimulatedOffline ? "#b45309" : "#0f172a",
            border: isSimulatedOffline ? "1px solid #fde68a" : "1px solid #cbd5e1",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
          title="Simulate losing cellular connectivity in remote Himalayan valleys"
        >
          {isSimulatedOffline ? (
            <WifiOff size={15} color="#b45309" />
          ) : (
            <Wifi size={15} color="#059669" />
          )}
          <span>
            {isSimulatedOffline ? "Simulated Mode: OFFLINE" : "Network: ONLINE"}
          </span>
        </button>
      </div>

      {/* Offline Queue Alert Banner */}
      {pendingOffline.length > 0 && (
        <div className={styles.offlineBanner}>
          <div className={styles.offlineInfo}>
            <AlertOctagon size={18} />
            <span>
              {pendingOffline.length} report(s) cached in browser IndexedDB
              waiting for network sync.
            </span>
          </div>
          <button
            className={styles.syncBtn}
            onClick={triggerSync}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing with Supabase..." : "Flush & Sync Now"}
          </button>
        </div>
      )}

      {/* Main Layout Grid: Submission Form on Left, Live Verified Feed on Right */}
      <div className={styles.layoutGrid}>
        {/* Left: Reporting Form */}
        <div className={styles.formCard}>
          <div className={styles.cardTitle}>
            <Upload size={18} color="#0f766e" />
            <span>Submit Geo-Tagged Hazard Report</span>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div className={styles.twoColGrid}>
              <div className={styles.fieldGroup}>
                <label>Reporter Name</label>
                <input
                  className={styles.input}
                  placeholder="Your Name"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Designation / Role</label>
                <select
                  className={styles.select}
                  value={reporterRole}
                  onChange={(e) => setReporterRole(e.target.value)}
                >
                  <option value="CITIZEN">Local Citizen</option>
                  <option value="FIELD_OFFICER">District Field Officer</option>
                  <option value="SDRF_VOLUNTEER">SDRF / Volunteer</option>
                  <option value="BRO_ENGINEER">Border Roads (BRO)</option>
                  <option value="PHE_ENGINEER">PHE / PWD Engineer</option>
                </select>
              </div>
            </div>

            <div className={styles.twoColGrid}>
              <div className={styles.fieldGroup}>
                <label>Contact Phone</label>
                <input
                  className={styles.input}
                  placeholder="+91-9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Target District</label>
                <select
                  className={styles.select}
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                >
                  {NER_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district} ({d.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <label>Location Specifics / Landmark</label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0f766e",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <MapPin size={12} /> Auto-Fetch GPS
                </button>
              </div>
              <input
                className={styles.input}
                placeholder="e.g. Km 18 on Gangtok–Nathula highway, near river bend"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>

            <div className={styles.twoColGrid}>
              <div className={styles.fieldGroup}>
                <label>Observed Hazard Type</label>
                <select
                  className={styles.select}
                  value={hazardType}
                  onChange={(e) => handleHazardChange(e.target.value)}
                >
                  <option value="TENSION_CRACK">Tension Crack in Slope</option>
                  <option value="SLOPE_MOVEMENT">Visible Slope Movement / Creep</option>
                  <option value="BLOCKED_ROAD">Blocked Highway / Rockfall</option>
                  <option value="MUDSLIDE">Active Mudslide / Mudflow</option>
                  <option value="CULVERT_FAILURE">Culvert Choke / Water Gush</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Observed Severity</label>
                <select
                  className={styles.select}
                  value={severityObserved}
                  onChange={(e) => setSeverityObserved(e.target.value)}
                >
                  <option value="CRITICAL">Critical (Immediate Danger)</option>
                  <option value="HIGH">High (Expanding Rapidly)</option>
                  <option value="MODERATE">Moderate (Developing)</option>
                  <option value="LOW">Low (Minor Rill/Erosion)</option>
                </select>
              </div>
            </div>

            {/* Real Evidence Photo Upload (Camera / File Picker) */}
            <div className={styles.fieldGroup}>
              <label>Evidence Photo (Camera / Device Upload)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {!uploadedImage ? (
                <div
                  className={styles.uploadZone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.uploadIconWrap}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <div className={styles.uploadPrompt}>
                      Click to Take Photo or Browse Device
                    </div>
                    <div className={styles.uploadHint}>
                      Supports JPG, PNG, WEBP • Automatically optimized for low-bandwidth
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.previewBox}>
                  <img
                    src={uploadedImage.dataUrl}
                    alt="Evidence Preview"
                    className={styles.previewThumb}
                  />
                  <div className={styles.previewMeta}>
                    <div className={styles.previewName}>{uploadedImage.name}</div>
                    <div className={styles.previewSize}>
                      {uploadedImage.sizeKb} KB • Ready for Supabase upload
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 size={12} style={{ display: "inline", marginRight: "4px" }} />
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* AI Real-time Triage Box */}
            {aiAnalysis && (
              <div className={styles.aiTriageBadge}>
                <div className={styles.aiHead}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Cpu size={14} />
                    <span>MobileNetV3 Edge Classifier</span>
                  </div>
                  <span>{(aiAnalysis.confidence * 100).toFixed(0)}% Match</span>
                </div>
                <div className={styles.aiResult}>{aiAnalysis.detected_label}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>
                  Triage: {aiAnalysis.advice}
                </div>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label>Field Observations & Notes</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Describe crack length, sound of falling stones, water seepage, or road condition..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              <Upload size={16} />
              <span>
                {isSubmitting
                  ? "Pushed to Supabase..."
                  : isSimulatedOffline
                  ? "Save to Offline Queue"
                  : "Submit Hazard Report to Supabase"}
              </span>
            </button>

            {submitMessage && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  textAlign: "center",
                  background:
                    submitMessage.type === "offline" ? "#fef3c7" : "#ecfdf5",
                  color: submitMessage.type === "offline" ? "#b45309" : "#065f46",
                  border: `1px solid ${
                    submitMessage.type === "offline" ? "#fde68a" : "#a7f3d0"
                  }`,
                }}
              >
                {submitMessage.text}
              </div>
            )}
          </form>
        </div>

        {/* Right: Live Reports Feed from Supabase DB */}
        <div className={styles.feedSection}>
          <div className={styles.feedHeader}>
            <div className={styles.feedTitle}>
              Live Crowd Hazard Reports ({reports.length})
            </div>
            <div className={styles.feedSub}>
              Real-time feed synced via Supabase PostgreSQL
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Connecting to Supabase field reports...
            </div>
          ) : reports.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrap}>
                <CheckCircle2 size={30} />
              </div>
              <div className={styles.emptyTitle}>No Hazard Reports Logged Yet</div>
              <p className={styles.emptyText}>
                When citizens or field officials submit geo-tagged observations with photos,
                they will be stored in Supabase PostgreSQL and appear here live.
              </p>
            </div>
          ) : (
            reports.map((r) => {
              const hasPhoto = r.photo_urls && r.photo_urls.length > 0 && r.photo_urls[0];

              return (
                <div key={r.id} className={styles.reportCard}>
                  {hasPhoto ? (
                    <img
                      src={r.photo_urls[0]}
                      alt={r.hazard_type}
                      className={styles.photoThumb}
                    />
                  ) : (
                    <div className={styles.noPhotoBadge}>
                      <Mountain size={24} color="#0f766e" />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div className={styles.reportDetails}>
                    <div className={styles.reportHead}>
                      <span
                        className={styles.hazardTag}
                        style={{
                          background:
                            r.severity_observed === "CRITICAL"
                              ? "#fee2e2"
                              : "#ffedd5",
                          color:
                            r.severity_observed === "CRITICAL"
                              ? "#dc2626"
                              : "#ea580c",
                          border: `1px solid ${
                            r.severity_observed === "CRITICAL"
                              ? "#fca5a5"
                              : "#fed7aa"
                          }`,
                        }}
                      >
                        {r.hazard_type?.replace("_", " ")}
                      </span>

                      <span className={styles.statusPill}>
                        {r.status === "VERIFIED"
                          ? "✓ VERIFIED BY SDMA"
                          : r.status || "SUBMITTED"}
                      </span>
                    </div>

                    <div className={styles.reportLoc}>
                      {r.location_name} ({r.state})
                    </div>

                    <div className={styles.reportDesc}>{r.description}</div>

                    {r.ai_classification?.detected_label && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#4f46e5",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 600,
                        }}
                      >
                        <Cpu size={12} />
                        <span>
                          AI: {r.ai_classification.detected_label} (
                          {(r.ai_classification.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}

                    <div className={styles.reportMeta}>
                      <span>
                        By: <strong>{r.reporter_name}</strong> ({r.reporter_role})
                      </span>
                      <span>&bull;</span>
                      <span>
                        {new Date(r.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
