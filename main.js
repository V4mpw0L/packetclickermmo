// ==== Packet Clicker: Enhanced Mobile & Visual Effects ====

// Expose key functions to window for i18n wrappers and settings language injection
if (typeof window !== "undefined") {
  try {
    Object.assign(window, {
      renderGame,
      renderUpgrades,
      renderAchievements,
      renderShop,
      renderLeaderboard,
      renderPrestige,
      renderDaily,
      renderBoosts,
      renderThemes,
      showSettings,
      showEditProfile,
      updateTopBar,
      setTab,
      renderTab,
      buyBoost,
      showAdminPanel,
      Equipment,
    });
  } catch (e) {
    // no-op
  }
}

// Modular imports
import {
  startAnimalAura,
  stopAnimalAura,
  activateMegaFX,
  handleComboEffect,
  animalCritBurst,
} from "./src/effects/effects.mjs";
import {
  showComboTotalHUD,
  hideComboTotalHUD,
  showHudNotify,
  clearHUD,
} from "./src/ui/hud.mjs";
import Equipment from "./src/items/equipment.mjs";
import Leaderboard from "./src/leaderboard/firebase.mjs";
import {
  renderButton,
  renderMenu,
  renderButtonGroup,
  renderSelect,
} from "./src/ui/render.mjs";

/* Using global DEFAULT_AVATAR and STORAGE_KEY from constants UMD (src/data/constants.js) */

// Ensure default graphics quality is set immediately
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    if (
      !document.body.classList.contains("graphics-high") &&
      !document.body.classList.contains("graphics-medium") &&
      !document.body.classList.contains("graphics-low")
    ) {
      document.body.classList.add("graphics-high");
      window.graphicsQuality = "high";
    }
  });
}

// Click combo tracking
let clickCombo = 0;
let lastClickTime = 0;
// Expose clickCombo globally for HUD access
if (typeof window !== "undefined") {
  Object.defineProperty(window, "clickCombo", {
    get: () => clickCombo,
    enumerable: true,
  });
}
/* Using global COMBO_TIMEOUT from constants UMD */
// Track combo expiry to sync avatar border ring with combo HUD
let _comboExpireAt = 0;

// Calculate prestige requirement based on current prestige level
function getPrestigeRequirement() {
  const baseRequirement = 50000;
  const level = state.prestige.level || 0;
  // Each prestige increases requirement by 2x
  return Math.floor(baseRequirement * Math.pow(2, level));
}

const state = {
  player: {
    name: "Player",
    avatar: DEFAULT_AVATAR,
    sound: true,
    graphics: "high", // "high", "medium", "low"
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
    skinShadow: false,
  },
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
    ultraCombo: 0,
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
  // Equipment system
  inventory: [],
  equipment: { slot1: null, slot2: null, slot3: null, slot4: null },
};

// Apply theme to document
// applyTheme is provided by the UI module (src/ui/ui.js)

function getUnlockedAvatars() {
  let avatars = [{ seed: "Hacker", name: "Default" }];
  if (state.shop.skinBought || state.shop.skinElite)
    avatars.push({ seed: "EliteHacker", name: "Elite" });
  if (state.shop.skinCyber)
    avatars.push({ seed: "CyberPunk", name: "Cyber Punk" });
  if (state.shop.skinNeon)
    avatars.push({ seed: "NeonGhost", name: "Neon Ghost" });
  if (state.shop.skinShadow)
    avatars.push({ seed: "ShadowNinja", name: "Shadow Ninja" });
  if (state.achievements.includes("vip"))
    avatars.push({ seed: "VIP", name: "VIP" });
  if (state.achievements.includes("adfree"))
    avatars.push({ seed: "AdFree", name: "Ad-Free" });
  return avatars;
}

// Using Packet.storage.isSaveValid (see src/utils/storage.js)

