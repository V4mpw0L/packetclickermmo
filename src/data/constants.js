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
    var APP_VERSION = "0.0.18";

    // Interaction tuning
    var COMBO_TIMEOUT = 1000; // ms to maintain click combo

    // Monetization packs (test data for web build)
    var GEM_PACKS = [
      {
        id: "small",
        label:
          '10 <img src="src/assets/gem.png" alt="Gems" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;" aria-hidden="true"/>',
        gems: 10,
        price: 0.99,
      },
      {
        id: "medium",
        label:
          '60 <img src="src/assets/gem.png" alt="Gems" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;" aria-hidden="true"/>',
        gems: 60,
        price: 4.99,
      },
      {
        id: "big",
        label:
          '150 <img src="src/assets/gem.png" alt="Gems" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;" aria-hidden="true"/>',
        gems: 150,
        price: 9.99,
      },
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
        description: "Classic hacker vibes with neon accents",
        colors: ["#1de9b6", "#f7cf5c", "#222c38"],
        unlocked: true,
      },
      neon: {
        name: "Neon Pink",
        description: "Vibrant pink energy for night gaming",
        colors: ["#ff1493", "#00ffff", "#1a0d26"],
        cost: 50,
        unlocked: false,
      },
      dark: {
        name: "Dark Mode",
        description: "Easy on the eyes, perfect for long sessions",
        colors: ["#ffffff", "#888888", "#000000"],
        cost: 25,
        unlocked: false,
      },
      matrix: {
        name: "Matrix Green",
        description: "Enter the digital realm with code-green style",
        colors: ["#00ff41", "#008f11", "#0d1117"],
        cost: 100,
        unlocked: false,
      },
      retro: {
        name: "Retro Amber",
        description: "Nostalgic terminal orange from the golden age",
        colors: ["#ffb000", "#ff6600", "#2d1b00"],
        cost: 75,
        unlocked: false,
      },
      ocean: {
        name: "Ocean Deep",
        description: "Calming blue depths for focused clicking",
        colors: ["#0ea5e9", "#06b6d4", "#164e63"],
        cost: 60,
        unlocked: false,
      },
      luxury: {
        name: "Gold Luxury",
        description: "Premium golden elegance for elite hackers",
        colors: ["#fbbf24", "#f59e0b", "#451a03"],
        cost: 150,
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
        desc: "Auto-collect, +25% earnings, No ads",
      },
      {
        id: "vip30",
        label: "VIP 30 days",
        gems: 60,
        type: "vip",
        days: 30,
        desc: "Auto-collect, +25% earnings, No ads",
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
      // Starter Achievements (1-2 gems)
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
        id: "1kpackets",
        name: "Packet Collector",
        emoji: "📦",
        desc: "Reach 1,000 Packets",
        req: function (s) {
          return (s && s.packets) >= 1000;
        },
        gem: 2,
      },
      {
        id: "10kpackets",
        name: "Packet Hoarder",
        emoji: "🏛️",
        desc: "Reach 10,000 Packets",
        req: function (s) {
          return (s && s.packets) >= 10000;
        },
        gem: 3,
      },

      // Clicking Achievements
      {
        id: "clicker10",
        name: "Novice Clicker",
        emoji: "👆",
        desc: "Click 10 times",
        req: function (s) {
          return (s && s.stats && s.stats.totalClicks) >= 10;
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
        id: "clicker1000",
        name: "Click Champion",
        emoji: "⚡",
        desc: "Click 1,000 times",
        req: function (s) {
          return (s && s.stats && s.stats.totalClicks) >= 1000;
        },
        gem: 3,
      },
      {
        id: "clicker10000",
        name: "Click Legend",
        emoji: "🏆",
        desc: "Click 10,000 times",
        req: function (s) {
          return (s && s.stats && s.stats.totalClicks) >= 10000;
        },
        gem: 8,
      },

      // Upgrade Achievements
      {
        id: "click5",
        name: "Power Upgrade",
        emoji: "💪",
        desc: "Upgrade Click Power 5x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.click >= 5;
        },
        gem: 1,
      },
      {
        id: "click10",
        name: "Fast Clicker",
        emoji: "👆",
        desc: "Upgrade Click Power 10x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.click >= 10;
        },
        gem: 2,
      },
      {
        id: "click25",
        name: "Click Specialist",
        emoji: "🎯",
        desc: "Upgrade Click Power 25x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.click >= 25;
        },
        gem: 5,
      },
      {
        id: "idle10",
        name: "Idler",
        emoji: "🤖",
        desc: "Upgrade Idle Power 10x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.idle >= 10;
        },
        gem: 2,
      },
      {
        id: "idle25",
        name: "Automation Expert",
        emoji: "⚙️",
        desc: "Upgrade Idle Power 25x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.idle >= 25;
        },
        gem: 5,
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
        id: "crit10",
        name: "Crit Master",
        emoji: "🌟",
        desc: "Upgrade Crit Chance 10x",
        req: function (s) {
          return s && s.upgrades && s.upgrades.crit >= 10;
        },
        gem: 3,
      },

      // Gem Achievements
      {
        id: "gems5",
        name: "First Gems",
        emoji: "💎",
        desc: "Earn 5 Gems",
        req: function (s) {
          return (s && s.gems) >= 5;
        },
        gem: 1,
      },
      {
        id: "gems25",
        name: "Gem Collector",
        emoji: "💍",
        desc: "Earn 25 Gems",
        req: function (s) {
          return (s && s.gems) >= 25;
        },
        gem: 3,
      },
      {
        id: "gems100",
        name: "Gem Hoarder",
        emoji: "👑",
        desc: "Earn 100 Gems",
        req: function (s) {
          return (s && s.gems) >= 100;
        },
        gem: 10,
      },

      // Prestige Achievements
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
        id: "prestige5",
        name: "Prestige Expert",
        emoji: "🌟",
        desc: "Reach prestige level 5",
        req: function (s) {
          return (s && s.prestige && s.prestige.level) >= 5;
        },
        gem: 10,
      },
      {
        id: "prestige10",
        name: "Prestige Master",
        emoji: "✨",
        desc: "Reach prestige level 10",
        req: function (s) {
          return (s && s.prestige && s.prestige.level) >= 10;
        },
        gem: 20,
      },

      // Daily Achievements
      {
        id: "daily3",
        name: "Consistent Player",
        emoji: "📅",
        desc: "Login 3 days in a row",
        req: function (s) {
          return (s && s.dailyRewards && s.dailyRewards.streak) >= 3;
        },
        gem: 2,
      },
      {
        id: "daily7",
        name: "Week Warrior",
        emoji: "📦",
        desc: "Login 7 days in a row",
        req: function (s) {
          return (s && s.dailyRewards && s.dailyRewards.streak) >= 7;
        },
        gem: 5,
      },
      {
        id: "daily30",
        name: "Month Master",
        emoji: "🗓️",
        desc: "Login 30 days in a row",
        req: function (s) {
          return (s && s.dailyRewards && s.dailyRewards.streak) >= 30;
        },
        gem: 25,
      },

      // Equipment Achievements
      {
        id: "firstitem",
        name: "First Drop",
        emoji: "🎁",
        desc: "Find your first item",
        req: function (s) {
          return s && s.inventory && s.inventory.length >= 1;
        },
        gem: 2,
      },
      {
        id: "collector10",
        name: "Item Collector",
        emoji: "🗃️",
        desc: "Find 10 different items",
        req: function (s) {
          return s && s.inventory && s.inventory.length >= 10;
        },
        gem: 3,
      },
      {
        id: "collector50",
        name: "Item Hoarder",
        emoji: "📚",
        desc: "Find 50 different items",
        req: function (s) {
          return s && s.inventory && s.inventory.length >= 50;
        },
        gem: 8,
      },
      {
        id: "fullequip",
        name: "Fully Equipped",
        emoji: "⚔️",
        desc: "Equip items in all 4 slots",
        req: function (s) {
          if (!s || !s.equipment) return false;
          var slots = ["slot1", "slot2", "slot3", "slot4"];
          return slots.every(function (slot) {
            return s.equipment[slot] !== null;
          });
        },
        gem: 5,
      },

      // Shop & Premium Achievements
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
        gem: 3,
      },

      // Special Achievements
      {
        id: "speedrun",
        name: "Speed Runner",
        emoji: "🏃",
        desc: "Reach 1000 packets in under 5 minutes",
        req: function (s) {
          return (
            (s && s.packets) >= 1000 &&
            s &&
            s.stats &&
            s.stats.sessionStart &&
            Date.now() - s.stats.sessionStart < 300000
          );
        },
        gem: 10,
      },
      {
        id: "dedication",
        name: "Dedicated Player",
        emoji: "🎮",
        desc: "Play for 1 hour total",
        req: function (s) {
          return (s && s.stats && s.stats.totalPlayTime) >= 3600000;
        },
        gem: 8,
      },
      {
        id: "completionist",
        name: "Achievement Hunter",
        emoji: "🏆",
        desc: "Unlock 20 achievements",
        req: function (s) {
          return (s && s.achievements && s.achievements.length) >= 20;
        },
        gem: 25,
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
