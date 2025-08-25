/**
 * In-Memory Lyapunov Spectrum Repository Implementation
 */

import { LyapunovSpectrum } from '../../core/domain/entities/LyapunovSpectrum.js';
import { LyapunovRepositoryInterface } from '../../core/application/ports/repositories.js';

export class InMemoryLyapunovRepository extends LyapunovRepositoryInterface {
    constructor() {
        super();
        this.spectra = new Map();
        this.history = new Map();
        this.maxHistorySize = 1000;
    }

    async create(dimension = 3) {
        const spectrum = new LyapunovSpectrum(dimension);
        return spectrum;
    }

    async save(id, spectrum) {
        if (!(spectrum instanceof LyapunovSpectrum)) {
            throw new Error('Invalid spectrum instance');
        }

        // Store current state
        const spectrumData = {
            exponents: spectrum.exponents,
            isConverged: spectrum.isConverged,
            stepCount: spectrum.stepCount,
            sumOfExponents: spectrum.sumOfExponents,
            savedAt: Date.now()
        };

        this.spectra.set(id, spectrum);

        // Store in history
        if (!this.history.has(id)) {
            this.history.set(id, []);
        }

        const historyArray = this.history.get(id);
        historyArray.push(spectrumData);

        // Limit history size
        if (historyArray.length > this.maxHistorySize) {
            historyArray.shift();
        }

        return id;
    }

    async get(id) {
        if (!this.spectra.has(id)) {
            throw new Error(`Lyapunov spectrum with id ${id} not found`);
        }

        return this.spectra.get(id);
    }

    async delete(id) {
        const existedSpectrum = this.spectra.delete(id);
        const existedHistory = this.history.delete(id);
        return existedSpectrum || existedHistory;
    }

    async getHistory(id, limit = 100) {
        if (!this.history.has(id)) {
            return [];
        }

        const historyArray = this.history.get(id);
        return historyArray.slice(-limit);
    }

    async list() {
        return Array.from(this.spectra.keys());
    }

    async exists(id) {
        return this.spectra.has(id);
    }

    async clear() {
        this.spectra.clear();
        this.history.clear();
    }

    async getStatistics() {
        const stats = {
            spectrumCount: this.spectra.size,
            totalHistoryEntries: 0,
            convergenceStats: {
                converged: 0,
                notConverged: 0
            },
            averageSteps: 0,
            memoryUsage: this._estimateMemoryUsage()
        };

        let totalSteps = 0;
        
        for (const [id, spectrum] of this.spectra) {
            const historyLength = this.history.get(id)?.length || 0;
            stats.totalHistoryEntries += historyLength;
            
            if (spectrum.isConverged) {
                stats.convergenceStats.converged++;
            } else {
                stats.convergenceStats.notConverged++;
            }

            totalSteps += spectrum.stepCount;
        }

        if (this.spectra.size > 0) {
            stats.averageSteps = totalSteps / this.spectra.size;
        }

        return stats;
    }

    async getConvergenceAnalysis(id) {
        const history = await this.getHistory(id);
        if (history.length < 2) {
            return { analysis: 'insufficient_data' };
        }

        const exponentEvolution = [];
        const convergenceRates = [];

        // Track how each exponent evolves over time
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            
            const changes = curr.exponents.map((exp, idx) => 
                Math.abs(exp - prev.exponents[idx])
            );
            
            exponentEvolution.push({
                timestamp: curr.savedAt,
                stepCount: curr.stepCount,
                exponents: curr.exponents,
                changes: changes,
                maxChange: Math.max(...changes)
            });

            // Compute convergence rate
            if (i >= 10) { // Need sufficient history
                const recent = exponentEvolution.slice(-10);
                const avgChange = recent.reduce((sum, entry) => 
                    sum + entry.maxChange, 0) / recent.length;
                convergenceRates.push(avgChange);
            }
        }

        return {
            analysis: 'complete',
            evolution: exponentEvolution,
            convergenceRates: convergenceRates,
            isStable: convergenceRates.length > 0 && 
                     convergenceRates.slice(-5).every(rate => rate < 1e-6),
            estimatedConvergenceTime: this._estimateConvergenceTime(convergenceRates)
        };
    }

    async exportSpectrumHistory(id, format = 'json') {
        const spectrum = await this.get(id);
        const history = await this.getHistory(id);
        
        const data = {
            spectrumId: id,
            currentState: {
                exponents: spectrum.exponents,
                isConverged: spectrum.isConverged,
                stepCount: spectrum.stepCount,
                kaplanYorkeDimension: spectrum.computeKaplanYorkeDimension()
            },
            history: history,
            exportedAt: Date.now()
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                return this._convertToCSV(history);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    _estimateMemoryUsage() {
        let size = 0;
        
        // Estimate spectrum objects (~2KB each)
        size += this.spectra.size * 2048;
        
        // Estimate history (~200 bytes per entry)
        for (const historyArray of this.history.values()) {
            size += historyArray.length * 200;
        }
        
        return size;
    }

    _estimateConvergenceTime(convergenceRates) {
        if (convergenceRates.length < 5) {
            return null;
        }

        // Simple exponential decay model
        const recent = convergenceRates.slice(-5);
        const avgRate = recent.reduce((sum, rate) => sum + rate, 0) / recent.length;
        
        if (avgRate <= 0) {
            return 0; // Already converged
        }

        // Estimate time to reach 1e-6 threshold
        const targetThreshold = 1e-6;
        const timeConstant = Math.log(avgRate / targetThreshold);
        
        return timeConstant > 0 ? Math.ceil(timeConstant * 1000) : null; // in steps
    }

    _convertToCSV(history) {
        if (history.length === 0) {
            return 'No data available';
        }

        const headers = ['timestamp', 'stepCount', 'isConverged', 'sumOfExponents'];
        const dimension = history[0].exponents.length;
        
        for (let i = 0; i < dimension; i++) {
            headers.push(`exponent_${i + 1}`);
        }

        let csv = headers.join(',') + '\n';

        for (const entry of history) {
            const row = [
                entry.savedAt,
                entry.stepCount,
                entry.isConverged,
                entry.sumOfExponents,
                ...entry.exponents
            ];
            csv += row.join(',') + '\n';
        }

        return csv;
    }
}