function save() {
  if (
    window.Packet &&
    Packet.storage &&
    typeof Packet.storage.saveState === "function"
  ) {
    Packet.storage.saveState(state);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function load() {
  // Delegate to Packet.storage when available (preserves existing user-facing messages)
  if (window.Packet && Packet.storage) {
    const has = Packet.storage;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (e) {
        parsed = null;
      }

      // Corrupted JSON
      if (raw && parsed === null) {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(
          state,
          typeof has.createInitialState === "function"
            ? has.createInitialState()
            : state,
        );
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

      // Invalid/old save shape
      if (
        parsed &&
        typeof has.isSaveValid === "function" &&
        !has.isSaveValid(parsed)
      ) {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(
          state,
          typeof has.createInitialState === "function"
            ? has.createInitialState()
            : state,
        );
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

      // Load sanitized state (avoid Packet.storage.loadOrInit to prevent recursion)
      let baseState =
        parsed ||
        (typeof has.createInitialState === "function"
          ? has.createInitialState()
          : {});
      let sanitized =
        typeof has.sanitizeState === "function"
          ? has.sanitizeState(baseState)
          : baseState;
      Object.assign(state, sanitized);

      // Backward compatible safety shims
      if (!state.player.vipUntil) state.player.vipUntil = 0;
      if (state.player.noAds === undefined) state.player.noAds = false;
      if (typeof state.gems !== "number") state.gems = 0;
      if (!state.theme) state.theme = "cyberpunk";
      if (!state.themes) state.themes = {};
      return;
    } catch (e) {
      // fall back to legacy logic below
    }
  }
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
        graphics: "high",
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
        skinShadow: false,
      },
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
        graphics: "high",
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
        skinShadow: false,
      },
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
  if (!state.player.graphics) state.player.graphics = "high";
  if (typeof state.gems !== "number") state.gems = 0;
  if (!state.theme) state.theme = "cyberpunk";
  if (!state.themes) state.themes = {};

  // Apply graphics settings after loading saved data
  applyGraphicsSettings(state.player.graphics || "high");
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
  const w = typeof window !== "undefined" ? window : {};
  switch (tab) {
    case "game":
      return typeof w.renderGame === "function" ? w.renderGame() : renderGame();
    case "upgrades":
      return typeof w.renderUpgrades === "function"
        ? w.renderUpgrades()
        : renderUpgrades();
    case "achievements":
      return typeof w.renderAchievements === "function"
        ? w.renderAchievements()
        : renderAchievements();
    case "shop":
      return typeof w.renderShop === "function" ? w.renderShop() : renderShop();
    case "leaderboard":
      return typeof w.renderLeaderboard === "function"
        ? w.renderLeaderboard()
        : renderLeaderboard();
    case "prestige":
      return typeof w.renderPrestige === "function"
        ? w.renderPrestige()
        : renderPrestige();
    case "daily":
      return typeof w.renderDaily === "function"
        ? w.renderDaily()
        : renderDaily();
    case "boosts":
      return typeof w.renderBoosts === "function"
        ? w.renderBoosts()
        : renderBoosts();
    case "themes":
      return typeof w.renderThemes === "function"
        ? w.renderThemes()
        : renderThemes();
    case "equipment":
      return Equipment && Equipment.renderTab
        ? Equipment.renderTab(state)
        : typeof w.renderEquipment === "function"
          ? w.renderEquipment()
          : "";
    default:
      return "";
  }
}

// ======= TOP BAR UPDATE & ALIGNMENT =======
function updateActiveTab() {
  // Update current tab if it needs dynamic updates (like boost timers)
  if (activeTab === "boosts") {
    const tabContent = document.getElementById("tab-content");
    if (tabContent) {
      // Check if any boosts are active before re-rendering
      const hasActiveBoosts = Object.keys(state.boosts).some(
        (boostId) => state.boosts[boostId] > Date.now(),
      );
      if (hasActiveBoosts) {
        tabContent.innerHTML = getTabContent(activeTab);
        bindTabEvents(activeTab);
      }
    }
  }
}

function updateTopBar() {
  const playerNameEl = document.getElementById("player-name");
  if (isVIP()) {
    playerNameEl.innerHTML = `<img src="src/assets/vip.png" alt="VIP" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;" aria-hidden="true"/>${state.player.name}`;
  } else {
    playerNameEl.textContent = state.player.name;
  }
  const _avatarEl = document.getElementById("avatar");
  if (_avatarEl) {
    _avatarEl.src = getSafeAvatarUrl(state.player.avatar);
    // Add error handling to fallback to default avatar if loading fails
    _avatarEl.onerror = function () {
      if (this.src !== DEFAULT_AVATAR) {
        console.log("Avatar failed to load, using default");
        this.src = DEFAULT_AVATAR;
        this.onerror = null; // Prevent infinite loop
      }
    };
    // Dynamic avatar border ring based on current combo color (mirrors combo HUD colors)
    let comboColor = "var(--primary-color)";
    if (typeof clickCombo === "number") {
      if (clickCombo >= 120) comboColor = "#ff3040";
      else if (clickCombo >= 50) comboColor = "#ff4dff";
      else if (clickCombo >= 15) comboColor = "var(--accent-color)";
      else if (clickCombo >= 5) comboColor = "var(--secondary-color)";
    }
    const comboActive =
      typeof clickCombo === "number" &&
      clickCombo >= 5 &&
      Date.now() <= (_comboExpireAt || 0);
    if (comboActive) {
      if (typeof _avatarEl._baseShadow === "undefined") {
        _avatarEl._baseShadow = _avatarEl.style.boxShadow || "";
      }
      // 3.5px ring in combo color + keep subtle base glow
      _avatarEl.style.boxShadow = `0 0 0 3.5px ${comboColor}, 0 0 0 3px #1de9b611, 0 2px 8px #c4ebea33`;
    } else {
      // Reset to original when combo ends
      if (typeof _avatarEl._baseShadow !== "undefined") {
        _avatarEl.style.boxShadow = _avatarEl._baseShadow;
        delete _avatarEl._baseShadow;
      } else {
        _avatarEl.style.boxShadow = "";
      }
    }
  }
  let badge = document.getElementById("vip-badge");

  // Pills to show under the name (centered by CSS)
  let packets = `<span class="ml-2 text-neon-green font-bold" id="packets-bar" style="font-size:1em;display:inline-block;min-width:65px;text-align:right;"><span class="icon-packet"></span> <span class="event-number-glow">${state.packets.toLocaleString("en-US")}</span></span>`;
  let gemPill = `<span id="gem-pill-clickable" class="ml-2 text-neon-green font-bold" style="font-size:1em;display:inline-flex;align-items:center;gap:.25rem;padding:.2rem .5rem;border:1px solid var(--border-color);border-radius:999px;background:linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05));box-shadow:0 2px 10px var(--shadow-primary) inset, 0 1px 3px rgba(0,0,0,0.35);cursor:pointer;transition:all 0.2s ease;"><img src="src/assets/gem.png" alt="Gems" style="height:1.1rem;width:1.1rem;vertical-align:middle;display:inline-block;" aria-hidden="true"/><span class="event-number-glow">${state.gems.toLocaleString("en-US")}</span></span>`;

  if (isVIP()) {
    let ms = state.player.vipUntil - Date.now();
    let days = Math.floor(ms / (1000 * 60 * 60 * 24));
    let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    // Optimize VIP text length to prevent layout issues
    let vipText =
      days > 0
        ? `<img src="src/assets/vip.png" alt="VIP" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;" aria-hidden="true"/>VIP ${days}d`
        : `<img src="src/assets/vip.png" alt="VIP" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;" aria-hidden="true"/>VIP ${hours}h`;
    badge.innerHTML = `<span class="font-bold text-yellow-400 ml-2" style="margin-right:8px;display:inline-block;">${vipText}</span> ${gemPill} ${packets}`;
  } else {
    badge.innerHTML = `${gemPill} ${packets}`;
  }

  // Keep existing gem counter (in the settings area) in sync
  let el = document.getElementById("gem-count");
  if (el) el.textContent = state.gems.toLocaleString("en-US");

  // Packets/sec pill disabled per design request
}

// =============== GAME TAB RENDERING ===============
function renderGame() {
  let adBanner = showAdBanner();
  // Build boost status display
  let boostPills = [];
  let totalMultiplier = 1;

  // Active boosts
  if (state.boosts.doublePackets > Date.now()) {
    let remaining = Math.ceil((state.boosts.doublePackets - Date.now()) / 1000);
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#4ade80; background:rgba(0,0,0,.25); font-weight:600; font-size:0.75rem; white-space:nowrap;">📦 3x Packets (<span class="event-number-glow">${remaining}s</span>)</span>`,
    );
    totalMultiplier *= 3;
  }
  if (state.boosts.quadrupleClick > Date.now()) {
    let remaining = Math.ceil(
      (state.boosts.quadrupleClick - Date.now()) / 1000,
    );
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25); font-weight:600; font-size:0.75rem; white-space:nowrap;">⚡ 8x Click (<span class="event-number-glow">${remaining}s</span>)</span>`,
    );
    totalMultiplier *= 8;
  }
  if (state.boosts.megaCrit > Date.now()) {
    let remaining = Math.ceil((state.boosts.megaCrit - Date.now()) / 1000);
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ff88ff; background:rgba(0,0,0,.25); font-weight:600; font-size:0.75rem; white-space:nowrap;">🌟 75% Crit (<span class="event-number-glow">${remaining}s</span>)</span>`,
    );
  }
  if (state.boosts.tripleGems > Date.now()) {
    let remaining = Math.ceil((state.boosts.tripleGems - Date.now()) / 1000);
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffd700; background:rgba(0,0,0,.25); font-weight:600; font-size:0.75rem; white-space:nowrap;">✨ 5x Gems (<span class="event-number-glow">${remaining}s</span>)</span>`,
    );
  }
  if (state.boosts.autoClicker > Date.now()) {
    let remaining = Math.ceil((state.boosts.autoClicker - Date.now()) / 1000);
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25); font-weight:600; font-size:0.75rem; white-space:nowrap;">🤖 +25/s Cyber (<span class="event-number-glow">${remaining}s</span>)</span>`,
    );
  }
  if (state.boosts.ultraCombo > Date.now()) {
    let remaining = Math.ceil((state.boosts.ultraCombo - Date.now()) / 1000);
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#fbbf24; background:linear-gradient(45deg, rgba(251,191,36,0.3), rgba(168,85,247,0.3)); font-weight:600; font-size:0.75rem; white-space:nowrap;">🚀 10x QUANTUM (<span class="event-number-glow">${remaining}s</span>)</span>`,
    );
    totalMultiplier *= 10;
  }

  // Prestige multiplier
  if (state.prestige.level > 0) {
    totalMultiplier *= 1 + state.prestige.level * 0.1;
    boostPills.push(
      `<span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#c084fc; background:rgba(0,0,0,.25); font-weight:600; font-size:0.75rem; white-space:nowrap;"><img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:0.85rem;height:0.85rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;"/> Prestige Bonus: <span class="event-number-glow">+${state.prestige.level * 10}%</span></span>`,
    );
  }

  // Create boost status with proper grid layout
  let boostStatus = "";
  if (boostPills.length > 0) {
    let rows = [];
    for (let i = 0; i < boostPills.length; i += 2) {
      let row = `<div class="flex justify-between items-center text-sm" style="gap: 0.5rem;">`;
      row += boostPills[i];
      if (boostPills[i + 1]) {
        row += boostPills[i + 1];
      }
      row += `</div>`;
      rows.push(row);
    }
    boostStatus = rows.join("");
  }

  // Effective rates incl. boosts (match idleTick and clickPacket)
  let perSecBase = state.perSec;
  if (state.prestige.autoClicker > 0) perSecBase += state.prestige.autoClicker;
  if (state.boosts.autoClicker > Date.now()) perSecBase += 25;

  const eq =
    typeof Equipment !== "undefined" && Equipment.computeBonuses
      ? Equipment.computeBonuses(state)
      : typeof getEquipmentBonuses === "function"
        ? getEquipmentBonuses()
        : { perClick: 0, perSec: 0, critChance: 0 };
  let effectivePerClick = Math.floor(
    (state.perClick + (eq.perClick || 0)) * totalMultiplier,
  );
  let effectivePerSec = Math.floor(
    (perSecBase + (eq.perSec || 0)) * totalMultiplier,
  );

  // Use modular renderButton for click button - mobile optimized
  const clickBtn = renderButton({
    id: "click-btn",
    className: "neon-btn mobile-click-btn active:scale-95 transition-transform",
    label:
      '<span class="finger-icon"></span> Collect Packets <span class="finger-icon"></span>',
    attrs: {
      style:
        "min-width: clamp(200px, 60vw, 320px); min-height: clamp(80px, 15vh, 120px); font-size: clamp(1.6rem, 6vw, 2.5rem); touch-action: manipulation; -webkit-tap-highlight-color: transparent;",
      "aria-label": "Collect Packets - Tap to earn",
    },
  });

  // Add mobile optimizations to click button after creation
  setTimeout(() => {
    const clickButton = document.getElementById("click-btn");
    if (clickButton && MobileUtils.isMobile()) {
      MobileUtils.addTouchOptimization(clickButton);
      MobileUtils.enableGPUAcceleration(clickButton);
    }
  }, 0);

  // Use modular renderButton for prestige button if available
  const prestigeBtn =
    state.packets >= getPrestigeRequirement()
      ? `<div class="text-center" style="display: flex; justify-content: center;">${renderButton(
          {
            id: "prestige-btn",
            className: "text-sm",
            label:
              '<img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:1.2rem;height:1.2rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;"/> Prestige Available <img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:1.2rem;height:1.2rem;vertical-align:middle;display:inline-block;margin-left:0.25rem;"/>',
          },
        )}</div>`
      : "";

  return `
    <div class="neon-card flex flex-col gap-4 px-3 py-4 mb-3">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🎮 Game</h2>
      ${clickBtn}
      <div style="border: 1px solid #4caf50; border-radius: 8px; padding: 0.75rem; background: rgba(76, 175, 80, 0.05);">
        <div class="flex justify-between items-center text-sm" style="gap: 0.5rem;">
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#65ffda; background:rgba(0,0,0,.25); font-weight:600;">Packets/Click: <span class="event-number-glow">${effectivePerClick}</span></span>
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25); font-weight:600;">Packets/Sec: <span class="event-number-glow">${effectivePerSec}</span></span>
        </div>
        <div class="flex justify-between items-center text-sm" style="gap: 0.5rem; margin-top: 0.5rem;">
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ff88ff; background:rgba(0,0,0,.25); font-weight:600;">Crit Chance: <span class="event-number-glow">${Math.min(100, state.critChance + (eq.critChance || 0))}%</span></span>
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffd700; background:rgba(0,0,0,.25); font-weight:600;">Crit Multiplier: <span class="event-number-glow">${state.critMult}x</span></span>
        </div>
      </div>
      ${boostStatus}
      ${renderActiveEvent()}
      ${prestigeBtn}
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
      let boostInfo = (Array.isArray(BOOST_SHOP) &&
        BOOST_SHOP.find((b) => b.id === boostType)) || { name: boostType };

      // Set colors to match Game page
      let color = "#4ade80"; // Default green
      let emoji = "🚀";

      if (boostType === "doublePackets") {
        color = "#4ade80";
        emoji = "🚀";
      } else if (boostType === "quadrupleClick") {
        color = "#4ade80";
        emoji = "🖱️";
      } else if (boostType === "megaCrit") {
        color = "#ff88ff";
        emoji = "✨";
      } else if (boostType === "tripleGems") {
        color = "#ffd700";
        emoji = "💎";
      } else if (boostType === "autoClicker") {
        color = "#ffe08a";
        emoji = "🤖";
      }

      activeBoosts += `<div style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:${color}; background:rgba(0,0,0,.25); font-weight:600; font-size:0.875rem; margin-bottom:0.5rem; display:inline-block; white-space:nowrap;">${emoji} ${boostInfo.name} active (<span style="color:#ffd700; font-weight:bold; transform:translateY(-1px); display:inline-block; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.4);">${remaining}s</span>)</div>`;
    }
  });

  // Compact grid-based boost cards
  let boostItems = BOOST_SHOP.map((boost) => {
    const until = state.boosts[boost.id] || 0;
    const active = until > Date.now();
    const remaining = active ? Math.ceil((until - Date.now()) / 1000) : 0;
    const canAfford = state.gems >= boost.gems;

    // Rarity colors and effects
    const rarityStyles = {
      common: {
        border: "#4ade80",
        glow: "rgba(74, 222, 128, 0.3)",
        bg: "rgba(74, 222, 128, 0.05)",
      },
      uncommon: {
        border: "#22d3ee",
        glow: "rgba(34, 211, 238, 0.4)",
        bg: "rgba(34, 211, 238, 0.08)",
      },
      rare: {
        border: "#a855f7",
        glow: "rgba(168, 85, 247, 0.5)",
        bg: "rgba(168, 85, 247, 0.1)",
      },
      epic: {
        border: "#f59e0b",
        glow: "rgba(245, 158, 11, 0.6)",
        bg: "rgba(245, 158, 11, 0.12)",
      },
      legendary: {
        border: "#ef4444",
        glow: "rgba(239, 68, 68, 0.7)",
        bg: "rgba(239, 68, 68, 0.15)",
      },
      mythic: {
        border: "#fbbf24",
        glow: "rgba(251, 191, 36, 0.8)",
        bg: "linear-gradient(45deg, rgba(251, 191, 36, 0.2), rgba(168, 85, 247, 0.2))",
      },
    };

    const style = rarityStyles[boost.rarity] || rarityStyles.common;

    return `
      <div class="boost-card-compact"
           style="
             border: 2px solid ${style.border};
             background: ${style.bg};
             border-radius: 10px;
             padding: 0.75rem;
             box-shadow: 0 3px 12px ${style.glow}, 0 1px 6px rgba(0,0,0,0.3);
             transition: all 0.3s ease;
             cursor: ${active || !canAfford ? "not-allowed" : "pointer"};
             opacity: ${active || !canAfford ? "0.6" : "1"};
             display: flex;
             flex-direction: column;
             align-items: center;
             text-align: center;
             height: 100%;
             min-height: 200px;
             justify-content: space-between;
           "
           onclick="${active || !canAfford ? "" : `buyBoost('${boost.id}')`}"
           onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 6px 18px ${style.glow}, 0 3px 10px rgba(0,0,0,0.4)'"
           onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 3px 12px ${style.glow}, 0 1px 6px rgba(0,0,0,0.3)'">

        <div style="font-size: 2.2rem; margin-bottom: 0.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          ${boost.icon}
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; width: 100%;">
          <div style="font-size: 0.9rem; font-weight: 800; color: ${style.border}; text-shadow: 0 1px 2px rgba(0,0,0,0.5); margin-bottom: 0.25rem; line-height: 1.2;">
            ${boost.name.replace(/^[^A-Za-z]*\s*/, "")}
          </div>

          <div style="font-size: 0.7rem; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 0.5rem;">
            ${boost.rarity}
          </div>

          <div style="font-size: 0.75rem; color: #e2e8f0; margin-bottom: 0.5rem; line-height: 1.3;">
            ${boost.desc}
          </div>
        </div>

        <div style="width: 100%; margin-top: auto;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; padding: 0.4rem 0.6rem; background: rgba(0,0,0,0.4); border-radius: 999px; border: 1px solid ${style.border}40; margin-bottom: 0.5rem;">
            <span class="event-number-glow" style="font-size: 1rem; font-weight: 800;">${boost.gems}</span>
            <img src="src/assets/gem.png" alt="Gems" style="height:0.9rem;width:0.9rem;" aria-hidden="true"/>
          </div>

          ${
            active
              ? `<div style="padding: 0.4rem; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; border-radius: 6px; font-size: 0.7rem;">
                  <div style="color: #4caf50; font-weight: bold;">⚡ ACTIVE</div>
                  <div style="color: #22c55e;"><span class="event-number-glow">${remaining}</span>s</div>
                 </div>`
              : !canAfford
                ? `<div style="padding: 0.4rem; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 6px; font-size: 0.7rem; color: #ef4444; font-weight: bold;">
                    NEED GEMS
                   </div>`
                : `<div style="padding: 0.4rem; background: ${style.bg}; border: 1px solid ${style.border}; border-radius: 6px; font-weight: bold; color: ${style.border}; font-size: 0.75rem;">
                    ACTIVATE
                   </div>`
          }
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2" style="background: linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #1a202c 100%); border: 2px solid #4caf50;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="font-size: 2rem; font-weight: 900; background: linear-gradient(45deg, #4caf50, #22c55e, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin-bottom: 0.5rem;">
          ⚡ PREMIUM POWER BOOSTS ⚡
        </h2>
        <div style="font-size: 1rem; color: #a0aec0; font-style: italic; margin-bottom: 1rem;">
          Supercharge your progress with exclusive gem-powered abilities
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(90deg, rgba(76, 175, 80, 0.1), rgba(34, 197, 94, 0.1)); border: 1px solid #4caf50; border-radius: 999px;">
          <span style="color: #4caf50; font-weight: bold;">Your Gems:</span>
          <span class="event-number-glow" style="font-size: 1.3rem; font-weight: 900;">${state.gems}</span>
          <img src="src/assets/gem.png" alt="Gems" style="height:1.2rem;width:1.2rem;" aria-hidden="true"/>
        </div>
      </div>

      ${
        activeBoosts
          ? `
        <div style="margin-bottom: 2rem; padding: 1rem; background: linear-gradient(45deg, rgba(74, 222, 128, 0.1), rgba(34, 211, 238, 0.1)); border: 2px solid #22c55e; border-radius: 12px;">
          <div style="text-align: center; color: #22c55e; font-weight: bold; font-size: 1.1rem; margin-bottom: 1rem;">
            🔥 ACTIVE POWER-UPS 🔥
          </div>
          ${activeBoosts}
        </div>
      `
          : ""
      }

      <div style="margin-bottom: 1.5rem;">
        <div style="text-align: center; font-size: 1.2rem; font-weight: 800; color: #fbbf24; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
          💎 AVAILABLE POWER BOOSTS 💎
        </div>
        <div style="text-align: center; font-size: 0.9rem; color: #94a3b8; margin-bottom: 1.5rem;">
          Each boost stacks with your other bonuses for maximum power!
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        ${boostItems}
      </div>

      <div style="text-align: center; padding: 1rem; background: linear-gradient(90deg, rgba(76, 175, 80, 0.1), rgba(34, 197, 94, 0.1)); border: 1px solid #4caf50; border-radius: 12px; margin-top: 1.5rem;">
        <div style="color: #4caf50; font-weight: bold; margin-bottom: 0.25rem;">💫 PRO TIP</div>
        <div style="color: #cbd5e0; font-size: 0.9rem;">
          Combine multiple boosts for incredible synergy effects!
        </div>
      </div>
    </div>
  `;
}

// =============== THEMES TAB ===============
function renderThemes() {
  // Separate free and premium themes
  let freeThemes = [];
  let premiumThemes = [];

  Object.entries(THEMES).forEach(([id, theme]) => {
    if (theme.unlocked || theme.cost === 0) {
      freeThemes.push([id, theme]);
    } else {
      premiumThemes.push([id, theme]);
    }
  });

  const renderThemeCard = ([id, theme]) => {
    let isActive = state.theme === id;
    let isUnlocked = theme.unlocked || state.themes?.[id];
    let canBuy = !isUnlocked && state.gems >= (theme.cost || 0);

    const primaryColor = theme.colors[0] || "#1de9b6";
    const secondaryColor = theme.colors[1] || "#f7cf5c";
    const accentColor = theme.colors[2] || "#222c38";

    return `
      <div class="theme-card-compact ${isActive ? "active" : ""} ${!isUnlocked && !canBuy ? "locked" : ""}"
           data-theme="${id}">
        <div class="theme-card-header">
          <div class="theme-info">
            <div class="theme-name-compact">${theme.name}</div>
            <div class="theme-desc-compact">${theme.description || "Classic theme"}</div>
          </div>
          ${isActive ? `<div class="active-indicator">✓</div>` : ""}
        </div>

        <div class="theme-preview-compact">
          <div class="color-preview-compact">
            <span class="color-dot-compact" style="background: ${theme.colors[0]};"></span>
            <span class="color-dot-compact" style="background: ${theme.colors[1]};"></span>
            <span class="color-dot-compact" style="background: ${theme.colors[2]};"></span>
          </div>
        </div>

        <div class="theme-action-compact">
          ${
            !isUnlocked
              ? `<div class="theme-cost-compact">
              ${(theme.cost || 0).toLocaleString("en-US")} 💎
            </div>`
              : ""
          }
          ${
            !isActive
              ? `<button class="theme-btn-compact ${!isUnlocked ? "buy" : "use"}"
                    ${!isUnlocked && !canBuy ? "disabled" : ""}
                    style="--theme-primary: ${primaryColor}; --theme-secondary: ${secondaryColor};">
              ${!isUnlocked ? "Buy" : "Use"}
            </button>`
              : `<div class="active-label">Active</div>`
          }
        </div>
      </div>
    `;
  };

  let freeThemeItems = freeThemes.map(renderThemeCard).join("");
  let premiumThemeItems = premiumThemes.map(renderThemeCard).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🎨 Visual Themes</h2>

      <div class="text-sm text-neon-gray mb-4 text-center">
        Customize your game's appearance with beautiful color schemes
      </div>

      ${
        freeThemes.length > 0
          ? `
        <div class="themes-section-compact">
          <h3 class="themes-section-title-compact">🆓 Free Themes</h3>
          <div class="themes-grid-compact">
            ${freeThemeItems}
          </div>
        </div>
      `
          : ""
      }

      ${
        premiumThemes.length > 0
          ? `
        <div class="themes-section-compact">
          <h3 class="themes-section-title-compact">💎 Premium Themes</h3>
          <div class="themes-grid-compact">
            ${premiumThemeItems}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

// =============== UPGRADES PANEL ===============
function renderUpgrades() {
  return `
    <div class="neon-card flex flex-col gap-4 px-3 py-4 mb-3">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🛠️ Upgrades</h2>

      <div class="bulk-options" style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
        ${renderButton({
          id: "bulk-x10",
          className: "bulk-btn",
          label: "x10",
          dataAttr: 'data-bulk="10"',
        })}
        ${renderButton({
          id: "bulk-x100",
          className: "bulk-btn",
          label: "x100",
          dataAttr: 'data-bulk="100"',
        })}
        ${renderButton({
          id: "bulk-max",
          className: "bulk-btn",
          label: "MAX",
          dataAttr: 'data-bulk="max"',
        })}
      </div>

      ${renderButton({
        id: "upgrade-click",
        className: "upgrade-btn",
        label: `+1/click — <span>${upgradeCost("click").toLocaleString("en-US")}</span> <span class="icon-packet"></span>`,
        dataAttr: `data-level="Lvl. ${state.upgrades.click}"`,
      })}
      ${renderButton({
        id: "upgrade-idle",
        className: "upgrade-btn",
        label: `+1/sec — <span>${upgradeCost("idle").toLocaleString("en-US")}</span> <span class="icon-packet"></span>`,
        dataAttr: `data-level="Lvl. ${state.upgrades.idle}"`,
      })}
      ${renderButton({
        id: "upgrade-crit",
        className: "upgrade-btn",
        label: `+2% crit — <span>${upgradeCost("crit").toLocaleString("en-US")}</span> <span class="icon-packet"></span>`,
        dataAttr: `data-level="Lvl. ${state.upgrades.crit}"`,
      })}
      <div class="text-neon-gray text-xs mt-1">
        Each upgrade increases cost. <span class="text-neon-yellow">Critical Hits</span> give 2x per click!
      </div>
    </div>
  `;
}
function upgradeCost(type) {
  let baseCost;
  switch (type) {
    case "click":
      baseCost = 10 + Math.floor(state.upgrades.click * 13.5);
      break;
    case "idle":
      baseCost = 25 + Math.floor(state.upgrades.idle * 18.2);
      break;
    case "crit":
      baseCost = 40 + Math.floor(state.upgrades.crit * 27.1);
      break;
    default:
      baseCost = 0;
  }

  // Apply upgradeDiscount event (50% off)
  if (
    state.randomEvent.active &&
    state.randomEvent.type === "upgradeDiscount"
  ) {
    baseCost = Math.floor(baseCost * (state.randomEvent.multiplier || 0.5));
  }

  return baseCost;
}

// Track selected bulk mode
let selectedBulk = 1;

function setBulkMode(amount) {
  selectedBulk = amount;

  // Update bulk button visuals
  document.querySelectorAll(".bulk-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(`[data-bulk="${amount}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  // Update upgrade button labels
  updateUpgradeButtonLabels();
}

function updateUpgradeButtonLabels() {
  ["click", "idle", "crit"].forEach((type) => {
    const btn = document.getElementById(`upgrade-${type}`);
    if (!btn) return;

    let quantity = selectedBulk;
    if (selectedBulk === "max") {
      quantity = maxAffordableUpgrades(type);
    }

    const cost =
      quantity === 1 ? upgradeCost(type) : bulkUpgradeCost(type, quantity);

    let effectText;
    switch (type) {
      case "click":
        effectText = quantity === 1 ? "+1/click" : `+${quantity}/click`;
        break;
      case "idle":
        effectText = quantity === 1 ? "+1/sec" : `+${quantity}/sec`;
        break;
      case "crit":
        effectText = quantity === 1 ? "+2% crit" : `+${2 * quantity}% crit`;
        break;
    }

    const label = `${effectText} — <span>${cost.toLocaleString("en-US")}</span> <span class="icon-packet"></span>`;
    btn.innerHTML = label;

    if (state.packets < cost) {
      btn.classList.add("opacity-50");
      btn.disabled = true;
    } else {
      btn.classList.remove("opacity-50");
      btn.disabled = false;
    }
  });
}

function getUpgradeEffect(type) {
  switch (type) {
    case "click":
      return 1;
    case "idle":
      return 1;
    case "crit":
      return 2;
    default:
      return 1;
  }
}

function bulkUpgradeCost(type, quantity) {
  if (quantity <= 1) return upgradeCost(type);

  let totalCost = 0;
  let currentLevel = state.upgrades[type];

  for (let i = 0; i < quantity; i++) {
    let baseCost;
    switch (type) {
      case "click":
        baseCost = 10 + Math.floor((currentLevel + i) * 13.5);
        break;
      case "idle":
        baseCost = 25 + Math.floor((currentLevel + i) * 18.2);
        break;
      case "crit":
        baseCost = 40 + Math.floor((currentLevel + i) * 27.1);
        break;
      default:
        baseCost = 0;
    }

    if (
      state.randomEvent.active &&
      state.randomEvent.type === "upgradeDiscount"
    ) {
      baseCost = Math.floor(baseCost * (state.randomEvent.multiplier || 0.5));
    }

    totalCost += baseCost;
  }

  return totalCost;
}

function maxAffordableUpgrades(type) {
  let count = 0;
  let totalCost = 0;
  let currentLevel = state.upgrades[type];

  while (totalCost <= state.packets && count < 1000) {
    let baseCost;
    switch (type) {
      case "click":
        baseCost = 10 + Math.floor((currentLevel + count) * 13.5);
        break;
      case "idle":
        baseCost = 25 + Math.floor((currentLevel + count) * 18.2);
        break;
      case "crit":
        baseCost = 40 + Math.floor((currentLevel + count) * 27.1);
        break;
      default:
        return count;
    }

    if (
      state.randomEvent.active &&
      state.randomEvent.type === "upgradeDiscount"
    ) {
      baseCost = Math.floor(baseCost * (state.randomEvent.multiplier || 0.5));
    }

    if (totalCost + baseCost > state.packets) break;

    totalCost += baseCost;
    count++;
  }

  return count;
}

// Using imported HUD showHudNotify from ui/hud.js

// =============== ACHIEVEMENTS PANEL ===============
function renderAchievements() {
  let achList = ACHIEVEMENTS.map((ach) => {
    let unlocked = state.achievements.includes(ach.id);
    return `<div class="achievement-card${unlocked ? " unlocked" : ""}" style="text-align: center;">
      <div class="achievement-emoji">${ach.emoji === "📦" ? '<span class="icon-packet"></span>' : ach.emoji}</div>
      <div class="achievement-content" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
        <div class="achievement-name" style="text-align: center;">${ach.name}</div>
        <div class="achievement-desc" style="text-align: center;">${ach.desc}</div>
        ${ach.gem ? `<div class="achievement-reward" style="text-align: center;">${unlocked ? "✓" : "+" + ach.gem} 💎</div>` : ""}
      </div>
    </div>`;
  }).join("");

  const unlockedCount = state.achievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercentage = (unlockedCount / totalCount) * 100;

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🏆 Achievements</h2>

      <div style="text-align: center; margin: 1rem 0;">
        <div class="achievement-stats" style="text-align:center; margin:.5rem 0 .75rem; padding:.35rem .75rem; border:1px solid var(--border-color); border-radius:999px; width:fit-content; margin:0 auto .75rem; background:linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05));">
          <span class="event-number-glow">${unlockedCount}</span> / <span class="event-number-glow">${totalCount}</span> Unlocked
        </div>

        <div style="position:relative; height:8px; border-radius:999px; background:#22313f; border:1px solid var(--border-color); overflow:hidden; box-shadow: inset 0 1px 4px rgba(0,0,0,.5); margin:0 auto; max-width: 300px;">
          <div style="height:100%; width: ${progressPercentage.toFixed(1)}%; background: linear-gradient(90deg, var(--secondary-color), var(--primary-color)); box-shadow: 0 0 6px var(--shadow-primary); transition: width 0.3s ease;"></div>
        </div>
      </div>

      <div class="achievement-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 1rem;">${achList}</div>
    </div>
  `;
}

// =============== SHOP PANEL ===============
function renderShop() {
  // Premium Gem Packs Section
  let gemStore = GEM_PACKS.map((p) =>
    renderButton({
      className: "shop-premium-btn",
      label: `<div class="shop-premium-content">
        <div class="shop-gem-amount">${p.label}</div>
        <div class="shop-gem-price">$${p.price.toFixed(2)}</div>
      </div>`,
      dataAttr: `data-gem-pack="${p.id}"`,
    }),
  ).join("");

  // VIP Items Section
  let vipItems = SHOP_ITEMS.filter((item) => item.type === "vip")
    .map((item) => {
      let owned = isVIP();
      return renderButton({
        className: `shop-vip-btn ${owned ? "shop-owned" : ""}`,
        label: `<div class="shop-item-content">
        <div class="shop-item-icon"><img src="src/assets/vip.png" alt="VIP" style="height:1.2rem;width:1.2rem;" aria-hidden="true"/></div>
        <div class="shop-item-name">${item.label}</div>
        <div class="shop-item-price">
          ${
            owned
              ? '<span class="shop-owned-text">✓</span>'
              : `${item.gems}<img src="src/assets/gem.png" alt="Gems" style="height:0.9rem;width:0.9rem;vertical-align:middle;margin-left:0.2rem;" aria-hidden="true"/>`
          }
        </div>
      </div>`,
        dataAttr: `data-shop-item="${item.id}"`,
        disabled: owned,
      });
    })
    .join("");

  // Cosmetic Items Section
  let cosmeticItems = SHOP_ITEMS.filter((item) => item.type === "skin")
    .map((item) => {
      let owned =
        state.shop[item.id] ||
        (item.id === "skinElite" && state.shop.skinBought);
      return renderButton({
        className: `shop-cosmetic-btn ${owned ? "shop-owned" : ""}`,
        label: `<div class="shop-item-content">
        <div class="shop-item-icon">🎨</div>
        <div class="shop-item-name">${item.label}</div>
        <div class="shop-item-price">
          ${
            owned
              ? '<span class="shop-owned-text">✓</span>'
              : `${item.gems}<img src="src/assets/gem.png" alt="Gems" style="height:0.9rem;width:0.9rem;vertical-align:middle;margin-left:0.2rem;" aria-hidden="true"/>`
          }
        </div>
        <div class="shop-item-desc">${item.desc}</div>
      </div>`,
        dataAttr: `data-shop-item="${item.id}"`,
        disabled: owned,
      });
    })
    .join("");

  // Utility Items Section
  let utilityItems = SHOP_ITEMS.filter((item) => item.type === "noAds")
    .map((item) => {
      let owned = state.player.noAds;
      return renderButton({
        className: `shop-utility-btn ${owned ? "shop-owned" : ""}`,
        label: `<div class="shop-item-content">
        <div class="shop-item-icon">🚫</div>
        <div class="shop-item-name">${item.label}</div>
        <div class="shop-item-price">
          ${
            owned
              ? '<span class="shop-owned-text">✓</span>'
              : `${item.gems}<img src="src/assets/gem.png" alt="Gems" style="height:0.9rem;width:0.9rem;vertical-align:middle;margin-left:0.2rem;" aria-hidden="true"/>`
          }
        </div>
      </div>`,
        dataAttr: `data-shop-item="${item.id}"`,
        disabled: owned,
      });
    })
    .join("");

  // Ad Section
  let adBtn =
    !state.player.noAds && state.ads
      ? `<div class="shop-section">
        <div class="shop-section-header">
          <h3 class="shop-section-title">📺 Free Rewards</h3>
        </div>
        ${renderButton({
          id: "watch-ad-btn",
          className: "shop-ad-btn",
          label: `<div class="shop-item-content">
            <div class="shop-item-icon">📺</div>
            <div class="shop-item-name">Watch Ad</div>
            <div class="shop-item-price">
              <span class="shop-free-text">FREE</span>
            </div>
          </div>`,
        })}
      </div>`
      : "";

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🏪 Premium Shop</h2>

      <div style="display: flex; justify-content: center; margin-bottom: 1.5rem;">
        <div class="shop-balance">
          <img src="src/assets/gem.png" alt="Gems" style="height:1.2rem;width:1.2rem;" aria-hidden="true"/>
          <span class="event-number-glow">${state.gems.toLocaleString("en-US")}</span>
        </div>
      </div>

      <!-- Premium Gems Section -->
      <div class="shop-section">
        <div class="shop-section-header">
          <h3 class="shop-section-title">💎 Premium Gems</h3>
          <div class="shop-section-subtitle">Support development & get gems</div>
        </div>
        <div class="shop-grid">
          ${gemStore}
        </div>
      </div>

      <!-- VIP Section -->
      ${
        vipItems
          ? `<div class="shop-section">
        <div class="shop-section-header">
          <h3 class="shop-section-title">VIP Membership</h3>
          <div class="shop-section-subtitle">Exclusive benefits & bonuses</div>
        </div>
        <div class="shop-grid">
          ${vipItems}
        </div>
      </div>`
          : ""
      }

      <!-- Cosmetics Section -->
      ${
        cosmeticItems
          ? `<div class="shop-section">
        <div class="shop-section-header">
          <h3 class="shop-section-title">🎨 Cosmetics</h3>
          <div class="shop-section-subtitle">Customize your appearance</div>
        </div>
        <div class="shop-grid">
          ${cosmeticItems}
        </div>
      </div>`
          : ""
      }

      <!-- Utilities Section -->
      ${
        utilityItems
          ? `<div class="shop-section">
        <div class="shop-section-header">
          <h3 class="shop-section-title">⚡ Utilities</h3>
          <div class="shop-section-subtitle">Enhance your experience</div>
        </div>
        <div class="shop-grid">
          ${utilityItems}
        </div>
      </div>`
          : ""
      }

      <!-- Free Section -->
      ${adBtn}
    </div>
  `;
}

// =============== EQUIPMENT TAB ===============
// Equipment system now handled by src/items/equipment.mjs

// =============== CLICK CURSOR BY COMBO ===============
function setCursorForCombo(combo) {
  try {
    const btn = document.getElementById("click-btn");
    if (!btn) return;
    let file = "src/assets/green.webp"; // default
    if (combo >= 120) file = "src/assets/animal.webp";
    else if (combo >= 50) file = "src/assets/pink.webp";
    else if (combo >= 15) file = "src/assets/blue.webp";
    else if (combo >= 5) file = "src/assets/gold.webp";
    else file = "src/assets/green.webp";
    // hotspot x=6 y=0 for pointer
    btn.style.cursor = `url("${file}") 6 0, pointer`;

    // Store the current cursor image for mobile feedback
    btn.dataset.cursorImage = file;
  } catch (_) {}
}

// Mobile tap visual feedback
function showMobileCursorFeedback() {
  if (typeof document === "undefined") return;

  const btn = document.getElementById("click-btn");
  if (!btn || !btn.dataset.cursorImage) return;

  // Remove any existing feedback
  const existing = document.getElementById("mobile-cursor-feedback");
  if (existing) existing.remove();

  // Create visual feedback element
  const feedback = document.createElement("div");
  feedback.id = "mobile-cursor-feedback";
  feedback.style.position = "fixed";
  feedback.style.pointerEvents = "none";
  feedback.style.zIndex = "9999";
  feedback.style.width = "48px";
  feedback.style.height = "48px";
  feedback.style.backgroundImage = `url("${btn.dataset.cursorImage}")`;
  feedback.style.backgroundSize = "contain";
  feedback.style.backgroundRepeat = "no-repeat";
  feedback.style.backgroundPosition = "center";
  feedback.style.transform = "translate(-50%, -50%) scale(0.8)";
  feedback.style.position = "absolute";
  feedback.style.opacity = "0";
  feedback.style.transition = "all 200ms ease-out";

  // Position at center of click button with scroll offset
  const rect = btn.getBoundingClientRect();
  const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
  feedback.style.left = rect.left + rect.width / 2 + "px";
  feedback.style.top = rect.top + rect.height / 2 + scrollY + "px";

  document.body.appendChild(feedback);

  // Animate in
  requestAnimationFrame(() => {
    feedback.style.opacity = "0.9";
    feedback.style.transform = "translate(-50%, -50%) scale(1.2)";
  });

  // Animate out and remove
  setTimeout(() => {
    feedback.style.opacity = "0";
    feedback.style.transform = "translate(-50%, -50%) scale(0.6)";
    setTimeout(() => feedback.remove(), 200);
  }, 300);
}

// =============== LEADERBOARD TAB ===============
// Helper function to safely handle avatar URLs
function getSafeAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== "string" || avatar.trim() === "") {
    return DEFAULT_AVATAR;
  }

  // Allow HTTP URLs
  if (avatar.startsWith("http")) {
    return avatar;
  }

  // Allow data URLs but with comprehensive validation
  if (avatar.startsWith("data:image/")) {
    try {
      // Check for proper data URL format
      const dataUrlPattern =
        /^data:image\/(png|jpg|jpeg|gif|webp|svg\+xml);base64,/i;
      if (!dataUrlPattern.test(avatar)) {
        console.warn("Invalid data URL format for avatar, using default");
        return DEFAULT_AVATAR;
      }

      // Reject excessively large data URLs (> 1MB) to prevent performance issues
      if (avatar.length > 1024 * 1024) {
        console.warn("Avatar data URL too large, using default");
        return DEFAULT_AVATAR;
      }

      // Additional validation: check if base64 part is valid
      const base64Part = avatar.split(",")[1];
      if (!base64Part || base64Part.length === 0) {
        console.warn("Empty base64 data in avatar URL, using default");
        return DEFAULT_AVATAR;
      }

      // Try to validate base64 (basic check for valid characters)
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(base64Part)) {
        console.warn("Invalid base64 data in avatar URL, using default");
        return DEFAULT_AVATAR;
      }

      return avatar;
    } catch (error) {
      console.warn(
        "Error validating avatar data URL:",
        error.message,
        "using default",
      );
      return DEFAULT_AVATAR;
    }
  }

  // If it's not a valid URL format, use default
  return DEFAULT_AVATAR;
}

