import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

// SpeechRecognition interfaces need to be globally available
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
    readonly transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    onstart: () => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    start: () => void;
    stop: () => void;
}


export const useSpeechRecognition = (
    onTranscriptReady: (transcript: string) => void,
    onError?: (error: string) => void
) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            logger.warn('Speech recognition not supported in this browser', {
                context: 'speech-recognition',
                metadata: { feature: 'speech-recognition' }
            });
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'es-ES';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            logger.error('Error in speech recognition', {
                context: 'speech-recognition',
                metadata: { error: event.error }
            });
            if (onError) {
                onError(event.error);
            }
            setIsListening(false);
        };
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results.item(0).item(0).transcript;
            onTranscriptReady(transcript);
        };

        recognitionRef.current = recognition;
    }, [onTranscriptReady, onError]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                logger.error('Error starting speech recognition', {
                    context: 'speech-recognition',
                    metadata: {
                        error: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }
                });
                if (onError) {
                    onError('start-failed');
                }
            }
        }
    }, [isListening, onError]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const isSupported = !!recognitionRef.current;

    return { isListening, startListening, stopListening, isSupported };
};


