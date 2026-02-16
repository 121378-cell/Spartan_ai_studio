import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { tokenService } from '../services/tokenService';
import { logger } from '../utils/logger';

/**
 * Refresh access token using refresh token from cookie
 * @param req - Express request object containing refresh token cookie
 * @param res - Express response object
 * @returns Promise<void>
 * @description Uses refresh token from cookie to generate new access and refresh tokens, sets secure cookies
 */
export const refreshToken = async (
  req: Request & { cookies?: { [key: string]: string } },
  res: Response
): Promise<void> => {
  try {
    // Get refresh token from cookie
    const refreshTokenCookie = req.cookies?.refresh_token;
    
    if (!refreshTokenCookie) {
      res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
      return;
    }

    // Rotate refresh token and get new token pair
    const tokenPair = await tokenService.rotateRefreshToken(refreshTokenCookie);

    // Set new secure cookies
    tokenService.setSecureCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully'
    });
  } catch (error) {
    logger.error('Token refresh error', { context: 'token', metadata: { error } });

    // Clear invalid cookies
    tokenService.clearSecureCookies(res);

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Logout user and revoke all their session tokens
 * @param req - Express request object with authenticated user
 * @param res - Express response object
 * @returns Promise<void>
 * @description Destroys user session and revokes all refresh tokens, clears secure cookies
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { user } = req;
    
    if (user && user.userId) {
      // Revoke all refresh tokens for this user
      await tokenService.revokeAllUserTokens(user.userId);
    }

    // Clear secure cookies
    tokenService.clearSecureCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', { context: 'token', metadata: { error: error instanceof Error ? error.message : String(error) } });
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Revoke a specific refresh token
 * @param req - Express request object containing token in body
 * @param res - Express response object
 * @returns Promise<void>
 * @description Revokes a specific refresh token by validating token and calling token service
 */
export const revokeToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token is required'
      });
      return;
    }

    await tokenService.revokeRefreshToken(token);

    res.status(200).json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    logger.error('Token revocation error', { context: 'token', metadata: { error } });
    res.status(500).json({
      success: false,
      message: 'Token revocation failed'
    });
  }
};
