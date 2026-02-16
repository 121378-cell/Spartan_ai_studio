# How to Get API Keys for Spartan Hub

This guide will walk you through getting free API keys for all the services used in Spartan Hub.

## Step 1: API Ninjas

1. Go to https://api-ninjas.com/
2. Click "Get API Key"
3. Sign up for a free account
4. Copy your API key from the dashboard

## Step 2: Edamam Nutrition API

1. Go to https://www.edamam.com/
2. Click "Products" then "Nutrition Analysis API"
3. Click "Register" or "Get Started"
4. Sign up for the free "Developer" plan
5. Create a new application
6. Copy your App ID and App Key

## Step 3: FatSecret Platform API

1. Go to https://platform.fatsecret.com/
2. Click "Register" or "Sign Up"
3. Create a free account
4. Register your application
5. Copy your Consumer Key and Consumer Secret

## Step 4: ExerciseDB API (via RapidAPI)

1. Go to https://rapidapi.com/
2. Sign up for a free account
3. Search for "ExerciseDB" in the API marketplace
4. Click on the ExerciseDB API
5. Click "Subscribe" to the free plan
6. Copy your API key from the dashboard

## Step 5: Update Your .env File

Open the [.env](file:///c:/spartan%20hub/.env) file in the root directory of the project and add your API keys:

```env
# API Ninjas
API_NINJAS_KEY=your_api_ninjas_key_here

# Edamam Nutrition API
EDAMAM_APP_ID=your_edamam_app_id_here
EDAMAM_APP_KEY=your_edamam_app_key_here

# FatSecret Platform API
FATSECRET_KEY=your_fatsecret_key_here
FATSECRET_SECRET=your_fatsecret_secret_here

# ExerciseDB API via RapidAPI
EXERCISEDB_KEY=your_exercisedb_key_here

# Ollama Configuration (usually no need to change)
OLLAMA_HOST=http://localhost:11434
```

## Step 6: Test Your Configuration

After adding your API keys, test the configuration:

```bash
npm run test:env
```

This will show which APIs are properly configured with valid keys.

## Need Help?

If you have trouble getting any of the API keys, you can:

1. Check that you're signed up for the free tier of each service
2. Make sure you've created applications where required
3. Verify that you've copied the correct keys
4. Restart the application after updating the .env file