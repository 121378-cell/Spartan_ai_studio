# API Keys Setup Instructions

## Current Status
Your .env file has been updated with the API Ninjas key you provided, but it seems to be invalid. Let's get new keys for all services.

## Step-by-Step Setup

### 1. API Ninjas (Exercises and Nutrition API)
1. Go to https://api-ninjas.com/
2. Click "Get API Key"
3. Sign up for a free account
4. Copy your API key from the dashboard
5. Update your .env file:
   ```
   API_NINJAS_KEY=your_actual_api_key_here
   ```

### 2. Edamam Nutrition API
1. Go to https://www.edamam.com/
2. Click "Products" then "Nutrition Analysis API"
3. Click "Register" for the free "Developer" plan
4. Create a new application
5. Copy your App ID and App Key
6. Update your .env file:
   ```
   EDAMAM_APP_ID=your_app_id_here
   EDAMAM_APP_KEY=your_app_key_here
   ```

### 3. FatSecret Platform API
1. Go to https://platform.fatsecret.com/
2. Click "Register" for a free account
3. Register your application
4. Copy your Consumer Key and Consumer Secret
5. Update your .env file:
   ```
   FATSECRET_KEY=your_consumer_key_here
   FATSECRET_SECRET=your_consumer_secret_here
   ```

### 4. ExerciseDB API (via RapidAPI)
1. Go to https://rapidapi.com/
2. Sign up for a free account
3. Search for "ExerciseDB" in the API marketplace
4. Click on the ExerciseDB API
5. Click "Subscribe" to the free plan
6. Copy your API key from the dashboard
7. Update your .env file:
   ```
   EXERCISEDB_KEY=your_api_key_here
   ```

## Manual Update Method

You can manually edit the [.env](file:///c:/spartan%20hub/.env) file in the root directory and replace the placeholder values with your actual API keys.

## Verification

After updating your API keys, test the configuration:

```bash
npm run test:env
```

This will show which APIs are properly configured.