#!/usr/bin/env node
/**
 * Thomas Attractor Unified Orchestrator
 * Automatically starts server and launches browser
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configuration  
const args = process.argv.slice(2);
const noBrowserFlag = args.includes('--no-browser');
const portArg = args.find(arg => !arg.startsWith('--') && !isNaN(arg));

const CONFIG = {
    port: portArg || 8081,
    host: 'localhost',
    openBrowser: !noBrowserFlag,
    serverScript: path.join(__dirname, 'server.js'),
    maxRetries: 10,
    retryDelay: 500
};

class ThomasAttractorOrchestrator {
    constructor() {
        this.serverProcess = null;
        this.isServerReady = false;
        this.retryCount = 0;
    }

    /**
     * Main orchestration method
     */
    async start() {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║              Thomas Attractor Orchestrator                ║
║                   Unified Startup                         ║
╚════════════════════════════════════════════════════════════╝

🚀 Starting unified Thomas Attractor application...
📍 Port: ${CONFIG.port}
🌐 Host: ${CONFIG.host}
🖥️  Auto-browser: ${CONFIG.openBrowser ? 'Yes' : 'No'}
        `);

        try {
            // 1. Validate prerequisites
            await this.validatePrerequisites();
            
            // 2. Start server
            await this.startServer();
            
            // 3. Wait for server to be ready
            await this.waitForServer();
            
            // 4. Launch browser
            if (CONFIG.openBrowser) {
                await this.launchBrowser();
            }
            
            // 5. Setup graceful shutdown
            this.setupGracefulShutdown();
            
            console.log(`
✅ Thomas Attractor application is ready!
🌐 Access at: http://${CONFIG.host}:${CONFIG.port}

Press Ctrl+C to stop the application
            `);

        } catch (error) {
            console.error('❌ Failed to start Thomas Attractor application:', error.message);
            await this.cleanup();
            process.exit(1);
        }
    }

    /**
     * Validate that all required files exist
     */
    async validatePrerequisites() {
        const requiredFiles = [
            CONFIG.serverScript,
            path.join(__dirname, 'index.html'),
            path.join(__dirname, 'data', 'presets.json'),
            path.join(__dirname, 'src', 'app.js')
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${path.relative(__dirname, file)}`);
            }
        }
        
        console.log('✅ Prerequisites validated');
    }

    /**
     * Start the server process
     */
    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('🔧 Starting server...');
            
            // Check if port is already in use
            this.checkPortAvailable(CONFIG.port)
                .then(isAvailable => {
                    if (!isAvailable) {
                        reject(new Error(`Port ${CONFIG.port} is already in use`));
                        return;
                    }
                    
                    // Start server process
                    this.serverProcess = spawn('node', [CONFIG.serverScript, CONFIG.port], {
                        cwd: __dirname,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });

                    // Handle server output
                    this.serverProcess.stdout.on('data', (data) => {
                        const output = data.toString();
                        if (output.includes('Server running')) {
                            this.isServerReady = true;
                            console.log('✅ Server started successfully');
                            resolve();
                        }
                    });

                    this.serverProcess.stderr.on('data', (data) => {
                        const error = data.toString();
                        if (error.includes('EADDRINUSE')) {
                            reject(new Error(`Port ${CONFIG.port} is already in use`));
                        } else if (error.trim()) {
                            console.warn('⚠️  Server warning:', error.trim());
                        }
                    });

                    this.serverProcess.on('error', (error) => {
                        reject(new Error(`Failed to start server: ${error.message}`));
                    });

                    this.serverProcess.on('exit', (code) => {
                        if (code !== 0 && code !== null) {
                            reject(new Error(`Server exited with code ${code}`));
                        }
                    });

                    // Timeout if server doesn't start
                    setTimeout(() => {
                        if (!this.isServerReady) {
                            reject(new Error('Server startup timeout'));
                        }
                    }, 10000);
                })
                .catch(reject);
        });
    }

    /**
     * Wait for server to be fully ready
     */
    async waitForServer() {
        console.log('⏳ Waiting for server to be ready...');
        
        while (this.retryCount < CONFIG.maxRetries) {
            try {
                await this.testServerConnection();
                console.log('✅ Server is ready and responding');
                return;
            } catch (error) {
                this.retryCount++;
                if (this.retryCount >= CONFIG.maxRetries) {
                    throw new Error('Server failed to respond after maximum retries');
                }
                await this.delay(CONFIG.retryDelay);
            }
        }
    }

    /**
     * Test server connection
     */
    async testServerConnection() {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: CONFIG.host,
                port: CONFIG.port,
                path: '/',
                method: 'HEAD',
                timeout: 2000
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    reject(new Error(`Server responded with status ${res.statusCode}`));
                }
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Connection timeout')));
            req.end();
        });
    }

    /**
     * Launch browser
     */
    async launchBrowser() {
        console.log('🌐 Launching browser...');
        
        const url = `http://${CONFIG.host}:${CONFIG.port}`;
        
        try {
            // Determine the correct command based on platform
            let command;
            switch (process.platform) {
                case 'darwin':
                    command = `open "${url}"`;
                    break;
                case 'win32':
                    command = `start "" "${url}"`;
                    break;
                default:
                    command = `xdg-open "${url}"`;
            }

            exec(command, (error) => {
                if (error) {
                    console.warn('⚠️  Could not auto-launch browser:', error.message);
                    console.log(`🌐 Please manually open: ${url}`);
                } else {
                    console.log('✅ Browser launched successfully');
                }
            });

        } catch (error) {
            console.warn('⚠️  Could not launch browser:', error.message);
            console.log(`🌐 Please manually open: ${url}`);
        }
    }

    /**
     * Check if port is available
     */
    async checkPortAvailable(port) {
        return new Promise((resolve) => {
            const server = http.createServer();
            
            server.listen(port, CONFIG.host, () => {
                server.close(() => resolve(true));
            });
            
            server.on('error', () => resolve(false));
        });
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            await this.cleanup();
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        
        // Windows doesn't support SIGTERM, use SIGBREAK instead
        if (process.platform === 'win32') {
            process.on('SIGBREAK', () => shutdown('SIGBREAK'));
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.serverProcess && !this.serverProcess.killed) {
            console.log('🧹 Stopping server...');
            this.serverProcess.kill();
            
            // Give server time to shutdown gracefully
            await this.delay(1000);
            
            if (!this.serverProcess.killed) {
                console.log('🔨 Force killing server...');
                this.serverProcess.kill('SIGKILL');
            }
        }
        console.log('✅ Cleanup completed');
    }

    /**
     * Utility: delay function
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Show help
function showHelp() {
    console.log(`
Thomas Attractor Orchestrator - Usage:

node start.js [PORT] [OPTIONS]

Arguments:
  PORT              Server port (default: 8081)

Options:
  --no-browser     Don't auto-launch browser
  --help, -h       Show this help message

Examples:
  node start.js                    # Start on port 8081, open browser
  node start.js 3000              # Start on port 3000, open browser  
  node start.js 8081 --no-browser # Start on port 8081, no browser
    `);
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    const orchestrator = new ThomasAttractorOrchestrator();
    orchestrator.start().catch((error) => {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = ThomasAttractorOrchestrator;