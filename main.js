// ==== Packet Clicker MMO: Enhanced Mobile & Visual Effects ====

const DEFAULT_AVATAR =
  "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
const STORAGE_KEY = "packet_clicker_save_v3";

// Click combo tracking
let clickCombo = 0;
let lastClickTime = 0;
const COMBO_TIMEOUT = 1000; // 1 second to maintain combo

const state = {
  player: {
    name: "Player",
    avatar: DEFAULT_AVATAR,
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
  shop: { skinBought: false },
  achievements: [],
  ads: true,
  // Prestige System
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
  // Daily System
  dailyRewards: {
    lastClaim: 0,
    streak: 0,
  },
  // Boost System
  boosts: {
    doublePackets: 0, // timestamp when boost expires
    tripleGems: 0,
    quadrupleClick: 0,
    megaCrit: 0,
    autoClicker: 0,
  },

  // Random Events
  randomEvent: {
    active: false,
    type: null,
    endTime: 0,
    multiplier: 1,
  },
  // Theme System
  theme: "cyberpunk", // cyberpunk, neon, dark, matrix, retro
  // Statistics
  stats: {
    totalClicks: 0,
    totalPackets: 0,
    totalUpgrades: 0,
    sessionStart: Date.now(),
  },
};

const GEM_PACKS = [
  { id: "small", label: "10 Gems", gems: 10, price: 0.99 },
  { id: "medium", label: "60 Gems", gems: 60, price: 4.99 },
  { id: "big", label: "150 Gems", gems: 150, price: 9.99 },
];

const DAILY_REWARDS = [
  { day: 1, gems: 1, packets: 50 },
  { day: 2, gems: 2, packets: 100 },
  { day: 3, gems: 3, packets: 200 },
  { day: 4, gems: 5, packets: 500 },
  { day: 5, gems: 8, packets: 1000 },
  { day: 6, gems: 12, packets: 2000 },
  { day: 7, gems: 20, packets: 5000 },
];

const PRESTIGE_UPGRADES = [
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

const BOOST_SHOP = [
  {
    id: "doublePackets",
    name: "Double Packets",
    desc: "2x packets for 5 minutes",
    gems: 3,
    duration: 300000, // 5 minutes
  },
  {
    id: "tripleGems",
    name: "Triple Gems",
    desc: "3x gem find rate for 10 minutes",
    gems: 8,
    duration: 600000, // 10 minutes
  },
  {
    id: "quadrupleClick",
    name: "Quad Click Power",
    desc: "4x click power for 3 minutes",
    gems: 5,
    duration: 180000, // 3 minutes
  },
  {
    id: "megaCrit",
    name: "Mega Crit Mode",
    desc: "50% crit chance for 2 minutes",
    gems: 12,
    duration: 120000, // 2 minutes
  },
  {
    id: "autoClicker",
    name: "Temporary Auto-Clicker",
    desc: "10 clicks/sec for 1 minute",
    gems: 15,
    duration: 60000, // 1 minute
  },
];

const THEMES = {
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

// Apply theme to document
function applyTheme(themeId) {
  const theme = THEMES[themeId];
  if (!theme) return;

  document.documentElement.setAttribute("data-theme", themeId);

  // Update CSS custom properties
  const root = document.documentElement.style;
  root.setProperty("--primary-color", theme.colors[0]);
  root.setProperty("--secondary-color", theme.colors[1]);
  root.setProperty("--bg-secondary", theme.colors[2]);

  state.theme = themeId;
  save();
}

const RANDOM_EVENTS = [
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

const EXPANDED_SHOP_ITEMS = [
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

const SHOP_ITEMS = [
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

const ACHIEVEMENTS = [
  {
    id: "start",
    name: "Getting Started",
    emoji: "🟢",
    desc: "Send your first Packet!",
    req: (s) => s.packets >= 1,
    gem: 1,
  },
  {
    id: "100packets",
    name: "Packet Handler",
    emoji: "📦",
    desc: "Reach 100 Packets",
    req: (s) => s.packets >= 100,
    gem: 1,
  },
  {
    id: "1kgems",
    name: "Gem Collector",
    emoji: "💎",
    desc: "Earn 10 Gems",
    req: (s) => s.gems >= 10,
    gem: 2,
  },
  {
    id: "click10",
    name: "Fast Clicker",
    emoji: "👆",
    desc: "Upgrade Click Power 10x",
    req: (s) => s.upgrades.click >= 10,
    gem: 1,
  },
  {
    id: "idle10",
    name: "Idler",
    emoji: "🤖",
    desc: "Upgrade Idle Power 10x",
    req: (s) => s.upgrades.idle >= 10,
    gem: 1,
  },
  {
    id: "crit1",
    name: "Critical!",
    emoji: "✨",
    desc: "Unlock Critical Hits",
    req: (s) => s.upgrades.crit >= 1,
    gem: 1,
  },
  {
    id: "shopSkin",
    name: "Elite!",
    emoji: "😎",
    desc: "Buy the Elite skin",
    req: (s) => s.shop.skinBought,
    gem: 2,
  },
  {
    id: "vip",
    name: "VIP Status",
    emoji: "👑",
    desc: "Activate VIP",
    req: (s) => isVIP(),
    gem: 3,
  },
  {
    id: "adfree",
    name: "Ad Free!",
    emoji: "🚫",
    desc: "Remove Ads",
    req: (s) => state.player.noAds,
    gem: 1,
  },
  {
    id: "clicker100",
    name: "Click Master",
    emoji: "🖱️",
    desc: "Click 100 times",
    req: (s) => s.stats.totalClicks >= 100,
    gem: 2,
  },
  {
    id: "prestige1",
    name: "First Prestige",
    emoji: "⭐",
    desc: "Reach your first prestige",
    req: (s) => s.prestige.level >= 1,
    gem: 5,
  },
  {
    id: "daily7",
    name: "Week Warrior",
    emoji: "📅",
    desc: "Claim daily rewards for 7 days",
    req: (s) => s.dailyRewards.streak >= 7,
    gem: 10,
  },
];

function getUnlockedAvatars() {
  let avatars = [{ seed: "Hacker", name: "Default" }];
  if (state.shop.skinBought)
    avatars.push({ seed: "EliteHacker", name: "Elite" });
  if (state.achievements.includes("vip"))
    avatars.push({ seed: "VIP", name: "VIP" });
  if (state.achievements.includes("adfree"))
    avatars.push({ seed: "AdFree", name: "Ad-Free" });
  return avatars;
}

function isSaveValid(data) {
  if (!data) return false;
  if (
    !data.player ||
    typeof data.player.name !== "string" ||
    typeof data.player.avatar !== "string"
  )
    return false;
  if (
    typeof data.player.sound !== "boolean" ||
    typeof data.player.vipUntil !== "number" ||
    typeof data.player.noAds !== "boolean"
  )
    return false;
  if (
    typeof data.packets !== "number" ||
    typeof data.perClick !== "number" ||
    typeof data.perSec !== "number"
  )
    return false;
  if (typeof data.critChance !== "number" || typeof data.critMult !== "number")
    return false;
  if (
    !data.upgrades ||
    typeof data.upgrades.click !== "number" ||
    typeof data.upgrades.idle !== "number" ||
    typeof data.upgrades.crit !== "number"
  )
    return false;
  if (typeof data.gems !== "number") return false;
  if (!data.shop || typeof data.shop.skinBought !== "boolean") return false;
  if (!Array.isArray(data.achievements)) return false;
  if (typeof data.ads !== "boolean") return false;

  return true;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  let d;
  try {
    d = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    console.error("Failed to parse save data:", e);
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, {
      player: {
        name: "Player",
        avatar: DEFAULT_AVATAR,
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
      shop: { skinBought: false },
      achievements: [],
      ads: true,
    });
    setTimeout(
      () =>
        showModal(
          "Error",
          "Save data was corrupted and has been reset.<br>Starting a new game.",
        ),
      700,
    );
    return;
  }

  if (!isSaveValid(d)) {
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, {
      player: {
        name: "Player",
        avatar: DEFAULT_AVATAR,
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
      shop: { skinBought: false },
      achievements: [],
      ads: true,
    });
    setTimeout(
      () =>
        showModal(
          "Game Updated",
          "Old save was incompatible and has been reset.<br>Enjoy the new version!",
        ),
      700,
    );
    return;
  }
  Object.assign(state, d);
  if (!state.player.vipUntil) state.player.vipUntil = 0;
  if (state.player.noAds === undefined) state.player.noAds = false;
  if (typeof state.gems !== "number") state.gems = 0;
  if (!state.theme) state.theme = "cyberpunk";
  if (!state.themes) state.themes = {};
}

// =============== TABS & UI RENDERING ===============
let activeTab = "game";
function setTab(tab) {
  if (activeTab !== tab) {
    activeTab = tab;
    renderTab();
  }
}
function renderTab() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeTab);
  });
  document.getElementById("tab-content").innerHTML = getTabContent(activeTab);
  bindTabEvents(activeTab);
  updateTopBar();
}

function getTabContent(tab) {
  switch (tab) {
    case "game":
      return renderGame();
    case "upgrades":
      return renderUpgrades();
    case "achievements":
      return renderAchievements();
    case "shop":
      return renderShop();
    case "leaderboard":
      return renderLeaderboard();
    case "prestige":
      return renderPrestige();
    case "daily":
      return renderDaily();
    case "boosts":
      return renderBoosts();
    case "themes":
      return renderThemes();
    default:
      return "";
  }
}

// ======= TOP BAR UPDATE & ALIGNMENT =======
function updateTopBar() {
  document.getElementById("player-name").textContent = state.player.name;
  document.getElementById("avatar").src = state.player.avatar;
  let badge = document.getElementById("vip-badge");
  let packets = `<span class="ml-2 text-neon-green font-bold" id="packets-bar" style="font-size:1em;display:inline-block;min-width:65px;text-align:right;">📦 ${state.packets.toLocaleString()}</span>`;
  if (isVIP()) {
    let ms = state.player.vipUntil - Date.now();
    let days = Math.floor(ms / (1000 * 60 * 60 * 24));
    let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    badge.innerHTML = `<span class="font-bold text-yellow-400 ml-2">👑 VIP ${days > 0 ? days + "d " : ""}${hours}h</span>${packets}`;
  } else {
    badge.innerHTML = packets;
  }
  let el = document.getElementById("gem-count");
  if (el) el.textContent = state.gems;
}

// =============== GAME TAB RENDERING ===============
function renderGame() {
  let adBanner = showAdBanner();
  let boostStatus = "";
  let totalMultiplier = 1;

  if (state.boosts.doublePackets > Date.now()) {
    let remaining = Math.ceil((state.boosts.doublePackets - Date.now()) / 1000);
    boostStatus += `<div class="text-green-400 text-xs">🚀 2x Packets (${remaining}s)</div>`;
    totalMultiplier *= 2;
  }

  if (state.prestige.level > 0) {
    totalMultiplier *= 1 + state.prestige.level * 0.1;
    boostStatus += `<div class="text-purple-400 text-xs">⭐ Prestige Bonus: +${state.prestige.level * 10}%</div>`;
  }

  let effectivePerClick = Math.floor(state.perClick * totalMultiplier);
  let effectivePerSec = Math.floor(state.perSec * totalMultiplier);

  return `
    <div class="neon-card flex flex-col gap-4 px-3 py-4 mb-3">
      <h2 class="tab-title">🎮 Game</h2>
      <button id="click-btn" class="neon-btn text-2xl py-4 active:scale-95 transition-transform">
        Click Packet! <span class="text-neon-yellow">📦</span>
      </button>
      <div class="flex justify-between items-center text-neon-green text-sm">
        <span>Packets/Click: ${effectivePerClick}</span>
        <span>Packets/Sec: ${effectivePerSec}</span>
      </div>
      <div class="flex justify-between items-center text-neon-yellow text-sm">
        <span>Crit Chance: ${state.critChance}%</span>
        <span>Crit Multiplier: ${state.critMult}x</span>
      </div>
      ${boostStatus}
      ${renderActiveEvent()}
      ${state.prestige.level >= 1 ? `<div class="text-center"><button id="prestige-btn" class="neon-btn text-sm">⭐ Prestige Available</button></div>` : ""}
    </div>
    ${adBanner}
  `;
}

// =============== BOOSTS TAB ===============
function renderBoosts() {
  let activeBoosts = "";

  Object.keys(state.boosts).forEach((boostType) => {
    if (state.boosts[boostType] > Date.now()) {
      let remaining = Math.ceil((state.boosts[boostType] - Date.now()) / 1000);
      activeBoosts += `<div class="text-green-400 text-sm mb-2">🚀 ${boostType} active (${remaining}s)</div>`;
    }
  });

  let boostItems = BOOST_SHOP.map((boost) => {
    return `<button class="gem-btn w-full mb-2" data-boost="${boost.id}">
      ${boost.name} - ${boost.gems} 💎
      <div class="text-xs text-neon-gray">${boost.desc}</div>
    </button>`;
  }).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title">⚡ Temporary Boosts</h2>

      ${activeBoosts ? `<div class="mb-4">${activeBoosts}</div>` : ""}

      <div class="mb-2"><span class="text-neon-yellow font-bold">Available Boosts</span></div>
      ${boostItems}

      <div class="text-xs text-neon-gray mt-4 text-center">
        Boosts stack with other bonuses for maximum effect!
      </div>
    </div>
  `;
}

// =============== THEMES TAB ===============
function renderThemes() {
  let themeItems = Object.entries(THEMES)
    .map(([id, theme]) => {
      let isActive = state.theme === id;
      let isUnlocked = theme.unlocked || state.themes?.[id];
      let canBuy = !isUnlocked && state.gems >= (theme.cost || 0);

      return `<button class="gem-btn w-full mb-2 ${isActive ? "opacity-75" : ""} ${!isUnlocked && !canBuy ? "opacity-50" : ""}"
                    data-theme="${id}" ${isActive ? "disabled" : ""}>
      ${theme.name} ${isActive ? "(Active)" : ""}
      ${!isUnlocked ? `- ${theme.cost || 0} 💎` : ""}
      <div class="text-xs text-neon-gray">
        Colors: <span style="color: ${theme.colors[0]}">●</span> <span style="color: ${theme.colors[1]}">●</span> <span style="color: ${theme.colors[2]}">●</span>
      </div>
    </button>`;
    })
    .join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title">🎨 Visual Themes</h2>

      <div class="text-sm text-neon-gray mb-4 text-center">
        Customize your game's appearance
      </div>

      ${themeItems}
    </div>
  `;
}

// =============== UPGRADES PANEL ===============
function renderUpgrades() {
  return `
    <div class="neon-card flex flex-col gap-4 px-3 py-4 mb-3">
      <h2 class="tab-title">🛠️ Upgrades</h2>
      <button id="upgrade-click" class="upgrade-btn">+1/click — <span>${upgradeCost("click")}</span> 🟡</button>
      <button id="upgrade-idle" class="upgrade-btn">+1/sec — <span>${upgradeCost("idle")}</span> 🟡</button>
      <button id="upgrade-crit" class="upgrade-btn">+2% crit — <span>${upgradeCost("crit")}</span> 🟡</button>
      <div class="text-neon-gray text-xs mt-1">
        Each upgrade increases cost. <span class="text-neon-yellow">Critical Hits</span> give 2x per click!
      </div>
    </div>
  `;
}
function upgradeCost(type) {
  switch (type) {
    case "click":
      return 10 + Math.floor(state.upgrades.click * 13.5);
    case "idle":
      return 25 + Math.floor(state.upgrades.idle * 18.2);
    case "crit":
      return 40 + Math.floor(state.upgrades.crit * 27.1);
    default:
      return 0;
  }
}

// =============== HUD NOTIFICATION ===============
function showHudNotify(msg, icon = "✨") {
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll(".hud-notify");
  existingNotifications.forEach((notification) => notification.remove());

  let hud = document.createElement("div");
  hud.className = "hud-notify";
  hud.innerHTML = `<span style="font-size:1.3em;">${icon}</span> <span>${msg}</span>`;

  // Create close button separately to avoid onclick issues
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  closeBtn.className = "hud-close-btn";
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    hud.remove();
  });
  hud.appendChild(closeBtn);
  document.body.appendChild(hud);
  setTimeout(() => hud.classList.add("active"), 60);
  setTimeout(() => {
    hud.classList.remove("active");
    setTimeout(() => {
      if (hud.parentNode) hud.remove();
    }, 500);
  }, 3000);
}

