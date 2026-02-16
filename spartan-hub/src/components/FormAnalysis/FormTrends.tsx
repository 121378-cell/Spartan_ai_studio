import React, { useEffect, useState } from 'react';
import BackendApiService from '../../services/api';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Filter } from 'lucide-react';

interface TrendData {
    date: string;
    averageScore: number;
    totalReps: number;
}

interface FormTrendsProps {
    userId: string;
    exerciseType?: string;
}

export const FormTrends: React.FC<FormTrendsProps> = ({ userId, exerciseType }) => {
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const fetchTrends = async () => {
            setIsLoading(true);
            try {
                const data = await BackendApiService.getUserFormTrends(userId, days);
                // Filter by exercise type if provided
                const filteredData = exerciseType 
                    ? data.filter(d => d.exerciseType === exerciseType)
                    : data;
                
                setTrends(filteredData.map(d => ({
                    date: d.date || d.session_start,
                    averageScore: d.averageScore || d.average_score || 0,
                    totalReps: d.totalReps || d.total_reps || 0
                })));
            } catch (error) {
                console.error('Failed to fetch trends', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrends();
    }, [userId, exerciseType, days]);

    const width = 600;
    const height = 200;
    const padding = 30;

    const xScale = (index: number) => padding + (index / Math.max(1, trends.length - 1)) * (width - 2 * padding);
    const yScale = (score: number) => height - padding - (score / 100) * (height - 2 * padding);

    const pathData = trends.length > 1 
        ? trends.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.averageScore)}`).join(' ')
        : '';

    if (isLoading) {
        return (
            <div className="h-[200px] flex items-center justify-center bg-black/20 rounded-xl border border-spartan-border/30">
                <div className="w-6 h-6 border-2 border-spartan-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (trends.length === 0) {
        return (
            <div className="h-[200px] flex flex-col items-center justify-center bg-black/20 rounded-xl border border-dashed border-spartan-border/30 text-gray-500">
                <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No hay suficientes datos de tendencia aún.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-spartan-gold" /> Progreso Técnico
                </h3>
                <div className="flex gap-2">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${days === d ? 'bg-spartan-gold text-black' : 'text-gray-500 hover:text-white bg-white/5'}`}
                        >
                            {d}D
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative bg-black/40 p-4 rounded-xl border border-spartan-border/50 overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    {[0, 25, 50, 75, 100].map(v => (
                        <line 
                            key={v}
                            x1={padding} y1={yScale(v)} x2={width-padding} y2={yScale(v)} 
                            stroke="rgba(255,255,255,0.05)" strokeWidth="1" 
                        />
                    ))}

                    {/* The Line */}
                    <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        d={pathData}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Points */}
                    {trends.map((d, i) => (
                        <g key={i}>
                            <circle 
                                cx={xScale(i)} 
                                cy={yScale(d.averageScore)} 
                                r="4" 
                                className="fill-spartan-gold" 
                            />
                            {/* Tooltip-like date labels for sparse data */}
                            {trends.length < 10 && (
                                <text 
                                    x={xScale(i)} 
                                    y={height - 5} 
                                    textAnchor="middle" 
                                    className="fill-gray-600 text-[8px] font-mono"
                                >
                                    {new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </text>
                            )}
                        </g>
                    ))}

                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ffd700" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#ffd700" stopOpacity="1" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Score Indicators */}
                <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-8 text-[8px] font-mono text-gray-700">
                    <span>100%</span>
                    <span>50%</span>
                    <span>0%</span>
                </div>
            </div>
        </div>
    );
};

export default FormTrends;
