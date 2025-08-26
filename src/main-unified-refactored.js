/**
 * Unified Thomas Attractor Application - SOLID Architecture
 * Modular design with proper separation of concerns
 * Each controller handles a specific responsibility
 */

import { bootstrapUnifiedApplication } from './bootstrap/UnifiedApplicationBootstrap.js';
import { SimulationController } from './presentation/controllers/SimulationController.js';
import { HUDController } from './presentation/controllers/HUDController.js';

class UnifiedThomasAttractorApp {
    constructor() {
        this.application = null;
        this.controllers = new Map();
        this.canvases = {};
        
        this.state = {
            initialized: false,
            error: null
        };
    }

    /**
     * Initialize the application with modular controllers
     * Following SOLID principles: Single Responsibility, Dependency Injection
     */
    async init() {
        try {
            console.log('🎯 Initializing Unified Thomas Attractor Application...');
            
            // Initialize DOM elements
            this.initializeCanvases();
            
            // Bootstrap unified application (Business Logic Layer)
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
                transientSteps: 50,
                visualization: {
                    particleSize: 0.015,
                    cameraDistance: 20,
                    autoRotate: true,
                    rotationSpeed: 0.3
                },
                floral: {
                    projectionPlane: 'xy',
                    bufferSize: 10000,
                    fadeRate: 0.1
                }
            });

            // Initialize modular UI controllers (Presentation Layer)
            await this.initializeControllers();
            
            // Setup global error handling
            this.setupErrorHandling();
            
            // Setup window management
            this.setupWindowManagement();
            
            this.state.initialized = true;
            console.log('✅ Unified application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize unified application:', error);
            this.state.error = error;
            this.displayInitializationError(error);
        }
    }

    /**
     * Initialize canvas elements
     */
    initializeCanvases() {
        this.canvases.main = document.getElementById('mainCanvas');
        this.canvases.floral = document.getElementById('floralCanvas');
        
        if (!this.canvases.main) {
            throw new Error('Main canvas element not found');
        }

        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());
    }

    /**
     * Initialize modular UI controllers
     * Each controller handles a specific UI concern following Single Responsibility Principle
     */
    async initializeControllers() {
        const eventBus = this.application.eventBus;
        
        // Simulation Controls (start/stop/parameters)
        this.controllers.set('simulation', new SimulationController(eventBus, this.application, {
            debug: true
        }));

        // HUD Display (metrics, FPS, status)
        this.controllers.set('hud', new HUDController(eventBus, {
            updateInterval: 100,
            showErrorDetails: true
        }));

        // Wait for all controllers to initialize
        const initPromises = Array.from(this.controllers.values()).map(controller => 
            controller.isInitialized ? Promise.resolve() : new Promise(resolve => {
                const checkInit = () => {
                    if (controller.isInitialized) {
                        resolve();
                    } else {
                        setTimeout(checkInit, 10);
                    }
                };
                checkInit();
            })
        );

        await Promise.all(initPromises);
        console.log('✅ All UI controllers initialized');
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });

        // Global JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Global JavaScript Error:', event.error);
            this.handleGlobalError(event.error);
        });

        // Application-level errors through event bus
        this.application.eventBus.on('application.error', (eventData) => {
            this.handleApplicationError(eventData.data);
        });
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error) {
        this.application.eventBus.emit('ui.global.error', {
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
    }

    /**
     * Handle application-level errors
     */
    handleApplicationError(errorData) {
        console.error('Application Error:', errorData);
        
        // Notify HUD controller to display error
        this.application.eventBus.emit('hud.error', {
            message: errorData.error,
            context: errorData.context || 'Unknown'
        });
    }

    /**
     * Setup window management
     */
    setupWindowManagement() {
        // Canvas resizing
        window.addEventListener('resize', () => {
            this.resizeCanvases();
        });

        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            const isVisible = !document.hidden;
            this.application.eventBus.emit('app.visibility.changed', { visible: isVisible });
            
            if (isVisible) {
                console.log('🔄 Application visible - resuming operations');
            } else {
                console.log('⏸️ Application hidden - may pause operations');
            }
        });

        // Page unload cleanup
        window.addEventListener('beforeunload', () => {
            this.dispose();
        });
    }

    /**
     * Resize canvas elements
     */
    resizeCanvases() {
        // Main 3D canvas
        if (this.canvases.main) {
            const rect = this.canvases.main.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            this.canvases.main.width = rect.width * dpr;
            this.canvases.main.height = rect.height * dpr;
            this.canvases.main.style.width = rect.width + 'px';
            this.canvases.main.style.height = rect.height + 'px';
        }
        
        // Floral 2D canvas
        if (this.canvases.floral) {
            const rect = this.canvases.floral.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            this.canvases.floral.width = rect.width * dpr;
            this.canvases.floral.height = rect.height * dpr;
            this.canvases.floral.style.width = rect.width + 'px';
            this.canvases.floral.style.height = rect.height + 'px';
        }

        // Notify application of resize
        this.application.eventBus.emit('app.canvas.resized', {
            main: this.canvases.main ? {
                width: this.canvases.main.width,
                height: this.canvases.main.height
            } : null,
            floral: this.canvases.floral ? {
                width: this.canvases.floral.width,
                height: this.canvases.floral.height
            } : null
        });
    }

    /**
     * Display initialization error
     */
    displayInitializationError(error) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'initialization-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h2>🚨 Application Initialization Failed</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Possible causes:</strong></p>
                <ul>
                    <li>Missing required dependencies (Three.js)</li>
                    <li>WebGL not supported in this browser</li>
                    <li>Network connectivity issues</li>
                    <li>Browser security restrictions</li>
                </ul>
                <button onclick="location.reload()" class="retry-button">
                    🔄 Retry
                </button>
                <details class="error-details">
                    <summary>Technical Details</summary>
                    <pre>${error.stack}</pre>
                </details>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    /**
     * Get application state for debugging
     */
    getState() {
        const controllerStates = {};
        for (const [name, controller] of this.controllers) {
            controllerStates[name] = controller.getState();
        }

        return {
            initialized: this.state.initialized,
            error: this.state.error?.message || null,
            controllers: controllerStates,
            application: this.application ? {
                initialized: this.application.isInitialized,
                components: Object.keys(this.application.components || {})
            } : null
        };
    }

    /**
     * Get specific controller
     */
    getController(name) {
        return this.controllers.get(name);
    }

    /**
     * Clean up resources
     */
    async dispose() {
        console.log('🧹 Cleaning up application resources...');
        
        // Dispose controllers
        for (const [name, controller] of this.controllers) {
            try {
                controller.dispose();
                console.log(`✅ Disposed controller: ${name}`);
            } catch (error) {
                console.error(`❌ Failed to dispose controller ${name}:`, error);
            }
        }
        this.controllers.clear();
        
        // Dispose application
        if (this.application) {
            try {
                await this.application.dispose();
                console.log('✅ Disposed application');
            } catch (error) {
                console.error('❌ Failed to dispose application:', error);
            }
        }
        
        // Remove window listeners
        window.removeEventListener('resize', this.resizeCanvases);
        
        console.log('✅ Application cleanup complete');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new UnifiedThomasAttractorApp();
    window.unifiedThomasApp = app; // For debugging
    
    await app.init();
});

// Handle page unload
window.addEventListener('beforeunload', async () => {
    if (window.unifiedThomasApp) {
        await window.unifiedThomasApp.dispose();
    }
});

export { UnifiedThomasAttractorApp };