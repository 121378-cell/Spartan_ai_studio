import React from 'react';
import { FormAnalysisResult } from '../../types/formAnalysis';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Lightbulb } from 'lucide-react';

interface FormScoreCardProps {
    result: FormAnalysisResult;
}

export const FormScoreCard: React.FC<FormScoreCardProps> = ({ result }) => {
    const { formScore, exerciseType, metrics, warnings, recommendations } = result;

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-green-400';
        if (score >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 85) return 'bg-green-500/10 border-green-500/20';
        if (score >= 70) return 'bg-yellow-500/10 border-yellow-500/20';
        return 'bg-red-500/10 border-red-500/20';
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="spartan-card overflow-hidden bg-gradient-to-br from-spartan-surface to-black/40 border border-spartan-border"
            role="region"
            aria-label={`Resultado del análisis de ${exerciseType}`}
        >
            {/* Header / Score */}
            <div className={`p-6 border-b ${getScoreBg(formScore)}`}>
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">
                            Puntaje de {exerciseType.replace('_', ' ')}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Análisis basado en IA Spartan</p>
                        {result.repCount !== undefined && (
                            <div className="mt-4 flex items-center gap-2" aria-label={`${result.repCount} repeticiones completadas`}>
                                <span className="text-3xl font-black text-white" aria-hidden="true">{result.repCount}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Repeticiones</span>
                            </div>
                        )}
                    </div>
                    <div 
                        className={`text-5xl font-black ${getScoreColor(formScore)}`}
                        aria-label={`Calificación final: ${Math.round(formScore)} por ciento`}
                    >
                        {Math.round(formScore)}%
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Metrics Breakdown */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Info className="w-3 h-3" /> Métricas Técnicas
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(metrics).map(([key, value]) => (
                            <div key={key} className="space-y-1" role="img" aria-label={`${key}: ${typeof value === 'number' ? Math.round(value * 100) : value}%`}>
                                <div className="flex justify-between text-[10px] uppercase tracking-tighter">
                                    <span className="text-gray-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="text-white font-mono" aria-hidden="true">
                                        {typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value)}
                                    </span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden" aria-hidden="true">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: typeof value === 'number' ? `${value * 100}%` : '100%' }}
                                        className={`h-full ${typeof value === 'number' && value > 0.8 ? 'bg-spartan-gold' : 'bg-spartan-gold/50'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> Correcciones Críticas
                        </h4>
                        <ul className="space-y-2">
                            {warnings.map((warning, index) => (
                                <li key={index} className="flex gap-3 text-sm text-gray-300 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                                    <span className="text-red-500 font-bold">•</span>
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recommendations */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-spartan-gold uppercase tracking-wider flex items-center gap-2">
                        <Lightbulb className="w-3 h-3" /> Coach Vitalis Tips
                    </h4>
                    <div className="space-y-2">
                        {recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-3 bg-spartan-primary/5 p-3 rounded-lg border border-spartan-primary/10">
                                <CheckCircle2 className="w-4 h-4 text-spartan-gold shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-300 italic">"{rec}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default FormScoreCard;
