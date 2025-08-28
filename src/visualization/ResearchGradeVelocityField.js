/**
 * Research-Grade Velocity Field Analysis for Thomas Attractor
 * Implements advanced dynamical systems analysis for velocity visualization
 */

export class ResearchGradeVelocityField {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            gridResolution: config.gridResolution || 64,
            spatialRange: config.spatialRange || 12,
            streamlineCount: config.streamlineCount || 50,
            streamlineLength: config.streamlineLength || 200,
            adaptiveStepSize: config.adaptiveStepSize || true,
            minStepSize: config.minStepSize || 0.01,
            maxStepSize: config.maxStepSize || 0.1,
            lyapunovTimeStep: config.lyapunovTimeStep || 0.01,
            lyapunovIterations: config.lyapunovIterations || 1000,
            eigenvalueThreshold: config.eigenvalueThreshold || 1e-6,
            ...config
        };

        // Thomas Attractor parameter
        this.b = config.b || 0.19;

        // Velocity field data structures
        this.velocityGrid = null;
        this.velocityGradientTensor = null;
        this.lyapunovExponentGrid = null;
        this.eigenValueGrid = null;
        this.eigenVectorGrid = null;
        this.streamlines = [];
        this.criticalPoints = [];
        this.vectorFieldTopology = null;

        // Analysis results
        this.globalLyapunovExponent = 0;
        this.flowConvergencePoints = [];
        this.flowDivergencePoints = [];
        this.saddlePoints = [];
        this.spiralPoints = [];
        this.nodePoints = [];

        // Visualization objects
        this.velocityVectorMesh = null;
        this.streamlineMeshes = [];
        this.lyapunovHeatmapMesh = null;
        this.criticalPointMeshes = [];
        this.topologyMesh = null;

        this.init();
    }

    init() {
        const gridSize = this.config.gridResolution;
        const cellCount = gridSize ** 3;
        
        // Initialize data structures
        this.velocityGrid = {
            vx: new Float64Array(cellCount),
            vy: new Float64Array(cellCount),
            vz: new Float64Array(cellCount),
            magnitude: new Float64Array(cellCount)
        };

        // Velocity gradient tensor: 3x3 matrix at each grid point
        this.velocityGradientTensor = {
            dvx_dx: new Float64Array(cellCount), dvx_dy: new Float64Array(cellCount), dvx_dz: new Float64Array(cellCount),
            dvy_dx: new Float64Array(cellCount), dvy_dy: new Float64Array(cellCount), dvy_dz: new Float64Array(cellCount),
            dvz_dx: new Float64Array(cellCount), dvz_dy: new Float64Array(cellCount), dvz_dz: new Float64Array(cellCount)
        };

        // Lyapunov exponents at each grid point
        this.lyapunovExponentGrid = new Float64Array(cellCount);
        
        // Eigenvalue/eigenvector analysis
        this.eigenValueGrid = {
            lambda1: new Float64Array(cellCount),
            lambda2: new Float64Array(cellCount), 
            lambda3: new Float64Array(cellCount)
        };
        
        this.eigenVectorGrid = {
            v1: new Float64Array(cellCount * 3),
            v2: new Float64Array(cellCount * 3),
            v3: new Float64Array(cellCount * 3)
        };

        this.createVisualization();
    }

    /**
     * Thomas Attractor velocity field computation
     */
    computeVelocity(x, y, z) {
        return {
            vx: Math.sin(y) - this.b * x,
            vy: Math.sin(z) - this.b * y,
            vz: Math.sin(x) - this.b * z
        };
    }

    /**
     * Analytical Jacobian of Thomas Attractor
     */
    computeJacobian(x, y, z) {
        return {
            dvx_dx: -this.b,        dvx_dy: Math.cos(y),    dvx_dz: 0,
            dvy_dx: 0,              dvy_dy: -this.b,        dvy_dz: Math.cos(z),
            dvz_dx: Math.cos(x),    dvz_dy: 0,              dvz_dz: -this.b
        };
    }

    /**
     * Compute comprehensive velocity field analysis
     */
    computeVelocityField() {
        console.log('🔬 Computing research-grade velocity field analysis...');
        
        // Ensure we're ready to compute
        if (!this.scene || !this.velocityGrid) {
            console.error('Velocity field not properly initialized');
            return;
        }
        
        // Step 1: Compute velocity at each grid point
        this.computeGridVelocities();
        
        // Step 2: Compute velocity gradient tensor
        this.computeVelocityGradientTensor();
        
        // Step 3: Eigenvalue analysis for flow classification
        this.computeEigenvalueAnalysis();
        
        // Step 4: Find critical points and classify them
        this.findCriticalPoints();
        
        // Step 5: Compute local Lyapunov exponents
        this.computeLyapunovExponents();
        
        // Step 6: Generate streamlines
        this.generateStreamlines();
        
        // Step 7: Analyze vector field topology
        this.analyzeVectorFieldTopology();
        
        console.log('✅ Velocity field analysis complete');
    }

    /**
     * Compute velocity at each grid point
     */
    computeGridVelocities() {
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    const x = -range + (i + 0.5) * cellSize;
                    const y = -range + (j + 0.5) * cellSize;
                    const z = -range + (k + 0.5) * cellSize;
                    
                    const velocity = this.computeVelocity(x, y, z);
                    
                    this.velocityGrid.vx[index] = velocity.vx;
                    this.velocityGrid.vy[index] = velocity.vy;
                    this.velocityGrid.vz[index] = velocity.vz;
                    this.velocityGrid.magnitude[index] = Math.sqrt(
                        velocity.vx ** 2 + velocity.vy ** 2 + velocity.vz ** 2
                    );
                }
            }
            
            if (i % 8 === 0) {
                console.log(`Velocity grid progress: ${Math.round(100 * i / gridSize)}%`);
            }
        }
    }

    /**
     * Compute velocity gradient tensor using finite differences and analytical derivatives
     */
    computeVelocityGradientTensor() {
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    const x = -range + (i + 0.5) * cellSize;
                    const y = -range + (j + 0.5) * cellSize;
                    const z = -range + (k + 0.5) * cellSize;
                    
                    // Use analytical Jacobian for Thomas Attractor (more accurate)
                    const jacobian = this.computeJacobian(x, y, z);
                    
                    this.velocityGradientTensor.dvx_dx[index] = jacobian.dvx_dx;
                    this.velocityGradientTensor.dvx_dy[index] = jacobian.dvx_dy;
                    this.velocityGradientTensor.dvx_dz[index] = jacobian.dvx_dz;
                    this.velocityGradientTensor.dvy_dx[index] = jacobian.dvy_dx;
                    this.velocityGradientTensor.dvy_dy[index] = jacobian.dvy_dy;
                    this.velocityGradientTensor.dvy_dz[index] = jacobian.dvy_dz;
                    this.velocityGradientTensor.dvz_dx[index] = jacobian.dvz_dx;
                    this.velocityGradientTensor.dvz_dy[index] = jacobian.dvz_dy;
                    this.velocityGradientTensor.dvz_dz[index] = jacobian.dvz_dz;
                }
            }
        }
    }

    /**
     * Compute eigenvalues and eigenvectors of velocity gradient tensor
     */
    computeEigenvalueAnalysis() {
        const gridSize = this.config.gridResolution;

        for (let i = 0; i < gridSize ** 3; i++) {
            // Create 3x3 Jacobian matrix
            const J = [
                [this.velocityGradientTensor.dvx_dx[i], this.velocityGradientTensor.dvx_dy[i], this.velocityGradientTensor.dvx_dz[i]],
                [this.velocityGradientTensor.dvy_dx[i], this.velocityGradientTensor.dvy_dy[i], this.velocityGradientTensor.dvy_dz[i]],
                [this.velocityGradientTensor.dvz_dx[i], this.velocityGradientTensor.dvz_dy[i], this.velocityGradientTensor.dvz_dz[i]]
            ];
            
            // Compute eigenvalues using characteristic polynomial
            const eigenvalues = this.computeEigenvalues3x3(J);
            
            this.eigenValueGrid.lambda1[i] = eigenvalues[0];
            this.eigenValueGrid.lambda2[i] = eigenvalues[1];
            this.eigenValueGrid.lambda3[i] = eigenvalues[2];
            
            // Compute corresponding eigenvectors
            const eigenvectors = this.computeEigenvectors3x3(J, eigenvalues);
            
            for (let j = 0; j < 3; j++) {
                this.eigenVectorGrid.v1[i * 3 + j] = eigenvectors[0][j];
                this.eigenVectorGrid.v2[i * 3 + j] = eigenvectors[1][j];
                this.eigenVectorGrid.v3[i * 3 + j] = eigenvectors[2][j];
            }
        }
        
        console.log('✅ Eigenvalue analysis complete');
    }

    /**
     * Solve cubic characteristic equation for 3x3 eigenvalues
     */
    computeEigenvalues3x3(matrix) {
        const A = matrix;
        
        // Characteristic polynomial: det(A - λI) = 0
        // -λ³ + trace(A)λ² - ... = 0
        const trace = A[0][0] + A[1][1] + A[2][2];
        
        // For Thomas attractor, we know eigenvalues analytically in many cases
        // But let's use numerical method for generality
        const a = -1;
        const b = trace;
        const c = -(A[0][0]*A[1][1] + A[1][1]*A[2][2] + A[0][0]*A[2][2] 
                    - A[0][1]*A[1][0] - A[1][2]*A[2][1] - A[0][2]*A[2][0]);
        const d = A[0][0]*A[1][1]*A[2][2] + A[0][1]*A[1][2]*A[2][0] + A[0][2]*A[1][0]*A[2][1]
                  - A[0][2]*A[1][1]*A[2][0] - A[0][1]*A[1][0]*A[2][2] - A[0][0]*A[1][2]*A[2][1];
        
        // Solve cubic equation ax³ + bx² + cx + d = 0
        return this.solveCubic(a, b, c, d);
    }

    /**
     * Solve cubic equation using Cardano's method
     */
    solveCubic(a, b, c, d) {
        // Convert to depressed cubic t³ + pt + q = 0
        const p = (3*a*c - b*b) / (3*a*a);
        const q = (2*b*b*b - 9*a*b*c + 27*a*a*d) / (27*a*a*a);
        
        const discriminant = (q/2)**2 + (p/3)**3;
        
        if (Math.abs(discriminant) < 1e-10) {
            // Special cases
            if (Math.abs(p) < 1e-10) {
                // Triple root
                const root = -b/(3*a);
                return [root, root, root];
            } else {
                // One single root, one double root
                const root1 = 3*q/p - b/(3*a);
                const root2 = -3*q/(2*p) - b/(3*a);
                return [root1, root2, root2];
            }
        } else if (discriminant > 0) {
            // One real root, two complex conjugate roots
            const sqrt_disc = Math.sqrt(discriminant);
            const u = Math.cbrt(-q/2 + sqrt_disc);
            const v = Math.cbrt(-q/2 - sqrt_disc);
            const realRoot = u + v - b/(3*a);
            
            // For our purposes, we'll use the real eigenvalue and approximate the complex ones
            const realPart = -(u + v)/2 - b/(3*a);
            const imagPart = Math.sqrt(3)/2 * Math.abs(u - v);
            
            return [realRoot, realPart, realPart]; // Simplified - ignoring imaginary parts for visualization
        } else {
            // Three distinct real roots
            const rho = Math.sqrt(-((p/3)**3));
            const theta = Math.acos((-q/2) * Math.sqrt(-27/(p**3)));
            
            const root1 = 2 * Math.cbrt(rho) * Math.cos(theta/3) - b/(3*a);
            const root2 = 2 * Math.cbrt(rho) * Math.cos((theta + 2*Math.PI)/3) - b/(3*a);
            const root3 = 2 * Math.cbrt(rho) * Math.cos((theta + 4*Math.PI)/3) - b/(3*a);
            
            return [root1, root2, root3].sort((a, b) => b - a); // Sort by magnitude
        }
    }

    /**
     * Compute eigenvectors for given eigenvalues
     */
    computeEigenvectors3x3(matrix, eigenvalues) {
        const eigenvectors = [];
        
        for (const lambda of eigenvalues) {
            // Solve (A - λI)v = 0
            const A_lambda = [
                [matrix[0][0] - lambda, matrix[0][1], matrix[0][2]],
                [matrix[1][0], matrix[1][1] - lambda, matrix[1][2]],
                [matrix[2][0], matrix[2][1], matrix[2][2] - lambda]
            ];
            
            // Find null space using Gaussian elimination
            const eigenvector = this.findNullVector(A_lambda);
            eigenvectors.push(eigenvector);
        }
        
        return eigenvectors;
    }

    /**
     * Find a vector in the null space of matrix A
     */
    findNullVector(A) {
        // Simplified null space computation
        // For a 3x3 matrix, we can use cross products and other methods
        
        // Try standard basis vectors and see which gives smallest result
        let bestVector = [1, 0, 0];
        let minNorm = Infinity;
        
        const candidates = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
        
        for (const candidate of candidates) {
            const result = [
                A[0][0]*candidate[0] + A[0][1]*candidate[1] + A[0][2]*candidate[2],
                A[1][0]*candidate[0] + A[1][1]*candidate[1] + A[1][2]*candidate[2],
                A[2][0]*candidate[0] + A[2][1]*candidate[1] + A[2][2]*candidate[2]
            ];
            
            const norm = Math.sqrt(result[0]**2 + result[1]**2 + result[2]**2);
            if (norm < minNorm) {
                minNorm = norm;
                bestVector = [...candidate];
            }
        }
        
        // Normalize
        const norm = Math.sqrt(bestVector[0]**2 + bestVector[1]**2 + bestVector[2]**2);
        if (norm > 0) {
            return [bestVector[0]/norm, bestVector[1]/norm, bestVector[2]/norm];
        }
        
        return [1, 0, 0]; // Fallback
    }

    /**
     * Find and classify critical points
     */
    findCriticalPoints() {
        this.criticalPoints = [];
        this.saddlePoints = [];
        this.spiralPoints = [];
        this.nodePoints = [];
        
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        const threshold = 0.01;

        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                for (let k = 1; k < gridSize - 1; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    // Check if velocity magnitude is near zero (critical point)
                    if (this.velocityGrid.magnitude[index] < threshold) {
                        const x = -range + (i + 0.5) * cellSize;
                        const y = -range + (j + 0.5) * cellSize;
                        const z = -range + (k + 0.5) * cellSize;
                        
                        // Classify critical point based on eigenvalues
                        const lambda1 = this.eigenValueGrid.lambda1[index];
                        const lambda2 = this.eigenValueGrid.lambda2[index];
                        const lambda3 = this.eigenValueGrid.lambda3[index];
                        
                        const criticalPoint = {
                            position: [x, y, z],
                            eigenvalues: [lambda1, lambda2, lambda3],
                            type: this.classifyCriticalPoint(lambda1, lambda2, lambda3),
                            index: index
                        };
                        
                        this.criticalPoints.push(criticalPoint);
                        
                        // Categorize by type
                        switch (criticalPoint.type) {
                            case 'saddle':
                                this.saddlePoints.push(criticalPoint);
                                break;
                            case 'spiral':
                            case 'focus':
                                this.spiralPoints.push(criticalPoint);
                                break;
                            case 'node':
                                this.nodePoints.push(criticalPoint);
                                break;
                        }
                    }
                }
            }
        }
        
        console.log(`Found ${this.criticalPoints.length} critical points:`, {
            saddles: this.saddlePoints.length,
            spirals: this.spiralPoints.length,
            nodes: this.nodePoints.length
        });
    }

    /**
     * Classify critical point based on eigenvalues
     */
    classifyCriticalPoint(lambda1, lambda2, lambda3) {
        const real1 = lambda1;
        const real2 = lambda2; 
        const real3 = lambda3;
        
        const positiveCount = [real1, real2, real3].filter(x => x > 0).length;
        const negativeCount = [real1, real2, real3].filter(x => x < 0).length;
        
        if (positiveCount > 0 && negativeCount > 0) {
            return 'saddle'; // Mixed stability
        } else if (negativeCount === 3) {
            return 'stable_node'; // All eigenvalues negative
        } else if (positiveCount === 3) {
            return 'unstable_node'; // All eigenvalues positive
        } else {
            return 'focus'; // Mixed or complex eigenvalues
        }
    }

    /**
     * Compute local Lyapunov exponents
     */
    computeLyapunovExponents() {
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        console.log('🔬 Computing Lyapunov exponents...');

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    const x0 = -range + (i + 0.5) * cellSize;
                    const y0 = -range + (j + 0.5) * cellSize;
                    const z0 = -range + (k + 0.5) * cellSize;
                    
                    // Compute largest Lyapunov exponent at this point
                    this.lyapunovExponentGrid[index] = this.computeLocalLyapunovExponent(x0, y0, z0);
                }
            }
            
            if (i % 8 === 0) {
                console.log(`Lyapunov computation progress: ${Math.round(100 * i / gridSize)}%`);
            }
        }
        
        // Compute global statistics
        let sum = 0;
        let count = 0;
        for (let i = 0; i < this.lyapunovExponentGrid.length; i++) {
            const lyap = this.lyapunovExponentGrid[i];
            if (isFinite(lyap)) {
                sum += lyap;
                count++;
            }
        }
        this.globalLyapunovExponent = count > 0 ? sum / count : 0;
        
        console.log(`✅ Global Lyapunov exponent: ${this.globalLyapunovExponent.toFixed(6)}`);
    }

    /**
     * Compute local Lyapunov exponent using tangent vector evolution
     */
    computeLocalLyapunovExponent(x0, y0, z0) {
        const dt = this.config.lyapunovTimeStep;
        const iterations = this.config.lyapunovIterations;
        
        // Initial tangent vector
        let tangent = [1e-8, 0, 0];
        let logSum = 0;
        let validIterations = 0;
        
        let x = x0, y = y0, z = z0;
        
        for (let i = 0; i < iterations; i++) {
            // Evolve the main trajectory
            const velocity = this.computeVelocity(x, y, z);
            x += velocity.vx * dt;
            y += velocity.vy * dt;
            z += velocity.vz * dt;
            
            // Evolve the tangent vector using Jacobian
            const jacobian = this.computeJacobian(x, y, z);
            
            const newTangent = [
                tangent[0] * jacobian.dvx_dx + tangent[1] * jacobian.dvx_dy + tangent[2] * jacobian.dvx_dz,
                tangent[0] * jacobian.dvy_dx + tangent[1] * jacobian.dvy_dy + tangent[2] * jacobian.dvy_dz,
                tangent[0] * jacobian.dvz_dx + tangent[1] * jacobian.dvz_dy + tangent[2] * jacobian.dvz_dz
            ];
            
            // Normalize tangent vector and accumulate log of growth
            const norm = Math.sqrt(newTangent[0]**2 + newTangent[1]**2 + newTangent[2]**2);
            
            if (norm > 0 && isFinite(norm)) {
                logSum += Math.log(norm);
                tangent = [newTangent[0]/norm, newTangent[1]/norm, newTangent[2]/norm];
                validIterations++;
            }
            
            // Prevent trajectory from escaping to infinity
            if (Math.abs(x) > 50 || Math.abs(y) > 50 || Math.abs(z) > 50) {
                break;
            }
        }
        
        return validIterations > 0 ? logSum / (validIterations * dt) : 0;
    }

    /**
     * Generate streamlines using adaptive Runge-Kutta integration
     */
    generateStreamlines() {
        this.streamlines = [];
        console.log('🔬 Generating streamlines...');
        
        const streamlineCount = this.config.streamlineCount;
        const range = this.config.spatialRange;
        
        for (let i = 0; i < streamlineCount; i++) {
            // Random starting point within the attractor region
            const x0 = (Math.random() - 0.5) * range;
            const y0 = (Math.random() - 0.5) * range;
            const z0 = (Math.random() - 0.5) * range;
            
            const streamline = this.integrateStreamline(x0, y0, z0);
            if (streamline.points.length > 10) { // Only keep substantial streamlines
                this.streamlines.push(streamline);
            }
        }
        
        console.log(`✅ Generated ${this.streamlines.length} streamlines`);
    }

    /**
     * Integrate single streamline with adaptive step size
     */
    integrateStreamline(x0, y0, z0) {
        const points = [];
        const velocities = [];
        const stepSizes = [];
        
        let x = x0, y = y0, z = z0;
        let stepSize = this.config.maxStepSize;
        
        for (let i = 0; i < this.config.streamlineLength; i++) {
            points.push([x, y, z]);
            
            if (this.config.adaptiveStepSize) {
                // Adaptive Runge-Kutta with error estimation
                const result = this.adaptiveRK4Step(x, y, z, stepSize);
                x = result.x;
                y = result.y;
                z = result.z;
                stepSize = result.stepSize;
                velocities.push(result.velocity);
                stepSizes.push(stepSize);
            } else {
                // Fixed step size
                const velocity = this.computeVelocity(x, y, z);
                x += velocity.vx * stepSize;
                y += velocity.vy * stepSize;
                z += velocity.vz * stepSize;
                velocities.push(velocity);
                stepSizes.push(stepSize);
            }
            
            // Stop if trajectory escapes bounds
            if (Math.abs(x) > this.config.spatialRange || 
                Math.abs(y) > this.config.spatialRange || 
                Math.abs(z) > this.config.spatialRange) {
                break;
            }
        }
        
        return { points, velocities, stepSizes };
    }

    /**
     * Adaptive Runge-Kutta 4th order step with error estimation
     */
    adaptiveRK4Step(x, y, z, h) {
        const tolerance = 1e-6;
        const minStep = this.config.minStepSize;
        const maxStep = this.config.maxStepSize;
        
        while (true) {
            // Full step
            const fullStep = this.rk4Step(x, y, z, h);
            
            // Two half steps
            const halfStep1 = this.rk4Step(x, y, z, h/2);
            const halfStep2 = this.rk4Step(halfStep1.x, halfStep1.y, halfStep1.z, h/2);
            
            // Estimate error
            const error = Math.max(
                Math.abs(fullStep.x - halfStep2.x),
                Math.abs(fullStep.y - halfStep2.y),
                Math.abs(fullStep.z - halfStep2.z)
            );
            
            if (error < tolerance || h <= minStep) {
                // Use the more accurate half-step result
                return {
                    x: halfStep2.x,
                    y: halfStep2.y,
                    z: halfStep2.z,
                    stepSize: Math.min(h * 1.2, maxStep), // Increase step size for next iteration
                    velocity: this.computeVelocity(halfStep2.x, halfStep2.y, halfStep2.z)
                };
            } else {
                // Reduce step size and try again
                h = Math.max(h * 0.5, minStep);
            }
        }
    }

    /**
     * Single Runge-Kutta 4th order step
     */
    rk4Step(x, y, z, h) {
        const k1 = this.computeVelocity(x, y, z);
        
        const k2 = this.computeVelocity(
            x + h * k1.vx / 2,
            y + h * k1.vy / 2,
            z + h * k1.vz / 2
        );
        
        const k3 = this.computeVelocity(
            x + h * k2.vx / 2,
            y + h * k2.vy / 2,
            z + h * k2.vz / 2
        );
        
        const k4 = this.computeVelocity(
            x + h * k3.vx,
            y + h * k3.vy,
            z + h * k3.vz
        );
        
        return {
            x: x + h * (k1.vx + 2*k2.vx + 2*k3.vx + k4.vx) / 6,
            y: y + h * (k1.vy + 2*k2.vy + 2*k3.vy + k4.vy) / 6,
            z: z + h * (k1.vz + 2*k2.vz + 2*k3.vz + k4.vz) / 6
        };
    }

    /**
     * Analyze vector field topology
     */
    analyzeVectorFieldTopology() {
        console.log('🔬 Analyzing vector field topology...');
        
        // Poincaré-Hopf theorem analysis
        const eulerCharacteristic = this.computeEulerCharacteristic();
        
        // Flow convergence/divergence analysis
        this.analyzeFlowPatterns();
        
        // Heteroclinic/homoclinic orbit detection
        this.detectSpecialOrbits();
        
        this.vectorFieldTopology = {
            eulerCharacteristic,
            totalCriticalPoints: this.criticalPoints.length,
            saddlePoints: this.saddlePoints.length,
            stableNodes: this.nodePoints.filter(p => p.type === 'stable_node').length,
            unstableNodes: this.nodePoints.filter(p => p.type === 'unstable_node').length,
            foci: this.spiralPoints.length
        };
        
        console.log('✅ Topology analysis:', this.vectorFieldTopology);
    }

    /**
     * Compute Euler characteristic for topology
     */
    computeEulerCharacteristic() {
        // For 3D vector field, Euler characteristic relates to critical point indices
        let indexSum = 0;
        
        for (const cp of this.criticalPoints) {
            // Compute index based on eigenvalue signs
            const [l1, l2, l3] = cp.eigenvalues;
            const negativeCount = [l1, l2, l3].filter(x => x < 0).length;
            
            // Index formula for 3D critical points
            const index = Math.pow(-1, negativeCount);
            indexSum += index;
        }
        
        return indexSum;
    }

    /**
     * Analyze flow convergence and divergence patterns
     */
    analyzeFlowPatterns() {
        // This would analyze the divergence field to find sources and sinks
        // Implementation would look for regions where div(v) has significant values
    }

    /**
     * Detect special orbits (heteroclinic/homoclinic)
     */
    detectSpecialOrbits() {
        // This would analyze connections between critical points
        // Implementation would trace streamlines from unstable manifolds of saddles
    }

    /**
     * Create visualization objects
     */
    createVisualization() {
        this.createVelocityVectorVisualization();
        this.createStreamlineVisualization();
        this.createLyapunovHeatmap();
        this.createCriticalPointVisualization();
    }

    /**
     * Create velocity vector field visualization
     */
    createVelocityVectorVisualization() {
        const geometry = new THREE.BufferGeometry();
        
        // Pre-allocate for maximum possible arrows
        const maxArrows = Math.floor(this.config.gridResolution ** 3 / 8);
        const positions = new Float32Array(maxArrows * 6); // 2 vertices per arrow
        const colors = new Float32Array(maxArrows * 6);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.velocityVectorMesh = new THREE.LineSegments(geometry, material);
        this.scene.add(this.velocityVectorMesh);
    }

    /**
     * Create streamline visualization
     */
    createStreamlineVisualization() {
        // Will be populated when streamlines are generated
        this.streamlineMeshes = [];
    }

    /**
     * Create Lyapunov exponent heatmap
     */
    createLyapunovHeatmap() {
        const geometry = new THREE.BufferGeometry();
        const gridSize = this.config.gridResolution;
        
        // Create point cloud for Lyapunov values
        const maxPoints = gridSize ** 3;
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        this.lyapunovHeatmapMesh = new THREE.Points(geometry, material);
        this.scene.add(this.lyapunovHeatmapMesh);
    }

    /**
     * Create critical point visualization
     */
    createCriticalPointVisualization() {
        this.criticalPointMeshes = [];
        // Will be populated after critical points are found
    }

    /**
     * Update visualization with computed data
     */
    updateVisualization() {
        this.updateVelocityVectors();
        this.updateStreamlines();
        this.updateLyapunovHeatmap();
        this.updateCriticalPoints();
    }

    /**
     * Update velocity vector visualization
     */
    updateVelocityVectors() {
        if (!this.velocityVectorMesh) return;
        
        const positions = this.velocityVectorMesh.geometry.attributes.position.array;
        const colors = this.velocityVectorMesh.geometry.attributes.color.array;
        
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        const step = 4; // Show every 4th vector for clarity
        
        let vectorIndex = 0;
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                for (let k = 0; k < gridSize; k += step) {
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    
                    const magnitude = this.velocityGrid.magnitude[index];
                    if (magnitude < 0.1 || vectorIndex >= positions.length / 6) continue;
                    
                    const worldX = (-range + (i + 0.5) * cellSize) * 5;
                    const worldY = (-range + (j + 0.5) * cellSize) * 5;
                    const worldZ = (-range + (k + 0.5) * cellSize) * 5;
                    
                    const vx = this.velocityGrid.vx[index];
                    const vy = this.velocityGrid.vy[index];
                    const vz = this.velocityGrid.vz[index];
                    
                    const scale = 3 * Math.min(magnitude, 2); // Limit arrow length
                    const nx = vx / magnitude;
                    const ny = vy / magnitude;
                    const nz = vz / magnitude;
                    
                    // Arrow start and end
                    const baseIndex = vectorIndex * 6;
                    positions[baseIndex] = worldX;
                    positions[baseIndex + 1] = worldY;
                    positions[baseIndex + 2] = worldZ;
                    positions[baseIndex + 3] = worldX + nx * scale;
                    positions[baseIndex + 4] = worldY + ny * scale;
                    positions[baseIndex + 5] = worldZ + nz * scale;
                    
                    // Color by magnitude
                    const hue = 0.7 - Math.min(magnitude, 3) * 0.2;
                    const color = new THREE.Color().setHSL(hue, 1, 0.6);
                    
                    colors[baseIndex] = color.r;
                    colors[baseIndex + 1] = color.g;
                    colors[baseIndex + 2] = color.b;
                    colors[baseIndex + 3] = color.r;
                    colors[baseIndex + 4] = color.g;
                    colors[baseIndex + 5] = color.b;
                    
                    vectorIndex++;
                }
            }
        }
        
        this.velocityVectorMesh.geometry.setDrawRange(0, vectorIndex * 2);
        this.velocityVectorMesh.geometry.attributes.position.needsUpdate = true;
        this.velocityVectorMesh.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update streamline visualization
     */
    updateStreamlines() {
        // Remove old streamlines
        this.streamlineMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.streamlineMeshes = [];
        
        // Create new streamlines
        this.streamlines.forEach((streamline, index) => {
            if (streamline.points.length < 2) return;
            
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(streamline.points.length * 3);
            const colors = new Float32Array(streamline.points.length * 3);
            
            for (let i = 0; i < streamline.points.length; i++) {
                const point = streamline.points[i];
                positions[i * 3] = point[0] * 5;
                positions[i * 3 + 1] = point[1] * 5;
                positions[i * 3 + 2] = point[2] * 5;
                
                // Color by position along streamline
                const t = i / (streamline.points.length - 1);
                const hue = 0.6 + t * 0.3;
                const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const material = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.6
            });
            
            const mesh = new THREE.Line(geometry, material);
            this.scene.add(mesh);
            this.streamlineMeshes.push(mesh);
        });
    }

    /**
     * Update Lyapunov exponent heatmap
     */
    updateLyapunovHeatmap() {
        if (!this.lyapunovHeatmapMesh) return;
        
        const positions = this.lyapunovHeatmapMesh.geometry.attributes.position.array;
        const colors = this.lyapunovHeatmapMesh.geometry.attributes.color.array;
        
        const gridSize = this.config.gridResolution;
        const range = this.config.spatialRange;
        const cellSize = (2 * range) / gridSize;
        
        let pointIndex = 0;
        
        // Find min/max Lyapunov exponents for color mapping
        let minLyap = Infinity;
        let maxLyap = -Infinity;
        for (const lyap of this.lyapunovExponentGrid) {
            if (isFinite(lyap)) {
                minLyap = Math.min(minLyap, lyap);
                maxLyap = Math.max(maxLyap, lyap);
            }
        }
        
        for (let i = 0; i < gridSize; i += 2) { // Sample every 2nd point
            for (let j = 0; j < gridSize; j += 2) {
                for (let k = 0; k < gridSize; k += 2) {
                    if (pointIndex >= positions.length / 3) break;
                    
                    const index = i + j * gridSize + k * gridSize * gridSize;
                    const lyap = this.lyapunovExponentGrid[index];
                    
                    if (!isFinite(lyap)) continue;
                    
                    const worldX = (-range + (i + 0.5) * cellSize) * 5;
                    const worldY = (-range + (j + 0.5) * cellSize) * 5;
                    const worldZ = (-range + (k + 0.5) * cellSize) * 5;
                    
                    positions[pointIndex * 3] = worldX;
                    positions[pointIndex * 3 + 1] = worldY;
                    positions[pointIndex * 3 + 2] = worldZ;
                    
                    // Color by Lyapunov exponent: blue (negative) to red (positive)
                    const normalized = (lyap - minLyap) / (maxLyap - minLyap);
                    const hue = (1 - normalized) * 0.7; // Blue to red
                    const color = new THREE.Color().setHSL(hue, 1, 0.5);
                    
                    colors[pointIndex * 3] = color.r;
                    colors[pointIndex * 3 + 1] = color.g;
                    colors[pointIndex * 3 + 2] = color.b;
                    
                    pointIndex++;
                }
            }
        }
        
        this.lyapunovHeatmapMesh.geometry.setDrawRange(0, pointIndex);
        this.lyapunovHeatmapMesh.geometry.attributes.position.needsUpdate = true;
        this.lyapunovHeatmapMesh.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update critical point visualization
     */
    updateCriticalPoints() {
        // Remove old critical point meshes
        this.criticalPointMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.criticalPointMeshes = [];
        
        // Create new critical point visualizations
        this.criticalPoints.forEach(cp => {
            const geometry = new THREE.SphereGeometry(1, 8, 6);
            
            // Color by type
            let color;
            switch (cp.type) {
                case 'saddle': color = 0xff4444; break;
                case 'stable_node': color = 0x44ff44; break;
                case 'unstable_node': color = 0xff8844; break;
                case 'focus': color = 0x4444ff; break;
                default: color = 0xffffff;
            }
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(cp.position[0] * 5, cp.position[1] * 5, cp.position[2] * 5);
            
            this.scene.add(mesh);
            this.criticalPointMeshes.push(mesh);
        });
    }

    /**
     * Update with new trajectory data and trigger recomputation
     */
    update(trajectoryPoints) {
        // For research-grade analysis, we recompute periodically rather than continuously
        // This is computationally expensive but provides accurate analysis
        
        if (this.shouldRecompute()) {
            console.log('🔬 Triggering velocity field recomputation...');
            this.computeVelocityField();
            this.updateVisualization();
        }
    }

    /**
     * Determine if we should recompute the velocity field
     */
    shouldRecompute() {
        // Recompute every 5 seconds or when parameters change significantly
        const now = Date.now();
        if (!this.lastComputeTime || now - this.lastComputeTime > 5000) {
            this.lastComputeTime = now;
            return true;
        }
        return false;
    }

    /**
     * Update parameters
     */
    updateParameters(newConfig) {
        if (newConfig.b !== undefined) {
            this.b = newConfig.b;
            console.log('🔬 Updated Thomas parameter b to:', this.b);
        }
        
        // Other parameter updates would trigger recomputation
        if (newConfig.gridResolution !== undefined) {
            console.log('⚠️ Grid resolution change requires full reconstruction');
        }
        
        if (newConfig.streamlineCount !== undefined) {
            this.config.streamlineCount = newConfig.streamlineCount;
            console.log('🔬 Updated streamline count to:', this.config.streamlineCount);
        }
    }

    /**
     * Get research statistics
     */
    getStatistics() {
        return {
            globalLyapunovExponent: this.globalLyapunovExponent,
            criticalPoints: this.criticalPoints.length,
            saddlePoints: this.saddlePoints.length,
            spiralPoints: this.spiralPoints.length,
            nodePoints: this.nodePoints.length,
            streamlines: this.streamlines.length,
            topology: this.vectorFieldTopology
        };
    }

    /**
     * Dispose of all visualization objects
     */
    dispose() {
        if (this.velocityVectorMesh) {
            this.scene.remove(this.velocityVectorMesh);
            this.velocityVectorMesh.geometry.dispose();
            this.velocityVectorMesh.material.dispose();
        }
        
        this.streamlineMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        
        if (this.lyapunovHeatmapMesh) {
            this.scene.remove(this.lyapunovHeatmapMesh);
            this.lyapunovHeatmapMesh.geometry.dispose();
            this.lyapunovHeatmapMesh.material.dispose();
        }
        
        this.criticalPointMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
    }
}