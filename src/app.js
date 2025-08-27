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
        
        this.components = {};
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Thomas Attractor Visualization...');
            
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
                this.renderer3D = new Renderer3D(this.config.mainCanvas, {
                    maxParticles: this.config.maxParticles,
                    particleSize: 0.012,
                    autoRotate: true,
                    enableVolumetricEffects: this.config.enableVolumetricEffects
                });
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
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    handleParameterChange(params) {
        // Update attractor parameters
        if (params.b !== undefined) {
            this.attractor.setB(params.b);
        }
        if (params.dt !== undefined) {
            this.attractor.setDt(params.dt);
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
                const color = new THREE.Color(params.particleColor);
                this.renderer3D.particles.material.color = color;
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
    }

    handleVolumetricChange(params) {
        console.log('Volumetric change:', params);
        if (!this.renderer3D) return;
        
        // Toggle main volumetric effects
        if (params.enableVolumetric !== undefined) {
            this.renderer3D.config.enableVolumetricEffects = params.enableVolumetric;
            if (params.enableVolumetric && !this.renderer3D.volumetricEffects) {
                this.renderer3D.setupVolumetricEffects();
            } else if (!params.enableVolumetric && this.renderer3D.volumetricEffects) {
                this.renderer3D.volumetricEffects.dispose();
                this.renderer3D.volumetricEffects = null;
                return; // Exit early if disabling
            }
        }
        
        const effects = this.renderer3D.volumetricEffects;
        if (effects && effects.config) {
            // Toggle specific effects
            if (params.densityClouds !== undefined) {
                effects.config.enableDensityClouds = params.densityClouds;
                if (effects.effects.densityClouds) {
                    effects.effects.densityClouds.mesh.visible = params.densityClouds;
                }
            }
            
            if (params.velocityGlow !== undefined) {
                effects.config.enableVelocityGlow = params.velocityGlow;
                if (effects.effects.velocityGlow) {
                    effects.effects.velocityGlow.mesh.visible = params.velocityGlow;
                }
            }
            
            if (params.energyField !== undefined) {
                effects.config.enableEnergyField = params.energyField;
                if (effects.effects.energyField) {
                    effects.effects.energyField.mesh.visible = params.energyField;
                }
            }
            
            if (params.vorticityRibbons !== undefined) {
                effects.config.enableVorticity = params.vorticityRibbons;
                if (effects.effects.vorticityRibbons) {
                    effects.effects.vorticityRibbons.mesh.visible = params.vorticityRibbons;
                }
            }
            
            if (params.phaseFlow !== undefined) {
                effects.config.enablePhaseFlow = params.phaseFlow;
                if (effects.effects.phaseFlowLines) {
                    effects.effects.phaseFlowLines.lines.forEach(line => {
                        line.visible = params.phaseFlow;
                    });
                }
            }
            
            // Update opacity values
            if (params.cloudsOpacity !== undefined && effects.effects.densityClouds) {
                effects.effects.densityClouds.material.uniforms.opacity.value = params.cloudsOpacity;
            }
            
            if (params.glowOpacity !== undefined && effects.effects.velocityGlow) {
                effects.effects.velocityGlow.material.uniforms.intensity.value = params.glowOpacity;
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

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.thomasApp = new ThomasAttractorApp();
    });
} else {
    window.thomasApp = new ThomasAttractorApp();
}