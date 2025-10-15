/**
 * Firebase Leaderboard Service (ESM)
 *
 * Goals:
 * - Minimal, robust Firebase Firestore integration for leaderboards
 * - Dynamic import of Firebase modules (no bundling required)
 * - Throttled writes to avoid rate limits on free tier
 * - Live subscription with safe fallbacks (local only if Firebase unavailable)
 * - No breaking changes: can be ignored if not initialized
 *
 * Usage:
 *   import Leaderboard from "./firebase.mjs";
 *   Leaderboard.init({
 *     apiKey: "...",
 *     authDomain: "...",
 *     projectId: "...",
 *     collection: "leaderboard_test", // optional (default: "leaderboard")
 *   });
 *
 *   // Submit player's score (throttled)
 *   Leaderboard.submit({
 *     name: state?.player?.name || "Player",
 *     avatar: state?.player?.avatar || "",
 *     packets: state?.packets || 0,
 *   });
 *
 *   // Subscribe to updates (sorted desc by packets)
 *   const unsub = Leaderboard.subscribe((rows) => {
 *     // rows: [{id, name, packets, avatar, updatedAt}]
 *     // Render your leaderboard using these rows
 *   });
 *
 *   // Later
 *   unsub?.();
 *
 * Notes:
 * - Requires Firestore rules to accept this write pattern (doc-per-device).
 * - Uses a per-device ID derived from localStorage (no user auth).
 * - Write throttle default: 20s, with exponential backoff on errors.
 */

const CDN_BASE = "https://www.gstatic.com/firebasejs/10.12.2";
/**
 * Default Firebase config for Packet Clicker Leaderboard.
 * Overridden by window.FIREBASE_CONFIG or by init(config).
 * Keep secrets server-side in production. This is for test/dev ranking only.
 */
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyA6KOXoqPl2khvvdb-I9GCStFt68PCPpYM",
  authDomain: "packetclicker.firebaseapp.com",
  databaseURL: "https://packetclicker-default-rtdb.firebaseio.com",
  projectId: "packetclicker",
  storageBucket: "packetclicker.firebasestorage.app",
  messagingSenderId: "321149831631",
  appId: "1:321149831631:web:c58bec15f05d204982eaba",
  collection: "leaderboard",
};

// Internal module cache
let _app = null;
let _db = null;
let _config = null;
let _collection = "leaderboard";
let _ready = false;

// Write throttle/backoff
let _writeTimer = null;
let _pendingDoc = null;
let _lastWriteMs = 0;
let _lastSentPackets = null;
let _lastSentLevel = null;
let _lastSentPrestige = null;
let _backoffMs = 0;

// Subscription
let _unsubscribe = null;

// Fallback subscription (local only)
let _fallbackTimer = null;

// Device identity
const DEVICE_KEY = "pc_device_id_v1";

/* ------------------------------- Utilities -------------------------------- */

