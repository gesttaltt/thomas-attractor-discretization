/**
 * Thomas Attractor - Pure Mathematical Model
 * Simplified version without unnecessary abstractions
 */

export class ThomasAttractor {
    constructor(config = {}) {
        this.b = config.b || 0.19;
        this.dt = config.dt || 0.005;
        this.currentState = config.seed || [0.1, 0.0, 0.0];
        
        // Performance optimization: pre-allocated buffers
        this.bufferSize = config.bufferSize || 10000;
        this.trajectory = new Float32Array(this.bufferSize * 3);
        this.trajectoryIndex = 0;
    }

    /**
     * Thomas system equations: ẋ = sin(y) - bx, ẏ = sin(z) - by, ż = sin(x) - bz
     */
    derivatives(state) {
        const [x, y, z] = state;
        return [
            Math.sin(y) - this.b * x,
            Math.sin(z) - this.b * y,
            Math.sin(x) - this.b * z
        ];
    }

    /**
     * Runge-Kutta 4th order integration
     */
    rk4Step(state, dt) {
        const k1 = this.derivatives(state);
        const k2 = this.derivatives([
            state[0] + 0.5 * dt * k1[0],
            state[1] + 0.5 * dt * k1[1],
            state[2] + 0.5 * dt * k1[2]
        ]);
        const k3 = this.derivatives([
            state[0] + 0.5 * dt * k2[0],
            state[1] + 0.5 * dt * k2[1],
            state[2] + 0.5 * dt * k2[2]
        ]);
        const k4 = this.derivatives([
            state[0] + dt * k3[0],
            state[1] + dt * k3[1],
            state[2] + dt * k3[2]
        ]);

        return [
            state[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            state[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
            state[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
        ];
    }

    /**
     * Step simulation forward by n steps
     */
    step(steps = 1) {
        const points = [];
        
        for (let i = 0; i < steps; i++) {
            this.currentState = this.rk4Step(this.currentState, this.dt);
            points.push([...this.currentState]);
            
            // Store in trajectory buffer
            const idx = this.trajectoryIndex * 3;
            this.trajectory[idx] = this.currentState[0];
            this.trajectory[idx + 1] = this.currentState[1];
            this.trajectory[idx + 2] = this.currentState[2];
            this.trajectoryIndex = (this.trajectoryIndex + 1) % (this.bufferSize / 3);
        }
        
        return points;
    }

    /**
     * Generate trajectory for analysis
     */
    generateTrajectory(steps, dt = null) {
        const savedDt = this.dt;
        if (dt !== null) this.dt = dt;
        
        const trajectory = [];
        const savedState = [...this.currentState];
        
        // Skip transient
        for (let i = 0; i < 1000; i++) {
            this.currentState = this.rk4Step(this.currentState, this.dt);
        }
        
        // Collect trajectory
        for (let i = 0; i < steps; i++) {
            this.currentState = this.rk4Step(this.currentState, this.dt);
            trajectory.push([...this.currentState]);
        }
        
        // Restore state
        this.currentState = savedState;
        this.dt = savedDt;
        
        return trajectory;
    }

    /**
     * Compute Jacobian matrix at a point
     */
    jacobian(state) {
        const [x, y, z] = state;
        return [
            [-this.b, Math.cos(y), 0],
            [0, -this.b, Math.cos(z)],
            [Math.cos(x), 0, -this.b]
        ];
    }

    /**
     * Get system divergence (trace of Jacobian)
     */
    getDivergence() {
        return -3 * this.b;
    }

    /**
     * Reset to initial state
     */
    reset(seed = null) {
        this.currentState = seed || [0.1, 0.0, 0.0];
        this.trajectoryIndex = 0;
        this.trajectory.fill(0);
    }

    /**
     * Set parameter b
     */
    setB(b) {
        this.b = b;
    }

    /**
     * Set timestep dt
     */
    setDt(dt) {
        this.dt = dt;
    }

    /**
     * Get current parameters
     */
    getParameters() {
        return {
            b: this.b,
            dt: this.dt,
            state: [...this.currentState]
        };
    }

    /**
     * Get recent trajectory points
     */
    getTrajectory(count = 100) {
        const points = [];
        const startIdx = Math.max(0, this.trajectoryIndex - count);
        
        for (let i = 0; i < count; i++) {
            const idx = ((startIdx + i) % (this.bufferSize / 3)) * 3;
            points.push([
                this.trajectory[idx],
                this.trajectory[idx + 1],
                this.trajectory[idx + 2]
            ]);
        }
        
        return points;
    }
}