/**
 * Floral Projection - 2D visualization with rhodonea curves
 * Simplified implementation
 */

export class FloralProjection {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = {
            projectionPlane: config.projectionPlane || 'xy',
            bufferSize: config.bufferSize || 10000,
            fadeRate: config.fadeRate || 0.98,
            lineWidth: config.lineWidth || 0.5,
            backgroundColor: config.backgroundColor || '#000011',
            trailColor: config.trailColor || '#64b5f6',
            rhodoneaColor: config.rhodoneaColor || '#ff6b6b',
            showRhodonea: config.showRhodonea !== false,
            ...config
        };

        this.points = [];
        this.rhodoneaParams = { k: 7, scale: 8 };
        
        this.setupCanvas();
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        // Set initial styles
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.config.trailColor;
        this.ctx.lineWidth = this.config.lineWidth;
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
    }

    addPoints(points3D) {
        // Project 3D points to 2D based on selected plane
        const projected = points3D.map(p => this.project(p));
        
        // Add to buffer
        this.points.push(...projected);
        
        // Maintain buffer size
        if (this.points.length > this.config.bufferSize) {
            this.points.splice(0, this.points.length - this.config.bufferSize);
        }
    }

    project(point3D) {
        const [x, y, z] = point3D;
        
        switch (this.config.projectionPlane) {
            case 'xy':
                return [x, y];
            case 'yz':
                return [y, z];
            case 'zx':
                return [z, x];
            default:
                return [x, y];
        }
    }

    render() {
        // Apply fade effect
        this.ctx.fillStyle = this.config.backgroundColor + '08'; // Semi-transparent
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw trail
        if (this.points.length > 1) {
            this.drawTrail();
        }
        
        // Draw rhodonea overlay
        if (this.config.showRhodonea) {
            this.drawRhodonea();
        }
    }

    drawTrail() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = Math.min(width, height) / 20;
        
        this.ctx.strokeStyle = this.config.trailColor;
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        
        for (let i = 0; i < this.points.length - 1; i++) {
            const alpha = (i / this.points.length) * 0.8;
            this.ctx.globalAlpha = alpha;
            
            const [x1, y1] = this.points[i];
            const [x2, y2] = this.points[i + 1];
            
            const screenX1 = centerX + x1 * scale;
            const screenY1 = centerY - y1 * scale; // Flip Y
            const screenX2 = centerX + x2 * scale;
            const screenY2 = centerY - y2 * scale;
            
            this.ctx.moveTo(screenX1, screenY1);
            this.ctx.lineTo(screenX2, screenY2);
        }
        
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawRhodonea() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const k = this.rhodoneaParams.k;
        const scale = this.rhodoneaParams.scale * Math.min(width, height) / 50;
        
        this.ctx.strokeStyle = this.config.rhodoneaColor;
        this.ctx.globalAlpha = 0.3;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // Draw rhodonea curve: r = cos(k * theta)
        for (let theta = 0; theta < Math.PI * 2; theta += 0.01) {
            const r = Math.cos(k * theta) * scale;
            const x = centerX + r * Math.cos(theta);
            const y = centerY + r * Math.sin(theta);
            
            if (theta === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Restore settings
        this.ctx.globalAlpha = 1;
        this.ctx.lineWidth = this.config.lineWidth;
    }

    setProjectionPlane(plane) {
        this.config.projectionPlane = plane;
        this.clear();
    }

    setRhodoneaParams(params) {
        if (params.k !== undefined) {
            this.rhodoneaParams.k = params.k;
        }
        if (params.scale !== undefined) {
            this.rhodoneaParams.scale = params.scale;
        }
    }

    clear() {
        this.points = [];
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    handleResize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.clear();
    }

    exportData() {
        return {
            points: this.points.slice(-1000), // Last 1000 points
            projectionPlane: this.config.projectionPlane,
            rhodoneaParams: this.rhodoneaParams
        };
    }

    dispose() {
        window.removeEventListener('resize', this.handleResize);
        this.clear();
    }
}