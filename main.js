// ==== Packet Clicker MMO: Emoji UI, HUD Notify, Bar Fixes, Topbar Alignment ====

const DEFAULT_AVATAR = "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
const STORAGE_KEY = 'packet_clicker_save_v3';

const state = {
  player: {
    name: "Player",
    avatar: DEFAULT_AVATAR,
    sound: true,
    vipUntil: 0,
    noAds: false
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
  ads: true
};

const GEM_PACKS = [
  { id: 'small', label: '10 Gems', gems: 10, price: 0.99 },
  { id: 'medium', label: '60 Gems', gems: 60, price: 4.99 },
  { id: 'big', label: '150 Gems', gems: 150, price: 9.99 }
];
const SHOP_ITEMS = [
  { id: 'vip7', label: 'VIP 7 days', gems: 25, type: 'vip', days: 7, desc: 'Auto-collect, +25% earnings' },
  { id: 'vip30', label: 'VIP 30 days', gems: 60, type: 'vip', days: 30, desc: 'Auto-collect, +25% earnings' },
  { id: 'skinElite', label: 'Elite Skin', gems: 12, type: 'skin', avatar: 'EliteHacker', desc: 'Unlocks Elite avatar' },
  { id: 'noAds', label: 'Remove Ads', gems: 16, type: 'noAds', desc: 'No ads forever' }
];

const ACHIEVEMENTS = [
  { id: "start", name: "Getting Started", emoji: "🟢", desc: "Send your first Packet!", req: s => s.packets >= 1, gem: 1 },
  { id: "100packets", name: "Packet Handler", emoji: "📦", desc: "Reach 100 Packets", req: s => s.packets >= 100, gem: 1 },
  { id: "1kgems", name: "Gem Collector", emoji: "💎", desc: "Earn 10 Gems", req: s => s.gems >= 10, gem: 2 },
  { id: "click10", name: "Fast Clicker", emoji: "👆", desc: "Upgrade Click Power 10x", req: s => s.upgrades.click >= 10, gem: 1 },
  { id: "idle10", name: "Idler", emoji: "🤖", desc: "Upgrade Idle Power 10x", req: s => s.upgrades.idle >= 10, gem: 1 },
  { id: "crit1", name: "Critical!", emoji: "✨", desc: "Unlock Critical Hits", req: s => s.upgrades.crit >= 1, gem: 1 },
  { id: "shopSkin", name: "Elite!", emoji: "😎", desc: "Buy the Elite skin", req: s => s.shop.skinBought, gem: 2 },
  { id: "vip", name: "VIP Status", emoji: "👑", desc: "Activate VIP", req: s => isVIP(), gem: 3 },
  { id: "adfree", name: "Ad Free!", emoji: "🚫", desc: "Remove Ads", req: s => state.player.noAds, gem: 1 }
];

function getUnlockedAvatars() {
  let avatars = [{ seed: "Hacker", name: "Default" }];
  if (state.shop.skinBought) avatars.push({ seed: "EliteHacker", name: "Elite" });
  if (state.achievements.includes('vip')) avatars.push({ seed: "VIP", name: "VIP" });
  if (state.achievements.includes('adfree')) avatars.push({ seed: "AdFree", name: "Ad-Free" });
  return avatars;
}

function isSaveValid(data) {
  if (!data) return false;
  if (!data.player || typeof data.player.name !== 'string' || typeof data.player.avatar !== 'string') return false;
  if (typeof data.packets !== 'number' || typeof data.perClick !== 'number' || typeof data.perSec !== 'number') return false;
  if (!data.upgrades || typeof data.upgrades.click !== 'number' || typeof data.upgrades.idle !== 'number') return false;
  return true;
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
  let d = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (!isSaveValid(d)) {
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, {
      player: { name: "Player", avatar: DEFAULT_AVATAR, sound: true, vipUntil: 0, noAds: false },
      packets: 0, perClick: 1, perSec: 0, critChance: 0, critMult: 2,
      upgrades: { click: 0, idle: 0, crit: 0 },
      gems: 0, shop: { skinBought: false }, achievements: [], ads: true
    });
    setTimeout(() => showModal("Game Updated", "Old save was incompatible and has been reset.<br>Enjoy the new version!"), 700);
    return;
  }
  Object.assign(state, d);
  if (!state.player.vipUntil) state.player.vipUntil = 0;
  if (state.player.noAds === undefined) state.player.noAds = false;
  if (typeof state.gems !== "number") state.gems = 0;
}

