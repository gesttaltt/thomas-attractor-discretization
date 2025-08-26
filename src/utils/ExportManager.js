/**
 * Export Manager - Simplified export functionality
 * No dependency injection, direct implementation
 */

export class ExportManager {
    constructor() {
        this.baseUrl = window.location.origin + window.location.pathname;
    }

    /**
     * Export canvas as image
     */
    async exportImage(canvas, filename = null) {
        try {
            // Generate filename if not provided
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                filename = `thomas-attractor-${timestamp}.png`;
            }

            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });

            // Download the image
            this.downloadBlob(blob, filename);
            
            console.log(`📷 Image exported: ${filename}`);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ Image export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Export data as JSON
     */
    async exportJSON(data, filename = null) {
        try {
            // Generate filename if not provided
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                filename = `thomas-data-${timestamp}.json`;
            }

            // Convert to JSON string
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Download the file
            this.downloadBlob(blob, filename);
            
            console.log(`📄 JSON exported: ${filename}`);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ JSON export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Export data as CSV
     */
    async exportCSV(data, filename = null) {
        try {
            // Generate filename if not provided
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                filename = `thomas-data-${timestamp}.csv`;
            }

            let csvContent = '';
            
            // Handle array of points
            if (Array.isArray(data) && data.length > 0) {
                if (Array.isArray(data[0])) {
                    // Array of coordinates
                    csvContent = 'x,y,z\n';
                    data.forEach(point => {
                        csvContent += `${point[0]},${point[1]},${point[2]}\n`;
                    });
                } else if (typeof data[0] === 'object') {
                    // Array of objects
                    const headers = Object.keys(data[0]).join(',');
                    csvContent = headers + '\n';
                    
                    data.forEach(row => {
                        const values = Object.values(row).join(',');
                        csvContent += values + '\n';
                    });
                }
            }

            const blob = new Blob([csvContent], { type: 'text/csv' });
            this.downloadBlob(blob, filename);
            
            console.log(`📊 CSV exported: ${filename}`);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ CSV export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create shareable URL with encoded state
     */
    createShareableURL(state) {
        try {
            // Encode state as base64
            const encoded = btoa(JSON.stringify(state));
            const url = `${this.baseUrl}?state=${encoded}`;
            
            return url;

        } catch (error) {
            console.error('❌ URL creation failed:', error);
            return this.baseUrl;
        }
    }

    /**
     * Import state from URL parameters
     */
    importFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const stateParam = urlParams.get('state');
            
            if (stateParam) {
                const decoded = atob(stateParam);
                const state = JSON.parse(decoded);
                return state;
            }
            
            return null;

        } catch (error) {
            console.warn('⚠️ URL import failed:', error);
            return null;
        }
    }

    /**
     * Export trajectory as PLY format (3D point cloud)
     */
    async exportPLY(points, filename = null) {
        try {
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                filename = `thomas-attractor-${timestamp}.ply`;
            }

            // PLY header
            let plyContent = `ply
format ascii 1.0
element vertex ${points.length}
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
`;

            // Add points with colors
            points.forEach((point, index) => {
                const intensity = (index / points.length) * 255;
                const red = Math.floor(intensity * 0.5 + 64);
                const green = Math.floor(intensity * 0.7 + 128);
                const blue = Math.floor(255);
                
                plyContent += `${point[0]} ${point[1]} ${point[2]} ${red} ${green} ${blue}\n`;
            });

            const blob = new Blob([plyContent], { type: 'text/plain' });
            this.downloadBlob(blob, filename);
            
            console.log(`🎯 PLY exported: ${filename}`);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ PLY export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Helper: Download blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Get supported export formats
     */
    getSupportedFormats() {
        return [
            { type: 'image', extensions: ['png'], description: 'PNG Image' },
            { type: 'data', extensions: ['json'], description: 'JSON Data' },
            { type: 'csv', extensions: ['csv'], description: 'CSV Spreadsheet' },
            { type: 'ply', extensions: ['ply'], description: 'PLY Point Cloud' },
            { type: 'url', extensions: [], description: 'Shareable URL' }
        ];
    }
}