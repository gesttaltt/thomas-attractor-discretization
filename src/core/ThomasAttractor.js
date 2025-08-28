/**
 * Thomas Attractor - Pure Mathematical Model
 * Simplified version without unnecessary abstractions
 */

import { InputValidator, ValidationError } from '../utils/ErrorHandling.js';
import { PHYSICS, VALIDATION } from '../utils/Constants.js';

export class ThomasAttractor {
    constructor(config = {}) {
        // Validate configuration
        try {
            this.b = InputValidator.sanitize(
                config.b || PHYSICS.DEFAULT_B, 
                'positiveNumber', 
                PHYSICS.DEFAULT_B
            );
            this.dt = InputValidator.sanitize(
                config.dt || PHYSICS.DEFAULT_DT, 
                'positiveNumber', 
                PHYSICS.DEFAULT_DT
            );
            
            // Validate seed state
            if (config.seed) {
                InputValidator.validate(config.seed, 'vec3', 'seed');
                this.currentState = [...config.seed];
            } else {
                this.currentState = [...PHYSICS.DEFAULT_SEED];
            }
            
            // Validate and clamp buffer size
            this.bufferSize = InputValidator.clamp(
                InputValidator.sanitize(config.bufferSize || PHYSICS.DEFAULT_BUFFER_SIZE || 10000, 'positiveInteger', 10000),
                100,
                VALIDATION.MAX_COORDINATE * 100
            );
            
            // Performance optimization: pre-allocated buffers
            this.trajectory = new Float32Array(this.bufferSize * 3);
            this.trajectoryIndex = 0;
        } catch (error) {
            console.error('ThomasAttractor initialization error:', error);
            // Use safe defaults
            this.b = PHYSICS.DEFAULT_B;
            this.dt = PHYSICS.DEFAULT_DT;
            this.currentState = [...PHYSICS.DEFAULT_SEED];
            this.bufferSize = 10000;
            this.trajectory = new Float32Array(this.bufferSize * 3);
            this.trajectoryIndex = 0;
        }
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
            state[0] + (dt * PHYSICS.RK4_FACTOR) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            state[1] + (dt * PHYSICS.RK4_FACTOR) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
            state[2] + (dt * PHYSICS.RK4_FACTOR) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
        ];
    }

    /**
     * Step simulation forward by n steps
     */
    step(steps = 1) {
        // Validate input
        try {
            steps = InputValidator.clamp(
                InputValidator.sanitize(steps, 'positiveInteger', 1),
                1,
                10000
            );
        } catch (error) {
            console.warn('Invalid steps parameter, using default:', error);
            steps = 1;
        }
        
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
        for (let i = 0; i < PHYSICS.TRANSIENT_STEPS; i++) {
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
        return PHYSICS.DIVERGENCE_FACTOR * this.b;
    }

    /**
     * Reset to initial state
     */
    reset(seed = null) {
        try {
            if (seed) {
                InputValidator.validate(seed, 'vec3', 'seed');
                this.currentState = [...seed];
            } else {
                this.currentState = [...PHYSICS.DEFAULT_SEED];
            }
            this.trajectoryIndex = 0;
            this.trajectory.fill(0);
        } catch (error) {
            console.error('Reset error:', error);
            throw new ValidationError('Invalid seed state', 'seed', seed);
        }
    }

    /**
     * Set parameter b
     */
    setB(b) {
        try {
            this.b = InputValidator.validate(b, 'positiveNumber', 'b');
            // Clamp to reasonable range
            this.b = InputValidator.clamp(this.b, PHYSICS.MIN_B, PHYSICS.MAX_B);
        } catch (error) {
            console.error('Invalid parameter b:', error);
            throw new ValidationError('Parameter b must be a positive number', 'b', b);
        }
    }

    /**
     * Set timestep dt
     */
    setDt(dt) {
        try {
            this.dt = InputValidator.validate(dt, 'positiveNumber', 'dt');
            // Clamp to stable range
            this.dt = InputValidator.clamp(this.dt, PHYSICS.MIN_DT, PHYSICS.MAX_DT);
        } catch (error) {
            console.error('Invalid timestep dt:', error);
            throw new ValidationError('Timestep dt must be a positive number', 'dt', dt);
        }
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
     * Get current state
     */
    getCurrentState() {
        return [...this.currentState];
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