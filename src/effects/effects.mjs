/**
 * effects.mjs
 * Visual effects and combo logic for Packet Clicker MMO
 *
 * Exports:
 * - startAnimalAura(clickCombo?: number)
 * - stopAnimalAura()
 * - activateMegaFX()
 * - handleComboEffect(clickCombo: number, amount: number, state: object)
 * - animalCritBurst(durationMs?: number)
 *
 * Design goals:
 * - Smooth performance on low-end devices (particle pool, RAF batching, caps)
 * - No hard dependency on build tooling (pure ESM, DOM-guarded)
 * - Non-breaking: works with existing CSS classes and DOM IDs
 */

/* =========================
   Module-scoped state
   ========================= */
let _animalAuraLayer = null;
let _animalAuraRafId = null;
let _animalAuraStart = 0;
let _animalAuraInterval = null;
let _animalCritBurstUntil = 0;
let _animalFXTimer = null;
let _ultraFXTimer = null;
let _megaFXTimer = null;

/* Particle pool for low-end devices (reuse DOM nodes to minimize allocations) */
const POOL_SIZE = 64;
let _particlePool = [];
let _particleInUse = new Set();

/* =========================
   Utilities
   ========================= */
function hasDOM() {
  return typeof document !== "undefined" && typeof window !== "undefined";
}
function getBody() {
  return hasDOM() ? document.body : null;
}
function byId(id) {
  return hasDOM() ? document.getElementById(id) : null;
}

/* =========================
   Particle Pool Helpers
   ========================= */
function initParticlePool() {
  if (!hasDOM() || !_animalAuraLayer) return;
  if (_particlePool.length) return;

  for (let i = 0; i < POOL_SIZE; i++) {
    const el = document.createElement("div");
    el.className = "animal-particle";
    el.style.position = "fixed";
    el.style.pointerEvents = "none";
    el.style.borderRadius = "50%";
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -50%)";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    el.style.zIndex = "2050";
    (_animalAuraLayer || getBody()).appendChild(el);
    _particlePool.push(el);
  }
}

function getParticle() {
  if (!hasDOM()) return null;
  if (!_animalAuraLayer) return null;
  initParticlePool();
  let el =
    _particlePool.length > 0
      ? _particlePool.pop()
      : document.createElement("div");
  if (!el.parentNode) (_animalAuraLayer || getBody()).appendChild(el);
  _particleInUse.add(el);
  // Reset visual
  el.style.transition = "none";
  el.style.filter = "none";
  el.style.opacity = "1";
  el.style.display = "block";
  return el;
}

function releaseParticle(el) {
  if (!hasDOM() || !el) return;
  el.style.opacity = "0";
  el.style.left = "-9999px";
  el.style.top = "-9999px";
  el.style.width = "0px";
  el.style.height = "0px";
  el.style.boxShadow = "none";
  el.style.background = "transparent";
  el.style.transition = "none";
  _particleInUse.delete(el);
  if (_particlePool.length < POOL_SIZE) _particlePool.push(el);
  else if (el.parentNode) el.parentNode.removeChild(el);
}

/* =========================
   Public: ANIMAL aura
   ========================= */
/**
 * Start continuous ANIMAL aura around #click-btn
 * Optimized: pooled particles, RAF parallax, capped active count
 */
