import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { getOracleResponse } from '../services/aiService.ts';
import LoadingSpinner from './LoadingSpinner.tsx';
import LaurelWreathIcon from './icons/LaurelWreathIcon.tsx';
import CheckIcon from './icons/CheckIcon.tsx';
import SendIcon from './icons/SendIcon.tsx';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon.tsx';

type ConversationState = 'loading' | 'intro' | 'quest_prompted' | 'quest_submitted' | 'journey_started';

const MilestoneCard: React.FC<{ title: string; description: string; isCompleted: boolean }> = ({ title, description, isCompleted }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 transition-all ${isCompleted ? 'bg-spartan-gold text-spartan-bg' : 'bg-spartan-card'}`}>
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${isCompleted ? 'bg-spartan-bg text-spartan-gold' : 'border-2 border-spartan-gold'}`}>
           {isCompleted ? <CheckIcon className="w-5 h-5"/> :  <LaurelWreathIcon className="w-5 h-5 text-spartan-gold"/>}
        </div>
        <div>
            <h4 className="font-bold text-lg">{title}</h4>
            <p className={`${isCompleted ? 'text-spartan-surface' : 'text-spartan-text-secondary'}`}>{description}</p>
        </div>
    </div>
);

const Legend: React.FC = () => {
    const { userProfile, updateQuestAndMilestones, dailyLogs, workoutHistory, weeklyCheckIns, showModal } = useAppContext();
    const [conversationState, setConversationState] = useState<ConversationState>('loading');
    const [oracleMessage, setOracleMessage] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [weeklyDivination, setWeeklyDivination] = useState<string | null>(null);

    // Check-in Logic
    const isInAutonomyPhase = userProfile.isInAutonomyPhase;
    const checkInPeriod = isInAutonomyPhase ? 30 : 7;
    const lastCheckInDate = weeklyCheckIns.length > 0 ? new Date(weeklyCheckIns[weeklyCheckIns.length - 1].date) : null;
    let daysUntilNextCheckIn = 0;
    if (lastCheckInDate) {
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);
        lastCheckInDate.setHours(0,0,0,0);
        const nextCheckInDate = new Date(new Date(lastCheckInDate).setDate(lastCheckInDate.getDate() + checkInPeriod));
        const diffTime = nextCheckInDate.getTime() - todayDate.getTime();
        daysUntilNextCheckIn = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    const isCheckInDue = daysUntilNextCheckIn === 0;

    useEffect(() => {
        const initOracle = async () => {
            if (userProfile.quest) {
                setConversationState('journey_started');
            } else {
                setIsLoading(true);
                const intro = await getOracleResponse('generate-quest-prompt', userProfile, {});
                setOracleMessage(intro);
                setConversationState('quest_prompted');
                setIsLoading(false);
            }
        };
        initOracle();
    }, [userProfile.quest, userProfile]);

    useEffect(() => {
        const fetchDivination = async () => {
            const now = new Date();
            // Check if it's Sunday (start of the week)
            if (now.getDay() === 0 && weeklyCheckIns.length > 0) { // Only fetch if there's data
                const oneWeekAgo = new Date(new Date().setDate(now.getDate() - 7)).toISOString().split('T')[0];
                const lastWeekHistory = workoutHistory.filter(h => h.date >= oneWeekAgo);
                const lastWeekLogs = dailyLogs.filter(l => l.date >= oneWeekAgo);
                
                if (lastWeekHistory.length > 0 || lastWeekLogs.length > 0) {
                     const divination = await getOracleResponse('weekly-divination', userProfile, { lastWeekHistory, lastWeekLogs });
                     setWeeklyDivination(divination);
                }
            }
        };
        if(userProfile.quest) fetchDivination();
    }, [userProfile, workoutHistory, dailyLogs, weeklyCheckIns]);

    const handleQuestSubmission = async () => {
        if (!userInput.trim()) return;
        setIsLoading(true);
        setConversationState('quest_submitted');
        
        const quest = await getOracleResponse('define-quest', userProfile, { response: userInput });
        const milestones = await getOracleResponse('generate-milestones', { ...userProfile, quest }, {});
        
        updateQuestAndMilestones(quest, milestones);
        setIsLoading(false);
        setConversationState('journey_started');
    };

    const handleCheckInClick = () => {
        const modalType = isInAutonomyPhase ? 'monthly-check-in' : 'weekly-check-in';
        showModal(modalType);
    };

    const renderQuestSetup = () => (
        <div className="bg-spartan-surface p-8 rounded-lg text-center animate-fadeIn">
            <LaurelWreathIcon className="w-16 h-16 mx-auto text-spartan-gold mb-4" />
            <h2 className="text-3xl font-bold mb-4">Una Palabra del Oráculo</h2>
            {isLoading && conversationState !== 'quest_submitted' && <LoadingSpinner />}
            {oracleMessage && <p className="text-xl italic text-spartan-text-secondary mb-6">"{oracleMessage}"</p>}
            
            {conversationState === 'quest_prompted' && (
                <div className="flex w-full max-w-lg mx-auto">
                     <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleQuestSubmission()}
                        placeholder="Declara tu propósito..."
                        className="flex-1 bg-spartan-card border border-spartan-border rounded-l-lg p-3 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                    />
                    <button onClick={handleQuestSubmission} className="p-3 bg-spartan-gold text-spartan-bg rounded-r-lg"><SendIcon /></button>
                </div>
            )}
             {conversationState === 'quest_submitted' && (
                <div>
                    <p className="text-xl text-spartan-gold mb-4">Los hilos del destino se están tejiendo...</p>
                    <LoadingSpinner />
                </div>
             )}
        </div>
    );

    const renderLegendPath = () => (
        <div className="space-y-8 animate-fadeIn">
             <div className="bg-spartan-surface p-8 rounded-lg">
                <h2 className="text-3xl font-bold text-spartan-gold mb-2">Tu Gesta</h2>
                <p className="text-xl italic text-spartan-text-secondary">"{userProfile.quest}"</p>
            </div>

            {weeklyDivination && (
                 <div className="bg-spartan-surface p-8 rounded-lg">
                    <h2 className="text-3xl font-bold text-spartan-gold mb-2">Adivinación Semanal</h2>
                    <p className="text-lg italic text-spartan-text-secondary">"{weeklyDivination}"</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-spartan-surface p-6 rounded-lg">
                    <h3 className="text-2xl font-bold mb-4">{isInAutonomyPhase ? 'Revisión Mensual' : 'Registro Semanal'}</h3>
                     <p className="text-spartan-text-secondary mb-4">{isInAutonomyPhase ? 'Revisa tu progreso mensual para una visión estratégica a largo plazo.' : 'Evalúa tu progreso semanal para que SynergyCoach pueda ajustar tu estrategia.'}</p>
                     <button 
                        onClick={handleCheckInClick}
                        disabled={!isCheckInDue}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:bg-spartan-border disabled:cursor-not-allowed"
                     >
                        <ClipboardCheckIcon className="w-6 h-6" />
                        {isCheckInDue ? (isInAutonomyPhase ? 'Realizar Revisión Mensual' : 'Realizar Check-in Semanal') : `Próximo check-in en ${daysUntilNextCheckIn} día(s)`}
                     </button>
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-bold mb-4">Hitos Profetizados</h3>
                 <div className="space-y-4">
                    {userProfile.milestones.map(m => <MilestoneCard key={m.id} {...m} />)}
                </div>
            </div>

        </div>
    );

    return (
        <div>
            <h1 className="text-4xl font-bold mb-6 text-spartan-gold">El Camino de la Leyenda</h1>
            {conversationState === 'journey_started' ? renderLegendPath() : renderQuestSetup()}
        </div>
    );
};

export default Legend;
