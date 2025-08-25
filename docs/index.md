# Thomas Flower Documentation

Welcome to the comprehensive documentation for the Thomas Flower Interactive Visualizer project.

## Overview

The Thomas Flower project explores the hidden floral patterns within the chaotic Thomas attractor through specialized projections and mathematical analysis. This visualization system reveals how chaotic dynamics can exhibit quasi-periodic structures that resemble rose curves (rhodonea) when properly projected and analyzed.

## Documentation Structure

### 📚 User Documentation
- [Getting Started Guide](./user-guide.md) - Installation and basic usage
- [Features Overview](./features.md) - Complete feature documentation
- [Controls Reference](./controls.md) - Keyboard shortcuts and UI controls
- [Presets Guide](./presets.md) - Understanding and creating presets

### 🔧 Technical Documentation
- [API Reference](./api-reference.md) - Module API documentation
- [Architecture Overview](./architecture.md) - System design and structure
- [Mathematical Background](./mathematical-background.md) - Theory and equations
- [Implementation Brief](./Thomas_Flower_Implementation_Brief.md) - Original specifications

### 🧪 Research Documentation
- [Chaos Meter Protocol](./Thomas_Chaos_Meter_Protocol_EN.md) - Measurement methodology
- [Flower Index Theory](./flower-index-theory.md) - FI computation details
- [Experimental Results](./experimental-results.md) - Research findings

### 👩‍💻 Developer Documentation
- [Development Setup](./development.md) - Setting up the development environment
- [Contributing Guidelines](./contributing.md) - How to contribute
- [Module Documentation](./modules/) - Detailed module documentation
- [Build and Deploy](./build-deploy.md) - Building and deployment instructions

## Quick Links

- **Live Demo**: Open `index.html` in your browser
- **Source Code**: Available in the `src/` directory
- **Examples**: See the `examples/` directory
- **Data Formats**: See `data/` directory for configuration schemas

## Project Structure

```
thomas-flower/
├── src/                  # Source code
│   ├── main.js          # Main application
│   ├── modules/         # Modular components
│   └── styles/          # CSS styles
├── docs/                # Documentation
├── data/                # Configuration and presets
├── examples/            # Example implementations
├── dist/                # Production builds
└── old-representations/ # Legacy implementations
```

## Key Concepts

### Thomas Attractor
A three-dimensional chaotic dynamical system defined by:
```
ẋ = sin(y) - bx
ẏ = sin(z) - by
ż = sin(x) - bz
```

### Flower Index (FI)
A novel metric that quantifies the "flower-like" structure:
```
FI = (1 / (1 + E_flower)) × e^(-λ)
```

Where:
- `E_flower`: Radial error between attractor and rhodonea curve
- `λ`: Lyapunov exponent (chaos measure)

### Rhodonea Curves
Mathematical rose curves used as overlay:
```
r(θ) = a × cos(k × m × θ + φ)
```

## Getting Help

- **Issues**: Report bugs or request features on GitHub
- **Documentation**: You're reading it!
- **Examples**: Check the `examples/` directory for usage patterns
- **Community**: Join discussions on the project repository

## Version History

- **v2.0.0** - Modular architecture, comprehensive documentation
- **v1.0.0** - Initial implementation with basic features

## License

This project is provided for educational and research purposes. See LICENSE file for details.

---

*Last updated: 2024*