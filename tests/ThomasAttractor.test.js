/**
 * Unit tests for ThomasAttractor
 * Tests core mathematical functionality and edge cases
 */

import { ThomasAttractor } from '../src/core/ThomasAttractor.js';
import { ValidationError } from '../src/utils/ErrorHandling.js';
import { PHYSICS } from '../src/utils/Constants.js';

describe('ThomasAttractor', () => {
    let attractor;
    
    beforeEach(() => {
        attractor = new ThomasAttractor();
    });
    
    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(attractor.b).toBe(PHYSICS.DEFAULT_B);
            expect(attractor.dt).toBe(PHYSICS.DEFAULT_DT);
            expect(attractor.currentState).toEqual(PHYSICS.DEFAULT_SEED);
        });
        
        test('should accept custom configuration', () => {
            const config = {
                b: 0.25,
                dt: 0.01,
                seed: [1, 2, 3]
            };
            const customAttractor = new ThomasAttractor(config);
            
            expect(customAttractor.b).toBe(0.25);
            expect(customAttractor.dt).toBe(0.01);
            expect(customAttractor.currentState).toEqual([1, 2, 3]);
        });
        
        test('should validate and sanitize invalid inputs', () => {
            const config = {
                b: -1,  // Should be sanitized to default
                dt: 'invalid',  // Should be sanitized to default
                seed: [1, 2]  // Invalid vec3
            };
            
            const safeAttractor = new ThomasAttractor(config);
            expect(safeAttractor.b).toBe(PHYSICS.DEFAULT_B);
            expect(safeAttractor.dt).toBe(PHYSICS.DEFAULT_DT);
            expect(safeAttractor.currentState).toEqual(PHYSICS.DEFAULT_SEED);
        });
        
        test('should clamp buffer size to valid range', () => {
            const smallBuffer = new ThomasAttractor({ bufferSize: 10 });
            expect(smallBuffer.bufferSize).toBeGreaterThanOrEqual(100);
            
            const largeBuffer = new ThomasAttractor({ bufferSize: 10000000 });
            expect(largeBuffer.bufferSize).toBeLessThanOrEqual(1000000);
        });
    });
    
    describe('Mathematical Operations', () => {
        test('derivatives should calculate correctly', () => {
            const state = [1, 0.5, -0.5];
            const derivs = attractor.derivatives(state);
            
            // ẋ = sin(y) - bx
            expect(derivs[0]).toBeCloseTo(Math.sin(0.5) - PHYSICS.DEFAULT_B * 1);
            // ẏ = sin(z) - by
            expect(derivs[1]).toBeCloseTo(Math.sin(-0.5) - PHYSICS.DEFAULT_B * 0.5);
            // ż = sin(x) - bz
            expect(derivs[2]).toBeCloseTo(Math.sin(1) - PHYSICS.DEFAULT_B * (-0.5));
        });
        
        test('RK4 integration should advance state', () => {
            const initialState = [...attractor.currentState];
            const newState = attractor.rk4Step(initialState, attractor.dt);
            
            // State should change
            expect(newState).not.toEqual(initialState);
            
            // Should return array of 3 numbers
            expect(newState).toHaveLength(3);
            expect(newState.every(v => typeof v === 'number')).toBe(true);
        });
        
        test('step should generate trajectory points', () => {
            const points = attractor.step(10);
            
            expect(points).toHaveLength(10);
            expect(points[0]).toHaveLength(3);
            
            // Points should be different (system evolves)
            expect(points[0]).not.toEqual(points[9]);
        });
        
        test('jacobian matrix should be calculated correctly', () => {
            const state = [1, 2, 3];
            const J = attractor.jacobian(state);
            
            expect(J).toHaveLength(3);
            expect(J[0]).toHaveLength(3);
            
            // Check diagonal elements
            expect(J[0][0]).toBe(-attractor.b);
            expect(J[1][1]).toBe(-attractor.b);
            expect(J[2][2]).toBe(-attractor.b);
            
            // Check off-diagonal elements
            expect(J[0][1]).toBeCloseTo(Math.cos(state[1]));
            expect(J[1][2]).toBeCloseTo(Math.cos(state[2]));
            expect(J[2][0]).toBeCloseTo(Math.cos(state[0]));
        });
        
        test('divergence should equal trace of Jacobian', () => {
            const div = attractor.getDivergence();
            expect(div).toBe(PHYSICS.DIVERGENCE_FACTOR * attractor.b);
        });
    });
    
    describe('Parameter Updates', () => {
        test('setB should validate and clamp values', () => {
            attractor.setB(0.5);
            expect(attractor.b).toBe(0.5);
            
            attractor.setB(2.0);  // Should be clamped to MAX_B
            expect(attractor.b).toBeLessThanOrEqual(PHYSICS.MAX_B);
            
            attractor.setB(0.001);  // Should be clamped to MIN_B
            expect(attractor.b).toBeGreaterThanOrEqual(PHYSICS.MIN_B);
            
            // Invalid input should throw
            expect(() => attractor.setB('invalid')).toThrow(ValidationError);
            expect(() => attractor.setB(-1)).toThrow(ValidationError);
        });
        
        test('setDt should validate and clamp values', () => {
            attractor.setDt(0.01);
            expect(attractor.dt).toBe(0.01);
            
            attractor.setDt(1.0);  // Should be clamped to MAX_DT
            expect(attractor.dt).toBeLessThanOrEqual(PHYSICS.MAX_DT);
            
            attractor.setDt(0.00001);  // Should be clamped to MIN_DT
            expect(attractor.dt).toBeGreaterThanOrEqual(PHYSICS.MIN_DT);
            
            // Invalid input should throw
            expect(() => attractor.setDt('invalid')).toThrow(ValidationError);
            expect(() => attractor.setDt(-0.01)).toThrow(ValidationError);
        });
        
        test('reset should restore initial state', () => {
            // Generate some trajectory
            attractor.step(100);
            expect(attractor.currentState).not.toEqual(PHYSICS.DEFAULT_SEED);
            
            // Reset
            attractor.reset();
            expect(attractor.currentState).toEqual(PHYSICS.DEFAULT_SEED);
            expect(attractor.trajectoryIndex).toBe(0);
        });
        
        test('reset with custom seed should validate input', () => {
            const validSeed = [2, 3, 4];
            attractor.reset(validSeed);
            expect(attractor.currentState).toEqual(validSeed);
            
            // Invalid seed should throw
            expect(() => attractor.reset([1, 2])).toThrow(ValidationError);
            expect(() => attractor.reset('invalid')).toThrow(ValidationError);
        });
    });
    
    describe('Trajectory Generation', () => {
        test('generateTrajectory should skip transient', () => {
            const trajectory = attractor.generateTrajectory(100);
            
            expect(trajectory).toHaveLength(100);
            
            // After skipping transient, points should be on attractor
            const distances = [];
            for (let i = 1; i < trajectory.length; i++) {
                const dist = Math.sqrt(
                    (trajectory[i][0] - trajectory[i-1][0]) ** 2 +
                    (trajectory[i][1] - trajectory[i-1][1]) ** 2 +
                    (trajectory[i][2] - trajectory[i-1][2]) ** 2
                );
                distances.push(dist);
            }
            
            // Distances should be relatively consistent (on attractor)
            const avgDist = distances.reduce((a, b) => a + b) / distances.length;
            const variance = distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) / distances.length;
            expect(variance).toBeLessThan(0.01);  // Low variance indicates stable orbit
        });
        
        test('generateTrajectory should restore original state', () => {
            const originalState = [...attractor.currentState];
            const originalDt = attractor.dt;
            
            attractor.generateTrajectory(100, 0.02);
            
            expect(attractor.currentState).toEqual(originalState);
            expect(attractor.dt).toBe(originalDt);
        });
        
        test('circular buffer should not overflow', () => {
            // Generate more points than buffer size
            const bufferSize = attractor.bufferSize;
            attractor.step(bufferSize * 2);
            
            // Buffer should wrap around
            expect(attractor.trajectoryIndex).toBeLessThan(bufferSize);
            
            // Should still be able to retrieve trajectory
            const trajectory = attractor.getTrajectory(100);
            expect(trajectory).toHaveLength(100);
        });
    });
    
    describe('Data Retrieval', () => {
        test('getParameters should return current configuration', () => {
            attractor.setB(0.25);
            attractor.setDt(0.01);
            
            const params = attractor.getParameters();
            
            expect(params.b).toBe(0.25);
            expect(params.dt).toBe(0.01);
            expect(params.state).toEqual(attractor.currentState);
        });
        
        test('getCurrentState should return copy of state', () => {
            const state = attractor.getCurrentState();
            
            // Should be a copy, not reference
            state[0] = 999;
            expect(attractor.currentState[0]).not.toBe(999);
        });
        
        test('getTrajectory should return recent points', () => {
            attractor.step(200);
            
            const trajectory = attractor.getTrajectory(50);
            expect(trajectory).toHaveLength(50);
            
            // Each point should be a 3D vector
            trajectory.forEach(point => {
                expect(point).toHaveLength(3);
                expect(point.every(v => typeof v === 'number')).toBe(true);
            });
        });
    });
    
    describe('Chaos Properties', () => {
        test('system should exhibit sensitivity to initial conditions', () => {
            const attractor1 = new ThomasAttractor({ seed: [0.1, 0, 0] });
            const attractor2 = new ThomasAttractor({ seed: [0.1001, 0, 0] });  // Tiny difference
            
            // Evolve both systems
            for (let i = 0; i < 1000; i++) {
                attractor1.step(1);
                attractor2.step(1);
            }
            
            // States should diverge significantly
            const state1 = attractor1.getCurrentState();
            const state2 = attractor2.getCurrentState();
            
            const distance = Math.sqrt(
                (state1[0] - state2[0]) ** 2 +
                (state1[1] - state2[1]) ** 2 +
                (state1[2] - state2[2]) ** 2
            );
            
            expect(distance).toBeGreaterThan(0.1);  // Significant divergence
        });
        
        test('system should be dissipative', () => {
            const divergence = attractor.getDivergence();
            expect(divergence).toBeLessThan(0);  // Negative divergence = dissipative
        });
        
        test('trajectory should remain bounded', () => {
            // Generate long trajectory
            const trajectory = attractor.generateTrajectory(10000);
            
            // Check all points are bounded
            let maxDistance = 0;
            for (const point of trajectory) {
                const dist = Math.sqrt(point[0] ** 2 + point[1] ** 2 + point[2] ** 2);
                maxDistance = Math.max(maxDistance, dist);
            }
            
            // Thomas attractor is bounded
            expect(maxDistance).toBeLessThan(100);
        });
    });
    
    describe('Performance', () => {
        test('step function should be performant', () => {
            const startTime = performance.now();
            attractor.step(1000);
            const elapsed = performance.now() - startTime;
            
            // Should complete 1000 steps quickly
            expect(elapsed).toBeLessThan(100);  // Less than 100ms
        });
        
        test('memory usage should be bounded', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Generate many points
            for (let i = 0; i < 100; i++) {
                attractor.step(1000);
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be minimal (circular buffer)
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);  // Less than 10MB
        });
    });
});

// Export for test runner
export default {
    ThomasAttractorTests: describe
};