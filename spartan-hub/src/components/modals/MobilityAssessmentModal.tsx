import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import { MOBILITY_TESTS } from '../../data/mobilityLibrary.ts';
import type { MobilityIssue } from '../../types.ts';
import CheckIcon from '../icons/CheckIcon.tsx';
import XCircleIcon from '../icons/XCircleIcon.tsx';

const MobilityAssessmentModal: React.FC = () => {
    const { completeMobilityAssessment } = useAppContext();
    const [step, setStep] = useState(0);
    const [failedIssues, setFailedIssues] = useState<MobilityIssue[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    const currentTest = MOBILITY_TESTS[step];

    const handleResult = (passed: boolean) => {
        if (!passed) {
            setFailedIssues(prev => [...new Set([...prev, currentTest.associatedIssue])]);
        }

        if (step < MOBILITY_TESTS.length - 1) {
            setStep(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const handleCompleteAssessment = () => {
        completeMobilityAssessment(failedIssues);
    };

    if (isFinished) {
        return (
            <div className="text-center">
                 <h2 className="text-2xl font-bold text-spartan-gold mb-4">Evaluación Completada</h2>
                 {failedIssues.length > 0 ? (
                    <div>
                        <p className="text-spartan-text-secondary mb-4">Hemos identificado algunas áreas para mejorar. Se añadirán ejercicios correctivos a tus calentamientos para trabajar en:</p>
                        <ul className="space-y-2">
                            {failedIssues.map(issue => <li key={issue} className="font-semibold text-lg capitalize">{issue}</li>)}
                        </ul>
                    </div>
                 ) : (
                    <p className="text-spartan-text-secondary">¡Tu movilidad funcional es excelente! Sigue así.</p>
                 )}
                 <div className="flex justify-end mt-8">
                     <button onClick={handleCompleteAssessment} className="w-full py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600">Entendido</button>
                 </div>
            </div>
        );
    }


    if (!currentTest) return null;

    const progress = ((step + 1) / MOBILITY_TESTS.length) * 100;

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Evaluación de Movilidad Funcional</h2>
             <div className="w-full bg-spartan-border rounded-full h-2 mb-4">
                <div className="bg-spartan-gold h-2 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s' }}></div>
            </div>

            <div className="bg-spartan-card p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-3">{currentTest.name}</h3>
                
                <div className="mb-4">
                     <h4 className="font-semibold text-spartan-text-secondary">Instrucciones:</h4>
                     <ol className="list-decimal list-inside text-sm space-y-1">
                        {currentTest.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-green-500/10 p-2 rounded">
                        <p className="font-bold text-green-400">Pasa si:</p>
                        <p>{currentTest.passCriteria}</p>
                    </div>
                     <div className="bg-red-500/10 p-2 rounded">
                        <p className="font-bold text-red-400">Falla si:</p>
                        <p>{currentTest.failCriteria}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-8">
                <button
                    onClick={() => handleResult(false)}
                    className="flex-1 flex flex-col items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors"
                >
                    <XCircleIcon className="w-6 h-6" />
                    Fallé
                </button>
                <button
                    onClick={() => handleResult(true)}
                    className="flex-1 flex flex-col items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors"
                >
                    <CheckIcon className="w-6 h-6" />
                    Pasé
                </button>
            </div>
        </div>
    );
};

export default MobilityAssessmentModal;

