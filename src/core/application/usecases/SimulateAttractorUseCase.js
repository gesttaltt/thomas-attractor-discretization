/**
 * Simulate Attractor Use Case
 * Orchestrates the simulation of Thomas attractor with chaos analysis
 */

export class SimulateAttractorUseCase {
    constructor(attractorRepository, lyapunovRepository, metricsRepository, eventBus) {
        this.attractorRepository = attractorRepository;
        this.lyapunovRepository = lyapunovRepository;
        this.metricsRepository = metricsRepository;
        this.eventBus = eventBus;
        this.isRunning = false;
        this.simulationId = null;
    }

    /**
     * Start simulation with given parameters
     */
    async startSimulation(parameters) {
        const { b, dt, seed, transientSteps = 2000 } = parameters;
        
        try {
            // Create attractor instance
            const attractor = await this.attractorRepository.create(b, dt, seed);
            const spectrum = await this.lyapunovRepository.create(3); // 3D system
            const metrics = await this.metricsRepository.create(b);
            
            this.simulationId = this._generateSimulationId();
            this.isRunning = true;
            
            // Store simulation state
            await this.attractorRepository.save(this.simulationId, attractor);
            await this.lyapunovRepository.save(this.simulationId, spectrum);
            await this.metricsRepository.save(this.simulationId, metrics);
            
            // Emit start event
            this.eventBus.emit('simulation.started', {
                simulationId: this.simulationId,
                parameters: { b, dt, seed, transientSteps }
            });
            
            // Run transient phase
            await this._runTransientPhase(attractor, transientSteps);
            
            return {
                simulationId: this.simulationId,
                status: 'started',
                parameters
            };
            
        } catch (error) {
            this.eventBus.emit('simulation.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Execute simulation steps
     */
    async simulateSteps(stepCount = 1) {
        if (!this.isRunning || !this.simulationId) {
            throw new Error('No active simulation');
        }

        try {
            // Retrieve simulation state
            const attractor = await this.attractorRepository.get(this.simulationId);
            const spectrum = await this.lyapunovRepository.get(this.simulationId);
            const metrics = await this.metricsRepository.get(this.simulationId);

            const results = [];

            for (let i = 0; i < stepCount; i++) {
                // Step the attractor
                const stepResult = attractor.step();
                
                // Update Lyapunov spectrum
                const lyapunovResult = spectrum.update(stepResult.jacobian, attractor.dt);
                
                // Update metrics periodically
                let metricsResult = null;
                if (stepResult.step % 100 === 0) {
                    metricsResult = metrics.computeFromSpectrum(spectrum);
                }

                results.push({
                    step: stepResult.step,
                    position: stepResult.position,
                    lyapunovExponents: lyapunovResult.exponents,
                    ctm: metricsResult?.ctm || metrics.ctmValue
                });

                // Emit step event
                this.eventBus.emit('simulation.step', {
                    simulationId: this.simulationId,
                    step: stepResult.step,
                    position: stepResult.position,
                    lyapunovExponents: lyapunovResult.exponents
                });
            }

            // Save updated state
            await this.attractorRepository.save(this.simulationId, attractor);
            await this.lyapunovRepository.save(this.simulationId, spectrum);
            await this.metricsRepository.save(this.simulationId, metrics);

            return results;

        } catch (error) {
            this.eventBus.emit('simulation.error', { 
                simulationId: this.simulationId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Pause simulation
     */
    async pauseSimulation() {
        this.isRunning = false;
        this.eventBus.emit('simulation.paused', { simulationId: this.simulationId });
        return { status: 'paused' };
    }

    /**
     * Resume simulation
     */
    async resumeSimulation() {
        if (!this.simulationId) {
            throw new Error('No simulation to resume');
        }
        this.isRunning = true;
        this.eventBus.emit('simulation.resumed', { simulationId: this.simulationId });
        return { status: 'resumed' };
    }

    /**
     * Stop simulation and cleanup
     */
    async stopSimulation() {
        this.isRunning = false;
        const oldSimulationId = this.simulationId;
        
        if (oldSimulationId) {
            // Cleanup repositories
            await this.attractorRepository.delete(oldSimulationId);
            await this.lyapunovRepository.delete(oldSimulationId);
            await this.metricsRepository.delete(oldSimulationId);
        }
        
        this.simulationId = null;
        this.eventBus.emit('simulation.stopped', { simulationId: oldSimulationId });
        
        return { status: 'stopped' };
    }

    /**
     * Get current simulation state
     */
    async getSimulationState() {
        if (!this.simulationId) {
            return { status: 'idle' };
        }

        try {
            const attractor = await this.attractorRepository.get(this.simulationId);
            const spectrum = await this.lyapunovRepository.get(this.simulationId);
            const metrics = await this.metricsRepository.get(this.simulationId);

            return {
                simulationId: this.simulationId,
                status: this.isRunning ? 'running' : 'paused',
                currentStep: attractor.currentStep,
                currentPosition: attractor.position,
                lyapunovExponents: spectrum.exponents,
                ctm: metrics.ctmValue,
                isConverged: spectrum.isConverged
            };
        } catch (error) {
            this.eventBus.emit('simulation.error', { 
                simulationId: this.simulationId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update simulation parameters
     */
    async updateParameters(newParameters) {
        if (!this.simulationId) {
            throw new Error('No active simulation');
        }

        try {
            const attractor = await this.attractorRepository.get(this.simulationId);
            const metrics = await this.metricsRepository.get(this.simulationId);

            // Update attractor parameters
            if (newParameters.b !== undefined || newParameters.dt !== undefined) {
                attractor.updateParameters(
                    newParameters.b || attractor.b, 
                    newParameters.dt || attractor.dt
                );
                
                // Reset Lyapunov spectrum when parameters change
                const spectrum = await this.lyapunovRepository.get(this.simulationId);
                spectrum.reset();
                await this.lyapunovRepository.save(this.simulationId, spectrum);

                // Update metrics parameter
                if (newParameters.b !== undefined) {
                    metrics.updateParameterB(newParameters.b);
                    metrics.reset();
                }
            }

            // Reset if new seed provided
            if (newParameters.seed !== undefined) {
                attractor.reset(newParameters.seed);
            }

            // Save updated state
            await this.attractorRepository.save(this.simulationId, attractor);
            await this.metricsRepository.save(this.simulationId, metrics);

            this.eventBus.emit('simulation.parameters.updated', {
                simulationId: this.simulationId,
                newParameters
            });

            return { status: 'parameters_updated', newParameters };

        } catch (error) {
            this.eventBus.emit('simulation.error', { 
                simulationId: this.simulationId, 
                error: error.message 
            });
            throw error;
        }
    }

    async _runTransientPhase(attractor, transientSteps) {
        this.eventBus.emit('simulation.transient.started', { 
            simulationId: this.simulationId, 
            steps: transientSteps 
        });

        for (let i = 0; i < transientSteps; i++) {
            attractor.step();
            
            // Emit progress every 100 steps
            if (i % 100 === 0) {
                this.eventBus.emit('simulation.transient.progress', {
                    simulationId: this.simulationId,
                    step: i,
                    total: transientSteps,
                    progress: i / transientSteps
                });
            }
        }

        this.eventBus.emit('simulation.transient.completed', { 
            simulationId: this.simulationId 
        });
    }

    _generateSimulationId() {
        return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get simulation statistics
     */
    async getSimulationStatistics() {
        if (!this.simulationId) {
            throw new Error('No active simulation');
        }

        const spectrum = await this.lyapunovRepository.get(this.simulationId);
        const metrics = await this.metricsRepository.get(this.simulationId);

        return {
            simulationId: this.simulationId,
            lyapunovStatistics: spectrum.getStatistics(),
            chaosAnalysis: metrics.getAnalysisResults()
        };
    }
}