function renderLeaderboard() {
  // Prefer live rows from Firebase when available; fallback to local bots
  let bots = [];

  try {
    if (Array.isArray(state.leaderboardLive) && state.leaderboardLive.length) {
      // Validate and sanitize all leaderboard data
      bots = state.leaderboardLive
        .slice()
        .map((bot) => {
          if (!bot || typeof bot !== "object") return null;
          return {
            id: bot.id || "unknown",
            name: bot.name || "Player",
            packets: Math.max(0, parseInt(bot.packets) || 0),
            avatar: getSafeAvatarUrl(bot.avatar || ""),
            updatedAt: bot.updatedAt || Date.now(),
          };
        })
        .filter(Boolean); // Remove null entries

      // Ensure current player row is up-to-date locally (handles snapshot lag)
      try {
        const meId =
          typeof Leaderboard !== "undefined" && Leaderboard.getDeviceId
            ? Leaderboard.getDeviceId()
            : state.player.name;
        const idx = bots.findIndex((b) => b && b.id === meId);
        const meRow = {
          id: meId,
          name: state.player.name,
          packets: state.packets,
          avatar: getSafeAvatarUrl(state.player.avatar),
        };
        if (idx >= 0) bots[idx] = Object.assign({}, bots[idx], meRow);
        else bots.push(meRow);
      } catch (error) {
        console.warn("Error updating player row in leaderboard:", error);
        bots.push({
          id:
            typeof Leaderboard !== "undefined" && Leaderboard.getDeviceId
              ? Leaderboard.getDeviceId()
              : state.player.name,
          name: state.player.name,
          packets: state.packets,
          avatar: getSafeAvatarUrl(state.player.avatar),
        });
      }
    } else {
      // No live data yet; show current player only
      bots = [
        {
          id:
            typeof Leaderboard !== "undefined" && Leaderboard.getDeviceId
              ? Leaderboard.getDeviceId()
              : state.player.name,
          name: state.player.name,
          packets: state.packets,
          avatar: getSafeAvatarUrl(state.player.avatar),
        },
      ];
    }
  } catch (error) {
    console.error("Error processing leaderboard data:", error);
    // Fallback to safe default
    bots = [
      {
        id: "fallback",
        name: state.player.name,
        packets: state.packets,
        avatar: getSafeAvatarUrl(state.player.avatar),
      },
    ];
  }
  bots.sort((a, b) => b.packets - a.packets);
  let html = "";

  try {
    html = bots
      .slice(0, 10)
      .map((p, idx) => {
        if (!p || typeof p !== "object") {
          console.warn("Invalid leaderboard entry, skipping:", p);
          return "";
        }

        const safeAvatar = getSafeAvatarUrl(p.avatar);
        const safeName = String(p.name || "Player").slice(0, 24);
        const safePackets = Math.max(0, parseInt(p.packets) || 0);

        return `
    <li style="display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #273742;">
      <span style="width: 2rem; text-align: right; color: var(--secondary-color); font-weight: bold;">${idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : ""}<span class="event-number-glow">${idx + 1}</span>.</span>
      <img src="${safeAvatar}" class="${idx === 0 ? "medal-gold" : idx === 1 ? "medal-silver" : idx === 2 ? "medal-bronze" : ""}" style="width: 2rem; height: 2rem; border-radius: 50%; border: ${idx === 0 || idx === 1 || idx === 2 ? "3px" : "1px"} solid ${idx === 0 ? "#ffd700" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "var(--primary-color)"}; box-shadow: ${idx === 0 ? "0 0 14px rgba(255,215,0,0.6)" : idx === 1 ? "0 0 12px rgba(192,192,192,0.55)" : idx === 2 ? "0 0 12px rgba(205,127,50,0.55)" : "none"};" alt="" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}'; console.warn('Avatar failed to load for ${safeName}, using default');">
      <span style="font-weight: 800; ${p.id === (typeof Leaderboard !== "undefined" && Leaderboard.getDeviceId ? Leaderboard.getDeviceId() : state.player.name) ? "color: var(--bg-secondary); background: linear-gradient(90deg, #c4ebea 33%, #faffc4 100%); border: 1px solid var(--primary-color); padding: 0.15rem 0.5rem; border-radius: 999px; box-shadow: 0 0 14px var(--shadow-primary);" : "color: var(--text-primary);"}">${idx === 0 ? '<span class="crown-badge">👑</span>' : ""}${p.id === (typeof Leaderboard !== "undefined" && Leaderboard.getDeviceId ? Leaderboard.getDeviceId() : state.player.name) && isVIP() ? '<img src="src/assets/vip.png" alt="VIP" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;" aria-hidden="true"/>' : ""}${safeName}</span>
      <span style="margin-left: auto; font-family: monospace; color: var(--text-secondary); font-weight: bold; font-size: 1.05em;"><span class="icon-packet"></span> <span class="event-number-glow">${safePackets.toLocaleString("en-US")}</span></span>
    </li>
  `;
      })
      .filter(Boolean) // Remove empty entries
      .join("");
  } catch (error) {
    console.error("Error rendering leaderboard list:", error);
    html = `<li style="padding: 1rem; text-align: center; color: var(--text-secondary);">Error loading leaderboard data</li>`;
  }
  return `<div class="neon-card" style="padding: 1rem 0.5rem;">
    <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🏆 Leaderboard</h2>
    <style>
      @keyframes medalPulse {
        0% { box-shadow: 0 0 8px rgba(255,215,0,0.35), 0 0 0 0 rgba(255,215,0,0.0); }
        100% { box-shadow: 0 0 14px rgba(255,215,0,0.7), 0 0 12px rgba(255,215,0,0.35); }
      }
      @keyframes medalPulseSilver {
        0% { box-shadow: 0 0 8px rgba(192,192,192,0.3); }
        100% { box-shadow: 0 0 14px rgba(192,192,192,0.65); }
      }
      @keyframes medalPulseBronze {
        0% { box-shadow: 0 0 8px rgba(205,127,50,0.3); }
        100% { box-shadow: 0 0 14px rgba(205,127,50,0.65); }
      }
      .medal-gold { animation: medalPulse 1.8s ease-in-out infinite alternate; }
      .medal-silver { animation: medalPulseSilver 2s ease-in-out infinite alternate; }
      .medal-bronze { animation: medalPulseBronze 2.2s ease-in-out infinite alternate; }
      .crown-badge { margin-right: 0.25rem; filter: drop-shadow(0 0 4px rgba(255,215,0,0.8)); font-size: 1.15em; }
    </style>
    ${(() => {
      const t = bots.slice(0, 3);
      return `
      <div class="podium-wrap" style="display:flex; justify-content:center; gap:1rem; align-items:flex-end; margin: 0.75rem 0 0.75rem 0;">
        <div class="podium-item" style="display:flex; flex-direction:column; align-items:center;">
          <div style="display:flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; border:3px solid #c0c0c0; box-shadow:0 0 12px rgba(192,192,192,0.55); overflow:hidden; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent);">
            <img src="${getSafeAvatarUrl((t[1] && t[1].avatar) || DEFAULT_AVATAR)}" alt="" style="width:100%; height:100%; object-fit:cover;" />
          </div>
          <div style="font-size:0.8rem; font-weight:bold; margin-top:0.25rem; color:#c0c0c0; text-shadow: 0 0 6px rgba(192, 192, 192, 0.8), 0 0 8px rgba(192, 192, 192, 0.5); text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${String((t[1] && t[1].name) || "Player").slice(0, 12)}</div>
          <div style="width:64px; height:36px; background:linear-gradient(180deg, #3b4a5a, #2a3947); border:2px solid #c0c0c0; border-top-left-radius:8px; border-top-right-radius:8px; margin-top:0.25rem; display:flex; align-items:center; justify-content:center; font-weight:800;">2</div>
          <div style="margin-top:0.15rem; font-size:1.1rem;">🥈</div>
        </div>
        <div class="podium-item" style="display:flex; flex-direction:column; align-items:center; transform: translateY(-8px);">
          <div style="display:flex; align-items:center; justify-content:center; width:84px; height:84px; border-radius:50%; border:4px solid #ffd700; box-shadow:0 0 16px rgba(255,215,0,0.75); overflow:hidden; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), transparent);">
            <img src="${getSafeAvatarUrl((t[0] && t[0].avatar) || DEFAULT_AVATAR)}" alt="" style="width:100%; height:100%; object-fit:cover;" />
          </div>
          <div style="font-size:0.9rem; font-weight:bold; margin-top:0.25rem; color:#ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.8), 0 0 12px rgba(255, 215, 0, 0.5); text-align:center; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${String((t[0] && t[0].name) || "Player").slice(0, 12)}</div>
          <div style="width:84px; height:52px; background:linear-gradient(180deg, #435a2a, #344a1f); border:3px solid #ffd700; border-top-left-radius:10px; border-top-right-radius:10px; margin-top:0.25rem; display:flex; align-items:center; justify-content:center; font-weight:900; color:#ffec8a; text-shadow:0 1px 2px rgba(0,0,0,0.4);">1</div>
          <div style="margin-top:0.15rem; font-size:1.1rem;">👑 🥇</div>
        </div>
        <div class="podium-item" style="display:flex; flex-direction:column; align-items:center;">
          <div style="display:flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; border:3px solid #cd7f32; box-shadow:0 0 12px rgba(205,127,50,0.55); overflow:hidden; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent);">
            <img src="${getSafeAvatarUrl((t[2] && t[2].avatar) || DEFAULT_AVATAR)}" alt="" style="width:100%; height:100%; object-fit:cover;" />
          </div>
          <div style="font-size:0.8rem; font-weight:bold; margin-top:0.25rem; color:#cd7f32; text-shadow: 0 0 6px rgba(205, 127, 50, 0.8), 0 0 8px rgba(205, 127, 50, 0.5); text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${String((t[2] && t[2].name) || "Player").slice(0, 12)}</div>
          <div style="width:64px; height:28px; background:linear-gradient(180deg, #4d3925, #3b2a1b); border:2px solid #cd7f32; border-top-left-radius:8px; border-top-right-radius:8px; margin-top:0.25rem; display:flex; align-items:center; justify-content:center; font-weight:800;">3</div>
          <div style="margin-top:0.15rem; font-size:1.1rem;">🥉</div>
        </div>
      </div>
    `;
    })()}
    <ul id="leaderboard" style="list-style: none; margin: 0; padding: 0;">${html}</ul>
    <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center; margin-top: 0.75rem;">Scores update over time. Your score is real!</div>
  </div>`;
}

