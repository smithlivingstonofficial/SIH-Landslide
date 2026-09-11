/**
 * 🏔️ LandslideGuard AI — Offline Storage & Background Sync Queue
 * Uses browser IndexedDB to persist field hazard reports and alerts in remote Himalayan areas
 * with zero or unstable cellular connectivity.
 * Automatically synchronizes with Supabase when online connectivity is restored.
 */

const DB_NAME = "LandslideGuardOfflineDB";
const DB_VERSION = 1;
const STORE_PENDING_REPORTS = "pending_field_reports";
const STORE_CACHED_ALERTS = "cached_alerts";

/**
 * Initializes or opens the IndexedDB database instance.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return resolve(null);
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PENDING_REPORTS)) {
        db.createObjectStore(STORE_PENDING_REPORTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CACHED_ALERTS)) {
        db.createObjectStore(STORE_CACHED_ALERTS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a field report locally when in offline mode.
 */
export async function queueOfflineReport(report) {
  const db = await openDB();
  const entry = {
    ...report,
    id: report.id || `offline-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    isOfflineQueued: true,
    queuedAt: new Date().toISOString(),
  };

  if (!db) {
    // Fallback to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(STORE_PENDING_REPORTS) || "[]");
      existing.unshift(entry);
      localStorage.setItem(STORE_PENDING_REPORTS, JSON.stringify(existing));
    } catch (e) {
      console.warn("Storage error", e);
    }
    return entry;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_REPORTS, "readwrite");
    const store = tx.objectStore(STORE_PENDING_REPORTS);
    const req = store.put(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Gets all pending offline field reports.
 */
export async function getPendingOfflineReports() {
  const db = await openDB();
  if (!db) {
    try {
      return JSON.parse(localStorage.getItem(STORE_PENDING_REPORTS) || "[]");
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PENDING_REPORTS, "readonly");
    const store = tx.objectStore(STORE_PENDING_REPORTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Removes an offline report after it has been synced to Supabase.
 */
export async function removePendingReport(id) {
  const db = await openDB();
  if (!db) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORE_PENDING_REPORTS) || "[]");
      const filtered = existing.filter((r) => r.id !== id);
      localStorage.setItem(STORE_PENDING_REPORTS, JSON.stringify(filtered));
    } catch {}
    return;
  }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PENDING_REPORTS, "readwrite");
    const store = tx.objectStore(STORE_PENDING_REPORTS);
    store.delete(id);
    tx.oncomplete = () => resolve();
  });
}

/**
 * Caches active alerts locally so emergency responders can view them without internet.
 */
export async function cacheAlertsLocally(alerts) {
  const db = await openDB();
  if (!db) {
    try {
      localStorage.setItem(STORE_CACHED_ALERTS, JSON.stringify(alerts));
    } catch {}
    return;
  }

  const tx = db.transaction(STORE_CACHED_ALERTS, "readwrite");
  const store = tx.objectStore(STORE_CACHED_ALERTS);
  store.clear();
  alerts.forEach((alert) => store.put(alert));
}

/**
 * Retrieves cached alerts from IndexedDB.
 */
export async function getCachedAlerts() {
  const db = await openDB();
  if (!db) {
    try {
      return JSON.parse(localStorage.getItem(STORE_CACHED_ALERTS) || "[]");
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CACHED_ALERTS, "readonly");
    const store = tx.objectStore(STORE_CACHED_ALERTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Flushes all pending offline reports to Supabase via the provided submitFn.
 */
export async function syncPendingReports(submitFn) {
  const pending = await getPendingOfflineReports();
  if (!pending || pending.length === 0) return { count: 0, items: [] };

  const synced = [];
  for (const item of pending) {
    try {
      await submitFn(item);
      await removePendingReport(item.id);
      synced.push(item);
    } catch (err) {
      console.warn("Failed to sync item:", item.id, err);
    }
  }

  return { count: synced.length, items: synced };
}
