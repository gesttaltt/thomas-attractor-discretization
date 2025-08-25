# API Reference

## Core Modules

### ThomasAttractor

Main attractor computation class.

```javascript
import { ThomasAttractor } from './modules/attractor.js';
```

#### Constructor
```javascript
const attractor = new ThomasAttractor(b = 0.19, dt = 0.01)
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `reset(seed)` | Reset to initial conditions | `seed: [x, y, z]` | `void` |
| `step()` | Compute one integration step | - | `{x, y, z, dx, dy, dz}` |
| `isPastTransient()` | Check if past transient period | - | `boolean` |
| `setB(b)` | Set chaos parameter | `b: number` | `void` |
| `getJacobian()` | Get Jacobian matrix | - | `number[][]` |

#### Properties
- `b`: Chaos parameter (0.15-0.25)
- `dt`: Time step
- `position`: Current {x, y, z}
- `currentStep`: Integration step count

---

### LyapunovEstimator

Estimates the largest Lyapunov exponent.

```javascript
import { LyapunovEstimator } from './modules/attractor.js';
```

#### Constructor
```javascript
const lyapunov = new LyapunovEstimator(attractor, renormSteps = 1000)
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `update(jacobian)` | Update estimate | `jacobian: number[][]` | `number` |
| `reset()` | Reset estimator | - | `void` |

#### Properties
- `estimate`: Current Lyapunov exponent estimate

---

### Visualization3D

Three.js-based 3D visualization.

```javascript
import { Visualization3D } from './modules/visualization.js';
```

#### Constructor
```javascript
const viz = new Visualization3D(canvas)
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `addPoint(position, step)` | Add particle | `position: {x,y,z}, step: number` | `void` |
| `setOpacity(opacity)` | Set particle opacity | `opacity: 0-1` | `void` |
| `setShowTrails(show)` | Toggle trails | `show: boolean` | `void` |
| `clearParticles()` | Clear all particles | - | `void` |
| `resetCamera()` | Reset camera position | - | `void` |
| `render()` | Render frame | - | `void` |
| `dispose()` | Clean up resources | - | `void` |

#### Properties
- `maxParticles`: Maximum particle count
- `opacity`: Current opacity
- `showTrails`: Trail display state

---

### FloralProjection

2D projection and rhodonea overlay.

```javascript
import { FloralProjection } from './modules/floral.js';
```

#### Constructor
```javascript
const floral = new FloralProjection(canvas, projectionPlane = 'xy')
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `projectToPlane(point)` | Project 3D to 2D | `point: {x,y,z}` | `{x,y}` |
| `toPolar(point)` | Convert to polar | `point: {x,y}` | `{r,theta}` |
| `accumulatePolar(point3D)` | Add to buffer | `point3D: {x,y,z}` | `{r,theta}` |
| `rhodonea(theta)` | Compute rhodonea | `theta: number` | `number` |
| `draw()` | Draw projection | - | `void` |
| `setRhodoneaParams(params)` | Update rhodonea | `params: object` | `void` |
| `setProjectionPlane(plane)` | Change plane | `plane: string` | `void` |
| `clear()` | Clear buffer | - | `void` |
| `getPolarBuffer()` | Get buffer | - | `array` |

#### Rhodonea Parameters
```javascript
{
    k: 3.96,      // Frequency factor 1
    m: 24.26,     // Frequency factor 2
    phi: -0.286,  // Phase offset
    a: 3.74       // Amplitude
}
```

---

### MetricsCalculator

Computes E_flower, λ, and FI.

```javascript
import { MetricsCalculator } from './modules/metrics.js';
```

#### Constructor
```javascript
const metrics = new MetricsCalculator(floralProjection, lyapunovEstimator)
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `computeEflower()` | Calculate radial error | - | `number` |
| `getLyapunov()` | Get Lyapunov exponent | - | `number` |
| `computeFI()` | Calculate Flower Index | - | `number` |
| `update()` | Update all metrics | - | `{E_flower, lambda, FI}` |
| `getMetrics()` | Get current metrics | - | `{E_flower, lambda, FI}` |
| `reset()` | Reset metrics | - | `void` |
| `setPresetLambda(lambda)` | Set preset λ | `lambda: number` | `void` |

---

### PresetManager

Manages configuration presets.

```javascript
import { PresetManager } from './modules/presets.js';
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `loadFromFile(url)` | Load presets | `url: string` | `Promise<boolean>` |
| `getPreset(id)` | Get specific preset | `id: string` | `object` |
| `getPresetIds()` | List preset IDs | - | `string[]` |
| `getPresetOptions()` | Get UI options | - | `array` |
| `applyPreset(id)` | Apply preset | `id: string` | `object` |
| `getCurrentPreset()` | Get current | - | `object` |
| `exportConfiguration()` | Export config | - | `object` |
| `createCustomPreset(...)` | Create custom | `id, description, state` | `object` |

#### Preset Structure
```javascript
{
    id: "preset_id",
    description: "Description",
    model: {
        b: 0.19,
        dt: 0.01,
        steps: 300000,
        transient_steps: 2000,
        seed: [0.1, 0.0, 0.0]
    },
    projection: {
        plane: "xy",
        rotation: { axis: "z", angle_rad: 0.0 }
    },
    rhodonea: {
        k: 3.96,
        m: 24.26,
        phi: -0.286,
        a: 3.74
    },
    metrics: {
        E_flower: 0.120,
        lambda_max: 0.103,
        FI_computed: 0.8054705
    }
}
```