// =============== ACHIEVEMENTS PANEL ===============
function renderAchievements() {
  let achList = ACHIEVEMENTS.map((ach) => {
    let unlocked = state.achievements.includes(ach.id);
    return `<li class="achievement-badge${unlocked ? " unlocked" : ""}">
      <span class="emoji">${ach.emoji}</span>
      <div class="text">
        <span class="font-bold">${ach.name}</span>
        <div class="desc">${ach.desc}</div>
      </div>
      ${ach.gem ? `<span class="achievement-gem-reward">${unlocked ? "✓" : "+" + ach.gem} 💎</span>` : ""}
    </li>`;
  }).join("");
  return `
    <div class="neon-card px-3 py-5">
      <h2 class="tab-title">🎯 Achievements</h2>
      <ul id="achievement-list" class="flex flex-col gap-2 mt-4">${achList}</ul>
    </div>
  `;
}

// =============== SHOP PANEL ===============
function renderShop() {
  let gemStore = GEM_PACKS.map(
    (p) =>
      `<button class="gem-btn w-full mb-2" data-gem-pack="${p.id}">Buy ${p.label} - $${p.price.toFixed(2)}</button>`,
  ).join("");
  let items = SHOP_ITEMS.map((item) => {
    let owned =
      (item.type === "vip" && isVIP()) ||
      (item.type === "skin" && state.shop.skinBought) ||
      (item.type === "noAds" && state.player.noAds);
    let label = owned ? "✓ Owned" : item.label + ` - ${item.gems} 💎`;
    return `<button class="gem-btn w-full mb-2" data-shop-item="${item.id}" ${owned ? "disabled" : ""}>
      ${label}
      <div class="text-xs text-neon-gray">${item.desc}</div>
    </button>`;
  }).join("");
  let adBtn =
    !state.player.noAds && state.ads
      ? `<button id="watch-ad-btn" class="neon-btn w-full mb-2">Watch Ad (simulate)</button>`
      : "";
  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title">🏬 Shop</h2>
      <div class="flex flex-col gap-2 mt-4">
        ${gemStore}
        <div class="text-neon-gray text-xs text-center my-2">-- Special Items --</div>
        ${items}
        ${adBtn}
      </div>
    </div>
  `;
}

// =============== LEADERBOARD PANEL ===============
function renderLeaderboard() {
  let bots = generateBots(8);
  bots.push({
    name: state.player.name,
    packets: state.packets,
    avatar: state.player.avatar,
  });
  bots.sort((a, b) => b.packets - a.packets);
  let html = bots
    .slice(0, 10)
    .map(
      (p, idx) => `
    <li style="display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #273742;">
      <span style="width: 2rem; text-align: right; color: var(--secondary-color); font-weight: bold;">${idx + 1}.</span>
      <img src="${p.avatar || DEFAULT_AVATAR}" style="width: 2rem; height: 2rem; border-radius: 50%; border: 1px solid var(--primary-color);" alt="">
      <span style="font-weight: 600; color: ${p.name === state.player.name ? "var(--primary-color)" : "var(--text-primary)"};">${p.name === state.player.name ? "You" : p.name}</span>
      <span style="margin-left: auto; font-family: monospace; color: var(--text-secondary);">${p.packets.toLocaleString()}</span>
    </li>
  `,
    )
    .join("");
  return `<div class="neon-card" style="padding: 1rem 0.5rem;">
    <h2 class="tab-title">🏆 Leaderboard</h2>
    <ul id="leaderboard" style="list-style: none; margin: 0; padding: 0;">${html}</ul>
    <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center; margin-top: 0.75rem;">Bots are randomly generated. Your score is real!</div>
  </div>`;
}

// =============== PRESTIGE TAB ===============
function renderPrestige() {
  let canPrestige = state.packets >= 50000;
  let shardGain = canPrestige
    ? Math.floor(Math.sqrt(state.packets / 10000))
    : 0;

  let upgrades = PRESTIGE_UPGRADES.map((upgrade) => {
    let currentLevel = state.prestige[upgrade.id] || 0;
    let cost = upgrade.cost * (currentLevel + 1);
    let canBuy =
      state.prestige.dataShards >= cost && currentLevel < upgrade.maxLevel;

    return `<button class="gem-btn w-full mb-2 ${canBuy ? "" : "opacity-50"}"
                    data-prestige-upgrade="${upgrade.id}" ${!canBuy ? "disabled" : ""}>
      ${upgrade.name} (${currentLevel}/${upgrade.maxLevel}) - ${cost} 🔷
      <div class="text-xs text-neon-gray">${upgrade.desc}</div>
    </button>`;
  }).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title">⭐ Prestige</h2>
      <div class="text-center mb-4">
        <div class="text-lg">Level ${state.prestige.level}</div>
        <div class="text-sm text-neon-gray">Data Shards: ${state.prestige.dataShards} 🔷</div>
      </div>

      ${
        canPrestige
          ? `<button id="do-prestige" class="neon-btn w-full mb-4">
          Prestige Now! (+${shardGain} 🔷)
          <div class="text-xs">Reset progress for permanent bonuses</div>
        </button>`
          : `<div class="text-center text-neon-gray mb-4">
          Need 50,000 packets to prestige<br>
          Current: ${state.packets.toLocaleString()}
        </div>`
      }

      <div class="mb-2"><span class="text-neon-yellow font-bold">Prestige Upgrades</span></div>
      ${upgrades}
    </div>
  `;
}

