/**
 * Floral Projection View
 * Clean Architecture implementation of 2D polar projections with rhodonea curves
 */

export class FloralProjectionView {
    constructor(canvas, eventBus, options = {}) {
        this.canvas = canvas;
        this.eventBus = eventBus;
        this.ctx = canvas.getContext('2d');
        
        this.options = {
            projectionPlane: options.projectionPlane || 'xy',
            bufferSize: options.bufferSize || 10000,
            fadeRate: options.fadeRate || 0.1,
            scale: options.scale || 30,
            ...options
        };

        // State
        this.polarBuffer = [];
        this.rhodoneaParams = {
            k: 3.96,
            m: 24.26,
            phi: -0.286,
            a: 3.74
        };

        this.isInitialized = false;
        this.animationFrameId = null;
        this.shouldRender = false;

        this.init();
    }

    async init() {
        try {
            this.setupCanvas();
            this.setupEventListeners();
            this.isInitialized = true;
            
            this.eventBus.emit('floral.initialized', {
                projectionPlane: this.options.projectionPlane,
                rhodoneaParams: this.rhodoneaParams
            });
        } catch (error) {
            this.eventBus.emit('floral.error', { error: error.message });
            throw error;
        }
    }

    setupCanvas() {
        // Set canvas size if not already set
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.canvas.width = 330;
            this.canvas.height = 300;
        }

