/**
 * Presets Module
 * Manages configuration presets for the Thomas Flower visualizer
 */

export class PresetManager {
    constructor() {
        this.presets = {};
        this.currentPreset = null;
        this.defaultPresets = this.getDefaultPresets();
    }

    /**
     * Load presets from JSON file
     */
    async loadFromFile(url) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.presets = data;
                return true;
            }
        } catch (error) {
            console.warn('Failed to load presets from file, using defaults:', error);
        }
        
        // Fall back to default presets
        this.presets = this.defaultPresets;
        return false;
    }

    /**
     * Get a specific preset
     */
    getPreset(id) {
        return this.presets[id] || this.defaultPresets.canonical_xy;
    }

    /**
     * Get all preset IDs
     */
    getPresetIds() {
        return Object.keys(this.presets);
    }

    /**
     * Get preset descriptions for UI
     */
    getPresetOptions() {
        return Object.entries(this.presets).map(([id, preset]) => ({
            id,
            description: preset.description || id
        }));
    }

    /**
     * Apply a preset to the system
     */
    applyPreset(id) {
        const preset = this.getPreset(id);
        this.currentPreset = preset;
        return preset;
    }

    /**
     * Get current preset
     */
    getCurrentPreset() {
        return this.currentPreset;
    }

    /**
     * Default presets
     */
    getDefaultPresets() {
        return {
            canonical_xy: {
                id: "canonical_xy",
                description: "Baseline fit on XY projection",
                model: {
                    b: 0.19,
                    dt: 0.01,
                    steps: 300000,
                    transient_steps: 2000,
                    seed: [0.1, 0.0, 0.0]
                },
                projection: {
                    plane: "xy",
                    rotation: { axis: "z", angle_rad: 0.0 }
                },
                rhodonea: {
                    k: 3.96,
                    m: 24.26,
                    phi: -0.286,
                    a: 3.74,
                    formula: "r(theta) = a * cos(k*m*theta + phi)"
                },
                metrics: {
                    E_flower: 0.120,
                    lambda_max: 0.103,
                    FI_computed: 0.8054705,
                    FI_reported: 0.8054705
                }
            },
            chaos_edge: {
                id: "chaos_edge",
                description: "Near chaos boundary (b=0.185)",
                model: {
                    b: 0.185,
                    dt: 0.01,
                    steps: 300000,
                    transient_steps: 2000,
                    seed: [0.1, 0.0, 0.0]
                },
                projection: {
                    plane: "xy",
                    rotation: { axis: "z", angle_rad: 0.0 }
                },
                rhodonea: {
                    k: 3.88,
                    m: 24.5,
                    phi: -0.28,
                    a: 3.82
                },
                metrics: {
                    E_flower: 0.118,
                    lambda_max: 0.095,
                    FI_computed: 0.8166,
                    FI_reported: 0.8166
                }
            },
            high_chaos: {
                id: "high_chaos",
                description: "Deep chaos regime (b=0.21)",
                model: {
                    b: 0.21,
                    dt: 0.01,
                    steps: 300000,
                    transient_steps: 2000,
                    seed: [0.1, 0.0, 0.0]
                },
                projection: {
                    plane: "xy",
                    rotation: { axis: "z", angle_rad: 0.0 }
                },
                rhodonea: {
                    k: 4.25,
                    m: 23.2,
                    phi: -0.32,
                    a: 3.45
                },
                metrics: {
                    E_flower: 0.145,
                    lambda_max: 0.125,
                    FI_computed: 0.7687,
                    FI_reported: 0.7687
                }
            },
            yz_projection: {
                id: "yz_projection",
                description: "YZ plane projection",
                model: {
                    b: 0.19,
                    dt: 0.01,
                    steps: 300000,
                    transient_steps: 2000,
                    seed: [0.1, 0.0, 0.0]
                },
                projection: {
                    plane: "yz",
                    rotation: { axis: "x", angle_rad: 0.0 }
                },
                rhodonea: {
                    k: 4.12,
                    m: 23.8,
                    phi: -0.31,
                    a: 3.65
                },
                metrics: {
                    E_flower: 0.135,
                    lambda_max: 0.103,
                    FI_computed: 0.7894,
                    FI_reported: 0.7894
                }
            },
            zx_projection: {
                id: "zx_projection",
                description: "ZX plane projection",
                model: {
                    b: 0.19,
                    dt: 0.01,
                    steps: 300000,
                    transient_steps: 2000,
                    seed: [0.1, 0.0, 0.0]
                },
                projection: {
                    plane: "zx",
                    rotation: { axis: "y", angle_rad: 0.0 }
                },
                rhodonea: {
                    k: 4.05,
                    m: 24.1,
                    phi: -0.295,
                    a: 3.70
                },
                metrics: {
                    E_flower: 0.128,
                    lambda_max: 0.103,
                    FI_computed: 0.7968,
                    FI_reported: 0.7968
                }
            }
        };
    }

    /**
     * Export current configuration
     */
    exportConfiguration() {
        if (!this.currentPreset) return null;
        
        return {
            preset: this.currentPreset,
            timestamp: new Date().toISOString(),
            version: "1.0.0"
        };
    }

    /**
     * Create custom preset from current state
     */
    createCustomPreset(id, description, state) {
        const customPreset = {
            id,
            description,
            model: {
                b: state.b,
                dt: state.dt,
                steps: state.steps || 300000,
                transient_steps: state.transientSteps || 2000,
                seed: state.seed || [0.1, 0.0, 0.0]
            },
            projection: {
                plane: state.projectionPlane,
                rotation: state.rotation || { axis: "z", angle_rad: 0.0 }
            },
            rhodonea: state.rhodoneaParams,
            metrics: state.metrics,
            custom: true
        };
        
        this.presets[id] = customPreset;
        return customPreset;
    }
}