// =============== DAILY REWARDS TAB ===============
function renderDaily() {
  let now = Date.now();
  let lastClaim = state.dailyRewards.lastClaim;
  let canClaim = !lastClaim || now - lastClaim >= 86400000; // 24 hours
  let streak = state.dailyRewards.streak;
  let nextReward = DAILY_REWARDS[Math.min(streak, DAILY_REWARDS.length - 1)];

  let rewardList = DAILY_REWARDS.map((reward, index) => {
    let claimed = index < streak;
    let current = index === streak && canClaim;

    return `<div class="flex items-center justify-between p-2 border rounded ${
      claimed
        ? "bg-green-900 border-green-600"
        : current
          ? "bg-yellow-900 border-yellow-600"
          : "bg-gray-800 border-gray-600"
    }">
      <span>Day ${reward.day}</span>
      <span>${reward.gems}💎 + ${reward.packets}📦</span>
      <span>${claimed ? "✅" : current ? "🎁" : "⏳"}</span>
    </div>`;
  }).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title">📅 Daily Rewards</h2>
      <div class="text-center mb-4">
        <div class="text-lg">Streak: ${streak} days</div>
        ${
          canClaim
            ? `<button id="claim-daily" class="neon-btn mt-2">
            Claim Day ${streak + 1} Reward!
            <div class="text-xs">${nextReward.gems}💎 + ${nextReward.packets}📦</div>
          </button>`
            : `<div class="text-neon-gray text-sm mt-2">Come back tomorrow for next reward!</div>`
        }
      </div>

      <div class="space-y-2">
        ${rewardList}
      </div>
    </div>
  `;
}

// =============== AVATARS ===============
function showEditProfile() {
  let avatars = getUnlockedAvatars();
  let currentSeed =
    state.player.avatar.split("seed=")[1]?.split("&")[0] || "Hacker";
  let avatarList = avatars
    .map(
      (a) => `
    <div class="avatar-choice${a.seed === currentSeed ? " selected" : ""}" data-seed="${a.seed}">
      <img src="https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${a.seed}" alt="${a.name}" />
      <div class="avatar-name">${a.name}</div>
    </div>
  `,
    )
    .join("");
  showModal(
    "Edit Profile",
    `
     <form id="profile-form">
       <label class="block mb-3">
         <span class="block mb-1 font-semibold">Name:</span>
         <input type="text" id="profile-name" value="${state.player.name}" maxlength="14"
                class="w-full p-2 bg-gray-700 rounded border border-neon-cyan focus:outline-none focus:border-yellow-400">
       </label>
       <div class="mb-4">
         <span class="block mb-2 font-semibold">Avatar:</span>
         <div class="flex flex-wrap gap-2 justify-center">${avatarList}</div>
       </div>
       <button type="submit" class="neon-btn w-full">Save</button>
     </form>
  `,
  );
  document.querySelectorAll(".avatar-choice").forEach((el) => {
    el.onclick = () => {
      document
        .querySelectorAll(".avatar-choice")
        .forEach((e) => e.classList.remove("selected"));
      el.classList.add("selected");
    };
  });
  document.getElementById("profile-form").onsubmit = function (e) {
    e.preventDefault();
    let newName = document.getElementById("profile-name").value.trim();
    let selected =
      document
        .querySelector(".avatar-choice.selected")
        ?.getAttribute("data-seed") || "Hacker";
    if (newName) state.player.name = newName.slice(0, 14);
    state.player.avatar = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(selected)}`;
    save();
    updateTopBar();
    closeModal();
    showHudNotify("Profile updated!", "👤");
  };
}

