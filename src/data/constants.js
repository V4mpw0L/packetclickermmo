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
    var APP_VERSION = "0.0.36";

    // Level System Configuration
    var LEVEL_SYSTEM = {
      // Base XP required for level 1
      BASE_XP: 100,
      // Exponential scaling factor for XP requirements
      XP_SCALING: 1.5,
      // XP gained per packet collected
      XP_PER_PACKET: 1,
      // Maximum level (for display purposes)
      MAX_LEVEL: 999,
    };

    // Level calculation functions
    function getXPRequired(level) {
      if (level <= 1) return LEVEL_SYSTEM.BASE_XP;
      return Math.floor(
        LEVEL_SYSTEM.BASE_XP * Math.pow(LEVEL_SYSTEM.XP_SCALING, level - 1),
      );
    }

    function getTotalXPRequired(level) {
      var total = 0;
      for (var i = 1; i <= level; i++) {
        total += getXPRequired(i);
      }
      return total;
    }

    function getLevelFromXP(totalXP) {
      var level = 1;
      var accumulatedXP = 0;

      while (level <= LEVEL_SYSTEM.MAX_LEVEL) {
        var xpForThisLevel = getXPRequired(level);
        if (accumulatedXP + xpForThisLevel > totalXP) {
          break;
        }
        accumulatedXP += xpForThisLevel;
        level++;
      }

      return {
        level: level,
        currentXP: totalXP - accumulatedXP,
        xpRequired: getXPRequired(level),
      };
    }

    // Interaction tuning
    var COMBO_TIMEOUT = 1000; // ms to maintain click combo

    // Monetization packs (test data for web build)
    var GEM_PACKS = [
      {
        id: "small",
        label: "10 Gems",
        gems: 10,
        price: 0.99,
      },
      {
        id: "medium",
        label: "60 Gems",
        gems: 60,
        price: 4.99,
      },
      {
        id: "big",
        label: "150 Gems",
        gems: 150,
        price: 9.99,
      },
      {
        id: "mega",
        label: "6000 Gems",
        gems: 6000,
        price: 99.99,
      },
    ];

    // Daily rewards progression (7-day loop/cap) - Enhanced rewards!
    var DAILY_REWARDS = [
      { day: 1, gems: 3, packets: 250, bonus: "Welcome Back!" },
      { day: 2, gems: 6, packets: 500, bonus: "Building Momentum" },
      { day: 3, gems: 10, packets: 1000, bonus: "Getting Stronger" },
      { day: 4, gems: 15, packets: 2500, bonus: "Power Surge" },
      { day: 5, gems: 25, packets: 5000, bonus: "Dedication Pays Off" },
      { day: 6, gems: 40, packets: 10000, bonus: "Almost There!" },
      { day: 7, gems: 75, packets: 25000, bonus: "🎉 WEEKLY CHAMPION!" },
    ];

    // Prestige upgrades catalog
    var PRESTIGE_UPGRADES = [
      {
        id: "autoClicker",
        name: "Auto Clicker",
        desc: "Clicks 1/sec automatically",
        cost: 3,
        maxLevel: 10,
      },
      {
        id: "packetBoost",
        name: "Packet Multiplier",
        desc: "+10% packet gain per level",
        cost: 5,
        maxLevel: 20,
      },
      {
        id: "gemFind",
        name: "Gem Hunter",
        desc: "5% chance to find gems on click",
        cost: 8,
        maxLevel: 5,
      },
      {
        id: "critBoost",
        name: "Critical Master",
        desc: "+5% crit chance per level",
        cost: 10,
        maxLevel: 15,
      },
      {
        id: "offlineEarnings",
        name: "Offline Packets",
        desc: "Earn packets while offline (1hr/level)",
        cost: 15,
        maxLevel: 24,
      },
      {
        id: "luckyClicks",
        name: "Lucky Clicker",
        desc: "1% chance for 10x click reward",
        cost: 20,
        maxLevel: 10,
      },
      {
        id: "megaCrits",
        name: "Mega Crits",
        desc: "Crits give 3x instead of 2x",
        cost: 30,
        maxLevel: 5,
      },
      {
        id: "gemMagnet",
        name: "Gem Magnet",
        desc: "Idle packets have chance to give gems",
        cost: 25,
        maxLevel: 8,
      },
    ];

    // Premium Temporary Boosts (consumed with gems) - Enhanced for maximum excitement!
    var BOOST_SHOP = [
      {
        id: "doublePackets",
        name: "💎 Packet Surge",
        desc: "3x packets for 8 minutes",
        gems: 5,
        duration: 480000,
        icon: "📦",
        rarity: "green",
        effect: "Multiplies packet gain by 3x",
      },
      {
        id: "tripleGems",
        name: "✨ Gem Storm",
        desc: "5x gem find rate for 15 minutes",
        gems: 12,
        duration: 900000,
        icon: "💎",
        rarity: "gold",
        effect: "Dramatically increases gem discovery",
      },
      {
        id: "quadrupleClick",
        name: "⚡ Lightning Clicks",
        desc: "8x click power for 5 minutes",
        gems: 8,
        duration: 300000,
        icon: "👆",
        rarity: "gold",
        effect: "Supercharges every click",
      },
      {
        id: "megaCrit",
        name: "🌟 Critical Mastery",
        desc: "75% crit chance for 4 minutes",
        gems: 18,
        duration: 240000,
        icon: "💥",
        rarity: "blue",
        effect: "Nearly guaranteed critical hits",
      },
      {
        id: "autoClicker",
        name: "🤖 Cyber Assistant",
        desc: "25 clicks/sec for 3 minutes",
        gems: 25,
        duration: 180000,
        icon: "🔄",
        rarity: "pink",
        effect: "Autonomous clicking powerhouse",
      },
      {
        id: "ultraCombo",
        name: "Quantum Boost",
        desc: "10x ALL gains for 30 seconds",
        gems: 999,
        duration: 30000,
        icon: "🌌",
        rarity: "celestial",
        effect: "Ultimate power amplification",
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
      sunset: {
        name: "Sunset Glow",
        description: "Warm orange and purple hues of twilight magic",
        colors: ["#ff6b35", "#e74c3c", "#2c1810"],
        cost: 80,
        unlocked: false,
      },
      forest: {
        name: "Forest Depths",
        description: "Natural green tranquility for peaceful sessions",
        colors: ["#27ae60", "#2ecc71", "#1b2f1b"],
        cost: 90,
        unlocked: false,
      },
      royal: {
        name: "Royal Purple",
        description: "Majestic violet elegance fit for digital royalty",
        colors: ["#8e44ad", "#9b59b6", "#2c1810"],
        cost: 120,
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
        id: "skinCyber",
        label: "Cyber Punk Skin",
        gems: 18,
        type: "skin",
        avatar: "CyberPunk",
        desc: "Futuristic cyber warrior avatar",
      },
      {
        id: "skinNeon",
        label: "Neon Ghost Skin",
        gems: 25,
        type: "skin",
        avatar: "NeonGhost",
        desc: "Glowing spectral hacker avatar",
      },
      {
        id: "skinShadow",
        label: "Shadow Ninja Skin",
        gems: 32,
        type: "skin",
        avatar: "ShadowNinja",
        desc: "Stealthy dark warrior avatar for elite hackers",
      },
      {
        id: "premium_avatar1",
        label: "Cyber Ninja Skin",
        gems: 30,
        type: "skin",
        avatar: "CyberNinja",
        desc: "Unlock exclusive cyber warrior avatar",
      },
      {
        id: "premium_avatar2",
        label: "Data Ghost Skin",
        gems: 45,
        type: "skin",
        avatar: "DataGhost",
        desc: "Unlock rare spectral hacker avatar",
      },
      {
        id: "premium_avatar3",
        label: "Quantum Hacker Skin",
        gems: 60,
        type: "skin",
        avatar: "QuantumHacker",
        desc: "Master of digital realms avatar",
      },
      {
        id: "premium_avatar4",
        label: "Neon Samurai Skin",
        gems: 75,
        type: "skin",
        avatar: "NeonSamurai",
        desc: "Blade of electric honor avatar",
      },
      {
        id: "premium_avatar5",
        label: "Shadow Phoenix Skin",
        gems: 90,
        type: "skin",
        avatar: "ShadowPhoenix",
        desc: "Rise from digital ashes avatar",
      },
      {
        id: "premium_avatar6",
        label: "Chrome Dragon Skin",
        gems: 105,
        type: "skin",
        avatar: "ChromeDragon",
        desc: "Unlock futuristic chrome dragon avatar",
      },
      {
        id: "premium_avatar7",
        label: "Neon Viper Skin",
        gems: 120,
        type: "skin",
        avatar: "NeonViper",
        desc: "Unlock venomous neon assassin avatar",
      },
      {
        id: "premium_avatar8",
        label: "Aether Mage Skin",
        gems: 150,
        type: "skin",
        avatar: "AetherMage",
        desc: "Unlock mystical aether mage avatar",
      },
      {
        id: "premium_avatar9",
        label: "Void Reaper Skin",
        gems: 175,
        type: "skin",
        avatar: "VoidReaper",
        desc: "Unlock dark void harvester avatar",
      },
      {
        id: "premium_avatar10",
        label: "Plasma Knight Skin",
        gems: 200,
        type: "skin",
        avatar: "PlasmaKnight",
        desc: "Unlock electric warrior avatar",
      },
      {
        id: "premium_avatar11",
        label: "Cyber Sphinx Skin",
        gems: 225,
        type: "skin",
        avatar: "CyberSphinx",
        desc: "Unlock ancient digital guardian avatar",
      },
      {
        id: "premium_avatar12",
        label: "Nova Wraith Skin",
        gems: 250,
        type: "skin",
        avatar: "NovaWraith",
        desc: "Unlock stellar phantom avatar",
      },
      {
        id: "premium_avatar13",
        label: "Quantum Beast Skin",
        gems: 275,
        type: "skin",
        avatar: "QuantumBeast",
        desc: "Unlock reality-bending creature avatar",
      },
      {
        id: "premium_avatar14",
        label: "Nexus Overlord Skin",
        gems: 300,
        type: "skin",
        avatar: "NexusOverlord",
        desc: "Unlock supreme digital ruler avatar",
      },
      {
        id: "premium_avatar15",
        label: "Stellar Phantom Skin",
        gems: 325,
        type: "skin",
        avatar: "StellarPhantom",
        desc: "Unlock cosmic ghost warrior avatar",
      },
      {
        id: "premium_avatar16",
        label: "Digital Titan Skin",
        gems: 350,
        type: "skin",
        avatar: "DigitalTitan",
        desc: "Unlock colossal cyber giant avatar",
      },
      {
        id: "premium_avatar17",
        label: "Prism Oracle Skin",
        gems: 375,
        type: "skin",
        avatar: "PrismOracle",
        desc: "Unlock rainbow-wielding mystic avatar",
      },
      {
        id: "premium_avatar18",
        label: "Flux Assassin Skin",
        gems: 400,
        type: "skin",
        avatar: "FluxAssassin",
        desc: "Unlock temporal strike warrior avatar",
      },
      {
        id: "premium_avatar19",
        label: "Neon Leviathan Skin",
        gems: 425,
        type: "skin",
        avatar: "NeonLeviathan",
        desc: "Unlock electric sea monster avatar",
      },
      {
        id: "premium_avatar20",
        label: "Cosmic Emperor Skin",
        gems: 450,
        type: "skin",
        avatar: "CosmicEmperor",
        desc: "Unlock ultimate galactic ruler avatar",
      },
      {
        id: "premium_avatar21",
        label: "Binary Shaman Skin",
        gems: 475,
        type: "skin",
        avatar: "BinaryShaman",
        desc: "Unlock mystical code weaver avatar",
      },
      {
        id: "premium_avatar22",
        label: "Hologram Ronin Skin",
        gems: 500,
        type: "skin",
        avatar: "HologramRonin",
        desc: "Unlock ethereal samurai warrior avatar",
      },
      {
        id: "premium_avatar23",
        label: "Plasma Valkyrie Skin",
        gems: 525,
        type: "skin",
        avatar: "PlasmaValkyrie",
        desc: "Unlock electric battle maiden avatar",
      },
      {
        id: "premium_avatar24",
        label: "Neon Kraken Skin",
        gems: 550,
        type: "skin",
        avatar: "NeonKraken",
        desc: "Unlock bioluminescent sea demon avatar",
      },
      {
        id: "premium_avatar25",
        label: "Crystal Warden Skin",
        gems: 575,
        type: "skin",
        avatar: "CrystalWarden",
        desc: "Unlock prismatic guardian avatar",
      },
      {
        id: "premium_avatar26",
        label: "Astral Reaper Skin",
        gems: 600,
        type: "skin",
        avatar: "AstralReaper",
        desc: "Unlock celestial harvester avatar",
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
        emoji:
          '<img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:2rem;height:2rem;"/>',
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
        id: "shopSkinCyber",
        name: "Cyber Warrior",
        emoji: "🤖",
        desc: "Buy the Cyber Punk skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.skinCyber);
        },
        gem: 3,
      },
      {
        id: "shopSkinNeon",
        name: "Spectral Hacker",
        emoji: "👻",
        desc: "Buy the Neon Ghost skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.skinNeon);
        },
        gems: 0,
      },
      {
        id: "shopSkinShadow",
        name: "Shadow Master",
        emoji: "🥷",
        desc: "Buy the Shadow Ninja skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.skinShadow);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar1",
        name: "Cyber Warrior",
        emoji: "🤖",
        desc: "Buy the Cyber Ninja skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar1);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar2",
        name: "Digital Phantom",
        emoji: "👤",
        desc: "Buy the Data Ghost skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar2);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar3",
        name: "Quantum Master",
        emoji: "⚛️",
        desc: "Buy the Quantum Hacker skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar3);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar4",
        name: "Electric Blade",
        emoji: "⚡",
        desc: "Buy the Neon Samurai skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar4);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar5",
        name: "Phoenix Rising",
        emoji: "🔥",
        desc: "Buy the Shadow Phoenix skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar5);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar6",
        name: "Chrome Dragon",
        emoji: "🐉",
        desc: "Buy the Chrome Dragon skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar6);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar7",
        name: "Neon Viper",
        emoji: "🐍",
        desc: "Buy the Neon Viper skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar7);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar8",
        name: "Aether Mage",
        emoji: "🔮",
        desc: "Buy the Aether Mage skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar8);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar9",
        name: "Void Reaper",
        emoji: "💀",
        desc: "Buy the Void Reaper skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar9);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar10",
        name: "Plasma Knight",
        emoji: "⚡",
        desc: "Buy the Plasma Knight skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar10);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar11",
        name: "Cyber Sphinx",
        emoji: "🦅",
        desc: "Buy the Cyber Sphinx skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar11);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar12",
        name: "Nova Wraith",
        emoji: "👻",
        desc: "Buy the Nova Wraith skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar12);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar13",
        name: "Quantum Beast",
        emoji: "🐺",
        desc: "Buy the Quantum Beast skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar13);
        },
        gems: 0,
      },
      {
        id: "shopPremiumAvatar14",
        name: "Nexus Overlord",
        emoji: "👑",
        desc: "Buy the Nexus Overlord skin",
        req: function (s) {
          return !!(s && s.shop && s.shop.premium_avatar14);
        },
        gems: 0,
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
      // Level-based achievements
      {
        id: "level5",
        name: "Getting Started",
        emoji: "⭐",
        desc: "Reach Level 5",
        req: function (s) {
          return (s && s.level && s.level.currentLevel) >= 5;
        },
        gem: 2,
      },
      {
        id: "level10",
        name: "Rising Star",
        emoji: "🌟",
        desc: "Reach Level 10",
        req: function (s) {
          return (s && s.level && s.level.currentLevel) >= 10;
        },
        gem: 5,
      },
      {
        id: "level25",
        name: "Experienced",
        emoji: "💫",
        desc: "Reach Level 25",
        req: function (s) {
          return (s && s.level && s.level.currentLevel) >= 25;
        },
        gem: 10,
      },
      {
        id: "level50",
        name: "Elite Player",
        emoji: "⚡",
        desc: "Reach Level 50",
        req: function (s) {
          return (s && s.level && s.level.currentLevel) >= 50;
        },
        gem: 25,
      },
      {
        id: "level100",
        name: "Legendary",
        emoji: "🔥",
        desc: "Reach Level 100",
        req: function (s) {
          return (s && s.level && s.level.currentLevel) >= 100;
        },
        gem: 50,
      },
    ];

    return {
      STORAGE_KEY: STORAGE_KEY,
      DEFAULT_AVATAR: DEFAULT_AVATAR,
      APP_VERSION: APP_VERSION,
      COMBO_TIMEOUT: COMBO_TIMEOUT,
      LEVEL_SYSTEM: LEVEL_SYSTEM,
      getXPRequired: getXPRequired,
      getTotalXPRequired: getTotalXPRequired,
      getLevelFromXP: getLevelFromXP,
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
