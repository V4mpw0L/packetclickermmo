// ui.js - Modular UI rendering for buttons and menus

/**
 * Renders a button with given options.
 * @param {Object} opts
 * @param {string} opts.id - Button id (optional)
 * @param {string} opts.className - Additional classes (optional)
 * @param {string} opts.label - Button label (HTML allowed)
 * @param {string} opts.type - Button type (button, submit, etc.)
 * @param {boolean} opts.disabled - Disabled state
 * @param {string} opts.dataAttr - Data attribute string (e.g., 'data-boost="id"')
 * @returns {string} HTML string for the button
 */
export function renderButton({
  id = "",
  className = "",
  label = "",
  type = "button",
  disabled = false,
  dataAttr = "",
} = {}) {
  const trimmed = (className || "").trim();
  const hasButtonClass = /\b(neon-btn|gem-btn|upgrade-btn|tab-btn)\b/.test(
    trimmed,
  );
  const classList = (hasButtonClass ? "" : "neon-btn ") + trimmed;
  const finalClass = classList.trim() || "neon-btn";
  return `<button${id ? ` id="${id}"` : ""} class="${finalClass}" type="${type}"${disabled ? " disabled" : ""}${dataAttr ? " " + dataAttr : ""}>${label}</button>`;
}

/**
 * Renders a menu with given items.
 * @param {Object[]} items - Array of menu item objects
 * @param {string} items[].label - Item label (HTML allowed)
 * @param {string} items[].id - Item id (optional)
 * @param {string} items[].className - Additional classes (optional)
 * @param {boolean} items[].disabled - Disabled state
 * @param {string} items[].dataAttr - Data attribute string (optional)
 * @returns {string} HTML string for the menu
 */
export function renderMenu(items = []) {
  return `<div class="menu-bar">${items
    .map(
      (item) =>
        `<button${item.id ? ` id="${item.id}"` : ""} class="tab-btn ${item.className || ""}"${
          item.disabled ? " disabled" : ""
        }${item.dataAttr ? " " + item.dataAttr : ""}>${item.label}</button>`,
    )
    .join("")}</div>`;
}

/**
 * Renders a group of buttons (e.g., for a shop or upgrades).
 * @param {Object[]} buttons - Array of button option objects (see renderButton)
 * @returns {string} HTML string for the button group
 */
export function renderButtonGroup(buttons = []) {
  return `<div class="button-group">${buttons.map(renderButton).join("")}</div>`;
}

/**
 * Renders a select dropdown.
 * @param {Object} opts
 * @param {string} opts.id - Select id
 * @param {string} opts.className - Additional classes
 * @param {Object[]} opts.options - Array of { value, label, selected }
 * @returns {string} HTML string for the select
 */
export function renderSelect({ id = "", className = "", options = [] } = {}) {
  return `<select${id ? ` id="${id}"` : ""} class="${className}">${options
    .map(
      (opt) =>
        `<option value="${opt.value}"${opt.selected ? " selected" : ""}>${opt.label}</option>`,
    )
    .join("")}</select>`;
}
