/**
 * Lyapunov Spectrum Domain Entity
 * Encapsulates the Lyapunov exponents and their computation state
 */

export class LyapunovSpectrum {
    constructor(dimension = 3) {
        this._dimension = dimension;
        this._exponents = new Array(dimension).fill(0);
        this._tangentVectors = this._initializeTangentVectors(dimension);
        this._stepCount = 0;
        this._convergenceHistory = [];
        this._isConverged = false;
        this._tolerance = 1e-6;
        this._minSteps = 10000;
        this._qrStepInterval = 100;
    }

    _initializeTangentVectors(dim) {
        const vectors = [];
        for (let i = 0; i < dim; i++) {
            const vector = new Array(dim).fill(0);
            vector[i] = 1; // Identity matrix columns
            vectors.push(vector);
        }
        return vectors;
    }

    get exponents() { return [...this._exponents]; }
    get largestExponent() { return Math.max(...this._exponents); }
    get isConverged() { return this._isConverged; }
    get stepCount() { return this._stepCount; }
    get sumOfExponents() { return this._exponents.reduce((sum, exp) => sum + exp, 0); }

    /**
     * Update the Lyapunov spectrum using QR decomposition
     */
    update(jacobian, dt) {
        this._evolveTangentVectors(jacobian, dt);
        this._stepCount++;

        // Perform QR decomposition periodically
        if (this._stepCount % this._qrStepInterval === 0) {
            this._performQRDecomposition(dt);
            this._checkConvergence();
        }

        return {
            exponents: this.exponents,
            isConverged: this._isConverged,
            step: this._stepCount
        };
    }

    _evolveTangentVectors(jacobian, dt) {
        for (let i = 0; i < this._dimension; i++) {
            const oldVector = [...this._tangentVectors[i]];
            const newVector = new Array(this._dimension).fill(0);
            
            // Apply Jacobian: newVector = I + dt * J) * oldVector
            for (let j = 0; j < this._dimension; j++) {
                newVector[j] = oldVector[j]; // Identity part
                for (let k = 0; k < this._dimension; k++) {
                    newVector[j] += dt * jacobian[j][k] * oldVector[k];
                }
            }
            
            this._tangentVectors[i] = newVector;
        }
    }

    _performQRDecomposition(dt) {
        const { Q, R } = this._modifiedGramSchmidt(this._tangentVectors);
        
        // Update Lyapunov exponents using diagonal elements of R
        for (let i = 0; i < this._dimension; i++) {
            const logGrowth = Math.log(Math.abs(R[i][i])) / (this._qrStepInterval * dt);
            this._exponents[i] = (this._exponents[i] * (this._stepCount - this._qrStepInterval) + 
                                 logGrowth * this._qrStepInterval) / this._stepCount;
        }
        
        // Replace tangent vectors with orthonormal Q
        this._tangentVectors = Q;
        
        // Store convergence data
        this._convergenceHistory.push([...this._exponents]);
        if (this._convergenceHistory.length > 100) {
            this._convergenceHistory.shift();
        }
    }

    _modifiedGramSchmidt(vectors) {
        const n = vectors.length;
        const Q = vectors.map(v => [...v]); // Copy vectors
        const R = Array(n).fill(0).map(() => Array(n).fill(0));

        for (let j = 0; j < n; j++) {
            // Compute norm
            let norm = 0;
            for (let i = 0; i < n; i++) {
                norm += Q[j][i] * Q[j][i];
            }
            R[j][j] = Math.sqrt(norm);

            // Normalize
            if (R[j][j] > 1e-15) {
                for (let i = 0; i < n; i++) {
                    Q[j][i] /= R[j][j];
                }
            }

            // Orthogonalize remaining vectors
            for (let k = j + 1; k < n; k++) {
                R[j][k] = 0;
                for (let i = 0; i < n; i++) {
                    R[j][k] += Q[j][i] * Q[k][i];
                }
                for (let i = 0; i < n; i++) {
                    Q[k][i] -= R[j][k] * Q[j][i];
                }
            }
        }

        return { Q, R };
    }

    _checkConvergence() {
        if (this._stepCount < this._minSteps || this._convergenceHistory.length < 10) {
            return;
        }

        const recent = this._convergenceHistory.slice(-10);
        const oldValues = recent[0];
        const newValues = recent[recent.length - 1];

        let maxChange = 0;
        for (let i = 0; i < this._dimension; i++) {
            const change = Math.abs(newValues[i] - oldValues[i]);
            maxChange = Math.max(maxChange, change);
        }

        this._isConverged = maxChange < this._tolerance;
    }

    /**
     * Verify sum identity: λ₁ + λ₂ + λ₃ = -3b
     */
    verifySumIdentity(expectedSum, tolerance = 1e-3) {
        const actualSum = this.sumOfExponents;
        const error = Math.abs(actualSum - expectedSum);
        return {
            isValid: error < tolerance,
            actualSum,
            expectedSum,
            error
        };
    }

    /**
     * Compute Kaplan-Yorke dimension
     */
    computeKaplanYorkeDimension() {
        const sortedExponents = [...this._exponents].sort((a, b) => b - a);
        
        let sum = 0;
        let j = 0;
        
        // Find largest j such that sum of first j+1 exponents ≥ 0
        while (j < this._dimension) {
            sum += sortedExponents[j];
            if (sum < 0 && j > 0) break;
            j++;
        }
        
        if (j === 0) return 0;
        if (j === this._dimension) return this._dimension;
        
        // D_KY = j + (sum of first j exponents) / |λ_{j+1}|
        const partialSum = sortedExponents.slice(0, j).reduce((s, exp) => s + exp, 0);
        const dimension = j + partialSum / Math.abs(sortedExponents[j]);
        
        return Math.max(0, dimension);
    }

    /**
     * Reset to initial state
     */
    reset() {
        this._exponents.fill(0);
        this._tangentVectors = this._initializeTangentVectors(this._dimension);
        this._stepCount = 0;
        this._convergenceHistory = [];
        this._isConverged = false;
    }

    /**
     * Get statistical information
     */
    getStatistics() {
        return {
            exponents: this.exponents,
            largestExponent: this.largestExponent,
            kaplanYorkeDimension: this.computeKaplanYorkeDimension(),
            sumOfExponents: this.sumOfExponents,
            isConverged: this._isConverged,
            stepCount: this._stepCount,
            convergenceHistory: [...this._convergenceHistory]
        };
    }
}