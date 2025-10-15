/**
 * HUD utilities (ES module)
 * - showComboTotalHUD(total, color?)
 * - hideComboTotalHUD(timeoutMs?)
 * - showHudNotify(msg, icon?, duration?)
 * - clearHUD()
 *
 * This module is resilient:
 * - Falls back to inline styling if CSS classes are missing
 * - Delegates to PacketUI.showHudNotify if available (non-breaking)
 */

const HUD_IDS = {
  comboTotal: "combo-total-hud",
  notify: "hud-notify",
};

let _comboHideTimer = null;
let _notifyHideTimer = null;

/**
 * Show or update the combo total HUD with a subtle bump animation.
 * @param {number} total - Total value to display.
 * @param {string|null} color - Optional CSS color for text/border.
 */
export function showComboTotalHUD(total, color = null, totalXP = null) {
  if (typeof document === "undefined") return;

  let hud = document.getElementById(HUD_IDS.comboTotal);
  if (!hud) {
    hud = document.createElement("div");
    hud.id = HUD_IDS.comboTotal;
    hud.className = "combo-total-hud combo-total-follow";

    // Get current scroll position to follow user
    const viewport = getViewportInfo();

    // Inline safety styles (in case CSS is unavailable)
    hud.style.position = "absolute";
    hud.style.top = `${viewport.scrollY + Math.max(140, viewport.viewportHeight * 0.28)}px`;
    hud.style.left = "50%";
    hud.style.transform = "translate(-50%, 0)";
    hud.style.padding = "0.4rem 0.8rem";
    hud.style.border = "2px solid var(--primary-color)";
    hud.style.borderRadius = "12px";
    hud.style.fontWeight = "bold";
    hud.style.background =
      "linear-gradient(135deg, var(--bg-secondary, #1b2431), var(--bg-card, #131a24))";
    hud.style.boxShadow =
      "0 4px 20px var(--shadow-primary, rgba(0,0,0,0.35)), 0 0 0 1px rgba(255,255,255,0.08) inset";
    hud.style.zIndex = "1001";
    hud.style.pointerEvents = "none";
    hud.style.maxWidth = "92vw";
    hud.style.minWidth = "120px";
    hud.style.minHeight = "2.2em";
    hud.style.backdropFilter = "blur(8px)";
    hud.style.opacity = "0.98";
    hud.style.display = "flex";
    hud.style.alignItems = "center";
    hud.style.justifyContent = "center";
    hud.style.fontSize = "clamp(1.1rem, 2.5vw, 1.6rem)";
    hud.style.gap = "0.5em";
    document.body.appendChild(hud);
  }

  // Handle special celestial color with rainbow animation
  let c;
  if (color === "celestial") {
    hud.style.animation =
      "celestialTextOnly 3s linear infinite, celestialBorderOnly 3s linear infinite";
    hud.style.border = "2px solid #ff0080";
    hud.style.color = "#ff0080"; // Fallback color
    c = "#ff0080"; // Set c for template usage
  } else {
    hud.style.animation = "";
    c =
      color ||
      getComputedStyle(hud).getPropertyValue("color") ||
      "var(--primary-color)";
    hud.style.color = c;
    hud.style.border = `2px solid ${c}`;
  }

  // Get combo count from global clickCombo if available
  const comboCount = (typeof window !== "undefined" && window.clickCombo) || 0;

  const isCelestial = color === "celestial";
  const numberBorderStyle = isCelestial
    ? "border: 1px solid #ff0080; animation: celestialBorderOnly 3s linear infinite;"
    : `border: 1px solid ${c};`;

  hud.innerHTML = `
    <div style="text-align: center; line-height: 1.4;">
      <div style="margin-bottom: 0.3rem;">COMBO:</div>
      <div style="padding: 0.15rem 0.4rem; ${numberBorderStyle} border-radius: 999px; background: rgba(0,0,0,0.25); font-weight: bold; margin-bottom: 0.6rem; display: inline-block; color: #ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.4);">x${comboCount}</div>
      <div style="margin-bottom: 0.3rem;">Total Packets:</div>
      <div style="padding: 0.15rem 0.4rem; ${numberBorderStyle} border-radius: 999px; background: rgba(0,0,0,0.25); font-weight: bold; margin-bottom: 0.6rem; display: inline-block; color: #ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.4);">+${Number(total || 0).toLocaleString()}</div>
      <div style="margin-bottom: 0.3rem;">Total EXP:</div>
      <div style="padding: 0.15rem 0.4rem; ${numberBorderStyle} border-radius: 999px; background: rgba(0,0,0,0.25); font-weight: bold; display: inline-block; color: #ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.4);">+${Number(totalXP || 0).toLocaleString()}</div>
    </div>
  `;

  // Bump animation via transform
  hud.style.transition = "transform 120ms ease";
  hud.style.transform = "translate(-50%, -6px) scale(1.06)";
  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        const h = document.getElementById(HUD_IDS.comboTotal);
        if (h) h.style.transform = "translate(-50%, 0) scale(1)";
      } catch (_) {}
    }, 130);
  });
}

