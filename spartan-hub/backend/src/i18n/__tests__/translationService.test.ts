import { describe, it, expect, beforeEach } from '@jest/globals';
import { translationService } from '../translationService';
import { coachTranslations } from '../coachTranslations';

describe('Coach Translation Service', () => {
  beforeEach(() => {
    translationService.setLanguage('es');
  });

  describe('translate', () => {
    it('should translate keys to Spanish by default', () => {
      const title = translationService.translate('coach.alerts.lowTechnicalEfficiency.title');
      expect(title).toBe('🚨 Deterioro en la eficiencia técnica');
    });

    it('should translate to English when specified', () => {
      const title = translationService.translate('coach.alerts.lowTechnicalEfficiency.title', {}, 'en');
      expect(title).toBe('🚨 Technical efficiency deterioration');
    });

    it('should translate to French when specified', () => {
      const title = translationService.translate('coach.alerts.lowTechnicalEfficiency.title', {}, 'fr');
      expect(title).toBe('🚨 Détérioration de l\'efficacité technique');
    });

    it('should interpolate parameters', () => {
      const message = translationService.translate(
        'coach.alerts.nervousSystemProtection.message',
        { load: '75' }
      );
      expect(message).toContain('75%');
    });

    it('should return key for unknown translations', () => {
      const result = translationService.translate('unknown.key');
      expect(result).toBe('unknown.key');
    });
  });

  describe('getAlertTranslation', () => {
    it('should return full alert translation object', () => {
      const alert = translationService.getAlertTranslation('lowTechnicalEfficiency');
      
      expect(alert.title).toContain('eficiencia técnica');
      expect(alert.action).toContain('20%');
      expect(alert.benefit).toContain('articulaciones');
    });

    it('should interpolate params in alert messages', () => {
      const alert = translationService.getAlertTranslation('nervousSystemProtection', { load: '85' });
      
      expect(alert.message).toContain('85%');
    });
  });

  describe('getFeedbackTranslation', () => {
    it('should translate push-up feedback', () => {
      const feedback = translationService.getFeedbackTranslation('pushUp', 'lowDepth');
      expect(feedback).toContain('profundas');
    });

    it('should translate plank feedback', () => {
      const feedback = translationService.getFeedbackTranslation('plank', 'bodyMisalignment');
      expect(feedback).toContain('línea recta');
    });

    it('should translate row feedback', () => {
      const feedback = translationService.getFeedbackTranslation('row', 'incompletePull');
      expect(feedback).toContain('codos');
    });
  });

  describe('language switching', () => {
    it('should switch language correctly', () => {
      translationService.setLanguage('en');
      expect(translationService.getLanguage()).toBe('en');
      
      const feedback = translationService.getFeedbackTranslation('pushUp', 'lowDepth');
      expect(feedback).toContain('deeper');
    });
  });

  describe('action and readiness translations', () => {
    it('should translate action types', () => {
      const action = translationService.getActionTranslation('trainingAdjustment');
      expect(action).toBe('Ajuste de entrenamiento');
    });

    it('should translate readiness levels', () => {
      const readiness = translationService.getReadinessTranslation('excellent');
      expect(readiness).toBe('Excelente');
    });

    it('should translate risk levels', () => {
      const risk = translationService.getRiskTranslation('critical');
      expect(risk).toBe('Crítico');
    });
  });

  describe('all languages available', () => {
    it('should have Spanish translations', () => {
      expect(coachTranslations.es).toBeDefined();
      expect(coachTranslations.es.coach.alerts).toBeDefined();
    });

    it('should have English translations', () => {
      expect(coachTranslations.en).toBeDefined();
      expect(coachTranslations.en.coach.alerts).toBeDefined();
    });

    it('should have French translations', () => {
      expect(coachTranslations.fr).toBeDefined();
      expect(coachTranslations.fr.coach.alerts).toBeDefined();
    });
  });
});
