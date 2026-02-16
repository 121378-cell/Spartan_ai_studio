import { Router, Request, Response } from 'express';
import { validate } from '@/middleware/validate';
import { basicValidationSchema } from '@/schemas/healthSchema';

const router = Router();

// Test endpoint to check if API keys are loaded
router.get('/api-keys', validate(basicValidationSchema), (req: Request, res: Response) => {
  // Check which API keys are configured
  const apiKeys = {
    apiNinjas: Boolean(process.env.API_NINJAS_KEY),
    edamam: Boolean(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY),
    fatSecret: Boolean(process.env.FATSECRET_KEY && process.env.FATSECRET_SECRET),
    exerciseDb: Boolean(process.env.EXERCISEDB_KEY),
    ollamaHost: process.env.OLLAMA_HOST || 'Not set (using default)'
  };

  res.status(200).json({
    message: 'API Key Configuration Status',
    apiKeys,
    instructions: 'Configure API keys in the .env file in the root directory'
  });
});

export default router;