function clamp(n, min, max) {
  n = Number(n) || 0;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
function sanitizeName(name) {
  try {
    let s = String(name || "").trim();
    if (!s) return "Player";
    // Limit length to protect Firestore index size
    s = s.slice(0, 24);
    return s;
  } catch {
    return "Player";
  }
}
function sanitizeAvatar(url) {
  try {
    const s = String(url || "").trim();
    if (!s) return "";
    // Accept http(s) URLs and data URLs for custom avatars
    if (/^https?:\/\//i.test(s)) return s.slice(0, 256);
    if (/^data:image\//i.test(s)) return s.slice(0, 200000); // Allow data URLs up to 200KB
    return "";
  } catch {
    return "";
  }
}
function nowTs() {
  return Date.now();
}
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        "dev_" +
        Math.random().toString(36).slice(2) +
        "_" +
        Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // Non-persistent fallback
    return "dev_mem_" + Math.random().toString(36).slice(2);
  }
}

/* --------------------------- Dynamic Firebase ----------------------------- */

async function lazyFirebase() {
  if (_app && _db) return { _app, _db };
  // If Firebase already on window (compat), do not attempt dynamic import
  if (
    typeof window !== "undefined" &&
    window.firebase &&
    window.firebase.firestore
  ) {
    // v8 compat
    try {
      _app = window.firebase.app
        ? window.firebase.app()
        : window.firebase.initializeApp(_config || {});
      _db = window.firebase.firestore();
      _ready = true;
      return { _app, _db };
    } catch {
      // fall through to modular import
    }
  }
  // Modular v10
  const [{ initializeApp, getApps, getApp }, fs] = await Promise.all([
    import(`${CDN_BASE}/firebase-app.js`),
    import(`${CDN_BASE}/firebase-firestore.js`),
  ]);
  const {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit,
    collection,
  } = fs;

  // Attach helpers for later
  lazyFirebase.fs = {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit,
    collection,
  };

  if (!getApps().length) {
    if (!_config || !(_config.projectId && _config.apiKey)) {
      throw new Error("Firebase not configured");
    }
    _app = initializeApp(_config);
  } else {
    _app = getApp();
  }
  _db = getFirestore(_app);
  _ready = true;
  return { _app, _db };
}

/* --------------------------- Firebase Storage (optional) ---------------------------- */
// Lazy-load Storage SDK only when needed (avatar data URLs)
async function getStorageApi() {
  try {
    if (lazyFirebase.st) return lazyFirebase.st;
    const st = await import(`${CDN_BASE}/firebase-storage.js`);
    const { getStorage, ref, uploadString, uploadBytes, getDownloadURL } = st;
    lazyFirebase.st = {
      getStorage,
      ref,
      uploadString,
      uploadBytes,
      getDownloadURL,
    };
    return lazyFirebase.st;
  } catch (e) {
    console.warn("[Leaderboard] storage module unavailable:", e);
    throw e;
  }
}

/**
 * If avatar is a data URL, upload to Firebase Storage and return a https URL.
 * Returns a sanitized https URL or empty string on failure.
 */
async function maybeUploadAvatar(id, avatar) {
  const raw = String(avatar || "");

  try {
    if (!raw.startsWith("data:")) {
      return sanitizeAvatar(raw);
    }

    // Handle legacy large data URLs - if too large, try to upload anyway or fallback to empty
    if (raw.length > 200000) {
      console.warn(
        "[Leaderboard] Legacy large avatar detected for",
        id,
        "- attempting upload or using fallback",
      );
      // Continue with upload attempt - if it fails, we'll fallback gracefully
    }

    // Validate data URL before processing
    if (raw.length > 200000) {
      console.warn("[Leaderboard] Avatar data URL exceeds 200KB limit");
      return "";
    }

    // Validate data URL format
    if (!raw.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/)) {
      console.warn("[Leaderboard] Invalid data URL format for avatar");
      return "";
    }

    console.log("[Leaderboard] Starting avatar upload for device:", id);

    // Ensure Firebase is initialized
    await lazyFirebase();
    const st = await getStorageApi();
    const storage = st.getStorage(_app);

    // Create short, safe filename to avoid Firebase Storage path length limits
    const safeId = String(id || deviceId())
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 8); // Limit to 8 chars
    const shortTimestamp = Date.now().toString(36); // Base36 for shorter string
    const randomSuffix = Math.random().toString(36).substring(2, 6); // 4 random chars
    const filename = `${safeId}_${shortTimestamp}_${randomSuffix}.png`;
    const r = st.ref(storage, `avatars/${filename}`);

    console.log("[Leaderboard] Converting data URL to blob...");

    // Convert data URL to blob with error handling
    let blob;
    try {
      const response = await fetch(raw);
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }
      blob = await response.blob();

      // Validate blob size
      if (blob.size > 2 * 1024 * 1024) {
        // 2MB limit
        console.warn("[Leaderboard] Blob size exceeds 2MB limit:", blob.size);
        return "";
      }

      console.log("[Leaderboard] Blob created successfully, size:", blob.size);
    } catch (fetchError) {
      console.error(
        "[Leaderboard] Failed to convert data URL to blob:",
        fetchError,
      );
      // Fallback to data URL if conversion fails but URL is valid
      return sanitizeAvatar(raw);
    }

    // Upload with comprehensive metadata
    const metadata = {
      contentType: blob.type || "image/png",
      cacheControl: "public,max-age=3600",
      customMetadata: {
        uploadedAt: timestamp.toString(),
        deviceId: safeId,
        originalSize: raw.length.toString(),
        blobSize: blob.size.toString(),
      },
    };

    console.log("[Leaderboard] Uploading to Firebase Storage...");
    await st.uploadBytes(r, blob, metadata);

    console.log("[Leaderboard] Getting download URL...");
    const url = await st.getDownloadURL(r);

    console.log(
      "[Leaderboard] Avatar uploaded successfully:",
      url.substring(0, 100) + "...",
    );
    return sanitizeAvatar(url);
  } catch (e) {
    // Enhanced error classification
    const isNetworkError =
      e.name === "TypeError" ||
      e.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
      e.message?.includes("Failed to fetch") ||
      e.message?.includes("NetworkError") ||
      e.code === "storage/unknown";

    const isQuotaError =
      e.code === "storage/quota-exceeded" ||
      e.message?.includes("quota") ||
      e.message?.includes("storage full");

    const isPermissionError =
      e.code === "storage/unauthorized" ||
      e.code?.includes("permission") ||
      e.message?.includes("permission denied");

    const isSizeError =
      e.code === "storage/invalid-argument" ||
      e.message?.includes("size") ||
      e.message?.includes("too large");

    // Log appropriate warning/error based on error type
    if (isNetworkError) {
      console.warn("[Leaderboard] Avatar upload blocked by network/ad blocker");
    } else if (isQuotaError) {
      console.warn("[Leaderboard] Storage quota exceeded for avatar upload");
    } else if (isPermissionError) {
      console.warn("[Leaderboard] Permission denied for avatar upload");
    } else if (isSizeError) {
      console.warn("[Leaderboard] Avatar file size exceeds limits");
    } else {
      console.error(
        "[Leaderboard] Avatar upload failed:",
        e.code || e.name,
        e.message,
      );
    }

    // Return appropriate fallback based on error type and rules compliance
    if (raw && raw.startsWith("data:") && raw.length <= 200000) {
      console.log("[Leaderboard] Using data URL fallback (within 200KB limit)");
      return sanitizeAvatar(raw);
    } else if (raw && raw.startsWith("data:") && raw.length > 200000) {
      console.warn(
        "[Leaderboard] Data URL too large for fallback, using empty avatar",
      );
      return "";
    }

    return sanitizeAvatar(raw) || "";
  }
}

