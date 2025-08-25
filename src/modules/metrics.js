/**
 * Metrics Module
 * Computes E_flower, Lyapunov exponent, and Flower Index
 */

export class MetricsCalculator {
    constructor(floralProjection, lyapunovEstimator) {
        this.floralProjection = floralProjection;
        this.lyapunovEstimator = lyapunovEstimator;
        
        this.metrics = {
            E_flower: 0.0,
            lambda: 0.103,
            FI: 0.0
        };
        
        this.outlierThreshold = 10;
        this.sampleSize = 5000;
    }

    /**
     * Compute radial error (E_flower)
     */
    computeEflower() {
        const polarBuffer = this.floralProjection.getPolarBuffer();
        
        if (polarBuffer.length < 100) {
            return 0;
        }
        
        let sumSquaredError = 0;
        let count = 0;
        
        // Sample from recent points
        const startIdx = Math.max(0, polarBuffer.length - this.sampleSize);
        
        for (let i = startIdx; i < polarBuffer.length; i++) {
            const point = polarBuffer[i];
            
            // Skip outliers
            if (point.r > this.outlierThreshold) continue;
            
            // Compute expected radius from rhodonea
            const r_hat = this.floralProjection.rhodonea(point.theta);
            const error = point.r - Math.abs(r_hat);
            
            sumSquaredError += error * error;
            count++;
        }
        
        this.metrics.E_flower = count > 0 ? Math.sqrt(sumSquaredError / count) : 0;
        return this.metrics.E_flower;
    }

    /**
     * Get current Lyapunov exponent estimate
     */
    getLyapunov() {
        this.metrics.lambda = this.lyapunovEstimator.estimate;
        return this.metrics.lambda;
    }

    /**
     * Compute Flower Index
     * FI = (1 / (1 + E_flower)) * exp(-lambda)
     */
    computeFI() {
        const E = this.metrics.E_flower;
        const lambda = this.metrics.lambda;
        
        this.metrics.FI = (1 / (1 + E)) * Math.exp(-lambda);
        return this.metrics.FI;
    }

    /**
     * Update all metrics
     */
    update() {
        this.computeEflower();
        this.getLyapunov();
        this.computeFI();
        
        return { ...this.metrics };
    }

    /**
     * Get all current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            E_flower: 0.0,
            lambda: 0.103,
            FI: 0.0
        };
    }

    /**
     * Set preset lambda value
     */
    setPresetLambda(lambda) {
        this.metrics.lambda = lambda;
        this.lyapunovEstimator.estimate = lambda;
    }
}

/**
 * Statistics utilities
 */
export class Statistics {
    /**
     * Compute mean of array
     */
    static mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    /**
     * Compute standard deviation
     */
    static stdDev(arr) {
        if (arr.length === 0) return 0;
        const m = Statistics.mean(arr);
        const squareDiffs = arr.map(val => (val - m) ** 2);
        return Math.sqrt(Statistics.mean(squareDiffs));
    }

    /**
     * Compute percentile
     */
    static percentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Remove outliers using IQR method
     */
    static removeOutliers(arr, factor = 1.5) {
        if (arr.length === 0) return [];
        
        const q1 = Statistics.percentile(arr, 25);
        const q3 = Statistics.percentile(arr, 75);
        const iqr = q3 - q1;
        
        const lowerBound = q1 - factor * iqr;
        const upperBound = q3 + factor * iqr;
        
        return arr.filter(val => val >= lowerBound && val <= upperBound);
    }
}