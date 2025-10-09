import { DEFAULT_AVATAR, STORAGE_KEY, state, ACHIEVEMENTS } from "../data/gameData.js";
import { isVIP } from "../logic/gameLogic.js"; // Temporarily assume isVIP is here for initial migration

function getUnlockedAvatars() {
  let avatars = [{ seed: "Hacker", name: "Default" }];
  if (state.shop.skinBought)
    avatars.push({ seed: "EliteHacker", name: "Elite" });
  // Note: the original 'vip' and 'adfree' achievements unlock avatars based on the achievement ID
  // For now, we'll keep the direct check. If the achievement system changes, this might need adjustment.
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

function load(showModal) { // showModal is passed as a dependency now
  let d;
  try {
    d = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    console.error("Failed to parse save data:", e);
    localStorage.removeItem(STORAGE_KEY); // Clear potentially corrupted data
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
  // Manual migrations for new properties
  if (!state.player.vipUntil) state.player.vipUntil = 0;
  if (state.player.noAds === undefined) state.player.noAds = false;
  if (typeof state.gems !== "number") state.gems = 0;
}

function playSound(type) {
  let url;
  if (!state.player.sound) return; // Only play if sound is enabled
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

function showAdBanner() {
  return !state.player.noAds && state.ads
    ? `<div class=\"mt-3 mb-1 text-center\"><span class=\"inline-block px-4 py-2 bg-yellow-300 text-[#222c38] rounded font-bold\" style=\"font-size:1em;box-shadow:0 2px 12px #faffc4a0\">Ad Banner (Remove in Shop)</span></div>`
    : "";
}

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

export {
  getUnlockedAvatars,
  isSaveValid,
  save,
  load,
  playSound,
  showAdBanner,
  randomName,
  generateBots,
};