// =============== TABS & UI RENDERING ===============
let activeTab = 'game';
function setTab(tab) {
  if (activeTab !== tab) { activeTab = tab; renderTab(); }
}
function renderTab() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
  document.getElementById('tab-content').innerHTML = getTabContent(activeTab);
  bindTabEvents(activeTab);
  updateTopBar();
}

function getTabContent(tab) {
  switch(tab) {
    case 'game': return renderGame();
    case 'upgrades': return renderUpgrades();
    case 'achievements': return renderAchievements();
    case 'shop': return renderShop();
    case 'leaderboard': return renderLeaderboard();
    default: return '';
  }
}

// ======= TOP BAR UPDATE & ALIGNMENT =======
function updateTopBar() {
  document.getElementById('player-name').textContent = state.player.name;
  document.getElementById('avatar').src = state.player.avatar;
  // VIP badge and packets next to player name, aligned
  let badge = document.getElementById('vip-badge');
  let packets = `<span class="ml-2 text-neon-green font-bold" id="packets-bar" style="font-size:1em;display:inline-block;min-width:65px;text-align:right;">📦 ${state.packets.toLocaleString()}</span>`;
  if (isVIP()) {
    let ms = state.player.vipUntil - Date.now();
    let days = Math.floor(ms / (1000*60*60*24));
    let hours = Math.floor((ms / (1000*60*60)) % 24);
    badge.innerHTML = `<span class="font-bold text-yellow-400 ml-2">👑 VIP ${days>0?days+"d ":""}${hours}h</span>${packets}`;
  } else {
    badge.innerHTML = packets;
  }
  // Update gems
  let el = document.getElementById('gem-count');
  if (el) el.textContent = state.gems;
}

// =============== GAME PANEL ===============
function renderGame() {
  return `
    <div class="neon-card flex flex-col items-center justify-center px-3 py-5 mb-5">
      <button id="click-btn" class="neon-btn mt-1 text-lg px-8 py-4 font-bold tracking-wide mb-4">${isVIP() ? "💎" : ""}Send Packet</button>
      <div>
        <span class="font-bold text-lg">📦 Packets:</span>
        <span id="packet-count" class="font-mono text-2xl text-neon-cyan ml-2">${state.packets}</span>
      </div>
      <div class="mt-2 text-base">
        <span class="text-neon-cyan">+${state.perClick} per click</span> &nbsp;|&nbsp;
        <span class="text-neon-green">+${state.perSec} / sec</span>
        <span class="ml-3 text-neon-yellow" title="Critical Hit Chance">Crit: ${state.critChance || 0}%</span>
        ${isVIP() ? `<div class="mt-2 text-gem font-bold">VIP Bonus Active</div>` : ""}
      </div>
      ${showAdBanner()}
    </div>
  `;
}

