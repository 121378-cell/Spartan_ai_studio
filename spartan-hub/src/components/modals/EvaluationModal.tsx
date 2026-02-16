import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { EvaluationFormData, KeystoneHabit, MobilityIssue } from '../../types.ts';
import { generateInitialPlan, InitialPlanResponse } from '../../services/aiService.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';
import { MOBILITY_TESTS } from '../../data/mobilityLibrary.ts';
import CheckIcon from '../icons/CheckIcon.tsx';
import XCircleIcon from '../icons/XCircleIcon.tsx';
import DumbbellIcon from '../icons/DumbbellIcon.tsx';
import LotusIcon from '../icons/LotusIcon.tsx';
import FireIcon from '../icons/FireIcon.tsx';
import BodyMap from '../BodyMap.tsx';


type ModalState = 'collecting_data' | 'loading_plan' | 'previewing_plan' | 'error';

const physicalGoalOptions = ['Ganar Fuerza', 'Construir Músculo', 'Perder Grasa', 'Mejorar Resistencia'];
const mentalGoalOptions = ['Reducir Estrés', 'Aumentar Enfoque', 'Mejorar Disciplina', 'Aumentar Confianza'];


const PriorityCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
}> = ({ title, description, icon, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
            isSelected ? 'bg-spartan-gold/10 border-spartan-gold' : 'bg-spartan-card border-spartan-border hover:border-spartan-text-secondary'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-spartan-gold text-spartan-bg' : 'bg-spartan-surface text-spartan-gold'}`}>
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-sm">{title}</h3>
                <p className="text-xs text-spartan-text-secondary">{description}</p>
            </div>
        </div>
    </button>
);


const MobilityAssessmentStep: React.FC<{ onComplete: (issues: MobilityIssue[]) => void }> = ({ onComplete }) => {
    const [assessmentStep, setAssessmentStep] = useState(0);
    const [issues, setIssues] = useState<MobilityIssue[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    const currentTest = MOBILITY_TESTS[assessmentStep];

    useEffect(() => {
        if (isFinished) {
            onComplete(issues);
        }
    }, [isFinished, onComplete, issues]);

    const handleResult = (passed: boolean) => {
        if (!passed) {
            setIssues(prev => [...new Set([...prev, currentTest.associatedIssue])]);
        }

        if (assessmentStep < MOBILITY_TESTS.length - 1) {
            setAssessmentStep(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };
    
    if (isFinished) {
        return (
            <div className="text-center min-h-[420px] flex flex-col justify-center animate-fadeIn">
                 <h3 className="text-xl font-bold mb-4">Evaluación de Movilidad Completada</h3>
                 <CheckIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
                 <p className="text-spartan-text-secondary">Resultados guardados. Tu plan inicial incluirá ejercicios para abordar cualquier área de mejora.</p>
                 <p className="text-spartan-text-secondary mt-4">Haz clic en 'Generar Plan' para continuar.</p>
            </div>
        );
    }
    
    const progress = ((assessmentStep + 1) / MOBILITY_TESTS.length) * 100;
    
    return (
        <div className="animate-fadeIn">
            <h3 className="text-xl font-semibold mb-2">Dimensión de Movilidad</h3>
            <p className="text-sm text-spartan-text-secondary mb-4">Realiza estas auto-evaluaciones rápidas para detectar desequilibrios de movilidad.</p>
            <div className="w-full bg-spartan-border rounded-full h-1 mb-4">
                <div className="bg-spartan-gold h-1 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s' }}></div>
            </div>

            <div className="bg-spartan-card p-4 rounded-lg min-h-[300px]">
                <h4 className="text-lg font-bold mb-2">{currentTest.name}</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 mb-3">
                    {currentTest.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                </ol>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-500/10 p-2 rounded">
                        <p className="font-bold text-green-400">Pasa si:</p> <p>{currentTest.passCriteria}</p>
                    </div>
                     <div className="bg-red-500/10 p-2 rounded">
                        <p className="font-bold text-red-400">Falla si:</p> <p>{currentTest.failCriteria}</p>
                    </div>
                </div>
            </div>
            
             <div className="flex justify-center gap-4 mt-4">
                <button
                    onClick={() => handleResult(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600/20 text-red-400 font-bold rounded-lg hover:bg-red-600/40"
                >
                    <XCircleIcon className="w-5 h-5" /> Fallé
                </button>
                <button
                    onClick={() => handleResult(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600/20 text-green-400 font-bold rounded-lg hover:bg-green-600/40"
                >
                    <CheckIcon className="w-5 h-5" /> Pasé
                </button>
            </div>
        </div>
    );
}


const OnboardingModal: React.FC = () => {
    const { completeOnboarding } = useAppContext();
    const [step, setStep] = useState(0);
    const [modalState, setModalState] = useState<ModalState>('collecting_data');
    const [userName, setUserName] = useState('');
    const [generatedPlan, setGeneratedPlan] = useState<InitialPlanResponse | null>(null);
    const [failedIssues, setFailedIssues] = useState<MobilityIssue[]>([]);
    const [isMobilityAssessmentComplete, setIsMobilityAssessmentComplete] = useState(false);
    const [selectedPhysicalGoals, setSelectedPhysicalGoals] = useState<string[]>([]);
    const [selectedMentalGoals, setSelectedMentalGoals] = useState<string[]>([]);
    const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);


    const [formData, setFormData] = useState<EvaluationFormData>({
        physicalGoals: '',
        mentalGoals: '',
        experienceLevel: 'beginner',
        weightKg: 75,
        energyLevel: 5,
        stressLevel: 5,
        focusLevel: 5,
        equipment: '',
        daysPerWeek: 3,
        timePerSession: 60,
        history: '',
        lifestyle: '',
        painPoint: '',
        communicationTone: 'analytical',
        nutritionPriority: 'performance',
    });

    const totalSteps = 6; // Name, Physical, Mental, Lifestyle, History, Mobility

    const handleNext = async () => {
        if (step === totalSteps - 1) {
            setModalState('loading_plan');
            const finalFormData = {
                ...formData,
                physicalGoals: selectedPhysicalGoals.join(', '),
                mentalGoals: selectedMentalGoals.join(', '),
                history: selectedBodyParts.join(', ')
            };
            const plan = await generateInitialPlan(finalFormData, userName);
            if (plan) {
                setGeneratedPlan(plan);
                setModalState('previewing_plan');
            } else {
                setModalState('error');
            }
        } else {
            setStep(prev => Math.min(prev + 1, totalSteps - 1));
        }
    };
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 0));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSliderChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: Number(value) }));
    };
    
    const handleGoalToggle = (goal: string, type: 'physical' | 'mental') => {
        const [selected, setSelected] = type === 'physical'
            ? [selectedPhysicalGoals, setSelectedPhysicalGoals]
            : [selectedMentalGoals, setSelectedMentalGoals];
            
        if (selected.includes(goal)) {
            setSelected(selected.filter(g => g !== goal));
        } else {
            setSelected([...selected, goal]);
        }
    };

    const handleAcceptPlan = () => {
        if (generatedPlan) {
            const finalFormData = {
                ...formData,
                physicalGoals: selectedPhysicalGoals.join(', '),
                mentalGoals: selectedMentalGoals.join(', '),
                history: selectedBodyParts.join(', ')
            };
            completeOnboarding(userName, finalFormData, generatedPlan, failedIssues);
        }
    };
    
    const isNextDisabled = () => {
        switch (step) {
            case 0: return !userName.trim();
            case 1: return selectedPhysicalGoals.length === 0 || !formData.equipment.trim() || !formData.weightKg;
            case 2: return selectedMentalGoals.length === 0 || !formData.painPoint.trim();
            case 3: return !formData.lifestyle.trim();
            case 4: return false; // History is optional
            case 5: return !isMobilityAssessmentComplete;
            default: return false;
        }
    }

    const renderStep = () => {
        const stepContent = (
            <div key={step} className="animate-fadeIn">
                {(() => {
                    switch (step) {
                        case 0: return (
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-center">Bienvenido a Spartan</h3>
                                <p className="text-spartan-text-secondary mb-6 text-center">Empecemos tu viaje. ¿Cómo te llamas?</p>
                                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g., Leonidas" className="w-full bg-spartan-card p-3 rounded-md border border-spartan-border focus:ring-2 focus:ring-spartan-gold focus:outline-none text-center text-lg"/>
                            </div>
                        );
                        case 1: return (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Dimensión Física</h3>
                                <div className="space-y-4">
                                    <p className="font-medium text-spartan-text-secondary">Metas Físicas (elige una o más)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {physicalGoalOptions.map(goal => (
                                            <button key={goal} onClick={() => handleGoalToggle(goal, 'physical')} className={`p-3 rounded-lg border-2 transition-colors font-semibold ${selectedPhysicalGoals.includes(goal) ? 'bg-spartan-gold text-spartan-bg border-spartan-gold' : 'bg-spartan-card border-spartan-border'}`}>{goal}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="w-full bg-spartan-card p-2 rounded-md border border-spartan-border focus:ring-spartan-gold focus:outline-none"><option value="beginner">Nivel: Principiante</option><option value="intermediate">Nivel: Intermedio</option><option value="advanced">Nivel: Avanzado</option></select>
                                        <input type="number" name="weightKg" value={formData.weightKg} onChange={handleChange} placeholder="Peso (kg)" className="w-full bg-spartan-card p-2 rounded-md border border-spartan-border focus:ring-spartan-gold focus:outline-none"/>
                                    </div>
                                    <textarea name="equipment" value={formData.equipment} onChange={handleChange} rows={2} placeholder="¿Con qué equipamiento cuentas?" className="w-full bg-spartan-card p-2 rounded-md border border-spartan-border focus:ring-spartan-gold focus:outline-none"/>
                                </div>
                            </div>
                        );
                        case 2: return (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Dimensión Mental</h3>
                                <div className="space-y-4">
                                    <p className="font-medium text-spartan-text-secondary">Metas Mentales</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {mentalGoalOptions.map(goal => (
                                            <button key={goal} onClick={() => handleGoalToggle(goal, 'mental')} className={`p-3 rounded-lg border-2 transition-colors font-semibold ${selectedMentalGoals.includes(goal) ? 'bg-spartan-gold text-spartan-bg border-spartan-gold' : 'bg-spartan-card border-spartan-border'}`}>{goal}</button>
                                        ))}
                                    </div>
                                    <div><label className="block text-sm font-medium text-spartan-text-secondary">Nivel de Estrés: {formData.stressLevel}/10</label><input type="range" min="1" max="10" name="stressLevel" value={formData.stressLevel} onChange={(e) => handleSliderChange('stressLevel', e.target.value)} className="w-full h-2 bg-spartan-border rounded-lg appearance-none cursor-pointer accent-spartan-gold" /></div>
                                    <textarea name="painPoint" value={formData.painPoint} onChange={handleChange} rows={2} placeholder="¿Qué te ha frenado en el pasado?" className="w-full bg-spartan-card p-2 rounded-md border border-spartan-border focus:ring-spartan-gold focus:outline-none"/>
                                </div>
                            </div>
                        );
                        case 3: return (
                             <div>
                                <h3 className="text-xl font-semibold mb-4">Dimensión de Estilo de Vida</h3>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-spartan-text-secondary">Nivel de Energía General: {formData.energyLevel}/10</label><input type="range" min="1" max="10" name="energyLevel" value={formData.energyLevel} onChange={(e) => handleSliderChange('energyLevel', e.target.value)} className="w-full h-2 bg-spartan-border rounded-lg appearance-none cursor-pointer accent-spartan-gold" /></div>
                                    <textarea name="lifestyle" value={formData.lifestyle} onChange={handleChange} rows={2} placeholder="¿Cómo son tu sueño y nutrición?" className="w-full bg-spartan-card p-2 rounded-md border border-spartan-border focus:ring-spartan-gold focus:outline-none"/>
                                    <div>
                                        <label className="block text-sm font-medium text-spartan-text-secondary mb-2">Prioridad Nutricional</label>
                                        <div className="space-y-2">
                                             <PriorityCard title="Rendimiento Máximo" description="Prioriza la fuerza, la hipertrofia y la producción de energía." icon={<DumbbellIcon className="w-5 h-5"/>} isSelected={formData.nutritionPriority === 'performance'} onClick={() => setFormData(p => ({...p, nutritionPriority: 'performance'}))}/>
                                             <PriorityCard title="Longevidad y Salud" description="Prioriza la salud intestinal y la gestión de la inflamación." icon={<LotusIcon className="w-5 h-5"/>} isSelected={formData.nutritionPriority === 'longevity'} onClick={() => setFormData(p => ({...p, nutritionPriority: 'longevity'}))}/>
                                        </div>
                                    </div>
                                    <p className="text-xs text-spartan-text-secondary pt-2">Descargo de responsabilidad: Consulta siempre a un profesional médico.</p>
                                </div>
                            </div>
                        );
                        case 4: return (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Registro Biomecánico</h3>
                                <p className="text-sm text-spartan-text-secondary mb-4">Toca en el mapa las áreas donde tengas lesiones crónicas o molestias recurrentes.</p>
                                <BodyMap selectedParts={selectedBodyParts} onPartSelect={(part) => setSelectedBodyParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part])} multiple />
                                <div className="mt-4">
                                    <button
                                        onClick={() => {
                                            setSelectedBodyParts([]);
                                            handleNext();
                                        }}
                                        className="w-full py-3 bg-spartan-card hover:bg-spartan-border font-semibold rounded-lg transition-colors"
                                    >
                                        No tengo molestias recurrentes
                                    </button>
                                </div>
                            </div>
                        );
                        case 5: return <MobilityAssessmentStep onComplete={(issues) => { setFailedIssues(issues); setIsMobilityAssessmentComplete(true); }} />;
                        default: return null;
                    }
                })()}
            </div>
        );
        return stepContent;
    };
    
    const progress = (step / (totalSteps -1)) * 100;

    const renderContent = () => {
        switch(modalState) {
            case 'collecting_data':
                return (
                    <>
                        <div className="w-full bg-spartan-border rounded-full h-2 mb-6">
                            <div className="bg-spartan-gold h-2 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                        </div>

                        <div className="min-h-[420px]">{renderStep()}</div>

                        <div className="flex justify-between items-center mt-8">
                            <button onClick={handlePrev} disabled={step === 0} className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                            <button onClick={handleNext} disabled={isNextDisabled()} className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border">
                                {step < totalSteps - 1 ? 'Siguiente' : 'Generar Plan'}
                            </button>
                        </div>
                    </>
                );
            case 'loading_plan':
                 return (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <LoadingSpinner />
                        <p className="mt-4 text-lg text-spartan-text-secondary">SynergyCoach está diseñando tu plan personalizado...</p>
                    </div>
                );
            case 'previewing_plan':
                if (!generatedPlan) return null;
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-center">¡Tu Plan de Asalto Inicial está Listo!</h3>
                        <div className="bg-spartan-card p-4 rounded-lg my-4">
                            <h4 className="text-lg font-bold text-spartan-gold">{generatedPlan.routine.name}</h4>
                            <p className="text-sm uppercase text-spartan-text-secondary mb-3">{generatedPlan.routine.focus} • {generatedPlan.routine.duration} MINS</p>
                            <p className="text-sm italic text-spartan-text-secondary mb-3">"{generatedPlan.routine.objective}"</p>
                            <p className="text-sm font-bold text-spartan-text-secondary uppercase tracking-wider">Ejercicios Clave:</p>
                            <ul className="pl-2 mt-1 space-y-1 border-l-2 border-spartan-border text-sm">
                                {generatedPlan.routine.blocks.flatMap(b => b.exercises).slice(0, 4).map((ex, i) => <li key={i} className="pl-2">{ex.name}</li>)}
                            </ul>
                        </div>
                        <div className="bg-spartan-card p-4 rounded-lg">
                            <h4 className="text-lg font-bold text-spartan-gold flex items-center gap-2"><FireIcon className="w-5 h-5"/>Hábito Clave Sugerido</h4>
                            <p className="text-spartan-text mt-1 font-semibold">{generatedPlan.keystoneHabitSuggestion.name}</p>
                            <p className="text-sm text-spartan-text-secondary italic">Anclaje: {generatedPlan.keystoneHabitSuggestion.anchor}</p>
                        </div>
                        <button onClick={handleAcceptPlan} className="w-full py-3 mt-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">Aceptar y Empezar Viaje</button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <p className="text-red-500 font-bold">Error al generar el plan.</p>
                        <p className="text-spartan-text-secondary mt-2">Hubo un problema con la IA. Por favor, inténtalo de nuevo.</p>
                        <button onClick={() => setModalState('collecting_data')} className="mt-4 py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors">Reintentar</button>
                    </div>
                );

        }
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">Protocolo de Incorporación</h2>
            {renderContent()}
        </div>
    );
};

export default OnboardingModal;
