// packetclickermmo/ui/hud.js
// hud.js - Modular HUD logic for Packet Clicker MMO

/**
 * HUD Module
 * Handles creation, updating, and removal of HUD elements (combo total, notifications, etc.)
 * All HUD elements are responsive and mobile-friendly.
 */

const HUD_IDS = {
  comboTotal: "combo-total-hud",
  notify: "hud-notify",
};

/**
 * Show or update the combo total HUD.
 * @param {number} total - The total combo gain to display.
 * @param {string} [color] - Optional color for the HUD.
 */
export function showComboTotalHUD(total, color = null) {
  let hud = document.getElementById(HUD_IDS.comboTotal);
  if (!hud) {
    hud = document.createElement("div");
    hud.id = HUD_IDS.comboTotal;
    hud.className = "combo-total-hud";
    hud.style.position = "fixed";
    hud.style.top = "12%";
    hud.style.left = "50%";
    hud.style.transform = "translate(-50%, 0)";
    hud.style.padding = "8px 12px";
    hud.style.border = "2px solid var(--primary-color)";
    hud.style.borderRadius = "12px";
    hud.style.fontWeight = "bold";
    hud.style.background =
      "linear-gradient(135deg, var(--bg-secondary), var(--bg-card))";
    hud.style.boxShadow =
      "0 4px 20px var(--shadow-primary), 0 0 0 1px rgba(255,255,255,0.1) inset";
    hud.style.zIndex = "1001";
    hud.style.pointerEvents = "none";
    hud.style.maxWidth = "90vw";
    hud.style.backdropFilter = "blur(8px)";
    hud.style.opacity = "0.98";
    document.body.appendChild(hud);
  }
  hud.innerHTML = `Total +${(total || 0).toLocaleString()} <span class="icon-packet"></span>`;
  if (color) {
    hud.style.color = color;
    hud.style.borderColor = color;
  } else {
    hud.style.color = "var(--primary-color)";
    hud.style.borderColor = "var(--primary-color)";
  }
  hud.style.transition = "transform 120ms ease";
  hud.style.transform = "translate(-50%, -6px) scale(1.06)";
  setTimeout(() => {
    const h = document.getElementById(HUD_IDS.comboTotal);
    if (h) h.style.transform = "translate(-50%, 0) scale(1)";
  }, 130);
}

/**
 * Hide the combo total HUD after a timeout.
 * @param {number} timeoutMs - How long to wait before hiding.
 */
export function hideComboTotalHUD(timeoutMs = 2200) {
  if (hideComboTotalHUD._timer) clearTimeout(hideComboTotalHUD._timer);
  hideComboTotalHUD._timer = setTimeout(() => {
    const h = document.getElementById(HUD_IDS.comboTotal);
    if (h) h.remove();
  }, timeoutMs);
}

/**
 * Show a HUD notification (toast style).
 * @param {string} msg - The message to display.
 * @param {string} [icon] - Optional emoji/icon.
 * @param {number} [duration] - Duration in ms.
 */
export function showHudNotify(msg, icon = "✨", duration = 1800) {
  if (window.PacketUI && typeof PacketUI.showHudNotify === "function") {
    return PacketUI.showHudNotify(msg, icon, duration);
  }
  let notify = document.getElementById(HUD_IDS.notify);
  if (!notify) {
    notify = document.createElement("div");
    notify.id = HUD_IDS.notify;
    notify.className = "hud-notify";
    notify.style.position = "fixed";
    notify.style.top = "6%";
    notify.style.left = "50%";
    notify.style.transform = "translate(-50%, 0)";
    notify.style.padding = "10px 18px";
    notify.style.borderRadius = "14px";
    notify.style.fontWeight = "bold";
    notify.style.fontSize = "clamp(1.1rem, 3vw, 1.5rem)";
    notify.style.background =
      "linear-gradient(135deg, var(--bg-secondary), var(--bg-card))";
    notify.style.color = "var(--primary-color)";
    notify.style.boxShadow =
      "0 2px 12px var(--shadow-primary), 0 0 0 1px rgba(255,255,255,0.08) inset";
    notify.style.zIndex = "1200";
    notify.style.pointerEvents = "none";
    notify.style.maxWidth = "92vw";
    notify.style.textAlign = "center";
    notify.style.backdropFilter = "blur(6px)";
    notify.style.opacity = "0.98";
    document.body.appendChild(notify);
  }
  notify.innerHTML = icon
    ? `<span style="margin-right:0.5em;">${icon}</span>${msg}`
    : msg;
  notify.classList.add("active");
  if (showHudNotify._timer) clearTimeout(showHudNotify._timer);
  showHudNotify._timer = setTimeout(() => {
    notify.classList.remove("active");
    setTimeout(() => {
      if (notify && notify.parentNode) notify.parentNode.removeChild(notify);
    }, 400);
  }, duration);
}

/**
 * Utility to clear all HUD elements (for tab switches, etc).
 */
export function clearHUD() {
  Object.values(HUD_IDS).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}
