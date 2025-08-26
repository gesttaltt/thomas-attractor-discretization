# User Guide - Thomas Flower Visualizer

## Getting Started

### Installation

1. **Clone or Download** the repository to your local machine
2. **No installation required** - runs entirely in the browser
3. **Recommended browsers**: Chrome, Firefox, Safari (latest versions)

### Running the Visualizer

#### Option 1: Direct File Access
Simply open `index.html` in your web browser

#### Option 2: Local Server (Recommended)
```bash
# Using Python
python -m http.server 8002

# Using Node.js
npx http-server -p 8002

# Or use the provided server script
python server.py

# Then navigate to
http://localhost:8002
```

### First Steps

1. The visualizer starts automatically with the default "canonical_xy" preset
2. Watch the 3D attractor form in real-time
3. Press **F** to toggle the floral projection panel
4. Adjust the **b parameter** slider to explore different chaos regimes

## Understanding the Interface

### Main Display
- **3D Visualization**: The main canvas showing the Thomas attractor
- **Particle System**: Up to 50,000 points rendered in real-time
- **Color Coding**: Points colored based on position and time

### HUD (Heads-Up Display)
Located in the top-left corner:
- **b**: Current chaos parameter (0.15-0.25)
- **E_flower**: Radial error measure
- **λ**: Lyapunov exponent (chaos measure)
- **FI**: Flower Index (0-1, higher = more flower-like)
- **Points**: Current particle count
- **FPS**: Frames per second

### Floral Panel
When enabled (press F), shows:
- 2D projection of the attractor
- Polar coordinate scatter plot
- Rhodonea curve overlay (pink)
- Reference circles for scale

## Controls Reference

### Mouse Controls
- **Left Click + Drag**: Rotate view
- **Scroll Wheel**: Zoom in/out

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **Space** | Pause/Resume simulation |
| **F** | Toggle floral projection panel |
| **R** | Reset camera view |
| **T** | Toggle particle trails |
| **←/→** | Adjust b parameter |

### UI Controls

#### Parameter Sliders
- **b Parameter** (0.15-0.25): Controls chaos level
  - 0.15-0.185: More periodic
  - 0.185-0.195: Edge of chaos
  - 0.195-0.25: Chaotic regime

- **3D Opacity** (0.1-1.0): Particle transparency

#### Projection Settings
- **Plane Selector**: Choose projection plane
  - XY: Default view
  - YZ: Side projection
  - ZX: Top projection

#### Toggle Options
- **Show Floral**: Display 2D projection panel
- **Show Trails**: Keep particle history

#### Action Buttons
- **Export PNG**: Save current view as image
- **Export JSON**: Save parameters and metrics
- **Reset View**: Return to default camera position

## Understanding the Metrics

### E_flower (Radial Error)
- Measures how well the attractor fits a rose curve
- Lower values (≈0.12) indicate better floral structure
- Computed over recent points

### λ (Lyapunov Exponent)
- Quantifies chaos/sensitivity
- Higher values = more chaotic
- Typical: 0.095-0.125

### FI (Flower Index)
- Combined metric: 0-1 scale
- Higher values = more flower-like
- Target: ≈0.805 for canonical parameters

## Working with Presets

### Available Presets
1. **canonical_xy**: Optimal floral structure (FI ≈ 0.805)
2. **chaos_edge**: Near chaos transition (b=0.185)
3. **high_chaos**: Deep chaos (b=0.21)
4. **yz_projection**: Alternative plane view
5. **zx_projection**: Third orthogonal view

### Switching Presets
1. Use the dropdown menu in the top bar
2. System automatically resets and applies new parameters
3. Watch the metrics update in real-time

## Exporting Data

### Image Export
1. Click **Export PNG** button
2. Current 3D view saved as image
3. If floral panel visible, included in export

### Data Export
1. Click **Export JSON** button
2. Saves current:
   - Parameters (b, dt, projection)
   - Rhodonea settings
   - Metrics (E_flower, λ, FI)
   - Simulation state

### Advanced Export (via Console)
```javascript
// Export metrics history as CSV
thomasFlowerApp.exportMetricsCSV();

// Export point cloud
thomasFlowerApp.exportPointCloud('xyz');  // or 'ply', 'json'
```

## Tips for Best Experience

### Performance Optimization
- Disable trails for better FPS
- Reduce opacity for smoother rendering
- Close floral panel when not needed

### Exploration Tips
1. Start with canonical preset
2. Slowly adjust b parameter
3. Watch how FI changes
4. Try different projections
5. Compare chaos regimes

### Scientific Usage
- Record metrics at specific b values
- Export data for analysis
- Use consistent presets for comparison
- Document parameter combinations

## Troubleshooting

### Low Performance
- Reduce particle count in settings
- Disable trails
- Close other browser tabs
- Use a modern browser

### Presets Not Loading
- Check console for errors
- Ensure running from server (not file://)
- Verify JSON file present

### Export Not Working
- Check browser permissions
- Try different browser
- Ensure sufficient disk space

## Advanced Features

### Custom Presets
Create your own by modifying `data/thomas_flower_js_config.json`

### URL Sharing
Share specific states via URL parameters (coming soon)

### Batch Processing
Use the API for automated analysis:
```javascript
// Example: Sweep b parameter
for (let b = 0.15; b <= 0.25; b += 0.01) {
    thomasFlowerApp.setB(b);
    // Wait and collect metrics
}
```

## Further Reading

- [Mathematical Background](./mathematical-background.md)
- [API Reference](./api-reference.md)
- [Research Papers](./references.md)

---

*For technical support, see the [Documentation Index](./index.md)*