// =============== PRESTIGE TAB ===============
function renderPrestige() {
  const prestigeRequirement = getPrestigeRequirement();
  let canPrestige = state.packets >= prestigeRequirement;
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
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span>${upgrade.name} (${currentLevel}/${upgrade.maxLevel})</span>
        <span style="display: flex; align-items: center; gap: 0.25rem;">
          ${cost} <img src="src/assets/items/I_Sapphire.png" alt="Data Shards" style="width:1.1rem;height:1.1rem;vertical-align:middle;display:inline-block;"/>
        </span>
      </div>
      <div class="text-xs" style="color: #4a7c59; text-shadow: none; filter: none; margin-top: 0.25rem;">${upgrade.desc}</div>
    </button>`;
  }).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);"><img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:1.2rem;height:1.2rem;vertical-align:middle;display:inline-block;margin-right:0.35rem;"/> Prestige</h2>
      <div class="text-center mb-4" style="display:flex; flex-direction:column; align-items:center; gap:.35rem;">
        <div class="text-lg" style="font-weight:900;">Level <span class="event-number-glow">${state.prestige.level}</span></div>
        <div class="text-sm text-neon-gray">
          <span style="display:inline-flex; align-items:center; gap:.35rem; padding:.2rem .55rem; border:1px solid var(--border-color); border-radius:999px; background:linear-gradient(135deg, rgba(0,0,0,.25), rgba(0,0,0,.05)); box-shadow:0 2px 10px var(--shadow-primary) inset, 0 1px 3px rgba(0,0,0,.35);">
            <span class="event-number-glow">${state.prestige.dataShards}</span> <img src="src/assets/items/I_Sapphire.png" alt="Data Shards" style="width:1.1rem;height:1.1rem;vertical-align:middle;display:inline-block;margin-left:0.25rem;"/>
          </span>
        </div>
      </div>

      <div class="mb-3" style="text-align:center;">
        <div class="text-neon-gray" style="font-size:.9rem; margin-bottom:.25rem;">Progress to next prestige</div>
        <div style="position:relative; height:12px; border-radius:999px; background:#22313f; border:1px solid var(--border-color); overflow:hidden; box-shadow: inset 0 1px 6px rgba(0,0,0,.5);">
          <style>
            @keyframes prestigeReadyPulse {
              0% { box-shadow: 0 0 6px var(--secondary-color); }
              50% { box-shadow: 0 0 14px var(--primary-color); }
              100% { box-shadow: 0 0 6px var(--secondary-color); }
            }
            #prestige-progress-fill.prestige-glow { animation: prestigeReadyPulse 1.6s ease-in-out infinite; }
          </style>
          <div id="prestige-progress-fill" class="${state.packets >= prestigeRequirement ? "prestige-glow" : ""}" style="height:100%; width: ${Math.min(100, (state.packets / prestigeRequirement) * 100).toFixed(1)}%; background: linear-gradient(90deg, var(--secondary-color), var(--primary-color)); box-shadow: 0 0 10px var(--shadow-primary);"></div>
        </div>
        <div id="prestige-progress-label" class="text-neon-gray" style="font-size:.8rem; margin-top:.25rem;"><span class="event-number-glow">${state.packets.toLocaleString("en-US")}</span> / <span class="event-number-glow">${prestigeRequirement.toLocaleString("en-US")}</span></div>
      </div>

      ${
        canPrestige
          ? `<button id="do-prestige" class="neon-btn w-full mb-2" style="white-space: normal; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;">
          <span><img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:1rem;height:1rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;"/> Prestige Now! (+${shardGain} <img src="src/assets/items/I_Sapphire.png" alt="Data Shards" style="width:1.1rem;height:1.1rem;vertical-align:middle;display:inline-block;margin-left:0.25rem;"/>)</span>
          <span style="color: #4a7c59; font-size: 0.8rem; opacity: 1; line-height: 1.2; text-shadow: none; filter: none;">Reset progress for permanent bonuses</span>
        </button>`
          : `<div class="text-center text-neon-gray mb-4" style="font-size:.9rem;">
          Need <span class="event-number-glow">${prestigeRequirement.toLocaleString("en-US")}</span> packets to prestige<br>
          Current: <span class="event-number-glow">${state.packets.toLocaleString("en-US")}</span>
        </div>`
      }

      <div class="mb-2" style="text-align:center;"><span class="text-neon-yellow font-bold">Prestige Upgrades</span></div>
      <div class="prestige-upgrades" style="display:grid; grid-template-columns: 1fr; gap:.5rem;">
        ${upgrades}
      </div>
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

    return `<div class="reward-row" style="display:flex; align-items:center; justify-content:space-between; padding: 0.5rem 0.75rem; border: 1px solid ${claimed ? "#3ba86b" : current ? "#d5b85a" : "#2e3a47"}; border-radius: 10px; background: linear-gradient(100deg, ${claimed ? "rgba(20,60,40,.5)" : current ? "rgba(60,50,20,.5)" : "rgba(28,36,46,.6)"} , rgba(0,0,0,0.15)); box-shadow: 0 1px 10px rgba(0,0,0,0.25) inset;">
      <div style="display:flex; flex-direction:column; align-items:flex-start; gap:0.1rem;">
        <span style="font-weight:700; color:${claimed ? "#8ef1b2" : current ? "#ffe08a" : "var(--text-secondary)"};">Day <span class="event-number-glow">${reward.day}</span></span>
        ${reward.bonus ? `<span style="font-size:0.65rem; color:${claimed ? "#a8e6b8" : current ? "#f4e29f" : "#8e9aaf"}; font-style:italic;">${reward.bonus}</span>` : ""}
      </div>
      <span style="display:inline-flex; align-items:center; gap:.4rem; color:var(--text-primary);">
        <span style="display:inline-flex; align-items:center; gap:.25rem; padding:.1rem .4rem; border:1px solid var(--border-color); border-radius:999px; background: rgba(0,0,0,0.25);">
          ${reward.gems.toLocaleString("en-US")}
          <img src="src/assets/gem.png" alt="Gems" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;" aria-hidden="true" />
        </span>
        <span style="display:inline-flex; align-items:center; gap:.25rem; padding:.1rem .4rem; border:1px solid var(--border-color); border-radius:999px; background: rgba(0,0,0,0.25);">
          ${reward.packets.toLocaleString("en-US")}
          <span class="icon-packet"></span>
        </span>
      </span>
      <span>${claimed ? "✅" : current ? "🎁" : "⏳"}</span>
    </div>`;
  }).join("");

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">${window.Packet && Packet.i18n ? Packet.i18n.t("daily.title").replace(/^📅\s*/, "") : "Daily Rewards"}</h2>
      <div class="text-center mb-4">
        <div class="text-lg">Streak: <span class="event-number-glow">${streak}</span> days</div>
        ${
          canClaim
            ? `<button id="claim-daily" class="neon-btn mt-2">
            ${window.Packet && Packet.i18n ? Packet.i18n.t("buttons.claimDaily", { n: streak + 1 }) : "Claim Day " + (streak + 1) + " Reward!"}
            <div class="text-xs"><span class="event-number-glow">${nextReward.gems}</span><img src="src/assets/gem.png" alt="Gems" style="height:0.9rem;width:0.9rem;vertical-align:middle;display:inline-block;margin-left:0.25rem;" aria-hidden="true"/> + <span class="event-number-glow">${nextReward.packets}</span><span class="icon-packet"></span></div>
            ${nextReward.bonus ? `<div class="text-xs" style="color:#f4e29f; font-style:italic; margin-top:0.25rem;">${nextReward.bonus}</div>` : ""}
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
  const isCustomAvatar =
    typeof state.player.avatar === "string" &&
    (state.player.avatar.startsWith("data:") ||
      !state.player.avatar.includes("dicebear.com"));
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
                class="w-full p-2 bg-gray-700 rounded border border-neon-cyan focus:outline-none focus:border-yellow-400" readonly onfocus="this.removeAttribute('readonly')">
       </label>
       <div class="mb-4">
         <span class="block mb-2 font-semibold">Avatar:</span>
         <div class="avatar-choice-row">${avatarList}
           <div id="custom-avatar-tile" class="avatar-choice${isCustomAvatar ? " selected" : ""}" data-seed="__custom__" style="${isCustomAvatar ? "" : "display:none;"}">
             <img id="custom-avatar-img" src="${isCustomAvatar ? state.player.avatar : ""}" alt="Custom" />
             <div class="avatar-name">Custom</div>
           </div>
         </div>
         <div class="flex gap-2 justify-center mt-2">
           <input type="file" id="avatar-upload" accept="image/*" style="display:none">
           <button type="button" id="avatar-upload-btn" class="neon-btn">Upload Picture</button>
         </div>
       </div>

       <button type="submit" class="neon-btn w-full">Save</button>
     </form>
  `,
  );

  let uploadedAvatarDataUrl = null;

  document.querySelectorAll(".avatar-choice").forEach((el) => {
    el.onclick = () => {
      document
        .querySelectorAll(".avatar-choice")
        .forEach((e) => e.classList.remove("selected"));
      el.classList.add("selected");
    };
  });
  const uploadBtn = document.getElementById("avatar-upload-btn");
  const fileInput = document.getElementById("avatar-upload");
  const customTile = document.getElementById("custom-avatar-tile");
  const customImg = document.getElementById("custom-avatar-img");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = function () {
      fileInput.click();
    };
    fileInput.onchange = function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        uploadedAvatarDataUrl = String(ev.target && ev.target.result) || null;
        // Enforce 5MB max for uploaded avatars (prevent huge data URLs)
        try {
          var __data = uploadedAvatarDataUrl || "";
          var __idx = __data.indexOf(",") + 1;
          var __b64len = __idx > 0 ? __data.length - __idx : 0;
          var __bytes = Math.ceil((__b64len * 3) / 4);
          if (__bytes > 5242880) {
            uploadedAvatarDataUrl = null;
            try {
              showHudNotify("Image too large (max 5MB)", "⚠️");
            } catch (_) {}
          }
        } catch (_) {}
        if (uploadedAvatarDataUrl && customTile && customImg) {
          customImg.src = uploadedAvatarDataUrl;
          customTile.style.display = "";
          document
            .querySelectorAll(".avatar-choice")
            .forEach((e) => e.classList.remove("selected"));
          customTile.classList.add("selected");
        }
      };
      reader.readAsDataURL(file);
    };
  }
  document.getElementById("profile-form").onsubmit = function (e) {
    e.preventDefault();
    let newName = document.getElementById("profile-name").value.trim();
    let selectedEl = document.querySelector(".avatar-choice.selected");
    let selected = selectedEl ? selectedEl.getAttribute("data-seed") : null;
    if (newName) state.player.name = newName.slice(0, 14);

    // Only change avatar if user explicitly selected a different one
    if (uploadedAvatarDataUrl) {
      // User uploaded a new custom avatar
      state.player.avatar = uploadedAvatarDataUrl;
    } else if (selected === "__custom__") {
      // User selected existing custom avatar
      state.player.avatar = customImg
        ? getSafeAvatarUrl(customImg.src)
        : state.player.avatar;
    } else if (selected && selected !== "__custom__") {
      // User selected a different pre-made avatar
      state.player.avatar = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(selected)}`;
    }
    // If no selection made, keep current avatar unchanged

    save();
    // Push profile changes (including avatar) to leaderboard immediately
    try {
      if (typeof Leaderboard !== "undefined" && Leaderboard.submit) {
        // Ensure avatar is valid before submitting
        const avatarToSubmit = getSafeAvatarUrl(state.player.avatar);

        Leaderboard.submit(
          {
            name: state.player.name,
            avatar: avatarToSubmit,
            packets: state.packets,
          },
          { throttleMs: 0 },
        );
      }
    } catch (_) {}
    try {
      window.VERSION = "0.0.27";
    } catch (_) {}

    updateTopBar();
    closeModal();
    showHudNotify("Profile updated!", "👤");
    try {
      renderTab();
    } catch (_) {}
  };
}

