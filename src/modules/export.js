/**
 * Export Module
 * Handles exporting visualizations and data
 */

export class ExportManager {
    constructor() {
        this.canvas = null;
        this.floralCanvas = null;
    }

    /**
     * Set canvases for export
     */
    setCanvases(mainCanvas, floralCanvas) {
        this.canvas = mainCanvas;
        this.floralCanvas = floralCanvas;
    }

    /**
     * Export main visualization as PNG
     */
    exportPNG(filename = null) {
        if (!this.canvas) {
            console.error('No canvas available for export');
            return;
        }

        const name = filename || `thomas_flower_${Date.now()}.png`;
        
        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    /**
     * Export combined visualization (main + floral panel)
     */
    exportCombinedPNG(showFloral = false) {
        if (!this.canvas) return;

        const combinedCanvas = document.createElement('canvas');
        const ctx = combinedCanvas.getContext('2d');
        
        if (showFloral && this.floralCanvas) {
            // Create combined image
            combinedCanvas.width = this.canvas.width;
            combinedCanvas.height = this.canvas.height;
            
            // Draw main canvas
            ctx.drawImage(this.canvas, 0, 0);
            
            // Draw floral panel in corner
            const floralScale = 0.3;
            const floralWidth = this.floralCanvas.width * floralScale;
            const floralHeight = this.floralCanvas.height * floralScale;
            const padding = 20;
            
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.drawImage(
                this.floralCanvas,
                combinedCanvas.width - floralWidth - padding,
                padding,
                floralWidth,
                floralHeight
            );
            ctx.restore();
        } else {
            // Just export main canvas
            combinedCanvas.width = this.canvas.width;
            combinedCanvas.height = this.canvas.height;
            ctx.drawImage(this.canvas, 0, 0);
        }

        combinedCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `thomas_flower_combined_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    /**
     * Export configuration and metrics as JSON
     */
    exportJSON(data, filename = null) {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: "2.0.0",
            ...data
        };

        const name = filename || `thomas_flower_data_${Date.now()}.json`;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export metrics as CSV
     */
    exportCSV(metricsHistory, filename = null) {
        if (!metricsHistory || metricsHistory.length === 0) {
            console.error('No metrics history available');
            return;
        }

        // Create CSV header
        const headers = Object.keys(metricsHistory[0]);
        let csv = headers.join(',') + '\n';
        
        // Add data rows
        metricsHistory.forEach(row => {
            const values = headers.map(header => row[header]);
            csv += values.join(',') + '\n';
        });

        const name = filename || `thomas_flower_metrics_${Date.now()}.csv`;
        const blob = new Blob([csv], { type: 'text/csv' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export point cloud data
     */
    exportPointCloud(positions, format = 'xyz') {
        if (!positions || positions.length === 0) {
            console.error('No point data available');
            return;
        }

        let content = '';
        const filename = `thomas_flower_points_${Date.now()}`;
        
        switch(format) {
            case 'xyz':
                // Simple XYZ format
                for (let i = 0; i < positions.length; i += 3) {
                    content += `${positions[i]} ${positions[i+1]} ${positions[i+2]}\n`;
                }
                this.downloadText(content, `${filename}.xyz`);
                break;
                
            case 'ply':
                // PLY format
                const numPoints = positions.length / 3;
                content = `ply
format ascii 1.0
element vertex ${numPoints}
property float x
property float y
property float z
end_header\n`;
                
                for (let i = 0; i < positions.length; i += 3) {
                    content += `${positions[i]} ${positions[i+1]} ${positions[i+2]}\n`;
                }
                this.downloadText(content, `${filename}.ply`);
                break;
                
            case 'json':
                // JSON format
                const points = [];
                for (let i = 0; i < positions.length; i += 3) {
                    points.push({
                        x: positions[i],
                        y: positions[i+1],
                        z: positions[i+2]
                    });
                }
                this.exportJSON({ points }, `${filename}.json`);
                break;
        }
    }

    /**
     * Export animation frames
     */
    async exportAnimation(captureFrame, totalFrames = 100) {
        const frames = [];
        
        for (let i = 0; i < totalFrames; i++) {
            const frameData = await captureFrame(i);
            frames.push(frameData);
            
            // Update progress
            if (i % 10 === 0) {
                console.log(`Captured frame ${i + 1}/${totalFrames}`);
            }
        }
        
        // Package frames (could be extended to create GIF/video)
        return frames;
    }

    /**
     * Helper to download text content
     */
    downloadText(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export state for sharing
     */
    exportShareableLink(state) {
        const compressed = this.compressState(state);
        const encoded = btoa(JSON.stringify(compressed));
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?state=${encoded}`;
    }

    /**
     * Import state from shareable link
     */
    importFromShareableLink() {
        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        
        if (stateParam) {
            try {
                const decoded = atob(stateParam);
                const state = JSON.parse(decoded);
                return this.decompressState(state);
            } catch (error) {
                console.error('Failed to import state from URL:', error);
            }
        }
        
        return null;
    }

    /**
     * Compress state for URL sharing
     */
    compressState(state) {
        // Simple compression - keep only essential fields
        return {
            b: state.b,
            p: state.projectionPlane,
            r: state.rhodoneaParams,
            o: state.opacity,
            f: state.showFloral,
            t: state.showTrails
        };
    }

    /**
     * Decompress state from URL
     */
    decompressState(compressed) {
        return {
            b: compressed.b,
            projectionPlane: compressed.p,
            rhodoneaParams: compressed.r,
            opacity: compressed.o,
            showFloral: compressed.f,
            showTrails: compressed.t
        };
    }
}