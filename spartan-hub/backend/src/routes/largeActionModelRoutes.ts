/**
 * Large Action Model Routes
 * 
 * API routes for autonomous AI actions (LAMs)
 */

import { Router } from 'express';
import {
  generateActionSequence,
  getPendingSequences,
  approveSequence,
  getSequenceStatus,
  executeSequence,
  triggerBiometricAction,
  triggerPredictiveAction
} from '../controllers/largeActionModelController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/lam/generate
 * @desc    Generate action sequence from trigger
 * @access  Private
 */
router.post('/generate', generateActionSequence);

/**
 * @route   GET /api/lam/pending/:userId
 * @desc    Get pending action sequences for user
 * @access  Private
 */
router.get('/pending/:userId', getPendingSequences);

/**
 * @route   POST /api/lam/approve/:sequenceId
 * @desc    Approve or reject action sequence
 * @access  Private
 */
router.post('/approve/:sequenceId', approveSequence);

/**
 * @route   GET /api/lam/sequence/:sequenceId
 * @desc    Get sequence status
 * @access  Private
 */
router.get('/sequence/:sequenceId', getSequenceStatus);

/**
 * @route   POST /api/lam/execute/:sequenceId
 * @desc    Execute approved sequence manually
 * @access  Private
 */
router.post('/execute/:sequenceId', executeSequence);

/**
 * @route   POST /api/lam/trigger/biometric
 * @desc    Trigger action from biometric alert
 * @access  Private
 */
router.post('/trigger/biometric', triggerBiometricAction);

/**
 * @route   POST /api/lam/trigger/predictive
 * @desc    Trigger predictive action
 * @access  Private
 */
router.post('/trigger/predictive', triggerPredictiveAction);

export default router;
