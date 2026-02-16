// services/ttsService.ts
import { setFocusToneVolume } from './audioService.ts';

let voices: SpeechSynthesisVoice[] = [];

// Function to populate voices. It's asynchronous.
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
};

// Load voices when they are changed.
if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
// Also load them initially, as some browsers don't fire the event reliably.
loadVoices();

/**
 * Speaks the given text using the browser's speech synthesis API.
 * @param text The text to be spoken.
 */
export const speak = (text: string): void => {
    if (!('speechSynthesis' in window)) {
        console.warn("La síntesis de voz no es compatible con este navegador.");
        return;
    }

    // Clean up any previous utterances
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find a suitable Spanish voice
    if (voices.length === 0) {
        // If voices are not loaded yet, try loading again.
        loadVoices();
    }
    
    // Attempt to find a preferred voice
    let selectedVoice = voices.find(voice => voice.lang === 'es-ES' && voice.name.includes('Google'));
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'es-ES' || voice.lang === 'es-MX');
    }
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('es-'));
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.lang = 'es-ES';
    utterance.volume = 1; // Full volume
    utterance.rate = 1;   // Normal rate
    utterance.pitch = 1;  // Normal pitch

    // Duck other in-app audio (FUI9)
    utterance.onstart = () => {
        setFocusToneVolume(0.01, 0.2); // Duck volume quickly
    };
    const restoreVolume = () => {
        setFocusToneVolume(0.05, 1.0); // Restore volume smoothly
    };
    utterance.onend = restoreVolume;
    utterance.onerror = restoreVolume; // Also restore on error

    window.speechSynthesis.speak(utterance);
};
