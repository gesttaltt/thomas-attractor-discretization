/**
 * CTM Real-time Display Module
 * Visualizes chaos metrics in real-time
 */

export class CTMDisplay {
    constructor(container) {
        this.container = container;
        this.initialized = false;
        
        // Display elements
        this.elements = {};
        
        // Data history
        this.history = [];
        this.maxHistory = 500;
        
        // Chart configurations
        this.charts = {
            ctm: null,
            lyapunov: null,
            dimension: null
        };
        
        // Animation
        this.isAnimating = false;
        this.animationFrame = null;
        
        this.init();
    }
    
    /**
     * Initialize display components
     */
    init() {
        this.createHTML();
        this.initCharts();
        this.initialized = true;
    }
    
    /**
     * Create HTML structure
     */
    createHTML() {
        this.container.innerHTML = `
            <div class="ctm-display">
                <div class="ctm-header">
                    <h3>Chaos Meter (CTM)</h3>
                    <div class="ctm-status">
                        <span class="status-indicator" id="ctm-convergence"></span>
                        <span class="status-text">Calculating...</span>
                    </div>
                </div>
                
                <div class="ctm-main">
                    <!-- CTM Gauge -->
                    <div class="ctm-gauge-container">
                        <canvas id="ctm-gauge" width="200" height="200"></canvas>
                        <div class="ctm-value">
                            <span id="ctm-current">0.000</span>
                            <span class="ctm-label">CTM</span>
                        </div>
                    </div>
                    
                    <!-- Metrics Display -->
                    <div class="ctm-metrics">
                        <div class="metric-item">
                            <span class="metric-label">λ₁:</span>
                            <span class="metric-value" id="lambda1">0.000</span>
                            <span class="metric-ci" id="lambda1-ci"></span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">λ₂:</span>
                            <span class="metric-value" id="lambda2">0.000</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">λ₃:</span>
                            <span class="metric-value" id="lambda3">0.000</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">D<sub>KY</sub>:</span>
                            <span class="metric-value" id="d-ky">0.000</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">C<sub>λ</sub>:</span>
                            <span class="metric-value" id="c-lambda">0.000</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">C<sub>D</sub>:</span>
                            <span class="metric-value" id="c-d">0.000</span>
                        </div>
                    </div>
                </div>
                
                <!-- Time Series Charts -->
                <div class="ctm-charts">
                    <div class="chart-container">
                        <canvas id="ctm-timeseries" width="400" height="150"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="lyapunov-spectrum" width="400" height="150"></canvas>
                    </div>
                </div>
                
                <!-- Regime Indicator -->
                <div class="ctm-regime">
                    <span class="regime-label">Regime:</span>
                    <span class="regime-type" id="regime-type">Unknown</span>
                    <div class="regime-bar" id="regime-bar"></div>
                </div>
                
                <!-- Validation -->
                <div class="ctm-validation">
                    <div class="validation-item">
                        <span class="validation-label">Sum Identity:</span>
                        <span class="validation-value" id="sum-check">✓</span>
                    </div>
                    <div class="validation-item">
                        <span class="validation-label">Convergence:</span>
                        <span class="validation-value" id="convergence-status">--</span>
                    </div>
                </div>
            </div>
        `;
        
        // Cache element references
        this.elements = {
            ctmValue: document.getElementById('ctm-current'),
            lambda1: document.getElementById('lambda1'),
            lambda2: document.getElementById('lambda2'),
            lambda3: document.getElementById('lambda3'),
            dKy: document.getElementById('d-ky'),
            cLambda: document.getElementById('c-lambda'),
            cD: document.getElementById('c-d'),
            regimeType: document.getElementById('regime-type'),
            regimeBar: document.getElementById('regime-bar'),
            sumCheck: document.getElementById('sum-check'),
            convergenceStatus: document.getElementById('convergence-status'),
            convergenceIndicator: document.getElementById('ctm-convergence'),
            lambda1CI: document.getElementById('lambda1-ci')
        };
    }
    
    /**
     * Initialize charts
     */
    initCharts() {
        // CTM Gauge
        this.initGauge();
        
        // Time series chart
        this.initTimeSeries();
        
        // Lyapunov spectrum bar chart
        this.initSpectrumChart();
    }
    
    /**
     * Initialize CTM gauge
     */
    initGauge() {
        const canvas = document.getElementById('ctm-gauge');
        const ctx = canvas.getContext('2d');
        
        this.gaugeCtx = ctx;
        this.gaugeRadius = 80;
        this.gaugeCenterX = 100;
        this.gaugeCenterY = 100;
        
        this.drawGauge(0);
    }
    
    /**
     * Draw CTM gauge
     */
    drawGauge(value) {
        const ctx = this.gaugeCtx;
        const centerX = this.gaugeCenterX;
        const centerY = this.gaugeCenterY;
        const radius = this.gaugeRadius;
        
        // Clear canvas
        ctx.clearRect(0, 0, 200, 200);
        
        // Background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25);
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.2)';
        ctx.lineWidth = 15;
        ctx.stroke();
        
