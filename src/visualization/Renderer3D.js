/**
 * 3D Renderer - Three.js visualization
 * Enhanced with volumetric effects and multi-layer rendering
 */

import { VolumetricEffects } from './VolumetricEffects.js';

export class Renderer3D {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.config = {
            maxParticles: config.maxParticles || 50000,
            particleSize: config.particleSize || 0.012,
            autoRotate: config.autoRotate !== false,
            rotationSpeed: config.rotationSpeed || 0.3,
            cameraDistance: config.cameraDistance || 20,
            backgroundColor: config.backgroundColor || 0x000011,
            particleColor: config.particleColor || 0x64b5f6,
            enableVolumetricEffects: config.enableVolumetricEffects === true,  // Disabled by default
            ...config
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleIndex = 0;
        this.controls = null;
        this.volumetricEffects = null;
        this.velocityData = [];
        
        this.init();
    }

    init() {
        // Check if THREE.js is available
        if (typeof THREE === 'undefined') {
            console.error('Renderer3D: THREE.js is required but not loaded!');
            throw new Error('THREE.js is not available. Please ensure it is loaded before initializing Renderer3D.');
        }
        
        console.log('Renderer3D init - Canvas dimensions:', {
            width: this.canvas.clientWidth || this.canvas.width,
            height: this.canvas.clientHeight || this.canvas.height
        });
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);
        
        // Setup camera - handle zero dimensions
        const width = this.canvas.clientWidth || this.canvas.width || 800;
        const height = this.canvas.clientHeight || this.canvas.height || 600;
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
        this.camera.position.set(0, 0, this.config.cameraDistance);
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Setup particles
        this.setupParticles();
        
        // Setup controls
        this.setupControls();
        
        // Setup lighting
        this.setupLighting();
        
        // Setup volumetric effects
        if (this.config.enableVolumetricEffects) {
            this.setupVolumetricEffects();
        }
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
    }

    setupParticles() {
        const geometry = new THREE.BufferGeometry();
        
        // Pre-allocate positions and colors
        const positions = new Float32Array(this.config.maxParticles * 3);
        const colors = new Float32Array(this.config.maxParticles * 3);
        
        // Initialize with random positions off-screen
        for (let i = 0; i < this.config.maxParticles * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 1000; // Far away
        }
        
        // Set default color
        const color = new THREE.Color(this.config.particleColor);
        for (let i = 0; i < this.config.maxParticles; i++) {
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create material - refined for visual harmony
        const material = new THREE.PointsMaterial({
            size: this.config.particleSize,
            vertexColors: true,
            blending: THREE.NormalBlending,  // Normal blending to avoid dark halos
            transparent: true,
            opacity: 0.75,  // Good visibility with volumetrics
            sizeAttenuation: true
        });
        
        // Create points
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.autoRotate = this.config.autoRotate;
            this.controls.autoRotateSpeed = this.config.rotationSpeed;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        }
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);
        
        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);
    }

    setupVolumetricEffects() {
        if (this.volumetricEffects) {
            this.volumetricEffects.dispose();
        }
        this.volumetricEffects = new VolumetricEffects(this.scene, {
            enableDensityClouds: true,
            enableVelocityGlow: true,
            enableEnergyField: true,
            enableVorticity: true,
            enablePhaseFlow: true,
            gridResolution: 32,
            b: 0.19  // Thomas attractor parameter
        });
    }
    
    setupVolumetricEffectsLightweight() {
        if (this.volumetricEffects) {
            this.volumetricEffects.dispose();
        }
        // Create framework with ALL effects disabled initially
        this.volumetricEffects = new VolumetricEffects(this.scene, {
            enableDensityClouds: false,
            enableVelocityGlow: false,
            enableEnergyField: false,
            enableVorticity: false,
            enablePhaseFlow: false,
            gridResolution: 16,  // Lower resolution for testing
            b: 0.19
        });
        console.log('Volumetric framework created (lightweight, no effects enabled)');
    }

    addPoints(points) {
        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;
        
        points.forEach(point => {
            const idx = this.particleIndex * 3;
            
            // Set position (scaled for better visualization)
            positions[idx] = point[0] * 5;
            positions[idx + 1] = point[1] * 5;
            positions[idx + 2] = point[2] * 5;
            
            // Color based on base color with intensity variation
            const intensity = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]) / 3;
            
            // Use base particle color if set, otherwise default blue
            let baseColor;
            if (this.config.particleColor) {
                baseColor = new THREE.Color(this.config.particleColor);
            } else {
                baseColor = new THREE.Color(0x64b5f6); // Default blue
            }
            
            // Vary intensity while keeping the hue
            const intensityMultiplier = 0.5 + intensity * 0.5; // 0.5 to 1.0
            colors[idx] = baseColor.r * intensityMultiplier;
            colors[idx + 1] = baseColor.g * intensityMultiplier;  
            colors[idx + 2] = baseColor.b * intensityMultiplier;
            
            this.particleIndex = (this.particleIndex + 1) % this.config.maxParticles;
        });
        
        // Update volumetric effects with real mathematical data
        if (this.volumetricEffects) {
            this.volumetricEffects.updateFromTrajectory(points);
        }
        
        // Mark for update
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;
        
        // Update bounding sphere for proper culling
        this.particles.geometry.computeBoundingSphere();
    }

    render() {
        if (this.controls) {
            this.controls.update();
        }
        
        // Animate volumetric effects
        if (this.volumetricEffects) {
            const time = performance.now() * 0.001;
            this.volumetricEffects.animate(time);
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    clear() {
        const positions = this.particles.geometry.attributes.position.array;
        
        // Move all particles off-screen
        for (let i = 0; i < this.config.maxParticles * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 1000;
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particleIndex = 0;
    }

    handleResize() {
        const width = this.canvas.clientWidth || this.canvas.width || 800;
        const height = this.canvas.clientHeight || this.canvas.height || 600;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    setParticleSize(size) {
        console.log('Setting particle size to:', size);
        this.config.particleSize = size;
        if (this.particles && this.particles.material) {
            this.particles.material.size = size;
            console.log('Particle size set successfully');
        } else {
            console.error('Particles not initialized yet');
        }
    }

    setParticleColor(colorHex) {
        console.log('Setting particle base color to:', colorHex);
        this.config.particleColor = colorHex;
        // Since we use vertex colors, we need to update the color array
        if (this.particles && this.particles.geometry) {
            const color = new THREE.Color(colorHex);
            const colors = this.particles.geometry.attributes.color.array;
            
            // Update all existing particle colors
            for (let i = 0; i < colors.length; i += 3) {
                colors[i] = color.r;
                colors[i + 1] = color.g;
                colors[i + 2] = color.b;
            }
            
            this.particles.geometry.attributes.color.needsUpdate = true;
            console.log('Particle colors updated');
        }
    }

    setAutoRotate(enabled) {
        this.config.autoRotate = enabled;
        if (this.controls) {
            this.controls.autoRotate = enabled;
        }
    }

    setMaxParticles(max) {
        // Would require recreating geometry, simplified for now
        console.log(`Max particles set to ${max} (will take effect on restart)`);
        this.config.maxParticles = max;
    }

    getParticleCount() {
        return Math.min(this.particleIndex, this.config.maxParticles);
    }

    dispose() {
        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        
        if (this.volumetricEffects) {
            this.volumetricEffects.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        window.removeEventListener('resize', this.handleResize);
    }
}