// =============== GRAPHICS SETTINGS ===============
function applyGraphicsSettings(quality) {
  const body = document.body;

  // Remove existing graphics classes
  body.classList.remove("graphics-high", "graphics-medium", "graphics-low");

  // Apply new graphics class
  body.classList.add(`graphics-${quality}`);

  // Store in global for effects to reference
  window.graphicsQuality = quality;
}

// =============== SETTINGS ===============
function showSettings() {
  showModal(
    "Settings",
    `
      <div class="space-y-3">
        <div class="neon-card" style="padding: 0.75rem;">
          <label class="flex items-center gap-2">
            <input type="checkbox" id="setting-sound" ${state.player.sound ? "checked" : ""}/>
            <span>Game Sound Effects</span>
          </label>
        </div>

        <div class="neon-card" style="padding: 0.75rem;">
          <label class="block mb-1 font-semibold" data-i18n="settings.graphics">Graphics Quality</label>
          <select id="graphics-select" class="w-full p-2 bg-gray-700 rounded border border-neon-cyan mb-2">
            <option value="high" ${state.player.graphics === "high" ? "selected" : ""} data-i18n="settings.graphicsHigh">High (Default)</option>
            <option value="medium" ${state.player.graphics === "medium" ? "selected" : ""} data-i18n="settings.graphicsMedium">Medium (Reduced Effects)</option>
            <option value="low" ${state.player.graphics === "low" ? "selected" : ""} data-i18n="settings.graphicsLow">Low (Minimal Effects)</option>
          </select>
          <div class="text-xs text-neon-gray" data-i18n="settings.graphicsNote">
            Lower settings improve performance on older devices
          </div>
        </div>

        <div class="neon-card" style="padding: 0.75rem;">
          <label class="block mb-1 font-semibold">Language</label>
          <select id="lang-select" class="w-full p-2 bg-gray-700 rounded border border-neon-cyan">
            <option value="en">English</option>
            <option value="pt-br">Português (Brasil)</option>
            <option value="ru">Русский</option>
          </select>
        </div>

        <div class="flex flex-col gap-2">
          <button id="settings-save-btn" class="neon-btn w-full">Save Settings</button>
          <button id="edit-profile-inside" class="neon-btn w-full">Edit Profile</button>
          <div style="text-align: center; margin-top: 1rem;">
            <button id="admin-secret-btn" style="background: none; border: none; color: #666; font-size: 12px; opacity: 0.5; cursor: pointer; padding: 4px 8px; border-radius: 3px;">⚙</button>
          </div>
        </div>

        <div class="text-xs text-neon-gray mt-1 text-center">
          All progress is saved locally.<br>For mobile, use Store in-app for real gems/ads!
        </div>
      </div>
    `,
  );

  // Initialize language select to current language (no immediate apply)
  try {
    const sel = document.getElementById("lang-select");
    if (
      sel &&
      window.Packet &&
      Packet.i18n &&
      typeof Packet.i18n.getLanguage === "function"
    ) {
      sel.value = Packet.i18n.getLanguage() || "en";
    }
  } catch (_) {}

  // Apply all settings on Save
  const saveBtn = document.getElementById("settings-save-btn");
  if (saveBtn) {
    saveBtn.onclick = function () {
      try {
        // Sound toggle
        const soundEl = document.getElementById("setting-sound");
        state.player.sound = !!(soundEl && soundEl.checked);

        // Graphics quality
        const graphicsEl = document.getElementById("graphics-select");
        if (graphicsEl) {
          state.player.graphics = graphicsEl.value;
          // Apply graphics settings immediately
          applyGraphicsSettings(state.player.graphics);
        }

        // Language
        const langEl = document.getElementById("lang-select");
        if (
          langEl &&
          window.Packet &&
          Packet.i18n &&
          typeof Packet.i18n.setLanguage === "function"
        ) {
          Packet.i18n.setLanguage(langEl.value);
          if (typeof Packet.i18n.applyLanguageToData === "function") {
            Packet.i18n.applyLanguageToData();
          }
        }

        // Persist and refresh UI
        save();
        try {
          window.VERSION = "0.0.27";
        } catch (_) {}
        // Force-apply language to DOM immediately (best effort)
        try {
          if (
            window.Packet &&
            Packet.i18n &&
            typeof Packet.i18n.translateDom === "function"
          ) {
            Packet.i18n.translateDom(document.body);
          }
        } catch (_) {}
        updateTopBar();
        renderTab();
        showHudNotify("Settings saved!", "⚙️");
      } catch (_) {}
    };
  }

  // Edit Profile button
  document.getElementById("edit-profile-inside").onclick = function () {
    closeModal();
    setTimeout(() => window.showEditProfile(), 180);
  };

  // Admin secret button
  document.getElementById("admin-secret-btn").onclick = function () {
    const pin = prompt("Enter admin PIN:");
    if (pin === "ADM93") {
      closeModal();
      setTimeout(() => showAdminPanel(), 180);
    } else if (pin !== null) {
      alert("Invalid PIN");
    }
  };
}

// =============== ADMIN PANEL ===============
function showAdminPanel() {
  // Initialize Equipment system if needed
  if (typeof Equipment !== "undefined" && Equipment.ensureStateShape) {
    Equipment.ensureStateShape(state);
  }

  console.log("[ADMIN] Opening admin panel. Equipment available:", {
    Equipment: !!Equipment,
    rollDrop: Equipment ? typeof Equipment.rollDrop : "N/A",
    awardDrop: Equipment ? typeof Equipment.awardDrop : "N/A",
    ITEM_POOL:
      Equipment && Equipment.ITEM_POOL ? Equipment.ITEM_POOL.length : 0,
  });

  showModal(
    "🛡️ Admin Control Panel",
    `
      <div class="admin-panel" style="max-height: 70vh; overflow-y: auto;">
        <div class="admin-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <button class="admin-tab-btn active" data-tab="items" style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Items</button>
          <button class="admin-tab-btn" data-tab="player" style="padding: 0.5rem 1rem; background: #4a5568; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Player</button>
          <button class="admin-tab-btn" data-tab="boosts" style="padding: 0.5rem 1rem; background: #4a5568; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Boosts</button>
          <button class="admin-tab-btn" data-tab="logs" style="padding: 0.5rem 1rem; background: #4a5568; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Logs</button>
          <button class="admin-tab-btn" data-tab="achievements" style="padding: 0.5rem 1rem; background: #4a5568; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Achievements</button>
        </div>

        <div id="admin-content">
          ${renderAdminItemsTab()}
        </div>

        <div style="margin-top: 1rem; text-align: center;">
          <button id="admin-close-btn" class="neon-btn" style="background: #e53e3e;">Close Admin Panel</button>
        </div>
      </div>
    `,
  );

  // Bind admin panel events
  bindAdminPanelEvents();
}

function renderAdminItemsTab() {
  return `
    <div class="admin-tab-content" data-tab="items">
      <div class="space-y-3">
        <div class="neon-card" style="padding: 1rem;">
          <h3 style="color: var(--primary-color); margin-bottom: 0.5rem;">💎 Gem Management</h3>
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
            <input type="number" id="admin-gem-amount" placeholder="Amount" style="padding: 0.5rem; background: #2d3748; border: 1px solid #4a5568; border-radius: 0.25rem; color: white; width: 120px;">
            <button id="admin-add-gems" class="neon-btn" style="font-size: 0.8rem;">Add Gems</button>
            <button id="admin-set-gems" class="neon-btn" style="font-size: 0.8rem;">Set Gems</button>
          </div>
          <div style="font-size: 0.9rem; color: #a0aec0;">Current Gems: <span id="admin-current-gems">${state.gems}</span></div>
        </div>

        <div class="neon-card" style="padding: 1rem;">
          <h3 style="color: var(--primary-color); margin-bottom: 0.5rem;">⚔️ Spawn Equipment</h3>
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
            <select id="admin-rarity-select" style="padding: 0.5rem; background: #2d3748; border: 1px solid #4a5568; border-radius: 0.25rem; color: white;">
              <option value="green">Common</option>
              <option value="gold">Rare</option>
              <option value="blue">Epic</option>
              <option value="pink">Ultra</option>
              <option value="animal">Animal</option>
              <option value="celestial">Celestial</option>
            </select>
            <input type="number" id="admin-item-count" placeholder="Count" value="1" min="1" max="50" style="padding: 0.5rem; background: #2d3748; border: 1px solid #4a5568; border-radius: 0.25rem; color: white; width: 80px;">
            <button id="admin-spawn-random" class="neon-btn" style="font-size: 0.8rem;">Spawn Random Items</button>
          </div>

          <div style="margin-bottom: 0.5rem;">
            <select id="admin-specific-item" style="padding: 0.5rem; background: #2d3748; border: 1px solid #4a5568; border-radius: 0.25rem; color: white; width: 100%; margin-bottom: 0.5rem;">
              <option value="">Select Specific Item</option>
            </select>
            <button id="admin-spawn-specific" class="neon-btn" style="font-size: 0.8rem; width: 100%;">Spawn Selected Item</button>
          </div>
        </div>

        <div class="neon-card" style="padding: 1rem;">
          <h3 style="color: var(--primary-color); margin-bottom: 0.5rem;">🎒 Inventory Management</h3>
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
            <button id="admin-clear-inventory" class="neon-btn" style="background: #e53e3e; font-size: 0.8rem;">Clear Inventory</button>
            <button id="admin-auto-equip-best" class="neon-btn" style="font-size: 0.8rem;">Auto-Equip Best</button>
          </div>
          <div style="font-size: 0.9rem; color: #a0aec0;">Inventory Items: <span id="admin-inventory-count">${state.inventory.length}</span></div>
        </div>
      </div>
    </div>
  `;
}

function bindAdminPanelEvents() {
  // Tab switching
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update tab buttons
      document.querySelectorAll(".admin-tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.style.background = "#4a5568";
      });
      btn.classList.add("active");
      btn.style.background = "var(--primary-color)";

      // Switch tab content
      const tabName = btn.dataset.tab;
      let content = "";
      switch (tabName) {
        case "items":
          content = renderAdminItemsTab();
          break;
        default:
          content = "<div>Coming soon...</div>";
          break;
      }
      document.getElementById("admin-content").innerHTML = content;

      // Re-bind events for new content
      bindAdminTabEvents(tabName);
    });
  });

  // Initial tab events
  bindAdminTabEvents("items");

  // Close button
  document.getElementById("admin-close-btn").onclick = () => {
    closeModal();
  };
}

function bindAdminTabEvents(tabName) {
  if (tabName === "items") {
    // Gem management
    document.getElementById("admin-add-gems").onclick = () => {
      const amount =
        parseInt(document.getElementById("admin-gem-amount").value) || 0;
      if (amount > 0) {
        state.gems += amount;
        document.getElementById("admin-current-gems").textContent = state.gems;
        logAdminAction(`Added ${amount} gems`);
        save();
        updateTopBar();
      }
    };

    document.getElementById("admin-set-gems").onclick = () => {
      const amount =
        parseInt(document.getElementById("admin-gem-amount").value) || 0;
      state.gems = Math.max(0, amount);
      document.getElementById("admin-current-gems").textContent = state.gems;
      logAdminAction(`Set gems to ${state.gems}`);
      save();
      updateTopBar();
    };

    // Equipment spawning
    populateItemSelect();

    document.getElementById("admin-spawn-random").onclick = () => {
      const rarityId = document.getElementById("admin-rarity-select").value;
      const count =
        parseInt(document.getElementById("admin-item-count").value) || 1;

      console.log("[ADMIN] Attempting to spawn items:", {
        rarityId,
        count,
        Equipment: !!Equipment,
        inventoryBefore: state.inventory ? state.inventory.length : 0,
      });

      // Ensure inventory exists
      if (!Array.isArray(state.inventory)) {
        state.inventory = [];
      }

      if (
        typeof Equipment !== "undefined" &&
        Equipment &&
        typeof Equipment.rollDrop === "function" &&
        typeof Equipment.awardDrop === "function"
      ) {
        let successCount = 0;
        for (let i = 0; i < count; i++) {
          try {
            const item = Equipment.rollDrop(state);
            console.log("[ADMIN] Rolled item:", item);

            if (item) {
              // Override rarity to match selection
              item.rarity = rarityId;
              const rarityObj = Equipment.RARITIES
                ? Equipment.RARITIES.find((r) => r.id === rarityId)
                : null;
              if (rarityObj) {
                item.rarityName = rarityObj.name;
                item.color = rarityObj.color;
              }

              const success = Equipment.awardDrop(state, item, {
                save: () => save(),
                notify: showHudNotify,
              });
              console.log(
                "[ADMIN] Award result:",
                success,
                "Inventory after:",
                state.inventory.length,
              );
              if (success) successCount++;
            }
          } catch (e) {
            console.error("Failed to spawn item:", e);
            alert(`Error spawning item: ${e.message}`);
          }
        }

        document.getElementById("admin-inventory-count").textContent =
          state.inventory.length;
        logAdminAction(`Spawned ${successCount}/${count} ${rarityId} items`);
        save();

        // Force refresh the equipment tab if visible
        const activeTab = document.querySelector(".tab-btn.active");
        if (activeTab && activeTab.dataset.tab === "equipment") {
          renderTab();
        }

        showHudNotify(`Spawned ${successCount} items!`, "⚔️");
      } else {
        alert("Equipment system not available!");
        console.error("Equipment functions missing:", {
          Equipment: !!Equipment,
          rollDrop:
            typeof Equipment !== "undefined" && Equipment
              ? typeof Equipment.rollDrop
              : "N/A",
          awardDrop:
            typeof Equipment !== "undefined" && Equipment
              ? typeof Equipment.awardDrop
              : "N/A",
        });
      }
    };

    document.getElementById("admin-spawn-specific").onclick = () => {
      const itemId = document.getElementById("admin-specific-item").value;
      const rarityId = document.getElementById("admin-rarity-select").value;

      console.log("[ADMIN] Attempting to spawn specific item:", {
        itemId,
        rarityId,
      });

      if (!itemId) {
        alert("Please select a specific item first!");
        return;
      }

      if (
        Equipment &&
        typeof Equipment.rollDrop === "function" &&
        typeof Equipment.awardDrop === "function"
      ) {
        try {
          const baseItem = Equipment.ITEM_POOL?.find(
            (item) => item.id === itemId,
          );
          console.log("[ADMIN] Found base item:", baseItem);
          if (baseItem) {
            const item = Equipment.rollDrop(state, {
              rarity: { id: rarityId },
              slot: baseItem.slot,
            });
            console.log("[ADMIN] Rolled specific item:", item);
            if (item) {
              item.name = baseItem.name;
              item.icon = baseItem.icon;
              const success = Equipment.awardDrop(state, item, {
                save,
                notify: showHudNotify,
              });
              console.log("[ADMIN] Award specific result:", success);
              if (success) {
                document.getElementById("admin-inventory-count").textContent =
                  state.inventory.length;
                logAdminAction(`Spawned ${rarityId} ${baseItem.name}`);
                save();
                // Force refresh the equipment tab if visible
                if (document.querySelector('[data-tab="equipment"].active')) {
                  renderTab();
                }
                alert(`Successfully spawned ${baseItem.name}!`);
              } else {
                alert("Failed to add item to inventory - might be full!");
              }
            } else {
              alert("Failed to create item!");
            }
          } else {
            alert("Base item not found!");
          }
        } catch (e) {
          console.error("Failed to spawn specific item:", e);
          alert(`Error: ${e.message}`);
        }
      } else {
        alert("Equipment system not available!");
      }
    };

    // Inventory management
    document.getElementById("admin-clear-inventory").onclick = () => {
      if (confirm("Clear entire inventory? This cannot be undone.")) {
        const count = state.inventory.length;
        state.inventory = [];
        document.getElementById("admin-inventory-count").textContent = 0;
        logAdminAction(`Cleared inventory (${count} items removed)`);
        save();
        if (Equipment && typeof Equipment.renderTab === "function") {
          Equipment.renderTab(state);
        }
      }
    };

    document.getElementById("admin-auto-equip-best").onclick = () => {
      if (Equipment && typeof Equipment.smartEquip === "function") {
        let equipped = 0;
        state.inventory.forEach((item) => {
          if (Equipment.smartEquip(item.uuid)) {
            equipped++;
          }
        });
        logAdminAction(`Auto-equipped ${equipped} items`);
        save();
        if (typeof Equipment.renderTab === "function") {
          Equipment.renderTab(state);
        }
      }
    };
  }
}

