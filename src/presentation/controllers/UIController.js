/**
 * Base UI Controller
 * SOLID Principles: Single Responsibility, Open/Closed, Interface Segregation
 * Provides common UI functionality and event handling patterns
 */

export class UIController {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.isInitialized = false;
        this.elements = new Map();
        this.eventListeners = new Map();
        
        // Auto-initialize if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize controller
     * Template method pattern - subclasses override specific steps
     */
    async init() {
        try {
            await this.preInit();
            this.initializeElements();
            this.bindEventListeners();
            this.setupEventBusListeners();
            await this.postInit();
            
            this.isInitialized = true;
            this.emit('controller.initialized', { controller: this.constructor.name });
            
        } catch (error) {
            this.emit('controller.error', { 
                controller: this.constructor.name, 
                error: error.message,
                phase: 'initialization'
            });
            throw error;
        }
    }

    /**
     * Pre-initialization hook
     * Override in subclasses for setup before element binding
     */
    async preInit() {
        // Default: no action
    }

    /**
     * Post-initialization hook  
     * Override in subclasses for setup after all binding complete
     */
    async postInit() {
        // Default: no action
    }

    /**
     * Initialize DOM elements
     * Override in subclasses to define element selectors
     */
    initializeElements() {
        const selectors = this.getElementSelectors();
        
        for (const [key, selector] of Object.entries(selectors)) {
            const element = document.querySelector(selector);
            
            if (element) {
                this.elements.set(key, element);
            } else if (this.isElementRequired(key)) {
                throw new Error(`Required element not found: ${selector} (${key})`);
            }
        }
    }

    /**
     * Bind DOM event listeners
     * Override in subclasses to define specific event bindings
     */
    bindEventListeners() {
        const bindings = this.getEventBindings();
        
        for (const [elementKey, events] of Object.entries(bindings)) {
            const element = this.elements.get(elementKey);
            
            if (element) {
                for (const [eventType, handler] of Object.entries(events)) {
                    const boundHandler = this.createBoundHandler(handler);
                    element.addEventListener(eventType, boundHandler);
                    
                    // Store for cleanup
                    const key = `${elementKey}.${eventType}`;
                    this.eventListeners.set(key, { element, eventType, handler: boundHandler });
                }
            }
        }
    }

    /**
     * Setup event bus listeners
     * Override in subclasses to define event bus subscriptions
     */
    setupEventBusListeners() {
        const subscriptions = this.getEventBusSubscriptions();
        
        for (const [eventName, handler] of Object.entries(subscriptions)) {
            this.eventBus.on(eventName, this.createBoundHandler(handler));
        }
    }

    /**
     * Create bound handler with error handling and logging
     */
    createBoundHandler(handler) {
        return async (event) => {
            try {
                await handler.call(this, event);
            } catch (error) {
                this.emit('controller.error', {
                    controller: this.constructor.name,
                    error: error.message,
                    event: event.type || 'unknown'
                });
                console.error(`Controller ${this.constructor.name} error:`, error);
            }
        };
    }

    /**
     * Get element with validation
     */
    getElement(key) {
        const element = this.elements.get(key);
        if (!element) {
            throw new Error(`Element not found: ${key}`);
        }
        return element;
    }

    /**
     * Check if element exists
     */
    hasElement(key) {
        return this.elements.has(key);
    }

    /**
     * Update element content safely
     */
    updateElement(key, content, method = 'textContent') {
        const element = this.elements.get(key);
        if (element) {
            element[method] = content;
            return true;
        }
        return false;
    }

    /**
     * Show/hide element
     */
    setElementVisibility(key, visible) {
        const element = this.elements.get(key);
        if (element) {
            element.style.display = visible ? '' : 'none';
            return true;
        }
        return false;
    }

    /**
     * Enable/disable element
     */
    setElementEnabled(key, enabled) {
        const element = this.elements.get(key);
        if (element) {
            element.disabled = !enabled;
            return true;
        }
        return false;
    }

    /**
     * Add CSS class to element
     */
    addElementClass(key, className) {
        const element = this.elements.get(key);
        if (element) {
            element.classList.add(className);
            return true;
        }
        return false;
    }

    /**
     * Remove CSS class from element
     */
    removeElementClass(key, className) {
        const element = this.elements.get(key);
        if (element) {
            element.classList.remove(className);
            return true;
        }
        return false;
    }

    /**
     * Toggle CSS class on element
     */
    toggleElementClass(key, className) {
        const element = this.elements.get(key);
        if (element) {
            element.classList.toggle(className);
            return true;
        }
        return false;
    }

    /**
     * Emit event through event bus
     */
    emit(eventName, data = {}) {
        this.eventBus.emit(eventName, {
            source: this.constructor.name,
            timestamp: Date.now(),
            data
        });
    }

    /**
     * Validate required options
     */
    validateOptions(required = []) {
        for (const key of required) {
            if (this.options[key] === undefined) {
                throw new Error(`Required option missing: ${key}`);
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove DOM event listeners
        for (const [key, { element, eventType, handler }] of this.eventListeners) {
            element.removeEventListener(eventType, handler);
        }
        this.eventListeners.clear();

        // Clear element references
        this.elements.clear();

        // Emit cleanup event
        this.emit('controller.disposed', { controller: this.constructor.name });

        this.isInitialized = false;
    }

    /**
     * Default options - override in subclasses
     */
    getDefaultOptions() {
        return {
            autoInit: true,
            debug: false,
            validateElements: true
        };
    }

    /**
     * Element selectors - override in subclasses
     * @returns {Object<string, string>} - key: selector pairs
     */
    getElementSelectors() {
        return {};
    }

    /**
     * Event bindings - override in subclasses
     * @returns {Object<string, Object<string, Function>>} - elementKey: {eventType: handler}
     */
    getEventBindings() {
        return {};
    }

    /**
     * Event bus subscriptions - override in subclasses
     * @returns {Object<string, Function>} - eventName: handler pairs
     */
    getEventBusSubscriptions() {
        return {};
    }

    /**
     * Required elements - override in subclasses
     * @param {string} key - element key
     * @returns {boolean} - true if element is required
     */
    isElementRequired(key) {
        return false;
    }

    /**
     * Get controller state for debugging
     */
    getState() {
        return {
            name: this.constructor.name,
            initialized: this.isInitialized,
            elementCount: this.elements.size,
            listenerCount: this.eventListeners.size,
            options: this.options
        };
    }
}