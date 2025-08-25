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
        this.integrationMethod = 'RK4'; // Default to RK4, can be 'Euler' or 'RK4'
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
        if (this.integrationMethod === 'RK4') {
            return this.stepRK4();
        } else {
            return this.stepEuler();
        }
    }
    
    /**
     * Euler integration step
     */
    stepEuler() {
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
     * RK4 (Runge-Kutta 4th order) integration step
     */
    stepRK4() {
        const state = { ...this.position };
        
        // k1 = f(state)
        const k1 = this.computeDerivatives(state);
        
        // k2 = f(state + dt/2 * k1)
        const state2 = {
            x: state.x + k1.dx * this.dt / 2,
            y: state.y + k1.dy * this.dt / 2,
            z: state.z + k1.dz * this.dt / 2
        };
        const k2 = this.computeDerivatives(state2);
        
        // k3 = f(state + dt/2 * k2)
        const state3 = {
            x: state.x + k2.dx * this.dt / 2,
            y: state.y + k2.dy * this.dt / 2,
            z: state.z + k2.dz * this.dt / 2
        };
        const k3 = this.computeDerivatives(state3);
        
        // k4 = f(state + dt * k3)
        const state4 = {
            x: state.x + k3.dx * this.dt,
            y: state.y + k3.dy * this.dt,
            z: state.z + k3.dz * this.dt
        };
        const k4 = this.computeDerivatives(state4);
        
        // Combine: state_new = state + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        this.position.x += this.dt / 6 * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
        this.position.y += this.dt / 6 * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
        this.position.z += this.dt / 6 * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz);
        
        this.currentStep++;
        
        // Return current derivatives for consistency
        const currentDerivatives = this.computeDerivatives(this.position);
        return { 
            ...this.position, 
            dx: currentDerivatives.dx,
            dy: currentDerivatives.dy,
            dz: currentDerivatives.dz
        };
    }
    
    /**
     * Compute Thomas system derivatives
     */
    computeDerivatives(state) {
        return {
            dx: Math.sin(state.y) - this.b * state.x,
            dy: Math.sin(state.z) - this.b * state.y,
            dz: Math.sin(state.x) - this.b * state.z
        };
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