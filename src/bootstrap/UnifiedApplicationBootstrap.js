/**
 * Unified Application Bootstrap
 * Integrates all features: GPU rendering, floral projection, export, presets, CTM analysis
 */

import { container } from '../core/container/DIContainer.js';
import { EventBus } from '../core/application/services/EventBus.js';

// Domain entities
import { ThomasAttractor } from '../core/domain/entities/ThomasAttractor.js';
import { LyapunovSpectrum } from '../core/domain/entities/LyapunovSpectrum.js';
import { ChaosMetrics } from '../core/domain/entities/ChaosMetrics.js';

// Use cases
import { SimulateAttractorUseCase } from '../core/application/usecases/SimulateAttractorUseCase.js';
import { AnalyzeChaosUseCase } from '../core/application/usecases/AnalyzeChaosUseCase.js';

// Infrastructure
import { InMemoryAttractorRepository } from '../infrastructure/repositories/InMemoryAttractorRepository.js';
import { InMemoryLyapunovRepository } from '../infrastructure/repositories/InMemoryLyapunovRepository.js';
import { InMemoryMetricsRepository } from '../infrastructure/repositories/InMemoryMetricsRepository.js';
import { PresetRepository } from '../infrastructure/repositories/PresetRepository.js';
import { ExportAdapter } from '../infrastructure/adapters/ExportAdapter.js';

// Presentation
import { AttractorVisualizationView } from '../presentation/views/AttractorVisualizationView.js';
import { FloralProjectionView } from '../presentation/views/FloralProjectionView.js';

export class UnifiedApplicationBootstrap {
    constructor() {
        this.isInitialized = false;
        this.eventBus = null;
        this.applicationInstance = null;
    }

    /**
     * Configure and bootstrap the unified application
     */
    async bootstrap(options = {}) {
        try {
            console.log('🚀 Starting Thomas Attractor Unified Application...');
            
            // Configure container with all features
            await this.configureContainer(options);
            
            // Initialize unified application
            this.applicationInstance = await this.initializeApplication();
            
            // Setup global error handling
            this.setupErrorHandling();
            
            // Load initial configuration from URL or defaults
            await this.loadInitialConfiguration();
            
            this.isInitialized = true;
            
            console.log('✅ Unified application bootstrap completed successfully');
            this.eventBus.emit('application.unified.bootstrap.completed', {
                timestamp: Date.now(),
                configuration: options,
                features: this.getEnabledFeatures()
            });
            
            return this.applicationInstance;
            
        } catch (error) {
            console.error('❌ Unified application bootstrap failed:', error);
            throw error;
        }
    }

    /**
     * Configure dependency injection container with all features
     */
    async configureContainer(options) {
        console.log('⚙️ Configuring unified dependency injection container...');
        
        // Event Bus (singleton)
        this.eventBus = new EventBus();
        container
            .registerInstance('eventBus', this.eventBus)
            .setEventBus(this.eventBus);

        // Repositories
        container
            .registerSingleton('attractorRepository', InMemoryAttractorRepository)
            .registerSingleton('lyapunovRepository', InMemoryLyapunovRepository)
            .registerSingleton('metricsRepository', InMemoryMetricsRepository)
            .registerSingleton('presetRepository', PresetRepository);

        // Infrastructure adapters
        container
            .registerSingleton('exportAdapter', ExportAdapter, {
                dependencies: ['eventBus']
            });

        // Use Cases
        container
            .registerSingleton('simulateAttractorUseCase', SimulateAttractorUseCase, {
                dependencies: ['attractorRepository', 'lyapunovRepository', 'metricsRepository', 'eventBus']
            })
            .registerSingleton('analyzeChaosUseCase', AnalyzeChaosUseCase, {
                dependencies: ['attractorRepository', 'lyapunovRepository', 'metricsRepository', 'eventBus']
            });

        // Views
        if (options.mainCanvas) {
            container.registerFactory('visualizationView', (config) => {
                return new AttractorVisualizationView(
                    options.mainCanvas, 
                    config.eventBus, 
                    options.visualization || {}
                );
            }, {
                dependencies: ['eventBus']
            });
        }

        if (options.floralCanvas) {
            container.registerFactory('floralProjectionView', (config) => {
                return new FloralProjectionView(
                    options.floralCanvas,
                    config.eventBus,
                    options.floral || {}
                );
            }, {
                dependencies: ['eventBus']
            });
        }

        // Unified configuration
        container.registerConfiguration('app', {
            version: '2.0.0-unified',
            mode: options.mode || 'production',
            debug: options.debug || false,
            features: {
                gpuRendering: options.enableGPU !== false,
                floralProjection: !!options.floralCanvas,
                exportFunctionality: options.enableExport !== false,
                presetSystem: options.enablePresets !== false,
                ctmAnalysis: options.enableCTM !== false,
                parameterSweep: options.enableSweep !== false
            },
            performance: {
                maxParticles: options.maxParticles || 100000,
                targetFPS: options.targetFPS || 60,
                enableGPU: options.enableGPU !== false,
                adaptiveQuality: options.adaptiveQuality !== false
            },
            simulation: {
                defaultB: options.defaultB || 0.19,
                defaultDt: options.defaultDt || 0.005,
                defaultSeed: options.defaultSeed || [0.1, 0.0, 0.0],
                transientSteps: options.transientSteps || 100
            },
            visualization: {
                particleSize: options.particleSize || 0.012,
                autoRotate: options.autoRotate !== false,
                rotationSpeed: options.rotationSpeed || 0.3,
                cameraDistance: options.cameraDistance || 20
            },
            floral: {
                projectionPlane: options.projectionPlane || 'xy',
                bufferSize: options.floralBufferSize || 10000,
                fadeRate: options.floralFadeRate || 0.1
            }
        });

        // Validate container
        const validation = container.validate();
        if (!validation.isValid) {
            throw new Error(`Container validation failed: ${validation.errors.join(', ')}`);
        }

        console.log('✅ Unified container configured successfully');
    }

