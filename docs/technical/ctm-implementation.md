# Thomas Chaos Meter (CTM) - Technical Implementation

## Implementation Architecture

The CTM system is implemented using a modular architecture with clear separation between mathematical computation, data management, and visualization.

## Core Modules

### 1. LyapunovSpectrum.js

**Purpose**: Computes Lyapunov exponents using Benettin's QR method

```javascript
class LyapunovSpectrum {
    constructor(attractor, options = {}) {
        this.attractor = attractor;
        this.qrPeriod = options.qrPeriod || 5;
        this.ftleWindow = options.ftleWindow || 10000;
        this.tangentVectors = this.initializeTangentVectors();
        this.lyapunovSums = [0, 0, 0];
        this.steps = 0;
    }
    
    step() {
        // Evolve tangent vectors using variational equation
        this.evolveTangentVectors();
        
        // Apply QR decomposition periodically
        if (this.steps % this.qrPeriod === 0) {
            this.qrOrthonormalize();
        }
        
        this.steps++;
    }
    
    getExponents() {
        return this.lyapunovSums.map(sum => sum / (this.steps * this.attractor.dt));
    }
}
```

### 2. ChaosMetrics.js

**Purpose**: Computes CTM and related chaos metrics

```javascript
class ChaosMetrics {
    constructor(lyapunovSpectrum, options = {}) {
        this.spectrum = lyapunovSpectrum;
        this.bootstrapSamples = options.bootstrapSamples || 200;
    }
    
    computeCTM() {
        const [lambda1, lambda2, lambda3] = this.spectrum.getExponents();
        const b = this.spectrum.attractor.b;
        
        // Verify sum identity
        const sumCheck = lambda1 + lambda2 + lambda3 + 3 * b;
        if (Math.abs(sumCheck) > 0.01) {
            console.warn('Sum identity violated:', sumCheck);
        }
        
        // Compute components
        const C_lambda = 1 - Math.exp(-lambda1 / (3 * b));
        const D_KY = 2 + lambda1 / Math.abs(lambda3);
        const C_D = Math.max(0, Math.min(1, D_KY - 2));
        
        // Composite metric
        const CTM = Math.sqrt(C_lambda * C_D);
        
        return {
            CTM,
            C_lambda,
            C_D,
            D_KY,
            lambda1,
            lambda2,
            lambda3,
            sumCheck
        };
    }
    
    async computeConfidenceIntervals() {
        // Bootstrap resampling for CI
        const samples = [];
        
        for (let i = 0; i < this.bootstrapSamples; i++) {
            const resampledSpectrum = this.resampleFTLE();
            const metrics = this.computeCTMFromSpectrum(resampledSpectrum);
            samples.push(metrics);
        }
        
        return this.calculatePercentileCI(samples);
    }
}
```

### 3. ParameterSweep.js

**Purpose**: Systematic exploration of parameter space

```javascript
class ParameterSweep {
    constructor(attractorFactory, options = {}) {
        this.factory = attractorFactory;
        this.bRange = options.bRange || [0.10, 0.40];
        this.bStep = options.bStep || 0.01;
        this.refinementZones = options.refinementZones || [];
        this.results = new Map();
    }
    
    async sweep(progressCallback) {
        const bValues = this.generateBGrid();
        
        for (let i = 0; i < bValues.length; i++) {
            const b = bValues[i];
            
            // Create attractor with current b
            const attractor = this.factory.create({ b });
            const spectrum = new LyapunovSpectrum(attractor);
            const metrics = new ChaosMetrics(spectrum);
            
            // Compute metrics
            const result = await this.computeMetricsForB(b, attractor, spectrum, metrics);
            this.results.set(b, result);
            
            // Progress update
            if (progressCallback) {
                progressCallback(i + 1, bValues.length, result);
            }
        }
        
        return this.results;
    }
    
    exportResults(format = 'json') {
        switch (format) {
            case 'json': return this.exportJSON();
            case 'csv': return this.exportCSV();
            case 'matlab': return this.exportMatlab();
        }
    }
}
```

## Numerical Implementation Details

### QR Decomposition (Modified Gram-Schmidt)

