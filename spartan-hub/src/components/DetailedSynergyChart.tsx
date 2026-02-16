import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useChartData } from '../hooks/useChartData.ts';

const DetailedSynergyChart: React.FC = () => {
    const { workoutHistory, weeklyCheckIns } = useAppContext();
    const chartData = useChartData(workoutHistory, weeklyCheckIns);

    const width = 800;
    const height = 400;
    const padding = 60;

    if (chartData.length < 2) {
        return (
             <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-spartan-gold mb-2">Laboratorio del Coach: Firma de Desgaste</h2>
                <div className="text-center py-10 h-[400px] flex items-center justify-center">
                    <p className="text-spartan-text-secondary">Se necesitan más datos para un análisis detallado. Sigue registrando tus semanas.</p>
                </div>
            </div>
        )
    }

    const maxVal1 = Math.max(...chartData.map(d => d.load || 0), 0);
    const maxVal2 = Math.max(...chartData.map(d => d.stress || 0), 10);

    const yScale1 = (val: number) => height - padding - (val / (maxVal1 || 1)) * (height - 2 * padding);
    const yScale2 = (val: number) => height - padding - (val / maxVal2) * (height - 2 * padding);
    const xScale = (index: number) => padding + (index / (chartData.length - 1)) * (width - 2 * padding);

    const generatePath = (dataKey: string, yScale: (val: number) => number) => {
        if (chartData.length < 2) return "";
        return chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale((d as any)[dataKey] || 0)}`).join(' ');
    };

    const path1 = generatePath('load', yScale1);
    const path2 = generatePath('stress', yScale2);
    
    const yGridLines = Array.from({ length: 5 }).map((_, i) => {
        const y = padding + i * ((height - 2 * padding) / 4);
        return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#444444" strokeWidth="0.5" strokeDasharray="3 3" />;
    });

    return (
        <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
             <h2 className="text-3xl font-bold text-spartan-gold mb-2">Laboratorio del Coach: Firma de Desgaste</h2>
             <p className="text-spartan-text-secondary mb-6">Analiza la correlación entre tu Carga de Entrenamiento (amarillo, eje izquierdo) y tu Estrés Percibido (rojo, eje derecho).</p>
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[${width}px] h-full">
                    {/* Y-Axis Labels */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <g key={`y1-label-${i}`}>
                            <text x={padding - 10} y={padding + i * ((height - 2 * padding) / 4)} fill="#D4AF37" fontSize="10" textAnchor="end" dominantBaseline="middle">
                                {((maxVal1 / 4) * (4 - i)).toFixed(0)}
                            </text>
                             <text x={width - padding + 10} y={padding + i * ((height - 2 * padding) / 4)} fill="#EF4444" fontSize="10" textAnchor="start" dominantBaseline="middle">
                                {((maxVal2 / 4) * (4 - i)).toFixed(0)}
                            </text>
                        </g>
                    ))}

                    {/* Axes and Grid */}
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#444444" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#D4AF37" strokeWidth="1.5" />
                    <line x1={width - padding} y1={padding} x2={width - padding} y2={height - padding} stroke="#EF4444" strokeWidth="1.5" />
                    {yGridLines}

                    {/* X-Axis Labels */}
                    {chartData.map((d, i) => (
                        <text key={`x-label-${i}`} x={xScale(i)} y={height - padding + 20} fill="#A0A0A0" fontSize="10" textAnchor="middle">
                            {new Date(d.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </text>
                    ))}

                    {/* Paths */}
                    <path d={path1} fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
                    <path d={path2} fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                    
                    {/* Data Points */}
                    {chartData.map((d, i) => (
                        <g key={`points-${i}`}>
                            <circle cx={xScale(i)} cy={yScale1(d.load)} r="4" fill="#D4AF37" />
                            <circle cx={xScale(i)} cy={yScale2(d.stress)} r="4" fill="#EF4444" />
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
};

export default DetailedSynergyChart;

