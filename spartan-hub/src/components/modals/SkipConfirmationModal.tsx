import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import AlertTriangleIcon from '../icons/AlertTriangleIcon.tsx';

const SkipConfirmationModal: React.FC = () => {
    const { hideModal, proceedToSession } = useAppContext();

    const handleSkip = () => {
        proceedToSession();
        hideModal();
    };

    return (
        <div className="text-center">
            <AlertTriangleIcon className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Confirmar Omisión</h2>
            <p className="text-spartan-text-secondary text-lg">
                ¿Seguro que quieres perder tu ventaja mental?
            </p>
            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Volver a la Activación
                </button>
                <button
                    onClick={handleSkip}
                    className="py-2 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors"
                >
                    Omitir Activación
                </button>
            </div>
        </div>
    );
};

export default SkipConfirmationModal;
