/**
 * Simulation Controller
 * SOLID Principles: Single Responsibility for simulation UI controls
 * Handles start/stop/pause, parameter controls, and simulation state display
 */

import { UIController } from './UIController.js';

export class SimulationController extends UIController {
    constructor(eventBus, application, options = {}) {
        super(eventBus, options);
        this.application = application;
        this.simulationState = {
            isRunning: false,
            isPaused: false,
            currentStep: 0,
            parameters: { b: 0.19, dt: 0.005 }
        };
    }

    /**
     * Define element selectors for simulation controls
     */
    getElementSelectors() {
        return {
            // Control buttons
            startButton: '#startButton',
            pauseButton: '#pauseButton', 
            stopButton: '#stopButton',
            resetButton: '#resetButton',
            clearButton: '#clearButton',
            
            // Parameter controls
            bSlider: '#bSlider',
            bValue: '#bValue',
            dtSlider: '#dtSlider',
            dtValue: '#dtValue',
            particleSizeSlider: '#particleSizeSlider',
            particleSizeValue: '#particleSizeValue',
            
            // Speed controls
            speedSlider: '#speedSlider',
            speedValue: '#speedValue',
            
            // View controls
            autoRotateToggle: '#autoRotate',
            projectionSelect: '#projectionPlane'
        };
    }

    /**
     * Define DOM event bindings
     */
    getEventBindings() {
        return {
            startButton: {
                'click': this.handleStartSimulation
            },
            pauseButton: {
                'click': this.handlePauseSimulation
            },
            stopButton: {
                'click': this.handleStopSimulation
            },
            resetButton: {
                'click': this.handleResetSimulation
            },
            clearButton: {
                'click': this.handleClearVisualization
            },
            bSlider: {
                'input': this.handleBParameterChange,
                'change': this.handleBParameterCommit
            },
            dtSlider: {
                'input': this.handleDtParameterChange,
                'change': this.handleDtParameterCommit
            },
            particleSizeSlider: {
                'input': this.handleParticleSizeChange
            },
            speedSlider: {
                'input': this.handleSpeedChange
            },
            autoRotateToggle: {
                'change': this.handleAutoRotateToggle
            },
            projectionSelect: {
                'change': this.handleProjectionChange
            }
        };
    }

    /**
     * Define event bus subscriptions
     */
    getEventBusSubscriptions() {
        return {
            'simulation.started': this.onSimulationStarted,
            'simulation.paused': this.onSimulationPaused,
            'simulation.resumed': this.onSimulationResumed,
            'simulation.stopped': this.onSimulationStopped,
            'simulation.step': this.onSimulationStep,
            'simulation.error': this.onSimulationError,
            'view.frame': this.onViewFrame
        };
    }

    /**
     * Required elements validation
     */
    isElementRequired(key) {
        const required = ['startButton', 'pauseButton', 'bSlider', 'bValue'];
        return required.includes(key);
    }