/* ------------------------------ Public API -------------------------------- */

async function init(config) {
  try {
    // Merge priority: DEFAULT_CONFIG <- window.FIREBASE_CONFIG <- init(config)
    const winCfg =
      typeof window !== "undefined" && window.FIREBASE_CONFIG
        ? window.FIREBASE_CONFIG
        : {};
    _config = Object.assign({}, DEFAULT_CONFIG, winCfg || {}, config || {});
    if (typeof _config.collection === "string" && _config.collection.trim()) {
      _collection = _config.collection.trim();
    }
    console.log("[Leaderboard] init", {
      projectId: _config && _config.projectId,
      collection: _collection,
    });
    // Defer actually loading Firebase until first use (write/sub), but try once here
    try {
      await lazyFirebase();
    } catch {
      // Swallow; we’ll fallback until network allows
    }
    return true;
  } catch (e) {
    console.warn("[Leaderboard] init failed:", e);
    return false;
  }
}

function isReady() {
  return !!_ready;
}

/**
 * Throttled write; merges existing doc by deviceId
 * Write at most every throttleMs, with exponential backoff on failures
 */
function submit(
  { name, packets, avatar, level, prestigeLevel } = {},
  { throttleMs = 20000 } = {},
) {
  try {
    const docData = {
      id: deviceId(),
      name: sanitizeName(name),
      packets: clamp(packets, 0, Number.MAX_SAFE_INTEGER),
      avatar: sanitizeAvatar(avatar),
      level: clamp(level || 1, 1, 999),
      prestigeLevel: clamp(prestigeLevel || 0, 0, 1000),
      updatedAt: nowTs(),
    };

    // Skip if packets, level, and prestige haven't changed (avoid spam)
    // BUT allow immediate submission when throttleMs is 0 (level/prestige updates)
    if (
      throttleMs > 0 &&
      docData.packets === _lastSentPackets &&
      docData.level === _lastSentLevel &&
      docData.prestigeLevel === _lastSentPrestige &&
      nowTs() - _lastWriteMs < throttleMs
    ) {
      return;
    }
    _pendingDoc = docData;

    if (_writeTimer) clearTimeout(_writeTimer);

    // For immediate updates (throttleMs = 0), ignore backoff and submit immediately
    if (throttleMs === 0) {
      console.log("[Leaderboard] Immediate submission triggered", {
        level: docData.level,
        prestigeLevel: docData.prestigeLevel,
        packets: docData.packets,
      });
      flushWrite();
    } else {
      const delay = Math.max(_backoffMs || 0, throttleMs);
      _writeTimer = setTimeout(flushWrite, delay);
    }
  } catch (e) {
    console.warn("[Leaderboard] submit error:", e);
  }
}

