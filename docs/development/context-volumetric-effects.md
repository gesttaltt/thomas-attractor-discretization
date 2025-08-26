# Thomas Attractor - Volumetric Effects Context

## Current Implementation Status

### Project Overview
- **Repository**: https://github.com/gesttaltt/thomas-attractor-discretization
- **Local Path**: C:\Users\Gestalt\Desktop\floral index in attractors
- **Server**: Running on port 8082 (default changed from 8080 to 8081 to avoid conflicts)
- **Architecture**: Simplified from hexagonal (removed DI container, event bus)

### Recent Major Changes

#### 1. Architecture Simplification (Completed)
- Removed over-engineered hexagonal architecture
- Eliminated dependency injection container (600+ lines)
- Removed event bus system
- Direct ES6 imports instead of complex abstractions
- Result: 64% fewer files, 43% less code, ~30% performance improvement

#### 2. Speed Improvements (Completed)
- Increased steps per frame: 10 → 200 (20x faster)
- Removed frame rate limiting
- Made trajectory speed configurable via `stepsPerFrame`
- Attractor now fills screen in seconds instead of minutes

#### 3. Volumetric Effects System (Just Implemented)
Created multi-layered visualization with:

##### Files Modified/Created:
- `src/visualization/VolumetricEffects.js` - New volumetric effects class
- `src/visualization/Renderer3D.js` - Enhanced with volumetric integration
- `index.html` - Added `enableVolumetricEffects: true` config

##### Visual Elements Added:
1. **Density Clouds** - Volumetric fog based on visit frequency
2. **Velocity Glow** - Brightness from speed field magnitude
3. **Energy Field** - Glass-like toroidal surfaces
4. **Vorticity Ribbons** - Purple twisting tubes
5. **Phase Flow Lines** - Green ghost trajectories

### Current Visual Issues to Address
- Colors and opacities need adjustment
- Multiple layers may be visually overwhelming
- Need better visual hierarchy and clarity

### Key Files Structure
```
src/
├── app.js                          # Main application
├── core/
│   ├── ThomasAttractor.js         # Mathematical model
│   ├── ChaosAnalysis.js           # Lyapunov & CTM
│   └── PresetManager.js           # Preset handling
├── visualization/
│   ├── Renderer3D.js              # Three.js 3D renderer
│   ├── VolumetricEffects.js       # NEW: Volumetric layers
│   └── FloralProjection.js        # 2D floral projection
├── ui/
│   └── ControlPanel.js            # UI controls
└── utils/
    └── ExportManager.js           # Export functionality
```

### Mathematical Basis for Effects
Each visual element derives from Thomas attractor equations:
- **Thomas System**: ẋ = sin(y) - bx, ẏ = sin(z) - by, ż = sin(x) - bz
- **Velocity**: ||(ẋ, ẏ, ż)|| = magnitude of change
- **Divergence**: ∇·F = -3b (constant contraction)
- **Vorticity**: ∇×F = (cos(x), cos(y), cos(z))
- **Density**: Accumulated visit frequency over time

### Current Configuration
- Default port: 8081
- Particles: 50,000
- Steps per frame: 200
- Default b parameter: 0.19
- Default dt: 0.005
- Volumetric effects: ENABLED

### Server Status
- Orchestrator: `start.js` (unified startup with auto-browser launch)
- Server: `server.js` (simplified static server)
- Platform launchers: `start.bat` (Windows), `start.sh` (Unix/Mac)

### Browser Compatibility Notes
- Requires WebGL support
- Three.js r128
- ES6 modules
- Testing via Browser Preview extension in Cursor IDE

### Next Task
User wants to adjust colors and opacities of volumetric effects for better visual clarity and aesthetics.