// =============== UPGRADES PANEL ===============
function renderUpgrades() {
  return `
    <div class="neon-card flex flex-col gap-4 px-3 py-4 mb-3">
      <h2 class="tab-title">🛠️ Upgrades</h2>
      <button id="upgrade-click" class="upgrade-btn">+1/click — <span>${upgradeCost('click')}</span> 🟡</button>
      <button id="upgrade-idle" class="upgrade-btn">+1/sec — <span>${upgradeCost('idle')}</span> 🟡</button>
      <button id="upgrade-crit" class="upgrade-btn">+2% crit — <span>${upgradeCost('crit')}</span> 🟡</button>
      <div class="text-neon-gray text-xs mt-1">
        Each upgrade increases cost. <span class="text-neon-yellow">Critical Hits</span> give 2x per click!
      </div>
    </div>
  `;
}
function upgradeCost(type) {
  switch(type) {
    case 'click': return 10 + Math.floor(state.upgrades.click * 13.5);
    case 'idle':  return 25 + Math.floor(state.upgrades.idle * 18.2);
    case 'crit':  return 40 + Math.floor(state.upgrades.crit * 27.1);
    default: return 0;
  }
}

// =============== HUD NOTIFICATION ===============
function showHudNotify(msg, icon="✨") {
  let hud = document.createElement('div');
  hud.className = "hud-notify";
  hud.innerHTML = `<span style="font-size:1.3em;">${icon}</span> <span>${msg}</span>`;
  document.body.appendChild(hud);
  setTimeout(()=>hud.classList.add('active'), 60);
  setTimeout(()=>hud.classList.remove('active'), 2100);
  setTimeout(()=>hud.remove(), 2600);
}

// --- Add to style.css (but this is here for safety, you can move it to CSS file)
if (!document.getElementById("hud-notify-style")) {
  let style = document.createElement("style");
  style.id = "hud-notify-style";
  style.innerHTML = `
  .hud-notify {
    position: fixed;
    top: 19px;
    left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: linear-gradient(90deg,#232e39 60%,#1de9b6 130%);
    color: #e6fafc;
    border: 2px solid #1de9b6;
    box-shadow: 0 4px 20px #1de9b688,0 0 2px #f7cf5c;
    border-radius: 13px;
    font-size: 1.08em;
    font-family: 'Share Tech Mono', monospace;
    padding: 12px 28px;
    opacity: 0;
    pointer-events: none;
    z-index: 1111;
    transition: opacity .3s,transform .32s;
    text-align:center;
    letter-spacing:.01em;
    font-weight:700;
  }
  .hud-notify.active {
    opacity: 0.98;
    transform: translateX(-50%) scale(1.02);
  }
  `;
  document.head.appendChild(style);
}

// =============== ACHIEVEMENTS PANEL ===============
function renderAchievements() {
  let achList = ACHIEVEMENTS.map(ach => {
    let unlocked = state.achievements.includes(ach.id);
    return `<li class="achievement-badge${unlocked ? " unlocked" : ""}">
      <span class="emoji">${ach.emoji}</span>
      <div>
        <span class="font-bold">${ach.name}</span>
        <div class="desc">${ach.desc}</div>
      </div>
      ${ach.gem ? `<span class="achievement-gem-reward">${unlocked ? "✓" : "+"+ach.gem} 💎</span>` : ""}
    </li>`;
  }).join('');
  return `
    <div class="neon-card px-3 py-5">
      <h2 class="tab-title">🎯 Achievements</h2>
      <ul class="mt-3">${achList}</ul>
    </div>
  `;
}

