/**
 * Volumetric Effects for Thomas Attractor
 * Multi-layered visual elements derived from mathematical properties
 */

export class VolumetricEffects {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            enableDensityClouds: config.enableDensityClouds !== false,
            enableVelocityGlow: config.enableVelocityGlow !== false,
            enableEnergyField: config.enableEnergyField !== false,
            enableVorticity: config.enableVorticity !== false,
            enablePhaseFlow: config.enablePhaseFlow !== false,
            cloudResolution: config.cloudResolution || 32,
            glowIntensity: config.glowIntensity || 1.0,
            ...config
        };

        this.densityField = new Map();
        this.velocityField = [];
        this.effects = {};
        
        this.init();
    }

    init() {
        if (this.config.enableDensityClouds) {
            this.createDensityClouds();
        }
        
        if (this.config.enableVelocityGlow) {
            this.createVelocityGlow();
        }
        
        if (this.config.enableEnergyField) {
            this.createEnergyField();
        }
        
        if (this.config.enableVorticity) {
            this.createVorticityRibbons();
        }
        
        if (this.config.enablePhaseFlow) {
            this.createPhaseFlowLines();
        }
    }

    /**
     * 1. DENSITY CLOUDS - Volumetric fog where attractor visits frequently
     */
    createDensityClouds() {
        const resolution = this.config.cloudResolution;
        
        // Create 3D texture for density field
        const size = resolution * resolution * resolution;
        const data = new Float32Array(size * 4);
        
        // Volumetric cloud material with custom shader - REFINED COLORS
        const cloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                densityTexture: { value: null },
                time: { value: 0 },
                opacity: { value: 0.15 },  // Reduced from 0.3 for subtlety
                colorLow: { value: new THREE.Color(0x000044) },  // Deep blue
                colorMid: { value: new THREE.Color(0x0066aa) },  // Mid blue
                colorHigh: { value: new THREE.Color(0x00aaff) }  // Bright cyan
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vPosition;
                
                void main() {
                    vPosition = position;
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPos.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float opacity;
                uniform vec3 colorLow;
                uniform vec3 colorMid;
                uniform vec3 colorHigh;
                varying vec3 vWorldPosition;
                varying vec3 vPosition;
                
                // Simple 3D noise for animation
                float noise(vec3 p) {
                    return sin(p.x * 2.0) * sin(p.y * 2.0) * sin(p.z * 2.0);
                }
                
                void main() {
                    // Sample density at this position
                    float density = length(vPosition) * 0.1;
                    density += noise(vPosition * 3.0 + time * 0.1) * 0.1;
                    
                    // Color based on density
                    vec3 color = colorLow;
                    if (density > 0.3) color = mix(colorLow, colorMid, (density - 0.3) * 3.0);
                    if (density > 0.6) color = mix(colorMid, colorHigh, (density - 0.6) * 3.0);
                    
                    // Fade edges
                    float edgeFade = 1.0 - smoothstep(0.0, 1.0, length(vPosition) * 0.3);
                    
                    gl_FragColor = vec4(color, density * opacity * edgeFade);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Create cloud geometry (box that encompasses attractor)
        const cloudGeometry = new THREE.BoxGeometry(30, 30, 30, 32, 32, 32);
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.scene.add(cloudMesh);
        
        this.effects.densityClouds = {
            mesh: cloudMesh,
            material: cloudMaterial,
            data: data
        };
    }

    /**
     * 2. VELOCITY GLOW - Brightness based on speed
     */
    createVelocityGlow() {
        // Create glow sprite material - HARMONIZED COLORS
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x88ccff) },  // Softer blue-white
                viewVector: { value: new THREE.Vector3() },
                intensity: { value: this.config.glowIntensity * 0.5 }  // Reduced intensity
            },
            vertexShader: `
                uniform vec3 viewVector;
                varying float vIntensity;
                
                void main() {
                    vec3 vNormal = normalize(normalMatrix * normal);
                    vIntensity = pow(0.8 - dot(vNormal, viewVector), 2.0);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float intensity;
                varying float vIntensity;
                
                void main() {
                    gl_FragColor = vec4(color, vIntensity * intensity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });

        // Create glow sphere
        const glowGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        
        this.effects.velocityGlow = {
            mesh: glowMesh,
            material: glowMaterial,
            trail: []
        };
    }

    /**
     * 3. ENERGY FIELD - Glass-like energy surfaces
     */
    createEnergyField() {
        // Create parametric surface for energy levels - MORE SUBTLE
        const energyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4488ff,  // Softer blue instead of cyan
            metalness: 0.0,   // Less metallic
            roughness: 0.2,   // Slightly rougher
            transmission: 0.95,  // More transparent
            transparent: true,
            opacity: 0.08,    // Much more subtle (was 0.2)
            thickness: 0.2,   // Thinner
            envMapIntensity: 0.5,  // Less intense reflections
            clearcoat: 0.5,   // Reduced clearcoat
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide
        });

        // Create toroidal energy surface
        const torusGeometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
        const energyMesh = new THREE.Mesh(torusGeometry, energyMaterial);
        energyMesh.rotation.x = Math.PI / 4;
        this.scene.add(energyMesh);
        
        this.effects.energyField = {
            mesh: energyMesh,
            material: energyMaterial
        };
    }

    /**
     * 4. VORTICITY RIBBONS - Showing rotation field
     */
    createVorticityRibbons() {
        const ribbonMaterial = new THREE.MeshBasicMaterial({
            color: 0x6644aa,  // Softer purple (was hot magenta)
            transparent: true,
            opacity: 0.05,    // Much more subtle (was 0.3)
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const ribbonGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(5, 5, 5),
                new THREE.Vector3(-5, 10, -5),
                new THREE.Vector3(0, 15, 0)
            ]),
            100,  // tubularSegments
            0.2,  // radius
            8,    // radialSegments
            false // closed
        );

        const ribbonMesh = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
        this.scene.add(ribbonMesh);
        
        this.effects.vorticityRibbons = {
            mesh: ribbonMesh,
            material: ribbonMaterial,
            curves: []
        };
    }

    /**
     * 5. PHASE FLOW LINES - Ghost trajectories showing flow field
     */
    createPhaseFlowLines() {
        const flowMaterial = new THREE.LineBasicMaterial({
            color: 0x44aaff,  // Soft cyan instead of green
            transparent: true,
            opacity: 0.02,    // Very subtle (was 0.1)
            blending: THREE.AdditiveBlending
        });

        // Create multiple flow lines
        const flowLines = [];
        for (let i = 0; i < 20; i++) {
            const points = [];
            for (let j = 0; j < 50; j++) {
                points.push(new THREE.Vector3(
                    Math.random() * 20 - 10,
                    Math.random() * 20 - 10,
                    Math.random() * 20 - 10
                ));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, flowMaterial);
            this.scene.add(line);
            flowLines.push(line);
        }
        
        this.effects.phaseFlowLines = {
            lines: flowLines,
            material: flowMaterial
        };
    }

    /**
     * Update density field based on trajectory points
     */
    updateDensityField(points) {
        if (!this.config.enableDensityClouds) return;
        
        points.forEach(point => {
            const key = `${Math.round(point[0])},${Math.round(point[1])},${Math.round(point[2])}`;
            const current = this.densityField.get(key) || 0;
            this.densityField.set(key, current + 1);
        });
    }

    /**
     * Update velocity-based glow effects
     */
    updateVelocityGlow(points, velocities) {
        if (!this.config.enableVelocityGlow) return;
        
        // Update glow intensity based on average velocity
        const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
        this.effects.velocityGlow.material.uniforms.intensity.value = 
            this.config.glowIntensity * (1 + avgVelocity * 0.5);
    }

    /**
     * Animate all volumetric effects
     */
    animate(time) {
        // Animate density clouds
        if (this.effects.densityClouds) {
            this.effects.densityClouds.material.uniforms.time.value = time;
        }
        
        // Rotate energy field
        if (this.effects.energyField) {
            this.effects.energyField.mesh.rotation.y = time * 0.1;
            this.effects.energyField.mesh.rotation.z = time * 0.05;
        }
        
        // Animate vorticity ribbons
        if (this.effects.vorticityRibbons) {
            this.effects.vorticityRibbons.mesh.rotation.x = time * 0.2;
        }
        
        // Update phase flow lines
        if (this.effects.phaseFlowLines) {
            this.effects.phaseFlowLines.lines.forEach((line, i) => {
                line.rotation.y = time * 0.1 * (i % 2 ? 1 : -1);
            });
        }
    }

    /**
     * Calculate local velocity magnitude
     */
    calculateVelocity(point, b) {
        const [x, y, z] = point;
        const vx = Math.sin(y) - b * x;
        const vy = Math.sin(z) - b * y;
        const vz = Math.sin(x) - b * z;
        return Math.sqrt(vx * vx + vy * vy + vz * vz);
    }

    /**
     * Calculate local vorticity
     */
    calculateVorticity(point) {
        const [x, y, z] = point;
        return {
            x: Math.cos(x),
            y: Math.cos(y),
            z: Math.cos(z),
            magnitude: Math.sqrt(Math.cos(x)**2 + Math.cos(y)**2 + Math.cos(z)**2)
        };
    }

    /**
     * Dispose of all effects
     */
    dispose() {
        Object.values(this.effects).forEach(effect => {
            if (effect.mesh) {
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
                this.scene.remove(effect.mesh);
            }
            if (effect.lines) {
                effect.lines.forEach(line => {
                    line.geometry.dispose();
                    this.scene.remove(line);
                });
            }
        });
    }
}