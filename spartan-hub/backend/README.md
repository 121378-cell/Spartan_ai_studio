# Spartan Fitness Backend

This is the backend service for the Spartan Fitness application, built with Node.js and Express.

## Features

- RESTful API for fitness plan management
- SQLite database for local persistence
- AI integration for risk assessment
- CORS support for frontend integration

## API Endpoints

### Plan Management
- `POST /plan/asignar` - Assign a new fitness plan to a user
- `GET /plan/asignar/:userId` - Get all plans for a specific user
- `POST /plan/compromiso` - Create a commitment for a user's routine
- `GET /plan/compromiso/:userId/:routineId` - Get commitment details

### AI Integration
- `POST /ai/alert/:userId` - Get risk alert for a user (with user ID in URL)
- `POST /ai/alert` - Get risk alert for a user (with user data in request body)
- `GET /ai/health` - Health check for the AI service

The backend service communicates with the AI container at `http://synergycoach_ia:8000/predict_alert` for risk assessment.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables by creating a `.env` file:
   ```env
   PORT=3001
   AI_SERVICE_URL=http://synergycoach_ia:8000
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Development

For development with auto-reload:
```bash
npm run dev
```

## Database

The application uses SQLite for data persistence. The database file is located at `data/spartan.db`.

To initialize the database schema:
```bash
npm run migrate
```

## Docker Deployment

When deployed with Docker Compose, this service:
- Runs on port 3001
- Communicates with the AI service via the internal Docker network
- Uses the service name `synergycoach_ia` for AI service communication
- Has a health check endpoint at `/health`