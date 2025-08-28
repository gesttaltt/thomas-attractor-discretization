/**
 * Professional Logging System
 * Replaces console.log with structured logging
 * Supports different log levels, formatting, and storage
 */

import { DEBUG } from './Constants.js';

/**
 * Log levels enumeration
 */
export const LogLevel = {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    VERBOSE: 5
};

/**
 * Log entry structure
 */
class LogEntry {
    constructor(level, category, message, data = null) {
        this.timestamp = Date.now();
        this.level = level;
        this.category = category;
        this.message = message;
        this.data = data;
        this.stackTrace = level === LogLevel.ERROR ? new Error().stack : null;
    }
    
    toString() {
        const time = new Date(this.timestamp).toISOString();
        const levelName = Logger.getLevelName(this.level);
        const prefix = `[${time}] [${levelName}] [${this.category}]`;
        
        if (this.data) {
            return `${prefix} ${this.message} ${JSON.stringify(this.data, null, 2)}`;
        }
        return `${prefix} ${this.message}`;
    }
}

/**
 * Log storage interface
 */
class LogStorage {
    constructor(maxEntries = 1000) {
        this.entries = [];
        this.maxEntries = maxEntries;
    }
    
    add(entry) {
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }
    
    clear() {
        this.entries = [];
    }
    
    getEntries(filter = {}) {
        let filtered = [...this.entries];
        
        if (filter.level !== undefined) {
            filtered = filtered.filter(e => e.level === filter.level);
        }
        
        if (filter.category) {
            filtered = filtered.filter(e => e.category === filter.category);
        }
        
        if (filter.since) {
            filtered = filtered.filter(e => e.timestamp >= filter.since);
        }
        
        if (filter.until) {
            filtered = filtered.filter(e => e.timestamp <= filter.until);
        }
        
        return filtered;
    }
    
    export() {
        return this.entries.map(e => e.toString()).join('\n');
    }
}

/**
 * Main Logger class
 */
export class Logger {
    constructor(category = 'General', config = {}) {
        this.category = category;
        this.config = {
            level: config.level || (DEBUG.ENABLE_PROFILING ? LogLevel.DEBUG : LogLevel.INFO),
            console: config.console !== false,
            storage: config.storage !== false,
            colorize: config.colorize !== false,
            timestamp: config.timestamp !== false,
            ...config
        };
        
        // Use shared storage
        if (!Logger.storage) {
            Logger.storage = new LogStorage();
        }
        
        // Console colors for different levels
        this.colors = {
            [LogLevel.ERROR]: 'color: #ff0000; font-weight: bold',
            [LogLevel.WARN]: 'color: #ff9800; font-weight: bold',
            [LogLevel.INFO]: 'color: #2196f3',
            [LogLevel.DEBUG]: 'color: #9e9e9e',
            [LogLevel.VERBOSE]: 'color: #607d8b'
        };
    }
    
    /**
     * Core logging method
     */
    log(level, message, data = null) {
        if (level > this.config.level) {
            return;
        }
        
        const entry = new LogEntry(level, this.category, message, data);
        
        // Store in memory
        if (this.config.storage && Logger.storage) {
            Logger.storage.add(entry);
        }
        
        // Output to console
        if (this.config.console) {
            this.outputToConsole(entry);
        }
        
        // Emit event for external handlers
        this.emit('log', entry);
    }
    
    /**
     * Output to console with formatting
     */
    outputToConsole(entry) {
        const levelName = Logger.getLevelName(entry.level);
        const time = this.config.timestamp ? 
            new Date(entry.timestamp).toLocaleTimeString() + ' ' : '';
        
        if (this.config.colorize && this.colors[entry.level]) {
            const prefix = `%c${time}[${levelName}] [${entry.category}]`;
            if (entry.data) {
                console.log(`${prefix} ${entry.message}`, this.colors[entry.level], entry.data);
            } else {
                console.log(`${prefix} ${entry.message}`, this.colors[entry.level]);
            }
        } else {
            const prefix = `${time}[${levelName}] [${entry.category}]`;
            if (entry.data) {
                console.log(`${prefix} ${entry.message}`, entry.data);
            } else {
                console.log(`${prefix} ${entry.message}`);
            }
        }
        
        // Output stack trace for errors
        if (entry.stackTrace && entry.level === LogLevel.ERROR) {
            console.error(entry.stackTrace);
        }
    }
    
    /**
     * Log level methods
     */
    error(message, data = null) {
        this.log(LogLevel.ERROR, message, data);
    }
    
    warn(message, data = null) {
        this.log(LogLevel.WARN, message, data);
    }
    
    info(message, data = null) {
        this.log(LogLevel.INFO, message, data);
    }
    
    debug(message, data = null) {
        this.log(LogLevel.DEBUG, message, data);
    }
    
    verbose(message, data = null) {
        this.log(LogLevel.VERBOSE, message, data);
    }
    
    /**
     * Performance logging
     */
    time(label) {
        this.timers = this.timers || {};
        this.timers[label] = performance.now();
    }
    
    timeEnd(label) {
        if (this.timers && this.timers[label]) {
            const elapsed = performance.now() - this.timers[label];
            this.debug(`${label}: ${elapsed.toFixed(2)}ms`);
            delete this.timers[label];
            return elapsed;
        }
        return 0;
    }
    