        // Set high DPI support
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
    }

    setupEventListeners() {
        // Listen for simulation events
        this.eventBus.on('simulation.step', (eventData) => {
            this.handleSimulationStep(eventData);
        });

        this.eventBus.on('simulation.started', () => {
            this.clear();
            this.shouldRender = true;
            this.startRenderLoop();
        });

        this.eventBus.on('simulation.stopped', () => {
            this.shouldRender = false;
            this.stopRenderLoop();
        });

        this.eventBus.on('floral.command', (eventData) => {
            this.handleFloralCommand(eventData);
        });

        // Handle window resize
        window.addEventListener('resize', () => this.setupCanvas());
    }

    handleSimulationStep(eventData) {
        if (!this.isInitialized || !eventData.data.position) return;

        const position = eventData.data.position;
        this.accumulatePolar(position);
    }

    handleFloralCommand(eventData) {
        const { command, params } = eventData.data;

        switch (command) {
            case 'setProjectionPlane':
                this.setProjectionPlane(params.plane);
                break;
            case 'setRhodoneaParams':
                this.setRhodoneaParams(params);
                break;
            case 'clear':
                this.clear();
                break;
            case 'updateOptions':
                this.updateOptions(params);
                break;
        }
    }

    /**
     * Project 3D point to selected 2D plane
     */
    projectToPlane(point) {
        switch (this.options.projectionPlane) {
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

    /**
     * Convert Cartesian to polar coordinates
     */
    toPolar(point) {
        const r = Math.sqrt(point.x * point.x + point.y * point.y);
        const theta = Math.atan2(point.y, point.x);
        return { r, theta };
    }

    /**
     * Add point to polar buffer
     */
    accumulatePolar(point3D) {
        const projected = this.projectToPlane(point3D);
        const polar = this.toPolar(projected);
        
        this.polarBuffer.push(polar);
        
        if (this.polarBuffer.length > this.options.bufferSize) {
            this.polarBuffer.shift();
        }
        
        return polar;
    }

    /**
     * Compute rhodonea curve value
     */
    rhodonea(theta) {
        const { a, k, m, phi } = this.rhodoneaParams;
        return a * Math.cos(k * m * theta + phi);
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        if (this.animationFrameId) return;
        
        const render = () => {
            if (this.shouldRender) {
                this.render();
                this.animationFrameId = requestAnimationFrame(render);
            }
        };
        
        this.animationFrameId = requestAnimationFrame(render);
    }

    /**
     * Stop render loop
     */
    stopRenderLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Main render function
     */
    render() {
        if (!this.isInitialized) return;

        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Fade effect instead of clearing
        ctx.fillStyle = `rgba(10, 10, 20, ${this.options.fadeRate})`;
        ctx.fillRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = this.options.scale;
        
        // Draw reference elements
        this.drawReferenceCircles(ctx, centerX, centerY, scale);
        this.drawPolarPoints(ctx, centerX, centerY, scale);
        this.drawRhodonea(ctx, centerX, centerY, scale);
        this.drawInfo(ctx, width, height);
    }

    /**
     * Draw reference circles
     */
    drawReferenceCircles(ctx, centerX, centerY, scale) {
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.2)';
        ctx.lineWidth = 1;
        
        for (let r = 1; r <= 4; r++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, scale * r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.lineWidth = 0.5;
        
        // X axis
        ctx.beginPath();
        ctx.moveTo(centerX - scale * 4, centerY);
        ctx.lineTo(centerX + scale * 4, centerY);
        ctx.stroke();
        
        // Y axis
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scale * 4);
        ctx.lineTo(centerX, centerY + scale * 4);
        ctx.stroke();
    }

    /**
     * Draw polar points
     */
    drawPolarPoints(ctx, centerX, centerY, scale) {
        if (this.polarBuffer.length === 0) return;

        const recentPoints = this.polarBuffer.slice(-2000);
        const maxR = 8; // Maximum radius to display
        
        ctx.fillStyle = 'rgba(136, 170, 255, 0.6)';
        
        recentPoints.forEach((point, index) => {
            if (point.r < maxR) {
                const x = centerX + point.r * scale * Math.cos(point.theta);
                const y = centerY + point.r * scale * Math.sin(point.theta);
                
                // Vary point size based on age
                const age = (recentPoints.length - index) / recentPoints.length;
                const size = 1 + age * 2;
                
                ctx.fillRect(x - size/2, y - size/2, size, size);
            }
        });
    }

    /**
     * Draw the rhodonea curve overlay
     */
    drawRhodonea(ctx, centerX, centerY, scale) {
        ctx.strokeStyle = 'rgba(255, 100, 150, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let isFirstPoint = true;
        const steps = 1000;
        const maxTheta = Math.PI * 2 * Math.max(this.rhodoneaParams.k, this.rhodoneaParams.m);
        
        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * maxTheta;
            const r = Math.abs(this.rhodonea(theta));
            const x = centerX + r * scale * 0.3 * Math.cos(theta);
            const y = centerY + r * scale * 0.3 * Math.sin(theta);
            
            if (isFirstPoint) {
                ctx.moveTo(x, y);
                isFirstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }

    /**
     * Draw information overlay
     */
    drawInfo(ctx, width, height) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px monospace';
        
        const info = [
            `Plane: ${this.options.projectionPlane.toUpperCase()}`,
            `Points: ${this.polarBuffer.length}`,
            `Rhodonea: r = ${this.rhodoneaParams.a.toFixed(2)} * cos(${this.rhodoneaParams.k.toFixed(2)} * ${this.rhodoneaParams.m.toFixed(2)} * θ + ${this.rhodoneaParams.phi.toFixed(3)})`
        ];
        
        info.forEach((line, index) => {
            ctx.fillText(line, 10, height - 40 + index * 15);
        });
    }

    /**
     * Update projection plane
     */
    setProjectionPlane(plane) {
        if (['xy', 'yz', 'zx'].includes(plane)) {
            this.options.projectionPlane = plane;
            this.clear();
            
            this.eventBus.emit('floral.projection.changed', { 
                plane: plane 
            });
        }
    }

    /**
     * Update rhodonea parameters
     */
    setRhodoneaParams(params) {
        Object.assign(this.rhodoneaParams, params);
        
        this.eventBus.emit('floral.rhodonea.changed', { 
            params: this.rhodoneaParams 
        });
    }

    /**
     * Update options
     */
    updateOptions(newOptions) {
        Object.assign(this.options, newOptions);
        
        if (newOptions.projectionPlane) {
            this.setProjectionPlane(newOptions.projectionPlane);
        }
    }

    /**
     * Clear the buffer and canvas
     */
    clear() {
        this.polarBuffer = [];
        
        if (this.ctx) {
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);
            this.ctx.clearRect(0, 0, width, height);
        }
        
        this.eventBus.emit('floral.cleared', {});
    }

    /**
     * Get buffer for analysis
     */
    getPolarBuffer() {
        return [...this.polarBuffer];
    }

    /**
     * Get current statistics
     */
    getStats() {
        const buffer = this.polarBuffer;
        
        if (buffer.length === 0) {
            return {
                pointCount: 0,
                avgRadius: 0,
                maxRadius: 0,
                radiusStdDev: 0
            };
        }

        const radii = buffer.map(p => p.r);
        const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
        const maxRadius = Math.max(...radii);
        
        const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;
        const radiusStdDev = Math.sqrt(variance);

        return {
            pointCount: buffer.length,
            avgRadius: avgRadius,
            maxRadius: maxRadius,
            radiusStdDev: radiusStdDev,
            projectionPlane: this.options.projectionPlane,
            rhodoneaParams: { ...this.rhodoneaParams }
        };
    }

    /**
     * Export floral data
     */
    exportData() {
        return {
            polarBuffer: this.getPolarBuffer(),
            rhodoneaParams: { ...this.rhodoneaParams },
            projectionPlane: this.options.projectionPlane,
            stats: this.getStats(),
            timestamp: Date.now()
        };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.shouldRender = false;
        this.stopRenderLoop();
        
        window.removeEventListener('resize', this.setupCanvas);
        
        this.eventBus.emit('floral.disposed', {});
    }
}