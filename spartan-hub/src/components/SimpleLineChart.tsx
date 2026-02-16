import React from 'react';

interface ChartProps {
  data: any[];
  dataKey1: string;
  dataKey2: string;
  color1: string;
  color2: string;
}

const SimpleLineChart: React.FC<ChartProps> = ({ data, dataKey1, dataKey2, color1, color2 }) => {
    const width = 500;
    const height = 300;
    const padding = 40;

    const maxVal1 = Math.max(...data.map(d => d[dataKey1] || 0), 0);
    const maxVal2 = Math.max(...data.map(d => d[dataKey2] || 0), 10); // Ensure Y-axis for stress is at least 10
    
    // Independent Y-axis scales
    const yScale1 = (val: number) => height - padding - (val / (maxVal1 || 1)) * (height - 2 * padding);
    const yScale2 = (val: number) => height - padding - (val / maxVal2) * (height - 2 * padding);
    
    const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);

    const generatePath = (dataKey: string, yScale: (val: number) => number) => {
        if (data.length < 2) return "";
        return data.map((d, i) => {
            const x = xScale(i);
            const y = yScale(d[dataKey] || 0);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');
    };
    
    const path1 = generatePath(dataKey1, yScale1);
    const path2 = generatePath(dataKey2, yScale2);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Axes */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#444444" strokeWidth="1" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#444444" strokeWidth="1" />
            <line x1={width - padding} y1={padding} x2={width - padding} y2={height - padding} stroke="#444444" strokeWidth="1" />

            {/* Y-Axis Labels */}
            <text x="10" y={padding} fill={color1} fontSize="10" textAnchor="middle">{maxVal1.toFixed(0)}</text>
            <text x="10" y={height - padding} fill={color1} fontSize="10" textAnchor="middle">0</text>
             <text x={width-15} y={padding} fill={color2} fontSize="10" textAnchor="middle">{maxVal2.toFixed(0)}</text>
            <text x={width-15} y={height - padding} fill={color2} fontSize="10" textAnchor="middle">0</text>


            {/* X-Axis Labels */}
            {data.map((d, i) => (
                <text key={i} x={xScale(i)} y={height - 20} fill="#A0A0A0" fontSize="10" textAnchor="middle">
                    {new Date(d.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                </text>
            ))}

            {/* Paths */}
            <path d={path1} fill="none" stroke={color1} strokeWidth="2.5" strokeLinecap="round" />
            <path d={path2} fill="none" stroke={color2} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
};

export default SimpleLineChart;