function populateItemSelect() {
  const select = document.getElementById("admin-specific-item");
  console.log("[ADMIN] Populating item select:", {
    select: !!select,
    Equipment: !!Equipment,
    ITEM_POOL: Equipment ? !!Equipment.ITEM_POOL : "N/A",
    itemCount:
      Equipment && Equipment.ITEM_POOL ? Equipment.ITEM_POOL.length : 0,
  });

  if (select) {
    select.innerHTML = '<option value="">Select Specific Item</option>';

    if (Equipment && Equipment.ITEM_POOL) {
      Equipment.ITEM_POOL.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = `${item.name} (${item.slot})`;
        select.appendChild(option);
      });
      console.log("[ADMIN] Populated", Equipment.ITEM_POOL.length, "items");
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Equipment system not available";
      option.disabled = true;
      select.appendChild(option);
      console.warn("[ADMIN] Equipment system or ITEM_POOL not available");
    }
  } else {
    console.error("[ADMIN] Could not find admin-specific-item select element");
  }
}

// Admin logging system
let adminLogs = [];

function logAdminAction(action) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${action}`;
  adminLogs.push(logEntry);

  // Keep only last 100 logs
  if (adminLogs.length > 100) {
    adminLogs = adminLogs.slice(-100);
  }

  console.log("[ADMIN]", action);
}

function getAdminLogs() {
  return adminLogs.length > 0 ? adminLogs : ["No admin actions logged yet."];
}

function clearAdminLogs() {
  adminLogs = [];
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
        showModal(
          event.name,
          window.Packet && Packet.i18n
            ? Packet.i18n.t("events.bonusPackets.desc", { n: bonus })
            : `You gained ${bonus.toLocaleString("en-US")} packets!`,
        );
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
    ${event.type === "packetRain" ? '<span class="icon-packet"></span>' : "🎪"} ${event.name} - <span style="color:#ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.4);">${remaining}s</span> remaining
  </div>`;
}

// =============== MOBILE UTILITIES SYSTEM ===============
const MobileUtils = {
  // Detect mobile device
  isMobile: () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      window.innerWidth <= 768 ||
      "ontouchstart" in window
    );
  },

  // Detect touch device
  isTouch: () => {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  // Get safe area insets
  getSafeAreaInsets: () => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue("--mobile-safe-area-top")) || 0,
      bottom:
        parseInt(style.getPropertyValue("--mobile-safe-area-bottom")) || 0,
      left: parseInt(style.getPropertyValue("--mobile-safe-area-left")) || 0,
      right: parseInt(style.getPropertyValue("--mobile-safe-area-right")) || 0,
    };
  },

  // Add touch optimization to element
  addTouchOptimization: (element) => {
    if (!element) return;
    element.style.touchAction = "manipulation";
    element.style.webkitTouchCallout = "none";
    element.style.webkitTapHighlightColor = "transparent";
    element.style.webkitUserSelect = "none";
    element.style.userSelect = "none";
  },

  // Enable GPU acceleration
  enableGPUAcceleration: (element) => {
    if (!element) return;
    element.style.transform = "translateZ(0)";
    element.style.willChange = "transform";
    element.style.backfaceVisibility = "hidden";
  },

  // Optimize for mobile performance
  optimizeForMobile: () => {
    if (!MobileUtils.isMobile()) return;

    // Add mobile class to body
    document.body.classList.add("mobile-device");

    // Set CSS variables for mobile
    document.documentElement.style.setProperty("--is-mobile", "1");

    // Reduce animations on low-end devices
    if (navigator.hardwareConcurrency <= 2) {
      document.body.classList.add("low-performance");
    }

    // Add viewport height CSS variable
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
  },

  // Throttle function for performance
  throttle: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Debounce function for performance
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Add vibration feedback (mobile only)
  vibrate: (pattern = [50]) => {
    if (navigator.vibrate && MobileUtils.isMobile()) {
      navigator.vibrate(pattern);
    }
  },

  // Initialize mobile optimizations
  init: () => {
    MobileUtils.optimizeForMobile();

    // Add global mobile styles
    const style = document.createElement("style");
    style.textContent = `
      .mobile-device .tab-btn {
        min-width: max(48px, 12vw);
        min-height: max(48px, 12vw);
      }

      .mobile-device .neon-btn,
      .mobile-device .upgrade-btn,
      .mobile-device .gem-btn {
        min-height: max(48px, 12vw);
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }

      .low-performance * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }

      @media (max-width: 480px) {
        .mobile-device #click-btn {
          min-width: 80vw;
          min-height: max(80px, 12vh);
        }
      }
    `;
    document.head.appendChild(style);
  },
};

// =============== MAIN GAME STATE ===============

function clickPacket(event) {
  // Add click throttling to prevent performance issues
  const clickTime = Date.now();
  if (clickPacket._lastClick && clickTime - clickPacket._lastClick < 50) {
    return; // Throttle to max 20 clicks per second
  }
  clickPacket._lastClick = clickTime;

  const packetsBefore = state.packets;
  let bonus = isVIP() ? 1.25 : 1;

  // Apply prestige bonus
  if (state.prestige.level > 0) {
    bonus *= 1 + state.prestige.level * 0.1;
  }

  // Apply active boosts
  if (state.boosts.doublePackets > Date.now()) {
    bonus *= 3;
  }
  if (state.boosts.quadrupleClick > Date.now()) {
    bonus *= 8;
  }
  if (state.boosts.ultraCombo > Date.now()) {
    bonus *= 10;
  }

  let critChance = state.critChance;
  // Include equipment crit chance bonus
  try {
    if (
      typeof Equipment !== "undefined" &&
      typeof Equipment.computeBonuses === "function"
    ) {
      const _eqCrit = Equipment.computeBonuses(state).critChance || 0;
      critChance = Math.min(100, critChance + _eqCrit);
    }
  } catch (_) {}
  if (state.boosts.megaCrit > Date.now()) {
    critChance = 75; // 75% crit chance during boost
  }

  // Check for critFrenzy event (forces all clicks to be critical)
  let crit =
    (state.randomEvent.active && state.randomEvent.type === "critFrenzy") ||
    Math.random() < critChance / 100;

  // Mega crits upgrade
  let critMultiplier = state.critMult;
  if (state.prestige.megaCrits > 0) {
    critMultiplier = 2 + state.prestige.megaCrits * 0.2; // Up to 3x
  }

  const eventClickMult =
    state.randomEvent.active && state.randomEvent.type === "packetRain"
      ? Number(state.randomEvent.multiplier) || 1
      : 1;
  const _eqBonus =
    typeof Equipment !== "undefined" &&
    typeof Equipment.computeBonuses === "function"
      ? Equipment.computeBonuses(state)
      : null;
  const _basePerClick =
    state.perClick +
    (_eqBonus && typeof _eqBonus.perClick === "number" ? _eqBonus.perClick : 0);
  let amount = Math.floor(
    _basePerClick * (crit ? critMultiplier : 1) * bonus * eventClickMult,
  );

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
    gemMultiplier = 5;
  }
  if (state.boosts.ultraCombo > Date.now()) {
    gemMultiplier *= 10;
  }
  if (state.randomEvent.active && state.randomEvent.type === "gemRush") {
    const evMult = Number(state.randomEvent.multiplier) || 10;
    gemMultiplier *= evMult;
  }

  if (state.prestige.gemFind > 0) {
    let gemChance = state.prestige.gemFind * 5 * gemMultiplier; // 5% per level
    if (Math.random() * 100 < gemChance) {
      let gemsFound = Math.floor(Math.random() * 3) + 1; // 1-3 gems
      state.gems += gemsFound;
      showHudNotify(`+${gemsFound} 💎 (Found!)`, "✨");
    }
  }

  // Combo logic
  const now = Date.now();
  if (now - lastClickTime < COMBO_TIMEOUT) {
    clickCombo++;
  } else {
    clickCombo = 1;
  }
  lastClickTime = now;
  // Track combo expiry to sync HUD and avatar ring
  _comboExpireAt = now + COMBO_TIMEOUT + 200;
  setCursorForCombo(clickCombo);

  // Show mobile cursor feedback if combo is active (2 or more clicks)
  if (clickCombo >= 2) {
    showMobileCursorFeedback();
  }

  // Modularized combo effect logic - increase throttling for better performance
  const graphicsQuality = window.graphicsQuality || "high";
  const fxThrottle =
    graphicsQuality === "high" ? 120 : graphicsQuality === "medium" ? 100 : 80;

  if (
    !clickPacket._lastFxTime ||
    Date.now() - clickPacket._lastFxTime > fxThrottle
  ) {
    clickPacket._lastFxTime = Date.now();

    // Use modular effect handler
    const { effectText, displayedGain, effectClass } = handleComboEffect(
      clickCombo,
      amount,
      state,
    );

    // Update stacked combo HUD
    if (clickCombo === 1) {
      clickPacket._comboTotal = 0;
    }
    clickPacket._comboTotal = (clickPacket._comboTotal || 0) + displayedGain;

    // Show combo total HUD (modular)
    let color = null;
    if (clickCombo >= 120) color = "#ff3040";
    else if (clickCombo >= 50) color = "#ff4dff";
    else if (clickCombo >= 15) color = "var(--accent-color)";
    else if (clickCombo >= 5) color = "var(--secondary-color)";
    showComboTotalHUD(clickPacket._comboTotal, color);

    // Hide combo HUD after timeout
    if (clickPacket._comboHideTimer) clearTimeout(clickPacket._comboHideTimer);
    clickPacket._comboHideTimer = setTimeout(() => {
      hideComboTotalHUD(0);
      clickPacket._comboTotal = 0;
      _comboExpireAt = 0;
      const el = document.getElementById("avatar");
      if (el) {
        if (typeof el._baseShadow !== "undefined") {
          el.style.boxShadow = el._baseShadow;
          delete el._baseShadow;
        } else {
          el.style.boxShadow = "";
        }
      }
      // Remove mobile cursor feedback when combo ends
      const feedback = document.getElementById("mobile-cursor-feedback");
      if (feedback) feedback.remove();
    }, COMBO_TIMEOUT + 200);

    // Show floating effect
    let clickFX = document.createElement("div");
    clickFX.className = "click-effect" + (effectClass ? " " + effectClass : "");
    clickFX.innerHTML = effectText;
    clickFX.style.visibility = "hidden";
    clickFX.style.left = "-9999px";
    clickFX.style.top = "0px";
    document.body.appendChild(clickFX);

    // Position above the click button with horizontal clamping
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const margin = 8;
    const fxWidth = clickFX.offsetWidth || 0;

    const clickBtn = document.getElementById("click-btn");
    if (clickBtn) {
      const rect = clickBtn.getBoundingClientRect();
      const scrollY =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      const centerX = rect.left + rect.width / 2;
      const halfW = fxWidth / 2;
      const clampedCenter = Math.min(
        vw - margin - halfW,
        Math.max(margin + halfW, centerX),
      );
      clickFX.style.left = clampedCenter + "px";
      clickFX.style.top = rect.top + scrollY - 20 + "px";
      clickFX.style.visibility = "";

      // Critical hit effect indicator
      if (crit) {
        const critFX = document.createElement("div");
        critFX.className = "click-effect critical";
        critFX.textContent = `CRITICAL ${(
          (state.packets - packetsBefore) /
          Math.max(1, state.perClick)
        )
          .toFixed(2)
          .replace(/\.00$/, "")}x! +${(
          state.packets - packetsBefore
        ).toLocaleString("en-US")}`;
        critFX.style.left = clampedCenter + "px";
        critFX.style.top = rect.top + scrollY - 50 + "px";
        document.body.appendChild(critFX);
        setTimeout(() => {
          if (critFX && critFX.parentNode)
            critFX.parentNode.removeChild(critFX);
        }, 900);
        critFX.addEventListener("animationend", () => {
          if (critFX && critFX.parentNode)
            critFX.parentNode.removeChild(critFX);
        });
      }
    } else {
      const centerX = vw / 2;
      const halfW = fxWidth / 2;
      const clampedCenter = Math.min(
        vw - margin - halfW,
        Math.max(margin + halfW, centerX),
      );
      clickFX.style.left = clampedCenter + "px";
      clickFX.style.top = "50%";
      clickFX.style.visibility = "";
      if (crit) {
        const critFX = document.createElement("div");
        critFX.className = "click-effect critical";
        critFX.textContent = `CRITICAL ${(
          (state.packets - packetsBefore) /
          Math.max(1, state.perClick)
        )
          .toFixed(2)
          .replace(/\.00$/, "")}x! +${(
          state.packets - packetsBefore
        ).toLocaleString("en-US")}`;
        critFX.style.left = clampedCenter + "px";
        critFX.style.top = "45%";
        document.body.appendChild(critFX);
        setTimeout(() => {
          if (critFX && critFX.parentNode)
            critFX.parentNode.removeChild(critFX);
        }, 900);
        critFX.addEventListener("animationend", () => {
          if (critFX && critFX.parentNode)
            critFX.parentNode.removeChild(critFX);
        });
      }
    }

    // Remove element after animation - only adjust for medium/low quality
    const baseDuration =
      clickCombo >= 50
        ? 1200
        : clickCombo >= 15
          ? 900
          : clickCombo >= 5
            ? 1100
            : 900;

    // Apply graphics quality modifier only for medium/low quality
    const graphicsQuality = window.graphicsQuality || "high";
    let animationDuration = baseDuration;
    if (graphicsQuality === "medium") {
      animationDuration = Math.max(600, baseDuration * 0.8);
    } else if (graphicsQuality === "low") {
      animationDuration = Math.max(800, baseDuration * 0.9);
    }
    // HIGH quality uses original baseDuration unchanged
    // Improved DOM cleanup with fallback
    const cleanup = () => {
      if (clickFX && clickFX.parentNode) {
        try {
          clickFX.parentNode.removeChild(clickFX);
        } catch (e) {
          console.warn("Failed to remove click effect:", e);
        }
      }
    };

    setTimeout(cleanup, animationDuration);

    clickFX.addEventListener("animationend", cleanup, { once: true });

    // Emergency cleanup to prevent DOM bloat
    setTimeout(cleanup, Math.max(animationDuration * 2, 3000));
  }

  // Reduce sound effects on high graphics to prevent performance issues
  if (state.player.sound) {
    const graphicsQuality = window.graphicsQuality || "high";

    if (crit) {
      playSound("crit");
      // Reduce excessive sound effects on high graphics
      if (graphicsQuality !== "high") {
        if (clickCombo >= 120) {
          setTimeout(() => playSound("crit"), 40);
          setTimeout(() => playSound("click"), 80);
          setTimeout(() => playSound("crit"), 120);
          setTimeout(() => playSound("click"), 160);
        } else if (clickCombo >= 50) {
          setTimeout(() => playSound("crit"), 50);
          setTimeout(() => playSound("click"), 100);
        } else if (clickCombo >= 15) {
          setTimeout(() => playSound("crit"), 60);
          setTimeout(() => playSound("click"), 120);
        } else if (clickCombo >= 5) {
          setTimeout(() => playSound("crit"), 40);
        }
      } else {
        // High graphics: reduce combo sound effects to prevent lag
        if (clickCombo >= 50) {
          setTimeout(() => playSound("crit"), 80);
        } else if (clickCombo >= 15) {
          setTimeout(() => playSound("crit"), 100);
        }
      }
    } else {
      playSound("click");
      if (graphicsQuality !== "high") {
        if (clickCombo >= 120) {
          animalCritBurst();
          setTimeout(() => playSound("click"), 40);
          setTimeout(() => playSound("click"), 80);
          setTimeout(() => playSound("click"), 120);
          setTimeout(() => playSound("click"), 160);
          setTimeout(() => playSound("click"), 200);
        } else if (clickCombo >= 50) {
          setTimeout(() => playSound("click"), 50);
          setTimeout(() => playSound("click"), 100);
          setTimeout(() => playSound("click"), 150);
        } else if (clickCombo >= 15) {
          setTimeout(() => playSound("click"), 40);
          setTimeout(() => playSound("click"), 80);
        } else if (clickCombo >= 5) {
          setTimeout(() => playSound("click"), 30);
        }
      } else {
        // High graphics: minimal combo sounds to prevent performance issues
        if (clickCombo >= 120) {
          animalCritBurst();
          setTimeout(() => playSound("click"), 60);
        } else if (clickCombo >= 50) {
          setTimeout(() => playSound("click"), 80);
        } else if (clickCombo >= 15) {
          setTimeout(() => playSound("click"), 60);
        }
      }
    }
  }

  save();
  updateTopBar();
  if (activeTab !== "game") {
    renderTab();
  }
  checkAchievements();
  if (typeof Equipment !== "undefined" && Equipment.maybeDropOnClick) {
    Equipment.maybeDropOnClick(state, { save, notify: showHudNotify });
  }
}

