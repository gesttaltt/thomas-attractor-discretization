/**
 * Thomas Chaos Meter (CTM) Implementation
 * Computes the composite chaos metric based on Lyapunov exponents and Kaplan-Yorke dimension
 */

export class CTMCalculator {
    constructor(b = 0.19) {
        this.b = b;
        
        // CTM configuration
        this.config = {
            sumIdentityTolerance: 0.01,
            convergenceThreshold: 0.001,
            minDataPoints: 100
        };
        
        // Store history for analysis
        this.history = [];
        this.maxHistory = 1000;
    }
    
    /**
     * Calculate Kaplan-Yorke dimension
     * @param {Array} lyapunovExponents - [λ1, λ2, λ3] sorted descending
     * @returns {number} D_KY
     */
    calculateKaplanYorke(lyapunovExponents) {
        const [lambda1, lambda2, lambda3] = lyapunovExponents;
        
        // For Thomas attractor, typically j=2 (one positive exponent)
        // D_KY = j + (λ1 + λ2 + ... + λj) / |λ(j+1)|
        
        if (lambda1 <= 0) {
            // No chaos, dimension is essentially 0 or point attractor
            return 0;
        }
        
        if (lambda1 > 0 && lambda2 <= 0) {
            // Standard case: D_KY = 1 + λ1/|λ2|
            // But for 3D system, we use j=2
            return 2 + lambda1 / Math.abs(lambda3);
        }
        
        if (lambda1 > 0 && lambda2 > 0) {
            // Two positive exponents (hyperchaos - rare for Thomas)
            return 2 + (lambda1 + lambda2) / Math.abs(lambda3);
        }
        
        // Default to standard formula
        return 2 + lambda1 / Math.abs(lambda3);
    }
    
    /**
     * Calculate C_lambda component (unpredictability)
     * @param {number} lambda1 - Largest Lyapunov exponent
     * @returns {number} C_lambda ∈ (0,1)
     */
    calculateCLambda(lambda1) {
        if (lambda1 <= 0) {
            return 0;
        }
        
        // C_λ = 1 - exp(-λ1/(3b))
        const normalized = lambda1 / (3 * this.b);
        return 1 - Math.exp(-normalized);
    }
    
    /**
     * Calculate C_D component (geometric complexity)
     * @param {number} D_KY - Kaplan-Yorke dimension
     * @returns {number} C_D ∈ [0,1]
     */
    calculateCD(D_KY) {
        // C_D = clamp(D_KY - 2, 0, 1)
        // Measures how far beyond 2D the attractor extends
        const excess = D_KY - 2;
        return Math.max(0, Math.min(1, excess));
    }
    
    /**
     * Calculate composite CTM
     * @param {Array} lyapunovExponents - [λ1, λ2, λ3]
     * @returns {Object} Complete CTM analysis
     */
    computeCTM(lyapunovExponents) {
        const [lambda1, lambda2, lambda3] = lyapunovExponents;
        
        // Verify sum identity
        const sumCheck = this.verifySumIdentity(lyapunovExponents);
        
        // Calculate Kaplan-Yorke dimension
        const D_KY = this.calculateKaplanYorke(lyapunovExponents);
        
        // Calculate CTM components
        const C_lambda = this.calculateCLambda(lambda1);
        const C_D = this.calculateCD(D_KY);
        
        // Composite metric (geometric mean)
        const CTM = Math.sqrt(C_lambda * C_D);
        
        // Determine chaos regime
        const regime = this.classifyRegime(CTM, lambda1);
        
        // Store in history
        const result = {
            timestamp: Date.now(),
            b: this.b,
            lyapunov: {
                lambda1,
                lambda2,
                lambda3,
                spectrum: [lambda1, lambda2, lambda3]
            },
            kaplanYorke: D_KY,
            components: {
                C_lambda,
                C_D
            },
            CTM,
            regime,
            validation: {
                sumIdentity: sumCheck,
                isValid: sumCheck.isValid
            }
        };
        
        this.addToHistory(result);
        
        return result;
    }
    
    /**
     * Compute CTM with confidence intervals using bootstrap
     * @param {Array} ftleWindows - FTLE window data
     * @returns {Object} CTM with statistical measures
     */
    computeWithBootstrap(ftleWindows, numSamples = 200) {
        if (!ftleWindows || ftleWindows.length < 10) {
            throw new Error('Insufficient data for bootstrap (need at least 10 windows)');
        }
        
        const bootstrapResults = [];
        
        for (let i = 0; i < numSamples; i++) {
            // Resample with replacement
            const resample = this.bootstrapResample(ftleWindows);
            
            // Calculate mean exponents from resample
            const exponents = this.averageExponents(resample);
            
            // Compute CTM for this sample
            const ctmResult = this.computeCTM(exponents);
            bootstrapResults.push(ctmResult);
        }
        
        // Calculate statistics
        return this.computeBootstrapStatistics(bootstrapResults);
    }
    
    /**
     * Bootstrap resample with replacement
     */
    bootstrapResample(data) {
        const n = data.length;
        const resample = [];
        
        for (let i = 0; i < n; i++) {
            const idx = Math.floor(Math.random() * n);
            resample.push(data[idx]);
        }
        
        return resample;
    }
    
    /**
     * Average exponents from FTLE windows
     */
    averageExponents(windows) {
        const sums = [0, 0, 0];
        
        windows.forEach(window => {
            window.exponents.forEach((exp, i) => {
                sums[i] += exp;
            });
        });
        
        return sums.map(sum => sum / windows.length);
    }
    
