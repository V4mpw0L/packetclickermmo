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
import {
  renderButton,
  renderMenu,
  renderButtonGroup,
  renderSelect,
} from "./src/ui/render.mjs";

/* Using global DEFAULT_AVATAR and STORAGE_KEY from constants UMD (src/data/constants.js) */

// Click combo tracking
let clickCombo = 0;
let lastClickTime = 0;
/* Using global COMBO_TIMEOUT from constants UMD */
// Track combo expiry to sync avatar border ring with combo HUD
let _comboExpireAt = 0;

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

// Apply theme to document
// applyTheme is provided by the UI module (src/ui/ui.js)

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
  const _avatarEl = document.getElementById("avatar");
  if (_avatarEl) {
    _avatarEl.src = state.player.avatar;
    // Dynamic avatar border ring based on current combo color (mirrors combo HUD colors)
    let comboColor = "var(--primary-color)";
    if (typeof clickCombo === "number") {
      if (clickCombo >= 30) comboColor = "#ff3040";
      else if (clickCombo >= 20) comboColor = "#ff4dff";
      else if (clickCombo >= 10) comboColor = "var(--accent-color)";
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
      // 2px ring in combo color + keep subtle base glow
      _avatarEl.style.boxShadow = `0 0 0 2px ${comboColor}, 0 0 0 3px #1de9b611, 0 2px 8px #c4ebea33`;
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
  let packets = `<span class="ml-2 text-neon-green font-bold" id="packets-bar" style="font-size:1em;display:inline-block;min-width:65px;text-align:right;"><span class="icon-packet"></span> ${state.packets.toLocaleString()}</span>`;
  let gemPill = `<span class="ml-2 text-neon-green font-bold" style="font-size:1em;display:inline-flex;align-items:center;gap:.25rem;padding:.2rem .5rem;border:1px solid var(--border-color);border-radius:999px;background:linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05));box-shadow:0 2px 10px var(--shadow-primary) inset, 0 1px 3px rgba(0,0,0,0.35);"><img src="src/assets/gem.png" alt="Gems" style="height:1.1rem;width:1.1rem;vertical-align:middle;display:inline-block;" aria-hidden="true"/><span>${state.gems}</span></span>`;

  if (isVIP()) {
    let ms = state.player.vipUntil - Date.now();
    let days = Math.floor(ms / (1000 * 60 * 60 * 24));
    let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    badge.innerHTML = `<span class="font-bold text-yellow-400 ml-2" style="margin-right:8px;display:inline-block;">👑 VIP ${days > 0 ? days + "d " : ""}${hours}h</span> ${gemPill} ${packets}`;
  } else {
    badge.innerHTML = `${gemPill} ${packets}`;
  }

  // Keep existing gem counter (in the settings area) in sync
  let el = document.getElementById("gem-count");
  if (el) el.textContent = state.gems;
}

// =============== GAME TAB RENDERING ===============
function renderGame() {
  let adBanner = showAdBanner();
  let boostStatus = "";
  let totalMultiplier = 1;

  // Active boosts
  if (state.boosts.doublePackets > Date.now()) {
    let remaining = Math.ceil((state.boosts.doublePackets - Date.now()) / 1000);
    boostStatus += `<div class="text-green-400 text-xs">🚀 2x Packets (${remaining}s)</div>`;
    totalMultiplier *= 2;
  }
  if (state.boosts.quadrupleClick > Date.now()) {
    let remaining = Math.ceil(
      (state.boosts.quadrupleClick - Date.now()) / 1000,
    );
    boostStatus += `<div class="text-green-400 text-xs">🖱️ 4x Click Power (${remaining}s)</div>`;
    totalMultiplier *= 4;
  }
  if (state.boosts.megaCrit > Date.now()) {
    let remaining = Math.ceil((state.boosts.megaCrit - Date.now()) / 1000);
    boostStatus += `<div class="text-neon-yellow text-xs">✨ 50% Crit (${remaining}s)</div>`;
  }
  if (state.boosts.tripleGems > Date.now()) {
    let remaining = Math.ceil((state.boosts.tripleGems - Date.now()) / 1000);
    boostStatus += `<div class="text-gem text-xs">💎 3x Gem Rate (${remaining}s)</div>`;
  }
  if (state.boosts.autoClicker > Date.now()) {
    let remaining = Math.ceil((state.boosts.autoClicker - Date.now()) / 1000);
    boostStatus += `<div class="text-neon-green text-xs">🤖 +10/s Auto Clicker (${remaining}s)</div>`;
  }

  // Prestige multiplier
  if (state.prestige.level > 0) {
    totalMultiplier *= 1 + state.prestige.level * 0.1;
    boostStatus += `<div class="text-purple-400 text-xs">⭐ Prestige Bonus: +${state.prestige.level * 10}%</div>`;
  }

  // Effective rates incl. boosts (match idleTick and clickPacket)
  let perSecBase = state.perSec;
  if (state.prestige.autoClicker > 0) perSecBase += state.prestige.autoClicker;
  if (state.boosts.autoClicker > Date.now()) perSecBase += 10;

  let effectivePerClick = Math.floor(state.perClick * totalMultiplier);
  let effectivePerSec = Math.floor(perSecBase * totalMultiplier);

  // Use modular renderButton for click button
  const clickBtn = renderButton({
    id: "click-btn",
    className: "text-2xl py-4 active:scale-95 transition-transform",
    label: 'Collect Packets <span class="icon-packet"></span>',
  });

  // Use modular renderButton for prestige button if available
  const prestigeBtn =
    state.packets >= 50000
      ? `<div class="text-center">${renderButton({
          id: "prestige-btn",
          className: "text-sm",
          label: "⭐ Prestige Available",
        })}</div>`
      : "";

  return `
    <div class="neon-card flex flex-col gap-4 px-3 py-4 mb-3">
      <h2 class="tab-title">🎮 Game</h2>
      ${clickBtn}
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
      activeBoosts += `<div class="text-green-400 text-sm mb-2">🚀 ${((Array.isArray(BOOST_SHOP) && BOOST_SHOP.find((b) => b.id === boostType)) || { name: boostType }).name} active (${remaining}s)</div>`;
    }
  });

  // Use modular renderButton for each boost
  let boostItems = BOOST_SHOP.map((boost) => {
    const until = state.boosts[boost.id] || 0;
    const active = until > Date.now();
    const remaining = active ? Math.ceil((until - Date.now()) / 1000) : 0;
    const label = `<div class="font-bold">${boost.name}</div>
        <div class="text-sm opacity-75">${boost.gems} 💎</div>
        <div class="text-xs text-neon-gray">${boost.desc}${active ? ` — active (${remaining}s)` : ""}</div>`;
    return renderButton({
      className: `gem-btn w-full mb-2 ${active ? "opacity-50" : ""}`,
      label,
      dataAttr: `data-boost="${boost.id}"`,
      disabled: active,
    });
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

      return renderButton({
        className: `gem-btn w-full mb-2 ${isActive ? "opacity-75" : ""} ${!isUnlocked && !canBuy ? "opacity-50" : ""}`,
        label: `<div class="font-bold">${theme.name} ${isActive ? "(Active)" : ""}</div>
          ${!isUnlocked ? `<div class="text-sm opacity-75">${theme.cost || 0} 💎</div>` : ""}
          <div class="text-xs text-neon-gray">
            Colors: <span style="color: ${theme.colors[0]}">●</span> <span style="color: ${theme.colors[1]}">●</span> <span style="color: ${theme.colors[2]}">●</span>
          </div>`,
        dataAttr: `data-theme="${id}"`,
        disabled: isActive,
      });
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
      ${renderButton({
        id: "upgrade-click",
        className: "upgrade-btn",
        label: `+1/click — <span>${upgradeCost("click")}</span> <span class="icon-packet"></span>`,
        dataAttr: `data-level="Lvl. ${state.upgrades.click}"`,
      })}
      ${renderButton({
        id: "upgrade-idle",
        className: "upgrade-btn",
        label: `+1/sec — <span>${upgradeCost("idle")}</span> <span class="icon-packet"></span>`,
        dataAttr: `data-level="Lvl. ${state.upgrades.idle}"`,
      })}
      ${renderButton({
        id: "upgrade-crit",
        className: "upgrade-btn",
        label: `+2% crit — <span>${upgradeCost("crit")}</span> <span class="icon-packet"></span>`,
        dataAttr: `data-level="Lvl. ${state.upgrades.crit}"`,
      })}
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

// Using imported HUD showHudNotify from ui/hud.js

// =============== ACHIEVEMENTS PANEL ===============
function renderAchievements() {
  let achList = ACHIEVEMENTS.map((ach) => {
    let unlocked = state.achievements.includes(ach.id);
    return `<li class="achievement-badge${unlocked ? " unlocked" : ""}">
      <span class="emoji">${ach.emoji === "📦" ? '<span class="icon-packet"></span>' : ach.emoji}</span>
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
  let gemStore = GEM_PACKS.map((p) =>
    renderButton({
      className: "gem-btn w-full mb-2",
      label: `Buy ${p.label} - $${p.price.toFixed(2)}`,
      dataAttr: `data-gem-pack="${p.id}"`,
    }),
  ).join("");
  let items = SHOP_ITEMS.map((item) => {
    let owned =
      (item.type === "vip" && isVIP()) ||
      (item.type === "skin" && state.shop.skinBought) ||
      (item.type === "noAds" && state.player.noAds);
    let label = owned ? "✓ Owned" : item.label + ` - ${item.gems} 💎`;
    return renderButton({
      className: "gem-btn w-full mb-2",
      label: `${label}<div class="text-xs text-neon-gray">${item.desc}</div>`,
      dataAttr: `data-shop-item="${item.id}"`,
      disabled: owned,
    });
  }).join("");
  let adBtn =
    !state.player.noAds && state.ads
      ? renderButton({
          id: "watch-ad-btn",
          className: "neon-btn w-full mb-2",
          label: "Watch Ad (simulate)",
        })
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
  if (!state.leaderboardBots || !state.leaderboardBots.length) {
    state.leaderboardBots = generateBots(10);
    save();
  }
  let bots = state.leaderboardBots.slice();
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
      <img src="${p.avatar || DEFAULT_AVATAR}" style="width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid ${idx === 0 ? "#ffd700" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "var(--primary-color)"};" alt="">
      <span style="font-weight: 800; ${p.name === state.player.name ? "color: var(--bg-secondary); background: linear-gradient(90deg, #c4ebea 33%, #faffc4 100%); border: 1px solid var(--primary-color); padding: 0.15rem 0.5rem; border-radius: 999px; box-shadow: 0 0 14px var(--shadow-primary);" : "color: var(--text-primary);"}">${p.name}</span>
      <span style="margin-left: auto; font-family: monospace; color: var(--text-secondary);">${p.packets.toLocaleString()}</span>
    </li>
  `,
    )
    .join("");
  return `<div class="neon-card" style="padding: 1rem 0.5rem;">
    <h2 class="tab-title">🏆 Leaderboard</h2>
    <ul id="leaderboard" style="list-style: none; margin: 0; padding: 0;">${html}</ul>
    <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center; margin-top: 0.75rem;">Scores update over time. Your score is real!</div>
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
          ? `<button id="do-prestige" class="neon-btn w-full mb-2" style="white-space: normal; display: flex; flex-direction: column; align-items: center; gap: 0.15rem;">
          <span>Prestige Now! (+${shardGain} 🔷)</span>
          <span class="text-neon-gray" style="font-size: 0.75rem; position: static; transform: none; left: auto; width: auto; pointer-events: auto; opacity: 0.9; display: block; line-height: 1.2; white-space: normal; margin-top: 0.1rem;">Reset progress for permanent bonuses</span>
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
      <span>${reward.gems}💎 + ${reward.packets}<img src="src/assets/packet-32.png" alt="Packets" style="height:1.1rem;width:1.1rem;vertical-align:middle;display:inline-block;" aria-hidden="true" /></span>
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
            <div class="text-xs">${nextReward.gems}💎 + ${nextReward.packets}<img src="src/assets/packet-32.png" alt="Packets" style="height:1.1rem;width:1.1rem;vertical-align:middle;display:inline-block;" aria-hidden="true" /></div>
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
    try {
      renderTab();
    } catch (_) {}
  };
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
            : `You gained ${bonus} packets!`,
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
    ${event.type === "packetRain" ? '<span class="icon-packet"></span>' : "🎪"} ${event.name} - ${remaining}s remaining
  </div>`;
}

// =============== GAME LOGIC ===============

function clickPacket(event) {
  const packetsBefore = state.packets;
  let bonus = isVIP() ? 1.25 : 1;

  // Apply prestige bonus
  if (state.prestige.level > 0) {
    bonus *= 1 + state.prestige.level * 0.1;
  }

  // Apply active boosts
  if (state.boosts.doublePackets > Date.now()) {
    bonus *= 2;
  }
  if (state.boosts.quadrupleClick > Date.now()) {
    bonus *= 4;
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

  const eventClickMult =
    state.randomEvent.active && state.randomEvent.type === "packetRain"
      ? Number(state.randomEvent.multiplier) || 1
      : 1;
  let amount = Math.floor(
    state.perClick * (crit ? critMultiplier : 1) * bonus * eventClickMult,
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
    gemMultiplier = 3;
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

  // Modularized combo effect logic
  if (!clickPacket._lastFxTime || Date.now() - clickPacket._lastFxTime > 80) {
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
    if (clickCombo >= 30) color = "#ff3040";
    else if (clickCombo >= 20) color = "#ff4dff";
    else if (clickCombo >= 10) color = "var(--accent-color)";
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
      const centerX = rect.left + rect.width / 2;
      const halfW = fxWidth / 2;
      const clampedCenter = Math.min(
        vw - margin - halfW,
        Math.max(margin + halfW, centerX),
      );
      clickFX.style.left = clampedCenter + "px";
      clickFX.style.top = rect.top - 20 + "px";
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
        ).toLocaleString()}`;
        critFX.style.left = clampedCenter + "px";
        critFX.style.top = rect.top - 50 + "px";
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
        ).toLocaleString()}`;
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

    // Remove element after animation
    const animationDuration =
      clickCombo >= 20
        ? 1200
        : clickCombo >= 10
          ? 900
          : clickCombo >= 5
            ? 1100
            : 900;
    setTimeout(() => {
      if (clickFX.parentNode) {
        document.body.removeChild(clickFX);
      }
    }, animationDuration);

    clickFX.addEventListener("animationend", () => {
      if (clickFX.parentNode) {
        clickFX.remove();
      }
    });
  }

  // Restore instant responsiveness with escalating SFX
  if (state.player.sound) {
    if (crit) {
      playSound("crit");
      if (clickCombo >= 30) {
        setTimeout(() => playSound("crit"), 60);
        setTimeout(() => playSound("click"), 120);
        setTimeout(() => playSound("crit"), 180);
        setTimeout(() => playSound("click"), 240);
      } else if (clickCombo >= 20) {
        setTimeout(() => playSound("crit"), 100);
        setTimeout(() => playSound("click"), 200);
      } else if (clickCombo >= 10) {
        setTimeout(() => playSound("crit"), 90);
        setTimeout(() => playSound("click"), 180);
      } else if (clickCombo >= 5) {
        setTimeout(() => playSound("crit"), 80);
      }
    } else {
      playSound("click");
      if (clickCombo >= 30) {
        animalCritBurst();
        setTimeout(() => playSound("click"), 60);
        setTimeout(() => playSound("click"), 120);
        setTimeout(() => playSound("click"), 180);
        setTimeout(() => playSound("click"), 240);
        setTimeout(() => playSound("click"), 300);
      } else if (clickCombo >= 20) {
        setTimeout(() => playSound("click"), 80);
        setTimeout(() => playSound("click"), 160);
        setTimeout(() => playSound("click"), 240);
      } else if (clickCombo >= 10) {
        setTimeout(() => playSound("click"), 70);
        setTimeout(() => playSound("click"), 140);
      } else if (clickCombo >= 5) {
        setTimeout(() => playSound("click"), 50);
      }
    }
  }

  save();
  updateTopBar();
  if (activeTab !== "game") {
    renderTab();
  }
  checkAchievements();
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

  // Refresh the Upgrades tab so costs and levels update immediately
  if (activeTab === "upgrades") {
    renderTab();
  }
  // Keep UI responsive on Game tab (no full rerender)
  if (activeTab === "game") {
    /* keep UI responsive - no full rerender on each click */
  }

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
    const eventIdleMult =
      state.randomEvent.active && state.randomEvent.type === "packetRain"
        ? Number(state.randomEvent.multiplier) || 1
        : 1;
    let gain = Math.floor(totalPerSec * bonus * eventIdleMult);
    state.packets += gain;
    state.stats.totalPackets += gain;
    save();
    updateTopBar();
    if (activeTab === "game") renderTab();
    checkAchievements();
  }

  // Simulate ongoing progress for leaderboard bots to feel more "real"
  try {
    if (state.leaderboardBots && state.leaderboardBots.length) {
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
    // Prefer HTMLAudio pool for click SFX (low-latency file playback)
    if (type === "click") {
      const POOL_SIZE = 6;
      const src = "src/assets/hit.wav";
      const g = window;

      if (!g._hitPool) {
        g._hitPool = Array.from({ length: POOL_SIZE }, () => {
          const a = new Audio(src);
          a.preload = "auto";
          a.crossOrigin = "anonymous";
          a.volume = 0.75;
          return a;
        });
        g._hitPoolIndex = 0;
      }

      // Find a free audio element in the pool
      let a = null;
      for (let i = 0; i < g._hitPool.length; i++) {
        const candidate = g._hitPool[(g._hitPoolIndex + i) % g._hitPool.length];
        if (candidate.paused || candidate.ended) {
          a = candidate;
          g._hitPoolIndex = (g._hitPoolIndex + i + 1) % g._hitPool.length;
          break;
        }
      }

      if (!a) {
        // Reclaim the current index element if all are busy
        a = g._hitPool[g._hitPoolIndex];
        g._hitPoolIndex = (g._hitPoolIndex + 1) % g._hitPool.length;
        try {
          a.pause();
        } catch {}
        a.currentTime = 0;
      } else {
        a.currentTime = 0;
      }

      a.play().catch(() => {
        // Fallback to oscillator if playback fails (permissions, etc.)
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = (window._audioCtx ||= new AudioCtx());
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.006);
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 0.035,
          );
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.045);
        } catch {}
      });

      return;
    }

    // For other SFX, use oscillator synth
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
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

  // Sort descending for leaderboard display
  bots.sort((a, b) => b.packets - a.packets);
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
    `You received ${reward.gems} 💎 and ${reward.packets} <span class="icon-packet"></span>!<br>Streak: ${state.dailyRewards.streak} days`,
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
    if (btn) {
      btn.onclick = null;
      btn.onpointerdown = (e) => {
        clickPacket(e);
      };
    }

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
      if (btn.disabled) return;
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
  if (!state.leaderboardBots || !state.leaderboardBots.length) {
    state.leaderboardBots = generateBots(10);
    save();
  }
  // Expose state/save globally so UI helpers can persist theme changes
  window.state = state;
  window.save = save;
  updateTopBar();
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });
  document.getElementById("open-settings").onclick = () =>
    window.showSettings();
  // Handled by PacketUI.showModal with target check; avoid closing modal on any click
  // document.getElementById("modal-backdrop").onclick = closeModal;
  setInterval(idleTick, 1000);
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
      const now = Date.now();
      const t = event.target;
      const allowFastTap =
        t &&
        (t.id === "click-btn" ||
          (typeof t.closest === "function" &&
            t.closest("#click-btn,.tab-btn,.neon-btn,.upgrade-btn,.gem-btn")));
      if (!allowFastTap && now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
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
    document.getElementById("player-name").textContent = state.player.name;
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