// =============== SETTINGS ===============
function showSettings() {
  showModal(
    "Settings",
    `
     <label class="flex items-center mb-2">
       <input type="checkbox" id="setting-sound" ${state.player.sound ? "checked" : ""}/>
       <span class="ml-2">Game Sound Effects</span>
     </label>
     <button id="edit-profile-inside" class="neon-btn w-full mb-3">Edit Profile</button>
     <div class="text-xs text-neon-gray mt-1">All progress is saved locally.<br>For mobile, use Store in-app for real gems/ads!</div>
  `,
  );
  document.getElementById("setting-sound").onchange = function () {
    state.player.sound = this.checked;
    save();
  };
  document.getElementById("edit-profile-inside").onclick = function () {
    closeModal();
    setTimeout(showEditProfile, 180);
  };
}

// =============== RANDOM EVENTS ===============
function triggerRandomEvent() {
  if (state.randomEvent.active) return;

  if (Math.random() < 0.01) {
    // 1% chance per idle tick
    let availableEvents = RANDOM_EVENTS.filter(
      (event) => Math.random() < event.chance,
    );
    if (availableEvents.length > 0) {
      let event =
        availableEvents[Math.floor(Math.random() * availableEvents.length)];

      state.randomEvent.active = true;
      state.randomEvent.type = event.type;
      state.randomEvent.endTime = Date.now() + event.duration;
      state.randomEvent.multiplier = event.multiplier;

      if (event.type === "bonusPackets") {
        let bonus = Math.floor(state.perSec * 60); // 1 minute worth
        state.packets += bonus;
        showModal(event.name, `${event.desc}<br>You gained ${bonus} packets!`);
        state.randomEvent.active = false;
      } else {
        showModal(event.name, event.desc);
      }

      showHudNotify(event.name, "🎪");
    }
  }
}

