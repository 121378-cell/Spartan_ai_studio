# Spartan Hub Fitness and Nutrition API Integration Guide

This guide explains how to integrate and use the fitness and nutrition APIs with the Spartan Hub application.

## Overview

The Spartan Hub application now includes integration with multiple free fitness and nutrition APIs through the [fitnessNutritionService](file:///c:/spartan%20hub/services/fitnessNutritionService.ts#L33-L276). This service provides access to exercise databases, nutrition information, and workout planning capabilities.

## Prerequisites

1. API keys for the services you want to use (see [FITNESS_NUTRITION_APIS.md](file:///c:/spartan%20hub/FITNESS_NUTRITION_APIS.md) for setup instructions)
2. Node.js and npm installed
3. Spartan Hub application codebase

## Installation

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Compile the TypeScript service:
   ```bash
   npm run build:services
   ```

3. Or compile everything:
   ```bash
   npm run build:all
   ```

## Configuration

Set up environment variables for the APIs you want to use by creating a `.env` file in the root directory:

```env
API_NINJAS_KEY=your_api_ninjas_key
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
FATSECRET_KEY=your_fatsecret_key
FATSECRET_SECRET=your_fatsecret_secret
EXERCISEDB_KEY=your_exercisedb_key
```

## Usage

### Importing the Service

```typescript
import { 
  searchExercisesByMuscle, 
  searchExercisesByName, 
  getNutritionInfo, 
  generateWorkoutPlan, 
  getExerciseRecommendations 
} from '../services/fitnessNutritionService';
```

### Available Functions

1. **searchExercisesByMuscle(muscle: string)**
   ```typescript
   const exercises = await searchExercisesByMuscle('biceps');
   ```

2. **searchExercisesByName(name: string)**
   ```typescript
   const exercises = await searchExercisesByName('press');
   ```

3. **getNutritionInfo(foodItems: string[])**
   ```typescript
   const nutrition = await getNutritionInfo(['100g chicken breast', '1 apple']);
   ```

4. **generateWorkoutPlan(preferences: any)**
   ```typescript
   const plan = await generateWorkoutPlan({ focus: 'strength', duration: '45 minutes' });
   ```

5. **getExerciseRecommendations(userProfile: any)**
   ```typescript
   const recommendations = await getExerciseRecommendations(userProfile);
   ```

## Testing

Run the test script to verify the service is working:

```bash
node test-fitness-nutrition-service.js
```

## Demo Component

A demo component [FitnessNutritionDemo.tsx](file:///c:/spartan%20hub/components/FitnessNutritionDemo.tsx) is included to show how to use the service in the UI. To use it:

1. Import the component in your App.tsx or another component:
   ```typescript
   import FitnessNutritionDemo from './components/FitnessNutritionDemo';
   ```

2. Add it to your JSX:
   ```jsx
   <FitnessNutritionDemo />
   ```

## Fallback Mechanisms

The service includes fallback mechanisms to ensure functionality even if some APIs are not available:

1. **Exercise Search**: API Ninjas → ExerciseDB
2. **Nutrition Info**: FatSecret → Edamam → API Ninjas

## Extending the Service

To add more APIs or extend functionality:

1. Add new API keys to the environment variables
2. Update the service functions to use the new APIs
3. Add fallback mechanisms as needed
4. Update the types in [types.ts](file:///c:/spartan%20hub/types.ts) if needed

## Troubleshooting

1. **No data returned**: Check that API keys are correctly configured
2. **Rate limiting**: Most free APIs have rate limits; implement caching if needed
3. **Compilation errors**: Ensure TypeScript is properly installed and configured

## Next Steps

1. Configure API keys for the services you want to use
2. Test the integration with your API keys
3. Implement UI components to display the data
4. Extend the service with additional APIs as needed
5. Add error handling and user feedback