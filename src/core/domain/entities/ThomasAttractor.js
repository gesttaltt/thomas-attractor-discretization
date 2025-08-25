/**
 * Thomas Attractor Domain Entity
 * Pure mathematical representation of the Thomas attractor system
 */

export class ThomasAttractor {
    constructor(b = 0.19, dt = 0.01, seed = [0.1, 0.0, 0.0]) {
        this._validateParameters(b, dt, seed);
        
        this._b = b;
        this._dt = dt;
        this._position = { x: seed[0], y: seed[1], z: seed[2] };
        this._initialSeed = [...seed];
        this._currentStep = 0;
        this._integrationMethod = 'RK4';
    }

    _validateParameters(b, dt, seed) {
        if (b <= 0) throw new Error('Parameter b must be positive');
        if (dt <= 0) throw new Error('Time step dt must be positive');
        if (!Array.isArray(seed) || seed.length !== 3) {
            throw new Error('Seed must be an array of 3 numbers');
        }
    }

    // Getters (immutable access)
    get b() { return this._b; }
    get dt() { return this._dt; }
    get position() { return { ...this._position }; }
    get currentStep() { return this._currentStep; }
    get integrationMethod() { return this._integrationMethod; }

    /**
     * Compute Thomas system derivatives
     * ẋ = sin(y) - bx
     * ẏ = sin(z) - by  
     * ż = sin(x) - bz
     */
    computeDerivatives(state) {
        return {
            dx: Math.sin(state.y) - this._b * state.x,
            dy: Math.sin(state.z) - this._b * state.y,
            dz: Math.sin(state.x) - this._b * state.z
        };
    }

    /**
     * Compute Jacobian matrix at given state
     */
    computeJacobian(state = this._position) {
        return [
            [-this._b, Math.cos(state.y), 0],
            [0, -this._b, Math.cos(state.z)],
            [Math.cos(state.x), 0, -this._b]
        ];
    }

    /**
     * Perform one integration step using RK4
     */
    step() {
        const newState = this._integrateRK4();
        this._position = newState;
        this._currentStep++;
        
        return {
            position: { ...this._position },
            derivatives: this.computeDerivatives(this._position),
            jacobian: this.computeJacobian(this._position),
            step: this._currentStep
        };
    }

    _integrateRK4() {
        const h = this._dt;
        const state = { ...this._position };
        
        // k1 = f(state)
        const k1 = this.computeDerivatives(state);
        
        // k2 = f(state + h/2 * k1)
        const state2 = {
            x: state.x + k1.dx * h / 2,
            y: state.y + k1.dy * h / 2,
            z: state.z + k1.dz * h / 2
        };
        const k2 = this.computeDerivatives(state2);
        
        // k3 = f(state + h/2 * k2)
        const state3 = {
            x: state.x + k2.dx * h / 2,
            y: state.y + k2.dy * h / 2,
            z: state.z + k2.dz * h / 2
        };
        const k3 = this.computeDerivatives(state3);
        
        // k4 = f(state + h * k3)
        const state4 = {
            x: state.x + k3.dx * h,
            y: state.y + k3.dy * h,
            z: state.z + k3.dz * h
        };
        const k4 = this.computeDerivatives(state4);
        
        // Combine: new_state = state + h/6 * (k1 + 2*k2 + 2*k3 + k4)
        return {
            x: state.x + h / 6 * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
            y: state.y + h / 6 * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
            z: state.z + h / 6 * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz)
        };
    }

    /**
     * Reset to initial conditions
     */
    reset(newSeed = null) {
        if (newSeed) {
            this._validateParameters(this._b, this._dt, newSeed);
            this._initialSeed = [...newSeed];
        }
        
        this._position = { 
            x: this._initialSeed[0], 
            y: this._initialSeed[1], 
            z: this._initialSeed[2] 
        };
        this._currentStep = 0;
    }

    /**
     * Update parameter b and reset
     */
    updateParameters(newB, newDt = null) {
        this._validateParameters(newB, newDt || this._dt, this._initialSeed);
        this._b = newB;
        if (newDt) this._dt = newDt;
        this.reset();
    }

    /**
     * Create a copy of this attractor
     */
    clone() {
        return new ThomasAttractor(this._b, this._dt, this._initialSeed);
    }

    /**
     * Verify mathematical properties
     */
    verifyDivergence() {
        const jacobian = this.computeJacobian();
        const trace = jacobian[0][0] + jacobian[1][1] + jacobian[2][2];
        const expectedTrace = -3 * this._b;
        const tolerance = 1e-10;
        
        return Math.abs(trace - expectedTrace) < tolerance;
    }
}