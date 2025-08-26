# Dependency Injection Container

## Overview

The Thomas Flower Visualizer uses a custom Dependency Injection (DI) container to manage component dependencies, ensuring loose coupling and testability.

## DIContainer Implementation

### Core Features

```javascript
class DIContainer {
    constructor() {
        this.services = new Map();      // Service factories
        this.singletons = new Map();    // Singleton instances
        this.configurations = new Map(); // Configuration objects
    }
    
    // Register service factory
    register(name, factory, options = {}) {
        this.services.set(name, { factory, options });
    }
    
    // Register singleton
    registerSingleton(name, instance) {
        this.singletons.set(name, instance);
    }
    
    // Register configuration
    registerConfig(name, config) {
        this.configurations.set(name, config);
    }
    
    // Resolve dependency
    resolve(name) {
        // Check singletons first
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        // Check configurations
        if (this.configurations.has(name)) {
            return this.configurations.get(name);
        }
        
        // Create from factory
        if (this.services.has(name)) {
            const { factory, options } = this.services.get(name);
            const instance = factory(this);
            
            if (options.singleton) {
                this.singletons.set(name, instance);
            }
            
            return instance;
        }
        
        throw new Error(`Service '${name}' not registered`);
    }
}
```

## Registration Patterns

### 1. Factory Registration

```javascript
// Register with factory function
container.register('thomasAttractor', (container) => {
    const config = container.resolve('config');
    return new ThomasAttractor({
        b: config.b,
        dt: config.dt,
        seed: config.seed
    });
});

// Lazy instantiation - created when first resolved
const attractor = container.resolve('thomasAttractor');
```

### 2. Singleton Registration

```javascript
// Option 1: Register singleton instance directly
const eventBus = new EventBus();
container.registerSingleton('eventBus', eventBus);

// Option 2: Factory with singleton option
container.register('eventBus', 
    () => new EventBus(), 
    { singleton: true }
);

// Same instance returned every time
const bus1 = container.resolve('eventBus');
const bus2 = container.resolve('eventBus');
console.log(bus1 === bus2); // true
```

### 3. Configuration Registration

```javascript
// Register configuration objects
container.registerConfig('config', {
    b: 0.19,
    dt: 0.01,
    steps: 300000,
    particleCount: 50000
});

// Access throughout application
const config = container.resolve('config');
```

## Dependency Resolution

### Automatic Dependency Injection

```javascript
// Register dependencies
container.register('repository', () => new InMemoryRepository());
container.register('eventBus', () => new EventBus(), { singleton: true });

// Register service with dependencies
container.register('simulationUseCase', (container) => {
    return new SimulationUseCase(
        container.resolve('thomasAttractor'),
        container.resolve('repository'),
        container.resolve('eventBus')
    );
});

// Dependencies automatically resolved
const useCase = container.resolve('simulationUseCase');
```

### Circular Dependency Prevention

```javascript
class DIContainer {
    constructor() {
        this.resolving = new Set(); // Track resolution chain
    }
    
    resolve(name) {
        if (this.resolving.has(name)) {
            throw new Error(`Circular dependency detected: ${name}`);
        }
        
        this.resolving.add(name);
        try {
            // ... resolution logic
            return instance;
        } finally {
            this.resolving.delete(name);
        }
    }
}
```

## Application Bootstrap

### Container Configuration

```javascript
// UnifiedApplicationBootstrap.js
configureContainer() {
    const container = new DIContainer();
    
    // 1. Register configurations
    container.registerConfig('config', {
        b: 0.19,
        dt: 0.01,
        integrationMethod: 'RK4'
    });
    
    // 2. Register core services
    container.register('eventBus', 
        () => new EventBus(), 
        { singleton: true }
    );
    
    // 3. Register domain entities
    container.register('thomasAttractor', (c) => 
        new ThomasAttractor(c.resolve('config'))
    );
    
    container.register('lyapunovSpectrum', (c) =>
        new LyapunovSpectrum(c.resolve('thomasAttractor'))
    );
    
    // 4. Register repositories
    container.register('metricsRepository', 
        () => new InMemoryMetricsRepository(),
        { singleton: true }
    );
    
    // 5. Register use cases
    container.register('simulationUseCase', (c) =>
        new SimulationUseCase(
            c.resolve('thomasAttractor'),
            c.resolve('metricsRepository'),
            c.resolve('eventBus')
        )
    );
    
    // 6. Register controllers
    container.register('simulationController', (c) =>
        new SimulationController(
            c.resolve('eventBus'),
            c.resolve('simulationUseCase')
        )
    );
    
    return container;
}
```

