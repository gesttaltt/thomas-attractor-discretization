/**
 * 3D Visualization Module
 * Handles Three.js rendering of the Thomas attractor
 */

export class Visualization3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.particleSystem = null;
        this.positions = null;
        this.colors = null;
        
        this.maxParticles = 50000;
        this.particleIndex = 0;
        this.opacity = 0.7;
        this.showTrails = true;
        
        this.init();
    }

    init() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initParticles();
        this.initControls();
        this.handleResize();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 20, 60);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);
        
        const pointLight2 = new THREE.PointLight(0x8888ff, 0.5);
        pointLight2.position.set(-10, -10, 10);
        this.scene.add(pointLight2);
    }

    initParticles() {
        const geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: this.opacity,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    initControls() {
        // Custom orbit controls implementation
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.2;
    }

    /**
     * Add a point to the particle system
     */
    addPoint(position, step) {
        if (!this.showTrails && this.particleIndex > 1000) {
            // In no-trails mode, keep only recent points
            this.particleIndex = 0;
        }
        
        const idx = this.particleIndex * 3;
        
        this.positions[idx] = position.x;
        this.positions[idx + 1] = position.y;
        this.positions[idx + 2] = position.z;
        
        // Color based on position and time
        const colorIntensity = 0.5 + 0.5 * Math.sin(step * 0.001);
        const spatialColor = 0.5 + 0.5 * Math.sin(position.x + position.y + position.z);
        
        this.colors[idx] = 0.3 + colorIntensity * 0.4;
        this.colors[idx + 1] = 0.3 + spatialColor * 0.5;
        this.colors[idx + 2] = 0.8 + colorIntensity * 0.2;
        
        this.particleIndex = (this.particleIndex + 1) % this.maxParticles;
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update opacity
     */
    setOpacity(opacity) {
        this.opacity = opacity;
        this.particleSystem.material.opacity = opacity;
    }

    /**
     * Toggle trails
     */
    setShowTrails(show) {
        this.showTrails = show;
        if (!show) {
            this.clearParticles();
        }
    }

    /**
     * Clear all particles
     */
    clearParticles() {
        this.positions.fill(0);
        this.colors.fill(0);
        this.particleIndex = 0;
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Reset camera position
     */
    resetCamera() {
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);
        if (this.controls) {
            this.controls.reset();
        }
    }

    /**
     * Render the scene
     */
    render() {
        if (this.controls) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }, false);
    }

    /**
     * Get canvas for export
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.particleSystem.geometry.dispose();
        this.particleSystem.material.dispose();
        this.renderer.dispose();
    }
}

/**
 * Simple orbit controls implementation
 */
class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(0, 0, 0);
        
        this.spherical = new THREE.Spherical();
        this.spherical.setFromVector3(camera.position);
        
        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.2;
        this.enableDamping = false;
        this.dampingFactor = 0.05;
        
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.domElement.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        this.domElement.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        this.domElement.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return;
            
            const deltaX = e.clientX - this.mouseX;
            const deltaY = e.clientY - this.mouseY;
            
            this.spherical.theta -= deltaX * 0.01 * this.rotateSpeed;
            this.spherical.phi += deltaY * 0.01 * this.rotateSpeed;
            
            this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
            
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            
            this.update();
        });
        
        this.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.spherical.radius *= e.deltaY > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
            this.spherical.radius = Math.max(5, Math.min(50, this.spherical.radius));
            this.update();
        });
    }

    update() {
        this.camera.position.setFromSpherical(this.spherical);
        this.camera.position.add(this.target);
        this.camera.lookAt(this.target);
    }

    reset() {
        this.spherical.setFromVector3(new THREE.Vector3(15, 15, 15));
        this.update();
    }
}