# Flower Index Theory

## Overview

The Flower Index (FI) is a novel metric that quantifies the "flower-like" structure observed in chaotic attractor projections. It combines geometric fit quality with dynamical chaos measures to create a unified score.

## Mathematical Background

### Rhodonea Curves (Rose Curves)

Rhodonea curves are mathematical rose patterns described by the polar equation:

```
r(θ) = a × cos(k × m × θ + φ)
```

Where:
- `a`: Amplitude (size of the rose)
- `k, m`: Frequency parameters (determine petal count)
- `φ`: Phase offset (rotation angle)

### Petal Count Formula

The number of petals depends on k and m:
- If k·m is odd: k·m petals
- If k·m is even: 2·k·m petals

## Flower Index Definition

### Core Formula

```
FI = (1 / (1 + E_flower)) × e^(-λ)
```

Where:
- `E_flower`: Radial error between attractor and rhodonea curve
- `λ`: Largest Lyapunov exponent (chaos measure)

### Components

#### 1. Radial Error (E_flower)

Root Mean Square Error between projected attractor points and fitted rhodonea:

```
E_flower = √(∑(r_i - r_i)² / N)
```

Where:
- `r_i`: Actual radius of attractor point i
- `r_i`: Rhodonea radius at angle θ_i
- `N`: Number of points in sliding window

#### 2. Chaos Weighting

The exponential term `e^(-λ)` weights the index by chaos level:
- Lower chaos (λ → 0): Weight → 1 (maximum)
- Higher chaos (λ → ∞): Weight → 0 (minimum)

### Interpretation

- **FI → 1**: Perfect flower-like structure with low chaos
- **FI ≈ 0.8**: Good floral pattern (canonical Thomas)
- **FI < 0.5**: Poor floral structure or high chaos

## Projection Methodology

### 2D Plane Projections

#### XY Projection
```
x' = x
y' = y
r = √(x'² + y'²)
θ = atan2(y', x')
```

#### YZ Projection
```
x' = y
y' = z
r = √(x'² + y'²)
θ = atan2(y', x')
```

#### ZX Projection
```
x' = z
y' = x
r = √(x'² + y'²)
θ = atan2(y', x')
```

### Rotational Projections

Apply rotation matrix before projection:

```
[x_rot]   [cosα  -sinα  0] [x]
[y_rot] = [sinα   cosα  0] [y]
[z_rot]   [0       0     1] [z]
```

## Fitting Procedure

### Optimization Algorithm

1. **Initial Guess**: Use FFT to estimate dominant frequencies
2. **Parameter Search**: Optimize (a, k, m, φ) to minimize E_flower
3. **Constraints**:
   - a > 0 (positive amplitude)
   - k, m ∈ ℝ⁺ (positive frequencies)
   - φ ∈ [-π, π] (phase range)

### Sliding Window Analysis

- Window size: 10,000 points (typical)
- Update frequency: Every 100 points
- Ring buffer for efficiency

## Canonical Parameters

### Thomas Attractor (b = 0.19)

| Projection | k | m | φ | a | E_flower | FI |
|------------|---|---|-----|---|----------|------|
| XY | 3.96 | 24.26 | -0.286 | 3.74 | 0.120 | 0.805 |
| YZ | 4.12 | 23.89 | -0.312 | 3.68 | 0.135 | 0.782 |
| ZX | 3.88 | 24.51 | -0.273 | 3.81 | 0.128 | 0.793 |

## Phenomenology

### Why Flowers in Chaos?

The floral patterns emerge from:

1. **Quasi-periodicity**: Near-periodic orbits in chaotic regime
2. **Rotational Symmetry**: Thomas system's cyclic symmetry
3. **Projection Effects**: 2D slices reveal hidden structure
4. **Attractor Geometry**: Toroidal manifold with complex folding

### Parameter Dependencies

#### b Parameter Effect
- b < 0.185: More regular, clearer petals
- b = 0.19: Optimal balance (highest FI)
- b > 0.21: Increased chaos, degraded pattern

#### Projection Plane Effect
- XY: Typically best floral structure
- YZ, ZX: Alternative patterns, slightly lower FI
- Rotated: Can reveal hidden symmetries

## Applications

### Chaos Classification

FI provides a geometric measure complementing traditional metrics:
- Lyapunov exponents: Dynamical divergence
- Fractal dimension: Geometric complexity
- **Flower Index: Pattern quality**

### Attractor Comparison

FI enables comparison across different:
- Parameter values
- Projection planes
- Rotation angles
- Time windows

### Aesthetic Optimization

Find parameters maximizing visual appeal:
```
max FI(b, plane, rotation)
```

## Computational Considerations

### Performance Optimization

1. **Ring Buffers**: Avoid array reallocation
2. **Incremental Updates**: Sliding RMSE calculation
3. **Subsampling**: Every 3-5 integration steps
4. **GPU Acceleration**: Parallel polar conversion

### Numerical Stability

1. **Outlier Rejection**: Clip extreme radii (>99.9 percentile)
2. **Angle Wrapping**: Handle θ ∈ [-π, π] properly
3. **Small Radius Handling**: Avoid division by zero near origin

## Visualization

### Floral Projection Panel

- **Scatter Plot**: (r, θ) points in polar coordinates
- **Rhodonea Overlay**: Fitted rose curve in pink
- **Reference Circles**: Radial grid for scale
- **Color Coding**: Time-based or radius-based

### Real-time Metrics

- E_flower: Updated every frame
- λ: From CTM calculation
- FI: Combined score display
- Rhodonea parameters: k, m, φ, a

## Future Extensions

### Multi-scale Analysis

Analyze FI at different time scales:
- Short windows: Local pattern quality
- Long windows: Global structure

### Adaptive Rhodonea

Time-varying parameters:
```
r(t, θ) = a(t) × cos(k(t) × m(t) × θ + φ(t))
```

### Higher-order Curves

Extend beyond simple rhodonea:
- Maurer roses
- Hypotrochoids
- Lissajous curves

---

*For implementation details, see [Implementation Brief](./implementation-brief.md)*