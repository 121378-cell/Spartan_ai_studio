/**
 * Marketplace Routes
 * 
 * API routes for expert marketplace (Fase 6)
 */

import { Router } from 'express';
import {
  registerExpert,
  getExperts,
  createContent,
  subscribe,
  getAvailableContent,
  addReview
} from '../controllers/marketplaceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/marketplace/experts/register
 * @desc    Register as expert/trainer
 * @access  Private
 */
router.post('/experts/register', registerExpert);

/**
 * @route   GET /api/marketplace/experts
 * @desc    Get experts list
 * @access  Private
 */
router.get('/experts', getExperts);

/**
 * @route   POST /api/marketplace/content
 * @desc    Create content (routines, tutorials, etc.)
 * @access  Private (experts only)
 */
router.post('/content', createContent);

/**
 * @route   POST /api/marketplace/subscribe
 * @desc    Subscribe to expert
 * @access  Private
 */
router.post('/subscribe', subscribe);

/**
 * @route   GET /api/marketplace/content/:userId
 * @desc    Get available content for user
 * @access  Private
 */
router.get('/content/:userId', getAvailableContent);

/**
 * @route   POST /api/marketplace/reviews
 * @desc    Add review for expert/content
 * @access  Private
 */
router.post('/reviews', addReview);

export default router;
