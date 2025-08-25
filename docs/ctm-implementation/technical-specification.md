# Thomas Chaos Meter (CTM) - Technical Implementation Specification

## 1. Overview

This document provides the complete technical specification for implementing the Thomas Chaos Meter (CTM) as defined in the protocol. The CTM is a linearized chaos measurement system based on variational dynamics and Lyapunov exponents.

## 2. Mathematical Foundation

### 2.1 Core Equations

#### Thomas System
```
ẋ = sin(y) - bx
ẏ = sin(z) - by  
ż = sin(x) - bz
```

#### Jacobian Matrix
```
J(x,y,z) = | -b    cos(y)  0     |
           | 0     -b      cos(z) |
           | cos(x) 0      -b     |
```

#### Divergence
```
div(f) = tr(J) = -3b (constant)
```

### 2.2 Key Metrics

#### Lyapunov Exponents
- λ₁ ≥ λ₂ ≥ λ₃ (ordered)
- Sum identity: λ₁ + λ₂ + λ₃ = -3b

#### Kaplan-Yorke Dimension
```
D_KY = 2 + λ₁/|λ₃|
where λ₃ ≈ -3b - λ₁
```

#### CTM Components
```
C_λ = 1 - exp(-λ₁/(3b))  ∈ (0,1)
C_D = clamp(D_KY - 2, 0, 1)
CTM = √(C_λ × C_D)
```

## 3. Implementation Architecture

### 3.1 Module Structure

```
src/modules/
├── chaos/
│   ├── lyapunov.js         # Lyapunov exponent calculation
│   ├── variational.js      # Variational dynamics
│   ├── qr-decomposition.js # QR orthonormalization
│   ├── kaplan-yorke.js     # Dimension calculation
│   └── ctm.js              # CTM composite metric
├── analysis/
│   ├── parameter-sweep.js   # Parameter space exploration
│   ├── bootstrap.js         # Confidence intervals
│   ├── ftle.js             # Finite-time Lyapunov
│   └── validation.js        # 0-1 test and checks
└── visualization/
    ├── ctm-display.js       # Real-time CTM display
    ├── phase-space.js       # Enhanced 3D visualization
    └── bifurcation.js       # Bifurcation diagrams
```

### 3.2 Data Flow

```
[Attractor Integration]
         ↓
[Tangent Vector Evolution]
         ↓
[QR Orthonormalization]
         ↓
[Lyapunov Accumulation]
         ↓
[FTLE Windows]
         ↓
[Bootstrap Sampling]
         ↓
[CTM Calculation]
         ↓
[Visualization/Export]
```

## 4. Detailed Component Specifications

### 4.1 Lyapunov Exponent Calculator

#### Class: `LyapunovCalculator`

**Properties:**
- `tangentVectors`: 3×3 matrix (orthonormal basis)
- `lyapunovSums`: [λ₁_sum, λ₂_sum, λ₃_sum]
- `qrPeriod`: 5 (steps between QR)
- `stepCount`: integration step counter
- `windowSize`: 10000 (FTLE window)

**Methods:**

```javascript
class LyapunovCalculator {
    constructor(dimension = 3, qrPeriod = 5) {
        this.dimension = dimension;
        this.qrPeriod = qrPeriod;
        this.tangentVectors = this.initializeOrthonormalBasis();
        this.lyapunovSums = new Array(dimension).fill(0);
        this.stepCount = 0;
        this.ftleWindows = [];
    }
    
    initializeOrthonormalBasis() {
        // Return identity matrix
        return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }
    
    evolveAndMeasure(state, jacobian, dt) {
        // Evolve tangent vectors: V̇ = J·V
        this.evolveTangentVectors(jacobian, dt);
        
        // Perform QR if needed
        if (++this.stepCount % this.qrPeriod === 0) {
            this.performQR();
        }
    }
    
    evolveTangentVectors(jacobian, dt) {
        // RK4 integration for tangent vectors
        // Implementation details below
    }
    
    performQR() {
        // Gram-Schmidt orthonormalization
        // Accumulate growth rates
        // Return R diagonal elements
    }
    
    getExponents() {
        // Return time-averaged Lyapunov exponents
        return this.lyapunovSums.map(sum => sum / (this.stepCount * this.dt));
    }
}
```

### 4.2 Variational Dynamics

#### Class: `VariationalDynamics`

**Purpose:** Evolve tangent vectors according to linearized dynamics

