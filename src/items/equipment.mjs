/**
 * src/items/equipment.mjs
 *
 * Modular equipment system (data, utils, UI) that is:
 * - Self-contained (pure ESM) and DOM-guarded
 * - Non-breaking (no automatic mutations at import time)
 * - Integrates with existing global state shape when used
 *
 * Exports:
 *  - ensureStateShape(state)
 *  - computeBonuses(state)
 *  - rollDrop(state, opts?)
 *  - awardDrop(state, item, opts?)
 *  - maybeDropOnClick(state, opts?)
 *  - renderTab(state)
 *  - bindEvents(root, { state, save, rerender, notify? })
 *  - equip(state, index, slot)
 *  - unequip(state, slot)
 *
 * Optional global attachment:
 *  window.Packet.items.equipment = Equipment API (if window exists)
 */

/* --------------------------------- Utils --------------------------------- */

function hasDOM() {
  return typeof document !== "undefined" && typeof window !== "undefined";
}
function byId(id) {
  return hasDOM() ? document.getElementById(id) : null;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function rngBetween(min, max) {
  return Math.random() * (max - min) + min;
}
function pickWeighted(list, weightKey = "weight") {
  const total = list.reduce((a, x) => a + (x[weightKey] || 0), 0);
  if (total <= 0) return list[0];
  let roll = Math.random() * total;
  for (const x of list) {
    const w = x[weightKey] || 0;
    if (roll < w) return x;
    roll -= w;
  }
  return list[list.length - 1];
}

/* ------------------------------- Data model ------------------------------ */

/**
 * Slots are intentionally simple. We can add more (helmet, chest, etc.) later.
 */
export const SLOTS = [
  { id: "glove", name: "Glove" },
  { id: "trinket", name: "Trinket" },
];

/**
 * Rarity catalog: color codes align with your theme.
 * We keep weights conservative; adjust when tuning drop feel.
 */
export const RARITIES = [
  {
    id: "green",
    name: "Common",
    color: "#8ef1b2",
    weight: 70,
    border: "1px solid rgba(142,241,178,0.8)",
  },
  {
    id: "gold",
    name: "Rare",
    color: "#ffd34d",
    weight: 22,
    border: "1px solid rgba(255,211,77,0.9)",
  },
  {
    id: "blue",
    name: "Epic",
    color: "#6bd7e8",
    weight: 7,
    border: "1px solid rgba(107,215,232,0.9)",
  },
  {
    id: "pink",
    name: "Ultra",
    color: "#ff66cc",
    weight: 1,
    border: "1px solid rgba(255,102,204,0.95)",
  },
  {
    id: "animal",
    name: "Animal",
    color: "#ff3040",
    weight: 0.2,
    border: "1px solid rgba(255,48,64,1.0)",
  },
];

/**
 * Small, safe subset of your asset pool as starter item icons.
 * You can expand freely; the generator picks randomly here.
 */
export const ITEM_POOL = [
  {
    id: "data-ring",
    name: "Data Ring",
    slot: "trinket",
    icon: "src/assets/items/Ac_Ring01.png",
  },
  {
    id: "quantum-boots",
    name: "Quantum Boots",
    slot: "glove",
    icon: "src/assets/items/A_Shoes01.png",
  },
  {
    id: "packet-blade",
    name: "Packet Blade",
    slot: "trinket",
    icon: "src/assets/items/W_Sword001.png",
  },
  {
    id: "lucky-charm",
    name: "Lucky Charm",
    slot: "trinket",
    icon: "src/assets/items/I_Clover.png",
  },
  {
    id: "core-shard",
    name: "Core Shard",
    slot: "trinket",
    icon: "src/assets/items/I_Diamond.png",
  },
  {
    id: "neon-torch",
    name: "Neon Torch",
    slot: "trinket",
    icon: "src/assets/items/I_Torch01.png",
  },
];

/* ----------------------------- State scaffolds ---------------------------- */

/**
 * Ensure inventory/equipment containers exist on a given state.
 * Adds no items; just shape.
 */
export function ensureStateShape(state) {
  if (!state || typeof state !== "object") return state;
  if (!Array.isArray(state.inventory)) state.inventory = [];
  if (!state.equipment || typeof state.equipment !== "object") {
    state.equipment = {};
  }
  for (const slot of SLOTS) {
    if (!(slot.id in state.equipment)) state.equipment[slot.id] = null;
  }
  return state;
}

/* --------------------------- Stat roll and merge -------------------------- */

function rarityById(id) {
  return RARITIES.find((r) => r.id === id) || RARITIES[0];
}

/**
 * Roll stats by rarity and slot.
 * Ranges are intentionally modest to keep early-game balanced.
 */
export function rollStatsFor(rarityId, slotId) {
  const r = rarityById(rarityId);
  const isHighTier = r.id === "blue" || r.id === "pink" || r.id === "animal";
  const isTopTier = r.id === "pink" || r.id === "animal";

  // Baselines
  let perClick = 1;
  let perSec = 0;
  let critChance = 0;

  // Slot bias (gloves = click-focused, trinkets = mixed)
  if (slotId === "glove") {
    perClick += isHighTier ? 1 : 0;
  } else if (slotId === "trinket") {
    perSec += isHighTier ? 1 : 0;
  }

  // Rarity scaling
  const multMap = { green: 1, gold: 2, blue: 3, pink: 4, animal: 6 };
  const m = multMap[r.id] || 1;

  // Randomize within stable bounds
  perClick = Math.floor(perClick + rngBetween(0, 1) * m);
  perSec = Math.floor(perSec + (isHighTier ? rngBetween(0, 1) * (m - 1) : 0));
  critChance =
    r.id === "gold" || isTopTier
      ? Math.floor(clamp(rngBetween(1, 2 * m), 1, 50))
      : 0;

  return { perClick, perSec, critChance };
}

/**
 * Compute aggregate stat bonuses from currently equipped items.
 */
export function computeBonuses(state) {
  ensureStateShape(state);
  const out = { perClick: 0, perSec: 0, critChance: 0 };
  for (const slot of SLOTS) {
    const it = state.equipment[slot.id];
    if (!it || !it.stats) continue;
    out.perClick += it.stats.perClick || 0;
    out.perSec += it.stats.perSec || 0;
    out.critChance += it.stats.critChance || 0;
  }
  return out;
}

/* --------------------------- Drop generation core ------------------------- */

/**
 * Create a new randomized equipment item (not persisted).
 */
export function rollDrop(state, opts = {}) {
  ensureStateShape(state);

  const rarity = opts.rarity || pickWeighted(RARITIES);
  // If a slot is suggested, try to respect it; else pick any valid slot for the chosen base item.
  const pool = ITEM_POOL.filter((x) =>
    opts.slot ? x.slot === opts.slot : true,
  );
  const base = pool[Math.floor(Math.random() * pool.length)] || ITEM_POOL[0];
  const stats = rollStatsFor(rarity.id, base.slot);

  return {
    id: "it_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6),
    name: base.name,
    icon: base.icon,
    slot: base.slot,
    rarity: rarity.id,
    rarityName: rarity.name,
    color: rarity.color,
    stats,
  };
}

/**
 * Add an item to inventory and optionally notify.
 */
export function awardDrop(state, item, opts = {}) {
  ensureStateShape(state);
  if (!item || typeof item !== "object") return false;

  const inv = Array.isArray(state.inventory)
    ? state.inventory
    : (state.inventory = []);
  const capacity = Number(state._invCapacity || 100);

  // Build notifier early (HUD or provided)
  const notify =
    typeof opts.notify === "function"
      ? opts.notify
      : hasDOM() && typeof window.showHudNotify === "function"
        ? window.showHudNotify
        : null;

  // Stack by id + rarity (same item goes x1, x2, x3 in one slot)
  const existing = inv.find(
    (it) => it && it.id === item.id && it.rarity === item.rarity,
  );

  if (existing) {
    // Always allow stacking even when capacity is "full" (doesn't consume a new slot)
    existing.q = Number(existing.q || 1) + 1;
  } else {
    // Enforce capacity for new stacks
    if (inv.length >= capacity) {
      // Inventory full: block the drop and notify
      if (hasDOM() && typeof window.showModal === "function") {
        window.showModal(
          "Inventory Full",
          `<div class="neon-card" style="padding:.75rem;">
            <div class="text-neon-gray mb-2">Your inventory is full (${inv.length}/${capacity}).</div>
            <div class="text-sm">Sell items or expand capacity to collect new drops.</div>
          </div>`,
        );
      } else if (notify) {
        notify("Inventory full!", "❗");
      }
      return false;
    }
    item.q = 1;
    inv.push(item);
  }

  if (typeof opts.save === "function") {
    try {
      opts.save();
    } catch {}
  }

  // Rich bordered toast for drops
  showDropToast(item, notify);

  return true;
}

/**
 * Simple on-click drop logic with tunable rate and pity.
 * - baseRate: baseline chance per click (default 1.5%)
 * - pity: every N clicks guarantees a drop (optional)
 */
export function maybeDropOnClick(state, opts = {}) {
  ensureStateShape(state);
  const baseRate = typeof opts.baseRate === "number" ? opts.baseRate : 0.015;

  // Optional pity counter on state (non-invasive)
  state._dropClicks = (state._dropClicks || 0) + 1;
  const pityEvery = typeof opts.pity === "number" ? opts.pity : 120;

  let roll = Math.random();
  const pityHit = pityEvery > 0 && state._dropClicks >= pityEvery;

  if (roll < baseRate || pityHit) {
    const item = rollDrop(state);
    const ok = awardDrop(state, item, opts);
    if (ok) {
      state._dropClicks = 0; // reset pity only when successfully awarded
      return item;
    } else {
      // Inventory full — awardDrop already notified; do not reset pity
      return null;
    }
  }
  return null;
}

/* ------------------------------- Equip flows ------------------------------ */

export function equip(state, index, slot) {
  ensureStateShape(state);
  const inv = state.inventory;
  if (!Array.isArray(inv)) return false;
  if (index < 0 || index >= inv.length) return false;
  const toEquip = inv[index];
  if (!toEquip || toEquip.slot !== slot) return false;

  const prev = state.equipment[slot] || null;

  // Support stacked inventory (q = quantity)
  const qty = Number(toEquip.q || 1);
  if (qty > 1) {
    // Decrement stack and equip a single instance (clone)
    toEquip.q = qty - 1;
    const inst = Object.assign({}, toEquip, { q: 1 });
    state.equipment[slot] = inst;
  } else {
    // Move single item to equipment
    state.equipment[slot] = toEquip;
    inv.splice(index, 1);
  }

  if (prev) inv.push(prev);
  return true;
}

export function unequip(state, slot) {
  ensureStateShape(state);
  const cur = state.equipment[slot];
  if (!cur) return false;
  state.inventory.push(cur);
  state.equipment[slot] = null;
  return true;
}

/* --------------------------------- UI HTML -------------------------------- */

function rarityStyles(rarityId) {
  const r = rarityById(rarityId);
  return {
    color: r.color,
    border: `1.5px solid ${r.color}`,
    glow: `0 0 10px ${r.color}55`,
  };
}

function slotHeaderHTML(item, slotName) {
  if (!item) {
    return `
      <div><strong>${slotName}</strong><div class="text-neon-gray text-xs">Empty</div></div>
      <button class="neon-btn text-xs opacity-75" disabled>Unequip</button>
    `;
  }
  const st = rarityStyles(item.rarity);
  return `
    <div style="display:flex; align-items:center; gap:.5rem;">
      <img src="${item.icon}" alt="${item.name}" style="width:38px;height:38px;border-radius:6px;border:${st.border};box-shadow:${st.glow};" />
      <div>
        <div style="font-weight:800; color:${st.color};">${item.name} <span style="font-size:.8em; opacity:.9;">(${item.rarityName})</span></div>
        <div class="text-neon-gray text-xs">+${item.stats.perClick || 0}/click, +${item.stats.perSec || 0}/sec, +${item.stats.critChance || 0}% crit</div>
      </div>
    </div>
    <button class="gem-btn text-xs" data-unequip-slot>Unequip</button>
  `;
}

/**
 * Render Equipment tab content as string HTML (no side-effects).
 */
export function renderTab(state) {
  ensureStateShape(state);

  const slotCards = SLOTS.map((s) => {
    const it = state.equipment[s.id];
    const st = it ? rarityStyles(it.rarity) : null;
    return `
      <div class="neon-card" data-eq-slot="${s.id}" style="padding:0.6rem; display:flex; align-items:center; justify-content:space-between; width:100%; max-width:100%; margin:0; ${st ? `border-color:${st.color};` : "background: linear-gradient(135deg, #1a222a, #202a35); border-color: #334455; filter: grayscale(0.25);"}">
        ${slotHeaderHTML(it, s.name)}
      </div>
    `;
  }).join("");

  const PAGE_SIZE = 25;
  // Inventory capacity (default 100), persisted on state
  const capacity = Number(state._invCapacity || 100);
  state._invCapacity = capacity;
  const totalItems = state.inventory.length;
  const maxPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  state._invPage = Math.max(0, Math.min(state._invPage || 0, maxPages - 1));
  const page = state._invPage;
  const start = page * PAGE_SIZE;
  const items = state.inventory.slice(start, start + PAGE_SIZE);
  const percent = Math.min(100, (totalItems / capacity) * 100).toFixed(0);

  const itemCells = items
    .map((it, i) => {
      const st = rarityStyles(it.rarity);
      const absIndex = start + i;
      return `
          <div class="neon-card" style="padding:.3rem; border-color:${st.color}; box-shadow:${st.glow}; display:flex; align-items:center; justify-content:center; width:100%; max-width:100%; margin:0; aspect-ratio:1/1;">
            <button class="neon-btn" data-open-item-index="${absIndex}" style="width:100%; height:100%; background: transparent; border:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.2rem; padding:.2rem;">
              <div style="position:relative; display:inline-block; width:72%; height:72%;">
                <img src="${it.icon}" alt="${it.name}" style="width:100%;height:100%;border-radius:6px;border:${st.border};box-shadow:${st.glow}; box-sizing:border-box; object-fit:cover;" />
                <span style="position:absolute; bottom:2px; right:2px; background: rgba(0,0,0,0.6); border:1px solid var(--border-color); border-radius:10px; padding:0 6px; font-size:.7rem; font-weight:800; color:${st.color};">x${it.q || 1}</span>
              </div>
              <div style="font-size:.7rem; font-weight:700; color:${st.color}; text-align:center; line-height:1;">${it.rarityName}</div>
            </button>
          </div>`;
    })
    .join("");

  const placeholderCount = Math.max(0, PAGE_SIZE - items.length);
  const placeholderCells = Array.from({ length: placeholderCount })
    .map(
      () => `
          <div class="neon-card" style="padding:.3rem; border-color:#2a3a46; box-shadow: none; display:flex; align-items:center; justify-content:center; width:100%; max-width:100%; margin:0; aspect-ratio:1/1; background: linear-gradient(135deg, #1a222a, #202a35);">
            <div style="width:72%; height:72%; border:1.5px dashed var(--border-color); border-radius:6px; box-sizing:border-box; opacity:.35;"></div>
          </div>`,
    )
    .join("");

  const gridHtml = itemCells + placeholderCells;

  const pagerHtml =
    maxPages > 1
      ? `
      <div class="inv-pager" style="display:flex; align-items:center; justify-content:center; gap:.5rem; margin-top:.5rem;">
        <button class="neon-btn text-xs" data-inv-page="${Math.max(0, page - 1)}" ${page === 0 ? "disabled" : ""}>Prev</button>
        <span class="text-neon-gray text-xs">Page ${page + 1} / ${maxPages}</span>
        <button class="neon-btn text-xs" data-inv-page="${Math.min(maxPages - 1, page + 1)}" ${page >= maxPages - 1 ? "disabled" : ""}>Next</button>
      </div>`
      : "";

  const invCards =
    totalItems === 0
      ? `<div class="text-neon-gray text-xs">No items yet. Keep clicking!</div>`
      : `
        <div class="inv-grid" style="display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .5rem; padding: .5rem; box-sizing: border-box; width: 100%;">
          ${gridHtml}
        </div>
        ${pagerHtml}
      `;

  return `
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🧰 Equipment</h2>
      <div class="text-neon-gray text-sm mb-3">Equip items to gain bonuses. Rarity colors:
        <span style="color:${rarityById("green").color}">Green</span>,
        <span style="color:${rarityById("gold").color}">Gold</span>,
        <span style="color:${rarityById("blue").color}">Blue</span>,
        <span style="color:${rarityById("pink").color}">Pink</span>,
        <span style="color:${rarityById("animal").color}">Red</span>.
      </div>
      <div class="space-y-2">${slotCards}</div>
      <div class="text-neon-gray text-sm mt-3 mb-1" style="display:flex; align-items:center; gap:.5rem;">
        <span>Inventory</span>
        <span class="text-xs" style="opacity:.85;">${Math.min(totalItems, capacity)}/${capacity}</span>
      </div>
      <div style="position:relative; height:10px; border-radius:999px; background:#22313f; border:1px solid var(--border-color); overflow:hidden; box-shadow: inset 0 1px 6px rgba(0,0,0,.5); margin-bottom:.25rem;">
        <div style="height:100%; width:${percent}%; background: linear-gradient(90deg, var(--secondary-color), var(--primary-color));"></div>
      </div>
      <div class="text-neon-gray text-xs" style="text-align:center; margin-bottom:.5rem;">${percent}%</div>
      ${invCards}
    </div>
  `;
}

/* ----------------------------- Event bind helper -------------------------- */

/**
 * Bind equip/unequip button handlers within a root element (or document).
 * rerender: function to rerender the active tab (e.g., renderTab())
 * notify: optional toast function(msg, icon) (falls back to HUD notify)
 */
export function bindEvents(root, { state, save, rerender, notify } = {}) {
  const el = root || (hasDOM() ? document : null);
  if (!el) return;
  ensureStateShape(state);

  // Open item modal from inventory
  (el.querySelectorAll("[data-open-item-index]") || []).forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(
        btn.getAttribute("data-open-item-index") || "-1",
        10,
      );
      const item = (state.inventory || [])[idx];
      if (!item) return;

      // Simple rarity-based sell price
      const priceMap = {
        green: 25,
        gold: 100,
        blue: 500,
        pink: 2500,
        animal: 10000,
      };
      const price = priceMap[item.rarity] || 10;

      const st = rarityStyles(item.rarity);
      const html = `
        <div class="neon-card" style="padding:.75rem; border-color:${st.color}; box-shadow:${st.glow};">
          <div style="display:flex; gap:.6rem; align-items:center;">
            <img src="${item.icon}" alt="${item.name}" style="width:64px;height:64px;border-radius:8px;border:${st.border};box-shadow:${st.glow}; object-fit:cover;" />
            <div>
              <div style="font-weight:900; color:${st.color};">${item.name} <span style="font-size:.85em; opacity:.9;">(${item.rarityName})</span></div>
              <div class="text-neon-gray text-sm">+${item.stats.perClick || 0}/click, +${item.stats.perSec || 0}/sec, +${item.stats.critChance || 0}% crit</div>
              <div class="text-neon-gray text-xs">Qty: ${item.q || 1}</div>
            </div>
          </div>
          <div class="button-group" style="display:flex; gap:.5rem; margin-top:.75rem;">
            <button class="neon-btn w-full" id="equip-item-btn" data-index="${idx}">Equip</button>
            <button class="gem-btn w-full" id="sell-item-btn" data-index="${idx}">Sell for ${price} <span class="icon-packet"></span></button>
          </div>
        </div>
      `;
      if (typeof window.showModal === "function") {
        window.showModal("Item", html);
        // Bind modal action buttons
        setTimeout(() => {
          const eq = document.getElementById("equip-item-btn");
          const sell = document.getElementById("sell-item-btn");

          if (eq)
            eq.onclick = () => {
              const i = parseInt(eq.getAttribute("data-index") || "-1", 10);
              const it = (state.inventory || [])[i];
              if (!it) return;
              if (equip(state, i, it.slot)) {
                if (typeof save === "function") save();
                if (typeof rerender === "function") rerender();
                if (typeof window.closeModal === "function")
                  window.closeModal();
                const n =
                  notify ||
                  (hasDOM() && typeof window.showHudNotify === "function"
                    ? window.showHudNotify
                    : null);
                if (n) n("Equipped!", "🧰");
              }
            };

          if (sell)
            sell.onclick = () => {
              const i = parseInt(sell.getAttribute("data-index") || "-1", 10);
              const it = (state.inventory || [])[i];
              if (!it) return;
              const payout = priceMap[it.rarity] || 10;
              try {
                const invItem = state.inventory[i];
                if (invItem && Number(invItem.q || 1) > 1) {
                  invItem.q = Number(invItem.q || 1) - 1;
                } else {
                  state.inventory.splice(i, 1);
                }
                state.packets = (state.packets || 0) + payout;
              } catch (_) {}
              if (typeof save === "function") save();
              if (typeof rerender === "function") rerender();
              if (typeof window.closeModal === "function") window.closeModal();
              const n =
                notify ||
                (hasDOM() && typeof window.showHudNotify === "function"
                  ? window.showHudNotify
                  : null);
              if (n)
                n(`+${payout} packets`, '<span class="icon-packet"></span>');
            };
        }, 0);
      }
    });
  });

  // Unequip on each slot card
  (el.querySelectorAll("[data-eq-slot]") || []).forEach((card) => {
    const slot = card.getAttribute("data-eq-slot");
    const btn = card.querySelector("[data-unequip-slot]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (unequip(state, slot)) {
        if (typeof save === "function") save();
        if (typeof rerender === "function") rerender();
      }
    });
  });

  // Inventory paging
  (el.querySelectorAll("[data-inv-page]") || []).forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = parseInt(btn.getAttribute("data-inv-page") || "0", 10);
      state._invPage = Math.max(0, p);
      if (typeof rerender === "function") rerender();
    });
  });
}