async function flushWrite() {
  if (!_pendingDoc) return;
  const docData = _pendingDoc;
  _pendingDoc = null;
  _writeTimer = null;

  try {
    const { _db } = await lazyFirebase();
    const { doc, setDoc, serverTimestamp } = lazyFirebase.fs;

    const ref = doc(_db, _collection, docData.id);

    // Validate and sanitize avatar before processing
    let avatarUrl = sanitizeAvatar(docData.avatar);

    // Enhanced avatar processing with better error handling
    if (
      typeof docData.avatar === "string" &&
      docData.avatar.startsWith("data:")
    ) {
      try {
        console.log("[Leaderboard] Processing avatar upload for", docData.id);

        // Check data URL size before upload
        if (docData.avatar.length > 200000) {
          console.warn(
            "[Leaderboard] Avatar data URL too large, using empty avatar",
          );
          avatarUrl = "";
        } else {
          avatarUrl = await maybeUploadAvatar(docData.id, docData.avatar);

          if (!avatarUrl || avatarUrl === "" || avatarUrl === "storage_url") {
            console.warn(
              "[Leaderboard] Avatar upload failed or returned invalid URL, using empty avatar",
            );
            avatarUrl = "";
          } else if (
            avatarUrl.startsWith("data:") &&
            avatarUrl.length > 200000
          ) {
            console.warn(
              "[Leaderboard] Fallback data URL too large, using empty avatar",
            );
            avatarUrl = "";
          } else {
            console.log(
              "[Leaderboard] Avatar processed successfully:",
              avatarUrl.startsWith("data:") ? "data_url" : "storage_url",
            );
          }
        }
      } catch (uploadError) {
        console.error("[Leaderboard] Avatar upload error:", uploadError);

        // Check if it's a storage quota or permission error
        const isStorageError =
          uploadError.code?.includes("storage/") ||
          uploadError.message?.includes("storage") ||
          uploadError.message?.includes("quota");

        if (isStorageError) {
          console.warn(
            "[Leaderboard] Storage issue detected, using empty avatar",
          );
        }

        avatarUrl = "";
      }
    }

    // Final validation of avatar URL before submission
    if (avatarUrl && typeof avatarUrl === "string") {
      // Ensure URL is properly formatted
      if (!avatarUrl.startsWith("http") && !avatarUrl.startsWith("data:")) {
        console.warn("[Leaderboard] Invalid avatar URL format, clearing");
        avatarUrl = "";
      }
      // Double check size limits
      if (avatarUrl.length > 50000) {
        console.warn("[Leaderboard] Avatar URL too long, clearing");
        avatarUrl = "";
      }
    }

    const payload = {
      name: docData.name,
      packets: docData.packets,
      avatar: avatarUrl || "", // Ensure string type
      level: docData.level,
      prestigeLevel: docData.prestigeLevel,
      updatedAt: serverTimestamp(),
      deviceId: docData.id,
    };

    console.log("[Leaderboard] Submitting payload:", {
      ...payload,
      avatar: payload.avatar
        ? payload.avatar.startsWith("data:")
          ? "data_url"
          : payload.avatar
        : "empty",
      level: payload.level,
      prestigeLevel: payload.prestigeLevel,
    });

    await setDoc(ref, payload, { merge: true });

    if (!_lastWriteMs) {
      console.log("[Leaderboard] First write successful", {
        id: docData.id,
        packets: docData.packets,
        level: docData.level,
        prestigeLevel: docData.prestigeLevel,
        avatar: avatarUrl
          ? avatarUrl.startsWith("data:")
            ? "data_url"
            : "storage_url"
          : "empty",
        collection: _collection,
      });
    }

    _lastWriteMs = nowTs();
    _lastSentPackets = docData.packets;
    _lastSentLevel = docData.level;
    _lastSentPrestige = docData.prestigeLevel;

    // Reset backoff on success
    _backoffMs = 0;
  } catch (e) {
    // Enhanced error classification
    const isNetworkError =
      e.name === "TypeError" ||
      e.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
      e.message?.includes("Failed to fetch") ||
      e.code?.includes("unavailable") ||
      e.code?.includes("network");

    const isPermissionError =
      e.code?.includes("permission") ||
      e.code?.includes("unauthorized") ||
      e.message?.includes("permission");

    const isValidationError =
      e.code?.includes("invalid-argument") ||
      e.message?.includes("validation") ||
      e.message?.includes("size");

    if (isNetworkError) {
      console.warn("[Leaderboard] Network/connectivity issue - using backoff");
    } else if (isPermissionError) {
      console.warn("[Leaderboard] Permission denied - check Firebase rules");
    } else if (isValidationError) {
      console.warn("[Leaderboard] Data validation error:", e.message);
    } else {
      console.error("[Leaderboard] Write failed with error:", e);
    }

    // Exponential backoff up to 5 minutes
    _backoffMs = Math.max(
      2000,
      Math.min(_backoffMs ? _backoffMs * 2 : 5000, 5 * 60 * 1000),
    );

    // Requeue document with potentially cleaned avatar data
    if (
      isValidationError &&
      docData.avatar &&
      docData.avatar.startsWith("data:")
    ) {
      console.log(
        "[Leaderboard] Validation error - retrying with empty avatar",
      );
      docData.avatar = ""; // Clear problematic avatar for retry
    }

    _pendingDoc = _pendingDoc || docData;

    // Re-arm timer with backoff
    _writeTimer = setTimeout(flushWrite, _backoffMs);
  }
}

