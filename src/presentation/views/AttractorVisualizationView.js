/**
 * Attractor Visualization View
 * High-performance 3D visualization with GPU rendering
 */

import { GPUParticleRenderer } from '../../infrastructure/rendering/GPUParticleRenderer.js';

export class AttractorVisualizationView {
    constructor(canvas, eventBus, options = {}) {
        this.canvas = canvas;
        this.eventBus = eventBus;
        this.options = {
            maxParticles: options.maxParticles || 100000,
            particleSize: options.particleSize || 0.015,
            cameraDistance: options.cameraDistance || 20,
            autoRotate: options.autoRotate !== false,
            rotationSpeed: options.rotationSpeed || 0.5,
            ...options
        };

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // GPU particle system
        this.particleRenderer = null;

        // View state
        this.isInitialized = false;
        this.isRendering = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 60;

        // Camera and view matrices
        this.viewMatrix = new Float32Array(16);
        this.projectionMatrix = new Float32Array(16);
        this.mvpMatrix = new Float32Array(16);

        // Animation frame ID
        this.animationFrameId = null;

        this.init();
    }

    async init() {
        try {
            await this.initScene();
            await this.initCamera();
            await this.initRenderer();
            await this.initParticleSystem();
            this.initControls();
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.startRenderLoop();
            
            this.eventBus.emit('view.initialized', { 
                view: 'attractor_visualization',
                capabilities: this.getCapabilities()
            });
        } catch (error) {
            this.eventBus.emit('view.error', { error: error.message });
            throw error;
        }
    }

    async initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        this.scene.fog = new THREE.Fog(0x000011, 10, 50);
    }

    async initCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
        this.camera.position.set(
            this.options.cameraDistance, 
            this.options.cameraDistance * 0.7, 
            this.options.cameraDistance
        );
        this.camera.lookAt(0, 0, 0);
        this.updateMatrices();
    }

    async initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000011, 1);
        
        // Enable advanced features
        this.renderer.shadowMap.enabled = false; // Disable for performance
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    async initParticleSystem() {
        this.particleRenderer = new GPUParticleRenderer(this.canvas, {
            maxParticles: this.options.maxParticles,
            particleSize: this.options.particleSize,
            enableTrails: true,
            colorScheme: 'spectral'
        });
    }

    initControls() {
        this.controls = new CameraControls(this.camera, this.canvas, {
            autoRotate: this.options.autoRotate,
            rotationSpeed: this.options.rotationSpeed,
            minDistance: 5,
            maxDistance: 50,
            enableDamping: true,
            dampingFactor: 0.05
        });

        // Listen for camera changes
        this.controls.on('change', () => {
            this.updateMatrices();
        });
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Listen for simulation events
        this.eventBus.on('simulation.step', (eventData) => {
            this.handleSimulationStep(eventData);
        });

        this.eventBus.on('simulation.started', () => {
            this.clearParticles();
        });

        this.eventBus.on('view.command', (eventData) => {
            this.handleViewCommand(eventData);
        });
    }

    handleSimulationStep(eventData) {
        if (!this.isInitialized) return;

        const { position } = eventData.data;
        if (position) {
            // Add new particle
            const positions = [position.x, position.y, position.z];
            this.particleRenderer.addParticles(positions);
        }
    }

    handleViewCommand(eventData) {
        const { command, params } = eventData.data;

        switch (command) {
            case 'clearParticles':
                this.clearParticles();
                break;
            case 'resetCamera':
                this.resetCamera();
                break;
            case 'updateOptions':
                this.updateOptions(params);
                break;
            case 'setParticleSize':
                this.setParticleSize(params.size);
                break;
            case 'setAutoRotate':
                this.setAutoRotate(params.enabled);
                break;
        }
    }

    startRenderLoop() {
        if (this.isRendering) return;
        this.isRendering = true;
        this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
    }

    stopRenderLoop() {
        this.isRendering = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    renderLoop() {
        if (!this.isRendering) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update FPS
        if (deltaTime > 0) {
            this.fps = 0.9 * this.fps + 0.1 * (1000 / deltaTime);
        }

        // Update controls
        this.controls.update(deltaTime);

        // Render
        this.render(deltaTime);

        // Update frame counter
        this.frameCount++;

        // Continue loop
        this.animationFrameId = requestAnimationFrame(() => this.renderLoop());

        // Emit frame event periodically
        if (this.frameCount % 60 === 0) {
            this.eventBus.emit('view.frame', {
                frameCount: this.frameCount,
                fps: Math.round(this.fps),
                particleCount: this.particleRenderer ? this.particleRenderer.particleCount : 0
            });
        }
    }

    render(deltaTime) {
        if (!this.isInitialized) return;

        // Clear
        this.renderer.clear();

        // Render GPU particles
        if (this.particleRenderer) {
            this.particleRenderer.render(this.mvpMatrix, this.viewMatrix, deltaTime);
        }

        // Render Three.js scene (for any additional objects)
        this.renderer.render(this.scene, this.camera);
    }

    updateMatrices() {
        if (!this.camera) return;

        // Update projection matrix
        this.camera.updateProjectionMatrix();
        this.projectionMatrix.set(this.camera.projectionMatrix.elements);

        // Update view matrix
        const viewMatrix4 = this.camera.matrixWorldInverse;
        this.viewMatrix.set(viewMatrix4.elements);

        // Compute MVP matrix
        this.multiplyMatrices(this.mvpMatrix, this.projectionMatrix, this.viewMatrix);
    }

    multiplyMatrices(out, a, b) {
        // Multiply 4x4 matrices a and b, store result in out
        for (let i = 0; i < 16; i++) {
            out[i] = 0;
            for (let j = 0; j < 4; j++) {
                out[i] += a[Math.floor(i / 4) * 4 + j] * b[j * 4 + (i % 4)];
            }
        }
    }

    clearParticles() {
        if (this.particleRenderer) {
            this.particleRenderer.clearParticles();
        }
    }

    resetCamera() {
        this.camera.position.set(
            this.options.cameraDistance, 
            this.options.cameraDistance * 0.7, 
            this.options.cameraDistance
        );
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
        this.updateMatrices();
    }

    updateOptions(newOptions) {
        Object.assign(this.options, newOptions);
        
        if (newOptions.cameraDistance !== undefined) {
            this.controls.setDistance(newOptions.cameraDistance);
        }
        
        if (newOptions.autoRotate !== undefined) {
            this.controls.setAutoRotate(newOptions.autoRotate);
        }
    }

    setParticleSize(size) {
        this.options.particleSize = size;
        // GPU renderer will pick up the new size on next render
    }

    setAutoRotate(enabled) {
        this.options.autoRotate = enabled;
        this.controls.setAutoRotate(enabled);
    }

    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        
        if (this.particleRenderer) {
            this.particleRenderer.resize(width, height);
        }
        
        this.updateMatrices();
        
        this.eventBus.emit('view.resized', { width, height });
    }

    getCapabilities() {
        const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        return {
            webglVersion: gl ? gl.getParameter(gl.VERSION) : 'Not supported',
            maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
            gpuRenderer: !!this.particleRenderer,
            maxParticles: this.options.maxParticles,
            extensions: gl ? gl.getSupportedExtensions() : []
        };
    }

    getStats() {
        return {
            frameCount: this.frameCount,
            fps: Math.round(this.fps),
            particleCount: this.particleRenderer ? this.particleRenderer.particleCount : 0,
            cameraPosition: {
                x: Math.round(this.camera.position.x * 100) / 100,
                y: Math.round(this.camera.position.y * 100) / 100,
                z: Math.round(this.camera.position.z * 100) / 100
            },
            isRendering: this.isRendering,
            memoryUsage: this.particleRenderer ? this.particleRenderer.getStats() : {}
        };
    }

    dispose() {
        this.stopRenderLoop();
        
        if (this.particleRenderer) {
            this.particleRenderer.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        window.removeEventListener('resize', this.handleResize);
        
        this.eventBus.emit('view.disposed', { view: 'attractor_visualization' });
    }
}

