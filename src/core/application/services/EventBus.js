/**
 * Event Bus Service
 * Handles decoupled communication between application components
 */

export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 1000;
    }

    /**
     * Register event listener
     */
    on(eventType, listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }

        this.listeners.get(eventType).add(listener);

        // Return unsubscribe function
        return () => {
            this.off(eventType, listener);
        };
    }

    /**
     * Register one-time event listener
     */
    once(eventType, listener) {
        const unsubscribe = this.on(eventType, (data) => {
            unsubscribe();
            listener(data);
        });
        return unsubscribe;
    }

    /**
     * Remove event listener
     */
    off(eventType, listener) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).delete(listener);
            
            // Clean up empty listener sets
            if (this.listeners.get(eventType).size === 0) {
                this.listeners.delete(eventType);
            }
        }
    }

    /**
     * Emit event to all listeners
     */
    emit(eventType, data = null) {
        const eventData = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            id: this._generateEventId()
        };

        // Store in history
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }

        // Notify listeners
        if (this.listeners.has(eventType)) {
            const listeners = Array.from(this.listeners.get(eventType));
            
            // Use setTimeout to make events asynchronous and prevent blocking
            listeners.forEach(listener => {
                try {
                    setTimeout(() => {
                        listener(eventData);
                    }, 0);
                } catch (error) {
                    console.error(`Error in event listener for ${eventType}:`, error);
                    this.emit('event.error', { eventType, error: error.message });
                }
            });
        }

        return eventData;
    }

    /**
     * Emit event and wait for all listeners to complete
     */
    async emitAsync(eventType, data = null) {
        const eventData = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            id: this._generateEventId()
        };

        // Store in history
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }

        // Notify listeners and wait for completion
        if (this.listeners.has(eventType)) {
            const listeners = Array.from(this.listeners.get(eventType));
            const promises = listeners.map(listener => {
                try {
                    const result = listener(eventData);
                    return Promise.resolve(result);
                } catch (error) {
                    console.error(`Error in async event listener for ${eventType}:`, error);
                    this.emit('event.error', { eventType, error: error.message });
                    return Promise.resolve();
                }
            });

            await Promise.all(promises);
        }

        return eventData;
    }

    /**
     * Remove all listeners for an event type
     */
    removeAllListeners(eventType) {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get event history
     */
    getEventHistory(eventType = null, limit = 100) {
        let events = [...this.eventHistory];
        
        if (eventType) {
            events = events.filter(event => event.type === eventType);
        }

        return events.slice(-limit);
    }

    /**
     * Get registered event types
     */
    getEventTypes() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get listener count for event type
     */
    getListenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).size : 0;
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }

    /**
     * Create event namespace for scoped events
     */
    createNamespace(namespace) {
        return {
            on: (eventType, listener) => this.on(`${namespace}.${eventType}`, listener),
            once: (eventType, listener) => this.once(`${namespace}.${eventType}`, listener),
            off: (eventType, listener) => this.off(`${namespace}.${eventType}`, listener),
            emit: (eventType, data) => this.emit(`${namespace}.${eventType}`, data),
            emitAsync: (eventType, data) => this.emitAsync(`${namespace}.${eventType}`, data)
        };
    }

    /**
     * Debug utilities
     */
    debug() {
        return {
            listenerCount: Array.from(this.listeners.entries()).map(([type, listeners]) => 
                ({ eventType: type, count: listeners.size })),
            eventHistory: this.eventHistory.slice(-10),
            totalEvents: this.eventHistory.length
        };
    }

    _generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Global Event Bus instance
 */
export const globalEventBus = new EventBus();