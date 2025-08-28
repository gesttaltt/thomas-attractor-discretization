/**
 * Central configuration and constants for Thomas Attractor Visualization
 * All magic numbers and configuration values should be defined here
 */

// Physics and Mathematics Constants
export const PHYSICS = {
    // Thomas Attractor parameters
    DEFAULT_B: 0.19,                    // Dissipation parameter
    DEFAULT_DT: 0.005,                  // Time step for integration
    MIN_B: 0.01,                        // Minimum stable b value
    MAX_B: 1.0,                         // Maximum b value
    MIN_DT: 0.0001,                     // Minimum time step
    MAX_DT: 0.1,                        // Maximum time step
    
    // Initial conditions
    DEFAULT_SEED: [0.1, 0.0, 0.0],      // Default starting point
    TRANSIENT_STEPS: 1000,              // Steps to skip initial transient
    
    // Integration
    RK4_FACTOR: 1/6,                    // Runge-Kutta 4th order factor
    DIVERGENCE_FACTOR: -3,              // System divergence multiplier
};

// Visualization Constants
export const VISUALIZATION = {
    // Particle system
    DEFAULT_MAX_PARTICLES: 50000,       // Default maximum particles
    MIN_PARTICLES: 100,                 // Minimum particle count
    MAX_PARTICLES: 100000,              // Maximum particle count
    DEFAULT_PARTICLE_SIZE: 0.012,       // Default particle size
    MIN_PARTICLE_SIZE: 0.001,           // Minimum visible size
    MAX_PARTICLE_SIZE: 0.1,             // Maximum particle size
    
    // Camera and scene
    DEFAULT_CAMERA_DISTANCE: 20,        // Default camera distance
    MIN_CAMERA_DISTANCE: 5,             // Minimum zoom
    MAX_CAMERA_DISTANCE: 100,           // Maximum zoom
    CAMERA_FOV: 60,                     // Field of view in degrees
    CAMERA_NEAR: 0.1,                   // Near clipping plane
    CAMERA_FAR: 100,                    // Far clipping plane
    
    // Rotation
    DEFAULT_ROTATION_SPEED: 0.3,        // Auto-rotation speed
    MIN_ROTATION_SPEED: 0,              // No rotation
    MAX_ROTATION_SPEED: 5,              // Maximum rotation speed
    
    // Colors
    DEFAULT_BACKGROUND_COLOR: 0x000011, // Dark blue background
    DEFAULT_PARTICLE_COLOR: 0x64b5f6,   // Light blue particles
    DEFAULT_AMBIENT_LIGHT: 0x404040,    // Soft ambient light
    DEFAULT_DIRECTIONAL_LIGHT: 0xffffff,// White directional light
    
    // Canvas dimensions fallback
    DEFAULT_CANVAS_WIDTH: 800,          // Default width if not set
    DEFAULT_CANVAS_HEIGHT: 600,         // Default height if not set
};

// Volumetric Effects Constants
export const VOLUMETRIC = {
    // Grid configuration
    DEFAULT_GRID_SIZE: 32,              // 3D grid resolution
    MIN_GRID_SIZE: 8,                   // Minimum grid size
    MAX_GRID_SIZE: 64,                  // Maximum grid size
    DEFAULT_SPATIAL_RANGE: 10,          // Spatial extent
    
    // Spatial hashing
    HASH_CELL_DIVISIONS: 8,             // Divisions for spatial hash
    HASH_CELL_RADIUS: 1,                // Neighbor search radius
    SEARCH_RADIUS_FACTOR: 2,            // Search radius multiplier
    
    // Performance
    CHUNK_SIZE: 4,                      // Processing chunk size
    MAX_TRAJECTORY_POINTS: 10000,       // Maximum trajectory buffer
    REBUILD_INTERVAL: 10,               // Frames between rebuilds
    
    // Density field
    DENSITY_SMOOTHING: 0.8,             // Density interpolation factor
    DENSITY_THRESHOLD: 0.1,             // Minimum density to render
    
    // Velocity field
    VELOCITY_WEIGHT_FALLOFF: 1.0,       // Distance weight falloff
    VELOCITY_MIN_WEIGHT: 0.01,          // Minimum weight threshold
    
    // Visual layers
    LAYER_OPACITY: {
        DENSITY: 0.3,                   // Density field opacity
        VELOCITY: 0.4,                  // Velocity field opacity
        VORTICITY: 0.2,                 // Vorticity field opacity
        DIVERGENCE: 0.15,               // Divergence field opacity
    },
    
    // Performance thresholds
    SLOW_COMPUTATION_THRESHOLD: 50,     // ms before warning
    CRITICAL_COMPUTATION_THRESHOLD: 100, // ms before reducing quality
};