function upgrade(type) {
  let quantity = selectedBulk;
  if (selectedBulk === "max") {
    quantity = maxAffordableUpgrades(type);
  }

  if (quantity <= 0) return;

  let cost =
    quantity === 1 ? upgradeCost(type) : bulkUpgradeCost(type, quantity);
  if (state.packets < cost) return;

  state.packets -= cost;
  state.upgrades[type] += quantity;

  switch (type) {
    case "click":
      state.perClick += quantity;
      break;
    case "idle":
      state.perSec += quantity;
      break;
    case "crit":
      state.critChance += 2 * quantity;
      break;
  }

  state.stats.totalUpgrades += quantity;

  if (state.player.sound) playSound("upgrade");
  save();
  updateTopBar();

  if (activeTab === "upgrades") {
    renderTab();
  }

  checkAchievements();
  showHudNotify(
    `${quantity > 1 ? quantity + " upgrades" : "Upgrade"} purchased!`,
    "🛠️",
  );
}

// Comprehensive save migration function to update old saves
function migrateSaveToCurrentVersion() {
  // Get current version from global constants
  const currentVersion =
    (typeof window !== "undefined" &&
      window.Packet &&
      window.Packet.data &&
      window.Packet.data.APP_VERSION) ||
    "0.0.27";

  console.log(
    "[Migration] Checking save compatibility with version",
    currentVersion,
  );

  // Force update check - if save is from older version, ensure full migration
  const saveVersion = state.version || "0.0.1";

  // Version comparison for major updates
  const needsForceUpdate = compareVersions(saveVersion, currentVersion) < 0;

  if (needsForceUpdate) {
    console.log(
      `[Migration] Force updating from ${saveVersion} to ${currentVersion}`,
    );

    // Clear any cached service worker data to ensure fresh assets
    if ("caches" in window) {
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName.includes("packet-clicker-cache")) {
                console.log("[Migration] Clearing old cache:", cacheName);
                return caches.delete(cacheName);
              }
            }),
          );
        })
        .catch(() => {});
    }
  }

  // Ensure all prestige upgrades exist
  if (!state.prestige) state.prestige = {};
  const prestigeDefaults = {
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
  };
  Object.keys(prestigeDefaults).forEach((key) => {
    if (typeof state.prestige[key] !== "number") {
      state.prestige[key] = prestigeDefaults[key];
    }
  });

  // Ensure all boost types exist
  if (!state.boosts) state.boosts = {};
  const boostDefaults = {
    doublePackets: 0,
    tripleGems: 0,
    quadrupleClick: 0,
    megaCrit: 0,
    autoClicker: 0,
  };
  Object.keys(boostDefaults).forEach((key) => {
    if (typeof state.boosts[key] !== "number") {
      state.boosts[key] = boostDefaults[key];
    }
  });

  // Ensure random event system exists
  if (!state.randomEvent || typeof state.randomEvent !== "object") {
    state.randomEvent = {
      active: false,
      type: null,
      endTime: 0,
      multiplier: 1,
    };
  }

  // Ensure daily rewards system exists
  if (!state.dailyRewards || typeof state.dailyRewards !== "object") {
    state.dailyRewards = {
      lastClaim: 0,
      streak: 0,
    };
  }

  // Ensure themes system exists
  if (!state.themes || typeof state.themes !== "object") {
    state.themes = {};
  }
  if (typeof state.theme !== "string") {
    state.theme = "cyberpunk";
  }

  // Ensure stats tracking exists
  if (!state.stats || typeof state.stats !== "object") {
    state.stats = {
      totalClicks: 0,
      totalPackets: 0,
      totalUpgrades: 0,
      sessionStart: Date.now(),
    };
  }

  // Ensure player properties exist
  if (!state.player || typeof state.player !== "object") {
    state.player = {};
  }
  if (typeof state.player.name !== "string") state.player.name = "Player";
  if (typeof state.player.avatar !== "string") {
    state.player.avatar =
      "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
  }
  if (typeof state.player.sound !== "boolean") state.player.sound = true;
  if (typeof state.player.vipUntil !== "number") state.player.vipUntil = 0;
  if (typeof state.player.noAds !== "boolean") state.player.noAds = false;

  // Ensure shop properties exist
  if (!state.shop || typeof state.shop !== "object") {
    state.shop = {};
  }
  if (typeof state.shop.skinBought !== "boolean") state.shop.skinBought = false;
  if (typeof state.shop.skinElite !== "boolean") state.shop.skinElite = false;
  if (typeof state.shop.skinCyber !== "boolean") state.shop.skinCyber = false;
  if (typeof state.shop.skinNeon !== "boolean") state.shop.skinNeon = false;
  if (typeof state.shop.skinShadow !== "boolean") state.shop.skinShadow = false;

  // Ensure core game values are properly set
  if (typeof state.packets !== "number") state.packets = 0;
  if (typeof state.gems !== "number") state.gems = 0;
  if (typeof state.perClick !== "number") state.perClick = 1;
  if (typeof state.perSec !== "number") state.perSec = 0;
  if (typeof state.critChance !== "number") state.critChance = 0;
  if (typeof state.critMult !== "number") state.critMult = 2;

  // Ensure upgrades exist
  if (!state.upgrades || typeof state.upgrades !== "object") {
    state.upgrades = { click: 0, idle: 0, crit: 0 };
  }
  if (typeof state.upgrades.click !== "number") state.upgrades.click = 0;
  if (typeof state.upgrades.idle !== "number") state.upgrades.idle = 0;
  if (typeof state.upgrades.crit !== "number") state.upgrades.crit = 0;

  // Ensure achievements array exists
  if (!Array.isArray(state.achievements)) state.achievements = [];

  // Ensure ads setting exists
  if (typeof state.ads !== "boolean") state.ads = true;

  // Equipment system migration is handled by Equipment.ensureStateShape()

  // Ensure avatar is properly set and compatible
  if (
    typeof state.player.avatar !== "string" ||
    !state.player.avatar ||
    state.player.avatar.trim() === ""
  ) {
    state.player.avatar = DEFAULT_AVATAR;
    console.log("[Migration] Reset avatar to default");
  }

  // Update save version to current
  state.version = currentVersion;

  console.log(
    "[Migration] Save updated to version",
    currentVersion,
    "compatibility",
  );
}

// Version comparison helper function
function compareVersions(a, b) {
  const parseVersion = (v) => v.split(".").map(Number);
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
    const partA = versionA[i] || 0;
    const partB = versionB[i] || 0;
    if (partA < partB) return -1;
    if (partA > partB) return 1;
  }
  return 0;
}

function idleTick() {
  let bonus = isVIP() ? 1.25 : 1;

  // Apply prestige bonus
  if (state.prestige.level > 0) {
    bonus *= 1 + state.prestige.level * 0.1;
  }

  // Apply active boosts
  if (state.boosts.doublePackets > Date.now()) {
    bonus *= 3;
  }
  if (state.boosts.ultraCombo > Date.now()) {
    bonus *= 10;
  }

  let totalPerSec =
    state.perSec +
    (function () {
      try {
        if (
          typeof Equipment !== "undefined" &&
          typeof Equipment.computeBonuses === "function"
        ) {
          const _eq = Equipment.computeBonuses(state);
          return typeof _eq.perSec === "number" ? _eq.perSec : 0;
        }
      } catch (_) {}
      return 0;
    })();

  // Auto clicker from prestige
  if (state.prestige.autoClicker > 0) {
    totalPerSec += state.prestige.autoClicker;
  }

  // Temporary auto-clicker boost
  if (state.boosts.autoClicker > Date.now()) {
    totalPerSec += 25; // 25 clicks per second
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
    const eventIdleMult =
      state.randomEvent.active && state.randomEvent.type === "packetRain"
        ? Number(state.randomEvent.multiplier) || 1
        : 1;
    const before = state.packets;
    let gain = Math.floor(totalPerSec * bonus * eventIdleMult);
    state.packets += gain;
    state.stats.totalPackets += gain;
    save();
    updateTopBar();

    // Live-update Prestige progress if that tab is open
    if (activeTab === "prestige") {
      try {
        const prestigeRequirement = getPrestigeRequirement();
        const pct = Math.min(
          100,
          (state.packets / prestigeRequirement) * 100,
        ).toFixed(1);
        const fill = document.getElementById("prestige-progress-fill");
        const __eligible = state.packets >= prestigeRequirement;
        if (fill) {
          fill.style.width = pct + "%";
          if (__eligible) fill.classList.add("prestige-glow");
          else fill.classList.remove("prestige-glow");
        }
        const label = document.getElementById("prestige-progress-label");
        if (label)
          label.innerHTML = `<span class="event-number-glow">${state.packets.toLocaleString("en-US")}</span> / <span class="event-number-glow">${prestigeRequirement.toLocaleString("en-US")}</span>`;

        // If threshold crossed, re-render CTA section
        const wasEligible = before >= prestigeRequirement;
        const isEligible = __eligible;
        if (wasEligible !== isEligible) {
          renderTab();
        }
      } catch (_) {}
    } else if (activeTab === "game") {
      renderTab();
    }

    checkAchievements();
  }

  // Simulate ongoing progress for leaderboard bots to feel more "real"
  try {
    if (false) {
      const playerRate = Math.max(
        1,
        Math.floor(state.perSec + state.perClick * 0.25),
      );
      state.leaderboardBots = state.leaderboardBots.map((b, i) => {
        const variance = 0.6 + Math.random() * 0.9; // 0.6x..1.5x of player baseline
        const burst =
          Math.random() < 0.02
            ? Math.floor(playerRate * (3 + Math.random() * 7))
            : 0; // rare burst
        const delta = Math.max(0, Math.floor(playerRate * variance)) + burst;
        return { ...b, packets: Math.max(100, b.packets + delta) };
      });
    }
  } catch (_) {}
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
  showHudNotify(`+${pack.gems} 💎 (Purchased!)`, "💎");
}

function buyShopItem(itemId) {
  let item = SHOP_ITEMS.find((x) => x.id === itemId);
  if (!item || state.gems < item.gems) return;
  if (item.type === "vip") {
    let now = Date.now();
    if (!isVIP() || state.player.vipUntil < now) state.player.vipUntil = now;
    state.player.vipUntil += item.days * 86400 * 1000;
    // VIP automatically includes ad removal
    state.player.noAds = true;
    state.ads = false;
  }
  if (item.type === "skin") {
    state.shop[item.id] = true;
    // Legacy compatibility
    if (item.id === "skinElite") state.shop.skinBought = true;
  }
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
  if (window.__NAME_PROMPT_LOCK__ || window.__NAME_PROMPT_PENDING__) {
    return;
  }
  if (window.PacketUI && typeof PacketUI.showModal === "function") {
    return PacketUI.showModal(title, html);
  }
}

function closeModal() {
  if (window.PacketUI && typeof PacketUI.closeModal === "function") {
    return PacketUI.closeModal();
  }
}