/**
 * Hide the combo total HUD after a delay.
 * @param {number} timeoutMs
 */
export function hideComboTotalHUD(timeoutMs = 2200) {
  if (typeof document === "undefined") return;
  if (_comboHideTimer) clearTimeout(_comboHideTimer);

  const remove = () => {
    const h = document.getElementById(HUD_IDS.comboTotal);
    if (h && h.parentNode) h.parentNode.removeChild(h);
  };

  if (timeoutMs <= 0) {
    remove();
    return;
  }

  _comboHideTimer = setTimeout(remove, timeoutMs);
}

/**
 * Show a HUD notification (toast). Delegates to PacketUI when available.
 * @param {string} msg
 * @param {string} [icon="✨"]
 * @param {number} [duration=1800]
 */
/**
 * Get current viewport information for scroll-aware positioning
 * @returns {Object} viewport info with scrollY and viewportHeight
 */
function getViewportInfo() {
  try {
    const scrollY =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    return {
      scrollY: Math.max(0, scrollY),
      viewportHeight: Math.max(300, viewportHeight),
    };
  } catch (e) {
    // Fallback for edge cases
    return { scrollY: 0, viewportHeight: 600 };
  }
}

export function showHudNotify(msg, icon = "✨", duration = 1800) {
  if (typeof document === "undefined") return;

  // Delegate to PacketUI if available (non-breaking)
  try {
    if (
      typeof window !== "undefined" &&
      window.PacketUI &&
      typeof window.PacketUI.showHudNotify === "function"
    ) {
      return window.PacketUI.showHudNotify(msg, icon);
    }
  } catch (_) {}

  // Fallback implementation
  // Remove any existing to avoid stacking glitches
  try {
    document.querySelectorAll(".hud-notify").forEach((n) => n.remove());
  } catch (_) {}

  // Get current scroll position to follow user
  const viewport = getViewportInfo();

  const hud = document.createElement("div");
  hud.id = HUD_IDS.notify;
  hud.className = "hud-notify hud-notify-follow";
  hud.style.position = "absolute";
  hud.style.top = `${viewport.scrollY + Math.max(140, viewport.viewportHeight * 0.28)}px`;
  hud.style.left = "50%";
  hud.style.transform = "translate(-50%, 0)";
  hud.style.padding = "10px 18px";
  hud.style.borderRadius = "14px";
  hud.style.fontWeight = "bold";
  hud.style.fontSize = "clamp(1.1rem, 3vw, 1.5rem)";
  hud.style.background =
    "linear-gradient(135deg, var(--bg-secondary, #1b2431), var(--bg-card, #131a24))";
  hud.style.color = "var(--primary-color, #65ffda)";
  hud.style.boxShadow =
    "0 2px 12px var(--shadow-primary, rgba(0,0,0,0.35)), 0 0 0 1px rgba(255,255,255,0.08) inset";
  hud.style.zIndex = "1200";
  hud.style.pointerEvents = "none";
  hud.style.maxWidth = "90vw";
  hud.style.wordWrap = "break-word";
  hud.style.textAlign = "center";
  hud.style.backdropFilter = "blur(6px)";
  hud.style.opacity = "0";
  hud.style.transition = "opacity 160ms ease, transform 160ms ease";
  hud.innerHTML = icon
    ? `<span style="margin-right:0.5em;">${icon}</span>${msg}`
    : msg;

  document.body.appendChild(hud);

  // Animate in
  requestAnimationFrame(() => {
    hud.style.opacity = "0.98";
    hud.style.transform = "translate(-50%, -4px)";
  });

  if (_notifyHideTimer) clearTimeout(_notifyHideTimer);
  _notifyHideTimer = setTimeout(
    () => {
      try {
        hud.style.opacity = "0";
        hud.style.transform = "translate(-50%, 0)";
        setTimeout(() => {
          if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
        }, 220);
      } catch (_) {}
    },
    Math.max(600, Number(duration) || 1800),
  );
}

/**
 * Remove all HUD overlays created by this module.
 */
export function clearHUD() {
  if (typeof document === "undefined") return;
  try {
    const ids = [HUD_IDS.comboTotal, HUD_IDS.notify];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  } catch (_) {}
}
