/**
 * Comprehensive Error Handling System
 * Provides robust error boundaries, recovery strategies, and monitoring
 */

// Custom error types
export class ValidationError extends Error {
    constructor(message, field = null, value = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
        this.timestamp = Date.now();
    }
}

export class RenderError extends Error {
    constructor(message, component = null) {
        super(message);
        this.name = 'RenderError';
        this.component = component;
        this.timestamp = Date.now();
    }
}

export class MemoryError extends Error {
    constructor(message, requiredBytes = 0, availableBytes = 0) {
        super(message);
        this.name = 'MemoryError';
        this.requiredBytes = requiredBytes;
        this.availableBytes = availableBytes;
        this.timestamp = Date.now();
    }
}

export class WebGLError extends Error {
    constructor(message, errorCode = null) {
        super(message);
        this.name = 'WebGLError';
        this.errorCode = errorCode;
        this.timestamp = Date.now();
    }
}

/**
 * Error Boundary System
 */
export class ErrorBoundary {
    constructor(config = {}) {
        this.config = {
            maxErrors: 50,
            errorWindow: 60000, // 1 minute window for error rate
            enableLogging: true,
            enableRecovery: true,
            notifyUser: true,
            ...config
        };
        
        this.errorLog = [];
        this.errorHandlers = new Map();
        this.fallbackStrategies = new Map();
        this.recoveryStrategies = new Map();
        this.componentStates = new Map();
        
        this.setupDefaultHandlers();
    }

    setupDefaultHandlers() {
        // Validation errors
        this.registerHandler(ValidationError, (error, context) => {
            console.warn(`Validation failed for ${error.field}: ${error.message}`);
            return this.handleValidationError(error, context);
        });

        // Render errors
        this.registerHandler(RenderError, (error, context) => {
            console.error(`Render error in ${error.component}: ${error.message}`);
            return this.handleRenderError(error, context);
        });

        // Memory errors
        this.registerHandler(MemoryError, (error, context) => {
            console.error(`Memory error: ${error.message}`);
            return this.handleMemoryError(error, context);
        });

        // WebGL errors
        this.registerHandler(WebGLError, (error, context) => {
            console.error(`WebGL error: ${error.message}`);
            return this.handleWebGLError(error, context);
        });

        // Generic errors
        this.registerHandler(Error, (error, context) => {
            console.error(`Unhandled error: ${error.message}`);
            return this.handleGenericError(error, context);
        });
    }

    registerHandler(errorType, handler) {
        this.errorHandlers.set(errorType.name, handler);
    }

    registerFallback(component, fallbackFunction) {
        this.fallbackStrategies.set(component, fallbackFunction);
    }

    registerRecovery(component, recoveryFunction) {
        this.recoveryStrategies.set(component, recoveryFunction);
    }

    handle(error, component = 'unknown', context = {}) {
        try {
            // Log the error
            this.logError(error, component, context);
            
            // Check error rate
            if (this.isErrorRateTooHigh()) {
                return this.handleCriticalState(component);
            }
            
            // Get appropriate handler
            const handler = this.getHandler(error);
            
            if (handler) {
                const result = handler(error, { component, ...context });
                
                // Try recovery if enabled
                if (this.config.enableRecovery && !result.success) {
                    return this.attemptRecovery(error, component, context);
                }
                
                return result;
            }
            
            // No specific handler, try fallback
            return this.executeFallback(component, context);
            
        } catch (handlingError) {
            console.error('Error in error handler:', handlingError);
            return this.lastResort(component);
        }
    }

    getHandler(error) {
        // Try specific error type first
        let handler = this.errorHandlers.get(error.constructor.name);
        
        if (!handler) {
            // Try parent classes
            let proto = Object.getPrototypeOf(error);
            while (proto && !handler) {
                handler = this.errorHandlers.get(proto.constructor.name);
                proto = Object.getPrototypeOf(proto);
            }
        }
        
        return handler;
    }

