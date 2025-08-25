/**
 * Lyapunov Exponent Calculator for Thomas Attractor
 * Implements Benettin's QR method for computing Lyapunov exponents
 */

export class LyapunovCalculator {
    constructor(dimension = 3, qrPeriod = 5, dt = 0.01) {
        this.dimension = dimension;
        this.qrPeriod = qrPeriod;
        this.dt = dt;
        
        // Tangent vectors (orthonormal basis)
        this.tangentVectors = this.initializeOrthonormalBasis();
        
        // Lyapunov sum accumulation
        this.lyapunovSums = new Array(dimension).fill(0);
        this.stepCount = 0;
        
        // FTLE windows for variance estimation
        this.ftleWindows = [];
        this.currentWindow = null;
        this.windowSize = 10000;
        
        // Convergence tracking
        this.convergenceHistory = [];
        this.isConverged = false;
    }
    
    /**
     * Initialize identity matrix as orthonormal basis
     */
    initializeOrthonormalBasis() {
        const basis = [];
        for (let i = 0; i < this.dimension; i++) {
            const vector = new Array(this.dimension).fill(0);
            vector[i] = 1;
            basis.push(vector);
        }
        return basis;
    }
    
    /**
     * Reset calculator to initial state
     */
    reset() {
        this.tangentVectors = this.initializeOrthonormalBasis();
        this.lyapunovSums = new Array(this.dimension).fill(0);
        this.stepCount = 0;
        this.ftleWindows = [];
        this.currentWindow = null;
        this.convergenceHistory = [];
        this.isConverged = false;
    }
    
    /**
     * Evolve tangent vectors and measure growth
     * @param {Object} state - Current state {x, y, z}
     * @param {Array} jacobian - 3x3 Jacobian matrix
     */
    evolveAndMeasure(state, jacobian) {
        // Evolve tangent vectors
        this.evolveTangentVectors(jacobian);
        
        // Check for QR decomposition
        if ((this.stepCount + 1) % this.qrPeriod === 0) {
            this.performQR();
        }
        
        // Update FTLE window
        this.updateFTLEWindow();
        
        this.stepCount++;
        
        // Check convergence periodically
        if (this.stepCount % 1000 === 0) {
            this.checkConvergence();
        }
    }
    
    /**
     * Evolve tangent vectors using RK4 integration
     * @param {Array} jacobian - Current Jacobian matrix
     */
    evolveTangentVectors(jacobian) {
        const newVectors = [];
        
        for (let i = 0; i < this.dimension; i++) {
            const v = this.tangentVectors[i];
            const evolved = this.rk4TangentVector(v, jacobian);
            newVectors.push(evolved);
        }
        
        this.tangentVectors = newVectors;
    }
    
    /**
     * RK4 integration for tangent vector
     */
    rk4TangentVector(v, J) {
        // k1 = J * v
        const k1 = this.matrixVectorMultiply(J, v);
        
        // k2 = J * (v + dt/2 * k1)
        const v2 = this.vectorAdd(v, this.scalarMultiply(k1, this.dt / 2));
        const k2 = this.matrixVectorMultiply(J, v2);
        
        // k3 = J * (v + dt/2 * k2)
        const v3 = this.vectorAdd(v, this.scalarMultiply(k2, this.dt / 2));
        const k3 = this.matrixVectorMultiply(J, v3);
        
        // k4 = J * (v + dt * k3)
        const v4 = this.vectorAdd(v, this.scalarMultiply(k3, this.dt));
        const k4 = this.matrixVectorMultiply(J, v4);
        
        // v_new = v + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        const sum = this.vectorAdd(
            k1,
            this.vectorAdd(
                this.scalarMultiply(k2, 2),
                this.vectorAdd(
                    this.scalarMultiply(k3, 2),
                    k4
                )
            )
        );
        
