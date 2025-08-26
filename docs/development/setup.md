# Development Setup

## Prerequisites

### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Browser**: Chrome 95+, Firefox 103+, Safari 15+, or Edge 95+
- **WebGL2**: Required for GPU acceleration
- **Memory**: 8GB RAM recommended for development

### Required Software
1. **Git**: Version control
2. **Node.js**: v16+ (for development server and tools)
3. **Python**: 3.8+ (for local server alternative)
4. **Text Editor**: VS Code, WebStorm, or similar

## Quick Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd floral-index-in-attractors
```

### 2. Install Dependencies (Optional)
```bash
# For development tools (optional)
npm install -g http-server
# or
pip install -r requirements.txt  # If Python tools needed
```

### 3. Start Development Server
```bash
# Option 1: Python built-in server
python server.py
# or
python -m http.server 8002

# Option 2: Node.js server
npx http-server -p 8002 -c-1

# Option 3: Use provided scripts
./start.sh    # Linux/macOS
start.bat     # Windows
```

### 4. Open Application
Navigate to: http://localhost:8002

## Development Environment

### VS Code Setup

#### Recommended Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.live-server"
  ]
}
```

#### Settings Configuration
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "javascript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Project Structure Understanding

```
floral-index-in-attractors/
├── index-unified.html              # Main application entry
├── test-imports.html              # Module import verification
├── server.py                      # Development server
├── start.sh / start.bat          # Startup scripts
├── data/
│   └── presets.json              # Mathematical configurations
├── src/                          # Source code
│   ├── main-unified.js          # Application bootstrap
│   ├── core/                    # Business logic
│   │   ├── domain/entities/     # Mathematical models
│   │   ├── application/         # Use cases and services
│   │   └── container/          # Dependency injection
│   ├── infrastructure/          # External adapters
│   │   ├── repositories/       # Data persistence
│   │   ├── rendering/          # WebGL2 rendering
│   │   └── adapters/           # Export systems
│   ├── presentation/           # User interface
│   │   ├── controllers/        # UI controllers
│   │   └── views/              # Visualization components
│   └── bootstrap/              # Application configuration
├── docs/                        # Documentation
└── styles/                     # CSS stylesheets
```

## Development Workflow

### 1. Code Organization

#### Hexagonal Architecture Layers
- **Domain**: Pure mathematical logic (no external dependencies)
- **Application**: Use cases and orchestration
- **Infrastructure**: External systems (WebGL, storage, etc.)
- **Presentation**: User interface and controllers

#### File Naming Conventions
- **Entities**: `ThomasAttractor.js`, `LyapunovSpectrum.js`
- **Controllers**: `SimulationController.js`, `HUDController.js`
- **Repositories**: `InMemoryMetricsRepository.js`
- **Adapters**: `ExportAdapter.js`
- **Use Cases**: `SimulationUseCase.js`

### 2. Adding New Features

#### Step 1: Domain Layer
```javascript
// Example: Add new attractor type
class LorenzAttractor {
    constructor(sigma = 10, rho = 28, beta = 8/3) {
        this.sigma = sigma;
        this.rho = rho;
        this.beta = beta;
    }
    
    step(state, dt) {
        // Implement Lorenz equations
    }
    
    getJacobian(state) {
        // Return Jacobian matrix
    }
}
```

#### Step 2: Register in DI Container
```javascript
// In bootstrap/UnifiedApplicationBootstrap.js
container.register('lorenzAttractor', (c) => {
    const config = c.resolve('config');
    return new LorenzAttractor(config.sigma, config.rho, config.beta);
});
```

#### Step 3: Add UI Controls
```javascript
// Create new controller or extend existing
class AttractorSelectionController extends UIController {
    getElementSelectors() {
        return {
            attractorSelect: '#attractorType'
        };
    }
    
    handleAttractorChange() {
        // Switch attractor type
    }
}
```

### 3. Testing During Development

#### Module Import Verification
Before major changes, run:
http://localhost:8002/test-imports.html

