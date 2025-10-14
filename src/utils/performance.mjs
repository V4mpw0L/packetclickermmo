/**
 * Performance Monitoring Utility
 * Helps identify and optimize performance bottlenecks on mobile devices
 */

// Performance metrics tracking
const metrics = {
  renderTimes: [],
  frameDrops: 0,
  memoryUsage: [],
  animationFrames: 0,
  domOperations: 0,
  eventListeners: 0,
};

// Device capability detection
const deviceInfo = {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isLowEnd: navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2,
  supportsIntersectionObserver: 'IntersectionObserver' in window,
  supportsPassiveEvents: (() => {
    let supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() { supportsPassive = true; }
      });
      window.addEventListener('testPassive', null, opts);
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {}
    return supportsPassive;
  })(),
  pixelRatio: window.devicePixelRatio || 1,
  screenSize: {
    width: window.screen?.width || 0,
    height: window.screen?.height || 0
  }
};

// Performance configuration based on device
const performanceConfig = {
  // Rendering
  maxRenderTime: deviceInfo.isMobile ? 16 : 8, // ms
  renderBatchSize: deviceInfo.isLowEnd ? 10 : 25,
  useVirtualScrolling: deviceInfo.isMobile || deviceInfo.isLowEnd,

  // Animations
  reduceAnimations: deviceInfo.isLowEnd,
  maxAnimations: deviceInfo.isMobile ? 3 : 10,
  animationDuration: deviceInfo.isLowEnd ? 150 : 300,

  // DOM
  maxDomNodes: deviceInfo.isMobile ? 500 : 1000,
  useDelegation: true,
  batchDomUpdates: true,

  // Memory
  maxMemoryMB: deviceInfo.isMobile ? 50 : 100,
  gcThreshold: deviceInfo.isMobile ? 0.8 : 0.9,
};

