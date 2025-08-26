# Thomas Flower Documentation

## Quick Start

The Thomas Flower Interactive Visualizer reveals hidden floral patterns within chaotic dynamics through specialized projections and mathematical analysis.

### Running the Application

```bash
# Start local server
python server.py
# Or
python -m http.server 8002

# Navigate to
http://localhost:8002
```

### Key Features
- **3D Thomas Attractor**: Real-time GPU-accelerated visualization
- **Thomas Chaos Meter (CTM)**: Advanced chaos quantification
- **Floral Projections**: 2D polar projections with rhodonea overlays
- **Flower Index (FI)**: Novel metric for floral structure quantification

## Documentation Structure

### 📚 For Users
- [**User Guide**](./user-guide.md) - Complete usage instructions
- [**Quick Reference**](./user-guide.md#controls-reference) - Keyboard shortcuts and controls

### 🏗️ Architecture & Design
- [**System Architecture**](./architecture/overview.md) - Clean hexagonal architecture
- [**SOLID Principles**](./architecture/solid-principles.md) - Design principles implementation
- [**Dependency Injection**](./architecture/dependency-injection.md) - DI container documentation

### 🔬 Mathematical Theory
- [**Thomas Chaos Meter**](./mathematical/thomas-chaos-meter.md) - CTM theory and formulas
- [**Flower Index Theory**](./mathematical/flower-index-theory.md) - Floral projection mathematics
- [**Implementation Brief**](./mathematical/implementation-brief.md) - Mathematical specifications

### 🛠️ Technical Reference
- [**API Reference**](./technical/api-reference.md) - Module APIs and external links
- [**CTM Implementation**](./technical/ctm-implementation.md) - Technical implementation details
- [**Dependencies**](./technical/dependencies.md) - Dependency management

### 👩‍💻 Development
- [**Development Setup**](./development/setup.md) - Environment configuration
- [**Testing Guide**](./development/testing.md) - Testing strategies
- [**Contributing**](./development/contribution-guide.md) - How to contribute

### 📋 Releases
- [**Changelog**](./releases/changelog.md) - Version history and updates

## Key Concepts

### Thomas Attractor System
```
ẋ = sin(y) - bx
ẏ = sin(z) - by
ż = sin(x) - bz
```

### Thomas Chaos Meter (CTM)
```
C_λ = 1 - exp(-λ₁/(3b))
C_D = clamp(D_KY - 2, 0, 1)
CTM = √(C_λ × C_D)
```

### Flower Index (FI)
```
FI = (1 / (1 + E_flower)) × e^(-λ)
```

## Project Status

**Version**: 2.0.0  
**Architecture**: Clean hexagonal with SOLID principles  
**Performance**: 100K+ particles at 60 FPS  
**Browser Support**: 97% (WebGL2 required)

## Quick Links

- **Live Demo**: Open `index.html` in your browser
- **Source Code**: `src/` directory
- **Configuration**: `data/presets.json`
- **Issues**: Report bugs on GitHub

---

*Last updated: August 2025*