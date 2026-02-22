import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { reloadAiConfig } from '../../controllers/aiController';
import { AiProviderFactory } from '../../services/ai/AiProviderFactory';
import { logger } from '../../utils/logger';

// Mock AiProviderFactory
jest.mock('../../services/ai/AiProviderFactory');
// Mock logger
jest.mock('../../utils/logger');

describe('AI Configuration Reload', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reload AI configuration successfully', async () => {
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    await reloadAiConfig(req, res);

    expect(AiProviderFactory.resetProvider).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'AI provider configuration reloaded manually',
      expect.objectContaining({ context: 'aiController' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'AI provider configuration reloaded successfully.'
    });
  });

  it('should handle errors during reload', async () => {
    const error = new Error('Reload failed');
    (AiProviderFactory.resetProvider as jest.Mock).mockImplementationOnce(() => {
      throw error;
    });

    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    await reloadAiConfig(req, res);

    expect(AiProviderFactory.resetProvider).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Error reloading AI configuration',
      expect.objectContaining({
        context: 'aiController',
        metadata: { error: 'Reload failed' }
      })
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unable to reload AI configuration at this time.'
    });
  });
});
