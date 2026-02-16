import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import { logger } from '../../utils/logger';
import { getFormFeedbackFromVideo } from '../../services/aiService.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';
import SparklesIcon from '../icons/SparklesIcon.tsx';
import VideoCameraIcon from '../icons/VideoCameraIcon.tsx';
import StopCircleIcon from '../icons/StopCircleIcon.tsx';

const RECORDING_DURATION = 10; // seconds

const blobToBase64 = (blob: Blob): Promise<{base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const fullDataUrl = reader.result as string;
      const mimeType = fullDataUrl.substring(fullDataUrl.indexOf(':') + 1, fullDataUrl.indexOf(';'));
      const base64String = fullDataUrl.split(',')[1];
      resolve({ base64: base64String, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


const VideoFeedbackModal: React.FC = () => {
    const { modal, hideModal } = useAppContext();
    const { exerciseName } = modal.payload || {};

    const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview' | 'loading' | 'feedback' | 'error'>('idle');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(RECORDING_DURATION);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const setupCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                logger.error('Error accessing camera:', { metadata: { error: err instanceof Error ? err.message : String(err) } });
                let errorMessage = "No se pudo acceder a la cámara. Por favor, asegúrate de que esté conectada y no esté siendo utilizada por otra aplicación.";
                if (err instanceof DOMException) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        errorMessage = "Permiso de cámara denegado. Para usar esta función, por favor activa el acceso a la cámara para este sitio en los ajustes de tu navegador y vuelve a intentarlo.";
                    } else if (err.name === 'NotFoundError') {
                        errorMessage = "No se encontró ninguna cámara conectada. Por favor, asegúrate de que tu dispositivo de vídeo esté enchufado y funcione correctamente.";
                    } else if (err.name === 'NotReadableError') {
                        errorMessage = "No se puede leer la cámara debido a un error de hardware o del sistema operativo. Intenta reiniciar tu navegador o tu ordenador.";
                    }
                }
                setError(errorMessage);
                setRecordingState('error');
            }
        };
        setupCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
             if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [videoUrl, stream]);

    const handleStartRecording = () => {
        if (!stream) return;
        setRecordingState('recording');
        setCountdown(RECORDING_DURATION);
        const recordedChunks: Blob[] = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            setRecordedBlob(blob);
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            setRecordingState('preview');
        };

        recorder.start();
        countdownIntervalRef.current = window.setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        setTimeout(() => {
            handleStopRecording();
        }, RECORDING_DURATION * 1000);
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    };
    
    const handleSubmit = async () => {
        if (!recordedBlob) return;
        setRecordingState('loading');
        try {
            const { base64, mimeType } = await blobToBase64(recordedBlob);
            const aiFeedback = await getFormFeedbackFromVideo(exerciseName, base64, mimeType);
            setFeedback(aiFeedback);
            setRecordingState('feedback');
        } catch (err) {
            logger.error('Error getting AI feedback:', { metadata: { error: err instanceof Error ? err.message : String(err) } });
            setError("Fallo al obtener feedback de la IA. Por favor, inténtalo de nuevo.");
            setRecordingState('error');
        }
    };
    
    const handleRetry = () => {
        if(videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setRecordedBlob(null);
        setFeedback(null);
        setError(null);
        setRecordingState('idle');
    };

    const renderContent = () => {
        switch (recordingState) {
            case 'idle':
                return (
                    <div className="text-center">
                        <p className="text-spartan-text-secondary mb-4">Colócate de forma que todo tu rango de movimiento sea visible.</p>
                        <button onClick={handleStartRecording} className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">
                            <VideoCameraIcon className="w-6 h-6" /> Empezar a Grabar ({RECORDING_DURATION}s)
                        </button>
                    </div>
                );
            case 'recording':
                return (
                    <div className="text-center">
                        <p className="text-lg font-bold text-red-500 animate-pulse mb-2">GRABANDO</p>
                        <p className="text-4xl font-mono">{countdown}</p>
                        <button onClick={handleStopRecording} className="flex items-center justify-center gap-2 w-full mt-4 py-3 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors">
                            <StopCircleIcon className="w-6 h-6" /> Detener
                        </button>
                    </div>
                );
            case 'preview':
                return (
                    <div className="text-center">
                         <p className="font-bold mb-2">Revisa tu grabación:</p>
                        <video src={videoUrl || ''} controls autoPlay loop className="w-full rounded-lg mb-4 bg-black"></video>
                        <div className="flex gap-4">
                            <button onClick={handleRetry} className="flex-1 py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors">
                                Grabar de Nuevo
                            </button>
                            <button onClick={handleSubmit} className="flex-1 py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">
                                Enviar para Análisis
                            </button>
                        </div>
                    </div>
                );
            case 'loading':
                return (
                    <div className="text-center py-8">
                        <LoadingSpinner />
                        <p className="mt-4 text-lg">Analizando tu técnica...</p>
                    </div>
                );
            case 'feedback':
                return (
                    <div>
                        <h3 className="text-xl font-bold text-spartan-gold mb-4">Feedback del Biomecánico</h3>
                        <div className="bg-spartan-card p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                                <SparklesIcon className="w-6 h-6 text-spartan-gold flex-shrink-0 mt-1"/>
                                <p className="text-md italic">{feedback}</p>
                           </div>
                        </div>
                         <div className="flex gap-4 mt-6">
                            <button onClick={handleRetry} className="flex-1 py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors">
                                Grabar Otro
                            </button>
                            <button onClick={hideModal} className="flex-1 py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">
                                Hecho
                            </button>
                        </div>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center py-8">
                        <p className="text-red-500 font-bold text-lg mb-4">Ha Ocurrido un Error</p>
                        <p className="text-spartan-text-secondary">{error}</p>
                        <button onClick={hideModal} className="mt-6 py-2 px-6 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors">
                            Cerrar
                        </button>
                    </div>
                );
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Análisis de Técnica IA: {exerciseName}</h2>
            
            <div className="bg-spartan-card rounded-lg overflow-hidden relative">
                <video ref={videoRef} autoPlay muted playsInline className={`w-full transition-opacity ${recordingState === 'preview' || recordingState === 'feedback' || recordingState === 'loading' ? 'opacity-0 h-0 absolute' : 'opacity-100'}`}></video>
                {recordingState === 'recording' && <div className="absolute top-2 left-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>}
            </div>

            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default VideoFeedbackModal;

