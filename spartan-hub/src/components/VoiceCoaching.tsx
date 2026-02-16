/**
 * Voice Coaching Component
 * 
 * Provides real-time voice coaching during workouts with TTS and voice commands.
 * Uses Web Speech API for browser-based text-to-speech and speech recognition.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Play, Pause } from 'lucide-react';
import './VoiceCoaching.css';

interface CoachingMessage {
  id: string;
  type: 'encouragement' | 'form_correction' | 'pacing' | 'rest_timer' | 'instruction' | 'celebration';
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
}

interface VoiceCoachingProps {
  userId: string;
  workoutId: string;
  exerciseName?: string;
  currentSet?: number;
  currentRep?: number;
  targetSets?: number;
  targetReps?: number;
  formScore?: number;
  isActive: boolean;
  onVoiceCommand?: (command: string, action: string) => void;
}

interface VoiceSettings {
  voice: 'male-energetic' | 'female-energetic' | 'male-calm' | 'female-calm' | 'spartan';
  speed: number;
  volume: number;
  language: string;
  enableFormFeedback: boolean;
  enablePacing: boolean;
  enableCelebrations: boolean;
}

export const VoiceCoaching: React.FC<VoiceCoachingProps> = ({
  userId,
  workoutId,
  exerciseName,
  currentSet,
  currentRep,
  targetSets,
  targetReps,
  formScore,
  isActive,
  onVoiceCommand
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<CoachingMessage | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>({
    voice: 'spartan',
    speed: 1.0,
    volume: 0.8,
    language: 'es-ES',
    enableFormFeedback: true,
    enablePacing: true,
    enableCelebrations: true
  });
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = settings.language;
      
      recognitionRef.current.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript;
        handleVoiceCommand(command);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, [settings.language]);

  // Start coaching session when workout becomes active
  useEffect(() => {
    if (isActive && isEnabled && !sessionId) {
      startCoachingSession();
    } else if (!isActive && sessionId) {
      endCoachingSession();
    }
  }, [isActive, isEnabled]);

  // Send contextual coaching when workout metrics change
  useEffect(() => {
    if (isActive && isEnabled && sessionId && exerciseName) {
      sendContextualCoaching();
    }
  }, [currentSet, currentRep, formScore]);

  const startCoachingSession = async () => {
    try {
      const response = await fetch('/api/voice-coaching/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          workoutId,
          voiceSettings: settings
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.data.id);
        speakMessage(data.data.messages[0]?.text || '¡Entrenamiento iniciado!');
      }
    } catch (error) {
      console.error('Failed to start voice coaching:', error);
    }
  };

  const endCoachingSession = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/voice-coaching/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        speakMessage(data.data.messages[data.data.messages.length - 1]?.text || '¡Entrenamiento completado!');
      }
    } catch (error) {
      console.error('Failed to end voice coaching:', error);
    } finally {
      setSessionId(null);
    }
  };

  const sendContextualCoaching = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/voice-coaching/${sessionId}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          exerciseName,
          targetSets,
          targetReps,
          currentSet,
          currentRep,
          formScore,
          pace: formScore && formScore > 80 ? 'good' : formScore && formScore < 50 ? 'too_fast' : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && !isMuted) {
          setLastMessage(data.data);
          speakMessage(data.data.text);
        }
      }
    } catch (error) {
      console.error('Failed to send contextual coaching:', error);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/voice-coaching/${sessionId}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ command })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.response) {
          speakMessage(data.data.response);
        }
        if (onVoiceCommand && data.data.action) {
          onVoiceCommand(command, data.data.action);
        }
      }
    } catch (error) {
      console.error('Failed to process voice command:', error);
    }
  };

  const speakMessage = (text: string) => {
    if (!synthesisRef.current || isMuted) return;
    
    // Cancel any ongoing speech
    synthesisRef.current.cancel();
    
    utteranceRef.current = new SpeechSynthesisUtterance(text);
    utteranceRef.current.lang = settings.language;
    utteranceRef.current.rate = settings.speed;
    utteranceRef.current.volume = settings.volume;
    
    // Try to find appropriate voice
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => {
      if (settings.voice === 'spartan') {
        return v.lang.startsWith('es') && v.name.toLowerCase().includes('male');
      }
      return v.lang === settings.language;
    });
    
    if (preferredVoice) {
      utteranceRef.current.voice = preferredVoice;
    }
    
    synthesisRef.current.speak(utteranceRef.current);
  };

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const toggleMute = () => {
    if (!isMuted) {
      synthesisRef.current?.cancel();
    }
    setIsMuted(!isMuted);
  };

  const toggleCoaching = () => {
    if (isEnabled) {
      endCoachingSession();
    }
    setIsEnabled(!isEnabled);
  };

  if (!('speechSynthesis' in window)) {
    return null; // Browser doesn't support speech synthesis
  }

  return (
    <div className="voice-coaching-container">
      <div className="voice-coaching-panel">
        <div className="voice-coaching-header">
          <h4>🎙️ Coach de Voz</h4>
          <div className="voice-coaching-controls">
            <button
              onClick={toggleCoaching}
              className={`voice-btn ${isEnabled ? 'active' : ''}`}
              title={isEnabled ? 'Desactivar coach de voz' : 'Activar coach de voz'}
            >
              {isEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            
            {isEnabled && (
              <>
                <button
                  onClick={toggleListening}
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  title={isListening ? 'Detener escucha' : 'Escuchar comandos de voz'}
                >
                  {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                
                <button
                  onClick={toggleMute}
                  className={`voice-btn ${isMuted ? 'muted' : ''}`}
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="voice-btn"
                  title="Configuración de voz"
                >
                  <Settings size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {isEnabled && lastMessage && (
          <div className={`voice-message ${lastMessage.type} ${lastMessage.priority}`}>
            <p>{lastMessage.text}</p>
          </div>
        )}

        {isEnabled && isListening && (
          <div className="voice-listening-indicator">
            <div className="voice-wave">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="listening-text">Escuchando...</span>
          </div>
        )}

        {showSettings && (
          <div className="voice-settings">
            <h5>Configuración de Voz</h5>
            
            <div className="setting-group">
              <label>Tipo de Voz</label>
              <select
                value={settings.voice}
                onChange={(e) => setSettings({ ...settings, voice: e.target.value as any })}
              >
                <option value="spartan">Spartan (Masculina)</option>
                <option value="male-energetic">Masculina Enérgica</option>
                <option value="male-calm">Masculina Calmada</option>
                <option value="female-energetic">Femenina Enérgica</option>
                <option value="female-calm">Femenina Calmada</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Velocidad: {settings.speed.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.speed}
                onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
              />
            </div>

            <div className="setting-group">
              <label>Volumen: {Math.round(settings.volume * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => setSettings({ ...settings, volume: parseFloat(e.target.value) })}
              />
            </div>

            <div className="setting-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableFormFeedback}
                  onChange={(e) => setSettings({ ...settings, enableFormFeedback: e.target.checked })}
                />
                Correcciones de forma
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.enablePacing}
                  onChange={(e) => setSettings({ ...settings, enablePacing: e.target.checked })}
                />
                Guía de ritmo
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableCelebrations}
                  onChange={(e) => setSettings({ ...settings, enableCelebrations: e.target.checked })}
                />
                Celebraciones
              </label>
            </div>

            <div className="voice-commands-help">
              <h6>Comandos de Voz:</h6>
              <ul>
                <li>"Pausa" - Pausar entrenamiento</li>
                <li>"Continuar" - Reanudar entrenamiento</li>
                <li>"Siguiente" - Siguiente ejercicio</li>
                <li>"Motivación" - Mensaje motivacional</li>
                <li>"Forma" - Consejo de técnica</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCoaching;
