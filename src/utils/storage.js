(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    var api = factory();

    // Attach to Packet namespace
    root.Packet = root.Packet || {};
    root.Packet.storage = Object.assign({}, root.Packet.storage || {}, api);

    // Expose legacy globals only if not already defined
    var legacy = {
      isSaveValid: api.isSaveValid,
      sanitizeState: api.sanitizeState,
      loadOrInit: api.loadOrInit,
      saveState: api.saveState,
      clearSave: api.clearSave,
      createInitialState: api.createInitialState,
    };
    Object.keys(legacy).forEach(function (k) {
      if (typeof root[k] === "undefined") {
        root[k] = legacy[k];
      }
    });
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
  function () {
    "use strict";

    // ---------------------------------------------------------------------------
    // Configuration discovery (non-invasive)
    // ---------------------------------------------------------------------------
    var g = /** @type {any} */ (
      typeof window !== "undefined"
        ? window
        : typeof globalThis !== "undefined"
          ? globalThis
          : this
    );

    var DEFAULT_AVATAR_FALLBACK =
      "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
    var STORAGE_KEY =
      (g.Packet && g.Packet.data && g.Packet.data.STORAGE_KEY) ||
      g.STORAGE_KEY ||
      "packet_clicker_save_v3";

    // ---------------------------------------------------------------------------
    // Type guards
    // ---------------------------------------------------------------------------
    function isObj(v) {
      return v !== null && typeof v === "object" && !Array.isArray(v);
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
    function isFn(v) {
      return typeof v === "function";
    }

    // ---------------------------------------------------------------------------
    // Minimal initial state factory (kept in sync with current game shape)
    // ---------------------------------------------------------------------------
    /**
     * Create a fresh initial state with safe defaults.
     * @param {number} [nowTs]
     */
    function createInitialState(nowTs) {
      var now = isNum(nowTs) ? nowTs : Date.now();

      var avatar =
        (g.Packet && g.Packet.data && g.Packet.data.DEFAULT_AVATAR) ||
        g.DEFAULT_AVATAR ||
        DEFAULT_AVATAR_FALLBACK;

      return {
        player: {
          name: "Player",
          avatar: avatar,
          sound: true,
          vipUntil: 0,
          noAds: false,
        },
        // Core economy
        packets: 0,
        perClick: 1,
        perSec: 0,

        // Criticals
        critChance: 0,
        critMult: 2,

        // Upgrades
        upgrades: { click: 0, idle: 0, crit: 0 },

        // Currency
        gems: 0,

        // Level System
        level: {
          currentLevel: 1,
          totalXP: 0,
        },

        // Shop flags
        shop: {
          skinBought: false,
          skinElite: false,
          skinCyber: false,
          skinNeon: false,
          skinShadow: false,
          premium_avatar1: false,
          premium_avatar2: false,
          premium_avatar3: false,
          premium_avatar4: false,
          premium_avatar5: false,
          premium_avatar6: false,
          premium_avatar7: false,
          premium_avatar8: false,
          premium_avatar9: false,
          premium_avatar10: false,
          premium_avatar11: false,
          premium_avatar12: false,
          premium_avatar13: false,
          premium_avatar14: false,
          premium_avatar15: false,
          premium_avatar16: false,
          premium_avatar17: false,
          premium_avatar18: false,
          premium_avatar19: false,
          premium_avatar20: false,
          premium_avatar21: false,
          premium_avatar22: false,
          premium_avatar23: false,
          premium_avatar24: false,
          premium_avatar25: false,
          premium_avatar26: false,
        },

        // Progress
        achievements: [],

        // Ads toggle
        ads: true,

        // Prestige
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

        // Daily rewards
        dailyRewards: {
          lastClaim: 0,
          streak: 0,
        },

        // Temporary boosts (timestamps)
        boosts: {
          doublePackets: 0,
          tripleGems: 0,
          quadrupleClick: 0,
          megaCrit: 0,
          autoClicker: 0,
          xpBoostCelestial: 0,
          xpBoostCommon: 0,
        },

        // Random Event
        randomEvent: {
          active: false,
          type: null,
          endTime: 0,
          multiplier: 1,
        },

        // Theme
        theme: "cyberpunk",
        themes: {},

        // Stats
        stats: {
          totalClicks: 0,
          totalPackets: 0,
          totalUpgrades: 0,
          sessionStart: now,
        },
      };
    }

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------
    /**
     * Validate minimum required shape of a saved game.
     * @param {unknown} data
     * @returns {boolean}
     */
    function isSaveValid(data) {
      if (!isObj(data)) return false;
      var d = /** @type {any} */ (data);

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

      // Optional blocks if present must be correct basic type
      if (d.prestige && !isObj(d.prestige)) return false;
      if (d.dailyRewards && !isObj(d.dailyRewards)) return false;
      if (d.boosts && !isObj(d.boosts)) return false;
      if (d.randomEvent && !isObj(d.randomEvent)) return false;
      if (d.stats && !isObj(d.stats)) return false;
      if (d.theme && !isStr(d.theme)) return false;
      if (d.themes && !isObj(d.themes)) return false;

      return true;
    }

    // ---------------------------------------------------------------------------
    // Merge helpers
    // ---------------------------------------------------------------------------
    /**
     * Deep-merge plain objects. Arrays are replaced.
     * @template T
     * @param {T} base
     * @param {Partial<T>} override
     * @returns {T}
     */
    function mergeDeep(base, override) {
      if (!isObj(base)) return /** @type {T} */ (override);
      var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);

      if (!isObj(override)) {
        return /** @type {T} */ (out);
      }

      Object.keys(override).forEach(function (key) {
        var srcVal = override[key];
        var baseVal = base[key];

        if (Array.isArray(srcVal)) {
          out[key] = srcVal.slice();
        } else if (isObj(srcVal) && isObj(baseVal) && !Array.isArray(baseVal)) {
          out[key] = mergeDeep(baseVal, srcVal);
        } else {
          out[key] = srcVal;
        }
      });

      return /** @type {T} */ (out);
    }

    // ---------------------------------------------------------------------------
    // Sanitization
    // ---------------------------------------------------------------------------
    /**
     * Sanitize a loaded state by merging with current defaults and clamping values.
     * @param {any} loaded
     */
    function sanitizeState(loaded) {
      var defaults = createInitialState();

      if (!isSaveValid(loaded)) {
        return defaults;
      }

      var merged = mergeDeep(defaults, loaded);

      // Post-merge safety
      if (!isObj(merged.player)) merged.player = defaults.player;
      if (!isStr(merged.player.avatar))
        merged.player.avatar = defaults.player.avatar;
      if (!isBool(merged.player.sound))
        merged.player.sound = defaults.player.sound;
      if (!isNum(merged.player.vipUntil)) merged.player.vipUntil = 0;
      if (!isBool(merged.player.noAds)) merged.player.noAds = false;

      if (!isObj(merged.upgrades))
        merged.upgrades = mergeDeep({}, defaults.upgrades);
      if (!isObj(merged.shop)) merged.shop = mergeDeep({}, defaults.shop);
      if (!Array.isArray(merged.achievements)) merged.achievements = [];
      if (!isObj(merged.prestige))
        merged.prestige = mergeDeep({}, defaults.prestige);
      if (!isObj(merged.dailyRewards))
        merged.dailyRewards = mergeDeep({}, defaults.dailyRewards);
      if (!isObj(merged.boosts)) merged.boosts = mergeDeep({}, defaults.boosts);
      if (!isObj(merged.randomEvent))
        merged.randomEvent = mergeDeep({}, defaults.randomEvent);
      if (!isObj(merged.stats)) merged.stats = mergeDeep({}, defaults.stats);

      if (!isStr(merged.theme)) merged.theme = defaults.theme;
      if (!isObj(merged.themes)) merged.themes = {};

      // Clamp numeric ranges
      merged.critChance = Math.max(0, Number(merged.critChance) || 0);
      merged.critMult = Math.max(1, Number(merged.critMult) || 2);
      merged.perClick = Math.max(1, Number(merged.perClick) || 1);
      merged.perSec = Math.max(0, Number(merged.perSec) || 0);
      merged.packets = Math.max(0, Number(merged.packets) || 0);
      merged.gems = Math.max(0, Number(merged.gems) || 0);

      merged.upgrades.click = Math.max(0, Number(merged.upgrades.click) || 0);
      merged.upgrades.idle = Math.max(0, Number(merged.upgrades.idle) || 0);
      merged.upgrades.crit = Math.max(0, Number(merged.upgrades.crit) || 0);

      // Ensure level system properties exist for v0.0.38+
      if (!merged.level || typeof merged.level !== "object") {
        merged.level = defaults.level;
      }
      merged.level.currentLevel = Math.max(
        1,
        Number(merged.level.currentLevel) || 1,
      );
      merged.level.totalXP = Math.max(0, Number(merged.level.totalXP) || 0);

      // Ensure all equipment/inventory properties exist for v0.0.38+
      if (!Array.isArray(merged.inventory)) merged.inventory = [];
      if (!merged.equipment || typeof merged.equipment !== "object") {
        merged.equipment = {};
      }
      if (typeof merged._invCapacity !== "number") merged._invCapacity = 100;
      if (typeof merged._invPage !== "number") merged._invPage = 0;
      if (typeof merged._dropClicks !== "number") merged._dropClicks = 0;

      return merged;
    }

    // ---------------------------------------------------------------------------
    // JSON safe parse
    // ---------------------------------------------------------------------------
    /**
     * @param {string|null} text
     * @returns {{ok: true, value: any} | {ok: false}}
     */
    function safeJsonParse(text) {
      if (text == null) return { ok: false };
      try {
        return { ok: true, value: JSON.parse(text) };
      } catch {
        return { ok: false };
      }
    }

    // ---------------------------------------------------------------------------
    // Load/save helpers (non-invasive)
    // ---------------------------------------------------------------------------
    /**
     * Save state.
     * - If a global save() is available and no argument is provided, delegate to it for parity.
     * - Otherwise writes provided state (or global.state if present) to localStorage.
     * @param {object} [state]
     * @returns {boolean}
     */
    function saveState(state) {
      try {
        if (!state && isFn(g.save)) {
          // Preserve exact game behavior when possible
          g.save();
          return true;
        }
        var toSave = state || g.state;
        if (!toSave) return false;
        g.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Load a state or initialize a new one.
     * - If a global load() exists, delegate to it (it mutates g.state) and return g.state.
     * - Otherwise try to parse localStorage; on failure return fresh defaults.
     * @returns {ReturnType<typeof createInitialState>}
     */
    function loadOrInit() {
      try {
        if (isFn(g.load)) {
          g.load();
          if (g.state) return g.state;
          // Fallthrough to storage if load() didn't set it for some reason
        }

        var raw = g.localStorage.getItem(STORAGE_KEY);
        var parsed = safeJsonParse(raw);
        if (!parsed.ok) {
          return createInitialState();
        }

        var sanitized = sanitizeState(parsed.value);
        if (!isSaveValid(parsed.value)) {
          try {
            g.localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
        return sanitized;
      } catch {
        // Storage not available or other error
        return createInitialState();
      }
    }

    /**
     * Clear persisted save.
     */
    function clearSave() {
      try {
        g.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
    return {
      // Factories
      createInitialState: createInitialState,

      // Validation / Sanitize
      isSaveValid: isSaveValid,
      sanitizeState: sanitizeState,

      // Persistence
      loadOrInit: loadOrInit,
      saveState: saveState,
      clearSave: clearSave,
    };
  },
);
