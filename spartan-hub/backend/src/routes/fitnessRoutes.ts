import { Router, Request, Response } from 'express';
import axios from 'axios';
import { ConcurrencyLimiter, NUTRITION_API_CONCURRENCY_LIMITER, EXERCISE_API_CONCURRENCY_LIMITER } from '../utils/concurrencyLimiter';
import { validate } from '../middleware/validate';
import { muscleParamSchema, exerciseSearchSchema, nutritionSchema } from '../schemas/fitnessSchema';

const router = Router();

export default router;