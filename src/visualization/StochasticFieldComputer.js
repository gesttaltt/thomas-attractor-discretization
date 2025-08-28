/**
 * Stochastic Field Computer for Thomas Attractor
 * Uses probabilistic methods and topological caching for efficient field computation
 */

export class StochasticFieldComputer {
    constructor(config = {}) {
        this.config = {
            // Stochastic sampling
            monteCarloSamples: config.monteCarloSamples || 10000,
            importanceSamplingBias: config.importanceSamplingBias || 2.0,
            
            // Topological caching
            cacheLevels: config.cacheLevels || 3,
            cacheGridSize: config.cacheGridSize || 16, // Coarse grid for caching
            cacheExpiry: config.cacheExpiry || 5000, // ms
            
            // Field approximation
            basisFunctions: config.basisFunctions || 8, // Radial basis functions
            fieldInterpolation: config.fieldInterpolation || 'cubic',
            
            // Performance
            updateBatchSize: config.updateBatchSize || 1000,
            asyncCompute: config.asyncCompute !== false,
            
            ...config
        };
        
        // Thomas attractor parameters
        this.b = config.b || 0.19;
        
        // Topological cache structure
        this.topologyCache = new Map();
        this.fieldCache = new Map();
        this.lastCacheUpdate = 0;
        
        // Stochastic state
        this.samplePool = [];
        this.importanceMap = null;
        
        // Continuous field representation
        this.rbfCenters = [];
        this.rbfWeights = [];
        this.fieldApproximation = null;
        
        this.init();
    }
    
    init() {
        // Initialize importance sampling map
        this.initializeImportanceSampling();
        
        // Setup radial basis functions for field approximation
        this.setupRadialBasisFunctions();
        
        // Initialize topological cache
        this.initializeTopologicalCache();
    }
    
