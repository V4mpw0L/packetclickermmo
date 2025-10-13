/**
 * src/ui/render.mjs
 * Lightweight HTML render helpers for UI elements (buttons, menus, selects).
 * These helpers return HTML strings only; no side-effects or DOM access.
 *
 * Usage:
 *   import { renderButton, renderMenu, renderButtonGroup, renderSelect } from './src/ui/render.mjs';
 *
 * Notes:
 * - Ensures consistent base classes (e.g., 'neon-btn') if no known button class is present.
 * - Allows passing either `dataAttr` (raw string) or `dataset` (object) for data-* attributes.
 * - Accepts `attrs` object for arbitrary attributes (e.g., aria-*).
 */

/* ---------------------------------- Utils --------------------------------- */

/**
 * True if the className already contains a known button class.
 */
function hasButtonClass(className = "") {
  return /\b(neon-btn|gem-btn|upgrade-btn|tab-btn)\b/.test(className);
}

/**
 * Compose a class list that guarantees a base button class when appropriate.
 * If none of the known button classes are found, prefix with 'neon-btn'.
 */
function ensureButtonClass(className = "") {
  const trimmed = String(className || "").trim();
  if (trimmed.length === 0) return "neon-btn";
  return hasButtonClass(trimmed) ? trimmed : `neon-btn ${trimmed}`.trim();
}

/**
 * Serialize an attributes object to HTML.
 * - attrs: { key: value, ... } => key="value"
 * - dataset: { foo: "bar" } => data-foo="bar"
 * - dataAttr: raw attribute string (already formatted) appended at the end
 */
function attrsToString(attrs = {}, dataset = {}, dataAttr = "") {
  const parts = [];

  // Standard attributes
  if (attrs && typeof attrs === "object") {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (v === true) {
        parts.push(`${k}`);
      } else {
        parts.push(`${k}="${escapeAttr(String(v))}"`);
      }
    }
  }

  // Dataset -> data-*
  if (dataset && typeof dataset === "object") {
    for (const [k, v] of Object.entries(dataset)) {
      if (v == null) continue;
      const key = `data-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
      parts.push(`${key}="${escapeAttr(String(v))}"`);
    }
  }

  // Raw data attribute string (for backwards-compat use-cases)
  if (dataAttr && typeof dataAttr === "string") {
    parts.push(dataAttr.trim());
  }

  return parts.length ? " " + parts.join(" ") : "";
}

/**
 * Minimal attribute value escaper.
 */
function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ------------------------------- Renderers -------------------------------- */

/**
 * Render a button.
 * @param {Object} opts
 * @param {string} [opts.id]
 * @param {string} [opts.className] - Additional classes. If no known button class is present, 'neon-btn' is prefixed.
 * @param {string} [opts.label] - Inner HTML (trusted).
 * @param {string} [opts.type='button']
 * @param {boolean} [opts.disabled=false]
 * @param {string} [opts.dataAttr] - Raw attributes string (e.g., data-boost="id")
 * @param {Object} [opts.dataset] - Map of data-* attributes (e.g., { boost: 'id' })
 * @param {Object} [opts.attrs] - Additional attributes (e.g., { 'aria-label': '...' })
 * @returns {string}
 */
export function renderButton({
  id = "",
  className = "",
  label = "",
  type = "button",
  disabled = false,
  dataAttr = "",
  dataset = null,
  attrs = null,
} = {}) {
  const finalClass = ensureButtonClass(className);
  const baseAttrs = {
    ...(id ? { id } : {}),
    class: finalClass,
    type,
    ...(disabled ? { disabled: true } : {}),
  };
  const allAttrs = attrsToString(
    { ...baseAttrs, ...(attrs || {}) },
    dataset,
    dataAttr,
  );
  return `<button${allAttrs}>${label || ""}</button>`;
}

/**
 * Render a horizontal menu (list of tab buttons).
 * @param {Array<Object>} items - Each item supports: { id, className, label, disabled, dataAttr, dataset, attrs }
 * @param {string} [wrapperClass='menu-bar']
 * @returns {string}
 */
export function renderMenu(items = [], wrapperClass = "menu-bar") {
  const html = items
    .map((item = {}) => {
      const {
        id = "",
        className = "tab-btn",
        label = "",
        disabled = false,
        dataAttr = "",
        dataset = null,
        attrs = null,
      } = item;
      const cls = hasButtonClass(className)
        ? className
        : `tab-btn ${className || ""}`.trim();
      const baseAttrs = {
        ...(id ? { id } : {}),
        class: cls,
        ...(disabled ? { disabled: true } : {}),
      };
      const allAttrs = attrsToString(
        { ...baseAttrs, ...(attrs || {}) },
        dataset,
        dataAttr,
      );
      return `<button${allAttrs}>${label || ""}</button>`;
    })
    .join("");
  return `<div class="${wrapperClass}">${html}</div>`;
}

/**
 * Render a vertical or horizontal group of buttons.
 * @param {Array<Object>} buttons - Array of button option objects (see renderButton options)
 * @param {Object} [opts]
 * @param {string} [opts.className='button-group'] - Wrapper classes
 * @returns {string}
 */
export function renderButtonGroup(
  buttons = [],
  { className = "button-group" } = {},
) {
  return `<div class="${className}">${buttons.map((b) => renderButton(b)).join("")}</div>`;
}

/**
 * Render a select dropdown.
 * @param {Object} opts
 * @param {string} [opts.id]
 * @param {string} [opts.className]
 * @param {Array<{ value: string, label: string, selected?: boolean }>} [opts.options=[]]
 * @param {string} [opts.value] - If provided, overrides 'selected' flags and selects the matching option by value.
 * @param {string} [opts.dataAttr]
 * @param {Object} [opts.dataset]
 * @param {Object} [opts.attrs]
 * @returns {string}
 */
export function renderSelect({
  id = "",
  className = "",
  options = [],
  value = undefined,
  dataAttr = "",
  dataset = null,
  attrs = null,
} = {}) {
  const baseAttrs = {
    ...(id ? { id } : {}),
    ...(className ? { class: className } : {}),
  };
  const allAttrs = attrsToString(
    { ...baseAttrs, ...(attrs || {}) },
    dataset,
    dataAttr,
  );

  const html = (options || [])
    .map((opt = {}) => {
      const { value: v = "", label = "", selected = false } = opt;
      const isSelected =
        value !== undefined ? String(value) === String(v) : !!selected;
      return `<option value="${escapeAttr(String(v))}"${
        isSelected ? " selected" : ""
      }>${label}</option>`;
    })
    .join("");

  return `<select${allAttrs}>${html}</select>`;
}

/* --------------------------------- Export --------------------------------- */

export default {
  renderButton,
  renderMenu,
  renderButtonGroup,
  renderSelect,
};
