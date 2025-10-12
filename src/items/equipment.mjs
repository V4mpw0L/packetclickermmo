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
  { id: "slot1", name: "Slot 1" },
  { id: "slot2", name: "Slot 2" },
  { id: "slot3", name: "Slot 3" },
  { id: "slot4", name: "Slot 4" },
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
  // Existing starters
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

  // New items (about 50)
  {
    id: "silver-ring",
    name: "Silver Ring",
    slot: "trinket",
    icon: "src/assets/items/Ac_Ring02.png",
  },
  {
    id: "medal-of-honor",
    name: "Medal of Honor",
    slot: "trinket",
    icon: "src/assets/items/Ac_Medal01.png",
  },
  {
    id: "medal-of-speed",
    name: "Medal of Speed",
    slot: "trinket",
    icon: "src/assets/items/Ac_Medal02.png",
  },
  {
    id: "medal-of-bravery",
    name: "Medal of Bravery",
    slot: "trinket",
    icon: "src/assets/items/Ac_Medal03.png",
  },
  {
    id: "medal-of-focus",
    name: "Medal of Focus",
    slot: "trinket",
    icon: "src/assets/items/Ac_Medal04.png",
  },
  {
    id: "necklace-emerald",
    name: "Emerald Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace03.png",
  },
  {
    id: "necklace-sapphire",
    name: "Sapphire Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace06.png",
  },
  {
    id: "necklace-ruby",
    name: "Ruby Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace08.png",
  },

  {
    id: "iron-boots",
    name: "Iron Boots",
    slot: "glove",
    icon: "src/assets/items/A_Shoes02.png",
  },
  {
    id: "swift-shoes",
    name: "Swift Shoes",
    slot: "glove",
    icon: "src/assets/items/A_Shoes03.png",
  },
  {
    id: "shadow-shoes",
    name: "Shadow Shoes",
    slot: "glove",
    icon: "src/assets/items/A_Shoes04.png",
  },
  {
    id: "hunter-shoes",
    name: "Hunter Shoes",
    slot: "glove",
    icon: "src/assets/items/A_Shoes05.png",
  },
  {
    id: "windwalkers",
    name: "Windwalkers",
    slot: "glove",
    icon: "src/assets/items/A_Shoes06.png",
  },
  {
    id: "stormrunners",
    name: "Stormrunners",
    slot: "glove",
    icon: "src/assets/items/A_Shoes07.png",
  },

  {
    id: "leather-armor",
    name: "Leather Armor",
    slot: "glove",
    icon: "src/assets/items/A_Armour01.png",
  },
  {
    id: "chain-armor",
    name: "Chain Armor",
    slot: "glove",
    icon: "src/assets/items/A_Armour02.png",
  },
  {
    id: "steel-armor",
    name: "Steel Armor",
    slot: "glove",
    icon: "src/assets/items/A_Armour03.png",
  },
  {
    id: "heavy-armor",
    name: "Heavy Armor",
    slot: "glove",
    icon: "src/assets/items/A_Armor04.png",
  },
  {
    id: "brilliant-armor",
    name: "Brilliant Armor",
    slot: "glove",
    icon: "src/assets/items/A_Armor05.png",
  },

  {
    id: "top-hat",
    name: "Top Hat",
    slot: "trinket",
    icon: "src/assets/items/C_Hat01.png",
  },
  {
    id: "wanderer-hat",
    name: "Wanderer Hat",
    slot: "trinket",
    icon: "src/assets/items/C_Hat02.png",
  },
  {
    id: "forest-helm",
    name: "Forest Helm",
    slot: "trinket",
    icon: "src/assets/items/C_Elm01.png",
  },
  {
    id: "bronze-helm",
    name: "Bronze Helm",
    slot: "trinket",
    icon: "src/assets/items/C_Elm03.png",
  },
  {
    id: "steel-helm",
    name: "Steel Helm",
    slot: "trinket",
    icon: "src/assets/items/C_Elm04.png",
  },

  {
    id: "agate-gem",
    name: "Agate Gem",
    slot: "trinket",
    icon: "src/assets/items/I_Agate.png",
  },
  {
    id: "amethyst-gem",
    name: "Amethyst Gem",
    slot: "trinket",
    icon: "src/assets/items/I_Amethist.png",
  },
  {
    id: "jade-gem",
    name: "Jade Gem",
    slot: "trinket",
    icon: "src/assets/items/I_Jade.png",
  },
  {
    id: "opal-gem",
    name: "Opal Gem",
    slot: "trinket",
    icon: "src/assets/items/I_Opal.png",
  },
  {
    id: "ruby-gem",
    name: "Ruby Gem",
    slot: "trinket",
    icon: "src/assets/items/I_Ruby.png",
  },
  {
    id: "sapphire-gem",
    name: "Sapphire Gem",
    slot: "trinket",
    icon: "src/assets/items/I_Sapphire.png",
  },

  {
    id: "gold-coin",
    name: "Gold Coin",
    slot: "trinket",
    icon: "src/assets/items/I_GoldCoin.png",
  },
  {
    id: "silver-coin",
    name: "Silver Coin",
    slot: "trinket",
    icon: "src/assets/items/I_SilverCoin.png",
  },
  {
    id: "bronze-coin",
    name: "Bronze Coin",
    slot: "trinket",
    icon: "src/assets/items/I_BronzeCoin.png",
  },
  {
    id: "gold-bar",
    name: "Gold Bar",
    slot: "trinket",
    icon: "src/assets/items/I_GoldBar.png",
  },
  {
    id: "silver-bar",
    name: "Silver Bar",
    slot: "trinket",
    icon: "src/assets/items/I_SilverBar.png",
  },
  {
    id: "bronze-bar",
    name: "Bronze Bar",
    slot: "trinket",
    icon: "src/assets/items/I_BronzeBar.png",
  },

  {
    id: "lucky-rabbit-paw",
    name: "Lucky Rabbit Paw",
    slot: "trinket",
    icon: "src/assets/items/I_RabbitPaw.png",
  },
  {
    id: "wolf-fur",
    name: "Wolf Fur",
    slot: "trinket",
    icon: "src/assets/items/I_WolfFur.png",
  },
  {
    id: "fox-tail",
    name: "Fox Tail",
    slot: "trinket",
    icon: "src/assets/items/I_FoxTail.png",
  },
  {
    id: "bat-wing",
    name: "Bat Wing",
    slot: "trinket",
    icon: "src/assets/items/I_BatWing.png",
  },
  {
    id: "fang-charm",
    name: "Fang Charm",
    slot: "trinket",
    icon: "src/assets/items/I_Fang.png",
  },
  {
    id: "feather-charm",
    name: "Feather Charm",
    slot: "trinket",
    icon: "src/assets/items/I_Feather01.png",
  },

  {
    id: "wooden-rod",
    name: "Wooden Rod",
    slot: "glove",
    icon: "src/assets/items/E_Wood01.png",
  },
  {
    id: "oak-rod",
    name: "Oak Rod",
    slot: "glove",
    icon: "src/assets/items/E_Wood02.png",
  },
  {
    id: "metal-chunk",
    name: "Metal Chunk",
    slot: "trinket",
    icon: "src/assets/items/E_Metal02.png",
  },
  {
    id: "metal-ingot",
    name: "Metal Ingot",
    slot: "trinket",
    icon: "src/assets/items/E_Metal05.png",
  },

  {
    id: "dagger-iv",
    name: "Dagger IV",
    slot: "glove",
    icon: "src/assets/items/S_Dagger05.png",
  },
  {
    id: "axe-iii",
    name: "Axe III",
    slot: "glove",
    icon: "src/assets/items/S_Axe03.png",
  },
  {
    id: "bow-v",
    name: "Bow V",
    slot: "glove",
    icon: "src/assets/items/S_Bow05.png",
  },
  {
    id: "staff-iv",
    name: "Staff IV",
    slot: "glove",
    icon: "src/assets/items/W_Staff04.png",
  },
  {
    id: "mace-iii",
    name: "Mace III",
    slot: "glove",
    icon: "src/assets/items/W_Mace003.png",
  },
  {
    id: "spear-ii",
    name: "Spear II",
    slot: "glove",
    icon: "src/assets/items/W_Spear002.png",
  },
  {
    id: "sword-x",
    name: "Sword X",
    slot: "glove",
    icon: "src/assets/items/W_Sword010.png",
  },

  {
    id: "torch-ii",
    name: "Torch II",
    slot: "trinket",
    icon: "src/assets/items/I_Torch02.png",
  },
  {
    id: "ancient-scroll",
    name: "Ancient Scroll",
    slot: "trinket",
    icon: "src/assets/items/I_Scroll.png",
  },
  {
    id: "mystic-scroll",
    name: "Mystic Scroll",
    slot: "trinket",
    icon: "src/assets/items/I_Scroll02.png",
  },
  {
    id: "map-fragment",
    name: "Map Fragment",
    slot: "trinket",
    icon: "src/assets/items/I_Map.png",
  },
  {
    id: "telescope",
    name: "Telescope",
    slot: "trinket",
    icon: "src/assets/items/I_Telescope.png",
  },
  {
    id: "mirror-charm",
    name: "Mirror Charm",
    slot: "trinket",
    icon: "src/assets/items/I_Mirror.png",
  },

  {
    id: "book-of-secrets",
    name: "Book of Secrets",
    slot: "trinket",
    icon: "src/assets/items/W_Book03.png",
  },
  {
    id: "book-of-winds",
    name: "Book of Winds",
    slot: "trinket",
    icon: "src/assets/items/W_Book05.png",
  },
  {
    id: "book-of-flames",
    name: "Book of Flames",
    slot: "trinket",
    icon: "src/assets/items/W_Book07.png",
  },

  {
    id: "golden-sword",
    name: "Golden Sword",
    slot: "glove",
    icon: "src/assets/items/W_Gold_Sword.png",
  },
  {
    id: "golden-axe",
    name: "Golden Axe",
    slot: "glove",
    icon: "src/assets/items/W_Gold_Axe.png",
  },
  {
    id: "golden-dagger",
    name: "Golden Dagger",
    slot: "glove",
    icon: "src/assets/items/W_Gold_Dagger.png",
  },
  {
    id: "golden-spear",
    name: "Golden Spear",
    slot: "glove",
    icon: "src/assets/items/W_Gold_Spear.png",
  },
  {
    id: "golden-bow",
    name: "Golden Bow",
    slot: "glove",
    icon: "src/assets/items/W_Gold_Bow.png",
  },
  {
    id: "golden-mace",
    name: "Golden Mace",
    slot: "glove",
    icon: "src/assets/items/W_Gold_Mace.png",
  },

  // Additional Items (31 new items to complete 100 total)

  // More Necklaces & Accessories
  {
    id: "necklace-pearl",
    name: "Pearl Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace01.png",
  },
  {
    id: "necklace-silver",
    name: "Silver Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace02.png",
  },
  {
    id: "necklace-bronze",
    name: "Bronze Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace04.png",
  },
  {
    id: "necklace-mystic",
    name: "Mystic Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace05.png",
  },
  {
    id: "necklace-ancient",
    name: "Ancient Necklace",
    slot: "trinket",
    icon: "src/assets/items/Ac_Necklace07.png",
  },

  // More Clothing & Armor
  {
    id: "noble-garb",
    name: "Noble Garb",
    slot: "glove",
    icon: "src/assets/items/A_Clothing01.png",
  },
  {
    id: "royal-robe",
    name: "Royal Robe",
    slot: "glove",
    icon: "src/assets/items/A_Clothing02.png",
  },

  // Crystal Items
  {
    id: "crystal-shard",
    name: "Crystal Shard",
    slot: "trinket",
    icon: "src/assets/items/I_Crystal01.png",
  },
  {
    id: "ice-crystal",
    name: "Ice Crystal",
    slot: "trinket",
    icon: "src/assets/items/I_Crystal02.png",
  },
  {
    id: "fire-crystal",
    name: "Fire Crystal",
    slot: "trinket",
    icon: "src/assets/items/I_Crystal03.png",
  },

  // Potions & Bottles
  {
    id: "health-potion",
    name: "Health Potion",
    slot: "trinket",
    icon: "src/assets/items/P_Red01.png",
  },
  {
    id: "mana-potion",
    name: "Mana Potion",
    slot: "trinket",
    icon: "src/assets/items/P_Blue01.png",
  },
  {
    id: "speed-elixir",
    name: "Speed Elixir",
    slot: "trinket",
    icon: "src/assets/items/P_Green01.png",
  },
  {
    id: "power-brew",
    name: "Power Brew",
    slot: "trinket",
    icon: "src/assets/items/P_Orange01.png",
  },

  // Keys & Treasures
  {
    id: "golden-key",
    name: "Golden Key",
    slot: "trinket",
    icon: "src/assets/items/I_Key01.png",
  },
  {
    id: "ancient-key",
    name: "Ancient Key",
    slot: "trinket",
    icon: "src/assets/items/I_Key02.png",
  },
  {
    id: "master-key",
    name: "Master Key",
    slot: "trinket",
    icon: "src/assets/items/I_Key03.png",
  },
  {
    id: "treasure-chest",
    name: "Treasure Chest",
    slot: "trinket",
    icon: "src/assets/items/I_Chest01.png",
  },

  // More Weapons
  {
    id: "iron-sword",
    name: "Iron Sword",
    slot: "glove",
    icon: "src/assets/items/W_Sword002.png",
  },
  {
    id: "steel-blade",
    name: "Steel Blade",
    slot: "glove",
    icon: "src/assets/items/W_Sword003.png",
  },
  {
    id: "crystal-dagger",
    name: "Crystal Dagger",
    slot: "glove",
    icon: "src/assets/items/W_Dagger002.png",
  },
  {
    id: "hunter-bow",
    name: "Hunter Bow",
    slot: "glove",
    icon: "src/assets/items/W_Bow01.png",
  },
  {
    id: "war-axe",
    name: "War Axe",
    slot: "glove",
    icon: "src/assets/items/W_Axe001.png",
  },
  {
    id: "battle-mace",
    name: "Battle Mace",
    slot: "glove",
    icon: "src/assets/items/W_Mace001.png",
  },

  // Nature & Animal Items
  {
    id: "leaf-essence",
    name: "Leaf Essence",
    slot: "trinket",
    icon: "src/assets/items/I_Leaf.png",
  },
  {
    id: "snail-shell",
    name: "Snail Shell",
    slot: "trinket",
    icon: "src/assets/items/I_SnailShell.png",
  },
  {
    id: "scorpion-claw",
    name: "Scorpion Claw",
    slot: "trinket",
    icon: "src/assets/items/I_ScorpionClaw.png",
  },

  // Elemental Items
  {
    id: "coal-chunk",
    name: "Coal Chunk",
    slot: "trinket",
    icon: "src/assets/items/I_Coal.png",
  },
  {
    id: "iron-ball",
    name: "Iron Ball",
    slot: "trinket",
    icon: "src/assets/items/I_IronBall.png",
  },

  // More Books
  {
    id: "spell-tome",
    name: "Spell Tome",
    slot: "trinket",
    icon: "src/assets/items/W_Book01.png",
  },
  {
    id: "wisdom-book",
    name: "Book of Wisdom",
    slot: "trinket",
    icon: "src/assets/items/W_Book02.png",
  },

  // Utility Items
  {
    id: "mystic-clock",
    name: "Mystic Clock",
    slot: "trinket",
    icon: "src/assets/items/I_Clock.png",
  },
];

