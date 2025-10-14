/**
 * Performance Integration Patch
 * Integrates the optimized equipment system with the main game
 */

import EquipmentOptimized from '../items/equipment-optimized.mjs';
import {
  initPerformanceMonitoring,
  measureRender,
  createDebounced,
  EventManager,
  LazyImageLoader,
  getPerformanceMetrics,
  performanceConfig
} from '../utils/performance.mjs';

// Global performance manager
let performanceManager = null;
let eventManager = null;
let imageLoader = null;

// Debounced render functions
let debouncedRenderTab = null;
let debouncedUpdateTopBar = null;

/**
 * Initialize performance optimizations
 */
export function initPerformanceOptimizations() {
  // Initialize performance monitoring
  initPerformanceMonitoring();

  // Create managers
  performanceManager = {
    startTime: performance.now(),
    renderCount: 0,
    lastRender: 0
  };

  eventManager = new EventManager();
  imageLoader = new LazyImageLoader();

  // Create debounced functions
  debouncedRenderTab = createDebounced(originalRenderTab, performanceConfig.renderBatchSize);
  debouncedUpdateTopBar = createDebounced(originalUpdateTopBar, 32);

  // Add performance CSS
  injectPerformanceCSS();

  // Monitor and adjust based on performance
  setInterval(adjustPerformanceSettings, 10000);

  console.log('Performance optimizations initialized');
}

/**
 * Patch the main renderTab function
 */
export function patchRenderTab(originalRenderFn) {
  originalRenderTab = originalRenderFn;

  return function optimizedRenderTab() {
    return measureRender('tab-render', () => {
      performanceManager.renderCount++;
      performanceManager.lastRender = performance.now();

      // Use optimized equipment rendering for equipment tab
      if (window.activeTab === 'equipment') {
        return renderOptimizedEquipmentTab();
      }

      // Use original render for other tabs
      return originalRenderFn.apply(this, arguments);
    });
  };
}

/**
 * Patch the updateTopBar function
 */
export function patchUpdateTopBar(originalUpdateFn) {
  originalUpdateTopBar = originalUpdateFn;

  return function optimizedUpdateTopBar() {
    // Use debounced version to prevent excessive updates
    debouncedUpdateTopBar.apply(this, arguments);
  };
}

/**
 * Render optimized equipment tab
 */
function renderOptimizedEquipmentTab() {
  const content = EquipmentOptimized.renderTab(window.state);

  // Update DOM efficiently
  const tabContent = document.getElementById('tab-content');
  if (tabContent) {
    // Use innerHTML for initial render, then switch to incremental updates
    if (performanceManager.renderCount === 1) {
      tabContent.innerHTML = content;
    } else {
      updateEquipmentTabIncremental(content);
    }

    // Bind events with delegation
    EquipmentOptimized.bindEvents(tabContent, {
      state: window.state,
      save: window.save,
      rerender: debouncedRenderTab,
      notify: window.showHudNotify
    });

    // Initialize lazy loading for images
    tabContent.querySelectorAll('img[data-src]').forEach(img => {
      imageLoader.observe(img);
    });
  }

  return content;
}

/**
 * Incremental update for equipment tab (avoids full re-render)
 */
function updateEquipmentTabIncremental(newContent) {
  const tabContent = document.getElementById('tab-content');
  if (!tabContent) return;

  // Parse new content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = newContent;

  // Update only changed sections
  updateSectionIfChanged(tabContent, tempDiv, '.equipment-stats');
  updateSectionIfChanged(tabContent, tempDiv, '.inventory-header');
  updateSectionIfChanged(tabContent, tempDiv, '.inventory-progress');
  updateInventoryIfChanged(tabContent, tempDiv);
}

/**
 * Update section only if content has changed
 */
function updateSectionIfChanged(currentContainer, newContainer, selector) {
  const currentSection = currentContainer.querySelector(selector);
  const newSection = newContainer.querySelector(selector);

  if (currentSection && newSection && currentSection.innerHTML !== newSection.innerHTML) {
    currentSection.innerHTML = newSection.innerHTML;
  }
}

/**
 * Smart inventory update (only update visible items)
 */
function updateInventoryIfChanged(currentContainer, newContainer) {
  const currentInventory = currentContainer.querySelector('.inventory-grid, .inventory-virtual-container');
  const newInventory = newContainer.querySelector('.inventory-grid, .inventory-virtual-container');

  if (!currentInventory || !newInventory) return;

  // For virtual scrolling, only update if the total count changed
  const currentItems = currentInventory.querySelectorAll('.inventory-item');
  const newItems = newInventory.querySelectorAll('.inventory-item');

  if (currentItems.length !== newItems.length) {
    currentInventory.innerHTML = newInventory.innerHTML;
  }
}

/**
 * Patch Equipment object to use optimized version
 */
export function patchEquipment() {
  // Replace the global Equipment object
  if (typeof window !== 'undefined') {
    window.Equipment = EquipmentOptimized;
  }

  // Patch any existing equipment references
  const originalEquipment = window.Equipment;

  return {
    ...originalEquipment,
    renderTab: EquipmentOptimized.renderTab,
    bindEvents: EquipmentOptimized.bindEvents,
    maybeDropOnClick: EquipmentOptimized.maybeDropOnClick,
    PERFORMANCE_CONFIG: EquipmentOptimized.PERFORMANCE_CONFIG
  };
}

