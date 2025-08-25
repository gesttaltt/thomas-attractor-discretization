/**
 * Thomas Flower Interactive Visualizer
 * Main Application Entry Point
 */

import { ThomasAttractor, LyapunovEstimator } from './modules/attractor.js';
import { Visualization3D } from './modules/visualization.js';
import { FloralProjection } from './modules/floral.js';
import { MetricsCalculator } from './modules/metrics.js';
import { PresetManager } from './modules/presets.js';
import { UIController } from './modules/controls.js';
import { ExportManager } from './modules/export.js';

class ThomasFlowerApp {
    constructor() {
        // Core modules
        this.attractor = null;
        this.lyapunovEstimator = null;
        this.visualization = null;
        this.floralProjection = null;
        this.metrics = null;
        this.presetManager = null;
        this.uiController = null;
        this.exportManager = null;
        
        // Application state
        this.isRunning = true;
        this.isPaused = false;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.subsampleRate = 3;
        
        // Metrics history for analysis
        this.metricsHistory = [];
        this.maxHistoryLength = 1000;
        
        this.init();
    }

    async init() {
        try {
            // Show loading
            this.showLoading(true);
            
            // Initialize modules
            await this.initializeModules();
            
            // Load presets
            await this.loadPresets();
            
            // Bind UI controls
            this.setupUIBindings();
            
            // Apply default preset
            this.applyPreset('canonical_xy');
            
            // Hide loading
            this.showLoading(false);
            
            // Start animation loop
            this.animate();
            
            console.log('Thomas Flower Visualizer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize visualizer');
        }
    }

    async initializeModules() {
        // Initialize attractor
        this.attractor = new ThomasAttractor();
        this.lyapunovEstimator = new LyapunovEstimator(this.attractor);
        
        // Initialize visualization
        const mainCanvas = document.getElementById('mainCanvas');
        this.visualization = new Visualization3D(mainCanvas);
        
        // Initialize floral projection
        const floralCanvas = document.getElementById('floralCanvas');
        this.floralProjection = new FloralProjection(floralCanvas);
        
        // Initialize metrics calculator
        this.metrics = new MetricsCalculator(
            this.floralProjection,
            this.lyapunovEstimator
        );
        
        // Initialize preset manager
        this.presetManager = new PresetManager();
        
        // Initialize UI controller
        this.uiController = new UIController();
        this.uiController.init();
        
        // Initialize export manager
        this.exportManager = new ExportManager();
        this.exportManager.setCanvases(mainCanvas, floralCanvas);
    }

    async loadPresets() {
        const loaded = await this.presetManager.loadFromFile('data/thomas_flower_js_config.json');
        
        if (loaded) {
            console.log('Presets loaded from file');
        } else {
            console.log('Using default presets');
        }
        
        // Update preset dropdown
        const options = this.presetManager.getPresetOptions();
        this.uiController.updatePresetDropdown(options);
    }

    setupUIBindings() {
        // B parameter change
        this.uiController.on('bChange', (value) => {
            this.attractor.setB(value);
            this.lyapunovEstimator.reset();
            this.visualization.clearParticles();
            this.floralProjection.clear();
            this.metrics.reset();
        });
        
        // Opacity change
        this.uiController.on('opacityChange', (value) => {
            this.visualization.setOpacity(value);
        });
        
        // Projection plane change
        this.uiController.on('planeChange', (plane) => {
            this.floralProjection.setProjectionPlane(plane);
        });
        
        // Floral panel toggle
        this.uiController.on('floralToggle', (show) => {
            // Handled by UI controller
        });
        
        // Trails toggle
        this.uiController.on('trailsToggle', (show) => {
            this.visualization.setShowTrails(show);
        });
        
        // Preset change
        this.uiController.on('presetChange', (presetId) => {
            this.applyPreset(presetId);
        });
        
        // Reset view
        this.uiController.on('resetView', () => {
            this.visualization.resetCamera();
        });
        
        // Export PNG
        this.uiController.on('exportPNG', () => {
            const showFloral = document.getElementById('floralToggle').checked;
            this.exportManager.exportCombinedPNG(showFloral);
            this.uiController.showNotification('Image exported successfully');
        });
        
        // Export JSON
        this.uiController.on('exportJSON', () => {
            const data = this.getExportData();
            this.exportManager.exportJSON(data);
            this.uiController.showNotification('Data exported successfully');
        });
        
        // Pause toggle
        this.uiController.on('pauseToggle', () => {
            this.isPaused = !this.isPaused;
            this.uiController.setPauseButtonState(this.isPaused);
        });
    }

