/**
 * Preset Manager - Simplified preset handling
 * Loads from JSON and manages custom presets
 */

export class PresetManager {
    constructor() {
        this.presets = new Map();
        this.customPresets = new Map();
        this.defaultPresetId = 'canonical_xy';
    }

    /**
     * Load presets from JSON file
     */
    async loadPresets() {
        try {
            const response = await fetch('/data/presets.json');
            const data = await response.json();
            
            // Store each preset
            Object.entries(data).forEach(([id, preset]) => {
                this.presets.set(id, preset);
            });
            
            // Load custom presets from localStorage
            this.loadCustomPresets();
            
            console.log(`✅ Loaded ${this.presets.size} presets`);
            return true;
            
        } catch (error) {
            console.warn('⚠️ Could not load presets, using defaults:', error);
            this.loadDefaultPresets();
            return false;
        }
    }

    /**
     * Load default presets if JSON fails
     */
    loadDefaultPresets() {
        const defaults = {
            canonical_xy: {
                name: "Canonical XY Projection",
                model: { b: 0.19, dt: 0.005 },
                seed: [0.1, 0.0, 0.0],
                projection: { plane: "xy" },
                rhodonea: { k: 7, scale: 8 },
                E_flower: 0.021,
                lambda_max: 0.0385,
                FI_computed: 85.2
            },
            canonical_yz: {
                name: "Canonical YZ Projection",
                model: { b: 0.19, dt: 0.005 },
                seed: [0.0, 0.1, 0.0],
                projection: { plane: "yz" },
                rhodonea: { k: 5, scale: 6 },
                E_flower: 0.018,
                lambda_max: 0.0385,
                FI_computed: 78.3
            },
            canonical_zx: {
                name: "Canonical ZX Projection",
                model: { b: 0.19, dt: 0.005 },
                seed: [0.0, 0.0, 0.1],
                projection: { plane: "zx" },
                rhodonea: { k: 6, scale: 7 },
                E_flower: 0.019,
                lambda_max: 0.0385,
                FI_computed: 81.7
            },
            critical_slow: {
                name: "Critical Slow",
                model: { b: 0.18, dt: 0.008 },
                seed: [0.1, 0.1, 0.1],
                projection: { plane: "xy" },
                rhodonea: { k: 8, scale: 9 },
                E_flower: 0.024,
                lambda_max: 0.0298,
                FI_computed: 72.4
            },
            high_chaos: {
                name: "High Chaos",
                model: { b: 0.17, dt: 0.003 },
                seed: [0.2, -0.1, 0.15],
                projection: { plane: "yz" },
                rhodonea: { k: 11, scale: 10 },
                E_flower: 0.031,
                lambda_max: 0.0512,
                FI_computed: 92.8
            },
            stable_orbit: {
                name: "Stable Orbit",
                model: { b: 0.21, dt: 0.006 },
                seed: [0.05, 0.05, 0.05],
                projection: { plane: "zx" },
                rhodonea: { k: 4, scale: 5 },
                E_flower: 0.015,
                lambda_max: 0.0201,
                FI_computed: 65.3
            }
        };
        
        Object.entries(defaults).forEach(([id, preset]) => {
            this.presets.set(id, preset);
        });
    }

    /**
     * Load custom presets from localStorage
     */
    loadCustomPresets() {
        try {
            const stored = localStorage.getItem('thomasCustomPresets');
            if (stored) {
                const customs = JSON.parse(stored);
                Object.entries(customs).forEach(([id, preset]) => {
                    this.customPresets.set(id, preset);
                });
            }
        } catch (error) {
            console.warn('Could not load custom presets:', error);
        }
    }

    /**
     * Save custom presets to localStorage
     */
    saveCustomPresets() {
        try {
            const customs = Object.fromEntries(this.customPresets);
            localStorage.setItem('thomasCustomPresets', JSON.stringify(customs));
        } catch (error) {
            console.warn('Could not save custom presets:', error);
        }
    }

    /**
     * Get a preset by ID
     */
    getPreset(id) {
        return this.presets.get(id) || this.customPresets.get(id);
    }

    /**
     * Load and return a preset
     */
    async loadPreset(id) {
        const preset = this.getPreset(id);
        if (!preset) {
            console.warn(`Preset not found: ${id}`);
            return null;
        }
        return preset;
    }

    /**
     * Save custom preset
     */
    saveCustomPreset(id, preset) {
        this.customPresets.set(id, {
            ...preset,
            custom: true,
            savedAt: Date.now()
        });
        this.saveCustomPresets();
    }

    /**
     * Delete custom preset
     */
    deleteCustomPreset(id) {
        this.customPresets.delete(id);
        this.saveCustomPresets();
    }

    /**
     * Get list of all presets
     */
    getPresetList() {
        const list = [];
        
        // Add built-in presets
        this.presets.forEach((preset, id) => {
            list.push({
                id,
                name: preset.name,
                type: 'built-in',
                b: preset.model.b,
                fi: preset.FI_computed
            });
        });
        
        // Add custom presets
        this.customPresets.forEach((preset, id) => {
            list.push({
                id,
                name: preset.name,
                type: 'custom',
                b: preset.model.b
            });
        });
        
        return list;
    }

    /**
     * Export all presets
     */
    exportPresets() {
        return {
            builtin: Object.fromEntries(this.presets),
            custom: Object.fromEntries(this.customPresets)
        };
    }

    /**
     * Import presets
     */
    importPresets(data) {
        if (data.custom) {
            Object.entries(data.custom).forEach(([id, preset]) => {
                this.customPresets.set(id, preset);
            });
            this.saveCustomPresets();
        }
    }
}