@echo off
REM Thomas Attractor - Windows Startup Script
REM Unified orchestrator for automatic server start and browser launch

echo.
echo ==========================================
echo   Thomas Attractor - Windows Launcher
echo ==========================================
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if start.js exists
if not exist "start.js" (
    echo ERROR: start.js not found!
    echo Please run this script from the project root directory.
    echo.
    pause
    exit /b 1
)

echo Starting Thomas Attractor application...
echo.

REM Run the orchestrator with arguments
node start.js %*

echo.
echo Application stopped. Press any key to exit.
pause >nul