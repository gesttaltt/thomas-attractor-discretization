/**
 * In-Memory Attractor Repository Implementation
 * Stores attractor instances in memory
 */

import { ThomasAttractor } from '../../core/domain/entities/ThomasAttractor.js';
import { AttractorRepositoryInterface } from '../../core/application/ports/repositories.js';

export class InMemoryAttractorRepository extends AttractorRepositoryInterface {
    constructor() {
        super();
        this.attractors = new Map();
    }

    async create(b, dt, seed) {
        const attractor = new ThomasAttractor(b, dt, seed);
        return attractor;
    }

    async save(id, attractor) {
        if (!(attractor instanceof ThomasAttractor)) {
            throw new Error('Invalid attractor instance');
        }
        
        // Deep clone to prevent external modifications
        const clonedAttractor = attractor.clone();
        this.attractors.set(id, clonedAttractor);
        
        return id;
    }

    async get(id) {
        if (!this.attractors.has(id)) {
            throw new Error(`Attractor with id ${id} not found`);
        }
        
        // Return a clone to prevent external modifications
        return this.attractors.get(id).clone();
    }

    async delete(id) {
        const existed = this.attractors.has(id);
        this.attractors.delete(id);
        return existed;
    }

    async list() {
        return Array.from(this.attractors.keys());
    }

    async exists(id) {
        return this.attractors.has(id);
    }

    async clear() {
        this.attractors.clear();
    }

    async getStatistics() {
        return {
            count: this.attractors.size,
            ids: Array.from(this.attractors.keys()),
            memoryUsage: this._estimateMemoryUsage()
        };
    }

    _estimateMemoryUsage() {
        // Rough estimate: each attractor ~1KB
        return this.attractors.size * 1024;
    }
}

/**
 * Local Storage Attractor Repository Implementation
 * Persists attractors to browser's localStorage
 */
export class LocalStorageAttractorRepository extends AttractorRepositoryInterface {
    constructor(keyPrefix = 'thomas_attractor_') {
        super();
        this.keyPrefix = keyPrefix;
    }

    async create(b, dt, seed) {
        const attractor = new ThomasAttractor(b, dt, seed);
        return attractor;
    }

    async save(id, attractor) {
        if (!(attractor instanceof ThomasAttractor)) {
            throw new Error('Invalid attractor instance');
        }

        const key = this.keyPrefix + id;
        const data = {
            b: attractor.b,
            dt: attractor.dt,
            position: attractor.position,
            currentStep: attractor.currentStep,
            integrationMethod: attractor.integrationMethod,
            savedAt: Date.now()
        };

        try {
            localStorage.setItem(key, JSON.stringify(data));
            return id;
        } catch (error) {
            throw new Error(`Failed to save attractor: ${error.message}`);
        }
    }

    async get(id) {
        const key = this.keyPrefix + id;
        const data = localStorage.getItem(key);
        
        if (!data) {
            throw new Error(`Attractor with id ${id} not found`);
        }

        try {
            const parsed = JSON.parse(data);
            const attractor = new ThomasAttractor(parsed.b, parsed.dt, [
                parsed.position.x, 
                parsed.position.y, 
                parsed.position.z
            ]);
            
            // Restore state
            attractor._currentStep = parsed.currentStep;
            attractor._integrationMethod = parsed.integrationMethod;
            
            return attractor;
        } catch (error) {
            throw new Error(`Failed to parse attractor data: ${error.message}`);
        }
    }

    async delete(id) {
        const key = this.keyPrefix + id;
        const existed = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        return existed;
    }

    async list() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                keys.push(key.substring(this.keyPrefix.length));
            }
        }
        return keys;
    }

    async exists(id) {
        const key = this.keyPrefix + id;
        return localStorage.getItem(key) !== null;
    }

    async clear() {
        const keys = await this.list();
        for (const id of keys) {
            await this.delete(id);
        }
    }

    async getStatistics() {
        const keys = await this.list();
        let totalSize = 0;
        
        for (const id of keys) {
            const key = this.keyPrefix + id;
            const data = localStorage.getItem(key);
            if (data) {
                totalSize += data.length;
            }
        }

        return {
            count: keys.length,
            ids: keys,
            storageSize: totalSize,
            availableSpace: this._getAvailableStorage()
        };
    }

    _getAvailableStorage() {
        try {
            const test = 'test';
            let total = 0;
            
            // Test storage capacity (rough estimate)
            for (let i = 0; i < 10000; i++) {
                try {
                    localStorage.setItem(`temp_${i}`, test);
                    total += test.length;
                } catch {
                    break;
                }
            }
            
            // Clean up test data
            for (let i = 0; i < 10000; i++) {
                localStorage.removeItem(`temp_${i}`);
            }
            
            return total;
        } catch {
            return -1; // Unknown
        }
    }
}