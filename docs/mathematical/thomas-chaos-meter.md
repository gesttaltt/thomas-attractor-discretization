# Thomas Chaos Meter (CTM) Protocol

## Executive Summary

The Thomas Chaos Meter (CTM) is a linearized chaos measurement system specifically designed for the Thomas attractor. It provides a normalized, dimensionless chaos score based on variational dynamics and Lyapunov exponents.

## Mathematical Foundation

### Thomas System

The Thomas attractor is defined by the differential equations:

```
ẋ = sin(y) - bx
ẏ = sin(z) - by
ż = sin(x) - bz
```

Where `b > 0` is the dissipation parameter.

### Jacobian and Divergence

The Jacobian matrix:

```
J(x,y,z) = | -b    cos(y)  0     |
           | 0     -b      cos(z) |
           | cos(x) 0      -b     |
```

The divergence (trace of Jacobian):
```
div(f) = tr(J) = -3b (constant)
```

This constant divergence implies volume contraction at rate 3b.

### Lyapunov Exponents

For Lyapunov exponents λ₁ ≥ λ₂ ≥ λ₃, the sum identity holds:

```
λ₁ + λ₂ + λ₃ = -3b
```

This is exact for the Thomas system due to constant divergence.

## CTM Definition

### Components

#### 1. Unpredictability Component (C_λ)

```
C_λ = 1 - exp(-λ₁/(3b))
```

Normalizes the largest Lyapunov exponent by the system's volume contraction scale.

#### 2. Geometric Complexity Component (C_D)

```
C_D = clamp(D_KY - 2, 0, 1)
```

Where D_KY is the Kaplan-Yorke dimension:

```
D_KY = 2 + λ₁/|λ₃|
```

#### 3. Composite Chaos Meter

```
CTM = √(C_λ × C_D)
```

The geometric mean prevents single-term domination.

## Interpretation Guide

### CTM Value Ranges

- **CTM < 0.05**: Near-regular dynamics, weak chaos
- **CTM 0.10-0.25**: Moderate chaos (typical Thomas regime)
- **CTM > 0.25**: Strong chaos

### Example Calculation (b = 0.19)

For the canonical parameter b = 0.19:

```
λ₁ ≈ 0.103
λ₃ ≈ -0.673
D_KY ≈ 2.153

C_λ ≈ 0.166
C_D ≈ 0.153
CTM ≈ 0.159 (moderate chaos)
```

## Numerical Implementation

### Integration Parameters

| Parameter | Default Value | Description |
|-----------|--------------|-------------|
| Integrator | RK4 | Runge-Kutta 4th order |
| dt | 0.01 | Time step |
| Total steps | 3,000,000 | For convergence |
| Transient | 2,000 | Steps to discard |
| QR period | 5 | Orthonormalization frequency |
| FTLE window | 10,000 | Finite-time Lyapunov window |
| Bootstrap samples | 200 | For confidence intervals |

### Benettin's QR Method

1. Initialize orthonormal tangent vectors
2. Evolve tangent vectors using variational equation:
   ```
   δẋ = J(x(t)) · δx
   ```
3. Apply QR decomposition every n_GS steps
4. Accumulate logarithmic growth rates
5. Average over trajectory for Lyapunov exponents

### Quality Checks

1. **Sum Identity**: Verify λ₁ + λ₂ + λ₃ = -3b
2. **Convergence**: Monitor running average stability
3. **Orthogonality**: Check QR decomposition quality
4. **Bootstrap CI**: Ensure reasonable confidence intervals

## Parameter Space Analysis

### b-Parameter Sweep

Recommended grid:
- Range: 0.10 to 0.40
- Base step: 0.01
- Refinement near transitions: 0.001

### Critical Points

- **b ≈ 0.185**: Edge of chaos
- **b = 0.19**: Canonical chaos
- **b > 0.21**: Deep chaos regime

## Validation Methods

### 0-1 Test for Chaos

Gottwald-Melbourne test should correlate with CTM:
- K ≈ 0: Regular dynamics (CTM < 0.05)
- K ≈ 1: Chaotic dynamics (CTM > 0.10)

### Rotation Invariance

CTM should be invariant under coordinate rotations.

### Seed Independence

CTM should be consistent across different initial conditions (within CI).

## JSON Output Schema

```json
{
  "system": "Thomas",
  "b": 0.19,
  "dt": 0.01,
  "integrator": "RK4",
  "seed": [0.1, 0.0, 0.0],
  "steps_total": 3000000,
  "transient_steps": 2000,
  "lambda": {
    "l1": {"mean": 0.103, "ci": [0.097, 0.109]},
    "l2": {"mean": 0.000, "ci": [-0.010, 0.010]},
    "l3": {"mean": -0.673, "ci": [-0.690, -0.656]},
    "sum_check": -0.57
  },
  "D_KY": {"mean": 2.153, "ci": [2.135, 2.171]},
  "C_lambda": 0.166,
  "C_D": 0.153,
  "CTM": {"mean": 0.159, "ci": [0.150, 0.168]}
}
```

## Advantages

1. **Linearized**: Based on variational dynamics
2. **Normalized**: Dimensionless [0,1) scale
3. **Theory-grounded**: Uses exact system properties
4. **Robust**: Bootstrap confidence intervals
5. **Thomas-specific**: Tailored to system's 3b scale

## Limitations

1. **System-specific**: Not universal across attractors
2. **Computational cost**: Requires long integration
3. **Convergence**: Slow for near-regular dynamics

---

*For implementation details, see [CTM Implementation](../technical/ctm-implementation.md)*