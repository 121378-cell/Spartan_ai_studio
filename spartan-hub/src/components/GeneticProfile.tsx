/**
 * GeneticProfile Component
 * 
 * Displays user's genetic analysis and personalized recommendations
 * based on DNA data from 23andMe/Ancestry.
 */

import React, { useState, useEffect } from 'react';
import { Upload, Dna, Activity, Timer, AlertTriangle, Coffee, Moon, Utensils, Sparkles } from 'lucide-react';
import './GeneticProfile.css';

interface GeneticAnalysis {
  powerEnduranceProfile: {
    type: 'power' | 'endurance' | 'mixed';
    actn3Variant: string;
    muscleFiberComposition: {
      typeIIxPercentage: number;
      typeIPercentage: number;
    };
    recommendedSports: string[];
    trainingFocus: string[];
  };
  recoveryProfile: {
    recoverySpeed: 'fast' | 'normal' | 'slow';
    mct1Variant: string;
    lactateClearanceRate: number;
    recommendedRestDays: number;
    antiInflammatoryFoods: string[];
  };
  injuryRiskProfile: {
    overallRisk: 'low' | 'moderate' | 'high';
    col5a1Variant: string;
    collagenQuality: number;
    susceptibleAreas: string[];
    preventiveMeasures: string[];
    recommendedSupplements: string[];
  };
  caffeineMetabolism: {
    type: 'fast' | 'slow' | 'normal';
    cyp1a2Variant: string;
    optimalTiming: string;
    maxDailyIntake: number;
    performanceImpact: string;
  };
  weightManagement: {
    metabolicType: string;
    dietRecommendations: string[];
    exerciseIntensity: string;
    macros: {
      carbs: string;
      protein: string;
      fats: string;
    };
  };
  chronotype: {
    type: 'morning' | 'evening' | 'intermediate';
    clockVariant: string;
    optimalWorkoutTime: string;
    sleepRecommendations: string[];
    peakPerformanceWindow: string;
  };
  overallRecommendations: string[];
}

interface GeneticProfileProps {
  userId: string;
}

