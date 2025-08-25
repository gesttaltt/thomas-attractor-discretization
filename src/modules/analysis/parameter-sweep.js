/**
 * Parameter Sweep Module
 * Explores chaos behavior across parameter space
 */

import { ThomasAttractor } from '../attractor.js';
import { ThomasLyapunovCalculator } from '../chaos/lyapunov.js';
import { CTMCalculator } from '../chaos/ctm.js';

export class ParameterSweep {
    constructor(config = {}) {
        this.config = {
            bRange: [0.10, 0.40],
            bStep: 0.01,
            refinementZones: [
                { range: [0.17, 0.21], step: 0.001 }
            ],
            dt: 0.01,
            totalSteps: 3000000,
            transientSteps: 2000,
            qrPeriod: 5,
            seed: [0.1, 0.0, 0.0],
            parallel: false,
            numWorkers: 4,
            ...config
        };
        
        this.results = [];
        this.isRunning = false;
        this.progress = 0;
        this.currentB = null;
        
        // Callbacks
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }
    
    /**
     * Generate parameter grid with refinement zones
     */
    generateParameterGrid() {
        const grid = [];
        const { bRange, bStep, refinementZones } = this.config;
        
        // Generate base grid
        let b = bRange[0];
        while (b <= bRange[1]) {
            // Check if we're in a refinement zone
            let inRefinementZone = false;
            let refinementStep = bStep;
            
            for (const zone of refinementZones) {
                if (b >= zone.range[0] && b <= zone.range[1]) {
                    inRefinementZone = true;
                    refinementStep = zone.step;
                    break;
                }
            }
            
            grid.push(b);
            
            // Determine next step
            if (inRefinementZone) {
                b += refinementStep;
                // Round to avoid floating point errors
                b = Math.round(b * 10000) / 10000;
            } else {
                b += bStep;
                b = Math.round(b * 1000) / 1000;
            }
        }
        
        return grid;
    }
    
    /**
     * Run parameter sweep
     */
    async run(progressCallback = null, completeCallback = null) {
        this.isRunning = true;
        this.results = [];
        this.progress = 0;
        
        const grid = this.generateParameterGrid();
        const totalPoints = grid.length;
        
        console.log(`Starting parameter sweep with ${totalPoints} points`);
        
        for (let i = 0; i < grid.length; i++) {
            if (!this.isRunning) break;
            
            const b = grid[i];
            this.currentB = b;
            
            try {
                // Compute CTM for this parameter
                const result = await this.computeForParameter(b);
                this.results.push(result);
                
                // Update progress
                this.progress = (i + 1) / totalPoints;
                
                if (progressCallback) {
                    progressCallback({
                        progress: this.progress,
                        currentB: b,
                        currentResult: result,
                        completed: i + 1,
                        total: totalPoints
                    });
                }
            } catch (error) {
                console.error(`Error at b=${b}:`, error);
                if (this.onError) {
                    this.onError(error, b);
                }
            }
        }
        
        this.isRunning = false;
        
        // Analysis of results
        const analysis = this.analyzeResults();
        
        if (completeCallback) {
            completeCallback({
                results: this.results,
                analysis,
                grid
            });
        }
        
        return {
            results: this.results,
            analysis,
            grid
        };
    }
    
    /**
     * Compute CTM for a single parameter value
     */
    async computeForParameter(b) {
        const startTime = Date.now();
        
        // Initialize components
        const attractor = new ThomasAttractor(b, this.config.dt);
        const lyapunovCalc = new ThomasLyapunovCalculator(b, this.config.qrPeriod, this.config.dt);
        const ctmCalc = new CTMCalculator(b);
        
        // Reset to initial conditions
        attractor.reset(this.config.seed);
        lyapunovCalc.reset();
        
        // Run transient
        for (let i = 0; i < this.config.transientSteps; i++) {
            attractor.step();
        }
        
        // Main integration with Lyapunov calculation
        const checkpoints = [];
        const checkInterval = Math.floor(this.config.totalSteps / 10);
        
        for (let i = 0; i < this.config.totalSteps; i++) {
            const state = attractor.step();
            lyapunovCalc.processPoint(state);
            
            // Store checkpoints for convergence analysis
            if (i % checkInterval === 0) {
                checkpoints.push({
                    step: i,
                    exponents: lyapunovCalc.getExponents(),
                    converged: lyapunovCalc.isConverged
                });
            }
        }
        
        // Get final results
        const exponents = lyapunovCalc.getExponents();
        const exponentsWithCI = lyapunovCalc.getExponentsWithCI();
        const convergenceStatus = lyapunovCalc.getConvergenceStatus();
        
        // Compute CTM
        const ctmResult = ctmCalc.computeCTM(exponents);
        
        // Add bootstrap CI if we have FTLE windows
        let confidence = null;
        if (lyapunovCalc.ftleWindows.length >= 10) {
            const bootstrapResult = ctmCalc.computeWithBootstrap(
                lyapunovCalc.ftleWindows,
                200
            );
            confidence = bootstrapResult.confidence;
        }
        
        const computationTime = Date.now() - startTime;
        
        return {
            b,
            lyapunov: {
                exponents,
                exponentsWithCI,
                convergence: convergenceStatus
            },
            ctm: ctmResult,
            confidence,
            checkpoints,
            computationTime,
            config: {
                dt: this.config.dt,
                steps: this.config.totalSteps,
                seed: this.config.seed
            }
        };
    }
    