#### Manual Testing Checklist
- [ ] Application loads without console errors
- [ ] 3D visualization renders correctly
- [ ] CTM metrics update in real-time
- [ ] Export functionality works
- [ ] Preset loading functions
- [ ] Performance remains stable (60 FPS)

#### Performance Monitoring
```javascript
// Add to development version
const performanceMonitor = {
    fps: 0,
    frameCount: 0,
    lastTime: 0,
    
    update() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            console.log(`FPS: ${this.fps}`);
        }
    }
};
```

## Debugging

### Browser DevTools

#### Console Commands
```javascript
// Access application instance
window.thomasFlowerApp

// Check DI container
window.thomasFlowerApp.container.services

// Inspect current metrics
window.thomasFlowerApp.components.chaosMetrics.computeCTM()

// Toggle debug mode
window.thomasFlowerApp.debug = true
```

#### Network Tab
- Verify all modules load (no 404 errors)
- Check Three.js CDN response
- Monitor preset JSON loading

#### Performance Tab
- Profile rendering performance
- Identify memory leaks
- Monitor garbage collection

### Common Issues

#### 1. Import Errors
```javascript
// Check module path correctness
// Ensure all exports are properly defined
export { ThomasAttractor }; // Named export
export default ThomasAttractor; // Default export
```

#### 2. DI Container Issues
```javascript
// Check registration order
// Ensure all dependencies are registered before use
if (!container.has('serviceName')) {
    throw new Error(`Service 'serviceName' not registered`);
}
```

#### 3. WebGL Context Issues
```javascript
// Check WebGL2 support
if (!canvas.getContext('webgl2')) {
    console.error('WebGL2 not supported');
}
```

#### 4. Performance Issues
- Check particle count (default: 50,000)
- Monitor memory usage in DevTools
- Profile render loop bottlenecks

## Code Style Guidelines

### JavaScript
- Use ES6+ features (modules, classes, async/await)
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names
- Add JSDoc comments for public methods

### File Organization
- One class per file
- Group related functionality in modules
- Keep files under 300 lines when possible
- Use relative imports (`./` or `../`)

### Architecture Principles
- **Single Responsibility**: Each class has one purpose
- **Dependency Injection**: Use container for dependencies
- **Event-Driven**: Communicate via EventBus
- **Immutable Configuration**: Don't modify config objects

## Advanced Development

### Adding New Mathematical Features

#### 1. Domain Entity
```javascript
class NewChaosMetric {
    constructor(attractor) {
        this.attractor = attractor;
    }
    
    compute() {
        // Mathematical computation
    }
}
```

#### 2. Repository Pattern
```javascript
class NewMetricRepository {
    async save(metric) {
        // Persistence logic
    }
    
    async getHistory() {
        // Retrieval logic
    }
}
```

#### 3. Use Case Orchestration
```javascript
class AnalysisUseCase {
    constructor(metric, repository, eventBus) {
        this.metric = metric;
        this.repository = repository;
        this.eventBus = eventBus;
    }
    
    async runAnalysis() {
        const result = this.metric.compute();
        await this.repository.save(result);
        this.eventBus.emit('analysis.completed', result);
    }
}
```

### Performance Optimization

#### WebGL2 Optimizations
- Use vertex array objects (VAOs)
- Implement instanced rendering
- Optimize shader programs
- Minimize state changes

#### JavaScript Optimizations
- Use typed arrays for numerical data
- Implement object pooling
- Minimize garbage collection
- Profile and optimize hot paths

## Troubleshooting

### Build Issues
- Clear browser cache (Ctrl+Shift+R)
- Check CORS policy (use local server)
- Verify file paths and imports
- Check console for detailed errors

### Runtime Issues
- Monitor EventBus for proper communication
- Check DI container service resolution
- Verify WebGL2 context creation
- Profile memory usage and leaks

---

*For testing strategies, see [Testing Guide](./testing.md)*  
*For contribution guidelines, see [Contributing](./contribution-guide.md)*