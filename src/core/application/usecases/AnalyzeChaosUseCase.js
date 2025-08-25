/**
 * Analyze Chaos Use Case
 * Performs comprehensive chaos analysis including parameter sweeps and validation
 */

export class AnalyzeChaosUseCase {
    constructor(attractorRepository, lyapunovRepository, metricsRepository, eventBus) {
        this.attractorRepository = attractorRepository;
        this.lyapunovRepository = lyapunovRepository;
        this.metricsRepository = metricsRepository;
        this.eventBus = eventBus;
        this.analysisJobs = new Map();
    }

    /**
     * Perform parameter sweep analysis
     */
    async performParameterSweep(sweepParameters) {
        const {
            bMin = 0.1,
            bMax = 0.3,
            bSteps = 50,
            analysisSteps = 20000,
            settlingSteps = 5000,
            seed = [0.1, 0.0, 0.0],
            dt = 0.01
        } = sweepParameters;

        const jobId = this._generateJobId();
        this.analysisJobs.set(jobId, { status: 'running', progress: 0 });

        try {
            this.eventBus.emit('analysis.sweep.started', { jobId, sweepParameters });

            const bValues = this._generateBValues(bMin, bMax, bSteps);
            const results = [];

            for (let i = 0; i < bValues.length; i++) {
                const b = bValues[i];
                
                // Create fresh instances for this b value
                const attractor = await this.attractorRepository.create(b, dt, seed);
                const spectrum = await this.lyapunovRepository.create(3);
                const metrics = await this.metricsRepository.create(b);

                // Run settling phase
                for (let step = 0; step < settlingSteps; step++) {
                    attractor.step();
                }

                // Run analysis phase
                for (let step = 0; step < analysisSteps; step++) {
                    const stepResult = attractor.step();
                    spectrum.update(stepResult.jacobian, dt);
                }

                // Compute final metrics
                const metricsResult = metrics.computeFromSpectrum(spectrum);
                const statistics = spectrum.getStatistics();

                results.push({
                    b: b,
                    ctm: metricsResult.ctm,
                    lyapunovExponents: statistics.exponents,
                    kaplanYorkeDimension: statistics.kaplanYorkeDimension,
                    isConverged: statistics.isConverged,
                    sumIdentityValid: metricsResult.validation.isValid,
                    interpretation: metricsResult.interpretation
                });

                // Update progress
                const progress = (i + 1) / bValues.length;
                this.analysisJobs.set(jobId, { status: 'running', progress });
                
                this.eventBus.emit('analysis.sweep.progress', { 
                    jobId, 
                    progress, 
                    currentB: b,
                    result: results[results.length - 1]
                });
            }

            // Mark job as completed
            this.analysisJobs.set(jobId, { status: 'completed', progress: 1, results });
            this.eventBus.emit('analysis.sweep.completed', { jobId, results });

            return { jobId, results };

        } catch (error) {
            this.analysisJobs.set(jobId, { status: 'error', error: error.message });
            this.eventBus.emit('analysis.sweep.error', { jobId, error: error.message });
            throw error;
        }
    }

    /**
     * Compute bootstrap confidence intervals for a specific parameter
     */
    async computeBootstrapAnalysis(parameters) {
        const {
            b,
            dt = 0.01,
            seed = [0.1, 0.0, 0.0],
            numRuns = 50,
            stepsPerRun = 20000,
            confidenceLevel = 0.95,
            numBootstrap = 1000
        } = parameters;

        const jobId = this._generateJobId();
        this.analysisJobs.set(jobId, { status: 'running', progress: 0 });

        try {
            this.eventBus.emit('analysis.bootstrap.started', { jobId, parameters });

            const spectra = [];

            // Generate multiple independent runs
            for (let run = 0; run < numRuns; run++) {
                // Create fresh attractor with slight perturbation in initial conditions
                const perturbedSeed = seed.map(val => val + (Math.random() - 0.5) * 1e-6);
                const attractor = await this.attractorRepository.create(b, dt, perturbedSeed);
                const spectrum = await this.lyapunovRepository.create(3);

                // Run simulation
                for (let step = 0; step < stepsPerRun; step++) {
                    const stepResult = attractor.step();
                    spectrum.update(stepResult.jacobian, dt);
                }

                spectra.push(spectrum);

                // Update progress
                const progress = (run + 1) / numRuns * 0.7; // 70% for data collection
                this.analysisJobs.set(jobId, { status: 'running', progress });
                
                this.eventBus.emit('analysis.bootstrap.progress', { 
                    jobId, 
                    progress, 
                    phase: 'data_collection',
                    run: run + 1,
                    totalRuns: numRuns
                });
            }

            // Compute bootstrap confidence intervals
            const metrics = await this.metricsRepository.create(b);
            const confidenceInterval = await metrics.computeBootstrapCI(
                spectra, 
                confidenceLevel, 
                numBootstrap
            );

            // Compute overall statistics
            const overallSpectrum = this._computeAverageSpectrum(spectra);
            const overallResult = metrics.computeFromSpectrum(overallSpectrum);

            const result = {
                b: b,
                ctm: overallResult.ctm,
                confidenceInterval: confidenceInterval,
                lyapunovExponents: overallSpectrum.exponents,
                kaplanYorkeDimension: overallSpectrum.computeKaplanYorkeDimension(),
                numRuns: numRuns,
                confidenceLevel: confidenceLevel,
                validation: overallResult.validation
            };

            // Mark job as completed
            this.analysisJobs.set(jobId, { status: 'completed', progress: 1, result });
            this.eventBus.emit('analysis.bootstrap.completed', { jobId, result });

            return { jobId, result };

        } catch (error) {
            this.analysisJobs.set(jobId, { status: 'error', error: error.message });
            this.eventBus.emit('analysis.bootstrap.error', { jobId, error: error.message });
            throw error;
        }
    }