    /**
     * Analyze sweep results
     */
    analyzeResults() {
        if (this.results.length === 0) {
            return null;
        }
        
        // Extract CTM values
        const ctmValues = this.results.map(r => r.ctm.CTM);
        const bValues = this.results.map(r => r.b);
        
        // Find critical points
        const criticalPoints = this.findCriticalPoints();
        
        // Identify regime transitions
        const transitions = this.identifyTransitions();
        
        // Calculate statistics
        const stats = {
            minCTM: Math.min(...ctmValues),
            maxCTM: Math.max(...ctmValues),
            meanCTM: ctmValues.reduce((a, b) => a + b, 0) / ctmValues.length,
            chaosOnset: this.findChaosOnset(),
            maxChaosB: bValues[ctmValues.indexOf(Math.max(...ctmValues))]
        };
        
        return {
            criticalPoints,
            transitions,
            statistics: stats,
            convergenceRate: this.calculateConvergenceRate()
        };
    }
    
    /**
     * Find critical points (local extrema, inflection points)
     */
    findCriticalPoints() {
        const points = [];
        const ctmValues = this.results.map(r => r.ctm.CTM);
        
        for (let i = 1; i < ctmValues.length - 1; i++) {
            const prev = ctmValues[i - 1];
            const curr = ctmValues[i];
            const next = ctmValues[i + 1];
            
            // Local maximum
            if (curr > prev && curr > next) {
                points.push({
                    type: 'maximum',
                    b: this.results[i].b,
                    CTM: curr,
                    index: i
                });
            }
            
            // Local minimum
            if (curr < prev && curr < next) {
                points.push({
                    type: 'minimum',
                    b: this.results[i].b,
                    CTM: curr,
                    index: i
                });
            }
            
            // Inflection point (simplified detection)
            if (i > 1 && i < ctmValues.length - 2) {
                const d2 = ctmValues[i + 1] - 2 * curr + ctmValues[i - 1];
                const d2_prev = curr - 2 * ctmValues[i - 1] + ctmValues[i - 2];
                
                if (d2 * d2_prev < 0) {
                    points.push({
                        type: 'inflection',
                        b: this.results[i].b,
                        CTM: curr,
                        index: i
                    });
                }
            }
        }
        
        return points;
    }
    
    /**
     * Identify regime transitions
     */
    identifyTransitions() {
        const transitions = [];
        
        for (let i = 1; i < this.results.length; i++) {
            const prevRegime = this.results[i - 1].ctm.regime.type;
            const currRegime = this.results[i].ctm.regime.type;
            
            if (prevRegime !== currRegime) {
                transitions.push({
                    fromRegime: prevRegime,
                    toRegime: currRegime,
                    b: this.results[i].b,
                    CTM: this.results[i].ctm.CTM,
                    index: i
                });
            }
        }
        
        return transitions;
    }
    
    /**
     * Find chaos onset (first positive Lyapunov exponent)
     */
    findChaosOnset() {
        for (const result of this.results) {
            if (result.lyapunov.exponents[0] > 0) {
                return {
                    b: result.b,
                    lambda1: result.lyapunov.exponents[0],
                    CTM: result.ctm.CTM
                };
            }
        }
        return null;
    }
    
