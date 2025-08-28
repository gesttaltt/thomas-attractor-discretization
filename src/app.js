/**
 * Thomas Attractor Visualization Application
 * Simplified architecture without unnecessary abstractions
 */

import { ThomasAttractor } from './core/ThomasAttractor.js';
import { ChaosAnalysis } from './core/ChaosAnalysis.js';
import { PresetManager } from './core/PresetManager.js';
import { Renderer3D } from './visualization/Renderer3D.js';
import { FloralProjection } from './visualization/FloralProjection.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { ExportManager } from './utils/ExportManager.js';
import { ErrorBoundary, InputValidator, HealthMonitor } from './utils/ErrorHandling.js';

export class ThomasAttractorApp {
    constructor(config = {}) {
        this.config = {
            mainCanvas: config.mainCanvas || document.getElementById('mainCanvas'),
            floralCanvas: config.floralCanvas || document.getElementById('floralCanvas'),
            controlsContainer: config.controlsContainer || document.getElementById('controls'),
            maxParticles: config.maxParticles || 50000,
            targetFPS: config.targetFPS || 60,
            stepsPerFrame: config.stepsPerFrame || 100,  // Control trajectory speed
            defaultB: config.defaultB || 0.19,
            defaultDt: config.defaultDt || 0.005,
            ...config
        };

        this.isRunning = false;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.errorCount = 0;
        
        this.components = {};
        
        // IMPROVEMENT: Add error boundary and health monitoring
        this.errorBoundary = new ErrorBoundary();
        this.healthMonitor = new HealthMonitor(this);
        this.setupErrorHandlers();
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Thomas Attractor Visualization...');
            
            // Verify THREE.js is loaded
            if (typeof THREE === 'undefined') {
                throw new Error('THREE.js is required but not loaded');
            }
            
            // Core mathematical model
            this.attractor = new ThomasAttractor({
                b: this.config.defaultB,
                dt: this.config.defaultDt
            });
            
            // Chaos analysis
            this.chaosAnalysis = new ChaosAnalysis(this.attractor);
            
            // Preset management
            this.presetManager = new PresetManager();
            await this.presetManager.loadPresets();
            
            // 3D visualization
            if (this.config.mainCanvas) {
                console.log('Creating 3D renderer with canvas:', this.config.mainCanvas);
                try {
                    this.renderer3D = new Renderer3D(this.config.mainCanvas, {
                        maxParticles: this.config.maxParticles,
                        particleSize: 0.012,
                        autoRotate: true,
                        enableVolumetricEffects: this.config.enableVolumetricEffects
                    });
                    console.log('✅ 3D renderer created successfully');
                } catch (error) {
                    console.error('❌ Failed to create 3D renderer:', error);
                    throw error;
                }
            } else {
                console.warn('⚠️ No mainCanvas provided, skipping 3D renderer');
            }
            
            // 2D floral projection
            if (this.config.floralCanvas) {
                this.floralProjection = new FloralProjection(this.config.floralCanvas, {
                    projectionPlane: 'xy',
                    bufferSize: 10000
                });
            }
            
            // UI controls
            if (this.config.controlsContainer) {
                this.controls = new ControlPanel(this.config.controlsContainer, {
                    onParameterChange: this.handleParameterChange.bind(this),
                    onPresetSelect: this.handlePresetSelect.bind(this),
                    onExport: this.handleExport.bind(this),
                    onPlayPause: this.toggleSimulation.bind(this),
                    onVolumetricChange: this.handleVolumetricChange.bind(this)
                });
                
                // Initialize controls with default values
                this.controls.setParameters({
                    b: this.config.defaultB,
                    dt: this.config.defaultDt,
                    presets: this.presetManager.getPresetList()
                });
            }
            
            // Export functionality
            this.exportManager = new ExportManager();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Start animation loop
            this.startSimulation();
            
            // Start health monitoring
            this.healthMonitor.start();
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            // Use error boundary for recovery
            const recovery = this.errorBoundary.handle(error, 'Application', { 
                phase: 'initialization' 
            });
            
            if (!recovery.success) {
                // Try minimal mode
                console.warn('Starting in minimal mode...');
                this.startMinimalMode();
            }
        }
    }
    
    /**
     * Setup error handlers for different error types
     */
    setupErrorHandlers() {
        // WebGL context lost
        this.errorBoundary.registerHandler('WebGLContextLost', (error) => {
            console.warn('WebGL context lost, attempting recovery...');
            this.attemptWebGLRecovery();
            return { success: true, action: 'recovering' };
        });
        
        // Memory errors
        this.errorBoundary.registerHandler('RangeError', (error) => {
            if (error.message.includes('ArrayBuffer')) {
                console.warn('Memory limit reached, reducing quality...');
                this.reduceMemoryUsage();
                return { success: true, action: 'reduced_memory' };
            }
            return { success: false };
        });
        
        // Fallback strategies
        this.errorBoundary.registerFallback('Renderer3D', () => {
            console.warn('3D renderer failed, switching to 2D mode');
            this.switchTo2DMode();
            return { success: true, action: 'fallback_2d' };
        });
        
        this.errorBoundary.registerFallback('VolumetricEffects', () => {
            console.warn('Volumetric effects failed, disabling...');
            this.disableVolumetricEffects();
            return { success: true, action: 'disabled_volumetric' };
        });
    }
    
    /**
     * Start minimal mode when full initialization fails
     */
    startMinimalMode() {
        console.log('Starting minimal mode...');
        this.config.maxParticles = 1000;
        this.config.enableVolumetricEffects = false;
        
        // Try to initialize basic attractor only
        try {
            this.attractor = new ThomasAttractor({
                b: this.config.defaultB,
                dt: this.config.defaultDt
            });
            this.startSimulation();
        } catch (e) {
            console.error('Failed to start even minimal mode:', e);
        }
    }
    
    /**
     * Attempt to recover WebGL context
     */
    async attemptWebGLRecovery() {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (this.renderer3D) {
                this.renderer3D.restoreContext();
            }
        } catch (e) {
            console.error('WebGL recovery failed:', e);
        }
    }
    
    /**
     * Reduce memory usage when under pressure
     */
    reduceMemoryUsage() {
        if (this.config.maxParticles > 10000) {
            this.config.maxParticles = Math.floor(this.config.maxParticles / 2);
            console.log(`Reduced max particles to ${this.config.maxParticles}`);
        }
        
        if (this.renderer3D && this.renderer3D.volumetricEffects) {
            this.renderer3D.volumetricEffects.reduceQuality();
        }
    }
    
    /**
     * Switch to 2D mode when 3D fails
     */
    switchTo2DMode() {
        this.renderer3D = null;
        console.log('Running in 2D mode only');
    }
    
    /**
     * Disable volumetric effects
     */
    disableVolumetricEffects() {
        if (this.renderer3D) {
            this.renderer3D.disableVolumetricEffects();
        }
    }

    handleParameterChange(params) {
        try {
            console.log('Parameter change:', params);
            
            // IMPROVEMENT: Validate parameters before applying
            if (params.b !== undefined) {
                const validB = InputValidator.sanitize(params.b, 'positiveNumber', 0.19);
                this.attractor.setB(validB);
                // Update volumetric effects with new b parameter
                if (this.renderer3D && this.renderer3D.volumetricEffects) {
                    this.renderer3D.volumetricEffects.setParameter(validB);
                }
            }
            if (params.dt !== undefined) {
                const validDt = InputValidator.sanitize(params.dt, 'positiveNumber', 0.005);
                this.attractor.setDt(validDt);
            }
        
        // Update visualization parameters
        if (this.renderer3D) {
            if (params.particleSize !== undefined) {
                this.renderer3D.setParticleSize(params.particleSize);
            }
            if (params.autoRotate !== undefined) {
                this.renderer3D.setAutoRotate(params.autoRotate);
            }
            if (params.particleColor !== undefined) {
                console.log('Setting particle color to:', params.particleColor);
                if (this.renderer3D) {
                    this.renderer3D.setParticleColor(params.particleColor);
                }
            }
        }
        
        if (this.floralProjection && params.projectionPlane) {
            this.floralProjection.setProjectionPlane(params.projectionPlane);
        }
        
        // Handle reset
        if (params.reset) {
            this.attractor.reset();
            if (this.renderer3D) this.renderer3D.clear();
            if (this.floralProjection) this.floralProjection.clear();
        }
        
        } catch (error) {
            console.error('Parameter change error:', error);
            // Use error boundary for recovery
            this.errorBoundary.handle(error, 'ParameterChange', { params });
        }
    }

    handleVolumetricChange(params) {
        console.log('Volumetric change:', params);
        if (!this.renderer3D) return;
        
        // Toggle main volumetric effects - create lightweight framework only
        if (params.enableVolumetric !== undefined) {
            this.renderer3D.config.enableVolumetricEffects = params.enableVolumetric;
            if (params.enableVolumetric && !this.renderer3D.volumetricEffects) {
                // Create volumetric framework with NO effects enabled initially
                this.renderer3D.setupVolumetricEffectsLightweight();
            } else if (!params.enableVolumetric && this.renderer3D.volumetricEffects) {
                this.renderer3D.volumetricEffects.dispose();
                this.renderer3D.volumetricEffects = null;
                return; // Exit early if disabling
            }
        }
        
        const effects = this.renderer3D.volumetricEffects;
        if (effects) {
            // Toggle specific effects using the new methods
            if (params.densityClouds !== undefined) {
                if (params.densityClouds) {
                    effects.enableEffect('densityClouds');
                } else {
                    effects.disableEffect('densityClouds');
                }
            }
            
            if (params.velocityGlow !== undefined) {
                if (params.velocityGlow) {
                    effects.enableEffect('velocityGlow');
                } else {
                    effects.disableEffect('velocityGlow');
                }
            }
            
            if (params.energyField !== undefined) {
                if (params.energyField) {
                    effects.enableEffect('energyField');
                } else {
                    effects.disableEffect('energyField');
                }
            }
            
            if (params.vorticityRibbons !== undefined) {
                if (params.vorticityRibbons) {
                    effects.enableEffect('vorticityRibbons');
                } else {
                    effects.disableEffect('vorticityRibbons');
                }
            }
            
            if (params.phaseFlow !== undefined) {
                if (params.phaseFlow) {
                    effects.enableEffect('phaseFlow');
                } else {
                    effects.disableEffect('phaseFlow');
                }
            }
            
            // Update configuration values
            if (params.cloudsOpacity !== undefined) {
                effects.config.densityThreshold = params.cloudsOpacity;
                
                // Update research-grade density field threshold
                if (effects.researchDensityField) {
                    effects.researchDensityField.config.minDensityThreshold = params.cloudsOpacity;
                    console.log('🔬 Updated research density threshold to:', params.cloudsOpacity);
                }
                
                // Fallback to basic implementation
                if (effects.effects.densityClouds) {
                    effects.effects.densityClouds.material.uniforms.threshold.value = params.cloudsOpacity;
                }
            }
            
            if (params.glowOpacity !== undefined) {
                effects.config.velocityScale = params.glowOpacity;
            }
            
            if (params.energyOpacity !== undefined && effects.effects.energyField) {
                effects.effects.energyField.material.opacity = params.energyOpacity;
            }
            
            // Update colors
            if (params.cloudsColor !== undefined && effects.effects.densityClouds) {
                const color = new THREE.Color(params.cloudsColor);
                effects.effects.densityClouds.material.uniforms.colorMid.value = color;
            }
            
            if (params.energyColor !== undefined && effects.effects.energyField) {
                const color = new THREE.Color(params.energyColor);
                effects.effects.energyField.material.color = color;
            }
            
            if (params.glowColor !== undefined && effects.effects.velocityGlow) {
                const color = new THREE.Color(params.glowColor);
                effects.effects.velocityGlow.material.uniforms.color.value = color;
            }
            
            // Research-grade density field parameters  
            const researchParams = {};
            let hasResearchParams = false;
            
            if (params.kdeBandwidth !== undefined) {
                researchParams.kernelBandwidth = params.kdeBandwidth;
                hasResearchParams = true;
            }
            
            if (params.isosurfaceCount !== undefined) {
                // Generate evenly spaced isosurface levels
                const levels = [];
                const count = params.isosurfaceCount;
                for (let i = 1; i <= count; i++) {
                    levels.push(i / (count + 1));
                }
                researchParams.isosurfaceLevels = levels;
                hasResearchParams = true;
            }
            
            // Velocity field specific parameters
            const velocityParams = {};
            let hasVelocityParams = false;
            
            if (params.streamlineCount !== undefined) {
                velocityParams.streamlineCount = params.streamlineCount;
                hasVelocityParams = true;
            }
            
            if (params.lyapunovIterations !== undefined) {
                velocityParams.lyapunovIterations = params.lyapunovIterations;
                hasVelocityParams = true;
            }
            
            // Apply research parameters with proper method
            if (hasResearchParams && effects.researchDensityField) {
                effects.researchDensityField.updateParameters(researchParams);
            }
            
            if (hasVelocityParams && effects.researchVelocityField) {
                effects.researchVelocityField.updateParameters(velocityParams);
            }
            
            if (params.gridResolution !== undefined && effects.researchDensityField) {
                console.log('⚠️ Grid resolution change requires full recreation. Value:', params.gridResolution);
                // Note: This would require recreating the entire research field
            }
        }
    }

    async handlePresetSelect(presetId) {
        const preset = await this.presetManager.loadPreset(presetId);
        if (preset) {
            // Apply preset parameters
            this.attractor.setB(preset.model.b);
            this.attractor.setDt(preset.model.dt);
            
            if (preset.seed) {
                this.attractor.reset(preset.seed);
            }
            
            // Update UI
            if (this.controls) {
                this.controls.setParameters({
                    b: preset.model.b,
                    dt: preset.model.dt
                });
            }
            
            // Update visualizations
            if (this.floralProjection && preset.projection) {
                this.floralProjection.setProjectionPlane(preset.projection.plane);
                if (preset.rhodonea) {
                    this.floralProjection.setRhodoneaParams(preset.rhodonea);
                }
            }
        }
    }

    async handleExport(type) {
        switch (type) {
            case 'image':
                if (this.renderer3D) {
                    await this.exportManager.exportImage(
                        this.config.mainCanvas,
                        `thomas-attractor-${Date.now()}.png`
                    );
                }
                break;
                
            case 'data':
                const data = {
                    parameters: this.attractor.getParameters(),
                    trajectory: this.attractor.getTrajectory(1000),
                    chaos: await this.chaosAnalysis.computeMetrics(),
                    timestamp: Date.now()
                };
                await this.exportManager.exportJSON(data, `thomas-data-${Date.now()}.json`);
                break;
                
            case 'url':
                const state = {
                    b: this.attractor.b,
                    dt: this.attractor.dt,
                    seed: this.attractor.currentState
                };
                const url = this.exportManager.createShareableURL(state);
                navigator.clipboard.writeText(url);
                console.log('📋 Shareable URL copied to clipboard');
                break;
        }
    }

    startSimulation() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stopSimulation() {
        this.isRunning = false;
    }

    toggleSimulation() {
        if (this.isRunning) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
        return this.isRunning;
    }

    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        try {
            const now = performance.now();
            const deltaTime = now - this.lastTime;
            
            // Remove frame rate limiting for maximum speed
            // if (deltaTime < (1000 / this.config.targetFPS)) return;
            
            // Step the simulation - configurable speed for faster trajectory
            const points = this.attractor.step(this.config.stepsPerFrame);
            
            // Update 3D visualization
            if (this.renderer3D) {
                this.renderer3D.addPoints(points);
                this.renderer3D.render();
            }
            
            // Update 2D floral projection
            if (this.floralProjection) {
                this.floralProjection.addPoints(points);
                this.floralProjection.render();
            }
            
            // Update chaos metrics periodically (every 120 frames - adjusted for speed)
            this.frameCount++;
            if (this.frameCount % 120 === 0) {
                this.updateMetrics();
            }
            
            // Performance monitoring
            if (this.frameCount % 300 === 0) {
                const fps = 1000 / deltaTime;
                this.updatePerformance(fps);
            }
            
            this.lastTime = now;
            
        } catch (error) {
            // Handle errors in animation loop
            console.warn('Animation frame error:', error.message);
            
            // Use error boundary for recovery
            const recovery = this.errorBoundary.handle(error, 'AnimationLoop', {
                frameCount: this.frameCount
            });
            
            // If too many errors, stop animation
            if (!recovery.success && this.errorCount++ > 10) {
                console.error('Too many animation errors, stopping');
                this.stopSimulation();
            }
        }
    }

    async updateMetrics() {
        const metrics = await this.chaosAnalysis.computeQuickMetrics();
        
        if (this.controls) {
            this.controls.updateMetrics({
                lyapunov: metrics.largestLyapunov,
                ctm: metrics.ctm,
                dimension: metrics.kaplanYorke
            });
        }
    }

    updatePerformance(fps) {
        if (fps < 30 && this.config.maxParticles > 10000) {
            // Reduce particle count for better performance
            this.config.maxParticles = Math.floor(this.config.maxParticles * 0.8);
            if (this.renderer3D) {
                this.renderer3D.setMaxParticles(this.config.maxParticles);
            }
            console.log(`⚠️ Reduced particles to ${this.config.maxParticles} for better performance`);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.toggleSimulation();
                    break;
                case 'r':
                    this.attractor.reset();
                    if (this.renderer3D) this.renderer3D.clear();
                    if (this.floralProjection) this.floralProjection.clear();
                    break;
                case 'e':
                    this.handleExport('image');
                    break;
                case 's':
                    this.handleExport('url');
                    break;
            }
        });
    }

    dispose() {
        this.stopSimulation();
        
        if (this.renderer3D) {
            this.renderer3D.dispose();
        }
        
        if (this.floralProjection) {
            this.floralProjection.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            frameCount: this.frameCount,
            particleCount: this.renderer3D ? this.renderer3D.getParticleCount() : 0,
            parameters: this.attractor.getParameters(),
            performance: {
                fps: this.frameCount > 0 ? 1000 / (performance.now() - this.lastTime) : 0
            }
        };
    }
}

// Export for manual initialization only - no auto-initialization
// The index.html file handles initialization