// =============== SHOP PANEL ===============
function renderShop() {
  let gemStore = GEM_PACKS.map(p =>
    `<button class="gem-btn w-full mb-2" data-gem-pack="${p.id}">Buy ${p.label} - $${p.price.toFixed(2)}</button>`
  ).join('');
  let items = SHOP_ITEMS.map(item => {
    let owned = (item.type==='vip' && isVIP()) ||
      (item.type==='skin' && state.shop.skinBought) ||
      (item.type==='noAds' && state.player.noAds);
    let label = owned ? "✓ Owned" : (item.label + ` - ${item.gems} 💎`);
    return `<button class="gem-btn w-full mb-2" data-shop-item="${item.id}" ${owned ? "disabled" : ""}>
      ${label}
      <div class="text-xs text-neon-gray">${item.desc}</div>
    </button>`;
  }).join('');
  let adBtn = (!state.player.noAds && state.ads)
    ? `<button id="watch-ad-btn" class="neon-btn w-full mb-2">Watch Ad (simulate)</button>`
    : "";
  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title">🏬 Shop</h2>
      <div class="mb-2"><span class="text-neon-yellow font-bold">Buy Gems</span></div>
      ${gemStore}
      <hr class="my-3 border-[#1de9b6]">
      <div class="mb-2"><span class="text-neon-yellow font-bold">Spend Gems</span></div>
      ${items}
      ${adBtn}
      ${showAdBanner()}
    </div>
  `;
}

// =============== LEADERBOARD PANEL ===============
function renderLeaderboard() {
  let bots = generateBots(8);
  bots.push({ name: state.player.name, packets: state.packets, avatar: state.player.avatar });
  bots.sort((a,b) => b.packets - a.packets);
  let html = bots.slice(0, 10).map((p, idx) => `
    <li class="flex gap-3 items-center py-2">
      <span class="w-8 text-right text-neon-yellow font-bold">${idx+1}.</span>
      <img src="${p.avatar || DEFAULT_AVATAR}" class="w-8 h-8 rounded-full border border-[#1df7b7]" alt="">
      <span class="font-semibold">${p.name === state.player.name ? "You" : p.name}</span>
      <span class="ml-auto font-mono">${p.packets.toLocaleString()}</span>
    </li>
  `).join('');
  return `<div class="neon-card px-2 py-4">
    <h2 class="tab-title">🏆 Leaderboard</h2>
    <ul id="leaderboard">${html}</ul>
  </div>`;
}

// =============== AVATARS ===============
function showEditProfile() {
  let avatars = getUnlockedAvatars();
  let currentSeed = state.player.avatar.split("seed=")[1]?.split("&")[0] || "Hacker";
  let avatarList = avatars.map(a => `
    <div class="avatar-choice${a.seed === currentSeed ? ' selected' : ''}" data-seed="${a.seed}">
      <img src="https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${a.seed}" alt="${a.name}" />
      <div class="avatar-name">${a.name}</div>
    </div>
  `).join('');
  showModal("Edit Profile", `
    <form id="profile-form">
      <label class="block mb-3">
        <span class="block mb-1 font-semibold">Name:</span>
        <input type="text" id="profile-name" value="${state.player.name}" maxlength="14" class="w-full px-2 py-1 rounded bg-gray-800 border border-[#1de9b6] text-neon-cyan"/>
      </label>
      <div class="mb-2">
        <span class="block mb-1 font-semibold">Avatar:</span>
        <div class="avatar-choice-row">${avatarList}</div>
      </div>
      <div class="mt-4 flex justify-center">
        <button type="submit" class="neon-btn w-full">Save</button>
      </div>
    </form>
  `);
  document.querySelectorAll('.avatar-choice').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.avatar-choice').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    };
  });
  document.getElementById('profile-form').onsubmit = function(e){
    e.preventDefault();
    let newName = document.getElementById('profile-name').value.trim();
    let selected = document.querySelector('.avatar-choice.selected')?.getAttribute('data-seed') || "Hacker";
    if(newName) state.player.name = newName.slice(0,14);
    state.player.avatar = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(selected)}`;
    save();
    updateTopBar();
    renderTab();
    closeModal();
  };
}

// =============== SETTINGS ===============
function showSettings() {
  showModal("Settings", `
    <label class="flex items-center mb-2">
      <input type="checkbox" id="setting-sound" ${state.player.sound ? "checked" : ""}/>
      <span class="ml-2">Game Sound Effects</span>
    </label>
    <button id="edit-profile-inside" class="neon-btn w-full mb-3">Edit Profile</button>
    <div class="text-xs text-neon-gray mt-1">All progress is saved locally.<br>For mobile, use Store in-app for real gems/ads!</div>
  `);
  document.getElementById('setting-sound').onchange = function(){
    state.player.sound = this.checked; save();
  };
  document.getElementById('edit-profile-inside').onclick = function() {
    closeModal(); setTimeout(showEditProfile, 180);
  }
}

