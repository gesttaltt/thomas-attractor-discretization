/**
 * Repository Interfaces (Ports)
 * Define contracts for data persistence
 */

/**
 * Attractor Repository Interface
 */
export class AttractorRepositoryInterface {
    async create(b, dt, seed) {
        throw new Error('Method not implemented');
    }

    async save(id, attractor) {
        throw new Error('Method not implemented');
    }

    async get(id) {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }

    async list() {
        throw new Error('Method not implemented');
    }
}

/**
 * Lyapunov Spectrum Repository Interface
 */
export class LyapunovRepositoryInterface {
    async create(dimension) {
        throw new Error('Method not implemented');
    }

    async save(id, spectrum) {
        throw new Error('Method not implemented');
    }

    async get(id) {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }

    async getHistory(id, limit = 100) {
        throw new Error('Method not implemented');
    }
}

/**
 * Chaos Metrics Repository Interface
 */
export class MetricsRepositoryInterface {
    async create(parameterB) {
        throw new Error('Method not implemented');
    }

    async save(id, metrics) {
        throw new Error('Method not implemented');
    }

    async get(id) {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }

    async saveAnalysisResult(id, result) {
        throw new Error('Method not implemented');
    }

    async getAnalysisResults(id) {
        throw new Error('Method not implemented');
    }
}

/**
 * Visualization Repository Interface
 */
export class VisualizationRepositoryInterface {
    async saveTrajectory(id, points) {
        throw new Error('Method not implemented');
    }

    async getTrajectory(id, limit = 10000) {
        throw new Error('Method not implemented');
    }

    async saveSnapshot(id, imageData) {
        throw new Error('Method not implemented');
    }

    async getSnapshot(id) {
        throw new Error('Method not implemented');
    }

    async clearTrajectory(id) {
        throw new Error('Method not implemented');
    }
}

/**
 * Export Repository Interface
 */
export class ExportRepositoryInterface {
    async exportToJSON(data, filename) {
        throw new Error('Method not implemented');
    }

    async exportToCSV(data, filename) {
        throw new Error('Method not implemented');
    }

    async exportToPNG(canvas, filename) {
        throw new Error('Method not implemented');
    }

    async exportToSVG(data, filename) {
        throw new Error('Method not implemented');
    }
}

/**
 * Configuration Repository Interface  
 */
export class ConfigRepositoryInterface {
    async savePreset(name, config) {
        throw new Error('Method not implemented');
    }

    async loadPreset(name) {
        throw new Error('Method not implemented');
    }

    async listPresets() {
        throw new Error('Method not implemented');
    }

    async deletePreset(name) {
        throw new Error('Method not implemented');
    }

    async saveUserSettings(settings) {
        throw new Error('Method not implemented');
    }

    async loadUserSettings() {
        throw new Error('Method not implemented');
    }
}