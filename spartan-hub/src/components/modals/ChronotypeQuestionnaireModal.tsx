
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';
import { getChronotypeAnalysis } from '../../services/aiService.ts'; 
import SunIcon from '../icons/SunIcon.tsx';
import OwlIcon from '../icons/OwlIcon.tsx';
import HummingbirdIcon from '../icons/HummingbirdIcon.tsx';
import type { ChronotypeAnalysis } from '../../types.ts';

type ModalState = 'questioning' | 'loading' | 'result' | 'error';

const questions = [
    "Sin despertador, ¿a qué hora te despertarías naturalmente?",
    "¿Cuándo te sientes con más energía y alerta mental?",
    "Imagina un entrenamiento intenso. ¿En qué momento del día rendirías al máximo?",
    "¿Te consideras una persona 'de mañanas' o 'de noches'?",
];

const ChronotypeQuestionnaireModal: React.FC = () => {
    const { hideModal, showToast, saveChronotypeAnalysis } = useAppContext();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [modalState, setModalState] = useState<ModalState>('questioning');
    const [result, setResult] = useState<ChronotypeAnalysis | null>(null);

    const handleNext = async () => {
        if (!currentAnswer.trim()) {
            showToast("Por favor, introduce una respuesta.");
            return;
        }

        const newAnswers = [...answers, currentAnswer];
        setAnswers(newAnswers);
        setCurrentAnswer('');

        if (step < questions.length - 1) {
            setStep(prev => prev + 1);
        } else {
            setModalState('loading');
            const analysis = await getChronotypeAnalysis(newAnswers);
            
            if(analysis) {
                setResult(analysis);
                saveChronotypeAnalysis(analysis);
                setModalState('result');
            } else {
                setModalState('error');
            }
        }
    };

    const renderIcon = (chronotype: string) => {
        switch(chronotype) {
            case 'León': return <SunIcon className="w-12 h-12" />;
            case 'Lobo': return <OwlIcon className="w-12 h-12" />;
            case 'Oso': return <HummingbirdIcon className="w-12 h-12" />; // Placeholder, needs Bear icon
            default: return <HummingbirdIcon className="w-12 h-12" />;
        }
    }

    const renderContent = () => {
        switch (modalState) {
            case 'questioning':
                const progress = ((step + 1) / questions.length) * 100;
                return (
                    <div>
                         <div className="w-full bg-spartan-border rounded-full h-2 mb-4">
                            <div className="bg-spartan-gold h-2 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s' }}></div>
                        </div>
                        <label htmlFor="answer" className="block text-lg font-medium text-spartan-text-secondary mb-3">{questions[step]}</label>
                        <textarea
                            id="answer"
                            rows={3}
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                            placeholder="Tu respuesta..."
                        />
                         <div className="flex justify-end mt-6">
                            <button onClick={handleNext} className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">
                                {step < questions.length - 1 ? 'Siguiente' : 'Analizar'}
                            </button>
                        </div>
                    </div>
                );
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[200px]">
                        <LoadingSpinner />
                        <p className="mt-4 text-spartan-text-secondary">Analizando tus ritmos...</p>
                    </div>
                );
            case 'result':
                if (!result) return null;
                return (
                    <div className="text-center">
                         <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                            {renderIcon(result.chronotype)}
                        </div>
                        <h3 className="text-2xl font-bold">Eres un {result.chronotype}</h3>
                        <p className="text-spartan-text-secondary my-4">{result.description}</p>
                        <div className="text-left space-y-2 bg-spartan-card p-4 rounded-lg">
                            {result.recommendations.map((rec, index) => (
                                <div key={index}>
                                    <p className="font-bold text-spartan-gold">{rec.area}:</p>
                                    <p className="text-sm">{rec.advice}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={hideModal} className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">Entendido</button>
                        </div>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center min-h-[200px]">
                        <p className="text-red-500 font-bold">Error al analizar.</p>
                        <p className="text-spartan-text-secondary mt-2">Hubo un problema con la IA. Por favor, inténtalo de nuevo.</p>
                        <button onClick={() => setModalState('questioning')} className="mt-4 py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors">Reintentar</button>
                    </div>
                );
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Cuestionario de Cronotipo</h2>
            {renderContent()}
        </div>
    );
};

export default ChronotypeQuestionnaireModal;