**Key Algorithm:**
```javascript
evolveTagentVector(v, jacobian, dt) {
    // RK4 for tangent vector evolution
    const k1 = matrixVectorMultiply(jacobian, v);
    const k2 = matrixVectorMultiply(jacobian, vectorAdd(v, scalarMultiply(k1, dt/2)));
    const k3 = matrixVectorMultiply(jacobian, vectorAdd(v, scalarMultiply(k2, dt/2)));
    const k4 = matrixVectorMultiply(jacobian, vectorAdd(v, scalarMultiply(k3, dt)));
    
    return vectorAdd(v, scalarMultiply(
        vectorAdd(k1, scalarMultiply(vectorAdd(k2, k3), 2), k4),
        dt/6
    ));
}
```

### 4.3 QR Decomposition

#### Implementation: Modified Gram-Schmidt

```javascript
performQR(vectors) {
    const n = vectors.length;
    const Q = [];
    const R = [];
    
    for (let i = 0; i < n; i++) {
        let q = [...vectors[i]];
        R[i] = [];
        
        // Orthogonalize against previous vectors
        for (let j = 0; j < i; j++) {
            R[j][i] = dotProduct(Q[j], vectors[i]);
            q = vectorSubtract(q, scalarMultiply(Q[j], R[j][i]));
        }
        
        // Normalize
        R[i][i] = norm(q);
        Q[i] = scalarMultiply(q, 1/R[i][i]);
        
        // Accumulate Lyapunov sum
        this.lyapunovSums[i] += Math.log(Math.abs(R[i][i]));
    }
    
    return { Q, R };
}
```

### 4.4 CTM Calculation

#### Class: `CTMCalculator`

```javascript
class CTMCalculator {
    constructor(b) {
        this.b = b;
        this.lyapunovCalculator = new LyapunovCalculator();
        this.bootstrapSamples = 200;
    }
    
    computeCTM(lyapunovExponents) {
        const [lambda1, lambda2, lambda3] = lyapunovExponents;
        
        // Verify sum identity
        const sumCheck = Math.abs(lambda1 + lambda2 + lambda3 + 3*this.b);
        if (sumCheck > 0.01) {
            console.warn(`Sum identity violation: ${sumCheck}`);
        }
        
        // Kaplan-Yorke dimension
        const D_KY = 2 + lambda1 / Math.abs(lambda3);
        
        // CTM components
        const C_lambda = 1 - Math.exp(-lambda1 / (3 * this.b));
        const C_D = Math.max(0, Math.min(1, D_KY - 2));
        
        // Composite metric
        const CTM = Math.sqrt(C_lambda * C_D);
        
        return {
            lambda1, lambda2, lambda3,
            D_KY, C_lambda, C_D, CTM,
            sumCheck
        };
    }
    
    computeWithBootstrap(ftleWindows) {
        // Bootstrap confidence intervals
        const samples = [];
        
        for (let i = 0; i < this.bootstrapSamples; i++) {
            const resample = this.bootstrapResample(ftleWindows);
            const exponents = this.averageExponents(resample);
            samples.push(this.computeCTM(exponents));
        }
        
        return this.computeStatistics(samples);
    }
}
```

### 4.5 FTLE Windows

#### Purpose: Finite-Time Lyapunov Exponent calculation for variance estimation

```javascript
class FTLECalculator {
    constructor(windowSize = 10000) {
        this.windowSize = windowSize;
        this.windows = [];
        this.currentWindow = {
            tangentVectors: null,
            startStep: 0,
            lyapunovSums: [0, 0, 0]
        };
    }
    
    startNewWindow(step, tangentVectors) {
        this.currentWindow = {
            tangentVectors: cloneMatrix(tangentVectors),
            startStep: step,
            lyapunovSums: [0, 0, 0]
        };
    }
    
    completeWindow(step) {
        const duration = step - this.currentWindow.startStep;
        const exponents = this.currentWindow.lyapunovSums.map(
            sum => sum / (duration * this.dt)
        );
        
        this.windows.push({
            startStep: this.currentWindow.startStep,
            endStep: step,
            exponents,
            duration
        });
        
        // Maintain sliding window buffer
        if (this.windows.length > 100) {
            this.windows.shift();
        }
    }
}
```

## 5. Integration Parameters

### 5.1 Default Configuration