    applyPreset(presetId) {
        const preset = this.presetManager.applyPreset(presetId);
        
        // Apply model parameters
        this.attractor.b = preset.model.b;
        this.attractor.dt = preset.model.dt;
        this.attractor.transientSteps = preset.model.transient_steps;
        this.attractor.reset(preset.model.seed);
        
        // Apply projection settings
        this.floralProjection.setProjectionPlane(preset.projection.plane);
        this.floralProjection.setRhodoneaParams(preset.rhodonea);
        
        // Set preset metrics
        this.metrics.setPresetLambda(preset.metrics.lambda_max);
        
        // Reset simulation
        this.resetSimulation();
        
        // Update UI controls
        this.uiController.setControlValues({
            b: preset.model.b,
            plane: preset.projection.plane
        });
        
        console.log(`Applied preset: ${presetId}`);
    }

    resetSimulation() {
        this.attractor.reset();
        this.lyapunovEstimator.reset();
        this.visualization.clearParticles();
        this.floralProjection.clear();
        this.metrics.reset();
        this.metricsHistory = [];
        this.frameCount = 0;
    }

    simulate() {
        if (this.isPaused) return;
        
        // Run multiple integration steps per frame
        for (let i = 0; i < 10; i++) {
            // Step the attractor
            const point = this.attractor.step();
            
            // Update Lyapunov estimate
            const jacobian = this.attractor.getJacobian();
            this.lyapunovEstimator.update(jacobian);
            
            // Only process after transient
            if (this.attractor.isPastTransient()) {
                // Subsample for visualization
                if (this.attractor.currentStep % this.subsampleRate === 0) {
                    // Add to 3D visualization
                    this.visualization.addPoint(point, this.attractor.currentStep);
                    
                    // Add to floral projection
                    this.floralProjection.accumulatePolar(point);
                }
            }
        }
    }

    updateMetrics() {
        if (this.frameCount % 4 === 0) {
            // Update metrics
            const currentMetrics = this.metrics.update();
            
            // Store in history
            this.metricsHistory.push({
                timestamp: Date.now(),
                step: this.attractor.currentStep,
                ...currentMetrics
            });
            
            // Limit history size
            if (this.metricsHistory.length > this.maxHistoryLength) {
                this.metricsHistory.shift();
            }
            
            // Update FPS
            const now = performance.now();
            const delta = now - this.lastFrameTime;
            this.fps = 1000 / delta;
            this.lastFrameTime = now;
            
            // Update HUD
            this.uiController.updateHUD(
                currentMetrics,
                Math.min(this.attractor.currentStep, this.visualization.maxParticles),
                this.fps
            );
        }
    }

    drawFloralPanel() {
        const showFloral = document.getElementById('floralToggle')?.checked;
        if (showFloral && this.frameCount % 2 === 0) {
            this.floralProjection.draw();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isRunning) {
            // Run simulation
            this.simulate();
            
            // Update metrics
            this.updateMetrics();
            
            // Draw floral panel
            this.drawFloralPanel();
            
            // Render 3D visualization
            this.visualization.render();
            
            this.frameCount++;
        }
    }

    getExportData() {
        const preset = this.presetManager.getCurrentPreset();
        const currentMetrics = this.metrics.getMetrics();
        
        return {
            parameters: {
                b: this.attractor.b,
                dt: this.attractor.dt,
                projectionPlane: this.floralProjection.projectionPlane
            },
            rhodonea: this.floralProjection.rhodoneaParams,
            metrics: currentMetrics,
            simulation: {
                currentStep: this.attractor.currentStep,
                particleCount: Math.min(
                    this.attractor.currentStep,
                    this.visualization.maxParticles
                )
            },
            preset: preset ? preset.id : 'custom',
            metricsHistory: this.metricsHistory.slice(-100) // Last 100 entries
        };
    }

    showLoading(show) {
        this.uiController.showLoading(show);
    }

    showError(message) {
        console.error(message);
        this.uiController.showNotification(`Error: ${message}`, 5000);
    }

    // Public API for external control
    pause() {
        this.isPaused = true;
        this.uiController.setPauseButtonState(true);
    }

    resume() {
        this.isPaused = false;
        this.uiController.setPauseButtonState(false);
    }

    setB(value) {
        this.uiController.setControlValues({ b: value });
        this.attractor.setB(value);
        this.resetSimulation();
    }

    exportMetricsCSV() {
        this.exportManager.exportCSV(this.metricsHistory);
    }

    exportPointCloud(format = 'xyz') {
        this.exportManager.exportPointCloud(this.visualization.positions, format);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.thomasFlowerApp = new ThomasFlowerApp();
});

// Export for module usage
export { ThomasFlowerApp };