export const GeneticProfile: React.FC<GeneticProfileProps> = ({ userId }) => {
  const [hasProfile, setHasProfile] = useState(false);
  const [analysis, setAnalysis] = useState<GeneticAnalysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'nutrition' | 'recovery'>('overview');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadGeneticProfile();
  }, [userId]);

  const loadGeneticProfile = async () => {
    try {
      const response = await fetch(`/api/genetics/analysis/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data);
        setHasProfile(true);
      }
    } catch (error) {
      console.error('Failed to load genetic profile:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('geneticFile', file);
    formData.append('userId', userId);
    formData.append('source', file.name.includes('ancestry') ? 'ancestry' : '23andme');

    try {
      const response = await fetch('/api/genetics/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        await loadGeneticProfile();
      } else {
        const error = await response.json();
        setUploadError(error.message || 'Failed to upload genetic data');
      }
    } catch (error) {
      setUploadError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getPowerEnduranceIcon = (type: string) => {
    switch (type) {
      case 'power': return '⚡';
      case 'endurance': return '🏃';
      default: return '⚖️';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'risk-low';
      case 'moderate': return 'risk-moderate';
      case 'high': return 'risk-high';
      default: return '';
    }
  };

  if (!hasProfile) {
    return (
      <div className="genetic-profile-container">
        <div className="genetic-profile-empty">
          <Dna size={64} className="dna-icon" />
          <h2>Perfil Genético</h2>
          <p>Descubre cómo tu ADN influye en tu rendimiento deportivo, recuperación y nutrición óptima.</p>
          
          <div className="upload-section">
            <label className="upload-button">
              <Upload size={24} />
              <span>Subir datos de 23andMe o Ancestry</span>
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden-input"
              />
            </label>
            
            {isUploading && (
              <div className="upload-loading">
                <div className="spinner"></div>
                <p>Analizando tu genoma...</p>
              </div>
            )}
            
            {uploadError && (
              <div className="upload-error">
                <AlertTriangle size={20} />
                {uploadError}
              </div>
            )}
          </div>

          <div className="genetic-info">
            <h4>¿Qué analizamos?</h4>
            <ul>
              <li><strong>ACTN3:</strong> Potencia vs Resistencia muscular</li>
              <li><strong>MCT1:</strong> Velocidad de recuperación</li>
              <li><strong>COL5A1:</strong> Riesgo de lesiones</li>
              <li><strong>CYP1A2:</strong> Metabolismo de cafeína</li>
              <li><strong>FTO:</strong> Gestión de peso</li>
              <li><strong>CLOCK:</strong> Cronoipo óptimo</li>
            </ul>
            <p className="privacy-note">
              🔒 Tu información genética está encriptada y nunca se comparte con terceros.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="genetic-profile-container">
      <div className="genetic-profile-header">
        <h2><Dna size={28} /> Tu Perfil Genético</h2>
        <div className="profile-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Resumen
          </button>
          <button
            className={activeTab === 'training' ? 'active' : ''}
            onClick={() => setActiveTab('training')}
          >
            Entrenamiento
          </button>
          <button
            className={activeTab === 'nutrition' ? 'active' : ''}
            onClick={() => setActiveTab('nutrition')}
          >
            Nutrición
          </button>
          <button
            className={activeTab === 'recovery' ? 'active' : ''}
            onClick={() => setActiveTab('recovery')}
          >
            Recuperación
          </button>
        </div>
      </div>

      <div className="genetic-profile-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="genetic-cards">
              <div className="genetic-card power-endurance">
                <div className="card-icon">{getPowerEnduranceIcon(analysis.powerEnduranceProfile.type)}</div>
                <h3>Tipo de Atleta</h3>
                <div className="card-value">{analysis.powerEnduranceProfile.type.toUpperCase()}</div>
                <p>{analysis.powerEnduranceProfile.type === 'power' 
                  ? 'Optimizado para fuerza y velocidad' 
                  : analysis.powerEnduranceProfile.type === 'endurance'
                  ? 'Optimizado para resistencia'
                  : 'Equilibrio entre potencia y resistencia'}</p>
                <div className="muscle-fiber-composition">
                  <div className="fiber-bar">
                    <div 
                      className="fiber-fast" 
                      style={{ width: `${analysis.powerEnduranceProfile.muscleFiberComposition.typeIIxPercentage}%` }}
                    >
                      Rápida {analysis.powerEnduranceProfile.muscleFiberComposition.typeIIxPercentage}%
                    </div>
                    <div 
                      className="fiber-slow" 
                      style={{ width: `${analysis.powerEnduranceProfile.muscleFiberComposition.typeIPercentage}%` }}
                    >
                      Lenta {analysis.powerEnduranceProfile.muscleFiberComposition.typeIPercentage}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="genetic-card recovery">
                <div className="card-icon"><Activity size={32} /></div>
                <h3>Recuperación</h3>
                <div className="card-value">{analysis.recoveryProfile.recoverySpeed.toUpperCase()}</div>
                <p>Eliminación de lactato: {analysis.recoveryProfile.lactateClearanceRate}/100</p>
                <p>Días de descanso recomendados: {analysis.recoveryProfile.recommendedRestDays}</p>
              </div>

              <div className={`genetic-card injury-risk ${getRiskColor(analysis.injuryRiskProfile.overallRisk)}`}>
                <div className="card-icon"><AlertTriangle size={32} /></div>
                <h3>Riesgo de Lesiones</h3>
                <div className="card-value">{analysis.injuryRiskProfile.overallRisk.toUpperCase()}</div>
                <p>Calidad de colágeno: {analysis.injuryRiskProfile.collagenQuality}/100</p>
                <div className="susceptible-areas">
                  {analysis.injuryRiskProfile.susceptibleAreas.map((area, idx) => (
                    <span key={idx} className="area-tag">{area}</span>
                  ))}
                </div>
              </div>

              <div className="genetic-card caffeine">
                <div className="card-icon"><Coffee size={32} /></div>
                <h3>Metabolismo Cafeína</h3>
                <div className="card-value">{analysis.caffeineMetabolism.type.toUpperCase()}</div>
                <p>Máximo diario: {analysis.caffeineMetabolism.maxDailyIntake}mg</p>
                <p>{analysis.caffeineMetabolism.optimalTiming}</p>
              </div>

              <div className="genetic-card chronotype">
                <div className="card-icon"><Moon size={32} /></div>
                <h3>Cronoipo</h3>
                <div className="card-value">
                  {analysis.chronotype.type === 'morning' ? 'MATUTINO' : 
                   analysis.chronotype.type === 'evening' ? 'NOCTURNO' : 'INTERMEDIO'}
                </div>
                <p>Mejor horario: {analysis.chronotype.optimalWorkoutTime}</p>
              </div>

              <div className="genetic-card weight">
                <div className="card-icon"><Utensils size={32} /></div>
                <h3>Metabolismo</h3>
                <div className="card-value">{analysis.weightManagement.metabolicType}</div>
                <div className="macros">
                  <span>🍞 {analysis.weightManagement.macros.carbs}</span>
                  <span>🥩 {analysis.weightManagement.macros.protein}</span>
                  <span>🥑 {analysis.weightManagement.macros.fats}</span>
                </div>
              </div>
            </div>

            <div className="overall-recommendations">
              <h3><Sparkles size={24} /> Recomendaciones Personalizadas</h3>
              <ul>
                {analysis.overallRecommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="training-tab">
            <div className="training-section">
              <h3>Enfoque de Entrenamiento</h3>
              <ul>
                {analysis.powerEnduranceProfile.trainingFocus.map((focus, idx) => (
                  <li key={idx}>{focus}</li>
                ))}
              </ul>
            </div>

            <div className="training-section">
              <h3>Deportes Recomendados</h3>
              <div className="sports-tags">
                {analysis.powerEnduranceProfile.recommendedSports.map((sport, idx) => (
                  <span key={idx} className="sport-tag">{sport}</span>
                ))}
              </div>
            </div>

            <div className="training-section">
              <h3>Horario Óptimo</h3>
              <p className="optimal-time">{analysis.chronotype.optimalWorkoutTime}</p>
              <p>Ventana de máximo rendimiento: {analysis.chronotype.peakPerformanceWindow}</p>
            </div>

            <div className="training-section">
              <h3>Prevención de Lesiones</h3>
              <ul>
                {analysis.injuryRiskProfile.preventiveMeasures.map((measure, idx) => (
                  <li key={idx}>{measure}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="nutrition-tab">
            <div className="nutrition-section">
              <h3>Plan Nutricional</h3>
              <ul>
                {analysis.weightManagement.dietRecommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="nutrition-section">
              <h3>Alimentos Antiinflamatorios</h3>
              <ul>
                {analysis.recoveryProfile.antiInflammatoryFoods.map((food, idx) => (
                  <li key={idx}>{food}</li>
                ))}
              </ul>
            </div>

            <div className="nutrition-section">
              <h3>Suplementos Recomendados</h3>
              <ul>
                {analysis.injuryRiskProfile.recommendedSupplements.map((supp, idx) => (
                  <li key={idx}>{supp}</li>
                ))}
              </ul>
            </div>

            <div className="nutrition-section caffeine-section">
              <h3>Guía de Cafeína</h3>
              <p><strong>Tipo:</strong> {analysis.caffeineMetabolism.type}</p>
              <p><strong>Máximo diario:</strong> {analysis.caffeineMetabolism.maxDailyIntake}mg</p>
              <p><strong>Timing óptimo:</strong> {analysis.caffeineMetabolism.optimalTiming}</p>
              <p className="caffeine-impact">{analysis.caffeineMetabolism.performanceImpact}</p>
            </div>
          </div>
        )}

        {activeTab === 'recovery' && (
          <div className="recovery-tab">
            <div className="recovery-section">
              <h3>Velocidad de Recuperación</h3>
              <div className={`recovery-speed ${analysis.recoveryProfile.recoverySpeed}`}>
                {analysis.recoveryProfile.recoverySpeed.toUpperCase()}
              </div>
              <p>Tasa de aclaración de lactato: {analysis.recoveryProfile.lactateClearanceRate}/100</p>
            </div>

            <div className="recovery-section">
              <h3>Días de Descanso</h3>
              <p className="rest-days">{analysis.recoveryProfile.recommendedRestDays} días por semana</p>
            </div>

            <div className="recovery-section">
              <h3>Recomendaciones de Sueño</h3>
              <ul>
                {analysis.chronotype.sleepRecommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="recovery-section">
              <h3>Prevención de Lesiones</h3>
              <p className="injury-risk-level">
                Nivel de riesgo: <span className={getRiskColor(analysis.injuryRiskProfile.overallRisk)}>
                  {analysis.injuryRiskProfile.overallRisk.toUpperCase()}
                </span>
              </p>
              <h4>Zonas susceptibles:</h4>
              <div className="susceptible-areas">
                {analysis.injuryRiskProfile.susceptibleAreas.map((area, idx) => (
                  <span key={idx} className="area-tag warning">{area}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneticProfile;