```javascript
const CTM_CONFIG = {
    integration: {
        method: 'RK4',
        dt: 0.01,
        totalSteps: 3000000,
        transientSteps: 2000
    },
    lyapunov: {
        qrPeriod: 5,
        ftleWindow: 10000,
        tangentRenormThreshold: 1e10
    },
    bootstrap: {
        samples: 200,
        confidenceLevel: 0.95
    },
    parameterSweep: {
        bRange: [0.10, 0.40],
        bStep: 0.01,
        refinementZones: [
            { range: [0.17, 0.21], step: 0.001 }  // Near chaos transition
        ]
    },
    validation: {
        sumIdentityTolerance: 0.01,
        convergenceCheckInterval: 100000,
        seedVariations: 5
    }
};
```

### 5.2 Integration Methods

#### RK4 Implementation for Thomas System

```javascript
integrateRK4(state, b, dt) {
    const f = (s) => ({
        x: Math.sin(s.y) - b * s.x,
        y: Math.sin(s.z) - b * s.y,
        z: Math.sin(s.x) - b * s.z
    });
    
    const k1 = f(state);
    const k2 = f({
        x: state.x + k1.x * dt/2,
        y: state.y + k1.y * dt/2,
        z: state.z + k1.z * dt/2
    });
    const k3 = f({
        x: state.x + k2.x * dt/2,
        y: state.y + k2.y * dt/2,
        z: state.z + k2.z * dt/2
    });
    const k4 = f({
        x: state.x + k3.x * dt,
        y: state.y + k3.y * dt,
        z: state.z + k3.z * dt
    });
    
    return {
        x: state.x + (k1.x + 2*k2.x + 2*k3.x + k4.x) * dt/6,
        y: state.y + (k1.y + 2*k2.y + 2*k3.y + k4.y) * dt/6,
        z: state.z + (k1.z + 2*k2.z + 2*k3.z + k4.z) * dt/6
    };
}
```

## 6. Visualization Components

### 6.1 Real-time CTM Display

```javascript
class CTMDisplay {
    constructor(container) {
        this.container = container;
        this.history = [];
        this.maxHistory = 1000;
        this.charts = {
            ctm: null,
            lyapunov: null,
            dimension: null,
            components: null
        };
    }
    
    update(ctmData) {
        this.history.push({
            timestamp: Date.now(),
            ...ctmData
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        this.renderCharts();
        this.updateNumericDisplays(ctmData);
    }
    
    renderCharts() {
        // Implementation using Chart.js or D3.js
        // - Time series of CTM
        // - Lyapunov spectrum
        // - Phase space with CTM coloring
        // - Bootstrap CI bands
    }
}
```

### 6.2 Parameter Sweep Visualization

```javascript
class BifurcationDiagram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = [];
    }
    
    addPoint(b, ctmResult) {
        this.data.push({
            b,
            ctm: ctmResult.CTM,
            lambda1: ctmResult.lambda1,
            D_KY: ctmResult.D_KY,
            ci_lower: ctmResult.ci[0],
            ci_upper: ctmResult.ci[1]
        });
    }
    
    render() {
        // Plot CTM vs b with confidence bands
        // Mark regime transitions
        // Highlight chaos onset
    }
}
```

## 7. Output Formats

### 7.1 JSON Schema

```javascript
const CTM_OUTPUT_SCHEMA = {
    system: "Thomas",
    parameters: {
        b: Number,
        dt: Number,
        integrator: String,
        seed: [Number, Number, Number],
        steps_total: Number,
        transient_steps: Number,
        qr_period: Number,
        ftle_window: Number
    },
    results: {
        lyapunov: {
            lambda1: { mean: Number, ci: [Number, Number] },
            lambda2: { mean: Number, ci: [Number, Number] },
            lambda3: { mean: Number, ci: [Number, Number] },
            sum_check: Number
        },
        kaplanYorke: {
            D_KY: { mean: Number, ci: [Number, Number] }
        },
        ctm: {
            C_lambda: Number,
            C_D: Number,
            CTM: { mean: Number, ci: [Number, Number] }
        }
    },
    diagnostics: {
        convergence: {
            achieved: Boolean,
            iterations: Number,
            variance: Number
        },
        validation: {
            sum_identity_error: Number,
            rotation_invariance: Boolean,
            seed_consistency: Boolean
        }
    },
    metadata: {
        timestamp: String,
        computation_time_ms: Number,
        version: String
    }
};
```

### 7.2 CSV Export Format

```
b,lambda1,lambda1_ci_lower,lambda1_ci_upper,lambda2,lambda3,D_KY,C_lambda,C_D,CTM,CTM_ci_lower,CTM_ci_upper
0.10,0.052,0.048,0.056,-0.001,-0.351,2.148,0.145,0.148,0.146,0.142,0.150
0.11,0.058,0.054,0.062,-0.002,-0.386,2.150,0.152,0.150,0.151,0.147,0.155
...
```

