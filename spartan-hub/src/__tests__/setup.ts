import '@testing-library/jest-dom';
import * as React from 'react';

// Polyfill CRÍTICO para React 19.x hasta que act sea exportado oficialmente
// Implementación propia que no depende de react-dom/test-utils
// Esto soluciona el error: "TypeError: React.act is not a function"
if (typeof React !== 'undefined' && !('act' in React)) {
  const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  
  (React as any).act = async (callback: () => any) => {
    const result = callback();
    if (result && typeof result.then === 'function') {
      await result;
    }
    await flushPromises();
    return result;
  };
}

// Only mock DOM APIs if they don't already exist (for jsdom environment)
if (typeof window !== 'undefined') {
  // Mock DOM APIs that might be missing in Node environment
  global.ResizeObserver = global.ResizeObserver || jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock Intersection Observer
  global.IntersectionObserver = global.IntersectionObserver || jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock window properties if needed
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock canvas elements for video analysis components
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Array(4)
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    canvas: document.createElement('canvas'),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    isPointInPath: jest.fn(() => false),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'ltr',
  } as any));

  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => '');
  HTMLCanvasElement.prototype.toBlob = jest.fn();
}

// Mock navigator.mediaDevices for camera access tests
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
      enumerateDevices: jest.fn().mockResolvedValue([]),
    },
    writable: true,
  });
}

// Mock HTMLVideoElement for video analysis tests
if (typeof HTMLVideoElement !== 'undefined') {
  HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);
  HTMLVideoElement.prototype.pause = jest.fn();
}

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'videoAnalysis.title': 'Análisis de Forma',
        'videoAnalysis.exerciseTypes.squat': 'Sentadilla',
        'videoAnalysis.exerciseTypes.deadlift': 'Peso Muerto',
        'videoAnalysis.frames': 'Frames',
        'videoAnalysis.fps': 'FPS',
        'videoAnalysis.status': 'Estado',
        'videoAnalysis.analyzeAgain': 'Analizar Nuevamente',
        'videoAnalysis.close': 'Cerrar',
        'videoAnalysis.cancel': 'Cancelar',
        'videoAnalysis.generalScore': 'Puntuación General',
        'videoAnalysis.improvementPoints': 'Puntos de Mejora',
        'videoAnalysis.tips': 'Consejos',
        'videoAnalysis.ready': 'Listo',
        'videoAnalysis.live': 'En vivo',
        'videoAnalysis.error': 'Error'
      };
      if (translations[key]) return translations[key];
      if (options && options.defaultValue) return options.defaultValue;
      return key;
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));
