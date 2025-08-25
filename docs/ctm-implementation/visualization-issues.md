# CTM Visualization Issues Analysis

## Problem Statement
The CTM demo loads but nothing is visible. After analyzing the codebase, several critical issues have been identified that prevent the visualization from working properly.

## Identified Issues

### 1. Module Import/Export Conflicts

#### Issue 1.1: Duplicate LyapunovEstimator Classes
- **Location**: `src/modules/attractor.js` (lines 151-207) AND `src/modules/chaos/lyapunov.js`
- **Problem**: Two different implementations of Lyapunov calculation exist
- **Impact**: Confusion about which implementation to use
- **Symptoms**: Import errors or wrong class being used

#### Issue 1.2: Missing Module Dependencies
- **Problem**: The main app expects modules that might not export what's needed
- **Files affected**: 
  - `src/modules/visualization.js` (doesn't exist)
  - `src/modules/floral.js` (exists)
  - `src/modules/metrics.js` (exists)
  - `src/modules/controls.js` (exists)
  - `src/modules/export.js` (exists)
  - `src/modules/presets.js` (exists)

### 2. Canvas Rendering Issues

#### Issue 2.1: Canvas Sizing
- **Problem**: The canvas might not be getting proper dimensions
- **Location**: `ctm-demo.html` line with `canvas.clientWidth`
- **Impact**: Zero-sized canvas = nothing visible
- **Fix needed**: Explicit width/height setting

#### Issue 2.2: CSS Flex Layout Issue
- **Problem**: Flex container might be collapsing the canvas
- **CSS**: `body { display: flex; }` with `#mainCanvas { flex: 1; }`
- **Impact**: Canvas might have 0 width if not properly initialized

### 3. Three.js Initialization Problems

#### Issue 3.1: Scene Not Rendering
- **Possible cause**: Render loop not starting
- **Check**: Is `requestAnimationFrame` being called?
- **Location**: `animate()` method in CTMDemo class

#### Issue 3.2: Camera Position
- **Current**: `camera.position.set(15, 15, 15)`
- **Problem**: Might be looking at empty space if particles aren't generated

### 4. Particle System Issues

#### Issue 4.1: Particles Not Being Added
- **Check**: Is `this.isRunning` ever set to true?
- **Location**: `simulate()` method only runs if `isRunning === true`
- **Initial state**: `isRunning = false` until "Start" is clicked

#### Issue 4.2: Transient Period
- **Problem**: Particles only added after `transientSteps` (2000)
- **Impact**: Nothing visible for first 2000 steps

### 5. Browser Console Errors (Likely)

#### Issue 5.1: Module Loading Errors
- **Expected errors**: 
  - "Failed to load module"
  - "Export 'X' was not found in 'Y'"
  - CORS errors if not served properly

#### Issue 5.2: Three.js Errors
- **Possible**: WebGL context issues
- **Check**: Browser WebGL support

### 6. Integration Method Default

#### Issue 6.1: RK4 Complexity
- **Default**: `integrationMethod = 'RK4'`
- **Problem**: More complex, might have bugs
- **Test**: Try with 'Euler' first

## Root Cause Analysis

The main issues appear to be:

1. **Module Architecture Mismatch**: The original codebase and new CTM modules aren't properly integrated
2. **Canvas Initialization**: The canvas might not be getting proper dimensions due to CSS flex layout
3. **Simulation Not Starting**: The simulation requires manual start but might have initialization issues
4. **Missing Visualization Module**: The main app expects `visualization.js` which doesn't exist as expected

## Critical Files to Check

1. Browser Console (F12) - Most important!
2. Network tab - Check if all modules are loading
3. Canvas element dimensions in DOM inspector
4. Three.js scene children count

## Quick Diagnostic Tests

### Test 1: Check if modules are loading
```javascript
console.log(typeof ThomasAttractor);
console.log(typeof ThomasLyapunovCalculator);
console.log(typeof CTMCalculator);
```

### Test 2: Check canvas dimensions
```javascript
const canvas = document.getElementById('mainCanvas');
console.log(canvas.clientWidth, canvas.clientHeight);
```

### Test 3: Check if Three.js is initializing
```javascript
console.log(THREE.REVISION);
console.log(scene.children.length);
```

## Immediate Fixes Needed

### Fix 1: Canvas Sizing
```javascript
// Add explicit sizing
canvas.width = window.innerWidth * 0.7;
canvas.height = window.innerHeight;
```

### Fix 2: Start Simulation Automatically
```javascript
// Add to constructor
setTimeout(() => {
    this.isRunning = true;
}, 1000);
```

### Fix 3: Debug Particle Addition
```javascript
// Add logging
console.log('Adding particle at:', state.x, state.y, state.z);
```

### Fix 4: Verify Module Exports
- Check each module file for proper export statements
- Ensure import paths are correct
- Resolve the duplicate LyapunovEstimator issue

## Browser Console Commands to Run

Open the browser console (F12) and check:

1. `document.getElementById('mainCanvas')` - Should show canvas element
2. Look for red error messages about modules
3. Check Network tab for 404 errors
4. Type `THREE` - Should show Three.js object

## Most Likely Issue

**The canvas has 0 width/height due to the flex layout before Three.js initializes.**

This is a common issue with flex layouts and WebGL canvases. The canvas needs explicit dimensions or the flex container needs content to size against.

## Next Steps

1. Open browser console and check for errors
2. Fix module import/export issues
3. Ensure canvas has proper dimensions
4. Verify Three.js scene is rendering
5. Check if particles are being added
6. Test with simplified setup first

---

*This analysis identifies the core issues preventing visualization. The browser console will provide the specific error messages needed to fix these issues.*