/**
 * Inject performance-focused CSS
 */
function injectPerformanceCSS() {
  if (document.getElementById('performance-styles')) return;

  const style = document.createElement('style');
  style.id = 'performance-styles';
  style.textContent = `
    /* Performance optimizations */
    .equipment-container {
      contain: layout style;
      will-change: contents;
    }

    .inventory-item {
      contain: layout;
      transform: translateZ(0);
    }

    /* Mobile-specific optimizations */
    @media (max-width: 768px) {
      * {
        -webkit-tap-highlight-color: transparent;
      }

      .neon-card {
        will-change: auto;
      }

      .inventory-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    /* Low performance mode */
    .performance-low .celestial-animated,
    .performance-low .animal-animated {
      animation: none !important;
    }

    .performance-low .neon-card {
      transition: none !important;
      will-change: auto;
    }

    .performance-low .inventory-item:hover {
      transform: none !important;
    }

    /* Reduce motion support */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Monitor performance and adjust settings dynamically
 */
function adjustPerformanceSettings() {
  const metrics = getPerformanceMetrics();

  // Adjust based on average render time
  if (metrics.averageRenderTime > 20) {
    // Slow rendering detected
    performanceConfig.renderBatchSize = Math.max(5, performanceConfig.renderBatchSize - 5);
    performanceConfig.reduceAnimations = true;

    document.body.classList.add('performance-low');
    console.warn('Performance degraded, adjusting settings');
  } else if (metrics.averageRenderTime < 8 && performanceConfig.renderBatchSize < 25) {
    // Good performance, can increase quality
    performanceConfig.renderBatchSize = Math.min(25, performanceConfig.renderBatchSize + 2);

    if (!performanceConfig.reduceAnimations) {
      document.body.classList.remove('performance-low');
    }
  }

  // Adjust based on memory usage
  if (metrics.averageMemoryUsage > 80) {
    // High memory usage
    performanceConfig.maxDomNodes = Math.max(200, performanceConfig.maxDomNodes - 50);

    // Trigger cleanup
    cleanupUnusedResources();
  }

  // Log performance stats in debug mode
  if (window.DEBUG_PERFORMANCE) {
    console.log('Performance metrics:', {
      avgRender: metrics.averageRenderTime?.toFixed(2) + 'ms',
      frameDrops: metrics.frameDrops,
      memory: metrics.averageMemoryUsage?.toFixed(2) + 'MB',
      renderCount: performanceManager.renderCount
    });
  }
}

/**
 * Cleanup unused resources
 */
function cleanupUnusedResources() {
  // Remove unused event listeners
  eventManager.cleanup();

  // Clear image caches
  imageLoader.disconnect();

  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }

  // Recreate managers with fresh state
  eventManager = new EventManager();
  imageLoader = new LazyImageLoader();

  console.log('Performed resource cleanup');
}

/**
 * Get performance debug info
 */
export function getPerformanceDebugInfo() {
  const metrics = getPerformanceMetrics();

  return {
    ...metrics,
    renderCount: performanceManager?.renderCount || 0,
    lastRender: performanceManager?.lastRender || 0,
    uptime: performance.now() - (performanceManager?.startTime || 0),
    recommendations: metrics.recommendations
  };
}

/**
 * Enable debug mode for performance monitoring
 */
export function enablePerformanceDebug() {
  window.DEBUG_PERFORMANCE = true;

  // Add debug overlay
  const debugOverlay = document.createElement('div');
  debugOverlay.id = 'performance-debug';
  debugOverlay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: #00ff00;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 200px;
  `;

  document.body.appendChild(debugOverlay);

  // Update debug info every second
  setInterval(() => {
    const info = getPerformanceDebugInfo();
    debugOverlay.innerHTML = `
      <div>Renders: ${info.renderCount}</div>
      <div>Avg Render: ${info.averageRenderTime?.toFixed(2)}ms</div>
      <div>Frame Drops: ${info.frameDrops}</div>
      <div>Memory: ${info.averageMemoryUsage?.toFixed(2)}MB</div>
      <div>Events: ${info.eventListeners}</div>
    `;
  }, 1000);

  console.log('Performance debug mode enabled');
}

/**
 * Apply all patches to the main game
 */
export function applyAllPatches() {
  // Store original functions
  const originalRenderTab = window.renderTab;
  const originalUpdateTopBar = window.updateTopBar;

  // Apply patches
  if (originalRenderTab) {
    window.renderTab = patchRenderTab(originalRenderTab);
  }

  if (originalUpdateTopBar) {
    window.updateTopBar = patchUpdateTopBar(originalUpdateTopBar);
  }

  // Patch equipment system
  window.Equipment = patchEquipment();

  // Initialize performance optimizations
  initPerformanceOptimizations();

  console.log('All performance patches applied successfully');
}

// Store original functions (will be set when patches are applied)
let originalRenderTab = null;
let originalUpdateTopBar = null;

// Auto-apply patches when this module is imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllPatches);
  } else {
    // Apply immediately if DOM is already ready
    setTimeout(applyAllPatches, 100);
  }
}

export default {
  initPerformanceOptimizations,
  patchRenderTab,
  patchUpdateTopBar,
  patchEquipment,
  applyAllPatches,
  getPerformanceDebugInfo,
  enablePerformanceDebug
};