/**
 * Subscribe to the top leaderboard; returns an unsubscribe function.
 * Fallback: emits local-only rows if Firebase can't be reached yet.
 */
function subscribe(callback, opts = {}) {
  const cb = typeof callback === "function" ? callback : () => {};
  const limitN = clamp(opts.limit || 50, 1, 200);

  // If already subscribed, stop it first
  unsubscribe();

  // Try Firebase live subscription
  (async () => {
    try {
      const { _db } = await lazyFirebase();
      const { collection, query, orderBy, limit, onSnapshot } = lazyFirebase.fs;
      const q = query(
        collection(_db, _collection),
        orderBy("packets", "desc"),
        limit(limitN),
      );

      _unsubscribe = onSnapshot(
        q,
        (snap) => {
          const rows = [];
          snap.forEach((doc) => {
            const d = doc.data() || {};
            const avatar = sanitizeAvatar(d.avatar);
            rows.push({
              id: doc.id,
              name: sanitizeName(d.name),
              packets: clamp(d.packets, 0, Number.MAX_SAFE_INTEGER),
              avatar: avatar,
              level: clamp(d.level || 1, 1, 999),
              prestigeLevel: clamp(d.prestigeLevel || 0, 0, 1000),
              updatedAt: d.updatedAt?.toMillis
                ? d.updatedAt.toMillis()
                : nowTs(),
            });
          });

          console.log(
            "[Leaderboard] real-time update:",
            rows.length,
            "players",
          );
          cb(rows);
        },
        (err) => {
          console.error("[Leaderboard] subscribe error:", err);
          // Switch to fallback if snapshot fails
          startFallback(cb, limitN);
        },
      );
    } catch (e) {
      // No Firebase yet: start fallback
      startFallback(cb, limitN);
    }
  })();

  // Return unified unsubscribe
  return unsubscribe;
}

