/**
 * HUD (Heads-Up Display) Controller
 * SOLID Principles: Single Responsibility for status displays and metrics
 * Handles FPS, particle count, CTM, Lyapunov exponents, and other real-time data
 */

import { UIController } from './UIController.js';

export class HUDController extends UIController {
    constructor(eventBus, options = {}) {
        super(eventBus, options);
        
        this.metrics = {
            fps: 0,
            particles: 0,
            step: 0,
            ctm: 0,
            lyapunov: 0,
            dimension: 0,
            status: 'Initializing',
            preset: 'None'
        };
        
        this.updateInterval = null;
        this.formatters = this.initializeFormatters();
    }

    /**
     * Define element selectors for HUD elements
     */
    getElementSelectors() {
        return {
            // Performance metrics
            fps: '#fps',
            particles: '#particles',
            memoryUsage: '#memoryUsage',
            
            // Simulation metrics
            step: '#step',
            status: '#status',
            currentPreset: '#currentPreset',
            
            // Mathematical metrics
            ctm: '#ctm',
            lyapunov: '#lyapunov',
            dimension: '#dimension',
            
            // Secondary metrics
            lambda1: '#lambda1',
            lambda2: '#lambda2', 
            lambda3: '#lambda3',
            convergence: '#convergence',
            
            // Floral metrics
            eFlower: '#eFlower',
            fiComputed: '#fiComputed',
            rhodoneaK: '#rhodoneaK',
            rhodoneaM: '#rhodoneaM',
            
            // System info
            webglVersion: '#webglVersion',
            maxTextureSize: '#maxTextureSize',
            
            // Debug info (if enabled)
            debugInfo: '#debugInfo'
        };
    }

    /**
     * Define event bus subscriptions
     */
    getEventBusSubscriptions() {
        return {
            'view.frame': this.onViewFrame,
            'simulation.step': this.onSimulationStep,
            'simulation.started': this.onSimulationStateChange,
            'simulation.paused': this.onSimulationStateChange,
            'simulation.resumed': this.onSimulationStateChange,
            'simulation.stopped': this.onSimulationStateChange,
            'simulation.error': this.onSimulationError,
            'application.performance': this.onPerformanceUpdate,
            'preset.loaded': this.onPresetLoaded,
            'preset.changed': this.onPresetChanged,
            'chaos.analysis.updated': this.onChaosAnalysisUpdated,
            'floral.metrics.updated': this.onFloralMetricsUpdated
        };
    }

    /**
     * Initialize number formatters for different metric types
     */
    initializeFormatters() {
        return {
            fps: (value) => Math.round(value),
            particles: (value) => parseInt(value).toLocaleString(),
            step: (value) => parseInt(value).toLocaleString(),
            ctm: (value) => Number(value).toFixed(4),
            lyapunov: (value) => Number(value).toFixed(4),
            dimension: (value) => Number(value).toFixed(3),
            memory: (value) => this.formatMemory(value),
            percentage: (value) => `${Math.round(value * 100)}%`,
            scientific: (value) => Number(value).toExponential(3)
        };
    }

    /**
     * Post-initialization setup
     */
    async postInit() {
        // Start periodic update if configured
        if (this.options.updateInterval > 0) {
            this.startPeriodicUpdate();
        }
        
        // Initialize status
        this.updateStatus('Ready');
        this.updatePreset('Default');
    }

