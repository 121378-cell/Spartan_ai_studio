import React from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAppContext } from '../context/AppContext';
import MicrophoneIcon from './icons/MicrophoneIcon';

const FloatingVoiceButton: React.FC = () => {
  const { isMobile } = useDevice();
  const { showModal } = useAppContext();

  const handleVoiceCommand = () => {
    showModal('command-center');
  };

  if (!isMobile) {
    return null;
  }

  return (
    <button
      onClick={handleVoiceCommand}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-spartan-gold shadow-lg flex items-center justify-center hover:bg-spartan-gold-dark transition-all duration-200 z-50"
      aria-label="Activar comando de voz"
    >
      <MicrophoneIcon className="w-6 h-6 text-spartan-dark" />
    </button>
  );
};

export default FloatingVoiceButton;