```javascript
qrOrthonormalize() {
    const n = 3; // 3D system
    
    for (let i = 0; i < n; i++) {
        // Compute norm and accumulate Lyapunov sum
        const norm = this.vectorNorm(this.tangentVectors[i]);
        this.lyapunovSums[i] += Math.log(norm);
        
        // Normalize
        this.normalizeVector(this.tangentVectors[i]);
        
        // Orthogonalize subsequent vectors
        for (let j = i + 1; j < n; j++) {
            const dotProduct = this.dotProduct(this.tangentVectors[i], this.tangentVectors[j]);
            this.subtractProjection(this.tangentVectors[j], this.tangentVectors[i], dotProduct);
        }
    }
}
```

### Tangent Vector Evolution

```javascript
evolveTangentVectors() {
    const jacobian = this.attractor.getJacobian();
    const dt = this.attractor.dt;
    
    // RK4 integration for tangent vectors
    for (let i = 0; i < 3; i++) {
        const v = this.tangentVectors[i];
        
        // k1 = J * v
        const k1 = this.matrixVectorMultiply(jacobian, v);
        
        // k2 = J * (v + dt/2 * k1)
        const v_k2 = this.vectorAdd(v, this.vectorScale(k1, dt / 2));
        const k2 = this.matrixVectorMultiply(jacobian, v_k2);
        
        // k3 = J * (v + dt/2 * k2)
        const v_k3 = this.vectorAdd(v, this.vectorScale(k2, dt / 2));
        const k3 = this.matrixVectorMultiply(jacobian, v_k3);
        
        // k4 = J * (v + dt * k3)
        const v_k4 = this.vectorAdd(v, this.vectorScale(k3, dt));
        const k4 = this.matrixVectorMultiply(jacobian, v_k4);
        
        // Update: v += dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        const increment = this.vectorScale(
            this.vectorAdd(
                this.vectorAdd(k1, this.vectorScale(k2, 2)),
                this.vectorAdd(this.vectorScale(k3, 2), k4)
            ),
            dt / 6
        );
        
        this.tangentVectors[i] = this.vectorAdd(v, increment);
    }
}
```

## Visualization Components

### CTM Display Module

```javascript
class CTMDisplay {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.history = new Array(options.historyLength || 1000);
        this.historyIndex = 0;
    }
    
    update(metrics) {
        // Store in history
        this.history[this.historyIndex] = {
            timestamp: Date.now(),
            CTM: metrics.CTM,
            C_lambda: metrics.C_lambda,
            C_D: metrics.C_D,
            lambda1: metrics.lambda1
        };
        
        this.historyIndex = (this.historyIndex + 1) % this.history.length;
        
        // Redraw
        this.draw();
    }
    
    draw() {
        this.clearCanvas();
        this.drawGauge();
        this.drawTimeSeries();
        this.drawLyapunovSpectrum();
        this.drawRegimeIndicator();
    }
    
    drawGauge() {
        const centerX = this.canvas.width * 0.2;
        const centerY = this.canvas.height * 0.3;
        const radius = 50;
        
        const current = this.getCurrentMetrics();
        if (!current) return;
        
        // Background arc
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
        
        // CTM arc
        const angle = Math.PI + current.CTM * Math.PI;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, Math.PI, angle);
        this.ctx.strokeStyle = this.getCTMColor(current.CTM);
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
        
        // Value text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(current.CTM.toFixed(3), centerX, centerY + 10);
    }
    
    getCTMColor(ctm) {
        if (ctm < 0.05) return '#4CAF50'; // Green - regular
        if (ctm < 0.25) return '#FF9800'; // Orange - moderate
        return '#F44336'; // Red - strong chaos
    }
}
```

### Integration with Main Application

