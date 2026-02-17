import { SupportedLanguage, coachTranslations } from './coachTranslations';

const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

class TranslationService {
  private currentLanguage: SupportedLanguage;

  constructor() {
    this.currentLanguage = this.detectLanguage();
  }

  private detectLanguage(): SupportedLanguage {
    const envLang = process.env.DEFAULT_LANGUAGE as SupportedLanguage;
    if (envLang && ['en', 'es', 'fr'].includes(envLang)) {
      return envLang;
    }
    return DEFAULT_LANGUAGE;
  }

  setLanguage(lang: SupportedLanguage): void {
    this.currentLanguage = lang;
  }

  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  private getNestedValue(obj: any, path: string): string | undefined {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  translate(key: string, params?: Record<string, string | number>, lang?: SupportedLanguage): string {
    const language = lang || this.currentLanguage;
    const translations = coachTranslations[language] || coachTranslations[DEFAULT_LANGUAGE];
    
    let text = this.getNestedValue(translations, key);
    
    if (!text) {
      const fallbackTranslations = coachTranslations[DEFAULT_LANGUAGE];
      text = this.getNestedValue(fallbackTranslations, key);
    }
    
    if (!text) {
      return key;
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text!.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }

    return text;
  }

  getAlertTranslation(alertKey: keyof typeof coachTranslations.es.coach.alerts, params?: Record<string, string | number>, lang?: SupportedLanguage) {
    return {
      title: this.translate(`coach.alerts.${alertKey}.title`, params, lang),
      message: this.translate(`coach.alerts.${alertKey}.message`, params, lang),
      action: this.translate(`coach.alerts.${alertKey}.action`, params, lang),
      benefit: this.translate(`coach.alerts.${alertKey}.benefit`, params, lang)
    };
  }

  getFeedbackTranslation(exercise: 'pushUp' | 'plank' | 'row' | 'squat' | 'deadlift', feedbackKey: string, lang?: SupportedLanguage): string {
    return this.translate(`coach.feedback.${exercise}.${feedbackKey}`, {}, lang);
  }

  getActionTranslation(actionKey: keyof typeof coachTranslations.es.coach.actions, lang?: SupportedLanguage): string {
    return this.translate(`coach.actions.${actionKey}`, {}, lang);
  }

  getReadinessTranslation(readinessKey: keyof typeof coachTranslations.es.coach.readiness, lang?: SupportedLanguage): string {
    return this.translate(`coach.readiness.${readinessKey}`, {}, lang);
  }

  getRiskTranslation(riskKey: keyof typeof coachTranslations.es.coach.risk, lang?: SupportedLanguage): string {
    return this.translate(`coach.risk.${riskKey}`, {}, lang);
  }
}

export const translationService = new TranslationService();
export default translationService;
