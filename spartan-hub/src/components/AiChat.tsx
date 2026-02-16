import React, { useState, useEffect, useRef, useCallback } from 'react';
// Fix: Correct import path for AppContext
import { useAppContext } from '../context/AppContext';
// Fix: Correct import path for types
import { type ChatMessage, type AiResponse } from '../types';
// Fix: Correct import path for aiService
import { processUserCommand } from '../services/aiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';
import SendIcon from './icons/SendIcon.tsx';
import MicrophoneIcon from './icons/MicrophoneIcon.tsx';
import StopCircleIcon from './icons/StopCircleIcon.tsx';
import ThumbUpIcon from './icons/ThumbUpIcon.tsx';
import ThumbDownIcon from './icons/ThumbDownIcon.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import AiStreamingFeedback from './AiStreamingFeedback';
import AiErrorScreen from './AiErrorScreen';

const AiChat: React.FC = () => {
    const { userProfile, routines, handleAiResponse, toggleChat, logUserFeedback, showToast, setCurrentPage } = useAppContext();
    
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 0, text: `Soy <strong>SynergyCoach</strong>. ¿Cómo podemos optimizar tu rendimiento físico y mental hoy?`, sender: 'ai' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingStatus, setStreamingStatus] = useState({
        isActive: false,
        progress: 0,
        status: 'thinking' as 'thinking' | 'processing' | 'responding' | 'completed' | 'error',
        message: ''
    });
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);
    
    const handleTranscript = (transcript: string) => {
        if (transcript) {
            setUserInput(transcript);
        }
    };
    
    const handleRecognitionError = useCallback((error: string) => {
        if (error === 'no-speech') {
            showToast("No se detectó voz. Inténtalo de nuevo.");
        } else if (error !== 'aborted') { // Don't show toast if user manually stops it
            showToast("Error en el reconocimiento de voz.");
        }
    }, [showToast]);

    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition(handleTranscript, handleRecognitionError);

    const handleSend = useCallback(async (text: string) => {
        const messageText = text.trim();
        if (!messageText) return;

        const newUserMessage: ChatMessage = {
            id: Date.now(),
            text: messageText,
            sender: 'user',
        };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);
        setStreamingStatus({
            isActive: true,
            progress: 0,
            status: 'thinking',
            message: ''
        });
        setError(null);
        
        if (isListening) {
            stopListening();
        }

        let accumulatedResponse = '';
        let responseReceived = false;
        
        try {
            const responseData = await processUserCommand(
                messageText, 
                { userProfile, routines },
                (chunk: string) => {
                    // Streaming progress callback
                    accumulatedResponse += chunk;
                    responseReceived = true;
                    
                    // Update streaming status
                    setStreamingStatus({
                        isActive: true,
                        progress: Math.min(90, accumulatedResponse.length / 10), // Simple progress heuristic
                        status: accumulatedResponse.length % 60 < 20 ? 'thinking' : 
                               accumulatedResponse.length % 60 < 40 ? 'processing' : 'responding',
                        message: accumulatedResponse
                    });
                }
            );
            
            // If we didn't receive streaming data, fall back to the full response
            if (!responseReceived && responseData && responseData.message) {
                accumulatedResponse = responseData.message;
            }
            
            // Show completion
            setStreamingStatus(prev => ({
                ...prev,
                progress: 100,
                status: 'completed',
                message: '¡Completado!'
            }));
            
            // Brief pause to show completion
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const aiResponse: AiResponse = responseData || { 
                type: 'response' as const,
                message: "Lo siento, estoy teniendo problemas para procesar tu solicitud en este momento." 
            };
            
            const newAiMessage: ChatMessage = {
                id: Date.now() + 1,
                text: aiResponse.message,
                sender: 'ai',
            };
            
            // Update state
            setMessages(prev => [...prev, newAiMessage]);
            setIsLoading(false);
            setStreamingStatus({
                isActive: false,
                progress: 0,
                status: 'thinking',
                message: ''
            });
            handleAiResponse(aiResponse);
        } catch (err) {
            console.error("Error processing user command:", { error: err });
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            
            setStreamingStatus({
                isActive: true,
                progress: 0,
                status: 'error',
                message: 'Error en el proceso'
            });
            
            // Brief pause to show error state
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const errorResponse: AiResponse = { 
                type: 'response' as const,
                message: "Lo siento, estoy teniendo problemas para procesar tu solicitud en este momento." 
            };
            
            const newAiMessage: ChatMessage = {
                id: Date.now() + 1,
                text: errorResponse.message,
                sender: 'ai',
            };
            
            // Update state
            setMessages(prev => [...prev, newAiMessage]);
            setIsLoading(false);
            setStreamingStatus({
                isActive: false,
                progress: 0,
                status: 'thinking',
                message: ''
            });
            handleAiResponse(errorResponse);
        }
    }, [handleAiResponse, isListening, routines, stopListening, userProfile]);

    const handleFeedback = (messageId: number, feedback: 'good' | 'bad') => {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        
        if (messageIndex < 1 || messages[messageIndex].sender !== 'ai' || messages[messageIndex - 1].sender !== 'user') {
            return;
        }

        const aiMessage = messages[messageIndex];
        const userMessage = messages[messageIndex - 1];

        const newFeedback = aiMessage.feedback === feedback ? undefined : feedback;

        setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, feedback: newFeedback } : msg
        ));

        if (newFeedback) {
            logUserFeedback(aiMessage, userMessage, newFeedback);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(userInput);
    };
    
    const handleRetry = () => {
        setError(null);
        // We could implement a retry mechanism here if needed
        // For now, we'll just clear the error and let the user try again
    };
    
    const handleGoHome = () => {
        setError(null);
        toggleChat();
        setCurrentPage('dashboard');
    };

    // Render error screen if there's an error
    if (error) {
        return (
            <AiErrorScreen 
                error={error} 
                onRetry={handleRetry} 
                onGoHome={handleGoHome} 
                userProfile={userProfile} // Pass userProfile for context
            />
        );
    }

    return (
        <div className="fixed bottom-24 right-8 z-50 w-full max-w-md bg-spartan-surface rounded-lg shadow-2xl flex flex-col h-[60vh] animate-fadeIn" role="log" aria-live="polite">
            <header className="flex justify-between items-center p-4 border-b border-spartan-border">
                <h3 className="text-xl font-bold text-spartan-gold">Entrenador IA</h3>
                <button onClick={toggleChat} className="text-spartan-text-secondary hover:text-spartan-text" aria-label="Cerrar Entrenador IA">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'ai' && (
                        <div className="w-8 h-8 bg-spartan-gold rounded-full flex-shrink-0 flex items-center justify-center" aria-hidden="true">
                            <BrainIcon className="w-5 h-5 text-spartan-bg" />
                        </div>
                    )}
                    <div className={`p-3 rounded-lg max-w-xs md:max-w-sm ${msg.sender === 'user' ? 'bg-spartan-gold text-spartan-bg' : 'bg-spartan-card'}`}>
                            {msg.sender === 'ai' && (
                                <p className="font-bold text-spartan-gold text-sm mb-1">SynergyCoach</p>
                            )}
                            <p className="text-sm whitespace-pre-line break-words">{msg.text}</p>
                            {msg.sender === 'ai' && index > 0 && (
                                <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-spartan-border/20">
                                    <button 
                                        onClick={() => handleFeedback(msg.id, 'good')} 
                                        className={`p-1 rounded-full transition-colors ${msg.feedback === 'good' ? 'bg-green-500 text-white' : 'text-spartan-text-secondary hover:bg-spartan-border hover:text-spartan-text'}`}
                                        aria-label="Buena respuesta"
                                    >
                                        <ThumbUpIcon />
                                    </button>
                                    <button 
                                        onClick={() => handleFeedback(msg.id, 'bad')}
                                        className={`p-1 rounded-full transition-colors ${msg.feedback === 'bad' ? 'bg-red-500 text-white' : 'text-spartan-text-secondary hover:bg-spartan-border hover:text-spartan-text'}`}
                                        aria-label="Mala respuesta"
                                    >
                                        <ThumbDownIcon />
                                    </button>
                                </div>
                            )}
                    </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-end gap-2 justify-start">
                        <div className="w-8 h-8 bg-spartan-gold rounded-full flex-shrink-0 flex items-center justify-center font-bold text-spartan-bg text-sm" aria-hidden="true">
                            <BrainIcon className="w-5 h-5 text-spartan-bg animate-pulse" />
                        </div>
                        <div className="p-3 rounded-lg bg-spartan-card">
                             <div className="flex items-center gap-1.5 h-5">
                                <span className="w-2 h-2 bg-spartan-text-secondary rounded-full animate-pulse [animation-delay:0s]"></span>
                                <span className="w-2 h-2 bg-spartan-text-secondary rounded-full animate-pulse [animation-delay:0.2s]"></span>
                                <span className="w-2 h-2 bg-spartan-text-secondary rounded-full animate-pulse [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-spartan-border flex items-center gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Chatea con SynergyCoach..."
                    className="flex-1 bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                    disabled={isLoading}
                    aria-label="Entrada de chat"
                />
                {isSupported && (
                    <button type="button" onClick={isListening ? stopListening : startListening} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-spartan-card hover:bg-spartan-border'}`} aria-label={isListening ? 'Dejar de escuchar' : 'Empezar a escuchar'}>
                       {isListening ? <StopCircleIcon /> : <MicrophoneIcon />}
                    </button>
                )}
                <button type="submit" className="p-2 bg-spartan-gold text-spartan-bg rounded-full hover:bg-yellow-500 disabled:bg-spartan-border" disabled={isLoading || !userInput.trim()} aria-label="Enviar mensaje">
                    <SendIcon />
                </button>
            </form>
        </div>
    );
};

export default AiChat;
