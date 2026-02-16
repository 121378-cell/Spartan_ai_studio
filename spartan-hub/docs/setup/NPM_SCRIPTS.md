# NPM Scripts Reference

This project uses `npm` scripts to manage common tasks, replacing legacy shell/batch scripts. Below is a list of available commands and their usage.

## Docker Operations

*   **`npm run docker:up`**: Builds and starts all services in detached mode using Docker Compose.
    *   *Replaces: `start.bat`, `start.sh`*
*   **`npm run docker:down`**: Stops and removes containers, networks, and volumes defined in Docker Compose.
    *   *Replaces: `stop.bat`, `stop.sh`*
*   **`npm run docker:status`**: Lists the status of containers.
*   **`npm run docker:logs`**: Follows the logs of all running services.

## Testing

*   **`npm test`**: Runs frontend tests using Jest.
*   **`npm run test:backend-suite`**: Runs the full backend test suite, including build, database tests, AI service tests, and general tests.
    *   *Replaces: `run_all_tests.bat`*
*   **`npm run test:coverage`**: Runs tests with coverage reporting.

## Build & Distribution

*   **`npm run build:all`**: Builds frontend, backend, and services.
*   **`npm run dist`**: Creates a distribution package in `dist/spartan-hub-dist/` containing the executable, backend, data, and documentation.
    *   *Replaces: `create-dist.bat`*

## Development

*   **`npm run dev`**: Starts the frontend (Vite) and backend in development mode concurrently.
*   **`npm start`**: Runs the simple launcher (`scripts/simple-launcher.js`).

## Usage Example

To start the environment:
```bash
npm run docker:up
```

To stop the environment:
```bash
npm run docker:down
```

To run all backend tests:
```bash
npm run test:backend-suite
```