// Floral Projection Constants
export const FLORAL = {
    // Petal configuration
    DEFAULT_PETAL_COUNT: 5,             // Number of petals
    MIN_PETAL_COUNT: 3,                 // Minimum petals
    MAX_PETAL_COUNT: 12,                // Maximum petals
    
    // Projection
    DEFAULT_PROJECTION_PLANE: 'xy',     // Default projection plane
    DEFAULT_BUFFER_SIZE: 10000,         // Trail buffer size
    
    // Visual
    PETAL_CURVE_SEGMENTS: 32,           // Segments per petal curve
    TRAIL_OPACITY: 0.7,                 // Trail transparency
    POINT_SIZE: 2,                      // Current point size
};

// Performance and Quality Constants
export const PERFORMANCE = {
    // Frame rate
    TARGET_FPS: 60,                     // Target frame rate
    MIN_FPS: 20,                        // Minimum acceptable FPS
    
    // Memory limits
    MAX_MEMORY_MB: 500,                 // Maximum memory usage
    MEMORY_WARNING_MB: 400,             // Warning threshold
    
    // Update rates
    DEFAULT_STEPS_PER_FRAME: 100,       // Simulation steps per frame
    MIN_STEPS_PER_FRAME: 1,             // Minimum steps
    MAX_STEPS_PER_FRAME: 1000,          // Maximum steps
    
    // Quality levels
    QUALITY_LEVELS: {
        LOW: {
            particles: 10000,
            gridSize: 16,
            pixelRatio: 1,
        },
        MEDIUM: {
            particles: 25000,
            gridSize: 24,
            pixelRatio: 1.5,
        },
        HIGH: {
            particles: 50000,
            gridSize: 32,
            pixelRatio: 2,
        },
        ULTRA: {
            particles: 100000,
            gridSize: 48,
            pixelRatio: 2,
        },
    },
    
    // Monitoring
    METRICS_WINDOW: 60,                 // Sample window for metrics
    HEALTH_CHECK_INTERVAL: 1000,        // ms between health checks
    ERROR_RATE_THRESHOLD: 5,            // Errors per minute threshold
    MAX_FRAME_TIME: 50,                 // ms maximum frame time
    MAX_UPDATE_TIME: 30,                // ms maximum update time
};

// UI Constants
export const UI = {
    // Control panel
    SLIDER_STEPS: 100,                  // Slider resolution
    UPDATE_DEBOUNCE: 50,                 // ms debounce for updates
    
    // Notifications
    NOTIFICATION_DURATION: 3000,        // ms to show notifications
    ERROR_NOTIFICATION_DURATION: 5000,  // ms for error messages
    
    // Export
    DEFAULT_EXPORT_FORMAT: 'json',      // Default export format
    MAX_EXPORT_POINTS: 100000,          // Maximum points to export
};

// Error Handling Constants
export const ERROR = {
    // Retry configuration
    MAX_RETRIES: 3,                     // Maximum retry attempts
    RETRY_DELAY: 1000,                  // ms between retries
    
    // Error windows
    ERROR_WINDOW: 60000,                // 1 minute error window
    MAX_ERRORS: 50,                     // Maximum errors to track
    CRITICAL_ERROR_RATE: 10,            // Errors in 5 seconds
    
    // Recovery
    CONTEXT_RESTORE_DELAY: 1000,        // ms before context restore
    FALLBACK_DELAY: 500,                // ms before fallback
};

// Validation Constants
export const VALIDATION = {
    // Numeric ranges
    EPSILON: 0.000001,                  // Floating point comparison
    MAX_COORDINATE: 1000,                // Maximum coordinate value
    
    // Array sizes
    VEC2_LENGTH: 2,                     // 2D vector length
    VEC3_LENGTH: 3,                     // 3D vector length
    VEC4_LENGTH: 4,                     // 4D vector length
    
    // String limits
    MAX_STRING_LENGTH: 1000,            // Maximum string input
    MAX_NAME_LENGTH: 100,               // Maximum name length
};

// Development and Debug Constants
export const DEBUG = {
    // Logging levels
    LOG_LEVEL: {
        NONE: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4,
        VERBOSE: 5,
    },
    
    // Performance profiling
    ENABLE_PROFILING: false,            // Enable performance profiling
    PROFILE_SAMPLE_RATE: 100,           // Sample every N frames
    
    // Debug visualization
    SHOW_STATS: false,                  // Show FPS counter
    SHOW_AXES: false,                   // Show coordinate axes
    SHOW_GRID: false,                   // Show reference grid
    SHOW_BOUNDS: false,                 // Show bounding box
};

// Export all constants as default object for easy access
export default {
    PHYSICS,
    VISUALIZATION,
    VOLUMETRIC,
    FLORAL,
    PERFORMANCE,
    UI,
    ERROR,
    VALIDATION,
    DEBUG,
};