const DEFAULT_AVATAR = "https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Hacker";
const STORAGE_KEY = 'packet_clicker_save_v3';

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
};

const GEM_PACKS = [
  { id: "small", label: "10 Gems", gems: 10, price: 0.99 },
  { id: "medium", label: "60 Gems", gems: 60, price: 4.99 },
  { id: "big", label: "150 Gems", gems: 150, price: 9.99 },
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
    req: (s) => isVIP(), // isVIP will need to be imported or handled
    gem: 3,
  },
  {
    id: "adfree",
    name: "Ad Free!",
    emoji: "🚫",
    desc: "Remove Ads",
    req: (s) => s.player.noAds,
    gem: 1,
  },
];

export { DEFAULT_AVATAR, STORAGE_KEY, state, GEM_PACKS, SHOP_ITEMS, ACHIEVEMENTS };
