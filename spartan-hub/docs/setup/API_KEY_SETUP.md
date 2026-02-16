# API Key Setup Guide

This guide explains how to configure API keys for the fitness and nutrition services in Spartan Hub.

## Overview

The application uses several free APIs for fitness and nutrition data. To use these services, you need to obtain API keys from each provider and configure them in the `.env` file.

## Supported APIs

### 1. API Ninjas
- **Website**: https://api-ninjas.com/
- **Free Tier**: 10,000 requests/month
- **Required Keys**: `API_NINJAS_KEY`

**Setup Steps**:
1. Visit https://api-ninjas.com/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file:
   ```
   API_NINJAS_KEY=your_actual_api_key_here
   ```

### 2. Edamam Nutrition API
- **Website**: https://www.edamam.com/
- **Free Tier**: 10,000 requests/month
- **Required Keys**: `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`

**Setup Steps**:
1. Visit https://www.edamam.com/
2. Sign up for the free "Developer" plan
3. Create a new application to get your App ID and App Key
4. Add them to your `.env` file:
   ```
   EDAMAM_APP_ID=your_app_id_here
   EDAMAM_APP_KEY=your_app_key_here
   ```

### 3. FatSecret Platform API
- **Website**: https://platform.fatsecret.com/
- **Free Tier**: 5,000 requests/day
- **Required Keys**: `FATSECRET_KEY`, `FATSECRET_SECRET`

**Setup Steps**:
1. Visit https://platform.fatsecret.com/
2. Register for a free account
3. Register your application to get your Consumer Key and Consumer Secret
4. Add them to your `.env` file:
   ```
   FATSECRET_KEY=your_consumer_key_here
   FATSECRET_SECRET=your_consumer_secret_here
   ```

### 4. ExerciseDB API (via RapidAPI)
- **Website**: https://rapidapi.com/
- **Free Tier**: 500 requests/month
- **Required Keys**: `EXERCISEDB_KEY`

**Setup Steps**:
1. Visit https://rapidapi.com/
2. Sign up for a free account
3. Search for "ExerciseDB" API
4. Subscribe to the free plan
5. Get your API key from the dashboard
6. Add it to your `.env` file:
   ```
   EXERCISEDB_KEY=your_api_key_here
   ```

## Configuration File

The `.env` file in the root directory should look like this when configured:

```env
# API Keys for Fitness and Nutrition Services
# Sign up at the respective services to get your free API keys

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

## Testing Your Configuration

After configuring your API keys, you can test them using:

```bash
npm run test:env
```

This will show which APIs are properly configured.

For a more comprehensive test:

```bash
npm run test:fitness
```

This will attempt to make actual API calls to verify your keys are working.

## Security Notes

- Never commit your `.env` file to version control
- The `.gitignore` file should already exclude `.env` files
- Keep your API keys secure and private
- Rotate your keys periodically for security

## Troubleshooting

1. **Keys not recognized**: Ensure there are no extra spaces or quotes around your keys
2. **Rate limiting**: Most free APIs have rate limits; implement caching if needed
3. **API changes**: Providers may change their APIs; check documentation if issues occur
4. **Network issues**: Ensure your network allows outbound connections to these services