/**
 * Enhanced Camera Controls
 */
class CameraControls {
    constructor(camera, domElement, options = {}) {
        this.camera = camera;
        this.domElement = domElement;
        this.options = {
            autoRotate: options.autoRotate !== false,
            rotationSpeed: options.rotationSpeed || 0.5,
            minDistance: options.minDistance || 1,
            maxDistance: options.maxDistance || 100,
            enableDamping: options.enableDamping !== false,
            dampingFactor: options.dampingFactor || 0.05,
            ...options
        };

        this.target = new THREE.Vector3(0, 0, 0);
        this.spherical = new THREE.Spherical();
        this.spherical.setFromVector3(camera.position.clone().sub(this.target));

        this.autoRotateAngle = 0;
        this.isPointerDown = false;
        this.pointerPositions = {};
        this.listeners = new Map();

        this.initEventListeners();
    }

    initEventListeners() {
        this.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    onPointerDown(event) {
        this.isPointerDown = true;
        this.pointerPositions[event.pointerId] = {
            x: event.clientX,
            y: event.clientY
        };
    }

    onPointerMove(event) {
        if (!this.isPointerDown) return;

        const pointer = this.pointerPositions[event.pointerId];
        if (!pointer) return;

        const deltaX = event.clientX - pointer.x;
        const deltaY = event.clientY - pointer.y;

        this.spherical.theta -= deltaX * 0.01;
        this.spherical.phi += deltaY * 0.01;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

        pointer.x = event.clientX;
        pointer.y = event.clientY;

        this.updateCamera();
    }

    onPointerUp(event) {
        this.isPointerDown = false;
        delete this.pointerPositions[event.pointerId];
    }

    onMouseWheel(event) {
        event.preventDefault();
        
        const scale = event.deltaY > 0 ? 1.1 : 0.9;
        this.spherical.radius *= scale;
        this.spherical.radius = Math.max(
            this.options.minDistance, 
            Math.min(this.options.maxDistance, this.spherical.radius)
        );

        this.updateCamera();
    }

    update(deltaTime) {
        if (this.options.autoRotate) {
            this.autoRotateAngle += this.options.rotationSpeed * deltaTime * 0.001;
            this.spherical.theta += this.options.rotationSpeed * deltaTime * 0.0001;
            this.updateCamera();
        }
    }

    updateCamera() {
        this.camera.position.setFromSpherical(this.spherical);
        this.camera.position.add(this.target);
        this.camera.lookAt(this.target);
        this.emit('change');
    }

    setDistance(distance) {
        this.spherical.radius = Math.max(
            this.options.minDistance,
            Math.min(this.options.maxDistance, distance)
        );
        this.updateCamera();
    }

    setAutoRotate(enabled) {
        this.options.autoRotate = enabled;
    }

    reset() {
        this.spherical.setFromVector3(
            new THREE.Vector3(
                this.options.cameraDistance || 20,
                this.options.cameraDistance * 0.7 || 14,
                this.options.cameraDistance || 20
            )
        );
        this.autoRotateAngle = 0;
        this.updateCamera();
    }

    dispose() {
        this.domElement.removeEventListener('contextmenu', this.onContextMenu);
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.domElement.removeEventListener('pointerup', this.onPointerUp);
        this.domElement.removeEventListener('wheel', this.onMouseWheel);
    }
}