    /**
     * Initialize importance sampling based on attractor topology
     */
    initializeImportanceSampling() {
        const gridSize = this.config.cacheGridSize;
        this.importanceMap = new Float32Array(gridSize ** 3);
        
        // Use known properties of Thomas attractor to bias sampling
        // The attractor has a toroidal structure with specific regions of high density
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const x = (i / gridSize - 0.5) * 20;
                    const y = (j / gridSize - 0.5) * 20;
                    const z = (k / gridSize - 0.5) * 20;
                    
                    // Importance based on distance to attractor manifold
                    const r = Math.sqrt(x*x + y*y);
                    const torusRadius = 5;
                    const tubeRadius = 2;
                    const distToTorus = Math.abs(r - torusRadius) + Math.abs(z);
                    
                    // Higher importance near the attractor
                    const importance = Math.exp(-distToTorus / tubeRadius);
                    this.importanceMap[i + j * gridSize + k * gridSize * gridSize] = importance;
                }
            }
        }
    }
    
    /**
     * Setup radial basis functions for continuous field approximation
     */
    setupRadialBasisFunctions() {
        const n = this.config.basisFunctions;
        
        // Place RBF centers strategically in phase space
        this.rbfCenters = [];
        
        // Use Fibonacci sphere for better distribution
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
        
        for (let i = 0; i < n; i++) {
            const y = 1 - (i / (n - 1)) * 2; // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            
            // Scale to attractor space
            this.rbfCenters.push([x * 8, y * 8, z * 8]);
        }
        
        this.rbfWeights = new Float32Array(n);
    }
    
    /**
     * Initialize topological cache with known invariant sets
     */
    initializeTopologicalCache() {
        // Cache critical regions of the attractor
        const criticalRegions = [
            { center: [0, 0, 0], radius: 2, type: 'fixed_point' },
            { center: [5, 0, 0], radius: 3, type: 'limit_cycle' },
            { center: [-5, 0, 0], radius: 3, type: 'limit_cycle' }
        ];
        
        criticalRegions.forEach(region => {
            const key = this.getRegionKey(region.center);
            this.topologyCache.set(key, {
                type: region.type,
                stability: this.computeStability(region.center),
                lastUpdate: Date.now()
            });
        });
    }
    
    /**
     * Main stochastic field computation using Monte Carlo
     */
    computeFieldStochastic(targetGrid, gridSize, range) {
        const startTime = performance.now();
        
        // Generate Monte Carlo samples
        const samples = this.generateImportanceSamples(this.config.monteCarloSamples);
        
        // Compute field values at samples
        const fieldValues = samples.map(sample => ({
            position: sample,
            density: this.computeLocalDensity(sample),
            velocity: this.computeVelocity(sample[0], sample[1], sample[2])
        }));
        
        // Interpolate to target grid using RBF
        this.updateRBFWeights(fieldValues);
        
        // Fill target grid using approximation
        let processed = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const idx = i + j * gridSize + k * gridSize * gridSize;
                    
                    // Check cache first
                    const cacheKey = `${Math.floor(i/4)}_${Math.floor(j/4)}_${Math.floor(k/4)}`;
                    let value = this.fieldCache.get(cacheKey);
                    
                    if (!value || Date.now() - value.timestamp > this.config.cacheExpiry) {
                        // Compute using RBF approximation
                        const x = -range + (i + 0.5) * (2 * range / gridSize);
                        const y = -range + (j + 0.5) * (2 * range / gridSize);
                        const z = -range + (k + 0.5) * (2 * range / gridSize);
                        
                        value = {
                            density: this.evaluateRBF([x, y, z]),
                            timestamp: Date.now()
                        };
                        
                        this.fieldCache.set(cacheKey, value);
                    }
                    
                    targetGrid[idx] = value.density;
                    processed++;
                    
                    // Yield periodically for async computation
                    if (this.config.asyncCompute && processed % this.config.updateBatchSize === 0) {
                        // Allow other operations to process
                        if (processed % 10000 === 0) {
                            console.log(`Stochastic field: ${Math.round(100 * processed / (gridSize**3))}%`);
                        }
                    }
                }
            }
        }
        
        const computeTime = performance.now() - startTime;
        console.log(`Stochastic field computed in ${computeTime.toFixed(0)}ms`);
        
        return targetGrid;
    }
    
    /**
     * Generate samples using importance sampling
     */
    generateImportanceSamples(count) {
        const samples = [];
        const gridSize = this.config.cacheGridSize;
        
        for (let i = 0; i < count; i++) {
            // Use importance map to bias sampling
            let x, y, z, importance;
            
            // Rejection sampling with importance
            do {
                x = (Math.random() - 0.5) * 20;
                y = (Math.random() - 0.5) * 20;
                z = (Math.random() - 0.5) * 20;
                
                // Get importance at this point
                const gi = Math.floor((x + 10) * gridSize / 20);
                const gj = Math.floor((y + 10) * gridSize / 20);
                const gk = Math.floor((z + 10) * gridSize / 20);
                
                if (gi >= 0 && gi < gridSize && gj >= 0 && gj < gridSize && gk >= 0 && gk < gridSize) {
                    importance = this.importanceMap[gi + gj * gridSize + gk * gridSize * gridSize];
                } else {
                    importance = 0.1;
                }
            } while (Math.random() > importance);
            
            samples.push([x, y, z]);
        }
        
        return samples;
    }
    
    /**
     * Compute local density using attractor dynamics
     */
    computeLocalDensity(point) {
        const [x, y, z] = point;
        
        // Use Lyapunov function as proxy for density
        // V(x,y,z) represents the "energy" at this point
        const V = x*x + y*y + z*z;
        
        // Compute divergence of flow (indicates compression/expansion)
        const divergence = -Math.sin(y) - Math.sin(z) - this.b;
        
        // Density is higher where flow converges (negative divergence)
        const density = Math.exp(-V / 10) * Math.exp(-divergence);
        
        return density;
    }
    
    /**
     * Thomas attractor velocity field
     */
    computeVelocity(x, y, z) {
        return {
            vx: Math.sin(y) - this.b * x,
            vy: Math.sin(z) - this.b * y,
            vz: Math.sin(x) - this.b * z
        };
    }
    
    /**
     * Update RBF weights using sampled field values
     */
    updateRBFWeights(fieldValues) {
        // Use least squares to fit RBF to samples
        const n = this.rbfCenters.length;
        const m = Math.min(fieldValues.length, 1000); // Limit samples for speed
        
        // Simple averaging for now (could use proper least squares)
        for (let i = 0; i < n; i++) {
            let weightSum = 0;
            let totalWeight = 0;
            
            for (let j = 0; j < m; j++) {
                const dist = this.distance(this.rbfCenters[i], fieldValues[j].position);
                const rbfValue = Math.exp(-dist * dist / 4); // Gaussian RBF
                weightSum += fieldValues[j].density * rbfValue;
                totalWeight += rbfValue;
            }
            
            this.rbfWeights[i] = totalWeight > 0 ? weightSum / totalWeight : 0;
        }
    }
    
    /**
     * Evaluate RBF approximation at a point
     */
    evaluateRBF(point) {
        let value = 0;
        const n = this.rbfCenters.length;
        
        for (let i = 0; i < n; i++) {
            const dist = this.distance(this.rbfCenters[i], point);
            const rbfValue = Math.exp(-dist * dist / 4); // Gaussian RBF
            value += this.rbfWeights[i] * rbfValue;
        }
        
        return value;
    }
    
    /**
     * Compute stability of a point using linearization
     */
    computeStability(point) {
        const [x, y, z] = point;
        
        // Jacobian eigenvalues determine stability
        const trace = -3 * this.b; // Sum of eigenvalues
        const det = -(this.b ** 3); // Product of eigenvalues
        
        return {
            stable: trace < 0,
            eigenvalueSum: trace,
            eigenvalueProduct: det
        };
    }
    
    /**
     * Helper: Euclidean distance
     */
    distance(p1, p2) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        const dz = p1[2] - p2[2];
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    /**
     * Get cache key for a region
     */
    getRegionKey(position) {
        const [x, y, z] = position;
        const gridSize = this.config.cacheGridSize;
        const i = Math.floor((x + 10) * gridSize / 20);
        const j = Math.floor((y + 10) * gridSize / 20);
        const k = Math.floor((z + 10) * gridSize / 20);
        return `${i}_${j}_${k}`;
    }
    
    /**
     * Clear caches
     */
    clearCache() {
        this.fieldCache.clear();
        this.topologyCache.clear();
        this.samplePool = [];
    }
    
    /**
     * Update parameters
     */
    updateParameter(b) {
        this.b = b;
        this.clearCache();
    }
}