// Performance observers
let performanceObserver = null;
let frameObserver = null;

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Performance observer for render timing
  if ('PerformanceObserver' in window) {
    performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure' && entry.name.includes('render')) {
          metrics.renderTimes.push(entry.duration);

          // Keep only last 100 measurements
          if (metrics.renderTimes.length > 100) {
            metrics.renderTimes.shift();
          }

          // Warn if render time is too high
          if (entry.duration > performanceConfig.maxRenderTime) {
            console.warn(`Slow render detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
    });

    try {
      performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (e) {
      console.warn('Performance observer not supported');
    }
  }

  // Frame rate monitoring
  if ('requestAnimationFrame' in window) {
    let lastTime = performance.now();
    let frameCount = 0;

    function measureFrameRate() {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        const fps = Math.round(frameCount / ((now - lastTime) / 1000));

        if (fps < 30) {
          metrics.frameDrops++;
        }

        frameCount = 0;
        lastTime = now;

        // Adjust performance settings based on FPS
        if (fps < 20 && !performanceConfig.reduceAnimations) {
          enableLowPerformanceMode();
        }
      }

      metrics.animationFrames++;
      frameObserver = requestAnimationFrame(measureFrameRate);
    }

    frameObserver = requestAnimationFrame(measureFrameRate);
  }

  // Memory monitoring
  if (performance.memory) {
    setInterval(checkMemoryUsage, 5000);
  }

  // Add performance class to body
  updatePerformanceClasses();
}

/**
 * Measure render performance
 */
export function measureRender(name, fn) {
  if (typeof performance === 'undefined' || !performance.mark) {
    return fn();
  }

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `render-${name}`;

  performance.mark(startMark);
  const result = fn();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);

  return result;
}

/**
 * Debounced function creator for performance
 */
export function createDebounced(fn, delay = 16) {
  let timeoutId = null;
  return function (...args) {
    if (timeoutId) {
      cancelAnimationFrame(timeoutId);
    }
    timeoutId = requestAnimationFrame(() => {
      fn.apply(this, args);
    });
  };
}

/**
 * Throttled function creator
 */
export function createThrottled(fn, delay = 16) {
  let lastCall = 0;
  return function (...args) {
    const now = performance.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Batch DOM operations for better performance
 */
export function batchDomOperations(operations) {
  if (!performanceConfig.batchDomUpdates) {
    operations.forEach(op => op());
    return;
  }

  // Use document fragment for multiple DOM operations
  const fragment = document.createDocumentFragment();
  let hasFragmentOps = false;

  requestAnimationFrame(() => {
    operations.forEach(op => {
      try {
        if (typeof op === 'function') {
          op();
        } else if (op.type === 'append' && op.parent && op.element) {
          fragment.appendChild(op.element);
          hasFragmentOps = true;
        }
      } catch (e) {
        console.warn('DOM operation failed:', e);
      }
    });

    if (hasFragmentOps && operations[0]?.parent) {
      operations[0].parent.appendChild(fragment);
    }

    metrics.domOperations += operations.length;
  });
}

/**
 * Optimized event listener management
 */
export class EventManager {
  constructor() {
    this.listeners = new Map();
    this.delegatedListeners = new Set();
  }

  add(element, event, handler, options = {}) {
    if (!element || !event || !handler) return;

    const key = `${element}_${event}`;

    if (performanceConfig.useDelegation && element === document) {
      // Use event delegation for document-level events
      if (!this.delegatedListeners.has(event)) {
        document.addEventListener(event, this.handleDelegatedEvent.bind(this), {
          passive: deviceInfo.supportsPassiveEvents && (event === 'scroll' || event === 'touchstart'),
          ...options
        });
        this.delegatedListeners.add(event);
      }
    } else {
      element.addEventListener(event, handler, {
        passive: deviceInfo.supportsPassiveEvents && (event === 'scroll' || event === 'touchstart'),
        ...options
      });
    }

    this.listeners.set(key, { element, event, handler, options });
    metrics.eventListeners++;
  }

  remove(element, event) {
    const key = `${element}_${event}`;
    const listener = this.listeners.get(key);

    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      this.listeners.delete(key);
      metrics.eventListeners--;
    }
  }

  handleDelegatedEvent(event) {
    // Handle delegated events efficiently
    const target = event.target.closest('[data-action], [data-click], button');
    if (target && typeof target.click === 'function') {
      // Custom delegation logic here
    }
  }

  cleanup() {
    for (const [key, listener] of this.listeners) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    }
    this.listeners.clear();
    this.delegatedListeners.clear();
    metrics.eventListeners = 0;
  }
}

/**
 * Check memory usage and trigger cleanup if needed
 */
function checkMemoryUsage() {
  if (!performance.memory) return;

  const memInfo = performance.memory;
  const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;

  metrics.memoryUsage.push(usedMB);

  // Keep only last 20 measurements
  if (metrics.memoryUsage.length > 20) {
    metrics.memoryUsage.shift();
  }

  // Trigger garbage collection hint if memory usage is high
  if (usedMB > performanceConfig.maxMemoryMB) {
    console.warn(`High memory usage: ${usedMB.toFixed(2)}MB`);

    // Suggest cleanup
    if (window.gc) {
      window.gc();
    }

    // Enable low performance mode
    enableLowPerformanceMode();
  }
}

/**
 * Enable low performance mode for struggling devices
 */
function enableLowPerformanceMode() {
  performanceConfig.reduceAnimations = true;
  performanceConfig.maxAnimations = 1;
  performanceConfig.renderBatchSize = 5;
  performanceConfig.animationDuration = 100;

  // Add performance class to body
  document.body.classList.add('performance-low');

  console.warn('Low performance mode enabled');
}

/**
 * Update CSS classes based on device capabilities
 */
function updatePerformanceClasses() {
  if (typeof document === 'undefined') return;

  const body = document.body;

  // Device type classes
  if (deviceInfo.isMobile) body.classList.add('device-mobile');
  if (deviceInfo.isLowEnd) body.classList.add('device-low-end');

  // Performance classes
  if (performanceConfig.reduceAnimations) body.classList.add('reduce-animations');
  if (performanceConfig.useVirtualScrolling) body.classList.add('virtual-scrolling');

  // Graphics quality classes
  const graphics = window.graphicsQuality || 'high';
  body.classList.add(`graphics-${graphics}`);
}

/**
 * Image lazy loading utility
 */
export class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };

    this.observer = null;
    this.images = new Set();

    if (deviceInfo.supportsIntersectionObserver) {
      this.observer = new IntersectionObserver(this.handleIntersection.bind(this), this.options);
    }
  }

  observe(img) {
    if (!img || this.images.has(img)) return;

    this.images.add(img);

    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
    }
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
        this.images.delete(entry.target);
      }
    });
  }

  loadImage(img) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.images.clear();
  }
}

/**
 * Virtual scrolling implementation
 */
export class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 80,
      bufferSize: 5,
      ...options
    };

    this.scrollTop = 0;
    this.containerHeight = 0;
    this.totalItems = 0;
    this.visibleRange = { start: 0, end: 0 };

    this.init();
  }

  init() {
    if (!this.container) return;

    this.container.addEventListener('scroll',
      createThrottled(() => this.updateVisibleRange(), 16)
    );

    this.updateContainerHeight();
    window.addEventListener('resize',
      createDebounced(() => this.updateContainerHeight(), 100)
    );
  }

  updateContainerHeight() {
    if (this.container) {
      this.containerHeight = this.container.clientHeight;
    }
  }

  updateVisibleRange() {
    this.scrollTop = this.container.scrollTop;

    const startIndex = Math.max(0,
      Math.floor(this.scrollTop / this.options.itemHeight) - this.options.bufferSize
    );

    const endIndex = Math.min(this.totalItems,
      Math.ceil((this.scrollTop + this.containerHeight) / this.options.itemHeight) + this.options.bufferSize
    );

    this.visibleRange = { start: startIndex, end: endIndex };

    if (this.onRangeChange) {
      this.onRangeChange(this.visibleRange);
    }
  }

  setTotalItems(count) {
    this.totalItems = count;
    this.updateVisibleRange();
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
  const avgRenderTime = metrics.renderTimes.length > 0
    ? metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length
    : 0;

  const avgMemory = metrics.memoryUsage.length > 0
    ? metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length
    : 0;

  return {
    ...metrics,
    averageRenderTime: avgRenderTime,
    averageMemoryUsage: avgMemory,
    deviceInfo,
    performanceConfig,
    recommendations: generateRecommendations()
  };
}

/**
 * Generate performance recommendations
 */
function generateRecommendations() {
  const recommendations = [];

  const avgRenderTime = metrics.renderTimes.length > 0
    ? metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length
    : 0;

  if (avgRenderTime > performanceConfig.maxRenderTime) {
    recommendations.push('Consider reducing DOM complexity or using virtual scrolling');
  }

  if (metrics.frameDrops > 10) {
    recommendations.push('Reduce animations or enable low performance mode');
  }

  if (metrics.eventListeners > 100) {
    recommendations.push('Use event delegation to reduce memory usage');
  }

  if (deviceInfo.isMobile && !performanceConfig.useVirtualScrolling) {
    recommendations.push('Enable virtual scrolling for better mobile performance');
  }

  return recommendations;
}

/**
 * Cleanup performance monitoring
 */
export function cleanup() {
  if (performanceObserver) {
    performanceObserver.disconnect();
  }

  if (frameObserver) {
    cancelAnimationFrame(frameObserver);
  }

  // Reset metrics
  Object.keys(metrics).forEach(key => {
    if (Array.isArray(metrics[key])) {
      metrics[key] = [];
    } else {
      metrics[key] = 0;
    }
  });
}

// Export the performance configuration and device info
export { performanceConfig, deviceInfo };

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  initPerformanceMonitoring();
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initPerformanceMonitoring);
}
