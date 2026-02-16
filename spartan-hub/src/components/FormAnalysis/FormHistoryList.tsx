import React from 'react';
import { useFormHistory } from '../../hooks/useFormHistory';
import { motion } from 'framer-motion';
import { Trophy, History, Activity, ChevronRight } from 'lucide-react';

interface FormHistoryListProps {
    userId: string;
    exerciseType?: string;
}

export const FormHistoryList: React.FC<FormHistoryListProps> = ({ userId, exerciseType }) => {
    const { sessions, stats, isLoading } = useFormHistory(userId);

    if (isLoading) {
        return <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
        </div>;
    }

    const filteredSessions = exerciseType 
        ? sessions.filter(s => s.exercise_type === exerciseType)
        : sessions;

    const currentStats = exerciseType 
        ? stats.find(s => s.exercise_type === exerciseType)
        : null;

    return (
        <div className="space-y-6">
            {/* PR / Best Score Card */}
            {currentStats && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-spartan-gold/10 border border-spartan-gold/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-spartan-gold mb-1">
                            <Trophy className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Mejor Puntaje</span>
                        </div>
                        <div className="text-2xl font-black text-white">{Math.round(currentStats.best_score)}%</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <Activity className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Promedio</span>
                        </div>
                        <div className="text-2xl font-black text-white">{Math.round(currentStats.avg_score)}%</div>
                    </div>
                </div>
            )}

            {/* Recent Sessions */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="w-3 h-3" /> Sesiones Recientes
                </h4>
                
                {filteredSessions.length > 0 ? (
                    <div className="space-y-2">
                        {filteredSessions.slice(0, 5).map((session) => (
                            <motion.div 
                                key={session.id}
                                whileHover={{ x: 4 }}
                                className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-200 capitalize">
                                        {session.exercise_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(session.session_start).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`text-sm font-mono font-bold ${session.average_score > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {Math.round(session.average_score)}%
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-700" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-xs text-gray-600 italic">No hay historial disponible para este ejercicio.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormHistoryList;