function startFallback(cb, limitN) {
  stopFallback();
  // Emit local row periodically so UI remains "live"
  const emit = () => {
    try {
      const w = typeof window !== "undefined" ? window : {};
      const st = w.state || {};
      const me = {
        id: deviceId(),
        name: sanitizeName(st?.player?.name || "Player"),
        packets: clamp(st?.packets || 0, 0, Number.MAX_SAFE_INTEGER),
        avatar: sanitizeAvatar(st?.player?.avatar || ""),
        level: clamp(st?.level?.currentLevel || 1, 1, 999),
        prestigeLevel: clamp(st?.prestige?.level || 0, 0, 1000),
        updatedAt: nowTs(),
      };
      cb([me].slice(0, limitN));
    } catch {
      cb([]);
    }
  };
  emit();
  _fallbackTimer = setInterval(emit, 6000);
}

function stopFallback() {
  if (_fallbackTimer) {
    clearInterval(_fallbackTimer);
    _fallbackTimer = null;
  }
}

function unsubscribe() {
  stopFallback();
  if (_unsubscribe) {
    try {
      _unsubscribe();
    } catch {
      // ignore
    }
    _unsubscribe = null;
  }
}

function teardown() {
  unsubscribe();
  if (_writeTimer) {
    clearTimeout(_writeTimer);
    _writeTimer = null;
  }
  _pendingDoc = null;
  _ready = false;
}

/* --------------------------------- Export --------------------------------- */
/**
 * Firestore rules (copy/paste into Firebase console)
 * Option A: Time-bounded dev rules with field validation (public read)
 */
export const RULES_DEV = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{docId} {
      allow read: if true;
      allow write: if
        request.time < timestamp.date(2026, 1, 1) &&
        request.resource.data.keys().hasOnly(['name','packets','avatar','updatedAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() > 0 &&
        request.resource.data.name.size() <= 24 &&
        request.resource.data.packets is int &&
        request.resource.data.packets >= 0 &&
        request.resource.data.packets <= 1000000000 &&
        (!('avatar' in request.resource.data) || (request.resource.data.avatar is string && request.resource.data.avatar.size() <= 256));
    }
  }
}`;

/**
 * Option B: Whitelist specific tester devices (replace with your device IDs)
 * Get IDs in console: Leaderboard.getDeviceId()
 */
export const RULES_WHITELIST = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{docId} {
      allow read: if true;
      allow write: if
        docId in ['DEV_ID_Tiago','DEV_ID_Dizao'] &&
        request.resource.data.keys().hasOnly(['name','packets','avatar','updatedAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() > 0 &&
        request.resource.data.name.size() <= 24 &&
        request.resource.data.packets is int &&
        request.resource.data.packets >= 0 &&
        request.resource.data.packets <= 1000000000 &&
        (!('avatar' in request.resource.data) || (request.resource.data.avatar is string && request.resource.data.avatar.size() <= 256));
    }
  }
}`;

/**
 * Optional Firebase Storage rules helper for avatar uploads
 */