    /**
     * Initialize the unified application
     */
    async initializeApplication() {
        console.log('🏗️ Initializing unified application components...');
        
        const app = new UnifiedThomasAttractorApplication();
        await app.initialize();
        return app;
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.eventBus.emit('application.error.unhandled', {
                type: 'unhandled_rejection',
                error: event.reason,
                timestamp: Date.now()
            });
            console.error('Unhandled promise rejection:', event.reason);
        });

        // General errors
        window.addEventListener('error', (event) => {
            this.eventBus.emit('application.error.general', {
                type: 'general_error',
                error: event.error,
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                timestamp: Date.now()
            });
        });

        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastPerformanceLog = Date.now();

        this.eventBus.on('view.frame', (eventData) => {
            frameCount++;
            
            // Log performance every 5 seconds
            if (frameCount % 300 === 0) {
                const now = Date.now();
                const elapsed = now - lastPerformanceLog;
                const avgFPS = (frameCount * 1000) / elapsed;
                
                this.eventBus.emit('application.performance', {
                    avgFPS: avgFPS,
                    frameCount: frameCount,
                    particleCount: eventData.data.particleCount,
                    memoryUsage: performance.memory ? {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit
                    } : null
                });
                
                lastPerformanceLog = now;
                frameCount = 0;
            }
        });
    }

    /**
     * Load initial configuration from URL parameters or presets
     */
    async loadInitialConfiguration() {
        try {
            const exportAdapter = await container.resolve('exportAdapter');
            const presetRepository = await container.resolve('presetRepository');

            // Try to import state from URL
            const importedState = exportAdapter.importFromURL();
            
            if (importedState) {
                console.log('📥 Loaded configuration from URL');
                this.eventBus.emit('application.config.imported', { source: 'url', state: importedState });
                return importedState;
            }

            // Fall back to default preset
            const defaultPreset = await presetRepository.get('canonical_xy');
            console.log('📋 Loaded default preset configuration');
            this.eventBus.emit('application.config.loaded', { source: 'default', preset: defaultPreset });
            
            return defaultPreset;

        } catch (error) {
            console.warn('⚠️ Failed to load initial configuration:', error);
            return null;
        }
    }

    /**
     * Get list of enabled features
     */
    getEnabledFeatures() {
        const config = container.configurations.get('app');
        return config ? config.features : {};
    }

    /**
     * Shutdown unified application gracefully
     */
    async shutdown() {
        if (!this.isInitialized) return;
        
        console.log('🔌 Shutting down unified application...');
        
        try {
            // Dispose application
            if (this.applicationInstance && this.applicationInstance.dispose) {
                await this.applicationInstance.dispose();
            }
            
            // Dispose container
            await container.disposeAll();
            
            this.eventBus.emit('application.unified.shutdown.completed', {
                timestamp: Date.now()
            });
            
            console.log('✅ Unified application shutdown completed');
            
        } catch (error) {
            console.error('❌ Error during unified shutdown:', error);
            throw error;
        }
    }

    /**
     * Get unified application statistics
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            features: this.getEnabledFeatures(),
            container: container.getStats(),
            eventBus: this.eventBus ? this.eventBus.debug() : null,
            performance: {
                timestamp: Date.now(),
                uptime: this.isInitialized ? Date.now() - this.isInitialized : 0
            }
        };
    }
}

/**
 * Unified Thomas Attractor Application
 */
