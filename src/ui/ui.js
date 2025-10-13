/**
 * UI helpers for Packet Clicker
 * - Modal open/close
 * - HUD notifications
 * - Theme application
 *
 * Non-breaking: attaches functions only if not already defined.
 * Also exposes a PacketUI namespace and CommonJS/AMD compatibility.
 */
(function (global) {
  "use strict";

  // Ensure tab titles are centered across the app
  try {
    if (
      typeof document !== "undefined" &&
      document &&
      !document.getElementById("pc-title-center-style")
    ) {
      var st = document.createElement("style");
      st.id = "pc-title-center-style";
      st.textContent = ".tab-title{ text-align:center; }";
      if (document.head) document.head.appendChild(st);
    }
  } catch (_) {}

  // Utility: safe DOM query
  function $(sel) {
    return typeof document !== "undefined" ? document.querySelector(sel) : null;
  }

  // Utility: add and remember event handlers for cleanup (stored on element)
  function addTrackedEvent(target, type, handler, options) {
    if (!target || !type || !handler) return;
    target.addEventListener(type, handler, options);
    const key = `_handlers_${type}`;
    if (!target[key]) target[key] = new Set();
    target[key].add(handler);
  }

  function removeTrackedEvents(target, type) {
    if (!target) return;
    const key = `_handlers_${type}`;
    const set = target[key];
    if (set && set.size) {
      for (const h of set) {
        target.removeEventListener(type, h);
      }
      set.clear();
    }
  }

  /**
   * Apply visual theme to the document. If global state/save exist, update them too.
   * @param {string} themeId
   * @param {{themes?: any}} [opts]
   */
  function applyTheme(themeId, opts) {
    if (typeof document === "undefined") return;

    const themes = (opts && opts.themes) || global.THEMES || null;
    if (!themes) return;

    const theme = themes[themeId];
    if (!theme) return;

    // Mark active theme
    document.documentElement.setAttribute("data-theme", themeId);

    // Update CSS custom properties
    const root = document.documentElement.style;
    if (Array.isArray(theme.colors) && theme.colors.length >= 3) {
      root.setProperty("--primary-color", theme.colors[0]);
      root.setProperty("--secondary-color", theme.colors[1]);
      root.setProperty("--bg-secondary", theme.colors[2]);
    }

    // Persist on existing state/save if present (non-breaking)
    if (global.state) {
      try {
        global.state.theme = themeId;
        if (typeof global.save === "function") {
          global.save();
        }
      } catch {
        // ignore persistence errors
      }
    }
  }

  /**
   * Show a transient HUD notification
   * @param {string} msg
   * @param {string} [icon="✨"]
   */
  function showHudNotify(msg, icon) {
    if (typeof document === "undefined") return;
    const ico = icon == null ? "✨" : icon;

    // Remove existing notifications to avoid stacking overflow
    document.querySelectorAll(".hud-notify").forEach((n) => n.remove());

    // Check if this is an event-related notification
    const isEventNotification =
      msg.toLowerCase().includes("event") ||
      msg.toLowerCase().includes("packet rain") ||
      msg.toLowerCase().includes("gem rush") ||
      msg.toLowerCase().includes("crit frenzy") ||
      msg.toLowerCase().includes("upgrade discount") ||
      msg.toLowerCase().includes("bonus packets") ||
      ico === "⏰" ||
      ico === "🎪";

    // Simple number formatting - only format if not already styled
    let formattedMsg = msg;
    if (!formattedMsg.includes("<span") && !formattedMsg.includes("style=")) {
      if (isEventNotification) {
        // Apply gold glow effect for event notifications - numbers, multipliers, percentages, and time units
        formattedMsg = formattedMsg.replace(
          /(\d+(?:\.\d+)?(?:x|%|s|sec|second|seconds|min|minute|minutes|hr|hour|hours)?\b)/g,
          '<span class="event-number-glow">$1</span>',
        );
      } else {
        // Regular gold color for non-event notifications
        formattedMsg = formattedMsg.replace(
          /(\+?\d{1,3}(?:,\d{3})*)/g,
          '<span style="color:#ffd700; font-weight:bold;">$1</span>',
        );
      }
    }

    const hud = document.createElement("div");
    hud.className = "hud-notify";
    hud.innerHTML = `<span style="font-size:1.3em;">${ico}</span> <span>${formattedMsg}</span>`;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.className = "hud-close-btn";
    addTrackedEvent(closeBtn, "click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
    });

    hud.appendChild(closeBtn);
    document.body.appendChild(hud);

    // Animate in
    setTimeout(() => hud.classList.add("active"), 60);

    // Auto dismiss
    setTimeout(() => {
      hud.classList.remove("active");
      setTimeout(() => {
        if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
      }, 500);
    }, 3000);
  }

  /**
   * Open modal with provided HTML content
   * Expects #modal-backdrop and #modal to exist in DOM (as in index.html).
   * @param {string} title
   * @param {string} html
   */
  function showModal(title, html) {
    if (typeof document === "undefined") return;

    const backdrop = $("#modal-backdrop");
    const modal = $("#modal");
    if (!backdrop || !modal) return;

    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
    modal.classList.remove("hidden");

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("tabindex", "-1");

    modal.innerHTML = `<h2 id="modal-title" class="tab-title" style="background: linear-gradient(90deg, #c4ebea33, transparent); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm); text-align: center;">${title}</h2>
      <div>${html}</div>
      <button id="modal-close-btn" class="mt-5 neon-btn w-full">Close</button>
    `;

    const closeBtn = modal.querySelector("#modal-close-btn");
    if (closeBtn) {
      addTrackedEvent(closeBtn, "click", closeModal);
    }

    // Keyboard: ESC closes
    const keydownHandler = function (e) {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    addTrackedEvent(document, "keydown", keydownHandler);

    // Backdrop click closes
    const backdropClickHandler = function (e) {
      if (e.target === backdrop) {
        closeModal();
      }
    };
    addTrackedEvent(backdrop, "click", backdropClickHandler);

    // Store refs for cleanup
    backdrop._keydownHandler = keydownHandler;
    backdrop._backdropClickHandler = backdropClickHandler;

    // Focus first focusable element or the modal itself
    setTimeout(() => {
      const firstFocusable = modal.querySelector(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (firstFocusable && typeof firstFocusable.focus === "function") {
        firstFocusable.focus();
      } else if (typeof modal.focus === "function") {
        modal.focus();
      }
    }, 100);
  }

  /**
   * Close and cleanup modal
   */
  function closeModal() {
    if (typeof document === "undefined") return;

    const backdrop = $("#modal-backdrop");
    const modal = $("#modal");
    if (!backdrop || !modal) return;

    // Blur focused control inside modal to avoid focus traps
    try {
      const focusedInModal = modal.querySelector(":focus");
      if (focusedInModal && typeof focusedInModal.blur === "function") {
        focusedInModal.blur();
      }
    } catch {
      // ignore
    }

    // Remove tracked handlers
    if (backdrop._keydownHandler) {
      document.removeEventListener("keydown", backdrop._keydownHandler);
      backdrop._keydownHandler = null;
    } else {
      removeTrackedEvents(document, "keydown");
    }

    if (backdrop._backdropClickHandler) {
      backdrop.removeEventListener("click", backdrop._backdropClickHandler);
      backdrop._backdropClickHandler = null;
    } else {
      removeTrackedEvents(backdrop, "click");
    }

    backdrop.classList.add("hidden");
    backdrop.setAttribute("aria-hidden", "true");

    modal.classList.add("hidden");
    modal.innerHTML = "";

    // Return focus to body shortly after to stabilize screen readers
    setTimeout(() => {
      try {
        if (
          document &&
          document.body &&
          typeof document.body.focus === "function"
        ) {
          document.body.focus();
        }
      } catch {
        // ignore
      }
    }, 10);
  }

  // Public API
  const api = {
    applyTheme,
    showHudNotify,
    showModal,
    closeModal,
  };

  // Non-breaking global attachment: don't override if already defined
  if (typeof global.applyTheme !== "function") global.applyTheme = applyTheme;
  if (typeof global.showHudNotify !== "function")
    global.showHudNotify = showHudNotify;
  if (typeof global.showModal !== "function") global.showModal = showModal;
  if (typeof global.closeModal !== "function") global.closeModal = closeModal;

  // Namespaced access
  global.PacketUI = Object.assign({}, global.PacketUI || {}, api);

  // CommonJS / AMD support (optional)
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else if (typeof define === "function" && define.amd) {
    define(function () {
      return api;
    });
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