---

### UIController

Manages user interface.

```javascript
import { UIController } from './modules/controls.js';
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `init()` | Initialize UI | - | `void` |
| `on(event, callback)` | Register handler | `event: string, callback: function` | `void` |
| `updateHUD(metrics, points, fps)` | Update display | `metrics, points, fps` | `void` |
| `updatePresetDropdown(options)` | Update presets | `options: array` | `void` |
| `setControlValues(values)` | Set controls | `values: object` | `void` |
| `showLoading(show)` | Toggle loading | `show: boolean` | `void` |
| `showNotification(msg, duration)` | Show message | `msg: string, duration: ms` | `void` |

#### Events
- `bChange`: b parameter changed
- `opacityChange`: Opacity changed
- `planeChange`: Projection plane changed
- `floralToggle`: Floral panel toggled
- `trailsToggle`: Trails toggled
- `presetChange`: Preset selected
- `resetView`: Camera reset
- `exportPNG`: PNG export requested
- `exportJSON`: JSON export requested
- `pauseToggle`: Pause toggled

---

### ExportManager

Handles data and image export.

```javascript
import { ExportManager } from './modules/export.js';
```

#### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `setCanvases(main, floral)` | Set canvases | `Canvas elements` | `void` |
| `exportPNG(filename)` | Export image | `filename: string` | `void` |
| `exportCombinedPNG(showFloral)` | Export combined | `showFloral: boolean` | `void` |
| `exportJSON(data, filename)` | Export JSON | `data: object, filename` | `void` |
| `exportCSV(history, filename)` | Export CSV | `history: array, filename` | `void` |
| `exportPointCloud(positions, format)` | Export points | `positions, format: xyz/ply/json` | `void` |
| `exportShareableLink(state)` | Create share URL | `state: object` | `string` |
| `importFromShareableLink()` | Import from URL | - | `object|null` |

---

## Main Application

### ThomasFlowerApp

Main application class.

```javascript
import { ThomasFlowerApp } from './main.js';
```

#### Public Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `pause()` | Pause simulation | - | `void` |
| `resume()` | Resume simulation | - | `void` |
| `setB(value)` | Set b parameter | `value: number` | `void` |
| `exportMetricsCSV()` | Export metrics | - | `void` |
| `exportPointCloud(format)` | Export points | `format: string` | `void` |

#### Global Instance
```javascript
// Available after page load
window.thomasFlowerApp
```

---

## Utility Classes

### Statistics

Statistical utilities.

```javascript
import { Statistics } from './modules/metrics.js';
```

#### Static Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `mean(arr)` | Calculate mean | `arr: number[]` | `number` |
| `stdDev(arr)` | Standard deviation | `arr: number[]` | `number` |
| `percentile(arr, p)` | Get percentile | `arr: number[], p: 0-100` | `number` |
| `removeOutliers(arr, factor)` | Remove outliers | `arr: number[], factor: number` | `number[]` |

---

## Usage Examples

### Basic Setup
```javascript
// Initialize components
const attractor = new ThomasAttractor(0.19, 0.01);
const lyapunov = new LyapunovEstimator(attractor);
const viz = new Visualization3D(canvas);

// Run simulation
function animate() {
    const point = attractor.step();
    viz.addPoint(point, attractor.currentStep);
    viz.render();
    requestAnimationFrame(animate);
}
```

### Custom Preset
```javascript
const presetManager = new PresetManager();
presetManager.createCustomPreset(
    'my_preset',
    'My Custom Configuration',
    {
        b: 0.195,
        dt: 0.01,
        projectionPlane: 'xy',
        rhodoneaParams: { k: 4, m: 24, phi: 0, a: 3.5 },
        metrics: { E_flower: 0.15, lambda: 0.11, FI: 0.75 }
    }
);
```

### Metrics Analysis
```javascript
const metrics = new MetricsCalculator(floral, lyapunov);

// Update and log metrics
setInterval(() => {
    const current = metrics.update();
    console.log(`FI: ${current.FI.toFixed(3)}`);
}, 1000);
```

### Batch Processing
```javascript
async function sweepParameter() {
    const results = [];
    
    for (let b = 0.15; b <= 0.25; b += 0.005) {
        thomasFlowerApp.setB(b);
        
        // Wait for stabilization
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Collect metrics
        const metrics = thomasFlowerApp.metrics.getMetrics();
        results.push({ b, ...metrics });
    }
    
    // Export results
    thomasFlowerApp.exportManager.exportCSV(results);
}
```

---

## Events and Callbacks

### Custom Event Handling
```javascript
const ui = new UIController();

ui.on('bChange', (value) => {
    console.log(`B parameter changed to: ${value}`);
});

ui.on('exportPNG', () => {
    console.log('Exporting image...');
});
```

### Animation Hooks
```javascript
class CustomApp extends ThomasFlowerApp {
    animate() {
        // Custom pre-animation logic
        this.onBeforeAnimate();
        
        super.animate();
        
        // Custom post-animation logic
        this.onAfterAnimate();
    }
}
```

---

## Error Handling

### Try-Catch Patterns
```javascript
try {
    await presetManager.loadFromFile('presets.json');
} catch (error) {
    console.error('Failed to load presets:', error);
    // Use defaults
    presetManager.applyPreset('canonical_xy');
}
```

### Validation
```javascript
function validateB(value) {
    if (value < 0.15 || value > 0.25) {
        throw new Error('B parameter out of range');
    }
    return value;
}
```

---

*For more examples, see the `examples/` directory*