    logError(error, component, context) {
        const errorEntry = {
            timestamp: Date.now(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            component,
            context,
            recovered: false
        };
        
        this.errorLog.push(errorEntry);
        
        // Trim old errors
        const cutoff = Date.now() - this.config.errorWindow;
        this.errorLog = this.errorLog.filter(e => e.timestamp > cutoff);
        
        if (this.config.enableLogging) {
            console.group(`Error in ${component}`);
            console.error('Error:', error);
            console.log('Context:', context);
            console.groupEnd();
        }
    }

    isErrorRateTooHigh() {
        const recentErrors = this.errorLog.filter(
            e => Date.now() - e.timestamp < 5000 // Last 5 seconds
        );
        
        return recentErrors.length > 10;
    }

    handleValidationError(error, context) {
        // Try to use default value
        if (context.defaultValue !== undefined) {
            console.log(`Using default value for ${error.field}`);
            return {
                success: true,
                value: context.defaultValue,
                message: `Validation failed, using default: ${context.defaultValue}`
            };
        }
        
        // Try to sanitize
        if (context.sanitize) {
            const sanitized = context.sanitize(error.value);
            return {
                success: true,
                value: sanitized,
                message: `Value sanitized: ${sanitized}`
            };
        }
        
        return {
            success: false,
            message: error.message
        };
    }

    handleRenderError(error, context) {
        const component = error.component || context.component;
        
        // Try to disable the problematic component
        if (this.componentStates.has(component)) {
            this.componentStates.set(component, 'disabled');
            console.log(`Disabled component: ${component}`);
            
            return {
                success: true,
                action: 'disabled',
                message: `Component ${component} disabled due to errors`
            };
        }
        
        // Try fallback renderer
        const fallback = this.fallbackStrategies.get(component);
        if (fallback) {
            return fallback(context);
        }
        
        return {
            success: false,
            message: `Render failed for ${component}`
        };
    }

    handleMemoryError(error, context) {
        console.warn('Memory pressure detected, attempting to free resources');
        
        // Try garbage collection
        if (global.gc) {
            global.gc();
        }
        
        // Notify components to reduce memory
        if (context.onMemoryPressure) {
            context.onMemoryPressure();
        }
        
        return {
            success: true,
            action: 'reduced_memory',
            message: 'Memory optimizations applied'
        };
    }

    handleWebGLError(error, context) {
        const errorCode = error.errorCode;
        
        switch (errorCode) {
            case 'CONTEXT_LOST':
                return this.handleContextLost(context);
                
            case 'OUT_OF_MEMORY':
                return this.handleWebGLMemory(context);
                
            case 'INVALID_OPERATION':
                return this.handleInvalidOperation(context);
                
            default:
                return {
                    success: false,
                    message: `WebGL error: ${error.message}`
                };
        }
    }

    handleContextLost(context) {
        console.warn('WebGL context lost, scheduling recovery');
        
        if (context.renderer) {
            setTimeout(() => {
                try {
                    context.renderer.restoreContext();
                    console.log('WebGL context restored');
                } catch (e) {
                    console.error('Failed to restore context:', e);
                }
            }, 1000);
        }
        
        return {
            success: true,
            action: 'recovering',
            message: 'WebGL context recovery scheduled'
        };
    }

    handleWebGLMemory(context) {
        if (context.renderer) {
            // Reduce texture sizes
            context.renderer.reduceTextureQuality();
            
            // Clear unused resources
            context.renderer.clearUnusedResources();
        }
        
        return {
            success: true,
            action: 'reduced_quality',
            message: 'WebGL memory optimized'
        };
    }

    handleInvalidOperation(context) {
        console.warn('WebGL invalid operation, checking state');
        
        if (context.renderer) {
            context.renderer.validateState();
        }
        
        return {
            success: false,
            message: 'WebGL state invalid'
        };
    }

    handleGenericError(error, context) {
        const fallback = this.fallbackStrategies.get(context.component);
        
        if (fallback) {
            try {
                return fallback(context);
            } catch (fallbackError) {
                console.error('Fallback failed:', fallbackError);
            }
        }
        
        return {
            success: false,
            message: `Unhandled error: ${error.message}`
        };
    }

    attemptRecovery(error, component, context) {
        const recovery = this.recoveryStrategies.get(component);
        
        if (recovery) {
            try {
                console.log(`Attempting recovery for ${component}`);
                const result = recovery(error, context);
                
                if (result.success) {
                    // Mark error as recovered
                    const lastError = this.errorLog[this.errorLog.length - 1];
                    if (lastError) {
                        lastError.recovered = true;
                    }
                }
                
                return result;
            } catch (recoveryError) {
                console.error(`Recovery failed for ${component}:`, recoveryError);
            }
        }
        
        return this.executeFallback(component, context);
    }

    executeFallback(component, context) {
        const fallback = this.fallbackStrategies.get(component);
        
        if (fallback) {
            try {
                console.log(`Executing fallback for ${component}`);
                return fallback(context);
            } catch (fallbackError) {
                console.error(`Fallback failed for ${component}:`, fallbackError);
            }
        }
        
        return this.lastResort(component);
    }

    handleCriticalState(component) {
        console.error(`Critical error rate for ${component}, entering safe mode`);
        
        // Disable all non-essential features
        this.componentStates.set(component, 'safe_mode');
        
        // Notify user if configured
        if (this.config.notifyUser) {
            this.notifyUserOfError(component, 'Critical errors detected, entering safe mode');
        }
        
        return {
            success: false,
            action: 'safe_mode',
            message: 'System in safe mode due to high error rate'
        };
    }

    lastResort(component) {
        console.error(`Last resort for ${component}`);
        
        this.componentStates.set(component, 'failed');
        
        return {
            success: false,
            action: 'failed',
            message: `Component ${component} has failed and cannot recover`
        };
    }

    notifyUserOfError(component, message) {
        // This would typically update UI
        console.warn(`USER NOTIFICATION: ${component} - ${message}`);
        
        // Emit event for UI to handle
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('error-notification', {
                detail: { component, message }
            }));
        }
    }

    getErrorReport() {
        const now = Date.now();
        const recentErrors = this.errorLog.filter(e => now - e.timestamp < 60000);
        
        const errorsByComponent = {};
        const errorsByType = {};
        
        for (const entry of recentErrors) {
            // By component
            if (!errorsByComponent[entry.component]) {
                errorsByComponent[entry.component] = 0;
            }
            errorsByComponent[entry.component]++;
            
            // By type
            const errorType = entry.error.name;
            if (!errorsByType[errorType]) {
                errorsByType[errorType] = 0;
            }
            errorsByType[errorType]++;
        }
        
        return {
            totalErrors: this.errorLog.length,
            recentErrors: recentErrors.length,
            errorRate: recentErrors.length / 60, // Errors per second
            errorsByComponent,
            errorsByType,
            recoveredCount: this.errorLog.filter(e => e.recovered).length,
            componentStates: Object.fromEntries(this.componentStates),
            criticalComponents: Array.from(this.componentStates.entries())
                .filter(([_, state]) => state === 'failed' || state === 'safe_mode')
                .map(([comp, _]) => comp)
        };
    }

    reset() {
        this.errorLog = [];
        this.componentStates.clear();
        console.log('Error boundary reset');
    }
}