    /**
     * Start periodic HUD updates
     */
    startPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.updateAllDisplays();
        }, this.options.updateInterval);
    }

    /**
     * Stop periodic updates
     */
    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Event handlers
     */
    onViewFrame(eventData) {
        const data = eventData.data;
        
        this.metrics.fps = data.fps || 0;
        this.metrics.particles = data.particleCount || 0;
        
        this.updateFPS(this.metrics.fps);
        this.updateParticleCount(this.metrics.particles);
    }

    onSimulationStep(eventData) {
        const data = eventData.data;
        
        this.metrics.step = data.step || 0;
        this.metrics.ctm = data.ctm || 0;
        
        if (data.lyapunovExponents && data.lyapunovExponents.length > 0) {
            this.metrics.lyapunov = Math.max(...data.lyapunovExponents);
            this.updateLyapunovExponents(data.lyapunovExponents);
        }
        
        if (data.kaplanYorkeDimension !== undefined) {
            this.metrics.dimension = data.kaplanYorkeDimension;
        }
        
        this.updateStep(this.metrics.step);
        this.updateCTM(this.metrics.ctm);
        this.updateDimension(this.metrics.dimension);
    }

    onSimulationStateChange(eventData) {
        const eventType = eventData.type || 'unknown';
        const statusMap = {
            'simulation.started': 'Running',
            'simulation.paused': 'Paused', 
            'simulation.resumed': 'Running',
            'simulation.stopped': 'Stopped'
        };
        
        const status = statusMap[eventType] || 'Unknown';
        this.updateStatus(status);
    }

    onSimulationError(eventData) {
        this.updateStatus('Error');
        
        if (this.options.showErrorDetails && this.hasElement('debugInfo')) {
            const errorInfo = `Error: ${eventData.data.error}`;
            this.updateElement('debugInfo', errorInfo);
        }
    }

    onPerformanceUpdate(eventData) {
        const data = eventData.data;
        
        if (data.memoryUsage) {
            this.updateMemoryUsage(data.memoryUsage);
        }
        
        if (data.webglInfo) {
            this.updateWebGLInfo(data.webglInfo);
        }
    }

    onPresetLoaded(eventData) {
        const presetName = eventData.data.name || eventData.data.id || 'Unknown';
        this.updatePreset(presetName);
    }

    onPresetChanged(eventData) {
        const presetName = eventData.data.name || eventData.data.id || 'Custom';
        this.updatePreset(presetName);
    }

    onChaosAnalysisUpdated(eventData) {
        const data = eventData.data;
        
        if (data.convergence !== undefined) {
            this.updateConvergence(data.convergence);
        }
    }

    onFloralMetricsUpdated(eventData) {
        const data = eventData.data;
        
        if (data.E_flower !== undefined) {
            this.updateEFlower(data.E_flower);
        }
        
        if (data.FI_computed !== undefined) {
            this.updateFIComputed(data.FI_computed);
        }
        
        if (data.rhodonea) {
            this.updateRhodoneaParams(data.rhodonea);
        }
    }

    /**
     * Update methods for different metrics
     */
    updateFPS(fps) {
        this.updateFormattedElement('fps', fps, 'fps');
        this.setFPSColor(fps);
    }

    updateParticleCount(count) {
        this.updateFormattedElement('particles', count, 'particles');
    }

    updateStep(step) {
        this.updateFormattedElement('step', step, 'step');
    }

    updateStatus(status) {
        this.metrics.status = status;
        this.updateElement('status', status);
        this.setStatusColor(status);
    }

    updatePreset(preset) {
        this.metrics.preset = preset;
        this.updateElement('currentPreset', preset);
    }

    updateCTM(ctm) {
        this.updateFormattedElement('ctm', ctm, 'ctm');
        this.setCTMColor(ctm);
    }

    updateLyapunovExponents(exponents) {
        if (exponents.length >= 1) {
            this.updateFormattedElement('lambda1', exponents[0], 'lyapunov');
        }
        if (exponents.length >= 2) {
            this.updateFormattedElement('lambda2', exponents[1], 'lyapunov');
        }
        if (exponents.length >= 3) {
            this.updateFormattedElement('lambda3', exponents[2], 'lyapunov');
        }
        
        // Update main display with largest exponent
        const largest = Math.max(...exponents);
        this.updateFormattedElement('lyapunov', largest, 'lyapunov');
    }

    updateDimension(dimension) {
        this.updateFormattedElement('dimension', dimension, 'dimension');
    }

    updateConvergence(convergence) {
        this.updateFormattedElement('convergence', convergence, 'percentage');
    }

    updateEFlower(eFlower) {
        this.updateFormattedElement('eFlower', eFlower, 'scientific');
    }

    updateFIComputed(fiComputed) {
        this.updateFormattedElement('fiComputed', fiComputed, 'ctm');
    }

    updateRhodoneaParams(rhodonea) {
        if (rhodonea.k !== undefined) {
            this.updateFormattedElement('rhodoneaK', rhodonea.k, 'ctm');
        }
        if (rhodonea.m !== undefined) {
            this.updateFormattedElement('rhodoneaM', rhodonea.m, 'ctm');
        }
    }

    updateMemoryUsage(usage) {
        if (typeof usage === 'number') {
            this.updateFormattedElement('memoryUsage', usage, 'memory');
        }
    }

    updateWebGLInfo(info) {
        if (info.version) {
            this.updateElement('webglVersion', info.version);
        }
        if (info.maxTextureSize) {
            this.updateElement('maxTextureSize', info.maxTextureSize.toLocaleString());
        }
    }

    /**
     * Helper methods
     */
    updateFormattedElement(key, value, formatterType) {
        const formatter = this.formatters[formatterType];
        const formattedValue = formatter ? formatter(value) : value;
        this.updateElement(key, formattedValue);
    }

    setFPSColor(fps) {
        if (!this.hasElement('fps')) return;
        
        const element = this.getElement('fps');
        element.classList.remove('fps-good', 'fps-ok', 'fps-poor');
        
        if (fps >= 50) {
            element.classList.add('fps-good');
        } else if (fps >= 30) {
            element.classList.add('fps-ok');
        } else {
            element.classList.add('fps-poor');
        }
    }

    setStatusColor(status) {
        if (!this.hasElement('status')) return;
        
        const element = this.getElement('status');
        element.classList.remove('status-running', 'status-paused', 'status-stopped', 'status-error');
        
        const statusMap = {
            'Running': 'status-running',
            'Paused': 'status-paused',
            'Stopped': 'status-stopped',
            'Error': 'status-error'
        };
        
        const className = statusMap[status];
        if (className) {
            element.classList.add(className);
        }
    }

    setCTMColor(ctm) {
        if (!this.hasElement('ctm')) return;
        
        const element = this.getElement('ctm');
        element.classList.remove('ctm-low', 'ctm-medium', 'ctm-high');
        
        if (ctm < 0.3) {
            element.classList.add('ctm-low');
        } else if (ctm < 0.7) {
            element.classList.add('ctm-medium');
        } else {
            element.classList.add('ctm-high');
        }
    }

    formatMemory(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Update all displays at once
     */
    updateAllDisplays() {
        this.updateFPS(this.metrics.fps);
        this.updateParticleCount(this.metrics.particles);
        this.updateStep(this.metrics.step);
        this.updateCTM(this.metrics.ctm);
        this.updateDimension(this.metrics.dimension);
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = {
            fps: 0,
            particles: 0,
            step: 0,
            ctm: 0,
            lyapunov: 0,
            dimension: 0,
            status: 'Ready',
            preset: 'None'
        };
        
        this.updateAllDisplays();
        this.updateStatus('Ready');
        this.updatePreset('None');
    }

    /**
     * Get default options
     */
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            updateInterval: 100, // ms
            showErrorDetails: false,
            enableColorCoding: true
        };
    }

    /**
     * Cleanup
     */
    dispose() {
        this.stopPeriodicUpdate();
        super.dispose();
    }
}