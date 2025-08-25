/**
 * Floral Projection Module
 * Handles 2D projections and rhodonea curve overlays
 */

export class FloralProjection {
    constructor(canvas, projectionPlane = 'xy') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.projectionPlane = projectionPlane;
        
        this.polarBuffer = [];
        this.polarBufferSize = 10000;
        
        this.rhodoneaParams = {
            k: 3.96,
            m: 24.26,
            phi: -0.286,
            a: 3.74
        };
        
        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas.width = 330;
        this.canvas.height = 300;
    }

    /**
     * Project 3D point to selected 2D plane
     */
    projectToPlane(point) {
        switch(this.projectionPlane) {
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
        
        if (this.polarBuffer.length > this.polarBufferSize) {
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
     * Draw the floral projection panel
     */
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Fade effect
        ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = 30;
        
        // Draw reference circles
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, scale * r, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw polar points
        const recentPoints = this.polarBuffer.slice(-2000);
        ctx.fillStyle = 'rgba(136, 170, 255, 0.6)';
        recentPoints.forEach(point => {
            if (point.r < 10) {
                const x = centerX + point.r * scale * Math.cos(point.theta);
                const y = centerY + point.r * scale * Math.sin(point.theta);
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        });
        
        // Draw rhodonea overlay
        this.drawRhodonea(centerX, centerY, scale);
    }

    /**
     * Draw the rhodonea curve
     */
    drawRhodonea(centerX, centerY, scale) {
        const ctx = this.ctx;
        
        ctx.strokeStyle = 'rgba(255, 100, 150, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let theta = 0; theta < Math.PI * 2; theta += 0.01) {
            const r = this.rhodonea(theta);
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

    /**
     * Update rhodonea parameters
     */
    setRhodoneaParams(params) {
        Object.assign(this.rhodoneaParams, params);
    }

    /**
     * Change projection plane
     */
    setProjectionPlane(plane) {
        this.projectionPlane = plane;
        this.polarBuffer = [];
    }

    /**
     * Clear the buffer
     */
    clear() {
        this.polarBuffer = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Get buffer for metrics computation
     */
    getPolarBuffer() {
        return this.polarBuffer;
    }
}