/**
 * UI Controls Module
 * Manages user interface interactions and control bindings
 */

export class UIController {
    constructor() {
        this.elements = {};
        this.callbacks = {};
        this.initialized = false;
    }

    /**
     * Initialize UI elements
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initialized = true;
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Controls
        this.elements.bSlider = document.getElementById('bSlider');
        this.elements.opacitySlider = document.getElementById('opacitySlider');
        this.elements.planeSelector = document.getElementById('planeSelector');
        this.elements.floralToggle = document.getElementById('floralToggle');
        this.elements.trailsToggle = document.getElementById('trailsToggle');
        this.elements.presetDropdown = document.getElementById('presetDropdown');
        
        // Buttons
        this.elements.resetView = document.getElementById('resetView');
        this.elements.exportPNG = document.getElementById('exportPNG');
        this.elements.exportJSON = document.getElementById('exportJSON');
        this.elements.pauseBtn = document.getElementById('pauseBtn');
        
        // HUD elements
        this.elements.bValue = document.getElementById('bValue');
        this.elements.eFlowerValue = document.getElementById('eFlowerValue');
        this.elements.lambdaValue = document.getElementById('lambdaValue');
        this.elements.fiValue = document.getElementById('fiValue');
        this.elements.pointsValue = document.getElementById('pointsValue');
        this.elements.fpsValue = document.getElementById('fpsValue');
        
        // Panels
        this.elements.floralPanel = document.getElementById('floralPanel');
        this.elements.projectionPlane = document.getElementById('projectionPlane');
        this.elements.loadingIndicator = document.getElementById('loadingIndicator');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // B parameter slider
        if (this.elements.bSlider) {
            this.elements.bSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.triggerCallback('bChange', value);
                this.updateDisplay('b', value);
            });
        }

        // Opacity slider
        if (this.elements.opacitySlider) {
            this.elements.opacitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.triggerCallback('opacityChange', value);
            });
        }

        // Plane selector
        if (this.elements.planeSelector) {
            this.elements.planeSelector.addEventListener('change', (e) => {
                const plane = e.target.value;
                this.triggerCallback('planeChange', plane);
                this.updateDisplay('plane', plane);
            });
        }

        // Floral toggle
        if (this.elements.floralToggle) {
            this.elements.floralToggle.addEventListener('change', (e) => {
                const show = e.target.checked;
                this.triggerCallback('floralToggle', show);
                this.showFloralPanel(show);
            });
        }

        // Trails toggle
        if (this.elements.trailsToggle) {
            this.elements.trailsToggle.addEventListener('change', (e) => {
                const show = e.target.checked;
                this.triggerCallback('trailsToggle', show);
            });
        }

        // Preset dropdown
        if (this.elements.presetDropdown) {
            this.elements.presetDropdown.addEventListener('change', (e) => {
                const presetId = e.target.value;
                this.triggerCallback('presetChange', presetId);
            });
        }

        // Reset view button
        if (this.elements.resetView) {
            this.elements.resetView.addEventListener('click', () => {
                this.triggerCallback('resetView');
            });
        }

        // Export buttons
        if (this.elements.exportPNG) {
            this.elements.exportPNG.addEventListener('click', () => {
                this.triggerCallback('exportPNG');
            });
        }

        if (this.elements.exportJSON) {
            this.elements.exportJSON.addEventListener('click', () => {
                this.triggerCallback('exportJSON');
            });
        }

        // Pause button
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.addEventListener('click', () => {
                this.triggerCallback('pauseToggle');
            });
        }

        // Keyboard shortcuts
        this.bindKeyboardShortcuts();
    }

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.triggerCallback('pauseToggle');
                    break;
                case 'f':
                case 'F':
                    this.elements.floralToggle.checked = !this.elements.floralToggle.checked;
                    this.triggerCallback('floralToggle', this.elements.floralToggle.checked);
                    this.showFloralPanel(this.elements.floralToggle.checked);
                    break;
                case 'r':
                case 'R':
                    this.triggerCallback('resetView');
                    break;
                case 't':
                case 'T':
                    this.elements.trailsToggle.checked = !this.elements.trailsToggle.checked;
                    this.triggerCallback('trailsToggle', this.elements.trailsToggle.checked);
                    break;
                case 'ArrowLeft':
                    this.adjustB(-0.001);
                    break;
                case 'ArrowRight':
                    this.adjustB(0.001);
                    break;
            }
        });
    }

    /**
     * Register callback for an event
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * Trigger callbacks for an event
     */
    triggerCallback(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    /**
     * Update HUD displays
     */
    updateHUD(metrics, pointCount, fps) {
        if (this.elements.eFlowerValue) {
            this.elements.eFlowerValue.textContent = metrics.E_flower.toFixed(3);
        }
        if (this.elements.lambdaValue) {
            this.elements.lambdaValue.textContent = metrics.lambda.toFixed(3);
        }
        if (this.elements.fiValue) {
            this.elements.fiValue.textContent = metrics.FI.toFixed(4);
        }
        if (this.elements.pointsValue) {
            this.elements.pointsValue.textContent = pointCount.toLocaleString();
        }
        if (this.elements.fpsValue) {
            this.elements.fpsValue.textContent = fps.toFixed(0);
        }
    }

    /**
     * Update display elements
     */
    updateDisplay(type, value) {
        switch(type) {
            case 'b':
                if (this.elements.bValue) {
                    this.elements.bValue.textContent = value.toFixed(3);
                }
                break;
            case 'plane':
                if (this.elements.projectionPlane) {
                    this.elements.projectionPlane.textContent = value.toUpperCase();
                }
                break;
        }
    }

    /**
     * Show/hide floral panel
     */
    showFloralPanel(show) {
        if (this.elements.floralPanel) {
            this.elements.floralPanel.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Update preset dropdown
     */
    updatePresetDropdown(options) {
        if (!this.elements.presetDropdown) return;
        
        this.elements.presetDropdown.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.description;
            this.elements.presetDropdown.appendChild(optionElement);
        });
    }

    /**
     * Set control values
     */
    setControlValues(values) {
        if (values.b !== undefined && this.elements.bSlider) {
            this.elements.bSlider.value = values.b;
            this.updateDisplay('b', values.b);
        }
        if (values.opacity !== undefined && this.elements.opacitySlider) {
            this.elements.opacitySlider.value = values.opacity;
        }
        if (values.plane !== undefined && this.elements.planeSelector) {
            this.elements.planeSelector.value = values.plane;
            this.updateDisplay('plane', values.plane);
        }
        if (values.showFloral !== undefined && this.elements.floralToggle) {
            this.elements.floralToggle.checked = values.showFloral;
            this.showFloralPanel(values.showFloral);
        }
        if (values.showTrails !== undefined && this.elements.trailsToggle) {
            this.elements.trailsToggle.checked = values.showTrails;
        }
    }

    /**
     * Adjust b parameter
     */
    adjustB(delta) {
        if (this.elements.bSlider) {
            const currentValue = parseFloat(this.elements.bSlider.value);
            const newValue = Math.max(0.15, Math.min(0.25, currentValue + delta));
            this.elements.bSlider.value = newValue;
            this.triggerCallback('bChange', newValue);
            this.updateDisplay('b', newValue);
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(show = true) {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Set pause button state
     */
    setPauseButtonState(isPaused) {
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 50%;
            transform: translateX(50%);
            background: rgba(40, 40, 60, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            border: 1px solid rgba(100, 100, 255, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }
}