        // Value arc
        const angle = Math.PI * 0.75 + (Math.PI * 1.5 * value);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI * 0.75, angle);
        ctx.strokeStyle = this.getColorForCTM(value);
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Tick marks
        for (let i = 0; i <= 10; i++) {
            const tickAngle = Math.PI * 0.75 + (Math.PI * 1.5 * i / 10);
            const innerRadius = radius - 20;
            const outerRadius = radius - 25;
            
            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(tickAngle) * innerRadius,
                centerY + Math.sin(tickAngle) * innerRadius
            );
            ctx.lineTo(
                centerX + Math.cos(tickAngle) * outerRadius,
                centerY + Math.sin(tickAngle) * outerRadius
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('0', centerX - 60, centerY + 20);
        ctx.fillText('0.5', centerX, centerY - 70);
        ctx.fillText('1', centerX + 60, centerY + 20);
    }
    
    /**
     * Initialize time series chart
     */
    initTimeSeries() {
        const canvas = document.getElementById('ctm-timeseries');
        this.timeSeriesCtx = canvas.getContext('2d');
        this.timeSeriesData = [];
    }
    
    /**
     * Initialize Lyapunov spectrum chart
     */
    initSpectrumChart() {
        const canvas = document.getElementById('lyapunov-spectrum');
        this.spectrumCtx = canvas.getContext('2d');
    }
    
    /**
     * Update display with new CTM data
     */
    update(ctmData) {
        // Add to history
        this.addToHistory(ctmData);
        
        // Update numeric displays
        this.updateNumericDisplays(ctmData);
        
        // Update gauge
        this.drawGauge(ctmData.CTM || 0);
        
        // Update charts
        this.updateCharts();
        
        // Update regime indicator
        this.updateRegime(ctmData.regime);
        
        // Update validation indicators
        this.updateValidation(ctmData.validation);
    }
    
    /**
     * Update numeric displays
     */
    updateNumericDisplays(data) {
        // CTM value
        this.elements.ctmValue.textContent = (data.CTM || 0).toFixed(4);
        
        // Lyapunov exponents
        if (data.lyapunov) {
            this.elements.lambda1.textContent = data.lyapunov.lambda1.toFixed(4);
            this.elements.lambda2.textContent = data.lyapunov.lambda2.toFixed(4);
            this.elements.lambda3.textContent = data.lyapunov.lambda3.toFixed(4);
        }
        
        // Confidence intervals
        if (data.confidence && data.confidence.lambda1) {
            const ci = data.confidence.lambda1;
            this.elements.lambda1CI.textContent = `[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`;
        }
        
        // Kaplan-Yorke dimension
        if (data.kaplanYorke) {
            this.elements.dKy.textContent = data.kaplanYorke.toFixed(4);
        }
        
        // CTM components
        if (data.components) {
            this.elements.cLambda.textContent = data.components.C_lambda.toFixed(4);
            this.elements.cD.textContent = data.components.C_D.toFixed(4);
        }
    }
    
    /**
     * Update time series chart
     */
    updateCharts() {
        this.drawTimeSeries();
        this.drawSpectrumChart();
    }
    
    /**
     * Draw time series
     */
    drawTimeSeries() {
        const ctx = this.timeSeriesCtx;
        const width = 400;
        const height = 150;
        
        ctx.clearRect(0, 0, width, height);
        
        if (this.history.length < 2) return;
        
        // Grid
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // CTM line
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const step = width / Math.min(this.history.length - 1, this.maxHistory);
        
        this.history.forEach((data, i) => {
            const x = i * step;
            const y = height - (data.CTM * height);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px monospace';
        ctx.fillText('CTM Time Series', 10, 15);
        ctx.fillText('1.0', 5, 15);
        ctx.fillText('0.0', 5, height - 5);
    }
    
    /**
     * Draw Lyapunov spectrum
     */
    drawSpectrumChart() {
        const ctx = this.spectrumCtx;
        const width = 400;
        const height = 150;
        
        ctx.clearRect(0, 0, width, height);
        
        if (this.history.length === 0) return;
        
        const latest = this.history[this.history.length - 1];
        if (!latest.lyapunov) return;
        
        const exponents = [
            latest.lyapunov.lambda1,
            latest.lyapunov.lambda2,
            latest.lyapunov.lambda3
        ];
        
        // Find range
        const maxExp = Math.max(...exponents, 0.2);
        const minExp = Math.min(...exponents, -0.8);
        const range = maxExp - minExp;
        
        // Draw bars
        const barWidth = width / 4;
        const barSpacing = barWidth / 4;
        
        exponents.forEach((exp, i) => {
            const x = barSpacing + i * (barWidth + barSpacing);
            const barHeight = Math.abs(exp / range) * height * 0.8;
            const y = exp > 0 ? 
                height / 2 - barHeight :
                height / 2;
            
            // Bar color
            ctx.fillStyle = exp > 0 ? '#ff6b6b' : '#4ecdc4';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Value label
            ctx.fillStyle = 'white';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(exp.toFixed(3), x + barWidth / 2, height - 10);
            ctx.fillText(`λ${i + 1}`, x + barWidth / 2, height - 25);
        });
        
        // Zero line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        // Title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText('Lyapunov Spectrum', 10, 15);
    }
    
    /**
     * Update regime indicator
     */
    updateRegime(regime) {
        if (!regime) return;
        
        this.elements.regimeType.textContent = regime.description || regime.type;
        this.elements.regimeBar.style.background = regime.color || '#888';
        
        // Animate regime bar
        const percentage = this.getRegimePercentage(regime.type);
        this.elements.regimeBar.style.width = `${percentage}%`;
    }
    
    /**
     * Get regime percentage for bar display
     */
    getRegimePercentage(type) {
        const percentages = {
            'regular': 10,
            'weak_chaos': 30,
            'moderate_chaos': 50,
            'strong_chaos': 75,
            'hyperchaos': 100
        };
        return percentages[type] || 0;
    }
    
    /**
     * Update validation indicators
     */
    updateValidation(validation) {
        if (!validation) return;
        
        // Sum identity check
        if (validation.sumIdentity) {
            const isValid = validation.sumIdentity.isValid;
            this.elements.sumCheck.textContent = isValid ? '✓' : '✗';
            this.elements.sumCheck.style.color = isValid ? '#4ecdc4' : '#ff6b6b';
            this.elements.sumCheck.title = `Error: ${validation.sumIdentity.error.toFixed(4)}`;
        }
    }
    
    /**
     * Update convergence status
     */
    updateConvergence(status) {
        if (!status) return;
        
        const converged = status.isConverged;
        this.elements.convergenceStatus.textContent = converged ? 'Converged' : 'Computing...';
        this.elements.convergenceIndicator.className = converged ? 
            'status-indicator converged' : 'status-indicator computing';
        
        if (status.iterations) {
            this.elements.convergenceStatus.title = `Iterations: ${status.iterations}`;
        }
    }
    
    /**
     * Add data to history
     */
    addToHistory(data) {
        this.history.push(data);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    /**
     * Get color for CTM value
     */
    getColorForCTM(value) {
        if (value < 0.05) return '#00ff00';  // Green - regular
        if (value < 0.15) return '#ffff00';  // Yellow - moderate
        if (value < 0.25) return '#ff9000';  // Orange - strong
        return '#ff0000';  // Red - hyperchaos
    }
    
    /**
     * Clear display
     */
    clear() {
        this.history = [];
        this.updateCharts();
        this.drawGauge(0);
    }
    
    /**
     * Export current data
     */
    exportData() {
        return {
            history: this.history,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Add CSS styles for CTM display
 */
export function injectCTMStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .ctm-display {
            background: rgba(20, 20, 40, 0.9);
            border: 1px solid rgba(100, 100, 255, 0.3);
            border-radius: 10px;
            padding: 20px;
            color: white;
            font-family: 'Segoe UI', monospace;
        }
        
        .ctm-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .ctm-header h3 {
            color: #88aaff;
            margin: 0;
        }
        
        .ctm-status {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ff9000;
            animation: pulse 2s infinite;
        }
        
        .status-indicator.converged {
            background: #4ecdc4;
            animation: none;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .ctm-main {
            display: flex;
            gap: 30px;
            margin-bottom: 20px;
        }
        
        .ctm-gauge-container {
            position: relative;
        }
        
        .ctm-value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
        
        .ctm-value #ctm-current {
            font-size: 28px;
            font-weight: bold;
            color: #88aaff;
            display: block;
        }
        
        .ctm-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
        }
        
        .ctm-metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .metric-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .metric-label {
            color: #88aaff;
            min-width: 40px;
        }
        
        .metric-value {
            font-family: 'Courier New', monospace;
            font-weight: bold;
        }
        
        .metric-ci {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
        }
        
        .ctm-charts {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .chart-container {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            padding: 10px;
        }
        
        .ctm-regime {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .regime-label {
            color: #88aaff;
        }
        
        .regime-type {
            flex: 1;
        }
        
        .regime-bar {
            height: 10px;
            background: #888;
            border-radius: 5px;
            transition: width 0.5s, background 0.5s;
            flex: 2;
        }
        
        .ctm-validation {
            display: flex;
            gap: 30px;
            padding-top: 15px;
            border-top: 1px solid rgba(100, 100, 255, 0.2);
        }
        
        .validation-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .validation-label {
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
        }
        
        .validation-value {
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}