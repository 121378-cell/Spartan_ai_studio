import React from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-5 right-5 bg-spartan-gold text-spartan-bg font-bold py-3 px-5 rounded-lg shadow-lg animate-fadeIn z-50`}>
      {message}
    </div>
  );
};

export default Toast;

