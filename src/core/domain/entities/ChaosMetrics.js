/**
 * Chaos Metrics Domain Entity
 * Encapsulates Thomas Chaos Meter (CTM) and related chaos indicators
 */

export class ChaosMetrics {
    constructor(parameterB) {
        this._parameterB = parameterB;
        this._ctmValue = 0;
        this._confidenceInterval = { lower: 0, upper: 0 };
        this._components = {
            C_lambda: 0,
            C_dimension: 0
        };
        this._validationResults = {
            sumIdentity: null,
            bootstrapSamples: [],
            statisticalTests: {}
        };
        this._interpretation = 'unknown';
    }

    get ctmValue() { return this._ctmValue; }
    get confidenceInterval() { return { ...this._confidenceInterval }; }
    get components() { return { ...this._components }; }
    get interpretation() { return this._interpretation; }
    get parameterB() { return this._parameterB; }

    /**
     * Compute CTM from Lyapunov spectrum
     * CTM = √(C_λ × C_D)
     */
    computeFromSpectrum(lyapunovSpectrum) {
        const exponents = lyapunovSpectrum.exponents;
        const lambda1 = Math.max(...exponents);
        const kaplanYorkeDimension = lyapunovSpectrum.computeKaplanYorkeDimension();
        
        // Verify sum identity
        const sumVerification = lyapunovSpectrum.verifySumIdentity(-3 * this._parameterB);
        this._validationResults.sumIdentity = sumVerification;

        // Compute components
        this._components.C_lambda = this._computeCLambda(lambda1);
        this._components.C_dimension = this._computeCDimension(kaplanYorkeDimension);

        // Compute CTM
        this._ctmValue = Math.sqrt(this._components.C_lambda * this._components.C_dimension);
        
        // Determine interpretation
        this._interpretation = this._interpretCTM(this._ctmValue);

        return {
            ctm: this._ctmValue,
            components: this._components,
            interpretation: this._interpretation,
            validation: this._validationResults.sumIdentity
        };
    }

    _computeCLambda(lambda1) {
        // C_λ = 1 - exp(-λ₁/(3b))
        const exponent = -lambda1 / (3 * this._parameterB);
        return 1 - Math.exp(exponent);
    }

    _computeCDimension(kaplanYorkeDimension) {
        // C_D = clamp(D_KY - 2, 0, 1)
        return Math.max(0, Math.min(1, kaplanYorkeDimension - 2));
    }

    _interpretCTM(ctmValue) {
        if (ctmValue < 0.1) return 'stable-focus';
        if (ctmValue < 0.3) return 'weak-chaos';
        if (ctmValue < 0.7) return 'moderate-chaos';
        if (ctmValue < 0.9) return 'strong-chaos';
        return 'hyperchaotic';
    }

    /**
     * Compute bootstrap confidence intervals
     */
    async computeBootstrapCI(lyapunovSpectra, confidenceLevel = 0.95, numBootstrap = 1000) {
        if (lyapunovSpectra.length < 10) {
            throw new Error('Need at least 10 samples for bootstrap CI');
        }

        const bootstrapCTMs = [];
        
        for (let i = 0; i < numBootstrap; i++) {
            // Resample with replacement
            const resampledSpectra = [];
            for (let j = 0; j < lyapunovSpectra.length; j++) {
                const randomIndex = Math.floor(Math.random() * lyapunovSpectra.length);
                resampledSpectra.push(lyapunovSpectra[randomIndex]);
            }

            // Compute average spectrum
            const avgSpectrum = this._averageSpectra(resampledSpectra);
            
            // Compute CTM for this bootstrap sample
            const tempMetrics = new ChaosMetrics(this._parameterB);
            const result = tempMetrics.computeFromSpectrum(avgSpectrum);
            bootstrapCTMs.push(result.ctm);
        }

        // Compute percentile confidence interval
        bootstrapCTMs.sort((a, b) => a - b);
        const alpha = 1 - confidenceLevel;
        const lowerIndex = Math.floor(alpha / 2 * numBootstrap);
        const upperIndex = Math.floor((1 - alpha / 2) * numBootstrap) - 1;

        this._confidenceInterval = {
            lower: bootstrapCTMs[lowerIndex],
            upper: bootstrapCTMs[upperIndex],
            level: confidenceLevel
        };

        this._validationResults.bootstrapSamples = bootstrapCTMs;

        return this._confidenceInterval;
    }

