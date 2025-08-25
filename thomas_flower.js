class ThomasFlowerVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.particles = [];
        this.maxParticles = 50000;
        this.particleIndex = 0;
        
        this.b = 0.19;
        this.dt = 0.01;
        this.steps = 300000;
        this.transientSteps = 2000;
        this.currentStep = 0;
        
        this.currentPosition = new THREE.Vector3(0.1, 0.0, 0.0);
        
        this.polarBuffer = [];
        this.polarBufferSize = 10000;
        
        this.rhodoneaParams = {
            k: 3.96,
            m: 24.26,
            phi: -0.286,
            a: 3.74
        };
        
        this.metrics = {
            E_flower: 0.0,
            lambda_max: 0.103,
            FI_computed: 0.0,
            FI_reported: 0.0
        };
        
        this.projectionPlane = 'xy';
        this.showFloral = false;
        this.showTrails = true;
        this.opacity3D = 0.7;
        
        this.floralCanvas = null;
        this.floralCtx = null;
        
        this.presets = {};
        this.currentPreset = 'canonical_xy';
        
        this.isRunning = true;
        this.frameCount = 0;
        this.subsampleRate = 3;
        
        this.lambdaPerturbation = null;
        this.lambdaEstimate = 0.103;
        this.lambdaRenormSteps = 1000;
        this.lambdaStepCount = 0;
        
        this.init();
    }
    
    init() {
        this.initScene();
        this.initFloralPanel();
        this.loadPresets();
        this.bindUI();
        this.hideLoading();
        this.animate();
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        const canvas = document.getElementById('mainCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);
        
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);
        
        this.initParticles();
        
        this.initOrbitControls();
        
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    
    initParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxParticles * 3);
        const colors = new Float32Array(this.maxParticles * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: this.opacity3D,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        
        this.positions = positions;
        this.colors = colors;
    }
    
    initOrbitControls() {
        const OrbitControls = function(camera, domElement) {
            this.camera = camera;
            this.domElement = domElement;
            this.target = new THREE.Vector3(0, 0, 0);
            
            this.spherical = new THREE.Spherical();
            this.spherical.setFromVector3(camera.position);
            
            this.rotateSpeed = 1.0;
            this.zoomSpeed = 1.2;
            
            this.mouseDown = false;
            this.mouseX = 0;
            this.mouseY = 0;
            
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
            
            this.update = function() {
                this.camera.position.setFromSpherical(this.spherical);
                this.camera.position.add(this.target);
                this.camera.lookAt(this.target);
            };
        };
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }
    
    initFloralPanel() {
        this.floralCanvas = document.getElementById('floralCanvas');
        this.floralCtx = this.floralCanvas.getContext('2d');
        this.floralCanvas.width = 330;
        this.floralCanvas.height = 300;
    }
    
    stepThomas(dt, b) {
        const x = this.currentPosition.x;
        const y = this.currentPosition.y;
        const z = this.currentPosition.z;
        
        const dx = Math.sin(y) - b * x;
        const dy = Math.sin(z) - b * y;
        const dz = Math.sin(x) - b * z;
        
        this.currentPosition.x += dx * dt;
        this.currentPosition.y += dy * dt;
        this.currentPosition.z += dz * dt;
        
        if (this.lambdaPerturbation) {
            this.updateLambdaEstimate(dt, b, dx, dy, dz);
        }
        
        return this.currentPosition.clone();
    }
    
    updateLambdaEstimate(dt, b, dx, dy, dz) {
        const eps = 1e-8;
        const pert = this.lambdaPerturbation;
        
        const J = [
            [-b, Math.cos(this.currentPosition.y), 0],
            [0, -b, Math.cos(this.currentPosition.z)],
            [Math.cos(this.currentPosition.x), 0, -b]
        ];
        
        const newPert = new THREE.Vector3(
            J[0][0] * pert.x + J[0][1] * pert.y + J[0][2] * pert.z,
            J[1][0] * pert.x + J[1][1] * pert.y + J[1][2] * pert.z,
            J[2][0] * pert.x + J[2][1] * pert.y + J[2][2] * pert.z
        );
        
        newPert.multiplyScalar(dt);
        pert.add(newPert);
        
        this.lambdaStepCount++;
        
        if (this.lambdaStepCount % this.lambdaRenormSteps === 0) {
            const norm = pert.length();
            if (norm > eps) {
                const lyap = Math.log(norm / eps) / (this.lambdaRenormSteps * dt);
                this.lambdaEstimate = 0.9 * this.lambdaEstimate + 0.1 * lyap;
                pert.normalize().multiplyScalar(eps);
            }
        }
    }
    
    projectToPlane(point, plane) {
        switch(plane) {
            case 'xy':
                return { x: point.x, y: point.y };
            case 'yz':
                return { x: point.y, y: point.z };
            case 'zx':
                return { x: point.z, y: point.x };
            default:
                return { x: point.x, y: point.y };
        }
    }
    
    accumulatePolar(xy) {
        const r = Math.sqrt(xy.x * xy.x + xy.y * xy.y);
        const theta = Math.atan2(xy.y, xy.x);
        
        this.polarBuffer.push({ r, theta });
        
        if (this.polarBuffer.length > this.polarBufferSize) {
            this.polarBuffer.shift();
        }
        
        return { r, theta };
    }
    
    rhodonea(theta, params) {
        return params.a * Math.cos(params.k * params.m * theta + params.phi);
    }
    
    computeEflower() {
        if (this.polarBuffer.length < 100) return 0;
        
        let sumSquaredError = 0;
        let count = 0;
        
        const outlierThreshold = 10;
        
        for (let i = Math.max(0, this.polarBuffer.length - 5000); i < this.polarBuffer.length; i++) {
            const point = this.polarBuffer[i];
            if (point.r > outlierThreshold) continue;
            
            const r_hat = this.rhodonea(point.theta, this.rhodoneaParams);
            const error = point.r - Math.abs(r_hat);
            sumSquaredError += error * error;
            count++;
        }
        
        return count > 0 ? Math.sqrt(sumSquaredError / count) : 0;
    }
    
    computeFI() {
        const E = this.metrics.E_flower;
        const lambda = this.lambdaEstimate;
        return (1 / (1 + E)) * Math.exp(-lambda);
    }
    
    updateParticles(point) {
        const idx = this.particleIndex * 3;
        
        this.positions[idx] = point.x;
        this.positions[idx + 1] = point.y;
        this.positions[idx + 2] = point.z;
        
        const colorIntensity = 0.5 + 0.5 * Math.sin(this.currentStep * 0.001);
        this.colors[idx] = 0.5 + colorIntensity * 0.3;
        this.colors[idx + 1] = 0.5 + colorIntensity * 0.5;
        this.colors[idx + 2] = 1.0;
        
        this.particleIndex = (this.particleIndex + 1) % this.maxParticles;
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
    }
    
    drawFloralPanel() {
        const ctx = this.floralCtx;
        const width = this.floralCanvas.width;
        const height = this.floralCanvas.height;
        
        ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = 30;
        
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, scale * 3, 0, Math.PI * 2);
        ctx.stroke();
        
        const recentPoints = this.polarBuffer.slice(-2000);
        ctx.fillStyle = 'rgba(136, 170, 255, 0.6)';
        recentPoints.forEach(point => {
            if (point.r < 10) {
                const x = centerX + point.r * scale * Math.cos(point.theta);
                const y = centerY + point.r * scale * Math.sin(point.theta);
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        });
        
        ctx.strokeStyle = 'rgba(255, 100, 150, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let theta = 0; theta < Math.PI * 2; theta += 0.01) {
            const r = this.rhodonea(theta, this.rhodoneaParams);
            const x = centerX + Math.abs(r) * scale * Math.cos(theta);
            const y = centerY + Math.abs(r) * scale * Math.sin(theta);
            
            if (theta === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    updateHUD() {
        document.getElementById('bValue').textContent = this.b.toFixed(3);
        document.getElementById('eFlowerValue').textContent = this.metrics.E_flower.toFixed(3);
        document.getElementById('lambdaValue').textContent = this.lambdaEstimate.toFixed(3);
        document.getElementById('fiValue').textContent = this.metrics.FI_computed.toFixed(4);
        document.getElementById('pointsValue').textContent = Math.min(this.currentStep, this.maxParticles);
    }
    
    async loadPresets() {
        try {
            const response = await fetch('thomas_flower_js_config.json');
            if (response.ok) {
                const data = await response.json();
                this.presets = data;
                this.applyPreset(this.currentPreset);
                this.updatePresetDropdown();
            }
        } catch (error) {
            console.log('Using default preset values');
            this.createDefaultPreset();
        }
    }
    
    createDefaultPreset() {
        this.presets = {
            canonical_xy: {
                id: "canonical_xy",
                description: "Baseline fit on XY projection",
                model: { 
                    b: 0.19, 
                    dt: 0.01, 
                    steps: 300000, 
                    transient_steps: 2000, 
                    seed: [0.1, 0.0, 0.0] 
                },
                projection: { 
                    plane: "xy", 
                    rotation: { axis: "z", angle_rad: 0.0 } 
                },
                rhodonea: { 
                    k: 3.96, 
                    m: 24.26, 
                    phi: -0.286, 
                    a: 3.74, 
                    formula: "r(theta) = a * cos(k*m*theta + phi)" 
                },
                metrics: { 
                    E_flower: 0.120, 
                    lambda_max: 0.103, 
                    FI_computed: 0.8054705, 
                    FI_reported: 0.8054705 
                }
            }
        };
        this.applyPreset('canonical_xy');
    }
    
    applyPreset(presetId) {
        const preset = this.presets[presetId];
        if (!preset) return;
        
        this.b = preset.model.b;
        this.dt = preset.model.dt;
        this.steps = preset.model.steps;
        this.transientSteps = preset.model.transient_steps;
        this.currentPosition.set(...preset.model.seed);
        
        this.projectionPlane = preset.projection.plane;
        
        this.rhodoneaParams = { ...preset.rhodonea };
        
        this.metrics.lambda_max = preset.metrics.lambda_max;
        this.lambdaEstimate = preset.metrics.lambda_max;
        
        document.getElementById('bSlider').value = this.b;
        document.getElementById('planeSelector').value = this.projectionPlane;
        document.getElementById('projectionPlane').textContent = this.projectionPlane.toUpperCase();
        
        this.resetSimulation();
    }
    
    updatePresetDropdown() {
        const dropdown = document.getElementById('presetDropdown');
        dropdown.innerHTML = '';
        
        Object.keys(this.presets).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = this.presets[key].description || key;
            dropdown.appendChild(option);
        });
    }
    
    resetSimulation() {
        this.currentStep = 0;
        this.particleIndex = 0;
        this.polarBuffer = [];
        this.lambdaPerturbation = new THREE.Vector3(1e-8, 0, 0);
        this.lambdaStepCount = 0;
        
        const positions = this.particleSystem.geometry.attributes.position.array;
        positions.fill(0);
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    bindUI() {
        document.getElementById('bSlider').addEventListener('input', (e) => {
            this.b = parseFloat(e.target.value);
            this.resetSimulation();
        });
        
        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            this.opacity3D = parseFloat(e.target.value);
            this.particleSystem.material.opacity = this.opacity3D;
        });
        
        document.getElementById('planeSelector').addEventListener('change', (e) => {
            this.projectionPlane = e.target.value;
            document.getElementById('projectionPlane').textContent = this.projectionPlane.toUpperCase();
            this.polarBuffer = [];
        });
        
        document.getElementById('floralToggle').addEventListener('change', (e) => {
            this.showFloral = e.target.checked;
            document.getElementById('floralPanel').style.display = this.showFloral ? 'block' : 'none';
        });
        
        document.getElementById('trailsToggle').addEventListener('change', (e) => {
            this.showTrails = e.target.checked;
        });
        
        document.getElementById('presetDropdown').addEventListener('change', (e) => {
            this.currentPreset = e.target.value;
            this.applyPreset(this.currentPreset);
        });
        
        document.getElementById('resetView').addEventListener('click', () => {
            this.camera.position.set(15, 15, 15);
            this.camera.lookAt(0, 0, 0);
            this.controls.spherical.setFromVector3(this.camera.position);
        });
        
        document.getElementById('exportPNG').addEventListener('click', () => {
            this.exportPNG();
        });
        
        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportJSON();
        });
    }
    
    exportPNG() {
        this.renderer.render(this.scene, this.camera);
        this.renderer.domElement.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `thomas_flower_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    exportJSON() {
        const exportData = {
            timestamp: new Date().toISOString(),
            parameters: {
                b: this.b,
                dt: this.dt,
                projectionPlane: this.projectionPlane
            },
            rhodonea: this.rhodoneaParams,
            metrics: {
                E_flower: this.metrics.E_flower,
                lambda: this.lambdaEstimate,
                FI: this.metrics.FI_computed
            },
            simulation: {
                currentStep: this.currentStep,
                particleCount: Math.min(this.currentStep, this.maxParticles)
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thomas_flower_data_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    hideLoading() {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isRunning) {
            for (let i = 0; i < 10; i++) {
                const point = this.stepThomas(this.dt, this.b);
                
                if (this.currentStep > this.transientSteps) {
                    if (this.currentStep % this.subsampleRate === 0) {
                        this.updateParticles(point);
                        
                        const projected = this.projectToPlane(point, this.projectionPlane);
                        this.accumulatePolar(projected);
                    }
                }
                
                this.currentStep++;
            }
            
            if (this.frameCount % 4 === 0) {
                this.metrics.E_flower = this.computeEflower();
                this.metrics.FI_computed = this.computeFI();
                this.updateHUD();
            }
            
            if (this.showFloral && this.frameCount % 2 === 0) {
                this.drawFloralPanel();
            }
        }
        
        this.renderer.render(this.scene, this.camera);
        this.frameCount++;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ThomasFlowerVisualizer();
});