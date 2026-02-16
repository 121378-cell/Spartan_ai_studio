import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { logger } from '../../utils/logger';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { processUserCommand } from '../../services/aiService';
import { speak } from '../../services/ttsService';
import MicrophoneIcon from '../icons/MicrophoneIcon';
import BrainIcon from '../icons/BrainIcon';
import SoundWaveIcon from '../icons/SoundWaveIcon';

type CommandState = 'listening' | 'processing' | 'responding' | 'error';

const CommandBarModal: React.FC = () => {
    const { hideModal, userProfile, routines, handleAiResponse } = useAppContext();
    const [state, setState] = useState<CommandState>('listening');
    const [transcript, setTranscript] = useState('');
    const [aiResponseText, setAiResponseText] = useState('');

    const handleTranscriptReady = useCallback((finalTranscript: string) => {
        if (finalTranscript.trim()) {
            setTranscript(finalTranscript);
            setState('processing');
            processUserCommand(finalTranscript, { userProfile, routines }, undefined)
                .then(response => {
                    if (response) {
                        setAiResponseText(response.message);
                        handleAiResponse(response);
                        speak(response.message);
                        setState('responding');
                        setTimeout(hideModal, 4000); // Auto-close after feedback
                    } else {
                        throw new Error("Invalid AI response");
                    }
                })
                .catch(err => {
                    logger.error('Command processing error:', { metadata: { error: err instanceof Error ? err.message : String(err) } });
                    const errorMessage = "Lo siento, no pude procesar ese comando.";
                    setAiResponseText(errorMessage);
                    speak(errorMessage);
                    setState('error');
                    setTimeout(hideModal, 3000);
                });
        } else {
             hideModal(); // Close if nothing was said
        }
    }, [userProfile, routines, handleAiResponse, hideModal]);

    const handleRecognitionError = useCallback((error: string) => {
        if (error === 'no-speech' || error === 'aborted') {
            // User intentionally stayed silent or closed the modal. Just close it without feedback.
            hideModal();
            return;
        }
        
        const errorMessage = "Hubo un error con el reconocimiento de voz.";
        setState('error');
        setAiResponseText(errorMessage);
        speak(errorMessage);
        setTimeout(hideModal, 3000);

    }, [hideModal]);

    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition(handleTranscriptReady, handleRecognitionError);

    useEffect(() => {
        if (isSupported) {
            startListening();
        }
    }, [isSupported, startListening]);
    
    // Handle speech recognition ending automatically after user stops talking
    useEffect(() => {
        // This is a bit of a workaround for some speech recognition APIs that don't fire onTranscriptReady on silent stops
        if (!isListening && state === 'listening' && transcript.trim()) {
            handleTranscriptReady(transcript);
        } else if (!isListening && state === 'listening' && !transcript.trim()) {
            // Error will be caught by the `onerror` handler in the hook
            // which calls `handleRecognitionError`, so no need to hideModal here.
        }
    }, [isListening, state, transcript, handleTranscriptReady]);


    const renderState = () => {
        switch (state) {
            case 'listening':
                return {
                    icon: <MicrophoneIcon className="w-6 h-6 text-red-500 animate-pulse" />,
                    text: transcript || 'Escuchando...',
                };
            case 'processing':
                return {
                    icon: <BrainIcon className="w-6 h-6 text-spartan-gold animate-pulse" />,
                    text: transcript,
                };
            case 'responding':
            case 'error':
                return {
                    icon: <SoundWaveIcon className="w-6 h-6 text-spartan-gold" />,
                    text: aiResponseText,
                };
        }
    };

    const { icon, text } = renderState();

    if (!isSupported) {
         return (
             <div className="text-center">
                <h2 className="text-xl font-bold text-red-500">Error</h2>
                <p className="text-spartan-text-secondary mt-2">El reconocimiento de voz no es compatible o no está permitido en este navegador.</p>
            </div>
         )
    }

    return (
        <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto"
        >
            <div className="flex items-center gap-4 p-4 bg-spartan-card rounded-lg shadow-lg">
                <div className="flex-shrink-0">{icon}</div>
                <p className="text-lg italic flex-1">{text}</p>
            </div>
        </div>
    );
};

export default CommandBarModal;
