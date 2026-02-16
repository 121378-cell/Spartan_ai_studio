import React from 'react';
import { useAppContext } from '../../context/AppContext';
import AlertTriangleIcon from '../icons/AlertTriangleIcon';

interface RescheduleConfirmationModalProps {
    warning: string;
    onConfirm: () => void;
}

const RescheduleConfirmationModal: React.FC<RescheduleConfirmationModalProps> = ({ warning, onConfirm }) => {
    const { hideModal } = useAppContext();

    const handleConfirm = () => {
        onConfirm();
        hideModal();
    };

    return (
        <div className="text-center">
            <AlertTriangleIcon className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Advertencia del Coach</h2>
            <p className="text-spartan-text-secondary text-lg mb-6">
                {warning}
            </p>
            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleConfirm}
                    className="py-2 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors"
                >
                    Confirmar de todos modos
                </button>
            </div>
        </div>
    );
};

export default RescheduleConfirmationModal;
