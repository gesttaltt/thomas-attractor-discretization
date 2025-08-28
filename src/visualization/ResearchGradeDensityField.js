/**
 * Research-Grade Density Field Analysis for Thomas Attractor
 * Implements advanced statistical methods for phase space density visualization
 */

export class ResearchGradeDensityField {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            gridResolution: config.gridResolution || 128, // Higher resolution
            spatialRange: config.spatialRange || 12, // Tighter bounds around attractor
            kernelBandwidth: config.kernelBandwidth || 0.3, // For KDE
            minDensityThreshold: config.minDensityThreshold || 1e-6,
            maxHistoryPoints: config.maxHistoryPoints || 100000,
            adaptiveMeshDepth: config.adaptiveMeshDepth || 3,
            isosurfaceLevels: config.isosurfaceLevels || [0.1, 0.3, 0.5, 0.7, 0.9],
            ...config
        };

        // Data structures
        this.trajectoryPoints = [];
        this.densityGrid = null;
        this.kdeDensityGrid = null;
        this.adaptiveMesh = null;
        this.isosurfaces = [];
        
        // Statistical measures
        this.meanPosition = [0, 0, 0];
        this.covarianceMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        this.correlationDimension = 0;
        this.informationDimension = 0;
        this.shannonEntropy = 0;
        
        // Visualization objects
        this.densityMesh = null;
        this.isosurfaceMeshes = [];
        this.heatmapTexture = null;
        
        this.init();
    }

    init() {
        const gridSize = this.config.gridResolution;
        this.densityGrid = new Float64Array(gridSize ** 3); // Higher precision
        this.kdeDensityGrid = new Float64Array(gridSize ** 3);
        
        this.createVisualization();
    }

    /**
     * Add trajectory points and maintain statistical running averages
     */
    addTrajectoryPoints(newPoints) {
        newPoints.forEach(point => {
            this.trajectoryPoints.push([...point]);
            
            // Update running statistics
            this.updateRunningStatistics(point);
            
            // Maintain buffer size
            if (this.trajectoryPoints.length > this.config.maxHistoryPoints) {
                const removedPoint = this.trajectoryPoints.shift();
                // TODO: Update running statistics for point removal (more complex)
            }
        });
    }

    /**
     * Update running statistical measures
     */
    updateRunningStatistics(newPoint) {
        const n = this.trajectoryPoints.length;
        const [x, y, z] = newPoint;
        
        // Update mean (Welford's online algorithm)
        const oldMean = [...this.meanPosition];
        this.meanPosition[0] += (x - this.meanPosition[0]) / n;
        this.meanPosition[1] += (y - this.meanPosition[1]) / n;
        this.meanPosition[2] += (z - this.meanPosition[2]) / n;
        
        // Update covariance matrix incrementally
        if (n > 1) {
            const dx = x - oldMean[0];
            const dy = y - oldMean[1];
            const dz = z - oldMean[2];
            const dx2 = x - this.meanPosition[0];
            const dy2 = y - this.meanPosition[1];
            const dz2 = z - this.meanPosition[2];
            
            this.covarianceMatrix[0][0] += (dx * dx2 - this.covarianceMatrix[0][0]) / (n - 1);
            this.covarianceMatrix[0][1] += (dx * dy2 - this.covarianceMatrix[0][1]) / (n - 1);
            this.covarianceMatrix[0][2] += (dx * dz2 - this.covarianceMatrix[0][2]) / (n - 1);
            this.covarianceMatrix[1][0] = this.covarianceMatrix[0][1];
            this.covarianceMatrix[1][1] += (dy * dy2 - this.covarianceMatrix[1][1]) / (n - 1);
            this.covarianceMatrix[1][2] += (dy * dz2 - this.covarianceMatrix[1][2]) / (n - 1);
            this.covarianceMatrix[2][0] = this.covarianceMatrix[0][2];
            this.covarianceMatrix[2][1] = this.covarianceMatrix[1][2];
            this.covarianceMatrix[2][2] += (dz * dz2 - this.covarianceMatrix[2][2]) / (n - 1);
        }
    }

    /**
     * Compute high-fidelity density field using multiple methods
     */
    computeDensityField() {
        // Only compute if we have enough data
        if (this.trajectoryPoints.length < 100) {
            console.log('Not enough trajectory points for density computation');
            return;
        }
        
        this.computeHistogramDensity();
        this.computeKernelDensityEstimation();
        this.computeStatisticalMeasures();
        this.generateAdaptiveMesh();
        this.extractIsosurfaces();
    }

    /**
     * Traditional histogram-based density
     */
    computeHistogramDensity() {
        this.densityGrid.fill(0);
        
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        const cellVolume = cellSize ** 3;
        
        // Count points in each cell
        this.trajectoryPoints.forEach(point => {
            const [x, y, z] = point;
            const i = Math.floor((x + range) / cellSize);
            const j = Math.floor((y + range) / cellSize);
            const k = Math.floor((z + range) / cellSize);
            
            if (i >= 0 && i < gridSize && j >= 0 && j < gridSize && k >= 0 && k < gridSize) {
                const index = i + j * gridSize + k * gridSize * gridSize;
                this.densityGrid[index]++;
            }
        });
        
        // Convert to probability density (normalize by total points and cell volume)
        const totalPoints = this.trajectoryPoints.length;
        if (totalPoints > 0) {
            for (let i = 0; i < this.densityGrid.length; i++) {
                this.densityGrid[i] = this.densityGrid[i] / (totalPoints * cellVolume);
            }
        }
    }

    /**
     * Kernel Density Estimation for smooth density field
     */
    computeKernelDensityEstimation() {
        this.kdeDensityGrid.fill(0);
        
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        const h = this.config.kernelBandwidth; // Bandwidth
        const h3 = h ** 3;
        const normalization = 1 / (Math.pow(2 * Math.PI, 1.5) * h3);
        
        // For each grid point, compute KDE
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const gridIndex = i + j * gridSize + k * gridSize * gridSize;
                    
                    // Grid point world coordinates
                    const gx = -range + (i + 0.5) * cellSize;
                    const gy = -range + (j + 0.5) * cellSize;
                    const gz = -range + (k + 0.5) * cellSize;
                    
                    let density = 0;
                    
                    // Sum over all trajectory points
                    for (const point of this.trajectoryPoints) {
                        const [px, py, pz] = point;
                        const dx = gx - px;
                        const dy = gy - py;
                        const dz = gz - pz;
                        const dist2 = dx*dx + dy*dy + dz*dz;
                        
                        // Gaussian kernel
                        const kernel = Math.exp(-dist2 / (2 * h*h));
                        density += kernel;
                    }
                    
                    this.kdeDensityGrid[gridIndex] = density * normalization / this.trajectoryPoints.length;
                }
            }
            
            // Progress indicator for heavy computation
            if (i % 10 === 0) {
                console.log(`KDE Progress: ${Math.round(100 * i / gridSize)}%`);
            }
        }
    }

    /**
     * Compute advanced statistical measures
     */
    computeStatisticalMeasures() {
        // Shannon entropy of density distribution
        this.shannonEntropy = 0;
        let totalDensity = 0;
        
        for (let i = 0; i < this.kdeDensityGrid.length; i++) {
            const density = this.kdeDensityGrid[i];
            if (density > this.config.minDensityThreshold) {
                totalDensity += density;
            }
        }
        
        if (totalDensity > 0) {
            for (let i = 0; i < this.kdeDensityGrid.length; i++) {
                const p = this.kdeDensityGrid[i] / totalDensity;
                if (p > this.config.minDensityThreshold) {
                    this.shannonEntropy -= p * Math.log2(p);
                }
            }
        }
        
        // Estimate correlation dimension using box-counting
        this.correlationDimension = this.estimateCorrelationDimension();
        
        // Information dimension
        this.informationDimension = this.estimateInformationDimension();
        
        console.log(`Statistical Measures:
            Shannon Entropy: ${this.shannonEntropy.toFixed(4)}
            Correlation Dimension: ${this.correlationDimension.toFixed(4)}
            Information Dimension: ${this.informationDimension.toFixed(4)}`);
    }

    /**
     * Box-counting method for correlation dimension
     */
    estimateCorrelationDimension() {
        const scales = [0.1, 0.2, 0.5, 1.0, 2.0, 4.0];
        const logScales = [];
        const logCounts = [];
        
        for (const scale of scales) {
            const boxSize = scale;
            const boxes = new Set();
            
            // Count occupied boxes at this scale
            this.trajectoryPoints.forEach(point => {
                const [x, y, z] = point;
                const bx = Math.floor(x / boxSize);
                const by = Math.floor(y / boxSize);
                const bz = Math.floor(z / boxSize);
                boxes.add(`${bx},${by},${bz}`);
            });
            
            if (boxes.size > 0) {
                logScales.push(Math.log(scale));
                logCounts.push(Math.log(boxes.size));
            }
        }
        
        // Linear regression to find dimension
        return this.linearRegression(logScales, logCounts).slope * -1;
    }

    /**
     * Information dimension using entropy scaling
     */
    estimateInformationDimension() {
        const scales = [0.1, 0.2, 0.5, 1.0];
        const logScales = [];
        const entropies = [];
        
        for (const scale of scales) {
            const entropy = this.computeEntropyAtScale(scale);
            if (entropy > 0) {
                logScales.push(Math.log(scale));
                entropies.push(entropy);
            }
        }
        
        if (logScales.length > 2) {
            return this.linearRegression(logScales, entropies).slope;
        }
        return 0;
    }

    /**
     * Compute entropy at specific scale
     */
    computeEntropyAtScale(scale) {
        const boxes = new Map();
        let totalPoints = 0;
        
        // Count points in each box
        this.trajectoryPoints.forEach(point => {
            const [x, y, z] = point;
            const bx = Math.floor(x / scale);
            const by = Math.floor(y / scale);
            const bz = Math.floor(z / scale);
            const key = `${bx},${by},${bz}`;
            
            boxes.set(key, (boxes.get(key) || 0) + 1);
            totalPoints++;
        });
        
        // Compute entropy
        let entropy = 0;
        for (const count of boxes.values()) {
            const p = count / totalPoints;
            entropy -= p * Math.log2(p);
        }
        
        return entropy;
    }

    /**
     * Simple linear regression
     */
    linearRegression(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    }

    /**
     * Generate adaptive mesh for high-density regions
     */
    generateAdaptiveMesh() {
        this.adaptiveMesh = [];
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        // Find high-density regions and subdivide
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    const density = this.kdeDensityGrid[index];
                    
                    if (density > 0.1) { // High density threshold
                        // Subdivide this cell
                        this.subdivideCell(i, j, k, cellSize, 0);
                    }
                }
            }
        }
    }

    /**
     * Recursively subdivide high-density cells
     */
    subdivideCell(i, j, k, parentCellSize, depth) {
        if (depth >= this.config.adaptiveMeshDepth) return;
        
        const subCellSize = parentCellSize / 2;
        const range = this.config.spatialRange;
        
        // Create 8 subcells
        for (let di = 0; di < 2; di++) {
            for (let dj = 0; dj < 2; dj++) {
                for (let dk = 0; dk < 2; dk++) {
                    const subI = i * 2 + di;
                    const subJ = j * 2 + dj;
                    const subK = k * 2 + dk;
                    
                    const worldX = -range + (subI + 0.5) * subCellSize;
                    const worldY = -range + (subJ + 0.5) * subCellSize;
                    const worldZ = -range + (subK + 0.5) * subCellSize;
                    
                    // Compute local density
                    const localDensity = this.sampleKDEAtPoint(worldX, worldY, worldZ);
                    
                    if (localDensity > 0.05) {
                        this.adaptiveMesh.push({
                            position: [worldX, worldY, worldZ],
                            size: subCellSize,
                            density: localDensity,
                            level: depth + 1
                        });
                        
                        // Recurse if still high density
                        if (localDensity > 0.2) {
                            this.subdivideCell(subI, subJ, subK, subCellSize, depth + 1);
                        }
                    }
                }
            }
        }
    }

    /**
     * Sample KDE at specific point
     */
    sampleKDEAtPoint(x, y, z) {
        const h = this.config.kernelBandwidth;
        const normalization = 1 / (Math.pow(2 * Math.PI, 1.5) * h ** 3);
        let density = 0;
        
        for (const point of this.trajectoryPoints) {
            const [px, py, pz] = point;
            const dx = x - px;
            const dy = y - py;
            const dz = z - pz;
            const dist2 = dx*dx + dy*dy + dz*dz;
            
            density += Math.exp(-dist2 / (2 * h*h));
        }
        
        return density * normalization / this.trajectoryPoints.length;
    }

    /**
     * Extract isosurfaces using marching cubes algorithm
     */
    extractIsosurfaces() {
        this.isosurfaces = [];
        
        for (const isoLevel of this.config.isosurfaceLevels) {
            const surface = this.marchingCubes(this.kdeDensityGrid, isoLevel);
            if (surface.vertices.length > 0) {
                this.isosurfaces.push({
                    level: isoLevel,
                    vertices: surface.vertices,
                    faces: surface.faces,
                    normals: surface.normals
                });
            }
        }
    }

    /**
     * Simplified marching cubes implementation
     */
    marchingCubes(densityGrid, isoLevel) {
        const vertices = [];
        const faces = [];
        const normals = [];
        
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        // Simplified: just extract vertices where density exceeds threshold
        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                for (let k = 1; k < gridSize - 1; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    const density = densityGrid[index];
                    
                    if (density >= isoLevel) {
                        const worldX = -range + (i + 0.5) * cellSize;
                        const worldY = -range + (j + 0.5) * cellSize;
                        const worldZ = -range + (k + 0.5) * cellSize;
                        
                        vertices.push(worldX * 5, worldY * 5, worldZ * 5);
                        
                        // Compute normal using gradient
                        const gradX = densityGrid[index + 1] - densityGrid[index - 1];
                        const gradY = densityGrid[index + gridSize] - densityGrid[index - gridSize];
                        const gradZ = densityGrid[index + gridSize * gridSize] - densityGrid[index - gridSize * gridSize];
                        
                        const gradMag = Math.sqrt(gradX*gradX + gradY*gradY + gradZ*gradZ);
                        if (gradMag > 0) {
                            normals.push(gradX/gradMag, gradY/gradMag, gradZ/gradMag);
                        } else {
                            normals.push(0, 1, 0);
                        }
                    }
                }
            }
        }
        
        return { vertices, faces, normals };
    }

    /**
     * Create advanced visualization
     */
    createVisualization() {
        // Volume rendering shader for density field
        const volumeShader = {
            uniforms: {
                densityTexture: { value: null },
                kdeTexture: { value: null },
                threshold: { value: 0.01 },
                opacity: { value: 0.3 },
                stepSize: { value: 0.01 },
                colormap: { value: null }
            },
            vertexShader: `
                varying vec3 worldPos;
                varying vec3 rayDir;
                
                void main() {
                    worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    rayDir = worldPos - cameraPosition;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler3D densityTexture;
                uniform sampler3D kdeTexture;
                uniform float threshold;
                uniform float opacity;
                uniform float stepSize;
                uniform sampler2D colormap;
                
                varying vec3 worldPos;
                varying vec3 rayDir;
                
                void main() {
                    vec3 rayStart = worldPos;
                    vec3 rayEnd = rayStart + normalize(rayDir) * 20.0;
                    vec3 step = normalize(rayEnd - rayStart) * stepSize;
                    
                    vec4 color = vec4(0.0);
                    vec3 pos = rayStart;
                    
                    for (int i = 0; i < 200; i++) {
                        vec3 texCoord = (pos + 10.0) / 20.0; // Normalize to [0,1]
                        
                        if (texCoord.x < 0.0 || texCoord.x > 1.0 ||
                            texCoord.y < 0.0 || texCoord.y > 1.0 ||
                            texCoord.z < 0.0 || texCoord.z > 1.0) break;
                        
                        float density = texture(kdeTexture, texCoord).r;
                        
                        if (density > threshold) {
                            vec3 sampleColor = texture2D(colormap, vec2(density, 0.5)).rgb;
                            float alpha = density * opacity;
                            
                            color.rgb += sampleColor * alpha * (1.0 - color.a);
                            color.a += alpha * (1.0 - color.a);
                            
                            if (color.a > 0.95) break;
                        }
                        
                        pos += step;
                    }
                    
                    gl_FragColor = color;
                }
            `
        };
        
        // Create volume rendering box
        const geometry = new THREE.BoxGeometry(20, 20, 20);
        const material = new THREE.ShaderMaterial(volumeShader);
        material.transparent = true;
        material.side = THREE.BackSide;
        
        this.densityMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.densityMesh);
    }

    /**
     * Update visualization with computed density data
     */
    updateVisualization() {
        if (!this.densityMesh) return;
        
        // Create 3D texture from density data
        this.createDensityTexture();
        
        // Update isosurface meshes
        this.updateIsosurfaceMeshes();
        
        // Update adaptive mesh visualization
        this.updateAdaptiveMeshVisualization();
    }

    /**
     * Create 3D texture from density grid
     */
    createDensityTexture() {
        const size = this.config.gridResolution;
        const data = new Uint8Array(size * size * size);
        
        // Convert density data to texture format
        let maxDensity = 0;
        for (let i = 0; i < this.kdeDensityGrid.length; i++) {
            maxDensity = Math.max(maxDensity, this.kdeDensityGrid[i]);
        }
        
        if (maxDensity > 0) {
            for (let i = 0; i < this.kdeDensityGrid.length; i++) {
                data[i] = Math.min(255, Math.floor(255 * this.kdeDensityGrid[i] / maxDensity));
            }
        }
        
        const texture = new THREE.Data3DTexture(data, size, size, size);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        
        this.densityMesh.material.uniforms.kdeTexture.value = texture;
    }

    /**
     * Update isosurface meshes
     */
    updateIsosurfaceMeshes() {
        // Remove old meshes
        this.isosurfaceMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.isosurfaceMeshes = [];
        
        // Create new isosurface meshes
        this.isosurfaces.forEach((surface, index) => {
            if (surface.vertices.length > 0) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', 
                    new THREE.Float32BufferAttribute(surface.vertices, 3));
                
                if (surface.normals.length > 0) {
                    geometry.setAttribute('normal', 
                        new THREE.Float32BufferAttribute(surface.normals, 3));
                }
                
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color().setHSL(index / this.isosurfaces.length, 0.8, 0.6),
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                });
                
                const mesh = new THREE.Points(geometry, new THREE.PointsMaterial({
                    color: material.color,
                    size: 0.1,
                    transparent: true,
                    opacity: 0.8
                }));
                
                this.scene.add(mesh);
                this.isosurfaceMeshes.push(mesh);
            }
        });
    }

    /**
     * Update adaptive mesh visualization
     */
    updateAdaptiveMeshVisualization() {
        // Visualize adaptive mesh cells as wireframe boxes
        // This would create a complex multi-resolution mesh visualization
        // Implementation would create wireframe boxes at different scales
    }

    /**
     * Update configuration parameters in real-time
     */
    updateParameters(newConfig) {
        let needsRecalculation = false;
        
        if (newConfig.minDensityThreshold !== undefined) {
            this.config.minDensityThreshold = newConfig.minDensityThreshold;
            console.log('Updated density threshold to:', newConfig.minDensityThreshold);
        }
        
        if (newConfig.kernelBandwidth !== undefined) {
            this.config.kernelBandwidth = newConfig.kernelBandwidth;
            needsRecalculation = true;
            console.log('Updated KDE bandwidth to:', newConfig.kernelBandwidth);
        }
        
        if (newConfig.isosurfaceLevels !== undefined) {
            this.config.isosurfaceLevels = newConfig.isosurfaceLevels;
            // Recalculate isosurfaces only
            this.extractIsosurfaces();
            this.updateIsosurfaceMeshes();
            console.log('Updated isosurface levels to:', newConfig.isosurfaceLevels);
        }
        
        // If bandwidth changed, we need to recompute KDE
        if (needsRecalculation && this.trajectoryPoints.length > 1000) {
            console.log('Recalculating KDE with new parameters...');
            setTimeout(() => {
                this.computeKernelDensityEstimation();
                this.extractIsosurfaces();
                this.updateVisualization();
            }, 100); // Defer to avoid blocking UI
        }
    }

    /**
     * Get statistical summary
     */
    getStatistics() {
        return {
            totalPoints: this.trajectoryPoints.length,
            meanPosition: this.meanPosition,
            covarianceMatrix: this.covarianceMatrix,
            shannonEntropy: this.shannonEntropy,
            correlationDimension: this.correlationDimension,
            informationDimension: this.informationDimension,
            adaptiveMeshCells: this.adaptiveMesh ? this.adaptiveMesh.length : 0,
            isosurfaceLevels: this.isosurfaces.length
        };
    }

    /**
     * Update with new trajectory data
     */
    update(trajectoryPoints) {
        this.addTrajectoryPoints(trajectoryPoints);
        
        // Recompute every N points to avoid too frequent updates
        if (this.trajectoryPoints.length % 1000 === 0) {
            console.log('Recomputing research-grade density field...');
            this.computeDensityField();
            this.updateVisualization();
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.densityMesh) {
            this.scene.remove(this.densityMesh);
            this.densityMesh.geometry.dispose();
            this.densityMesh.material.dispose();
        }
        
        this.isosurfaceMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
    }
}