// =============== SOUND FX ===============
function playSound(type) {
  if (!state.player.sound) return;
  try {
    // Improved HTMLAudio pool for click SFX with better responsiveness
    if (type === "click" || type === "crit") {
      const POOL_SIZE = 12; // Increased pool size for better performance
      const src = "src/assets/hit.wav";
      const g = window;

      if (!g._hitPool) {
        g._hitPool = Array.from({ length: POOL_SIZE }, () => {
          const a = new Audio(src);
          a.preload = "auto";
          a.crossOrigin = "anonymous";
          a.volume = type === "crit" ? 0.85 : 0.75;
          // Pre-load to reduce latency
          a.load();
          return a;
        });
        g._hitPoolIndex = 0;
      }

      // Always use round-robin to prevent conflicts
      const a = g._hitPool[g._hitPoolIndex];
      g._hitPoolIndex = (g._hitPoolIndex + 1) % g._hitPool.length;

      // Reset and play immediately
      try {
        a.pause();
        a.currentTime = 0;
        a.volume = type === "crit" ? 0.85 : 0.75;
        a.play().catch(() => {
          // Silently handle blocked audio
        });
      } catch (e) {
        // Ignore audio errors to prevent crashes
      }

      return;
    }

    // Disable non-click beeps
    return;
    // const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    // Reuse a single audio context for all SFX
    const ctx = (window._audioCtx ||= new AudioCtx());

    // Basic tone design per event
    let freq = 480;
    let dur = 0.06;
    let wave = "square";

    switch (type) {
      case "crit":
        freq = 240;
        dur = 0.12;
        wave = "sawtooth";
        break;
      case "upgrade":
        freq = 660;
        dur = 0.1;
        wave = "triangle";
        break;
      case "achievement":
        freq = 520;
        dur = 0.16;
        wave = "sine";
        break;
      case "shop":
        freq = 600;
        dur = 0.09;
        wave = "triangle";
        break;
      default:
        freq = 500;
        dur = 0.05;
        wave = "square";
        break;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Soft attack, quick decay envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + dur + 0.01);
  } catch {
    // Silently ignore audio failures
  }
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
    "xX_Shadow_Xx",
    "NoScope42",
    "L33T_H4X0R",
    "Nova_7",
    "RogueByte",
    "PingLord",
    "AFK_Goblin",
    "DDoS_Dragon",
    "ClutchM0de",
    "ToxicKitten",
    "GhostFrag",
    "LagWizard",
    "PacketPwn",
    "Hex_Reaper",
    "WiFi_Warlord",
    "NullViper",
    "TryHardTim",
    "SudoSlayer",
    "1TapLegend",
    "Peekab00",
    "EZ_Clapper",
    "AltF4Pro",
    "Cr1tDealer",
    "Headshot_99",
    "TurboTurtle",
    "AimBotAnna",
    "SneakyPanda",
    "QwertyNinja",
    "NeoPacket",
    "FpsGremlin",
    "SaltFactory",
    "Byte_Bandit",
    "Proxy_Pal",
    "LagSwitch99",
    "GLHF_Guy",
    "NoRecoil911",
    "Cl4nless",
    "KDA_Farmer",
    "YoloSnack",
    "PacketPirate",
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function generateBots(n = 6) {
  let bots = [];
  const p = Math.max(0, state.packets);

  for (let i = 0; i < n; i++) {
    // Scale difficulty with player progress:
    // - Most bots sit around 70%–130% of player's packets (tighter spread)
    // - Top 50% of bots get a stronger challenge bias
    const variance = 0.7 + Math.random() * 0.6; // 0.7x .. 1.3x
    const challengeBias =
      i < Math.ceil(n * 0.5) ? 1.4 + Math.random() * 0.9 : 1.05; // +40%..+130% (others slightly above)
    const base = Math.max(250, Math.floor(p * variance * challengeBias));
    const jitter = Math.floor(
      Math.random() * Math.max(400, Math.floor(p * 0.08)),
    ); // small random spread
    const nick = randomName();
    bots.push({
      name: nick,
      packets: base + jitter,
      avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(nick)}`,
    });
  }

  // Ensure at least one bot is notably above the player to keep it challenging
  if (bots.length) {
    const idx = Math.floor(Math.random() * bots.length);
    bots[idx].packets = Math.max(
      bots[idx].packets,
      Math.floor(p * (1.3 + Math.random() * 0.7)), // 1.3x .. 2.0x
    );
  }

  // Bots removed: return empty list
  return [];
}

// =============== PRESTIGE FUNCTIONS ===============
function doPrestige() {
  const prestigeRequirement = getPrestigeRequirement();
  if (state.packets < prestigeRequirement) return;

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
    `You gained ${shardGain} <img src="src/assets/items/I_Sapphire.png" alt="Data Shards" style="width:1.1rem;height:1.1rem;vertical-align:middle;display:inline-block;margin-left:0.25rem;"/> Data Shards!<br>Your prestige level is now ${state.prestige.level}!`,
  );
  showHudNotify(
    `Prestige Level ${state.prestige.level}!`,
    '<img src="src/assets/items/I_Sapphire.png" alt="Prestige" style="width:1rem;height:1rem;vertical-align:middle;display:inline-block;"/>',
  );
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

  showHudNotify(
    `${upgrade.name} upgraded!`,
    '<img src="src/assets/items/I_Sapphire.png" alt="Data Shards" style="width:1rem;height:1rem;vertical-align:middle;display:inline-block;"/>',
  );
  save();
  updateTopBar();
  renderTab();
}

function buyBoost(boostId) {
  let boost = BOOST_SHOP.find((b) => b.id === boostId);
  if (!boost || state.gems < boost.gems) return;

  state.gems -= boost.gems;
  state.boosts[boostId] = Date.now() + boost.duration;

  // Premium boost activation notification
  const rarityEmojis = {
    common: "✨",
    uncommon: "💫",
    rare: "🌟",
    epic: "💥",
    legendary: "🔥",
    mythic: "🚀",
  };

  const emoji = rarityEmojis[boost.rarity] || "⚡";

  showModal(
    "🎉 BOOST ACTIVATED! 🎉",
    `<div style="text-align: center;">
      <div style="font-size: 3rem; margin: 1rem 0;">${boost.icon}</div>
      <div style="font-size: 1.3rem; font-weight: bold; color: #fbbf24; margin-bottom: 0.5rem;">
        ${boost.name}
      </div>
      <div style="color: #e2e8f0; margin-bottom: 1rem;">
        ${boost.effect}
      </div>
      <div style="padding: 0.75rem; background: linear-gradient(45deg, rgba(251, 191, 36, 0.2), rgba(168, 85, 247, 0.2)); border: 1px solid #fbbf24; border-radius: 8px;">
        <span style="color: #fbbf24; font-weight: bold;">Duration:</span>
        <span class="event-number-glow" style="margin-left: 0.5rem;">${Math.floor(boost.duration / 60000)}m ${(boost.duration % 60000) / 1000}s</span>
      </div>
    </div>`,
  );

  showHudNotify(`${emoji} ${boost.name} ACTIVATED!`, boost.icon);

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
    state.theme = themeId;
    save();
    applyTheme(themeId);
    showHudNotify(`${theme.name} theme activated!`, "🎨");
    updateTopBar();
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

  state.theme = themeId;
  save();
  applyTheme(themeId);
  showHudNotify(`${theme.name} theme purchased and activated!`, "🎨");
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
    `You received <span class="event-number-glow">${reward.gems.toLocaleString("en-US")}</span> 💎 and <span class="event-number-glow">${reward.packets.toLocaleString("en-US")}</span> <span class="icon-packet"></span>!<br>Streak: <span class="event-number-glow">${state.dailyRewards.streak}</span> days${reward.bonus ? `<br><span style="color:#f4e29f; font-style:italic; font-size:0.9rem;">${reward.bonus}</span>` : ""}`,
  );
  showHudNotify(
    `Day ${state.dailyRewards.streak} claimed! ${reward.bonus || ""}`,
    "📅",
  );

  save();
  updateTopBar();
  renderTab();
  checkAchievements();
}

// =============== UI BINDING ===============
function clearTabEvents() {
  // Clear theme button events specifically
  document.querySelectorAll("[data-theme]").forEach((card) => {
    const actionBtn = card.querySelector(
      ".theme-action-btn, .theme-btn-compact",
    );
    if (actionBtn) actionBtn.onclick = null;
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
    if (btn) {
      // Clear any existing handlers
      btn.onclick = null;
      btn.onpointerdown = null;
      btn.onpointerup = null;
      btn.ontouchstart = null;
      btn.ontouchend = null;

      // Shared click state to prevent button getting stuck
      if (!btn._clickState) {
        btn._clickState = {
          clicking: false,
          lastClick: 0,
        };
      }

      const handleClick = (e) => {
        const clickTime = Date.now();
        const state = btn._clickState;

        // Prevent rapid firing and stuck state
        if (state.clicking || clickTime - state.lastClick < 50) {
          return;
        }

        state.clicking = true;
        state.lastClick = clickTime;

        try {
          clickPacket(e);
        } catch (error) {
          console.warn("Click error:", error);
        }

        // Reset click state with timeout and immediate reset on pointerup
        const resetState = () => {
          state.clicking = false;
        };

        setTimeout(resetState, 100);

        // Also reset on pointer events to prevent stuck state
        const resetHandler = () => {
          resetState();
          document.removeEventListener("pointerup", resetHandler);
          document.removeEventListener("pointercancel", resetHandler);
        };

        document.addEventListener("pointerup", resetHandler, { once: true });
        document.addEventListener("pointercancel", resetHandler, {
          once: true,
        });
      };

      btn.onpointerdown = handleClick;
      btn.onclick = handleClick;

      // Ensure cursor matches current combo stage when entering the Game tab
      setCursorForCombo(typeof clickCombo === "number" ? clickCombo : 0);
    }

    let prestigeBtn = document.getElementById("prestige-btn");
    if (prestigeBtn) prestigeBtn.onclick = () => setTab("prestige");
  }
  if (tab === "upgrades") {
    // Enhanced touch handling for upgrade buttons
    const bindUpgradeButton = (id, type) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.onclick = () => upgrade(type);
        MobileUtils.addTouchOptimization(btn);
        MobileUtils.enableGPUAcceleration(btn);
      }
    };

    bindUpgradeButton("upgrade-click", "click");
    bindUpgradeButton("upgrade-idle", "idle");
    bindUpgradeButton("upgrade-crit", "crit");

    // Bind bulk mode buttons with mobile optimization
    document.querySelectorAll(".bulk-btn").forEach((btn) => {
      btn.onclick = () => {
        const bulk = btn.getAttribute("data-bulk");
        setBulkMode(bulk === "max" ? "max" : parseInt(bulk));
      };
      MobileUtils.addTouchOptimization(btn);
      MobileUtils.enableGPUAcceleration(btn);
    });

    // Set initial bulk mode and update labels
    setBulkMode(1);
    updateUpgradeButtonLabels();
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
      if (btn.disabled) return;
      btn.onclick = () => buyBoost(btn.getAttribute("data-boost"));
    });
  }
  if (tab === "equipment") {
    if (typeof Equipment !== "undefined" && Equipment.bindEvents) {
      Equipment.bindEvents(document, {
        state,
        save,
        rerender: renderTab,
        notify: showHudNotify,
      });
    }
  }
  if (tab === "themes") {
    document.querySelectorAll("[data-theme]").forEach((card) => {
      const themeId = card.getAttribute("data-theme");

      // Handle theme action buttons (Buy/Use) - support both old and new button classes
      const actionBtn = card.querySelector(
        ".theme-action-btn, .theme-btn-compact",
      );
      if (actionBtn && !actionBtn.disabled && themeId !== state.theme) {
        actionBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          buyTheme(themeId);
        };
      }
    });
  }
}

// =============== INIT ===============
function init() {
  // Dev switch: disable leaderboard completely if window.DISABLE_LEADERBOARD === true
  if (typeof window !== "undefined" && window.DISABLE_LEADERBOARD === true) {
    try {
      window.Leaderboard = window.Leaderboard || {};
      window.Leaderboard.init = function () {};
      window.Leaderboard.subscribe = function () {
        return function () {};
      };
      window.Leaderboard.submit = function () {};
      window.Leaderboard.unsubscribe = function () {};
      window.Leaderboard.teardown = function () {};
      window.Leaderboard.getDeviceId = function () {
        return "dev_disabled";
      };
    } catch (_) {}
  }
  load();

  // Comprehensive save migration - ensure ALL new features are added to old saves
  migrateSaveToCurrentVersion(state);

  if (typeof Equipment !== "undefined" && Equipment.ensureStateShape) {
    Equipment.ensureStateShape(state);
  }
  // Initialize Firebase leaderboard (uses module defaults); fallback to local bots on error
  try {
    // Init unconditionally; module merges defaults and handles dynamic import
    Leaderboard.init({ collection: "leaderboard" });

    // Live subscription (keeps UI in sync across devices)
    Leaderboard.subscribe(function (rows) {
      state.leaderboardLive = Array.isArray(rows) ? rows : [];
      if (typeof renderTab === "function") renderTab();
    });

    // Periodic, throttled submit (module also throttles internally)
    if (window.__lbTimer) clearInterval(window.__lbTimer);

    const __lbSafeSubmit = function () {
      if (
        typeof navigator !== "undefined" &&
        navigator &&
        navigator.onLine === false
      )
        return;
      Leaderboard.submit(
        {
          name: state.player.name,
          avatar:
            state.player.avatar &&
            typeof state.player.avatar === "string" &&
            state.player.avatar.trim() !== ""
              ? state.player.avatar
              : DEFAULT_AVATAR,
          packets: state.packets,
        },
        { throttleMs: 20000 },
      );
    };

    // Immediate submit once after init so other devices see us quickly (no throttle)
    // Ensure avatar is valid before submitting
    const avatarToSubmit =
      state.player.avatar &&
      typeof state.player.avatar === "string" &&
      state.player.avatar.trim() !== ""
        ? state.player.avatar
        : DEFAULT_AVATAR;

    Leaderboard.submit(
      {
        name: state.player.name,
        avatar: avatarToSubmit,
        packets: state.packets,
      },
      { throttleMs: 0 },
    );

    // Keep in sync periodically (module throttles internally)
    window.__lbTimer = setInterval(function () {
      __lbSafeSubmit();
    }, 15000);

    // React to connectivity changes
    try {
      window.addEventListener("online", __lbSafeSubmit);
    } catch (_) {}
  } catch (_) {}
  // Expose state/save globally so UI helpers can persist theme changes
  window.state = state;
  window.save = save;
  updateTopBar();
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });
  document.getElementById("open-settings").onclick = () =>
    window.showSettings();

  // Simple gem pill click to navigate to Shop
  document.addEventListener("click", (e) => {
    if (e.target.closest("#gem-pill-clickable")) {
      setTab("shop");
    }
  });

  // Handled by PacketUI.showModal with target check; avoid closing modal on any click
  // document.getElementById("modal-backdrop").onclick = closeModal;
  setInterval(idleTick, 1000);
  setInterval(updateTopBar, 1000);
  setInterval(updateActiveTab, 1000);
  setInterval(save, 10000);

  // Apply current theme
  applyTheme(state.theme);

  // Prompt for player name if still default (only when no modal is open)
  if (
    state.player.name === "Player" &&
    !localStorage.getItem("packet_clicker_name_prompted")
  ) {
    window.__NAME_PROMPT_PENDING__ = true;
    setTimeout(() => {
      scheduleNamePromptWhenIdle();
    }, 1000);
  }

  renderTab();
  try {
    if (window.Packet && Packet.i18n) {
      Packet.i18n.applyLanguageToData();
      if (typeof Packet.i18n.translateDom === "function") {
        Packet.i18n.translateDom(document.body);
      }
    }
  } catch (_) {}
  checkAchievements();

  // Additional mobile zoom prevention
  document.addEventListener(
    "touchstart",
    function (e) {
      // Only prevent multi-touch on UI elements, not content areas
      if (e.touches.length > 1) {
        const t = e.target;
        const isUIElement =
          t &&
          (t.id === "click-btn" ||
            (typeof t.closest === "function" &&
              t.closest(
                "#click-btn,.tab-btn,.neon-btn,.upgrade-btn,.gem-btn,.mobile-click-btn",
              )));
        if (isUIElement) {
          e.preventDefault();
        }
      }
    },
    { passive: false },
  );

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  });

  // Prevent double-tap zoom only on UI elements, allow scrolling
  // Prevent double-tap zoom on mobile - optimized for better performance
  let lastTouchEnd = 0;
  const handleTouchEnd = (event) => {
    const now = Date.now();
    const t = event.target;
    const isUIElement =
      t &&
      (t.id === "click-btn" ||
        (typeof t.closest === "function" &&
          t.closest(
            "#click-btn,.tab-btn,.neon-btn,.upgrade-btn,.gem-btn,.mobile-click-btn,.theme-action-btn,.theme-btn-compact,[data-theme]",
          )));
    // Only prevent double-tap on UI elements, not on content areas
    // Check if event is cancelable before attempting to prevent default
    if (isUIElement && now - lastTouchEnd <= 300 && event.cancelable) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  };

  document.addEventListener(
    "touchend",
    MobileUtils.throttle(handleTouchEnd, 16),
    { passive: false },
  );

  // Additional zoom prevention for iOS Safari - only prevent pinch zoom, allow scrolling
  document.addEventListener(
    "touchmove",
    function (e) {
      // Only prevent zoom gestures (multiple touches), allow single touch scrolling
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  // Prevent zoom on specific elements
  document.addEventListener(
    "touchstart",
    function (e) {
      if (
        e.target.closest(
          ".theme-card, .theme-card-compact, .theme-action-btn, .theme-btn-compact, [data-theme]",
        )
      ) {
        e.target.style.touchAction = "manipulation";
      }
    },
    { passive: true },
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

  // Apply graphics settings on initialization
  applyGraphicsSettings(state.player.graphics || "high");

  // Ensure graphics are applied immediately even if state isn't loaded yet
  if (
    !document.body.classList.contains("graphics-high") &&
    !document.body.classList.contains("graphics-medium") &&
    !document.body.classList.contains("graphics-low")
  ) {
    document.body.classList.add("graphics-high");
    window.graphicsQuality = "high";
  }

  // Initialize mobile utilities system
  MobileUtils.init();

  // Add mobile-specific event listeners and optimizations
  if (MobileUtils.isMobile()) {
    // Add vibration feedback on button clicks
    document.addEventListener("click", (e) => {
      const isButton = e.target.closest(
        ".neon-btn, .upgrade-btn, .gem-btn, .tab-btn, #click-btn",
      );
      if (isButton && state.player.sound) {
        MobileUtils.vibrate([30]);
      }
    });

    // Optimize scroll performance on mobile
    const scrollElements = document.querySelectorAll(
      "#tab-content, .neon-card, main",
    );
    scrollElements.forEach((el) => {
      el.style.webkitOverflowScrolling = "touch";
      el.style.overscrollBehavior = "contain";
    });
  }
}

// Custom name prompt modal
function scheduleNamePromptWhenIdle() {
  try {
    const backdrop = document.getElementById("modal-backdrop");
    const modalOpen = backdrop && !backdrop.classList.contains("hidden");
    if (modalOpen) {
      setTimeout(scheduleNamePromptWhenIdle, 500);
      return;
    }
    showNamePrompt();
  } catch {
    showNamePrompt();
  }
}
function showNamePrompt() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");

  window.__NAME_PROMPT_LOCK__ = true;
  window.__NAME_PROMPT_PENDING__ = false;
  backdrop.classList.remove("hidden");
  backdrop.setAttribute("aria-hidden", "false");
  modal.classList.remove("hidden");
  modal.innerHTML = `<h2 id="modal-title" class="text-neon-cyan mb-2 text-lg">🎮 Welcome to Packet Clicker!</h2>
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
    const playerNameEl = document.getElementById("player-name");
    if (isVIP()) {
      playerNameEl.innerHTML = `<img src="src/assets/vip.png" alt="VIP" style="height:1rem;width:1rem;vertical-align:middle;display:inline-block;margin-right:0.25rem;" aria-hidden="true"/>${state.player.name}`;
    } else {
      playerNameEl.textContent = state.player.name;
    }
    closeModal();
    localStorage.setItem("packet_clicker_name_prompted", "true");
    window.__NAME_PROMPT_LOCK__ = false;
    showHudNotify(
      `Welcome, ${state.player.name}! Ready to click some packets?`,
      "🎮",
    );
  } else {
    showHudNotify("Please enter a valid name!", "⚠️");
  }
}

function skipNameSetup() {
  localStorage.setItem("packet_clicker_name_prompted", "true");
  window.__NAME_PROMPT_LOCK__ = false;
  closeModal();
  showHudNotify("Welcome to Packet Clicker! Click to start!", "🎮");
}

window.onload = init;
