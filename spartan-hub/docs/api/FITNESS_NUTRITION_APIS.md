# Free Fitness and Nutrition APIs Integration Guide

This document explains how to integrate free fitness and nutrition APIs with the Spartan Hub application.

## Overview

The Spartan Hub application now includes a [fitnessNutritionService](file:///c:/spartan%20hub/services/fitnessNutritionService.ts#L33-L276) that can connect to multiple free APIs for workout planning and nutrition tracking. The service includes fallback mechanisms to ensure functionality even if some APIs are not available.

## Supported APIs

### 1. API Ninjas (Free Tier Available)
- **Website**: https://api-ninjas.com/
- **Free Tier**: 10,000 requests/month
- **Endpoints Used**:
  - Exercises API: Search exercises by muscle group or name
  - Nutrition API: Get nutrition information for food items

**Setup**:
1. Sign up at https://api-ninjas.com/
2. Get your API key from the dashboard
3. Set the environment variable: `API_NINJAS_KEY=your_api_key_here`

### 2. Edamam Nutrition API (Free Tier Available)
- **Website**: https://www.edamam.com/
- **Free Tier**: 10,000 requests/month
- **Endpoint Used**:
  - Nutrition Analysis API: Get detailed nutrition information

**Setup**:
1. Sign up at https://www.edamam.com/
2. Create a new application to get your App ID and App Key
3. Set the environment variables:
   - `EDAMAM_APP_ID=your_app_id_here`
   - `EDAMAM_APP_KEY=your_app_key_here`

### 3. FatSecret Platform API (Free Tier Available)
- **Website**: https://platform.fatsecret.com/
- **Free Tier**: 5,000 requests/day
- **Endpoints Used**:
  - Food Database API: Search for food items and get nutrition information

**Setup**:
1. Sign up at https://platform.fatsecret.com/
2. Register your application to get your Consumer Key and Consumer Secret
3. Set the environment variables:
   - `FATSECRET_KEY=your_consumer_key_here`
   - `FATSECRET_SECRET=your_consumer_secret_here`

### 4. ExerciseDB API (Free Tier via RapidAPI)
- **Website**: https://github.com/ExerciseDB/exercisedb-api
- **Free Tier**: 500 requests/month via RapidAPI
- **Endpoint Used**:
  - Exercise Database API: Get detailed exercise information

**Setup**:
1. Sign up at https://rapidapi.com/
2. Subscribe to the ExerciseDB API
3. Get your API key from the dashboard
4. Set the environment variable: `EXERCISEDB_KEY=your_api_key_here`

## Environment Configuration

To use these APIs, you need to set the appropriate environment variables. You can do this by creating a `.env` file in the root directory of the project:

```env
API_NINJAS_KEY=your_api_ninjas_key_here
EDAMAM_APP_ID=your_edamam_app_id_here
EDAMAM_APP_KEY=your_edamam_app_key_here
FATSECRET_KEY=your_fatsecret_key_here
FATSECRET_SECRET=your_fatsecret_secret_here
EXERCISEDB_KEY=your_exercisedb_key_here
```

## Service Functions

The [fitnessNutritionService](file:///c:/spartan%20hub/services/fitnessNutritionService.ts#L33-L276) provides the following functions:

### searchExercisesByMuscle(muscle: string)
Search for exercises targeting a specific muscle group.
- **Fallback**: Uses API Ninjas first, then ExerciseDB

### searchExercisesByName(name: string)
Search for exercises by name or partial name.
- **Primary**: API Ninjas

### getNutritionInfo(foodItems: string[])
Get nutrition information for a list of food items.
- **Fallback**: FatSecret → Edamam → API Ninjas

### generateWorkoutPlan(preferences: any)
Generate a workout plan based on user preferences.
- **Note**: Currently returns a mock plan, but can be extended to use AI workout planner APIs

### getExerciseRecommendations(userProfile: any)
Get exercise recommendations based on user profile data.
- **Logic**: Analyzes user's training cycle phase to recommend appropriate exercises

## Testing

To test the service, run:
```bash
node test-fitness-nutrition-service.js
```

## Integration with Spartan Hub

The service can be integrated into the Spartan Hub application by importing the functions where needed:

```typescript
import { searchExercisesByMuscle, getNutritionInfo } from '../services/fitnessNutritionService';
```

## Next Steps

1. Configure API keys for the services you want to use
2. Test the integration with the provided test script
3. Extend the service with additional APIs as needed
4. Implement UI components to display the data from these APIs