/* ----------------------------- State scaffolds ---------------------------- */

/**
 * Ensure inventory/equipment containers exist on a given state.
 * Adds no items; just shape.
 */
export function ensureStateShape(state) {
  if (!state || typeof state !== "object") return state;

  // Ensure basic containers
  if (!Array.isArray(state.inventory)) state.inventory = [];
  if (!state.equipment || typeof state.equipment !== "object") {
    state.equipment = {};
  }

  // Migrate legacy glove/trinket into generic slots
  try {
    const legacy = [];
    if (state.equipment.glove) legacy.push(state.equipment.glove);
    if (state.equipment.trinket) legacy.push(state.equipment.trinket);
    delete state.equipment.glove;
    delete state.equipment.trinket;

    // Ensure 4 generic slots
    for (const slot of SLOTS) {
      if (!(slot.id in state.equipment)) state.equipment[slot.id] = null;
    }
    // Place legacy items into first free slots
    for (const it of legacy) {
      const target = SLOTS.find((s) => state.equipment[s.id] == null);
      if (target) state.equipment[target.id] = it;
      else state.inventory.push(it);
    }
  } catch {
    // non-fatal migration
    for (const slot of SLOTS) {
      if (!(slot.id in state.equipment)) state.equipment[slot.id] = null;
    }
  }

  // Migration: normalize quantities and merge duplicates by name+rarity
  try {
    const inv = Array.isArray(state.inventory) ? state.inventory : [];
    const grouped = [];
    const index = new Map(); // key = name::rarity

    for (const it of inv) {
      if (!it || typeof it !== "object") continue;
      const name = String(it.name || "");
      const rarity = String(it.rarity || "green");
      const key = name + "::" + rarity;
      const qty = Math.max(1, Number(it.q || 1));

      if (index.has(key)) {
        const gi = index.get(key);
        grouped[gi].q = Math.max(1, Number(grouped[gi].q || 1)) + qty;
      } else {
        const copy = Object.assign({}, it);
        copy.name = name;
        copy.rarity = rarity;
        copy.q = qty;
        grouped.push(copy);
        index.set(key, grouped.length - 1);
      }
    }

    state.inventory = grouped;
  } catch {
    // non-fatal migration
  }

  // Normalize capacity default
  if (typeof state._invCapacity !== "number") state._invCapacity = 100;

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

  // Define rarity multiplier ranges for more dynamic stats
  const rarityRanges = {
    green: { min: 0.8, max: 1.5, basePrice: 50 },
    gold: { min: 1.5, max: 3.2, basePrice: 200 },
    blue: { min: 2.8, max: 5.5, basePrice: 1000 },
    pink: { min: 5.0, max: 9.0, basePrice: 5000 },
    animal: { min: 8.5, max: 15.0, basePrice: 20000 },
  };

  const range = rarityRanges[r.id] || rarityRanges.green;
  const statVariation = rngBetween(range.min, range.max);

  // Initialize base stats
  let perClick = 0;
  let perSec = 0;
  let critChance = 0;

  // Dynamic stat distribution - each item gets 1-3 stats randomly
  const numStats = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3;
  const availableStats = ["perClick", "perSec", "critChance"];
  const chosenStats = [];

  // Choose which stats this item will have
  while (chosenStats.length < numStats && availableStats.length > 0) {
    const index = Math.floor(Math.random() * availableStats.length);
    chosenStats.push(availableStats.splice(index, 1)[0]);
  }

  // Slot influence on stat preferences
  const slotBias = {
    glove: { perClick: 1.8, perSec: 0.6, critChance: 1.2 },
    trinket: { perClick: 1.0, perSec: 1.5, critChance: 1.4 },
  };
  const bias = slotBias[slotId] || {
    perClick: 1.0,
    perSec: 1.0,
    critChance: 1.0,
  };

  // Distribute stat points among chosen stats
  chosenStats.forEach((statType) => {
    const baseValue = statVariation * bias[statType];
    const randomFactor = rngBetween(0.7, 1.3); // Additional randomization

    switch (statType) {
      case "perClick":
        perClick = Math.max(1, Math.floor(baseValue * randomFactor));
        break;
      case "perSec":
        perSec = Math.max(0, Math.floor(baseValue * randomFactor * 0.8));
        break;
      case "critChance":
        if (r.id !== "green" || Math.random() < 0.3) {
          // Green has 30% chance for crit
          critChance = Math.max(
            1,
            Math.floor(clamp(baseValue * randomFactor * 0.6, 1, 45)),
          );
        }
        break;
    }
  });

  // Ensure minimum values for higher rarities
  if (r.id === "animal") {
    perClick = Math.max(perClick, 8);
    perSec = Math.max(perSec, 6);
    critChance = Math.max(critChance, 12);
  } else if (r.id === "pink") {
    perClick = Math.max(perClick, 5);
    perSec = Math.max(perSec, 4);
    critChance = Math.max(critChance, 8);
  }

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

  // Stack by name + rarity (same item goes x1, x2, x3 in one slot)
  const existing = inv.find(
    (it) => it && it.name === item.name && it.rarity === item.rarity,
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
  const baseRate = typeof opts.baseRate === "number" ? opts.baseRate : 0.0075;

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

/**
 * Find the first empty equipment slot, or null if all slots are full
 */
function findEmptySlot(state) {
  ensureStateShape(state);
  for (const slot of SLOTS) {
    if (!state.equipment[slot.id]) {
      return slot.id;
    }
  }
  return null;
}

/**
 * Smart equip function - auto-equips to empty slot if available
 * Returns: { success: true, slot: "slotX" } or { success: false, needsSlotChoice: true }
 */
export function smartEquip(state, index) {
  ensureStateShape(state);
  const inv = state.inventory;
  if (!Array.isArray(inv)) return { success: false };
  if (index < 0 || index >= inv.length) return { success: false };
  const toEquip = inv[index];
  if (!toEquip) return { success: false };

  // Check for empty slot first
  const emptySlot = findEmptySlot(state);
  if (emptySlot) {
    // Auto-equip to empty slot
    const success = equip(state, index, emptySlot);
    return { success, slot: emptySlot };
  }

  // All slots are full - need user to choose which slot to replace
  return { success: false, needsSlotChoice: true };
}

export function equip(state, index, slot) {
  ensureStateShape(state);
  const inv = state.inventory;
  if (!Array.isArray(inv)) return false;
  if (index < 0 || index >= inv.length) return false;
  const toEquip = inv[index];
  if (!toEquip || !(slot in state.equipment)) return false;

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
  const isAnimal = r.id === "animal";
  return {
    color: r.color,
    border: `1.5px solid ${r.color}`,
    glow: isAnimal ? `0 0 15px ${r.color}88` : `0 0 10px ${r.color}55`,
    animation: isAnimal ? "animalPulse 2s ease-in-out infinite" : "",
  };
}

function slotHeaderHTML(item, slotName, slotId) {
  if (!item) {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.4rem; flex:1; min-width:0; padding:.8rem; text-align:center;">
        <div style="width:36px;height:36px;border-radius:8px;border:1.5px dashed var(--border-color); opacity:.4; display:flex; align-items:center; justify-content:center;">
        </div>
        <div style="min-width:0;">
          <div style="font-weight:700; font-size:.9rem;">${slotName}</div>
          <div class="text-neon-gray text-xs" style="opacity:.7;">Empty</div>
        </div>
      </div>
    `;
  }
  const st = rarityStyles(item.rarity);
  return `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.4rem; flex:1; min-width:0; padding:.8rem; position:relative; text-align:center;">
      <img src="${item.icon}" alt="${item.name}" style="width:36px;height:36px;border-radius:8px;border:${st.border};box-shadow:${st.glow}; object-fit:cover; flex-shrink:0;" />
      <div style="flex:1; min-width:0; width:100%;">
        <div style="font-weight:800; color:${st.color}; line-height:1.1; font-size:.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:.2rem;">${item.name}</div>
        <div class="text-xs" style="opacity:.85; color:${st.color}; line-height:1; margin-bottom:.3rem;">${item.rarityName}</div>
        <div style="display:flex; gap:.3rem; flex-wrap:nowrap; align-items:center; justify-content:center;">
          <span style="padding:.06rem .35rem; border:1px solid var(--border-color); border-radius:999px; color:#65ffda; background:rgba(0,0,0,.25); font-size:.68rem; white-space:nowrap;">+${item.stats.perClick || 0}/click</span>
          <span style="padding:.06rem .35rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25); font-size:.68rem; white-space:nowrap;">+${item.stats.perSec || 0}/sec</span>
          <span style="padding:.06rem .35rem; border:1px solid var(--border-color); border-radius:999px; color:#ff88ff; background:rgba(0,0,0,.25); font-size:.68rem; white-space:nowrap;">+${item.stats.critChance || 0}% crit</span>
        </div>
      </div>
      <button data-unequip-slot="${slotId}" aria-label="Unequip" title="Unequip" style="position:absolute; top:6px; right:6px; width:22px; height:22px; padding:0; font-size:13px; line-height:1; border-radius:50%; background:#ff4757; border:1px solid #ff3742; color:white; cursor:pointer; z-index:2; display:flex; align-items:center; justify-content:center; font-weight:bold;">✕</button>
    </div>
  `;
}

/**
 * Render Equipment tab content as string HTML (no side-effects).
 */
export function renderTab(state) {
  ensureStateShape(state);

  // Calculate total equipment stats
  const totalStats = computeBonuses(state);

  const slotCards = SLOTS.map((s) => {
    const it = state.equipment[s.id];
    const st = it ? rarityStyles(it.rarity) : null;
    return `
      <div class="neon-card" data-eq-slot="${s.id}" style="width:100%; max-width:100%; margin:0; height:auto; min-height:85px; ${st ? `border-color:${st.color};` : "background: linear-gradient(135deg, #1a222a, #202a35); border-color: #334455; filter: grayscale(0.25);"} position:relative;">
        ${slotHeaderHTML(it, s.name, s.id)}
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
      const animationStyle = st.animation ? `animation: ${st.animation};` : "";
      return `
          <div class="neon-card" style="padding:.3rem; border-color:${st.color}; box-shadow:${st.glow}; ${animationStyle} display:flex; align-items:center; justify-content:center; width:100%; max-width:100%; margin:0; aspect-ratio:1/1;">
            <button class="neon-btn" data-open-item-index="${absIndex}" style="width:100%; height:100%; background: transparent; border:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.2rem; padding:.2rem;">
              <div style="position:relative; display:inline-block; width:72%; height:72%;">
                <img src="${it.icon}" alt="${it.name}" style="width:100%;height:100%;border-radius:6px; box-sizing:border-box; object-fit:cover;" />
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

  const invCards = `
        <div class="inv-grid" style="display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .5rem; padding: .5rem; box-sizing: border-box; width: 100%;">
          ${gridHtml}
        </div>
        ${totalItems === 0 ? '<div class="text-neon-gray text-xs" style="text-align:center; margin-top:.25rem;">No items yet. Keep clicking!</div>' : pagerHtml}
      `;

  return `
    <style>
      @keyframes animalPulse {
        0%, 100% { box-shadow: 0 0 15px rgba(255,48,64,0.6); }
        50% { box-shadow: 0 0 25px rgba(255,48,64,0.9), 0 0 35px rgba(255,48,64,0.4); }
      }
    </style>
    <div class="neon-card px-3 py-4 mb-2">
      <h2 class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm);">🧰 Equipment</h2>
      <div class="text-neon-gray text-sm mb-3" style="text-align:center; margin:.5rem auto 1rem; padding:.35rem .75rem; border:1px solid var(--border-color); border-radius:999px; width:fit-content; background:linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05));">
        Equip items to gain bonuses ·
        <span style="color:${rarityById("green").color}">Green</span> ·
        <span style="color:${rarityById("gold").color}">Gold</span> ·
        <span style="color:${rarityById("blue").color}">Blue</span> ·
        <span style="color:${rarityById("pink").color}">Pink</span> ·
        <span style="color:${rarityById("animal").color}">Red</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 0.5rem; width: 100%; box-sizing: border-box;">${slotCards}</div>

      <div style="background: linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.1)); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.75rem; margin: 1rem 0; text-align: center;">
        <div class="text-neon-gray text-xs mb-2" style="font-weight: 600; opacity: 0.8;">⚡ TOTAL EQUIPMENT BONUSES ⚡</div>
        <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <span style="padding: 0.2rem 0.5rem; border: 1px solid var(--border-color); border-radius: 999px; color: #65ffda; background: rgba(0,0,0,0.25); font-weight: 600; font-size: 0.85rem; min-width: 70px;">+${totalStats.perClick || 0} Click</span>
          <span style="padding: 0.2rem 0.5rem; border: 1px solid var(--border-color); border-radius: 999px; color: #ffe08a; background: rgba(0,0,0,0.25); font-weight: 600; font-size: 0.85rem; min-width: 70px;">+${totalStats.perSec || 0} Sec</span>
          <span style="padding: 0.2rem 0.5rem; border: 1px solid var(--border-color); border-radius: 999px; color: #ff88ff; background: rgba(0,0,0,0.25); font-weight: 600; font-size: 0.85rem; min-width: 70px;">+${totalStats.critChance || 0}% Crit</span>
        </div>
      </div>

      <div class="text-neon-gray text-sm mt-3 mb-1" style="display:flex; align-items:center; justify-content:center; gap:.5rem; margin-top:1rem;">
        <span style="font-weight:800;">Inventory</span>
        <span class="text-xs" style="opacity:.9; padding:.15rem .55rem; border:1px solid var(--border-color); border-radius:999px; background:linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05));">${Math.min(totalItems, capacity)}/${capacity}</span>
      </div>
      <div style="position:relative; height:10px; border-radius:999px; background:#22313f; border:1px solid var(--border-color); overflow:hidden; box-shadow: inset 0 1px 6px rgba(0,0,0,.5); margin-bottom:.25rem;">
        <div style="height:100%; width:${percent}%; background: linear-gradient(90deg, var(--secondary-color), var(--primary-color));"></div>
      </div>
      <div class="text-neon-gray text-xs" style="text-align:center; margin:.15rem 0 .35rem; letter-spacing:.02em; font-weight:700;">${percent}%</div>
      <div style="display: flex; justify-content: center; margin-bottom: .5rem;">
        <button class="neon-btn text-xs" id="sell-all-btn" style="background: linear-gradient(135deg, #ff3040, #cc2030); border-color: #ff3040; color: white; padding: 0.25rem 0.75rem;">Sell All</button>
      </div>
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

      // Simple rarity-based sell price (doubled for better rewards)
      const priceMap = {
        green: 50,
        gold: 200,
        blue: 1000,
        pink: 5000,
        animal: 20000,
      };
      const price = priceMap[item.rarity] || 10;

      const st = rarityStyles(item.rarity);
      // Check if we have empty slots for smart equipping
      const emptySlot = findEmptySlot(state);
      const slotOptions = SLOTS.map(
        (s) => `<option value="${s.id}">${s.name}</option>`,
      ).join("");

      // Create different modals based on whether slots are available
      const html = emptySlot
        ? `
        <div class="neon-card" style="padding:.75rem; border-color:${st.color}; box-shadow:${st.glow};">
          <div style="display:flex; gap:.6rem; align-items:center;">
            <img src="${item.icon}" alt="${item.name}" style="width:64px;height:64px;border-radius:8px; object-fit:cover;" />
            <div>
              <div style="font-weight:900; color:${st.color};">${item.name} <span style="font-size:.85em; opacity:.95; color:${st.color};">(${item.rarityName})</span></div>
              <div class="text-sm" style="display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.25rem;">
                <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#65ffda; background:rgba(0,0,0,.25);">+${item.stats.perClick || 0}/click</span>
                <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25);">+${item.stats.perSec || 0}/sec</span>
                <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ff88ff; background:rgba(0,0,0,.25);">+${item.stats.critChance || 0}%</span>
              </div>
              <div class="text-xs" style="margin-top:.25rem; color:var(--text-primary);">Qty: <span style="padding:.05rem .4rem; border:1px solid var(--border-color); border-radius:999px; background:rgba(0,0,0,.25); font-weight:800; color:${st.color};">${item.q || 1}</span></div>
            </div>
          </div>
          <div class="text-xs" style="margin-top:.6rem; padding:.4rem .6rem; background:rgba(101,255,218,.1); border:1px solid rgba(101,255,218,.3); border-radius:8px; color:#65ffda; text-align:center;">
            <span style="opacity:.9;">🎯 Will auto-equip to first available slot</span>
          </div>
          <div class="button-group" style="display:flex; gap:.5rem; margin-top:.6rem;">
            <button class="neon-btn w-full" id="smart-equip-item-btn" data-index="${idx}">🧰 Quick Equip</button>
            <button class="neon-btn w-full" id="sell-item-btn" data-index="${idx}" style="background: linear-gradient(135deg, #ff3040, #cc2030); border-color: #ff3040; color: white;">Sell for ${price} <span class="icon-packet"></span></button>
          </div>
        </div>
      `
        : `
        <div class="neon-card" style="padding:.75rem; border-color:${st.color}; box-shadow:${st.glow};">
          <div style="display:flex; gap:.6rem; align-items:center;">
            <img src="${item.icon}" alt="${item.name}" style="width:64px;height:64px;border-radius:8px; object-fit:cover;" />
            <div>
              <div style="font-weight:900; color:${st.color};">${item.name} <span style="font-size:.85em; opacity:.95; color:${st.color};">(${item.rarityName})</span></div>
              <div class="text-sm" style="display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.25rem;">
                <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#65ffda; background:rgba(0,0,0,.25);">+${item.stats.perClick || 0}/click</span>
                <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25);">+${item.stats.perSec || 0}/sec</span>
                <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ff88ff; background:rgba(0,0,0,.25);">+${item.stats.critChance || 0}%</span>
              </div>
              <div class="text-xs" style="margin-top:.25rem; color:var(--text-primary);">Qty: <span style="padding:.05rem .4rem; border:1px solid var(--border-color); border-radius:999px; background:rgba(0,0,0,.25); font-weight:800; color:${st.color};">${item.q || 1}</span></div>
            </div>
          </div>
          <div class="text-xs" style="margin-top:.6rem; padding:.4rem .6rem; background:rgba(255,152,0,.1); border:1px solid rgba(255,152,0,.3); border-radius:8px; color:#ff9800; text-align:center;">
            <span style="opacity:.9;">⚠️ All slots occupied - choose which to replace:</span>
          </div>
          <div class="text-xs" style="margin-top:.6rem; display:flex; align-items:center; gap:.35rem;">
            <span style="opacity:.9;">Replace slot:</span>
            <select id="equip-slot-select" style="padding:.2rem .55rem; border-radius:8px; background: linear-gradient(135deg, rgba(0,0,0,.25), rgba(0,0,0,.05)); border:1px solid var(--border-color); font-weight:800; font-size:.85rem; color:var(--text-primary);">
              ${slotOptions}
            </select>
          </div>
          <div class="button-group" style="display:flex; gap:.5rem; margin-top:.6rem;">
            <button class="neon-btn w-full" id="equip-item-btn" data-index="${idx}">🔄 Replace & Equip</button>
            <button class="neon-btn w-full" id="sell-item-btn" data-index="${idx}" style="background: linear-gradient(135deg, #ff3040, #cc2030); border-color: #ff3040; color: white;">Sell for ${price} <span class="icon-packet"></span></button>
          </div>
        </div>
      `;
      if (typeof window.showModal === "function") {
        window.showModal("Item", html);
        // Bind modal action buttons
        setTimeout(() => {
          const smartEq = document.getElementById("smart-equip-item-btn");
          const eq = document.getElementById("equip-item-btn");
          const sell = document.getElementById("sell-item-btn");

          // Smart equip button (when empty slots available)
          if (smartEq)
            smartEq.onclick = () => {
              const i = parseInt(
                smartEq.getAttribute("data-index") || "-1",
                10,
              );
              const it = (state.inventory || [])[i];
              if (!it) return;
              const result = smartEquip(state, i);
              if (result.success) {
                if (typeof save === "function") save();
                if (typeof rerender === "function") rerender();
                if (typeof window.closeModal === "function")
                  window.closeModal();
                const n =
                  notify ||
                  (hasDOM() && typeof window.showHudNotify === "function"
                    ? window.showHudNotify
                    : null);
                if (n)
                  n(
                    `Equipped to ${SLOTS.find((s) => s.id === result.slot)?.name || "slot"}!`,
                    "🧰",
                  );
              }
            };

          // Manual equip button (when all slots are full)
          if (eq)
            eq.onclick = () => {
              const i = parseInt(eq.getAttribute("data-index") || "-1", 10);
              const it = (state.inventory || [])[i];
              if (!it) return;
              const sel = document.getElementById("equip-slot-select");
              const targetSlot =
                sel && sel.value ? sel.value : SLOTS[0] && SLOTS[0].id;
              if (equip(state, i, targetSlot)) {
                if (typeof save === "function") save();
                if (typeof rerender === "function") rerender();
                if (typeof window.closeModal === "function")
                  window.closeModal();
                const n =
                  notify ||
                  (hasDOM() && typeof window.showHudNotify === "function"
                    ? window.showHudNotify
                    : null);
                const slotName =
                  SLOTS.find((s) => s.id === targetSlot)?.name || "slot";
                if (n) n(`Equipped to ${slotName}!`, "🧰");
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

  // Sell All functionality
  const sellAllBtn = el.querySelector("#sell-all-btn");
  if (sellAllBtn) {
    sellAllBtn.addEventListener("click", () => {
      if (!state.inventory || state.inventory.length === 0) return;

      // Show sell all options modal
      const rarityOptions = ["all", "green", "gold", "blue", "pink", "animal"];
      const optionButtons = rarityOptions
        .map((rarity) => {
          const label =
            rarity === "all"
              ? "All Items"
              : rarity === "animal"
                ? "Red Only"
                : `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Only`;

          // Get background color for each rarity
          let backgroundColor = "";
          let textColor = "white";
          switch (rarity) {
            case "all":
              backgroundColor = "linear-gradient(135deg, #666, #444)";
              break;
            case "green":
              backgroundColor = "linear-gradient(135deg, #8ef1b2, #6bd18f)";
              textColor = "#1a1a1a";
              break;
            case "gold":
              backgroundColor = "linear-gradient(135deg, #ffd34d, #ffb84d)";
              textColor = "#1a1a1a";
              break;
            case "blue":
              backgroundColor = "linear-gradient(135deg, #6bd7e8, #4dc4e0)";
              textColor = "#1a1a1a";
              break;
            case "pink":
              backgroundColor = "linear-gradient(135deg, #ff66cc, #ff44bb)";
              break;
            case "animal":
              backgroundColor = "linear-gradient(135deg, #ff3040, #cc2030)";
              break;
          }

          return `<button class="neon-btn w-full mb-2" data-sell-rarity="${rarity}" style="background: ${backgroundColor}; color: ${textColor}; border-color: ${rarity === "all" ? "#666" : rarityById(rarity).color};">${label}</button>`;
        })
        .join("");

      const html = `
        <div class="neon-card" style="padding:.75rem;">
          <div style="font-weight:900; margin-bottom: .75rem; text-align: center;">Sell Items</div>
          <div style="margin-bottom: .75rem;">Choose which items to sell:</div>
          ${optionButtons}
        </div>
      `;

      if (typeof window.showModal === "function") {
        window.showModal("Sell All", html);

        setTimeout(() => {
          document.querySelectorAll("[data-sell-rarity]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const targetRarity = btn.getAttribute("data-sell-rarity");

              // Calculate total value and filter items
              const priceMap = {
                green: 50,
                gold: 200,
                blue: 1000,
                pink: 5000,
                animal: 20000,
              };

              let totalValue = 0;
              let itemsToRemove = [];

              for (let i = state.inventory.length - 1; i >= 0; i--) {
                const item = state.inventory[i];
                if (targetRarity === "all" || item.rarity === targetRarity) {
                  const quantity = item.q || 1;
                  const price = priceMap[item.rarity] || 10;
                  totalValue += price * quantity;
                  itemsToRemove.push(i);
                }
              }

              if (itemsToRemove.length === 0) {
                if (typeof window.closeModal === "function")
                  window.closeModal();
                return;
              }

              // Remove items and add packets
              itemsToRemove.forEach((index) => {
                state.inventory.splice(index, 1);
              });
              state.packets = (state.packets || 0) + totalValue;

              if (typeof save === "function") save();
              if (typeof rerender === "function") rerender();
              if (typeof window.closeModal === "function") window.closeModal();

              const n =
                notify ||
                (hasDOM() && typeof window.showHudNotify === "function"
                  ? window.showHudNotify
                  : null);
              if (n)
                n(
                  `Sold <span style="font-size: 1.3em; font-weight: 900; color: #ffd700;">${itemsToRemove.length}</span> items for <span style="font-size: 1.3em; font-weight: 900; color: #ffd700;">${totalValue.toLocaleString("en-US")}</span> <span class="icon-packet" style="font-size: 1.3em; vertical-align: middle;"></span>!`,
                  '<span class="icon-packet" style="font-size: 1.5em;"></span>',
                );
            });
          });
        }, 0);
      }
    });
  }

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
      fallbackNotify(`${item.name} (${item.rarityName})`, "🎁");
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
        <div style="font-weight:900; color:${st.color}; font-size:1rem;">${item.name}</div>
        <div class="text-xs" style="margin-top:.15rem; color:${st.color}; opacity:0.8;">
          ${item.rarityName} Drop
        </div>
        <div class="text-sm" style="display:flex; gap:.35rem; flex-wrap:wrap; margin-top:.3rem;">
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#65ffda; background:rgba(0,0,0,.25); font-size:.75rem;">+${item.stats.perClick || 0}/click</span>
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ffe08a; background:rgba(0,0,0,.25); font-size:.75rem;">+${item.stats.perSec || 0}/sec</span>
          <span style="padding:.1rem .45rem; border:1px solid var(--border-color); border-radius:999px; color:#ff88ff; background:rgba(0,0,0,.25); font-size:.75rem;">+${item.stats.critChance || 0}%</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("active"));
  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => toast.remove(), 260);
  }, 2200);
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