/* --------------------------- Drop notification UI ------------------------- */

function ensureToastStyles() {
  if (!hasDOM()) return;
  if (document.getElementById("equip-drop-toast-style")) return;
  const st = document.createElement("style");
  st.id = "equip-drop-toast-style";
  st.textContent = `
  .drop-toast {
    position: fixed;
    top: 10%;
    left: 50%;
    transform: translate(-50%, 0);
    z-index: 2050;
    pointer-events: none;
    opacity: 0;
    transition: opacity 180ms ease, transform 180ms ease;
  }
  .drop-toast .card {
    display: flex;
    align-items: center;
    gap: .6rem;
    padding: .5rem .7rem;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--bg-secondary, #1b2431), var(--bg-card, #131a24));
    box-shadow: 0 6px 22px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08);
  }
  .drop-toast.active { opacity: .98; transform: translate(-50%, -4px); }
  `;
  document.head && document.head.appendChild(st);
}

function showDropToast(item, fallbackNotify) {
  if (!hasDOM()) {
    if (fallbackNotify)
      fallbackNotify(`Found ${item.rarityName} ${item.name}!`, "🎁");
    return;
  }
  ensureToastStyles();
  // Remove old
  document.querySelectorAll(".drop-toast").forEach((n) => n.remove());

  const st = rarityStyles(item.rarity);
  const toast = document.createElement("div");
  toast.className = "drop-toast";
  toast.innerHTML = `
    <div class="card" style="border:${st.border}; box-shadow:${st.glow}, 0 6px 22px rgba(0,0,0,0.35);">
      <img src="${item.icon}" alt="${item.name}" style="width:36px;height:36px;border-radius:6px;border:${st.border};box-shadow:${st.glow}" />
      <div>
        <div style="font-weight:900; color:${st.color};">+ ${item.rarityName} Drop</div>
        <div class="text-neon-gray text-xs">${item.name} — +${item.stats.perClick}/click, +${item.stats.perSec}/sec, +${item.stats.critChance}% crit</div>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("active"));
  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => toast.remove(), 260);
  }, 2000);
}

/* --------------------------- Public API aggregate ------------------------- */

export const Equipment = {
  SLOTS,
  RARITIES,
  ITEM_POOL,
  ensureStateShape,
  rollStatsFor,
  computeBonuses,
  rollDrop,
  awardDrop,
  maybeDropOnClick,
  renderTab,
  bindEvents,
  equip,
  unequip,
};

export default Equipment;

/* ------------------------------ Global attach ----------------------------- */

try {
  if (hasDOM()) {
    // Attach under Packet.items.equipment without clobbering
    const g = window;
    g.Packet = g.Packet || {};
    g.Packet.items = Object.assign({}, g.Packet.items || {}, {
      equipment: Object.assign(
        {},
        (g.Packet.items && g.Packet.items.equipment) || {},
        Equipment,
      ),
    });
  }
} catch {
  // ignore
}
