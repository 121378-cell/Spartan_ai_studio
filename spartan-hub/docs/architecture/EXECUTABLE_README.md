# Spartan Hub Executable Application

This document explains how to use the executable version of the Spartan Hub fitness coaching application.

## Prerequisites

Before running the executable, ensure you have:

1. **Node.js** (v16 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **Ollama** - Download from [ollama.com](https://ollama.com/)
3. **Windows** - The executable is designed for Windows operating systems

## Installation

### Method 1: Using the Batch File (Recommended)

1. Double-click on `spartan-hub.bat` to start the application
2. The launcher will automatically:
   - Check for required dependencies
   - Download the gemma2:2b model if not present
   - Install any missing npm packages
   - Build the frontend and backend
   - Start both services

### Method 2: Using the PowerShell Script

1. Right-click on `spartan-hub.ps1` and select "Run with PowerShell"
2. The script will perform the same steps as the batch file

### Method 3: Using Node.js Directly

1. Open a terminal in the project directory
2. Run: `node launch.js`

## Usage

After starting the application:

1. **Frontend** will be available at: http://localhost:3000
2. **Backend API** will be available at: http://localhost:3001

The application includes:
- AI-powered fitness coaching
- Workout planning and tracking
- Recovery monitoring
- Habit formation tools
- Performance analytics

## Features

### AI Integration
- Local AI processing using Ollama
- Memory-efficient gemma2:2b model (1.6GB)
- Real-time fitness analysis and recommendations

### Data Persistence
- SQLite database for local storage
- Automatic data backup and recovery
- Offline functionality support

### User Dashboard
- Comprehensive fitness tracking
- Personalized workout plans
- Recovery and stress monitoring
- Progress visualization

## Troubleshooting

### Common Issues

1. **"Ollama is not installed"**
   - Solution: Download and install Ollama from https://ollama.com/

2. **"Node.js is not installed"**
   - Solution: Download and install Node.js from https://nodejs.org/

3. **"gemma2:2b model not found"**
   - Solution: The launcher will automatically download the model

4. **"Port already in use"**
   - Solution: Close other applications using ports 3000 or 3001

### Manual Model Installation

If the automatic model download fails:

1. Open a terminal
2. Run: `ollama pull gemma2:2b`
3. Wait for the download to complete

## Building from Source

To build the application manually:

1. Install dependencies:
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

2. Build the application:
   ```bash
   npm run build:all
   ```

3. Start the application:
   ```bash
   npm start
   ```

## Customization

### Environment Variables

Create a `.env` file in the backend directory with:
```
PORT=3001
OLLAMA_HOST=http://localhost:11434
```

### Database Configuration

The application uses SQLite by default:
- Database file: `data/spartan.db`
- Location: Project root directory

## Support

For issues or questions:
1. Check the console output for error messages
2. Verify all prerequisites are installed
3. Ensure Ollama is running (check system tray icon)
4. Refer to the documentation in the project root

## File Structure

```
spartan-hub/
├── spartan-hub.bat        # Windows batch launcher
├── spartan-hub.ps1        # PowerShell launcher
├── launch.js              # Node.js launcher
├── backend/               # Backend API
│   ├── dist/              # Compiled backend
│   └── src/               # Source code
├── dist/                  # Compiled frontend
├── data/                  # SQLite database
└── ...                    # Other project files
```

## Security

- All data is stored locally
- No internet connection required for basic functionality
- AI processing happens locally through Ollama
- No data is sent to external servers