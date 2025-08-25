# Thomas Flower Interactive Visualizer

An interactive web-based visualization tool for exploring the Thomas attractor with floral projections and rhodonea curve overlays. This implementation reveals the hidden "flower-like" patterns in chaotic dynamics through specialized projections and metrics.

## Features

- **3D Thomas Attractor Visualization**: Real-time particle-based rendering of the chaotic attractor
- **Thomas Chaos Meter (CTM)**: Advanced chaos quantification based on Lyapunov exponents and Kaplan-Yorke dimension
- **Floral Projection Panel**: 2D polar projection showing the attractor's radial patterns
- **Rhodonea Overlay**: Mathematical rose curve fitting to quantify floral structure
- **Flower Index (FI)**: Novel metric combining radial error and Lyapunov exponent
- **Lyapunov Exponent Calculation**: Real-time computation using QR decomposition (Benettin method)
- **Parameter Sweep Analysis**: Explore chaos behavior across parameter space with automatic critical point detection
- **Bootstrap Confidence Intervals**: Statistical uncertainty quantification for all metrics
- **Multiple Presets**: Pre-configured parameter sets for different projections and chaos regimes
- **Interactive Controls**: Adjust parameters, opacity, and visualization modes in real-time
- **Export Capabilities**: Save visualizations as PNG, parameter data as JSON, or sweep results as CSV/MATLAB

## Quick Start

### Running Locally

1. Clone or download this repository
2. Start a local web server in the project directory:
   ```bash
   python -m http.server 8000
   ```
   Or using Node.js:
   ```bash
   npx http-server
   ```
3. Open your browser and navigate to `http://localhost:8000`
4. The visualizer will load with the default "canonical_xy" preset

### Direct File Access

Simply open `index.html` in a modern web browser. Note that some features (preset loading) may require a local server due to CORS restrictions.

## Controls

### Keyboard Shortcuts
- **Mouse Drag**: Rotate the 3D view
- **Mouse Wheel**: Zoom in/out
- **Space**: Pause/resume simulation (when implemented)

### UI Controls

- **b Parameter Slider**: Adjust the chaos parameter (0.15 - 0.25)
  - ~0.19: Edge of chaos (most structured)
  - <0.185: More periodic behavior
  - >0.21: Deep chaos regime

- **3D Opacity**: Control transparency of the attractor particles

- **Projection Plane**: Select which 2D plane to project onto
  - XY: Default projection
  - YZ: Alternative view
  - ZX: Third orthogonal projection

- **Show Floral**: Toggle the 2D floral projection panel

- **Show Trails**: Toggle particle trail rendering

- **Export PNG**: Save current 3D view as image

- **Export JSON**: Save current parameters and metrics

- **Reset View**: Return camera to default position

## Understanding the Metrics

### CTM (Thomas Chaos Meter)
- Composite chaos metric: CTM = √(C_λ × C_D)
- C_λ = 1 - exp(-λ₁/(3b)): Unpredictability component
- C_D = clamp(D_KY - 2, 0, 1): Geometric complexity
- Range: 0-1, with interpretations:
  - CTM < 0.05: Near-regular dynamics
  - CTM 0.10-0.25: Moderate chaos (typical Thomas)
  - CTM > 0.25: Strong chaos

### Lyapunov Exponents (λ₁, λ₂, λ₃)
- Measure exponential divergence of nearby trajectories
- λ₁ > 0 indicates chaos
- Sum identity: λ₁ + λ₂ + λ₃ = -3b (exact for Thomas)
- Computed using QR decomposition method

### Kaplan-Yorke Dimension (D_KY)
- Fractal dimension of the attractor
- D_KY = 2 + λ₁/|λ₃| for Thomas system
- Values typically between 2.0 and 2.3

### E_flower (Radial Error)
- RMSE between attractor points and fitted rhodonea curve
- Lower values (~0.12) indicate better floral structure
- Computed over sliding window of recent points

### FI (Flower Index)
- Combined metric: FI = (1/(1+E_flower)) × e^(-λ)
- Range: 0-1, higher is more "flower-like"
- ~0.805 for canonical parameters

## Presets

The visualizer includes several pre-configured parameter sets:

1. **canonical_xy**: Baseline XY projection with optimal floral structure
2. **rotated_xy_15**: 15-degree rotation showing projection effects
3. **yz_projection**: Alternative plane projection
4. **zx_projection**: Third orthogonal view
5. **chaos_edge_b_0.185**: Near the chaos transition
6. **high_chaos_b_0.21**: Deep chaotic regime

## Technical Details

### Thomas Attractor System
The attractor is defined by the differential equations:
```
ẋ = sin(y) - bx
ẏ = sin(z) - by
ż = sin(x) - bz
```

### Rhodonea Curve
The floral overlay uses the parametric rose curve:
```
r(θ) = a × cos(k × m × θ + φ)
```

Where:
- `a`: Amplitude/size
- `k`, `m`: Frequency parameters determining petal count
- `φ`: Phase offset

### Integration
- Method: Euler integration (RK4 optional)
- Time step: dt = 0.01
- Transient removal: 2000 steps
- Subsampling: Every 3 steps for performance

## Configuration

### Modifying Presets

Edit `thomas_flower_js_config.json` to add or modify presets:

```json
{
  "preset_name": {
    "id": "preset_name",
    "description": "Description",
    "model": {
      "b": 0.19,
      "dt": 0.01,
      "steps": 300000,
      "transient_steps": 2000,
      "seed": [0.1, 0.0, 0.0]
    },
    "rhodonea": {
      "k": 3.96,
      "m": 24.26,
      "phi": -0.286,
      "a": 3.74
    },
    "metrics": {
      "E_flower": 0.120,
      "lambda_max": 0.103,
      "FI_computed": 0.8054705
    }
  }
}
```

## Performance Notes

- Optimized for ~50,000 particles
- Target: 60 FPS on mid-range hardware
- Metrics computed every 4 frames
- Floral panel updated every 2 frames
- Ring buffers used for efficiency

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (WebGL required)
- Mobile: Limited by performance

## Mathematical Background

This visualizer implements the theoretical framework for discovering floral patterns in chaotic attractors. The Thomas attractor exhibits quasi-periodic behavior that, when projected and analyzed in polar coordinates, reveals rose-like (rhodonea) patterns. The Flower Index quantifies this structure, combining geometric fit quality with dynamical chaos measures.

## License

This implementation is provided for educational and research purposes. Please respect any upstream licenses if reusing code components.

## Acknowledgments

- Inspired by the velfields visualization style
- Thomas attractor discovered by René Thomas
- Rhodonea curves (rose curves) from classical geometry

## Troubleshooting

### Visualizer not loading
- Ensure you're using a modern browser with WebGL support
- Check browser console for errors
- Try running from a local server if loading presets fails

### Poor performance
- Reduce particle count in code
- Lower subsample rate
- Disable floral panel when not needed
- Close other browser tabs

### Presets not loading
- Ensure `thomas_flower_js_config.json` is in the same directory
- Check for JSON syntax errors
- Run from local server to avoid CORS issues