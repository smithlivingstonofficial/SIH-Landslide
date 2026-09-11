-- ==============================================================================
-- 🏔️ LandslideGuard AI — Supabase PostgreSQL + PostGIS Production Schema
-- Department: MDoNER | Category: Disaster Management Early Warning System
-- Covers all 8 North Eastern States: AR, AS, MN, ML, MZ, NL, SK, TR
-- Idempotent script: Safe to run multiple times without duplicate errors
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ------------------------------------------------------------------------------
-- 1. ALERTS TABLE: Real-Time Early Warnings & Broadcast Directives
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id VARCHAR(32) NOT NULL,
    district_name VARCHAR(128) NOT NULL,
    state VARCHAR(64) NOT NULL,
    state_code VARCHAR(4) NOT NULL,
    severity VARCHAR(24) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'ADVISORY')),
    hazard_type VARCHAR(48) NOT NULL CHECK (hazard_type IN ('LANDSLIDE', 'DEBRIS_FLOW', 'ROCKFALL', 'MUDSLIDE', 'ROAD_SUBSIDENCE', 'GLOF_FLASHFLOOD')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_directive TEXT NOT NULL,
    affected_population INTEGER DEFAULT 0,
    affected_villages JSONB DEFAULT '[]'::jsonb,
    channels TEXT[] DEFAULT ARRAY['IN_APP', 'SMS', 'WHATSAPP', 'CAP'],
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    multilingual_translations JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVESTIGATING', 'CONTAINED', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_by VARCHAR(64) DEFAULT 'NDMA_AUTOMATED_SYSTEM'
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_district ON public.alerts(district_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. FIELD_REPORTS TABLE: Crowdsourced Geotagged Observations & AI Triage
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_name VARCHAR(128) NOT NULL,
    reporter_role VARCHAR(32) NOT NULL DEFAULT 'CITIZEN' CHECK (reporter_role IN ('CITIZEN', 'FIELD_OFFICER', 'SDRF_VOLUNTEER', 'BRO_ENGINEER', 'PHE_ENGINEER')),
    phone_number VARCHAR(24),
    location_name VARCHAR(255) NOT NULL,
    district_id VARCHAR(32),
    state VARCHAR(64),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    hazard_type VARCHAR(48) NOT NULL CHECK (hazard_type IN ('TENSION_CRACK', 'SLOPE_MOVEMENT', 'BLOCKED_ROAD', 'MUDSLIDE', 'ROCKFALL', 'WATERLOGGING', 'CULVERT_FAILURE')),
    severity_observed VARCHAR(24) NOT NULL CHECK (severity_observed IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    ai_classification JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(24) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'VERIFIED', 'DISPATCHED', 'RESOLVED')),
    verified_by VARCHAR(64),
    offline_sync_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.field_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_district ON public.field_reports(district_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.field_reports(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. SUBSCRIBERS TABLE: Community Alert Subscriptions (SMS / WhatsApp)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    district_id VARCHAR(32) NOT NULL,
    state VARCHAR(64) NOT NULL,
    channel VARCHAR(16) NOT NULL DEFAULT 'SMS' CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL')),
    language_pref VARCHAR(16) NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'as', 'hi', 'bn', 'kha', 'mni', 'lus', 'nag')),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_district ON public.subscribers(district_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_phone ON public.subscribers(phone_number);

-- ------------------------------------------------------------------------------
-- 4. EMERGENCY_PRIORITIZATION TABLE: Triage Score & Resource Allocation
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_prioritization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id VARCHAR(32) NOT NULL UNIQUE,
    district_name VARCHAR(128) NOT NULL,
    state VARCHAR(64) NOT NULL,
    dynamic_risk_score NUMERIC(4, 2) NOT NULL,
    cutoff_severity VARCHAR(24) NOT NULL CHECK (cutoff_severity IN ('CRITICAL_ISOLATION', 'SINGLE_LANE_ONLY', 'NORMAL')),
    isolated_villages_count INTEGER DEFAULT 0,
    vulnerable_population INTEGER DEFAULT 0,
    priority_rank INTEGER NOT NULL,
    emergency_priority_score NUMERIC(5, 2) NOT NULL,
    ndrf_assigned_team VARCHAR(128),
    relief_shelter_status VARCHAR(64) DEFAULT 'OPERATIONAL',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES (Idempotent: Drops first if existing)
-- ------------------------------------------------------------------------------
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_prioritization ENABLE ROW LEVEL SECURITY;

-- 5.1 Alerts Policies
DROP POLICY IF EXISTS "Public Read Alerts" ON public.alerts;
DROP POLICY IF EXISTS "Public Insert Alerts" ON public.alerts;
DROP POLICY IF EXISTS "Public Update Alerts" ON public.alerts;
DROP POLICY IF EXISTS "Public Delete Alerts" ON public.alerts;

CREATE POLICY "Public Read Alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Public Insert Alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Alerts" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "Public Delete Alerts" ON public.alerts FOR DELETE USING (true);

-- 5.2 Field Reports Policies
DROP POLICY IF EXISTS "Public Read Reports" ON public.field_reports;
DROP POLICY IF EXISTS "Public Insert Reports" ON public.field_reports;
DROP POLICY IF EXISTS "Public Update Reports" ON public.field_reports;
DROP POLICY IF EXISTS "Public Delete Reports" ON public.field_reports;

CREATE POLICY "Public Read Reports" ON public.field_reports FOR SELECT USING (true);
CREATE POLICY "Public Insert Reports" ON public.field_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Reports" ON public.field_reports FOR UPDATE USING (true);
CREATE POLICY "Public Delete Reports" ON public.field_reports FOR DELETE USING (true);

-- 5.3 Subscribers Policies
DROP POLICY IF EXISTS "Public Read Subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Public Insert Subscribers" ON public.subscribers;

CREATE POLICY "Public Read Subscribers" ON public.subscribers FOR SELECT USING (true);
CREATE POLICY "Public Insert Subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);

-- 5.4 Emergency Prioritization Policies
DROP POLICY IF EXISTS "Public Read Emergency Triage" ON public.emergency_prioritization;
DROP POLICY IF EXISTS "Public Upsert Emergency Triage" ON public.emergency_prioritization;

CREATE POLICY "Public Read Emergency Triage" ON public.emergency_prioritization FOR SELECT USING (true);
CREATE POLICY "Public Upsert Emergency Triage" ON public.emergency_prioritization FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 6. REALTIME REPLICATION ENABLEMENT
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.field_reports;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ------------------------------------------------------------------------------
-- 7. SEED DATA: Pre-populate Realistic Active Disaster Alerts (Idempotent)
-- ------------------------------------------------------------------------------
INSERT INTO public.alerts (
    id, district_id, district_name, state, state_code, severity, hazard_type,
    title, description, action_directive, affected_population, affected_villages,
    channels, latitude, longitude, multilingual_translations, status, created_at
) VALUES
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'SK-001', 'Mangan', 'Sikkim', 'SK', 'CRITICAL', 'LANDSLIDE',
    'CRITICAL RED ALERT: Massive Slope Failure Hazard along Chungthang–Lachen Axis',
    'Precipitation gauge recorded 145mm rainfall in 24 hours. ECMWF soil saturation exceeds 85%. Active fissuring observed along NH10 corridor.',
    'IMMEDIATE ACTION: Evacuate riverside wards and fragile slope hamlets to Mangan Higher Secondary Relief Shelter. Suspend all vehicular transit past Dikchu bridge.',
    43709,
    '["Lachen", "Lachung", "Chungthang", "Naga", "Singhik"]'::jsonb,
    ARRAY['IN_APP', 'SMS', 'WHATSAPP', 'CAP'],
    27.5090, 88.5320,
    '{
        "as": "জৰুৰী সতৰ্কবাৰ্তা: মংগান জিলাত প্ৰচণ্ড ভূমিস্খলনৰ সম্ভাৱনা। নিৰাপদ আশ্ৰয়লৈ স্থানান্তৰ হওক।",
        "hi": "आपातकालीन चेतावनी: मंगन जिले में भारी भूस्खलन का खतरा। कृपया तुरंत सुरक्षित आश्रयों में जाएं।",
        "bn": "জরুরি সতর্কতা: মঙ্গন জেলায় মারাত্মক ভূমিধসের ঝুঁকি। অবিলম্বে নিরাপদ স্থানে সরে যান।",
        "kha": "Ka jingma ba jur: Ka jingtwa khyndew ha Mangan. Phet sha ki jaka ba shngain.",
        "mni": "অককপবা পাউ: মঙ্গন জিলাদা অচৌবা চীং য়ৈথবা য়াবা ফিভম লৈরে।",
        "lus": "Hriattirna hlauhawm: Mangan bialah leimin a hlauhawm hle. Hmun him lam pan nghal rawh u."
    }'::jsonb,
    'ACTIVE',
    NOW() - INTERVAL '25 minutes'
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'AS-005', 'Dima Hasao', 'Assam', 'AS', 'HIGH', 'DEBRIS_FLOW',
    'HIGH ALERT: Jatinga Valley & Haflong Hill Cutoff Risk',
    'Cumulative 7-day rainfall reached 310mm. Debris flow detected along Lumding–Badarpur hill railway line and NH27 Mahur bypass.',
    'HIGH ADVISORY: BRO and SDRF teams mobilized for clearance. Restrict night travel across Jatinga gorge.',
    214102,
    '["Jatinga", "Mahur", "Harangajao", "Maibang"]'::jsonb,
    ARRAY['IN_APP', 'SMS', 'WHATSAPP'],
    25.1830, 93.0170,
    '{
        "as": "উচ্চ সতৰ্কবাৰ্তা: ডিমা হাছাওত ভূমিস্খলনৰ ফলত পথ বন্ধ হোৱাৰ সম্ভাৱনা।",
        "hi": "उच्च चेतावनी: दीमा हसाओ में भारी बारिश के कारण मलबा गिरने का खतरा।"
    }'::jsonb,
    'ACTIVE',
    NOW() - INTERVAL '1 hour 15 minutes'
),
(
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'ML-001', 'East Khasi Hills', 'Meghalaya', 'ML', 'MODERATE', 'MUDSLIDE',
    'MODERATE ADVISORY: Sohra (Cherrapunji) Escarpment Saturation',
    'Continuous heavy precipitation with soil moisture saturation at 74%. Moderate road subsidence near Wahkhen and Mawlynnong ridge.',
    'ADVISORY: Tourists advised against canyon hikes. District police maintaining one-way traffic on Shillong–Dawki highway.',
    825922,
    '["Wahkhen", "Khatarshnong", "Mawkdok"]'::jsonb,
    ARRAY['IN_APP', 'SMS'],
    25.5788, 91.8933,
    '{
        "kha": "Ka jingmahar: Ki lynti Sohra ki lah ban jia jingtwa khyndew. Sumar ha ka leit ka wan.",
        "en": "MODERATE ADVISORY: Rain-induced slope instability on Sohra canyon roads."
    }'::jsonb,
    'ACTIVE',
    NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO NOTHING;
