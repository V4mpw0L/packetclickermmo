/**
 * Packet Clicker - Constants (UMD)
 *
 * Purpose:
 * - Provide all game data constants in a format compatible with non-module usage.
 * - Attach to window.Packet.data without overriding existing values.
 * - Also expose legacy globals (e.g., DEFAULT_AVATAR) only if not already defined.
 *
 * This file is side-effect free with respect to the game runtime and can be loaded
 * before or after the main game script. The main script remains the source of truth.
 */
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    var data = factory();
    // Ensure Packet namespace
    root.Packet = root.Packet || {};
    root.Packet.data = Object.assign({}, root.Packet.data || {}, data);

    // Non-invasive legacy globals for easy access (only set if undefined)
    var legacy = {
      STORAGE_KEY: data.STORAGE_KEY,
      DEFAULT_AVATAR: data.DEFAULT_AVATAR,
      COMBO_TIMEOUT: data.COMBO_TIMEOUT,
      GEM_PACKS: data.GEM_PACKS,
      DAILY_REWARDS: data.DAILY_REWARDS,
      PRESTIGE_UPGRADES: data.PRESTIGE_UPGRADES,
      BOOST_SHOP: data.BOOST_SHOP,
      THEMES: data.THEMES,
      RANDOM_EVENTS: data.RANDOM_EVENTS,
      VERSION: data.APP_VERSION,
      EXPANDED_SHOP_ITEMS: data.EXPANDED_SHOP_ITEMS,
      SHOP_ITEMS: data.SHOP_ITEMS,
      ACHIEVEMENTS: data.ACHIEVEMENTS,
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

    // Storage key and defaults
    var STORAGE_KEY = "packet_clicker_save_v3";
    var DEFAULT_AVATAR =
      "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
    var APP_VERSION = "0.0.7";

    // Interaction tuning
    var COMBO_TIMEOUT = 1000; // ms to maintain click combo

    // Monetization packs (test data for web build)
    var GEM_PACKS = [
      { id: "small", label: "10 Gems", gems: 10, price: 0.99 },
      { id: "medium", label: "60 Gems", gems: 60, price: 4.99 },
      { id: "big", label: "150 Gems", gems: 150, price: 9.99 },
    ];

    // Daily rewards progression (7-day loop/cap)
    var DAILY_REWARDS = [
      { day: 1, gems: 1, packets: 50 },
      { day: 2, gems: 2, packets: 100 },
      { day: 3, gems: 3, packets: 200 },
      { day: 4, gems: 5, packets: 500 },
      { day: 5, gems: 8, packets: 1000 },
      { day: 6, gems: 12, packets: 2000 },
      { day: 7, gems: 20, packets: 5000 },
    ];

    // Prestige upgrades catalog
    var PRESTIGE_UPGRADES = [
      {
        id: "autoClicker",
        name: "Auto Clicker",
        desc: "Clicks 1/sec automatically",
        cost: 1,
        maxLevel: 10,
      },
      {
        id: "packetBoost",
        name: "Packet Multiplier",
        desc: "+10% packet gain per level",
        cost: 2,
        maxLevel: 20,
      },
      {
        id: "gemFind",
        name: "Gem Hunter",
        desc: "5% chance to find gems on click",
        cost: 3,
        maxLevel: 5,
      },
      {
        id: "critBoost",
        name: "Critical Master",
        desc: "+5% crit chance per level",
        cost: 4,
        maxLevel: 15,
      },
      {
        id: "offlineEarnings",
        name: "Offline Packets",
        desc: "Earn packets while offline (1hr/level)",
        cost: 5,
        maxLevel: 24,
      },
      {
        id: "luckyClicks",
        name: "Lucky Clicker",
        desc: "1% chance for 10x click reward",
        cost: 8,
        maxLevel: 10,
      },
      {
        id: "megaCrits",
        name: "Mega Crits",
        desc: "Crits give 3x instead of 2x",
        cost: 12,
        maxLevel: 5,
      },
      {
        id: "gemMagnet",
        name: "Gem Magnet",
        desc: "Idle packets have chance to give gems",
        cost: 15,
        maxLevel: 8,
      },
    ];

    // Temporary boosts (consumed with gems)
    var BOOST_SHOP = [
      {
        id: "doublePackets",
        name: "Double Packets",
        desc: "2x packets for 5 minutes",
        gems: 3,
        duration: 300000,
      },
      {
        id: "tripleGems",
        name: "Triple Gems",
        desc: "3x gem find rate for 10 minutes",
        gems: 8,
        duration: 600000,
      },
      {
        id: "quadrupleClick",
        name: "Quad Click Power",
        desc: "4x click power for 3 minutes",
        gems: 5,
        duration: 180000,
      },
      {
        id: "megaCrit",
        name: "Mega Crit Mode",
        desc: "50% crit chance for 2 minutes",
        gems: 12,
        duration: 120000,
      },
      {
        id: "autoClicker",
        name: "Temporary Auto-Clicker",
        desc: "10 clicks/sec for 1 minute",
        gems: 15,
        duration: 60000,
      },
    ];

    // Theme catalog
    var THEMES = {
      cyberpunk: {
        name: "Cyberpunk",
        colors: ["#1de9b6", "#f7cf5c", "#222c38"],
        unlocked: true,
      },
      neon: {
        name: "Neon Pink",
        colors: ["#ff1493", "#00ffff", "#1a0d26"],
        cost: 50,
        unlocked: false,
      },
      dark: {
        name: "Dark Mode",
        colors: ["#ffffff", "#888888", "#000000"],
        cost: 25,
        unlocked: false,
      },
      matrix: {
        name: "Matrix Green",
        colors: ["#00ff41", "#008f11", "#0d1117"],
        cost: 100,
        unlocked: false,
      },
      retro: {
        name: "Retro Amber",
        colors: ["#ffb000", "#ff6600", "#2d1b00"],
        cost: 75,
        unlocked: false,
      },
    };

    // Random in-session events
    var RANDOM_EVENTS = [
      {
        type: "packetRain",
        name: "Packet Rain!",
        desc: "2x packet gain for 2 minutes",
        chance: 0.3,
        duration: 120000,
        multiplier: 2,
      },
      {
        type: "gemRush",
        name: "Gem Rush!",
        desc: "10x gem find chance for 90 seconds",
        chance: 0.2,
        duration: 90000,
        multiplier: 10,
      },
      {
        type: "critFrenzy",
        name: "Critical Frenzy!",
        desc: "All clicks are critical for 1 minute",
        chance: 0.15,
        duration: 60000,
        multiplier: 1,
      },
      {
        type: "bonusPackets",
        name: "Packet Surge!",
        desc: "Instant packet bonus based on current rate",
        chance: 0.25,
        duration: 0,
        multiplier: 1,
      },
      {
        type: "upgradeDiscount",
        name: "Upgrade Sale!",
        desc: "50% off all upgrades for 3 minutes",
        chance: 0.1,
        duration: 180000,
        multiplier: 0.5,
      },
    ];

    // Optional extended shop (future use/expansion)
    var EXPANDED_SHOP_ITEMS = [
      {
        id: "theme_neon",
        name: "Neon Pink Theme",
        gems: 50,
        type: "theme",
        theme: "neon",
        desc: "Unlock neon pink theme",
      },
      {
        id: "theme_dark",
        name: "Dark Mode Theme",
        gems: 25,
        type: "theme",
        theme: "dark",
        desc: "Unlock dark mode theme",
      },
      {
        id: "theme_matrix",
        name: "Matrix Theme",
        gems: 100,
        type: "theme",
        theme: "matrix",
        desc: "Unlock matrix green theme",
      },
      {
        id: "theme_retro",
        name: "Retro Theme",
        gems: 75,
        type: "theme",
        theme: "retro",
        desc: "Unlock retro amber theme",
      },
      {
        id: "premium_avatar1",
        name: "Cyber Ninja",
        gems: 30,
        type: "avatar",
        avatar: "CyberNinja",
        desc: "Unlock exclusive avatar",
      },
      {
        id: "premium_avatar2",
        name: "Data Ghost",
        gems: 45,
        type: "avatar",
        avatar: "DataGhost",
        desc: "Unlock rare avatar",
      },
    ];

    // Core shop items (gems-only, simulated in web build)
    var SHOP_ITEMS = [
      {
        id: "vip7",
        label: "VIP 7 days",
        gems: 25,
        type: "vip",
        days: 7,
        desc: "Auto-collect, +25% earnings",
      },
      {
        id: "vip30",
        label: "VIP 30 days",
        gems: 60,
        type: "vip",
        days: 30,
        desc: "Auto-collect, +25% earnings",
      },
      {
        id: "skinElite",
        label: "Elite Skin",
        gems: 12,
        type: "skin",
        avatar: "EliteHacker",
        desc: "Unlocks Elite avatar",
      },
      {
        id: "noAds",
        label: "Remove Ads",
        gems: 16,
        type: "noAds",
        desc: "No ads forever",
      },
    ];

    // Achievement catalog
    // Requirements are expressed only in terms of provided state to avoid cross-module deps.
    var ACHIEVEMENTS = [
      {
        id: "start",
        name: "Getting Started",
        emoji: "🟢",
        desc: "Send your first Packet!",
        req: function (s) {
          return (s && s.packets) >= 1;
        },
        gem: 1,
      },
      {
        id: "100packets",
        name: "Packet Handler",
        emoji: '<span class="icon-packet"></span>',
        desc: "Reach 100 Packets",
        req: function (s) {
          return (s && s.packets) >= 100;
        },
        gem: 1,
      },
      {
        id: "1kgems",
        name: "Gem Collector",
        emoji: "💎",
        desc: "Earn 10 Gems",
        req: function (s) {
          return (s && s.gems) >= 10;
        },
        gem: 2,
      },
      {
        id: "click10",
        name: "Fast Clicker",
        emoji: "👆",
        desc: "Upgrade Click Power 10x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.click >= 10;
        },
        gem: 1,
      },
      {
        id: "idle10",
        name: "Idler",
        emoji: "🤖",
        desc: "Upgrade Idle Power 10x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.idle >= 10;
        },
        gem: 1,
      },
      {
        id: "crit1",
        name: "Critical!",
        emoji: "✨",
        desc: "Unlock Critical Hits",
        req: function (s) {
          return s && s.upgrades && s.upgrades.crit >= 1;
        },
        gem: 1,
      },
      {
        id: "shopSkin",
        name: "Elite!",
        emoji: "😎",
        desc: "Buy the Elite skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.skinBought);
        },
        gem: 2,
      },
      {
        id: "vip",
        name: "VIP Status",
        emoji: "👑",
        desc: "Activate VIP",
        // Inline VIP check to avoid dependency on isVIP():
        req: function (s) {
          return Date.now() < ((s && s.player && s.player.vipUntil) || 0);
        },
        gem: 3,
      },
      {
        id: "adfree",
        name: "Ad Free!",
        emoji: "🚫",
        desc: "Remove Ads",
        req: function (s) {
          return !!(s && s.player && s.player.noAds);
        },
        gem: 1,
      },
      {
        id: "clicker100",
        name: "Click Master",
        emoji: "🖱️",
        desc: "Click 100 times",
        req: function (s) {
          return (s && s.stats && s.stats.totalClicks) >= 100;
        },
        gem: 2,
      },
      {
        id: "prestige1",
        name: "First Prestige",
        emoji: "⭐",
        desc: "Reach your first prestige",
        req: function (s) {
          return (s && s.prestige && s.prestige.level) >= 1;
        },
        gem: 5,
      },
      {
        id: "daily7",
        name: "Week Warrior",
        emoji: "📦",
        desc: "Claim daily rewards for 7 days",
        req: function (s) {
          return (s && s.dailyRewards && s.dailyRewards.streak) >= 7;
        },
        gem: 10,
      },
    ];

    return {
      STORAGE_KEY: STORAGE_KEY,
      DEFAULT_AVATAR: DEFAULT_AVATAR,
      APP_VERSION: APP_VERSION,
      COMBO_TIMEOUT: COMBO_TIMEOUT,
      GEM_PACKS: GEM_PACKS,
      DAILY_REWARDS: DAILY_REWARDS,
      PRESTIGE_UPGRADES: PRESTIGE_UPGRADES,
      BOOST_SHOP: BOOST_SHOP,
      THEMES: THEMES,
      RANDOM_EVENTS: RANDOM_EVENTS,
      EXPANDED_SHOP_ITEMS: EXPANDED_SHOP_ITEMS,
      SHOP_ITEMS: SHOP_ITEMS,
      ACHIEVEMENTS: ACHIEVEMENTS,
    };
  },
);
