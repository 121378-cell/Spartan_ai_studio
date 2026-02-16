import { Request } from 'express';

/**
 * Helper function to translate a key with optional parameters
 * @param req Express request object containing the t function
 * @param key Translation key
 * @param options Optional translation options/parameters
 * @returns Translated string
 */
export const translate = (req: Request, key: string, options?: Record<string, any>): string => {
  if (typeof req.t === 'function') {
    const result = req.t(key, options);
    // Handle different return types from i18next
    if (typeof result === 'string') {
      return result;
    } else if (typeof result === 'object' && result !== null && 'res' in result) {
      return (result as { res: string }).res as string;
    }
    return String(result);
  }
  return key; // Fallback to key if translation function is not available
};

/**
 * Helper function to get current language
 * @param req Express request object
 * @returns Current language code
 */
export const getCurrentLanguage = (req: Request): string => {
  return req.language || 'en';
};

/**
 * Helper function to create a localized response
 * @param req Express request object
 * @param success Whether the operation was successful
 * @param message Message key to translate
 * @param data Optional data to include in response
 * @param options Optional translation options
 * @returns Localized response object
 */
export const createLocalizedResponse = (
  req: Request,
  success: boolean,
  message: string,
  data?: Record<string, any>,
  options?: Record<string, any>
): unknown => {
  const translatedMessage = translate(req, message, options);
  
  const response: Record<string, any> = {
    success,
    message: translatedMessage
  };
  
  if (data) {
    response.data = data;
  }
  
  return response;
};

export default {
  translate,
  getCurrentLanguage,
  createLocalizedResponse
};