class UnifiedThomasAttractorApplication {
    constructor() {
        this.isInitialized = false;
        this.components = {};
        this.config = null;
        this.eventBus = null;
        this.currentState = null;
    }

    async initialize() {
        console.log('🔧 Initializing Unified Thomas Attractor application...');
        
        try {
            // Resolve all dependencies
            console.log('📦 Resolving eventBus...');
            this.eventBus = await container.resolve('eventBus');
            console.log('📦 Resolving config...');
            this.config = await container.resolve('app');
            
            // Core use cases
            console.log('📦 Resolving simulationUseCase...');
            this.components.simulationUseCase = await container.resolve('simulateAttractorUseCase');
            console.log('📦 Resolving analysisUseCase...');
            this.components.analysisUseCase = await container.resolve('analyzeChaosUseCase');
            console.log('📦 Resolving presetRepository...');
            this.components.presetRepository = await container.resolve('presetRepository');
            console.log('📦 Resolving exportAdapter...');
            this.components.exportAdapter = await container.resolve('exportAdapter');
        } catch (error) {
            console.error('❌ Failed to resolve dependency:', error);
            throw error;
        }
        
        // Views (if available)
        if (container.services.has('visualizationView')) {
            this.components.visualizationView = await container.resolve('visualizationView');
            this.components.exportAdapter.registerCanvas('main', this.components.visualizationView.canvas);
        }
        
        if (container.services.has('floralProjectionView')) {
            this.components.floralProjectionView = await container.resolve('floralProjectionView');
            this.components.exportAdapter.registerCanvas('floral', this.components.floralProjectionView.canvas);
        }

        // Setup unified event listeners
        this.setupEventListeners();
        
        // Initialize current state
        this.currentState = this.getDefaultState();
        
        this.isInitialized = true;
        this.eventBus.emit('application.unified.initialized', { 
            timestamp: Date.now(),
            components: Object.keys(this.components),
            features: this.config.features
        });
        
        console.log('✅ Unified Thomas Attractor application initialized');
    }

    setupEventListeners() {
        // Simulation events
        this.eventBus.on('simulation.started', (eventData) => {
            console.log('🚀 Unified simulation started');
        });

        this.eventBus.on('simulation.error', (eventData) => {
            console.error('❌ Unified simulation error:', eventData.data.error);
        });

        // Analysis events
        this.eventBus.on('analysis.sweep.completed', (eventData) => {
            console.log('📊 Parameter sweep completed:', eventData.data.results.length, 'points');
        });

        // Export events
        this.eventBus.on('export.image.completed', (eventData) => {
            console.log('🖼️ Image export completed:', eventData.data.filename);
        });

        this.eventBus.on('export.json.completed', (eventData) => {
            console.log('📄 Data export completed:', eventData.data.filename);
        });

        // Performance monitoring
        this.eventBus.on('application.performance', (eventData) => {
            const perf = eventData.data;
            if (perf.avgFPS < 30) {
                console.warn('⚠️ Performance degradation detected:', perf.avgFPS, 'FPS');
                this.handlePerformanceIssue(perf);
            }
        });
    }

    // Unified API methods combining all features

    async startSimulation(parameters = {}) {
        const params = {
            ...this.config.simulation,
            ...parameters
        };

        const result = await this.components.simulationUseCase.startSimulation(params);
        this.updateCurrentState({ simulation: params });
        return result;
    }

    async simulateSteps(stepCount = 1) {
        return await this.components.simulationUseCase.simulateSteps(stepCount);
    }