export function startAnimalAura(clickCombo = 30) {
  if (!hasDOM()) return;
  try {
    // Ensure a dedicated aura layer exists
    if (!_animalAuraLayer) {
      _animalAuraLayer = byId("animal-aura-layer");
      if (!_animalAuraLayer) {
        _animalAuraLayer = document.createElement("div");
        _animalAuraLayer.id = "animal-aura-layer";
        _animalAuraLayer.style.position = "fixed";
        _animalAuraLayer.style.inset = "0";
        _animalAuraLayer.style.pointerEvents = "none";
        _animalAuraLayer.style.zIndex = "2049";
        _animalAuraLayer.style.transform = "translate(0,0)";
        getBody() && getBody().appendChild(_animalAuraLayer);
      }
      initParticlePool();
    }

    // Start parallax drift if not running
    if (!_animalAuraRafId) {
      _animalAuraStart = performance.now();
      const drift = () => {
        const t = performance.now() - _animalAuraStart;
        // Small smooth drift to avoid static feeling
        const dx = Math.sin(t / 850) * 6 + Math.sin(t / 2200) * 4;
        const dy = Math.cos(t / 1100) * 5 + Math.sin(t / 1800) * 3;
        if (_animalAuraLayer) {
          _animalAuraLayer.style.transform = `translate(${dx}px, ${dy}px)`;
        }
        _animalAuraRafId = requestAnimationFrame(drift);
      };
      _animalAuraRafId = requestAnimationFrame(drift);
    }

    // Start spawning
    if (_animalAuraInterval) return;
    const rateMs = 70; // lower rate than 45ms for perf

    _animalAuraInterval = setInterval(() => {
      const btn = byId("click-btn");
      if (!btn) return;

      // Limit ACTUAL active particles (ignore pooled hidden nodes)
      const maxParticles = 32;
      if (_particleInUse.size >= maxParticles) return;

      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Create a tiny particle near the button center with randomized radial motion
      const p = getParticle();
      if (!p) return;

      const size = 2.5 + Math.random() * 3.5;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = cx + "px";
      p.style.top = cy + "px";

      // Alternate warm flame and electric cyan particles
      const burstActive =
        typeof _animalCritBurstUntil === "number" &&
        Date.now() < _animalCritBurstUntil;
      const hue = Math.random() < 0.5 ? 8 : 28;
      const lightness = burstActive ? 58 : 56;
      p.style.background = `radial-gradient(circle, rgba(255,200,160,0.85) 0 35%, hsla(${hue}, 100%, ${lightness}%, ${
        burstActive ? 1 : 0.95
      }))`;
      p.style.boxShadow = `0 0 ${Math.round(10 + Math.random() * 14)}px hsla(${hue}, 100%, ${
        lightness + 2
      }%, ${burstActive ? 0.95 : 0.8})`;

      // Random orbit vector with slight upward bias for flame feeling
      const angle = Math.random() * Math.PI * 2;
      const growth = 1 + Math.min(Math.max(clickCombo - 30, 0) / 12, 4.0);
      const dist =
        (rect.width * 0.25 + Math.random() * rect.width * 0.4) * growth;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - (4 + Math.random() * 10);

      requestAnimationFrame(() => {
        const travel = 420 + Math.min(1, dist / Math.max(1, rect.width)) * 420;
        p.style.transition = `transform ${Math.round(
          travel,
        )}ms ease-out, opacity ${Math.round(
          travel + 40,
        )}ms ease-out, filter ${Math.round(travel + 40)}ms ease-out`;
        p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${
          0.7 + Math.random() * 0.7
        })`;
        p.style.opacity = "0";
        p.style.filter = "blur(0.5px)";
      });

      setTimeout(
        () => {
          releaseParticle(p);
        },
        Math.round(
          420 +
            Math.min(1, dist / Math.max(1, rect.width)) * 620 +
            260 +
            Math.random() * 160,
        ),
      );
    }, rateMs);
  } catch {
    // ignore
  }
}

/**
 * Stop continuous ANIMAL aura particles
 */
export function stopAnimalAura() {
  if (!hasDOM()) return;
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
  } catch {
    // ignore
  }
}

/* =========================
   Public: Mega FX sentinel
   ========================= */
export function activateMegaFX() {
  if (!hasDOM()) return;
  try {
    const body = getBody();
    if (!body) return;
    body.classList.add("mega-active");
    let sentinel = byId("mega-sentinel");
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
      body.appendChild(sentinel);
    }
    if (_megaFXTimer) clearTimeout(_megaFXTimer);
    _megaFXTimer = setTimeout(() => {
      try {
        body.classList.remove("mega-active");
        const s = byId("mega-sentinel");
        if (s && s.parentNode) s.parentNode.removeChild(s);
      } catch {
        // ignore
      }
      _megaFXTimer = null;
    }, 1200);
  } catch {
    // ignore
  }
}

/* =========================
   Public: Combo effect dispatcher
   ========================= */
/**
 * Returns the text/class for the fly-up click effect and applies combo bonuses.
 * Also coordinates ULTRA/ANIMAL temporary body effects and auras.
 */
export function handleComboEffect(clickCombo, amount, state) {
  let effectText = `+${amount}`;
  let displayedGain = amount;
  let effectClass = "";

  const safeAddPackets = (extra) => {
    if (state && typeof extra === "number" && extra > 0) {
      state.packets += extra;
      if (state.stats) {
        state.stats.totalPackets = (state.stats.totalPackets || 0) + extra;
      }
    }
  };

  if (clickCombo >= 30) {
    effectClass = "animal-combo";
    const extra = Math.floor(amount * 0.99);
    safeAddPackets(extra);
    displayedGain += extra;
    effectText = `<span style="color:#ff3040">ANIMAL! +${amount} (+99%)</span>`;

    if (hasDOM()) {
      try {
        const body = getBody();
        if (body) body.classList.add("animal-active");
        // Button glow + shake during ANIMAL
        const clickBtn = byId("click-btn");
        if (clickBtn) {
          if (typeof clickBtn._prevShadow === "undefined") {
            clickBtn._prevShadow = clickBtn.style.boxShadow || "";
          }
          clickBtn.style.boxShadow =
            "0 0 0.75rem rgba(255, 48, 64, 0.9), 0 0 1.75rem rgba(255, 48, 32, 0.7), 0 0 2.75rem rgba(255, 96, 0, 0.55)";
          clickBtn.classList.add("shake-element");
          setTimeout(() => clickBtn.classList.remove("shake-element"), 320);
        }

        let sentinel = byId("animal-sentinel");
        if (!sentinel) {
          sentinel = document.createElement("div");
          sentinel.id = "animal-sentinel";
          sentinel.className = "click-effect animal-combo";
          sentinel.style.position = "fixed";
          sentinel.style.left = "-9999px";
          sentinel.style.top = "-9999px";
          sentinel.style.width = "1px";
          sentinel.style.height = "1px";
          sentinel.style.opacity = "0";
          sentinel.style.pointerEvents = "none";
          getBody() && getBody().appendChild(sentinel);
        }

        startAnimalAura(clickCombo);
        if (_animalFXTimer) clearTimeout(_animalFXTimer);
        _animalFXTimer = setTimeout(() => {
          try {
            const body2 = getBody();
            if (body2) body2.classList.remove("animal-active");
            const s = byId("animal-sentinel");
            if (s && s.parentNode) s.parentNode.removeChild(s);
            stopAnimalAura();
            const btn2 = byId("click-btn");
            if (btn2 && typeof btn2._prevShadow !== "undefined") {
              btn2.style.boxShadow = btn2._prevShadow;
              delete btn2._prevShadow;
            }
          } catch {
            // ignore
          }
          _animalFXTimer = null;
        }, 1600);
      } catch {
        // ignore DOM errors
      }
    }
  } else if (clickCombo >= 20) {
    effectClass = "ultra-combo";
    const extra = Math.floor(amount * 0.5);
    safeAddPackets(extra);
    displayedGain += extra;
    effectText = `<span style="color:#ff4dff">ULTRA! +${amount} (+50%)</span>`;

    if (hasDOM()) {
      try {
        const body = getBody();
        if (body) body.classList.add("ultra-active");
        let sentinel = byId("ultra-sentinel");
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
          getBody() && getBody().appendChild(sentinel);
        }
        if (_ultraFXTimer) clearTimeout(_ultraFXTimer);
        _ultraFXTimer = setTimeout(() => {
          try {
            const body2 = getBody();
            if (body2) body2.classList.remove("ultra-active");
            const s = byId("ultra-sentinel");
            if (s && s.parentNode) s.parentNode.removeChild(s);
          } catch {
            // ignore
          }
          _ultraFXTimer = null;
        }, 1400);
      } catch {
        // ignore
      }
    }
  } else if (clickCombo >= 10) {
    effectClass = "mega-combo";
    activateMegaFX();
    const extra = Math.floor(amount * 0.25);
    safeAddPackets(extra);
    displayedGain += extra;
    effectText = `MEGA! +${amount} (+25%)`;

    // Shake the click button briefly on MEGA
    if (hasDOM()) {
      const btn = byId("click-btn");
      if (btn) {
        btn.classList.add("shake-element");
        setTimeout(() => btn.classList.remove("shake-element"), 220);
      }
    }
  } else if (clickCombo >= 5) {
    effectClass = "combo";
    const extra = Math.floor(amount * 0.1);
    safeAddPackets(extra);
    displayedGain += extra;
    effectText = `${clickCombo}x +${amount} (+10%)`;

    // Light shake on standard combo
    if (hasDOM()) {
      const btn = byId("click-btn");
      if (btn) {
        btn.classList.add("shake-element");
        setTimeout(() => btn.classList.remove("shake-element"), 160);
      }
    }
  }

  return { effectText, displayedGain, effectClass };
}

/* =========================
   Public: Crit burst (enhances aura bias)
   ========================= */
export function animalCritBurst(durationMs = 800) {
  _animalCritBurstUntil = Date.now() + (durationMs || 800);
}
