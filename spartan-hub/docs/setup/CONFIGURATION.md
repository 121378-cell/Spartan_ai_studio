# Spartan Hub Configuration Guide

This guide explains how to configure the Spartan Hub application, including API keys for fitness and nutrition services.

## Environment Variables

The application uses environment variables for configuration. These are loaded from a `.env` file in the root directory.

### Required Environment Variables

1. **Ollama Configuration**:
   - `OLLAMA_HOST`: URL for the Ollama service (default: http://localhost:11434)

2. **Fitness and Nutrition API Keys** (optional but recommended):
   - `API_NINJAS_KEY`: API key for API Ninjas
   - `EDAMAM_APP_ID`: App ID for Edamam Nutrition API
   - `EDAMAM_APP_KEY`: App Key for Edamam Nutrition API
   - `FATSECRET_KEY`: Consumer Key for FatSecret Platform API
   - `FATSECRET_SECRET`: Consumer Secret for FatSecret Platform API
   - `EXERCISEDB_KEY`: API key for ExerciseDB via RapidAPI

## Setting Up API Keys

### 1. Create the .env File

Copy the example file to create your own configuration:

```bash
cp .env.example .env
```

### 2. Configure API Keys

Edit the `.env` file and add your actual API keys:

```env
# API Ninjas - https://api-ninjas.com/
API_NINJAS_KEY=your_actual_api_key_here

# Edamam Nutrition API - https://www.edamam.com/
EDAMAM_APP_ID=your_app_id_here
EDAMAM_APP_KEY=your_app_key_here

# FatSecret Platform API - https://platform.fatsecret.com/
FATSECRET_KEY=your_consumer_key_here
FATSECRET_SECRET=your_consumer_secret_here

# ExerciseDB API via RapidAPI - https://rapidapi.com/
EXERCISEDB_KEY=your_api_key_here

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
```

### 3. API Key Providers

#### API Ninjas
- **Website**: https://api-ninjas.com/
- **Services Used**: Exercises API, Nutrition API
- **Free Tier**: 10,000 requests/month
- **Setup**: Sign up and get your API key from the dashboard

#### Edamam Nutrition API
- **Website**: https://www.edamam.com/
- **Services Used**: Nutrition Analysis API
- **Free Tier**: 10,000 requests/month
- **Setup**: Sign up for the "Developer" plan and create an application

#### FatSecret Platform API
- **Website**: https://platform.fatsecret.com/
- **Services Used**: Food Database API
- **Free Tier**: 5,000 requests/day
- **Setup**: Register for an account and register your application

#### ExerciseDB API (via RapidAPI)
- **Website**: https://rapidapi.com/
- **Services Used**: Exercise Database API
- **Free Tier**: 500 requests/month
- **Setup**: Sign up, search for "ExerciseDB" API, and subscribe to the free plan

## Testing Configuration

### Test Environment Variables

Run the environment test script:

```bash
npm run test:env
```

This will show which APIs are properly configured.

### Test API Integration

Run the fitness and nutrition service test:

```bash
npm run test:fitness
```

This will attempt to make actual API calls to verify your keys are working.

### Test Backend API Keys

Start the backend server and visit:

```
http://localhost:3001/test/api-keys
```

This will show which API keys are loaded by the backend service.

## Security Best Practices

1. **Never commit .env files**: The `.gitignore` file excludes `.env` files from version control
2. **Keep keys secure**: Store API keys in a secure location
3. **Rotate keys periodically**: Update your API keys regularly for security
4. **Use strong keys**: Generate strong, random API keys when possible

## Troubleshooting

### Common Issues

1. **API keys not recognized**:
   - Check for extra spaces or quotes around your keys
   - Ensure the `.env` file is in the correct location (root directory)
   - Restart the application after changing API keys

2. **Rate limiting**:
   - Most free APIs have rate limits
   - Implement caching to reduce API calls
   - Consider upgrading to paid plans for higher limits

3. **Network issues**:
   - Ensure your network allows outbound connections to API services
   - Check firewall settings if APIs are unreachable

4. **API changes**:
   - Providers may change their APIs
   - Check documentation if issues occur
   - Update the service implementation if needed

### Debugging Steps

1. **Verify .env file**:
   ```bash
   cat .env
   ```

2. **Test environment variables**:
   ```bash
   npm run test:env
   ```

3. **Check backend logs**:
   Look for error messages when starting the backend service

4. **Test individual APIs**:
   Use the test scripts to isolate which APIs are working

## Next Steps

1. Configure the API keys you want to use
2. Test the integration with your API keys
3. Implement UI components to display the data
4. Extend the service with additional APIs as needed