    /**
     * Compute bootstrap statistics
     */
    computeBootstrapStatistics(samples) {
        const n = samples.length;
        
        // Extract CTM values
        const ctmValues = samples.map(s => s.CTM);
        const lambda1Values = samples.map(s => s.lyapunov.lambda1);
        const dkyValues = samples.map(s => s.kaplanYorke);
        
        // Sort for percentiles
        ctmValues.sort((a, b) => a - b);
        lambda1Values.sort((a, b) => a - b);
        dkyValues.sort((a, b) => a - b);
        
        // Calculate statistics
        const stats = {
            CTM: this.calculateStats(ctmValues),
            lambda1: this.calculateStats(lambda1Values),
            D_KY: this.calculateStats(dkyValues),
            samples: n
        };
        
        // Get median sample as representative
        const medianIdx = Math.floor(n / 2);
        const representative = samples.sort((a, b) => a.CTM - b.CTM)[medianIdx];
        
        return {
            ...representative,
            statistics: stats,
            confidence: {
                CTM: stats.CTM.ci,
                lambda1: stats.lambda1.ci,
                D_KY: stats.D_KY.ci
            }
        };
    }
    
    /**
     * Calculate statistical measures
     */
    calculateStats(values, confidenceLevel = 0.95) {
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        
        const variance = values.reduce((sum, val) => 
            sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const std = Math.sqrt(variance);
        
        // Confidence intervals (percentile method)
        const alpha = 1 - confidenceLevel;
        const lowerIdx = Math.floor(n * alpha / 2);
        const upperIdx = Math.ceil(n * (1 - alpha / 2)) - 1;
        
        return {
            mean,
            std,
            ci: [values[lowerIdx], values[upperIdx]],
            median: values[Math.floor(n / 2)],
            min: values[0],
            max: values[n - 1]
        };
    }
    
    /**
     * Verify sum identity for Lyapunov exponents
     */
    verifySumIdentity(exponents) {
        const sum = exponents.reduce((a, b) => a + b, 0);
        const expected = -3 * this.b;
        const error = Math.abs(sum - expected);
        
        return {
            sum,
            expected,
            error,
            isValid: error < this.config.sumIdentityTolerance,
            relativeError: error / Math.abs(expected)
        };
    }
    
    /**
     * Classify chaos regime based on CTM value
     */
    classifyRegime(CTM, lambda1) {
        if (lambda1 <= 0) {
            return {
                type: 'regular',
                description: 'Regular or periodic dynamics',
                color: '#00ff00'
            };
        }
        
        if (CTM < 0.05) {
            return {
                type: 'weak_chaos',
                description: 'Weak chaos or near-regular dynamics',
                color: '#90ff00'
            };
        }
        
        if (CTM < 0.15) {
            return {
                type: 'moderate_chaos',
                description: 'Moderate chaos (typical Thomas)',
                color: '#ffff00'
            };
        }
        
        if (CTM < 0.25) {
            return {
                type: 'strong_chaos',
                description: 'Strong chaotic dynamics',
                color: '#ff9000'
            };
        }
        
        return {
            type: 'hyperchaos',
            description: 'Hyperchaotic or strongly unpredictable',
            color: '#ff0000'
        };
    }
    
    /**
     * Add result to history
     */
    addToHistory(result) {
        this.history.push(result);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    /**
     * Get CTM time series from history
     */
    getTimeSeries() {
        return this.history.map(h => ({
            timestamp: h.timestamp,
            CTM: h.CTM,
            lambda1: h.lyapunov.lambda1,
            D_KY: h.kaplanYorke,
            regime: h.regime.type
        }));
    }
    
    /**
     * Export CTM data in standard format
     */
    exportData() {
        const latest = this.history[this.history.length - 1];
        
        return {
            system: 'Thomas',
            b: this.b,
            timestamp: new Date().toISOString(),
            results: {
                CTM: latest.CTM,
                lyapunov: latest.lyapunov,
                kaplanYorke: latest.kaplanYorke,
                components: latest.components,
                regime: latest.regime,
                validation: latest.validation
            },
            timeSeries: this.getTimeSeries()
        };
    }
    
    /**
     * Set b parameter
     */
    setB(b) {
        this.b = b;
        this.history = []; // Clear history when parameter changes
    }
}

/**
 * CTM Manager for complete pipeline
 */
export class CTMManager {
    constructor(config = {}) {
        this.config = {
            b: 0.19,
            dt: 0.01,
            qrPeriod: 5,
            windowSize: 10000,
            bootstrapSamples: 200,
            ...config
        };
        
        this.calculator = new CTMCalculator(this.config.b);
        this.isRunning = false;
    }
    
    /**
     * Process trajectory data
     */
    processTrajectory(trajectory, lyapunovData) {
        // Get final Lyapunov exponents
        const exponents = lyapunovData.exponents;
        
        // Compute CTM
        const ctmResult = this.calculator.computeCTM(exponents);
        
        // If we have FTLE windows, compute with bootstrap
        if (lyapunovData.ftleWindows && lyapunovData.ftleWindows.length >= 10) {
            const bootstrapResult = this.calculator.computeWithBootstrap(
                lyapunovData.ftleWindows,
                this.config.bootstrapSamples
            );
            
            return {
                ...ctmResult,
                bootstrap: bootstrapResult.statistics,
                confidence: bootstrapResult.confidence
            };
        }
        
        return ctmResult;
    }
    
    /**
     * Real-time monitoring
     */
    startMonitoring(callback, interval = 100) {
        this.isRunning = true;
        
        const monitor = () => {
            if (!this.isRunning) return;
            
            const timeSeries = this.calculator.getTimeSeries();
            if (timeSeries.length > 0) {
                callback(timeSeries[timeSeries.length - 1]);
            }
            
            setTimeout(monitor, interval);
        };
        
        monitor();
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isRunning = false;
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.calculator.setB(this.config.b);
    }
}