function renderActiveEvent() {
  if (!state.randomEvent.active) return "";

  let remaining = Math.ceil((state.randomEvent.endTime - Date.now()) / 1000);
  if (remaining <= 0) {
    state.randomEvent.active = false;
    return "";
  }

  let event = RANDOM_EVENTS.find((e) => e.type === state.randomEvent.type);
  return `<div class="random-event">
    🎪 ${event.name} - ${remaining}s remaining
  </div>`;
}

// =============== GAME LOGIC ===============
function clickPacket(event) {
  let bonus = isVIP() ? 1.25 : 1;

  // Apply prestige bonus
  if (state.prestige.level > 0) {
    bonus *= 1 + state.prestige.level * 0.1;
  }

  // Apply active boosts
  if (state.boosts.doublePackets > Date.now()) {
    bonus *= 2;
  }

  let critChance = state.critChance;
  if (state.boosts.megaCrit > Date.now()) {
    critChance = 50; // 50% crit chance during boost
  }

  let crit = Math.random() < critChance / 100;

  // Mega crits upgrade
  let critMultiplier = state.critMult;
  if (state.prestige.megaCrits > 0) {
    critMultiplier = 2 + state.prestige.megaCrits * 0.2; // Up to 3x
  }

  let amount = Math.floor(state.perClick * (crit ? critMultiplier : 1) * bonus);

  // Lucky clicks chance
  if (state.prestige.luckyClicks > 0) {
    let luckyChance = state.prestige.luckyClicks * 1; // 1% per level
    if (Math.random() * 100 < luckyChance) {
      amount *= 10;
      showHudNotify("LUCKY CLICK! 10x", "🍀");
    }
  }
  state.packets += amount;

  // Update statistics
  state.stats.totalClicks++;
  state.stats.totalPackets += amount;

  // Gem find chance (prestige upgrade)
  let gemMultiplier = 1;
  if (state.boosts.tripleGems > Date.now()) {
    gemMultiplier = 3;
  }
  if (state.randomEvent.active && state.randomEvent.type === "gemRush") {
    gemMultiplier *= 10;
  }

  if (state.prestige.gemFind > 0) {
    let gemChance = state.prestige.gemFind * 5 * gemMultiplier; // 5% per level
    if (Math.random() * 100 < gemChance) {
      let gemsFound = Math.floor(Math.random() * 3) + 1; // 1-3 gems
      state.gems += gemsFound;
      showHudNotify(`+${gemsFound} 💎 (Found!)`, "✨");
    }
  }

  // Enhanced visual feedback for click with combo system
  const now = Date.now();
  if (now - lastClickTime < COMBO_TIMEOUT) {
    clickCombo++;
  } else {
    clickCombo = 1;
  }
  lastClickTime = now;

  // Enhanced visual feedback for click with combo system (optimized)
  requestAnimationFrame(() => {
    let clickFX = document.createElement("div");
    clickFX.className = "click-effect";

    // Determine effect type based on combo
    let effectText = `+${amount}`;
    if (clickCombo >= 10) {
      clickFX.classList.add("mega-combo");
      effectText = `MEGA! +${amount}`;
      // Shake the click button
      const clickBtn = document.getElementById("click-btn");
      if (clickBtn) {
        clickBtn.classList.add("shake-element");
        setTimeout(() => clickBtn.classList.remove("shake-element"), 600);
      }
    } else if (clickCombo >= 5) {
      clickFX.classList.add("combo");
      effectText = `${clickCombo}x +${amount}`;
    }

    clickFX.textContent = effectText;

    // Position above the click button (cached for performance)
    const clickBtn = document.getElementById("click-btn");
    if (clickBtn) {
      const rect = clickBtn.getBoundingClientRect();
      clickFX.style.left = rect.left + rect.width / 2 + "px";
      clickFX.style.top = rect.top - 20 + "px";
    } else {
      clickFX.style.left = "50%";
      clickFX.style.top = "50%";
    }

    document.body.appendChild(clickFX);

    // Remove element after animation
    const animationDuration =
      clickCombo >= 10 ? 2000 : clickCombo >= 5 ? 1500 : 1200;
    setTimeout(() => {
      if (clickFX.parentNode) {
        document.body.removeChild(clickFX);
      }
    }, animationDuration);
  });

  // Click effect cleanup is handled in the setTimeout above

  if (crit && state.player.sound) playSound("crit");
  else if (state.player.sound) playSound("click");

  // Optimize UI updates - defer heavy operations
  if (window.requestIdleCallback) {
    requestIdleCallback(() => {
      save();
      checkAchievements();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      save();
      checkAchievements();
    }, 16);
  }

  // Only update top bar immediately for responsive feel
  updateTopBar();

  // Defer tab rendering to prevent click lag
  if (activeTab === "game") {
    setTimeout(() => renderTab(), 16); // ~1 frame delay
  }
}

