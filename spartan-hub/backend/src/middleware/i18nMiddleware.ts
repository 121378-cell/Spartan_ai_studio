import { Request, Response, NextFunction } from 'express';
import { TFunction } from 'i18next';
import i18n, { SUPPORTED_LANGUAGES, SupportedLanguage, DEFAULT_LANGUAGE } from '../i18n/config';

declare global {
  namespace Express {
    interface Request {
      t: TFunction;
      language: string;
    }
  }
}

/**
 * Middleware to set up i18n for each request
 */
export const i18nMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get language from query param, cookie, or header
  let lang = req.query.lng as string ||
    req.cookies.i18next ||
    req.headers['accept-language']?.split(',')[0] ||
    DEFAULT_LANGUAGE;

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    lang = DEFAULT_LANGUAGE;
  }

  // Change language
  i18n.changeLanguage(lang);

  // Attach t function and language to request
  req.t = i18n.t;
  req.language = lang;

  next();
};

/**
 * Helper function to get supported languages
 */
export const getSupportedLanguages = (): readonly SupportedLanguage[] => {
  return SUPPORTED_LANGUAGES;
};

/**
 * Helper function to get default language
 */
export const getDefaultLanguage = (): SupportedLanguage => {
  return DEFAULT_LANGUAGE;
};

export default i18nMiddleware;