// =============== GAME LOGIC ===============
function clickPacket() {
  let bonus = isVIP() ? 1.25 : 1;
  let crit = Math.random() < state.critChance/100;
  let amount = Math.floor(state.perClick * (crit ? state.critMult : 1) * bonus);
  state.packets += amount;
  if (crit && state.player.sound) playSound('crit');
  else if (state.player.sound) playSound('click');
  save(); updateTopBar(); renderTab(); checkAchievements();
}
function upgrade(type) {
  let cost = upgradeCost(type);
  if (state.packets < cost) return;
  state.packets -= cost; state.upgrades[type]++;
  switch(type) {
    case 'click': state.perClick++; break;
    case 'idle': state.perSec++; break;
    case 'crit': state.critChance += 2; break;
  }
  if (state.player.sound) playSound('upgrade');
  save(); updateTopBar(); renderTab(); checkAchievements();
  showHudNotify("Upgrade purchased!", "🛠️");
}
function idleTick() {
  let bonus = isVIP() ? 1.25 : 1;
  if (state.perSec > 0) {
    state.packets += Math.floor(state.perSec * bonus);
    save(); updateTopBar();
    if (activeTab === 'game') renderTab();
    checkAchievements();
  }
}
function isVIP() { return Date.now() < state.player.vipUntil; }

// =============== SHOP ACTIONS ===============
function buyGemPack(packId) {
  let pack = GEM_PACKS.find(x=>x.id===packId);
  if (!pack) return;
  state.gems += pack.gems;
  showModal("Thank You!", `You received <b>${pack.gems} 💎</b>!<br>Implement real payments for store publishing.`);
  save(); updateTopBar(); renderTab(); checkAchievements();
  showHudNotify(`+${pack.gems} 💎 (test)`, "💎");
}
function buyShopItem(itemId) {
  let item = SHOP_ITEMS.find(x=>x.id===itemId);
  if (!item || state.gems < item.gems) return;
  if (item.type === 'vip') {
    let now = Date.now();
    if (!isVIP() || state.player.vipUntil < now) state.player.vipUntil = now;
    state.player.vipUntil += item.days * 86400 * 1000;
  }
  if (item.type === 'skin') state.shop.skinBought = true;
  if (item.type === 'noAds') { state.player.noAds = true; state.ads = false; }
  state.gems -= item.gems;
  save(); updateTopBar(); renderTab(); checkAchievements();
  showHudNotify(`Purchased: ${item.label}`, item.type === 'vip' ? "👑" : item.type === 'skin' ? "😎" : item.type === 'noAds' ? "🚫" : "💎");
}
function watchAd() {
  showModal("Ad watched!", "Simulate ad with SDK for monetization.");
}

// =============== ACHIEVEMENTS LOGIC ===============
function checkAchievements() {
  for (let ach of ACHIEVEMENTS) {
    if (!state.achievements.includes(ach.id) && ach.req(state)) {
      state.achievements.push(ach.id);
      if (ach.gem) {
        state.gems += ach.gem;
        save(); updateTopBar();
        showModal("Achievement!", `You unlocked <b>${ach.name}</b>!<br>${ach.desc}<br>+${ach.gem} 💎`);
        showHudNotify(`Achievement: ${ach.name} +${ach.gem} 💎`, ach.emoji);
      } else {
        showModal("Achievement!", `You unlocked <b>${ach.name}</b>!<br>${ach.desc}`);
        showHudNotify(`Achievement: ${ach.name}`, ach.emoji);
      }
      save();
    }
  }
}

