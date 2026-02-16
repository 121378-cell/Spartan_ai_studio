import React, { ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';

interface ModalProps {
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ children }) => {
  const { modal, hideModal } = useAppContext();

  if (!modal.isOpen) {
    return null;
  }

  const { position = 'center', size = 'default', isCritical = false } = modal;

  const wrapperClasses = {
    center: 'justify-center items-center',
    side: 'justify-end items-end p-4 sm:p-8',
  };

  const contentSizeClasses = {
    default: 'max-w-lg',
    medium: 'max-w-2xl',
    large: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  const animationClasses = {
      center: 'animate-fadeIn',
      side: 'animate-slideInFromRight',
  };
  
  const criticalClasses = isCritical ? 'border-2 border-red-500 shadow-2xl shadow-red-500/30' : 'border-spartan-border/50';

  return (
    <div 
      className={`fixed inset-0 bg-black/60 z-50 flex ${wrapperClasses[position]}`}
      onClick={hideModal}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={`bg-spartan-surface/90 backdrop-blur-md border rounded-lg shadow-xl p-4 sm:p-6 w-full relative ${contentSizeClasses[size]} ${animationClasses[position]} ${criticalClasses}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <button 
          onClick={hideModal}
          className="absolute top-3 right-3 text-spartan-text-secondary hover:text-spartan-text z-10"
          aria-label="Cerrar modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="max-h-[75vh] overflow-y-auto pr-2 -mr-2 pt-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