## 8. Performance Optimizations

### 8.1 Parallel Processing

```javascript
class ParallelCTM {
    constructor(numWorkers = 4) {
        this.workers = [];
        this.initializeWorkers(numWorkers);
    }
    
    async parameterSweep(bValues) {
        const chunks = this.chunkArray(bValues, this.workers.length);
        const promises = chunks.map((chunk, i) => 
            this.workers[i].process(chunk)
        );
        
        const results = await Promise.all(promises);
        return results.flat();
    }
}
```

### 8.2 Memory Management

```javascript
class RingBuffer {
    constructor(size) {
        this.size = size;
        this.buffer = new Float64Array(size * 3); // For 3D vectors
        this.index = 0;
        this.filled = false;
    }
    
    push(vector) {
        const offset = this.index * 3;
        this.buffer[offset] = vector.x;
        this.buffer[offset + 1] = vector.y;
        this.buffer[offset + 2] = vector.z;
        
        this.index = (this.index + 1) % this.size;
        if (this.index === 0) this.filled = true;
    }
    
    getStatistics() {
        const length = this.filled ? this.size : this.index;
        // Compute statistics without array copying
    }
}
```

## 9. Validation Tests

### 9.1 Unit Tests

```javascript
describe('CTM Implementation', () => {
    test('Lyapunov sum identity', () => {
        const b = 0.19;
        const exponents = calculateLyapunovExponents(b);
        const sum = exponents.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(-3 * b, 2);
    });
    
    test('CTM bounds', () => {
        const ctm = computeCTM(0.19);
        expect(ctm.CTM).toBeGreaterThanOrEqual(0);
        expect(ctm.CTM).toBeLessThan(1);
    });
    
    test('Rotation invariance', () => {
        const ctm1 = computeCTM(0.19, seed1);
        const ctm2 = computeCTM(0.19, rotatedSeed1);
        expect(ctm1.CTM).toBeCloseTo(ctm2.CTM, 3);
    });
});
```

### 9.2 Integration Tests

```javascript
describe('Full CTM Pipeline', () => {
    test('Parameter sweep convergence', async () => {
        const sweep = await parameterSweep([0.10, 0.20, 0.30]);
        
        sweep.forEach(result => {
            expect(result.ctm.CTM).toBeDefined();
            expect(result.diagnostics.convergence.achieved).toBe(true);
        });
    });
});
```

## 10. Error Handling

### 10.1 Numerical Stability

```javascript
class NumericalStabilityGuard {
    checkTangentVectors(vectors) {
        vectors.forEach(v => {
            const norm = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
            if (norm > 1e10 || norm < 1e-10) {
                throw new Error(`Tangent vector norm out of bounds: ${norm}`);
            }
            if (isNaN(norm)) {
                throw new Error('NaN detected in tangent vectors');
            }
        });
    }
    
    checkLyapunovExponents(exponents, b) {
        const sum = exponents.reduce((a, b) => a + b, 0);
        const expectedSum = -3 * b;
        const error = Math.abs(sum - expectedSum);
        
        if (error > 0.1) {
            console.warn(`Large sum identity error: ${error}`);
        }
    }
}
```

## 11. API Interface

### 11.1 Public API

```javascript
export class ThomasCTM {
    constructor(config = {}) {
        this.config = { ...CTM_CONFIG, ...config };
        this.attractor = new ThomasAttractor();
        this.lyapunovCalculator = new LyapunovCalculator();
        this.ctmCalculator = new CTMCalculator(this.config.b);
    }
    
    /**
     * Calculate CTM for current parameters
     * @returns {Promise<CTMResult>}
     */
    async calculate() {
        // Full pipeline implementation
    }
    
    /**
     * Perform parameter sweep
     * @param {Array<number>} bValues 
     * @returns {Promise<Array<CTMResult>>}
     */
    async sweep(bValues) {
        // Parameter sweep implementation
    }
    
    /**
     * Real-time CTM monitoring
     * @param {Function} callback 
     */
    monitor(callback) {
        // Real-time monitoring implementation
    }
}
```

## 12. Dependencies

### Required Libraries
- Three.js (existing)
- Math utilities (to implement)
- Statistical functions (to implement)
- Chart.js or D3.js (for advanced visualizations)

### Optional Libraries
- Web Workers API (for parallel processing)
- WASM modules (for performance-critical sections)

---

*This technical specification provides the complete blueprint for implementing the Thomas Chaos Meter system. Each component is designed to be modular, testable, and performant.*