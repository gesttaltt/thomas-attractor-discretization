/**
 * Chaos Analysis - Lyapunov Exponents and CTM
 * Simplified implementation without repository patterns
 */

export class ChaosAnalysis {
    constructor(attractor) {
        this.attractor = attractor;
        this.lyapunovHistory = [];
        this.metricsCache = null;
        this.cacheTime = 0;
    }

    /**
     * Compute Lyapunov exponents using QR decomposition
     */
    async computeLyapunovExponents(steps = 10000, skipTransient = 1000) {
        const n = 3; // Dimension
        const dt = this.attractor.dt;
        
        // Initialize orthonormal vectors
        let Q = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        
        // Lyapunov sums
        const lyapunovSums = [0, 0, 0];
        let state = [...this.attractor.currentState];
        
        // Skip transient
        for (let i = 0; i < skipTransient; i++) {
            state = this.attractor.rk4Step(state, dt);
        }
        
        // Main computation
        for (let step = 0; step < steps; step++) {
            // Get Jacobian at current state
            const J = this.attractor.jacobian(state);
            
            // Evolve tangent vectors
            const newQ = [];
            for (let i = 0; i < n; i++) {
                const v = this.matrixVectorMultiply(J, Q[i]);
                newQ.push(v);
            }
            
            // QR decomposition using Gram-Schmidt
            const { Q: nextQ, R } = this.gramSchmidt(newQ);
            Q = nextQ;
            
            // Accumulate growth rates
            for (let i = 0; i < n; i++) {
                lyapunovSums[i] += Math.log(Math.abs(R[i][i]));
            }
            
            // Advance state
            state = this.attractor.rk4Step(state, dt);
        }
        
        // Average the sums
        const lyapunovExponents = lyapunovSums.map(sum => sum / (steps * dt));
        
        // Sort in descending order
        lyapunovExponents.sort((a, b) => b - a);
        
        return {
            exponents: lyapunovExponents,
            largest: lyapunovExponents[0],
            kaplanYorke: this.computeKaplanYorkeDimension(lyapunovExponents)
        };
    }

    /**
     * Quick Lyapunov approximation for real-time display
     */
    computeQuickLyapunov() {
        const trajectory = this.attractor.getTrajectory(100);
        if (trajectory.length < 2) return 0;
        
        let sum = 0;
        for (let i = 1; i < trajectory.length; i++) {
            const dist = this.euclideanDistance(trajectory[i], trajectory[i-1]);
            if (dist > 0) {
                sum += Math.log(dist);
            }
        }
        
        return sum / (trajectory.length - 1);
    }

    /**
     * Compute CTM (Chaos Theory Meter)
     */
    async computeCTM() {
        const lyapunov = await this.computeLyapunovExponents(1000, 100);
        const lambda1 = lyapunov.largest;
        const b = this.attractor.b;
        
        // Unpredictability component
        const C_lambda = 1 - Math.exp(-lambda1 / (3 * b));
        
        // Geometric complexity (Kaplan-Yorke dimension)
        const D_KY = lyapunov.kaplanYorke;
        const C_D = Math.max(0, Math.min(1, D_KY - 2));
        
        // Composite CTM
        const CTM = Math.sqrt(C_lambda * C_D);
        
        return {
            ctm: CTM,
            unpredictability: C_lambda,
            complexity: C_D,
            lyapunovLargest: lambda1,
            kaplanYorke: D_KY
        };
    }

    /**
     * Quick metrics computation for real-time updates
     */
    async computeQuickMetrics() {
        const now = Date.now();
        
        // Cache for 1 second
        if (this.metricsCache && (now - this.cacheTime) < 1000) {
            return this.metricsCache;
        }
        
        const quickLyapunov = this.computeQuickLyapunov();
        const b = this.attractor.b;
        
        // Simplified CTM calculation
        const C_lambda = 1 - Math.exp(-Math.abs(quickLyapunov) / (3 * b));
        const estimatedDimension = 2.05; // Typical value for Thomas attractor
        const C_D = Math.max(0, Math.min(1, estimatedDimension - 2));
        const CTM = Math.sqrt(C_lambda * C_D);
        
        this.metricsCache = {
            largestLyapunov: quickLyapunov,
            ctm: CTM,
            kaplanYorke: estimatedDimension,
            divergence: this.attractor.getDivergence()
        };
        this.cacheTime = now;
        
        return this.metricsCache;
    }

    /**
     * Compute Kaplan-Yorke dimension
     */
    computeKaplanYorkeDimension(lyapunovExponents) {
        let sum = 0;
        let k = 0;
        
        // Find k such that sum of first k exponents is non-negative
        for (let i = 0; i < lyapunovExponents.length; i++) {
            sum += lyapunovExponents[i];
            if (sum < 0) {
                k = i;
                break;
            }
            k = i + 1;
        }
        
        if (k === 0) return 0;
        if (k === lyapunovExponents.length) return k;
        
        // Compute dimension
        sum = 0;
        for (let i = 0; i < k; i++) {
            sum += lyapunovExponents[i];
        }
        
        return k + sum / Math.abs(lyapunovExponents[k]);
    }

    /**
     * Gram-Schmidt orthogonalization with QR decomposition
     */
    gramSchmidt(vectors) {
        const n = vectors.length;
        const Q = [];
        const R = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            let v = [...vectors[i]];
            
            // Subtract projections onto previous vectors
            for (let j = 0; j < i; j++) {
                const projection = this.dotProduct(vectors[i], Q[j]);
                R[j][i] = projection;
                v = this.vectorSubtract(v, this.scalarMultiply(Q[j], projection));
            }
            
            // Normalize
            const norm = this.vectorNorm(v);
            R[i][i] = norm;
            
            if (norm > 1e-10) {
                Q.push(this.scalarMultiply(v, 1 / norm));
            } else {
                // Handle degenerate case
                Q.push([0, 0, 0]);
            }
        }
        
        return { Q, R };
    }

    /**
     * Helper: Matrix-vector multiplication
     */
    matrixVectorMultiply(matrix, vector) {
        return matrix.map(row => 
            row.reduce((sum, val, i) => sum + val * vector[i], 0)
        );
    }

    /**
     * Helper: Dot product
     */
    dotProduct(v1, v2) {
        return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    }

    /**
     * Helper: Vector subtraction
     */
    vectorSubtract(v1, v2) {
        return v1.map((val, i) => val - v2[i]);
    }

    /**
     * Helper: Scalar multiplication
     */
    scalarMultiply(vector, scalar) {
        return vector.map(val => val * scalar);
    }

    /**
     * Helper: Vector norm
     */
    vectorNorm(vector) {
        return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    }

    /**
     * Helper: Euclidean distance
     */
    euclideanDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p1[0] - p2[0], 2) +
            Math.pow(p1[1] - p2[1], 2) +
            Math.pow(p1[2] - p2[2], 2)
        );
    }
}