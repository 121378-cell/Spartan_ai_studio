# Executable Creation Guide

This document explains how to create a single executable file for the Spartan Hub application that allows users to run the full application with one click.

## Overview

The Spartan Hub application consists of:
1. A React frontend built with Vite
2. A Node.js backend built with Express
3. An AI service that connects to Ollama

To create a single executable, we need to:
1. Build both the frontend and backend
2. Package everything into a single executable file
3. Ensure the executable can start both services and serve the frontend

## Prerequisites

Before creating the executable, ensure you have:
1. Node.js installed (version 18 or higher)
2. Ollama installed with the gemma2:2b model
3. All project dependencies installed (`npm install`)

## Build Process

### 1. Building the Application

The application needs to be built in two stages:

#### Frontend Build
```bash
npm run build:frontend
```
This command uses Vite to build the React application and places the output in the `dist` directory.

#### Backend Build
```bash
npm run build:backend
```
This command uses TypeScript to compile the backend code and places the output in the `backend/dist` directory.

#### Combined Build
```bash
npm run build:all
```
This command runs both frontend and backend builds sequentially.

### 2. Creating the Executable

There are two methods to create the executable:

#### Method 1: Using PKG (Recommended)
```bash
npm run build:exe
```
This command:
1. Builds both frontend and backend
2. Uses PKG to package the application into a single executable
3. Includes all necessary assets

#### Method 2: Using the Distribution Script
```bash
node create-dist.js
```
This script:
1. Builds both frontend and backend
2. Creates a distribution directory with all necessary files
3. Creates both a standalone executable and batch scripts for easier execution

## How It Works

### Backend Serving Frontend
The backend server has been modified to serve the frontend files:
1. Static files are served from the `dist` directory
2. All routes fall back to serving `index.html` to support client-side routing
3. API routes are preserved and work normally

### One-Click Execution
The executable works by:
1. Starting the backend server on port 3001
2. The backend serves the frontend files
3. Users can access the application at http://localhost:3001

## Distribution Structure

The distribution directory contains:
- `spartan-hub.exe`: The standalone executable
- `start.bat`: A batch script to run the application
- `start.ps1`: A PowerShell script to run the application
- `dist/`: The built frontend files
- `backend/dist/`: The built backend files
- `data/`: The SQLite database files
- `README.txt`: Instructions for users

## Running the Application

### From Executable
Double-click on `spartan-hub.exe` to run the application.

### From Batch Script
Double-click on `start.bat` to run the application.

### From Command Line
```bash
./spartan-hub.exe
```
or
```bash
node launcher.js
```

## Accessing the Application

Once the application is running, open your browser and navigate to:
```
http://localhost:3001
```

## Stopping the Application

To stop the application:
- Close the command window
- Press Ctrl+C in the terminal
- Kill the process from Task Manager

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Solution: Kill existing Node.js processes or change the port in the backend configuration

2. **Ollama not found**
   - Solution: Ensure Ollama is installed and the gemma2:2b model is available

3. **Missing dependencies**
   - Solution: Run `npm install` in both the root and backend directories

### Verifying the Build

To verify that the build works correctly:
1. Run `npm run build:all`
2. Check that the `dist` and `backend/dist` directories are created
3. Run `node simple-launcher.js` to test the application

## Customization

### Changing the Port
To change the port the application runs on:
1. Modify the PORT variable in `backend/src/server.ts`
2. Rebuild the application

### Adding Additional Assets
To include additional assets in the executable:
1. Add them to the `assets` array in the `pkg` section of `package.json`
2. Rebuild the executable

## Size Considerations

The executable will be relatively large (30-50MB) because it includes:
- The Node.js runtime
- All dependencies
- The built frontend and backend files

## Security Considerations

When distributing the executable:
1. Ensure all dependencies are up to date
2. Scan the executable with antivirus software
3. Consider code signing for official releases

## Future Improvements

Potential improvements to the executable creation process:
1. Add auto-update functionality
2. Implement better error handling and logging
3. Add a system tray icon for background operation
4. Create installers for easier distribution