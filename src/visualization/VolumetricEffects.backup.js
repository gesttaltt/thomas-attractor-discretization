/**
 * Volumetric Effects for Thomas Attractor
 * Data-driven visualizations computed from actual trajectory analysis
 */

import { ResearchGradeDensityField } from './ResearchGradeDensityField.js';
import { ResearchGradeVelocityField } from './ResearchGradeVelocityField.js';
import { StochasticFieldComputer } from './StochasticFieldComputer.js';

export class VolumetricEffects {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            gridSize: config.gridSize || 64,
            spatialRange: config.spatialRange || 20,
            densityThreshold: config.densityThreshold || 0.1,
            velocityScale: config.velocityScale || 1.0,
            updateInterval: config.updateInterval || 60,
            maxTrajectoryPoints: config.maxTrajectoryPoints || 50000,
            ...config
        };

        // Raw trajectory data for analysis
        this.trajectoryPoints = [];
        this.trajectoryVelocities = [];
        this.trajectoryTimes = [];
        
        // Computed field data
        this.densityGrid = new Float32Array(this.config.gridSize ** 3);
        this.velocityGridX = new Float32Array(this.config.gridSize ** 3);
        this.velocityGridY = new Float32Array(this.config.gridSize ** 3);
        this.velocityGridZ = new Float32Array(this.config.gridSize ** 3);
        this.divergenceGrid = new Float32Array(this.config.gridSize ** 3);
        this.vorticityGridX = new Float32Array(this.config.gridSize ** 3);
        this.vorticityGridY = new Float32Array(this.config.gridSize ** 3);
        this.vorticityGridZ = new Float32Array(this.config.gridSize ** 3);
        
        // Poincaré section data
        this.poincareXY = []; // z ≈ 0
        this.poincareXZ = []; // y ≈ 0  
        this.poincareYZ = []; // x ≈ 0
        
        // Visualization objects
        this.effects = {};
        this.frameCount = 0;
        
        // Thomas attractor parameter
        this.b = config.b || 0.19;
        
        // Research-grade density field
        this.researchDensityField = null;
        
        // Research-grade velocity field
        this.researchVelocityField = null;
        
        // Stochastic field computer for efficient computation
        this.stochasticComputer = null;
        this.useStochastic = config.useStochastic !== false; // Default to true
        
        this.init();
    }

    init() {
        // Don't initialize anything if no effects are enabled
        const hasAnyEffect = this.config.enableDensityClouds === true ||
                            this.config.enableVelocityGlow === true ||
                            this.config.enableEnergyField === true ||
                            this.config.enableVorticity === true ||
                            this.config.enablePhaseFlow === true;
        
        if (!hasAnyEffect) {
            console.log('No volumetric effects enabled, skipping initialization');
            return;
        }
        
        // Initialize stochastic computer for efficient field computation
        if (this.useStochastic) {
            try {
                this.stochasticComputer = new StochasticFieldComputer({
                    b: this.b,
                    monteCarloSamples: 5000, // Much fewer samples needed
                    cacheLevels: 3,
                    cacheGridSize: 16,
                    basisFunctions: 12,
                    asyncCompute: true
                });
                console.log('✅ Stochastic field computer initialized');
            } catch (error) {
                console.error('Failed to initialize stochastic computer:', error);
                this.useStochastic = false;
            }
        }
        
        if (this.config.enableDensityClouds === true) {
            try {
                if (this.useStochastic) {
                    // Use stochastic computation for performance
                    this.createStochasticDensityVisualization();
                } else {
                    // Use research-grade density field (slower but more accurate)
                    this.researchDensityField = new ResearchGradeDensityField(this.scene, {
                        gridResolution: 64, // Reduced from 128
                        spatialRange: 12,
                        kernelBandwidth: 0.3,
                        minDensityThreshold: 1e-5,
                        maxHistoryPoints: 10000, // Reduced from 100000
                        isosurfaceLevels: [0.2, 0.5, 0.8]
                    });
                    this.effects.densityClouds = { researchField: this.researchDensityField };
                    console.log('✅ Research density field initialized');
                }
            } catch (error) {
                console.error('Failed to initialize density field:', error);
                // Fallback to basic implementation
                this.createDensityVisualization();
            }
        }
        
        if (this.config.enableVelocityGlow === true) {
            try {
                // Use research-grade velocity field instead of basic visualization
                this.researchVelocityField = new ResearchGradeVelocityField(this.scene, {
                    gridResolution: 64,
                    spatialRange: 12,
                    streamlineCount: 30,
                    streamlineLength: 150,
                    adaptiveStepSize: true,
                    lyapunovIterations: 500,
                    b: this.b
                });
                this.effects.velocityGlow = { researchField: this.researchVelocityField };
                console.log('✅ Research velocity field initialized');
            } catch (error) {
                console.error('Failed to initialize research velocity field:', error);
                // Fallback to basic implementation
                this.createVelocityVisualization();
            }
        }
        
        if (this.config.enableEnergyField === true) {
            this.createDivergenceVisualization();
        }
        
        if (this.config.enableVorticity === true) {
            this.createVorticityVisualization();
        }
        
        if (this.config.enablePhaseFlow === true) {
            this.createPoincareVisualization();
        }
    }

    /**
     * Stochastic density visualization for better performance
     */
    createStochasticDensityVisualization() {
        if (!this.stochasticComputer) {
            console.error('Stochastic computer not initialized');
            return this.createDensityVisualization();
        }
        
        const geometry = new THREE.BufferGeometry();
        const gridSize = 32; // Lower resolution for real-time performance
        const range = this.config.spatialRange;
        
        // Create point cloud for density visualization
        const maxPoints = gridSize ** 3;
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);
        const sizes = new Float32Array(maxPoints);
        
        // Compute field using stochastic method
        const densityField = new Float32Array(gridSize ** 3);
        this.stochasticComputer.computeFieldStochastic(densityField, gridSize, range);
        
        // Convert to point cloud
        let pointCount = 0;
        const threshold = 0.01;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const idx = i + j * gridSize + k * gridSize * gridSize;
                    const density = densityField[idx];
                    
                    if (density > threshold) {
                        const x = -range + (i + 0.5) * (2 * range / gridSize);
                        const y = -range + (j + 0.5) * (2 * range / gridSize);
                        const z = -range + (k + 0.5) * (2 * range / gridSize);
                        
                        positions[pointCount * 3] = x;
                        positions[pointCount * 3 + 1] = y;
                        positions[pointCount * 3 + 2] = z;
                        
                        // Color based on density
                        const intensity = Math.min(1, density * 10);
                        colors[pointCount * 3] = 0.1 + intensity * 0.4;
                        colors[pointCount * 3 + 1] = 0.5 + intensity * 0.3;
                        colors[pointCount * 3 + 2] = 0.9;
                        
                        sizes[pointCount] = 0.1 + density * 2;
                        pointCount++;
                    }
                }
            }
        }
        
        // Trim arrays
        geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, pointCount * 3), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, pointCount * 3), 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes.slice(0, pointCount), 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const mesh = new THREE.Points(geometry, material);
        this.scene.add(mesh);
        
        this.effects.densityClouds = { 
            mesh, 
            material, 
            stochastic: true,
            update: () => {
                // Periodic cache update
                if (Date.now() - this.stochasticComputer.lastCacheUpdate > 5000) {
                    this.stochasticComputer.clearCache();
                    this.stochasticComputer.computeFieldStochastic(densityField, gridSize, range);
                }
            }
        };
        
        console.log(`✅ Stochastic density field created with ${pointCount} points`);
    }
    
    /**
     * 1. DENSITY FIELD - Generated from actual trajectory occupation
     */
    createDensityVisualization() {
        // Create empty geometry that will be populated with actual density data
        const geometry = new THREE.BufferGeometry();
        
        // Pre-allocate arrays for maximum possible vertices (will be trimmed)
        const maxVertices = this.config.gridSize ** 3 * 8; // cube vertices
        const positions = new Float32Array(maxVertices * 3);
        const colors = new Float32Array(maxVertices * 3);
        const indices = [];
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const mesh = new THREE.Points(geometry, material);
        this.scene.add(mesh);
        
        this.effects.densityClouds = {
            mesh: mesh,
            geometry: geometry,
            material: material,
            vertexCount: 0
        };
    }

    /**
     * 2. VELOCITY FIELD - Computed from trajectory derivatives
     */
    createVelocityVisualization() {
        const geometry = new THREE.BufferGeometry();
        
        // Each arrow needs 6 vertices (2 triangles for shaft + head)
        const maxArrows = Math.floor(this.config.gridSize ** 3 / 8); // Sparse grid
        const positions = new Float32Array(maxArrows * 6 * 3);
        const colors = new Float32Array(maxArrows * 6 * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        
        this.effects.velocityGlow = {
            mesh: mesh,
            geometry: geometry,
            material: material,
            arrowCount: 0
        };
    }

    /**
     * 3. DIVERGENCE FIELD - Isosurfaces from computed divergence
     */
    createDivergenceVisualization() {
        const geometry = new THREE.BufferGeometry();
        
        // Marching cubes will generate varying number of vertices
        const maxVertices = this.config.gridSize ** 3 * 15; // Conservative estimate
        const positions = new Float32Array(maxVertices * 3);
        const colors = new Float32Array(maxVertices * 3);
        const normals = new Float32Array(maxVertices * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        
        this.effects.energyField = {
            mesh: mesh,
            geometry: geometry,
            material: material,
            vertexCount: 0
        };
    }

    /**
     * 4. VORTICITY FIELD - Streamlines from curl calculations
     */
    createVorticityVisualization() {
        const geometry = new THREE.BufferGeometry();
        
        // Vorticity streamlines as connected line segments
        const maxPoints = 10000;
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            linewidth: 2
        });
        
        const mesh = new THREE.Line(geometry, material);
        this.scene.add(mesh);
        
        this.effects.vorticityRibbons = {
            mesh: mesh,
            geometry: geometry,
            material: material,
            lineCount: 0
        };
    }

    /**
     * 5. POINCARÉ SECTIONS - Points from actual plane crossings
     */
    createPoincareVisualization() {
        // Create three separate point clouds for each section
        const createSection = (color) => {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(10000 * 3); // Max intersection points
            const colors = new Float32Array(10000 * 3);
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const material = new THREE.PointsMaterial({
                size: 0.1,
                vertexColors: true,
                transparent: true,
                opacity: 0.9
            });
            
            const mesh = new THREE.Points(geometry, material);
            this.scene.add(mesh);
            
            return { mesh, geometry, material, pointCount: 0 };
        };
        
        this.effects.phaseFlowLines = {
            sectionXY: createSection(0x0088ff), // Blue for XY (z=0)
            sectionXZ: createSection(0x88ff00), // Green for XZ (y=0)
            sectionYZ: createSection(0xff8800), // Orange for YZ (x=0)
            mesh: null // For compatibility
        };
    }

    /**
     * Main update function called with new trajectory points
     */
    updateFromTrajectory(newPoints) {
        // Update research-grade fields
        if (this.researchDensityField) {
            this.researchDensityField.update(newPoints);
            
            // Log research statistics periodically
            if (this.frameCount % 600 === 0) {
                const stats = this.researchDensityField.getStatistics();
                console.log('🔬 Research Density Field Statistics:', {
                    points: stats.totalPoints,
                    entropy: stats.shannonEntropy?.toFixed(4),
                    corrDim: stats.correlationDimension?.toFixed(4),
                    infoDim: stats.informationDimension?.toFixed(4),
                    adaptiveCells: stats.adaptiveMeshCells,
                    isosurfaces: stats.isosurfaceLevels
                });
            }
        }
        
        if (this.researchVelocityField) {
            this.researchVelocityField.update(newPoints);
            
            // Log velocity field statistics periodically
            if (this.frameCount % 600 === 0) {
                const stats = this.researchVelocityField.getStatistics();
                console.log('🔬 Research Velocity Field Statistics:', {
                    globalLyapunov: stats.globalLyapunovExponent?.toFixed(6),
                    criticalPoints: stats.criticalPoints,
                    saddlePoints: stats.saddlePoints,
                    spiralPoints: stats.spiralPoints,
                    nodePoints: stats.nodePoints,
                    streamlines: stats.streamlines
                });
            }
        }
        
        // Add new points to trajectory history for other effects
        newPoints.forEach(point => {
            this.trajectoryPoints.push([...point]);
            
            // Calculate velocity at this point using Thomas attractor equations
            const [x, y, z] = point;
            const vx = Math.sin(y) - this.b * x;
            const vy = Math.sin(z) - this.b * y;
            const vz = Math.sin(x) - this.b * z;
            this.trajectoryVelocities.push([vx, vy, vz]);
            this.trajectoryTimes.push(performance.now());
            
            // Maintain buffer size
            if (this.trajectoryPoints.length > this.config.maxTrajectoryPoints) {
                this.trajectoryPoints.shift();
                this.trajectoryVelocities.shift();
                this.trajectoryTimes.shift();
            }
            
            // Check for Poincaré section crossings
            this.updatePoincareIntersections(point);
        });
        
        // Update visualizations periodically
        if (++this.frameCount % this.config.updateInterval === 0) {
            this.computeDensityField();
            this.computeVelocityField();
            this.computeDivergenceField();
            this.computeVorticityField();
            this.updateAllVisualizations();
        }
    }

    /**
     * Compute density field from trajectory point distribution
     */
    computeDensityField() {
        // Reset density grid
        this.densityGrid.fill(0);
        
        const gridSize = this.config.gridSize;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        // Count trajectory points in each grid cell
        this.trajectoryPoints.forEach(point => {
            const [x, y, z] = point;
            
            // Convert world coordinates to grid indices
            const i = Math.floor((x + range) / cellSize);
            const j = Math.floor((y + range) / cellSize);
            const k = Math.floor((z + range) / cellSize);
            
            // Check bounds
            if (i >= 0 && i < gridSize && j >= 0 && j < gridSize && k >= 0 && k < gridSize) {
                const index = i + j * gridSize + k * gridSize * gridSize;
                this.densityGrid[index]++;
            }
        });
        
        // Normalize density values
        const maxDensity = Math.max(...this.densityGrid);
        if (maxDensity > 0) {
            for (let i = 0; i < this.densityGrid.length; i++) {
                this.densityGrid[i] /= maxDensity;
            }
        }
    }

    /**
     * Compute velocity field by interpolating trajectory velocities
     */
    computeVelocityField() {
        const gridSize = this.config.gridSize;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        // Reset velocity grids
        this.velocityGridX.fill(0);
        this.velocityGridY.fill(0);
        this.velocityGridZ.fill(0);
        
        // For each grid point, find nearest trajectory points and interpolate
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const gridIndex = i + j * gridSize + k * gridSize * gridSize;
                    
                    // World position of this grid point
                    const worldX = -range + (i + 0.5) * cellSize;
                    const worldY = -range + (j + 0.5) * cellSize;
                    const worldZ = -range + (k + 0.5) * cellSize;
                    
                    // Find nearby trajectory points and average their velocities
                    let sumVx = 0, sumVy = 0, sumVz = 0, count = 0;
                    const searchRadius = cellSize * 2;
                    
                    for (let t = 0; t < this.trajectoryPoints.length; t++) {
                        const [px, py, pz] = this.trajectoryPoints[t];
                        const [vx, vy, vz] = this.trajectoryVelocities[t];
                        
                        const dist = Math.sqrt(
                            (px - worldX) ** 2 + 
                            (py - worldY) ** 2 + 
                            (pz - worldZ) ** 2
                        );
                        
                        if (dist < searchRadius) {
                            const weight = 1 / (1 + dist);
                            sumVx += vx * weight;
                            sumVy += vy * weight;
                            sumVz += vz * weight;
                            count += weight;
                        }
                    }
                    
                    if (count > 0) {
                        this.velocityGridX[gridIndex] = sumVx / count;
                        this.velocityGridY[gridIndex] = sumVy / count;
                        this.velocityGridZ[gridIndex] = sumVz / count;
                    }
                }
            }
        }
    }

    /**
     * Compute divergence field from velocity gradients
     */
    computeDivergenceField() {
        const gridSize = this.config.gridSize;
        
        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                for (let k = 1; k < gridSize - 1; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    // Calculate divergence using finite differences
                    const dvx_dx = (this.velocityGridX[index + 1] - this.velocityGridX[index - 1]) / 2;
                    const dvy_dy = (this.velocityGridY[index + gridSize] - this.velocityGridY[index - gridSize]) / 2;
                    const dvz_dz = (this.velocityGridZ[index + gridSize * gridSize] - this.velocityGridZ[index - gridSize * gridSize]) / 2;
                    
                    this.divergenceGrid[index] = dvx_dx + dvy_dy + dvz_dz;
                }
            }
        }
    }

    /**
     * Compute vorticity field from velocity curl
     */
    computeVorticityField() {
        const gridSize = this.config.gridSize;
        
        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                for (let k = 1; k < gridSize - 1; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    // Calculate curl using finite differences
                    const dvz_dy = (this.velocityGridZ[index + gridSize] - this.velocityGridZ[index - gridSize]) / 2;
                    const dvy_dz = (this.velocityGridY[index + gridSize * gridSize] - this.velocityGridY[index - gridSize * gridSize]) / 2;
                    
                    const dvx_dz = (this.velocityGridX[index + gridSize * gridSize] - this.velocityGridX[index - gridSize * gridSize]) / 2;
                    const dvz_dx = (this.velocityGridZ[index + 1] - this.velocityGridZ[index - 1]) / 2;
                    
                    const dvy_dx = (this.velocityGridY[index + 1] - this.velocityGridY[index - 1]) / 2;
                    const dvx_dy = (this.velocityGridX[index + gridSize] - this.velocityGridX[index - gridSize]) / 2;
                    
                    this.vorticityGridX[index] = dvz_dy - dvy_dz;
                    this.vorticityGridY[index] = dvx_dz - dvz_dx;
                    this.vorticityGridZ[index] = dvy_dx - dvx_dy;
                }
            }
        }
    }

    /**
     * Detect Poincaré section crossings
     */
    updatePoincareIntersections(point) {
        const [x, y, z] = point;
        const threshold = 0.1;
        
        // XY plane (z ≈ 0)
        if (Math.abs(z) < threshold) {
            this.poincareXY.push([x, y, 0]);
            if (this.poincareXY.length > 3000) this.poincareXY.shift();
        }
        
        // XZ plane (y ≈ 0)
        if (Math.abs(y) < threshold) {
            this.poincareXZ.push([x, 0, z]);
            if (this.poincareXZ.length > 3000) this.poincareXZ.shift();
        }
        
        // YZ plane (x ≈ 0)
        if (Math.abs(x) < threshold) {
            this.poincareYZ.push([0, y, z]);
            if (this.poincareYZ.length > 3000) this.poincareYZ.shift();
        }
    }

    /**
     * Update all visualizations with computed data
     */
    updateAllVisualizations() {
        this.updateDensityVisualization();
        this.updateVelocityVisualization();
        this.updateDivergenceVisualization();
        this.updateVorticityVisualization();
        this.updatePoincareVisualization();
    }

    /**
     * Update density visualization with actual density data
     */
    updateDensityVisualization() {
        if (!this.effects.densityClouds) return;
        
        const positions = this.effects.densityClouds.geometry.attributes.position.array;
        const colors = this.effects.densityClouds.geometry.attributes.color.array;
        
        const gridSize = this.config.gridSize;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        let vertexIndex = 0;
        
        // Generate vertices only where density exceeds threshold
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const gridIndex = i + j * gridSize + k * gridSize * gridSize;
                    const density = this.densityGrid[gridIndex];
                    
                    if (density > this.config.densityThreshold && vertexIndex < positions.length / 3) {
                        // World position
                        const worldX = (-range + (i + 0.5) * cellSize) * 5; // Scale for rendering
                        const worldY = (-range + (j + 0.5) * cellSize) * 5;
                        const worldZ = (-range + (k + 0.5) * cellSize) * 5;
                        
                        positions[vertexIndex * 3] = worldX;
                        positions[vertexIndex * 3 + 1] = worldY;
                        positions[vertexIndex * 3 + 2] = worldZ;
                        
                        // Color based on density
                        const intensity = density;
                        colors[vertexIndex * 3] = 0.1;
                        colors[vertexIndex * 3 + 1] = 0.5 + intensity * 0.5;
                        colors[vertexIndex * 3 + 2] = 0.8 + intensity * 0.2;
                        
                        vertexIndex++;
                    }
                }
            }
        }
        
        this.effects.densityClouds.vertexCount = vertexIndex;
        this.effects.densityClouds.geometry.setDrawRange(0, vertexIndex);
        this.effects.densityClouds.geometry.attributes.position.needsUpdate = true;
        this.effects.densityClouds.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update velocity visualization with computed velocity field
     */
    updateVelocityVisualization() {
        if (!this.effects.velocityGlow) return;
        
        const positions = this.effects.velocityGlow.geometry.attributes.position.array;
        const colors = this.effects.velocityGlow.geometry.attributes.color.array;
        
        const gridSize = this.config.gridSize;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        const step = 4; // Skip some grid points for performance
        
        let vertexIndex = 0;
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                for (let k = 0; k < gridSize; k += step) {
                    const gridIndex = i + j * gridSize + k * gridSize * gridSize;
                    
                    const vx = this.velocityGridX[gridIndex];
                    const vy = this.velocityGridY[gridIndex];
                    const vz = this.velocityGridZ[gridIndex];
                    const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);
                    
                    if (magnitude > 0.1 && vertexIndex < positions.length / 18) { // 6 vertices per arrow, 3 coords each
                        // World position
                        const worldX = (-range + (i + 0.5) * cellSize) * 5;
                        const worldY = (-range + (j + 0.5) * cellSize) * 5;
                        const worldZ = (-range + (k + 0.5) * cellSize) * 5;
                        
                        // Normalized direction
                        const nx = vx / magnitude;
                        const ny = vy / magnitude;
                        const nz = vz / magnitude;
                        
                        const scale = magnitude * this.config.velocityScale * 2;
                        
                        // Create simple line arrow (2 vertices)
                        const baseIndex = vertexIndex * 6;
                        
                        // Arrow start
                        positions[baseIndex] = worldX;
                        positions[baseIndex + 1] = worldY;
                        positions[baseIndex + 2] = worldZ;
                        
                        // Arrow end
                        positions[baseIndex + 3] = worldX + nx * scale;
                        positions[baseIndex + 4] = worldY + ny * scale;
                        positions[baseIndex + 5] = worldZ + nz * scale;
                        
                        // Color based on magnitude
                        const hue = 0.7 - magnitude * 0.3; // Blue to red
                        const color = new THREE.Color().setHSL(hue, 1, 0.5);
                        
                        colors[baseIndex] = color.r;
                        colors[baseIndex + 1] = color.g;
                        colors[baseIndex + 2] = color.b;
                        colors[baseIndex + 3] = color.r;
                        colors[baseIndex + 4] = color.g;
                        colors[baseIndex + 5] = color.b;
                        
                        vertexIndex++;
                    }
                }
            }
        }
        
        this.effects.velocityGlow.arrowCount = vertexIndex;
        this.effects.velocityGlow.geometry.setDrawRange(0, vertexIndex * 2);
        this.effects.velocityGlow.geometry.attributes.position.needsUpdate = true;
        this.effects.velocityGlow.geometry.attributes.color.needsUpdate = true;
        
        // Switch to line rendering
        if (this.effects.velocityGlow.mesh.type !== 'Line') {
            this.scene.remove(this.effects.velocityGlow.mesh);
            this.effects.velocityGlow.mesh = new THREE.LineSegments(
                this.effects.velocityGlow.geometry, 
                new THREE.LineBasicMaterial({ vertexColors: true })
            );
            this.scene.add(this.effects.velocityGlow.mesh);
        }
    }

    /**
     * Update divergence visualization
     */
    updateDivergenceVisualization() {
        if (!this.effects.energyField) return;
        
        // Simple visualization: show high divergence points
        const positions = this.effects.energyField.geometry.attributes.position.array;
        const colors = this.effects.energyField.geometry.attributes.color.array;
        
        const gridSize = this.config.gridSize;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        let vertexIndex = 0;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const gridIndex = i + j * gridSize + k * gridSize * gridSize;
                    const divergence = this.divergenceGrid[gridIndex];
                    
                    if (Math.abs(divergence) > 0.01 && vertexIndex < positions.length / 3) {
                        const worldX = (-range + (i + 0.5) * cellSize) * 5;
                        const worldY = (-range + (j + 0.5) * cellSize) * 5;
                        const worldZ = (-range + (k + 0.5) * cellSize) * 5;
                        
                        positions[vertexIndex * 3] = worldX;
                        positions[vertexIndex * 3 + 1] = worldY;
                        positions[vertexIndex * 3 + 2] = worldZ;
                        
                        // Color: red for positive divergence, blue for negative
                        if (divergence > 0) {
                            colors[vertexIndex * 3] = 1;
                            colors[vertexIndex * 3 + 1] = 0.2;
                            colors[vertexIndex * 3 + 2] = 0.2;
                        } else {
                            colors[vertexIndex * 3] = 0.2;
                            colors[vertexIndex * 3 + 1] = 0.2;
                            colors[vertexIndex * 3 + 2] = 1;
                        }
                        
                        vertexIndex++;
                    }
                }
            }
        }
        
        this.effects.energyField.vertexCount = vertexIndex;
        this.effects.energyField.geometry.setDrawRange(0, vertexIndex);
        this.effects.energyField.geometry.attributes.position.needsUpdate = true;
        this.effects.energyField.geometry.attributes.color.needsUpdate = true;
        
        // Switch to points rendering
        if (this.effects.energyField.mesh.type !== 'Points') {
            this.scene.remove(this.effects.energyField.mesh);
            this.effects.energyField.mesh = new THREE.Points(
                this.effects.energyField.geometry,
                new THREE.PointsMaterial({ vertexColors: true, size: 0.3 })
            );
            this.scene.add(this.effects.energyField.mesh);
        }
    }

    /**
     * Update vorticity visualization
     */
    updateVorticityVisualization() {
        if (!this.effects.vorticityRibbons) return;
        
        const positions = this.effects.vorticityRibbons.geometry.attributes.position.array;
        const colors = this.effects.vorticityRibbons.geometry.attributes.color.array;
        
        const gridSize = this.config.gridSize;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        const step = 6;
        
        let vertexIndex = 0;
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                for (let k = 0; k < gridSize; k += step) {
                    const gridIndex = i + j * gridSize + k * gridSize * gridSize;
                    
                    const wx = this.vorticityGridX[gridIndex];
                    const wy = this.vorticityGridY[gridIndex];
                    const wz = this.vorticityGridZ[gridIndex];
                    const magnitude = Math.sqrt(wx * wx + wy * wy + wz * wz);
                    
                    if (magnitude > 0.1 && vertexIndex < positions.length / 6) {
                        const worldX = (-range + (i + 0.5) * cellSize) * 5;
                        const worldY = (-range + (j + 0.5) * cellSize) * 5;
                        const worldZ = (-range + (k + 0.5) * cellSize) * 5;
                        
                        // Vorticity line
                        const scale = magnitude * 3;
                        const nx = wx / magnitude;
                        const ny = wy / magnitude;
                        const nz = wz / magnitude;
                        
                        const baseIndex = vertexIndex * 6;
                        
                        positions[baseIndex] = worldX - nx * scale * 0.5;
                        positions[baseIndex + 1] = worldY - ny * scale * 0.5;
                        positions[baseIndex + 2] = worldZ - nz * scale * 0.5;
                        positions[baseIndex + 3] = worldX + nx * scale * 0.5;
                        positions[baseIndex + 4] = worldY + ny * scale * 0.5;
                        positions[baseIndex + 5] = worldZ + nz * scale * 0.5;
                        
                        // Purple-to-yellow based on magnitude
                        const intensity = Math.min(magnitude, 1);
                        colors[baseIndex] = 0.8;
                        colors[baseIndex + 1] = 0.3 + intensity * 0.7;
                        colors[baseIndex + 2] = 0.8;
                        colors[baseIndex + 3] = 0.8;
                        colors[baseIndex + 4] = 0.3 + intensity * 0.7;
                        colors[baseIndex + 5] = 0.8;
                        
                        vertexIndex++;
                    }
                }
            }
        }
        
        this.effects.vorticityRibbons.lineCount = vertexIndex;
        this.effects.vorticityRibbons.geometry.setDrawRange(0, vertexIndex * 2);
        this.effects.vorticityRibbons.geometry.attributes.position.needsUpdate = true;
        this.effects.vorticityRibbons.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update Poincaré sections with actual intersection data
     */
    updatePoincareVisualization() {
        if (!this.effects.phaseFlowLines) return;
        
        const updateSection = (section, data, color) => {
            const positions = section.geometry.attributes.position.array;
            const colors = section.geometry.attributes.color.array;
            
            const pointCount = Math.min(data.length, positions.length / 3);
            
            for (let i = 0; i < pointCount; i++) {
                const [x, y, z] = data[i];
                positions[i * 3] = x * 5;
                positions[i * 3 + 1] = y * 5;
                positions[i * 3 + 2] = z * 5;
                
                colors[i * 3] = (color >> 16 & 0xff) / 255;
                colors[i * 3 + 1] = (color >> 8 & 0xff) / 255;
                colors[i * 3 + 2] = (color & 0xff) / 255;
            }
            
            section.pointCount = pointCount;
            section.geometry.setDrawRange(0, pointCount);
            section.geometry.attributes.position.needsUpdate = true;
            section.geometry.attributes.color.needsUpdate = true;
        };
        
        updateSection(this.effects.phaseFlowLines.sectionXY, this.poincareXY, 0x0088ff);
        updateSection(this.effects.phaseFlowLines.sectionXZ, this.poincareXZ, 0x88ff00);
        updateSection(this.effects.phaseFlowLines.sectionYZ, this.poincareYZ, 0xff8800);
    }

    /**
     * Animation updates
     */
    animate(time) {
        // No arbitrary animations - all based on data
    }

    /**
     * Set Thomas attractor parameter
     */
    setParameter(b) {
        this.b = b;
        // Clear computed fields to force recalculation
        this.densityGrid.fill(0);
        this.velocityGridX.fill(0);
        this.velocityGridY.fill(0);
        this.velocityGridZ.fill(0);
    }

    /**
     * Clear all data
     */
    clear() {
        this.trajectoryPoints = [];
        this.trajectoryVelocities = [];
        this.trajectoryTimes = [];
        this.poincareXY = [];
        this.poincareXZ = [];
        this.poincareYZ = [];
        
        this.densityGrid.fill(0);
        this.velocityGridX.fill(0);
        this.velocityGridY.fill(0);
        this.velocityGridZ.fill(0);
        this.divergenceGrid.fill(0);
        this.vorticityGridX.fill(0);
        this.vorticityGridY.fill(0);
        this.vorticityGridZ.fill(0);
    }

    /**
     * Dispose of all effects
     */
    enableEffect(effectName) {
        console.log(`Enabling effect: ${effectName}`);
        
        switch(effectName) {
            case 'densityClouds':
                if (!this.effects.densityClouds && !this.config.enableDensityClouds) {
                    this.config.enableDensityClouds = true;
                    if (this.useStochastic) {
                        this.createStochasticDensityVisualization();
                    } else {
                        this.createResearchGradeDensityField();
                    }
                }
                break;
                
            case 'velocityGlow':
                if (!this.effects.velocityGlow && !this.config.enableVelocityGlow) {
                    this.config.enableVelocityGlow = true;
                    this.createVelocityField();
                }
                break;
                
            case 'energyField':
                if (!this.effects.energyField && !this.config.enableEnergyField) {
                    this.config.enableEnergyField = true;
                    this.createEnergyField();
                }
                break;
                
            case 'vorticityRibbons':
                if (!this.effects.vorticityRibbons && !this.config.enableVorticity) {
                    this.config.enableVorticity = true;
                    this.createVorticityRibbons();
                }
                break;
                
            case 'phaseFlow':
                if (!this.effects.phaseFlowLines && !this.config.enablePhaseFlow) {
                    this.config.enablePhaseFlow = true;
                    this.createPhaseFlowLines();
                }
                break;
        }
        
        // Make visible if it exists
        if (this.effects[effectName] && this.effects[effectName].mesh) {
            this.effects[effectName].mesh.visible = true;
        }
    }
    
    disableEffect(effectName) {
        console.log(`Disabling effect: ${effectName}`);
        
        // Just hide it, don't dispose
        if (this.effects[effectName] && this.effects[effectName].mesh) {
            this.effects[effectName].mesh.visible = false;
        }
        
        this.config[`enable${effectName.charAt(0).toUpperCase() + effectName.slice(1)}`] = false;
    }

    dispose() {
        // Dispose research-grade fields
        if (this.researchDensityField) {
            this.researchDensityField.dispose();
            this.researchDensityField = null;
        }
        
        if (this.researchVelocityField) {
            this.researchVelocityField.dispose();
            this.researchVelocityField = null;
        }
        
        Object.values(this.effects).forEach(effect => {
            if (effect.researchField) {
                // Research field disposed above
                return;
            }
            if (effect.mesh) {
                if (effect.mesh.geometry) effect.mesh.geometry.dispose();
                if (effect.mesh.material) effect.mesh.material.dispose();
                this.scene.remove(effect.mesh);
            }
            if (effect.sectionXY) {
                this.scene.remove(effect.sectionXY.mesh);
                effect.sectionXY.mesh.geometry.dispose();
                effect.sectionXY.mesh.material.dispose();
            }
            if (effect.sectionXZ) {
                this.scene.remove(effect.sectionXZ.mesh);
                effect.sectionXZ.mesh.geometry.dispose();
                effect.sectionXZ.mesh.material.dispose();
            }
            if (effect.sectionYZ) {
                this.scene.remove(effect.sectionYZ.mesh);
                effect.sectionYZ.mesh.geometry.dispose();
                effect.sectionYZ.mesh.material.dispose();
            }
        });
        this.clear();
    }
}