export const RULES_STORAGE = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{allPaths=**} {
      allow read: if true;
      allow write: if
        request.time < timestamp.date(2026, 1, 1) &&
        request.resource.size < 3 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
    }
  }
}
`;

const Leaderboard = {
  init,
  isReady,
  submit, // throttled write
  subscribe,
  unsubscribe,
  teardown,
  getDeviceId: deviceId,
};

// Runtime enhancements: subscribe wrapper with dedupe + resubscribe, submit wrapper to force name changes, and identity helper.
(function enhanceLeaderboard() {
  try {
    let __origSubscribe = Leaderboard.subscribe || subscribe;
    let __origUnsubscribe = Leaderboard.unsubscribe || unsubscribe;
    let __origSubmit = Leaderboard.submit || submit;

    let __lastCb = null;
    let __lastOpts = null;
    let __resubTimer = null;
    let __subBackoff = 0;
    let __uid = null;
    let __lb_lastSentName = null;
    let __liveUnsub = null;
    let __isSubscribing = false;

    async function __ensureAuth() {
      try {
        const allow =
          (typeof window !== "undefined" &&
            window.FIREBASE_ENABLE_ANON === true) ||
          (_config && _config.enableAnonAuth === true);
        if (!allow) return;
        const { _app } = await lazyFirebase();
        const fa = await import(`${CDN_BASE}/firebase-auth.js`);
        const { getAuth, signInAnonymously, onAuthStateChanged } = fa;
        const auth = getAuth(_app);
        if (!auth.currentUser) {
          await signInAnonymously(auth).catch(() => {});
        }
        __uid = (auth.currentUser && auth.currentUser.uid) || __uid;
        try {
          onAuthStateChanged(auth, (u) => {
            __uid = (u && u.uid) || null;
          });
        } catch {}
      } catch {}
    }

    function __dedupeRows(rows) {
      try {
        const myId = deviceId();
        const w = typeof window !== "undefined" ? window : {};
        const myName = sanitizeName(w.state?.player?.name || "");
        const counts = Object.create(null);
        rows.forEach((r) => {
          const n = r && r.name ? String(r.name) : "";
          counts[n] = (counts[n] || 0) + 1;
        });
        return rows.map((r) => {
          if (!r || !r.name) return r;
          const n = String(r.name);
          if (counts[n] > 1) {
            const tag = String(r.id || "").slice(-4);
            // Keep my own name unsuffixed if possible; suffix others deterministically
            if (r.id !== myId || (myName && n !== myName)) {
              return Object.assign({}, r, { name: n + "#" + tag });
            }
          }
          return r;
        });
      } catch {
        return rows;
      }
    }

    function __startSubscribe(cb, opts) {
      if (__isSubscribing) return () => {};
      __isSubscribing = true;
      // Ensure any existing native subscription is fully torn down
      try {
        __origUnsubscribe?.();
      } catch {}
      try {
        unsubscribe();
      } catch {}
      __liveUnsub = null;
      __origUnsubscribe = null;

      // Show local fallback immediately while connecting
      startFallback(cb, (opts && opts.limit) || 50);

      (async () => {
        await __ensureAuth();
        try {
          const { _db } = await lazyFirebase();
          const { collection, query, orderBy, limit, onSnapshot } =
            lazyFirebase.fs;

          const q = query(
            collection(
              _db,
              (__lastOpts && __lastOpts.collection) ||
                (typeof _collection === "string" ? _collection : "leaderboard"),
            ),
            orderBy("packets", "desc"),
            limit(clamp((opts && opts.limit) || 50, 1, 200)),
          );

          __liveUnsub = onSnapshot(
            q,
            (snap) => {
              const rows = [];
              snap.forEach((doc) => {
                const d = doc.data() || {};
                rows.push({
                  id: doc.id,
                  name: sanitizeName(d.name),
                  packets: clamp(d.packets, 0, Number.MAX_SAFE_INTEGER),
                  avatar: sanitizeAvatar(d.avatar),
                  updatedAt: d.updatedAt?.toMillis
                    ? d.updatedAt.toMillis()
                    : nowTs(),
                });
              });
              const out = __dedupeRows(rows);
              stopFallback();
              __subBackoff = 0;
              try {
                cb(out);
              } catch {}
            },
            (err) => {
              console.warn("[Leaderboard] live subscribe error:", err);
              __subBackoff = Math.max(
                2000,
                Math.min(__subBackoff ? __subBackoff * 2 : 5000, 60000),
              );
              startFallback(cb, (opts && opts.limit) || 50);
              clearTimeout(__resubTimer);
              __isSubscribing = false;
              __resubTimer = setTimeout(
                () => __startSubscribe(cb, opts),
                __subBackoff,
              );
            },
          );
          __origUnsubscribe = __liveUnsub;
          __isSubscribing = false;
        } catch (e) {
          __subBackoff = Math.max(
            2000,
            Math.min(__subBackoff ? __subBackoff * 2 : 5000, 60000),
          );
          clearTimeout(__resubTimer);
          __isSubscribing = false;
          __resubTimer = setTimeout(
            () => __startSubscribe(cb, opts),
            __subBackoff,
          );
        }
      })();

      // Unified unsubscribe for the wrapped subscription
      return () => {
        clearTimeout(__resubTimer);
        try {
          (__liveUnsub || __origUnsubscribe)?.();
        } catch {}
        __liveUnsub = null;
        __origUnsubscribe = null;
        __lastCb = null;
        __lastOpts = null;
        __isSubscribing = false;
        try {
          stopFallback();
        } catch {}
      };
    }

    function __subscribe(cb, opts) {
      __lastCb = typeof cb === "function" ? cb : () => {};
      __lastOpts = opts || {};
      return __startSubscribe(function (rows) {
        try {
          __lastCb(__dedupeRows(rows));
        } catch {}
      }, __lastOpts);
    }

    function __resubscribe() {
      if (!__lastCb) return;
      if (__liveUnsub || __isSubscribing) return;
      return __startSubscribe(__lastCb, __lastOpts);
    }

    function __submit(data, opts) {
      try {
        const nm = sanitizeName(data?.name);
        if (nm && nm !== __lb_lastSentName) {
          __lb_lastSentName = nm;
          // Force immediate write when name changed to avoid stale cache issues
          return (Leaderboard.submit = __origSubmit)(
            data,
            Object.assign({}, opts || {}, { throttleMs: 0 }),
          );
        }
      } catch {}
      return (Leaderboard.submit = __origSubmit)(data, opts);
    }

    // Attach enhanced APIs
    Leaderboard.subscribe = __subscribe;
    Leaderboard.resubscribe = __resubscribe;
    Leaderboard.getIdentity = function () {
      return { id: deviceId(), uid: __uid || null };
    };
    Leaderboard.getDeviceId = deviceId;
    Leaderboard.submit = __submit;

    try {
      if (typeof window !== "undefined") {
        window.addEventListener("online", () => {
          try {
            if (!__liveUnsub && !__isSubscribing) __resubscribe();
          } catch {}
        });
        window.addEventListener("visibilitychange", () => {
          try {
            if (
              document.visibilityState === "visible" &&
              !__liveUnsub &&
              !__isSubscribing
            )
              __resubscribe();
          } catch {}
        });
      }
    } catch {}
  } catch {}
})();

/**
 * Global Firestore error silencer (dev) to prevent console flooding from internal assertions.
 * Filters only known noisy messages; real errors still surface.
 */
(function () {
  try {
    const shouldSilence = (m) =>
      typeof m === "string" &&
      /FIRESTORE.*INTERNAL ASSERTION FAILED|Unexpected state/i.test(m);
    if (typeof window !== "undefined") {
      window.addEventListener(
        "error",
        function (e) {
          try {
            const msg =
              (e && (e.message || (e.error && e.error.message))) || "";
            if (shouldSilence(msg)) {
              e.stopImmediatePropagation();
              e.preventDefault();
              return false;
            }
          } catch {}
        },
        { capture: true },
      );
      window.addEventListener(
        "unhandledrejection",
        function (e) {
          try {
            const msg =
              (e && e.reason && (e.reason.message || String(e.reason))) || "";
            if (shouldSilence(msg)) {
              e.stopImmediatePropagation();
              e.preventDefault();
              return false;
            }
          } catch {}
        },
        { capture: true },
      );
    }
  } catch {}
})();
Leaderboard.rulesDev = RULES_DEV;
Leaderboard.rulesWhitelist = RULES_WHITELIST;
Leaderboard.rulesStorage = RULES_STORAGE;
export default Leaderboard;