        return this.vectorAdd(v, this.scalarMultiply(sum, this.dt / 6));
    }
    
    /**
     * Perform QR decomposition using modified Gram-Schmidt
     */
    performQR() {
        const Q = [];
        const R = [];
        
        for (let i = 0; i < this.dimension; i++) {
            let q = [...this.tangentVectors[i]];
            R[i] = [];
            
            // Orthogonalize against previous vectors
            for (let j = 0; j < i; j++) {
                R[j][i] = this.dotProduct(Q[j], this.tangentVectors[i]);
                q = this.vectorSubtract(q, this.scalarMultiply(Q[j], R[j][i]));
            }
            
            // Normalize and accumulate growth
            R[i][i] = this.norm(q);
            
            // Prevent numerical issues
            if (R[i][i] < 1e-10) {
                R[i][i] = 1e-10;
            }
            
            Q[i] = this.scalarMultiply(q, 1 / R[i][i]);
            
            // Accumulate Lyapunov sum
            this.lyapunovSums[i] += Math.log(Math.abs(R[i][i]));
        }
        
        // Update tangent vectors with orthonormalized versions
        this.tangentVectors = Q;
        
        // Update current FTLE window if active
        if (this.currentWindow) {
            for (let i = 0; i < this.dimension; i++) {
                this.currentWindow.sums[i] += Math.log(Math.abs(R[i][i]));
            }
        }
    }
    
    /**
     * Manage FTLE windows for variance estimation
     */
    updateFTLEWindow() {
        // Start new window if needed
        if (!this.currentWindow || 
            (this.stepCount - this.currentWindow.startStep) >= this.windowSize) {
            
            // Complete current window
            if (this.currentWindow) {
                this.completeFTLEWindow();
            }
            
            // Start new window
            this.currentWindow = {
                startStep: this.stepCount,
                sums: new Array(this.dimension).fill(0),
                tangentStart: this.tangentVectors.map(v => [...v])
            };
        }
    }
    
    /**
     * Complete and store FTLE window
     */
    completeFTLEWindow() {
        if (!this.currentWindow) return;
        
        const duration = this.stepCount - this.currentWindow.startStep;
        const exponents = this.currentWindow.sums.map(
            sum => sum / (duration * this.dt)
        );
        
        this.ftleWindows.push({
            startStep: this.currentWindow.startStep,
            endStep: this.stepCount,
            exponents,
            duration
        });
        
        // Maintain sliding window buffer (keep last 100 windows)
        if (this.ftleWindows.length > 100) {
            this.ftleWindows.shift();
        }
    }
    
    /**
     * Get current Lyapunov exponents
     * @returns {Array} Lyapunov exponents [λ1, λ2, λ3]
     */
    getExponents() {
        if (this.stepCount === 0) {
            return new Array(this.dimension).fill(0);
        }
        
        return this.lyapunovSums.map(sum => sum / (this.stepCount * this.dt));
    }
    
    /**
     * Get Lyapunov exponents with confidence intervals
     * @returns {Object} Exponents with CI
     */
    getExponentsWithCI(confidenceLevel = 0.95) {
        const exponents = this.getExponents();
        
        if (this.ftleWindows.length < 10) {
            // Not enough data for CI
            return exponents.map(exp => ({
                mean: exp,
                ci: [exp, exp],
                std: 0
            }));
        }
        
        // Calculate statistics from FTLE windows
        const windowExponents = this.ftleWindows.map(w => w.exponents);
        const results = [];
        
        for (let i = 0; i < this.dimension; i++) {
            const values = windowExponents.map(e => e[i]);
            const stats = this.calculateStatistics(values, confidenceLevel);
            results.push({
                mean: exponents[i],
                ci: stats.ci,
                std: stats.std
            });
        }
        
        return results;
    }
    
    /**
     * Calculate statistics for confidence intervals
     */
    calculateStatistics(values, confidenceLevel) {
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        
        const variance = values.reduce((sum, val) => 
            sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const std = Math.sqrt(variance);
        
        // Sort for percentile method
        const sorted = [...values].sort((a, b) => a - b);
        const alpha = 1 - confidenceLevel;
        const lowerIdx = Math.floor(n * alpha / 2);
        const upperIdx = Math.ceil(n * (1 - alpha / 2)) - 1;
        
        return {
            mean,
            std,
            ci: [sorted[lowerIdx], sorted[upperIdx]]
        };
    }
    
    /**
     * Check convergence of Lyapunov exponents
     */
    checkConvergence() {
        const current = this.getExponents();
        this.convergenceHistory.push({
            step: this.stepCount,
            exponents: [...current]
        });
        
        // Keep last 10 measurements
        if (this.convergenceHistory.length > 10) {
            this.convergenceHistory.shift();
        }
        
        // Check if converged (variance < threshold)
        if (this.convergenceHistory.length >= 10) {
            const recent = this.convergenceHistory.slice(-5);
            const older = this.convergenceHistory.slice(0, 5);
            
            let maxDiff = 0;
            for (let i = 0; i < this.dimension; i++) {
                const recentMean = recent.reduce((sum, h) => 
                    sum + h.exponents[i], 0) / recent.length;
                const olderMean = older.reduce((sum, h) => 
                    sum + h.exponents[i], 0) / older.length;
                
                maxDiff = Math.max(maxDiff, Math.abs(recentMean - olderMean));
            }
            
            this.isConverged = maxDiff < 0.001;
        }
    }
    
    /**
     * Get convergence status
     */
    getConvergenceStatus() {
        return {
            isConverged: this.isConverged,
            iterations: this.stepCount,
            history: this.convergenceHistory
        };
    }
    
    // === Vector/Matrix Operations ===
    
    matrixVectorMultiply(matrix, vector) {
        const result = new Array(this.dimension);
        for (let i = 0; i < this.dimension; i++) {
            result[i] = 0;
            for (let j = 0; j < this.dimension; j++) {
                result[i] += matrix[i][j] * vector[j];
            }
        }
        return result;
    }
    
    vectorAdd(v1, v2) {
        return v1.map((val, i) => val + v2[i]);
    }
    
    vectorSubtract(v1, v2) {
        return v1.map((val, i) => val - v2[i]);
    }
    
    scalarMultiply(vector, scalar) {
        return vector.map(val => val * scalar);
    }
    
    dotProduct(v1, v2) {
        return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    }
    
    norm(vector) {
        return Math.sqrt(this.dotProduct(vector, vector));
    }
}

/**
 * Specialized Lyapunov calculator for Thomas system
 */
export class ThomasLyapunovCalculator extends LyapunovCalculator {
    constructor(b = 0.19, qrPeriod = 5, dt = 0.01) {
        super(3, qrPeriod, dt);
        this.b = b;
    }
    
    /**
     * Calculate Jacobian for Thomas system
     * @param {Object} state - Current state {x, y, z}
     * @returns {Array} 3x3 Jacobian matrix
     */
    calculateJacobian(state) {
        return [
            [-this.b, Math.cos(state.y), 0],
            [0, -this.b, Math.cos(state.z)],
            [Math.cos(state.x), 0, -this.b]
        ];
    }
    
    /**
     * Verify sum identity (should equal -3b)
     */
    verifySumIdentity() {
        const exponents = this.getExponents();
        const sum = exponents.reduce((a, b) => a + b, 0);
        const expected = -3 * this.b;
        const error = Math.abs(sum - expected);
        
        return {
            sum,
            expected,
            error,
            isValid: error < 0.01
        };
    }
    
    /**
     * Process a trajectory point
     */
    processPoint(state) {
        const jacobian = this.calculateJacobian(state);
        this.evolveAndMeasure(state, jacobian);
    }
}