/**
 * Inventory Performance Optimization - Auto Integration Script
 * This script automatically enables inventory optimizations for better performance
 * especially on mobile devices and when inventory has many items.
 */

(function () {
  "use strict";

  // Performance configuration
  const PERFORMANCE_CONFIG = {
    VISIBLE_ITEMS: 15, // Reduced from 25+ for better performance
    BUFFER_SIZE: 5, // Items to render outside viewport
    RENDER_DEBOUNCE_MS: 16, // 60fps limit
    MOBILE_THRESHOLD: 768, // px - consider mobile below this width
    LOW_END_CORES: 2, // CPU cores threshold for low-end detection
    MEMORY_THRESHOLD: 4096, // MB - low memory device threshold
  };

  // Device detection
  const deviceInfo = {
    isMobile:
      window.innerWidth <= PERFORMANCE_CONFIG.MOBILE_THRESHOLD ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ),
    isLowEnd: navigator.hardwareConcurrency <= PERFORMANCE_CONFIG.LOW_END_CORES,
    isLowMemory: navigator.deviceMemory && navigator.deviceMemory <= 4,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  };

  // Add device classes to body for CSS targeting
  document.addEventListener("DOMContentLoaded", function () {
    const body = document.body;

    if (deviceInfo.isMobile) body.classList.add("device-mobile");
    if (deviceInfo.isLowEnd) body.classList.add("device-low-end");
    if (deviceInfo.isLowMemory) body.classList.add("device-low-memory");
    if (deviceInfo.prefersReducedMotion)
      body.classList.add("prefers-reduced-motion");
  });

  // Performance monitoring
  const performanceManager = {
    renderCount: 0,
    lastRender: 0,
    frameDrops: 0,
    enabled: false,
    stats: {
      avgRenderTime: 0,
      renderTimes: [],
      memoryUsage: 0,
    },

    init() {
      this.enabled = true;
      this.monitorPerformance();
    },

    monitorPerformance() {
      // Monitor frame drops
      let lastFrameTime = performance.now();

      const checkFrameRate = () => {
        if (!this.enabled) return;

        const now = performance.now();
        const frameDelta = now - lastFrameTime;

        // Detect frame drops (should be ~16.67ms for 60fps)
        if (frameDelta > 32) {
          // More than 2 frame periods
          this.frameDrops++;
        }

        lastFrameTime = now;
        requestAnimationFrame(checkFrameRate);
      };

      requestAnimationFrame(checkFrameRate);

      // Monitor memory usage (if available)
      if (performance.memory) {
        setInterval(() => {
          this.stats.memoryUsage =
            performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }, 5000);
      }
    },

    measureRender(label, renderFn) {
      const startTime = performance.now();
      const result = renderFn();
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Track render times
      this.stats.renderTimes.push(renderTime);
      if (this.stats.renderTimes.length > 100) {
        this.stats.renderTimes.shift(); // Keep only last 100 measurements
      }

      // Calculate average
      this.stats.avgRenderTime =
        this.stats.renderTimes.reduce((a, b) => a + b, 0) /
        this.stats.renderTimes.length;

      // Warn about slow renders
      if (renderTime > 32) {
        // Slower than 30fps
        console.warn(
          `Slow render detected: ${label} took ${renderTime.toFixed(2)}ms`,
        );
      }

      return result;
    },

    shouldOptimize() {
      return (
        deviceInfo.isMobile ||
        deviceInfo.isLowEnd ||
        this.stats.avgRenderTime > 16 ||
        this.frameDrops > 5
      );
    },
  };

  // Debounced rendering function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Virtual scrolling implementation
  class VirtualScrolling {
    constructor(container, items, renderItem, itemHeight = 60) {
      this.container = container;
      this.items = items;
      this.renderItem = renderItem;
      this.itemHeight = itemHeight;
      this.visibleItems =
        Math.ceil(container.clientHeight / itemHeight) +
        PERFORMANCE_CONFIG.BUFFER_SIZE;
      this.startIndex = 0;
      this.scrollTop = 0;

      this.init();
    }

    init() {
      this.container.addEventListener("scroll", this.onScroll.bind(this), {
        passive: true,
      });
      this.render();
    }

    onScroll() {
      this.scrollTop = this.container.scrollTop;
      this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
      this.render();
    }

    render() {
      const endIndex = Math.min(
        this.startIndex + this.visibleItems,
        this.items.length,
      );
      const visibleItems = this.items.slice(this.startIndex, endIndex);

      let html = `<div style="height: ${this.startIndex * this.itemHeight}px;"></div>`;

      visibleItems.forEach((item, index) => {
        html += this.renderItem(item, this.startIndex + index);
      });

      const remainingHeight = (this.items.length - endIndex) * this.itemHeight;
      html += `<div style="height: ${remainingHeight}px;"></div>`;

      this.container.innerHTML = html;
    }
  }

  // Equipment optimization patches
  function patchEquipmentSystem() {
    // Wait for Equipment to be available
    const checkEquipment = () => {
      if (typeof window.Equipment !== "undefined") {
        patchEquipmentRender();
      } else {
        setTimeout(checkEquipment, 100);
      }
    };

    checkEquipment();
  }

  function patchEquipmentRender() {
    const originalRenderTab = window.Equipment.renderTab;

    // Create debounced version
    const debouncedRender = debounce(
      originalRenderTab.bind(window.Equipment),
      PERFORMANCE_CONFIG.RENDER_DEBOUNCE_MS,
    );

    // Patch renderTab for performance
    window.Equipment.renderTab = function (state) {
      return performanceManager.measureRender("equipment-tab", () => {
        // Always use original render but with performance optimizations
        const result = originalRenderTab.call(this, state);

        // Apply performance optimizations after render
        requestAnimationFrame(() => {
          optimizeRenderedInventory();
        });

        return result;
      });
    };

    console.log("✅ Equipment rendering optimized");
  }

  function optimizeRenderedInventory() {
    // Add performance optimizations to already rendered inventory
    const inventoryContainer = document.querySelector(
      ".equipment-container, .inventory-grid",
    );
    if (!inventoryContainer) return;

    // Add optimization classes
    inventoryContainer.classList.add("optimized-inventory");

    // Optimize item elements
    const items = inventoryContainer.querySelectorAll(
      ".inventory-item, .equipment-item",
    );
    items.forEach((item, index) => {
      item.classList.add("optimized-item");
      item.dataset.itemIndex = index;

      // Add lazy loading to images if not already present
      const img = item.querySelector("img");
      if (img && !img.hasAttribute("loading")) {
        img.setAttribute("loading", "lazy");
      }
    });

    // Enable virtual scrolling only for very large inventories (50+ items)
    if (items.length > 50 && performanceManager.shouldOptimize()) {
      enableVirtualScrolling(inventoryContainer, items);
    }
  }

  function enableVirtualScrolling(container, items) {
    // Only apply virtual scrolling if container is scrollable
    if (container.scrollHeight <= container.clientHeight) return;

    console.log(`📦 Enabling virtual scrolling for ${items.length} items`);

    // This maintains all items visible but optimizes rendering
    const itemHeight = items[0]?.offsetHeight || 60;
    let visibleStart = 0;
    let visibleEnd = items.length;

    const updateVisibility = debounce(() => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      visibleStart = Math.max(
        0,
        Math.floor(scrollTop / itemHeight) - PERFORMANCE_CONFIG.BUFFER_SIZE,
      );
      visibleEnd = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) +
          PERFORMANCE_CONFIG.BUFFER_SIZE,
      );

      items.forEach((item, index) => {
        if (index < visibleStart || index > visibleEnd) {
          item.style.visibility = "hidden";
          item.style.position = "absolute";
        } else {
          item.style.visibility = "visible";
          item.style.position = "relative";
        }
      });
    }, 16);

    container.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility(); // Initial call
  }

  function getRarityColor(rarity) {
    const colors = {
      common: "#9ca3af",
      uncommon: "#22c55e",
      rare: "#3b82f6",
      epic: "#a855f7",
      legendary: "#f59e0b",
      celestial: "#ec4899",
    };
    return colors[rarity] || colors.common;
  }

  // Event delegation for better performance
  function setupEventDelegation() {
    document.addEventListener(
      "click",
      function (e) {
        // Handle inventory item clicks
        const inventoryItem = e.target.closest(".inventory-item[data-uuid]");
        if (inventoryItem) {
          const uuid = inventoryItem.dataset.uuid;
          if (window.Equipment && window.Equipment.maybeDropOnClick) {
            window.Equipment.maybeDropOnClick(uuid);
          }
          return;
        }
      },
      { passive: false },
    );
  }

  // CSS Optimizations injection
  function injectOptimizedCSS() {
    const style = document.createElement("style");
    style.textContent = `
      /* Performance optimizations */
      .optimized-inventory {
        contain: layout style paint;
      }

      .optimized-item {
        will-change: transform;
        transform: translateZ(0);
      }

      .inventory-grid {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }

      /* Reduce animations on low-end devices */
      .device-low-end .celestial-animated,
      .device-mobile .celestial-animated,
      .prefers-reduced-motion .celestial-animated {
        animation: none !important;
      }

      /* Mobile optimizations - maintain existing grid structure */
      @media (max-width: 768px) {
        .optimized-inventory .inventory-grid {
          gap: 0.4rem;
        }

        .optimized-item {
          font-size: 0.9rem;
        }
      }

      /* Loading states */
      .inventory-item img[loading="lazy"] {
        background: #374151;
        min-height: 40px;
      }

      /* Performance-critical mode */
      .performance-critical .inventory-item {
        box-shadow: none !important;
        transition: none !important;
      }

      .performance-critical .celestial-animated {
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize optimization system
  function initOptimizations() {
    console.log("🚀 Initializing inventory performance optimizations...");
    console.log("📱 Device Info:", deviceInfo);

    // Initialize performance monitoring
    performanceManager.init();

    // Inject optimized CSS
    injectOptimizedCSS();

    // Setup event delegation
    setupEventDelegation();

    // Patch equipment system
    patchEquipmentSystem();

    // Expose performance tools to window for debugging
    window.InventoryOptimizer = {
      enable: () => {
        document.body.classList.add("performance-critical");
        console.log("🔧 Forced performance optimizations enabled");
      },

      disable: () => {
        document.body.classList.remove("performance-critical");
        console.log("🔧 Performance optimizations disabled");
      },

      enableDebug: () => {
        window.INVENTORY_DEBUG = true;
        console.log("🐛 Debug mode enabled");
      },

      getStats: () => performanceManager.stats,

      config: PERFORMANCE_CONFIG,
    };

    console.log("✅ Inventory optimizations loaded successfully");

    // Auto-enable optimizations if needed
    setTimeout(() => {
      if (performanceManager.shouldOptimize()) {
        window.InventoryOptimizer.enable();
        console.log(
          "🔧 Auto-enabled performance optimizations based on device capabilities",
        );
      }
    }, 2000);
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOptimizations);
  } else {
    initOptimizations();
  }
})();
