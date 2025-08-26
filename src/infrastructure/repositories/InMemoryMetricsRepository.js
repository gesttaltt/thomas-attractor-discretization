/**
 * In-Memory Metrics Repository
 * SOLID-compliant repository for ChaosMetrics domain entities
 * Implements proper separation of concerns: storage logic separate from domain logic
 */

import { ChaosMetrics } from '../../core/domain/entities/ChaosMetrics.js';
import { MetricsRepositoryInterface } from '../../core/application/ports/repositories.js';

export class InMemoryMetricsRepository extends MetricsRepositoryInterface {
    constructor() {
        super();
        this.metrics = new Map(); // simulationId -> ChaosMetrics
        this.nextId = 1;
    }

    /**
     * Create new ChaosMetrics instance
     * @param {number} b - Thomas attractor parameter
     * @returns {Promise<ChaosMetrics>}
     */
    async create(b = 0.19) {
        const metrics = new ChaosMetrics(b);
        return metrics;
    }

    /**
     * Save ChaosMetrics instance
     * @param {string} simulationId 
     * @param {ChaosMetrics} metrics 
     */
    async save(simulationId, metrics) {
        if (!simulationId) {
            throw new Error('Simulation ID is required');
        }
        
        if (!(metrics instanceof ChaosMetrics)) {
            throw new Error('Invalid metrics object: must be ChaosMetrics instance');
        }

        // Deep clone to avoid reference issues
        const serialized = this.serialize(metrics);
        const cloned = this.deserialize(serialized);
        
        this.metrics.set(simulationId, cloned);
        return cloned;
    }

    /**
     * Retrieve ChaosMetrics by simulation ID
     * @param {string} simulationId 
     * @returns {Promise<ChaosMetrics>}
     */
    async get(simulationId) {
        const metrics = this.metrics.get(simulationId);
        if (!metrics) {
            throw new Error(`Metrics not found for simulation: ${simulationId}`);
        }

        // Return deep clone to avoid mutation
        const serialized = this.serialize(metrics);
        return this.deserialize(serialized);
    }

    /**
     * Update existing metrics
     * @param {string} simulationId 
     * @param {ChaosMetrics} metrics 
     */
    async update(simulationId, metrics) {
        if (!this.metrics.has(simulationId)) {
            throw new Error(`Metrics not found for simulation: ${simulationId}`);
        }
        
        return await this.save(simulationId, metrics);
    }

    /**
     * Delete metrics by simulation ID
     * @param {string} simulationId 
     */
    async delete(simulationId) {
        const existed = this.metrics.delete(simulationId);
        if (!existed) {
            throw new Error(`Metrics not found for simulation: ${simulationId}`);
        }
        return true;
    }

    /**
     * List all simulation IDs with metrics
     * @returns {Promise<Array<string>>}
     */
    async list() {
        return Array.from(this.metrics.keys());
    }

    /**
     * Get metrics for multiple simulations
     * @param {Array<string>} simulationIds 
     * @returns {Promise<Map<string, ChaosMetrics>>}
     */
    async getBatch(simulationIds) {
        const result = new Map();
        
        for (const id of simulationIds) {
            if (this.metrics.has(id)) {
                result.set(id, await this.get(id));
            }
        }
        
        return result;
    }

    /**
     * Clear all metrics
     */
    async clear() {
        this.metrics.clear();
    }

    /**
     * Get repository statistics
     */
    getStats() {
        return {
            totalMetrics: this.metrics.size,
            simulationIds: Array.from(this.metrics.keys()),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Serialize ChaosMetrics for storage
     * @private
     */
    serialize(metrics) {
        return {
            b: metrics.b,
            components: { ...metrics._components },
            ctmValue: metrics._ctmValue,
            validationResults: { ...metrics._validationResults },
            interpretation: { ...metrics._interpretation },
            history: [...(metrics._history || [])]
        };
    }

    /**
     * Deserialize storage data to ChaosMetrics instance
     * @private
     */
    deserialize(data) {
        const metrics = new ChaosMetrics(data.b);
        
        // Restore internal state
        metrics._components = data.components;
        metrics._ctmValue = data.ctmValue;
        metrics._validationResults = data.validationResults;
        metrics._interpretation = data.interpretation;
        metrics._history = data.history || [];
        
        return metrics;
    }

    /**
     * Estimate memory usage
     * @private
     */
    estimateMemoryUsage() {
        const entries = Array.from(this.metrics.entries());
        const avgSize = entries.length > 0 ? 
            JSON.stringify(entries[0]).length * entries.length : 0;
        
        return {
            estimatedBytes: avgSize,
            entryCount: entries.length
        };
    }

    /**
     * Validate metrics object structure
     * @private
     */
    validateMetrics(metrics) {
        if (!(metrics instanceof ChaosMetrics)) {
            throw new Error('Invalid metrics: must be ChaosMetrics instance');
        }
        
        if (typeof metrics.b !== 'number' || metrics.b <= 0) {
            throw new Error('Invalid metrics: b parameter must be positive number');
        }
        
        return true;
    }

    /**
     * Export all metrics data
     */
    async exportAll() {
        const allData = {};
        
        for (const [id, metrics] of this.metrics.entries()) {
            allData[id] = this.serialize(metrics);
        }
        
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            metrics: allData
        };
    }

    /**
     * Import metrics data
     */
    async importAll(data, overwrite = false) {
        if (!data.metrics) {
            throw new Error('Invalid import data: missing metrics');
        }
        
        const imported = [];
        const skipped = [];
        
        for (const [id, metricsData] of Object.entries(data.metrics)) {
            if (overwrite || !this.metrics.has(id)) {
                const metrics = this.deserialize(metricsData);
                this.metrics.set(id, metrics);
                imported.push(id);
            } else {
                skipped.push(id);
            }
        }
        
        return { imported, skipped };
    }
}