    /**
     * Calculate convergence rate across the sweep
     */
    calculateConvergenceRate() {
        let convergedCount = 0;
        let totalIterations = 0;
        
        this.results.forEach(result => {
            if (result.lyapunov.convergence.isConverged) {
                convergedCount++;
                totalIterations += result.lyapunov.convergence.iterations;
            }
        });
        
        return {
            convergedRatio: convergedCount / this.results.length,
            averageIterations: convergedCount > 0 ? totalIterations / convergedCount : 0
        };
    }
    
    /**
     * Export results to various formats
     */
    exportResults(format = 'json') {
        switch (format) {
            case 'json':
                return this.exportJSON();
            case 'csv':
                return this.exportCSV();
            case 'matlab':
                return this.exportMATLAB();
            default:
                throw new Error(`Unknown export format: ${format}`);
        }
    }
    
    /**
     * Export as JSON
     */
    exportJSON() {
        return {
            metadata: {
                timestamp: new Date().toISOString(),
                config: this.config,
                totalPoints: this.results.length
            },
            results: this.results,
            analysis: this.analyzeResults()
        };
    }
    
    /**
     * Export as CSV
     */
    exportCSV() {
        const headers = [
            'b', 'lambda1', 'lambda2', 'lambda3',
            'D_KY', 'C_lambda', 'C_D', 'CTM',
            'regime', 'converged', 'computation_time_ms'
        ];
        
        let csv = headers.join(',') + '\n';
        
        this.results.forEach(result => {
            const row = [
                result.b,
                result.lyapunov.exponents[0],
                result.lyapunov.exponents[1],
                result.lyapunov.exponents[2],
                result.ctm.kaplanYorke,
                result.ctm.components.C_lambda,
                result.ctm.components.C_D,
                result.ctm.CTM,
                result.ctm.regime.type,
                result.lyapunov.convergence.isConverged,
                result.computationTime
            ];
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    /**
     * Export for MATLAB
     */
    exportMATLAB() {
        const matlabCode = `% Thomas Attractor CTM Parameter Sweep Results
% Generated: ${new Date().toISOString()}

b = [${this.results.map(r => r.b).join(', ')}];
CTM = [${this.results.map(r => r.ctm.CTM).join(', ')}];
lambda1 = [${this.results.map(r => r.lyapunov.exponents[0]).join(', ')}];
lambda2 = [${this.results.map(r => r.lyapunov.exponents[1]).join(', ')}];
lambda3 = [${this.results.map(r => r.lyapunov.exponents[2]).join(', ')}];
D_KY = [${this.results.map(r => r.ctm.kaplanYorke).join(', ')}];

% Plot results
figure;
subplot(2,2,1);
plot(b, CTM, 'b-', 'LineWidth', 2);
xlabel('b'); ylabel('CTM');
title('Thomas Chaos Meter');
grid on;

subplot(2,2,2);
plot(b, lambda1, 'r-', 'LineWidth', 1.5);
hold on;
plot(b, lambda2, 'g-', 'LineWidth', 1.5);
plot(b, lambda3, 'b-', 'LineWidth', 1.5);
xlabel('b'); ylabel('\\lambda');
title('Lyapunov Spectrum');
legend('\\lambda_1', '\\lambda_2', '\\lambda_3');
grid on;

subplot(2,2,3);
plot(b, D_KY, 'm-', 'LineWidth', 1.5);
xlabel('b'); ylabel('D_{KY}');
title('Kaplan-Yorke Dimension');
grid on;

subplot(2,2,4);
plot(b, lambda1 + lambda2 + lambda3 + 3*b, 'k-', 'LineWidth', 1.5);
xlabel('b'); ylabel('Sum Check');
title('Sum Identity Verification');
grid on;
`;
        
        return matlabCode;
    }
    
    /**
     * Stop the sweep
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Resume from a specific point
     */
    async resume(fromB = null) {
        if (!fromB && this.results.length > 0) {
            fromB = this.results[this.results.length - 1].b;
        }
        
        const grid = this.generateParameterGrid();
        const startIdx = grid.findIndex(b => b > fromB);
        
        if (startIdx === -1) {
            console.log('Sweep already complete');
            return;
        }
        
        const remainingGrid = grid.slice(startIdx);
        
        // Continue with remaining points
        for (const b of remainingGrid) {
            if (!this.isRunning) break;
            
            const result = await this.computeForParameter(b);
            this.results.push(result);
        }
    }
}