/**
 * 3D Renderer - Three.js visualization
 * Simplified without dependency injection
 */

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
            ...config
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleIndex = 0;
        this.controls = null;
        
        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);
        
        // Setup camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
        this.camera.position.set(0, 0, this.config.cameraDistance);
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Setup particles
        this.setupParticles();
        
        // Setup controls
        this.setupControls();
        
        // Setup lighting
        this.setupLighting();
        
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
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: this.config.particleSize,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8,
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

    addPoints(points) {
        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;
        
        points.forEach(point => {
            const idx = this.particleIndex * 3;
            
            // Set position (scaled for better visualization)
            positions[idx] = point[0] * 5;
            positions[idx + 1] = point[1] * 5;
            positions[idx + 2] = point[2] * 5;
            
            // Color based on position (creates gradient effect)
            const intensity = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]) / 3;
            colors[idx] = 0.3 + intensity * 0.7;
            colors[idx + 1] = 0.5 + intensity * 0.5;
            colors[idx + 2] = 0.9;
            
            this.particleIndex = (this.particleIndex + 1) % this.config.maxParticles;
        });
        
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
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    setParticleSize(size) {
        this.config.particleSize = size;
        this.particles.material.size = size;
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
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        window.removeEventListener('resize', this.handleResize);
    }
}