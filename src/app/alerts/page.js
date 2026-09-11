"use client";
import { useState, useEffect, useMemo } from "react";
import {
  BellRing,
  AlertTriangle,
  Radio,
  Search,
  CheckCircle2,
  Users,
  Send,
  Globe2,
  FileCode,
  Compass,
  X,
  Phone,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import {
  fetchAlerts,
  broadcastAlert,
  updateAlertStatus,
  subscribeToAlerts,
  addSubscriber,
  fetchSubscribers,
} from "@/lib/supabase";
import {
  generateMultilingualAlerts,
  generateCAPXml,
  SUPPORTED_LANGUAGES,
} from "@/services/multilingualAlerts";
import { NER_DISTRICTS, NER_STATES } from "@/data/nerData";
import styles from "./alerts.module.css";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Broadcast Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState("SK-001");
  const [hazardType, setHazardType] = useState("LANDSLIDE");
  const [severity, setSeverity] = useState("CRITICAL");
  const [customTitle, setCustomTitle] = useState("");
  const [customDirective, setCustomDirective] = useState("");
  const [selectedChannels, setSelectedChannels] = useState([
    "IN_APP",
    "SMS",
    "WHATSAPP",
    "CAP",
  ]);
  const [previewLang, setPreviewLang] = useState("en");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Subscriber Form State
  const [subName, setSubName] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [subDistrict, setSubDistrict] = useState("SK-001");
  const [subChannel, setSubChannel] = useState("SMS");
  const [subLang, setSubLang] = useState("en");
  const [subSuccess, setSubSuccess] = useState(false);

  // Load initial data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [alertList, subList] = await Promise.all([
        fetchAlerts(),
        fetchSubscribers(),
      ]);
      setAlerts(alertList || []);
      setSubscribers(subList || []);
      setLoading(false);
    }
    load();

    // Subscribe to live updates
    const unsubscribe = subscribeToAlerts((updatedAlert) => {
      setAlerts((prev) => {
        const existingIdx = prev.findIndex((a) => a.id === updatedAlert.id);
        if (existingIdx >= 0) {
          const clone = [...prev];
          clone[existingIdx] = updatedAlert;
          return clone;
        }
        return [updatedAlert, ...prev];
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Selected district object for modal
  const targetDistrict = useMemo(() => {
    return (
      NER_DISTRICTS.find((d) => d.id === selectedDistrictId) ||
      NER_DISTRICTS[0]
    );
  }, [selectedDistrictId]);

  // Dynamic multilingual translation preview
  const liveTranslations = useMemo(() => {
    return generateMultilingualAlerts({
      districtName: targetDistrict.district,
      stateName: targetDistrict.state,
      severity,
      hazardType,
      customDirective,
    });
  }, [targetDistrict, severity, hazardType, customDirective]);

  // CAP XML Preview
  const liveCAP = useMemo(() => {
    return generateCAPXml({
      alertId: "DRAFT-1",
      districtName: targetDistrict.district,
      stateName: targetDistrict.state,
      severity,
      hazardType,
      headline: customTitle || liveTranslations.en.title,
      description: liveTranslations.en.message,
      instruction: customDirective || liveTranslations.en.directive,
      lat: targetDistrict.lat,
      lng: targetDistrict.lng,
    });
  }, [targetDistrict, severity, hazardType, customTitle, liveTranslations, customDirective]);

  // Handle Broadcast Submission
  const handleBroadcast = async (e) => {
    e.preventDefault();
    setIsBroadcasting(true);

    const alertPayload = {
      district_id: targetDistrict.id,
      district_name: targetDistrict.district,
      state: targetDistrict.state,
      state_code: targetDistrict.stateCode,
      severity,
      hazard_type: hazardType,
      title: customTitle || liveTranslations.en.title,
      description: liveTranslations.en.message,
      action_directive: customDirective || liveTranslations.en.directive,
      affected_population: targetDistrict.population,
      affected_villages: [targetDistrict.district + " Central", "Outer Ridges"],
      channels: selectedChannels,
      latitude: targetDistrict.lat,
      longitude: targetDistrict.lng,
      multilingual_translations: Object.fromEntries(
        Object.entries(liveTranslations).map(([k, v]) => [k, v.message])
      ),
      status: "ACTIVE",
    };

    const res = await broadcastAlert(alertPayload);
    setIsBroadcasting(false);
    if (res.success) {
      setIsModalOpen(false);
      setCustomTitle("");
      setCustomDirective("");
    }
  };

  // Handle Subscriber Registration
  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    if (!subPhone) return;
    const districtObj = NER_DISTRICTS.find((d) => d.id === subDistrict);
    await addSubscriber({
      name: subName || "Citizen Responder",
      phone_number: subPhone,
      district_id: subDistrict,
      state: districtObj?.state || "Sikkim",
      channel: subChannel,
      language_pref: subLang,
    });
    setSubSuccess(true);
    setSubPhone("");
    setSubName("");
    const refreshed = await fetchSubscribers();
    setSubscribers(refreshed);
    setTimeout(() => setSubSuccess(false), 4000);
  };

  // Handle Alert Resolution
  const handleResolveAlert = async (id) => {
    await updateAlertStatus(id, "RESOLVED");
    const refreshed = await fetchAlerts();
    setAlerts(refreshed);
  };

  // Filtered Alert List
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchSearch =
        !searchQuery.trim() ||
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.district_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.state?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeverity =
        severityFilter === "ALL" || a.severity === severityFilter;
      const matchState = stateFilter === "ALL" || a.state === stateFilter;
      const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
      return matchSearch && matchSeverity && matchState && matchStatus;
    });
  }, [alerts, searchQuery, severityFilter, stateFilter, statusFilter]);

  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;
  const criticalCount = alerts.filter(
    (a) => a.status === "ACTIVE" && a.severity === "CRITICAL"
  ).length;

  return (
    <div className={styles.alertsContainer}>
      {/* Title & Actions Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>
            <ShieldAlert size={26} color="#ef4444" />
            <span>Emergency Alert & Broadcast Center</span>
          </h1>
          <p>
            Connected to Supabase Realtime Database • Dispatches to SACHET, SMS
            Gateways, WhatsApp & In-App Radios
          </p>
        </div>

        <button
          className={styles.broadcastBtn}
          onClick={() => setIsModalOpen(true)}
        >
          <Radio size={16} />
          <span>Broadcast Emergency Alert</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div
            className={styles.statIcon}
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{criticalCount}</div>
            <div className={styles.statLabel}>Critical Level-4 Alerts</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIcon}
            style={{ background: "rgba(249, 115, 22, 0.15)", color: "#f97316" }}
          >
            <BellRing size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{activeCount}</div>
            <div className={styles.statLabel}>Active Incident Directives</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIcon}
            style={{ background: "rgba(45, 212, 191, 0.15)", color: "#2dd4bf" }}
          >
            <Users size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{subscribers.length}</div>
            <div className={styles.statLabel}>Community Alert Recipients</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIcon}
            style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
          >
            <Globe2 size={22} />
          </div>
          <div>
            <div className={styles.statValue}>8 Languages</div>
            <div className={styles.statLabel}>Instant Vernacular Matrix</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <div className={styles.searchBox}>
            <Search size={15} color="#64748b" />
            <input
              placeholder="Search by district, state, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Threat Levels</option>
            <option value="CRITICAL">Critical (Level 4)</option>
            <option value="HIGH">High (Level 3)</option>
            <option value="MODERATE">Moderate (Level 2)</option>
            <option value="ADVISORY">Advisory (Level 1)</option>
          </select>

          <select
            className={styles.filterSelect}
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="ALL">All 8 NER States</option>
            {NER_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Warnings</option>
            <option value="RESOLVED">Resolved Archive</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Feed + Community Registration Sidebar */}
      <div className={styles.alertsGrid}>
        {/* Left: Alerts Feed */}
        <div className={styles.feedSection}>
          {loading ? (
            <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>
              Connecting to Supabase Realtime alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
                color: "#94a3b8",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
              }}
            >
              <CheckCircle2
                size={36}
                color="#10b981"
                style={{ margin: "0 auto 12px" }}
              />
              <div style={{ fontSize: "16px", color: "#f8fafc", fontWeight: 700 }}>
                No alerts match the selected criteria
              </div>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                All districts within selected parameters are currently nominal.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const sevClass =
                alert.severity === "CRITICAL"
                  ? styles.alertCritical
                  : alert.severity === "HIGH"
                  ? styles.alertHigh
                  : styles.alertModerate;

              const badgeClass =
                alert.severity === "CRITICAL"
                  ? styles.badgeCritical
                  : alert.severity === "HIGH"
                  ? styles.badgeHigh
                  : styles.badgeModerate;

              return (
                <div
                  key={alert.id}
                  className={`${styles.alertCard} ${sevClass}`}
                >
                  <div className={styles.alertCardHeader}>
                    <div className={styles.badgeGroup}>
                      <span className={`${styles.severityBadge} ${badgeClass}`}>
                        {alert.severity}
                      </span>
                      <span className={styles.locationBadge}>
                        <Compass size={13} color="#2dd4bf" />
                        {alert.district_name}, {alert.state}
                      </span>
                    </div>

                    <div className={styles.timeBadge}>
                      {new Date(alert.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>

                  <div className={styles.alertTitle}>{alert.title}</div>
                  <div className={styles.alertDescription}>
                    {alert.description}
                  </div>

                  {alert.action_directive && (
                    <div className={styles.directiveBox}>
                      <strong>Operational Directive:</strong> {alert.action_directive}
                    </div>
                  )}

                  {/* Multilingual Preview Tags */}
                  {alert.multilingual_translations && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        Translations Available:
                      </span>
                      {Object.keys(alert.multilingual_translations).map((lang) => (
                        <span
                          key={lang}
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(45, 212, 191, 0.1)",
                            color: "#2dd4bf",
                            border: "1px solid rgba(45, 212, 191, 0.2)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={styles.alertMetaRow}>
                    <div className={styles.channelPills}>
                      <span style={{ fontSize: "11px", marginRight: "4px" }}>
                        Broadcast Channels:
                      </span>
                      {(alert.channels || ["IN_APP", "SMS"]).map((c) => (
                        <span key={c} className={styles.channelPill}>
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className={styles.actionBtns}>
                      {alert.status === "ACTIVE" ? (
                        <button
                          className={styles.resolveBtn}
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Mark as Contained / Resolved
                        </button>
                      ) : (
                        <span style={{ color: "#10b981", fontWeight: 700 }}>
                          ✓ RESOLVED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Sidebar: Community Subscribers & CAP Info */}
        <div className={styles.sidebarSection}>
          {/* Subscribe to Warnings Card */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHead}>
              <Phone size={15} color="#2dd4bf" />
              <span>Community Alert Registration</span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "14px",
                lineHeight: 1.4,
              }}
            >
              Subscribe village councils, local schools, and volunteers to instant
              automated SMS/WhatsApp landslide warnings.
            </p>

            <form onSubmit={handleAddSubscriber} className={styles.subscribeForm}>
              <div className={styles.formField}>
                <label>Contact Name / Organization</label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Village Head / Teacher"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label>Phone Number (with WhatsApp/SMS)</label>
                <input
                  className={styles.formInput}
                  placeholder="+91 98765 43210"
                  value={subPhone}
                  onChange={(e) => setSubPhone(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label>Target District</label>
                <select
                  className={styles.formSelect}
                  value={subDistrict}
                  onChange={(e) => setSubDistrict(e.target.value)}
                >
                  {NER_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district} ({d.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label>Channel & Vernacular Preference</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className={styles.formSelect}
                    style={{ flex: 1 }}
                    value={subChannel}
                    onChange={(e) => setSubChannel(e.target.value)}
                  >
                    <option value="SMS">SMS Gateway</option>
                    <option value="WHATSAPP">WhatsApp API</option>
                  </select>

                  <select
                    className={styles.formSelect}
                    style={{ flex: 1 }}
                    value={subLang}
                    onChange={(e) => setSubLang(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className={styles.subSubmitBtn}>
                Register for Live Warnings
              </button>

              {subSuccess && (
                <div
                  style={{
                    color: "#10b981",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "center",
                    marginTop: "6px",
                  }}
                >
                  ✓ Registered into Supabase subscriber table!
                </div>
              )}
            </form>
          </div>

          {/* Interoperability Card */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHead}>
              <FileCode size={15} color="#818cf8" />
              <span>CAP 1.2 Interoperability</span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                lineHeight: 1.45,
                marginBottom: "10px",
              }}
            >
              All alerts published through LandslideGuard AI are formatted in
              international ITU / OASIS Common Alerting Protocol (CAP) 1.2,
              enabling direct handoff to NDMA SACHET and C-DOT cell broadcast towers.
            </p>
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                borderRadius: "6px",
                padding: "8px 10px",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#2dd4bf",
              }}
            >
              urn:oasis:names:tc:emergency:cap:1.2
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EMERGENCY BROADCAST MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <Radio size={20} color="#ef4444" />
                <span>Broadcast Live Disaster Early Warning</span>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleBroadcast}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Target District */}
              <div className={styles.formField}>
                <label>Select Target District (All 128 NER Districts)</label>
                <select
                  className={styles.formSelect}
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                >
                  {NER_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district} — {d.state} (Current Risk: {d.riskLevel}, Pop:{" "}
                      {d.population.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Threat Severity & Hazard Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formField}>
                  <label>Severity Level</label>
                  <select
                    className={styles.formSelect}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="CRITICAL">Critical (Level 4 - Evacuation)</option>
                    <option value="HIGH">High Alert (Level 3 - Warning)</option>
                    <option value="MODERATE">Moderate Advisory (Level 2)</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label>Hazard Classification</label>
                  <select
                    className={styles.formSelect}
                    value={hazardType}
                    onChange={(e) => setHazardType(e.target.value)}
                  >
                    <option value="LANDSLIDE">Rotational / Planar Landslide</option>
                    <option value="DEBRIS_FLOW">Rapid Debris Flow / Slurry</option>
                    <option value="ROCKFALL">Rockfall / Cliff Collapse</option>
                    <option value="MUDSLIDE">Slope Mudslide</option>
                    <option value="ROAD_SUBSIDENCE">Highway Subsidence / Cut</option>
                  </select>
                </div>
              </div>

              {/* Custom Directive (Optional) */}
              <div className={styles.formField}>
                <label>Operational Directive / Shelter Instructions (Optional)</label>
                <input
                  className={styles.formInput}
                  placeholder={liveTranslations.en.directive}
                  value={customDirective}
                  onChange={(e) => setCustomDirective(e.target.value)}
                />
              </div>

              {/* Broadcast Channels */}
              <div className={styles.formField}>
                <label>Dissemination Channels</label>
                <div className={styles.checkboxGroup}>
                  {[
                    { id: "IN_APP", label: "In-App Telemetry Banner" },
                    { id: "SMS", label: "Cellular SMS (MSG91/DLT Unicode)" },
                    { id: "WHATSAPP", label: "WhatsApp Emergency Broadcast" },
                    { id: "CAP", label: "CAP 1.2 NDMA SACHET Protocol" },
                  ].map((ch) => (
                    <label key={ch.id} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(ch.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChannels([...selectedChannels, ch.id]);
                          } else {
                            setSelectedChannels(
                              selectedChannels.filter((c) => c !== ch.id)
                            );
                          }
                        }}
                      />
                      <span>{ch.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live Multilingual Translation Preview */}
              <div className={styles.multilingualPreview}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginBottom: "6px",
                  }}
                >
                  LIVE MULTILINGUAL DISPATCH PREVIEW
                </div>

                <div className={styles.previewTabs}>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`${styles.previewTab} ${
                        previewLang === lang.code ? styles.previewTabActive : ""
                      }`}
                      onClick={() => setPreviewLang(lang.code)}
                    >
                      {lang.localName} ({lang.name})
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.previewTab} ${
                      previewLang === "cap" ? styles.previewTabActive : ""
                    }`}
                    onClick={() => setPreviewLang("cap")}
                  >
                    CAP XML
                  </button>
                </div>

                <div className={styles.previewBox}>
                  {previewLang === "cap" ? (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: "#2dd4bf",
                        maxHeight: "130px",
                        overflowY: "auto",
                      }}
                    >
                      {liveCAP}
                    </pre>
                  ) : (
                    <div>
                      <strong style={{ color: "#ffffff" }}>
                        {liveTranslations[previewLang]?.title}
                      </strong>
                      <p style={{ marginTop: "4px" }}>
                        {liveTranslations[previewLang]?.message}
                      </p>
                      <div
                        style={{
                          color: "#fca5a5",
                          fontSize: "11.5px",
                          marginTop: "4px",
                        }}
                      >
                        Direct: {liveTranslations[previewLang]?.directive}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Broadcast Submit Button */}
              <button
                type="submit"
                disabled={isBroadcasting}
                className={styles.broadcastBtn}
                style={{
                  justifyContent: "center",
                  padding: "12px",
                  marginTop: "8px",
                  fontSize: "14px",
                }}
              >
                <Send size={16} />
                <span>
                  {isBroadcasting
                    ? "Publishing to Supabase Realtime..."
                    : "Authorize & Broadcast Alert"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
