/**
 * Easy-to-use script to enable inventory performance optimizations
 *
 * Usage: Add this script to your index.html before main.js
 * <script src="enable-inventory-optimization.js"></script>
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    AUTO_DETECT_MOBILE: true,
    FORCE_OPTIMIZATIONS: false,
    ENABLE_DEBUG: false,
    PERFORMANCE_BUDGET: {
      maxRenderTime: 16, // ms
      maxMemoryUsage: 50, // MB
      targetFPS: 30
    }
  };

  // Device detection
  function detectDevice() {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const isSlowConnection = navigator.connection && navigator.connection.effectiveType &&
                            ['slow-2g', '2g'].includes(navigator.connection.effectiveType);

    return {
      isMobile,
      isLowEnd,
      isSlowConnection,
      shouldOptimize: isMobile || isLowEnd || isSlowConnection || CONFIG.FORCE_OPTIMIZATIONS
    };
  }

  // Apply CSS optimizations immediately
  function applyCSSOptimizations() {
    const style = document.createElement('style');
    style.id = 'inventory-optimizations';
    style.textContent = `
      /* Immediate performance improvements */
      .neon-card {
        will-change: auto !important;
        transform: translateZ(0);
      }

      /* Reduce expensive operations on mobile */
      @media (max-width: 768px) {
        * {
          -webkit-tap-highlight-color: transparent;
        }

        .neon-card {
          backdrop-filter: none;
          box-shadow: none;
        }

        /* Simplify inventory grid for mobile */
        .inv-grid {
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 0.3rem !important;
        }
      }

      /* Low-end device optimizations */
      .device-low-end .neon-card {
        transition: none !important;
        animation: none !important;
      }

      .device-low-end [class*="celestial"] {
        animation: none !important;
      }

      /* Reduce motion for accessibility and performance */
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

  // Performance monitoring
  function initPerformanceMonitor() {
    let frameCount = 0;
    let lastTime = performance.now();
    let renderTimes = [];
    let memoryUsage = [];

    function measurePerformance() {
      const now = performance.now();
      frameCount++;

      // Measure FPS every second
      if (now - lastTime >= 1000) {
        const fps = Math.round(frameCount / ((now - lastTime) / 1000));

        if (fps < CONFIG.PERFORMANCE_BUDGET.targetFPS) {
          console.warn(`Low FPS detected: ${fps}fps - enabling aggressive optimizations`);
          enableAggressiveOptimizations();
        }

        frameCount = 0;
        lastTime = now;
      }

      // Check memory usage
      if (performance.memory) {
        const memMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        memoryUsage.push(memMB);

        if (memoryUsage.length > 10) {
          memoryUsage.shift();
        }

        const avgMemory = memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length;
        if (avgMemory > CONFIG.PERFORMANCE_BUDGET.maxMemoryUsage) {
          console.warn(`High memory usage: ${avgMemory.toFixed(2)}MB`);
          triggerCleanup();
        }
      }

      requestAnimationFrame(measurePerformance);
    }

    requestAnimationFrame(measurePerformance);
  }

  // Enable aggressive optimizations for struggling devices
  function enableAggressiveOptimizations() {
    document.body.classList.add('performance-critical');

    const aggressiveStyle = document.createElement('style');
    aggressiveStyle.textContent = `
      .performance-critical .neon-card {
        background: var(--bg-card) !important;
        border: 1px solid var(--border-color) !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        transition: none !important;
        will-change: auto !important;
      }

      .performance-critical [class*="animation"],
      .performance-critical [class*="pulse"],
      .performance-critical [class*="rainbow"] {
        animation: none !important;
      }

      .performance-critical .inv-grid {
        grid-template-columns: repeat(3, 1fr) !important;
      }
    `;

    document.head.appendChild(aggressiveStyle);
  }

  // Cleanup function
  function triggerCleanup() {
    // Remove unused event listeners
    const oldListeners = document.querySelectorAll('[data-cleanup]');
    oldListeners.forEach(el => {
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
    });

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    console.log('Triggered performance cleanup');
  }

  // Optimize existing Equipment renderTab function
  function optimizeEquipmentRender() {
    if (!window.Equipment || !window.Equipment.renderTab) return;

    const originalRender = window.Equipment.renderTab;
    let renderCache = null;
    let lastInventoryLength = -1;

    window.Equipment.renderTab = function(state) {
      const currentInventoryLength = state.inventory ? state.inventory.length : 0;

      // Use cache if inventory hasn't changed significantly
      if (renderCache && Math.abs(currentInventoryLength - lastInventoryLength) < 3) {
        return renderCache;
      }

      // Measure render time
      const startTime = performance.now();
      const result = originalRender.call(this, state);
      const renderTime = performance.now() - startTime;

      if (renderTime > CONFIG.PERFORMANCE_BUDGET.maxRenderTime) {
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }

      renderCache = result;
      lastInventoryLength = currentInventoryLength;

      return result;
    };
  }

  // Optimize image loading
  function optimizeImages() {
    // Convert eager loading images to lazy loading
    document.addEventListener('DOMContentLoaded', function() {
      const images = document.querySelectorAll('img:not([loading])');
      images.forEach(img => {
        if (img.src && !img.src.includes('data:')) {
          img.loading = 'lazy';
          img.decoding = 'async';
        }
      });
    });

    // Use intersection observer for better lazy loading
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            imageObserver.unobserve(img);
          }
        });
      });

      // Observe images with data-src
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('img[data-src]').forEach(img => {
          imageObserver.observe(img);
        });
      });
    }
  }

  // Debounce function for frequent operations
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

  // Optimize frequent game functions
  function optimizeGameFunctions() {
    // Debounce renderTab if it exists
    if (window.renderTab) {
      const originalRenderTab = window.renderTab;
      window.renderTab = debounce(originalRenderTab, 16);
    }

    // Debounce updateTopBar if it exists
    if (window.updateTopBar) {
      const originalUpdateTopBar = window.updateTopBar;
      window.updateTopBar = debounce(originalUpdateTopBar, 50);
    }
  }

  // Main initialization
  function init() {
    const device = detectDevice();

    console.log('Inventory Optimization Status:', {
      mobile: device.isMobile,
      lowEnd: device.isLowEnd,
      slowConnection: device.isSlowConnection,
      optimizing: device.shouldOptimize
    });

    // Apply device classes
    if (device.isMobile) document.body.classList.add('device-mobile');
    if (device.isLowEnd) document.body.classList.add('device-low-end');
    if (device.isSlowConnection) document.body.classList.add('connection-slow');

    if (device.shouldOptimize || CONFIG.FORCE_OPTIMIZATIONS) {
      console.log('🚀 Enabling inventory performance optimizations...');

      // Apply immediate optimizations
      applyCSSOptimizations();

      // Setup performance monitoring
      initPerformanceMonitor();

      // Optimize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          optimizeEquipmentRender();
          optimizeImages();
          optimizeGameFunctions();
        });
      } else {
        optimizeEquipmentRender();
        optimizeImages();
        optimizeGameFunctions();
      }

      // Enable debug mode if requested
      if (CONFIG.ENABLE_DEBUG) {
        window.INVENTORY_DEBUG = true;
        console.log('📊 Performance debugging enabled');
      }

      console.log('✅ Inventory optimizations activated');
    } else {
      console.log('ℹ️ Device appears capable, skipping optimizations');
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose optimization controls globally
  window.InventoryOptimizer = {
    enable: function() {
      CONFIG.FORCE_OPTIMIZATIONS = true;
      init();
    },
    disable: function() {
      document.body.classList.remove('device-mobile', 'device-low-end', 'performance-critical');
      const optimizationStyles = document.querySelectorAll('#inventory-optimizations, style[data-optimizer]');
      optimizationStyles.forEach(style => style.remove());
    },
    enableDebug: function() {
      CONFIG.ENABLE_DEBUG = true;
      window.INVENTORY_DEBUG = true;
      console.log('Debug mode enabled');
    },
    getStats: function() {
      return {
        device: detectDevice(),
        config: CONFIG,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 'Unknown'
      };
    }
  };

})();
