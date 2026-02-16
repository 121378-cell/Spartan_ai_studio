import React from 'react';
import { useCoachAthletes } from '../hooks/useCoachAthletes';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Activity, ShieldCheck, ChevronRight, Mail, Calendar } from 'lucide-react';

const CoachDashboard: React.FC = () => {
    const { athletes, isLoading, error } = useCoachAthletes();

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-green-500 bg-green-500/10 border-green-500/20';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-spartan-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Command Center</h1>
                    <p className="text-spartan-text-secondary">Supervisión técnica y fisiológica de atletas</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-spartan-surface p-4 rounded-2xl border border-spartan-border flex items-center gap-4">
                        <Users className="text-spartan-gold w-6 h-6" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Atletas</p>
                            <p className="text-xl font-black text-white">{athletes.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Critical Alerts Bar */}
            {athletes.some(a => a.riskLevel === 'critical' || a.riskLevel === 'high') && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
                    <AlertTriangle className="text-red-500 w-6 h-6 animate-pulse" />
                    <div>
                        <p className="text-sm font-bold text-red-400">Atletas en Riesgo Detectados</p>
                        <p className="text-xs text-red-200/60">Se recomienda revisión inmediata de carga y técnica.</p>
                    </div>
                </div>
            )}

            {/* Athlete Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {athletes.map((athlete) => (
                    <motion.div 
                        key={athlete.id}
                        whileHover={{ scale: 1.02 }}
                        className="spartan-card group cursor-pointer overflow-hidden border border-spartan-border hover:border-spartan-gold/40 transition-all"
                    >
                        <div className="p-6 space-y-6">
                            {/* Athlete Info */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-spartan-primary/20 rounded-full flex items-center justify-center border border-spartan-gold/30">
                                        <span className="text-xl font-black text-spartan-gold">{athlete.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{athlete.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Mail className="w-3 h-3" /> {athlete.email}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${getRiskColor(athlete.riskLevel)}`}>
                                    {athlete.riskLevel}
                                </div>
                            </div>

                            {/* Main Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                                        <Activity className="w-3 h-3" />
                                        <span className="text-[8px] font-bold uppercase">Entrenamientos</span>
                                    </div>
                                    <div className="text-xl font-black text-white">{athlete.totalWorkouts}</div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 text-spartan-gold mb-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span className="text-[8px] font-bold uppercase">Riesgo Lesión</span>
                                    </div>
                                    <div className="text-xl font-black text-white">{Math.round(athlete.injuryRisk)}%</div>
                                </div>
                            </div>

                            {/* AI Recommendation */}
                            <div className="bg-spartan-primary/5 p-4 rounded-xl border border-spartan-primary/10">
                                <p className="text-xs text-gray-400 italic leading-relaxed">
                                    "{athlete.recommendation}"
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                    <Calendar className="w-3 h-3" /> Desde {new Date(athlete.assignedAt).toLocaleDateString()}
                                </div>
                                <div className="text-spartan-gold text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Ver Perfil Completo <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default CoachDashboard;
