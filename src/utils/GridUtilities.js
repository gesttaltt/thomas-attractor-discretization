/**
 * Shared utilities for grid operations and spatial computations
 * Eliminates code duplication across visualization modules
 */

import { VOLUMETRIC, VALIDATION } from './Constants.js';

/**
 * Base class for spatial field computations
 * Provides common functionality for research-grade modules
 */
export class SpatialFieldBase {
    constructor(gridSize = VOLUMETRIC.DEFAULT_GRID_SIZE, spatialRange = VOLUMETRIC.DEFAULT_SPATIAL_RANGE) {
        this.gridSize = gridSize;
        this.spatialRange = spatialRange;
        this.cellSize = (2 * spatialRange) / gridSize;
        this.gridPoints = gridSize * gridSize * gridSize;
    }
    
    /**
     * Convert world coordinates to grid indices
     */
    worldToGrid(x, y, z) {
        const i = Math.floor((x + this.spatialRange) / this.cellSize);
        const j = Math.floor((y + this.spatialRange) / this.cellSize);
        const k = Math.floor((z + this.spatialRange) / this.cellSize);
        
        return {
            i: Math.max(0, Math.min(i, this.gridSize - 1)),
            j: Math.max(0, Math.min(j, this.gridSize - 1)),
            k: Math.max(0, Math.min(k, this.gridSize - 1))
        };
    }
    
    /**
     * Convert grid indices to world coordinates
     */
    gridToWorld(i, j, k) {
        return {
            x: -this.spatialRange + (i + 0.5) * this.cellSize,
            y: -this.spatialRange + (j + 0.5) * this.cellSize,
            z: -this.spatialRange + (k + 0.5) * this.cellSize
        };
    }
    
    /**
     * Get flat array index from 3D grid indices
     */
    getIndex(i, j, k) {
        return i + j * this.gridSize + k * this.gridSize * this.gridSize;
    }
    
    /**
     * Check if indices are within bounds
     */
    isInBounds(i, j, k) {
        return i >= 0 && i < this.gridSize &&
               j >= 0 && j < this.gridSize &&
               k >= 0 && k < this.gridSize;
    }
    
