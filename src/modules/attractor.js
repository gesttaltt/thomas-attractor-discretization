/**
 * Thomas Attractor Module
 * Handles the mathematical computation of the Thomas attractor system
 */

export class ThomasAttractor {
    constructor(b = 0.19, dt = 0.01) {
        this.b = b;
        this.dt = dt;
        this.position = { x: 0.1, y: 0.0, z: 0.0 };
        this.transientSteps = 2000;
        this.currentStep = 0;
    }

    /**
     * Reset the attractor to initial conditions
     */
    reset(seed = [0.1, 0.0, 0.0]) {
        this.position.x = seed[0];
        this.position.y = seed[1];
        this.position.z = seed[2];
        this.currentStep = 0;
    }

    /**
     * Compute one step of the Thomas attractor
     * @returns {Object} New position {x, y, z}
     */
    step() {
        const { x, y, z } = this.position;
        
        // Thomas attractor equations
        const dx = Math.sin(y) - this.b * x;
        const dy = Math.sin(z) - this.b * y;
        const dz = Math.sin(x) - this.b * z;
        
        // Euler integration
        this.position.x += dx * this.dt;
        this.position.y += dy * this.dt;
        this.position.z += dz * this.dt;
        
        this.currentStep++;
        
        return { ...this.position, dx, dy, dz };
    }

    /**
     * Check if we're past the transient period
     */
    isPastTransient() {
        return this.currentStep > this.transientSteps;
    }

    /**
     * Set the b parameter
     */
    setB(b) {
        this.b = b;
        this.reset();
    }

    /**
     * Get Jacobian matrix at current position
     */
    getJacobian() {
        const { x, y, z } = this.position;
        return [
            [-this.b, Math.cos(y), 0],
            [0, -this.b, Math.cos(z)],
            [Math.cos(x), 0, -this.b]
        ];
    }
}

/**
 * Lyapunov exponent estimator
 */
export class LyapunovEstimator {
    constructor(attractor, renormSteps = 1000) {
        this.attractor = attractor;
        this.perturbation = { x: 1e-8, y: 0, z: 0 };
        this.estimate = 0.103;
        this.renormSteps = renormSteps;
        this.stepCount = 0;
    }

    /**
     * Update the Lyapunov exponent estimate
     */
    update(jacobian) {
        const eps = 1e-8;
        const J = jacobian;
        const pert = this.perturbation;
        
        // Apply Jacobian to perturbation
        const newPert = {
            x: J[0][0] * pert.x + J[0][1] * pert.y + J[0][2] * pert.z,
            y: J[1][0] * pert.x + J[1][1] * pert.y + J[1][2] * pert.z,
            z: J[2][0] * pert.x + J[2][1] * pert.y + J[2][2] * pert.z
        };
        
        // Scale by dt
        const dt = this.attractor.dt;
        this.perturbation.x += newPert.x * dt;
        this.perturbation.y += newPert.y * dt;
        this.perturbation.z += newPert.z * dt;
        
        this.stepCount++;
        
        // Renormalize periodically
        if (this.stepCount % this.renormSteps === 0) {
            const norm = Math.sqrt(
                this.perturbation.x ** 2 + 
                this.perturbation.y ** 2 + 
                this.perturbation.z ** 2
            );
            
            if (norm > eps) {
                const lyap = Math.log(norm / eps) / (this.renormSteps * dt);
                this.estimate = 0.9 * this.estimate + 0.1 * lyap;
                
                // Renormalize
                const scale = eps / norm;
                this.perturbation.x *= scale;
                this.perturbation.y *= scale;
                this.perturbation.z *= scale;
            }
        }
        
        return this.estimate;
    }

    reset() {
        this.perturbation = { x: 1e-8, y: 0, z: 0 };
        this.stepCount = 0;
    }
}