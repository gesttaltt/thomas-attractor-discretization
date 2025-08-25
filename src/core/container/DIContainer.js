/**
 * Dependency Injection Container
 * Implements SOLID principles with lifecycle management and configuration
 * Updated: 2025-08-25 21:08 - Fixed configuration resolution
 */

export class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.configurations = new Map();
        this.lifecycle = new Map();
        this.dependencies = new Map();
        this.eventBus = null;
    }

    /**
     * Register a singleton service
     */
    registerSingleton(name, constructor, config = {}) {
        this.services.set(name, {
            type: 'singleton',
            constructor: constructor,
            config: config,
            instance: null,
            dependencies: config.dependencies || []
        });
        
        this.configurations.set(name, config);
        return this;
    }

    /**
     * Register a transient service (new instance each time)
     */
    registerTransient(name, constructor, config = {}) {
        this.services.set(name, {
            type: 'transient',
            constructor: constructor,
            config: config,
            dependencies: config.dependencies || []
        });
        
        this.configurations.set(name, config);
        return this;
    }

    /**
     * Register a factory function
     */
    registerFactory(name, factoryFunction, config = {}) {
        this.factories.set(name, {
            factory: factoryFunction,
            config: config,
            dependencies: config.dependencies || []
        });
        
        return this;
    }

    /**
     * Register a pre-existing instance
     */
    registerInstance(name, instance, config = {}) {
        this.singletons.set(name, instance);
        this.services.set(name, {
            type: 'instance',
            constructor: null,
            config: config,
            instance: instance,
            dependencies: []
        });
        
        return this;
    }

    /**
     * Register configuration object
     */
    registerConfiguration(name, configObject) {
        this.configurations.set(name, configObject);
        return this;
    }

    /**
     * Resolve a service by name
     */
    async resolve(name) {
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        if (this.configurations.has(name)) {
            return this.configurations.get(name);
        }

        if (this.factories.has(name)) {
            return await this.resolveFactory(name);
        }

        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' not registered`);
        }

        const serviceDefinition = this.services.get(name);
        
        if (serviceDefinition.type === 'singleton') {
            if (serviceDefinition.instance) {
                return serviceDefinition.instance;
            }
            
            const instance = await this.createInstance(name, serviceDefinition);
            serviceDefinition.instance = instance;
            this.singletons.set(name, instance);
            
            this.emitEvent('service.created', { name, type: 'singleton' });
            return instance;
        }

        if (serviceDefinition.type === 'transient') {
            const instance = await this.createInstance(name, serviceDefinition);
            this.emitEvent('service.created', { name, type: 'transient' });
            return instance;
        }

        if (serviceDefinition.type === 'instance') {
            return serviceDefinition.instance;
        }

        throw new Error(`Unknown service type for '${name}'`);
    }

    /**
     * Resolve multiple services at once
     */
    async resolveAll(names) {
        const results = {};
        for (const name of names) {
            results[name] = await this.resolve(name);
        }
        return results;
    }

    /**
     * Create instance with dependency injection
     */
    async createInstance(name, serviceDefinition) {
        const { constructor: Constructor, config, dependencies } = serviceDefinition;
        
        if (!Constructor) {
            throw new Error(`No constructor found for service '${name}'`);
        }

        // Check for circular dependencies
        if (this.hasCircularDependency(name, new Set())) {
            throw new Error(`Circular dependency detected for service '${name}'`);
        }

        // Resolve dependencies
        const resolvedDependencies = await this.resolveDependencies(name, dependencies);
        
        // Merge configuration with resolved dependencies
        const mergedConfig = { ...config, ...resolvedDependencies };

        // Create instance
        let instance;
        if (Constructor.length === 0) {
            // No-arg constructor
            instance = new Constructor();
            
            // Inject dependencies after construction
            if (instance.inject && typeof instance.inject === 'function') {
                await instance.inject(mergedConfig);
            }
        } else {
            // Constructor with arguments
            instance = new Constructor(mergedConfig);
        }

        // Post-construction initialization
        if (instance.initialize && typeof instance.initialize === 'function') {
            await instance.initialize();
        }

        // Register lifecycle events
        this.registerLifecycleEvents(name, instance);

        return instance;
    }

    /**
     * Resolve factory
     */
    async resolveFactory(name) {
        const factoryDefinition = this.factories.get(name);
        const { factory, config, dependencies } = factoryDefinition;

        const resolvedDependencies = await this.resolveDependencies(name, dependencies);
        const mergedConfig = { ...config, ...resolvedDependencies };

        return await factory(mergedConfig);
    }

    /**
     * Resolve dependencies for a service
     */
    async resolveDependencies(serviceName, dependencies) {
        const resolved = {};
        
        for (const dependency of dependencies) {
            if (typeof dependency === 'string') {
                resolved[dependency] = await this.resolve(dependency);
            } else if (typeof dependency === 'object') {
                const { name: depName, as } = dependency;
                const resolvedDep = await this.resolve(depName);
                resolved[as || depName] = resolvedDep;
            }
        }

        return resolved;
    }

    /**
     * Check for circular dependencies
     */
    hasCircularDependency(serviceName, visited) {
        if (visited.has(serviceName)) {
            return true;
        }

        const serviceDefinition = this.services.get(serviceName);
        if (!serviceDefinition) {
            return false;
        }

        visited.add(serviceName);

        for (const dependency of serviceDefinition.dependencies) {
            const depName = typeof dependency === 'string' ? dependency : dependency.name;
            if (this.hasCircularDependency(depName, new Set(visited))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Register lifecycle events for instance
     */
    registerLifecycleEvents(name, instance) {
        const lifecycleInfo = {
            createdAt: Date.now(),
            instance: instance,
            disposed: false
        };

        this.lifecycle.set(name, lifecycleInfo);

        // Auto-dispose when appropriate
        if (instance.dispose && typeof instance.dispose === 'function') {
            process.on && process.on('exit', () => {
                this.disposeService(name);
            });
            
            // Browser environment
            if (typeof window !== 'undefined') {
                window.addEventListener('beforeunload', () => {
                    this.disposeService(name);
                });
            }
        }
    }

    /**
     * Dispose of a service
     */
    async disposeService(name) {
        const lifecycleInfo = this.lifecycle.get(name);
        if (!lifecycleInfo || lifecycleInfo.disposed) {
            return;
        }

        const { instance } = lifecycleInfo;
        
        if (instance.dispose && typeof instance.dispose === 'function') {
            try {
                await instance.dispose();
                this.emitEvent('service.disposed', { name });
            } catch (error) {
                this.emitEvent('service.dispose.error', { name, error: error.message });
            }
        }

        lifecycleInfo.disposed = true;
        this.singletons.delete(name);
    }

    /**
     * Dispose of all services
     */
    async disposeAll() {
        const disposalPromises = [];
        
        for (const name of this.lifecycle.keys()) {
            disposalPromises.push(this.disposeService(name));
        }

        await Promise.all(disposalPromises);
        
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
        this.lifecycle.clear();
        
        this.emitEvent('container.disposed', {});
    }

    /**
     * Get service information
     */
    getServiceInfo(name) {
        const serviceDefinition = this.services.get(name);
        const lifecycleInfo = this.lifecycle.get(name);
        
        return {
            name: name,
            registered: !!serviceDefinition,
            type: serviceDefinition?.type,
            hasInstance: this.singletons.has(name),
            dependencies: serviceDefinition?.dependencies || [],
            lifecycle: lifecycleInfo ? {
                createdAt: lifecycleInfo.createdAt,
                disposed: lifecycleInfo.disposed
            } : null
        };
    }

    /**
     * List all registered services
     */
    listServices() {
        return Array.from(this.services.keys()).map(name => this.getServiceInfo(name));
    }

    /**
     * Create a scoped container
     */
    createScope() {
        const scopedContainer = new DIContainer();
        
        // Copy configurations and service definitions
        for (const [name, service] of this.services) {
            scopedContainer.services.set(name, { ...service });
        }
        
        for (const [name, factory] of this.factories) {
            scopedContainer.factories.set(name, { ...factory });
        }
        
        for (const [name, config] of this.configurations) {
            scopedContainer.configurations.set(name, { ...config });
        }
        
        return scopedContainer;
    }

    /**
     * Set event bus for notifications
     */
    setEventBus(eventBus) {
        this.eventBus = eventBus;
        return this;
    }

    /**
     * Emit container events
     */
    emitEvent(eventType, data) {
        if (this.eventBus) {
            this.eventBus.emit(`container.${eventType}`, data);
        }
    }

    /**
     * Validate container configuration
     */
    validate() {
        const errors = [];
        
        // Check for unresolvable dependencies
        for (const [name, service] of this.services) {
            for (const dependency of service.dependencies) {
                const depName = typeof dependency === 'string' ? dependency : dependency.name;
                if (!this.services.has(depName) && !this.factories.has(depName)) {
                    errors.push(`Service '${name}' depends on unregistered service '${depName}'`);
                }
            }
        }

        // Check for circular dependencies
        for (const [name] of this.services) {
            if (this.hasCircularDependency(name, new Set())) {
                errors.push(`Circular dependency detected for service '${name}'`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get container statistics
     */
    getStats() {
        return {
            registeredServices: this.services.size,
            singletonInstances: this.singletons.size,
            factories: this.factories.size,
            configurations: this.configurations.size,
            activeLifecycles: this.lifecycle.size,
            memoryUsage: this._estimateMemoryUsage()
        };
    }

    _estimateMemoryUsage() {
        // Rough estimation - not precise but useful for monitoring
        return {
            services: this.services.size * 1024, // ~1KB per service definition
            singletons: this.singletons.size * 2048, // ~2KB per singleton
            configurations: this.configurations.size * 512 // ~512B per config
        };
    }
}

/**
 * Default container instance
 */
export const container = new DIContainer();