    /**
     * Calculate squared distance between points (avoids sqrt)
     */
    distanceSquared(x1, y1, z1, x2, y2, z2) {
        return (x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2;
    }
    
    /**
     * Calculate distance weight with falloff
     */
    calculateWeight(distSquared, falloff = VOLUMETRIC.VELOCITY_WEIGHT_FALLOFF) {
        return 1 / (1 + falloff * Math.sqrt(distSquared));
    }
}

/**
 * Grid traversal utilities with chunking for cache efficiency
 */
export class GridTraversal {
    /**
     * Process grid in cache-friendly chunks
     */
    static processChunked(gridSize, chunkSize, callback) {
        for (let ci = 0; ci < gridSize; ci += chunkSize) {
            for (let cj = 0; cj < gridSize; cj += chunkSize) {
                for (let ck = 0; ck < gridSize; ck += chunkSize) {
                    const iEnd = Math.min(ci + chunkSize, gridSize);
                    const jEnd = Math.min(cj + chunkSize, gridSize);
                    const kEnd = Math.min(ck + chunkSize, gridSize);
                    
                    for (let i = ci; i < iEnd; i++) {
                        for (let j = cj; j < jEnd; j++) {
                            for (let k = ck; k < kEnd; k++) {
                                callback(i, j, k);
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Process grid boundaries only (for finite difference operations)
     */
    static processBoundaries(gridSize, callback) {
        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                for (let k = 1; k < gridSize - 1; k++) {
                    callback(i, j, k);
                }
            }
        }
    }
    
    /**
     * Process grid with chunked boundaries
     */
    static processChunkedBoundaries(gridSize, chunkSize, callback) {
        for (let ci = 1; ci < gridSize - 1; ci += chunkSize) {
            for (let cj = 1; cj < gridSize - 1; cj += chunkSize) {
                for (let ck = 1; ck < gridSize - 1; ck += chunkSize) {
                    const iEnd = Math.min(ci + chunkSize, gridSize - 1);
                    const jEnd = Math.min(cj + chunkSize, gridSize - 1);
                    const kEnd = Math.min(ck + chunkSize, gridSize - 1);
                    
                    for (let i = ci; i < iEnd; i++) {
                        for (let j = cj; j < jEnd; j++) {
                            for (let k = ck; k < kEnd; k++) {
                                callback(i, j, k);
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Iterate over neighbors of a grid point
     */
    static iterateNeighbors(i, j, k, gridSize, callback) {
        const neighbors = [
            [i-1, j, k], [i+1, j, k],
            [i, j-1, k], [i, j+1, k],
            [i, j, k-1], [i, j, k+1]
        ];
        
        for (const [ni, nj, nk] of neighbors) {
            if (ni >= 0 && ni < gridSize &&
                nj >= 0 && nj < gridSize &&
                nk >= 0 && nk < gridSize) {
                callback(ni, nj, nk);
            }
        }
    }
}

/**
 * Finite difference operations for vector fields
 */
export class FiniteDifference {
    /**
     * Calculate gradient of scalar field
     */
    static gradient(field, i, j, k, gridSize, h = 1) {
        const idx = i + j * gridSize + k * gridSize * gridSize;
        
        const dx = i > 0 && i < gridSize - 1 ? 
            (field[idx + 1] - field[idx - 1]) / (2 * h) : 0;
        const dy = j > 0 && j < gridSize - 1 ? 
            (field[idx + gridSize] - field[idx - gridSize]) / (2 * h) : 0;
        const dz = k > 0 && k < gridSize - 1 ? 
            (field[idx + gridSize * gridSize] - field[idx - gridSize * gridSize]) / (2 * h) : 0;
        
        return { x: dx, y: dy, z: dz };
    }
    
    /**
     * Calculate divergence of vector field
     */
    static divergence(fieldX, fieldY, fieldZ, i, j, k, gridSize, h = 1) {
        const idx = i + j * gridSize + k * gridSize * gridSize;
        
        const dvx_dx = i > 0 && i < gridSize - 1 ? 
            (fieldX[idx + 1] - fieldX[idx - 1]) / (2 * h) : 0;
        const dvy_dy = j > 0 && j < gridSize - 1 ? 
            (fieldY[idx + gridSize] - fieldY[idx - gridSize]) / (2 * h) : 0;
        const dvz_dz = k > 0 && k < gridSize - 1 ? 
            (fieldZ[idx + gridSize * gridSize] - fieldZ[idx - gridSize * gridSize]) / (2 * h) : 0;
        
        return dvx_dx + dvy_dy + dvz_dz;
    }
    
    /**
     * Calculate curl (vorticity) of vector field
     */
    static curl(fieldX, fieldY, fieldZ, i, j, k, gridSize, h = 1) {
        const idx = i + j * gridSize + k * gridSize * gridSize;
        
        // Calculate partial derivatives
        const dvz_dy = j > 0 && j < gridSize - 1 ? 
            (fieldZ[idx + gridSize] - fieldZ[idx - gridSize]) / (2 * h) : 0;
        const dvy_dz = k > 0 && k < gridSize - 1 ? 
            (fieldY[idx + gridSize * gridSize] - fieldY[idx - gridSize * gridSize]) / (2 * h) : 0;
        
        const dvx_dz = k > 0 && k < gridSize - 1 ? 
            (fieldX[idx + gridSize * gridSize] - fieldX[idx - gridSize * gridSize]) / (2 * h) : 0;
        const dvz_dx = i > 0 && i < gridSize - 1 ? 
            (fieldZ[idx + 1] - fieldZ[idx - 1]) / (2 * h) : 0;
        
        const dvy_dx = i > 0 && i < gridSize - 1 ? 
            (fieldY[idx + 1] - fieldY[idx - 1]) / (2 * h) : 0;
        const dvx_dy = j > 0 && j < gridSize - 1 ? 
            (fieldX[idx + gridSize] - fieldX[idx - gridSize]) / (2 * h) : 0;
        
        return {
            x: dvz_dy - dvy_dz,
            y: dvx_dz - dvz_dx,
            z: dvy_dx - dvx_dy
        };
    }
    
    /**
     * Calculate Laplacian of scalar field
     */
    static laplacian(field, i, j, k, gridSize, h = 1) {
        const idx = i + j * gridSize + k * gridSize * gridSize;
        const h2 = h * h;
        
        let result = -6 * field[idx] / h2;
        
        if (i > 0) result += field[idx - 1] / h2;
        if (i < gridSize - 1) result += field[idx + 1] / h2;
        if (j > 0) result += field[idx - gridSize] / h2;
        if (j < gridSize - 1) result += field[idx + gridSize] / h2;
        if (k > 0) result += field[idx - gridSize * gridSize] / h2;
        if (k < gridSize - 1) result += field[idx + gridSize * gridSize] / h2;
        
        return result;
    }
}

/**
 * Interpolation utilities for smooth field visualization
 */
export class Interpolation {
    /**
     * Trilinear interpolation in 3D grid
     */
    static trilinear(field, x, y, z, gridSize, spatialRange) {
        const cellSize = (2 * spatialRange) / gridSize;
        
        // Convert to grid coordinates
        const gx = (x + spatialRange) / cellSize - 0.5;
        const gy = (y + spatialRange) / cellSize - 0.5;
        const gz = (z + spatialRange) / cellSize - 0.5;
        
        // Get integer indices
        const i0 = Math.floor(gx);
        const j0 = Math.floor(gy);
        const k0 = Math.floor(gz);
        const i1 = i0 + 1;
        const j1 = j0 + 1;
        const k1 = k0 + 1;
        
        // Check bounds
        if (i0 < 0 || i1 >= gridSize || j0 < 0 || j1 >= gridSize || k0 < 0 || k1 >= gridSize) {
            return 0;
        }
        
        // Get fractional parts
        const fx = gx - i0;
        const fy = gy - j0;
        const fz = gz - k0;
        
        // Get field values at corners
        const v000 = field[i0 + j0 * gridSize + k0 * gridSize * gridSize];
        const v100 = field[i1 + j0 * gridSize + k0 * gridSize * gridSize];
        const v010 = field[i0 + j1 * gridSize + k0 * gridSize * gridSize];
        const v110 = field[i1 + j1 * gridSize + k0 * gridSize * gridSize];
        const v001 = field[i0 + j0 * gridSize + k1 * gridSize * gridSize];
        const v101 = field[i1 + j0 * gridSize + k1 * gridSize * gridSize];
        const v011 = field[i0 + j1 * gridSize + k1 * gridSize * gridSize];
        const v111 = field[i1 + j1 * gridSize + k1 * gridSize * gridSize];
        
        // Interpolate
        const v00 = v000 * (1 - fx) + v100 * fx;
        const v10 = v010 * (1 - fx) + v110 * fx;
        const v01 = v001 * (1 - fx) + v101 * fx;
        const v11 = v011 * (1 - fx) + v111 * fx;
        
        const v0 = v00 * (1 - fy) + v10 * fy;
        const v1 = v01 * (1 - fy) + v11 * fy;
        
        return v0 * (1 - fz) + v1 * fz;
    }
    
    /**
     * Smooth field with Gaussian blur
     */
    static gaussianSmooth(field, gridSize, sigma = 1.0) {
        const smoothed = new Float32Array(field.length);
        const kernel = Interpolation.generateGaussianKernel(sigma);
        const kSize = kernel.length;
        const kHalf = Math.floor(kSize / 2);
        
        GridTraversal.processChunked(gridSize, VOLUMETRIC.CHUNK_SIZE, (i, j, k) => {
            const idx = i + j * gridSize + k * gridSize * gridSize;
            let sum = 0;
            let weightSum = 0;
            
            for (let di = -kHalf; di <= kHalf; di++) {
                for (let dj = -kHalf; dj <= kHalf; dj++) {
                    for (let dk = -kHalf; dk <= kHalf; dk++) {
                        const ni = i + di;
                        const nj = j + dj;
                        const nk = k + dk;
                        
                        if (ni >= 0 && ni < gridSize &&
                            nj >= 0 && nj < gridSize &&
                            nk >= 0 && nk < gridSize) {
                            const nIdx = ni + nj * gridSize + nk * gridSize * gridSize;
                            const weight = kernel[di + kHalf] * kernel[dj + kHalf] * kernel[dk + kHalf];
                            sum += field[nIdx] * weight;
                            weightSum += weight;
                        }
                    }
                }
            }
            
            smoothed[idx] = weightSum > 0 ? sum / weightSum : 0;
        });
        
        return smoothed;
    }
    
    /**
     * Generate 1D Gaussian kernel
     */
    static generateGaussianKernel(sigma, size = null) {
        size = size || Math.ceil(sigma * 3) * 2 + 1;
        const kernel = new Float32Array(size);
        const center = Math.floor(size / 2);
        const norm = 1 / (sigma * Math.sqrt(2 * Math.PI));
        
        let sum = 0;
        for (let i = 0; i < size; i++) {
            const x = i - center;
            kernel[i] = norm * Math.exp(-(x * x) / (2 * sigma * sigma));
            sum += kernel[i];
        }
        
        // Normalize
        for (let i = 0; i < size; i++) {
            kernel[i] /= sum;
        }
        
        return kernel;
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    constructor(name) {
        this.name = name;
        this.measurements = [];
        this.maxSamples = 100;
    }
    
    start() {
        this.startTime = performance.now();
    }
    
    end() {
        const elapsed = performance.now() - this.startTime;
        this.measurements.push(elapsed);
        
        if (this.measurements.length > this.maxSamples) {
            this.measurements.shift();
        }
        
        return elapsed;
    }
    
    getAverage() {
        if (this.measurements.length === 0) return 0;
        const sum = this.measurements.reduce((a, b) => a + b, 0);
        return sum / this.measurements.length;
    }
    
    getMin() {
        return Math.min(...this.measurements);
    }
    
    getMax() {
        return Math.max(...this.measurements);
    }
    
    reset() {
        this.measurements = [];
    }
    
    report() {
        return {
            name: this.name,
            samples: this.measurements.length,
            average: this.getAverage().toFixed(2),
            min: this.getMin().toFixed(2),
            max: this.getMax().toFixed(2),
            latest: this.measurements[this.measurements.length - 1]?.toFixed(2) || 0
        };
    }
}

export default {
    SpatialFieldBase,
    GridTraversal,
    FiniteDifference,
    Interpolation,
    PerformanceMonitor
};