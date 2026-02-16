# Spartan Hub Executable Guide

This guide explains how to use the Spartan Hub executable application.

## Prerequisites

Before running the executable, ensure you have:

1. **Ollama** - Download from [ollama.com](https://ollama.com/)
2. **Windows** - The executable is designed for Windows operating systems

## Installation

### Step 1: Install Ollama

1. Download Ollama from https://ollama.com/
2. Run the installer and follow the installation instructions
3. Verify installation by opening a terminal and running:
   ```
   ollama --version
   ```

### Step 2: Download the Required AI Model

1. Open a terminal/command prompt
2. Run the following command to download the lightweight AI model:
   ```
   ollama pull gemma2:2b
   ```

### Step 3: Run the Executable

1. Double-click on `spartan-hub.exe` to start the application
2. The application will:
   - Check for required dependencies
   - Install any missing backend packages
   - Build the backend service
   - Start the backend API server

## Usage

After starting the application:

1. **Backend API** will be available at: http://localhost:3001
2. You can test the API endpoints:
   - Health check: http://localhost:3001/health
   - AI health check: http://localhost:3001/ai/health
   - AI alert generation: POST http://localhost:3001/ai/alert

## Features

### AI Integration
- Local AI processing using Ollama
- Memory-efficient gemma2:2b model (1.6GB)
- Real-time fitness analysis and recommendations

### Data Persistence
- SQLite database for local storage
- Automatic data backup and recovery
- Offline functionality support

### API Endpoints
- User management
- Workout planning and tracking
- Recovery monitoring
- AI-powered alerts and recommendations

## Troubleshooting

### Common Issues

1. **"Ollama is not installed"**
   - Solution: Download and install Ollama from https://ollama.com/

2. **"gemma2:2b model not found"**
   - Solution: Run `ollama pull gemma2:2b` in a terminal

3. **"Port already in use"**
   - Solution: Close other applications using port 3001

4. **"Missing backend dependencies"**
   - Solution: Ensure you have internet connection for automatic package installation

### Manual Backend Setup

If the automatic setup fails:

1. Open a terminal in the application directory
2. Navigate to the backend folder:
   ```
   cd backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Build the backend:
   ```
   npx tsc
   ```
5. Start the backend:
   ```
   node dist/server.js
   ```

## File Structure

```
spartan-hub/
├── spartan-hub.exe           # Main executable
├── backend/                  # Backend API
│   ├── dist/                 # Compiled backend
│   └── src/                  # Source code
├── data/                     # SQLite database
└── ...                       # Other project files
```

## Security

- All data is stored locally
- No internet connection required for basic functionality
- AI processing happens locally through Ollama
- No data is sent to external servers

## Support

For issues or questions:
1. Check the console output for error messages
2. Verify all prerequisites are installed
3. Ensure Ollama is running (check system tray icon)
4. Refer to the documentation in the project root

## Next Steps

To enhance your experience:
1. Use the provided API endpoints to build your own frontend
2. Integrate with mobile applications
3. Extend the backend functionality
4. Customize the AI prompts for specific use cases