/**
 * Input Validation System
 */
export class InputValidator {
    static validators = {
        number: (val) => typeof val === 'number' && !isNaN(val),
        positiveNumber: (val) => typeof val === 'number' && val > 0 && !isNaN(val),
        integer: (val) => Number.isInteger(val),
        positiveInteger: (val) => Number.isInteger(val) && val > 0,
        inRange: (min, max) => (val) => typeof val === 'number' && val >= min && val <= max,
        array: (val) => Array.isArray(val),
        nonEmptyArray: (val) => Array.isArray(val) && val.length > 0,
        string: (val) => typeof val === 'string',
        nonEmptyString: (val) => typeof val === 'string' && val.length > 0,
        boolean: (val) => typeof val === 'boolean',
        object: (val) => typeof val === 'object' && val !== null,
        vec2: (val) => Array.isArray(val) && val.length === 2 && val.every(v => typeof v === 'number'),
        vec3: (val) => Array.isArray(val) && val.length === 3 && val.every(v => typeof v === 'number'),
        vec4: (val) => Array.isArray(val) && val.length === 4 && val.every(v => typeof v === 'number'),
        color: (val) => typeof val === 'string' && /^#[0-9A-F]{6}$/i.test(val),
        email: (val) => typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        url: (val) => {
            try {
                new URL(val);
                return true;
            } catch {
                return false;
            }
        }
    };

    static validate(value, validator, fieldName = 'value') {
        const validatorFn = typeof validator === 'function' ? 
            validator : 
            InputValidator.validators[validator];
        
        if (!validatorFn) {
            throw new Error(`Unknown validator: ${validator}`);
        }
        
        if (!validatorFn(value)) {
            throw new ValidationError(
                `Invalid ${fieldName}: expected ${validator}, got ${JSON.stringify(value)}`,
                fieldName,
                value
            );
        }
        
        return value;
    }

