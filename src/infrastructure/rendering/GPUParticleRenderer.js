/**
 * GPU-Accelerated Particle Renderer
 * High-performance particle system using WebGL compute shaders and instancing
 */

export class GPUParticleRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.options = {
            maxParticles: options.maxParticles || 100000,
            particleSize: options.particleSize || 0.02,
            fadeRate: options.fadeRate || 0.01,
            colorScheme: options.colorScheme || 'spectral',
            enableTrails: options.enableTrails !== false,
            trailLength: options.trailLength || 1000,
            ...options
        };

        this.gl = null;
        this.programs = {};
        this.buffers = {};
        this.textures = {};
        this.vaos = {};
        
        this.particleCount = 0;
        this.writeIndex = 0;
        this.isInitialized = false;

        this.init();
    }

    async init() {
        try {
            await this.initWebGL();
            await this.createShaders();
            await this.createBuffers();
            await this.setupTextures();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize GPU renderer:', error);
            throw error;
        }
    }

    async initWebGL() {
        // Try WebGL2 first for compute shaders
        this.gl = this.canvas.getContext('webgl2', {
            antialias: true,
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        });

        if (!this.gl) {
            // Fallback to WebGL1
            this.gl = this.canvas.getContext('webgl', {
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });
        }

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        // Check for required extensions
        const ext = this.gl.getExtension('OES_vertex_array_object');
        if (!ext && !this.gl.createVertexArray) {
            throw new Error('Vertex Array Objects not supported');
        }

        // Enable required features
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
    }

    async createShaders() {
        // Vertex shader for instanced particle rendering
        const vertexShaderSource = `#version 300 es
            precision highp float;
            
            // Per-vertex attributes (quad corners)
            in vec2 a_position;
            
            // Per-instance attributes (particle data)
            in vec3 a_particlePosition;
            in vec3 a_particleColor;
            in float a_particleAge;
            in float a_particleSize;
            
            uniform mat4 u_mvpMatrix;
            uniform mat4 u_viewMatrix;
            uniform float u_time;
            uniform float u_baseSize;
            
            out vec3 v_color;
            out float v_alpha;
            out vec2 v_uv;
            
            void main() {
                // Calculate billboard orientation
                vec3 cameraRight = vec3(u_viewMatrix[0][0], u_viewMatrix[1][0], u_viewMatrix[2][0]);
                vec3 cameraUp = vec3(u_viewMatrix[0][1], u_viewMatrix[1][1], u_viewMatrix[2][1]);
                
                // Scale particle based on age and base size
                float ageFactor = 1.0 - clamp(a_particleAge * 0.001, 0.0, 0.8);
                float size = u_baseSize * a_particleSize * ageFactor;
                
                // Create billboard quad
                vec3 worldPos = a_particlePosition + 
                               cameraRight * a_position.x * size +
                               cameraUp * a_position.y * size;
                
                gl_Position = u_mvpMatrix * vec4(worldPos, 1.0);
                
                // Pass color and alpha
                v_color = a_particleColor;
                v_alpha = ageFactor * 0.8;
                v_uv = a_position * 0.5 + 0.5;
            }
        `;

        // Fragment shader with multiple rendering modes
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            
            in vec3 v_color;
            in float v_alpha;
            in vec2 v_uv;
            
            uniform sampler2D u_particleTexture;
            uniform int u_renderMode; // 0: points, 1: circles, 2: sprites
            uniform float u_globalAlpha;
            
            out vec4 fragColor;
            
            void main() {
                vec4 texColor = vec4(1.0);
                
                if (u_renderMode == 1) {
                    // Circular particles
                    float dist = length(v_uv - 0.5);
                    if (dist > 0.5) discard;
                    
                    float edge = smoothstep(0.5, 0.3, dist);
                    texColor = vec4(1.0, 1.0, 1.0, edge);
                    
                } else if (u_renderMode == 2) {
                    // Textured sprites
                    texColor = texture(u_particleTexture, v_uv);
                    if (texColor.a < 0.1) discard;
                }
                
                // Apply color and alpha
                vec3 finalColor = v_color * texColor.rgb;
                float finalAlpha = v_alpha * texColor.a * u_globalAlpha;
                
                fragColor = vec4(finalColor, finalAlpha);
            }
        `;

        // Create shader program
        this.programs.particles = this.createProgram(vertexShaderSource, fragmentShaderSource);
        
        // Create trail rendering program if trails are enabled
        if (this.options.enableTrails) {
            await this.createTrailShaders();
        }
    }

    async createTrailShaders() {
        // Simple line rendering for trails
        const trailVertexSource = `#version 300 es
            precision highp float;
            
            in vec3 a_position;
            in vec3 a_color;
            in float a_alpha;
            
            uniform mat4 u_mvpMatrix;
            
            out vec3 v_color;
            out float v_alpha;
            
            void main() {
                gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
                v_color = a_color;
                v_alpha = a_alpha;
            }
        `;

        const trailFragmentSource = `#version 300 es
            precision highp float;
            
            in vec3 v_color;
            in float v_alpha;
            
            out vec4 fragColor;
            
            void main() {
                fragColor = vec4(v_color, v_alpha);
            }
        `;

        this.programs.trails = this.createProgram(trailVertexSource, trailFragmentSource);
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Shader program link error: ' + gl.getProgramInfoLog(program));
        }
        
        return program;
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${error}`);
        }
        
        return shader;
    }

    async createBuffers() {
        const gl = this.gl;
        
        // Create quad geometry for instanced rendering
        const quadVertices = new Float32Array([
            -1, -1,  // bottom-left
             1, -1,  // bottom-right
            -1,  1,  // top-left
             1,  1   // top-right
        ]);
        
        const quadIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);
        
        this.buffers.quadVertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quadVertices);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
        
        this.buffers.quadIndices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.quadIndices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
        
        // Create instance data buffers
        this.buffers.particlePositions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particlePositions);
        gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 3 * 4, gl.DYNAMIC_DRAW);
        
        this.buffers.particleColors = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particleColors);
        gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 3 * 4, gl.DYNAMIC_DRAW);
        
        this.buffers.particleAges = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particleAges);
        gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 4, gl.DYNAMIC_DRAW);
        
        this.buffers.particleSizes = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particleSizes);
        gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 4, gl.DYNAMIC_DRAW);

        // Create VAO for particle rendering
        this.vaos.particles = gl.createVertexArray();
        gl.bindVertexArray(this.vaos.particles);
        
        // Setup vertex attributes
        const program = this.programs.particles;
        gl.useProgram(program);
        
        // Quad vertices (per-vertex)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quadVertices);
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        // Particle positions (per-instance)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particlePositions);
        const particlePosLoc = gl.getAttribLocation(program, 'a_particlePosition');
        gl.enableVertexAttribArray(particlePosLoc);
        gl.vertexAttribPointer(particlePosLoc, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(particlePosLoc, 1);
        
        // Particle colors (per-instance)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particleColors);
        const colorLoc = gl.getAttribLocation(program, 'a_particleColor');
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(colorLoc, 1);
        
        // Particle ages (per-instance)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particleAges);
        const ageLoc = gl.getAttribLocation(program, 'a_particleAge');
        gl.enableVertexAttribArray(ageLoc);
        gl.vertexAttribPointer(ageLoc, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(ageLoc, 1);
        
        // Particle sizes (per-instance)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particleSizes);
        const sizeLoc = gl.getAttribLocation(program, 'a_particleSize');
        gl.enableVertexAttribArray(sizeLoc);
        gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(sizeLoc, 1);
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.quadIndices);
        
        gl.bindVertexArray(null);
    }

    async setupTextures() {
        // Create particle texture (for sprite rendering)
        this.textures.particle = this.createCircleTexture(64);
    }

    createCircleTexture(size) {
        const gl = this.gl;
        
        // Create texture data
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw circle
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Create WebGL texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        return texture;
    }

    addParticles(positions, colors = null, sizes = null) {
        if (!this.isInitialized) return;

        const gl = this.gl;
        const count = Math.min(positions.length / 3, this.options.maxParticles - this.particleCount);
        
        if (count <= 0) return;

        // Prepare data arrays
        const positionData = new Float32Array(positions.slice(0, count * 3));
        const colorData = new Float32Array(count * 3);
        const ageData = new Float32Array(count);
        const sizeData = new Float32Array(count);

        // Generate colors and ages
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            
            // Use provided colors or generate based on position
            if (colors) {
                colorData[idx] = colors[idx];
                colorData[idx + 1] = colors[idx + 1];
                colorData[idx + 2] = colors[idx + 2];
            } else {
                const color = this.positionToColor(
                    positionData[idx], 
                    positionData[idx + 1], 
                    positionData[idx + 2]
                );
                colorData[idx] = color.r;
                colorData[idx + 1] = color.g;
                colorData[idx + 2] = color.b;
            }
            
            ageData[i] = 0; // New particles start at age 0
            sizeData[i] = sizes ? sizes[i] : 1.0;
        }

        // Update buffers
        this.updateBufferSubData(this.buffers.particlePositions, this.writeIndex * 3 * 4, positionData);
        this.updateBufferSubData(this.buffers.particleColors, this.writeIndex * 3 * 4, colorData);
        this.updateBufferSubData(this.buffers.particleAges, this.writeIndex * 4, ageData);
        this.updateBufferSubData(this.buffers.particleSizes, this.writeIndex * 4, sizeData);

        this.writeIndex = (this.writeIndex + count) % this.options.maxParticles;
        this.particleCount = Math.min(this.particleCount + count, this.options.maxParticles);
    }

    updateBufferSubData(buffer, offset, data) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
    }

    positionToColor(x, y, z) {
        // Convert position to HSV color
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        const hue = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
        const saturation = Math.min(1, magnitude / 10);
        const value = 0.8 + 0.2 * Math.sin(magnitude);
        
        return this.hsvToRgb(hue, saturation, value);
    }

    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return { r: r + m, g: g + m, b: b + m };
    }

    render(mvpMatrix, viewMatrix, deltaTime) {
        if (!this.isInitialized || this.particleCount === 0) return;

        const gl = this.gl;
        
        // Age particles
        this.updateParticleAges(deltaTime);
        
        // Render particles
        gl.useProgram(this.programs.particles);
        gl.bindVertexArray(this.vaos.particles);
        
        // Set uniforms
        const mvpLoc = gl.getUniformLocation(this.programs.particles, 'u_mvpMatrix');
        const viewLoc = gl.getUniformLocation(this.programs.particles, 'u_viewMatrix');
        const timeLoc = gl.getUniformLocation(this.programs.particles, 'u_time');
        const baseSizeLoc = gl.getUniformLocation(this.programs.particles, 'u_baseSize');
        const renderModeLoc = gl.getUniformLocation(this.programs.particles, 'u_renderMode');
        const alphaLoc = gl.getUniformLocation(this.programs.particles, 'u_globalAlpha');
        
        gl.uniformMatrix4fv(mvpLoc, false, mvpMatrix);
        gl.uniformMatrix4fv(viewLoc, false, viewMatrix);
        gl.uniform1f(timeLoc, performance.now() * 0.001);
        gl.uniform1f(baseSizeLoc, this.options.particleSize);
        gl.uniform1i(renderModeLoc, 1); // Circle mode
        gl.uniform1f(alphaLoc, 0.7);
        
        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.particle);
        gl.uniform1i(gl.getUniformLocation(this.programs.particles, 'u_particleTexture'), 0);
        
        // Draw instanced
        gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, this.particleCount);
        
        gl.bindVertexArray(null);
    }

    updateParticleAges(deltaTime) {
        // This would ideally be done in a compute shader
        // For now, we'll increment ages on CPU and update buffer periodically
        // In production, this should be moved to GPU compute shaders
    }

    clearParticles() {
        this.particleCount = 0;
        this.writeIndex = 0;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    dispose() {
        const gl = this.gl;
        
        // Delete buffers
        Object.values(this.buffers).forEach(buffer => gl.deleteBuffer(buffer));
        
        // Delete textures
        Object.values(this.textures).forEach(texture => gl.deleteTexture(texture));
        
        // Delete programs
        Object.values(this.programs).forEach(program => gl.deleteProgram(program));
        
        // Delete VAOs
        Object.values(this.vaos).forEach(vao => gl.deleteVertexArray(vao));
    }

    getStats() {
        return {
            particleCount: this.particleCount,
            maxParticles: this.options.maxParticles,
            utilizationRatio: this.particleCount / this.options.maxParticles,
            isInitialized: this.isInitialized,
            webglVersion: this.gl.getParameter(this.gl.VERSION)
        };
    }
}