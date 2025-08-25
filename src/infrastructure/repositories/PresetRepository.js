/**
 * Preset Repository
 * Clean Architecture implementation of preset management
 */

export class PresetRepository {
    constructor() {
        this.presets = new Map();
        this.customPresets = new Map();
        this.currentPresetId = null;
        this.storageKey = 'thomas_attractor_custom_presets';
        
        this.initializeDefaultPresets();
        this.loadCustomPresets();
    }

    /**
     * Initialize default presets
     */
    initializeDefaultPresets() {
        const defaults = this.getDefaultPresets();
        
        Object.entries(defaults).forEach(([id, preset]) => {
            this.presets.set(id, preset);
        });
    }

    /**
     * Load custom presets from localStorage
     */
    loadCustomPresets() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const customData = JSON.parse(stored);
                Object.entries(customData).forEach(([id, preset]) => {
                    this.customPresets.set(id, preset);
                });
            }
        } catch (error) {
            console.warn('Failed to load custom presets:', error);
        }
    }

    /**
     * Save custom presets to localStorage
     */
    saveCustomPresets() {
        try {
            const customData = Object.fromEntries(this.customPresets);
            localStorage.setItem(this.storageKey, JSON.stringify(customData));
        } catch (error) {
            console.error('Failed to save custom presets:', error);
            throw error;
        }
    }

    /**
     * Get preset by ID
     */
    async get(id) {
        const preset = this.presets.get(id) || this.customPresets.get(id);
        if (!preset) {
            throw new Error(`Preset '${id}' not found`);
        }
        return { ...preset };
    }

    /**
     * Get all presets
     */
    async getAll() {
        const allPresets = new Map([...this.presets, ...this.customPresets]);
        return Object.fromEntries(allPresets);
    }

    /**
     * Get preset list for UI
     */
    async getPresetList() {
        const all = await this.getAll();
        
        return Object.entries(all).map(([id, preset]) => ({
            id: id,
            name: preset.name || preset.description || id,
            description: preset.description || '',
            category: preset.custom ? 'Custom' : 'Default',
            isCustom: preset.custom || false
        }));
    }

    /**
     * Save/create preset
     */
    async save(id, preset) {
        const presetData = {
            ...preset,
            id: id,
            lastModified: new Date().toISOString(),
            custom: !this.presets.has(id)
        };

        if (this.presets.has(id)) {
            // Update default preset (shouldn't normally happen)
            this.presets.set(id, presetData);
        } else {
            // Save as custom preset
            this.customPresets.set(id, presetData);
            this.saveCustomPresets();
        }

        return id;
    }

    /**
     * Create new custom preset
     */
    async createCustomPreset(name, description, configuration) {
        const id = this.generatePresetId(name);
        
        const preset = {
            id: id,
            name: name,
            description: description,
            custom: true,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            ...configuration
        };

        this.customPresets.set(id, preset);
        this.saveCustomPresets();

        return preset;
    }

    /**
     * Delete custom preset
     */
    async delete(id) {
        // Only allow deletion of custom presets
        if (this.presets.has(id)) {
            throw new Error('Cannot delete default preset');
        }

        const existed = this.customPresets.has(id);
        if (existed) {
            this.customPresets.delete(id);
            this.saveCustomPresets();
            
            // Clear current preset if it was deleted
            if (this.currentPresetId === id) {
                this.currentPresetId = null;
            }
        }

        return existed;
    }

    /**
     * Apply preset (mark as current)
     */
    async apply(id) {
        const preset = await this.get(id);
        this.currentPresetId = id;
        return preset;
    }

    /**
     * Get current preset
     */
    async getCurrent() {
        if (!this.currentPresetId) {
            return null;
        }
        return await this.get(this.currentPresetId);
    }

    /**
     * Export presets
     */
    async exportPresets(includeDefaults = false) {
        const exportData = {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            presets: {}
        };

        if (includeDefaults) {
            this.presets.forEach((preset, id) => {
                exportData.presets[id] = preset;
            });
        }

        this.customPresets.forEach((preset, id) => {
            exportData.presets[id] = preset;
        });

        return exportData;
    }

    /**
     * Import presets
     */
    async importPresets(data, overwrite = false) {
        if (!data.presets) {
            throw new Error('Invalid preset data format');
        }

        const imported = [];
        const skipped = [];

        Object.entries(data.presets).forEach(([id, preset]) => {
            if (preset.custom !== false && (overwrite || !this.customPresets.has(id))) {
                this.customPresets.set(id, {
                    ...preset,
                    custom: true,
                    importedAt: new Date().toISOString()
                });
                imported.push(id);
            } else {
                skipped.push(id);
            }
        });

        if (imported.length > 0) {
            this.saveCustomPresets();
        }

        return { imported, skipped };
    }

    /**
     * Generate unique preset ID
     */
    generatePresetId(name) {
        let baseId = name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        if (!baseId) {
            baseId = 'custom_preset';
        }

        let id = baseId;
        let counter = 1;

        while (this.presets.has(id) || this.customPresets.has(id)) {
            id = `${baseId}_${counter}`;
            counter++;
        }

        return id;
    }

    /**
     * Validate preset configuration
     */
    validatePreset(preset) {
        const errors = [];

        // Required fields
        if (!preset.model || typeof preset.model.b !== 'number') {
            errors.push('Missing or invalid model.b parameter');
        }

        if (!preset.model || typeof preset.model.dt !== 'number' || preset.model.dt <= 0) {
            errors.push('Missing or invalid model.dt parameter');
        }

        if (!preset.model || !Array.isArray(preset.model.seed) || preset.model.seed.length !== 3) {
            errors.push('Missing or invalid model.seed parameter');
        }

        // Optional but validated fields
        if (preset.projection && !['xy', 'yz', 'zx'].includes(preset.projection.plane)) {
            errors.push('Invalid projection plane (must be xy, yz, or zx)');
        }

        if (preset.rhodonea) {
            const rParams = preset.rhodonea;
            if (typeof rParams.a !== 'number' || typeof rParams.k !== 'number' || 
                typeof rParams.m !== 'number' || typeof rParams.phi !== 'number') {
                errors.push('Invalid rhodonea parameters');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get default presets configuration
     */
    getDefaultPresets() {
        return {
            canonical_xy: {
                id: "canonical_xy",
                name: "Canonical XY",
                description: "Baseline configuration on XY projection",
                model: {
                    b: 0.19,
                    dt: 0.005,
                    seed: [0.1, 0.0, 0.0],
                    transientSteps: 100
                },
                projection: {
                    plane: "xy"
                },
                rhodonea: {
                    k: 3.96,
                    m: 24.26,
                    phi: -0.286,
                    a: 3.74
                },
                visualization: {
                    particleSize: 0.012,
                    maxParticles: 100000,
                    autoRotate: true
                },
                metrics: {
                    expectedCTM: 0.805,
                    expectedLambda: 0.103
                }
            },

            chaos_edge: {
                id: "chaos_edge",
                name: "Chaos Edge",
                description: "Near chaos boundary (b=0.185)",
                model: {
                    b: 0.185,
                    dt: 0.005,
                    seed: [0.1, 0.0, 0.0],
                    transientSteps: 100
                },
                projection: {
                    plane: "xy"
                },
                rhodonea: {
                    k: 3.88,
                    m: 24.5,
                    phi: -0.28,
                    a: 3.82
                },
                visualization: {
                    particleSize: 0.015,
                    maxParticles: 80000,
                    autoRotate: true
                },
                metrics: {
                    expectedCTM: 0.816,
                    expectedLambda: 0.095
                }
            },

            high_chaos: {
                id: "high_chaos",
                name: "Deep Chaos",
                description: "Deep chaos regime (b=0.21)",
                model: {
                    b: 0.21,
                    dt: 0.005,
                    seed: [0.1, 0.0, 0.0],
                    transientSteps: 100
                },
                projection: {
                    plane: "xy"
                },
                rhodonea: {
                    k: 4.25,
                    m: 23.2,
                    phi: -0.32,
                    a: 3.45
                },
                visualization: {
                    particleSize: 0.010,
                    maxParticles: 120000,
                    autoRotate: false
                },
                metrics: {
                    expectedCTM: 0.768,
                    expectedLambda: 0.125
                }
            },

            yz_projection: {
                id: "yz_projection",
                name: "YZ Projection",
                description: "YZ plane projection view",
                model: {
                    b: 0.19,
                    dt: 0.005,
                    seed: [0.1, 0.0, 0.0],
                    transientSteps: 100
                },
                projection: {
                    plane: "yz"
                },
                rhodonea: {
                    k: 4.12,
                    m: 23.8,
                    phi: -0.31,
                    a: 3.65
                },
                visualization: {
                    particleSize: 0.012,
                    maxParticles: 100000,
                    autoRotate: true
                },
                metrics: {
                    expectedCTM: 0.789,
                    expectedLambda: 0.103
                }
            },

            zx_projection: {
                id: "zx_projection",
                name: "ZX Projection",
                description: "ZX plane projection view",
                model: {
                    b: 0.19,
                    dt: 0.005,
                    seed: [0.1, 0.0, 0.0],
                    transientSteps: 100
                },
                projection: {
                    plane: "zx"
                },
                rhodonea: {
                    k: 4.05,
                    m: 24.1,
                    phi: -0.295,
                    a: 3.70
                },
                visualization: {
                    particleSize: 0.012,
                    maxParticles: 100000,
                    autoRotate: true
                },
                metrics: {
                    expectedCTM: 0.796,
                    expectedLambda: 0.103
                }
            },

            performance_test: {
                id: "performance_test",
                name: "Performance Test",
                description: "Maximum performance configuration",
                model: {
                    b: 0.19,
                    dt: 0.002,
                    seed: [0.1, 0.0, 0.0],
                    transientSteps: 50
                },
                projection: {
                    plane: "xy"
                },
                rhodonea: {
                    k: 3.96,
                    m: 24.26,
                    phi: -0.286,
                    a: 3.74
                },
                visualization: {
                    particleSize: 0.008,
                    maxParticles: 200000,
                    autoRotate: false
                },
                metrics: {
                    expectedCTM: 0.805,
                    expectedLambda: 0.103
                }
            }
        };
    }

    /**
     * Get repository statistics
     */
    getStats() {
        return {
            defaultPresets: this.presets.size,
            customPresets: this.customPresets.size,
            totalPresets: this.presets.size + this.customPresets.size,
            currentPreset: this.currentPresetId,
            storageUsed: this.customPresets.size > 0 ? 
                new Blob([localStorage.getItem(this.storageKey) || '']).size : 0
        };
    }
}