function upgrade(type) {
  let cost = upgradeCost(type);
  if (state.packets < cost) return;
  state.packets -= cost;
  state.upgrades[type]++;
  switch (type) {
    case "click":
      state.perClick++;
      break;
    case "idle":
      state.perSec++;
      break;
    case "crit":
      state.critChance += 2;
      break;
  }

  // Update statistics
  state.stats.totalUpgrades++;

  if (state.player.sound) playSound("upgrade");
  save();
  updateTopBar();
  renderTab();
  checkAchievements();
  showHudNotify("Upgrade purchased!", "🛠️");
}

function idleTick() {
  let bonus = isVIP() ? 1.25 : 1;

  // Apply prestige bonus
  if (state.prestige.level > 0) {
    bonus *= 1 + state.prestige.level * 0.1;
  }

  // Apply active boosts
  if (state.boosts.doublePackets > Date.now()) {
    bonus *= 2;
  }

  let totalPerSec = state.perSec;

  // Auto clicker from prestige
  if (state.prestige.autoClicker > 0) {
    totalPerSec += state.prestige.autoClicker;
  }

  // Temporary auto-clicker boost
  if (state.boosts.autoClicker > Date.now()) {
    totalPerSec += 10; // 10 clicks per second
  }

  // Gem magnet from idle packets
  if (state.prestige.gemMagnet > 0 && totalPerSec > 0) {
    let gemChance = state.prestige.gemMagnet * 0.1; // 0.1% per level per second
    if (Math.random() * 1000 < gemChance) {
      state.gems++;
      showHudNotify("+1 💎 (Magnet!)", "🧲");
    }
  }

  // Random events
  triggerRandomEvent();

  // Check if random events expired
  if (state.randomEvent.active && Date.now() > state.randomEvent.endTime) {
    state.randomEvent.active = false;
    showHudNotify("Event ended!", "⏰");
  }

  if (totalPerSec > 0) {
    let gain = Math.floor(totalPerSec * bonus);
    state.packets += gain;
    state.stats.totalPackets += gain;
    save();
    updateTopBar();
    if (activeTab === "game") renderTab();
    checkAchievements();
  }
}

function isVIP() {
  return Date.now() < state.player.vipUntil;
}

// =============== SHOP ACTIONS ===============
function buyGemPack(packId) {
  let pack = GEM_PACKS.find((x) => x.id === packId);
  if (!pack) return;
  state.gems += pack.gems;
  showModal(
    "Thank You!",
    `You received <b>${pack.gems} 💎</b>!<br>Implement real payments for store publishing.`,
  );
  save();
  updateTopBar();
  renderTab();
  checkAchievements();
  showHudNotify(`+${pack.gems} 💎 (test)`, "💎");
}

function buyShopItem(itemId) {
  let item = SHOP_ITEMS.find((x) => x.id === itemId);
  if (!item || state.gems < item.gems) return;
  if (item.type === "vip") {
    let now = Date.now();
    if (!isVIP() || state.player.vipUntil < now) state.player.vipUntil = now;
    state.player.vipUntil += item.days * 86400 * 1000;
  }
  if (item.type === "skin") state.shop.skinBought = true;
  if (item.type === "noAds") {
    state.player.noAds = true;
    state.ads = false;
  }
  state.gems -= item.gems;
  save();
  updateTopBar();
  renderTab();
  checkAchievements();
  showHudNotify(
    `Purchased: ${item.label}`,
    item.type === "vip"
      ? "👑"
      : item.type === "skin"
        ? "😎"
        : item.type === "noAds"
          ? "🚫"
          : "💎",
  );
}

function watchAd() {
  showModal("Ad watched!", "Simulate ad with SDK for monetization.");
  state.gems += 1;
  save();
  updateTopBar();
  renderTab();
  checkAchievements();
  showHudNotify("+1 💎 (Ad)", "📺");
}

// =============== ACHIEVEMENTS CHECKER ===============
function checkAchievements() {
  ACHIEVEMENTS.forEach((ach) => {
    if (ach.req(state) && !state.achievements.includes(ach.id)) {
      state.achievements.push(ach.id);
      if (ach.gem) {
        state.gems += ach.gem;
        updateTopBar();
        showModal(
          "Achievement!",
          `You unlocked <b>${ach.name}</b>!<br>${ach.desc}<br>+${ach.gem} 💎`,
        );
        showHudNotify(`Achievement: ${ach.name} +${ach.gem} 💎`, ach.emoji);
      } else {
        showModal(
          "Achievement!",
          `You unlocked <b>${ach.name}</b>!<br>${ach.desc}`,
        );
        showHudNotify(`Achievement: ${ach.name}`, ach.emoji);
      }
      save();
    }
  });
}

// =============== MODAL / FEEDBACK ===============
function showModal(title, html) {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");

  backdrop.classList.remove("hidden");
  backdrop.setAttribute("aria-hidden", "false");
  modal.classList.remove("hidden");
  modal.innerHTML = `<h2 id="modal-title" class="text-neon-cyan mb-2 text-lg">${title}</h2>
    <div>${html}</div>
    <button id="modal-close-btn" class="mt-5 neon-btn w-full">Close</button>
  `;

  // Add event listener to close button to avoid onclick issues
  const closeBtn = modal.querySelector("#modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  // Add keyboard event listener for Escape key
  const handleKeydown = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };
  document.addEventListener("keydown", handleKeydown);

  // Store reference to remove listener later
  backdrop._keydownHandler = handleKeydown;

  // Add click listener to backdrop to close modal
  const handleBackdropClick = (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  };
  backdrop.addEventListener("click", handleBackdropClick);
  backdrop._backdropClickHandler = handleBackdropClick;

  // Focus the modal for accessibility
  setTimeout(() => {
    const firstFocusable = modal.querySelector("input, button");
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      modal.focus();
    }
  }, 100);
}

function closeModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");

  // Remove focus from any focused elements inside the modal first
  const focusedElement = modal.querySelector(":focus");
  if (focusedElement) {
    focusedElement.blur();
  }

  // Remove event listeners
  if (backdrop._keydownHandler) {
    document.removeEventListener("keydown", backdrop._keydownHandler);
    backdrop._keydownHandler = null;
  }
  if (backdrop._backdropClickHandler) {
    backdrop.removeEventListener("click", backdrop._backdropClickHandler);
    backdrop._backdropClickHandler = null;
  }

  backdrop.classList.add("hidden");
  modal.classList.add("hidden");
  modal.innerHTML = ""; // Clear modal content to prevent focus issues

  // Return focus to the body
  setTimeout(() => {
    document.body.focus();
  }, 10);
}
window.closeModal = closeModal;

// =============== SOUND FX ===============
function playSound(type) {
  let url;
  if (!state.player.sound) return;
  switch (type) {
    case "click":
      url = "https://cdn.jsdelivr.net/gh/vikern/gamesfx/click1.mp3";
      break;
    case "crit":
      url = "https://cdn.jsdelivr.net/gh/vikern/gamesfx/crit.mp3";
      break;
    case "upgrade":
      url = "https://cdn.jsdelivr.net/gh/vikern/gamesfx/upgrade.mp3";
      break;
    case "achievement":
      url = "https://cdn.jsdelivr.net/gh/vikern/gamesfx/achieve.mp3";
      break;
    case "shop":
      url = "https://cdn.jsdelivr.net/gh/vikern/gamesfx/coin.mp3";
      break;
  }
  if (url) new Audio(url).play();
}

// =============== AD BANNER / SIMULATION ===============
function showAdBanner() {
  return !state.player.noAds && state.ads
    ? `<div class="mt-3 mb-1 text-center"><span class="inline-block px-4 py-2 bg-yellow-300 text-[#222c38] rounded font-bold" style="font-size:1em;box-shadow:0 2px 12px #faffc4a0">Ad Banner (Remove in Shop)</span></div>`
    : "";
}

