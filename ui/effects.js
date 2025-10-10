/**
 * effects.js
 * Modularized visual and combo effect logic for Packet Clicker MMO
 * Handles: ANIMAL, ULTRA, MEGA, and combo streak effects
 * Exports: startAnimalAura, stopAnimalAura, activateMegaFX, handleComboEffect, animalCritBurst
 */

let _animalAuraLayer = null;
let _animalAuraRafId = null;
let _animalAuraStart = 0;
let _animalAuraInterval = null;
let _animalCritBurstUntil = 0;
let _animalFXTimer = null;
let _ultraFXTimer = null;
let _megaFXTimer = null;

export function animalCritBurst(durationMs = 800) {
  _animalCritBurstUntil = Date.now() + durationMs;
}

/**
 * Start continuous ANIMAL aura particles around the click button.
 * Optimized for performance: reduced interval, limited DOM churn.
 */
export function startAnimalAura(clickCombo = 30) {
  try {
    // Ensure a dedicated aura layer exists
    if (!_animalAuraLayer) {
      _animalAuraLayer = document.getElementById("animal-aura-layer");
      if (!_animalAuraLayer) {
        _animalAuraLayer = document.createElement("div");
        _animalAuraLayer.id = "animal-aura-layer";
        _animalAuraLayer.style.position = "fixed";
        _animalAuraLayer.style.inset = "0";
        _animalAuraLayer.style.pointerEvents = "none";
        _animalAuraLayer.style.zIndex = "2049";
        _animalAuraLayer.style.transform = "translate(0,0)";
        document.body.appendChild(_animalAuraLayer);
      }
    }

    // Start parallax drift if not running
    if (!_animalAuraRafId) {
      _animalAuraStart = performance.now();
      const drift = () => {
        const t = performance.now() - _animalAuraStart;
        const dx = Math.sin(t / 850) * 6 + Math.sin(t / 2200) * 4;
        const dy = Math.cos(t / 1100) * 5 + Math.sin(t / 1800) * 3;
        if (_animalAuraLayer) {
          _animalAuraLayer.style.transform = `translate(${dx}px, ${dy}px)`;
        }
        _animalAuraRafId = requestAnimationFrame(drift);
      };
      _animalAuraRafId = requestAnimationFrame(drift);
    }

    if (_animalAuraInterval) return;
    const rateMs = 70; // Optimized: less frequent than original

    _animalAuraInterval = setInterval(() => {
      const btn = document.getElementById("click-btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Limit number of particles in DOM
      const maxParticles = 32;
      const particles = _animalAuraLayer.querySelectorAll(".animal-particle");
      if (particles.length > maxParticles) {
        for (let i = 0; i < particles.length - maxParticles; ++i) {
          particles[i].remove();
        }
      }

      // Create a tiny particle near the button center with randomized radial motion
      const p = document.createElement("div");
      const size = 2.5 + Math.random() * 3.5;
      p.className = "animal-particle";
      p.style.position = "fixed";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.pointerEvents = "none";
      p.style.borderRadius = "50%";
      // Alternate warm flame and electric cyan particles
      const growthHint = Math.min(Math.max(clickCombo - 30, 0) / 12, 4.0);
      const burstActive =
        typeof _animalCritBurstUntil === "number" &&
        Date.now() < _animalCritBurstUntil;
      const nearWarmBias = Math.random() < (burstActive ? 0.95 : 0.85);
      const hue = nearWarmBias ? (Math.random() < 0.6 ? 28 : 8) : 195;
      const lightness = nearWarmBias ? (burstActive ? 58 : 56) : 62;
      p.style.background = `radial-gradient(circle, rgba(255,200,160,0.85) 0 35%, hsla(${hue}, 100%, ${lightness}%, ${burstActive ? 1 : 0.95}))`;
      p.style.boxShadow = `0 0 ${Math.round(10 + Math.random() * 14)}px hsla(${hue}, 100%, ${lightness + 2}%, ${burstActive ? 0.95 : 0.8})`;
      p.style.zIndex = "2050";
      p.style.opacity = "1";
      p.style.transform = "translate(-50%, -50%)";
      (_animalAuraLayer || document.body).appendChild(p);

      // Random orbit vector with slight upward bias for flame feeling
      const angle = Math.random() * Math.PI * 2;
      const growth = 1 + Math.min(Math.max(clickCombo - 30, 0) / 12, 4.0);
      const dist =
        (rect.width * 0.25 + Math.random() * rect.width * 0.4) * growth;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - (4 + Math.random() * 10);

      requestAnimationFrame(() => {
        const travel = 420 + Math.min(1, dist / Math.max(1, rect.width)) * 420;
        p.style.transition = `transform ${Math.round(travel)}ms ease-out, opacity ${Math.round(travel + 40)}ms ease-out, filter ${Math.round(travel + 40)}ms ease-out`;
        p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${0.7 + Math.random() * 0.7})`;
        p.style.opacity = "0";
        p.style.filter = "blur(0.5px)";
      });

      setTimeout(
        () => {
          if (p && p.parentNode) p.parentNode.removeChild(p);
        },
        Math.round(
          420 +
            Math.min(1, dist / Math.max(1, rect.width)) * 620 +
            260 +
            Math.random() * 160,
        ),
      );
    }, rateMs);
  } catch {}
}

/**
 * Stop continuous ANIMAL aura particles.
 */
export function stopAnimalAura() {
  try {
    if (_animalAuraInterval) {
      clearInterval(_animalAuraInterval);
      _animalAuraInterval = null;
    }
    if (_animalAuraRafId) {
      cancelAnimationFrame(_animalAuraRafId);
      _animalAuraRafId = null;
    }
    if (_animalAuraLayer) {
      _animalAuraLayer.style.transform = "translate(0,0)";
    }
  } catch {}
}

/**
 * Activate MEGA combo FX (body class, sentinel).
 */
export function activateMegaFX() {
  try {
    document.body.classList.add("mega-active");
    let sentinel = document.getElementById("mega-sentinel");
    if (!sentinel) {
      sentinel = document.createElement("div");
      sentinel.id = "mega-sentinel";
      sentinel.className = "click-effect mega-combo";
      sentinel.style.position = "fixed";
      sentinel.style.left = "-9999px";
      sentinel.style.top = "-9999px";
      sentinel.style.width = "1px";
      sentinel.style.height = "1px";
      sentinel.style.opacity = "0";
      sentinel.style.pointerEvents = "none";
      document.body.appendChild(sentinel);
    }
    if (_megaFXTimer) clearTimeout(_megaFXTimer);
    _megaFXTimer = setTimeout(() => {
      try {
        document.body.classList.remove("mega-active");
        const s = document.getElementById("mega-sentinel");
        if (s && s.parentNode) s.parentNode.removeChild(s);
      } catch {}
      _megaFXTimer = null;
    }, 1200);
  } catch {}
}

/**
 * Handle combo effect logic and visuals.
 * @param {number} clickCombo - Current combo count
 * @param {number} amount - Amount gained per click
 * @param {object} state - Game state object
 * @returns {object} {effectText, displayedGain, effectClass}
 */
export function handleComboEffect(clickCombo, amount, state) {
  let effectText = `+${amount}`;
  let displayedGain = amount;
  let effectClass = "";

  if (clickCombo >= 30) {
    effectClass = "ultra-combo animal-combo";
    const extra = Math.floor(amount * 0.99);
    state.packets += extra;
    state.stats.totalPackets += extra;
    displayedGain += extra;
    effectText = `ANIMAL! +${amount} (+99%)`;
    // Button glow + shake during ANIMAL for better feedback
    const clickBtn = document.getElementById("click-btn");
    if (clickBtn) {
      if (typeof clickBtn._prevShadow === "undefined") {
        clickBtn._prevShadow = clickBtn.style.boxShadow || "";
      }
      clickBtn.style.boxShadow =
        "0 0 0.75rem rgba(255, 48, 64, 0.9), 0 0 1.75rem rgba(255, 48, 64, 0.7), 0 0 2.75rem rgba(255, 96, 128, 0.55)";
      clickBtn.classList.add("shake-element");
      setTimeout(() => clickBtn.classList.remove("shake-element"), 320);
    }
    // ANIMAL FX
    if (typeof window !== "undefined") {
      document.body.classList.add("animal-active");
      let sentinel = document.getElementById("animal-sentinel");
      if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = "animal-sentinel";
        sentinel.className = "click-effect ultra-combo";
        sentinel.style.position = "fixed";
        sentinel.style.left = "-9999px";
        sentinel.style.top = "-9999px";
        sentinel.style.width = "1px";
        sentinel.style.height = "1px";
        sentinel.style.opacity = "0";
        sentinel.style.pointerEvents = "none";
        document.body.appendChild(sentinel);
      }
      startAnimalAura(clickCombo);
      if (_animalFXTimer) clearTimeout(_animalFXTimer);
      _animalFXTimer = setTimeout(() => {
        try {
          document.body.classList.remove("animal-active");
          const s = document.getElementById("animal-sentinel");
          if (s && s.parentNode) s.parentNode.removeChild(s);
          stopAnimalAura();
          // Restore button glow after ANIMAL ends
          const btn = document.getElementById("click-btn");
          if (btn && typeof btn._prevShadow !== "undefined") {
            btn.style.boxShadow = btn._prevShadow;
            delete btn._prevShadow;
          }
        } catch {}
        _animalFXTimer = null;
      }, 1600);
    }
  } else if (clickCombo >= 20) {
    effectClass = "ultra-combo";
    const extra = Math.floor(amount * 0.5);
    state.packets += extra;
    state.stats.totalPackets += extra;
    displayedGain += extra;
    effectText = `ULTRA! +${amount} (+50%)`;
    // ULTRA FX
    if (typeof window !== "undefined") {
      document.body.classList.add("ultra-active");
      let sentinel = document.getElementById("ultra-sentinel");
      if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = "ultra-sentinel";
        sentinel.className = "click-effect ultra-combo";
        sentinel.style.position = "fixed";
        sentinel.style.left = "-9999px";
        sentinel.style.top = "-9999px";
        sentinel.style.width = "1px";
        sentinel.style.height = "1px";
        sentinel.style.opacity = "0";
        sentinel.style.pointerEvents = "none";
        document.body.appendChild(sentinel);
      }
      if (_ultraFXTimer) clearTimeout(_ultraFXTimer);
      _ultraFXTimer = setTimeout(() => {
        try {
          document.body.classList.remove("ultra-active");
          const s = document.getElementById("ultra-sentinel");
          if (s && s.parentNode) s.parentNode.removeChild(s);
        } catch {}
        _ultraFXTimer = null;
      }, 1400);
    }
  } else if (clickCombo >= 10) {
    effectClass = "mega-combo";
    activateMegaFX();
    const extra = Math.floor(amount * 0.25);
    state.packets += extra;
    state.stats.totalPackets += extra;
    displayedGain += extra;
    effectText = `MEGA! +${amount} (+25%)`;
    // Shake the click button briefly on MEGA
    const __btnMega = document.getElementById("click-btn");
    if (__btnMega) {
      __btnMega.classList.add("shake-element");
      setTimeout(() => __btnMega.classList.remove("shake-element"), 220);
    }
  } else if (clickCombo >= 5) {
    effectClass = "combo";
    const extra = Math.floor(amount * 0.1);
    state.packets += extra;
    state.stats.totalPackets += extra;
    displayedGain += extra;
    effectText = `${clickCombo}x +${amount} (+10%)`;
    // Light shake on standard combo
    const __btnCombo = document.getElementById("click-btn");
    if (__btnCombo) {
      __btnCombo.classList.add("shake-element");
      setTimeout(() => __btnCombo.classList.remove("shake-element"), 160);
    }
  }

  return { effectText, displayedGain, effectClass };
}