    static validateObject(obj, schema) {
        const validated = {};
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            try {
                const value = obj[field];
                
                // Check required
                if (rules.required && value === undefined) {
                    throw new ValidationError(`Missing required field: ${field}`, field);
                }
                
                // Skip optional undefined fields
                if (value === undefined && !rules.required) {
                    if (rules.default !== undefined) {
                        validated[field] = rules.default;
                    }
                    continue;
                }
                
                // Validate type
                if (rules.type) {
                    InputValidator.validate(value, rules.type, field);
                }
                
                // Custom validator
                if (rules.validator) {
                    InputValidator.validate(value, rules.validator, field);
                }
                
                // Sanitize if provided
                if (rules.sanitize) {
                    validated[field] = rules.sanitize(value);
                } else {
                    validated[field] = value;
                }
                
            } catch (error) {
                if (rules.optional) {
                    validated[field] = rules.default;
                } else {
                    errors.push(error);
                }
            }
        }
        
        if (errors.length > 0) {
            throw new ValidationError(
                `Validation failed: ${errors.map(e => e.message).join(', ')}`,
                'object',
                obj
            );
        }
        
        return validated;
    }

    static sanitize(value, type, defaultValue = null) {
        try {
            switch (type) {
                case 'number':
                    const num = Number(value);
                    return isNaN(num) ? defaultValue : num;
                    
                case 'integer':
                    const int = Math.floor(Number(value));
                    return isNaN(int) ? defaultValue : int;
                    
                case 'positiveNumber':
                    const posNum = Math.abs(Number(value));
                    return isNaN(posNum) ? defaultValue : posNum;
                    
                case 'positiveInteger':
                    const posInt = Math.floor(Math.abs(Number(value)));
                    return isNaN(posInt) ? defaultValue : posInt;
                    
                case 'boolean':
                    return Boolean(value);
                    
                case 'string':
                    return String(value);
                    
                case 'array':
                    return Array.isArray(value) ? value : defaultValue || [];
                    
                case 'object':
                    return typeof value === 'object' && value !== null ? value : defaultValue || {};
                    
                default:
                    return value ?? defaultValue;
            }
        } catch {
            return defaultValue;
        }
    }

    static clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    static clampArray(arr, min, max) {
        return arr.map(v => InputValidator.clamp(v, min, max));
    }
}

/**
 * Health Monitoring System
 */
