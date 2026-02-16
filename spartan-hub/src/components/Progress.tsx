import React, { useState } from 'react';
import SynergyCharts from './SynergyCharts.tsx';
import AchievementWall from './AchievementWall.tsx';
import SuccessManualVisualizer from './SuccessManualVisualizer.tsx';
import ProfileEvolution from './ProfileEvolution.tsx';
import LessonsJournal from './LessonsJournal.tsx';
import ScrollIcon from './icons/ScrollIcon.tsx';
import ResilienceWall from './ResilienceWall.tsx';

const Progress: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`py-2 px-4 font-semibold transition-colors text-sm sm:text-base ${
                activeTab === tabName
                    ? 'border-b-2 border-spartan-gold text-spartan-gold'
                    : 'text-spartan-text-secondary hover:text-spartan-text'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="animate-fadeIn space-y-8">
            <div>
                <h1 className="text-4xl font-bold text-spartan-gold">Tu Progreso Holístico</h1>
                <p className="text-lg text-spartan-text-secondary mt-2">Visualiza la sinergia entre tu mente, cuerpo y disciplina.</p>
            </div>

            <div className="border-b border-spartan-border">
                <TabButton tabName="overview" label="Visión Holística" />
                <TabButton tabName="resilience" label="Muro de Resiliencia" />
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-12 animate-fadeIn">
                    <SynergyCharts />
                    <AchievementWall />
                    <SuccessManualVisualizer />

                    <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-3xl font-bold text-spartan-gold mb-6 flex items-center gap-3">
                            <ScrollIcon className="w-8 h-8"/>
                            Tu Legado Personal
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ProfileEvolution />
                            <LessonsJournal />
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'resilience' && <ResilienceWall />}
        </div>
    );
};

export default Progress;

