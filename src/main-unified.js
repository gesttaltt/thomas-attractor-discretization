/**
 * Unified Thomas Attractor Application
 * Integrates all features: GPU rendering, floral projection, export, presets, CTM analysis
 */

import { bootstrapUnifiedApplication } from './bootstrap/UnifiedApplicationBootstrap.js';

class UnifiedThomasAttractorApp {
    constructor() {
        this.application = null;
        this.isRunning = false;
        this.animationFrameId = null;
        this.stepInterval = null;
        
        // UI elements
        this.canvases = {};
        this.controls = {};
        this.hudElements = {};
        this.panels = {};
        
        // State
        this.currentPreset = null;
        this.showFloralPanel = true;
        this.performanceMode = 'auto';
        this.lastPerformanceCheck = Date.now();
    }

    async init() {
        try {
            console.log('🎯 Initializing Unified Thomas Attractor Application...');
            
            // Initialize DOM elements
            this.initializeDOM();
            
            // Bootstrap unified application
            this.application = await bootstrapUnifiedApplication({
                mainCanvas: this.canvases.main,
                floralCanvas: this.canvases.floral,
                debug: true,
                mode: 'development',
                maxParticles: 120000,
                enableGPU: true,
                enableExport: true,
                enablePresets: true,
                enableCTM: true,
                enableSweep: true,
                defaultB: 0.19,
                defaultDt: 0.005,
                transientSteps: 50, // Fast startup
                visualization: {
                    particleSize: 0.012,
                    autoRotate: true,
                    rotationSpeed: 0.3,
                    cameraDistance: 18
                },
                floral: {
                    projectionPlane: 'xy',
                    bufferSize: 15000,
                    fadeRate: 0.08
                }
            });

            // Setup all UI handlers
            this.setupEventHandlers();
            this.setupPerformanceMonitoring();
            
            // Load presets
            await this.loadPresets();
            
            // Set initial status
            this.updateStatus('Ready');
            this.updatePresetHUD('Default');
            
            // Auto-start with default configuration
            await this.startSimulation();
            
            console.log('✅ Unified application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize unified application:', error);
            this.updateStatus('Error');
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    initializeDOM() {
        // Get canvases
        this.canvases.main = document.getElementById('mainCanvas');
        this.canvases.floral = document.getElementById('floralCanvas');
        
        if (!this.canvases.main) {
            throw new Error('Main canvas element not found');
        }

        // Setup canvas sizing
        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());

        // Get controls
        this.controls = {
            // Parameters
            bSlider: document.getElementById('bSlider'),
            bValue: document.getElementById('bValue'),
            particleSizeSlider: document.getElementById('particleSizeSlider'),
            particleSizeValue: document.getElementById('particleSizeValue'),
            
            // Simulation controls
            startButton: document.getElementById('startButton'),
            pauseButton: document.getElementById('pauseButton'),
            resetButton: document.getElementById('resetButton'),
            clearButton: document.getElementById('clearButton'),
            
            // View controls
            autoRotateToggle: document.getElementById('autoRotate'),
            projectionSelect: document.getElementById('projectionPlane'),
            floralToggle: document.getElementById('floralToggle'),
            
            // Preset controls
            presetSelect: document.getElementById('presetSelect'),
            savePresetButton: document.getElementById('savePreset'),
            
            // Export controls
            exportImageButton: document.getElementById('exportImage'),
            exportDataButton: document.getElementById('exportData'),
            shareButton: document.getElementById('shareButton'),
            
            // Analysis controls
            sweepButton: document.getElementById('parameterSweep'),
            performanceSelect: document.getElementById('performanceMode')
        };

        // Get HUD elements
        this.hudElements = {
            fps: document.getElementById('fps'),
            particles: document.getElementById('particles'),
            step: document.getElementById('step'),
            ctm: document.getElementById('ctm'),
            lyapunov: document.getElementById('lyapunov'),
            dimension: document.getElementById('dimension'),
            status: document.getElementById('status'),
            preset: document.getElementById('currentPreset')
        };

        // Get panels
        this.panels = {
            floral: document.querySelector('.floral-panel'),
            controls: document.querySelector('.controls-panel'),
            analysis: document.querySelector('.analysis-panel')
        };

        // Set initial values
        this.setInitialControlValues();
    }

    setInitialControlValues() {
        if (this.controls.bSlider) {
            this.controls.bSlider.value = 0.19;
            this.controls.bValue.textContent = '0.19';
        }
        
        if (this.controls.particleSizeSlider) {
            this.controls.particleSizeSlider.value = 0.012;
            this.controls.particleSizeValue.textContent = '0.012';
        }
        
        if (this.controls.projectionSelect) {
            this.controls.projectionSelect.value = 'xy';
        }
        
        if (this.controls.floralToggle) {
            this.controls.floralToggle.checked = this.showFloralPanel;
        }
        
        if (this.controls.performanceSelect) {
            this.controls.performanceSelect.value = this.performanceMode;
        }
    }

    setupEventHandlers() {
        // Parameter controls
        if (this.controls.bSlider) {
            this.controls.bSlider.addEventListener('input', (e) => {
                const b = parseFloat(e.target.value);
                this.controls.bValue.textContent = b.toFixed(3);
                this.updateBParameter(b);
            });
        }

        if (this.controls.particleSizeSlider) {
            this.controls.particleSizeSlider.addEventListener('input', (e) => {
                const size = parseFloat(e.target.value);
                this.controls.particleSizeValue.textContent = size.toFixed(3);
                this.application.eventBus.emit('view.command', {
                    command: 'setParticleSize',
                    params: { size }
                });
            });
        }

        // Simulation controls
        if (this.controls.startButton) {
            this.controls.startButton.addEventListener('click', () => this.startSimulation());
        }

        if (this.controls.pauseButton) {
            this.controls.pauseButton.addEventListener('click', () => this.togglePause());
        }

        if (this.controls.resetButton) {
            this.controls.resetButton.addEventListener('click', () => this.resetSimulation());
        }

        if (this.controls.clearButton) {
            this.controls.clearButton.addEventListener('click', () => this.clearVisualization());
        }

        // View controls
        if (this.controls.autoRotateToggle) {
            this.controls.autoRotateToggle.addEventListener('change', (e) => {
                this.application.eventBus.emit('view.command', {
                    command: 'setAutoRotate',
                    params: { enabled: e.target.checked }
                });
            });
        }

        if (this.controls.projectionSelect) {
            this.controls.projectionSelect.addEventListener('change', (e) => {
                this.application.eventBus.emit('floral.command', {
                    command: 'setProjectionPlane',
                    params: { plane: e.target.value }
                });
            });
        }

        if (this.controls.floralToggle) {
            this.controls.floralToggle.addEventListener('change', (e) => {
                this.showFloralPanel = e.target.checked;
                this.toggleFloralPanel(this.showFloralPanel);
            });
        }

        // Preset controls
        if (this.controls.presetSelect) {
            this.controls.presetSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.applyPreset(e.target.value);
                }
            });
        }

        if (this.controls.savePresetButton) {
            this.controls.savePresetButton.addEventListener('click', () => this.saveCurrentAsPreset());
        }

        // Export controls
        if (this.controls.exportImageButton) {
            this.controls.exportImageButton.addEventListener('click', () => this.exportVisualization());
        }

        if (this.controls.exportDataButton) {
            this.controls.exportDataButton.addEventListener('click', () => this.exportData());
        }

        if (this.controls.shareButton) {
            this.controls.shareButton.addEventListener('click', () => this.createShareableLink());
        }

        // Analysis controls
        if (this.controls.sweepButton) {
            this.controls.sweepButton.addEventListener('click', () => this.performParameterSweep());
        }

        if (this.controls.performanceSelect) {
            this.controls.performanceSelect.addEventListener('change', (e) => {
                this.performanceMode = e.target.value;
                this.applyPerformanceMode(this.performanceMode);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Panel toggles
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-toggle-panel]')) {
                this.togglePanel(e.target.dataset.togglePanel);
            }
        });
    }

    setupPerformanceMonitoring() {
        this.application.eventBus.on('view.frame', (eventData) => {
            this.updateHUD(eventData.data);
        });

        this.application.eventBus.on('simulation.step', (eventData) => {
            this.updateSimulationHUD(eventData.data);
        });

        this.application.eventBus.on('application.performance', (eventData) => {
            this.handlePerformanceData(eventData.data);
        });

        this.application.eventBus.on('application.error.unhandled', (eventData) => {
            this.showError('System error: ' + eventData.data.error);
        });
    }

    async loadPresets() {
        try {
            const presets = await this.application.components.presetRepository.getPresetList();
            
            if (this.controls.presetSelect) {
                this.controls.presetSelect.innerHTML = '<option value="">Select preset...</option>';
                
                presets.forEach(preset => {
                    const option = document.createElement('option');
                    option.value = preset.id;
                    option.textContent = `${preset.name}${preset.isCustom ? ' (Custom)' : ''}`;
                    option.title = preset.description;
                    this.controls.presetSelect.appendChild(option);
                });
            }
            
            console.log('📋 Loaded', presets.length, 'presets');
            
        } catch (error) {
            console.error('Failed to load presets:', error);
        }
    }

    async startSimulation() {
        try {
            console.log('🔄 Starting simulation...');
            const b = parseFloat(this.controls.bSlider?.value || 0.19);
            console.log('📊 Using parameter b =', b);
            
            const result = await this.application.startSimulation({ b });
            console.log('✅ Simulation started:', result);
            
            this.isRunning = true;
            this.startSimulationLoop();
            
            this.updateStatus('Running');
            this.updateButtonStates();
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to start simulation:', error);
            console.error('Stack trace:', error.stack);
            this.showError('Failed to start simulation: ' + error.message);
        }
    }

    startSimulationLoop() {
        if (!this.isRunning) return;
        
        console.log('🎬 Starting simulation loop...');

        this.stepInterval = setInterval(async () => {
            if (this.isRunning) {
                try {
                    await this.application.simulateSteps(3); // Fewer steps for better balance
                } catch (error) {
                    console.error('❌ Simulation step error:', error);
                    console.error('Stack trace:', error.stack);
                    this.pauseSimulation();
                }
            }
        }, 16); // ~60 FPS
    }

    async togglePause() {
        if (this.isRunning) {
            await this.pauseSimulation();
        } else {
            await this.resumeSimulation();
        }
    }

    async pauseSimulation() {
        this.isRunning = false;
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }
        
        try {
            await this.application.components.simulationUseCase.pauseSimulation();
            this.updateStatus('Paused');
            this.updateButtonStates();
        } catch (error) {
            console.error('Failed to pause simulation:', error);
        }
    }

    async resumeSimulation() {
        try {
            await this.application.components.simulationUseCase.resumeSimulation();
            this.isRunning = true;
            this.startSimulationLoop();
            this.updateStatus('Running');
            this.updateButtonStates();
        } catch (error) {
            console.error('Failed to resume simulation:', error);
        }
    }

    async resetSimulation() {
        try {
            await this.application.components.simulationUseCase.stopSimulation();
            this.clearVisualization();
            
            this.isRunning = false;
            if (this.stepInterval) {
                clearInterval(this.stepInterval);
                this.stepInterval = null;
            }
            
            this.updateStatus('Reset');
            this.updateButtonStates();
            this.clearHUD();
            
        } catch (error) {
            console.error('Failed to reset simulation:', error);
        }
    }

    clearVisualization() {
        this.application.eventBus.emit('view.command', { command: 'clearParticles' });
        this.application.eventBus.emit('floral.command', { command: 'clear' });
    }

    async applyPreset(presetId) {
        try {
            const preset = await this.application.applyPreset(presetId);
            this.currentPreset = presetId;
            
            // Update UI controls to match preset
            if (this.controls.bSlider && preset.model) {
                this.controls.bSlider.value = preset.model.b;
                this.controls.bValue.textContent = preset.model.b.toFixed(3);
            }
            
            if (this.controls.projectionSelect && preset.projection) {
                this.controls.projectionSelect.value = preset.projection.plane;
            }
            
            if (this.controls.presetSelect) {
                this.controls.presetSelect.value = presetId;
            }
            
            this.updatePresetHUD(preset.name || preset.description || presetId);
            
            console.log('📋 Applied preset:', presetId);
            
        } catch (error) {
            console.error('Failed to apply preset:', error);
            this.showError('Failed to apply preset: ' + error.message);
        }
    }

    async saveCurrentAsPreset() {
        const name = prompt('Enter preset name:');
        if (!name) return;
        
        const description = prompt('Enter preset description (optional):') || '';
        
        try {
            const currentState = this.application.getCurrentState();
            const preset = await this.application.components.presetRepository.createCustomPreset(
                name,
                description,
                currentState
            );
            
            // Reload presets dropdown
            await this.loadPresets();
            
            console.log('💾 Saved custom preset:', name);
            this.showNotification('Preset saved successfully!');
            
        } catch (error) {
            console.error('Failed to save preset:', error);
            this.showError('Failed to save preset: ' + error.message);
        }
    }

    async exportVisualization() {
        try {
            const result = await this.application.exportVisualization({
                format: 'png',
                includeOverlays: this.showFloralPanel
            });
            
            console.log('🖼️ Exported visualization:', result.filename);
            this.showNotification('Image exported successfully!');
            
        } catch (error) {
            console.error('Failed to export visualization:', error);
            this.showError('Export failed: ' + error.message);
        }
    }

    async exportData() {
        try {
            const format = 'json'; // Could be made configurable
            const result = await this.application.exportData(format);
            
            console.log('📄 Exported data:', result.filename);
            this.showNotification('Data exported successfully!');
            
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Export failed: ' + error.message);
        }
    }

    async createShareableLink() {
        try {
            const url = await this.application.createShareableLink();
            
            // Try to copy to clipboard
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                this.showNotification('Shareable link copied to clipboard!');
            } else {
                // Fallback: show in a prompt
                prompt('Shareable link (copy manually):', url);
            }
            
            console.log('🔗 Created shareable link:', url);
            
        } catch (error) {
            console.error('Failed to create shareable link:', error);
            this.showError('Failed to create link: ' + error.message);
        }
    }

    async performParameterSweep() {
        const confirmed = confirm('Parameter sweep will analyze multiple b values. This may take a while. Continue?');
        if (!confirmed) return;

        try {
            this.updateStatus('Analyzing...');
            this.controls.sweepButton.disabled = true;
            
            const result = await this.application.performParameterSweep({
                bMin: 0.1,
                bMax: 0.3,
                bSteps: 30,
                analysisSteps: 10000
            });
            
            console.log('📊 Parameter sweep completed:', result.results.length, 'points');
            
            // Export results
            await this.application.components.exportAdapter.exportCSV(
                result.results,
                `parameter_sweep_${Date.now()}.csv`
            );
            
            this.showNotification('Parameter sweep completed and exported!');
            
        } catch (error) {
            console.error('Parameter sweep failed:', error);
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.controls.sweepButton.disabled = false;
            this.updateStatus(this.isRunning ? 'Running' : 'Paused');
        }
    }

    async updateBParameter(b) {
        try {
            const state = await this.application.components.simulationUseCase.getSimulationState();
            if (state.status !== 'idle') {
                await this.application.components.simulationUseCase.updateParameters({ b });
                this.clearVisualization();
            }
        } catch (error) {
            console.error('Failed to update B parameter:', error);
        }
    }

    applyPerformanceMode(mode) {
        let maxParticles;
        
        switch (mode) {
            case 'low':
                maxParticles = 30000;
                break;
            case 'medium':
                maxParticles = 80000;
                break;
            case 'high':
                maxParticles = 150000;
                break;
            case 'ultra':
                maxParticles = 250000;
                break;
            default:
                return; // Auto mode - no manual override
        }
        
        this.application.eventBus.emit('view.command', {
            command: 'updateOptions',
            params: { maxParticles }
        });
        
        console.log('🎮 Applied performance mode:', mode, '- Max particles:', maxParticles);
    }

    toggleFloralPanel(show) {
        if (this.panels.floral) {
            this.panels.floral.style.display = show ? 'block' : 'none';
        }
        if (this.canvases.floral) {
            this.canvases.floral.style.display = show ? 'block' : 'none';
        }
    }

    togglePanel(panelName) {
        const panel = this.panels[panelName];
        if (panel) {
            panel.classList.toggle('collapsed');
        }
    }

    updateHUD(frameData) {
        if (this.hudElements.fps) {
            this.hudElements.fps.textContent = frameData.fps || 0;
        }
        
        if (this.hudElements.particles) {
            this.hudElements.particles.textContent = (frameData.particleCount || 0).toLocaleString();
        }
    }

    updateSimulationHUD(simulationData) {
        if (this.hudElements.step) {
            this.hudElements.step.textContent = (simulationData.step || 0).toLocaleString();
        }
        
        if (this.hudElements.ctm) {
            this.hudElements.ctm.textContent = (simulationData.ctm || 0).toFixed(4);
        }
        
        if (this.hudElements.lyapunov && simulationData.lyapunovExponents) {
            const largest = Math.max(...simulationData.lyapunovExponents);
            this.hudElements.lyapunov.textContent = largest.toFixed(4);
        }
        
        if (this.hudElements.dimension && simulationData.kaplanYorkeDimension) {
            this.hudElements.dimension.textContent = simulationData.kaplanYorkeDimension.toFixed(3);
        }
    }

    updateStatus(status) {
        if (this.hudElements.status) {
            this.hudElements.status.textContent = status;
            this.hudElements.status.className = `status ${status.toLowerCase()}`;
        }
    }

    updatePresetHUD(presetName) {
        if (this.hudElements.preset) {
            this.hudElements.preset.textContent = presetName;
        }
    }

    updateButtonStates() {
        if (this.controls.startButton) {
            this.controls.startButton.disabled = this.isRunning;
        }
        
        if (this.controls.pauseButton) {
            this.controls.pauseButton.disabled = false;
            this.controls.pauseButton.textContent = this.isRunning ? 'Pause' : 'Resume';
        }
    }

    clearHUD() {
        if (this.hudElements.step) this.hudElements.step.textContent = '0';
        if (this.hudElements.ctm) this.hudElements.ctm.textContent = '0.0000';
        if (this.hudElements.lyapunov) this.hudElements.lyapunov.textContent = '0.0000';
        if (this.hudElements.dimension) this.hudElements.dimension.textContent = '0.000';
    }

    handlePerformanceData(performanceData) {
        // Auto performance adjustment
        if (this.performanceMode === 'auto') {
            const now = Date.now();
            if (now - this.lastPerformanceCheck > 5000) { // Check every 5 seconds
                if (performanceData.avgFPS < 25) {
                    this.applyPerformanceMode('medium');
                    console.log('🔧 Auto-adjusted to medium performance due to low FPS');
                } else if (performanceData.avgFPS > 55) {
                    this.applyPerformanceMode('high');
                }
                this.lastPerformanceCheck = now;
            }
        }
    }

    handleKeyPress(e) {
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePause();
                break;
            case 'KeyR':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.resetSimulation();
                }
                break;
            case 'KeyC':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.clearVisualization();
                }
                break;
            case 'KeyE':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.exportVisualization();
                }
                break;
            case 'KeyS':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.createShareableLink();
                }
                break;
        }
    }

    resizeCanvases() {
        // Main canvas
        if (this.canvases.main) {
            const container = this.canvases.main.parentElement;
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            this.canvases.main.width = rect.width * dpr;
            this.canvases.main.height = rect.height * dpr;
            this.canvases.main.style.width = rect.width + 'px';
            this.canvases.main.style.height = rect.height + 'px';
        }
        
        // Floral canvas
        if (this.canvases.floral) {
            const rect = this.canvases.floral.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            this.canvases.floral.width = rect.width * dpr;
            this.canvases.floral.height = rect.height * dpr;
            this.canvases.floral.style.width = rect.width + 'px';
            this.canvases.floral.style.height = rect.height + 'px';
        }
    }

    showError(message) {
        console.error(message);
        if (this.hudElements.status) {
            this.updateStatus('Error');
        }
        // Could implement a toast notification system here
    }

    showNotification(message) {
        console.log('ℹ️', message);
        // Could implement a toast notification system here
    }

    async dispose() {
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
        }
        
        if (this.application) {
            await this.application.dispose();
        }
        
        window.removeEventListener('resize', this.resizeCanvases);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new UnifiedThomasAttractorApp();
    window.unifiedThomasApp = app; // For debugging
    
    try {
        await app.init();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: red;">
                <h1>Failed to initialize application: ${error.message}</h1>
            </div>
        `;
    }
});

// Handle page unload
window.addEventListener('beforeunload', async () => {
    if (window.unifiedThomasApp) {
        await window.unifiedThomasApp.dispose();
    }
});