// =============== MODAL / FEEDBACK ===============
function showModal(title, html) {
  document.getElementById('modal-backdrop').classList.remove('hidden');
  let box = document.getElementById('modal');
  box.classList.remove('hidden');
  box.innerHTML = `<h2 class="text-neon-cyan mb-2 text-lg">${title}</h2>
    <div>${html}</div>
    <button onclick="closeModal()" class="mt-5 neon-btn w-full">Close</button>
  `;
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById('modal').classList.add('hidden');
}
window.closeModal = closeModal;

// =============== SOUND FX ===============
function playSound(type) {
  let url;
  switch(type) {
    case 'click': url = 'https://cdn.jsdelivr.net/gh/vikern/gamesfx/click1.mp3'; break;
    case 'crit': url = 'https://cdn.jsdelivr.net/gh/vikern/gamesfx/crit.mp3'; break;
    case 'upgrade': url = 'https://cdn.jsdelivr.net/gh/vikern/gamesfx/upgrade.mp3'; break;
    case 'achievement': url = 'https://cdn.jsdelivr.net/gh/vikern/gamesfx/achieve.mp3'; break;
    case 'shop': url = 'https://cdn.jsdelivr.net/gh/vikern/gamesfx/coin.mp3'; break;
  }
  if(url) new Audio(url).play();
}

// =============== AD BANNER / SIMULATION ===============
function showAdBanner() {
  return (!state.player.noAds && state.ads) ?
    `<div class="mt-3 mb-1 text-center"><span class="inline-block px-4 py-2 bg-yellow-300 text-[#222c38] rounded font-bold" style="font-size:1em;box-shadow:0 2px 12px #faffc4a0">Ad Banner (Remove in Shop)</span></div>`
    : '';
}

// =============== BOTS / LEADERBOARD ===============
function randomName() {
  const names = ['BitWiz', 'ZeroCool', 'Glitcher', 'Nyx', 'CyberBat', 'Hexa', 'GhostShell', 'V4mpw0L', 'Cipher', 'Spectre', 'Echo', 'Trace', 'Pix3l', 'Nexus', 'Havoc', 'BotNet'];
  return names[Math.floor(Math.random() * names.length)];
}
function generateBots(n=6) {
  let bots = [];
  for (let i = 0; i < n; i++) {
    let base = Math.floor(Math.random() * 3500 + 250);
    bots.push({
      name: randomName(),
      packets: base + Math.floor(Math.random() * 2100),
      avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${randomName()}`
    });
  }
  return bots;
}

// =============== UI BINDING ===============
function bindTabEvents(tab) {
  if (tab === 'game') {
    let btn = document.getElementById('click-btn');
    if (btn) btn.onclick = clickPacket;
  }
  if (tab === 'upgrades') {
    let uc = document.getElementById('upgrade-click');
    if (uc) uc.onclick = ()=>upgrade('click');
    let ui = document.getElementById('upgrade-idle');
    if (ui) ui.onclick = ()=>upgrade('idle');
    let ucr = document.getElementById('upgrade-crit');
    if (ucr) ucr.onclick = ()=>upgrade('crit');
  }
  if (tab === 'shop') {
    document.querySelectorAll('[data-gem-pack]').forEach(btn =>
      btn.onclick = ()=>buyGemPack(btn.getAttribute('data-gem-pack'))
    );
    document.querySelectorAll('[data-shop-item]').forEach(btn =>
      btn.onclick = ()=>buyShopItem(btn.getAttribute('data-shop-item'))
    );
    let adbtn = document.getElementById('watch-ad-btn');
    if (adbtn) adbtn.onclick = watchAd;
  }
}

function isVIP() { return Date.now() < state.player.vipUntil; }

// =============== INIT ===============
function init() {
  load();
  updateTopBar();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });
  document.getElementById('open-settings').onclick = showSettings;
  document.getElementById('modal-backdrop').onclick = closeModal;
  setInterval(idleTick, 1000);
  setInterval(save, 10000);
  renderTab();
  checkAchievements();
}
window.onload = init;