// =============== BOTS / LEADERBOARD ===============
function randomName() {
  const names = [
    "BitWiz",
    "ZeroCool",
    "Glitcher",
    "Nyx",
    "CyberBat",
    "Hexa",
    "GhostShell",
    "V4mpw0L",
    "Cipher",
    "Spectre",
    "Echo",
    "Trace",
    "Pix3l",
    "Nexus",
    "Havoc",
    "BotNet",
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function generateBots(n = 6) {
  let bots = [];
  for (let i = 0; i < n; i++) {
    let base = Math.floor(Math.random() * 3500 + 250);
    bots.push({
      name: randomName(),
      packets: base + Math.floor(Math.random() * 2100),
      avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${randomName()}`,
    });
  }
  return bots;
}

// =============== PRESTIGE FUNCTIONS ===============
function doPrestige() {
  if (state.packets < 50000) return;

  let shardGain = Math.floor(Math.sqrt(state.packets / 10000));
  state.prestige.level++;
  state.prestige.dataShards += shardGain;
  state.prestige.totalPrestigeClicks += state.stats.totalClicks;

  // Reset progress
  state.packets = 0;
  state.perClick = 1;
  state.perSec = 0;
  state.critChance = 0;
  state.upgrades = { click: 0, idle: 0, crit: 0 };

  // Reset some stats
  state.stats.totalClicks = 0;
  state.stats.totalUpgrades = 0;

  showModal(
    "Prestige Complete!",
    `You gained ${shardGain} 🔷 Data Shards!<br>Your prestige level is now ${state.prestige.level}!`,
  );
  showHudNotify(`Prestige Level ${state.prestige.level}!`, "⭐");
  save();
  updateTopBar();
  renderTab();
  checkAchievements();
}

function buyPrestigeUpgrade(upgradeId) {
  let upgrade = PRESTIGE_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return;

  let currentLevel = state.prestige[upgradeId] || 0;
  let cost = upgrade.cost * (currentLevel + 1);

  if (state.prestige.dataShards < cost || currentLevel >= upgrade.maxLevel)
    return;

  state.prestige.dataShards -= cost;
  state.prestige[upgradeId] = currentLevel + 1;

  showHudNotify(`${upgrade.name} upgraded!`, "🔷");
  save();
  updateTopBar();
  renderTab();
}

function buyBoost(boostId) {
  let boost = BOOST_SHOP.find((b) => b.id === boostId);
  if (!boost || state.gems < boost.gems) return;

  state.gems -= boost.gems;
  state.boosts[boostId] = Date.now() + boost.duration;

  showHudNotify(`${boost.name} activated!`, "⚡");
  save();
  updateTopBar();
  renderTab();
}

function buyTheme(themeId) {
  let theme = THEMES[themeId];
  if (!theme) return;

  // Safety check - don't do anything if this is already the current theme
  if (state.theme === themeId) {
    return;
  }

  // Check if theme is already unlocked (including default themes)
  let isUnlocked = theme.unlocked || (state.themes && state.themes[themeId]);

  // If it's unlocked, just switch to it
  if (isUnlocked) {
    applyTheme(themeId);
    showHudNotify(`${theme.name} theme activated!`, "🎨");
    renderTab();
    return;
  }

  // If not unlocked, try to buy it
  if (state.gems < (theme.cost || 0)) {
    showHudNotify(`Not enough gems! Need ${theme.cost} 💎`, "❌");
    return;
  }

  state.gems -= theme.cost;
  if (!state.themes) state.themes = {};
  state.themes[themeId] = true;

  applyTheme(themeId);
  showHudNotify(`${theme.name} theme purchased and activated!`, "🎨");
  save();
  updateTopBar();
  renderTab();
}

function claimDailyReward() {
  let now = Date.now();
  let lastClaim = state.dailyRewards.lastClaim;

  if (lastClaim && now - lastClaim < 86400000) return; // Less than 24 hours

  // Check if streak should continue or reset
  if (lastClaim && now - lastClaim > 172800000) {
    // More than 48 hours
    state.dailyRewards.streak = 0; // Reset streak
  }

  let reward =
    DAILY_REWARDS[
      Math.min(state.dailyRewards.streak, DAILY_REWARDS.length - 1)
    ];

  state.gems += reward.gems;
  state.packets += reward.packets;
  state.dailyRewards.lastClaim = now;
  state.dailyRewards.streak++;

  if (state.dailyRewards.streak > 7) state.dailyRewards.streak = 7; // Cap at 7

  showModal(
    "Daily Reward!",
    `You received ${reward.gems} 💎 and ${reward.packets} 📦!<br>Streak: ${state.dailyRewards.streak} days`,
  );
  showHudNotify(`Day ${state.dailyRewards.streak} claimed!`, "📅");

  save();
  updateTopBar();
  renderTab();
  checkAchievements();
}

// =============== UI BINDING ===============
function clearTabEvents() {
  // Clear theme button events specifically
  document.querySelectorAll("[data-theme]").forEach((btn) => {
    btn.onclick = null;
  });

  // Clear other button events
  document.querySelectorAll("[data-boost]").forEach((btn) => {
    btn.onclick = null;
  });

  document.querySelectorAll("[data-prestige-upgrade]").forEach((btn) => {
    btn.onclick = null;
  });

  document.querySelectorAll("[data-gem-pack]").forEach((btn) => {
    btn.onclick = null;
  });

  document.querySelectorAll("[data-shop-item]").forEach((btn) => {
    btn.onclick = null;
  });
}

function bindTabEvents(tab) {
  // Clear any existing event listeners first
  clearTabEvents();

  if (tab === "game") {
    let btn = document.getElementById("click-btn");
    if (btn) btn.onclick = clickPacket;

    let prestigeBtn = document.getElementById("prestige-btn");
    if (prestigeBtn) prestigeBtn.onclick = () => setTab("prestige");
  }
  if (tab === "upgrades") {
    let uc = document.getElementById("upgrade-click");
    if (uc) uc.onclick = () => upgrade("click");
    let ui = document.getElementById("upgrade-idle");
    if (ui) ui.onclick = () => upgrade("idle");
    let ucr = document.getElementById("upgrade-crit");
    if (ucr) ucr.onclick = () => upgrade("crit");
  }
  if (tab === "shop") {
    document
      .querySelectorAll("[data-gem-pack]")
      .forEach(
        (btn) =>
          (btn.onclick = () => buyGemPack(btn.getAttribute("data-gem-pack"))),
      );
    document
      .querySelectorAll("[data-shop-item]")
      .forEach(
        (btn) =>
          (btn.onclick = () => buyShopItem(btn.getAttribute("data-shop-item"))),
      );
    let adbtn = document.getElementById("watch-ad-btn");
    if (adbtn) adbtn.onclick = watchAd;
  }
  if (tab === "prestige") {
    let prestigeBtn = document.getElementById("do-prestige");
    if (prestigeBtn) prestigeBtn.onclick = doPrestige;

    document
      .querySelectorAll("[data-prestige-upgrade]")
      .forEach(
        (btn) =>
          (btn.onclick = () =>
            buyPrestigeUpgrade(btn.getAttribute("data-prestige-upgrade"))),
      );
  }
  if (tab === "daily") {
    let claimBtn = document.getElementById("claim-daily");
    if (claimBtn) claimBtn.onclick = claimDailyReward;
  }
  if (tab === "boosts") {
    document.querySelectorAll("[data-boost]").forEach((btn) => {
      btn.onclick = () => buyBoost(btn.getAttribute("data-boost"));
    });
  }
  if (tab === "themes") {
    document.querySelectorAll("[data-theme]").forEach((btn) => {
      // Only add event listener if button is not disabled and not already active theme
      if (!btn.disabled && btn.getAttribute("data-theme") !== state.theme) {
        btn.onclick = (e) => {
          e.preventDefault();
          buyTheme(btn.getAttribute("data-theme"));
        };
      }
    });
  }
}

// =============== INIT ===============
function init() {
  load();
  updateTopBar();
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });
  document.getElementById("open-settings").onclick = showSettings;
  document.getElementById("modal-backdrop").onclick = closeModal;
  setInterval(idleTick, 1000);
  setInterval(save, 10000);

  // Apply current theme
  applyTheme(state.theme);

  // Prompt for player name if still default (only on first load)
  if (
    state.player.name === "Player" &&
    !localStorage.getItem("packet_clicker_name_prompted")
  ) {
    setTimeout(() => {
      localStorage.setItem("packet_clicker_name_prompted", "true");
      showNamePrompt();
    }, 1000);
  }

  renderTab();
  checkAchievements();

  // Additional mobile zoom prevention
  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  });

  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    function (event) {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    false,
  );

  // Disable pinch zoom
  document.addEventListener(
    "wheel",
    function (e) {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  // Prevent context menu on long press
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

// Custom name prompt modal
function showNamePrompt() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");

  backdrop.classList.remove("hidden");
  backdrop.setAttribute("aria-hidden", "false");
  modal.classList.remove("hidden");
  modal.innerHTML = `<h2 id="modal-title" class="text-neon-cyan mb-2 text-lg">🎮 Welcome to Packet Clicker MMO!</h2>
    <div style="text-align: center; padding: 1rem;">
      <p style="margin-bottom: 1rem; color: var(--text-primary);">What's your name, future packet master?</p>
      <input type="text" id="name-input" placeholder="Enter your name" value="Player"
             style="width: 100%; padding: 0.75rem; border: 2px solid var(--primary-color);
                    border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary);
                    font-family: inherit; font-size: 1rem; text-align: center;">
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button id="start-game-btn" class="neon-btn w-full">Start Game!</button>
        <button id="skip-name-btn" class="gem-btn w-full">Skip</button>
      </div>
    </div>`;

  // Add event listeners to avoid onclick issues
  const startBtn = modal.querySelector("#start-game-btn");
  const skipBtn = modal.querySelector("#skip-name-btn");
  if (startBtn) startBtn.addEventListener("click", setPlayerName);
  if (skipBtn) skipBtn.addEventListener("click", skipNameSetup);

  // Focus the modal and input after it appears
  setTimeout(() => {
    modal.focus();
    const input = document.getElementById("name-input");
    if (input) {
      input.focus();
      input.select();
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          setPlayerName();
        }
      });
    }
  }, 100);
}

function setPlayerName() {
  const input = document.getElementById("name-input");
  const playerName = input ? input.value.trim() : "";

  if (playerName && playerName !== "" && playerName !== "Player") {
    state.player.name = playerName;
    save();
    document.getElementById("player-name").textContent = state.player.name;
    closeModal();
    showHudNotify(
      `Welcome, ${state.player.name}! Ready to click some packets?`,
      "🎮",
    );
  } else {
    showHudNotify("Please enter a valid name!", "⚠️");
  }
}

function skipNameSetup() {
  closeModal();
  showHudNotify("Welcome to Packet Clicker MMO! Click to start!", "🎮");
}

window.onload = init;
