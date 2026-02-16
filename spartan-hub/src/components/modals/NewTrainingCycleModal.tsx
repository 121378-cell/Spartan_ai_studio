import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateNewCyclePlan /*, getCycleReview */ } from '../../services/aiService';
import type { Routine, TrainingCycle /*, CycleReviewResponse */ } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import BrainIcon from '../icons/BrainIcon';
import DumbbellIcon from '../icons/DumbbellIcon';
import ZapIcon from '../icons/ZapIcon';
import CycleIcon from '../icons/CycleIcon';
import TargetIcon from '../icons/TargetIcon';
import DetailedSynergyChart from '../DetailedSynergyChart';

type ModalView = 'loadingReview' | 'showReview' | 'generatingPlan' | 'error';

const NewTrainingCycleModal: React.FC = () => {
    const { userProfile, startNewCycle, hideModal, workoutHistory, habitLogs, extendCurrentCycle } = useAppContext();
    const [view, setView] = useState<ModalView>('loadingReview');
    // const [review, setReview] = useState<CycleReviewResponse | null>(null);

    const currentPhase = userProfile.trainingCycle?.phase || 'adaptation';
    
    const phaseProgression: Record<TrainingCycle['phase'], TrainingCycle['phase']> = {
        adaptation: 'hypertrophy',
        hypertrophy: 'strength',
        strength: 'adaptation',
    };
    const nextPhase = phaseProgression[currentPhase];
    
    const phaseDetails: Record<TrainingCycle['phase'], { title: string; description: string; icon: React.ReactNode }> = {
        adaptation: { title: "Adaptación", description: "Construye una base sólida y perfecciona la técnica.", icon: <BrainIcon className="w-8 h-8" /> },
        hypertrophy: { title: "Hipertrofia", description: "Maximiza el volumen para el crecimiento muscular.", icon: <DumbbellIcon className="w-8 h-8" /> },
        strength: { title: "Fuerza", description: "Enfócate en levantamientos pesados para aumentar la potencia.", icon: <ZapIcon className="w-8 h-8" /> }
    };
    const nextPhaseDetails = phaseDetails[nextPhase];

    // useEffect(() => {
    //     const fetchReview = async () => {
    //         const reviewData = await getCycleReview(userProfile, workoutHistory, habitLogs);
    //         if (reviewData) {
    //             setReview(reviewData);
    //             setView('showReview');
    //         } else {
    //             setView('error');
    //         }
    //     };
    //     fetchReview();
    // }, [userProfile, workoutHistory, habitLogs]);

    const handleGeneratePlan = async () => {
        setView('generatingPlan');
        const newRoutine = await generateNewCyclePlan(userProfile, nextPhase);
        if (newRoutine) {
            startNewCycle(newRoutine, nextPhase);
        } else {
            setView('error');
        }
    };
    
    const handleExtendCycle = () => {
        extendCurrentCycle();
        hideModal();
    }
    
    const renderContent = () => {
        switch (view) {
            case 'loadingReview':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                        <LoadingSpinner />
                        <p className="mt-4 text-spartan-text-secondary">Analizando el rendimiento de tu último ciclo...</p>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                        <p className="text-red-500 font-bold">Error en el análisis.</p>
                        <p className="text-spartan-text-secondary mt-2">No se pudo generar una recomendación. Inténtalo más tarde.</p>
                         <button onClick={hideModal} className="mt-4 py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg">Cerrar</button>
                    </div>
                );
            case 'generatingPlan':
                 return (
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                        <LoadingSpinner />
                        <p className="mt-4 text-spartan-text-secondary">Generando tu nuevo plan de {nextPhaseDetails.title}...</p>
                    </div>
                );
            case 'showReview':
                return (
                     <div className="flex flex-col items-center justify-center min-h-[300px]">
                        <p className="text-spartan-text-secondary">Funcionalidad temporalmente desactivada.</p>
                        <button onClick={hideModal} className="mt-4 py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg">Cerrar</button>
                    </div>
                );
        }
    };
    
    return (
        <div className="p-4">
            <div className="text-center mb-6">
                <CycleIcon className="w-16 h-16 mx-auto text-spartan-gold mb-4"/>
                <h2 className="text-3xl font-bold text-spartan-gold">Revisión Cíclica Colaborativa</h2>
            </div>
            {renderContent()}
        </div>
    );
};

export default NewTrainingCycleModal;
