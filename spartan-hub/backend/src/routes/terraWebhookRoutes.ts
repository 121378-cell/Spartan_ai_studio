/**
 * Terra Webhook Routes
 * 
 * Handles incoming webhook events from Terra API.
 * 
 * Webhook events support:
 * - Data updates (activity, sleep, heart_rate, body)
 * - Connection events (error, revoked)
 * - Real-time data streaming
 * 
 * Public routes (signature verification required instead of JWT)
 */

import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { logger } from '../utils/logger';
import { getTerraHealthService } from '../services/terraHealthService';
import { eventBus } from '../services/eventBus';

const router = Router();
const terraService = getTerraHealthService();

interface WebhookRequest extends Request {
  body: any;
  headers: {
    'x-terra-signature'?: string;
    'x-terra-timestamp'?: string;
  };
}

/**
 * POST /api/webhooks/terra
 * Main webhook endpoint for Terra events
 *
 * Signature verification:
 * - Header: x-terra-signature
 * - HMAC-SHA256 of request body
 */
router.post(
  '/',
  async (req: WebhookRequest, res: Response): Promise<void> => {
    try {
      const signature = req.headers['x-terra-signature'];
      const timestamp = req.headers['x-terra-timestamp'];

      const isDev = process.env.NODE_ENV !== 'production';

      if ((!signature || !timestamp) && !isDev) {
        logger.warn('Webhook received without signature', {
          context: 'terra-webhook',
          metadata: { ip: req.ip }
        });
        return res.status(401).json({ success: false, message: 'Missing signature or timestamp' });
      }

      // In dev environment with express.json() already active, req.body might be an object
      const parsed = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body instanceof Buffer ? JSON.parse(req.body.toString('utf-8')) : req.body);

      logger.info('Received Terra webhook (JSON)', {
        context: 'terra-webhook',
        metadata: {
          eventType: parsed.type || parsed.data?.data_type,
          userId: parsed.user?.reference_id || parsed.data?.user_id
        }
      });

      const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(parsed));
      await terraService.handleWebhookEvent(parsed, signature as string, timestamp as string, rawBody);

      return res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      logger.error('Error processing Terra webhook', {
        context: 'terra-webhook',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      return res.status(401).json({ success: false, message: 'Invalid webhook' });
    }
  }
);

/**
 * POST /api/webhooks/terra/test
 * Test webhook endpoint (for debugging/testing)
 */
router.post(
  '/test',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'Test endpoint not available in production' });
      }

      logger.info('Received test Terra webhook', {
        context: 'terra-webhook-test',
        metadata: {
          eventType: req.body?.data?.data_type,
          userId: req.body?.data?.user_id
        }
      });

      // Log the payload for debugging
      logger.debug('Test webhook payload', {
        context: 'terra-webhook-test',
        metadata: { payload: req.body }
      });

      return res.status(200).json({
        success: true,
        message: 'Test webhook received',
        payload: req.body
      });
    } catch (error) {
      logger.error('Error processing test webhook', {
        context: 'terra-webhook-test',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({ success: false, message: (error as Error).message });
    }
  }
);

export default router;
