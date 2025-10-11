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
let _lastSentPackets = -1;
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
    // Accept only http(s) URLs
    if (/^https?:\/\//i.test(s)) return s.slice(0, 256);
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
function submit({ name, packets, avatar } = {}, { throttleMs = 20000 } = {}) {
  try {
    const docData = {
      id: deviceId(),
      name: sanitizeName(name),
      packets: clamp(packets, 0, Number.MAX_SAFE_INTEGER),
      avatar: sanitizeAvatar(avatar),
      updatedAt: nowTs(),
    };
    // Skip if packets hasn't changed (avoid spam)
    if (
      docData.packets === _lastSentPackets &&
      nowTs() - _lastWriteMs < throttleMs
    ) {
      return;
    }
    _pendingDoc = docData;

    if (_writeTimer) clearTimeout(_writeTimer);
    const delay = Math.max(_backoffMs || 0, throttleMs);
    _writeTimer = setTimeout(flushWrite, delay);
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
    const payload = {
      name: docData.name,
      packets: docData.packets,
      avatar: docData.avatar,
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload, { merge: true });
    if (!_lastWriteMs) {
      console.log("[Leaderboard] first write ok", {
        id: docData.id,
        packets: docData.packets,
        collection: _collection,
      });
    }
    _lastWriteMs = nowTs();
    _lastSentPackets = docData.packets;

    // Reset backoff on success
    _backoffMs = 0;
  } catch (e) {
    console.warn("[Leaderboard] write failed; using backoff:", e);
    // Exponential backoff up to 5 minutes
    _backoffMs = Math.max(
      2000,
      Math.min(_backoffMs ? _backoffMs * 2 : 5000, 5 * 60 * 1000),
    );
    // Requeue last doc
    _pendingDoc = _pendingDoc || docData;
    // Re-arm timer
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
          cb(rows);
        },
        (err) => {
          console.warn("[Leaderboard] subscribe error:", err);
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

Leaderboard.rulesDev = RULES_DEV;
Leaderboard.rulesWhitelist = RULES_WHITELIST;
export default Leaderboard;
