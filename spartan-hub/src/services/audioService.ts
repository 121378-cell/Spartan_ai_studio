// services/audioService.ts

import { logger } from '../utils/logger';

// Extend Window interface to include webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

let audioCtx: AudioContext | null = null;
let oscillatorL: OscillatorNode | null = null;
let oscillatorR: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

const baseFrequency = 440; // A4 note
const beatFrequency = 15;  // Beta wave frequency for focus
const FOCUS_TONE_VOLUME = 0.05;

export const playFocusTone = (): void => {
  if (audioCtx) {
    return; // Already playing
  }

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Oscillators
    oscillatorL = audioCtx.createOscillator();
    oscillatorR = audioCtx.createOscillator();
    oscillatorL.type = 'sine';
    oscillatorR.type = 'sine';
    oscillatorL.frequency.setValueAtTime(baseFrequency, audioCtx.currentTime);
    oscillatorR.frequency.setValueAtTime(baseFrequency + beatFrequency, audioCtx.currentTime);

    // Panning
    const pannerL = new StereoPannerNode(audioCtx, { pan: -1 });
    const pannerR = new StereoPannerNode(audioCtx, { pan: 1 });

    // Gain (volume)
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(FOCUS_TONE_VOLUME, audioCtx.currentTime + 2); // Fade in over 2 seconds to be gentle

    // Connections
    oscillatorL.connect(pannerL).connect(gainNode);
    oscillatorR.connect(pannerR).connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Start
    oscillatorL.start();
    oscillatorR.start();
  } catch (e) {
    logger.error('Error starting AudioContext', {
      context: 'audio-service',
      metadata: {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      }
    });
    // Clean up if initialization failed
    if (audioCtx) audioCtx.close();
    audioCtx = null;
  }
};

export const stopFocusTone = (): void => {
  if (!audioCtx || !gainNode) {
    return;
  }

  // Fade out
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);

  // Stop oscillators after fade out
  setTimeout(() => {
    if (oscillatorL) {
      oscillatorL.stop();
      oscillatorL = null;
    }
    if (oscillatorR) {
      oscillatorR.stop();
      oscillatorR = null;
    }
    if (audioCtx) {
      audioCtx.close().then(() => {
        audioCtx = null;
        gainNode = null;
      });
    }
  }, 1000);
};

export const setFocusToneVolume = (volume: number, duration: number = 0.5): void => {
  if (gainNode && audioCtx) {
    gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + duration);
  }
};


