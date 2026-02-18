/**
 * Genetic Profile Service
 * 
 * Processes genetic data from 23andMe/Ancestry to create personalized
 * fitness and nutrition recommendations based on genetic variants.
 * 
 * Supported Genes:
 * - ACTN3: Power vs Endurance (muscle fiber composition)
 * - MCT1: Lactate clearance (recovery speed)
 * - VEGF: Oxygen delivery (endurance capacity)
 * - COL5A1: Collagen production (injury risk)
 * - CYP1A2: Caffeine metabolism
 * - PPARGC1A: Mitochondrial biogenesis
 * - FTO: Metabolism and weight management
 * - CLOCK: Chronotype and sleep patterns
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

export interface GeneticVariant {
  gene: string;
  rsid: string;
  genotype: string; // e.g., "AA", "AG", "GG"
  chromosome: string;
  position: number;
  confidence: number; // 0-100
}

export interface GeneticProfile {
  id: string;
  userId: string;
  source: '23andme' | 'ancestry' | 'manual';
  importedAt: Date;
  lastAnalyzedAt: Date;
  variants: GeneticVariant[];
  analysis: GeneticAnalysis;
  privacy: {
    consentGiven: boolean;
    dataRetentionDays: number;
    allowResearchUse: boolean;
    anonymizedId: string;
  };
}

export interface GeneticAnalysis {
  powerEnduranceProfile: PowerEnduranceProfile;
  recoveryProfile: RecoveryProfile;
  injuryRiskProfile: InjuryRiskProfile;
  caffeineMetabolism: CaffeineMetabolism;
  weightManagement: WeightManagementProfile;
  chronotype: ChronotypeProfile;
  overallRecommendations: string[];
}

export interface PowerEnduranceProfile {
  type: 'power' | 'endurance' | 'mixed';
  actn3Variant: string; // RR, RX, or XX
  muscleFiberComposition: {
    typeIIxPercentage: number; // Fast-twitch
    typeIPercentage: number; // Slow-twitch
  };
  recommendedSports: string[];
  trainingFocus: string[];
}

export interface RecoveryProfile {
  recoverySpeed: 'fast' | 'normal' | 'slow';
  mct1Variant: string;
  vegfVariant: string;
  lactateClearanceRate: number; // relative score 0-100
  recommendedRestDays: number;
  antiInflammatoryFoods: string[];
}

export interface InjuryRiskProfile {
  overallRisk: 'low' | 'moderate' | 'high';
  col5a1Variant: string;
  collagenQuality: number; // 0-100
  susceptibleAreas: string[];
  preventiveMeasures: string[];
  recommendedSupplements: string[];
}

export interface CaffeineMetabolism {
  type: 'fast' | 'slow' | 'normal';
  cyp1a2Variant: string;
  optimalTiming: string;
  maxDailyIntake: number; // mg
  performanceImpact: string;
}

export interface WeightManagementProfile {
  metabolicType: string;
  ftovariant: string;
  ppargc1aVariant: string;
  dietRecommendations: string[];
  exerciseIntensity: string;
  macros: {
    carbs: string;
    protein: string;
    fats: string;
  };
}

export interface ChronotypeProfile {
  type: 'morning' | 'evening' | 'intermediate';
  clockVariant: string;
  per3Variant: string;
  optimalWorkoutTime: string;
  sleepRecommendations: string[];
  peakPerformanceWindow: string;
}

export interface ImportResult {
  success: boolean;
  variantsImported: number;
  variantsAnalyzed: number;
  profileId: string;
  summary: string;
  nextSteps: string[];
}

// Gene-specific analysis configurations
const GENE_CONFIGS: Record<string, {
  rsid: string;
  alleles: Record<string, { trait: string; score: number; description: string }>;
}> = {
  ACTN3: {
    rsid: 'rs1815739',
    alleles: {
      'RR': { trait: 'power', score: 90, description: 'Optimizado para potencia y velocidad' },
      'RX': { trait: 'mixed', score: 60, description: 'Equilibrio entre potencia y resistencia' },
      'XX': { trait: 'endurance', score: 30, description: 'Optimizado para resistencia' }
    }
  },
  MCT1: {
    rsid: 'rs1049434',
    alleles: {
      'AA': { trait: 'fast_recovery', score: 85, description: 'Eliminación rápida de lactato' },
      'AT': { trait: 'normal_recovery', score: 60, description: 'Recuperación normal de lactato' },
      'TT': { trait: 'slow_recovery', score: 35, description: 'Eliminación lenta de lactato' }
    }
  },
  VEGF: {
    rsid: 'rs2010963',
    alleles: {
      'CC': { trait: 'high_endurance', score: 80, description: 'Excelente capacidad cardiovascular' },
      'CG': { trait: 'moderate_endurance', score: 60, description: 'Buena capacidad cardiovascular' },
      'GG': { trait: 'normal_endurance', score: 40, description: 'Capacidad cardiovascular estándar' }
    }
  },
  COL5A1: {
    rsid: 'rs12722',
    alleles: {
      'TT': { trait: 'high_flexibility', score: 30, description: 'Mayor riesgo de lesiones por laxitud articular' },
      'TC': { trait: 'moderate_flexibility', score: 50, description: 'Flexibilidad normal' },
      'CC': { trait: 'low_flexibility', score: 75, description: 'Menor riesgo de lesiones por sobrestiramiento' }
    }
  },
  CYP1A2: {
    rsid: 'rs762551',
    alleles: {
      'AA': { trait: 'fast_metabolizer', score: 85, description: 'Metaboliza cafeína rápidamente' },
      'AC': { trait: 'moderate_metabolizer', score: 60, description: 'Metabolismo moderado de cafeína' },
      'CC': { trait: 'slow_metabolizer', score: 35, description: 'Metaboliza cafeína lentamente' }
    }
  },
  FTO: {
    rsid: 'rs9939609',
    alleles: {
      'TT': { trait: 'low_obesity_risk', score: 80, description: 'Menor riesgo de obesidad' },
      'TA': { trait: 'moderate_obesity_risk', score: 60, description: 'Riesgo moderado de obesidad' },
      'AA': { trait: 'high_obesity_risk', score: 40, description: 'Mayor predisposición a ganar peso' }
    }
  },
  PPARGC1A: {
    rsid: 'rs8192678',
    alleles: {
      'GG': { trait: 'high_mitochondrial', score: 85, description: 'Alta eficiencia mitocondrial' },
      'GA': { trait: 'moderate_mitochondrial', score: 60, description: 'Eficiencia mitocondrial normal' },
      'AA': { trait: 'low_mitochondrial', score: 40, description: 'Eficiencia mitocondrial reducida' }
    }
  },
  CLOCK: {
    rsid: 'rs1801260',
    alleles: {
      'TT': { trait: 'morning_person', score: 80, description: 'Cronoipo matutino' },
      'TC': { trait: 'intermediate', score: 50, description: 'Cronoipo intermedio' },
      'CC': { trait: 'evening_person', score: 30, description: 'Cronoipo nocturno' }
    }
  },
  PER3: {
    rsid: 'rs228727',
    alleles: {
      'GG': { trait: 'short_sleeper', score: 75, description: 'Requiere menos sueño (6-7h)' },
      'GT': { trait: 'normal_sleeper', score: 60, description: 'Sueño normal (7-8h)' },
      'TT': { trait: 'long_sleeper', score: 40, description: 'Requiere más sueño (8-9h)' }
    }
  }
};

export class GeneticProfileService {
  private profiles: Map<string, GeneticProfile> = new Map();

  /**
   * Import genetic data from 23andMe/Ancestry format
   */
  async importGeneticData(
    userId: string,
    source: '23andme' | 'ancestry',
    rawData: string
  ): Promise<ImportResult> {
    try {
      logger.info('Starting genetic data import', {
        context: 'genetic-profile',
        metadata: { userId, source }
      });

      // Parse raw data
      const variants = this.parseRawGeneticData(rawData, source);
      
      if (variants.length === 0) {
        throw new ValidationError('No valid genetic variants found in the uploaded file');
      }

      // Create profile
      const profileId = this.generateProfileId();
      const analysis = this.analyzeGeneticVariants(variants);

      const profile: GeneticProfile = {
        id: profileId,
        userId,
        source,
        importedAt: new Date(),
        lastAnalyzedAt: new Date(),
        variants,
        analysis,
        privacy: {
          consentGiven: true,
          dataRetentionDays: 365 * 10, // 10 years
          allowResearchUse: false,
          anonymizedId: this.generateAnonymizedId()
        }
      };

      this.profiles.set(profileId, profile);

      logger.info('Genetic data imported successfully', {
        context: 'genetic-profile',
        metadata: {
          profileId,
          variantsImported: variants.length,
          userId
        }
      });

      return {
        success: true,
        variantsImported: variants.length,
        variantsAnalyzed: Object.keys(analysis).length,
        profileId,
        summary: this.generateSummary(analysis),
        nextSteps: this.generateNextSteps(analysis)
      };
    } catch (error) {
      logger.error('Failed to import genetic data', {
        context: 'genetic-profile',
        metadata: { userId, error }
      });
      throw error;
    }
  }

  /**
   * Parse raw genetic data from file
   */
  private parseRawGeneticData(
    rawData: string,
    source: '23andme' | 'ancestry'
  ): GeneticVariant[] {
    const variants: GeneticVariant[] = [];
    const lines = rawData.split('\n');

    // Skip header
    const startIndex = source === '23andme' ? 20 : 15;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const parts = line.split('\t');
      if (parts.length < 4) continue;

      // 23andMe format: rsid, chromosome, position, genotype
      // Ancestry format: rsid, chromosome, position, allele1, allele2
      if (source === '23andme') {
        const [rsid, chromosome, position, genotype] = parts;
        if (rsid.startsWith('rs') && genotype && genotype.length === 2) {
          variants.push({
            gene: this.getGeneFromRsid(rsid),
            rsid,
            genotype: genotype.toUpperCase(),
            chromosome,
            position: parseInt(position),
            confidence: 95
          });
        }
      } else {
        // Ancestry format
        const [rsid, chromosome, position, allele1, allele2] = parts;
        if (rsid.startsWith('rs')) {
          variants.push({
            gene: this.getGeneFromRsid(rsid),
            rsid,
            genotype: (allele1 + allele2).toUpperCase(),
            chromosome,
            position: parseInt(position),
            confidence: 95
          });
        }
      }
    }

    return variants;
  }

  /**
   * Get gene name from RSID
   */
  private getGeneFromRsid(rsid: string): string {
    for (const [gene, config] of Object.entries(GENE_CONFIGS)) {
      if (config.rsid === rsid) {
        return gene;
      }
    }
    return 'unknown';
  }

  /**
   * Analyze genetic variants and generate profiles
   */
  private analyzeGeneticVariants(variants: GeneticVariant[]): GeneticAnalysis {
    // Find relevant variants
    const actn3Variant = variants.find(v => v.rsid === GENE_CONFIGS.ACTN3.rsid);
    const mct1Variant = variants.find(v => v.rsid === GENE_CONFIGS.MCT1.rsid);
    const vegfVariant = variants.find(v => v.rsid === GENE_CONFIGS.VEGF.rsid);
    const col5a1Variant = variants.find(v => v.rsid === GENE_CONFIGS.COL5A1.rsid);
    const cyp1a2Variant = variants.find(v => v.rsid === GENE_CONFIGS.CYP1A2.rsid);
    const ftoVariant = variants.find(v => v.rsid === GENE_CONFIGS.FTO.rsid);
    const ppargc1aVariant = variants.find(v => v.rsid === GENE_CONFIGS.PPARGC1A.rsid);
    const clockVariant = variants.find(v => v.rsid === GENE_CONFIGS.CLOCK.rsid);
    const per3Variant = variants.find(v => v.rsid === GENE_CONFIGS.PER3.rsid);

    return {
      powerEnduranceProfile: this.analyzePowerEndurance(actn3Variant),
      recoveryProfile: this.analyzeRecovery(mct1Variant, vegfVariant),
      injuryRiskProfile: this.analyzeInjuryRisk(col5a1Variant),
      caffeineMetabolism: this.analyzeCaffeineMetabolism(cyp1a2Variant),
      weightManagement: this.analyzeWeightManagement(ftoVariant, ppargc1aVariant),
      chronotype: this.analyzeChronotype(clockVariant, per3Variant),
      overallRecommendations: this.generateOverallRecommendations(
        actn3Variant, mct1Variant, col5a1Variant, ftoVariant
      )
    };
  }

  /**
   * Analyze ACTN3 for power/endurance
   */
  private analyzePowerEndurance(variant?: GeneticVariant): PowerEnduranceProfile {
    const genotype = variant?.genotype || 'RX';
    const config = GENE_CONFIGS.ACTN3.alleles[genotype] || GENE_CONFIGS.ACTN3.alleles['RX'];

    let type: 'power' | 'endurance' | 'mixed' = 'mixed';
    if (genotype === 'RR') type = 'power';
    else if (genotype === 'XX') type = 'endurance';

    const typeIIxPercentage = genotype === 'RR' ? 70 : genotype === 'XX' ? 30 : 50;
    const typeIPercentage = 100 - typeIIxPercentage;

    const recommendedSports = type === 'power' 
      ? ['Sprint', 'Powerlifting', 'Weightlifting', 'Fútbol', 'Baloncesto']
      : type === 'endurance'
        ? ['Maratón', 'Ciclismo', 'Natación de fondo', 'Triatlón', 'Trail running']
        : ['CrossFit', 'Fútbol', 'Natación', 'Tenis', 'Deportes de equipo'];

    const trainingFocus = type === 'power'
      ? ['Entrenamiento de fuerza máxima', 'Sprints cortos', 'Plyometrics', 'Descansos largos entre sets']
      : type === 'endurance'
        ? ['Cardio de larga duración', 'Entrenamiento en zona 2', 'Series de resistencia', 'Descansos cortos']
        : ['Combinación de fuerza y cardio', 'HIIT', 'Circuit training', 'Periodización mixta'];

    return {
      type,
      actn3Variant: genotype,
      muscleFiberComposition: {
        typeIIxPercentage,
        typeIPercentage
      },
      recommendedSports,
      trainingFocus
    };
  }

  /**
   * Analyze MCT1 and VEGF for recovery
   */
  private analyzeRecovery(mct1Variant?: GeneticVariant, vegfVariant?: GeneticVariant): RecoveryProfile {
    const mct1Genotype = mct1Variant?.genotype || 'AT';
    const mct1Config = GENE_CONFIGS.MCT1.alleles[mct1Genotype] || GENE_CONFIGS.MCT1.alleles['AT'];

    const recoverySpeed: 'fast' | 'normal' | 'slow' = 
      mct1Genotype === 'AA' ? 'fast' :
        mct1Genotype === 'TT' ? 'slow' : 'normal';

    const lactateClearanceRate = mct1Config.score;
    const recommendedRestDays = recoverySpeed === 'fast' ? 1 : recoverySpeed === 'slow' ? 3 : 2;

    const antiInflammatoryFoods = [
      'Cerezas (antioxidantes naturales)',
      'Cúrcuma con pimienta negra',
      'Omega-3 (salmón, sardinas, nueces)',
      'Jengibre fresco',
      'Verduras de hoja verde',
      'Bayas (arándanos, frambuesas)'
    ];

    return {
      recoverySpeed,
      mct1Variant: mct1Genotype,
      vegfVariant: vegfVariant?.genotype || 'CG',
      lactateClearanceRate,
      recommendedRestDays,
      antiInflammatoryFoods
    };
  }

  /**
   * Analyze COL5A1 for injury risk
   */
  private analyzeInjuryRisk(variant?: GeneticVariant): InjuryRiskProfile {
    const genotype = variant?.genotype || 'TC';
    const config = GENE_CONFIGS.COL5A1.alleles[genotype] || GENE_CONFIGS.COL5A1.alleles['TC'];

    const overallRisk: 'low' | 'moderate' | 'high' =
      genotype === 'CC' ? 'low' :
        genotype === 'TT' ? 'high' : 'moderate';

    const susceptibleAreas = genotype === 'TT' 
      ? ['Tendones (tendinopatías)', 'Ligamentos (esguinces)', 'Fascia plantar', 'Cadera y articulaciones']
      : genotype === 'CC'
        ? ['Músculos (tirones)', 'Espalda baja', 'Hombros']
        : ['Rodillas', 'Tobillos', 'Zona lumbar'];

    const preventiveMeasures = genotype === 'TT'
      ? [
        'Calentamiento exhaustivo (15-20 min)',
        'Trabajo de estabilización articular',
        'Fortalecimiento del core',
        'Evitar sobreentrenamiento',
        'Masajes regulares',
        'Dormir 8+ horas para recuperación del colágeno'
      ]
      : [
        'Estiramientos dinámicos antes del entreno',
        'Movilidad articular diaria',
        'Fortalecimiento muscular balanceado',
        'Progresión gradual de carga'
      ];

    const recommendedSupplements = [
      'Colágeno hidrolizado (10g/día)',
      'Vitamina C (para síntesis de colágeno)',
      'Magnesio (relajación muscular)',
      'Omega-3 (antiinflamatorio)'
    ];

    return {
      overallRisk,
      col5a1Variant: genotype,
      collagenQuality: config.score,
      susceptibleAreas,
      preventiveMeasures,
      recommendedSupplements
    };
  }

  /**
   * Analyze CYP1A2 for caffeine metabolism
   */
  private analyzeCaffeineMetabolism(variant?: GeneticVariant): CaffeineMetabolism {
    const genotype = variant?.genotype || 'AC';
    const config = GENE_CONFIGS.CYP1A2.alleles[genotype] || GENE_CONFIGS.CYP1A2.alleles['AC'];

    const type: 'fast' | 'slow' | 'normal' =
      genotype === 'AA' ? 'fast' :
        genotype === 'CC' ? 'slow' : 'normal';

    const optimalTiming = type === 'fast' 
      ? '60-90 minutos antes del entrenamiento' 
      : type === 'slow' 
        ? '2-3 horas antes del entrenamiento (o evitar)'
        : '45-60 minutos antes del entrenamiento';

    const maxDailyIntake = type === 'fast' ? 400 : type === 'slow' ? 200 : 300;

    const performanceImpact = type === 'fast'
      ? 'La cafeína mejora significativamente tu rendimiento sin afectar el sueño'
      : type === 'slow'
        ? 'Considera reducir o eliminar la cafeína. Puede causar ansiedad y afectar el sueño'
        : 'Moderación recomendada. La cafeína puede ayudar pero no abuse';

    return {
      type,
      cyp1a2Variant: genotype,
      optimalTiming,
      maxDailyIntake,
      performanceImpact
    };
  }

  /**
   * Analyze FTO and PPARGC1A for weight management
   */
  private analyzeWeightManagement(
    ftoVariant?: GeneticVariant,
    ppargc1aVariant?: GeneticVariant
  ): WeightManagementProfile {
    const ftoGenotype = ftoVariant?.genotype || 'TA';
    const ftoConfig = GENE_CONFIGS.FTO.alleles[ftoGenotype] || GENE_CONFIGS.FTO.alleles['TA'];

    const ppargc1aGenotype = ppargc1aVariant?.genotype || 'GA';
    
    const metabolicType = ftoGenotype === 'AA' 
      ? 'Metabolismo lento - requiere mayor vigilancia'
      : ftoGenotype === 'TT'
        ? 'Metabolismo rápido - mayor flexibilidad dietética'
        : 'Metabolismo moderado';

    const dietRecommendations = ftoGenotype === 'AA'
      ? [
        'Prioriza proteína en cada comida (saciedad)',
        'Controla porciones estrictamente',
        'Evita azúcares refinados',
        'Come fibra abundante',
        'Hidratación constante'
      ]
      : [
        'Dieta balanceada con moderación',
        'Proteína adecuada (1.6-2g/kg)',
        'Carbohidratos complejos',
        'Grasas saludables'
      ];

    const exerciseIntensity = ppargc1aGenotype === 'GG'
      ? 'Entrenamientos intensos de mayor duración son muy efectivos'
      : 'Entrenamientos moderados consistentes son óptimos';

    return {
      metabolicType,
      ftovariant: ftoGenotype,
      ppargc1aVariant: ppargc1aGenotype,
      dietRecommendations,
      exerciseIntensity,
      macros: {
        carbs: ftoGenotype === 'AA' ? '30-40%' : '40-50%',
        protein: '30-35%',
        fats: '25-30%'
      }
    };
  }

  /**
   * Analyze CLOCK and PER3 for chronotype
   */
  private analyzeChronotype(clockVariant?: GeneticVariant, per3Variant?: GeneticVariant): ChronotypeProfile {
    const clockGenotype = clockVariant?.genotype || 'TC';
    const per3Genotype = per3Variant?.genotype || 'GT';

    const type: 'morning' | 'evening' | 'intermediate' =
      clockGenotype === 'TT' ? 'morning' :
        clockGenotype === 'CC' ? 'evening' : 'intermediate';

    const optimalWorkoutTime = type === 'morning'
      ? '6:00 - 9:00 AM (picos de cortisol natural)'
      : type === 'evening'
        ? '5:00 - 8:00 PM (temperatura corporal óptima)'
        : 'Flexible: Mañana o tarde según conveniencia';

    const peakPerformanceWindow = type === 'morning'
      ? '8:00 - 11:00 AM'
      : type === 'evening'
        ? '6:00 - 9:00 PM'
        : '10:00 AM - 12:00 PM o 4:00 - 6:00 PM';

    const sleepRecommendations = per3Genotype === 'GG'
      ? ['6-7 horas pueden ser suficientes', 'Levántate a la misma hora siempre', 'Evita siestas largas']
      : per3Genotype === 'TT'
        ? ['Prioriza 8-9 horas de sueño', 'Rutina de sueño estricta', 'Evita pantallas 2h antes de dormir']
        : ['7-8 horas de sueño', 'Horario regular', 'Ambiente oscuro y fresco'];

    return {
      type,
      clockVariant: clockGenotype,
      per3Variant: per3Genotype,
      optimalWorkoutTime,
      sleepRecommendations,
      peakPerformanceWindow
    };
  }

  /**
   * Generate overall recommendations
   */
  private generateOverallRecommendations(
    actn3?: GeneticVariant,
    mct1?: GeneticVariant,
    col5a1?: GeneticVariant,
    fto?: GeneticVariant
  ): string[] {
    const recommendations: string[] = [];

    // Power/Endurance recommendations
    if (actn3?.genotype === 'RR') {
      recommendations.push('Eres genéticamente optimizado para deportes de potencia. Enfócate en fuerza máxima y velocidad.');
    } else if (actn3?.genotype === 'XX') {
      recommendations.push('Tus genes favorecen la resistencia. Los deportes de larga duración son tu ventaja natural.');
    }

    // Recovery recommendations
    if (mct1?.genotype === 'TT') {
      recommendations.push('Tu recuperación es más lenta. Prioriza el sueño y considera días de descanso activo.');
    }

    // Injury prevention
    if (col5a1?.genotype === 'TT') {
      recommendations.push('Mayor riesgo de lesiones por laxitud articular. Fortalece estabilizadores y evita sobreentrenamiento.');
    }

    // Weight management
    if (fto?.genotype === 'AA') {
      recommendations.push('Mayor predisposición genética a ganar peso. Control de porciones y proteína son clave.');
    }

    recommendations.push(
      'Recuerda: los genes son tendencias, no destinos. Tu esfuerzo y consistencia superan cualquier predisposición.',
      'Consulta con un médico antes de hacer cambios drásticos basados en esta información.'
    );

    return recommendations;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(analysis: GeneticAnalysis): string {
    const parts: string[] = [];
    
    parts.push(`Perfil de Potencia/Resistencia: ${analysis.powerEnduranceProfile.type.toUpperCase()}`);
    parts.push(`Recuperación: ${analysis.recoveryProfile.recoverySpeed}`);
    parts.push(`Riesgo de Lesión: ${analysis.injuryRiskProfile.overallRisk}`);
    parts.push(`Metabolismo de Cafeína: ${analysis.caffeineMetabolism.type}`);
    parts.push(`Cronoipo: ${analysis.chronotype.type}`);

    return parts.join(' | ');
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(analysis: GeneticAnalysis): string[] {
    const steps: string[] = [];

    steps.push('Revisa tu perfil completo en la sección de Genética');
    steps.push('Ajusta tu entrenamiento según tu perfil de potencia/resistencia');
    steps.push('Implementa las medidas preventivas de lesiones recomendadas');
    steps.push('Optimiza tu nutrición según tu metabolismo');
    steps.push('Programa tus entrenamientos en tu horario óptimo biológico');

    if (analysis.caffeineMetabolism.type === 'slow') {
      steps.push('Considera reducir la cafeína o eliminarla después de las 2 PM');
    }

    return steps;
  }

  /**
   * Get genetic profile by ID
   */
  getProfile(profileId: string): GeneticProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Get user's genetic profile
   */
  getUserProfile(userId: string): GeneticProfile | undefined {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }

  /**
   * Delete genetic profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    this.profiles.delete(profileId);
    logger.info('Genetic profile deleted', {
      context: 'genetic-profile',
      metadata: { profileId }
    });
  }

  private generateProfileId(): string {
    return `genetic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnonymizedId(): string {
    return `anon_${Math.random().toString(36).substr(2, 15)}`;
  }
}

// Singleton instance
export const geneticProfileService = new GeneticProfileService();
