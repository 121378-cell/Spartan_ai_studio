import React from 'react';

interface DataSet {
    label: string;
    data: number[];
    color: string;
}

interface RadarChartProps {
  labels: string[];
  datasets: DataSet[];
  size: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ labels, datasets, size }) => {
    const center = size / 2;
    const radius = size * 0.35;
    const numAxes = labels.length;
    const angleSlice = (Math.PI * 2) / numAxes;

    // Grid lines (polygons)
    const gridLevels = 4;
    const gridLines = [];
    for (let i = 1; i <= gridLevels; i++) {
        const r = radius * (i / gridLevels);
        let path = 'M ';
        for (let j = 0; j < numAxes; j++) {
            const angle = angleSlice * j - Math.PI / 2;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            path += `${x},${y} L `;
        }
        path = path.slice(0, -2) + 'Z';
        gridLines.push(<path key={`grid-${i}`} d={path} fill="none" stroke="#444444" strokeWidth="1" />);
    }

    // Axes lines
    const axes = labels.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x2 = center + radius * Math.cos(angle);
        const y2 = center + radius * Math.sin(angle);
        return <line key={`axis-${i}`} x1={center} y1={center} x2={x2} y2={y2} stroke="#444444" strokeWidth="1" />;
    });

    // Labels
    const axisLabels = labels.map((label, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = radius * 1.15;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return (
            <text key={`label-${i}`} x={x} y={y} fill="#A0A0A0" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                {label}
            </text>
        );
    });
    
    // Data polygons
    const dataPolygons = datasets.map((dataset) => {
        const points = dataset.data.map((value, i) => {
            const normalizedValue = value / 10; // Assuming data is on a 0-10 scale
            const r = radius * normalizedValue;
            const angle = angleSlice * i - Math.PI / 2;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');

        return (
            <polygon 
                key={dataset.label}
                points={points} 
                fill={dataset.color}
                fillOpacity="0.3"
                stroke={dataset.color}
                strokeWidth="2"
            />
        );
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {gridLines}
            {axes}
            {axisLabels}
            {dataPolygons}
        </svg>
    );
};

export default RadarChart;