    async applyPreset(presetId) {
        const preset = await this.components.presetRepository.apply(presetId);
        
        // Apply to all components
        await this.startSimulation(preset.model);
        
        if (this.components.floralProjectionView && preset.projection) {
            this.eventBus.emit('floral.command', {
                command: 'setProjectionPlane',
                params: { plane: preset.projection.plane }
            });
        }
        
        if (preset.rhodonea) {
            this.eventBus.emit('floral.command', {
                command: 'setRhodoneaParams',
                params: preset.rhodonea
            });
        }
        
        if (preset.visualization) {
            this.eventBus.emit('view.command', {
                command: 'updateOptions',
                params: preset.visualization
            });
        }

        this.updateCurrentState({ currentPreset: presetId, ...preset });
        return preset;
    }

    async performParameterSweep(parameters) {
        return await this.components.analysisUseCase.performParameterSweep(parameters);
    }

    async exportVisualization(options = {}) {
        const exportOptions = {
            canvasName: 'main',
            includeOverlays: this.components.floralProjectionView ? true : false,
            ...options
        };
        
        return await this.components.exportAdapter.exportImage(exportOptions);
    }

    async exportData(format = 'json') {
        const data = this.getExportData();
        
        switch (format) {
            case 'json':
                return await this.components.exportAdapter.exportJSON(data);
            case 'csv':
                if (Array.isArray(data)) {
                    return await this.components.exportAdapter.exportCSV(data);
                }
                throw new Error('CSV export requires array data');
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    async createShareableLink() {
        const state = this.getCurrentState();
        return this.components.exportAdapter.createShareableLink(state);
    }

    // Unified state management

    getDefaultState() {
        return {
            version: this.config.version,
            simulation: this.config.simulation,
            visualization: this.config.visualization,
            floral: this.config.floral,
            currentPreset: null,
            timestamp: Date.now()
        };
    }

    getCurrentState() {
        return {
            ...this.currentState,
            timestamp: Date.now()
        };
    }

    updateCurrentState(updates) {
        this.currentState = {
            ...this.currentState,
            ...updates,
            lastModified: Date.now()
        };
        
        this.eventBus.emit('application.state.updated', {
            state: this.getCurrentState()
        });
    }

    getExportData() {
        return {
            ...this.getCurrentState(),
            statistics: this.getUnifiedStats(),
            floralData: this.components.floralProjectionView ? 
                this.components.floralProjectionView.exportData() : null
        };
    }

    getUnifiedStats() {
        const stats = {
            application: {
                version: this.config.version,
                uptime: Date.now() - (this.isInitialized || Date.now()),
                features: this.config.features
            }
        };

        if (this.components.visualizationView) {
            stats.visualization = this.components.visualizationView.getStats();
        }

        if (this.components.floralProjectionView) {
            stats.floral = this.components.floralProjectionView.getStats();
        }

        return stats;
    }

    handlePerformanceIssue(performanceData) {
        // Adaptive quality reduction
        if (this.config.performance.adaptiveQuality) {
            if (performanceData.avgFPS < 20) {
                this.eventBus.emit('view.command', {
                    command: 'updateOptions',
                    params: { maxParticles: Math.floor(this.config.performance.maxParticles * 0.7) }
                });
                console.log('🔧 Reduced particle count for better performance');
            }
        }
    }

    async dispose() {
        console.log('🧹 Disposing unified application components...');
        
        // Stop simulation
        if (this.components.simulationUseCase) {
            try {
                await this.components.simulationUseCase.stopSimulation();
            } catch (error) {
                console.warn('Warning during simulation stop:', error);
            }
        }
        
        // Dispose views
        if (this.components.visualizationView) {
            this.components.visualizationView.dispose();
        }
        
        if (this.components.floralProjectionView) {
            this.components.floralProjectionView.dispose();
        }
        
        this.eventBus.emit('application.unified.disposed', { timestamp: Date.now() });
    }
}

/**
 * Simple metrics repository for DI
 */
class InMemoryMetricsRepository {
    constructor() {
        this.metrics = new Map();
    }

    async create(parameterB) {
        return new ChaosMetrics(parameterB);
    }

    async save(id, metrics) {
        this.metrics.set(id, metrics);
        return id;
    }

    async get(id) {
        if (!this.metrics.has(id)) {
            throw new Error(`Metrics with id ${id} not found`);
        }
        return this.metrics.get(id);
    }

    async delete(id) {
        return this.metrics.delete(id);
    }
}

/**
 * Convenience function to bootstrap unified application
 */
export async function bootstrapUnifiedApplication(options = {}) {
    const bootstrap = new UnifiedApplicationBootstrap();
    return await bootstrap.bootstrap(options);
}