    /**
     * Perform comprehensive validation tests
     */
    async performValidationTests(parameters) {
        const {
            b,
            dt = 0.01,
            seed = [0.1, 0.0, 0.0],
            analysisSteps = 50000
        } = parameters;

        const jobId = this._generateJobId();
        this.analysisJobs.set(jobId, { status: 'running', progress: 0 });

        try {
            this.eventBus.emit('analysis.validation.started', { jobId, parameters });

            const attractor = await this.attractorRepository.create(b, dt, seed);
            const spectrum = await this.lyapunovRepository.create(3);
            const metrics = await this.metricsRepository.create(b);

            const timeSeries = [];

            // Generate time series data
            for (let step = 0; step < analysisSteps; step++) {
                const stepResult = attractor.step();
                spectrum.update(stepResult.jacobian, dt);
                
                // Store x-coordinate for 0-1 test
                timeSeries.push(stepResult.position.x);

                // Update progress
                if (step % 1000 === 0) {
                    const progress = step / analysisSteps * 0.8;
                    this.analysisJobs.set(jobId, { status: 'running', progress });
                }
            }

            // Compute final metrics
            const metricsResult = metrics.computeFromSpectrum(spectrum);

            // Perform 0-1 test for chaos
            const zeroOneResult = metrics.performZeroOneTest(timeSeries);

            // Additional validation tests
            const validationResults = {
                sumIdentity: spectrum.verifySumIdentity(-3 * b),
                divergenceTest: attractor.verifyDivergence(),
                lyapunovConvergence: spectrum.isConverged,
                zeroOneTest: {
                    K: zeroOneResult,
                    interpretation: metrics._validationResults.statisticalTests.zeroOneTest.interpretation
                },
                ctmBounds: this._validateCTMBounds(metricsResult.ctm),
                spectrumOrdering: this._validateSpectrumOrdering(spectrum.exponents)
            };

            const result = {
                b: b,
                ctm: metricsResult.ctm,
                lyapunovExponents: spectrum.exponents,
                kaplanYorkeDimension: spectrum.computeKaplanYorkeDimension(),
                validation: validationResults,
                overallValid: this._computeOverallValidity(validationResults)
            };

            // Mark job as completed
            this.analysisJobs.set(jobId, { status: 'completed', progress: 1, result });
            this.eventBus.emit('analysis.validation.completed', { jobId, result });

            return { jobId, result };

        } catch (error) {
            this.analysisJobs.set(jobId, { status: 'error', error: error.message });
            this.eventBus.emit('analysis.validation.error', { jobId, error: error.message });
            throw error;
        }
    }

    /**
     * Get analysis job status
     */
    getJobStatus(jobId) {
        return this.analysisJobs.get(jobId) || { status: 'not_found' };
    }

    /**
     * Cancel running analysis job
     */
    async cancelJob(jobId) {
        if (this.analysisJobs.has(jobId)) {
            this.analysisJobs.set(jobId, { status: 'cancelled' });
            this.eventBus.emit('analysis.job.cancelled', { jobId });
            return { status: 'cancelled' };
        }
        throw new Error(`Job ${jobId} not found`);
    }

    // Private helper methods
    _generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _generateBValues(bMin, bMax, steps) {
        const bValues = [];
        const stepSize = (bMax - bMin) / (steps - 1);
        
        for (let i = 0; i < steps; i++) {
            bValues.push(bMin + i * stepSize);
        }
        
        return bValues;
    }

    _computeAverageSpectrum(spectra) {
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

        return {
            exponents: avgExponents,
            computeKaplanYorkeDimension: () => {
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
            }
        };
    }

    _validateCTMBounds(ctm) {
        return {
            inBounds: ctm >= 0 && ctm <= 1,
            value: ctm,
            isValid: !isNaN(ctm) && isFinite(ctm) && ctm >= 0 && ctm <= 1
        };
    }

    _validateSpectrumOrdering(exponents) {
        const sorted = [...exponents].sort((a, b) => b - a);
        const isOrdered = exponents.every((exp, i) => exp === sorted[i]);
        
        return {
            isOrdered: isOrdered,
            original: [...exponents],
            sorted: sorted
        };
    }

    _computeOverallValidity(validationResults) {
        const checks = [
            validationResults.sumIdentity.isValid,
            validationResults.divergenceTest,
            validationResults.lyapunovConvergence,
            validationResults.ctmBounds.isValid,
            validationResults.zeroOneTest.K > 0.5 // Rough chaos threshold
        ];
        
        const validCount = checks.filter(check => check).length;
        return {
            allValid: validCount === checks.length,
            validCount: validCount,
            totalChecks: checks.length,
            validityRatio: validCount / checks.length
        };
    }
}