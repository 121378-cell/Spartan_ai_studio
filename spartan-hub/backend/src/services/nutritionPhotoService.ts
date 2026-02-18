/**
 * Nutrition Photo Intelligence Service
 * 
 * Analyzes food photos using Gemini Vision API to automatically
 * identify food items and estimate nutritional information.
 */

import { logger } from '../utils/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface NutritionData {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  servingSize: string;
  confidence: number;
  alternatives?: string[];
}

export interface PhotoAnalysisResult {
  userId: string;
  photoUrl: string;
  timestamp: Date;
  detectedFoods: NutritionData[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  suggestions: string[];
}

export class NutritionPhotoService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
  }

  /**
   * Analyze a food photo and return nutrition data
   */
  async analyzePhoto(photoBuffer: Buffer, userId: string): Promise<PhotoAnalysisResult> {
    try {
      logger.info('Analyzing nutrition photo', { context: 'nutrition-photo', userId });

      // 1. Convert buffer to base64
      const base64Image = photoBuffer.toString('base64');

      // 2. Call Gemini Vision API
      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg',
          },
        },
        {
          text: `Analyze this food photo and provide nutritional information in JSON format:
          {
            "foods": [
              {
                "name": "food name",
                "calories": number,
                "protein": number (grams),
                "carbs": number (grams),
                "fat": number (grams),
                "fiber": number (grams),
                "sugar": number (grams),
                "servingSize": "description",
                "confidence": number (0-100)
              }
            ],
            "suggestions": ["healthy alternative 1", "tip 2"]
          }
          
          Be accurate and realistic with portion sizes.`,
        },
      ]);

      const {response} = result;
      const text = response.text();

      // 3. Parse the response
      const parsedData = this.parseResponse(text);

      // 4. Calculate totals
      const totalNutrition = this.calculateTotals(parsedData.foods);

      // 5. Build result
      const analysis: PhotoAnalysisResult = {
        userId,
        photoUrl: `https://storage.spartan-hub.com/nutrition/${userId}/${Date.now()}.jpg`,
        timestamp: new Date(),
        detectedFoods: parsedData.foods,
        totalNutrition,
        suggestions: parsedData.suggestions,
      };

      // 6. Save to database
      await this.saveAnalysis(analysis);

      logger.info('Nutrition photo analyzed successfully', {
        context: 'nutrition-photo',
        userId,
        metadata: { foods: analysis.detectedFoods.length },
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze nutrition photo', {
        context: 'nutrition-photo',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parse Gemini response text to structured data
   */
  private parseResponse(text: string): { foods: NutritionData[]; suggestions: string[] } {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        foods: data.foods || [],
        suggestions: data.suggestions || [],
      };
    } catch (error) {
      logger.error('Failed to parse Gemini response', {
        context: 'nutrition-photo',
        error: error instanceof Error ? error.message : String(error),
      });

      // Return default data
      return {
        foods: [{
          foodName: 'Unknown food',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          servingSize: 'Unknown',
          confidence: 0,
        }],
        suggestions: ['Unable to identify food clearly. Try a clearer photo.'],
      };
    }
  }

  /**
   * Calculate total nutrition from all detected foods
   */
  private calculateTotals(foods: NutritionData[]): { calories: number; protein: number; carbs: number; fat: number } {
    return foods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.calories,
        protein: totals.protein + food.protein,
        carbs: totals.carbs + food.carbs,
        fat: totals.fat + food.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  /**
   * Save analysis to database
   */
  async saveAnalysis(analysis: PhotoAnalysisResult): Promise<void> {
    // In production, save to database
    logger.info('Nutrition analysis saved', {
      context: 'nutrition-photo',
      userId: analysis.userId,
      metadata: { timestamp: analysis.timestamp.toISOString() },
    });
  }

  /**
   * Get user's nutrition history
   */
  async getUserNutritionHistory(userId: string, days: number = 7): Promise<PhotoAnalysisResult[]> {
    // In production, query database
    logger.info('Fetching nutrition history', { context: 'nutrition-photo', userId, metadata: { days } });
    return [];
  }

  /**
   * Get nutrition trends and insights
   */
  async getNutritionInsights(userId: string): Promise<{
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    recommendations: string[];
  }> {
    const history = await this.getUserNutritionHistory(userId, 30);

    if (history.length === 0) {
      return {
        avgCalories: 0,
        avgProtein: 0,
        avgCarbs: 0,
        avgFat: 0,
        recommendations: ['Start logging your meals to get insights'],
      };
    }

    const totals = history.reduce(
      (acc, day) => ({
        calories: acc.calories + day.totalNutrition.calories,
        protein: acc.protein + day.totalNutrition.protein,
        carbs: acc.carbs + day.totalNutrition.carbs,
        fat: acc.fat + day.totalNutrition.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const count = history.length;

    return {
      avgCalories: Math.round(totals.calories / count),
      avgProtein: Math.round(totals.protein / count),
      avgCarbs: Math.round(totals.carbs / count),
      avgFat: Math.round(totals.fat / count),
      recommendations: this.generateRecommendations(totals, count),
    };
  }

  /**
   * Generate personalized nutrition recommendations
   */
  private generateRecommendations(totals: any, count: number): string[] {
    const avgCalories = totals.calories / count;
    const recommendations: string[] = [];

    if (avgCalories > 2500) {
      recommendations.push('Consider reducing portion sizes to meet your calorie goals');
    } else if (avgCalories < 1500) {
      recommendations.push('You might be undereating. Consider adding healthy snacks');
    }

    const avgProtein = totals.protein / count;
    if (avgProtein < 100) {
      recommendations.push('Try to increase protein intake for better muscle recovery');
    }

    return recommendations;
  }

  /**
   * Compare food with healthier alternatives
   */
  async getHealthierAlternatives(foodName: string): Promise<string[]> {
    const alternatives: Record<string, string[]> = {
      'pizza': ['Cauliflower crust pizza', 'Zucchini pizza bites', 'Whole wheat flatbread'],
      'burger': ['Turkey burger', 'Veggie burger', 'Lettuce wrap burger'],
      'fries': ['Baked sweet potato fries', 'Zucchini fries', 'Air-fried potato wedges'],
      'soda': ['Sparkling water', 'Kombucha', 'Infused water'],
      'chips': ['Baked kale chips', 'Roasted chickpeas', 'Air-popped popcorn'],
    };

    return alternatives[foodName.toLowerCase()] || ['Try a healthier homemade version'];
  }

  /**
   * Get daily nutrition log for a user
   */
  async getDailyLog(userId: string, date: Date): Promise<PhotoAnalysisResult[]> {
    logger.info('Fetching daily nutrition log', {
      context: 'nutrition-photo',
      userId,
      metadata: { date: date.toISOString() }
    });

    // In production, query database
    return [];
  }

  /**
   * Get nutrition insights for a user
   */
  async getInsights(userId: string, days: number = 7): Promise<{
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    trends: string[];
    recommendations: string[];
  }> {
    logger.info('Fetching nutrition insights', {
      context: 'nutrition-photo',
      userId,
      metadata: { days }
    });

    // In production, query database and calculate insights
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      trends: [],
      recommendations: []
    };
  }

  /**
   * Delete a nutrition log entry
   */
  async deleteEntry(entryId: string, userId: string): Promise<void> {
    logger.info('Deleting nutrition entry', {
      context: 'nutrition-photo',
      userId,
      metadata: { entryId }
    });

    // In production, delete from database
  }

  /**
   * Get nutrition trends over time
   */
  async getTrends(userId: string, days: number = 30): Promise<{
    dates: string[];
    calories: number[];
    protein: number[];
    carbs: number[];
    fat: number[];
  }> {
    logger.info('Fetching nutrition trends', {
      context: 'nutrition-photo',
      userId,
      metadata: { days }
    });

    // In production, query database and calculate trends
    return {
      dates: [],
      calories: [],
      protein: [],
      carbs: [],
      fat: []
    };
  }
}

// Singleton instance
export const nutritionPhotoService = new NutritionPhotoService();