### Initialization Flow

```javascript
async initializeApplication() {
    // 1. Configure container
    const container = this.configureContainer();
    
    // 2. Initialize async components
    const presetRepo = container.resolve('presetRepository');
    await presetRepo.init();
    
    // 3. Initialize controllers
    const controllers = [
        container.resolve('simulationController'),
        container.resolve('hudController'),
        container.resolve('presetController')
    ];
    
    for (const controller of controllers) {
        await controller.init();
    }
    
    // 4. Start application
    const app = container.resolve('application');
    await app.start();
}
```

## Testing with DI

### Mock Injection

```javascript
// Test setup
const testContainer = new DIContainer();

// Register mocks
testContainer.registerSingleton('eventBus', {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
});

testContainer.registerSingleton('repository', {
    save: jest.fn(),
    get: jest.fn()
});

// Test with mocks
const useCase = new SimulationUseCase(
    testContainer.resolve('attractor'),
    testContainer.resolve('repository'),
    testContainer.resolve('eventBus')
);
```

### Isolated Testing

```javascript
describe('SimulationController', () => {
    let container;
    let controller;
    
    beforeEach(() => {
        container = new DIContainer();
        
        // Minimal test configuration
        container.registerConfig('config', { b: 0.19 });
        container.registerSingleton('eventBus', new EventBus());
        container.register('simulationUseCase', () => mockUseCase);
        
        controller = new SimulationController(
            container.resolve('eventBus'),
            container.resolve('simulationUseCase')
        );
    });
    
    test('should start simulation', async () => {
        await controller.handleStartSimulation();
        expect(mockUseCase.start).toHaveBeenCalled();
    });
});
```

## Best Practices

### 1. Registration Order
```javascript
// Register in dependency order
// 1. Configurations first
container.registerConfig('config', config);

// 2. Core services
container.register('eventBus', ...);

// 3. Domain entities
container.register('attractor', ...);

// 4. Infrastructure
container.register('repository', ...);

// 5. Application services
container.register('useCase', ...);

// 6. Presentation layer
container.register('controller', ...);
```

### 2. Naming Conventions
```javascript
// Use consistent naming
container.register('thomasAttractor', ...);      // Domain entity
container.register('metricsRepository', ...);    // Repository
container.register('simulationUseCase', ...);    // Use case
container.register('hudController', ...);        // Controller
container.register('exportAdapter', ...);        // Adapter
```

### 3. Lifecycle Management
```javascript
// Singleton for stateful services
container.register('eventBus', factory, { singleton: true });
container.register('repository', factory, { singleton: true });

// New instance for stateless services
container.register('exporter', factory); // New instance each time
```

### 4. Configuration Validation
```javascript
container.register('thomasAttractor', (c) => {
    const config = c.resolve('config');
    
    // Validate configuration
    if (!config.b || config.b <= 0) {
        throw new Error('Invalid b parameter');
    }
    
    return new ThomasAttractor(config);
});
```

## Troubleshooting

### Common Issues

1. **Service not registered**
```javascript
// Check registration before resolution
if (!container.has('serviceName')) {
    container.register('serviceName', ...);
}
```

2. **Circular dependencies**
```javascript
// Avoid by using event bus for communication
// Instead of direct dependencies
```

3. **Initialization order**
```javascript
// Use async initialization
await container.resolve('asyncService').init();
```

## Advanced Patterns

### Decorator Pattern
```javascript
container.register('attractor', (c) => {
    const base = new ThomasAttractor(c.resolve('config'));
    return new LoggingDecorator(base); // Add logging
});
```

### Factory Pattern
```javascript
container.register('attractorFactory', () => {
    return {
        create: (type) => {
            switch(type) {
                case 'thomas': return new ThomasAttractor();
                case 'lorenz': return new LorenzAttractor();
            }
        }
    };
});
```

---

*For architectural context, see [System Architecture](./overview.md) and [SOLID Principles](./solid-principles.md)*