export class HealthMonitor {
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            checkInterval: 1000, // Check every second
            metricsWindow: 60, // Keep 60 samples
            thresholds: {
                minFPS: 20,
                maxMemoryMB: 500,
                maxErrorRate: 5, // Errors per minute
                maxFrameTime: 50, // ms
                maxUpdateTime: 30 // ms
            },
            autoRecover: true,
            ...config
        };
        
        this.metrics = {
            fps: [],
            frameTime: [],
            updateTime: [],
            memoryUsage: [],
            errorCount: [],
            gcCount: []
        };
        
        this.status = 'healthy';
        this.checkTimer = null;
        this.lastCheck = performance.now();
        this.frameCount = 0;
    }

    start() {
        if (this.checkTimer) {
            return; // Already running
        }
        
        console.log('Health monitoring started');
        
        this.lastCheck = performance.now();
        this.checkTimer = setInterval(() => this.performCheck(), this.config.checkInterval);
        
        // Monitor frame updates
        if (this.app.update) {
            const originalUpdate = this.app.update.bind(this.app);
            this.app.update = () => {
                const startTime = performance.now();
                originalUpdate();
                this.recordFrameTime(performance.now() - startTime);
            };
        }
    }

    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            console.log('Health monitoring stopped');
        }
    }

    recordFrameTime(frameTime) {
        this.metrics.frameTime.push(frameTime);
        if (this.metrics.frameTime.length > this.config.metricsWindow) {
            this.metrics.frameTime.shift();
        }
        this.frameCount++;
    }

    performCheck() {
        const now = performance.now();
        const deltaTime = now - this.lastCheck;
        this.lastCheck = now;
        
        // Calculate FPS
        const fps = this.frameCount / (deltaTime / 1000);
        this.metrics.fps.push(fps);
        if (this.metrics.fps.length > this.config.metricsWindow) {
            this.metrics.fps.shift();
        }
        this.frameCount = 0;
        
        // Check memory
        if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / 1048576;
            this.metrics.memoryUsage.push(memoryMB);
            if (this.metrics.memoryUsage.length > this.config.metricsWindow) {
                this.metrics.memoryUsage.shift();
            }
        }
        
        // Evaluate health
        this.evaluateHealth();
    }

    evaluateHealth() {
        const avgFPS = this.average(this.metrics.fps);
        const avgFrameTime = this.average(this.metrics.frameTime);
        const avgMemory = this.average(this.metrics.memoryUsage);
        
        let newStatus = 'healthy';
        const issues = [];
        
        // Check FPS
        if (avgFPS < this.config.thresholds.minFPS) {
            issues.push(`Low FPS: ${avgFPS.toFixed(1)}`);
            newStatus = 'degraded';
        }
        
        // Check frame time
        if (avgFrameTime > this.config.thresholds.maxFrameTime) {
            issues.push(`High frame time: ${avgFrameTime.toFixed(1)}ms`);
            newStatus = 'degraded';
        }
        
        // Check memory
        if (avgMemory > this.config.thresholds.maxMemoryMB) {
            issues.push(`High memory: ${avgMemory.toFixed(0)}MB`);
            newStatus = 'critical';
        }
        
        // Update status
        if (newStatus !== this.status) {
            this.handleStatusChange(this.status, newStatus, issues);
            this.status = newStatus;
        }
        
        // Auto-recover if enabled
        if (this.config.autoRecover && newStatus !== 'healthy') {
            this.attemptAutoRecovery(issues);
        }
    }

    handleStatusChange(oldStatus, newStatus, issues) {
        console.log(`Health status changed: ${oldStatus} -> ${newStatus}`);
        
        if (issues.length > 0) {
            console.warn('Health issues:', issues.join(', '));
        }
        
        // Notify app
        if (this.app.onHealthChange) {
            this.app.onHealthChange(newStatus, issues);
        }
        
        // Emit event
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('health-status-change', {
                detail: { oldStatus, newStatus, issues }
            }));
        }
    }

    attemptAutoRecovery(issues) {
        console.log('Attempting auto-recovery for:', issues.join(', '));
        
        for (const issue of issues) {
            if (issue.includes('FPS') || issue.includes('frame time')) {
                this.recoverPerformance();
            } else if (issue.includes('memory')) {
                this.recoverMemory();
            }
        }
    }

    recoverPerformance() {
        if (this.app.reduceQuality) {
            console.log('Reducing quality for better performance');
            this.app.reduceQuality();
        }
        
        if (this.app.disableEffects) {
            console.log('Disabling effects for better performance');
            this.app.disableEffects();
        }
    }

    recoverMemory() {
        if (this.app.clearCaches) {
            console.log('Clearing caches to free memory');
            this.app.clearCaches();
        }
        
        if (this.app.reduceMemoryUsage) {
            console.log('Reducing memory usage');
            this.app.reduceMemoryUsage();
        }
        
        // Try garbage collection
        if (global.gc) {
            console.log('Forcing garbage collection');
            global.gc();
        }
    }

    average(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    getReport() {
        return {
            status: this.status,
            metrics: {
                avgFPS: this.average(this.metrics.fps),
                minFPS: Math.min(...this.metrics.fps),
                maxFPS: Math.max(...this.metrics.fps),
                avgFrameTime: this.average(this.metrics.frameTime),
                avgMemoryMB: this.average(this.metrics.memoryUsage),
                peakMemoryMB: Math.max(...this.metrics.memoryUsage)
            },
            healthScore: this.calculateHealthScore(),
            uptime: Date.now() - this.startTime,
            totalFrames: this.totalFrameCount
        };
    }

    calculateHealthScore() {
        const fpsScore = Math.min(100, (this.average(this.metrics.fps) / 60) * 100);
        const frameTimeScore = Math.max(0, 100 - (this.average(this.metrics.frameTime) / this.config.thresholds.maxFrameTime) * 100);
        const memoryScore = Math.max(0, 100 - (this.average(this.metrics.memoryUsage) / this.config.thresholds.maxMemoryMB) * 100);
        
        return Math.floor((fpsScore + frameTimeScore + memoryScore) / 3);
    }
}

export default {
    ErrorBoundary,
    InputValidator,
    HealthMonitor,
    ValidationError,
    RenderError,
    MemoryError,
    WebGLError
};