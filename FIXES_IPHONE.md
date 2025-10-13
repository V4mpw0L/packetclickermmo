# iPhone Interface and Performance Fixes

## Issues Fixed

### 1. Menu Bar Overlap with iPhone Top Bar (Notch Area)

**Problem**: On iPhones, the menu bar was cutting under the top bar, making the first buttons inaccessible due to improper safe area handling.

**Solution**: 
- Added proper `env(safe-area-inset-top)` support to both top bar and menu bar positioning
- Enhanced mobile responsive styles for iPhone-specific screen sizes
- Added dedicated iPhone media queries for devices with pixel ratio 2+ and max width 430px

**Changes Made**:
- Modified `.top-bar` positioning to use `top: max(env(safe-area-inset-top, 0px), 8px)` on mobile
- Added menu bar margin adjustment: `margin-top: calc(env(safe-area-inset-top, 0px) + var(--spacing-sm))`
- Added iPhone-specific media query for proper notch handling
- Enhanced small mobile device breakpoint styles

### 2. Click Button Performance Issues on High Graphics

**Problem**: The click button would become unresponsive when clicked rapidly, especially on high graphics settings due to:
- No click throttling mechanism
- Excessive DOM manipulation with visual effects
- Multiple simultaneous sound effects causing performance bottlenecks
- Potential memory leaks from uncleanud DOM elements

**Solution**:
- Added click throttling (maximum 20 clicks per second)
- Reduced sound effects on high graphics settings to prevent audio pipeline overflow
- Improved DOM cleanup for click effect animations
- Enhanced click event handling to prevent button from getting "stuck"

**Changes Made**:
- Added `clickPacket._lastClick` throttling with 50ms minimum interval
- Implemented graphics-quality-aware sound effect reduction:
  - High graphics: Minimal combo sounds to prevent lag
  - Medium/Low graphics: Full sound effects preserved
- Enhanced DOM cleanup with multiple fallback mechanisms:
  - Primary cleanup on `animationend` event
  - Timeout-based cleanup fallback
  - Emergency cleanup after 3 seconds to prevent DOM bloat
- Improved click event binding with proper state management:
  - Prevents double-firing of click events
  - Automatic state reset on pointer events
  - Handles stuck button scenarios

### 3. Graphics Performance Optimization

**Changes Made**:
- Increased visual effect throttling based on graphics quality:
  - High: 120ms throttle for effects
  - Medium: 100ms throttle
  - Low: 80ms throttle
- Reduced excessive animation chains on high graphics settings
- Better memory management for temporary DOM elements

## Technical Details

### Safe Area Implementation
```css
/* iPhone-specific positioning */
@media screen and (max-device-width: 430px) and (-webkit-min-device-pixel-ratio: 2) {
    .menu-bar {
        margin-top: max(calc(env(safe-area-inset-top) + var(--spacing-sm)), 1rem) !important;
    }
    .top-bar {
        top: max(env(safe-area-inset-top, 0px), 12px) !important;
    }
}
```

### Click Throttling Implementation
```javascript
// Add click throttling to prevent performance issues
const clickTime = Date.now();
if (clickPacket._lastClick && clickTime - clickPacket._lastClick < 50) {
    return; // Throttle to max 20 clicks per second
}
clickPacket._lastClick = clickTime;
```

### Enhanced Event Handling
```javascript
const handleClick = (e) => {
    // Prevent rapid firing and stuck state
    if (state.clicking || clickTime - state.lastClick < 50) {
        return;
    }
    // Proper state management and cleanup
};
```

## Testing Recommendations

1. **iPhone Testing**: Test on various iPhone models (iPhone 12+, iPhone 14 Pro+) to ensure proper notch handling
2. **Performance Testing**: Rapid click testing on high graphics settings to verify responsiveness
3. **Memory Testing**: Extended play sessions to ensure no DOM element accumulation
4. **Audio Testing**: Verify sound effects don't cause performance degradation during rapid clicking

## Browser Compatibility

These fixes maintain compatibility with:
- iOS Safari 14+
- Chrome Mobile 90+
- Firefox Mobile 90+
- Other WebKit-based mobile browsers

The changes use progressive enhancement, so older browsers that don't support `env(safe-area-inset-*)` will gracefully fall back to the previous behavior.

### 3. Combo Text Line Breaking Fix

**Problem**: Combo text with parentheses (like "ULTRA! +150 (100+50%)") was breaking across lines incorrectly, making it hard to read:
```
ULTRA! +150 (100+50%
                  )
```

**Solution**: 
- Changed CSS `white-space` property from `normal` to `pre-line` to respect intentional line breaks
- Modified combo text generation to use proper newline characters (`\n`) for consistent formatting
- Ensured each combo displays as:
```
COMBO NAME
+AMOUNT
(BASE+BONUS%)
```

**Changes Made**:
- Updated `.click-effect` CSS to use `white-space: pre-line` and `line-height: 1.2`
- Modified `handleComboEffect` function in effects.mjs to format text with newlines:
  - `ANIMAL!\n+{amount}\n({base}+88%)`
  - `ULTRA!\n+{amount}\n({base}+50%)`  
  - `MEGA!\n+{amount}\n({base}+25%)`
  - `{combo}x\n+{amount}\n({base}+10%)`