```javascript
// In main application initialization
class UnifiedApplication {
    async initializeCTMSystem() {
        // Create components
        this.lyapunovSpectrum = new LyapunovSpectrum(
            this.thomasAttractor,
            { qrPeriod: 5, ftleWindow: 10000 }
        );
        
        this.chaosMetrics = new ChaosMetrics(
            this.lyapunovSpectrum,
            { bootstrapSamples: 200 }
        );
        
        this.ctmDisplay = new CTMDisplay(
            document.getElementById('ctmCanvas')
        );
        
        // Update loop
        this.eventBus.on('simulation.step', () => {
            this.lyapunovSpectrum.step();
            
            if (this.steps % 100 === 0) { // Update every 100 steps
                const metrics = this.chaosMetrics.computeCTM();
                this.ctmDisplay.update(metrics);
                this.eventBus.emit('ctm.updated', metrics);
            }
        });
    }
}
```

## Performance Optimizations

### 1. Ring Buffers for FTLE

```javascript
class FTLERingBuffer {
    constructor(size) {
        this.buffer = new Float64Array(size);
        this.size = size;
        this.index = 0;
        this.count = 0;
    }
    
    push(value) {
        this.buffer[this.index] = value;
        this.index = (this.index + 1) % this.size;
        this.count = Math.min(this.count + 1, this.size);
    }
    
    getMean() {
        if (this.count === 0) return 0;
        let sum = 0;
        for (let i = 0; i < this.count; i++) {
            sum += this.buffer[i];
        }
        return sum / this.count;
    }
}
```

### 2. Vectorized Operations

```javascript
// Use typed arrays for better performance
class Vector3 extends Float64Array {
    constructor() {
        super(3);
    }
    
    norm() {
        return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
    }
    
    normalize() {
        const n = this.norm();
        if (n > 0) {
            this[0] /= n;
            this[1] /= n;
            this[2] /= n;
        }
        return this;
    }
    
    dot(other) {
        return this[0] * other[0] + this[1] * other[1] + this[2] * other[2];
    }
}
```

### 3. Parallel Bootstrap

```javascript
async computeParallelBootstrap() {
    const workerCount = navigator.hardwareConcurrency || 4;
    const samplesPerWorker = Math.ceil(this.bootstrapSamples / workerCount);
    
    const workers = [];
    for (let i = 0; i < workerCount; i++) {
        workers.push(this.createBootstrapWorker(samplesPerWorker));
    }
    
    const results = await Promise.all(workers);
    return this.combineBootstrapResults(results);
}
```

## Error Handling and Validation

### Convergence Detection

```javascript
checkConvergence() {
    if (this.steps < 10000) return false; // Minimum steps
    
    const window = 1000;
    const recent = this.lyapunovSums.slice(-window).map(s => s / (this.steps * this.dt));
    const older = this.lyapunovSums.slice(-2*window, -window).map(s => s / (this.steps * this.dt));
    
    // Check relative change
    const relativeChange = Math.abs(recent[0] - older[0]) / Math.abs(older[0]);
    return relativeChange < 0.001; // 0.1% tolerance
}
```

### Numerical Stability Checks

```javascript
validateResults(metrics) {
    const checks = {
        sumIdentity: Math.abs(metrics.lambda1 + metrics.lambda2 + metrics.lambda3 + 3 * this.b) < 0.01,
        ctmRange: metrics.CTM >= 0 && metrics.CTM < 1,
        dimensionRange: metrics.D_KY >= 2 && metrics.D_KY < 3,
        positiveComponents: metrics.C_lambda >= 0 && metrics.C_D >= 0
    };
    
    const failed = Object.entries(checks)
        .filter(([key, passed]) => !passed)
        .map(([key]) => key);
    
    if (failed.length > 0) {
        console.warn('Validation failed:', failed);
    }
    
    return failed.length === 0;
}
```

## Testing Framework

### Unit Tests

```javascript
describe('LyapunovSpectrum', () => {
    test('sum identity holds', () => {
        const attractor = new ThomasAttractor({ b: 0.19 });
        const spectrum = new LyapunovSpectrum(attractor);
        
        // Run for sufficient time
        for (let i = 0; i < 100000; i++) {
            spectrum.step();
        }
        
        const [l1, l2, l3] = spectrum.getExponents();
        const sum = l1 + l2 + l3;
        const expected = -3 * attractor.b;
        
        expect(Math.abs(sum - expected)).toBeLessThan(0.01);
    });
});
```

---

*For mathematical background, see [Thomas Chaos Meter Protocol](../mathematical/thomas-chaos-meter.md)*