    /**
     * Post-initialization setup
     */
    async postInit() {
        // Initialize parameter displays
        this.updateParameterDisplays();
        this.updateButtonStates();
        
        // Apply keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Setup keyboard shortcuts for simulation control
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle if no input element is focused
            if (document.activeElement.tagName !== 'INPUT') {
                switch (event.code) {
                    case 'Space':
                        event.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'KeyR':
                        event.preventDefault();
                        this.handleResetSimulation();
                        break;
                    case 'KeyC':
                        event.preventDefault();
                        this.handleClearVisualization();
                        break;
                }
            }
        });
    }

    /**
     * Start simulation handler
     */
    async handleStartSimulation(event) {
        try {
            this.setElementEnabled('startButton', false);
            this.emit('ui.simulation.starting');
            
            const result = await this.application.startSimulation(this.simulationState.parameters);
            
            this.simulationState.isRunning = true;
            this.simulationState.isPaused = false;
            this.updateButtonStates();
            
            this.emit('ui.simulation.started', { result });
            
        } catch (error) {
            this.setElementEnabled('startButton', true);
            this.emit('ui.simulation.error', { error: error.message, action: 'start' });
        }
    }

    /**
     * Pause/resume simulation handler
     */
    async handlePauseSimulation(event) {
        try {
            if (this.simulationState.isRunning && !this.simulationState.isPaused) {
                await this.application.pauseSimulation();
            } else {
                await this.application.resumeSimulation();
            }
        } catch (error) {
            this.emit('ui.simulation.error', { error: error.message, action: 'pause' });
        }
    }

    /**
     * Stop simulation handler
     */
    async handleStopSimulation(event) {
        try {
            await this.application.stopSimulation();
            
            this.simulationState.isRunning = false;
            this.simulationState.isPaused = false;
            this.simulationState.currentStep = 0;
            this.updateButtonStates();
            
            this.emit('ui.simulation.stopped');
            
        } catch (error) {
            this.emit('ui.simulation.error', { error: error.message, action: 'stop' });
        }
    }

    /**
     * Reset simulation handler
     */
    async handleResetSimulation(event) {
        try {
            await this.application.resetSimulation();
            
            this.simulationState.currentStep = 0;
            this.emit('ui.simulation.reset');
            
        } catch (error) {
            this.emit('ui.simulation.error', { error: error.message, action: 'reset' });
        }
    }

    /**
     * Clear visualization handler
     */
    async handleClearVisualization(event) {
        this.emit('view.command', {
            command: 'clearParticles'
        });
    }

    /**
     * B parameter change handler (real-time)
     */
    handleBParameterChange(event) {
        const b = parseFloat(event.target.value);
        this.simulationState.parameters.b = b;
        this.updateElement('bValue', b.toFixed(3));
        
        // Real-time preview
        this.emit('ui.parameter.preview', { parameter: 'b', value: b });
    }

    /**
     * B parameter commit handler (apply changes)
     */
    async handleBParameterCommit(event) {
        try {
            const b = parseFloat(event.target.value);
            await this.application.updateParameters({ b });
            
            this.emit('ui.parameter.changed', { parameter: 'b', value: b });
            
        } catch (error) {
            this.emit('ui.simulation.error', { error: error.message, action: 'updateParameter' });
        }
    }

    /**
     * Dt parameter change handler
     */
    handleDtParameterChange(event) {
        const dt = parseFloat(event.target.value);
        this.simulationState.parameters.dt = dt;
        this.updateElement('dtValue', dt.toFixed(4));
    }

    /**
     * Dt parameter commit handler
     */
    async handleDtParameterCommit(event) {
        try {
            const dt = parseFloat(event.target.value);
            await this.application.updateParameters({ dt });
            
            this.emit('ui.parameter.changed', { parameter: 'dt', value: dt });
            
        } catch (error) {
            this.emit('ui.simulation.error', { error: error.message, action: 'updateParameter' });
        }
    }

    /**
     * Particle size change handler
     */
    handleParticleSizeChange(event) {
        const size = parseFloat(event.target.value);
        this.updateElement('particleSizeValue', size.toFixed(3));
        
        this.emit('view.command', {
            command: 'setParticleSize',
            params: { size }
        });
    }

    /**
     * Speed change handler
     */
    handleSpeedChange(event) {
        const speed = parseFloat(event.target.value);
        this.updateElement('speedValue', `${speed}x`);
        
        this.emit('ui.speed.changed', { speed });
    }

    /**
     * Auto-rotate toggle handler
     */
    handleAutoRotateToggle(event) {
        const enabled = event.target.checked;
        
        this.emit('view.command', {
            command: 'setAutoRotate',
            params: { enabled }
        });
    }

    /**
     * Projection plane change handler
     */
    handleProjectionChange(event) {
        const plane = event.target.value;
        
        this.emit('floral.command', {
            command: 'setProjectionPlane',
            params: { plane }
        });
    }

    /**
     * Toggle play/pause
     */
    async togglePlayPause() {
        if (!this.simulationState.isRunning) {
            await this.handleStartSimulation();
        } else {
            await this.handlePauseSimulation();
        }
    }

    /**
     * Event bus handlers
     */
    onSimulationStarted(eventData) {
        this.simulationState.isRunning = true;
        this.simulationState.isPaused = false;
        this.updateButtonStates();
    }

    onSimulationPaused(eventData) {
        this.simulationState.isPaused = true;
        this.updateButtonStates();
    }

    onSimulationResumed(eventData) {
        this.simulationState.isPaused = false;
        this.updateButtonStates();
    }

    onSimulationStopped(eventData) {
        this.simulationState.isRunning = false;
        this.simulationState.isPaused = false;
        this.simulationState.currentStep = 0;
        this.updateButtonStates();
    }

    onSimulationStep(eventData) {
        this.simulationState.currentStep = eventData.data.step || 0;
    }

    onSimulationError(eventData) {
        this.setElementEnabled('startButton', true);
        this.updateButtonStates();
    }

    onViewFrame(eventData) {
        // Update any frame-based displays if needed
    }

    /**
     * Update button states based on simulation state
     */
    updateButtonStates() {
        const { isRunning, isPaused } = this.simulationState;
        
        this.setElementEnabled('startButton', !isRunning);
        this.setElementEnabled('pauseButton', isRunning);
        this.setElementEnabled('stopButton', isRunning);
        this.setElementEnabled('resetButton', true);
        this.setElementEnabled('clearButton', true);
        
        // Update pause button text
        if (this.hasElement('pauseButton')) {
            const pauseBtn = this.getElement('pauseButton');
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        }
    }

    /**
     * Update parameter displays
     */
    updateParameterDisplays() {
        const { b, dt } = this.simulationState.parameters;
        
        if (this.hasElement('bSlider')) {
            this.getElement('bSlider').value = b;
        }
        this.updateElement('bValue', b.toFixed(3));
        
        if (this.hasElement('dtSlider')) {
            this.getElement('dtSlider').value = dt;
        }
        this.updateElement('dtValue', dt.toFixed(4));
    }

    /**
     * Get current simulation state
     */
    getSimulationState() {
        return { ...this.simulationState };
    }

    /**
     * Set simulation parameters
     */
    setParameters(parameters) {
        Object.assign(this.simulationState.parameters, parameters);
        this.updateParameterDisplays();
    }
}