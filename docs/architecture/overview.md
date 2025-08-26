# System Architecture Overview

## Clean Hexagonal Architecture

The Thomas Flower Visualizer follows a clean hexagonal (ports and adapters) architecture, ensuring separation of concerns and maintainability.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
├─────────────────────────────────────────┤
│  Controllers (UI Logic)                 │
│  - SimulationController                 │
│  - HUDController                        │
│  - Views (3D/2D Visualization)          │
├─────────────────────────────────────────┤
│  Application Layer (Business Logic)     │
│  - UnifiedApplicationBootstrap          │
│  - Use Cases                            │
│  - Services                             │
├─────────────────────────────────────────┤
│  Infrastructure Layer (External)        │
│  - Repositories                         │
│  - Adapters                             │
│  - GPU Rendering                        │
├─────────────────────────────────────────┤
│  Domain Layer (Pure Math)               │
│  - ThomasAttractor                      │
│  - LyapunovSpectrum                     │
│  - ChaosMetrics                         │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── core/                           # Business Logic (Pure)
│   ├── domain/entities/            # Mathematical Models
│   │   ├── ThomasAttractor.js      # Pure Thomas system dynamics
│   │   ├── LyapunovSpectrum.js     # QR decomposition & spectra
│   │   └── ChaosMetrics.js         # CTM computation
│   ├── application/
│   │   ├── usecases/               # Orchestration
│   │   ├── services/               # Event bus
│   │   └── ports/                  # Interfaces
│   └── container/                  # Dependency Injection
├── infrastructure/                 # External Adapters
│   ├── repositories/               # Data persistence
│   ├── rendering/                  # WebGL2 GPU rendering
│   └── adapters/                   # Export systems
├── presentation/                   # User Interface
│   ├── controllers/                # UI Controllers
│   └── views/                      # Visualization views
├── bootstrap/                      # Application composition
└── main-unified.js                 # Entry point
```

## Key Architectural Decisions

### 1. Domain-Driven Design
- Pure mathematical models in domain layer
- No external dependencies in domain entities
- Business logic separated from infrastructure

### 2. Dependency Injection
- All dependencies injected via DIContainer
- Loose coupling between components
- Easy testing and mocking

### 3. Event-Driven Communication
- EventBus for component communication
- Decoupled controllers
- Reactive updates

### 4. Async Initialization
- Non-blocking resource loading
- Progressive enhancement
- Graceful degradation

## Data Flow

### Simulation Flow
```
User Input → Controller → Use Case → Domain Entity → Repository → View Update
```

### Event Flow
```
UI Event → EventBus → Subscribers → State Update → View Refresh
```

### Rendering Pipeline
```
Domain Calculation → GPU Buffer → WebGL2 Shader → Canvas Display
```

## Component Responsibilities

### Domain Layer
- **ThomasAttractor**: Mathematical system dynamics
- **LyapunovSpectrum**: Chaos measurement calculations
- **ChaosMetrics**: CTM and related metrics
- **FloralProjection**: Polar coordinate transformations

### Application Layer
- **SimulationUseCase**: Orchestrates simulation flow
- **AnalysisUseCase**: Manages mathematical analysis
- **EventBus**: Handles inter-component communication
- **Configuration**: Manages application settings

### Infrastructure Layer
- **Repositories**: Data persistence and retrieval
- **GPUParticleRenderer**: WebGL2 rendering
- **ExportAdapter**: Multi-format export functionality
- **PresetRepository**: Configuration management

### Presentation Layer
- **Controllers**: Handle UI logic and user input
- **Views**: Render visualization components
- **HUD**: Display metrics and status

## Performance Characteristics

- **WebGL2 First**: Modern GPU acceleration
- **Instanced Rendering**: Single draw call for 100K+ particles
- **Async Loading**: Non-blocking initialization
- **Memory Efficient**: Circular buffers and pooling
- **60 FPS Target**: Optimized render loop

## Extensibility Points

### Adding New Attractors
1. Create domain entity extending BaseAttractor
2. Implement mathematical equations
3. Register in DIContainer
4. Add UI controls

### Adding New Visualizations
1. Implement View interface
2. Subscribe to EventBus updates
3. Add rendering logic
4. Register in application

### Adding New Export Formats
1. Extend ExportAdapter
2. Implement format conversion
3. Register format handler
4. Add UI option

## Testing Strategy

### Unit Testing
- Domain entities: Pure function tests
- Use cases: Mock dependencies
- Controllers: Event handling tests

### Integration Testing
- Repository persistence
- EventBus communication
- Rendering pipeline

### Performance Testing
- FPS monitoring
- Memory profiling
- GPU utilization

---

*For implementation details, see [SOLID Principles](./solid-principles.md) and [Dependency Injection](./dependency-injection.md)*