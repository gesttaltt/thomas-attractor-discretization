/**
 * Export Adapter
 * Clean Architecture implementation of export functionality
 */

export class ExportAdapter {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.canvases = new Map();
        this.exportFormats = ['png', 'jpg', 'webp', 'json', 'csv', 'xyz', 'ply'];
    }

    /**
     * Register canvas for export
     */
    registerCanvas(name, canvas) {
        this.canvases.set(name, canvas);
        this.eventBus.emit('export.canvas.registered', { name });
    }

    /**
     * Export visualization as image
     */
    async exportImage(options = {}) {
        const {
            canvasName = 'main',
            format = 'png',
            quality = 1.0,
            filename = null,
            includeOverlays = false
        } = options;

        const canvas = this.canvases.get(canvasName);
        if (!canvas) {
            throw new Error(`Canvas '${canvasName}' not found for export`);
        }

        try {
            let exportCanvas = canvas;

            // Create combined image if overlays requested
            if (includeOverlays && this.canvases.has('floral')) {
                exportCanvas = await this.createCombinedCanvas(canvas, this.canvases.get('floral'));
            }

            const mimeType = `image/${format}`;
            const defaultFilename = filename || `thomas_attractor_${Date.now()}.${format}`;

            // Export the image
            exportCanvas.toBlob((blob) => {
                this.downloadBlob(blob, defaultFilename);
                this.eventBus.emit('export.image.completed', {
                    format,
                    filename: defaultFilename,
                    size: blob.size
                });
            }, mimeType, quality);

            return { success: true, filename: defaultFilename };

        } catch (error) {
            this.eventBus.emit('export.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Create combined canvas with main visualization and overlays
     */
    async createCombinedCanvas(mainCanvas, overlayCanvas) {
        const combinedCanvas = document.createElement('canvas');
        const ctx = combinedCanvas.getContext('2d');

        combinedCanvas.width = mainCanvas.width;
        combinedCanvas.height = mainCanvas.height;

        // Draw main canvas
        ctx.drawImage(mainCanvas, 0, 0);

        // Draw overlay in corner
        if (overlayCanvas) {
            const scale = 0.3;
            const overlayWidth = overlayCanvas.width * scale;
            const overlayHeight = overlayCanvas.height * scale;
            const padding = 20;

            ctx.save();
            ctx.globalAlpha = 0.9;
            
            // Add background for overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(
                combinedCanvas.width - overlayWidth - padding - 10,
                padding - 10,
                overlayWidth + 20,
                overlayHeight + 20
            );

            // Draw overlay
            ctx.drawImage(
                overlayCanvas,
                combinedCanvas.width - overlayWidth - padding,
                padding,
                overlayWidth,
                overlayHeight
            );
            
            ctx.restore();
        }

        return combinedCanvas;
    }

    /**
     * Export simulation data as JSON
     */
    async exportJSON(data, filename = null) {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: "2.0.0",
                application: "Thomas Attractor - Clean Architecture",
                data: data
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const defaultFilename = filename || `thomas_attractor_data_${Date.now()}.json`;

            this.downloadBlob(blob, defaultFilename);

            this.eventBus.emit('export.json.completed', {
                filename: defaultFilename,
                size: blob.size,
                recordCount: Array.isArray(data) ? data.length : 1
            });

            return { success: true, filename: defaultFilename, size: blob.size };

        } catch (error) {
            this.eventBus.emit('export.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Export data as CSV
     */
    async exportCSV(data, filename = null) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('CSV export requires non-empty array data');
        }

        try {
            const headers = Object.keys(data[0]);
            let csv = headers.join(',') + '\n';

            // Add data rows
            data.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header];
                    // Handle different data types
                    if (value === null || value === undefined) {
                        return '';
                    }
                    if (Array.isArray(value)) {
                        return `"${value.join(';')}"`;
                    }
                    if (typeof value === 'object') {
                        return `"${JSON.stringify(value)}"`;
                    }
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value;
                });
                csv += values.join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const defaultFilename = filename || `thomas_attractor_data_${Date.now()}.csv`;

            this.downloadBlob(blob, defaultFilename);

            this.eventBus.emit('export.csv.completed', {
                filename: defaultFilename,
                size: blob.size,
                recordCount: data.length
            });

            return { success: true, filename: defaultFilename, recordCount: data.length };

        } catch (error) {
            this.eventBus.emit('export.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Export point cloud data
     */
    async exportPointCloud(positions, format = 'xyz', filename = null) {
        if (!positions || positions.length === 0) {
            throw new Error('No point data available for export');
        }

        try {
            let content = '';
            let mimeType = 'text/plain';
            let fileExtension = format;
            const defaultFilename = filename || `thomas_attractor_points_${Date.now()}.${fileExtension}`;

            switch (format.toLowerCase()) {
                case 'xyz':
                    content = this.generateXYZ(positions);
                    break;

                case 'ply':
                    content = this.generatePLY(positions);
                    mimeType = 'text/plain';
                    break;

                case 'obj':
                    content = this.generateOBJ(positions);
                    fileExtension = 'obj';
                    break;

                case 'json':
                    content = this.generatePointsJSON(positions);
                    mimeType = 'application/json';
                    fileExtension = 'json';
                    break;

                default:
                    throw new Error(`Unsupported point cloud format: ${format}`);
            }

            const blob = new Blob([content], { type: mimeType });
            this.downloadBlob(blob, defaultFilename);

            const numPoints = Array.isArray(positions[0]) ? positions.length : positions.length / 3;

            this.eventBus.emit('export.pointcloud.completed', {
                filename: defaultFilename,
                format: format,
                pointCount: numPoints,
                size: blob.size
            });

            return { success: true, filename: defaultFilename, pointCount: numPoints };

        } catch (error) {
            this.eventBus.emit('export.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate XYZ format
     */
    generateXYZ(positions) {
        let content = '';
        
        if (Array.isArray(positions[0])) {
            // Array of point objects/arrays
            positions.forEach(point => {
                if (Array.isArray(point)) {
                    content += `${point[0]} ${point[1]} ${point[2]}\n`;
                } else {
                    content += `${point.x} ${point.y} ${point.z}\n`;
                }
            });
        } else {
            // Flat array
            for (let i = 0; i < positions.length; i += 3) {
                content += `${positions[i]} ${positions[i+1]} ${positions[i+2]}\n`;
            }
        }
        
        return content;
    }

    /**
     * Generate PLY format
     */
    generatePLY(positions) {
        const numPoints = Array.isArray(positions[0]) ? positions.length : positions.length / 3;
        
        let content = `ply
format ascii 1.0
comment Thomas Attractor point cloud
element vertex ${numPoints}
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
`;

        if (Array.isArray(positions[0])) {
            positions.forEach(point => {
                const [x, y, z] = Array.isArray(point) ? point : [point.x, point.y, point.z];
                // Add color based on position
                const color = this.positionToColor(x, y, z);
                content += `${x} ${y} ${z} ${color.r} ${color.g} ${color.b}\n`;
            });
        } else {
            for (let i = 0; i < positions.length; i += 3) {
                const [x, y, z] = [positions[i], positions[i+1], positions[i+2]];
                const color = this.positionToColor(x, y, z);
                content += `${x} ${y} ${z} ${color.r} ${color.g} ${color.b}\n`;
            }
        }

        return content;
    }

    /**
     * Generate OBJ format
     */
    generateOBJ(positions) {
        let content = '# Thomas Attractor Point Cloud\n';
        
        if (Array.isArray(positions[0])) {
            positions.forEach(point => {
                const [x, y, z] = Array.isArray(point) ? point : [point.x, point.y, point.z];
                content += `v ${x} ${y} ${z}\n`;
            });
        } else {
            for (let i = 0; i < positions.length; i += 3) {
                content += `v ${positions[i]} ${positions[i+1]} ${positions[i+2]}\n`;
            }
        }

        return content;
    }

    /**
     * Generate JSON point cloud
     */
    generatePointsJSON(positions) {
        const points = [];
        
        if (Array.isArray(positions[0])) {
            positions.forEach(point => {
                if (Array.isArray(point)) {
                    points.push({ x: point[0], y: point[1], z: point[2] });
                } else {
                    points.push({ x: point.x, y: point.y, z: point.z });
                }
            });
        } else {
            for (let i = 0; i < positions.length; i += 3) {
                points.push({
                    x: positions[i],
                    y: positions[i+1],
                    z: positions[i+2]
                });
            }
        }

        return JSON.stringify({
            format: 'Thomas Attractor Point Cloud',
            timestamp: new Date().toISOString(),
            pointCount: points.length,
            points: points
        }, null, 2);
    }

    /**
     * Convert position to color for PLY export
     */
    positionToColor(x, y, z) {
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        const hue = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
        const saturation = Math.min(1, magnitude / 8);
        const value = 0.8;

        const { r, g, b } = this.hsvToRgb(hue, saturation, value);
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Convert HSV to RGB
     */
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

    /**
     * Create shareable link
     */
    createShareableLink(state) {
        try {
            const compressed = this.compressState(state);
            const encoded = btoa(JSON.stringify(compressed));
            const baseUrl = window.location.origin + window.location.pathname;
            
            const shareUrl = `${baseUrl}?state=${encoded}`;
            
            // Copy to clipboard if available
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl);
            }
            
            this.eventBus.emit('export.link.created', { 
                url: shareUrl,
                copiedToClipboard: !!navigator.clipboard 
            });
            
            return shareUrl;
            
        } catch (error) {
            this.eventBus.emit('export.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Import state from URL
     */
    importFromURL() {
        try {
            const params = new URLSearchParams(window.location.search);
            const stateParam = params.get('state');
            
            if (stateParam) {
                const decoded = atob(stateParam);
                const compressed = JSON.parse(decoded);
                const state = this.decompressState(compressed);
                
                this.eventBus.emit('export.link.imported', { state });
                return state;
            }
            
            return null;
            
        } catch (error) {
            this.eventBus.emit('export.error', { error: error.message });
            return null;
        }
    }

    /**
     * Compress state for URL sharing
     */
    compressState(state) {
        return {
            b: state.b,
            dt: state.dt,
            s: state.seed,
            p: state.projectionPlane,
            r: state.rhodoneaParams,
            ps: state.particleSize,
            ar: state.autoRotate
        };
    }

    /**
     * Decompress state from URL
     */
    decompressState(compressed) {
        return {
            b: compressed.b,
            dt: compressed.dt,
            seed: compressed.s,
            projectionPlane: compressed.p,
            rhodoneaParams: compressed.r,
            particleSize: compressed.ps,
            autoRotate: compressed.ar
        };
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Get export statistics
     */
    getExportStats() {
        return {
            registeredCanvases: Array.from(this.canvases.keys()),
            supportedFormats: [...this.exportFormats],
            capabilities: {
                clipboard: !!navigator.clipboard,
                download: true,
                combinedExport: this.canvases.size > 1
            }
        };
    }
}