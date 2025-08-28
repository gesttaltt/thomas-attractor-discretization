/**
 * Control Panel - Simplified UI controls
 * Direct DOM manipulation without event bus
 */

export class ControlPanel {
    constructor(container, config = {}) {
        this.container = container;
        this.callbacks = {
            onParameterChange: config.onParameterChange || (() => {}),
            onPresetSelect: config.onPresetSelect || (() => {}),
            onExport: config.onExport || (() => {}),
            onPlayPause: config.onPlayPause || (() => {}),
            onVolumetricChange: config.onVolumetricChange || (() => {})
        };
        
        this.elements = {};
        this.isPlaying = true;
        
        this.createUI();
    }

    createUI() {
        // Skip if no container provided
        if (!this.container) {
            console.warn('ControlPanel: No container provided, skipping UI creation');
            return;
        }
        
        this.container.innerHTML = `
            <div class="control-panel">
                <!-- Simulation Controls -->
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">⚙️ Simulation</span>
                    </div>
                    <div class="panel-content">
                        <div class="control-group">
                            <label for="param-b">Parameter b: <span id="b-value">0.19</span></label>
                            <input type="range" id="param-b" min="0.1" max="0.3" step="0.001" value="0.19">
                        </div>
                        <div class="control-group">
                            <label for="param-dt">Time Step: <span id="dt-value">0.005</span></label>
                            <input type="range" id="param-dt" min="0.001" max="0.01" step="0.0001" value="0.005">
                        </div>
                        <div class="button-group">
                            <button id="play-pause-btn" class="btn">⏸️ Pause</button>
                            <button id="reset-btn" class="btn">🔄 Reset</button>
                        </div>
                    </div>
                </div>

                <!-- Visualization Controls -->
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">🎨 Visualization</span>
                    </div>
                    <div class="panel-content">
                        <div class="control-group">
                            <label for="particle-size">Particle Size: <span id="size-value">0.012</span></label>
                            <input type="range" id="particle-size" min="0.005" max="0.05" step="0.001" value="0.012">
                        </div>
                        <div class="control-group">
                            <label for="projection-plane">Projection Plane:</label>
                            <select id="projection-plane">
                                <option value="xy">XY Plane</option>
                                <option value="yz">YZ Plane</option>
                                <option value="zx">ZX Plane</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label>
                                <input type="checkbox" id="auto-rotate" checked> Auto Rotate
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Volumetric Effects -->
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">✨ Volumetric Effects</span>
                    </div>
                    <div class="panel-content">
                        <div class="control-group">
                            <label>
                                <input type="checkbox" id="enable-volumetric"> Enable Volumetric Effects
                            </label>
                        </div>
                        <div class="volumetric-controls">
                            <div class="control-group">
                                <label title="Shows probability density of trajectory visits in phase space">
                                    <input type="checkbox" id="density-clouds"> Density Field
                                </label>
                            </div>
                            <div class="control-group">
                                <label title="Displays velocity vectors and magnitude throughout the field">
                                    <input type="checkbox" id="velocity-glow"> Velocity Vectors
                                </label>
                            </div>
                            <div class="control-group">
                                <label title="Shows divergence (expansion/contraction) of the flow">
                                    <input type="checkbox" id="energy-field"> Divergence Field
                                </label>
                            </div>
                            <div class="control-group">
                                <label title="Visualizes vorticity (rotation/curl) of the vector field">
                                    <input type="checkbox" id="vorticity-ribbons"> Vorticity Field
                                </label>
                            </div>
                            <div class="control-group">
                                <label title="Poincaré sections showing periodic behavior">
                                    <input type="checkbox" id="phase-flow"> Poincaré Sections
                                </label>
                            </div>
                        </div>
                        <div class="opacity-controls">
                            <div class="control-group">
                                <label for="clouds-opacity">Density Threshold: <span id="clouds-opacity-value">0.01</span></label>
                                <input type="range" id="clouds-opacity" min="0.001" max="0.1" step="0.001" value="0.01">
                            </div>
                            <div class="control-group">
                                <label for="glow-opacity">Velocity Scale: <span id="glow-opacity-value">1.0</span></label>
                                <input type="range" id="glow-opacity" min="0.1" max="3" step="0.1" value="1.0">
                            </div>
                            <div class="control-group">
                                <label for="energy-opacity">Field Opacity: <span id="energy-opacity-value">0.20</span></label>
                                <input type="range" id="energy-opacity" min="0" max="1" step="0.01" value="0.20">
                            </div>
                        </div>
                        <div class="research-controls">
                            <div class="control-group">
                                <label for="kde-bandwidth">KDE Bandwidth: <span id="kde-bandwidth-value">0.20</span></label>
                                <input type="range" id="kde-bandwidth" min="0.05" max="1.0" step="0.05" value="0.20">
                            </div>
                            <div class="control-group">
                                <label for="grid-resolution">Grid Resolution: <span id="grid-resolution-value">128</span></label>
                                <input type="range" id="grid-resolution" min="64" max="256" step="32" value="128">
                            </div>
                            <div class="control-group">
                                <label for="isosurface-count">Isosurface Levels: <span id="isosurface-count-value">4</span></label>
                                <input type="range" id="isosurface-count" min="2" max="8" step="1" value="4">
                            </div>
                            <div class="control-group">
                                <label for="streamline-count">Streamlines: <span id="streamline-count-value">30</span></label>
                                <input type="range" id="streamline-count" min="10" max="100" step="5" value="30">
                            </div>
                            <div class="control-group">
                                <label for="lyapunov-iterations">Lyapunov Steps: <span id="lyapunov-iterations-value">500</span></label>
                                <input type="range" id="lyapunov-iterations" min="100" max="2000" step="100" value="500">
                            </div>
                        </div>
                        <div class="color-controls">
                            <div class="control-group">
                                <label for="particle-color">Particle Color:</label>
                                <input type="color" id="particle-color" value="#64b5f6">
                            </div>
                            <div class="control-group">
                                <label for="clouds-color">Clouds Color:</label>
                                <input type="color" id="clouds-color" value="#0066aa">
                            </div>
                            <div class="control-group">
                                <label for="energy-color">Energy Color:</label>
                                <input type="color" id="energy-color" value="#4488ff">
                            </div>
                            <div class="control-group">
                                <label for="glow-color">Glow Color:</label>
                                <input type="color" id="glow-color" value="#88ccff">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Presets -->
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">📋 Presets</span>
                    </div>
                    <div class="panel-content">
                        <select id="preset-select" class="full-width">
                            <option value="">Select a preset...</option>
                        </select>
                    </div>
                </div>

                <!-- Metrics Display -->
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">📊 Chaos Metrics</span>
                    </div>
                    <div class="panel-content">
                        <div class="metric">
                            <span>Lyapunov:</span>
                            <span id="lyapunov-value">--</span>
                        </div>
                        <div class="metric">
                            <span>CTM:</span>
                            <span id="ctm-value">--</span>
                        </div>
                        <div class="metric">
                            <span>Dimension:</span>
                            <span id="dimension-value">--</span>
                        </div>
                    </div>
                </div>

                <!-- Export Options -->
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">💾 Export</span>
                    </div>
                    <div class="panel-content">
                        <div class="button-group-vertical">
                            <button id="export-image-btn" class="btn">📷 Export Image</button>
                            <button id="export-data-btn" class="btn">📄 Export Data</button>
                            <button id="share-url-btn" class="btn">🔗 Share URL</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.addStyles();
        
        // Cache element references FIRST
        this.cacheElements();
        
        // Setup event listeners AFTER caching
        this.setupEventListeners();
    }

    addStyles() {
        if (document.getElementById('control-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'control-panel-styles';
        style.textContent = `
            .control-panel {
                display: flex;
                flex-direction: column;
                gap: 15px;
                font-size: 14px;
            }
            
            .panel {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(100, 181, 246, 0.2);
                overflow: hidden;
            }
            
            .panel-header {
                padding: 10px 15px;
                background: rgba(100, 181, 246, 0.1);
                border-bottom: 1px solid rgba(100, 181, 246, 0.2);
                cursor: pointer;
            }
            
            .panel-title {
                color: #64b5f6;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .panel-content {
                padding: 15px;
            }
            
            .control-group {
                margin-bottom: 12px;
            }
            
            .control-group label {
                display: block;
                margin-bottom: 5px;
                color: #ccc;
            }
            
            .control-group input[type="range"] {
                width: 100%;
                margin: 5px 0;
            }
            
            .control-group select {
                width: 100%;
                padding: 5px;
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                border: 1px solid rgba(100, 181, 246, 0.3);
                border-radius: 4px;
            }
            
            .button-group {
                display: flex;
                gap: 10px;
            }
            
            .button-group-vertical {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .btn {
                padding: 8px 12px;
                background: rgba(100, 181, 246, 0.2);
                color: #64b5f6;
                border: 1px solid rgba(100, 181, 246, 0.4);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
            }
            
            .btn:hover {
                background: rgba(100, 181, 246, 0.3);
                border-color: rgba(100, 181, 246, 0.6);
            }
            
            .metric {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                color: #ccc;
            }
            
            .metric span:last-child {
                color: #64b5f6;
                font-family: monospace;
            }
            
            .full-width {
                width: 100%;
            }
            
            .volumetric-controls {
                margin: 10px 0;
                padding: 10px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                border: 1px solid rgba(100, 181, 246, 0.1);
            }
            
            .volumetric-controls .control-group {
                margin-bottom: 8px;
            }
            
            .opacity-controls {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(100, 181, 246, 0.2);
            }
            
            .color-controls {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(100, 181, 246, 0.2);
            }
            
            .color-controls input[type="color"] {
                width: 50px;
                height: 30px;
                border: 1px solid rgba(100, 181, 246, 0.3);
                border-radius: 4px;
                cursor: pointer;
                background: rgba(0, 0, 0, 0.3);
            }
            
            .research-controls {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(100, 181, 246, 0.2);
                background: rgba(0, 50, 100, 0.1);
                border-radius: 4px;
                padding: 10px;
            }
            
            .research-controls .control-group {
                margin-bottom: 8px;
            }
            
            .research-controls label {
                color: #88ccff;
                font-size: 12px;
                font-style: italic;
            }
        `;
        
        document.head.appendChild(style);
    }

    cacheElements() {
        this.elements = {
            paramB: document.getElementById('param-b'),
            paramDt: document.getElementById('param-dt'),
            particleSize: document.getElementById('particle-size'),
            projectionPlane: document.getElementById('projection-plane'),
            autoRotate: document.getElementById('auto-rotate'),
            presetSelect: document.getElementById('preset-select'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            resetBtn: document.getElementById('reset-btn'),
            exportImageBtn: document.getElementById('export-image-btn'),
            exportDataBtn: document.getElementById('export-data-btn'),
            shareUrlBtn: document.getElementById('share-url-btn'),
            
            // Volumetric controls
            enableVolumetric: document.getElementById('enable-volumetric'),
            densityClouds: document.getElementById('density-clouds'),
            velocityGlow: document.getElementById('velocity-glow'),
            energyField: document.getElementById('energy-field'),
            vorticityRibbons: document.getElementById('vorticity-ribbons'),
            phaseFlow: document.getElementById('phase-flow'),
            cloudsOpacity: document.getElementById('clouds-opacity'),
            glowOpacity: document.getElementById('glow-opacity'),
            energyOpacity: document.getElementById('energy-opacity'),
            
            // Color pickers
            particleColor: document.getElementById('particle-color'),
            cloudsColor: document.getElementById('clouds-color'),
            energyColor: document.getElementById('energy-color'),
            glowColor: document.getElementById('glow-color'),
            
            // Research controls
            kdeBandwidth: document.getElementById('kde-bandwidth'),
            gridResolution: document.getElementById('grid-resolution'),
            isosurfaceCount: document.getElementById('isosurface-count'),
            streamlineCount: document.getElementById('streamline-count'),
            lyapunovIterations: document.getElementById('lyapunov-iterations'),
            
            // Value displays
            bValue: document.getElementById('b-value'),
            dtValue: document.getElementById('dt-value'),
            sizeValue: document.getElementById('size-value'),
            cloudsOpacityValue: document.getElementById('clouds-opacity-value'),
            glowOpacityValue: document.getElementById('glow-opacity-value'),
            energyOpacityValue: document.getElementById('energy-opacity-value'),
            kdeBandwidthValue: document.getElementById('kde-bandwidth-value'),
            gridResolutionValue: document.getElementById('grid-resolution-value'),
            isosurfaceCountValue: document.getElementById('isosurface-count-value'),
            streamlineCountValue: document.getElementById('streamline-count-value'),
            lyapunovIterationsValue: document.getElementById('lyapunov-iterations-value'),
            lyapunovValue: document.getElementById('lyapunov-value'),
            ctmValue: document.getElementById('ctm-value'),
            dimensionValue: document.getElementById('dimension-value')
        };
    }

    setupEventListeners() {
        // Check if elements were properly cached
        if (!this.elements || !this.elements.paramB) {
            console.error('❌ ControlPanel: Elements not properly cached');
            return;
        }
        
        // Parameter controls
        if (this.elements.paramB) {
            this.elements.paramB.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.bValue.textContent = value.toFixed(3);
                this.callbacks.onParameterChange({ b: value });
            });
        }
        
        if (this.elements.paramDt) {
            this.elements.paramDt.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.dtValue.textContent = value.toFixed(4);
                this.callbacks.onParameterChange({ dt: value });
            });
        }
        
        if (this.elements.particleSize) {
            this.elements.particleSize.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.sizeValue.textContent = value.toFixed(3);
                this.callbacks.onParameterChange({ particleSize: value });
            });
        }
        
        if (this.elements.projectionPlane) {
            this.elements.projectionPlane.addEventListener('change', (e) => {
                this.callbacks.onParameterChange({ projectionPlane: e.target.value });
            });
        }
        
        if (this.elements.autoRotate) {
            this.elements.autoRotate.addEventListener('change', (e) => {
                this.callbacks.onParameterChange({ autoRotate: e.target.checked });
            });
        }
        
        // Preset selection
        if (this.elements.presetSelect) {
            this.elements.presetSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.callbacks.onPresetSelect(e.target.value);
                }
            });
        }
        
        // Control buttons
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.addEventListener('click', () => {
                this.isPlaying = this.callbacks.onPlayPause();
                this.elements.playPauseBtn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Play';
            });
        }
        
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                this.callbacks.onParameterChange({ reset: true });
            });
        }
        
        // Export buttons
        if (this.elements.exportImageBtn) {
            this.elements.exportImageBtn.addEventListener('click', () => {
                this.callbacks.onExport('image');
            });
        }
        
        if (this.elements.exportDataBtn) {
            this.elements.exportDataBtn.addEventListener('click', () => {
                this.callbacks.onExport('data');
            });
        }
        
        if (this.elements.shareUrlBtn) {
            this.elements.shareUrlBtn.addEventListener('click', () => {
                this.callbacks.onExport('url');
            });
        }
        
        // Volumetric effects controls
        if (this.elements.enableVolumetric) {
            this.elements.enableVolumetric.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ enableVolumetric: e.target.checked });
            });
        }
        
        if (this.elements.densityClouds) {
            this.elements.densityClouds.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ densityClouds: e.target.checked });
            });
        }
        
        if (this.elements.velocityGlow) {
            this.elements.velocityGlow.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ velocityGlow: e.target.checked });
            });
        }
        
        if (this.elements.energyField) {
            this.elements.energyField.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ energyField: e.target.checked });
            });
        }
        
        if (this.elements.vorticityRibbons) {
            this.elements.vorticityRibbons.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ vorticityRibbons: e.target.checked });
            });
        }
        
        if (this.elements.phaseFlow) {
            this.elements.phaseFlow.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ phaseFlow: e.target.checked });
            });
        }
        
        // Opacity sliders
        if (this.elements.cloudsOpacity) {
            this.elements.cloudsOpacity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.cloudsOpacityValue.textContent = value.toFixed(2);
                this.callbacks.onVolumetricChange({ cloudsOpacity: value });
            });
        }
        
        if (this.elements.glowOpacity) {
            this.elements.glowOpacity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.glowOpacityValue.textContent = value.toFixed(1);
                this.callbacks.onVolumetricChange({ glowOpacity: value });
            });
        }
        
        if (this.elements.energyOpacity) {
            this.elements.energyOpacity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.energyOpacityValue.textContent = value.toFixed(2);
                this.callbacks.onVolumetricChange({ energyOpacity: value });
            });
        }
        
        // Color pickers
        if (this.elements.particleColor) {
            this.elements.particleColor.addEventListener('change', (e) => {
                this.callbacks.onParameterChange({ particleColor: e.target.value });
            });
        }
        
        if (this.elements.cloudsColor) {
            this.elements.cloudsColor.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ cloudsColor: e.target.value });
            });
        }
        
        if (this.elements.energyColor) {
            this.elements.energyColor.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ energyColor: e.target.value });
            });
        }
        
        if (this.elements.glowColor) {
            this.elements.glowColor.addEventListener('change', (e) => {
                this.callbacks.onVolumetricChange({ glowColor: e.target.value });
            });
        }
        
        // Research controls
        if (this.elements.kdeBandwidth) {
            this.elements.kdeBandwidth.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.kdeBandwidthValue.textContent = value.toFixed(2);
                this.callbacks.onVolumetricChange({ kdeBandwidth: value });
            });
        }
        
        if (this.elements.gridResolution) {
            this.elements.gridResolution.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.elements.gridResolutionValue.textContent = value;
                this.callbacks.onVolumetricChange({ gridResolution: value });
            });
        }
        
        if (this.elements.isosurfaceCount) {
            this.elements.isosurfaceCount.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.elements.isosurfaceCountValue.textContent = value;
                this.callbacks.onVolumetricChange({ isosurfaceCount: value });
            });
        }
        
        if (this.elements.streamlineCount) {
            this.elements.streamlineCount.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.elements.streamlineCountValue.textContent = value;
                this.callbacks.onVolumetricChange({ streamlineCount: value });
            });
        }
        
        if (this.elements.lyapunovIterations) {
            this.elements.lyapunovIterations.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.elements.lyapunovIterationsValue.textContent = value;
                this.callbacks.onVolumetricChange({ lyapunovIterations: value });
            });
        }
    }

    setParameters(params) {
        // Check if elements exist before accessing them
        if (!this.elements || !this.elements.paramB) {
            console.warn('ControlPanel: Elements not initialized, skipping setParameters');
            return;
        }
        
        if (params.b !== undefined && this.elements.paramB) {
            this.elements.paramB.value = params.b;
            if (this.elements.bValue) {
                this.elements.bValue.textContent = params.b.toFixed(3);
            }
        }
        
        if (params.dt !== undefined && this.elements.paramDt) {
            this.elements.paramDt.value = params.dt;
            if (this.elements.dtValue) {
                this.elements.dtValue.textContent = params.dt.toFixed(4);
            }
        }
        
        if (params.presets) {
            this.updatePresetList(params.presets);
        }
    }

    updatePresetList(presets) {
        if (!this.elements || !this.elements.presetSelect) {
            console.warn('ControlPanel: Preset select not available');
            return;
        }
        
        const select = this.elements.presetSelect;
        select.innerHTML = '<option value="">Select a preset...</option>';
        
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            if (preset.fi) {
                option.textContent += ` (FI: ${preset.fi.toFixed(1)})`;
            }
            select.appendChild(option);
        });
    }

    updateMetrics(metrics) {
        if (!this.elements) {
            return;
        }
        
        if (metrics.lyapunov !== undefined && this.elements.lyapunovValue) {
            this.elements.lyapunovValue.textContent = metrics.lyapunov.toFixed(4);
        }
        
        if (metrics.ctm !== undefined && this.elements.ctmValue) {
            this.elements.ctmValue.textContent = metrics.ctm.toFixed(3);
        }
        
        if (metrics.dimension !== undefined && this.elements.dimensionValue) {
            this.elements.dimensionValue.textContent = metrics.dimension.toFixed(2);
        }
    }

    dispose() {
        // Remove event listeners if needed
        this.container.innerHTML = '';
    }
}