import React from 'react';
import DetailedSynergyChart from './DetailedSynergyChart.tsx';
import SelfAnalysisPanel from './SelfAnalysisPanel.tsx';

const ResilienceWall: React.FC = () => {
    return (
        <div className="space-y-12 animate-fadeIn">
            <DetailedSynergyChart />
            <SelfAnalysisPanel />
        </div>
    );
};

export default ResilienceWall;

