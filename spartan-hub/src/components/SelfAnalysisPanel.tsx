import React, { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';
import { getResilienceAnalysis } from '../services/aiService.ts';
import LoadingSpinner from './LoadingSpinner.tsx';
import LightBulbIcon from './icons/LightBulbIcon.tsx';
import MicrophoneIcon from './icons/MicrophoneIcon.tsx';
import SendIcon from './icons/SendIcon.tsx';

const SelfAnalysisPanel: React.FC = () => {
    const { userProfile, workoutHistory, dailyLogs, habitLogs, weeklyCheckIns } = useAppContext();
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState('');

    const handleTranscript = useCallback((transcript: string) => {
        if (transcript) {
            setQuery(transcript);
            handleSubmit(transcript); // auto-submit on voice command
        }
    // Eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile, workoutHistory, dailyLogs, habitLogs, weeklyCheckIns]); // Dependencies for handleSubmit closure

    const { isListening, startListening, isSupported } = useSpeechRecognition(handleTranscript);

    const handleSubmit = async (text: string) => {
        if (!text.trim() || isLoading) return;
        
        setIsLoading(true);
        setAnalysis('');
        const result = await getResilienceAnalysis(text, {
            userProfile, workoutHistory, dailyLogs, habitLogs, weeklyCheckIns
        });
        setAnalysis(result);
        setIsLoading(false);
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit(query);
    }
    
    return (
        <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
             <h2 className="text-3xl font-bold text-spartan-gold mb-2 flex items-center gap-3">
                <LightBulbIcon className="w-8 h-8"/>
                Panel de Auto-Análisis
            </h2>
             <p className="text-spartan-text-secondary mb-6">"Pregúntale al Coach": Consulta a la IA sobre tus datos. Ej: "¿Por qué me sentí tan cansado la semana pasada?"</p>
            
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2 mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Escribe tu pregunta aquí..."
                    className="flex-1 bg-spartan-card border border-spartan-border rounded-lg p-3 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                    disabled={isLoading}
                />
                {isSupported && (
                    <button type="button" onClick={startListening} disabled={isListening || isLoading} className="p-3 rounded-lg bg-spartan-card hover:bg-spartan-border disabled:opacity-50 transition-colors">
                        <MicrophoneIcon className={`w-6 h-6 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
                    </button>
                )}
                 <button type="submit" disabled={isLoading || !query.trim()} className="p-3 rounded-lg bg-spartan-gold text-spartan-bg hover:bg-yellow-500 disabled:bg-spartan-border transition-colors">
                    <SendIcon className="w-6 h-6"/>
                </button>
            </form>
            
            {isLoading && <LoadingSpinner />}

            {analysis && (
                <div className="bg-spartan-card p-4 rounded-lg animate-fadeIn">
                    <h3 className="font-bold text-lg text-spartan-gold mb-2">Análisis del Coach:</h3>
                    <p className="whitespace-pre-wrap">{analysis}</p>
                </div>
            )}
        </div>
    );
};

export default SelfAnalysisPanel;

