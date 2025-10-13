/**
 * Packet Clicker - Modular bootstrap
 *
 * Goal:
 * - Provide a safe, modular entrypoint that organizes constants, utils, and shims
 * - Keep current behavior 100% intact (no overrides, no required changes to index.html)
 * - Expose a single global namespace `Packet` for gradual modular adoption
 *
 * This file:
 * - Collects existing global data (when main.js is present)
 * - Provides safe storage helpers that delegate to existing functions when available
 * - Wires UI helpers if present (non-breaking)
 *
 * You can include this script before or after the current main.js without breaking anything.
 * It does not replace the existing initialization (main.js still owns game startup).
 */
(function bootstrap(global) {
  "use strict";

  // ----------------------------------------------------------------------------
  // Safe guards and helpers
  // ----------------------------------------------------------------------------
  var g = /** @type {any} */ (global);

  function noop() {}
  function isFn(v) {
    return typeof v === "function";
  }
  function isObj(v) {
    return v != null && typeof v === "object" && !Array.isArray(v);
  }
  function isNum(v) {
    return typeof v === "number" && Number.isFinite(v);
  }
  function isBool(v) {
    return typeof v === "boolean";
  }
  function isStr(v) {
    return typeof v === "string";
  }

  function safeGetGlobal(name) {
    try {
      return g[name];
    } catch {
      return undefined;
    }
  }

  // ----------------------------------------------------------------------------
  // Constants and data catalog (sourced from existing globals when available)
  // Note: these references do not override the existing variables; they are just
  // collected under Packet.data for modular usage.
  // ----------------------------------------------------------------------------
  var DEFAULT_AVATAR_FALLBACK =
    "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
  var STORAGE_KEY_FALLBACK = "packet_clicker_save_v3";

  var dataCatalog = {
    // Core identifiers
    STORAGE_KEY: safeGetGlobal("STORAGE_KEY") || STORAGE_KEY_FALLBACK,
    DEFAULT_AVATAR: safeGetGlobal("DEFAULT_AVATAR") || DEFAULT_AVATAR_FALLBACK,

    // Game content (copied by reference; defined by main.js today)
    GEM_PACKS: safeGetGlobal("GEM_PACKS") || null,
    DAILY_REWARDS: safeGetGlobal("DAILY_REWARDS") || null,
    PRESTIGE_UPGRADES: safeGetGlobal("PRESTIGE_UPGRADES") || null,
    BOOST_SHOP: safeGetGlobal("BOOST_SHOP") || null,
    THEMES: safeGetGlobal("THEMES") || null,
    RANDOM_EVENTS: safeGetGlobal("RANDOM_EVENTS") || null,
    EXPANDED_SHOP_ITEMS: safeGetGlobal("EXPANDED_SHOP_ITEMS") || null,
    SHOP_ITEMS: safeGetGlobal("SHOP_ITEMS") || null,
    ACHIEVEMENTS: safeGetGlobal("ACHIEVEMENTS") || null,
  };

  // ----------------------------------------------------------------------------
  // Validation (compatible with current save requirements)
  // - Uses existing isSaveValid if present; otherwise minimal local validator
  // ----------------------------------------------------------------------------
  function localIsSaveValid(d) {
    if (!isObj(d)) return false;
    if (!isObj(d.player)) return false;
    if (!isStr(d.player.name)) return false;
    if (!isStr(d.player.avatar)) return false;
    if (!isBool(d.player.sound)) return false;
    if (!isNum(d.player.vipUntil)) return false;
    if (!isBool(d.player.noAds)) return false;

    if (!isNum(d.packets)) return false;
    if (!isNum(d.perClick)) return false;
    if (!isNum(d.perSec)) return false;
    if (!isNum(d.critChance)) return false;
    if (!isNum(d.critMult)) return false;

    if (!isObj(d.upgrades)) return false;
    if (!isNum(d.upgrades.click)) return false;
    if (!isNum(d.upgrades.idle)) return false;
    if (!isNum(d.upgrades.crit)) return false;

    if (!isNum(d.gems)) return false;

    if (!isObj(d.shop)) return false;
    if (!isBool(d.shop.skinBought)) return false;
    if (typeof d.shop.skinElite !== "undefined" && !isBool(d.shop.skinElite))
      return false;
    if (typeof d.shop.skinCyber !== "undefined" && !isBool(d.shop.skinCyber))
      return false;
    if (typeof d.shop.skinNeon !== "undefined" && !isBool(d.shop.skinNeon))
      return false;

    if (!Array.isArray(d.achievements)) return false;

    if (!isBool(d.ads)) return false;

    // Optional containers (if present) must be correct basic types
    if (d.prestige && !isObj(d.prestige)) return false;
    if (d.dailyRewards && !isObj(d.dailyRewards)) return false;
    if (d.boosts && !isObj(d.boosts)) return false;
    if (d.randomEvent && !isObj(d.randomEvent)) return false;
    if (d.stats && !isObj(d.stats)) return false;
    if (d.theme && !isStr(d.theme)) return false;
    if (d.themes && !isObj(d.themes)) return false;

    return true;
  }

  var isSaveValidShim =
    safeGetGlobal("isSaveValid") && isFn(safeGetGlobal("isSaveValid"))
      ? safeGetGlobal("isSaveValid")
      : localIsSaveValid;

  // ----------------------------------------------------------------------------
  // Storage helpers (delegate to existing functions when available)
  // - save(): use existing save() if defined, else write to localStorage
  // - load(): use existing load() if defined, else return parsed object or null
  // ----------------------------------------------------------------------------
  function fallbackSave(state) {
    try {
      var key = dataCatalog.STORAGE_KEY || STORAGE_KEY_FALLBACK;
      g.localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function fallbackLoad() {
    try {
      var key = dataCatalog.STORAGE_KEY || STORAGE_KEY_FALLBACK;
      var raw = g.localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
    }
  }

  function saveState(state) {
    var saveFn = safeGetGlobal("save");
    if (isFn(saveFn)) {
      // Use game's save to keep identical behavior
      try {
        saveFn();
        return true;
      } catch {
        // Fallback to direct save if game's save() throws
        return fallbackSave(state);
      }
    }
    return fallbackSave(state);
  }

  function loadState() {
    var loadFn = safeGetGlobal("load");
    if (isFn(loadFn)) {
      // Use game's load to keep identical behavior (it mutates global.state)
      try {
        loadFn();
        // If main.js already maintains global.state, return it for convenience
        return safeGetGlobal("state") || null;
      } catch {
        // Fall through to fallback
      }
    }
    return fallbackLoad();
  }

  function clearSave() {
    try {
      var key = dataCatalog.STORAGE_KEY || STORAGE_KEY_FALLBACK;
      g.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // ----------------------------------------------------------------------------
  // UI helpers passthrough (non-breaking)
  // - If PacketUI (or global functions from ui.js) exist, expose them here too.
  // ----------------------------------------------------------------------------
  var ui = {
    applyTheme:
      (g.PacketUI && g.PacketUI.applyTheme) ||
      safeGetGlobal("applyTheme") ||
      noop,
    showHudNotify:
      (g.PacketUI && g.PacketUI.showHudNotify) ||
      safeGetGlobal("showHudNotify") ||
      noop,
    showModal:
      (g.PacketUI && g.PacketUI.showModal) ||
      safeGetGlobal("showModal") ||
      noop,
    closeModal:
      (g.PacketUI && g.PacketUI.closeModal) ||
      safeGetGlobal("closeModal") ||
      noop,
  };

  // ----------------------------------------------------------------------------
  // Minimal initial state factory (used only if main does not provide one)
  // We do NOT override or change the existing game's state; this is for tooling.
  // ----------------------------------------------------------------------------
  function createInitialState(nowTs) {
    var now = isNum(nowTs) ? nowTs : Date.now();
    return {
      player: {
        name: "Player",
        avatar: dataCatalog.DEFAULT_AVATAR || DEFAULT_AVATAR_FALLBACK,
        sound: true,
        vipUntil: 0,
        noAds: false,
      },
      packets: 0,
      perClick: 1,
      perSec: 0,
      critChance: 0,
      critMult: 2,
      upgrades: { click: 0, idle: 0, crit: 0 },
      gems: 0,
      shop: {
        skinBought: false,
        skinElite: false,
        skinCyber: false,
        skinNeon: false,
      },
      achievements: [],
      ads: true,
      prestige: {
        level: 0,
        dataShards: 0,
        totalPrestigeClicks: 0,
        autoClicker: 0,
        packetBoost: 0,
        gemFind: 0,
        critBoost: 0,
        offlineEarnings: 0,
        luckyClicks: 0,
        megaCrits: 0,
        gemMagnet: 0,
      },
      dailyRewards: { lastClaim: 0, streak: 0 },
      boosts: {
        doublePackets: 0,
        tripleGems: 0,
        quadrupleClick: 0,
        megaCrit: 0,
        autoClicker: 0,
      },
      randomEvent: {
        active: false,
        type: null,
        endTime: 0,
        multiplier: 1,
      },
      theme: "cyberpunk",
      stats: {
        totalClicks: 0,
        totalPackets: 0,
        totalUpgrades: 0,
        sessionStart: now,
      },
    };
  }

  // ----------------------------------------------------------------------------
  // Public namespace
  // ----------------------------------------------------------------------------
  var Packet = Object.assign({}, g.Packet || {}, {
    // Read-only data references (sourced from existing globals)
    data: dataCatalog,

    // Utilities and shims
    utils: {
      isSaveValid: isSaveValidShim,
      saveState: saveState,
      loadState: loadState,
      clearSave: clearSave,
    },

    // Optional factory (tooling/testing)
    state: {
      createInitialState: createInitialState,
    },

    // UI passthroughs
    ui: ui,

    // Bootstrap helper: non-breaking UI wiring (optional)
    // This does not run automatically to avoid changing current behavior.
    // You can call Packet.initUI() if needed in future refactors.
    initUI: function initUI() {
      // Ensure UI functions are available globally without overriding existing ones
      if (!isFn(safeGetGlobal("applyTheme")) && isFn(ui.applyTheme)) {
        g.applyTheme = ui.applyTheme;
      }
      if (!isFn(safeGetGlobal("showHudNotify")) && isFn(ui.showHudNotify)) {
        g.showHudNotify = ui.showHudNotify;
      }
      if (!isFn(safeGetGlobal("showModal")) && isFn(ui.showModal)) {
        g.showModal = ui.showModal;
      }
      if (!isFn(safeGetGlobal("closeModal")) && isFn(ui.closeModal)) {
        g.closeModal = ui.closeModal;
      }
    },
  });

  // Expose but do not overwrite existing Packet
  g.Packet = Packet;

  // Soft signal for diagnostics/tools
  g.__PACKET_BOOTSTRAP_READY__ = true;
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