    /**
     * Group logging
     */
    group(label) {
        if (this.config.console) {
            console.group(label);
        }
        this.info(`=== ${label} ===`);
    }
    
    groupEnd() {
        if (this.config.console) {
            console.groupEnd();
        }
    }
    
    /**
     * Table logging
     */
    table(data, columns) {
        if (this.config.console) {
            console.table(data, columns);
        } else {
            this.info('Table:', data);
        }
    }
    
    /**
     * Assert with logging
     */
    assert(condition, message) {
        if (!condition) {
            this.error(`Assertion failed: ${message}`);
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    /**
     * Event emitter for external handlers
     */
    emit(event, data) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(`logger-${event}`, {
                detail: { logger: this.category, data }
            }));
        }
    }
    
    /**
     * Create child logger with inherited config
     */
    child(category) {
        return new Logger(`${this.category}/${category}`, this.config);
    }
    
    /**
     * Set log level
     */
    setLevel(level) {
        this.config.level = level;
    }
    
    /**
     * Get level name from number
     */
    static getLevelName(level) {
        const names = ['NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'];
        return names[level] || 'UNKNOWN';
    }
    
    /**
     * Get stored logs
     */
    static getLogs(filter = {}) {
        if (!Logger.storage) return [];
        return Logger.storage.getEntries(filter);
    }
    
    /**
     * Clear stored logs
     */
    static clearLogs() {
        if (Logger.storage) {
            Logger.storage.clear();
        }
    }
    
    /**
     * Export logs
     */
    static exportLogs() {
        if (!Logger.storage) return '';
        return Logger.storage.export();
    }
    
    /**
     * Download logs as file
     */
    static downloadLogs(filename = 'logs.txt') {
        const content = Logger.exportLogs();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

/**
 * Factory for creating loggers
 */
export class LoggerFactory {
    constructor(config = {}) {
        this.defaultConfig = config;
        this.loggers = new Map();
    }
    
    get(category) {
        if (!this.loggers.has(category)) {
            this.loggers.set(category, new Logger(category, this.defaultConfig));
        }
        return this.loggers.get(category);
    }
    
    setDefaultLevel(level) {
        this.defaultConfig.level = level;
        for (const logger of this.loggers.values()) {
            logger.setLevel(level);
        }
    }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger('App');

/**
 * Global logger factory
 */
export const loggerFactory = new LoggerFactory({
    level: DEBUG.ENABLE_PROFILING ? LogLevel.DEBUG : LogLevel.INFO,
    console: true,
    storage: true,
    colorize: true,
    timestamp: true
});

/**
 * Console replacement functions
 */
export const replaceConsole = () => {
    const logger = new Logger('Console');
    
    // Store original console methods
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
    };
    
    // Replace console methods
    console.log = (...args) => logger.info(args.join(' '));
    console.error = (...args) => logger.error(args.join(' '));
    console.warn = (...args) => logger.warn(args.join(' '));
    console.info = (...args) => logger.info(args.join(' '));
    console.debug = (...args) => logger.debug(args.join(' '));
    
    // Return restore function
    return () => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
    };
};

/**
 * Decorator for method logging
 */
export function logMethod(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);
    
    descriptor.value = function(...args) {
        logger.debug(`${propertyKey} called`, { args });
        
        try {
            const result = originalMethod.apply(this, args);
            
            if (result instanceof Promise) {
                return result
                    .then(res => {
                        logger.debug(`${propertyKey} resolved`, { result: res });
                        return res;
                    })
                    .catch(err => {
                        logger.error(`${propertyKey} rejected`, err);
                        throw err;
                    });
            }
            
            logger.debug(`${propertyKey} returned`, { result });
            return result;
        } catch (error) {
            logger.error(`${propertyKey} threw error`, error);
            throw error;
        }
    };
    
    return descriptor;
}

/**
 * Performance logger wrapper
 */
export class PerformanceLogger {
    constructor(category) {
        this.logger = new Logger(`Performance/${category}`);
        this.metrics = new Map();
    }
    
    start(operation) {
        this.metrics.set(operation, performance.now());
    }
    
    end(operation, threshold = null) {
        const start = this.metrics.get(operation);
        if (!start) return 0;
        
        const elapsed = performance.now() - start;
        this.metrics.delete(operation);
        
        if (threshold && elapsed > threshold) {
            this.logger.warn(`${operation} exceeded threshold`, {
                elapsed: elapsed.toFixed(2),
                threshold
            });
        } else {
            this.logger.debug(`${operation}: ${elapsed.toFixed(2)}ms`);
        }
        
        return elapsed;
    }
    
    measure(operation, fn) {
        this.start(operation);
        try {
            const result = fn();
            if (result instanceof Promise) {
                return result.finally(() => this.end(operation));
            }
            this.end(operation);
            return result;
        } catch (error) {
            this.end(operation);
            throw error;
        }
    }
}

export default {
    Logger,
    LoggerFactory,
    LogLevel,
    defaultLogger,
    loggerFactory,
    replaceConsole,
    logMethod,
    PerformanceLogger
};