    _averageSpectra(spectra) {
        const dimension = spectra[0].exponents.length;
        const avgExponents = new Array(dimension).fill(0);
        
        for (const spectrum of spectra) {
            for (let i = 0; i < dimension; i++) {
                avgExponents[i] += spectrum.exponents[i];
            }
        }
        
        for (let i = 0; i < dimension; i++) {
            avgExponents[i] /= spectra.length;
        }

        // Create a mock spectrum with averaged values
        return {
            exponents: avgExponents,
            computeKaplanYorkeDimension: () => {
                // Simplified KY computation for averaged exponents
                const sorted = [...avgExponents].sort((a, b) => b - a);
                let sum = 0;
                let j = 0;
                
                while (j < dimension) {
                    sum += sorted[j];
                    if (sum < 0 && j > 0) break;
                    j++;
                }
                
                if (j === 0) return 0;
                if (j === dimension) return dimension;
                
                const partialSum = sorted.slice(0, j).reduce((s, exp) => s + exp, 0);
                return Math.max(0, j + partialSum / Math.abs(sorted[j]));
            },
            verifySumIdentity: (expected) => {
                const actual = avgExponents.reduce((sum, exp) => sum + exp, 0);
                return {
                    isValid: Math.abs(actual - expected) < 1e-3,
                    actualSum: actual,
                    expectedSum: expected,
                    error: Math.abs(actual - expected)
                };
            }
        };
    }

    /**
     * Perform 0-1 test for chaos
     */
    performZeroOneTest(timeSeries, c = Math.PI) {
        const n = timeSeries.length;
        if (n < 1000) {
            console.warn('0-1 test requires at least 1000 points for reliability');
        }

        let p = 0, q = 0;
        const pc = [], qc = [];

        // Compute translation variables
        for (let i = 0; i < n; i++) {
            p += timeSeries[i] * Math.cos(i * c);
            q += timeSeries[i] * Math.sin(i * c);
            pc.push(p);
            qc.push(q);
        }

        // Compute mean square displacement
        const nCut = Math.floor(n / 10); // Use last 90% of data
        let Mc = 0;
        
        for (let j = 1; j <= nCut; j++) {
            let sum = 0;
            for (let i = j; i < n; i++) {
                const dp = pc[i] - pc[i - j];
                const dq = qc[i] - qc[i - j];
                sum += dp * dp + dq * dq;
            }
            Mc += sum / (n - j);
        }
        
        Mc /= nCut;

        // Normalize by variance
        const varP = pc.reduce((sum, val, i) => sum + val * val, 0) / n;
        const varQ = qc.reduce((sum, val, i) => sum + val * val, 0) / n;
        const K = Mc / (varP + varQ);

        this._validationResults.statisticalTests.zeroOneTest = {
            K: K,
            interpretation: K > 0.9 ? 'chaotic' : K < 0.1 ? 'regular' : 'indeterminate'
        };

        return K;
    }

    /**
     * Update parameter B and recalculate dependent values
     */
    updateParameterB(newB) {
        this._parameterB = newB;
        // CTM will be recalculated on next computeFromSpectrum call
    }

    /**
     * Get complete analysis results
     */
    getAnalysisResults() {
        return {
            ctm: this._ctmValue,
            confidenceInterval: this._confidenceInterval,
            components: this._components,
            interpretation: this._interpretation,
            parameterB: this._parameterB,
            validation: this._validationResults
        };
    }

    /**
     * Reset all computed values
     */
    reset() {
        this._ctmValue = 0;
        this._confidenceInterval = { lower: 0, upper: 0 };
        this._components = { C_lambda: 0, C_dimension: 0 };
        this._validationResults = {
            sumIdentity: null,
            bootstrapSamples: [],
            statisticalTests: {}
        };
        this._interpretation = 'unknown';
    }

    /**
     * Export data for analysis
     */
    exportData() {
        return {
            timestamp: Date.now(),
            parameterB: this._parameterB,
            ctm: this._ctmValue,
            components: this._components,
            confidenceInterval: this._confidenceInterval,
            interpretation: this._interpretation,
            validation: this._validationResults
        };
    }
}