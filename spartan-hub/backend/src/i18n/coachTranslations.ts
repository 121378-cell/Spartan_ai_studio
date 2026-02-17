export type SupportedLanguage = 'en' | 'es' | 'fr';

export const coachTranslations = {
  en: {
    coach: {
      alerts: {
        nervousSystemProtection: {
          title: '🧠 Your nervous system needs rest',
          message: 'We detected low HRV ({{load}}% load) and high stress. Your body needs active recovery today. We have adjusted your training plan.',
          action: 'Active recovery session: Walk 30min + Yoga 20min',
          benefit: 'Activate parasympathetic, reduce stress, restore HRV'
        },
        overtrainingDetected: {
          title: '⚠️ Signs of overtraining detected',
          message: 'Your resting heart rate increased, HRV is dropping, and you are sleeping little. We need to slow down to prevent injuries. You will rest for the next 2 days.',
          action: '2-day deload: Only light activity and passive recovery',
          benefit: 'Prevent burnout, restore homeostasis, improve HRV'
        },
        optimalTrainingWindow: {
          title: '💪 Perfect day to train hard!',
          message: 'Your HRV is excellent, you sleep well, and your stress is low. This is the ideal time for a high-intensity session. Maximum performance!',
          action: 'High Intensity session: 90min at 80-95% max HR',
          benefit: 'Maximize adaptation, performance gains'
        },
        recoveryDeficiency: {
          title: '🔄 Recovery intervention required',
          message: 'We detected signs of deficient recovery. Your resting heart rate is elevated, HRV is low, and you are not sleeping enough. Immediate intervention needed.',
          action: 'Sleep protocol: Melatonin + cold room + 20min massage + hydration',
          benefit: 'Restore sleep quality, lower resting heart rate, improve HRV'
        },
        chronicStress: {
          title: '😰 Chronic stress detected',
          message: 'Your stress has been high for 3+ consecutive days. We need to reduce your training load and increase mental recovery techniques.',
          action: 'Reduce training -30% intensity + Meditation +10min/day + diaphragmatic breathing',
          benefit: 'Reduce chronic stress, activate parasympathetic, improve well-being'
        },
        lowTechnicalEfficiency: {
          title: '🚨 Technical efficiency deterioration',
          message: 'Your last AI Form Analysis session showed degradation in technique. This drastically increases your injury risk under fatigue.',
          action: 'Lower weight by 20% and prioritize controlled tempo (3-0-3-0)',
          benefit: 'Re-solidify movement patterns and protect joints'
        }
      },
      feedback: {
        pushUp: {
          lowDepth: 'Aim for deeper push-ups - chest closer to ground',
          saggingBack: 'Maintain a straight line from head to heels',
          elbowFlare: 'Keep elbows closer to body at 45 degrees',
          incompleteExtension: 'Fully extend arms at the top of each rep',
          excellent: 'Excellent push-up form!'
        },
        plank: {
          bodyMisalignment: 'Keep body in a straight line from head to heels',
          hipPosition: 'Avoid sagging or piking hips',
          coreEngagement: 'Engage your core more actively',
          shoulderStability: 'Keep shoulders stacked over wrists',
          excellent: 'Perfect plank position maintained!'
        },
        row: {
          incompletePull: 'Pull elbows further back for full contraction',
          roundedBack: 'Maintain neutral spine throughout the movement',
          limitedRetraction: 'Focus on squeezing shoulder blades together at top of pull',
          torsoAngle: 'Maintain consistent hinge angle throughout exercise',
          excellent: 'Excellent row technique with great scapular retraction!'
        },
        squat: {
          insufficientDepth: 'Aim for deeper knee flexion - thighs parallel to ground',
          kneeCave: 'Push knees out in line with toes',
          forwardLean: 'Keep chest up, maintain more upright torso',
          excellent: 'Excellent squat depth and form!'
        },
        deadlift: {
          hipHinge: 'Focus on pushing hips back, not just bending knees',
          backRounding: 'Maintain neutral spine throughout the lift',
          barPath: 'Keep bar close to body, drag along legs',
          lockout: 'Stand tall at top, squeeze glutes without hyperextending',
          excellent: 'Excellent deadlift technique!'
        }
      },
      actions: {
        trainingAdjustment: 'Training adjustment',
        alert: 'Alert',
        intervention: 'Intervention',
        monitoring: 'Monitoring'
      },
      readiness: {
        excellent: 'Excellent',
        good: 'Good',
        limited: 'Limited',
        restricted: 'Restricted'
      },
      risk: {
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
        critical: 'Critical'
      }
    }
  },
  es: {
    coach: {
      alerts: {
        nervousSystemProtection: {
          title: '🧠 Tu sistema nervioso necesita descanso',
          message: 'Detectamos HRV baja ({{load}}% de carga) y estrés alto. Tu cuerpo necesita recuperación activa hoy. Hemos ajustado tu plan de entrenamiento.',
          action: 'Sesión de recuperación activa: Caminar 30min + Yoga 20min',
          benefit: 'Activar parasimpático, reducir estrés, restaurar HRV'
        },
        overtrainingDetected: {
          title: '⚠️ Señales de sobre-entrenamiento detectadas',
          message: 'Tu FC en reposo aumentó, HRV está bajando y duermes poco. Necesitamos frenar para prevenir lesiones. Descansarás los próximos 2 días.',
          action: 'Descarga de 2 días: Solo actividad ligera y recuperación pasiva',
          benefit: 'Prevenir burnout, restaurar homeostasis, mejorar HRV'
        },
        optimalTrainingWindow: {
          title: '💪 ¡Día perfecto para entrenar fuerte!',
          message: 'Tu HRV está excelente, duermes bien y tu estrés es bajo. Este es el momento ideal para una sesión de alta intensidad. ¡Máximo rendimiento!',
          action: 'Sesión High Intensity: 90min a 80-95% FCmax',
          benefit: 'Maximizar adaptación, ganancia de rendimiento'
        },
        recoveryDeficiency: {
          title: '🔄 Intervención de recuperación requerida',
          message: 'Detectamos signos de recuperación deficiente. Tu FC en reposo está elevada, HRV baja y no estás durmiendo suficiente. Necesitas intervención inmediata.',
          action: 'Protocolo de sueño: Melatonina + habitación fría + Masaje 20min + Hidratación',
          benefit: 'Restaurar calidad de sueño, bajar FC en reposo, mejorar HRV'
        },
        chronicStress: {
          title: '😰 Estrés crónico detectado',
          message: 'Tu estrés ha estado alto 3+ días seguidos. Necesitamos reducir tu carga de entrenamiento e incrementar técnicas de recuperación mental.',
          action: 'Reducir entrenamiento -30% intensidad + Meditación +10min/día + Respiración diafragmática',
          benefit: 'Reducir estrés crónico, activar parasimpático, mejorar bienestar'
        },
        lowTechnicalEfficiency: {
          title: '🚨 Deterioro en la eficiencia técnica',
          message: 'Tu última sesión de AI Form Analysis mostró una degradación en la técnica. Esto aumenta drásticamente tu riesgo de lesión bajo fatiga.',
          action: 'Bajar peso un 20% y priorizar "tempo" controlado (3-0-3-0)',
          benefit: 'Re-solidificar patrones de movimiento y proteger articulaciones'
        }
      },
      feedback: {
        pushUp: {
          lowDepth: 'Apunta a flexiones más profundas - pecho más cerca del suelo',
          saggingBack: 'Mantén una línea recta de cabeza a talones',
          elbowFlare: 'Mantén los codos más cerca del cuerpo a 45 grados',
          incompleteExtension: 'Extiende completamente los brazos en la parte superior',
          excellent: '¡Excelente forma en las flexiones!'
        },
        plank: {
          bodyMisalignment: 'Mantén el cuerpo en línea recta de cabeza a talones',
          hipPosition: 'Evita que las caderas caigan o se eleven demasiado',
          coreEngagement: 'Activa más el core de forma activa',
          shoulderStability: 'Mantén los hombros alineados sobre las muñecas',
          excellent: '¡Posición de plancha perfecta mantenida!'
        },
        row: {
          incompletePull: 'Tira de los codos más hacia atrás para contracción completa',
          roundedBack: 'Mantén la columna neutral durante todo el movimiento',
          limitedRetraction: 'Enfócate en apretar los omóplatos juntos en la parte superior',
          torsoAngle: 'Mantén un ángulo de bisagra consistente durante el ejercicio',
          excellent: '¡Excelente técnica de remo con gran retracción escapular!'
        },
        squat: {
          insufficientDepth: 'Apunta a mayor flexión de rodillas - muslos paralelos al suelo',
          kneeCave: 'Empuja las rodillas hacia afuera en línea con los dedos de los pies',
          forwardLean: 'Mantén el pecho arriba, torso más vertical',
          excellent: '¡Excelente profundidad y forma en la sentadilla!'
        },
        deadlift: {
          hipHinge: 'Enfócate en empujar las caderas atrás, no solo doblar rodillas',
          backRounding: 'Mantén la columna neutral durante todo el levantamiento',
          barPath: 'Mantén la barra cerca del cuerpo, deslízala por las piernas',
          lockout: 'Párate derecho arriba, aprieta glúteos sin hiperextender',
          excellent: '¡Excelente técnica de peso muerto!'
        }
      },
      actions: {
        trainingAdjustment: 'Ajuste de entrenamiento',
        alert: 'Alerta',
        intervention: 'Intervención',
        monitoring: 'Monitoreo'
      },
      readiness: {
        excellent: 'Excelente',
        good: 'Bueno',
        limited: 'Limitado',
        restricted: 'Restringido'
      },
      risk: {
        low: 'Bajo',
        moderate: 'Moderado',
        high: 'Alto',
        critical: 'Crítico'
      }
    }
  },
  fr: {
    coach: {
      alerts: {
        nervousSystemProtection: {
          title: '🧠 Votre système nerveux a besoin de repos',
          message: 'Nous avons détecté une faible VFC ({{load}}% de charge) et un stress élevé. Votre corps a besoin de récupération active aujourd\'hui. Nous avons ajusté votre plan d\'entraînement.',
          action: 'Séance de récupération active : Marche 30min + Yoga 20min',
          benefit: 'Activer le parasympathique, réduire le stress, restaurer la VFC'
        },
        overtrainingDetected: {
          title: '⚠️ Signes de surentraînement détectés',
          message: 'Votre FC au repos a augmenté, la VFC baisse et vous dormez peu. Nous devons ralentir pour éviter les blessures. Vous reposerez les 2 prochains jours.',
          action: 'Décharge de 2 jours : Seule activité légère et récupération passive',
          benefit: 'Prévenir l\'épuisement, restaurer l\'homéostasie, améliorer la VFC'
        },
        optimalTrainingWindow: {
          title: '💪 Journée parfaite pour s\'entraîner dur !',
          message: 'Votre VFC est excellente, vous dormez bien et votre stress est bas. C\'est le moment idéal pour une séance de haute intensité. Performance maximale !',
          action: 'Séance haute intensité : 90min à 80-95% FCmax',
          benefit: 'Maximiser l\'adaptation, gains de performance'
        },
        recoveryDeficiency: {
          title: '🔄 Intervention de récupération requise',
          message: 'Nous avons détecté des signes de récupération déficiente. Votre FC au repos est élevée, la VFC est basse et vous ne dormez pas assez. Intervention immédiate nécessaire.',
          action: 'Protocole de sommeil : Mélatonine + chambre froide + Massage 20min + hydratation',
          benefit: 'Restaurer la qualité du sommeil, abaisser la FC au repos, améliorer la VFC'
        },
        chronicStress: {
          title: '😰 Stress chronique détecté',
          message: 'Votre stress est élevé depuis 3+ jours consécutifs. Nous devons réduire votre charge d\'entraînement et augmenter les techniques de récupération mentale.',
          action: 'Réduire l\'entraînement -30% intensité + Méditation +10min/jour + respiration diaphragmatique',
          benefit: 'Réduire le stress chronique, activer le parasympathique, améliorer le bien-être'
        },
        lowTechnicalEfficiency: {
          title: '🚨 Détérioration de l\'efficacité technique',
          message: 'Votre dernière session d\'analyse de forme IA a montré une dégradation de la technique. Cela augmente drastiquement votre risque de blessure sous fatigue.',
          action: 'Réduire le poids de 20% et privilégier un tempo contrôlé (3-0-3-0)',
          benefit: 'Re-solidifier les patterns de mouvement et protéger les articulations'
        }
      },
      feedback: {
        pushUp: {
          lowDepth: 'Visez des pompes plus profondes - poitrine plus près du sol',
          saggingBack: 'Maintenez une ligne droite de la tête aux talons',
          elbowFlare: 'Gardez les coudes plus près du corps à 45 degrés',
          incompleteExtension: 'Extendez complètement les bras en haut de chaque rép',
          excellent: 'Excellente forme de pompes !'
        },
        plank: {
          bodyMisalignment: 'Maintenez le corps en ligne droite de la tête aux talons',
          hipPosition: 'Évitez que les hanches s\'affaissent ou se soulèvent',
          coreEngagement: 'Engagez votre core plus activement',
          shoulderStability: 'Maintenez les épaules alignées au-dessus des poignets',
          excellent: 'Position de planche parfaite maintenue !'
        },
        row: {
          incompletePull: 'Tirez les coudes plus en arrière pour une contraction complète',
          roundedBack: 'Maintenez la colonne neutre tout au long du mouvement',
          limitedRetraction: 'Concentrez-vous sur le serrage des omoplates ensemble en haut',
          torsoAngle: 'Maintenez un angle de charnière constant pendant l\'exercice',
          excellent: 'Excellente technique de rame avec grande rétraction scapulaire !'
        },
        squat: {
          insufficientDepth: 'Visez une flexion de genoux plus profonde - cuisses parallèles au sol',
          kneeCave: 'Poussez les genoux vers l\'extérieur alignés avec les orteils',
          forwardLean: 'Gardez la poitrine haute, torse plus vertical',
          excellent: 'Excellente profondeur et forme de squat !'
        },
        deadlift: {
          hipHinge: 'Concentrez-vous sur le fait de pousser les hanches en arrière, pas seulement plier les genoux',
          backRounding: 'Maintenez la colonne neutre tout au long du soulevé',
          barPath: 'Gardez la barre près du corps, glissez le long des jambes',
          lockout: 'Tenez-vous droit en haut, serrez les fessiers sans hyperextender',
          excellent: 'Excellente technique de soulevé de terre !'
        }
      },
      actions: {
        trainingAdjustment: 'Ajustement d\'entraînement',
        alert: 'Alerte',
        intervention: 'Intervention',
        monitoring: 'Surveillance'
      },
      readiness: {
        excellent: 'Excellent',
        good: 'Bon',
        limited: 'Limité',
        restricted: 'Restreint'
      },
      risk: {
        low: 'Faible',
        moderate: 'Modéré',
        high: 'Élevé',
        critical: 'Critique'
      }
    }
  }
};

export default coachTranslations;
